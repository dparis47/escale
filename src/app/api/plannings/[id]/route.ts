import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

// ─── GET : télécharger un planning par son ID ────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const planning = await prisma.planningMensuel.findUnique({
    where: { id },
  })
  if (!planning || planning.deletedAt) {
    return NextResponse.json({ erreur: 'Planning introuvable' }, { status: 404 })
  }

  return new Response(planning.contenu, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${planning.nom}"`,
    },
  })
}

// ─── DELETE : soft delete d'un planning ──────────────────────────────────────
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  await prisma.planningMensuel.update({
    where: { id },
    data:  { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
