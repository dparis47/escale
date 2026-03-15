import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { peutAcceder } from '@/lib/permissions'
import { FormulaireAtelier } from '@/components/ateliers/formulaire-atelier'

export default async function NouvelAtelierPage({
  searchParams,
}: {
  searchParams: Promise<{ themeId?: string; prestataireId?: string; lieu?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) redirect('/ateliers')

  const params = await searchParams
  const defaultThemeId       = params.themeId       ? Number(params.themeId)       : undefined
  const defaultPrestataireId = params.prestataireId ? Number(params.prestataireId) : undefined
  const defaultLieu          = params.lieu || undefined

  return (
    <main className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Nouvel atelier</h1>
        <p className="text-sm text-muted-foreground">Créer une nouvelle action collective</p>
      </div>
      <FormulaireAtelier
        mode="creation"
        defaultThemeId={defaultThemeId}
        defaultPrestataireId={defaultPrestataireId}
        defaultLieu={defaultLieu}
      />
    </main>
  )
}
