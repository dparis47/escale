import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { FormulairePersonne } from '@/components/personnes/formulaire-personne'

export default async function NouvellePersonnePage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nouvelle fiche personne</h1>
      </div>
      <FormulairePersonne mode="creation" />
    </main>
  )
}
