import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { FormulaireNouveauFSE } from '@/components/accompagnement/formulaire-nouveau-fse'

export default async function NouveauFSEPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) redirect('/accompagnement')

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
        <h1 className="text-2xl font-bold">Nouveau suivi FSE+</h1>
        <Link href={personneInitiale ? `/personnes/${personneInitiale.id}` : '/accompagnement'}>
          <Button variant="ghost">← Retour</Button>
        </Link>
      </div>
      <FormulaireNouveauFSE personneInitiale={personneInitiale} />
    </main>
  )
}
