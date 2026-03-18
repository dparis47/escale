import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formaterDateCourte, capitaliserPrenom } from '@/lib/dates'
import { peutAcceder } from '@/lib/permissions'
import type { PersonneAvecStats } from '@/types/persons'
import { Eye, Pencil, FilePlus, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BoutonSupprimerPersonne } from '@/components/personnes/bouton-supprimer-personne'
import { BoutonExportPersonnes } from '@/components/personnes/bouton-export-personnes'
import { BarreRechercheAuto } from '@/components/ui/barre-recherche-auto'

const PAR_PAGE = 50

export default async function ListePersonnesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const params = await searchParams
  const q    = params.q?.trim() ?? ''
  const page = Math.max(1, Number(params.page ?? '1'))

  const where = {
    deletedAt: null,
    ...(q.length >= 3
      ? {
          OR: [
            { nom:    { contains: q, mode: 'insensitive' as const } },
            { prenom: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [personnes, total] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.person.findMany as any)({
      where,
      include: {
        _count: { select: { visites: { where: { deletedAt: null } } } },
        accompagnements: {
          where:  { deletedAt: null },
          select: { id: true, suiviASID: { select: { id: true, deletedAt: true } }, suiviEI: { select: { id: true } } },
        },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      skip:  (page - 1) * PAR_PAGE,
      take:  PAR_PAGE,
    }) as Promise<PersonneAvecStats[]>,
    prisma.person.count({ where }),
  ])

  const totalPages   = Math.ceil(total / PAR_PAGE)
  const peutModifier      = peutAcceder(session, 'dossiers', 'modifier')
  const peutSupprimerDossier      = peutAcceder(session, 'dossiers', 'supprimer')
  const peutSupprimerAvecAccomp   = peutAcceder(session, 'dossiers', 'supprimer_avec_accompagnement')

  function urlPage(p: number) {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (p > 1) qs.set('page', String(p))
    const str = qs.toString()
    return `/personnes${str ? `?${str}` : ''}`
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Dossiers individuels</h1>
            <BoutonExportPersonnes q={q || undefined} />
            {peutAcceder(session, 'dossiers', 'importer') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/import/personnes">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Download className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Importer Excel</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {total} personne{total > 1 ? 's' : ''} accueillies
          </p>
        </div>
        {peutModifier && (
          <Link href="/personnes/nouvelle">
            <Button>+ Nouveau dossier</Button>
          </Link>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <BarreRechercheAuto
          placeholder="Rechercher par nom ou prénom…"
          defaultValue={q}
          baseUrl="/personnes"
        />
      </div>

      {/* Table */}
      {personnes.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {q ? `Aucun résultat pour « ${q} »` : 'Aucune personne enregistrée.'}
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nom</th>
                <th className="px-3 py-2 text-left font-medium">Prénom</th>
                <th className="px-3 py-2 text-left font-medium">Suivi</th>
                <th className="px-2 py-2 text-center font-medium">Dossier</th>
                <th className="px-3 py-2 text-center font-medium">Visites</th>
                <th className="px-3 py-2 text-left font-medium">Actualisation</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {personnes.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{p.nom.toUpperCase()}</td>
                  <td className="px-3 py-2">{p.prenom ? capitaliserPrenom(p.prenom) : '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {p.accompagnements.some((a) => a.suiviEI === null) && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                          FSE+
                        </span>
                      )}
                      {p.accompagnements.some((a) => a.suiviEI === null && a.suiviASID !== null && a.suiviASID.deletedAt === null) && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                          ASID
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    {!p.estInscrit && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 border border-purple-200 whitespace-nowrap">
                        À faire
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{p._count.visites}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {p.dateActualisation ? formaterDateCourte(p.dateActualisation) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/personnes/${p.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Voir</TooltipContent>
                      </Tooltip>
                      {peutModifier && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/personnes/${p.id}/modifier`}>
                              {!p.estInscrit ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <FilePlus className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>{!p.estInscrit ? 'Créer le dossier' : 'Modifier'}</TooltipContent>
                        </Tooltip>
                      )}
                      {peutSupprimerDossier && (p.accompagnements.every((a) => !!a.suiviEI) || peutSupprimerAvecAccomp) && (
                        <BoutonSupprimerPersonne id={p.id} />
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
            <Link href={urlPage(page - 1)}>
              <Button variant="outline" size="sm">← Précédent</Button>
            </Link>
          )}
          <span className="text-muted-foreground">Page {page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={urlPage(page + 1)}>
              <Button variant="outline" size="sm">Suivant →</Button>
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
