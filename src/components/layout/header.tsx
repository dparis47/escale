'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, ChevronDown } from 'lucide-react'
import { peutAcceder, type Permissions } from '@/lib/permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Props {
  user: {
    name?: string | null
    permissions: Permissions
  }
}

export function Header({ user }: Props) {
  const pathname = usePathname()
  const s = { user: { permissions: user.permissions } }
  const estAdmin = peutAcceder(s, 'audit')

  function navClass(href: string, exact = false) {
    const actif = exact ? pathname === href : pathname.startsWith(href)
    return actif
      ? 'rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-medium transition-colors'
      : 'rounded-md px-2 py-1 text-muted-foreground hover:text-foreground transition-colors'
  }

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-blue-600">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo L'Escale" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            L&apos;Escale
          </Link>
          {!estAdmin && (
            <nav className="flex items-center gap-4 text-sm">
              {peutAcceder(s, 'accueil_partenaires') && (
                <Link href="/partenaires" className={navClass('/partenaires')}>
                  Accueil partenaires
                </Link>
              )}
              {peutAcceder(s, 'tableau_journalier') && (
                <Link href="/" className={navClass('/', true)}>
                  Accueil journalier
                </Link>
              )}
              {peutAcceder(s, 'dossiers') && (
                <Link href="/personnes" className={navClass('/personnes')}>
                  Dossiers individuels
                </Link>
              )}
              {peutAcceder(s, 'accompagnements') && (
                <Link href="/accompagnement" className={navClass('/accompagnement')}>
                  Accompagnements
                </Link>
              )}
              {peutAcceder(s, 'ateliers') && (
                <Link href="/ateliers" className={navClass('/ateliers')}>
                  Actions collectives
                </Link>
              )}
              {peutAcceder(s, 'bilans') && (
                <Link href="/bilans" className={navClass('/bilans')}>
                  Bilans
                </Link>
              )}
              {peutAcceder(s, 'archives') && (
                <Link href="/archives" className={navClass('/archives')}>
                  Archives
                </Link>
              )}
              {peutAcceder(s, 'utilisateurs') && (
                <Link href="/utilisateurs" className={navClass('/utilisateurs')}>
                  Utilisateurs
                </Link>
              )}
            </nav>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              {user.name}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
