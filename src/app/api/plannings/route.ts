import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

// ─── GET : liste des plannings (sans contenu binaire) ───────────────────────
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const plannings = await prisma.planningMensuel.findMany({
    where:   { deletedAt: null },
    select:  { id: true, mois: true, annee: true, nom: true, createdAt: true },
    orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
    take:    12,
  })

  return NextResponse.json({ plannings })
}

// ─── POST : déposer un planning mensuel ─────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'ateliers', 'creer_modifier')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const fichier = formData.get('fichier')
  if (!(fichier instanceof File)) {
    return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 422 })
  }
  if (fichier.type !== 'application/pdf') {
    return NextResponse.json({ erreur: 'Le fichier doit être un PDF' }, { status: 422 })
  }

  const mois  = Number(formData.get('mois'))
  const annee = Number(formData.get('annee'))
  if (!mois || mois < 1 || mois > 12 || !annee || annee < 2000 || annee > 2100) {
    return NextResponse.json({ erreur: 'Mois ou année invalide' }, { status: 422 })
  }

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const nom    = fichier.name || `planning-${annee}-${String(mois).padStart(2, '0')}.pdf`

  // Soft-delete l'éventuel planning existant pour ce mois, puis crée le nouveau
  await prisma.planningMensuel.updateMany({
    where: { mois, annee, deletedAt: null },
    data:  { deletedAt: new Date() },
  })

  const created = await prisma.planningMensuel.create({
    data:   { mois, annee, nom, contenu: buffer, uploadeParId: Number(session.user.id) },
    select: { id: true, mois: true, annee: true, nom: true, createdAt: true },
  })

  return NextResponse.json(created, { status: 201 })
}
