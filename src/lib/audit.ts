import { prisma } from '@/lib/prisma'

type Action = 'creer' | 'modifier' | 'supprimer' | 'restaurer' | 'purger'
type Entite = 'visite' | 'personne' | 'accompagnement' | 'atelier' | 'utilisateur' | 'archive'

interface LogAuditParams {
  userId: number
  action: Action
  entite: Entite
  entiteId: number
  details?: string
}

/**
 * Enregistre une entrée dans le journal d'audit.
 * Fire-and-forget : ne bloque pas la requête appelante.
 */
export function logAudit(params: LogAuditParams): void {
  prisma.auditLog
    .create({
      data: {
        userId:   params.userId,
        action:   params.action,
        entite:   params.entite,
        entiteId: params.entiteId,
        details:  params.details ?? null,
      },
    })
    .catch((err) => {
      console.error('[audit] Erreur écriture log :', err)
    })
}
