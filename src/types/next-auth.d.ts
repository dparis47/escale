import type { Role } from '@prisma/client'
import type { DefaultSession } from 'next-auth'
import type { Permissions, PermissionsOverrides } from '@/lib/permissions'

declare module 'next-auth' {
  interface Session {
    user: {
      role: Role
      permissions: Permissions
    } & DefaultSession['user']
  }

  interface User {
    role: Role
    permissions: Permissions
    permissionsOverrides?: PermissionsOverrides | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    permissions: Permissions
    permissionsOverrides?: PermissionsOverrides | null
  }
}
