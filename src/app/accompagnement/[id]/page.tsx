import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { SauvegardeProvider, BoutonEnregistrerGlobal } from '@/contexts/sauvegarde-accompagnement'
import { SectionSuiviFSE } from '@/components/accompagnement/section-suivi-fse'
import { SectionSituationEntree } from '@/components/accompagnement/section-situation-entree'
import { SectionSortieFSE } from '@/components/accompagnement/section-sortie-fse'
import { SectionAccompagnementASID } from '@/components/accompagnement/section-accompagnement-asid'
import { SectionEntretiens } from '@/components/accompagnement/section-entretiens'
import { SectionContrats } from '@/components/accompagnement/section-contrats'
import { SectionCVLM } from '@/components/accompagnement/section-cvlm'
import { SectionAccompagnementEI } from '@/components/accompagnement/section-accompagnement-ei'
import { SectionDemarches } from '@/components/accompagnement/section-demarches'
import { SectionContact } from '@/components/accompagnement/section-contact'
import { BoutonSupprimerAccompagnement } from '@/components/accompagnement/bouton-supprimer-accompagnement'
import { BoutonFinaliserAccompagnement } from '@/components/accompagnement/bouton-finaliser-accompagnement'
import { PopupFichePersonne } from '@/components/accompagnement/popup-fiche-personne'
import { BoutonExportPDFAccompagnement } from '@/components/accompagnement/bouton-export-pdf'
import { peutAcceder } from '@/lib/permissions'
import type { SujetEntretien } from '@prisma/client'

function SectionTitre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
      {children}
    </h2>
  )
}

