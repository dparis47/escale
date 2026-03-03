import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { THEMES_ATELIER_VALUES } from '@/schemas/atelier'
import type { ThemeAtelier } from '@prisma/client'

// ─── GET : liste des fichiers pour un thème ───────────────────────────────
export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const theme = searchParams.get('theme') as ThemeAtelier | null

  if (!theme || !THEMES_ATELIER_VALUES.includes(theme)) {
    return NextResponse.json({ erreur: 'Thème invalide' }, { status: 400 })
  }

  const fichiers = await prisma.fichierEmargement.findMany({
    where:   { theme },
    select:  { id: true, nom: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ fichiers })
}

// ─── POST : ajouter un fichier pour un thème ──────────────────────────────
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role === 'ACCUEIL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const theme = searchParams.get('theme') as ThemeAtelier | null

  if (!theme || !THEMES_ATELIER_VALUES.includes(theme)) {
    return NextResponse.json({ erreur: 'Thème invalide' }, { status: 400 })
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
  const nom    = fichier.name || `emargement-${theme.toLowerCase().replace(/_/g, '-')}.pdf`

  const created = await prisma.fichierEmargement.create({
    data:   { theme, nom, contenu: buffer },
    select: { id: true, nom: true },
  })

  return NextResponse.json(created, { status: 201 })
}
