import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'utilisateurs', 'gerer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const utilisateur = await prisma.user.findFirst({ where: { id } })
  if (!utilisateur) return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 })
  if (!utilisateur.deletedAt) {
    return NextResponse.json({ erreur: 'Cet utilisateur est déjà actif.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: null },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'restaurer',
    entite: 'utilisateur',
    entiteId: id,
  })

  return NextResponse.json({ ok: true })
}
