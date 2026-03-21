import { PrismaClient, Role, Genre, OrientePar, Ressource, TypeContrat, SujetEntretien, NiveauFormation } from '@prisma/client'
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
    update: { nom: 'BORDERE', prenom: 'Marlène' },
    create: {
      nom: 'BORDERE',
      prenom: 'Marlène',
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

  await prisma.user.upsert({
    where: { email: 'admin@escale.fr' },
    update: {},
    create: {
      nom: 'ADMIN',
      prenom: 'Système',
      email: 'admin@escale.fr',
      password: passwordHash,
      role: Role.ADMIN,
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
      estInscrit: true,
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
      estInscrit: true,
      enASID: true,
      situationFamiliale: 'PARENT_ISOLE',
      nombreEnfantsCharge: 2,
      agesEnfants: [4, 8],
    },
  })

  const personne3 = await prisma.person.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nom: 'Moreau',
      prenom: 'Karim',
      genre: Genre.HOMME,
      dateNaissance: new Date('1978-11-03'),
      nationalite: 'Française',
      adresse: '8 place de la République, 47000 Agen',
      mobile: '07 45 67 89 01',
      orientePar: OrientePar.MAIRIE,
      ressources: [Ressource.ASS],
      accoGlo: true,
      dateActualisation: new Date(),
      estInscrit: true,
      hebergement: 'Hébergé chez un tiers',
    },
  })

  // ── Visites (tableau journalier) ────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Visite 1 : Jean Durand — emploi + santé, avec démarches
  await prisma.visit.upsert({
    where: { id: 1 },
    update: {},
    create: {
      date: today,
      personId: personne1.id,
      orienteParFT: true,
      partenaires: [],
      commentaire: 'Aide pour la mise à jour du CV',
      saisieParId: accueil.id,
      demarches: {
        create: {
          emploiRechercheEmploi: true,
          emploiCvLm: true,
          emploiConsultationOffres: true,
          santeCss: true,
        },
      },
    },
  })

  // Visite 2 : Fatima Leroy — mobilité
  await prisma.visit.upsert({
    where: { id: 2 },
    update: {},
    create: {
      date: today,
      personId: personne2.id,
      orienteParFT: false,
      partenaires: [],
      saisieParId: accueil.id,
      demarches: {
        create: {
          mobilitCarteSolidaire: true,
          mobilitItineraire: true,
        },
      },
    },
  })

  // Visite 3 : Karim Moreau — santé + logement, avec partenaires
  await prisma.visit.upsert({
    where: { id: 3 },
    update: {},
    create: {
      date: today,
      personId: personne3.id,
      orienteParFT: false,
      partenaires: ['CPAM', 'CMS'],
      commentaire: 'Orientation CPAM pour renouvellement CSS',
      saisieParId: accueil.id,
      demarches: {
        create: {
          santeCssDossier: true,
          santeCssOuverture: true,
          logementRecherche: true,
          logementOrientation: true,
        },
      },
    },
  })

  // ── Contrats de travail ────────────────────────────────────
  await prisma.contratTravail.upsert({
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

  await prisma.contratTravail.upsert({
    where: { id: 2 },
    update: {},
    create: {
      personId: personne3.id,
      type: TypeContrat.INTERIM,
      dateDebut: new Date('2024-06-15'),
      dateFin: new Date('2024-07-15'),
      employeur: 'Manpower',
      ville: 'Agen',
      poste: 'Manutentionnaire',
    },
  })

  // ── Accompagnement FSE + ASID (Fatima Leroy) ──────────────
  const accompagnement1 = await prisma.accompagnement.upsert({
    where: { id: 1 },
    update: {},
    create: {
      personId: personne2.id,
      dateEntree: new Date('2024-01-15'),
      ressourceARE: true,
      niveauFormation: NiveauFormation.CAP_BAC,
      avantEnRechercheEmploi: true,
      demarches: {
        create: {
          emploiRechercheEmploi: true,
          emploiCvLm: true,
          mobilitCarteSolidaire: true,
          parentaliteSoutien: true,
        },
      },
      entretiens: {
        create: [
          {
            date: new Date('2024-02-10'),
            sujets: [SujetEntretien.EMPLOI, SujetEntretien.MOBILITE],
            notes: 'Entretien de suivi — travail sur le CV et les offres',
          },
          {
            date: new Date('2024-03-20'),
            sujets: [SujetEntretien.PARENTALITE, SujetEntretien.LOGEMENT],
            notes: 'Point sur la garde des enfants et la recherche de logement',
          },
        ],
      },
    },
  })

  await prisma.suiviASID.upsert({
    where: { id: 1 },
    update: {},
    create: {
      accompagnementId: accompagnement1.id,
      referentNom: ts.nom,
      referentPrenom: ts.prenom,
      prescripteurNom: 'Lambert',
      prescripteurPrenom: 'Claire',
      communeResidence: 'Villeneuve-sur-Lot',
      dateEntree: new Date('2024-01-15'),
      orientationN: true,
      suiviRealise: true,
    },
  })

  // ── Accompagnement FSE avec sortie (Jean Durand) ───────────
  const accompagnement2 = await prisma.accompagnement.upsert({
    where: { id: 2 },
    update: {},
    create: {
      personId: personne1.id,
      dateEntree: new Date('2023-06-01'),
      dateSortie: new Date('2024-02-28'),
      ressourceRSA: true,
      niveauFormation: NiveauFormation.PRIMAIRE_3EME,
      avantEnRechercheEmploi: true,
      observation: 'Accompagnement terminé — CDD trouvé chez Boulangerie Dupuis',
      demarches: {
        create: {
          emploiRechercheEmploi: true,
          emploiCvLm: true,
          emploiEntretiens: true,
          emploiPreparationEntretien: true,
          emploiInscriptionFT: true,
        },
      },
      entretiens: {
        create: {
          date: new Date('2023-09-15'),
          sujets: [SujetEntretien.EMPLOI],
          notes: 'Préparation entretien boulangerie',
        },
      },
    },
  })

  // Sortie FSE pour l'accompagnement de Jean Durand
  await prisma.accompagnementSortie.upsert({
    where: { id: 1 },
    update: {},
    create: {
      accompagnementId: accompagnement2.id,
      sortieCDDMoins6Mois: true,
    },
  })

  // ── Accompagnement FSE + Suivi EI (Karim Moreau) ──────────
  const accompagnement3 = await prisma.accompagnement.upsert({
    where: { id: 3 },
    update: {},
    create: {
      personId: personne3.id,
      dateEntree: new Date('2024-04-01'),
      ressourceASS: true,
      niveauFormation: NiveauFormation.CAP_BAC,
      avantEnRechercheEmploi: true,
      logementExclusion: true,
      demarches: {
        create: {
          emploiRechercheEmploi: true,
          logementRecherche: true,
          logementOrientation: true,
          santeCss: true,
        },
      },
    },
  })

  await prisma.suiviEI.upsert({
    where: { id: 1 },
    update: {},
    create: {
      accompagnementId: accompagnement3.id,
      observation: 'Orientation vers le chantier d\'insertion — suivi en cours',
    },
  })

  // ── Catégories, thèmes et prestataires d'ateliers ──────────

  const catCulture = await prisma.categorieAtelier.upsert({
    where: { nom: 'Accès à la culture' },
    update: {},
    create: { nom: 'Accès à la culture', couleur: 'purple', ordre: 1 },
  })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catCulture.id, nom: 'Cinéma' } },                       update: {}, create: { nom: 'Cinéma',                       categorieId: catCulture.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catCulture.id, nom: 'Jeux de société' } },              update: {}, create: { nom: 'Jeux de société',              categorieId: catCulture.id, ordre: 2 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catCulture.id, nom: "L'Escale fait son cinéma" } },      update: {}, create: { nom: "L'Escale fait son cinéma",      categorieId: catCulture.id, ordre: 3 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catCulture.id, nom: 'Projet culturel itinérant' } },    update: {}, create: { nom: 'Projet culturel itinérant',    categorieId: catCulture.id, ordre: 4 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catCulture.id, nom: 'Sortie culturelle' } },            update: {}, create: { nom: 'Sortie culturelle',            categorieId: catCulture.id, ordre: 5 } })

  const catAlimentation = await prisma.categorieAtelier.upsert({
    where: { nom: 'Alimentation' },
    update: {},
    create: { nom: 'Alimentation', couleur: 'orange', ordre: 2 },
  })
  const themeCuisine = await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catAlimentation.id, nom: 'Cuisine' } },              update: {}, create: { nom: 'Cuisine',              categorieId: catAlimentation.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catAlimentation.id, nom: 'Cuisine anti-gaspi' } },      update: {}, create: { nom: 'Cuisine anti-gaspi',      categorieId: catAlimentation.id, ordre: 2 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catAlimentation.id, nom: 'Cuisine et diététique' } },   update: {}, create: { nom: 'Cuisine et diététique',   categorieId: catAlimentation.id, ordre: 3 } })

  const catBudget = await prisma.categorieAtelier.upsert({
    where: { nom: 'Budget' },
    update: {},
    create: { nom: 'Budget', couleur: 'amber', ordre: 3 },
  })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catBudget.id, nom: 'Gestion du budget' } }, update: {}, create: { nom: 'Gestion du budget', categorieId: catBudget.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catBudget.id, nom: 'Atelier Bilan' } },     update: {}, create: { nom: 'Atelier Bilan',     categorieId: catBudget.id, ordre: 2 } })

  const catNumerique = await prisma.categorieAtelier.upsert({
    where: { nom: 'Inclusion numérique' },
    update: {},
    create: { nom: 'Inclusion numérique', couleur: 'blue', ordre: 4 },
  })
  const themeInfo = await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catNumerique.id, nom: "Cours d'informatique" } }, update: {}, create: { nom: "Cours d'informatique", categorieId: catNumerique.id, ordre: 1 } })

  const catParentalite = await prisma.categorieAtelier.upsert({
    where: { nom: 'Parentalité' },
    update: {},
    create: { nom: 'Parentalité', couleur: 'pink', ordre: 5 },
  })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catParentalite.id, nom: "Noël de L'Escale" } },      update: {}, create: { nom: "Noël de L'Escale",      categorieId: catParentalite.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catParentalite.id, nom: 'Atelier environnement' } }, update: {}, create: { nom: 'Atelier environnement', categorieId: catParentalite.id, ordre: 2 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catParentalite.id, nom: 'Ciné parents-enfants' } }, update: {}, create: { nom: 'Ciné parents-enfants', categorieId: catParentalite.id, ordre: 3 } })

  const catSanteBienEtre = await prisma.categorieAtelier.upsert({
    where: { nom: 'Santé bien-être' },
    update: {},
    create: { nom: 'Santé bien-être', couleur: 'green', ordre: 6 },
  })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteBienEtre.id, nom: 'Socio-Esthétique' } },  update: {}, create: { nom: 'Socio-Esthétique',  categorieId: catSanteBienEtre.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteBienEtre.id, nom: 'Médiation équine' } }, update: {}, create: { nom: 'Médiation équine', categorieId: catSanteBienEtre.id, ordre: 2 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteBienEtre.id, nom: 'Atelier créatif' } },  update: {}, create: { nom: 'Atelier créatif',  categorieId: catSanteBienEtre.id, ordre: 3 } })

  const catSanteActivite = await prisma.categorieAtelier.upsert({
    where: { nom: "Santé par l'activité physique" },
    update: {},
    create: { nom: "Santé par l'activité physique", couleur: 'teal', ordre: 7 },
  })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteActivite.id, nom: 'Randonnée' } },     update: {}, create: { nom: 'Randonnée',     categorieId: catSanteActivite.id, ordre: 1 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteActivite.id, nom: 'Sport en salle' } }, update: {}, create: { nom: 'Sport en salle', categorieId: catSanteActivite.id, ordre: 2 } })
  await prisma.themeAtelierRef.upsert({ where: { categorieId_nom: { categorieId: catSanteActivite.id, nom: 'Piscine' } },        update: {}, create: { nom: 'Piscine',        categorieId: catSanteActivite.id, ordre: 3 } })

  await prisma.categorieAtelier.upsert({
    where: { nom: 'Santé environnement' },
    update: {},
    create: { nom: 'Santé environnement', couleur: 'sky', ordre: 8 },
  })

  await prisma.prestataire.upsert({
    where: { nom: 'Association Cuisine Solidaire' },
    update: {},
    create: { nom: 'Association Cuisine Solidaire' },
  })

  // ── Action collective (atelier) ────────────────────────────

  const atelier1 = await prisma.actionCollective.upsert({
    where: { id: 1 },
    update: {},
    create: {
      themeId: themeInfo.id,
      lieu: "L'Escale",
      date: new Date('2024-02-20'),
      notes: 'Initiation à la bureautique',
    },
  })

  await prisma.participationAtelier.upsert({
    where: { actionCollectiveId_personId: { actionCollectiveId: atelier1.id, personId: personne1.id } },
    update: {},
    create: {
      actionCollectiveId: atelier1.id,
      personId: personne1.id,
    },
  })

  await prisma.participationAtelier.upsert({
    where: { actionCollectiveId_personId: { actionCollectiveId: atelier1.id, personId: personne3.id } },
    update: {},
    create: {
      actionCollectiveId: atelier1.id,
      personId: personne3.id,
    },
  })

  // Atelier 2 : Cuisine avec prestataire
  const prestataire = await prisma.prestataire.findFirst({
    where: { deletedAt: null },
  })

  const atelier2 = await prisma.actionCollective.upsert({
    where: { id: 2 },
    update: {},
    create: {
      themeId: themeCuisine.id,
      prestataireId: prestataire?.id ?? undefined,
      lieu: "L'Escale",
      date: new Date('2024-03-05'),
      notes: 'Atelier cuisine anti-gaspillage — repas partagé',
    },
  })

  await prisma.participationAtelier.upsert({
    where: { actionCollectiveId_personId: { actionCollectiveId: atelier2.id, personId: personne2.id } },
    update: {},
    create: {
      actionCollectiveId: atelier2.id,
      personId: personne2.id,
    },
  })

  await prisma.participationAtelier.upsert({
    where: { actionCollectiveId_personId: { actionCollectiveId: atelier2.id, personId: personne3.id } },
    update: {},
    create: {
      actionCollectiveId: atelier2.id,
      personId: personne3.id,
    },
  })

  // ── Compteurs partenaires ──────────────────────────────────
  await prisma.compteurPartenaire.upsert({
    where: { date_partenaire: { date: today, partenaire: 'CPAM' } },
    update: {},
    create: {
      date: today,
      partenaire: 'CPAM',
      count: 3,
    },
  })

  await prisma.compteurPartenaire.upsert({
    where: { date_partenaire: { date: today, partenaire: 'CMS' } },
    update: {},
    create: {
      date: today,
      partenaire: 'CMS',
      count: 2,
    },
  })

  // ── Personne partenaire ────────────────────────────────────
  await prisma.personnePartenaire.upsert({
    where: { id: 1 },
    update: {},
    create: {
      date: today,
      partenaire: 'CPAM',
      nom: 'Dupont Marie',
      dateRDV: today,
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
