import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { peutAcceder } from '@/lib/permissions'
import { BoutonEmargementSeance } from '@/components/ateliers/bouton-emargement-seance'

export default async function VoirAtelierGroupePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'ateliers')) redirect('/')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  // Charger la séance de référence
  const reference = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: {
      themeRef: { include: { categorie: true } },
      prestataire: true,
    },
  })
  if (!reference) notFound()

  // Charger toutes les séances sœurs (même thème + prestataire + lieu)
  const seances = await prisma.actionCollective.findMany({
    where: {
      deletedAt: null,
      themeId: reference.themeId,
      prestataireId: reference.prestataireId,
      lieu: reference.lieu,
    },
    include: {
      fichiers: { select: { id: true, nom: true }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { date: 'asc' },
  })

  // Comptage des participants depuis ParticipationAtelier (source de vérité unique)
  const compteurRows = seances.length > 0
    ? await prisma.participationAtelier.groupBy({
        by: ['actionCollectiveId'],
        where: {
          actionCollectiveId: { in: seances.map((s) => s.id) },
          deletedAt: null,
        },
        _count: { id: true },
      })
    : []
  const compteurParSeance = new Map(
    compteurRows.map((r) => [r.actionCollectiveId, r._count.id])
  )

  const peutModifier = peutAcceder(session, 'ateliers', 'creer_modifier')
  const totalParticipants = Array.from(compteurParSeance.values()).reduce((a, b) => a + b, 0)

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      {/* En-tête */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">
            {reference.themeRef.nom}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {reference.themeRef.categorie.nom}
          </p>
          {reference.prestataire && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Prestataire : {reference.prestataire.nom}
            </p>
          )}
          {reference.lieu && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lieu : {reference.lieu}
            </p>
          )}
          {reference.notes && (
            <p className="mt-2 text-sm whitespace-pre-wrap">{reference.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          {peutModifier && (
            <Link href={`/ateliers/groupe/${id}/modifier`}>
              <Button variant="outline">Modifier</Button>
            </Link>
          )}
          <Link href="/ateliers">
            <Button variant="ghost">&larr; Retour</Button>
          </Link>
        </div>
      </div>

      {/* Séances */}
      <h2 className="mb-3 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Séances ({seances.length}) &middot; {totalParticipants} participant{totalParticipants > 1 ? 's' : ''} au total
      </h2>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Titre</th>
              <th className="px-3 py-2 text-center">Participants</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {seances.map((s) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">{formaterDateCourte(s.date)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {s.themeAutre || '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {compteurParSeance.get(s.id) ?? 0}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-0.5">
                    <Link href={`/ateliers/${s.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        Détail
                      </Button>
                    </Link>
                    <BoutonEmargementSeance
                      atelierId={s.id}
                      fichiers={s.fichiers}
                      peutGerer={peutModifier}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
