import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { FormulaireImport } from '@/components/import/formulaire-import'

export default async function ImportPersonnesPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <Link href="/import" className="text-sm text-blue-600 hover:underline mb-4 block">← Retour aux imports</Link>
      <h1 className="mb-1 text-2xl font-bold">Import Excel — Dossiers individuels</h1>
      <FormulaireImport
        apiUrl="/api/import/personnes"
        description="Importer des fiches personnes depuis un fichier Excel au format export. Les personnes existantes (même nom et prénom) seront mises à jour avec les champs non vides. Les nouvelles personnes seront créées avec un dossier individuel."
        colonnesApercu={['nom', 'prenom', 'genre', 'existe']}
        labelsApercu={['Nom', 'Prénom', 'Genre', 'Existe déjà']}
        labelEntite="personne"
      />
    </main>
  )
}
