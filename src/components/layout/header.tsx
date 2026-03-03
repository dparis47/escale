'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'

const ROLES_FR: Record<Role, string> = {
  ACCUEIL:           'Accueil',
  TRAVAILLEUR_SOCIAL: 'Conseillère insertion',
  DIRECTION:         'Direction',
}

interface Props {
  user: {
    name?: string | null
    role: Role
  }
}

export function Header({ user }: Props) {
  const pathname = usePathname()

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
          <nav className="flex items-center gap-4 text-sm">
            {user.role !== 'DIRECTION' && (
              <Link href="/" className={navClass('/', true)}>
                Accueil journalier
              </Link>
            )}
            {user.role !== 'DIRECTION' && (
              <Link href="/partenaires" className={navClass('/partenaires')}>
                Accueil partenaires
              </Link>
            )}
            <Link href="/personnes" className={navClass('/personnes')}>
              Dossiers individuels
            </Link>
            {user.role !== 'ACCUEIL' && (
              <Link href="/accompagnement" className={navClass('/accompagnement')}>
                Accompagnements
              </Link>
            )}
            {user.role !== 'ACCUEIL' && (
              <Link href="/ateliers" className={navClass('/ateliers')}>
                Actions collectives
              </Link>
            )}
            {user.role !== 'ACCUEIL' && (
              <Link href="/bilans" className={navClass('/bilans')}>
                Bilans
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {user.name} · {ROLES_FR[user.role]}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  )
}
