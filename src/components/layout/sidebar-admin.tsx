'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ScrollText, Users, Archive,
  Handshake, CalendarDays, FolderOpen, Briefcase,
  BookOpen, BarChart3,
} from 'lucide-react'
import { peutAcceder, type Permissions } from '@/lib/permissions'

interface Props {
  permissions: Permissions
}

export function SidebarAdmin({ permissions }: Props) {
  const pathname = usePathname()
  const s = { user: { permissions } }

  const liens = [
    // Admin
    { href: '/admin', label: 'Administration', icone: LayoutDashboard, exact: true, visible: true },
    { href: '/audit', label: 'Audit', icone: ScrollText, exact: false, visible: true },
    { href: '/utilisateurs', label: 'Utilisateurs', icone: Users, exact: false, visible: peutAcceder(s, 'utilisateurs') },
    { href: '/archives', label: 'Archives', icone: Archive, exact: false, visible: peutAcceder(s, 'archives') },
    // Séparateur
    { separator: true },
    // Navigation standard
    { href: '/partenaires', label: 'Accueil partenaires', icone: Handshake, exact: false, visible: peutAcceder(s, 'accueil_partenaires') },
    { href: '/', label: 'Accueil journalier', icone: CalendarDays, exact: true, visible: peutAcceder(s, 'tableau_journalier') },
    { href: '/personnes', label: 'Dossiers individuels', icone: FolderOpen, exact: false, visible: peutAcceder(s, 'dossiers') },
    { href: '/accompagnement', label: 'Accompagnements', icone: Briefcase, exact: false, visible: peutAcceder(s, 'accompagnements') },
    { href: '/ateliers', label: 'Actions collectives', icone: BookOpen, exact: false, visible: peutAcceder(s, 'ateliers') },
    { href: '/bilans', label: 'Bilans', icone: BarChart3, exact: false, visible: peutAcceder(s, 'bilans') },
  ]

  function estActif(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-52 shrink-0 border-r bg-muted/30">
      <nav className="flex flex-col gap-1 p-3">
        {liens.map((lien, i) => {
          if ('separator' in lien) {
            return <div key={i} className="mx-2 my-2 h-px bg-border" />
          }
          if (!lien.visible) return null
          const actif = estActif(lien.href!, lien.exact!)
          return (
            <Link
              key={lien.href}
              href={lien.href!}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                actif
                  ? 'bg-blue-50 font-medium text-blue-700'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {lien.icone && <lien.icone className="h-4 w-4" />}
              {lien.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
