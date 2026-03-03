import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partenaire: z.string().min(1).max(100),
  nom:        z.string().min(1).max(200),
  dateRDV:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ erreur: 'Corps invalide' }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ erreur: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const { date, partenaire, nom, dateRDV } = parsed.data

  const record = await prisma.personnePartenaire.create({
    data: {
      date:       new Date(`${date}T00:00:00.000Z`),
      partenaire,
      nom:        nom.trim(),
      dateRDV:    new Date(`${dateRDV}T00:00:00.000Z`),
    },
  })

  return NextResponse.json(record, { status: 201 })
}
