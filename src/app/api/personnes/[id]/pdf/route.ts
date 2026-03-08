import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SITUATIONS_FR, RESSOURCES_FR, ORIENTE_PAR_FR } from '@/schemas/person'
import { NIVEAUX_FORMATION_FR } from '@/schemas/accompagnement'
import {
  creerPDF,
  ajouterEntete,
  ajouterSectionTitre,
  ajouterChamps,
  ajouterTableau,
  ajouterPiedDePage,
  formaterDatePDF,
} from '@/lib/pdf'
import { fromPrisma, themesAvecFeuilles } from '@/lib/demarches'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })

  const { id } = await params
  const personId = Number(id)
  if (isNaN(personId)) return new NextResponse(null, { status: 400 })

  const personne = await prisma.person.findFirst({
    where: { id: personId, deletedAt: null },
    include: {
      contratsTravail: {
        where: { deletedAt: null },
        orderBy: { dateDebut: 'desc' },
      },
      accompagnements: {
        where: { deletedAt: null, suiviEI: null },
        include: {
          suiviASID: { select: { id: true } },
        },
        orderBy: { dateEntree: 'desc' },
      },
      visites: {
        where: { deletedAt: null },
        include: { demarches: true },
        orderBy: { date: 'desc' },
        take: 50,
      },
    },
  })

  if (!personne) return new NextResponse(null, { status: 404 })

  const doc = creerPDF()
  let y = ajouterEntete(
    doc,
    'Dossier individuel',
    `${personne.nom.toUpperCase()} ${personne.prenom}`,
  )

  // Section 1 : Identité
  y = ajouterSectionTitre(doc, y, 'Identité')
  y = ajouterChamps(doc, y, [
    { label: 'Nom', valeur: personne.nom.toUpperCase() },
    { label: 'Prénom', valeur: personne.prenom },
    { label: 'Genre', valeur: personne.genre === 'HOMME' ? 'Homme' : 'Femme' },
    { label: 'Date de naissance', valeur: formaterDatePDF(personne.dateNaissance) },
    { label: 'Nationalité', valeur: personne.nationalite ?? '' },
  ])

  // Section 2 : Contact
  y = ajouterSectionTitre(doc, y, 'Contact')
  y = ajouterChamps(doc, y, [
    { label: 'Adresse', valeur: personne.adresse ?? '' },
    { label: 'Téléphone', valeur: personne.telephone ?? '' },
    { label: 'Mobile', valeur: personne.mobile ?? '' },
    { label: 'Email', valeur: personne.email ?? '' },
  ])

  // Section 3 : Santé
  y = ajouterSectionTitre(doc, y, 'Santé')
  y = ajouterChamps(doc, y, [
    { label: 'CSS', valeur: personne.css ? 'Oui' : 'Non' },
    { label: 'RQTH', valeur: personne.rqth ? 'Oui' : 'Non' },
    { label: 'Invalidité', valeur: personne.invalidite ? `Oui${personne.categorieInvalidite ? ` (${personne.categorieInvalidite})` : ''}` : 'Non' },
    { label: 'N° Sécu', valeur: personne.numeroSecu ?? '' },
  ])

  // Section 4 : France Travail
  y = ajouterSectionTitre(doc, y, 'France Travail')
  y = ajouterChamps(doc, y, [
    { label: 'N° FT', valeur: personne.numeroFT ?? '' },
    { label: 'Date inscription', valeur: formaterDatePDF(personne.dateInscriptionFT) },
    { label: 'Code personnel', valeur: personne.codepersonnelFT ?? '' },
    { label: 'Accomp. global FT', valeur: personne.accoGlo ? 'Oui' : 'Non' },
  ])

  // Section 5 : Situation familiale
  y = ajouterSectionTitre(doc, y, 'Situation familiale et mobilité')
  y = ajouterChamps(doc, y, [
    { label: 'Situation familiale', valeur: personne.situationFamiliale ? SITUATIONS_FR[personne.situationFamiliale as keyof typeof SITUATIONS_FR] ?? '' : '' },
    { label: 'N° CAF', valeur: personne.numeroCAF ?? '' },
    { label: 'Nb enfants à charge', valeur: personne.nombreEnfantsCharge != null ? String(personne.nombreEnfantsCharge) : '' },
    { label: 'Âges enfants', valeur: personne.agesEnfants.length > 0 ? personne.agesEnfants.join(', ') + ' ans' : '' },
    { label: 'Permis de conduire', valeur: personne.permisConduire ? 'Oui' : 'Non' },
    { label: 'Véhicule personnel', valeur: personne.vehiculePersonnel ? 'Oui' : 'Non' },
    { label: 'Autres moyens', valeur: personne.autresMoyensLocomotion ?? '' },
    { label: 'Hébergement', valeur: personne.hebergement ?? '' },
  ])

  // Section 6 : Ressources et orientation
  y = ajouterSectionTitre(doc, y, 'Ressources et orientation')
  y = ajouterChamps(doc, y, [
    { label: 'Ressources', valeur: personne.ressources.map((r) => RESSOURCES_FR[r as keyof typeof RESSOURCES_FR] ?? r).join(', ') },
    { label: 'Orienté par', valeur: personne.orientePar ? ORIENTE_PAR_FR[personne.orientePar as keyof typeof ORIENTE_PAR_FR] ?? '' : '' },
    { label: 'En ASID', valeur: personne.enASID ? 'Oui' : 'Non' },
  ], 1)

  // Section 7 : Contrats de travail
  if (personne.contratsTravail.length > 0) {
    y = ajouterSectionTitre(doc, y, 'Contrats de travail')
    y = ajouterTableau(
      doc,
      y,
      ['Type', 'Début', 'Fin', 'Employeur', 'Ville', 'Poste'],
      personne.contratsTravail.map((c) => [
        c.type,
        formaterDatePDF(c.dateDebut),
        formaterDatePDF(c.dateFin),
        c.employeur ?? '',
        c.ville ?? '',
        c.poste ?? '',
      ]),
    )
  }

  // Section 8 : Accompagnements
  if (personne.accompagnements.length > 0) {
    y = ajouterSectionTitre(doc, y, 'Accompagnements')
    y = ajouterTableau(
      doc,
      y,
      ['Type', 'Date entrée', 'Date sortie', 'Statut'],
      personne.accompagnements.map((a) => [
        a.suiviASID ? 'FSE+ ASID' : 'FSE+',
        formaterDatePDF(a.dateEntree),
        formaterDatePDF(a.dateSortie),
        a.dateSortie ? 'Terminé' : 'En cours',
      ]),
    )
  }

  // Section 9 : Dernières visites (50 max)
  if (personne.visites.length > 0) {
    y = ajouterSectionTitre(doc, y, `Dernières visites (${personne.visites.length})`)
    y = ajouterTableau(
      doc,
      y,
      ['Date', 'Démarches', 'Commentaire'],
      personne.visites.map((v) => {
        const themes = v.demarches
          ? themesAvecFeuilles(fromPrisma(v.demarches as unknown as Record<string, unknown>))
          : []
        return [
          formaterDatePDF(v.date),
          themes.flatMap((t) => t.feuilles).join(', '),
          v.commentaire ?? '',
        ]
      }),
    )
  }

  // Pagination
  ajouterPiedDePage(doc)

  const buffer = doc.output('arraybuffer')
  const nomFichier = `dossier-${personne.nom.toLowerCase()}-${personne.prenom.toLowerCase()}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichier}"`,
    },
  })
}
