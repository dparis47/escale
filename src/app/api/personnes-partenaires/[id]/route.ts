import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schemaPatch = z.object({
  nom:     z.string().min(1).max(200),
  dateRDV: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ erreur: 'Corps invalide' }, { status: 400 }) }

  const parsed = schemaPatch.safeParse(body)
  if (!parsed.success) return NextResponse.json({ erreur: 'Données invalides' }, { status: 422 })

  const record = await prisma.personnePartenaire.findFirst({ where: { id, deletedAt: null } })
  if (!record) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 })

  const updated = await prisma.personnePartenaire.update({
    where: { id },
    data: {
      nom:    parsed.data.nom.trim(),
      dateRDV: new Date(`${parsed.data.dateRDV}T00:00:00.000Z`),
      date:    new Date(`${parsed.data.dateRDV}T00:00:00.000Z`),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const record = await prisma.personnePartenaire.findFirst({ where: { id, deletedAt: null } })
  if (!record) return NextResponse.json({ erreur: 'Introuvable' }, { status: 404 })

  await prisma.personnePartenaire.update({ where: { id }, data: { deletedAt: new Date() } })

  return new NextResponse(null, { status: 204 })
}
