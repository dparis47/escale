# L'Escale — Application de gestion

Application web de gestion pour l'association **L'Escale**, un lieu d'accueil libre où toute personne peut venir faire ses démarches (emploi, administratif, numérique…) sans rendez-vous.

## Stack technique

- **Next.js 15** + TypeScript (App Router)
- **Prisma** + PostgreSQL (local) / Supabase (production)
- **NextAuth.js** — authentification par rôle
- **Tailwind CSS** + shadcn/ui
- Déploiement sur **Vercel**

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Base de données

```bash
# Appliquer les migrations
npx prisma migrate dev

# Charger les données de test
npm run db:seed
```

Comptes de test créés par le seed :
- `accueil@escale.fr` / `password123`
- `ts@escale.fr` / `password123`
- `direction@escale.fr` / `password123`
