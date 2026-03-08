/**
 * Script de migration : créer un dossier individuel (Accompagnement + SuiviEI)
 * pour chaque personne qui n'en a pas encore.
 *
 * Usage : npx tsx scripts/creer-dossiers-individuels.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Trouver toutes les personnes qui n'ont PAS de SuiviEI lié à un accompagnement non supprimé
  const personnesAvecDI = await prisma.$queryRaw<{ personId: number }[]>`
    SELECT DISTINCT a."personId"
    FROM "Accompagnement" a
    JOIN "SuiviEI" sei ON sei."accompagnementId" = a.id
    WHERE a."deletedAt" IS NULL AND sei."deletedAt" IS NULL
  `
  const idsAvecDI = new Set(personnesAvecDI.map((r) => r.personId))

  const toutesPersonnes = await prisma.person.findMany({
    where: { deletedAt: null },
    select: { id: true, nom: true, prenom: true, createdAt: true },
    orderBy: { nom: 'asc' },
  })

  const personnesSansDI = toutesPersonnes.filter((p) => !idsAvecDI.has(p.id))

  console.log(`${toutesPersonnes.length} personnes au total`)
  console.log(`${idsAvecDI.size} ont déjà un dossier individuel`)
  console.log(`${personnesSansDI.length} personnes sans dossier individuel → création en cours…`)

  let nbCrees = 0
  for (const p of personnesSansDI) {
    await prisma.$transaction(async (tx) => {
      const accomp = await tx.accompagnement.create({
        data: {
          personId: p.id,
          dateEntree: p.createdAt, // date de création de la fiche comme date d'entrée
        },
      })
      await tx.demarches.create({ data: { accompagnementId: accomp.id } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any).suiviEI.create({ data: { accompagnementId: accomp.id } })
    })
    nbCrees++
    if (nbCrees % 50 === 0) {
      console.log(`  ${nbCrees}/${personnesSansDI.length} créés…`)
    }
  }

  console.log(`Terminé : ${nbCrees} dossiers individuels créés.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
