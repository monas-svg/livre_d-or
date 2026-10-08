import jsPDF from 'jspdf';
import { GuestEntry, getEntryPhotos, GuestPhoto } from '../types';

export interface PdfBookOptions {
  theme: 'royal_navy' | 'burgundy_gold' | 'classic_parchment' | 'emerald_prestige';
  bookTitle: string;
  recipientName: string;
  dedicationSubtitle: string;
  eventDate: string;
  includePhotos: boolean;
  onProgress?: (progress: number, status: string) => void;
}

type RGB = [number, number, number];

interface LoadedImage {
  data: string;
  format: string;
  width: number;
  height: number;
}

interface LoadedPhoto {
  img: LoadedImage;
  caption: string;
}

// ---------------------------------------------------------------------------
// Chargement des images
// ---------------------------------------------------------------------------
function resolveAssetUrl(url: string): string {
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    return new URL(url, window.location.origin).toString();
  }
  return url;
}

// Convertit une URL d'image en data URL (base64) sans jamais lever d'exception
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:image/')) {
      return url;
    }

    const safeUrl = resolveAssetUrl(url);
    const response = await fetch(safeUrl, { mode: 'cors', credentials: 'same-origin' });
    if (!response.ok) return null;
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not load image for PDF:', url, err);
    return null;
  }
}

function guessImageFormat(data: string): string {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);/.exec(data);
  const t = (m ? m[1] : 'jpeg').toLowerCase();
  if (t === 'png') return 'PNG';
  if (t === 'webp') return 'WEBP';
  return 'JPEG';
}

// ---------------------------------------------------------------------------
// Nettoyage du texte : les polices PDF integrees ne savent dessiner ni les
// emojis ni l'arabe. On les retire pour eviter les caracteres illisibles.
// ---------------------------------------------------------------------------
const WIN_ANSI_EXTRA = new Set<string>([
  '\u0152', '\u0153', '\u0160', '\u0161', '\u0178', '\u017D', '\u017E', '\u0192',
  '\u02C6', '\u02DC', '\u2013', '\u2014', '\u2018', '\u2019', '\u201A', '\u201C',
  '\u201D', '\u201E', '\u2020', '\u2021', '\u2022', '\u2026', '\u2030', '\u2039',
  '\u203A', '\u20AC', '\u2122',
]);

function cleanText(input?: string | null): string {
  if (!input) return '';
  let s = String(input).replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ');
  // Marqueurs de gras a la WhatsApp : *texte*
  s = s.replace(/\*([^*\n]+)\*/g, '$1');

  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (
      c === 10 ||
      (c >= 32 && c <= 126) ||
      (c >= 160 && c <= 255 && c !== 173) ||
      WIN_ANSI_EXTRA.has(ch)
    ) {
      out += ch;
    }
  }

  out = out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // Coupe les "mots" geants (adresses, suites de caracteres) pour qu'ils passent a la ligne
  out = out.replace(/(\S{60})(?=\S)/g, '$1 ');
  return out;
}

// Texte nettoye, ou un texte de remplacement si l'original n'etait pas imprimable
function safeText(raw: string | null | undefined, fallback: string): string {
  const cleaned = cleanText(raw);
  if (cleaned) return cleaned;
  if (raw && String(raw).trim()) return fallback;
  return '';
}

// ---------------------------------------------------------------------------
// Constantes de mise en page (A4 portrait, millimetres)
// ---------------------------------------------------------------------------
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP = 29; // debut de la zone de contenu
const BOTTOM = PAGE_H - 23; // fin de la zone de contenu
const CARD_GAP = 6;

const HEADER_H = 9;
const MSG_FS = 10;
const MSG_LH = 4.6;
const SUB_FS = 9.2;
const SUB_LH = 4.2;

const SIDE_W = 50; // photo a droite du message (une seule photo)
const SIDE_GAP = 5;
const SIDE_PHOTO_H = 36;
const ROW_PHOTO_H = 38; // photos sous le texte (2 ou 3 photos)
const MAX_CARD_PHOTOS = 3;

const TOC_START_Y = 56;
const TOC_ROW_H = 5.6;
const TOC_ROWS_PER_COL = Math.floor((BOTTOM - TOC_START_Y) / TOC_ROW_H);
const TOC_PER_PAGE = TOC_ROWS_PER_COL * 2;

