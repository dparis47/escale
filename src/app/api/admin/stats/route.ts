import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'audit', 'consulter'))
    return new NextResponse(null, { status: 403 })

  const maintenant = new Date()
  const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
  const debutAnnee = new Date(maintenant.getFullYear(), 0, 1)

  const actif = { deletedAt: null }

  const [
    // Utilisateurs
    usersActifs,
    usersAccueil,
    usersTS,
    usersDirection,
    usersAdmin,
    usersAvecOverrides,
    // Personnes
    personnesTotal,
    personnesAvecFiche,
    // Visites
    visitesAujourdhui,
    visitesCeMois,
    visitesCetteAnnee,
    // Accompagnements
    accompTotal,
    accompEnCours,
    accompASID,
    // Ateliers
    ateliersTotal,
    ateliersCeMois,
    // Archives
    archVisites,
    archPersonnes,
    archAccomp,
    archAteliers,
    // Audit (10 derniers)
    auditRecent,
  ] = await Promise.all([
    // Utilisateurs
    prisma.user.count({ where: actif }),
    prisma.user.count({ where: { ...actif, role: 'ACCUEIL' } }),
    prisma.user.count({ where: { ...actif, role: 'TRAVAILLEUR_SOCIAL' } }),
    prisma.user.count({ where: { ...actif, role: 'DIRECTION' } }),
    prisma.user.count({ where: { ...actif, role: 'ADMIN' } }),
    prisma.user.count({ where: { ...actif, permissionsOverrides: { not: Prisma.JsonNull } } }),
    // Personnes
    prisma.person.count({ where: actif }),
    prisma.person.count({ where: { ...actif, estInscrit: true } }),
    // Visites
    prisma.visit.count({ where: { ...actif, date: { gte: debutJour } } }),
    prisma.visit.count({ where: { ...actif, date: { gte: debutMois } } }),
    prisma.visit.count({ where: { ...actif, date: { gte: debutAnnee } } }),
    // Accompagnements
    prisma.accompagnement.count({ where: actif }),
    prisma.accompagnement.count({ where: { ...actif, dateSortie: null } }),
    prisma.suiviASID.count({ where: { deletedAt: null } }),
    // Ateliers
    prisma.actionCollective.count({ where: actif }),
    prisma.actionCollective.count({ where: { ...actif, date: { gte: debutMois } } }),
    // Archives
    prisma.visit.count({ where: { deletedAt: { not: null } } }),
    prisma.person.count({ where: { deletedAt: { not: null } } }),
    prisma.accompagnement.count({ where: { deletedAt: { not: null } } }),
    prisma.actionCollective.count({ where: { deletedAt: { not: null } } }),
    // Audit
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { prenom: true, nom: true } } },
    }),
  ])

  return NextResponse.json({
    utilisateurs: {
      total: usersActifs,
      parRole: {
        ACCUEIL: usersAccueil,
        TRAVAILLEUR_SOCIAL: usersTS,
        DIRECTION: usersDirection,
        ADMIN: usersAdmin,
      },
      avecOverrides: usersAvecOverrides,
    },
    personnes: {
      total: personnesTotal,
      avecFiche: personnesAvecFiche,
      sansFiche: personnesTotal - personnesAvecFiche,
    },
    visites: {
      aujourdhui: visitesAujourdhui,
      ceMois: visitesCeMois,
      cetteAnnee: visitesCetteAnnee,
    },
    accompagnements: {
      total: accompTotal,
      enCours: accompEnCours,
      asid: accompASID,
    },
    ateliers: {
      total: ateliersTotal,
      ceMois: ateliersCeMois,
    },
    archives: {
      visites: archVisites,
      personnes: archPersonnes,
      accompagnements: archAccomp,
      ateliers: archAteliers,
      total: archVisites + archPersonnes + archAccomp + archAteliers,
    },
    audit: auditRecent.map((l) => ({
      id: l.id,
      action: l.action,
      entite: l.entite,
      entiteId: l.entiteId,
      details: l.details,
      userName: `${l.user.prenom} ${l.user.nom}`,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}
