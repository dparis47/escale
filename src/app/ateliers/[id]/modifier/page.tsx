import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'

export default async function ModifierAtelierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/ateliers')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const atelier = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: {
      themeRef: true,
    },
  })

  if (!atelier) notFound()

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Modifier l&apos;atelier</h1>
        <p className="text-sm text-muted-foreground">
          {atelier.themeRef.nom}
        </p>
      </div>
      <FormulaireAtelier
        mode="edition"
        atelier={{
          id:            atelier.id,
          themeId:       atelier.themeId,
          themeNom:      atelier.themeRef.nom,
          themeAutre:    atelier.themeAutre,
          prestataireId: atelier.prestataireId,
          lieu:          atelier.lieu,
          date:          atelier.date,
          notes:         atelier.notes,
        }}
      />
    </main>
  )
}
