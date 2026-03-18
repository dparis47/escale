import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

type Params = { params: Promise<{ id: string; pid: string }> }

// GET — télécharger une fiche de prescription
export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { pid: pidStr } = await params
  const pid = Number(pidStr)
  if (isNaN(pid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const prescription = await prisma.fichePrescriptionASID.findUnique({ where: { id: pid } })
  if (!prescription) return NextResponse.json({ erreur: 'Fiche introuvable' }, { status: 404 })

  return new NextResponse(prescription.contenu, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${prescription.nom}"`,
    },
  })
}

// DELETE — supprimer une fiche de prescription
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (!peutAcceder(session, 'accompagnements', 'supprimer')) {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { pid: pidStr } = await params
  const pid = Number(pidStr)
  if (isNaN(pid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const prescription = await prisma.fichePrescriptionASID.findUnique({
    where:  { id: pid },
    select: { id: true },
  })
  if (!prescription) return NextResponse.json({ erreur: 'Fiche introuvable' }, { status: 404 })

  await prisma.fichePrescriptionASID.delete({ where: { id: pid } })

  return new NextResponse(null, { status: 204 })
}
