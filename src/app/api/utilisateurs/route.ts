import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { schemaCreerUtilisateur } from '@/schemas/utilisateur'
import { logAudit } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'utilisateurs', 'gerer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const tous = searchParams.get('tous') === '1'

  const utilisateurs = await prisma.user.findMany({
    where: tous ? {} : { deletedAt: null },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  return NextResponse.json(utilisateurs)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'utilisateurs', 'gerer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaCreerUtilisateur.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // Empêcher la création d'un second ADMIN
  if (parsed.data.role === 'ADMIN') {
    const adminExistant = await prisma.user.findFirst({ where: { role: 'ADMIN', deletedAt: null } })
    if (adminExistant) {
      return NextResponse.json(
        { erreur: 'Un administrateur existe déjà.' },
        { status: 409 },
      )
    }
  }

  // Vérifier unicité email
  const existant = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existant) {
    return NextResponse.json(
      { erreur: 'Un utilisateur avec cet email existe déjà.' },
      { status: 409 },
    )
  }

  const hash = await bcrypt.hash(parsed.data.password, 10)

  const utilisateur = await prisma.user.create({
    data: {
      nom: parsed.data.nom.trim().toUpperCase(),
      prenom: parsed.data.prenom.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      password: hash,
      role: parsed.data.role,
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      role: true,
    },
  })

  logAudit({
    userId: Number(session.user.id),
    action: 'creer',
    entite: 'utilisateur',
    entiteId: utilisateur.id,
  })

  return NextResponse.json(utilisateur, { status: 201 })
}
