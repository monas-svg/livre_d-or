import express from 'express';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { PrismaClient, Prisma } from '@prisma/client';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();

// À activer seulement derrière un reverse proxy (ex: TRUST_PROXY=1 avec Caddy/Nginx)
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(helmet({ contentSecurityPolicy: false }));

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE ?? '';
const ADMIN_SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 an

if (!ADMIN_PASSCODE) {
  // Fail fast: never ship a hardcoded fallback passcode.
  console.error('FATAL: ADMIN_PASSCODE env var is not set. Refusing to start.');
  process.exit(1);
}

const DEFAULT_REACTIONS = { '❤️': 0, '🥂': 0, '👏': 0, '🎉': 0, '🌟': 0 };

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

// Évite les promesses rejetées non gérées (Express 4)
const ah =
  (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

function safeEqual(a: string, b: string): boolean {
  return crypto.timingSafeEqual(
    crypto.createHash('sha256').update(a).digest(),
    crypto.createHash('sha256').update(b).digest()
  );
}

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');

const TEXT_LIMITS = {
  firstName: 100,
  lastName: 100,
  email: 254,
  relationship: 100,
  yearsKnown: 50,
  message: 5000,
  anecdote: 5000,
  wish: 2000,
  photoCaption: 500,
  cardStyle: 50,
} as const;

const MAX_PHOTOS = 6;
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/;
const PHOTO_URL_RE = /^(data:image\/(png|jpe?g|webp|gif);base64,|\/images\/|https:\/\/)/;

type Photo = { id?: string; url: string; caption: string };

function sanitizePhotos(photos: unknown): Photo[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .slice(0, MAX_PHOTOS)
    .filter((p) => p && typeof p.url === 'string' && PHOTO_URL_RE.test(p.url))
    .map((p) => ({
      id: typeof p.id === 'string' ? p.id.slice(0, 64) : undefined,
      url: p.url as string,
      caption: clip(p.caption, 500),
    }));
}

// ----------------------------------------------------
// BODY PARSERS (15 Mo uniquement là où des photos transitent)
// ----------------------------------------------------

const smallJson = express.json({ limit: '100kb' });
const bigJson = express.json({ limit: '15mb' });
const BIG_BODY: Array<[string, RegExp]> = [
  ['POST', /^\/api\/upload$/],
  ['POST', /^\/api\/entries$/],
  ['PUT', /^\/api\/entries\/token\/[^/]+$/],
];

app.use((req, res, next) => {
  const big = BIG_BODY.some(([m, re]) => req.method === m && re.test(req.path));
  (big ? bigJson : smallJson)(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ----------------------------------------------------
// RATE LIMITERS
// ----------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez plus tard.' },
});
const writeLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const reactLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });

// ----------------------------------------------------
// ADMIN AUTH HELPERS (sessions en base, token haché)
// ----------------------------------------------------

function extractToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token || null;
}

async function isValidAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const hashed = sha256(token);
  const session = await prisma.adminSession.findUnique({ where: { token: hashed } });
  if (!session) return false;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { token: hashed } }).catch(() => {});
    return false;
  }
  return true;
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = extractToken(req);
    if (!(await isValidAdminToken(token))) {
      return res.status(401).json({ error: 'Accès non autorisé.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

const isNotFound = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';

function parsePagination(req: express.Request) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 0. Health Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'db_unavailable', timestamp: new Date().toISOString() });
  }
});

