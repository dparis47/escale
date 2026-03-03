import type { Person } from '@prisma/client'

export type PersonneAvecStats = Person & {
  _count: {
    visites: number
  }
  accompagnements: {
    id: number
    suiviASID: { id: number; deletedAt: Date | null } | null
    suiviEI:   { id: number } | null
  }[]
}