const GALLERY_MAX_PHOTOS = 36;

const PREFACE_PARAGRAPHS = [
  "« Le 27 septembre 2021, le royaume bamoun et le Cameroun perdaient Sa Majesté le Sultan-Roi Ibrahim Mbombo Njoya, 19e souverain de la dynastie fondée par Nchare Yen. Intronisé le 10 août 1992, il a porté pendant près de trente ans l'héritage d'un des plus anciens et des plus prestigieux royaumes du pays. Gardien des traditions et de la mémoire de Foumban, il a servi son peuple avec dignité, sagesse et dévouement.",
  "Ce livre d'or rassemble les mots sincères, les souvenirs et les prières de celles et ceux qui l'ont connu, admiré ou simplement respecté. Il est offert en témoignage de notre gratitude, afin que son nom, son œuvre et son exemple demeurent vivants dans nos cœurs et dans ceux des générations à venir.",
  'Que son âme repose en paix. »',
];

export async function generateGoldenBookPdf(
  entries: GuestEntry[],
  options: PdfBookOptions
): Promise<Blob> {
  const {
    theme = 'royal_navy',
    bookTitle = "LIVRE D'OR — HOMMAGE À FEU SA MAJESTÉ IBRAHIM MBOMBO NJOYA",
    recipientName = 'Feu Sa Majesté Ibrahim Mbombo Njoya',
    eventDate = '2026',
    includePhotos = true,
    onProgress,
  } = options;

  onProgress?.(5, 'Initialisation du moteur de composition vectoriel...');

  // 1. Temoignages approuves : epingles d'abord, puis par date croissante
  const bookEntries = entries
    .filter((e) => e.isApproved !== false)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
  const total = bookEntries.length;

  // 2. Informations de tome (le titre se termine par "TOME 2 / 5" quand le livre est decoupe)
  const tomeMatch = /TOME\s+(\d+)\s*\/\s*(\d+)/i.exec(bookTitle);
  const tomeIndex = tomeMatch ? Number(tomeMatch[1]) : 1;
  const tomeCount = tomeMatch ? Number(tomeMatch[2]) : 1;
  const isLastTome = tomeIndex >= tomeCount;
  const baseTitle = cleanText(bookTitle.replace(/\s*[—–-]?\s*TOME\s+\d+\s*\/\s*\d+/i, ''));
  const recipient = cleanText(recipientName);
  const eventLabel = cleanText(eventDate);

  // 3. Document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const getThemePalette = () => {
    switch (theme) {
      case 'burgundy_gold':
        return {
          bg: [66, 5, 22] as RGB,
          gold: [218, 165, 32] as RGB,
          lightGold: [255, 235, 175] as RGB,
        };
      case 'emerald_prestige':
        return {
          bg: [6, 51, 35] as RGB,
          gold: [218, 165, 32] as RGB,
          lightGold: [210, 245, 225] as RGB,
        };
      case 'classic_parchment':
        return {
          bg: [248, 244, 232] as RGB,
          gold: [160, 100, 30] as RGB,
          lightGold: [80, 50, 20] as RGB,
        };
      case 'royal_navy':
      default:
        return {
          bg: [10, 25, 49] as RGB,
          gold: [218, 165, 32] as RGB,
          lightGold: [255, 235, 175] as RGB,
        };
    }
  };
  const palette = getThemePalette();

  let y = TOP;

  // Fond et cadre d'une page interieure (les textes d'en-tete / pied de page
  // sont ajoutes a la fin, quand le nombre total de pages est connu)
  const drawBackground = () => {
    doc.setFillColor(252, 251, 249);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    doc.setDrawColor(220, 205, 175);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, PAGE_W - 20, PAGE_H - 20);
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 21, PAGE_W - MARGIN, 21);
    doc.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);
  };

  const newPage = () => {
    doc.addPage('a4', 'portrait');
    drawBackground();
    y = TOP;
  };

  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  const wrap = (text: string, style: 'normal' | 'italic' | 'bold', size: number, width: number): string[] => {
    doc.setFont('times', style);
    doc.setFontSize(size);
    return doc.splitTextToSize(text, width) as string[];
  };

  // Raccourcit un texte (avec "...") pour qu'il tienne dans maxW, police courante
  const fitText = (text: string, maxW: number): string => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let s = text;
    while (s.length > 1 && doc.getTextWidth(s + '...') > maxW) s = s.slice(0, -1);
    return s.trimEnd() + '...';
  };

  // Images : proportions respectees, centrees dans la boite
  const prepareImage = async (url: string): Promise<LoadedImage | null> => {
    const data = await loadImageAsBase64(url);
    if (!data) return null;
    try {
      const props = doc.getImageProperties(data);
      return {
        data,
        format: props.fileType || guessImageFormat(data),
        width: props.width,
        height: props.height,
      };
    } catch (err) {
      console.warn('Image illisible, ignoree dans le PDF:', err);
      return null;
    }
  };

  const drawPhoto = (img: LoadedImage, x: number, top: number, boxW: number, boxH: number) => {
    const ratio = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const px = x + (boxW - w) / 2;
    const py = top + (boxH - h) / 2;
    try {
      doc.addImage(img.data, img.format, px, py, w, h, undefined, 'FAST');
      doc.setDrawColor(218, 165, 32);
      doc.setLineWidth(0.4);
      doc.rect(px, py, w, h);
    } catch (err) {
      console.warn('Image render error:', err);
    }
  };

  const loadPhotos = async (entry: GuestEntry, max: number): Promise<LoadedPhoto[]> => {
    const out: LoadedPhoto[] = [];
    const photos: GuestPhoto[] = getEntryPhotos(entry).slice(0, max);
    for (const p of photos) {
      const img = await prepareImage(p.url);
      if (img) out.push({ img, caption: cleanText(p.caption || '') });
    }
    return out;
  };

  // =========================================================================
  // PAGE 1 : COUVERTURE
  // =========================================================================
  onProgress?.(15, 'Composition de la Couverture Royale d’Honneur...');

  const coverImageData = await loadImageAsBase64(resolveAssetUrl('/images/couverture.png'));
  let coverDrawn = false;
  if (coverImageData) {
    try {
      doc.addImage(coverImageData, 'JPEG', 0, 0, PAGE_W, PAGE_H);
      coverDrawn = true;
    } catch (err) {
      console.warn('Cover image render error:', err);
    }
  }
  if (!coverDrawn) {
    doc.setFillColor(...palette.bg);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  }

  doc.setDrawColor(...palette.gold);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, PAGE_W - 24, PAGE_H - 24);
  doc.setLineWidth(0.4);
  doc.rect(15, 15, PAGE_W - 30, PAGE_H - 30);

  const cornerSize = 10;
  doc.setLineWidth(1);
  doc.line(8, 8, 8 + cornerSize, 8);
  doc.line(8, 8, 8, 8 + cornerSize);
  doc.line(PAGE_W - 8 - cornerSize, 8, PAGE_W - 8, 8);
  doc.line(PAGE_W - 8, 8, PAGE_W - 8, 8 + cornerSize);
  doc.line(8, PAGE_H - 8, 8 + cornerSize, PAGE_H - 8);
  doc.line(8, PAGE_H - 8 - cornerSize, 8, PAGE_H - 8);
  doc.line(PAGE_W - 8 - cornerSize, PAGE_H - 8, PAGE_W - 8, PAGE_H - 8);
  doc.line(PAGE_W - 8, PAGE_H - 8 - cornerSize, PAGE_W - 8, PAGE_H - 8);

  doc.setFillColor(218, 165, 32);
  doc.roundedRect(46, 28, 118, 8, 4, 4, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...palette.bg);
  doc.text('HOMMAGE ROYAL BAMOUN', 105, 33.5, { align: 'center' });

  const coverLogo = await loadImageAsBase64(resolveAssetUrl('/images/logo-symbole.svg'));
  if (coverLogo) {
    try {
      doc.addImage(coverLogo, 'PNG', 95, 42, 20, 20);
    } catch (error) {
      console.warn('Could not render cover logo in PDF:', error);
    }
  }

  if (recipient) {
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...palette.gold);
    doc.text(recipient, 105, 112, { align: 'center' });
  }

  // Bandeau sombre translucide derriere le pied de couverture (lisibilite sur l'image)
  try {
    const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState;
    doc.setGState(new GState({ opacity: 0.55 }) as never);
    doc.setFillColor(0, 0, 0);
    doc.roundedRect(30, 245, 150, 20, 3, 3, 'F');
    doc.setGState(new GState({ opacity: 1 }) as never);
  } catch (err) {
    console.warn('Transparence non disponible pour le bandeau de couverture:', err);
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...palette.lightGold);
  doc.text(
    [eventLabel, 'Réalisé par Mohamed Nasser Mounchikpou Njiemessa © 2026'].filter(Boolean).join('  •  '),
    105,
    253,
    { align: 'center' }
  );
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...palette.gold);
  doc.text(`${total} Témoignages et Hommages Réunis`, 105, 260.5, { align: 'center' });

  // =========================================================================
  // PAGE 2 : PREFACE (seule sur sa page)
  // =========================================================================
  onProgress?.(25, 'Composition de la Préface...');
  doc.addPage('a4', 'portrait');
  drawBackground();

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(110, 30, 20);
  doc.text('Préface & Hommage', 105, 54, { align: 'center' });
  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.7);
  doc.line(70, 60, 140, 60);

  let prefaceY = 80;
  const prefaceX = MARGIN + 10;
  const prefaceW = CONTENT_W - 20;
  for (const paragraph of PREFACE_PARAGRAPHS) {
    const lines = wrap(paragraph, 'italic', 12.5, prefaceW);
    doc.setFont('times', 'italic');
    doc.setFontSize(12.5);
    doc.setTextColor(50, 45, 40);
    for (const line of lines) {
      doc.text(line, prefaceX, prefaceY);
      prefaceY += 6.8;
    }
    prefaceY += 6;
  }

  // =========================================================================
  // PAGES 3.. : TABLE DES CONTRIBUTEURS (pages reservees, remplies a la fin)
  // =========================================================================
  onProgress?.(30, 'Préparation de la Table des Contributeurs...');
  const TOC_FIRST_PAGE = 3;
  const tocPages = Math.ceil(total / TOC_PER_PAGE);
  for (let t = 0; t < tocPages; t++) {
    doc.addPage('a4', 'portrait');
    drawBackground();
  }

  // =========================================================================
  // TEMOIGNAGES : mise en page continue, plusieurs temoignages par page
  // =========================================================================
  const tocNames: string[] = [];
  const entryPages: number[] = [];
  const galleryItems: { url: string; author: string }[] = [];

  if (total > 0) newPage();

  for (let i = 0; i < total; i++) {
    const entry = bookEntries[i];
    const name = safeText(`${entry.firstName} ${entry.lastName}`, 'Contributeur');
    tocNames.push(name);

    onProgress?.(
      Math.round(35 + (i / total) * 55),
      `Composition du témoignage ${i + 1} / ${total} : ${name}...`
    );
    if (i % 8 === 7) {
      // laisse respirer le navigateur (barre de progression, page non figee)
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const dateStr = entry.createdAt
      ? new Date(entry.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : eventLabel;

    const message = safeText(entry.message, '[Message dans une écriture non prise en charge par ce document]');
    const anecdote = cleanText(entry.anecdote);
    const wish = cleanText(entry.wish);

    if (includePhotos) {
      for (const p of getEntryPhotos(entry)) {
        galleryItems.push({ url: p.url, author: name });
      }
    }
    const photos = includePhotos ? await loadPhotos(entry, MAX_CARD_PHOTOS) : [];

    // --- mesures -----------------------------------------------------------
    const msgText = `« ${message} »`;
    let msgLines = wrap(msgText, 'italic', MSG_FS, CONTENT_W - 2);
    let useSidePhoto = false;
    if (photos.length === 1) {
      const narrow = wrap(msgText, 'italic', MSG_FS, CONTENT_W - 2 - SIDE_W - SIDE_GAP);
      if (narrow.length <= 26) {
        useSidePhoto = true;
        msgLines = narrow;
      }
    }

    let sideCaptionLines: string[] = [];
    if (useSidePhoto && photos[0].caption) {
      sideCaptionLines = wrap(photos[0].caption, 'italic', 7.5, SIDE_W).slice(0, 2);
    }
    const sidePhotoH = useSidePhoto ? SIDE_PHOTO_H + (sideCaptionLines.length ? sideCaptionLines.length * 3.2 + 1.5 : 0) : 0;

    const anecdoteLines = anecdote ? wrap(anecdote, 'normal', SUB_FS, CONTENT_W - 8) : [];
    const wishLines = wish ? wrap(wish, 'normal', SUB_FS, CONTENT_W - 8) : [];
    const subHeight = (lines: string[]) => (lines.length ? 4.6 + lines.length * SUB_LH + 2.5 : 0);

    const rowPhotos = useSidePhoto ? [] : photos;
    const rowHasCaption = rowPhotos.some((p) => Boolean(p.caption));
    const rowH = rowPhotos.length ? ROW_PHOTO_H + (rowHasCaption ? 4 : 0) + 2 : 0;

    const msgBlockH = Math.max(msgLines.length * MSG_LH, sidePhotoH) + 3;
    const cardH = HEADER_H + 2.5 + msgBlockH + subHeight(anecdoteLines) + subHeight(wishLines) + rowH;

    // --- saut de page si le temoignage ne tient pas dans l'espace restant ---
    const pageRoom = BOTTOM - TOP;
    if (cardH <= pageRoom) {
      if (y + cardH > BOTTOM) newPage();
    } else {
      // Temoignage plus haut qu'une page : on le laisse se couper entre deux lignes,
      // mais l'en-tete reste toujours avec au moins trois lignes de message
      if (y + HEADER_H + 2.5 + Math.min(msgLines.length, 3) * MSG_LH > BOTTOM) newPage();
    }
    entryPages.push(doc.getNumberOfPages());

    // --- bandeau d'en-tete ---------------------------------------------------
    doc.setFillColor(246, 240, 226);
    doc.roundedRect(MARGIN, y, CONTENT_W, HEADER_H, 1.5, 1.5, 'F');
    doc.setFillColor(218, 165, 32);
    doc.rect(MARGIN, y, 1.4, HEADER_H, 'F');

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const dateW = doc.getTextWidth(dateStr);
    let rightEdge = MARGIN + CONTENT_W - 3;
    doc.setTextColor(120, 110, 100);
    doc.text(dateStr, rightEdge, y + 5.9, { align: 'right' });
    rightEdge -= dateW + 3;

    if (entry.isPinned) {
      const label = "MESSAGE D'HONNEUR";
      doc.setFont('times', 'bold');
      doc.setFontSize(6.5);
      const pillW = doc.getTextWidth(label) + 6;
      doc.setFillColor(218, 165, 32);
      doc.roundedRect(rightEdge - pillW, y + 2.2, pillW, 4.6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(label, rightEdge - pillW / 2, y + 5.3, { align: 'center' });
      rightEdge -= pillW + 3;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(30, 25, 20);
    doc.text(fitText(name, rightEdge - (MARGIN + 5)), MARGIN + 5, y + 6.1);
    y += HEADER_H + 2.5;

    // --- message (et photo laterale eventuelle) -------------------------------
    const msgTop = y;
    if (useSidePhoto) {
      const photo = photos[0];
      const px = MARGIN + CONTENT_W - SIDE_W;
      drawPhoto(photo.img, px, msgTop, SIDE_W, SIDE_PHOTO_H);
      if (sideCaptionLines.length) {
        doc.setFont('times', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 90, 80);
        sideCaptionLines.forEach((ln, k) => {
          doc.text(ln, px + SIDE_W / 2, msgTop + SIDE_PHOTO_H + 3.4 + k * 3.2, { align: 'center' });
        });
      }
    }

    doc.setFont('times', 'italic');
    doc.setFontSize(MSG_FS);
    doc.setTextColor(40, 35, 30);
    for (const line of msgLines) {
      if (y + MSG_LH > BOTTOM) {
        newPage();
        doc.setFont('times', 'italic');
        doc.setFontSize(MSG_FS);
        doc.setTextColor(40, 35, 30);
      }
      doc.text(line, MARGIN + 2, y + 3.4);
      y += MSG_LH;
    }
    if (useSidePhoto) y = Math.max(y, msgTop + sidePhotoH);
    y += 3;

    // --- anecdote et voeux ------------------------------------------------------
    const drawSub = (label: string, lines: string[], bar: RGB, labelColor: RGB) => {
      if (!lines.length) return;
      ensure(4.6 + Math.min(lines.length, 2) * SUB_LH);
      let barTop = y;
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...labelColor);
      doc.text(label, MARGIN + 3, y + 3.2);
      y += 4.6;
      doc.setFont('times', 'normal');
      doc.setFontSize(SUB_FS);
      doc.setTextColor(50, 40, 30);
      for (const ln of lines) {
        if (y + SUB_LH > BOTTOM) {
          doc.setFillColor(...bar);
          doc.rect(MARGIN, barTop, 0.9, y - barTop, 'F');
          newPage();
          barTop = y;
          doc.setFont('times', 'normal');
          doc.setFontSize(SUB_FS);
          doc.setTextColor(50, 40, 30);
        }
        doc.text(ln, MARGIN + 3, y + 3.2);
        y += SUB_LH;
      }
      doc.setFillColor(...bar);
      doc.rect(MARGIN, barTop, 0.9, y - barTop, 'F');
      y += 2.5;
    };

    drawSub('SOUVENIR PARTAGÉ / ANECDOTE', anecdoteLines, [225, 170, 60], [140, 85, 10]);
    drawSub('SOUVENIR & VŒUX DE MÉMOIRE', wishLines, [110, 190, 150], [20, 110, 60]);

    // --- photos sous le texte (2 ou 3 photos) ----------------------------------
    if (rowPhotos.length) {
      ensure(rowH);
      const k = rowPhotos.length;
      const gap = 4;
      const boxW = Math.min(58, (CONTENT_W - gap * (k - 1)) / k);
      rowPhotos.forEach((p, idx) => {
        const px = MARGIN + idx * (boxW + gap);
        drawPhoto(p.img, px, y, boxW, ROW_PHOTO_H);
        if (p.caption) {
          doc.setFont('times', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(100, 90, 80);
          doc.text(fitText(p.caption, boxW), px + boxW / 2, y + ROW_PHOTO_H + 3.4, { align: 'center' });
        }
      });
      y += rowH;
    }

    y += CARD_GAP;
  }

  // =========================================================================
  // GALERIE DE CLOTURE + MESSAGE FINAL (uniquement a la fin du livre / dernier tome)
  // =========================================================================
  if (isLastTome && total > 0) {
    if (includePhotos && galleryItems.length > 0) {
      onProgress?.(92, 'Composition de la Galerie de Clôture...');
      const items = galleryItems.slice(0, GALLERY_MAX_PHOTOS);
      const cols = 3;
      const cellW = (CONTENT_W - 8) / cols;
      const cellH = 38;
      const rowStep = cellH + 9;
      const gridStartY = 58;
      const perPage = cols * Math.floor((BOTTOM - gridStartY) / rowStep);

      for (let start = 0; start < items.length; start += perPage) {
        newPage();
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(110, 30, 20);
        doc.text(start === 0 ? 'Instants Précieux & Sourires Partagés' : 'Instants Précieux (suite)', 105, 36, {
          align: 'center',
        });
        doc.setDrawColor(218, 165, 32);
        doc.setLineWidth(0.6);
        doc.line(65, 41, 145, 41);
        if (start === 0) {
          doc.setFont('times', 'italic');
          doc.setFontSize(9.5);
          doc.setTextColor(80, 70, 60);
          doc.text('Mosaïque de souvenirs photographiques partagés par les contributeurs.', 105, 48, {
            align: 'center',
          });
        }

        const chunk = items.slice(start, start + perPage);
        let rowsUsed = 0;
        for (let k = 0; k < chunk.length; k++) {
          const col = k % cols;
          const row = Math.floor(k / cols);
          rowsUsed = row + 1;
          const px = MARGIN + col * (cellW + 4);
          const py = gridStartY + row * rowStep;
          const img = await prepareImage(chunk[k].url);
          if (img) {
            drawPhoto(img, px, py, cellW, cellH);
            doc.setFont('times', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(90, 50, 20);
            doc.text(fitText(chunk[k].author, cellW), px + cellW / 2, py + cellH + 4.5, { align: 'center' });
          }
        }
        y = gridStartY + rowsUsed * rowStep;
      }
    }

    ensure(34);
    y += 4;
    doc.setFillColor(246, 238, 222);
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.8);
    doc.roundedRect(MARGIN, y, CONTENT_W, 28, 4, 4, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(110, 30, 20);
    doc.text('Merci pour tout, Feu Sa Majesté Ibrahim Mbombo Njoya !', 105, y + 9, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 40, 30);
    doc.text(
      '« Que votre mémoire demeure vivante dans nos cœurs, dans nos paroles et dans l’héritage que vous laissez à votre peuple. »',
      105,
      y + 16,
      { align: 'center' }
    );

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 20);
    doc.text(
      '— De la part de son peuple, de ses proches, de ses amis et de ses collaborateurs',
      105,
      y + 22.5,
      { align: 'center' }
    );
  }

  // =========================================================================
  // TABLE DES CONTRIBUTEURS : remplissage avec les vrais numeros de page
  // =========================================================================
  onProgress?.(94, 'Finalisation de la Table des Contributeurs...');
  const colW = (CONTENT_W - 10) / 2;
  let tocIdx = 0;
  for (let t = 0; t < tocPages; t++) {
    doc.setPage(TOC_FIRST_PAGE + t);

    doc.setFont('times', 'bold');
    doc.setFontSize(t === 0 ? 20 : 15);
    doc.setTextColor(110, 30, 20);
    doc.text(t === 0 ? 'Table des Contributeurs' : 'Table des Contributeurs (suite)', 105, 36, {
      align: 'center',
    });
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.6);
    doc.line(70, 41, 140, 41);
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(150, 105, 30);
    doc.text(`${total} hommage${total > 1 ? 's' : ''} réuni${total > 1 ? 's' : ''}`, 105, 47.5, {
      align: 'center',
    });

    for (let r = 0; r < TOC_PER_PAGE && tocIdx < total; r++, tocIdx++) {
      const col = r < TOC_ROWS_PER_COL ? 0 : 1;
      const row = r % TOC_ROWS_PER_COL;
      const itemX = MARGIN + col * (colW + 10);
      const itemY = TOC_START_Y + row * TOC_ROW_H;

      if (row % 2 === 0) {
        doc.setFillColor(245, 240, 230);
        doc.roundedRect(itemX - 1.5, itemY - 3.9, colW + 3, TOC_ROW_H - 0.4, 1.2, 1.2, 'F');
      }

      const pageLabel = `p. ${entryPages[tocIdx]}`;
      doc.setFont('times', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(160, 110, 30);
      const labelW = doc.getTextWidth(pageLabel);
      doc.text(pageLabel, itemX + colW - 0.5, itemY, { align: 'right' });

      doc.setFont('times', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(40, 35, 30);
      const nameShown = fitText(tocNames[tocIdx], colW - labelW - 10);
      doc.text(nameShown, itemX, itemY);

      // points de conduite entre le nom et le numero de page
      const nameW = doc.getTextWidth(nameShown);
      doc.setFont('times', 'normal');
      doc.setTextColor(180, 160, 120);
      const dotW = doc.getTextWidth('.');
      const free = colW - labelW - nameW - 5;
      if (dotW > 0 && free > dotW * 2) {
        doc.text('.'.repeat(Math.floor(free / dotW)), itemX + nameW + 2, itemY);
      }
    }
  }

  // =========================================================================
  // EN-TETES ET PIEDS DE PAGE (numeros "Page X sur Y")
  // =========================================================================
  onProgress?.(97, 'Numérotation des pages...');
  const pageCount = doc.getNumberOfPages();
  const headerLeft = recipient ? `LIVRE D'OR OFFICIEL — ${recipient.toUpperCase()}` : "LIVRE D'OR OFFICIEL";
  const footerLeft = [baseTitle, eventLabel].filter(Boolean).join(' • ');
  for (let p = 2; p <= pageCount; p++) {
    doc.setPage(p);

    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 105, 30);
    doc.text(fitText(headerLeft, 110), MARGIN, 18);

    doc.setFont('times', 'normal');
    doc.setTextColor(130, 120, 110);
    const tomePart = tomeCount > 1 ? `Tome ${tomeIndex}/${tomeCount}  ·  ` : '';
    doc.text(`${tomePart}Page ${p} sur ${pageCount}`, PAGE_W - MARGIN, 18, { align: 'right' });

    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 120, 110);
    if (footerLeft) doc.text(fitText(footerLeft, 85), MARGIN, PAGE_H - 11);
    doc.text('Réalisé par Mohamed Nasser Mounchikpou Njiemessa © 2026', PAGE_W - MARGIN, PAGE_H - 11, {
      align: 'right',
    });
  }

  onProgress?.(98, 'Finalisation et compilation du fichier PDF...');
  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Livre d’Or généré avec succès !');

  return pdfBlob;
}