export default async function FicheAccompagnementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'accompagnements')) redirect('/')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id, deletedAt: null },
    include: {
      person: {
        select: {
          id: true, nom: true, prenom: true, genre: true,
          dateNaissance: true, adresse: true, telephone: true, mobile: true, email: true,
          contratsTravail: {
            where:   { deletedAt: null },
            orderBy: { dateDebut: 'desc' },
          },
          cvs: { select: { id: true, nom: true }, orderBy: { createdAt: 'asc' } },
        },
      },
      sortie:    true,
      demarches: true,
      entretiens: {
        where:   { deletedAt: null },
        orderBy: { date: 'desc' },
      },
      suiviASID: {
        include: {
          prescriptions: { select: { id: true, nom: true, periode: true }, orderBy: { createdAt: 'asc' } },
        },
      },
      suiviEI: true,
    },
  })

  if (!accompagnement) notFound()

  const peutModifier   = peutAcceder(session, 'accompagnements', 'creer_modifier')
  const peutSupprimer  = peutAcceder(session, 'accompagnements', 'supprimer')
  const estEI         = !!accompagnement.suiviEI
  const estBrouillon  = accompagnement.estBrouillon

  // Prescripteurs et référents ASID existants (pour les comboboxes)
  const suivis = accompagnement.suiviASID
    ? await prisma.suiviASID.findMany({
        select: { prescripteurNom: true, prescripteurPrenom: true, referentNom: true, referentPrenom: true },
      })
    : []
  const prescripteurs = [...new Set(
    suivis
      .map((s) => [s.prescripteurNom, s.prescripteurPrenom].filter(Boolean).join(' ').trim())
      .filter(Boolean),
  )].sort()
  const referentsASID = [...new Set(
    suivis
      .map((s) => [s.referentNom, s.referentPrenom].filter(Boolean).join(' ').trim())
      .filter(Boolean),
  )].sort()

  // Âge
  const age = accompagnement.person.dateNaissance
    ? Math.floor((Date.now() - new Date(accompagnement.person.dateNaissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  // Visites tableau journalier (hors entretiens)
  const datesEntretiens = new Set(
    accompagnement.entretiens.map((e) => new Date(e.date).toISOString().slice(0, 10))
  )

  const visites = await prisma.visit.findMany({
    where:   { personId: accompagnement.personId, deletedAt: null },
    orderBy: { date: 'desc' },
    select: {
      id: true, date: true, orienteParFT: true, commentaire: true,
      demarches: { select: { atelierParticipation: true, autresInput: true, actionCollective: { select: { themeRef: { select: { nom: true } }, themeAutre: true } } } },
    },
  })

  const visitesHorsEntretiens = visites.filter(
    (v) => !datesEntretiens.has(new Date(v.date).toISOString().slice(0, 10))
  )

  return (
    <SauvegardeProvider>
    <main className="container mx-auto max-w-6xl px-4 py-6">
      {/* ── En-tête sticky ─────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-background border-b pb-3 mb-4 -mx-4 px-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-blue-700">
                {accompagnement.person.nom.toUpperCase()} {capitaliserPrenom(accompagnement.person.prenom)}
              </h1>
              {!estEI && (
                <BoutonExportPDFAccompagnement
                  id={id}
                  type={accompagnement.suiviASID ? 'asid' : 'fse'}
                  nom={accompagnement.person.nom}
                  prenom={accompagnement.person.prenom}
                />
              )}
              {estEI ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Dossier individuel</span>
              ) : (
                <>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+</span>
                  {accompagnement.suiviASID && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID</span>
                  )}
                </>
              )}
            </div>
            <PopupFichePersonne personId={accompagnement.person.id} label="→ Dossier individuel" />
            {age !== null && (
              <p className="text-sm text-muted-foreground">{age} ans</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {peutModifier && <BoutonEnregistrerGlobal />}
              {peutSupprimer && <BoutonSupprimerAccompagnement id={id} redirectApres="/accompagnement" />}
              <Link href="/accompagnement">
                <Button variant="ghost">← Retour</Button>
              </Link>
            </div>
            {peutModifier && !estEI && !accompagnement.suiviASID && !accompagnement.dateSortie && (
              <Link href={`/accompagnement/nouveau-asid?personId=${accompagnement.personId}`}>
                <Button variant="outline" size="sm" className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100">
                  + Démarrer un acc. ASID
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Bandeau brouillon ─────────────────────────────── */}
      {estBrouillon && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Cet accompagnement a été créé automatiquement depuis un import Excel et n&apos;est pas encore finalisé.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Veuillez compléter les informations (prescripteur, date d&apos;entrée, ressources…) puis cliquer sur le bouton ci-dessous.
          </p>
          {peutModifier && (
            <div className="mt-3">
              <BoutonFinaliserAccompagnement id={id} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">

        {/* ── Contact ───────────────────────────────────────── */}
        <SectionTitre>Contact</SectionTitre>
        <SectionContact
          personId={accompagnement.person.id}
          adresse={accompagnement.person.adresse}
          telephone={accompagnement.person.telephone}
          mobile={accompagnement.person.mobile}
          email={accompagnement.person.email}
        />

        {/* ── Sections spécifiques au type (EI ou FSE/ASID) ── */}
        {estEI ? (
          /* ── Layout EI ──────────────────────────────────── */
          <>
            {peutModifier ? (
              <SectionAccompagnementEI
                accompagnementId={id}
                dateEntree={accompagnement.dateEntree}
                dateSortie={accompagnement.dateSortie}
                observation={accompagnement.observation}
              />
            ) : (
              <>
                <SectionTitre>Dossier individuel</SectionTitre>
                <div className="text-sm space-y-1">
                  <div className="flex gap-2 py-0.5">
                    <span className="w-40 shrink-0 text-muted-foreground">{"Date d'entrée"}</span>
                    <span>{accompagnement.dateEntree ? formaterDateCourte(accompagnement.dateEntree) : '—'}</span>
                  </div>
                  <div className="flex gap-2 py-0.5">
                    <span className="w-40 shrink-0 text-muted-foreground">Date de sortie</span>
                    <span>{accompagnement.dateSortie ? formaterDateCourte(accompagnement.dateSortie) : '—'}</span>
                  </div>
                </div>
              </>
            )}

          </>
        ) : (
          /* ── Layout FSE / ASID ───────────────────────────── */
          <>
            {peutModifier ? (
              <SectionSuiviFSE
                accompagnementId={id}
                dateEntree={accompagnement.dateEntree}
                dateSortie={accompagnement.dateSortie}
                observation={accompagnement.observation}
              />
            ) : (
              <>
                <SectionTitre>Suivi FSE+</SectionTitre>
                <div className="text-sm space-y-1">
                  <div className="flex gap-2 py-0.5">
                    <span className="w-52 shrink-0 text-muted-foreground">{"Date d'entrée"}</span>
                    <span>{accompagnement.dateEntree ? formaterDateCourte(accompagnement.dateEntree) : '—'}</span>
                  </div>
                  <div className="flex gap-2 py-0.5">
                    <span className="w-52 shrink-0 text-muted-foreground">Date de sortie</span>
                    <span>{accompagnement.dateSortie ? formaterDateCourte(accompagnement.dateSortie) : '—'}</span>
                  </div>
                </div>
              </>
            )}

            {peutModifier && (
              <SectionSituationEntree
                accompagnementId={id}
                ressourceRSA={accompagnement.ressourceRSA}
                ressourceASS={accompagnement.ressourceASS}
                ressourceARE={accompagnement.ressourceARE}
                ressourceAAH={accompagnement.ressourceAAH}
                ressourceASI={accompagnement.ressourceASI}
                ressourceSansRessources={accompagnement.ressourceSansRessources}
                avantOccupeEmploi={accompagnement.avantOccupeEmploi}
                avantCDI={accompagnement.avantCDI}
                avantCDDPlus6Mois={accompagnement.avantCDDPlus6Mois}
                avantCDDMoins6Mois={accompagnement.avantCDDMoins6Mois}
                avantInterim={accompagnement.avantInterim}
                avantIAE={accompagnement.avantIAE}
                avantIndependant={accompagnement.avantIndependant}
                avantFormationPro={accompagnement.avantFormationPro}
                avantEnRechercheEmploi={accompagnement.avantEnRechercheEmploi}
                avantNeCherchePasEmploi={accompagnement.avantNeCherchePasEmploi}
                niveauFormation={accompagnement.niveauFormation}
                reconnaissanceHandicap={accompagnement.reconnaissanceHandicap}
                logementSDF={accompagnement.logementSDF}
                logementExclusion={accompagnement.logementExclusion}
              />
            )}

            {peutModifier && (
              <SectionSortieFSE
                accompagnementId={id}
                sortie={accompagnement.sortie}
              />
            )}

            {peutModifier && accompagnement.suiviASID && (
              <SectionAccompagnementASID
                accompagnementId={id}
                suiviASID={accompagnement.suiviASID}
                prescripteurs={prescripteurs}
                referentsASID={referentsASID}
              />
            )}

          </>
        )}

        {/* ── CV - Lettre(s) de motivation ─────────────────── */}
        {peutModifier && (
          <>
            <SectionTitre>CV - Lettre(s) de motivation</SectionTitre>
            <SectionCVLM
              accompagnementId={id}
              cvs={accompagnement.person.cvs}
            />
          </>
        )}

        {/* ── Contrat(s) de travail ────────────────────────── */}
        <SectionTitre>Contrat(s) de travail</SectionTitre>
        {peutModifier ? (
          <SectionContrats
            accompagnementId={id}
            contrats={accompagnement.person.contratsTravail}
          />
        ) : (
          accompagnement.person.contratsTravail.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contrat enregistré.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {accompagnement.person.contratsTravail.map((c) => (
                <li key={c.id} className="flex gap-2">
                  <span className="font-medium">{c.type}</span>
                  <span className="text-muted-foreground">{formaterDateCourte(c.dateDebut)}</span>
                  {c.dateFin && <span className="text-muted-foreground">→ {formaterDateCourte(c.dateFin)}</span>}
                  {c.employeur && <span>{c.employeur}</span>}
                </li>
              ))}
            </ul>
          )
        )}

        {/* ── Entretiens ───────────────────────────────────── */}
        <SectionTitre>Entretiens ({accompagnement.entretiens.length})</SectionTitre>
        <SectionEntretiens
          accompagnementId={id}
          entretiens={accompagnement.entretiens.map((e) => ({
            id:        e.id,
            date:      e.date,
            sujets:    e.sujets as SujetEntretien[],
            notes:     e.notes,
            deletedAt: e.deletedAt,
          }))}
        />

        {/* ── Visites accueil ──────────────────────────────── */}
        <SectionTitre>Visites accueil ({visitesHorsEntretiens.length})</SectionTitre>
        {visitesHorsEntretiens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune visite hors entretien enregistrée.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Infos</th>
                  <th className="px-3 py-2 text-left">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {visitesHorsEntretiens.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {formaterDateCourte(v.date)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {[
                        v.orienteParFT ? 'Orienté par France Travail' : null,
                        v.demarches?.atelierParticipation ? `Atelier : ${v.demarches.actionCollective ? (v.demarches.actionCollective.themeAutre ?? v.demarches.actionCollective.themeRef.nom) : 'oui'}` : null,
                        v.demarches?.autresInput ? `Autres : ${v.demarches.autresInput}` : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {v.commentaire ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>{/* fin colonne principale */}

      <aside className="w-80 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto border-l pl-6">
        <h2 className="sticky top-0 z-10 mb-3 mt-2 rounded-md bg-blue-50 px-2 pt-2 pb-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
          Démarches
        </h2>
        <SectionDemarches
          accompagnementId={id}
          demarches={accompagnement.demarches}
        />
      </aside>
      </div>{/* fin flex */}
    </main>
    </SauvegardeProvider>
  )
}
