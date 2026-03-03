import { NextResponse } from 'next/server'
import * as XLSX         from 'xlsx'
import { Prisma }        from '@prisma/client'
import { auth }          from '@/auth'
import { prisma }        from '@/lib/prisma'
import { parseISO }      from '@/lib/dates'
import { THEMES_ATELIER_FR } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

function trancheAge(dateNaissance: Date | null, annee: number): string {
  if (!dateNaissance) return 'Non renseigné'
  const ref = new Date(annee, 0, 1)
  const age = Math.floor((ref.getTime() - dateNaissance.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 25)  return '< 25 ans'
  if (age < 30)  return '25–29 ans'
  if (age < 35)  return '30–34 ans'
  if (age < 40)  return '35–39 ans'
  if (age < 45)  return '40–44 ans'
  if (age < 50)  return '45–49 ans'
  if (age < 55)  return '50–54 ans'
  if (age <= 60) return '55–60 ans'
  return '> 60 ans'
}

const TRANCHES_ORDRE = ['< 25 ans', '25–29 ans', '30–34 ans', '35–39 ans', '40–44 ans', '45–49 ans', '50–54 ans', '55–60 ans', '> 60 ans', 'Non renseigné']

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (session.user.role === 'ACCUEIL') return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const debut = parseISO(`${annee}-01-01`)
  const fin   = parseISO(`${annee}-12-31`)

  const visites = await prisma.visit.findMany({
    where:  { deletedAt: null, date: { gte: debut, lte: fin } },
    select: {
      personId: true,
      person: { select: { genre: true, dateNaissance: true, ressources: true } },
    },
  })

  // Dédoublonnage par personId (toutes les visites ont une Person)
  const visitesParPerson = new Map<number, typeof visites>()
  for (const v of visites) {
    const liste = visitesParPerson.get(v.personId) ?? []
    liste.push(v)
    visitesParPerson.set(v.personId, liste)
  }

  let nbHommes = 0, nbFemmes = 0, nbRegulier = 0, nbOccasionnel = 0
  let nbRessourcesConnues = 0, nbRessourcesInconnues = 0, nbRSA = 0
  const tranchesMap = new Map<string, number>()
  for (const t of TRANCHES_ORDRE) tranchesMap.set(t, 0)

  for (const [, vvv] of visitesParPerson) {
    const genre      = vvv[0].person.genre
    const ressources = vvv[0].person.ressources ?? []
    const dateN      = vvv[0].person.dateNaissance ?? null
    if (genre === 'HOMME') nbHommes++; else nbFemmes++
    if (vvv.length >= 3) nbRegulier++; else nbOccasionnel++
    if (ressources.length > 0) { nbRessourcesConnues++; if (ressources.includes('RSA')) nbRSA++ }
    else nbRessourcesInconnues++
    const tranche = trancheAge(dateN, annee)
    tranchesMap.set(tranche, (tranchesMap.get(tranche) ?? 0) + 1)
  }

  const totalPersonnes = visitesParPerson.size

  const synthRows = [
    { Indicateur: 'Total personnes accueillies',    Nombre: totalPersonnes },
    { Indicateur: 'Hommes',                         Nombre: nbHommes },
    { Indicateur: 'Femmes',                         Nombre: nbFemmes },
    { Indicateur: 'Suivi régulier (≥ 3 visites)',   Nombre: nbRegulier },
    { Indicateur: 'Suivi occasionnel (1-2 visites)', Nombre: nbOccasionnel },
    { Indicateur: 'Ressources connues',             Nombre: nbRessourcesConnues },
    { Indicateur: 'Ressources non renseignées',     Nombre: nbRessourcesInconnues },
    { Indicateur: 'Bénéficiaires RSA',              Nombre: nbRSA },
  ]

  const tranchesRows = TRANCHES_ORDRE.map((t) => ({ Tranche: t, Nombre: tranchesMap.get(t) ?? 0 }))

  type CompteurRow = { theme: string; nbSeances: bigint; nbParticipants: bigint }
  const atelierRows = await prisma.$queryRaw<CompteurRow[]>(Prisma.sql`
    SELECT
      ac.theme,
      COUNT(DISTINCT ac.id)           AS "nbSeances",
      COUNT(DISTINCT pa."personId") FILTER (WHERE pa."deletedAt" IS NULL) AS "nbParticipants"
    FROM "ActionCollective" ac
    LEFT JOIN "ParticipationAtelier" pa ON pa."actionCollectiveId" = ac.id
    WHERE ac."deletedAt" IS NULL
      AND ac.date BETWEEN ${debut} AND ${fin}
    GROUP BY ac.theme
    ORDER BY ac.theme
  `)

  const ateliersExcelRows = atelierRows.map((r) => ({
    Thème:        THEMES_ATELIER_FR[r.theme as ThemeAtelier] ?? r.theme,
    Séances:      Number(r.nbSeances),
    Participants: Number(r.nbParticipants),
  })).sort((a, b) => a.Thème.localeCompare(b.Thème, 'fr'))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthRows),      'Synthèse')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tranchesRows),   "Tranches d'âge")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ateliersExcelRows.length > 0 ? ateliersExcelRows : [{ info: 'Aucun atelier' }]), 'Ateliers')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bilan-conseil-departemental-${annee}.xlsx"`,
    },
  })
}
