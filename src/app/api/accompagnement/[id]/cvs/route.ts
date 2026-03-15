import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string }> }

const TYPES_ACCEPTES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

async function getPersonId(accompagnementId: number) {
  const acc = await prisma.accompagnement.findUnique({
    where:  { id: accompagnementId },
    select: { personId: true },
  })
  return acc?.personId ?? null
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personId = await getPersonId(accompagnementId)
  if (personId === null) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  const cvs = await prisma.cv.findMany({
    where:   { personId },
    select:  { id: true, nom: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(cvs)
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'creer_modifier')) return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const personId = await getPersonId(accompagnementId)
  if (personId === null) return NextResponse.json({ erreur: 'Accompagnement introuvable' }, { status: 404 })

  let formData: FormData
  try { formData = await request.formData() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const fichier = formData.get('fichier')
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 400 })
  if (!TYPES_ACCEPTES.includes(fichier.type)) {
    return NextResponse.json({ erreur: 'Format non accepté (PDF ou Word uniquement)' }, { status: 422 })
  }
  if (fichier.size > 10 * 1024 * 1024) {
    return NextResponse.json({ erreur: 'Fichier trop volumineux (max 10 Mo)' }, { status: 422 })
  }

  const contenu = Buffer.from(await fichier.arrayBuffer())
  const cv = await prisma.cv.create({
    data:   { personId, nom: fichier.name, contenu },
    select: { id: true, nom: true, createdAt: true },
  })

  return NextResponse.json(cv, { status: 201 })
}
