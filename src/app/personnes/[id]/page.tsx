import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import {
  SITUATIONS_FR,
  RESSOURCES_FR,
  ORIENTE_PAR_FR,
} from '@/schemas/person'
import { BoutonSupprimerPersonne } from '@/components/personnes/bouton-supprimer-personne'
import type { SituationFamiliale, OrientePar, Ressource } from '@prisma/client'

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  if (!valeur && valeur !== 0 && valeur !== false) return null
  return (
    <div className="flex gap-2 py-0.5 text-sm">
      <span className="w-48 shrink-0 text-muted-foreground">{label}</span>
      <span>{valeur}</span>
    </div>
  )
}

function OuiNon({ valeur }: { valeur: boolean }) {
  return <span>{valeur ? 'Oui' : 'Non'}</span>
}

function SectionTitre({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-6 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
          demarches: { select: { atelierNoms: true, autresInput: true } },
        },
      },
      accompagnements: {
        where:   { deletedAt: null },
        orderBy: { dateEntree: 'desc' },
        include: { suiviASID: { select: { id: true } } },
      },
    },
  })

  if (!personne) notFound()

  const peutModifier = session.user.role !== 'DIRECTION'

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      {/* Bandeau personne sans fiche */}
      {!personne.estInscrit && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Cette personne n&apos;a pas de fiche d&apos;inscription — elle a été créée automatiquement à partir d&apos;une visite.
          </span>
          {peutModifier && (
            <Link href={`/personnes/${id}/modifier`}>
              <Button size="sm" variant="outline" className="ml-4 border-amber-400 text-amber-800 hover:bg-amber-100">
                Créer la fiche
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">
            {personne.nom} {personne.prenom}
          </h1>
          <p className="text-sm text-muted-foreground">
            {personne.genre === 'HOMME' ? 'Homme' : 'Femme'}
            {' · '}
            {personne._count.visites} visite{personne._count.visites > 1 ? 's' : ''}
          </p>
          {personne.dateActualisation && (
            <p className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-base font-bold text-blue-800">
              Actualisé le {formaterDateCourte(personne.dateActualisation)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {peutModifier && (
            <Link href={`/personnes/${id}/modifier`}>
              <Button variant="outline">Modifier</Button>
            </Link>
          )}
          <BoutonSupprimerPersonne id={id} redirectApres="/personnes" />
          <Link href="/personnes">
            <Button variant="ghost">← Retour</Button>
          </Link>
        </div>
      </div>

      {/* ── Identité ────────────────────────────────────── */}
      <SectionTitre>Identité</SectionTitre>
      <Ligne label="Date de naissance" valeur={personne.dateNaissance ? formaterDateCourte(personne.dateNaissance) : null} />
      <Ligne label="Nationalité"       valeur={personne.nationalite} />

      {/* ── Contact ─────────────────────────────────────── */}
      <SectionTitre>Contact</SectionTitre>
      <Ligne label="Adresse"             valeur={personne.adresse} />
      <Ligne label="Téléphone"           valeur={personne.telephone} />
      <Ligne label="Mobile" valeur={personne.mobile} />
      <Ligne label="Email"  valeur={personne.email} />

      {/* ── Santé ────────────────────────────────────────── */}
      <SectionTitre>Santé</SectionTitre>
      {personne.css        && <Ligne label="CSS"       valeur="Oui" />}
      {personne.rqth       && <Ligne label="RQTH"      valeur="Oui" />}
      {personne.invalidite && (
        <>
          <Ligne label="Invalidité"           valeur="Oui" />
          <Ligne label="Catégorie invalidité" valeur={personne.categorieInvalidite} />
        </>
      )}
      <Ligne label="N° de sécurité sociale" valeur={personne.numeroSecu} />
      {!personne.css && !personne.rqth && !personne.invalidite && !personne.numeroSecu && (
        <p className="text-sm text-muted-foreground">Aucune information renseignée.</p>
      )}

      {/* ── France Travail ───────────────────────────────── */}
      <SectionTitre>France Travail</SectionTitre>
      <Ligne label="N° France Travail"     valeur={personne.numeroFT} />
      <Ligne label="Date d'inscription FT" valeur={personne.dateInscriptionFT ? formaterDateCourte(personne.dateInscriptionFT) : null} />
      <Ligne label="Code personnel (CP)"   valeur={personne.codepersonnelFT} />
      {personne.accoGlo && <Ligne label="Accompagnement global FT" valeur="Oui" />}

      {/* ── CAF & Situation familiale ────────────────────── */}
      <SectionTitre>Situation familiale</SectionTitre>
      <Ligne label="N° CAF"               valeur={personne.numeroCAF} />
      <Ligne label="Situation familiale"  valeur={personne.situationFamiliale ? SITUATIONS_FR[personne.situationFamiliale as SituationFamiliale] : null} />
      <Ligne label="Enfants à charge"     valeur={personne.nombreEnfantsCharge} />
      {personne.agesEnfants.length > 0 && (
        <Ligne label="Âges des enfants" valeur={personne.agesEnfants.join(', ') + ' ans'} />
      )}

      {/* ── Mobilité ─────────────────────────────────────── */}
      <SectionTitre>Mobilité &amp; hébergement</SectionTitre>
      {personne.permisConduire    && <Ligne label="Permis de conduire"  valeur="Oui" />}
      {personne.vehiculePersonnel && <Ligne label="Véhicule personnel"  valeur="Oui" />}
      <Ligne label="Autre(s) locomotion" valeur={personne.autresMoyensLocomotion} />
      <Ligne label="Hébergement"         valeur={personne.hebergement} />

      {/* ── Ressources & Orientation ─────────────────────── */}
      <SectionTitre>Ressources &amp; orientation</SectionTitre>
      {personne.ressources.length > 0 ? (
        <Ligne
          label="Ressources"
          valeur={personne.ressources.map((r) => RESSOURCES_FR[r as Ressource]).join(', ')}
        />
      ) : (
        <Ligne label="Ressources" valeur="Non renseignées" />
      )}
      <Ligne
        label="Orienté(e) par"
        valeur={personne.orientePar ? ORIENTE_PAR_FR[personne.orientePar as OrientePar] : null}
      />
      {personne.enASID && <Ligne label="Suivi ASID" valeur="Oui" />}

      {/* ── Accompagnements ──────────────────────────────── */}
      <SectionTitre>Accompagnements</SectionTitre>
      {personne.accompagnements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun accompagnement enregistré.</p>
      ) : (
        <div className="space-y-2">
          {personne.accompagnements.map((acc) => (
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

      {/* ── Historique des visites ───────────────────────── */}
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
                <th className="px-3 py-2 text-left">Infos</th>
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
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[
                      v.orienteParFT ? 'Orienté par France Travail' : null,
                      v.demarches?.atelierNoms?.length ? `Atelier(s) : ${v.demarches.atelierNoms.join(', ')}` : null,
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
    </main>
  )
}
