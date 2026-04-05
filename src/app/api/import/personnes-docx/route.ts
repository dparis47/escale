import { NextResponse }      from 'next/server'
import { auth }              from '@/auth'
import { prisma }            from '@/lib/prisma'
import { peutAcceder }       from '@/lib/permissions'
import { parseDocxFiche }    from '@/lib/parse-docx-fiche'
import { parseISO }          from '@/lib/dates'
import type { FicheParsee }  from '@/lib/parse-docx-fiche'
import type { Genre }        from '@prisma/client'

// En production (Vercel), la taille max du body est de 4.5 Mo (plan gratuit).
// En cas de dépassement, l'erreur est remontée à l'utilisateur.

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'dossiers', 'importer')) {
    return NextResponse.json({ erreur: 'Accès interdit' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry_run') === 'true'

  // Corrections envoyées par le frontend (clé = nomFichier)
  const correctionsRaw = searchParams.get('corrections')
  const corrections: Record<string, { nom?: string; prenom?: string; genre?: Genre }> = correctionsRaw
    ? JSON.parse(correctionsRaw) as Record<string, { nom?: string; prenom?: string; genre?: Genre }>
    : {}

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const estTailleLimite = /body|size|limit|too large|payload/i.test(msg)
    return NextResponse.json({
      erreur: estTailleLimite
        ? 'Les fichiers envoyés dépassent la taille maximale autorisée. Essayez d\u2019importer moins de fichiers à la fois.'
        : `Données invalides : ${msg}`,
    }, { status: estTailleLimite ? 413 : 400 })
  }

  // Récupérer tous les fichiers (clé "fichiers")
  const fichiers = formData.getAll('fichiers') as File[]
  if (fichiers.length === 0) {
    return NextResponse.json({ erreur: 'Aucun fichier reçu' }, { status: 400 })
  }

  // Charger la liste des personnes existantes pour la détection de doublons
  const existantes = await prisma.person.findMany({
    where:  { deletedAt: null },
    select: { id: true, nom: true, prenom: true },
  })
  const indexExistants = new Map<string, number>()
  for (const p of existantes) {
    indexExistants.set(`${p.nom.toLowerCase()}|${p.prenom.toLowerCase()}`, p.id)
  }

  // Parser chaque fichier
  const fiches: FicheParsee[] = []
  for (const fichier of fichiers) {
    if (!fichier.name.match(/\.docx?$/i)) continue
    const buffer = Buffer.from(await fichier.arrayBuffer())
    fiches.push(parseDocxFiche(buffer, fichier.name))
  }

  // Compter doublons / nouvelles
  let crees    = 0
  let misAJour = 0
  let doublons = 0
  const erreurs: { fichier: string; message: string }[] = []
  const apercu: Record<string, string | number | boolean | null>[] = []

  for (const fiche of fiches) {
    if (fiche.avertissements.some((a) => a.includes('non trouvé') && a.includes('Nom'))) {
      erreurs.push({ fichier: fiche.nomFichier, message: fiche.avertissements.join(' / ') })
      continue
    }
    const nomFinal    = corrections[fiche.nomFichier]?.nom ?? fiche.nom ?? ''
    const prenomFinal = corrections[fiche.nomFichier]?.prenom ?? fiche.prenom ?? ''
    const cle     = `${nomFinal.toLowerCase()}|${prenomFinal.toLowerCase()}`
    const existeId = indexExistants.get(cle)

    if (existeId) {
      doublons++
      misAJour++
    } else {
      crees++
    }

    apercu.push({
      fichier:      fiche.nomFichier,
      nom:          fiche.nom,
      prenom:       fiche.prenom,
      genre:        fiche.genre ?? 'HOMME',
      genreDetecte: !!fiche.genre,
      dateNais:     fiche.dateNaissance,
      doublon:      !!existeId,
    })

    if (!dryRun) {
      try {
        if (existeId) {
          // Mise à jour des champs non vides
          const upd: Record<string, unknown> = {}
          if (fiche.dateNaissance) upd.dateNaissance = parseISO(fiche.dateNaissance)
          if (fiche.adresse)       upd.adresse       = fiche.adresse
          if (fiche.telephone)     upd.telephone     = fiche.telephone
          if (fiche.email)         upd.email         = fiche.email
          if (fiche.css)           upd.css           = fiche.css
          if (fiche.rqth)          upd.rqth          = fiche.rqth
          if (fiche.situationFamiliale) upd.situationFamiliale = fiche.situationFamiliale
          if (fiche.nombreEnfantsCharge !== null) upd.nombreEnfantsCharge = fiche.nombreEnfantsCharge
          if (fiche.permisConduire)    upd.permisConduire    = fiche.permisConduire
          if (fiche.vehiculePersonnel) upd.vehiculePersonnel = fiche.vehiculePersonnel
          if (fiche.hebergement)   upd.hebergement   = fiche.hebergement
          if (fiche.ressources.length > 0) upd.ressources = fiche.ressources
          if (fiche.orientePar)    upd.orientePar    = fiche.orientePar
          if (fiche.numeroFT)      upd.numeroFT      = fiche.numeroFT
          if (fiche.codepersonnelFT) upd.codepersonnelFT = fiche.codepersonnelFT
          if (fiche.nomNaissance)   upd.nomNaissance   = fiche.nomNaissance
          if (fiche.numeroCAF)     upd.numeroCAF     = fiche.numeroCAF
          if (Object.keys(upd).length > 0) {
            await prisma.person.update({ where: { id: existeId }, data: upd })
          }
        } else {
          const personne = await prisma.person.create({
            data: {
              nom:                 corrections[fiche.nomFichier]?.nom ?? fiche.nom!,
              nomNaissance:        fiche.nomNaissance,
              prenom:              corrections[fiche.nomFichier]?.prenom ?? fiche.prenom!,
              genre:               corrections[fiche.nomFichier]?.genre ?? fiche.genre ?? 'HOMME',
              dateNaissance:       fiche.dateNaissance ? parseISO(fiche.dateNaissance) : null,
              adresse:             fiche.adresse,
              telephone:           fiche.telephone,
              email:               fiche.email,
              css:                 fiche.css,
              rqth:                fiche.rqth,
              situationFamiliale:  fiche.situationFamiliale,
              nombreEnfantsCharge: fiche.nombreEnfantsCharge,
              permisConduire:      fiche.permisConduire,
              vehiculePersonnel:   fiche.vehiculePersonnel,
              hebergement:         fiche.hebergement,
              ressources:          fiche.ressources,
              orientePar:          fiche.orientePar,
              numeroFT:            fiche.numeroFT,
              codepersonnelFT:     fiche.codepersonnelFT,
              numeroCAF:           fiche.numeroCAF,
              estInscrit:          true,
              dateActualisation:   new Date(),
            },
          })
          // Dossier individuel
          const accomp = await prisma.accompagnement.create({
            data: { personId: personne.id, dateEntree: new Date() },
          })
          await prisma.demarches.create({ data: { accompagnementId: accomp.id } })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma as any).suiviEI.create({ data: { accompagnementId: accomp.id } })
          indexExistants.set(cle, personne.id)
        }
      } catch (e) {
        console.error(`[Import DOCX] Erreur pour ${fiche.nomFichier} :`, e)
        erreurs.push({
          fichier: fiche.nomFichier,
          message: `Erreur import : ${e instanceof Error ? e.message : String(e)}`,
        })
      }
    }
  }

  return NextResponse.json({
    total:    fiches.length,
    crees,
    misAJour,
    doublons,
    erreurs,
    apercu:   dryRun ? apercu : undefined,
  })
}
