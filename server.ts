import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { PrismaClient, Prisma } from '@prisma/client';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE;
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

if (!ADMIN_PASSCODE) {
  // Fail fast: never ship a hardcoded fallback passcode.
  console.error('FATAL: ADMIN_PASSCODE env var is not set. Refusing to start.');
  process.exit(1);
}

const DEFAULT_REACTIONS = { '❤️': 0, '🥂': 0, '👏': 0, '🎉': 0, '🌟': 0 };

// Body parser
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ----------------------------------------------------
// ADMIN AUTH HELPERS (DB-backed sessions, no static tokens)
// ----------------------------------------------------

function extractToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  return auth.replace(/^Bearer\s+/i, '').trim();
}

async function isValidAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const session = await prisma.adminSession.findUnique({ where: { token } });
  if (!session) return false;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { token } }).catch(() => {});
    return false;
  }
  return true;
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractToken(req);
  if (!(await isValidAdminToken(token))) {
    return res.status(401).json({ error: 'Accès non autorisé.' });
  }
  next();
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 0. Health Check for Cloud Run / Container checks
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'db_unavailable', timestamp: new Date().toISOString() });
  }
});

function parsePagination(req: express.Request) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

// 1. Get Entries - Strictly Confidential: only Admin or the Guest for their own token
app.get('/api/entries', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const token = extractToken(req);
  const { page, limit, skip } = parsePagination(req);

  if (await isValidAdminToken(token)) {
    const [entries, total] = await Promise.all([
      prisma.guestEntry.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.guestEntry.count(),
    ]);

    return res.json({
      items: entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  const guestToken = req.query.guestToken as string | undefined;
  if (guestToken) {
    const [entries, total] = await Promise.all([
      prisma.guestEntry.findMany({
        where: { token: guestToken },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.guestEntry.count({ where: { token: guestToken } }),
    ]);

    return res.json({
      items: entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  return res.json({ items: [], total: 0, page, limit, totalPages: 0 });
});

// 2. Get Guest Entry by Token
app.get('/api/entries/token/:token', async (req, res) => {
  const { token } = req.params;
  const entry = await prisma.guestEntry.findUnique({ where: { token } });
  if (!entry) {
    return res.status(404).json({ error: "Aucun témoignage trouvé avec ce jeton d'accès." });
  }
  res.json(entry);
});

// 3. Create or Update Guest Entry
app.post('/api/entries', async (req, res) => {
  const {
    token: existingToken,
    firstName,
    lastName,
    email,
    relationship,
    yearsKnown,
    message,
    anecdote,
    wish,
    photoUrl,
    photoCaption,
    photos,
    cardStyle,
  } = req.body;

  if (!firstName || !lastName || !message) {
    return res.status(400).json({ error: 'Le prénom, le nom et le message sont requis.' });
  }

  let normalizedPhotos: Array<{ id?: string; url: string; caption?: string }> = [];
  if (Array.isArray(photos) && photos.length > 0) {
    normalizedPhotos = photos.filter((p) => p && typeof p.url === 'string' && p.url.trim() !== '');
  } else if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim() !== '') {
    normalizedPhotos = [{ url: photoUrl, caption: photoCaption || '' }];
  }

  const primaryPhotoUrl = normalizedPhotos.length > 0 ? normalizedPhotos[0].url : (photoUrl || '');
  const primaryPhotoCaption = normalizedPhotos.length > 0 ? (normalizedPhotos[0].caption || '') : (photoCaption || '');

  try {
    if (existingToken) {
      const existing = await prisma.guestEntry.findUnique({ where: { token: existingToken } });
      if (existing) {
        const updated = await prisma.guestEntry.update({
          where: { token: existingToken },
          data: {
            firstName,
            lastName,
            email: email || existing.email,
            relationship: relationship || existing.relationship || 'Collègue',
            yearsKnown: yearsKnown || existing.yearsKnown,
            message,
            anecdote: anecdote || '',
            wish: wish || '',
            photoUrl: primaryPhotoUrl,
            photoCaption: primaryPhotoCaption,
            photos: normalizedPhotos as unknown as Prisma.InputJsonValue,
            cardStyle: cardStyle || existing.cardStyle || 'polaroid',
          },
        });
        return res.json({ success: true, entry: updated });
      }
    }

    const newToken = 'guest-' + crypto.randomBytes(8).toString('hex') + '-' + Date.now();
    const newEntry = await prisma.guestEntry.create({
      data: {
        token: newToken,
        firstName,
        lastName,
        email: email || '',
        relationship: relationship || 'Collègue',
        yearsKnown: yearsKnown || '',
        message,
        anecdote: anecdote || '',
        wish: wish || '',
        photoUrl: primaryPhotoUrl,
        photoCaption: primaryPhotoCaption,
        photos: normalizedPhotos as unknown as Prisma.InputJsonValue,
        cardStyle: cardStyle || 'polaroid',
        likesCount: 0,
        isPinned: false,
        isApproved: true,
        reactions: DEFAULT_REACTIONS,
      },
    });

    res.status(201).json({ success: true, entry: newEntry, token: newToken });
  } catch (err) {
    console.error('Error writing entry:', err);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du témoignage." });
  }
});

// 4. Update Guest Entry by Token
app.put('/api/entries/token/:token', async (req, res) => {
  const { token } = req.params;
  const existing = await prisma.guestEntry.findUnique({ where: { token } });
  if (!existing) {
    return res.status(404).json({ error: 'Témoignage introuvable.' });
  }

  const { token: _t, id: _id, ...rest } = req.body;
  try {
    const updated = await prisma.guestEntry.update({ where: { token }, data: rest });
    res.json({ success: true, entry: updated });
  } catch (err) {
    console.error('Error updating entry:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour.' });
  }
});

// 5. Delete Guest Entry by Token
app.delete('/api/entries/token/:token', async (req, res) => {
  const { token } = req.params;
  try {
    await prisma.guestEntry.delete({ where: { token } });
    res.json({ success: true, message: 'Témoignage supprimé avec succès.' });
  } catch (err) {
    res.status(404).json({ error: 'Témoignage introuvable.' });
  }
});

// 6. Reaction / Like toggle
app.post('/api/entries/:id/reaction', async (req, res) => {
  const { id } = req.params;
  const { emoji } = req.body;
  const entry = await prisma.guestEntry.findUnique({ where: { id } });

  if (!entry) {
    return res.status(404).json({ error: 'Témoignage non trouvé.' });
  }

  const reactions: Record<string, number> = { ...DEFAULT_REACTIONS, ...(entry.reactions as Record<string, number>) };
  const validEmoji = emoji || '❤️';
  reactions[validEmoji] = (reactions[validEmoji] || 0) + 1;
  const likesCount = (entry.likesCount || 0) + 1;

  const updated = await prisma.guestEntry.update({ where: { id }, data: { reactions, likesCount } });

  res.json({ success: true, reactions: updated.reactions, likesCount: updated.likesCount });
});

// 7. Image Upload Handler (Base64)
app.post('/api/upload', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Aucune image fournie.' });
  }
  res.json({ success: true, url: imageBase64 });
});

// 8. Admin Authentication
app.post('/api/admin/login', async (req, res) => {
  const { passcode } = req.body;
  if (passcode !== ADMIN_PASSCODE) {
    return res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.adminSession.create({
    data: { token, expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS) },
  });
  return res.json({ success: true, token });
});

// 9. Admin List All Entries
app.get('/api/admin/entries', requireAdmin, async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const [entries, total] = await Promise.all([
    prisma.guestEntry.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.guestEntry.count(),
  ]);

  res.json({
    items: entries,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// 10. Admin Update Entry Status
app.patch('/api/admin/entries/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.guestEntry.update({ where: { id }, data: req.body });
    res.json({ success: true, entry: updated });
  } catch (err) {
    res.status(404).json({ error: 'Témoignage non trouvé.' });
  }
});

// 11. Admin Delete Entry
app.delete('/api/admin/entries/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.guestEntry.delete({ where: { id } });
    res.json({ success: true, message: "Témoignage supprimé par l'administrateur." });
  } catch (err) {
    res.status(404).json({ error: 'Témoignage non trouvé.' });
  }
});

// 12. Admin Stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const entries = await prisma.guestEntry.findMany();
  const totalEntries = entries.length;
  const totalPhotos = entries.reduce((acc, curr) => {
    const photos = curr.photos as Array<unknown> | null;
    if (Array.isArray(photos) && photos.length > 0) return acc + photos.length;
    return acc + (curr.photoUrl ? 1 : 0);
  }, 0);
  const totalLikes = entries.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);

  const relationshipsCount: Record<string, number> = {};
  entries.forEach((e) => {
    const rel = e.relationship || 'Autre';
    relationshipsCount[rel] = (relationshipsCount[rel] || 0) + 1;
  });

  res.json({ totalEntries, totalPhotos, totalLikes, relationshipsCount });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVING
// ----------------------------------------------------

async function startServer() {
  app.use('/images', express.static(path.join(process.cwd(), 'images')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
