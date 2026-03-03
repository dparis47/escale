import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'
import { THEMES_ATELIER_FR } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

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
  })

  if (!atelier) notFound()

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Modifier l&apos;atelier</h1>
        <p className="text-sm text-muted-foreground">
          {THEMES_ATELIER_FR[atelier.theme as ThemeAtelier]}
        </p>
      </div>
      <FormulaireAtelier
        mode="edition"
        atelier={{
          id:          atelier.id,
          theme:       atelier.theme as ThemeAtelier,
          themeAutre:  atelier.themeAutre,
          prestataire: atelier.prestataire,
          lieu:        atelier.lieu,
          date:        atelier.date,
          notes:       atelier.notes,
        }}
      />
    </main>
  )
}
