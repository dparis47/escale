import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireImportVisites } from '@/components/import/formulaire-import-visites'

export default async function ImportVisitesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'tableau_journalier', 'importer')) redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">← Retour aux imports</Link>
      <h1 className="mb-1 text-2xl font-bold">Import Excel — Tableau journalier</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Importer les visites depuis le tableau journalier papier (format .xlsx ou .xls).
        Les personnes seront recherchées par nom et prénom. Si elles n&apos;existent pas, une fiche
        minimale sera créée automatiquement. Les doublons (même personne, même date) seront ignorés.
      </p>
      <FormulaireImportVisites />
    </main>
  )
}
