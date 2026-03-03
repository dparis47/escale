import { NextResponse }  from 'next/server'
import * as XLSX          from 'xlsx'
import type { Ressource } from '@prisma/client'
import { auth }           from '@/auth'
import { prisma }         from '@/lib/prisma'
import { parseISO }       from '@/lib/dates'
import { fromPrisma, themesActifs, ARBRE_DEMARCHES } from '@/lib/demarches'

const RESSOURCE_FR: Record<Ressource, string> = {
  RSA:            'RSA',
  ARE:            'ARE',
  ASS:            'ASS',
  AAH:            'AAH',
  INVALIDITE:     'Invalidité',
  IJ:             'IJ (Indemnités journalières)',
  ASI:            'ASI',
  SALAIRE:        'Salaire',
  CONJOINT:       'Ressources conjoint·e',
  SANS_RESSOURCE: 'Sans ressources',
}

const TRANCHES_ORDRE = [
  '< 25 ans', '25–29 ans', '30–34 ans', '35–39 ans', '40–44 ans',
  '45–49 ans', '50–54 ans', '55–60 ans', '> 60 ans', 'Non renseigné',
]

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

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (session.user.role === 'ACCUEIL') return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee  = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const debut  = parseISO(`${annee}-01-01`)
  const fin    = parseISO(`${annee}-12-31`)

  // 1. Visites marquées FSE cette année (toutes avec une Person)
  const visitesFSE = await prisma.visit.findMany({
    where:  { deletedAt: null, fse: true, date: { gte: debut, lte: fin } },
    select: {
      personId: true,
      person:   { select: { genre: true, dateNaissance: true, ressources: true } },
    },
  })

  // Dédoublonnage par personId (chaque personne ne compte qu'une fois)
  type PersonFSE = { genre: string; dateNaissance: Date | null; ressources: Ressource[] }
  const personnesFSE = new Map<number, PersonFSE>()

  for (const v of visitesFSE) {
    if (!personnesFSE.has(v.personId)) {
      personnesFSE.set(v.personId, {
        genre:         v.person.genre,
        dateNaissance: v.person.dateNaissance,
        ressources:    v.person.ressources,
      })
    }
  }

  const totalFSE = personnesFSE.size
  const nbHommes = [...personnesFSE.values()].filter((p) => p.genre === 'HOMME').length
  const nbFemmes = [...personnesFSE.values()].filter((p) => p.genre === 'FEMME').length

  // 2. Toutes les visites des personnes FSE cette année (pour démarches)
  const personFSEIds = [...personnesFSE.keys()]
  const toutesVisitesFSE = await prisma.visit.findMany({
    where: {
      deletedAt: null,
      date:      { gte: debut, lte: fin },
      ...(personFSEIds.length > 0 ? { personId: { in: personFSEIds } } : { id: -1 }),
    },
    select: {
      orienteParFT: true,
      demarches:    true,
    },
  })

  // Comptage des démarches par thème
  const themesMap = new Map<string, number>()
  for (const v of toutesVisitesFSE) {
    if (v.demarches) {
      const actifs = themesActifs(fromPrisma(v.demarches as unknown as Record<string, unknown>))
      for (const id of actifs) {
        themesMap.set(id, (themesMap.get(id) ?? 0) + 1)
      }
    }
  }

  const nbOrienteParFT = toutesVisitesFSE.filter((v) => v.orienteParFT).length

  // === Feuille 1 : Synthèse ===
  const syntheseRows = [
    { Indicateur: 'Total personnes FSE+',                  Nombre: totalFSE },
    { Indicateur: 'Hommes',                                Nombre: nbHommes },
    { Indicateur: 'Femmes',                                Nombre: nbFemmes },
    { Indicateur: `Total visites FSE+ (${annee})`,         Nombre: toutesVisitesFSE.length },
  ]

  // === Feuille 2 : Tranches d'âge ===
  const tranchesMap = new Map<string, number>()
  for (const t of TRANCHES_ORDRE) tranchesMap.set(t, 0)
  for (const p of personnesFSE.values()) {
    const t = trancheAge(p.dateNaissance, annee)
    tranchesMap.set(t, (tranchesMap.get(t) ?? 0) + 1)
  }
  const tranchesRows = TRANCHES_ORDRE.map((t) => ({
    [`Tranche d'âge (au 01/01/${annee})`]: t,
    Nombre: tranchesMap.get(t) ?? 0,
  }))

  // === Feuille 3 : Ressources ===
  const ressourcesMap = new Map<Ressource, number>()
  for (const p of personnesFSE.values()) {
    for (const r of p.ressources) {
      ressourcesMap.set(r, (ressourcesMap.get(r) ?? 0) + 1)
    }
  }
  const nbRessourcesInconnues = [...personnesFSE.values()].filter((p) => p.ressources.length === 0).length
  const ressourcesRows = [
    ...(Object.entries(RESSOURCE_FR) as [Ressource, string][]).map(([cle, label]) => ({
      'Type de ressource': label,
      Nombre: ressourcesMap.get(cle) ?? 0,
    })),
    { 'Type de ressource': 'Ressources non renseignées', Nombre: nbRessourcesInconnues },
  ]

  // === Feuille 4 : Démarches ===
  const demarchesRows = [
    ...ARBRE_DEMARCHES.map((theme) => ({
      Thème:        theme.label,
      'Nb visites': themesMap.get(theme.id) ?? 0,
    })),
    { Thème: '  ↳ Orienté·e par France Travail', 'Nb visites': nbOrienteParFT },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(syntheseRows),   'Synthèse')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tranchesRows),   "Tranches d'âge")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ressourcesRows), 'Ressources')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demarchesRows),  'Démarches')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bilan-fse-${annee}.xlsx"`,
    },
  })
}
