import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajPersonne } from '@/schemas/person'

async function getPersonne(id: number) {
  return prisma.person.findFirst({ where: { id, deletedAt: null } })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personne = await prisma.person.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: {
        select: { visites: { where: { deletedAt: null } } },
      },
      visites: {
        where:   { deletedAt: null },
        orderBy: { date: 'desc' },
        take:    5,
        select:  { id: true, date: true },
      },
    },
  })

  if (!personne) return NextResponse.json({ erreur: 'Personne introuvable' }, { status: 404 })

  return NextResponse.json(personne)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (session.user.role === 'DIRECTION') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personne = await getPersonne(id)
  if (!personne) return NextResponse.json({ erreur: 'Personne introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajPersonne.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    dateNaissance, dateInscriptionFT,
    email, ressources, agesEnfants,
    ...rest
  } = parsed.data

  const updated = await prisma.person.update({
    where: { id },
    data: {
      ...rest,
      estInscrit: true,
      dateActualisation: new Date(),
      ...(email !== undefined     ? { email: email === '' ? null : email }                                : {}),
      ...(dateNaissance !== undefined     ? { dateNaissance:     dateNaissance     ? parseISO(dateNaissance)     : null } : {}),
      ...(dateInscriptionFT !== undefined ? { dateInscriptionFT: dateInscriptionFT ? parseISO(dateInscriptionFT) : null } : {}),
      ...(ressources !== undefined  ? { ressources:  { set: ressources  } } : {}),
      ...(agesEnfants !== undefined ? { agesEnfants: { set: agesEnfants } } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personne = await getPersonne(id)
  if (!personne) return NextResponse.json({ erreur: 'Personne introuvable' }, { status: 404 })

  await prisma.person.update({
    where: { id },
    data:  { deletedAt: new Date() },
  })

  return new NextResponse(null, { status: 204 })
}
