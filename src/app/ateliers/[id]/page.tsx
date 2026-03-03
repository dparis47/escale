import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { SectionParticipants } from '@/components/ateliers/section-participants'
import { THEMES_ATELIER_FR } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

export default async function DetailAtelierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ACCUEIL') redirect('/')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const atelier = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: {
      participants: {
        where: { deletedAt: null },
        include: {
          person: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: [{ person: { nom: 'asc' } }, { person: { prenom: 'asc' } }],
      },
    },
  })

  if (!atelier) notFound()

  const estTS = session.user.role === 'TRAVAILLEUR_SOCIAL'

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      {/* En-tête */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">
            {THEMES_ATELIER_FR[atelier.theme as ThemeAtelier]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formaterDateCourte(atelier.date)}
          </p>
        </div>
        <div className="flex gap-2">
          {estTS && (
            <Link href={`/ateliers/${id}/modifier`}>
              <Button variant="outline">Modifier</Button>
            </Link>
          )}
          <Link href="/ateliers">
            <Button variant="ghost">← Retour</Button>
          </Link>
        </div>
      </div>

      {/* Informations */}
      <div className="mb-6 space-y-1 text-sm">
        {atelier.lieu && (
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-muted-foreground">Lieu</span>
            <span>{atelier.lieu}</span>
          </div>
        )}
        {atelier.prestataire && (
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-muted-foreground">Prestataire</span>
            <span>{atelier.prestataire}</span>
          </div>
        )}
        {atelier.themeAutre && (
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-muted-foreground">Titre</span>
            <span className="font-medium">{atelier.themeAutre}</span>
          </div>
        )}
        {atelier.notes && (
          <div className="flex gap-2">
            <span className="w-32 shrink-0 text-muted-foreground">Notes</span>
            <span className="whitespace-pre-wrap">{atelier.notes}</span>
          </div>
        )}
      </div>

      {/* Participants */}
      <h2 className="mb-3 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Participants ({atelier.participants.length})
      </h2>
      {estTS ? (
        <SectionParticipants
          atelierId={id}
          participants={atelier.participants.map((p) => ({
            id:       p.id,
            personId: p.personId,
            person:   p.person,
          }))}
        />
      ) : (
        /* DIRECTION : lecture seule */
        atelier.participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun participant enregistré.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {atelier.participants.map((p) => (
              <li key={p.id} className="px-3 py-2 text-sm font-medium">
                {p.person.nom.toUpperCase()} {p.person.prenom}
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  )
}
