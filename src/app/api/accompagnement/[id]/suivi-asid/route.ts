import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { parseISO } from '@/lib/dates'
import { schemaMajSuiviASID } from '@/schemas/accompagnement'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ erreur: 'Non authentifié' }, { status: 401 })

  if (session.user.role !== 'TRAVAILLEUR_SOCIAL') {
    return NextResponse.json({ erreur: 'Accès refusé' }, { status: 403 })
  }

  const { id: idStr } = await params
  const accompagnementId = Number(idStr)
  if (isNaN(accompagnementId)) return NextResponse.json({ erreur: 'ID invalide' }, { status: 400 })

  const suivi = await prisma.suiviASID.findUnique({ where: { accompagnementId } })
  if (!suivi) return NextResponse.json({ erreur: 'Suivi ASID introuvable' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ erreur: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = schemaMajSuiviASID.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { erreur: 'Données invalides', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const {
    prescripteurNom, prescripteurPrenom,
    referentNom, referentPrenom, communeResidence, observation,
    orientationNMoins1, orientationN, renouvellementN, suiviNMoins2EnCours,
    suiviRealise, suiviNonRealiseRaison,
    reorientation, reorientationDescription,
    dateEntree, dateRenouvellement, dateRenouvellement2, dateSortie,
  } = parsed.data

  const updated = await prisma.suiviASID.update({
    where: { accompagnementId },
    data: {
      ...(prescripteurNom          !== undefined ? { prescripteurNom }                                              : {}),
      ...(prescripteurPrenom       !== undefined ? { prescripteurPrenom }                                           : {}),
      ...(referentNom              !== undefined ? { referentNom: referentNom || null }                             : {}),
      ...(referentPrenom           !== undefined ? { referentPrenom: referentPrenom || null }                       : {}),
      ...(communeResidence         !== undefined ? { communeResidence }                                             : {}),
      ...(observation              !== undefined ? { observation }                                                   : {}),
      ...(orientationNMoins1       !== undefined ? { orientationNMoins1 }                                           : {}),
      ...(orientationN             !== undefined ? { orientationN }                                                  : {}),
      ...(renouvellementN          !== undefined ? { renouvellementN }                                              : {}),
      ...(suiviNMoins2EnCours      !== undefined ? { suiviNMoins2EnCours }                                          : {}),
      ...(suiviRealise             !== undefined ? { suiviRealise }                                                  : {}),
      ...(suiviNonRealiseRaison    !== undefined ? { suiviNonRealiseRaison: suiviNonRealiseRaison || null }         : {}),
      ...(reorientation            !== undefined ? { reorientation }                                                 : {}),
      ...(reorientationDescription !== undefined ? { reorientationDescription: reorientationDescription || null }  : {}),
      ...(dateEntree         !== undefined ? { dateEntree:         parseISO(dateEntree) }                           : {}),
      ...(dateRenouvellement  !== undefined ? { dateRenouvellement:  dateRenouvellement  ? parseISO(dateRenouvellement)  : null } : {}),
      ...(dateRenouvellement2 !== undefined ? { dateRenouvellement2: dateRenouvellement2 ? parseISO(dateRenouvellement2) : null } : {}),
      ...(dateSortie          !== undefined ? { dateSortie:          dateSortie          ? parseISO(dateSortie)          : null } : {}),
    },
  })

  return NextResponse.json(updated)
}
