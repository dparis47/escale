import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SelecteurAnnee } from '@/components/bilans/selecteur-annee'

export default async function BilanPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ACCUEIL') redirect('/')

  const params        = await searchParams
  const anneeActuelle = new Date().getFullYear()
  const annee         = Number(params.annee ?? anneeActuelle)

  // Bornes de la plage disponible (1re visite enregistrée)
  const premiereVisite = await prisma.visit.findFirst({
    where:   { deletedAt: null },
    orderBy: { date: 'asc' },
    select:  { date: true },
  })
  const anneeMin = premiereVisite ? premiereVisite.date.getFullYear() : anneeActuelle

  const bilans = [
    { href: `/bilans/france-travail?annee=${annee}`,        titre: 'France Travail',        style: 'border-blue-400   bg-blue-50   text-blue-700' },
    { href: `/bilans/cpam?annee=${annee}`,                  titre: 'CPAM',                  style: 'border-teal-400   bg-teal-50   text-teal-700' },
    { href: `/bilans/ars?annee=${annee}`,                   titre: 'ARS',                   style: 'border-purple-400 bg-purple-50 text-purple-700' },
    { href: `/bilans/conseil-departemental?annee=${annee}`, titre: 'Conseil Départemental', style: 'border-amber-400  bg-amber-50  text-amber-700' },
    { href: `/bilans/fse?annee=${annee}`,                   titre: 'FSE+',                  style: 'border-rose-400   bg-rose-50   text-rose-700' },
  ]

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bilans partenaires</h1>
          <p className="text-sm text-muted-foreground">Données agrégées sur l&apos;année civile</p>
        </div>
        <SelecteurAnnee
          anneeMin={anneeMin}
          anneeMax={anneeActuelle}
          anneeSelectionnee={annee}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {bilans.map((b) => (
          <Link key={b.href} href={b.href}>
            <div className={`rounded-lg border-2 p-5 shadow-sm transition-shadow hover:shadow-md flex items-center justify-center min-h-[80px] ${b.style}`}>
              <h2 className="text-base font-semibold text-center">
                {b.titre}
                <span className="block text-sm font-normal opacity-70">{annee}</span>
              </h2>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
