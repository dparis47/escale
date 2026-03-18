import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { formaterDateCourte } from '@/lib/dates'
import { NIVEAUX_FORMATION_FR } from '@/schemas/accompagnement'

export async function GET() {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'exporter')) return new NextResponse(null, { status: 403 })

  const accompagnements = await prisma.accompagnement.findMany({
    where: {
      deletedAt: null,
      suiviEI: null, // exclure les dossiers individuels
    },
    include: {
      person:    { select: { nom: true, prenom: true } },
      suiviASID: { select: { prescripteurNom: true, prescripteurPrenom: true, referentNom: true, referentPrenom: true, communeResidence: true } },
    },
    orderBy: [{ person: { nom: 'asc' } }, { person: { prenom: 'asc' } }],
  })

  const lignes = accompagnements.map((a) => ({
    'Nom':                     a.person.nom,
    'Prénom':                  a.person.prenom,
    'Type':                    a.suiviASID ? 'FSE+ ASID' : 'FSE+',
    'Date entrée':             formaterDateCourte(a.dateEntree),
    'Date sortie':             a.dateSortie ? formaterDateCourte(a.dateSortie) : '',
    'Statut':                  a.dateSortie ? 'Terminé' : 'En cours',
    'RSA':                     a.ressourceRSA ? 'Oui' : 'Non',
    'ASS':                     a.ressourceASS ? 'Oui' : 'Non',
    'ARE':                     a.ressourceARE ? 'Oui' : 'Non',
    'AAH':                     a.ressourceAAH ? 'Oui' : 'Non',
    'ASI':                     a.ressourceASI ? 'Oui' : 'Non',
    'Sans ressources':         a.ressourceSansRessources ? 'Oui' : 'Non',
    'Niveau formation':        a.niveauFormation ? NIVEAUX_FORMATION_FR[a.niveauFormation as keyof typeof NIVEAUX_FORMATION_FR] ?? a.niveauFormation : '',
    'Reconnaissance handicap': a.reconnaissanceHandicap ? 'Oui' : 'Non',
    'Prescripteur':            a.suiviASID ? [a.suiviASID.prescripteurPrenom, a.suiviASID.prescripteurNom].filter(Boolean).join(' ') : '',
    'Référent':                a.suiviASID ? [a.suiviASID.referentPrenom, a.suiviASID.referentNom].filter(Boolean).join(' ') : '',
    'Commune':                 a.suiviASID?.communeResidence ?? '',
    'Observation':             a.observation ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(lignes)
  ws['!cols'] = [
    { wch: 16 }, // Nom
    { wch: 14 }, // Prénom
    { wch: 12 }, // Type
    { wch: 14 }, // Date entrée
    { wch: 14 }, // Date sortie
    { wch: 10 }, // Statut
    { wch: 5 },  // RSA
    { wch: 5 },  // ASS
    { wch: 5 },  // ARE
    { wch: 5 },  // AAH
    { wch: 5 },  // ASI
    { wch: 14 }, // Sans ressources
    { wch: 20 }, // Niveau formation
    { wch: 20 }, // Reconnaissance handicap
    { wch: 20 }, // Prescripteur
    { wch: 20 }, // Référent
    { wch: 14 }, // Commune
    { wch: 30 }, // Observation
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Accompagnements')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="accompagnements.xlsx"',
    },
  })
}
