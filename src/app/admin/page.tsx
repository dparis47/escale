'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, UserCheck, Calendar, Briefcase, BookOpen, Archive } from 'lucide-react'

interface Stats {
  utilisateurs: {
    total: number
    parRole: Record<string, number>
    avecOverrides: number
  }
  personnes: {
    total: number
    avecFiche: number
    sansFiche: number
  }
  visites: {
    aujourdhui: number
    ceMois: number
    cetteAnnee: number
  }
  accompagnements: {
    total: number
    enCours: number
    asid: number
  }
  ateliers: {
    total: number
    ceMois: number
  }
  archives: {
    visites: number
    personnes: number
    accompagnements: number
    ateliers: number
    total: number
  }
  audit: AuditEntry[]
}

interface AuditEntry {
  id: number
  action: string
  entite: string
  entiteId: number
  details: string | null
  userName: string
  createdAt: string
}

const ROLES_FR: Record<string, string> = {
  ACCUEIL: 'Accueil',
  TRAVAILLEUR_SOCIAL: 'Travailleur social',
  DIRECTION: 'Direction',
  ADMIN: 'Admin',
}

const ROLES_COULEURS: Record<string, string> = {
  ACCUEIL: 'bg-gray-100 text-gray-700',
  TRAVAILLEUR_SOCIAL: 'bg-blue-100 text-blue-700',
  DIRECTION: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}

const ACTION_LABELS: Record<string, string> = {
  creer: 'Création',
  modifier: 'Modification',
  supprimer: 'Suppression',
  restaurer: 'Restauration',
  purger: 'Purge',
}

const ACTION_COLORS: Record<string, string> = {
  creer: 'bg-green-100 text-green-700',
  modifier: 'bg-blue-100 text-blue-700',
  supprimer: 'bg-red-100 text-red-700',
  restaurer: 'bg-purple-100 text-purple-700',
  purger: 'bg-orange-100 text-orange-700',
}

function Carte({
  titre,
  icone: Icone,
  couleur,
  children,
}: {
  titre: string
  icone: React.ElementType
  couleur: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className={`rounded-md p-1.5 ${couleur}`}>
          <Icone className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold">{titre}</h2>
      </div>
      {children}
    </div>
  )
}

function formaterDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => {
        if (r.status === 403) { router.replace('/'); return null }
        return r.ok ? r.json() : null
      })
      .then((data) => { if (data) setStats(data) })
      .finally(() => setChargement(false))
  }, [router])

  if (chargement) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="py-12 text-center text-muted-foreground">Chargement…</p>
      </main>
    )
  }

  if (!stats) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="py-12 text-center text-muted-foreground">Erreur de chargement.</p>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Administration</h1>

      {/* Cartes de statistiques */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Carte titre="Utilisateurs" icone={Users} couleur="bg-blue-50 text-blue-600">
          <p className="text-2xl font-bold">{stats.utilisateurs.total}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(stats.utilisateurs.parRole).map(([role, count]) =>
              count > 0 ? (
                <span key={role} className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLES_COULEURS[role] ?? 'bg-gray-100 text-gray-700'}`}>
                  {ROLES_FR[role] ?? role} : {count}
                </span>
              ) : null,
            )}
          </div>
          {stats.utilisateurs.avecOverrides > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.utilisateurs.avecOverrides} avec permissions personnalisées
            </p>
          )}
        </Carte>

        <Carte titre="Personnes" icone={UserCheck} couleur="bg-green-50 text-green-600">
          <p className="text-2xl font-bold">{stats.personnes.total}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{stats.personnes.avecFiche} avec dossier</span>
            <span>{stats.personnes.sansFiche} sans dossier</span>
          </div>
        </Carte>

        <Carte titre="Visites" icone={Calendar} couleur="bg-amber-50 text-amber-600">
          <p className="text-2xl font-bold">{stats.visites.cetteAnnee}</p>
          <p className="text-xs text-muted-foreground">cette année</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{stats.visites.aujourdhui} aujourd&apos;hui</span>
            <span>{stats.visites.ceMois} ce mois</span>
          </div>
        </Carte>

        <Carte titre="Accompagnements" icone={Briefcase} couleur="bg-purple-50 text-purple-600">
          <p className="text-2xl font-bold">{stats.accompagnements.total}</p>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{stats.accompagnements.enCours} en cours</span>
            <span>{stats.accompagnements.asid} ASID</span>
          </div>
        </Carte>

        <Carte titre="Actions collectives" icone={BookOpen} couleur="bg-teal-50 text-teal-600">
          <p className="text-2xl font-bold">{stats.ateliers.total}</p>
          <p className="mt-2 text-xs text-muted-foreground">{stats.ateliers.ceMois} ce mois</p>
        </Carte>

        <Carte titre="Archives" icone={Archive} couleur="bg-red-50 text-red-600">
          <p className="text-2xl font-bold">{stats.archives.total}</p>
          <p className="text-xs text-muted-foreground">éléments archivés</p>
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            {stats.archives.visites > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5">{stats.archives.visites} visites</span>}
            {stats.archives.personnes > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5">{stats.archives.personnes} personnes</span>}
            {stats.archives.accompagnements > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5">{stats.archives.accompagnements} accomp.</span>}
            {stats.archives.ateliers > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5">{stats.archives.ateliers} ateliers</span>}
          </div>
          <Link href="/archives" className="mt-2 inline-block text-xs text-blue-600 hover:underline">
            Voir les archives →
          </Link>
        </Carte>
      </div>

      {/* Dernières activités */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dernières activités</h2>
          <Link href="/audit" className="text-xs text-blue-600 hover:underline">
            Voir tout →
          </Link>
        </div>
        {stats.audit.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Aucune activité enregistrée.</p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Utilisateur</th>
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Entité</th>
                  <th className="px-3 py-2 text-left font-medium">Détails</th>
                </tr>
              </thead>
              <tbody>
                {stats.audit.map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formaterDate(log.createdAt)}</td>
                    <td className="px-3 py-2 font-medium">{log.userName}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 capitalize">{log.entite} #{log.entiteId}</td>
                    <td className="px-3 py-2 text-muted-foreground">{log.details ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
