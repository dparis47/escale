import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { schemaMajUtilisateur } from '@/schemas/utilisateur'
import { logAudit } from '@/lib/audit'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
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

  // Protéger le compte ADMIN contre les modifications par un non-ADMIN
  if (utilisateur.role === 'ADMIN' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ erreur: 'Impossible de modifier le compte administrateur.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajUtilisateur.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const { password, email, nom, prenom, permissionsOverrides, ...rest } = parsed.data

  // Vérifier unicité email si changé
  if (email && email !== utilisateur.email) {
    const existant = await prisma.user.findUnique({ where: { email } })
    if (existant) {
      return NextResponse.json(
        { erreur: 'Un utilisateur avec cet email existe déjà.' },
        { status: 409 },
      )
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(nom !== undefined ? { nom: nom.trim().toUpperCase() } : {}),
      ...(prenom !== undefined ? { prenom: prenom.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      ...(permissionsOverrides !== undefined
        ? { permissionsOverrides: permissionsOverrides === null ? Prisma.DbNull : permissionsOverrides }
        : {}),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      permissionsOverrides: true,
    },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'modifier',
    entite: 'utilisateur',
    entiteId: id,
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'utilisateurs', 'gerer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  // Empêcher de se désactiver soi-même
  if (id === Number(session.user.id)) {
    return NextResponse.json(
      { erreur: 'Vous ne pouvez pas désactiver votre propre compte.' },
      { status: 400 },
    )
  }

  const utilisateur = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!utilisateur) return NextResponse.json({ erreur: 'Utilisateur introuvable' }, { status: 404 })

  // Protéger le compte ADMIN contre la désactivation
  if (utilisateur.role === 'ADMIN') {
    return NextResponse.json(
      { erreur: 'Le compte administrateur ne peut pas être désactivé.' },
      { status: 403 },
    )
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'supprimer',
    entite: 'utilisateur',
    entiteId: id,
  })

  return new NextResponse(null, { status: 204 })
}
