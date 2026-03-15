import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { peutAcceder } from '@/lib/permissions'
import { NIVEAUX_FORMATION_FR, SUJETS_ENTRETIEN_FR } from '@/schemas/accompagnement'
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
import type { SujetEntretien } from '@prisma/client'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) return new NextResponse(null, { status: 401 })
  if (!peutAcceder(session, 'accompagnements')) return new NextResponse(null, { status: 403 })

  const { id } = await params
  const accompId = Number(id)
  if (isNaN(accompId)) return new NextResponse(null, { status: 400 })

  const accompagnement = await prisma.accompagnement.findFirst({
    where: { id: accompId, deletedAt: null, suiviEI: null },
    include: {
      person: {
        select: {
          nom: true, prenom: true, genre: true, dateNaissance: true,
          adresse: true, telephone: true, mobile: true, email: true,
          contratsTravail: { where: { deletedAt: null }, orderBy: { dateDebut: 'desc' } },
        },
      },
      sortie: true,
      demarches: true,
      entretiens: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      suiviASID: true,
    },
  })

  if (!accompagnement) return new NextResponse(null, { status: 404 })

  const p = accompagnement.person
  const isASID = !!accompagnement.suiviASID
  const typeLabel = isASID ? 'FSE+ ASID' : 'FSE+'

  // Âge
  const age = p.dateNaissance
    ? Math.floor((Date.now() - new Date(p.dateNaissance).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const doc = creerPDF()
  let y = ajouterEntete(
    doc,
    `Accompagnement ${typeLabel}`,
    `${p.nom.toUpperCase()} ${p.prenom}${age !== null ? ` — ${age} ans` : ''}`,
  )

  // Section 1 : Personne
  y = ajouterSectionTitre(doc, y, 'Personne')
  y = ajouterChamps(doc, y, [
    { label: 'Nom', valeur: p.nom.toUpperCase() },
    { label: 'Prénom', valeur: p.prenom },
    { label: 'Genre', valeur: p.genre === 'HOMME' ? 'Homme' : 'Femme' },
    { label: 'Date de naissance', valeur: formaterDatePDF(p.dateNaissance) },
    { label: 'Adresse', valeur: p.adresse ?? '' },
    { label: 'Téléphone', valeur: p.telephone ?? '' },
    { label: 'Mobile', valeur: p.mobile ?? '' },
    { label: 'Email', valeur: p.email ?? '' },
  ])

  // Section 2 : Dates
  y = ajouterSectionTitre(doc, y, 'Dates')
  y = ajouterChamps(doc, y, [
    { label: 'Date d\'entrée', valeur: formaterDatePDF(accompagnement.dateEntree) },
    { label: 'Date de sortie', valeur: formaterDatePDF(accompagnement.dateSortie) },
    { label: 'Statut', valeur: accompagnement.dateSortie ? 'Terminé' : 'En cours' },
  ])

  // Section 3 : Ressources à l'entrée
  y = ajouterSectionTitre(doc, y, 'Ressources à l\'entrée')
  y = ajouterChamps(doc, y, [
    { label: 'RSA', valeur: accompagnement.ressourceRSA ? 'Oui' : 'Non' },
    { label: 'ASS', valeur: accompagnement.ressourceASS ? 'Oui' : 'Non' },
    { label: 'ARE', valeur: accompagnement.ressourceARE ? 'Oui' : 'Non' },
    { label: 'AAH', valeur: accompagnement.ressourceAAH ? 'Oui' : 'Non' },
    { label: 'ASI', valeur: accompagnement.ressourceASI ? 'Oui' : 'Non' },
    { label: 'Sans ressources', valeur: accompagnement.ressourceSansRessources ? 'Oui' : 'Non' },
  ])

  // Section 4 : Situation avant le FSE
  y = ajouterSectionTitre(doc, y, 'Situation avant le FSE')
  const situationAvant = [
    { label: 'Occupe un emploi', valeur: accompagnement.avantOccupeEmploi },
    { label: 'CDI', valeur: accompagnement.avantCDI },
    { label: 'CDD > 6 mois', valeur: accompagnement.avantCDDPlus6Mois },
    { label: 'CDD < 6 mois', valeur: accompagnement.avantCDDMoins6Mois },
    { label: 'Intérim', valeur: accompagnement.avantInterim },
    { label: 'IAE', valeur: accompagnement.avantIAE },
    { label: 'Indépendant', valeur: accompagnement.avantIndependant },
    { label: 'Formation pro', valeur: accompagnement.avantFormationPro },
    { label: 'En recherche d\'emploi', valeur: accompagnement.avantEnRechercheEmploi },
    { label: 'Ne cherche pas d\'emploi', valeur: accompagnement.avantNeCherchePasEmploi },
  ].filter((s) => s.valeur)
  if (situationAvant.length > 0) {
    y = ajouterChamps(doc, y, situationAvant.map((s) => ({ label: s.label, valeur: 'Oui' })))
  } else {
    y = ajouterChamps(doc, y, [{ label: 'Aucune situation renseignée', valeur: '' }], 1)
  }

  // Section 5 : Formation et handicap
  y = ajouterSectionTitre(doc, y, 'Formation et handicap')
  y = ajouterChamps(doc, y, [
    { label: 'Niveau de formation', valeur: accompagnement.niveauFormation ? NIVEAUX_FORMATION_FR[accompagnement.niveauFormation as keyof typeof NIVEAUX_FORMATION_FR] ?? '' : '' },
    { label: 'Reconnaissance handicap', valeur: accompagnement.reconnaissanceHandicap ? 'Oui' : 'Non' },
    { label: 'Logement SDF', valeur: accompagnement.logementSDF ? 'Oui' : 'Non' },
    { label: 'Logement exclusion', valeur: accompagnement.logementExclusion ? 'Oui' : 'Non' },
  ])

  // Section 6 : Démarches effectuées
  if (accompagnement.demarches) {
    const themes = themesAvecFeuilles(fromPrisma(accompagnement.demarches as unknown as Record<string, unknown>))
    if (themes.length > 0) {
      y = ajouterSectionTitre(doc, y, 'Démarches effectuées')
      const lignesThemes: (string | number)[][] = []
      for (const theme of themes) {
        for (const feuille of theme.feuilles) {
          lignesThemes.push([theme.label, feuille])
        }
      }
      y = ajouterTableau(doc, y, ['Thème', 'Démarche'], lignesThemes)
    }
  }

  // Section 7 : Entretiens
  if (accompagnement.entretiens.length > 0) {
    y = ajouterSectionTitre(doc, y, `Entretiens (${accompagnement.entretiens.length})`)
    y = ajouterTableau(
      doc,
      y,
      ['Date', 'Sujets', 'Notes'],
      accompagnement.entretiens.map((e) => [
        formaterDatePDF(e.date),
        e.sujets.map((s: SujetEntretien) => SUJETS_ENTRETIEN_FR[s as keyof typeof SUJETS_ENTRETIEN_FR] ?? s).join(', '),
        e.notes ?? '',
      ]),
    )
  }

  // Section 8 : Contrats de travail
  if (p.contratsTravail.length > 0) {
    y = ajouterSectionTitre(doc, y, 'Contrats de travail')
    y = ajouterTableau(
      doc,
      y,
      ['Type', 'Début', 'Fin', 'Employeur', 'Ville', 'Poste'],
      p.contratsTravail.map((c) => [
        c.type,
        formaterDatePDF(c.dateDebut),
        formaterDatePDF(c.dateFin),
        c.employeur ?? '',
        c.ville ?? '',
        c.poste ?? '',
      ]),
    )
  }

  // Section 9 : Situation de sortie
  if (accompagnement.sortie) {
    y = ajouterSectionTitre(doc, y, 'Situation de sortie')
    const s = accompagnement.sortie
    const sorties = [
      { label: 'CDI', valeur: s.sortieCDI },
      { label: 'CDD > 6 mois', valeur: s.sortieCDDPlus6Mois },
      { label: 'CDD < 6 mois', valeur: s.sortieCDDMoins6Mois },
      { label: 'IAE', valeur: s.sortieIAE },
      { label: 'Intérim', valeur: s.sortieInterim },
      { label: 'Indépendant', valeur: s.sortieIndependant },
      { label: 'Maintien emploi', valeur: s.sortieMaintienEmploi },
      { label: 'Recherche emploi', valeur: s.sortieRechercheEmploi },
      { label: 'Inactif', valeur: s.sortieInactif },
      { label: 'Formation', valeur: s.sortieFormation },
      { label: 'Création entreprise', valeur: s.sortieCreationEntreprise },
      { label: 'Info contrat hors délai', valeur: s.sortieInfoContratHorsDelai },
    ].filter((x) => x.valeur)

    if (sorties.length > 0) {
      y = ajouterChamps(doc, y, sorties.map((x) => ({ label: x.label, valeur: 'Oui' })))
    }

    if (s.sortieFormation) {
      y = ajouterChamps(doc, y, [
        { label: 'Intitulé formation', valeur: s.formationIntitule ?? '' },
        { label: 'Organisme', valeur: s.formationOrganisme ?? '' },
        { label: 'Ville', valeur: s.formationVille ?? '' },
        { label: 'Durée', valeur: s.formationDuree ?? '' },
      ])
    }
  }

  // Section 10 : ASID
  if (isASID && accompagnement.suiviASID) {
    const asid = accompagnement.suiviASID
    y = ajouterSectionTitre(doc, y, 'Suivi ASID')
    y = ajouterChamps(doc, y, [
      { label: 'Prescripteur', valeur: [asid.prescripteurPrenom, asid.prescripteurNom].filter(Boolean).join(' ') },
      { label: 'Référent', valeur: [asid.referentPrenom, asid.referentNom].filter(Boolean).join(' ') },
      { label: 'Commune', valeur: asid.communeResidence ?? '' },
      { label: 'Date entrée ASID', valeur: formaterDatePDF(asid.dateEntree) },
      { label: 'Renouvellement 1', valeur: formaterDatePDF(asid.dateRenouvellement) },
      { label: 'Renouvellement 2', valeur: formaterDatePDF(asid.dateRenouvellement2) },
      { label: 'Date sortie ASID', valeur: formaterDatePDF(asid.dateSortie) },
    ])
  }

  // Section 11 : Observation
  if (accompagnement.observation) {
    y = ajouterSectionTitre(doc, y, 'Observation')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const lignesObs = doc.splitTextToSize(accompagnement.observation, 182)
    doc.text(lignesObs, 14, y)
  }

  // Pagination
  ajouterPiedDePage(doc)

  const buffer = doc.output('arraybuffer')
  const typeFile = isASID ? 'asid' : 'fse'
  const nomFichier = `accompagnement-${typeFile}-${p.nom.toLowerCase()}-${p.prenom.toLowerCase()}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichier}"`,
    },
  })
}
