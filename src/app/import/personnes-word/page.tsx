import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireImportDocx } from '@/components/import/formulaire-import-docx'

export default async function ImportPersonnesWordPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'dossiers', 'importer')) redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Retour aux imports
      </Link>
      <h1 className="mb-1 text-2xl font-bold">Import fiches Word (.docx)</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Import des fiches personnes au format Word. Sélectionnez tout un dossier de fiches à la fois.
      </p>
      <FormulaireImportDocx />
    </main>
  )
}
