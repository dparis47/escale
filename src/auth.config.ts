import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@prisma/client'

// Config Edge-compatible (sans Prisma) — utilisée par le middleware
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
      if (user && 'role' in user) token.role = user.role
      return token
    },
    session({ session, token }) {
      if (token.role) session.user.role = token.role as Role
      return session
    },
  },
} satisfies NextAuthConfig
