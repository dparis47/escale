import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authConfig } from '@/auth.config'
import { resoudrePermissions, type PermissionsOverrides } from '@/lib/permissions'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .safeParse(credentials)

        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
        })

        if (!user) return null

        const motDePasseValide = await bcrypt.compare(parsed.data.password, user.password)
        if (!motDePasseValide) return null

        const permissions = resoudrePermissions(
          user.role,
          user.permissionsOverrides as PermissionsOverrides | null,
        )

        return {
          id: String(user.id),
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          permissions,
          permissionsOverrides: user.permissionsOverrides as PermissionsOverrides | null,
        }
      },
    }),
  ],
})
