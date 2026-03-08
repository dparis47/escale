import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { FormulaireImport } from '@/components/import/formulaire-import'

export default async function ImportPartenairesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">← Retour aux imports</Link>
      <h1 className="mb-1 text-2xl font-bold">Import Excel — Accueil partenaires</h1>
      <FormulaireImport
        apiUrl="/api/import/partenaires"
        description="Importer des entrées partenaires depuis un fichier Excel au format export. Les doublons (même partenaire, même date, même nom) seront ignorés."
        colonnesApercu={['partenaire', 'date', 'nom', 'dateRDV']}
        labelsApercu={['Partenaire', 'Date', 'Nom', 'Date RDV']}
        labelEntite="entrée"
      />
    </main>
  )
}
