import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

async function getSuiviASIDId(accompagnementId: number) {
  const suivi = await prisma.suiviASID.findUnique({
    where:  { accompagnementId },
    select: { id: true },
  })
  return suivi?.id ?? null
}

// GET — liste des fiches de prescription (id + nom, sans le binaire)
export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const suiviASIDId = await getSuiviASIDId(accompagnementId)
  if (suiviASIDId === null) return NextResponse.json({ erreur: 'Suivi ASID introuvable' }, { status: 404 })

  const prescriptions = await prisma.fichePrescriptionASID.findMany({
    where:   { accompagnementId: suiviASIDId },
    select:  { id: true, nom: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(prescriptions)
}

// POST — ajouter une fiche de prescription
export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const suiviASIDId = await getSuiviASIDId(accompagnementId)
  if (suiviASIDId === null) return NextResponse.json({ erreur: 'Suivi ASID introuvable' }, { status: 404 })

  let formData: FormData
  try { formData = await request.formData() } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const fichier = formData.get('fichier')
  if (!(fichier instanceof File)) return NextResponse.json({ erreur: 'Fichier manquant' }, { status: 400 })
  if (fichier.type !== 'application/pdf') {
    return NextResponse.json({ erreur: 'Seuls les fichiers PDF sont acceptés' }, { status: 422 })
  }
  if (fichier.size > 10 * 1024 * 1024) {
    return NextResponse.json({ erreur: 'Fichier trop volumineux (max 10 Mo)' }, { status: 422 })
  }

  const periodeRaw = formData.get('periode')
  const periode    = typeof periodeRaw === 'string' ? periodeRaw : 'ENTREE'

  const contenu = Buffer.from(await fichier.arrayBuffer())
  const prescription = await prisma.fichePrescriptionASID.create({
    data:   { accompagnementId: suiviASIDId, nom: fichier.name, periode, contenu },
    select: { id: true, nom: true, periode: true, createdAt: true },
  })

  return NextResponse.json(prescription, { status: 201 })
}
