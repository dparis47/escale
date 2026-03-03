import { NextResponse } from 'next/server'
import * as XLSX         from 'xlsx'
import { auth }          from '@/auth'
import { prisma }        from '@/lib/prisma'
import { parseISO }      from '@/lib/dates'

const SUJET_FR: Record<string, string> = {
  SANTE:                  'Santé',
  MOBILITE:               'Mobilité',
  EMPLOI:                 'Emploi',
  LOGEMENT:               'Logement',
  ATELIER_REDYNAMISATION: 'Atelier redynamisation',
  PARENTALITE:            'Parentalité',
}

const TOUS_CHAMPS: { cle: string; label: string; categorie: string }[] = [
  { cle: 'santeCss',                 label: 'CSS',                           categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeCarteVitale',         label: 'Carte Vitale',                  categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeAffiliationSecu',     label: 'Affiliation droits santé',      categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeAffiliationMutuelle', label: 'Affiliation mutuelle',          categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeInvalidite',          label: 'Invalidité',                    categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeRattachementEnfants', label: 'Rattachement enfants',          categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeAme',                 label: 'AME',                           categorie: 'Ouverture et maintien des droits' },
  { cle: 'santeNumeriqueAmeli',      label: 'Création compte AMELI',         categorie: 'Accès au numérique' },
  { cle: 'santeNumeriqueConsultAmeli', label: 'Consultation AMELI',          categorie: 'Accès au numérique' },
  { cle: 'santeDemarchesEchangeCPAM', label: 'Échange CPAM',                categorie: 'Démarches administratives' },
  { cle: 'santeDemarchesImpression', label: 'Impression / envoi documents',  categorie: 'Démarches administratives' },
  { cle: 'santeDemarchesInfo',       label: 'Information droits',            categorie: 'Démarches administratives' },
  { cle: 'santeAccesSoins',          label: 'Démarches accès aux soins',    categorie: 'Accès aux soins' },
  { cle: 'santeMdph',                label: 'Dossier MDPH',                  categorie: 'Accès aux soins' },
  { cle: 'santeSuiviSante',          label: 'Suivi parcours soin',           categorie: 'Accès aux soins' },
  { cle: 'santeBilanSante',          label: 'Bilan santé',                   categorie: 'Accès aux soins' },
  { cle: 'santeOrientCpam',          label: 'CPAM',                          categorie: 'Orientations partenaires' },
  { cle: 'santeOrientCramif',        label: 'CRAMIF',                        categorie: 'Orientations partenaires' },
  { cle: 'santeOrientSanteTravail',  label: 'Santé au travail',              categorie: 'Orientations partenaires' },
  { cle: 'santeOrientMdph',          label: 'MDPH',                          categorie: 'Orientations partenaires' },
  { cle: 'santeOrientPass',          label: 'PASS',                          categorie: 'Orientations partenaires' },
  { cle: 'santeOrientAddictologie',  label: 'Addictologie',                  categorie: 'Orientations partenaires' },
  { cle: 'santeOrientMaisonFemmes',  label: 'Maison des femmes',             categorie: 'Orientations partenaires' },
  { cle: 'santeOrientGemCmpa',       label: 'GEM / CMPA',                   categorie: 'Orientations partenaires' },
  { cle: 'santeOrientMedecins',      label: 'Médecins',                      categorie: 'Orientations partenaires' },
  { cle: 'santeOrientDepistage',     label: 'Dépistage',                    categorie: 'Orientations partenaires' },
  { cle: 'santeMentale',             label: 'Santé mentale',                 categorie: 'Santé mentale' },
  { cle: 'santeSoutienPsy',          label: 'Soutien psychologique',         categorie: 'Santé mentale' },
]

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (session.user.role === 'ACCUEIL') return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const annee = Number(searchParams.get('annee') ?? new Date().getFullYear())
  const debut = parseISO(`${annee}-01-01`)
  const fin   = parseISO(`${annee}-12-31`)

  const demarchesVisite = await prisma.demarches.findMany({
    where: { visit: { deletedAt: null, date: { gte: debut, lte: fin } } },
  })

  const santRows = TOUS_CHAMPS.map((champ) => ({
    Catégorie: champ.categorie,
    Démarche:  champ.label,
    Nombre:    demarchesVisite.filter((d) => (d as Record<string, unknown>)[champ.cle] === true).length,
  }))

  const entretiens = await prisma.entretien.findMany({
    where:  { deletedAt: null, date: { gte: debut, lte: fin }, accompagnementId: { not: null } },
    select: { accompagnementId: true, sujets: true },
  })

  const arsRows = [
    { Indicateur: 'Total entretiens ASID',         Nombre: entretiens.length },
    { Indicateur: 'Personnes distinctes suivies',  Nombre: new Set(entretiens.map((e) => e.accompagnementId).filter((id): id is number => id !== null)).size },
    ...Object.entries(SUJET_FR).map(([cle, label]) => ({
      Indicateur: label,
      Nombre:     entretiens.filter((e) => (e.sujets as string[]).includes(cle)).length,
    })),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(santRows), 'CPAM')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(arsRows),  'ARS - Entretiens ASID')

  const buffer = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="bilan-cpam-ars-${annee}.xlsx"`,
    },
  })
}
