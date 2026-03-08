import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO, formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { fromPrisma, themesActifs, ARBRE_DEMARCHES } from '@/lib/demarches'
import type { Noeud } from '@/lib/demarches'

function collectFeuilles(noeuds: Noeud[]): { champ: string; label: string }[] {
  const result: { champ: string; label: string }[] = []
  for (const n of noeuds) {
    if (n.type === 'feuille') result.push({ champ: n.champ, label: n.label })
    else if (n.type === 'section') result.push(...collectFeuilles(n.enfants))
  }
  return result
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (session.user.role === 'ACCUEIL') return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const debut = parseISO(`${annee}-01-01`)
  const fin   = parseISO(`${annee}-12-31`)

  // ASID actifs dans l'année
  const asids = await prisma.suiviASID.findMany({
    where: {
      accompagnement: {
        deletedAt: null,
        dateEntree: { lte: fin },
        OR: [
          { dateSortie: null },
          { dateSortie: { gte: debut } },
        ],
      },
    },
    include: {
      accompagnement: {
        select: {
          dateEntree: true,
          dateSortie: true,
          person: { select: { id: true, nom: true, prenom: true, genre: true } },
        },
      },
    },
    orderBy: [{ prescripteurNom: 'asc' }, { prescripteurPrenom: 'asc' }],
  })

  const total     = asids.length
  const nbEnCours = asids.filter((a) => {
    const ds = a.accompagnement.dateSortie
    return ds === null || ds > fin
  }).length
  const nbSortis  = total - nbEnCours
  const nbHommes  = asids.filter((a) => a.accompagnement.person.genre === 'HOMME').length
  const nbFemmes  = asids.filter((a) => a.accompagnement.person.genre === 'FEMME').length

  // Indicateurs annuels
  const nbOrientationNMoins1 = asids.filter((a) => a.orientationNMoins1).length
  const nbOrientationN       = asids.filter((a) => a.orientationN).length
  const sumRenouvellementN   = asids.reduce((s, a) => s + a.renouvellementN, 0)
  const nbSuiviRealise       = asids.filter((a) => a.suiviRealise).length
  const nbSuiviNonRealise    = asids.filter((a) => !a.suiviRealise).length
  const nbReorientation      = asids.filter((a) => a.reorientation).length

  // Démarches réalisées
  const personASIDIds = asids.map((a) => a.accompagnement.person.id)
  const visitesASID = personASIDIds.length === 0 ? [] : await prisma.visit.findMany({
    where: {
      deletedAt: null,
      date:     { gte: debut, lte: fin },
      personId: { in: personASIDIds },
    },
    include: { demarches: true },
  })

  const themesMap = new Map<string, number>()
  const champsCount = new Map<string, number>()
  for (const v of visitesASID) {
    if (v.demarches) {
      const actifs = themesActifs(fromPrisma(v.demarches as unknown as Record<string, unknown>))
      for (const id of actifs) {
        themesMap.set(id, (themesMap.get(id) ?? 0) + 1)
      }
      const champs = fromPrisma(v.demarches as unknown as Record<string, unknown>)
      for (const theme of ARBRE_DEMARCHES) {
        for (const { champ } of collectFeuilles(theme.enfants)) {
          if ((champs as Record<string, unknown>)[champ] === true) {
            champsCount.set(champ, (champsCount.get(champ) ?? 0) + 1)
          }
        }
      }
    }
  }
  const nbOrienteParFT = visitesASID.filter((v) => v.orienteParFT).length

  // Par prescripteur
  const parPrescripteur = new Map<string, number>()
  for (const a of asids) {
    const key = [a.prescripteurNom, a.prescripteurPrenom].filter(Boolean).join(' ').trim() || 'Non renseigné'
    parPrescripteur.set(key, (parPrescripteur.get(key) ?? 0) + 1)
  }

  // === Feuille 1 : Vue d'ensemble ===
  const syntheseRows = [
    { Indicateur: 'Total ASID actifs dans l\'année', Nombre: total },
    { Indicateur: '  dont en cours',                  Nombre: nbEnCours },
    { Indicateur: '  dont sortis dans l\'année',      Nombre: nbSortis },
    { Indicateur: 'Hommes',                            Nombre: nbHommes },
    { Indicateur: 'Femmes',                            Nombre: nbFemmes },
  ]

  // === Feuille 2 : Indicateurs annuels ===
  const indicateursRows = [
    { Indicateur: 'Orientations N−1',     Valeur: nbOrientationNMoins1 },
    { Indicateur: 'Orientations N',        Valeur: nbOrientationN },
    { Indicateur: 'Renouvellements N',     Valeur: sumRenouvellementN },
    { Indicateur: 'Suivis réalisés',       Valeur: nbSuiviRealise },
    { Indicateur: 'Suivis non réalisés',   Valeur: nbSuiviNonRealise },
    { Indicateur: 'Réorientations',        Valeur: nbReorientation },
  ]

  // === Feuille 3 : Démarches ===
  const demarchesRows: { Démarche: string; 'Nb visites': number }[] = []
  for (const theme of ARBRE_DEMARCHES) {
    demarchesRows.push({
      Démarche:     theme.label,
      'Nb visites': themesMap.get(theme.id) ?? 0,
    })
    for (const { champ, label } of collectFeuilles(theme.enfants)) {
      const count = champsCount.get(champ) ?? 0
      if (count > 0) {
        demarchesRows.push({
          Démarche:     `  ${label}`,
          'Nb visites': count,
        })
      }
    }
  }
  demarchesRows.push({ Démarche: '  ↳ Orienté·e par France Travail', 'Nb visites': nbOrienteParFT })

  // === Feuille 4 : Par prescripteur ===
  const prescripteursRows = [...parPrescripteur.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([nom, nb]) => ({ Prescripteur: nom, 'Nb ASID': nb }))

  // === Feuille 5 : Liste nominative ===
  const listeRows = asids.map((a) => {
    const p = a.accompagnement.person
    const prescripteur = [a.prescripteurNom, a.prescripteurPrenom].filter(Boolean).join(' ').trim() || '—'
    const referent     = [a.referentNom, a.referentPrenom].filter(Boolean).join(' ').trim() || '—'
    return {
      'Nom Prénom':     `${p.nom.toUpperCase()} ${capitaliserPrenom(p.prenom)}`,
      Commune:          a.communeResidence ?? '—',
      Prescripteur:     prescripteur,
      Référent:         referent,
      Entrée:           a.accompagnement.dateEntree ? formaterDateCourte(a.accompagnement.dateEntree) : '—',
      Sortie:           a.accompagnement.dateSortie ? formaterDateCourte(a.accompagnement.dateSortie) : '—',
      'Suivi réalisé':  a.suiviRealise ? 'Oui' : 'Non',
    }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(syntheseRows),      'Vue d\'ensemble')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(indicateursRows),   'Indicateurs annuels')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demarchesRows),     'Démarches')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prescripteursRows), 'Prescripteurs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listeRows),         'Liste nominative')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bilan-asid-${annee}.xlsx"`,
    },
  })
}
