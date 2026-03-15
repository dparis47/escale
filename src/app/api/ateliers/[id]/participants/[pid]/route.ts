import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string; pid: string }> }

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'gerer_participants')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { pid: pidStr } = await params
  const pid = Number(pidStr)
  if (isNaN(pid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const participation = await prisma.participationAtelier.findUnique({
    where: { id: pid },
    select: { id: true, deletedAt: true },
  })
  if (!participation || participation.deletedAt) {
    return NextResponse.json({ erreur: 'Participation introuvable' }, { status: 404 })
  }

  await prisma.participationAtelier.update({ where: { id: pid }, data: { deletedAt: new Date() } })
  return new NextResponse(null, { status: 204 })
}
