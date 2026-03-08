import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { FormulaireNouveauASID } from '@/components/accompagnement/formulaire-nouveau-asid'

export default async function NouveauASIDPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/accompagnement')

  const params = await searchParams
  let personneInitiale: { id: number; nom: string; prenom: string } | null = null

  if (params.personId) {
    const pid = Number(params.personId)
    if (!isNaN(pid)) {
      const p = await prisma.person.findFirst({
        where: { id: pid, deletedAt: null },
        select: { id: true, nom: true, prenom: true },
      })
      if (p) personneInitiale = p
    }
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nouveau suivi ASID</h1>
        <Link href={personneInitiale ? `/personnes/${personneInitiale.id}` : '/accompagnement'}>
          <Button variant="ghost">← Retour</Button>
        </Link>
      </div>
      <FormulaireNouveauASID personneInitiale={personneInitiale} />
    </main>
  )
}
