import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

const TYPES_ACCEPTES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

async function getSuiviEIId(accompagnementId: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const suivi = await (prisma as any).suiviEI.findUnique({
    where:  { accompagnementId },
    select: { id: true },
  })
  return (suivi as { id: number } | null)?.id ?? null
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const suiviEIId = await getSuiviEIId(accompagnementId)
  if (suiviEIId === null) return NextResponse.json({ erreur: 'Suivi EI introuvable' }, { status: 404 })

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv = await (prisma as any).cvEI.create({
    data:   { suiviEIId, nom: fichier.name, contenu },
    select: { id: true, nom: true, createdAt: true },
  })

  return NextResponse.json(cv as { id: number; nom: string; createdAt: Date }, { status: 201 })
}
