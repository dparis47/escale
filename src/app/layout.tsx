import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { Header } from '@/components/layout/header'
import { SidebarAdmin } from '@/components/layout/sidebar-admin'
import { peutAcceder } from '@/lib/permissions'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: "L'Escale",
  description: "Application de gestion — Association L'Escale",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider session={session}>
          <TooltipProvider delayDuration={200}>
            {session && <Header user={{ name: session.user.name, permissions: session.user.permissions }} />}
            {session && peutAcceder(session, 'audit', 'consulter') ? (
              <div className="flex">
                <SidebarAdmin permissions={session.user.permissions} />
                <div className="flex-1 min-w-0">{children}</div>
              </div>
            ) : (
              children
            )}
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
