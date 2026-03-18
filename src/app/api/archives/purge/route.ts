import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// ── GET — Aperçu : combien d'éléments seront purgés ──────────

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'archives', 'purger'))
    return new NextResponse(null, { status: 403 })

  const { searchParams } = new URL(req.url)
  const mois = Number(searchParams.get('mois') ?? '6')
  if (isNaN(mois) || mois < 1 || mois > 60)
    return NextResponse.json({ erreur: 'Paramètre mois invalide' }, { status: 400 })

  const dateLimite = new Date()
  dateLimite.setMonth(dateLimite.getMonth() - mois)

  const where = { deletedAt: { not: null, lt: dateLimite } }

  const [visites, personnes, accompagnements, ateliers] = await Promise.all([
    prisma.visit.count({ where }),
    prisma.person.count({ where }),
    prisma.accompagnement.count({ where }),
    prisma.actionCollective.count({ where }),
  ])

  const total = visites + personnes + accompagnements + ateliers

  return NextResponse.json({
    dateLimite: dateLimite.toISOString(),
    visites,
    personnes,
    accompagnements,
    ateliers,
    total,
  })
}

// ── DELETE — Exécution de la purge ────────────────────────────

const purgeSchema = z.object({ mois: z.number().int().min(1).max(60) })

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'archives', 'purger'))
    return new NextResponse(null, { status: 403 })

  const body = await req.json()
  const result = purgeSchema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ erreur: 'Paramètres invalides' }, { status: 400 })

  const { mois } = result.data
  const dateLimite = new Date()
  dateLimite.setMonth(dateLimite.getMonth() - mois)

  const purges = await prisma.$transaction(async (tx) => {
    // 1. Collecter les IDs à purger (entités soft-deleted au-delà de la rétention)
    const where = { deletedAt: { not: null, lt: dateLimite } }

    const visitIds = (await tx.visit.findMany({ where, select: { id: true } })).map((v) => v.id)
    const personIds = (await tx.person.findMany({ where, select: { id: true } })).map((p) => p.id)
    const accompIds = (await tx.accompagnement.findMany({ where, select: { id: true } })).map((a) => a.id)
    const atelierIds = (await tx.actionCollective.findMany({ where, select: { id: true } })).map((a) => a.id)

    if (visitIds.length + personIds.length + accompIds.length + atelierIds.length === 0) {
      return { visites: 0, personnes: 0, accompagnements: 0, ateliers: 0 }
    }

    // 2. Enfants transitifs : visites et accompagnements des personnes purgées
    //    (même si ces enfants ne sont pas eux-mêmes archivés)
    if (personIds.length > 0) {
      const visitesEnfants = (await tx.visit.findMany({
        where: { personId: { in: personIds }, id: { notIn: visitIds } },
        select: { id: true },
      })).map((v) => v.id)
      visitIds.push(...visitesEnfants)

      const accompEnfants = (await tx.accompagnement.findMany({
        where: { personId: { in: personIds }, id: { notIn: accompIds } },
        select: { id: true },
      })).map((a) => a.id)
      accompIds.push(...accompEnfants)
    }

    // 3. Collecter les IDs de SuiviASID liés aux accompagnements à purger
    const suiviASIDIds = accompIds.length > 0
      ? (await tx.suiviASID.findMany({
          where: { accompagnementId: { in: accompIds } },
          select: { id: true },
        })).map((s) => s.id)
      : []

    // 4. Supprimer les feuilles (ordre respectant les FK)

    // FichePrescriptionASID → FK vers SuiviASID via champ "accompagnementId"
    if (suiviASIDIds.length > 0) {
      await tx.fichePrescriptionASID.deleteMany({
        where: { accompagnementId: { in: suiviASIDIds } },
      })
    }

    // Demarches → FK vers Visit, Accompagnement, ActionCollective
    if (visitIds.length > 0) {
      await tx.demarches.deleteMany({ where: { visitId: { in: visitIds } } })
    }
    if (accompIds.length > 0) {
      await tx.demarches.deleteMany({ where: { accompagnementId: { in: accompIds } } })
    }
    if (atelierIds.length > 0) {
      await tx.demarches.deleteMany({ where: { actionCollectiveId: { in: atelierIds } } })
    }

    // Entretien → FK vers Accompagnement
    if (accompIds.length > 0) {
      await tx.entretien.deleteMany({ where: { accompagnementId: { in: accompIds } } })
    }

    // AccompagnementSortie → FK vers Accompagnement
    if (accompIds.length > 0) {
      await tx.accompagnementSortie.deleteMany({ where: { accompagnementId: { in: accompIds } } })
    }

    // SuiviASID → FK vers Accompagnement
    if (accompIds.length > 0) {
      await tx.suiviASID.deleteMany({ where: { accompagnementId: { in: accompIds } } })
    }

    // SuiviEI → FK vers Accompagnement
    if (accompIds.length > 0) {
      await tx.suiviEI.deleteMany({ where: { accompagnementId: { in: accompIds } } })
    }

    // Cv → FK vers Person
    if (personIds.length > 0) {
      await tx.cv.deleteMany({ where: { personId: { in: personIds } } })
    }

    // ContratTravail → FK vers Person
    if (personIds.length > 0) {
      await tx.contratTravail.deleteMany({ where: { personId: { in: personIds } } })
    }

    // ParticipationAtelier → FK vers ActionCollective et Person
    if (atelierIds.length > 0) {
      await tx.participationAtelier.deleteMany({ where: { actionCollectiveId: { in: atelierIds } } })
    }
    if (personIds.length > 0) {
      await tx.participationAtelier.deleteMany({ where: { personId: { in: personIds } } })
    }

    // FichierEmargement → FK vers ActionCollective
    if (atelierIds.length > 0) {
      await tx.fichierEmargement.deleteMany({ where: { actionCollectiveId: { in: atelierIds } } })
    }

    // 5. Supprimer les parents
    if (visitIds.length > 0) {
      await tx.visit.deleteMany({ where: { id: { in: visitIds } } })
    }
    if (accompIds.length > 0) {
      await tx.accompagnement.deleteMany({ where: { id: { in: accompIds } } })
    }
    if (atelierIds.length > 0) {
      await tx.actionCollective.deleteMany({ where: { id: { in: atelierIds } } })
    }
    if (personIds.length > 0) {
      await tx.person.deleteMany({ where: { id: { in: personIds } } })
    }

    return {
      visites: visitIds.length,
      personnes: personIds.length,
      accompagnements: accompIds.length,
      ateliers: atelierIds.length,
    }
  }, { timeout: 60000 })

  // Audit
  const details = `Purge archives > ${mois} mois : ${purges.visites} visite(s), ${purges.personnes} personne(s), ${purges.accompagnements} accompagnement(s), ${purges.ateliers} atelier(s)`
  logAudit({
    userId: Number(session.user.id),
    action: 'purger',
    entite: 'archive',
    entiteId: 0,
    details,
  })

  return NextResponse.json({ ok: true, purges })
}
