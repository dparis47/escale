# Démarrage — Application L'Escale

## Prérequis

- Node.js 18+
- PostgreSQL installé en local

## Installation

```bash
npm install
```

## Base de données

```bash
# Appliquer les migrations
npx prisma migrate dev

# Charger les données de test
npm run db:seed
```

Comptes de test créés par le seed :

| Email | Mot de passe | Rôle |
|---|---|---|
| `accueil@escale.fr` | `password123` | Accueil |
| `ts@escale.fr` | `password123` | Travailleur social |
| `direction@escale.fr` | `password123` | Direction |
| `admin@escale.fr` | `password123` | Administrateur |

## Lancer le serveur de développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
```

## Build de production

```bash
npm run build
```

## Documents utiles

- [Spécifications fonctionnelles](./specifications.md)
- [Documentation base de données](./base-de-donnees.md)
