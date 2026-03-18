import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'

export default async function ModifierAtelierGroupePage({
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

  // Charger la séance de référence
  const reference = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: { themeRef: true, prestataire: true },
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
    orderBy: { date: 'asc' },
  })

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Modifier l&apos;atelier</h1>
        <p className="text-sm text-muted-foreground">
          {reference.themeRef.nom}
          {reference.prestataire && ` — ${reference.prestataire.nom}`}
          {reference.lieu && ` — ${reference.lieu}`}
        </p>
      </div>
      <FormulaireAtelier
        mode="edition-groupe"
        atelier={{
          id:            reference.id,
          themeId:       reference.themeId,
          themeNom:      reference.themeRef.nom,
          themeAutre:    reference.themeAutre,
          prestataireId: reference.prestataireId,
          lieu:          reference.lieu,
          date:          reference.date,
          notes:         reference.notes,
        }}
        seancesExistantes={seances.map((s) => ({
          id:         s.id,
          date:       s.date,
          themeAutre: s.themeAutre,
        }))}
        retourUrl={`/ateliers/groupe/${id}`}
      />
    </main>
  )
}
