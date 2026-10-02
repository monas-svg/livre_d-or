# Déploiement (Docker + PostgreSQL)

## 1. Configurer les secrets
Copiez `.env.example` en `.env` et renseignez :
- `POSTGRES_PASSWORD` : mot de passe fort pour la base
- `ADMIN_PASSCODE` : passe administrateur (remplace l'ancien mot de passe codé en dur)
- `GEMINI_API_KEY`, `APP_URL` : si utilisés

`.env` est déjà ignoré par git — ne jamais le committer.

## 2. Lancer l'ensemble (app + Postgres)
```bash
docker compose up -d --build
```
Au démarrage, le conteneur `app` exécute automatiquement `prisma migrate deploy`
(voir `docker-entrypoint.sh`) : les tables sont créées avant que le serveur ne démarre.

## 3. Importer les anciennes données (fichier JSON existant)
Si `data/guestbook_entries.json` contient déjà des témoignages :
```bash
docker compose exec app npx tsx scripts/migrate-json-to-db.ts
```
Le script est idempotent : les entrées déjà présentes (même `token`) sont ignorées.

## 4. Sauvegardes
Les données Postgres vivent dans le volume nommé `db_data`. Pour une sauvegarde ponctuelle :
```bash
docker compose exec db pg_dump -U guestbook guestbook > backup.sql
```

## 5. Développement local sans Docker
```bash
npm install
npx prisma migrate dev   # nécessite un Postgres local, voir DATABASE_URL dans .env
npm run dev
```
