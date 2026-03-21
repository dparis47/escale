import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajAtelier } from '@/schemas/atelier'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({
    where: { id, deletedAt: null },
    include: {
      saisiePar:  { select: { prenom: true, nom: true } },
      modifiePar: { select: { prenom: true, nom: true } },
      themeRef: { include: { categorie: true } },
      prestataire: true,
      participants: {
        where:   { deletedAt: null },
        include: { person: { select: {
          id: true, nom: true, prenom: true,
          accompagnements: {
            where: { deletedAt: null, dateSortie: null },
            select: {
              id: true,
              suiviASID: { select: { id: true } },
              suiviEI:   { select: { id: true } },
            },
          },
        } } },
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
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) {
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
      modifieParId: Number(session.user.id),
      ...(themeId       !== undefined ? { themeId }                        : {}),
      ...(themeAutre    !== undefined ? { themeAutre: themeAutre || null }  : {}),
      ...(prestataireId !== undefined ? { prestataireId }                  : {}),
      ...(lieu          !== undefined ? { lieu: lieu || null }             : {}),
      ...(date          !== undefined ? { date: parseISO(date) }          : {}),
      ...(notes         !== undefined ? { notes: notes || null }          : {}),
    },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'modifier',
    entite: 'atelier',
    entiteId: id,
  })

  return NextResponse.json(maj)
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'supprimer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const atelier = await prisma.actionCollective.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
  if (!atelier) return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })

  await prisma.actionCollective.update({ where: { id }, data: { deletedAt: new Date() } })

  logAudit({
    userId: Number(session.user.id),
    action: 'supprimer',
    entite: 'atelier',
    entiteId: id,
  })

  return new NextResponse(null, { status: 204 })
}
