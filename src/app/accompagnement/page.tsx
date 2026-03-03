import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BoutonSupprimerAccompagnement } from '@/components/accompagnement/bouton-supprimer-accompagnement'

interface AccompagnementListe {
  id:        number
  dateEntree: Date
  dateSortie: Date | null
  person:    { id: number; nom: string; prenom: string }
  referent:  { id: number; nom: string; prenom: string } | null
  suiviASID: { id: number } | null
  suiviEI:   { id: number } | null
}

const PAR_PAGE = 50

export default async function ListeAccompagnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ACCUEIL') redirect('/')

  const params = await searchParams
  const q    = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1'))

  const isTS = session.user.role === 'TRAVAILLEUR_SOCIAL'

  const where = {
    deletedAt: null,
    ...(q.length >= 2
      ? {
          person: {
            OR: [
              { nom:    { contains: q, mode: 'insensitive' as const } },
              { prenom: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accompagnements, total, nbEI, nbASID] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.accompagnement.findMany as any)({
      where,
      include: {
        person:    { select: { id: true, nom: true, prenom: true } },
        referent:  { select: { id: true, nom: true, prenom: true } },
        suiviASID: { select: { id: true } },
        suiviEI:   { select: { id: true } },
      },
      orderBy: [{ person: { nom: 'asc' } }, { person: { prenom: 'asc' } }],
      skip:    (page - 1) * PAR_PAGE,
      take:    PAR_PAGE,
    }) as Promise<AccompagnementListe[]>,
    prisma.accompagnement.count({ where }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).suiviEI.count({ where: { accompagnement: where } }) as Promise<number>,
    prisma.suiviASID.count({ where: { accompagnement: where } }),
  ])

  const nbFSE = total - nbEI
  const totalPages = Math.ceil(total / PAR_PAGE)

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accompagnements</h1>
          <p className="text-sm text-muted-foreground">{total} personne{total > 1 ? 's' : ''}</p>
          {total > 0 && (
            <div className="mt-1 flex gap-1.5">
              {nbFSE > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+ {nbFSE}</span>}
              {nbASID > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID {nbASID}</span>}
              {nbEI > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">EI {nbEI}</span>}
            </div>
          )}
        </div>
        {isTS && (
          <div className="flex gap-2">
            <Link href="/accompagnement/nouveau-ei">
              <Button className="border border-orange-200 bg-orange-100 text-orange-700 hover:bg-orange-200">+ Nouveau espace d&apos;insertion</Button>
            </Link>
            <Link href="/accompagnement/nouveau-asid">
              <Button className="border border-blue-400 bg-blue-100 text-blue-800 hover:bg-blue-200">+ Nouveau ASID</Button>
            </Link>
            <Link href="/accompagnement/nouveau-fse">
              <Button className="border border-green-200 bg-green-100 text-green-700 hover:bg-green-200">+ Nouveau FSE+</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Recherche */}
      <form method="GET" className="mb-6">
        <div className="flex max-w-sm gap-2">
          <Input name="q" defaultValue={q} placeholder="Rechercher par nom ou prénom…" autoComplete="off" />
          <Button type="submit" variant="outline">Rechercher</Button>
          {q && (
            <Link href="/accompagnement">
              <Button variant="ghost">✕</Button>
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      {accompagnements.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {q ? `Aucun résultat pour « ${q} »` : 'Aucun accompagnement enregistré.'}
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Personne</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Date d&apos;entrée</th>
                <th className="px-3 py-2 text-left font-medium">Date de sortie</th>
                <th className="px-3 py-2 text-left font-medium">Référent</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {accompagnements.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-blue-700">
                    {a.person.nom.toUpperCase()} {a.person.prenom}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {a.suiviEI ? (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">EI</span>
                      ) : (
                        <>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+</span>
                          {a.suiviASID && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">{formaterDateCourte(a.dateEntree)}</td>
                  <td className="px-3 py-2">
                    {a.dateSortie ? (
                      formaterDateCourte(a.dateSortie)
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">En cours</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {a.referent ? `${a.referent.nom} ${a.referent.prenom}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link href={`/accompagnement/${a.id}`}>
                        <Button variant="outline" size="sm">Voir</Button>
                      </Link>
                      {isTS && (
                        <BoutonSupprimerAccompagnement id={a.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link href={`/accompagnement?q=${q}&page=${page - 1}`}>
              <Button variant="outline" size="sm">← Précédent</Button>
            </Link>
          )}
          <span className="text-muted-foreground">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/accompagnement?q=${q}&page=${page + 1}`}>
              <Button variant="outline" size="sm">Suivant →</Button>
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
