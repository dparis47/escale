import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'

export default async function NouvelAtelierPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/ateliers')

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nouvel atelier</h1>
        <p className="text-sm text-muted-foreground">Créer une nouvelle action collective</p>
      </div>
      <FormulaireAtelier mode="creation" />
    </main>
  )
}
