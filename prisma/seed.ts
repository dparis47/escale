import { PrismaClient, Role, Genre, OrientePar, Ressource, MotifVisite, TypeContrat, ThemeAtelier, SujetEntretienASID } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // ── Utilisateurs ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10)

  const accueil = await prisma.user.upsert({
    where: { email: 'accueil@escale.fr' },
    update: {},
    create: {
      nom: 'Martin',
      prenom: 'Sophie',
      email: 'accueil@escale.fr',
      password: passwordHash,
      role: Role.ACCUEIL,
    },
  })

  const ts = await prisma.user.upsert({
    where: { email: 'ts@escale.fr' },
    update: {},
    create: {
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'ts@escale.fr',
      password: passwordHash,
      role: Role.TRAVAILLEUR_SOCIAL,
    },
  })

  await prisma.user.upsert({
    where: { email: 'direction@escale.fr' },
    update: {},
    create: {
      nom: 'Bernard',
      prenom: 'Paul',
      email: 'direction@escale.fr',
      password: passwordHash,
      role: Role.DIRECTION,
    },
  })

  // ── Personnes ─────────────────────────────────────────────
  const personne1 = await prisma.person.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nom: 'Durand',
      prenom: 'Jean',
      genre: Genre.HOMME,
      dateNaissance: new Date('1985-03-15'),
      nationalite: 'Française',
      adresse: '12 rue de la Paix, 47000 Agen',
      mobile: '06 12 34 56 78',
      orientePar: OrientePar.FRANCE_TRAVAIL,
      ressources: [Ressource.RSA],
      numeroFT: 'FT123456',
      dateInscriptionFT: new Date('2023-01-10'),
      permisConduire: true,
      dateActualisation: new Date(),
    },
  })

  const personne2 = await prisma.person.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nom: 'Leroy',
      prenom: 'Fatima',
      genre: Genre.FEMME,
      dateNaissance: new Date('1992-07-22'),
      nationalite: 'Française',
      adresse: '5 avenue des Fleurs, 47300 Villeneuve-sur-Lot',
      mobile: '06 98 76 54 32',
      orientePar: OrientePar.CMS,
      ressources: [Ressource.ARE],
      css: true,
      dateActualisation: new Date(),
    },
  })

  // ── Visites ───────────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.visit.upsert({
    where: { id: 1 },
    update: {},
    create: {
      date: today,
      genre: Genre.HOMME,
      personId: personne1.id,
      motifs: [MotifVisite.EMPLOI, MotifVisite.CV_LM],
      orienteParFT: true,
      commentaire: 'Aide pour la mise à jour du CV',
      saisieParId: accueil.id,
    },
  })

  await prisma.visit.upsert({
    where: { id: 2 },
    update: {},
    create: {
      date: today,
      genre: Genre.FEMME,
      personId: personne2.id,
      motifs: [MotifVisite.MSA_CAF, MotifVisite.SANTE],
      orienteParFT: false,
      saisieParId: accueil.id,
    },
  })

  // Visite anonyme
  await prisma.visit.upsert({
    where: { id: 3 },
    update: {},
    create: {
      date: today,
      genre: Genre.FEMME,
      motifs: [MotifVisite.INTERNET],
      orienteParFT: false,
      saisieParId: accueil.id,
    },
  })

  // ── Contrat de travail ────────────────────────────────────
  await prisma.contratDeTravail.upsert({
    where: { id: 1 },
    update: {},
    create: {
      personId: personne1.id,
      type: TypeContrat.CDD,
      dateDebut: new Date('2024-03-01'),
      dateFin: new Date('2024-08-31'),
      employeur: 'Boulangerie Dupuis',
      ville: 'Agen',
      poste: 'Vendeur',
    },
  })

  // ── Accompagnement FSE + ASID ─────────────────────────────
  const fse = await prisma.accompagnementFSE.upsert({
    where: { id: 1 },
    update: {},
    create: {
      personId: personne2.id,
      referentId: ts.id,
      dateEntree: new Date('2024-01-15'),
      ressourceARE: true,
      demarcheRechercheEmploi: true,
      demarcheCV: true,
    },
  })

  await prisma.accompagnementASID.upsert({
    where: { id: 1 },
    update: {},
    create: {
      personId: personne2.id,
      fseId: fse.id,
      referentId: ts.id,
      prescripteurNom: 'Lambert',
      prescripteurPrenom: 'Claire',
      prescripteurVille: 'Agen',
      communeResidence: 'Villeneuve-sur-Lot',
      dateEntree: new Date('2024-01-15'),
      orientationN: true,
      suiviRealise: true,
      demarches: {
        create: {
          rechercheEmploi: true,
          cvLm: true,
        },
      },
      entretiens: {
        create: {
          date: new Date('2024-02-10'),
          sujets: [SujetEntretienASID.EMPLOI, SujetEntretienASID.MOBILITE],
          notes: 'Entretien de suivi — travail sur le CV et les offres',
        },
      },
    },
  })

  // ── Action collective ─────────────────────────────────────
  const atelier = await prisma.actionCollective.upsert({
    where: { id: 1 },
    update: {},
    create: {
      theme: ThemeAtelier.COURS_INFORMATIQUE,
      lieu: "L'Escale",
      date: new Date('2024-02-20'),
      notes: 'Initiation à la bureautique',
    },
  })

  await prisma.participationAtelier.upsert({
    where: { actionCollectiveId_personId: { actionCollectiveId: atelier.id, personId: personne1.id } },
    update: {},
    create: {
      actionCollectiveId: atelier.id,
      personId: personne1.id,
    },
  })

  console.log('Seed terminé.')
  console.log('Comptes créés :')
  console.log('  accueil@escale.fr     / password123  (ACCUEIL)')
  console.log('  ts@escale.fr          / password123  (TRAVAILLEUR_SOCIAL)')
  console.log('  direction@escale.fr   / password123  (DIRECTION)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
