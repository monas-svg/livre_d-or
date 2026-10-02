# Livre d’Or & Hommage Numérique

Application web dédiée à la création d’un livre d’or numérique, pensée comme une plateforme de témoignages, de remerciements et d’hommage pour une personne exceptionnelle.

Le projet associe un front-end moderne en React, une API Node.js/Express, une base PostgreSQL via Prisma, ainsi qu’un système d’administration sécurisé pour modérer, organiser et présenter les messages publiés.

## Présentation

Cette application permet à des invités de :

- déposer un témoignage personnalisé,
- ajouter des photos et des détails contextuels,
- personnaliser leur carte de message,
- participer à une expérience visuelle orientée hommage et émotion,
- recevoir un accès unique via un jeton de session.

Côté administration, l’interface sécurisée permet de :

- consulter les messages soumis,
- valider ou désactiver des contributions,
- épingler des témoignages,
- analyser les statistiques globales,
- gérer le contenu de manière structurée et contrôlée.

## Stack technique

- React 19 + Vite
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Docker / Docker Compose
- Tailwind CSS

## Fonctionnalités principales

- Formulaire de témoignage riche et guidé
- Gestion de photos et de galerie visuelle
- Système d’authentification d’admin via passcode
- Sessions invité sécurisées par jeton
- Réactions visuelles sur les messages
- Tableau de bord d’administration
- Modération des messages et mise en avant
- Support de publication en conteneur Docker
- Génération de livret/éditions PDF ou publication à partir des données

## Structure du projet

- `src/` : interface utilisateur React
- `server.ts` : API Express et logique serveur
- `prisma/` : schéma Prisma et migrations
- `scripts/` : scripts de migration et utilitaires
- `docker-compose.yml` : environnement de déploiement local
- `Dockerfile` : image applicative

## Prérequis

- Node.js 18+
- npm
- PostgreSQL (ou Docker pour exécuter la base locale)
- Docker et Docker Compose (optionnel, recommandé pour le développement et le déploiement)

## Configuration de l’environnement

Créez un fichier `.env` à partir du modèle fourni :

```bash
cp .env.example .env
```

Puis renseignez les variables suivantes :

```env
DATABASE_URL="postgresql://guestbook:CHANGE_ME@localhost:5432/guestbook?schema=public"
ADMIN_PASSCODE="CHANGE_ME"
PORT=3000
APP_URL="http://localhost:3000"
GEMINI_API_KEY="YOUR_API_KEY"
```

> Les variables de base de données et de passcode doivent être conservées de manière sécurisée et ne jamais être commitées directement dans le dépôt en production.

## Démarrage local

Installation des dépendances :

```bash
npm install
```

Génération du client Prisma :

```bash
npm run prisma:generate
```

Migration de la base de données :

```bash
npm run prisma:migrate
```

Démarrage du projet :

```bash
npm run dev
```

Le site est ensuite accessible localement sur le port configuré, généralement :

```text
http://localhost:3000
```

## Build de production

```bash
npm run build
npm run start
```

## Déploiement avec Docker

Le projet est prêt pour un déploiement conteneurisé :

```bash
docker compose up --build
```

Cette configuration démarre :

- la base PostgreSQL,
- l’application web,
- les services nécessaires au bon fonctionnement de la plateforme.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run preview
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
npm run migrate:json
```

## Sécurité et bonnes pratiques

- Les accès administrateurs sont contrôlés par un système de passcode et de token de session.
- Les variables sensibles doivent être stockées dans un gestionnaire de secrets ou des variables d’environnement sécurisées.
- La base de données est gérée via Prisma et les migrations sont versionnées dans le dépôt.

## Licence

Ce projet est fourni à des fins de déploiement et de gestion interne. Vérifiez les conditions de distribution et les droits d’usage applicables avant toute mise en ligne publique ou commercialisation.

## Auteur et contexte

Projet conçu pour soutenir un hommage numérique, une collecte de témoignages et une expérience de célébration des contributions d’une personne ou d’une équipe.

