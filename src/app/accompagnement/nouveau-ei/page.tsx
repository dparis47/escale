import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { FormulaireNouveauEI } from '@/components/accompagnement/formulaire-nouveau-ei'

export default async function NouveauEIPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/accompagnement')

  const referents = await prisma.user.findMany({
    where:   { role: 'TRAVAILLEUR_SOCIAL' },
    select:  { id: true, nom: true, prenom: true },
    orderBy: { nom: 'asc' },
  })

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nouvel accompagnement EI</h1>
        <Link href="/accompagnement">
          <Button variant="ghost">← Retour</Button>
        </Link>
      </div>
      <FormulaireNouveauEI referents={referents} />
    </main>
  )
}