// 1. Get Entries - Confidentiel: admin, ou l'invité pour son propre token
app.get(
  '/api/entries',
  ah(async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const token = extractToken(req);
    const { page, limit, skip } = parsePagination(req);

    if (await isValidAdminToken(token)) {
      const [entries, total] = await Promise.all([
        prisma.guestEntry.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
        prisma.guestEntry.count(),
      ]);
      return res.json({ items: entries, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const guestToken = typeof req.query.guestToken === 'string' ? req.query.guestToken : undefined;
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
      return res.json({ items: entries, total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    return res.json({ items: [], total: 0, page, limit, totalPages: 0 });
  })
);

// 2. Get Guest Entry by Token
app.get(
  '/api/entries/token/:token',
  ah(async (req, res) => {
    const { token } = req.params;
    const entry = await prisma.guestEntry.findUnique({ where: { token } });
    if (!entry) {
      return res.status(404).json({ error: "Aucun témoignage trouvé avec ce jeton d'accès." });
    }
    res.json(entry);
  })
);

// 3. Create or Update Guest Entry
app.post(
  '/api/entries',
  writeLimiter,
  ah(async (req, res) => {
    const body = req.body ?? {};
    const firstName = clip(body.firstName, TEXT_LIMITS.firstName).trim();
    const lastName = clip(body.lastName, TEXT_LIMITS.lastName).trim();
    const message = clip(body.message, TEXT_LIMITS.message).trim();

    if (!firstName || !lastName || !message) {
      return res.status(400).json({ error: 'Le prénom, le nom et le message sont requis.' });
    }

    const existingToken = typeof body.token === 'string' ? body.token : undefined;
    const email = clip(body.email, TEXT_LIMITS.email);
    const relationship = clip(body.relationship, TEXT_LIMITS.relationship);
    const yearsKnown = clip(body.yearsKnown, TEXT_LIMITS.yearsKnown);
    const anecdote = clip(body.anecdote, TEXT_LIMITS.anecdote);
    const wish = clip(body.wish, TEXT_LIMITS.wish);
    const cardStyle = clip(body.cardStyle, TEXT_LIMITS.cardStyle);

    const normalizedPhotos = sanitizePhotos(
      Array.isArray(body.photos) && body.photos.length > 0
        ? body.photos
        : body.photoUrl
        ? [{ url: body.photoUrl, caption: body.photoCaption }]
        : []
    );
    const primaryPhotoUrl = normalizedPhotos[0]?.url ?? '';
    const primaryPhotoCaption = normalizedPhotos[0]?.caption ?? '';

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
            anecdote,
            wish,
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
        email,
        relationship: relationship || 'Collègue',
        yearsKnown,
        message,
        anecdote,
        wish,
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
  })
);

// 4. Update Guest Entry by Token (liste blanche de champs)
app.put(
  '/api/entries/token/:token',
  writeLimiter,
  ah(async (req, res) => {
    const { token } = req.params;
    const body = req.body ?? {};
    const data: Record<string, unknown> = {};

    for (const [field, max] of Object.entries(TEXT_LIMITS)) {
      if (field in body) data[field] = clip(body[field], max);
    }
    if ('photos' in body) {
      const photos = sanitizePhotos(body.photos);
      data.photos = photos as unknown as Prisma.InputJsonValue;
      data.photoUrl = photos[0]?.url ?? '';
      data.photoCaption = photos[0]?.caption ?? '';
    }

    try {
      const updated = await prisma.guestEntry.update({
        where: { token },
        data: data as Prisma.GuestEntryUpdateInput,
      });
      res.json({ success: true, entry: updated });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: 'Témoignage introuvable.' });
      throw err;
    }
  })
);

// 5. Delete Guest Entry by Token
app.delete(
  '/api/entries/token/:token',
  ah(async (req, res) => {
    const { token } = req.params;
    try {
      await prisma.guestEntry.delete({ where: { token } });
      res.json({ success: true, message: 'Témoignage supprimé avec succès.' });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: 'Témoignage introuvable.' });
      throw err;
    }
  })
);

// 6. Reaction (liste blanche + incrément atomique)
app.post(
  '/api/entries/:id/reaction',
  reactLimiter,
  ah(async (req, res) => {
    const { id } = req.params;
    const emoji = req.body?.emoji ?? '❤️';
    if (typeof emoji !== 'string' || !Object.keys(DEFAULT_REACTIONS).includes(emoji)) {
      return res.status(400).json({ error: 'Réaction invalide.' });
    }

    const rows = await prisma.$queryRaw<{ reactions: Prisma.JsonValue; likesCount: number }[]>`
      UPDATE guest_entries
      SET reactions = jsonb_set(
            COALESCE(reactions, '{}'::jsonb),
            ARRAY[${emoji}::text],
            to_jsonb(COALESCE((reactions->>(${emoji}::text))::int, 0) + 1)
          ),
          "likesCount" = COALESCE("likesCount", 0) + 1
      WHERE id = ${id}
      RETURNING reactions, "likesCount"`;

    if (rows.length === 0) return res.status(404).json({ error: 'Témoignage non trouvé.' });
    res.json({ success: true, reactions: rows[0].reactions, likesCount: rows[0].likesCount });
  })
);

