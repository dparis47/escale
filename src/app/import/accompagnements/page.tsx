import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireImport } from '@/components/import/formulaire-import'

export default async function ImportAccompagnementsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'accompagnements', 'importer')) redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">← Retour aux imports</Link>
      <h1 className="mb-1 text-2xl font-bold">Import Excel — Accompagnements</h1>
      <FormulaireImport
        apiUrl="/api/import/accompagnements"
        description="Importer des accompagnements FSE+ / ASID depuis un fichier Excel au format export. Les personnes seront recherchées par nom et prénom. Les accompagnements importés seront marqués comme brouillons à compléter."
        colonnesApercu={['nom', 'prenom', 'type', 'dateEntree']}
        labelsApercu={['Nom', 'Prénom', 'Type', 'Date entrée']}
        labelEntite="accompagnement"
      />
    </main>
  )
}
