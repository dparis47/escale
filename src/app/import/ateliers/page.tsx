import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireImport } from '@/components/import/formulaire-import'

export default async function ImportAteliersPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'ateliers', 'importer')) redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">← Retour aux imports</Link>
      <h1 className="mb-1 text-2xl font-bold">Import Excel — Actions collectives</h1>
      <FormulaireImport
        apiUrl="/api/import/ateliers"
        description="Importer des ateliers depuis un fichier Excel au format export. Les doublons (même thème et même date) seront ignorés."
        colonnesApercu={['date', 'theme', 'titre']}
        labelsApercu={['Date', 'Thème', 'Titre']}
        labelEntite="atelier"
      />
    </main>
  )
}
