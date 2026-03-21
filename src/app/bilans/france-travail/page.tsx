import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { parseISO, formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'
import { BoutonExport } from '@/components/bilans/bouton-export'
import { Button } from '@/components/ui/button'

const TYPE_CONTRAT_FR: Record<string, string> = {
  CDI:     'CDI',
  CDD:     'CDD',
  CDDI:    'CDDI',
  INTERIM: 'Intérim',
}

export default async function BilanFranceTravailPage({
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

  // ── Toutes les visites de l'année ──────────────────────────────────────────
  const toutesVisites = await prisma.visit.findMany({
    where:  { deletedAt: null, date: { gte: debut, lte: fin } },
    select: {
      personId:     true,
      orienteParFT: true,
      demarches: {
        select: {
          droitsCafMsa:              true,
          emploiRechercheEmploi:     true,
          emploiConsultationOffres:  true,
          emploiCandidatures:        true,
          emploiProjetProfessionnel: true,
          emploiCvLm:                true,
          emploiEchangeFT:           true,
          emploiInscriptionFT:       true,
          emploiEspaceFT:            true,
          santeRendezVousPASS:       true,
          santeCss:                  true,
          santeCarteVitale:          true,
          santeAffiliation:          true,
          santeInvalidite:           true,
          santeRattachementEnfants:  true,
          santeAme:                  true,
          santeNumeriqueAmeli:       true,
          santeNumeriqueConsultAmeli: true,
          santeDemarchesEchangeCPAM: true,
          santeDemarchesImpression:  true,
          santeDemarchesInfo:        true,
          santeAccesSoins:           true,
          santeMdph:                 true,
          santeSuiviSante:           true,
          santeBilanSante:           true,
          santeOrientCpam:           true,
          santeOrientCramif:         true,
          santeOrientSanteTravail:   true,
          santeOrientMdph:           true,
          santeOrientPass:           true,
          santeOrientAddictologie:   true,
          santeOrientMaisonFemmes:   true,
          santeOrientGemCmpa:        true,
          santeOrientMedecins:       true,
          santeOrientDepistage:      true,
          santeMentale:              true,
          santeSoutienPsy:           true,
          mobilitCarteSolidaire:     true,
          mobilitAutoEcole:          true,
          mobilitBdi:                true,
          mobilitApreva:             true,
          mobilitItineraire:         true,
          mobilitMicroCredit:        true,
          mobilitCovoiturage:        true,
          logementHabitatIndigne:    true,
          logementDemenagement:      true,
          logementAcces:             true,
          logementOrientation:       true,
          logementRecherche:         true,
          numeriqueEspaceNumerique:  true,
          numeriqueAccompagnement:   true,
          numeriqueCoursInfo:        true,
          autresInfoConseil:         true,
          isolementLienSocial:       true,
          atelierParticipation:      true,
        },
      },
    },
  })

  type V = typeof toutesVisites[0]
  type D = NonNullable<V['demarches']>

  // ── Predicats par thème ───────────────────────────────────────────────────
  function aEmploi(v: V): boolean {
    const d = v.demarches
    if (!d) return false
    return d.emploiCvLm || d.emploiRechercheEmploi || d.emploiConsultationOffres ||
      d.emploiCandidatures || d.emploiProjetProfessionnel || d.emploiInscriptionFT ||
      d.emploiEspaceFT || d.emploiEchangeFT
  }

  function aSante(d: D | null): boolean {
    if (!d) return false
    return d.santeRendezVousPASS || d.santeCss || d.santeCarteVitale || d.santeAffiliation ||
      d.santeInvalidite || d.santeRattachementEnfants || d.santeAme ||
      d.santeNumeriqueAmeli || d.santeNumeriqueConsultAmeli ||
      d.santeDemarchesEchangeCPAM || d.santeDemarchesImpression || d.santeDemarchesInfo ||
      d.santeAccesSoins || d.santeMdph || d.santeSuiviSante || d.santeBilanSante ||
      d.santeOrientCpam || d.santeOrientCramif || d.santeOrientSanteTravail ||
      d.santeOrientMdph || d.santeOrientPass || d.santeOrientAddictologie ||
      d.santeOrientMaisonFemmes || d.santeOrientGemCmpa || d.santeOrientMedecins ||
      d.santeOrientDepistage || d.santeMentale || d.santeSoutienPsy
  }

  function aMobilite(d: D | null): boolean {
    if (!d) return false
    return d.mobilitCarteSolidaire || d.mobilitAutoEcole || d.mobilitBdi ||
      d.mobilitApreva || d.mobilitItineraire || d.mobilitMicroCredit || d.mobilitCovoiturage
  }

  function aLogement(d: D | null): boolean {
    if (!d) return false
    return d.logementHabitatIndigne || d.logementDemenagement || d.logementAcces ||
      d.logementOrientation || d.logementRecherche
  }

  // Clé unique par personne
  function clePersonne(v: { personId: number }) {
    return `id:${v.personId}`
  }

  // ── Calculs Partie 1 (toutes personnes) ───────────────────────────────────
  const totalVisites   = toutesVisites.length
  const totalVisiteurs = new Set(toutesVisites.map(clePersonne).filter(Boolean)).size

  function nbVisites(pred: (v: V) => boolean) {
    return toutesVisites.filter(pred).length
  }

  const demarchesParType = [
    { label: 'CAF / MSA',                   nb: nbVisites((v) => v.demarches?.droitsCafMsa ?? false) },
    { label: 'Santé',                        nb: nbVisites((v) => aSante(v.demarches)) },
    { label: 'Logement',                     nb: nbVisites((v) => aLogement(v.demarches)) },
    { label: 'Mobilité',                     nb: nbVisites((v) => aMobilite(v.demarches)) },
    { label: 'Accès espace numérique',       nb: nbVisites((v) => !!(v.demarches?.numeriqueEspaceNumerique || v.demarches?.numeriqueAccompagnement)) },
    { label: 'Info / Conseil / Orientation', nb: nbVisites((v) => !!(v.demarches?.autresInfoConseil || v.demarches?.isolementLienSocial)) },
    { label: 'Ateliers',                     nb: nbVisites((v) => v.demarches?.atelierParticipation ?? false) },
    { label: 'Démarches emploi',             nb: nbVisites(aEmploi) },
  ]

  const totalDemarches = demarchesParType.reduce((acc, d) => acc + d.nb, 0)

  // Cours informatique
  const nbCoursinformatique = nbVisites((v) => v.demarches?.numeriqueCoursInfo ?? false)

  // ── Personnes emploi (Partie 2) ────────────────────────────────────────────
  const visitesEmploi    = toutesVisites.filter(aEmploi)
  const emploiCles       = new Set(visitesEmploi.map(clePersonne).filter(Boolean) as string[])
  const emploiPersonIds  = [...new Set(visitesEmploi.map((v) => v.personId))]
  const nbPersonnesEmploi = emploiCles.size

  // Détail démarches emploi
  function nbP2Personnes(pred: (v: V) => boolean) {
    return new Set(
      toutesVisites
        .filter((v) => emploiCles.has(clePersonne(v) ?? '') && pred(v))
        .map(clePersonne)
        .filter(Boolean)
    ).size
  }
  function nbP2Visites(pred: (v: V) => boolean) {
    return toutesVisites.filter((v) => emploiCles.has(clePersonne(v) ?? '') && pred(v)).length
  }

  const isEmploiCle = (v: V) => emploiCles.has(clePersonne(v) ?? '')

  const visitesCV = toutesVisites.filter((v) => isEmploiCle(v) && (v.demarches?.emploiCvLm ?? false))
  const visitesRecherche = toutesVisites.filter((v) =>
    isEmploiCle(v) && !!(v.demarches?.emploiConsultationOffres || v.demarches?.emploiCandidatures || v.demarches?.emploiProjetProfessionnel)
  )
  const visitesAdmin = toutesVisites.filter((v) => isEmploiCle(v) && (v.demarches?.emploiEchangeFT ?? false))

  const nbPersonnesCV        = new Set(visitesCV.map(clePersonne).filter(Boolean)).size
  const nbDemarchesCV        = visitesCV.length
  const nbPersonnesRecherche = new Set(visitesRecherche.map(clePersonne).filter(Boolean)).size
  const nbDemarchesRecherche = visitesRecherche.length
  const nbPersonnesAdmin     = new Set(visitesAdmin.map(clePersonne).filter(Boolean)).size
  const nbDemarchesAdmin     = visitesAdmin.length
  const totalDemarchesEmploi = nbDemarchesCV + nbDemarchesRecherche + nbDemarchesAdmin

  const nbNumeriqueFT    = nbP2Personnes((v) => !!(v.demarches?.numeriqueEspaceNumerique || v.demarches?.numeriqueAccompagnement))
  const nbInscriptionsFT = nbP2Visites((v) => v.demarches?.emploiInscriptionFT ?? false)
  const nbOrientesFT     = new Set(
    toutesVisites.filter((v) => isEmploiCle(v) && v.orienteParFT).map(clePersonne).filter(Boolean)
  ).size
  const pctOrientesFT = nbPersonnesEmploi > 0 ? Math.round((nbOrientesFT / nbPersonnesEmploi) * 100) : 0

  // Freins périphériques (parmi personnes emploi)
  const freins = [
    { label: 'Santé',        nb: nbP2Personnes((v) => aSante(v.demarches)) },
    { label: 'CAF / MSA',    nb: nbP2Personnes((v) => v.demarches?.droitsCafMsa ?? false) },
    { label: 'Logement',     nb: nbP2Personnes((v) => aLogement(v.demarches)) },
    { label: 'Mobilité',     nb: nbP2Personnes((v) => aMobilite(v.demarches)) },
    { label: 'Informatique', nb: nbP2Personnes((v) => v.demarches?.numeriqueCoursInfo ?? false) },
  ]

  // ── Requêtes parallèles ────────────────────────────────────────────────────
  type AtelierStat = { themeNom: string; seances: bigint; personnes: bigint; presences: bigint }
  type AtelierEmploiStat = { themeNom: string; personnes: bigint }

  const [
    ateliersStats,
    ateliersEmploiStats,
    asidsNouveaux,
    asidsEnCours,
    accoGloCount,
    contrats,
    nbBilansSante,
  ] = await Promise.all([
    // Ateliers par thème — tous visiteurs
    prisma.$queryRaw<AtelierStat[]>(Prisma.sql`
      SELECT
        t.nom AS "themeNom",
        COUNT(DISTINCT ac.id)::bigint AS seances,
        COUNT(DISTINCT v."personId")::bigint AS personnes,
        COUNT(v.id)::bigint AS presences
      FROM "ActionCollective" ac
      JOIN "ThemeAtelierRef" t ON t.id = ac."themeId"
      LEFT JOIN "VisiteAtelier" va ON va."actionCollectiveId" = ac.id AND va."deletedAt" IS NULL
      LEFT JOIN "Visit" v
        ON  v.id = va."visitId"
        AND v."deletedAt" IS NULL
      WHERE ac."deletedAt" IS NULL
        AND ac.date >= ${debut}
        AND ac.date <= ${fin}
      GROUP BY t.nom
      ORDER BY t.nom
    `),

    // Ateliers — personnes emploi uniquement
    emploiPersonIds.length > 0
      ? prisma.$queryRaw<AtelierEmploiStat[]>(Prisma.sql`
          SELECT t.nom AS "themeNom", COUNT(DISTINCT v."personId")::bigint AS personnes
          FROM "ActionCollective" ac
          JOIN "ThemeAtelierRef" t ON t.id = ac."themeId"
          JOIN "VisiteAtelier" va ON va."actionCollectiveId" = ac.id AND va."deletedAt" IS NULL
          JOIN "Visit" v
            ON  v.id          = va."visitId"
            AND v."deletedAt" IS NULL
            AND v."personId" IN (${Prisma.join(emploiPersonIds)})
          WHERE ac."deletedAt" IS NULL
            AND ac.date >= ${debut}
            AND ac.date <= ${fin}
          GROUP BY t.nom
          ORDER BY t.nom
        `)
      : Promise.resolve<AtelierEmploiStat[]>([]),

    // ASID nouveaux
    prisma.suiviASID.count({
      where: { deletedAt: null, dateEntree: { gte: debut, lte: fin } },
    }),

    // ASID en cours
    prisma.suiviASID.count({
      where: {
        deletedAt:  null,
        dateEntree: { lte: fin },
        OR: [{ dateSortie: null }, { dateSortie: { gte: debut } }],
      },
    }),

    // AccoGlo FT
    emploiPersonIds.length > 0
      ? prisma.person.count({
          where: { deletedAt: null, accoGlo: true, id: { in: emploiPersonIds } },
        })
      : Promise.resolve(0),

    // Contrats de travail
    prisma.contratTravail.findMany({
      where:   { deletedAt: null, dateDebut: { gte: debut, lte: fin } },
      include: { person: { select: { nom: true, prenom: true } } },
      orderBy: { dateDebut: 'asc' },
    }),

    // Bilans de santé
    prisma.demarches.count({
      where: {
        visit:        { deletedAt: null, date: { gte: debut, lte: fin } },
        santeBilanSante: true,
      },
    }),
  ])

  const ateliersMap       = new Map(ateliersStats.map((r) => [r.themeNom, r]))
  const ateliersEmploiMap = new Map(ateliersEmploiStats.map((r) => [r.themeNom, Number(r.personnes)]))

  const totalAteliersSeances  = ateliersStats.reduce((acc, r) => acc + Number(r.seances), 0)
  const totalAteliersPersonnes = ateliersStats.reduce((acc, r) => acc + Number(r.personnes), 0)
  const totalAteliersPresences = ateliersStats.reduce((acc, r) => acc + Number(r.presences), 0)

  const contratsParType = {
    CDI:     contrats.filter((c) => c.type === 'CDI').length,
    CDD:     contrats.filter((c) => c.type === 'CDD').length,
    CDDI:    contrats.filter((c) => c.type === 'CDDI').length,
    INTERIM: contrats.filter((c) => c.type === 'INTERIM').length,
  }

  const themesAvecAteliers = [...ateliersMap.keys()]

  // Suppress unused warning for ateliersEmploiMap (used in JSX below)
  void ateliersEmploiMap

  return (
    <main className="container mx-auto px-4 py-6 space-y-8">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 text-sm text-muted-foreground">
            <Link href="/bilans" className="hover:underline">Bilans</Link>
            {' / '}France Travail
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Bilan France Travail — {annee}</h1>
            <BoutonExport type="france-travail" annee={annee} />
          </div>
        </div>
        <SelecteurAnnee anneeMin={anneeMin} anneeMax={anneeActuelle} anneeSelectionnee={annee} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PARTIE 1 — Toutes les personnes accueillies
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border-l-4 border-blue-400 pl-4">
        <h2 className="text-xl font-bold text-blue-700">
          Partie 1 — Visites et démarches accueil
        </h2>
        <p className="text-sm text-muted-foreground">Ensemble des personnes venues sur la structure en {annee}</p>
      </div>

      {/* Vue d'ensemble */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Vue d&apos;ensemble</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2 font-medium">Personnes accueillies (avec et sans fiche)</td>
                <td className="px-4 py-2 text-right font-bold text-lg">{totalVisiteurs}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Total visites</td>
                <td className="px-4 py-2 text-right font-medium">{totalVisites}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Total démarches (par type)</td>
                <td className="px-4 py-2 text-right font-medium">{totalDemarches}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Démarches par type */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Démarches par type</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Type de démarche</th>
                <th className="px-4 py-2 text-right">Nb visites</th>
              </tr>
            </thead>
            <tbody>
              {demarchesParType.map((d) => (
                <tr key={d.label} className="border-t">
                  <td className="px-4 py-2">{d.label}</td>
                  <td className="px-4 py-2 text-right font-medium">{d.nb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ateliers de redynamisation */}
      <section>
        <h3 className="mb-1 text-base font-semibold">Ateliers de redynamisation</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          {totalAteliersPersonnes} personne{totalAteliersPersonnes > 1 ? 's' : ''} concernée{totalAteliersPersonnes > 1 ? 's' : ''} — {totalAteliersPresences} présence{totalAteliersPresences > 1 ? 's' : ''} au total
        </p>
        {themesAvecAteliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun atelier enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Thème</th>
                  <th className="px-4 py-2 text-right">Séances</th>
                  <th className="px-4 py-2 text-right">Personnes</th>
                  <th className="px-4 py-2 text-right">Présences</th>
                </tr>
              </thead>
              <tbody>
                {themesAvecAteliers.map((themeNom) => {
                  const r = ateliersMap.get(themeNom)!
                  return (
                    <tr key={themeNom} className="border-t">
                      <td className="px-4 py-2">{themeNom}</td>
                      <td className="px-4 py-2 text-right">{Number(r.seances)}</td>
                      <td className="px-4 py-2 text-right">{Number(r.personnes)}</td>
                      <td className="px-4 py-2 text-right font-medium">{Number(r.presences)}</td>
                    </tr>
                  )
                })}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">{totalAteliersSeances}</td>
                  <td className="px-4 py-2 text-right">{totalAteliersPersonnes}</td>
                  <td className="px-4 py-2 text-right">{totalAteliersPresences}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cours informatique & Actions santé */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section>
          <h3 className="mb-3 text-base font-semibold">Cours informatique (PASS Numérique)</h3>
          <div className="rounded-md border px-4 py-3 text-sm">
            <span className="font-medium">{nbCoursinformatique}</span> visite{nbCoursinformatique > 1 ? 's' : ''} enregistrée{nbCoursinformatique > 1 ? 's' : ''}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-base font-semibold">Actions santé</h3>
          <div className="rounded-md border px-4 py-3 text-sm">
            <span className="font-medium">{nbBilansSante}</span> bilan{nbBilansSante > 1 ? 's' : ''} de santé réalisé{nbBilansSante > 1 ? 's' : ''}
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PARTIE 2 — Accompagnements emploi
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="mt-4 rounded-lg border-l-4 border-green-500 pl-4">
        <h2 className="text-xl font-bold text-green-700">
          Partie 2 — Accompagnements emploi
        </h2>
        <p className="text-sm text-muted-foreground">Personnes ayant réalisé des démarches emploi en {annee}</p>
      </div>

      {/* Vue d'ensemble emploi */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Vue d&apos;ensemble</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2 font-medium">Personnes accompagnées (emploi)</td>
                <td className="px-4 py-2 text-right font-bold text-lg">{nbPersonnesEmploi}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">dont orientées par France Travail</td>
                <td className="px-4 py-2 text-right font-medium">{nbOrientesFT} ({pctOrientesFT}%)</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">dont en accompagnement global FT (accoGlo)</td>
                <td className="px-4 py-2 text-right font-medium">{accoGloCount}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Total démarches emploi</td>
                <td className="px-4 py-2 text-right font-medium">{totalDemarchesEmploi}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Détail démarches emploi */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Détail des démarches emploi</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Démarche</th>
                <th className="px-4 py-2 text-right">Personnes</th>
                <th className="px-4 py-2 text-right">Nb visites</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">CV / Lettre de motivation</td>
                <td className="px-4 py-2 text-right">{nbPersonnesCV}</td>
                <td className="px-4 py-2 text-right font-medium">{nbDemarchesCV}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Recherche emploi (offres, candidatures, projet pro)</td>
                <td className="px-4 py-2 text-right">{nbPersonnesRecherche}</td>
                <td className="px-4 py-2 text-right font-medium">{nbDemarchesRecherche}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Échanges administratifs (actualisation, espace perso…)</td>
                <td className="px-4 py-2 text-right">{nbPersonnesAdmin}</td>
                <td className="px-4 py-2 text-right font-medium">{nbDemarchesAdmin}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Espace numérique emploi</td>
                <td className="px-4 py-2 text-right">{nbNumeriqueFT}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">—</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Inscriptions / réinscriptions FT</td>
                <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                <td className="px-4 py-2 text-right font-medium">{nbInscriptionsFT}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Freins périphériques */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Démarches de levée des freins périphériques</h3>
        <p className="mb-3 text-sm text-muted-foreground">Parmi les personnes accompagnées en emploi</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Frein</th>
                <th className="px-4 py-2 text-right">Personnes concernées</th>
              </tr>
            </thead>
            <tbody>
              {freins.map((f) => (
                <tr key={f.label} className="border-t">
                  <td className="px-4 py-2">{f.label}</td>
                  <td className="px-4 py-2 text-right font-medium">{f.nb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ateliers de redynamisation — personnes emploi */}
      {ateliersEmploiStats.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-semibold">Ateliers de redynamisation (personnes emploi)</h3>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Thème</th>
                  <th className="px-4 py-2 text-right">Personnes</th>
                </tr>
              </thead>
              <tbody>
                {ateliersEmploiStats.map((r) => (
                  <tr key={r.themeNom} className="border-t">
                    <td className="px-4 py-2">{r.themeNom}</td>
                    <td className="px-4 py-2 text-right font-medium">{Number(r.personnes)}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-4 py-2 text-right">
                    {ateliersEmploiStats.reduce((acc, r) => acc + Number(r.personnes), 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ASID */}
      <section>
        <h3 className="mb-3 text-base font-semibold">Suivis ASID</h3>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Indicateur</th>
                <th className="px-4 py-2 text-right">Nombre</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Nouveaux suivis ASID en {annee}</td>
                <td className="px-4 py-2 text-right font-medium">{asidsNouveaux}</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Suivis ASID actifs sur {annee}</td>
                <td className="px-4 py-2 text-right font-medium">{asidsEnCours}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Contrats de travail */}
      <section>
        <h3 className="mb-3 text-base font-semibold">
          Contrats de travail trouvés — {contrats.length} au total
        </h3>
        <div className="mb-4 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Nombre</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(contratsParType).map(([type, nb]) => (
                <tr key={type} className="border-t">
                  <td className="px-4 py-2">{TYPE_CONTRAT_FR[type] ?? type}</td>
                  <td className="px-4 py-2 text-right font-medium">{nb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contrats.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Personne</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Début</th>
                  <th className="px-4 py-2 text-left">Fin</th>
                  <th className="px-4 py-2 text-left">Employeur</th>
                  <th className="px-4 py-2 text-left">Ville</th>
                  <th className="px-4 py-2 text-left">Poste</th>
                </tr>
              </thead>
              <tbody>
                {contrats.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2 font-medium">
                      {c.person.nom.toUpperCase()} {capitaliserPrenom(c.person.prenom)}
                    </td>
                    <td className="px-4 py-2">{TYPE_CONTRAT_FR[c.type] ?? c.type}</td>
                    <td className="px-4 py-2">{formaterDateCourte(c.dateDebut)}</td>
                    <td className="px-4 py-2">{c.dateFin ? formaterDateCourte(c.dateFin) : '—'}</td>
                    <td className="px-4 py-2">{c.employeur ?? '—'}</td>
                    <td className="px-4 py-2">{c.ville ?? '—'}</td>
                    <td className="px-4 py-2">{c.poste ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <Link href="/bilans">
          <Button variant="ghost" size="sm">← Retour aux bilans</Button>
        </Link>
      </div>
    </main>
  )
}
