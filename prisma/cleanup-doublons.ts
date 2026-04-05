import { prisma } from '../src/lib/prisma'

async function main() {
  // Ajouter le thème "Santé environnement" à la catégorie "Santé environnement"
  const cat = await prisma.categorieAtelier.findFirst({
    where: { nom: 'Santé environnement', deletedAt: null },
  })
  if (cat) {
    await prisma.themeAtelierRef.upsert({
      where: { categorieId_nom: { categorieId: cat.id, nom: 'Santé environnement' } },
      update: {},
      create: { nom: 'Santé environnement', categorieId: cat.id, ordre: 1 },
    })
    console.log('✓ Thème "Santé environnement" ajouté')
  }

  // Mettre à jour seed-prod.ts aussi
  const final = await prisma.categorieAtelier.findMany({
    where: { deletedAt: null },
    include: { themes: { where: { deletedAt: null }, orderBy: { ordre: 'asc' } } },
    orderBy: { ordre: 'asc' },
  })
  console.log('\nCatégories :')
  for (const c of final) {
    console.log(`  ${c.nom} : ${c.themes.map((t) => t.nom).join(', ')}`)
  }

  await prisma.$disconnect()
}

main()
