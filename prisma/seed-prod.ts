import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Initialisation de la base de production...')

  // ── Utilisateur admin ───────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin-escale-2026', 10)

  await prisma.user.upsert({
    where: { email: 'admin@escale.fr' },
    update: {},
    create: {
      email: 'admin@escale.fr',
      nom: 'Admin',
      prenom: 'Escale',
      password: passwordHash,
      role: Role.ADMIN,
    },
  })
  console.log('  ✓ Utilisateur admin créé (admin@escale.fr)')

  // ── Catégories et thèmes d'ateliers ────────────────────────

  const catCulture = await prisma.categorieAtelier.upsert({
    where: { nom: 'Accès à la culture' },
    update: {},
    create: { nom: 'Accès à la culture', couleur: 'purple', ordre: 1 },
  })
  await upsertTheme(catCulture.id, 'Cinéma', 1)
  await upsertTheme(catCulture.id, 'Jeux de société', 2)
  await upsertTheme(catCulture.id, "L'Escale fait son cinéma", 3)
  await upsertTheme(catCulture.id, 'Projet culturel itinérant', 4)
  await upsertTheme(catCulture.id, 'Sortie culturelle', 5)

  const catAlimentation = await prisma.categorieAtelier.upsert({
    where: { nom: 'Alimentation' },
    update: {},
    create: { nom: 'Alimentation', couleur: 'orange', ordre: 2 },
  })
  await upsertTheme(catAlimentation.id, 'Cuisine', 1)
  await upsertTheme(catAlimentation.id, 'Cuisine anti-gaspi', 2)
  await upsertTheme(catAlimentation.id, 'Cuisine et diététique', 3)

  const catBudget = await prisma.categorieAtelier.upsert({
    where: { nom: 'Budget' },
    update: {},
    create: { nom: 'Budget', couleur: 'amber', ordre: 3 },
  })
  await upsertTheme(catBudget.id, 'Gestion du budget', 1)
  await upsertTheme(catBudget.id, 'Atelier Bilan', 2)

  const catNumerique = await prisma.categorieAtelier.upsert({
    where: { nom: 'Inclusion numérique' },
    update: {},
    create: { nom: 'Inclusion numérique', couleur: 'blue', ordre: 4 },
  })
  await upsertTheme(catNumerique.id, "Cours d'informatique", 1)

  const catParentalite = await prisma.categorieAtelier.upsert({
    where: { nom: 'Parentalité' },
    update: {},
    create: { nom: 'Parentalité', couleur: 'pink', ordre: 5 },
  })
  await upsertTheme(catParentalite.id, "Noël de L'Escale", 1)
  await upsertTheme(catParentalite.id, 'Atelier environnement', 2)
  await upsertTheme(catParentalite.id, 'Ciné parents-enfants', 3)

  const catSanteBienEtre = await prisma.categorieAtelier.upsert({
    where: { nom: 'Santé bien-être' },
    update: {},
    create: { nom: 'Santé bien-être', couleur: 'green', ordre: 6 },
  })
  await upsertTheme(catSanteBienEtre.id, 'Socio-Esthétique', 1)
  await upsertTheme(catSanteBienEtre.id, 'Médiation équine', 2)
  await upsertTheme(catSanteBienEtre.id, 'Atelier créatif', 3)

  const catSanteActivite = await prisma.categorieAtelier.upsert({
    where: { nom: "Santé par l'activité physique" },
    update: {},
    create: { nom: "Santé par l'activité physique", couleur: 'teal', ordre: 7 },
  })
  await upsertTheme(catSanteActivite.id, 'Randonnée', 1)
  await upsertTheme(catSanteActivite.id, 'Sport en salle', 2)
  await upsertTheme(catSanteActivite.id, 'Piscine', 3)

  const catSanteEnv = await prisma.categorieAtelier.upsert({
    where: { nom: 'Santé environnement' },
    update: {},
    create: { nom: 'Santé environnement', couleur: 'sky', ordre: 8 },
  })
  await upsertTheme(catSanteEnv.id, 'Santé environnement', 1)

  console.log('  ✓ Catégories et thèmes d\'ateliers créés')
  console.log('')
  console.log('Initialisation terminée.')
  console.log('⚠  Changez le mot de passe admin après la première connexion.')
}

async function upsertTheme(categorieId: number, nom: string, ordre: number) {
  await prisma.themeAtelierRef.upsert({
    where: { categorieId_nom: { categorieId, nom } },
    update: {},
    create: { nom, categorieId, ordre },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
