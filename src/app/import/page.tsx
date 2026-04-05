import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'

const IMPORTS = [
  {
    href:        '/import/visites',
    titre:       'Tableau journalier',
    description: 'Importer les visites depuis le tableau journalier papier.',
  },
  {
    href:        '/import/personnes',
    titre:       'Dossiers individuels (Excel)',
    description: 'Importer des fiches personnes depuis un fichier Excel.',
  },
  {
    href:        '/import/personnes-word',
    titre:       'Dossiers individuels (fiches Word)',
    description: 'Importer des fiches personnes depuis les fichiers Word .docx existants.',
  },
  {
    href:        '/import/accompagnements',
    titre:       'Accompagnements',
    description: 'Importer des accompagnements FSE+ / ASID depuis un fichier Excel.',
  },
  {
    href:        '/import/ateliers',
    titre:       'Actions collectives',
    description: 'Importer des ateliers depuis un fichier Excel.',
  },
  {
    href:        '/import/partenaires',
    titre:       'Accueil partenaires',
    description: 'Importer les entrées partenaires depuis un fichier Excel.',
  },
]

export default async function ImportHubPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const peutImporter = peutAcceder(session, 'tableau_journalier', 'importer') ||
    peutAcceder(session, 'dossiers', 'importer') ||
    peutAcceder(session, 'accompagnements', 'importer') ||
    peutAcceder(session, 'ateliers', 'importer') ||
    peutAcceder(session, 'accueil_partenaires', 'importer')
  if (!peutImporter) redirect('/')

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">Import Excel</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Choisissez le type de données à importer. Le format attendu correspond au fichier exporté depuis la page correspondante.
      </p>

      <div className="grid gap-4">
        {IMPORTS.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="rounded-md border p-4 hover:bg-muted/30 transition-colors">
              <h2 className="font-semibold">{item.titre}</h2>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
