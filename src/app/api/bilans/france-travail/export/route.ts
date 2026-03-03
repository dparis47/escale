import { NextResponse }  from 'next/server'
import * as XLSX          from 'xlsx'
import { auth }           from '@/auth'
import { prisma }         from '@/lib/prisma'
import { parseISO, formaterDateCourte } from '@/lib/dates'

const TYPE_CONTRAT_FR: Record<string, string> = {
  CDI:    'CDI',
  CDD:    'CDD',
  CDDI:   'CDDI',
  INTERIM: 'Intérim',
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (session.user.role === 'ACCUEIL') return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee  = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const debut  = parseISO(`${annee}-01-01`)
  const fin    = parseISO(`${annee}-12-31`)

  const visites = await prisma.visit.findMany({
    where: { deletedAt: null, date: { gte: debut, lte: fin } },
    select: {
      personId:     true,
      orienteParFT: true,
      demarches: {
        select: {
          emploiRechercheEmploi:  true,
          emploiCvLm:             true,
          emploiConsultationOffres: true,
          emploiCandidatures:     true,
          emploiProjetProfessionnel: true,
          emploiInscriptionFT:    true,
          emploiEspaceFT:         true,
          numeriqueAccompagnement: true,
          numeriqueCoursInfo:     true,
          atelierParticipation:   true,
        },
      },
    },
  })

  function compter(pred: (v: typeof visites[0]) => boolean) {
    return visites.filter(pred).length
  }

  const indicateurs = [
    { Indicateur: 'Orienté·e par France Travail',    'Nb visites': compter((v) => v.orienteParFT) },
    { Indicateur: 'Recherche d\'emploi',             'Nb visites': compter((v) => v.demarches?.emploiRechercheEmploi ?? false) },
    { Indicateur: 'CV / Lettre de motivation',       'Nb visites': compter((v) => v.demarches?.emploiCvLm ?? false) },
    { Indicateur: "Consultation d'offres",           'Nb visites': compter((v) => v.demarches?.emploiConsultationOffres ?? false) },
    { Indicateur: 'Candidatures',                    'Nb visites': compter((v) => v.demarches?.emploiCandidatures ?? false) },
    { Indicateur: 'Projet professionnel',            'Nb visites': compter((v) => v.demarches?.emploiProjetProfessionnel ?? false) },
    { Indicateur: 'Inscription / réinscription FT', 'Nb visites': compter((v) => v.demarches?.emploiInscriptionFT ?? false) },
    { Indicateur: 'Espace France Travail',           'Nb visites': compter((v) => v.demarches?.emploiEspaceFT ?? false) },
    { Indicateur: 'Accompagnement numérique',        'Nb visites': compter((v) => v.demarches?.numeriqueAccompagnement ?? false) },
    { Indicateur: 'Ateliers collectifs',             'Nb visites': compter((v) => v.demarches?.atelierParticipation ?? false) },
    { Indicateur: 'Cours informatique',             'Nb visites': compter((v) => v.demarches?.numeriqueCoursInfo ?? false) },
  ]

  const [asidsNouveaux, asidsEnCours] = await Promise.all([
    prisma.suiviASID.count({
      where: { deletedAt: null, dateEntree: { gte: debut, lte: fin } },
    }),
    prisma.suiviASID.count({
      where: {
        deletedAt:  null,
        dateEntree: { lte: fin },
        OR: [{ dateSortie: null }, { dateSortie: { gte: debut } }],
      },
    }),
  ])

  const personnesIds = [...new Set(visites.map((v) => v.personId))]
  const accoGloCount = personnesIds.length > 0
    ? await prisma.person.count({ where: { deletedAt: null, accoGlo: true, id: { in: personnesIds } } })
    : 0

  const asidRows = [
    { Indicateur: `Nouveaux suivis ASID en ${annee}`,   Nombre: asidsNouveaux },
    { Indicateur: `Suivis ASID actifs sur ${annee}`,    Nombre: asidsEnCours },
    { Indicateur: 'Accompagnement global FT (accoGlo)', Nombre: accoGloCount },
  ]

  const contrats = await prisma.contratTravail.findMany({
    where:   { deletedAt: null, dateDebut: { gte: debut, lte: fin } },
    include: { person: { select: { nom: true, prenom: true } } },
    orderBy: { dateDebut: 'asc' },
  })

  const contratsRows = contrats.map((c) => ({
    Personne:  `${c.person.nom.toUpperCase()} ${c.person.prenom}`,
    Type:      TYPE_CONTRAT_FR[c.type] ?? c.type,
    Début:     formaterDateCourte(c.dateDebut),
    Fin:       c.dateFin ? formaterDateCourte(c.dateFin) : '',
    Employeur: c.employeur ?? '',
    Ville:     c.ville ?? '',
    Poste:     c.poste ?? '',
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(indicateurs), 'Visites')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(asidRows),    'ASID')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(contratsRows.length > 0 ? contratsRows : [{ info: 'Aucun contrat' }]), 'Contrats')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bilan-france-travail-${annee}.xlsx"`,
    },
  })
}
