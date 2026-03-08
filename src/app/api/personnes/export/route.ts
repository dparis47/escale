import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'
import { SITUATIONS_FR, RESSOURCES_FR, ORIENTE_PAR_FR } from '@/schemas/person'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? null
  const recherche = q && q.length >= 2 ? q : null

  const personnes = await prisma.person.findMany({
    where: {
      deletedAt: null,
      ...(recherche
        ? {
            OR: [
              { nom:    { contains: recherche, mode: 'insensitive' as const } },
              { prenom: { contains: recherche, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  const lignes = personnes.map((p) => ({
    'Nom':                  p.nom,
    'Prénom':               p.prenom,
    'Genre':                p.genre === 'HOMME' ? 'H' : 'F',
    'Date de naissance':    p.dateNaissance ? formaterDateCourte(p.dateNaissance) : '',
    'Nationalité':          p.nationalite ?? '',
    'Adresse':              p.adresse ?? '',
    'Téléphone':            p.telephone ?? '',
    'Mobile':               p.mobile ?? '',
    'Email':                p.email ?? '',
    'CSS':                  p.css ? 'Oui' : 'Non',
    'RQTH':                 p.rqth ? 'Oui' : 'Non',
    'Invalidité':           p.invalidite ? 'Oui' : 'Non',
    'Catégorie invalidité': p.categorieInvalidite ?? '',
    'N° Sécu':              p.numeroSecu ?? '',
    'N° FT':                p.numeroFT ?? '',
    'Date inscription FT':  p.dateInscriptionFT ? formaterDateCourte(p.dateInscriptionFT) : '',
    'Code personnel FT':    p.codepersonnelFT ?? '',
    'Accomp. global FT':    p.accoGlo ? 'Oui' : 'Non',
    'N° CAF':               p.numeroCAF ?? '',
    'Situation familiale':  p.situationFamiliale ? SITUATIONS_FR[p.situationFamiliale as keyof typeof SITUATIONS_FR] ?? p.situationFamiliale : '',
    'Nb enfants':           p.nombreEnfantsCharge ?? '',
    'Âges enfants':         p.agesEnfants.length > 0 ? p.agesEnfants.join(', ') : '',
    'Permis':               p.permisConduire ? 'Oui' : 'Non',
    'Véhicule':             p.vehiculePersonnel ? 'Oui' : 'Non',
    'Autres moyens':        p.autresMoyensLocomotion ?? '',
    'Hébergement':          p.hebergement ?? '',
    'Ressources':           p.ressources.map((r) => RESSOURCES_FR[r as keyof typeof RESSOURCES_FR] ?? r).join(', '),
    'Orienté par':          p.orientePar ? ORIENTE_PAR_FR[p.orientePar as keyof typeof ORIENTE_PAR_FR] ?? p.orientePar : '',
    'En ASID':              p.enASID ? 'Oui' : 'Non',
  }))

  const ws = XLSX.utils.json_to_sheet(lignes)
  ws['!cols'] = [
    { wch: 16 }, // Nom
    { wch: 14 }, // Prénom
    { wch: 5 },  // Genre
    { wch: 14 }, // Date de naissance
    { wch: 14 }, // Nationalité
    { wch: 30 }, // Adresse
    { wch: 14 }, // Téléphone
    { wch: 14 }, // Mobile
    { wch: 24 }, // Email
    { wch: 5 },  // CSS
    { wch: 5 },  // RQTH
    { wch: 10 }, // Invalidité
    { wch: 16 }, // Catégorie invalidité
    { wch: 16 }, // N° Sécu
    { wch: 12 }, // N° FT
    { wch: 14 }, // Date inscription FT
    { wch: 14 }, // Code personnel FT
    { wch: 14 }, // Accomp. global FT
    { wch: 12 }, // N° CAF
    { wch: 16 }, // Situation familiale
    { wch: 10 }, // Nb enfants
    { wch: 14 }, // Âges enfants
    { wch: 6 },  // Permis
    { wch: 8 },  // Véhicule
    { wch: 16 }, // Autres moyens
    { wch: 20 }, // Hébergement
    { wch: 24 }, // Ressources
    { wch: 16 }, // Orienté par
    { wch: 8 },  // En ASID
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Personnes')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))

  const nomFichier = recherche ? 'personnes-recherche' : 'personnes'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomFichier}.xlsx"`,
    },
  })
}
