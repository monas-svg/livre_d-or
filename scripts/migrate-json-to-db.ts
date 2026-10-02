/**
 * One-off migration: imports the legacy data/guestbook_entries.json
 * file into the PostgreSQL database via Prisma.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/migrate-json-to-db.ts
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const DATA_FILE = path.join(process.cwd(), 'data', 'guestbook_entries.json');

const DEFAULT_REACTIONS = { '❤️': 0, '🥂': 0, '👏': 0, '🎉': 0, '🌟': 0 };

async function main() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('Aucun fichier data/guestbook_entries.json trouvé, rien à migrer.');
    return;
  }

  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const entries = JSON.parse(raw);

  if (!Array.isArray(entries) || entries.length === 0) {
    console.log('Fichier JSON vide, rien à migrer.');
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const e of entries) {
    const existing = await prisma.guestEntry.findUnique({ where: { token: e.token } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.guestEntry.create({
      data: {
        id: e.id,
        token: e.token,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email || '',
        relationship: e.relationship || 'Collègue',
        yearsKnown: e.yearsKnown || '',
        message: e.message,
        anecdote: e.anecdote || '',
        wish: e.wish || '',
        photoUrl: e.photoUrl || '',
        photoCaption: e.photoCaption || '',
        photos: (e.photos || []) as unknown as Prisma.InputJsonValue,
        cardStyle: e.cardStyle || 'polaroid',
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date(),
        likesCount: e.likesCount || 0,
        isPinned: Boolean(e.isPinned),
        isApproved: e.isApproved !== undefined ? Boolean(e.isApproved) : true,
        reactions: e.reactions || DEFAULT_REACTIONS,
      },
    });
    imported++;
  }

  console.log(`Migration terminée : ${imported} témoignage(s) importé(s), ${skipped} déjà présent(s).`);
}

main()
  .catch((err) => {
    console.error('Erreur de migration :', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
