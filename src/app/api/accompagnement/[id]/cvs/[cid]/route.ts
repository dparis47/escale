import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; cid: string }> }

// GET — télécharger un CV
export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { cid: cidStr } = await params
  const cid = Number(cidStr)
  if (isNaN(cid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const cv = await prisma.cvASID.findUnique({ where: { id: cid } })
  if (!cv) return NextResponse.json({ erreur: 'CV introuvable' }, { status: 404 })

  const ext = cv.nom.split('.').pop()?.toLowerCase()
  const contentType =
    ext === 'pdf'  ? 'application/pdf' :
    ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
    ext === 'doc'  ? 'application/msword' :
    'application/octet-stream'

  return new NextResponse(cv.contenu, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${cv.nom}"`,
    },
  })
}

// DELETE — supprimer un CV
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })
  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { cid: cidStr } = await params
  const cid = Number(cidStr)
  if (isNaN(cid)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const cv = await prisma.cvASID.findUnique({ where: { id: cid }, select: { id: true } })
  if (!cv) return NextResponse.json({ erreur: 'CV introuvable' }, { status: 404 })

  await prisma.cvASID.delete({ where: { id: cid } })

  return new NextResponse(null, { status: 204 })
}
