import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { BoutonSupprimerPersonne } from '@/components/personnes/bouton-supprimer-personne'
import { SectionInfoPersonne } from '@/components/personnes/section-info-personne'
import { BoutonCompleterFiche } from '@/components/personnes/bouton-completer-fiche'
import { BoutonsAccompagnement } from '@/components/personnes/boutons-accompagnement'
import { BoutonExportPDF } from '@/components/personnes/bouton-export-pdf'
import { SauvegardeProvider, BoutonEnregistrerGlobal } from '@/contexts/sauvegarde-accompagnement'
import { SectionCVLM } from '@/components/accompagnement/section-cvlm'
import { SectionContrats } from '@/components/accompagnement/section-contrats'
import { SectionEntretiens } from '@/components/accompagnement/section-entretiens'
import { SectionDemarches } from '@/components/accompagnement/section-demarches'
import type { SujetEntretien } from '@prisma/client'
import { peutAcceder } from '@/lib/permissions'
import { fromPrisma, themesAvecFeuilles } from '@/lib/demarches'

function SectionTitre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-blue-700">
      {children}
    </h2>
  )
}

export default async function FichePersonnePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const personne = await prisma.person.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { visites: { where: { deletedAt: null } } } },
      visites: {
        where:   { deletedAt: null },
        orderBy: { date: 'desc' },
        select:  {
          id: true, date: true, orienteParFT: true, commentaire: true, fse: true,
          demarches: { include: { actionCollective: { select: { themeRef: { select: { nom: true } }, themeAutre: true } } } },
        },
      },
      accompagnements: {
        where:   { deletedAt: null },
        orderBy: { dateEntree: 'desc' },
        include: { suiviASID: { select: { id: true } } },
      },
      contratsTravail: {
        where:   { deletedAt: null },
        orderBy: { dateDebut: 'desc' },
      },
      cvs: { select: { id: true, nom: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!personne) notFound()

  const isTS              = peutAcceder(session, 'accompagnements', 'creer_modifier')
  const peutModifier      = peutAcceder(session, 'dossiers', 'modifier')
  const peutSupprimerDossier = peutAcceder(session, 'dossiers', 'supprimer')

  // Charger l'accompagnement EI (dossier individuel invisible) avec ses relations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accompEI = await (prisma.accompagnement.findFirst as any)({
    where: {
      personId: id,
      deletedAt: null,
      suiviEI: { isNot: null },
    },
    include: {
      demarches: true,
      entretiens: {
        where:   { deletedAt: null },
        orderBy: { date: 'desc' },
      },
      suiviEI: true,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any

  // Safety net : si aucun EI n'existe, en créer un
  if (!accompEI) {
    const newAccomp = await prisma.accompagnement.create({
      data: { personId: id, dateEntree: new Date() },
    })
    await prisma.demarches.create({ data: { accompagnementId: newAccomp.id } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).suiviEI.create({ data: { accompagnementId: newAccomp.id } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accompEI = await (prisma.accompagnement.findFirst as any)({
      where: { id: newAccomp.id },
      include: {
        demarches: true,
        entretiens: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        suiviEI: true,
      },
    })
  }

  const accompEIId = accompEI.id as number

  // Accompagnements formels (FSE+/ASID seulement, sans les EI)
  const accompagnementsFormels = personne.accompagnements.filter(
    (a) => a.id !== accompEIId
  )

  // Vérifier s'il y a un accompagnement FSE+ ou ASID en cours (sans date de sortie)
  const aFSEEnCours  = accompagnementsFormels.some((a) => !a.dateSortie)
  const aASIDEnCours = accompagnementsFormels.some((a) => !a.dateSortie && a.suiviASID)

  // Suppression : si accompagnements formels existent, permission spécifique requise
  const peutSupprimerPersonne = peutSupprimerDossier && (
    accompagnementsFormels.length === 0 || peutAcceder(session, 'dossiers', 'supprimer_avec_accompagnement')
  )

  return (
    <SauvegardeProvider>
    <main className="container mx-auto max-w-6xl px-4 py-6">
      {/* Bandeau personne sans fiche complétée */}
      {!personne.estInscrit && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Cette personne n&apos;a pas de dossier individuel complété — elle a été créée automatiquement à partir d&apos;une visite.
          </span>
          {peutModifier && <BoutonCompleterFiche />}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background border-b pb-3 mb-4 -mx-4 px-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-bold text-blue-700">
                {personne.nom.toUpperCase()} {capitaliserPrenom(personne.prenom)}
              </h1>
              <BoutonExportPDF id={id} nom={personne.nom} prenom={personne.prenom} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                {personne.dateActualisation
                  ? `Dernière mise à jour le ${formaterDateCourte(personne.dateActualisation)}`
                  : 'Non actualisé'}
              </span>
              {' · '}
              {personne._count.visites} visite{personne._count.visites > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {peutModifier && <BoutonEnregistrerGlobal />}
              {peutSupprimerPersonne && <BoutonSupprimerPersonne id={id} redirectApres="/personnes" />}
              <Link href="/personnes">
                <Button variant="ghost">← Retour</Button>
              </Link>
            </div>
            {isTS && (!aFSEEnCours || !aASIDEnCours) && (
              <BoutonsAccompagnement personId={id} aFSEEnCours={aFSEEnCours} aASIDEnCours={aASIDEnCours} />
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-6 items-start">
      <div className="flex-1 min-w-0">

      {/* ── Infos personne (lecture / édition inline) ──────── */}
      <SectionInfoPersonne personne={personne} />

      {/* ── CV - Lettre(s) de motivation ───────────────────── */}
      {isTS && (
        <>
          <SectionTitre>CV - Lettre(s) de motivation</SectionTitre>
          <SectionCVLM
            accompagnementId={accompEIId}
            cvs={personne.cvs}
          />
        </>
      )}

      {/* ── Contrat(s) de travail ──────────────────────────── */}
      <SectionTitre>Contrat(s) de travail</SectionTitre>
      {isTS ? (
        <SectionContrats
          accompagnementId={accompEIId}
          contrats={personne.contratsTravail}
        />
      ) : (
        personne.contratsTravail.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun contrat enregistré.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {personne.contratsTravail.map((c) => (
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

      {/* ── Entretiens ─────────────────────────────────────── */}
      <SectionTitre>Entretiens ({accompEI.entretiens?.length ?? 0})</SectionTitre>
      <SectionEntretiens
        accompagnementId={accompEIId}
        entretiens={(accompEI.entretiens ?? []).map((e: { id: number; date: Date; sujets: SujetEntretien[]; notes: string | null; deletedAt: Date | null }) => ({
          id:        e.id,
          date:      e.date,
          sujets:    e.sujets as SujetEntretien[],
          notes:     e.notes,
          deletedAt: e.deletedAt,
        }))}
      />

      {/* ── Accompagnements formels (FSE+ / ASID) ──────────── */}
      <SectionTitre>Accompagnements</SectionTitre>
      {accompagnementsFormels.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun accompagnement formel enregistré.</p>
      ) : (
        <div className="space-y-2">
          {accompagnementsFormels.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 text-sm">
              <div className="flex gap-1">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+</span>
                {acc.suiviASID && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID</span>
                )}
              </div>
              <span className="text-muted-foreground">
                {formaterDateCourte(acc.dateEntree)}
                {acc.dateSortie
                  ? ` → ${formaterDateCourte(acc.dateSortie)}`
                  : ' (en cours)'}
              </span>
              <Link href={`/accompagnement/${acc.id}`} className="text-blue-600 hover:underline text-xs">
                Voir →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Historique des visites ──────────────────────────── */}
      <SectionTitre>
        Historique des visites ({personne._count.visites})
      </SectionTitre>
      {personne.visites.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Démarches</th>
                <th className="px-3 py-2 text-left">Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {personne.visites.map((v) => (
                <tr key={v.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {formaterDateCourte(v.date)}
                    {v.fse && (
                      <span className="ml-2 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">FSE</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1.5">
                      {v.orienteParFT && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200 self-start">
                          Orienté(e) par France Travail
                        </span>
                      )}
                      {v.demarches && (() => {
                        const nomThemeAtelier = v.demarches.actionCollective?.themeRef?.nom
                        const themes = themesAvecFeuilles(fromPrisma(v.demarches as unknown as Record<string, unknown>))
                          .filter(({ id }) => !(id === 'ateliers' && nomThemeAtelier))
                        return (
                          <>
                            {themes.map(({ id, label, feuilles }) => (
                              <div key={id}>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{label}</span>
                                <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 pl-1">
                                  {feuilles.map((f) => (
                                    <span key={f} className="text-xs text-muted-foreground">· {f}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {nomThemeAtelier && (
                              <div>
                                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">ATELIERS DE REDYNAMISATION</span>
                                <div className="mt-0.5 pl-1">
                                  <span className="text-xs text-muted-foreground">Atelier : {nomThemeAtelier}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                      {v.demarches?.autresInput && (
                        <p className="text-xs text-muted-foreground">Autres : {v.demarches.autresInput}</p>
                      )}
                      {!v.orienteParFT && !v.demarches && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
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

      {/* ── Sidebar démarches ────────────────────────────────── */}
      <aside className="w-80 shrink-0 sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto border-l pl-6">
        <h2 className="sticky top-0 z-10 mb-3 mt-2 border-b bg-background pb-1 pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Démarches
        </h2>
        <SectionDemarches
          accompagnementId={accompEIId}
          demarches={accompEI.demarches}
        />
      </aside>
      </div>{/* fin flex */}
    </main>
    </SauvegardeProvider>
  )
}
