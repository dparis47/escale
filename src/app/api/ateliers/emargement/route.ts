import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// ─── GET : liste des fichiers pour un atelier ────────────────────────────
export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const atelierId = Number(searchParams.get('atelierId'))

  if (!atelierId || isNaN(atelierId)) {
    return NextResponse.json({ erreur: 'atelierId invalide' }, { status: 400 })
  }

  const fichiers = await prisma.fichierEmargement.findMany({
    where:   { actionCollectiveId: atelierId },
    select:  { id: true, nom: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ fichiers })
}

// ─── POST : ajouter un fichier pour un atelier ───────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const atelierId = Number(searchParams.get('atelierId'))

  if (!atelierId || isNaN(atelierId)) {
    return NextResponse.json({ erreur: 'atelierId invalide' }, { status: 400 })
  }

  // Vérifier que l'atelier existe
  const atelier = await prisma.actionCollective.findUnique({
    where: { id: atelierId },
    select: { id: true, deletedAt: true },
  })
  if (!atelier || atelier.deletedAt) {
    return NextResponse.json({ erreur: 'Atelier introuvable' }, { status: 404 })
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

  const buffer = Buffer.from(await fichier.arrayBuffer())
  const nom    = fichier.name || `emargement-${atelierId}.pdf`

  const created = await prisma.fichierEmargement.create({
    data:   { actionCollectiveId: atelierId, nom, contenu: buffer },
    select: { id: true, nom: true },
  })

  return NextResponse.json(created, { status: 201 })
}