// 7. Image Upload Handler (Base64) - à migrer vers S3
app.post('/api/upload', writeLimiter, (req, res) => {
  const imageBase64 = req.body?.imageBase64;
  if (typeof imageBase64 !== 'string' || !IMAGE_DATA_URL_RE.test(imageBase64)) {
    return res.status(400).json({ error: 'Image invalide.' });
  }
  res.json({ success: true, url: imageBase64 });
});

// 8. Admin Authentication
app.post(
  '/api/admin/login',
  loginLimiter,
  ah(async (req, res) => {
    const passcode = req.body?.passcode;
    if (typeof passcode !== 'string' || !safeEqual(passcode, ADMIN_PASSCODE)) {
      return res.status(401).json({ error: 'Mot de passe administrateur incorrect.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.adminSession.create({
      data: { token: sha256(token), expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS) },
    });
    return res.json({ success: true, token });
  })
);

// 9. Admin List All Entries
app.get(
  '/api/admin/entries',
  requireAdmin,
  ah(async (req, res) => {
    const { page, limit, skip } = parsePagination(req);
    // Mode livre (?book=1) : temoignages approuves, epingles d'abord puis par date croissante (ordre du PDF)
    const book = req.query.book === '1';
    const where = book ? { isApproved: true } : undefined;
    const orderBy = book
      ? [{ isPinned: 'desc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }]
      : [{ createdAt: 'desc' as const }];
    const [entries, total] = await Promise.all([
      prisma.guestEntry.findMany({ where, orderBy, skip, take: limit }),
      prisma.guestEntry.count({ where }),
    ]);
    res.json({ items: entries, total, page, limit, totalPages: Math.ceil(total / limit) });
  })
);

// 10. Admin Update Entry (liste blanche: isApproved, isPinned)
app.patch(
  '/api/admin/entries/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { id } = req.params;
    const data: Prisma.GuestEntryUpdateInput = {};
    if (typeof req.body?.isApproved === 'boolean') data.isApproved = req.body.isApproved;
    if (typeof req.body?.isPinned === 'boolean') data.isPinned = req.body.isPinned;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide.' });
    }
    try {
      const updated = await prisma.guestEntry.update({ where: { id }, data });
      res.json({ success: true, entry: updated });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: 'Témoignage non trouvé.' });
      throw err;
    }
  })
);

// 11. Admin Delete Entry
app.delete(
  '/api/admin/entries/:id',
  requireAdmin,
  ah(async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.guestEntry.delete({ where: { id } });
      res.json({ success: true, message: "Témoignage supprimé par l'administrateur." });
    } catch (err) {
      if (isNotFound(err)) return res.status(404).json({ error: 'Témoignage non trouvé.' });
      throw err;
    }
  })
);

// 12. Admin Stats (calculées côté base, sans charger la table en mémoire)
app.get(
  '/api/admin/stats',
  requireAdmin,
  ah(async (req, res) => {
    const [totalEntries, likes, byRel, photoRows] = await Promise.all([
      prisma.guestEntry.count(),
      prisma.guestEntry.aggregate({ _sum: { likesCount: true } }),
      prisma.guestEntry.groupBy({ by: ['relationship'], _count: { _all: true } }),
      prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COALESCE(SUM(
          CASE WHEN jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) > 0
                 THEN jsonb_array_length(photos)
               WHEN "photoUrl" <> '' THEN 1
               ELSE 0 END), 0)::bigint AS total
        FROM guest_entries`,
    ]);

    const relationshipsCount: Record<string, number> = {};
    for (const r of byRel) relationshipsCount[r.relationship || 'Autre'] = r._count._all;

    res.json({
      totalEntries,
      totalPhotos: Number(photoRows[0]?.total ?? 0),
      totalLikes: likes._sum.likesCount ?? 0,
      relationshipsCount,
    });
  })
);

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

  // Gestionnaire d'erreurs global (doit rester après toutes les routes)
  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    const status = (err as { status?: number })?.status;
    if (status === 413) return res.status(413).json({ error: 'Requête trop volumineuse.' });
    res.status(500).json({ error: 'Erreur serveur.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

// Nettoyage horaire des sessions admin expirées
setInterval(() => {
  prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(console.error);
}, 60 * 60 * 1000).unref();

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
