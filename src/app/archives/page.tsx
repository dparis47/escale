'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { peutAcceder, type Permissions } from '@/lib/permissions'
import { SectionPurge } from '@/components/archives/section-purge'

const ONGLETS = [
  { id: 'visites', label: 'Visites' },
  { id: 'personnes', label: 'Personnes' },
  { id: 'accompagnements', label: 'Accompagnements' },
  { id: 'ateliers', label: 'Ateliers' },
] as const

type Onglet = (typeof ONGLETS)[number]['id']

interface VisiteArchivee {
  id: number
  date: string
  deletedAt: string
  supprimePar: string | null
  person: { id: number; nom: string; prenom: string; estInscrit: boolean }
}

interface PersonneArchivee {
  id: number
  nom: string
  prenom: string
  deletedAt: string
  supprimePar: string | null
}

interface AccompagnementArchive {
  id: number
  dateEntree: string
  deletedAt: string
  supprimePar: string | null
  person: { id: number; nom: string; prenom: string }
  suiviASID: { id: number } | null
}

interface AtelierArchive {
  id: number
  date: string
  deletedAt: string
  supprimePar: string | null
  themeRef: { nom: string; categorie: { nom: string } }
}

type Donnees = {
  visites: VisiteArchivee[]
  personnes: PersonneArchivee[]
  accompagnements: AccompagnementArchive[]
  ateliers: AtelierArchive[]
}

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function ArchivesPage() {
  const router = useRouter()
  const { data: sessionData } = useSession()
  const peutPurger = sessionData?.user?.permissions
    ? peutAcceder({ user: { permissions: sessionData.user.permissions as Permissions } }, 'archives', 'purger')
    : false
  const [onglet, setOnglet] = useState<Onglet>('visites')
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [chargement, setChargement] = useState(true)
  const [restaurationEnCours, setRestaurationEnCours] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const res = await fetch('/api/archives')
      if (res.status === 403) {
        router.replace('/')
        return
      }
      if (res.ok) {
        setDonnees(await res.json())
      }
    } finally {
      setChargement(false)
    }
  }, [router])

  useEffect(() => {
    charger()
  }, [charger])

  async function restaurer(type: Onglet, id: number) {
    const cle = `${type}-${id}`
    setRestaurationEnCours(cle)
    try {
      const res = await fetch(`/api/archives/${type}/${id}/restaurer`, {
        method: 'PATCH',
      })
      if (res.ok) {
        await charger()
      }
    } finally {
      setRestaurationEnCours(null)
    }
  }

  const comptes = donnees
    ? {
        visites: donnees.visites.length,
        personnes: donnees.personnes.length,
        accompagnements: donnees.accompagnements.length,
        ateliers: donnees.ateliers.length,
      }
    : null

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Archives</h1>

      {peutPurger && <SectionPurge onPurge={charger} />}

      {/* Onglets */}
      <div className="mb-4 flex gap-1 rounded-lg border bg-muted/50 p-1">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              onglet === o.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {o.label}
            {comptes && comptes[o.id] > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                {comptes[o.id]}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {chargement ? (
        <p className="py-8 text-center text-muted-foreground">Chargement…</p>
      ) : !donnees ? (
        <p className="py-8 text-center text-muted-foreground">Erreur de chargement.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          {onglet === 'visites' && (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Personne</th>
                  <th className="px-3 py-2 text-left">Date visite</th>
                  <th className="px-3 py-2 text-left">Supprimé le</th>
                  <th className="px-3 py-2 text-left">Par</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {donnees.visites.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Aucune visite archivée</td></tr>
                ) : (
                  donnees.visites.map((v) => (
                    <tr key={v.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">
                        {v.person.prenom} {v.person.nom}
                        {!v.person.estInscrit && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(sans fiche)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{formaterDate(v.date)}</td>
                      <td className="px-3 py-2">{formaterDate(v.deletedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.supprimePar ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          disabled={restaurationEnCours === `visites-${v.id}`}
                          onClick={() => restaurer('visites', v.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {onglet === 'personnes' && (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Prénom</th>
                  <th className="px-3 py-2 text-left">Supprimé le</th>
                  <th className="px-3 py-2 text-left">Par</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {donnees.personnes.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Aucune personne archivée</td></tr>
                ) : (
                  donnees.personnes.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{p.nom}</td>
                      <td className="px-3 py-2">{p.prenom}</td>
                      <td className="px-3 py-2">{formaterDate(p.deletedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.supprimePar ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          disabled={restaurationEnCours === `personnes-${p.id}`}
                          onClick={() => restaurer('personnes', p.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {onglet === 'accompagnements' && (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Personne</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Date entrée</th>
                  <th className="px-3 py-2 text-left">Supprimé le</th>
                  <th className="px-3 py-2 text-left">Par</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {donnees.accompagnements.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Aucun accompagnement archivé</td></tr>
                ) : (
                  donnees.accompagnements.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2">{a.person.prenom} {a.person.nom}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {a.suiviASID ? 'ASID + FSE' : 'FSE'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{formaterDate(a.dateEntree)}</td>
                      <td className="px-3 py-2">{formaterDate(a.deletedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.supprimePar ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          disabled={restaurationEnCours === `accompagnements-${a.id}`}
                          onClick={() => restaurer('accompagnements', a.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {onglet === 'ateliers' && (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Catégorie</th>
                  <th className="px-3 py-2 text-left">Thème</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Supprimé le</th>
                  <th className="px-3 py-2 text-left">Par</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {donnees.ateliers.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Aucun atelier archivé</td></tr>
                ) : (
                  donnees.ateliers.map((a) => (
                    <tr key={a.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{a.themeRef.categorie.nom}</td>
                      <td className="px-3 py-2">{a.themeRef.nom}</td>
                      <td className="px-3 py-2">{formaterDate(a.date)}</td>
                      <td className="px-3 py-2">{formaterDate(a.deletedAt)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.supprimePar ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          disabled={restaurationEnCours === `ateliers-${a.id}`}
                          onClick={() => restaurer('ateliers', a.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restaurer
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  )
}
