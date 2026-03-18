import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@prisma/client'
import { PERMISSIONS_PAR_DEFAUT, resoudrePermissions, type Permissions, type PermissionsOverrides } from '@/lib/permissions'

// Config Edge-compatible (sans Prisma) — utilisée par le proxy
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isConnecte = !!auth?.user
      const estPageLogin = request.nextUrl.pathname === '/login'

      if (isConnecte && estPageLogin) {
        return Response.redirect(new URL('/', request.nextUrl))
      }

      if (!isConnecte && !estPageLogin) {
        return false // NextAuth redirige vers pages.signIn (/login)
      }

      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = (user as { role: Role }).role
        token.permissionsOverrides = (user as { permissionsOverrides?: PermissionsOverrides | null }).permissionsOverrides ?? null
      }
      // Recalculer les permissions à chaque appel pour refléter
      // les changements de défauts sans reconnexion
      if (token.role) {
        token.permissions = resoudrePermissions(
          token.role as Role,
          token.permissionsOverrides as PermissionsOverrides | null,
        )
      }
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      if (token.role) session.user.role = token.role as Role
      session.user.permissions = (token.permissions as Permissions)
        ?? PERMISSIONS_PAR_DEFAUT[token.role as Role]
      return session
    },
  },
} satisfies NextAuthConfig
