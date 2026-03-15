import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { peutAcceder } from '@/lib/permissions'
import { Eye, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BoutonSupprimerAccompagnement } from '@/components/accompagnement/bouton-supprimer-accompagnement'
import { BoutonExportAccompagnements } from '@/components/accompagnement/bouton-export-accompagnements'
import { BarreRechercheAuto } from '@/components/ui/barre-recherche-auto'

interface AccompagnementListe {
  id:          number
  dateEntree:  Date
  dateSortie:  Date | null
  estBrouillon: boolean
  person:      { id: number; nom: string; prenom: string }
  suiviASID:   { id: number } | null
}

const PAR_PAGE = 50

export default async function ListeAccompagnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!peutAcceder(session, 'accompagnements')) redirect('/')

  const params = await searchParams
  const q    = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1'))

  const peutModifier   = peutAcceder(session, 'accompagnements', 'creer_modifier')
  const peutSupprimer  = peutAcceder(session, 'accompagnements', 'supprimer')

  const where = {
    deletedAt: null,
    // Exclure les dossiers individuels (EI) — seuls FSE+ et ASID sont listés
    suiviEI: null,
    ...(q.length >= 3
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
  const [accompagnements, total, nbASID, nbBrouillons] = await Promise.all([
    (prisma.accompagnement.findMany as any)({
      where,
      select: {
        id:           true,
        dateEntree:   true,
        dateSortie:   true,
        estBrouillon: true,
        person:    { select: { id: true, nom: true, prenom: true } },
        suiviASID: { select: { id: true } },
      },
      orderBy: [{ person: { nom: 'asc' } }, { person: { prenom: 'asc' } }],
      skip:    (page - 1) * PAR_PAGE,
      take:    PAR_PAGE,
    }) as Promise<AccompagnementListe[]>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.accompagnement.count({ where: where as any }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.suiviASID.count({ where: { accompagnement: where } as any }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.accompagnement.count({ where: { ...where, estBrouillon: true } as any }),
  ])

  const nbFSE      = total
  const totalPages = Math.ceil(total / PAR_PAGE)

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Accompagnements</h1>
            <BoutonExportAccompagnements />
            {peutAcceder(session, 'accompagnements', 'importer') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/import/accompagnements">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Importer Excel</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{total} personne{total > 1 ? 's' : ''}</p>
          {total > 0 && (
            <div className="mt-1 flex gap-1.5">
              {nbFSE > 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+ {nbFSE}</span>}
              {nbASID > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID {nbASID}</span>}
              {nbBrouillons > 0 && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">{nbBrouillons} dossier{nbBrouillons > 1 ? 's' : ''} à compléter</span>}
            </div>
          )}
        </div>
        {peutModifier && (
          <div className="flex gap-2">
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
      <div className="mb-6">
        <BarreRechercheAuto
          placeholder="Rechercher par nom ou prénom…"
          defaultValue={q}
          baseUrl="/accompagnement"
        />
      </div>

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
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {accompagnements.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium text-blue-700">
                    {a.person.nom.toUpperCase()} {capitaliserPrenom(a.person.prenom)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">FSE+</span>
                      {a.suiviASID && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">ASID</span>
                      )}
                      {a.estBrouillon && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Dossier à compléter</span>
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
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/accompagnement/${a.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Voir</TooltipContent>
                      </Tooltip>
                      {peutSupprimer && (
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
