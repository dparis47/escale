import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'

export default async function AjouterSeancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) redirect('/ateliers')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const reference = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: { themeRef: true, prestataire: true },
  })
  if (!reference) notFound()

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ajouter des séances</h1>
        <p className="text-sm text-muted-foreground">
          {reference.themeRef.nom}
          {reference.prestataire && ` — ${reference.prestataire.nom}`}
          {reference.lieu && ` — ${reference.lieu}`}
        </p>
      </div>
      <FormulaireAtelier
        mode="ajout-seances"
        defaultThemeId={reference.themeId}
        defaultPrestataireId={reference.prestataireId ?? undefined}
        defaultLieu={reference.lieu ?? undefined}
        retourUrl={`/ateliers/groupe/${id}`}
      />
    </main>
  )
}
