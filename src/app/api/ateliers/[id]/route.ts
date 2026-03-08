import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajAtelier } from '@/schemas/atelier'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: {
      themeRef: { include: { categorie: true } },
      prestataire: true,
      participants: {
        where:   { deletedAt: null },
        include: { person: { select: { id: true, nom: true, prenom: true } } },
        orderBy: [{ person: { nom: 'asc' } }, { person: { prenom: 'asc' } }],
      },
    },
  })

  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })
  return NextResponse.json(atelier)
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajAtelier.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const { themeId, themeAutre, prestataireId, lieu, date, notes } = parsed.data

  const maj = await prisma.actionCollective.update({
    where: { id },
    data: {
      ...(themeId       !== undefined ? { themeId }                        : {}),
      ...(themeAutre    !== undefined ? { themeAutre: themeAutre || null }  : {}),
      ...(prestataireId !== undefined ? { prestataireId }                  : {}),
      ...(lieu          !== undefined ? { lieu: lieu || null }             : {}),
      ...(date          !== undefined ? { date: parseISO(date) }          : {}),
      ...(notes         !== undefined ? { notes: notes || null }          : {}),
    },
  })

  return NextResponse.json(maj)
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })

  await prisma.actionCollective.update({ where: { id }, data: { deletedAt: new Date() } })
  return new NextResponse(null, { status: 204 })
}
