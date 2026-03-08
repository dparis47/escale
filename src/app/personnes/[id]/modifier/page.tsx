import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { FormulairePersonne } from '@/components/personnes/formulaire-personne'
import type { PersonneAvecStats } from '@/types/persons'

export default async function ModifierPersonnePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'DIRECTION') redirect('/personnes')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const personne = await prisma.person.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { visites: { where: { deletedAt: null } } } },
    },
  }) as (PersonneAvecStats | null)

  if (!personne) notFound()

  return (
    <main className="container mx-auto px-4">
      <FormulairePersonne mode="edition" personne={personne} />
    </main>
  )
}
