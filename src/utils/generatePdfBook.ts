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

function resolveAssetUrl(url: string): string {
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    return new URL(url, window.location.origin).toString();
  }
  return url;
}

// Convert image URL to Base64 safely
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    // If it's already a data URL
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

export async function generateGoldenBookPdf(
  entries: GuestEntry[],
  options: PdfBookOptions
): Promise<Blob> {
  const {
    theme = 'royal_navy',
    bookTitle = "LIVRE D'OR — HOMMAGE À FEU SA MAJESTÉ IBRAHIM MBOMBO NJOYA",
    recipientName = 'Feu Sa Majesté Ibrahim Mbombo Njoya',
    dedicationSubtitle = 'Recueil officiel des témoignages, souvenirs, messages de gratitude et hommages rendus à sa mémoire',
    eventDate = '2026',
    includePhotos = true,
    onProgress,
  } = options;

  onProgress?.(5, 'Initialisation du moteur de composition vectoriel...');

  // 1. Prepare approved entries
  const bookEntries = entries
    .filter((e) => e.isApproved !== false)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  // Calculate photos
  const allPhotos = bookEntries.flatMap((e) =>
    getEntryPhotos(e).map((p) => ({
      ...p,
      author: `${e.firstName} ${e.lastName}`,
    }))
  );

  const totalPages = 2 + bookEntries.length + (includePhotos && allPhotos.length > 0 ? 1 : 0);

  // Initialize jsPDF A4 in Portrait (210 x 297 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Theme color schemes
  const getThemePalette = () => {
    switch (theme) {
      case 'burgundy_gold':
        return {
          bg: [66, 5, 22] as [number, number, number],
          gold: [218, 165, 32] as [number, number, number],
          lightGold: [255, 235, 175] as [number, number, number],
          white: [255, 255, 255] as [number, number, number],
        };
      case 'emerald_prestige':
        return {
          bg: [6, 51, 35] as [number, number, number],
          gold: [218, 165, 32] as [number, number, number],
          lightGold: [210, 245, 225] as [number, number, number],
          white: [255, 255, 255] as [number, number, number],
        };
      case 'classic_parchment':
        return {
          bg: [248, 244, 232] as [number, number, number],
          gold: [160, 100, 30] as [number, number, number],
          lightGold: [80, 50, 20] as [number, number, number],
          white: [30, 25, 20] as [number, number, number],
        };
      case 'royal_navy':
      default:
        return {
          bg: [10, 25, 49] as [number, number, number],
          gold: [218, 165, 32] as [number, number, number],
          lightGold: [255, 235, 175] as [number, number, number],
          white: [255, 255, 255] as [number, number, number],
        };
    }
  };

  const palette = getThemePalette();

  // Helper: Draw Header & Footer for inside pages
  const drawPageFramework = (pageNo: number, total: number) => {
    // Soft Ivory Background
    doc.setFillColor(252, 251, 249);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Thin Outer Frame
    doc.setDrawColor(220, 205, 175);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Running Header
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 105, 30);
    doc.text(`LIVRE D'OR OFFICIEL — ${recipientName.toUpperCase()}`, margin, 18);

    doc.setFont('times', 'normal');
    doc.setTextColor(130, 120, 110);
    doc.text(`Page ${pageNo} sur ${total}`, pageWidth - margin, 18, { align: 'right' });

    // Gold Header Line
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.5);
    doc.line(margin, 21, pageWidth - margin, 21);

    // Gold Footer Line
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

    // Running Footer
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(130, 120, 110);
    doc.text(`${bookTitle} • ${eventDate}`, margin, pageHeight - 11);
    doc.text(`Réalisé par Mohamed Nasser Mounchikpou Njiemessa © 2026`, pageWidth - margin, pageHeight - 11, { align: 'right' });
  };

  // =========================================================================
  // PAGE 1: ROYAL COVER PAGE
  // =========================================================================
  onProgress?.(15, 'Composition de la Couverture Royale d’Honneur...');

  // Cover Background: force the homepage hero image to be used as the real cover.
  // We resolve it to an absolute URL to avoid browser/path mismatches during PDF export.
  const coverImageUrl = resolveAssetUrl('/images/couverture.png');
  const coverImageData = await loadImageAsBase64(coverImageUrl);

  if (coverImageData) {
    doc.addImage(coverImageData, 'JPEG', 0, 0, pageWidth, pageHeight);
  } else {
    doc.setFillColor(...palette.bg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Outer Gold Border
  doc.setDrawColor(...palette.gold);
  doc.setLineWidth(1.2);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Inner Double Gold Border
  doc.setDrawColor(...palette.gold);
  doc.setLineWidth(0.4);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

  // Corner Gold Accents
  const cornerSize = 10;
  doc.setLineWidth(1);
  // Top Left
  doc.line(8, 8, 8 + cornerSize, 8);
  doc.line(8, 8, 8, 8 + cornerSize);
  // Top Right
  doc.line(pageWidth - 8 - cornerSize, 8, pageWidth - 8, 8);
  doc.line(pageWidth - 8, 8, pageWidth - 8, 8 + cornerSize);
  // Bottom Left
  doc.line(8, pageHeight - 8, 8 + cornerSize, pageHeight - 8);
  doc.line(8, pageHeight - 8 - cornerSize, 8, pageHeight - 8);
  // Bottom Right
  doc.line(pageWidth - 8 - cornerSize, pageHeight - 8, pageWidth - 8, pageHeight - 8);
  doc.line(pageWidth - 8, pageHeight - 8 - cornerSize, pageWidth - 8, pageHeight - 8);

  // Compact royal badge line
  doc.setFillColor(218, 165, 32);
  doc.roundedRect(46, 28, 118, 8, 4, 4, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...palette.bg);
  doc.text('HOMMAGE ROYAL BAMOUN', 105, 33.5, { align: 'center' });

  // Royal logo badge on cover
  const coverLogo = await loadImageAsBase64(resolveAssetUrl('/images/logo-symbole.svg'));
  if (coverLogo) {
    try {
      const logoSize = 20;
      doc.addImage(coverLogo, 'PNG', 95, 42, logoSize, logoSize);
    } catch (error) {
      console.warn('Could not render cover logo in PDF:', error);
    }
  }

  // Minimal cover without redundant title block
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...palette.gold);
  doc.text(recipientName, 105, 112, { align: 'center' });

  // Cover Footer
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...palette.lightGold);
  doc.text(`${eventDate}  •  Réalisé par Mohamed Nasser Mounchikpou Njiemessa © 2026`, 105, 252, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...palette.gold);
  doc.text(`${bookEntries.length} Témoignages et Hommages Réunis`, 105, 260, { align: 'center' });

  // =========================================================================
  // PAGE 2: PREFACE & TABLE OF CONTRIBUTORS
  // =========================================================================
  onProgress?.(30, 'Composition de la Préface & Table des Contributeurs...');
  doc.addPage('a4', 'portrait');
  drawPageFramework(2, totalPages);

  // Section Title: Preface
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(110, 30, 20);
  doc.text('Préface & Hommage', 105, 36, { align: 'center' });

  doc.setDrawColor(218, 165, 32);
  doc.setLineWidth(0.6);
  doc.line(75, 41, 135, 41);

  // Preface Body
  doc.setFont('times', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(50, 45, 40);
  const prefaceText =
    "« Le 27 septembre 2021, le royaume bamoun et le Cameroun perdaient Sa Majesté le Sultan-Roi Ibrahim Mbombo Njoya, 19e souverain de la dynastie fondée par Nchare Yen. Intronisé le 10 août 1992, il a porté pendant près de trente ans l'héritage d'un des plus anciens et des plus prestigieux royaumes du pays. Gardien des traditions et de la mémoire de Foumban, il a servi son peuple avec dignité, sagesse et dévouement. \n\nCe livre d'or rassemble les mots sincères, les souvenirs et les prières de celles et ceux qui l'ont connu, admiré ou simplement respecté. Il est offert en témoignage de notre gratitude, afin que son nom, son œuvre et son exemple demeurent vivants dans nos cœurs et dans ceux des générations à venir. \n\nQue son âme repose en paix. »";
  const prefaceLines = doc.splitTextToSize(prefaceText, contentWidth - 10);
  doc.text(prefaceLines, margin + 5, 50);

  // Table of Contributors Header
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(110, 30, 20);
  doc.text('Table des Contributeurs', margin, 85);

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(150, 105, 30);
  doc.text(`(${bookEntries.length} hommages)`, margin + 58, 85);

  doc.setDrawColor(200, 185, 155);
  doc.setLineWidth(0.4);
  doc.line(margin, 88, pageWidth - margin, 88);

  // Contributors Grid (2 columns)
  const colWidth = (contentWidth - 10) / 2;
  const startY = 96;
  const rowHeight = 7;
  const maxRowsPerCol = 22;

  bookEntries.forEach((entry, idx) => {
    const col = idx < maxRowsPerCol ? 0 : 1;
    const row = idx % maxRowsPerCol;
    const itemX = margin + col * (colWidth + 10);
    const itemY = startY + row * rowHeight;

    if (itemY < pageHeight - 25) {
      // Background row striping
      if (idx % 2 === 0) {
        doc.setFillColor(245, 240, 230);
        doc.roundedRect(itemX - 2, itemY - 4.5, colWidth + 4, 6, 1.5, 1.5, 'F');
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40, 35, 30);
      const authorName = `${entry.firstName} ${entry.lastName}`;
      doc.text(authorName, itemX, itemY);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(160, 110, 30);
      doc.text(`p. ${idx + 3}`, itemX + colWidth - 2, itemY, { align: 'right' });
    }
  });

  // =========================================================================
  // PAGES 3..(N+2): INDIVIDUAL TESTIMONIAL PAGES (100% FULL FIDELITY)
  // =========================================================================
  for (let i = 0; i < bookEntries.length; i++) {
    const entry = bookEntries[i];
    const pageNo = i + 3;
    const progressPercent = Math.round(35 + (i / bookEntries.length) * 55);
    onProgress?.(
      progressPercent,
      `Composition du témoignage ${i + 1} / ${bookEntries.length} : ${entry.firstName} ${entry.lastName}...`
    );

    doc.addPage('a4', 'portrait');
    drawPageFramework(pageNo, totalPages);

    let currentY = 28;

    // 1. Author Banner Box
    doc.setFillColor(246, 240, 226);
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, currentY, contentWidth, 18, 3, 3, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 105, 30);
    doc.text("HOMMAGE & TÉMOIGNAGE DE", margin + 5, currentY + 6);

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 25, 20);
    doc.text(`${entry.firstName} ${entry.lastName}`, margin + 5, currentY + 13.5);

    // Date & Honor Badge
    const formattedDate = entry.createdAt
      ? new Date(entry.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : eventDate;

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 110, 100);
    doc.text(formattedDate, pageWidth - margin - 5, currentY + 13.5, { align: 'right' });

    if (entry.isPinned) {
      doc.setFillColor(218, 165, 32);
      doc.roundedRect(pageWidth - margin - 42, currentY + 3.5, 37, 5, 2, 2, 'F');
      doc.setFont('times', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("★  MESSAGE D'HONNEUR", pageWidth - margin - 23.5, currentY + 7.2, { align: 'center' });
    }

    currentY += 24;

    // 2. Main Message Box (Pure Vector & Full Text Wrapped)
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(140, 95, 20);
    doc.text('Message personnel :', margin, currentY);
    currentY += 5;

    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 35, 30);
    const messageLines = doc.splitTextToSize(`« ${entry.message} »`, contentWidth);
    doc.text(messageLines, margin, currentY);
    currentY += messageLines.length * 5.2 + 4;

    // 3. Optional Anecdote Box
    if (entry.anecdote && currentY < 210) {
      doc.setFillColor(252, 248, 238);
      doc.setDrawColor(225, 195, 120);
      doc.setLineWidth(0.4);
      const anecdoteLines = doc.splitTextToSize(entry.anecdote, contentWidth - 10);
      const boxHeight = 10 + anecdoteLines.length * 4.8;

      doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2.5, 2.5, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(140, 85, 10);
      doc.text('✦ Souvenir partagé / Anecdote complice :', margin + 5, currentY + 6);

      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50, 40, 30);
      doc.text(anecdoteLines, margin + 5, currentY + 12);

      currentY += boxHeight + 4;
    }

    // 4. Optional Retirement Wish Box
    if (entry.wish && currentY < 235) {
      doc.setFillColor(240, 249, 243);
      doc.setDrawColor(130, 200, 160);
      doc.setLineWidth(0.4);
      const wishLines = doc.splitTextToSize(entry.wish, contentWidth - 10);
      const boxHeight = 10 + wishLines.length * 4.8;

      doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2.5, 2.5, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 110, 60);
      doc.text('❤ Souvenir & vœux de mémoire :', margin + 5, currentY + 6);

      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 50, 40);
      doc.text(wishLines, margin + 5, currentY + 12);

      currentY += boxHeight + 5;
    }

    // 5. Attached Photos Section (Embedded high-res)
    const photos = getEntryPhotos(entry);
    if (includePhotos && photos.length > 0 && currentY < 240) {
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(140, 95, 20);
      doc.text(`📷 Photos souvenirs jointes (${photos.length}) :`, margin, currentY);
      currentY += 4;

      const remainingHeight = pageHeight - currentY - 22;
      const photoHeight = Math.min(38, Math.max(25, remainingHeight));

      if (photos.length === 1) {
        const photo = photos[0];
        const photoWidth = 65;
        const base64 = await loadImageAsBase64(photo.url);
        if (base64) {
          try {
            doc.setDrawColor(218, 165, 32);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, currentY, photoWidth, photoHeight, 2, 2);
            doc.addImage(base64, 'JPEG', margin + 0.5, currentY + 0.5, photoWidth - 1, photoHeight - 1);

            if (photo.caption) {
              doc.setFont('times', 'italic');
              doc.setFontSize(7.5);
              doc.setTextColor(100, 90, 80);
              doc.text(`📷 ${photo.caption}`, margin + photoWidth + 5, currentY + photoHeight / 2);
            }
          } catch (e) {
            console.warn('Image render error:', e);
          }
        }
      } else {
        // Multiple photos side by side
        const photoWidth = (contentWidth - (photos.length - 1) * 4) / Math.min(photos.length, 3);
        for (let pIdx = 0; pIdx < Math.min(photos.length, 3); pIdx++) {
          const photo = photos[pIdx];
          const posX = margin + pIdx * (photoWidth + 4);
          const base64 = await loadImageAsBase64(photo.url);
          if (base64) {
            try {
              doc.setDrawColor(218, 165, 32);
              doc.setLineWidth(0.4);
              doc.roundedRect(posX, currentY, photoWidth, photoHeight, 2, 2);
              doc.addImage(base64, 'JPEG', posX + 0.5, currentY + 0.5, photoWidth - 1, photoHeight - 1);
            } catch (e) {
              console.warn('Image render error:', e);
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // PAGE (N+3): CLOSING PHOTO MOSAIC & FAREWELL BANNER
  // =========================================================================
  if (includePhotos && allPhotos.length > 0) {
    onProgress?.(92, 'Composition de la Galerie Mosaïque de Clôture...');
    doc.addPage('a4', 'portrait');
    drawPageFramework(totalPages, totalPages);

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(110, 30, 20);
    doc.text('Instants Précieux & Sourires Partagés', 105, 36, { align: 'center' });

    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.6);
    doc.line(65, 41, 145, 41);

    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 70, 60);
    doc.text(
      'Mosaïque de souvenirs photographiques immortalisés par l’ensemble de vos collègues.',
      105,
      48,
      { align: 'center' }
    );

    // Draw 3x3 Photo Grid
    const gridCols = 3;
    const gridRows = 3;
    const gridStartX = margin;
    const gridStartY = 56;
    const cellWidth = (contentWidth - 8) / 3;
    const cellHeight = 36;

    const photosToDraw = allPhotos.slice(0, gridCols * gridRows);

    for (let pIdx = 0; pIdx < photosToDraw.length; pIdx++) {
      const p = photosToDraw[pIdx];
      const col = pIdx % gridCols;
      const row = Math.floor(pIdx / gridCols);
      const posX = gridStartX + col * (cellWidth + 4);
      const posY = gridStartY + row * (cellHeight + 10);

      const base64 = await loadImageAsBase64(p.url);
      if (base64) {
        try {
          doc.setDrawColor(218, 165, 32);
          doc.setLineWidth(0.4);
          doc.roundedRect(posX, posY, cellWidth, cellHeight, 2, 2);
          doc.addImage(base64, 'JPEG', posX + 0.5, posY + 0.5, cellWidth - 1, cellHeight - 1);

          doc.setFont('times', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(90, 50, 20);
          doc.text(p.author, posX + cellWidth / 2, posY + cellHeight + 4.5, { align: 'center' });
        } catch (e) {
          console.warn('Mosaic image error:', e);
        }
      }
    }

    // Final Farewell Banner Box
    const bannerY = gridStartY + gridRows * (cellHeight + 10) + 4;
    doc.setFillColor(246, 238, 222);
    doc.setDrawColor(218, 165, 32);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, bannerY, contentWidth, 28, 4, 4, 'FD');

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(110, 30, 20);
    doc.text('Merci pour tout, Feu Sa Majesté Ibrahim Mbombo Njoya !', 105, bannerY + 9, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 40, 30);
    doc.text(
      '« Que votre mémoire demeure vivante dans nos cœurs, dans nos paroles et dans l’héritage que vous laissez à votre peuple. »',
      105,
      bannerY + 16,
      { align: 'center' }
    );

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 100, 20);
    doc.text(
      '— De la part de son peuple, de ses proches, de ses amis et de ses collaborateurs',
      105,
      bannerY + 22.5,
      { align: 'center' }
    );
  }

  onProgress?.(98, 'Finalisation et compilation du fichier PDF...');
  const pdfBlob = doc.output('blob');
  onProgress?.(100, 'Livre d’Or généré avec succès !');

  return pdfBlob;
}
