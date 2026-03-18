import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'
import { BoutonExport } from '@/components/bilans/bouton-export'
import { Button } from '@/components/ui/button'

const SUJET_FR: Record<string, string> = {
  SANTE:                 'Santé',
  MOBILITE:              'Mobilité',
  EMPLOI:                'Emploi',
  LOGEMENT:              'Logement',
  ATELIER_REDYNAMISATION: 'Atelier redynamisation',
  PARENTALITE:           'Parentalité',
}

const CATEGORIES: { titre: string; champs: { cle: string; label: string }[] }[] = [
  {
    titre: 'Ouverture et maintien des droits',
    champs: [
      { cle: 'santeCss',                label: 'Dossier CSS' },
      { cle: 'santeCarteVitale',        label: 'Carte Vitale' },
      { cle: 'santeAffiliationSecu',    label: 'Affiliation droits santé' },
      { cle: 'santeAffiliationMutuelle', label: 'Affiliation mutuelle' },
      { cle: 'santeInvalidite',         label: 'Invalidité' },
      { cle: 'santeRattachementEnfants', label: 'Rattachement enfants' },
      { cle: 'santeAme',                label: 'AME' },
    ],
  },
  {
    titre: 'Accès au numérique',
    champs: [
      { cle: 'santeNumeriqueAmeli',       label: 'Création compte AMELI' },
      { cle: 'santeNumeriqueConsultAmeli', label: 'Consultation AMELI' },
    ],
  },
  {
    titre: 'Démarches administratives',
    champs: [
      { cle: 'santeDemarchesEchangeCPAM', label: 'Échange CPAM' },
      { cle: 'santeDemarchesImpression',  label: 'Impression / envoi documents' },
      { cle: 'santeDemarchesInfo',        label: 'Information droits' },
    ],
  },
  {
    titre: 'Accès aux soins',
    champs: [
      { cle: 'santeAccesSoins',  label: 'Démarches accès aux soins' },
      { cle: 'santeMdph',        label: 'Dossier MDPH' },
      { cle: 'santeSuiviSante',  label: 'Suivi parcours soin' },
      { cle: 'santeBilanSante',  label: 'Bilan santé' },
    ],
  },
  {
    titre: 'Orientations partenaires',
    champs: [
      { cle: 'santeOrientCpam',         label: 'CPAM' },
      { cle: 'santeOrientCramif',       label: 'CRAMIF' },
      { cle: 'santeOrientSanteTravail', label: 'Santé au travail' },
      { cle: 'santeOrientMdph',         label: 'MDPH' },
      { cle: 'santeOrientPass',         label: 'PASS' },
      { cle: 'santeOrientAddictologie', label: 'Addictologie' },
      { cle: 'santeOrientMaisonFemmes', label: 'Maison des femmes' },
      { cle: 'santeOrientGemCmpa',      label: 'GEM / CMPA' },
      { cle: 'santeOrientMedecins',     label: 'Médecins' },
      { cle: 'santeOrientDepistage',    label: 'Dépistage' },
    ],
  },
  {
    titre: 'Santé mentale',
    champs: [
      { cle: 'santeMentale',    label: 'Santé mentale' },
      { cle: 'santeSoutienPsy', label: 'Soutien psychologique' },
    ],
  },
]

export default async function BilanCpamPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'bilans')) redirect('/')

  const params        = await searchParams
  const anneeActuelle = new Date().getFullYear()
  const annee         = Number(params.annee ?? anneeActuelle)

  const debut = parseISO(`${annee}-01-01`)
  const fin   = parseISO(`${annee}-12-31`)

  const premiereVisite = await prisma.visit.findFirst({
    where:   { deletedAt: null },
    orderBy: { date: 'asc' },
    select:  { date: true },
  })
  const anneeMin = premiereVisite ? premiereVisite.date.getFullYear() : anneeActuelle

  const demarchesVisite = await prisma.demarches.findMany({
    where: { visit: { deletedAt: null, date: { gte: debut, lte: fin } } },
  })

  const comptages: Record<string, number> = {}
  for (const cat of CATEGORIES) {
    for (const champ of cat.champs) {
      comptages[champ.cle] = demarchesVisite.filter(
        (d) => (d as Record<string, unknown>)[champ.cle] === true
      ).length
    }
  }

  const totalSante = demarchesVisite.filter((d) =>
    CATEGORIES.some((cat) => cat.champs.some((champ) => (d as Record<string, unknown>)[champ.cle] === true))
  ).length

  const entretiens = await prisma.entretien.findMany({
    where:  { deletedAt: null, date: { gte: debut, lte: fin }, accompagnementId: { not: null } },
    select: { accompagnementId: true, sujets: true },
  })

  const totalEntretiens         = entretiens.length
  const personnesDistinctesAsid = new Set(entretiens.map((e) => e.accompagnementId).filter((id): id is number => id !== null)).size

  const sujetsASID = Object.entries(SUJET_FR).map(([cle, label]) => ({
    label,
    count: entretiens.filter((e) => (e.sujets as string[]).includes(cle)).length,
  }))

  return (
    <main className="container mx-auto px-4 py-6 space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/bilans" className="hover:underline">Bilans</Link>
            {' / '}CPAM
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Bilan CPAM — {annee}</h1>
            <BoutonExport type="cpam" annee={annee} />
          </div>
        </div>
        <SelecteurAnnee anneeMin={anneeMin} anneeMax={anneeActuelle} anneeSelectionnee={annee} />
      </div>

      <p className="text-sm text-muted-foreground">
        {totalSante} dossier{totalSante > 1 ? 's' : ''} santé enregistré{totalSante > 1 ? 's' : ''} en {annee}.
      </p>

      {/* Indicateurs CPAM par catégorie */}
      {CATEGORIES.map((cat) => (
        <section key={cat.titre}>
          <h2 className="mb-3 text-lg font-semibold">{cat.titre}</h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Démarche</th>
                  <th className="px-4 py-2 text-right">Nombre</th>
                </tr>
              </thead>
              <tbody>
                {cat.champs.map((champ) => (
                  <tr key={champ.cle} className="border-t">
                    <td className="px-4 py-2">{champ.label}</td>
                    <td className="px-4 py-2 text-right font-medium">{comptages[champ.cle] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Entretiens ASID (ARS) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Entretiens ASID — ARS</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {totalEntretiens} entretien{totalEntretiens > 1 ? 's' : ''} —{' '}
          {personnesDistinctesAsid} personne{personnesDistinctesAsid > 1 ? 's' : ''} distincte{personnesDistinctesAsid > 1 ? 's' : ''} suivie{personnesDistinctesAsid > 1 ? 's' : ''}
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Sujet</th>
                <th className="px-4 py-2 text-right">Nb entretiens</th>
              </tr>
            </thead>
            <tbody>
              {sujetsASID.map((s) => (
                <tr key={s.label} className="border-t">
                  <td className="px-4 py-2">{s.label}</td>
                  <td className="px-4 py-2 text-right font-medium">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <Link href="/bilans">
          <Button variant="ghost" size="sm">← Retour aux bilans</Button>
        </Link>
      </div>
    </main>
  )
}
