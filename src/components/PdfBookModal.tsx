import React, { useState, useRef } from 'react';
import { GuestEntry, getEntryPhotos, GuestPhoto } from '../types';
import { generateGoldenBookPdf } from '../utils/generatePdfBook';
import {
  X,
  Printer,
  Download,
  BookOpen,
  Award,
  Sparkles,
  Heart,
  Calendar,
  Image as ImageIcon,
  Quote,
  Loader2,
  CheckCircle2,
  Star,
  Users,
  Layers,
  Palette,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PdfBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: GuestEntry[];
}

type CoverTheme = 'royal_navy' | 'burgundy_gold' | 'classic_parchment' | 'emerald_prestige';

export const PdfBookModal: React.FC<PdfBookModalProps> = ({ isOpen, onClose, entries }) => {
  const [coverTheme, setCoverTheme] = useState<CoverTheme>('royal_navy');
  const [bookTitle, setBookTitle] = useState("LIVRE D'OR — HOMMAGE À FEU SA MAJESTÉ IBRAHIM MBOMBO NJOYA");
  const [recipientName, setRecipientName] = useState('Feu Sa Majesté Ibrahim Mbombo Njoya');
  const [dedicationSubtitle, setDedicationSubtitle] = useState(
    'Recueil officiel des témoignages, souvenirs, messages de gratitude et hommages rendus à sa mémoire'
  );
  const [eventDate, setEventDate] = useState('2026');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  const bookPrintRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Filter approved entries and sort (pinned first, then chronological)
  const bookEntries = entries
    .filter((e) => e.isApproved !== false)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  // Calculate total photos
  const allPhotosList = bookEntries.flatMap((e) =>
    getEntryPhotos(e).map((p) => ({
      ...p,
      author: `${e.firstName} ${e.lastName}`,
    }))
  );
  const totalPhotosCount = allPhotosList.length;

  // Page structure calculation:
  // Page 1: Deluxe Cover
  // Page 2: Title & Preface & Table of Contributors
  // Pages 3..(N+2): Individual Testimonial Pages (1 complete testimonial per page in full fidelity)
  // Page (N+3): Grand Closing Gallery & Farewell Message
  const totalBookPages = 2 + bookEntries.length + (totalPhotosCount > 0 ? 1 : 0);

  // Guaranteed High-Definition Vector PDF Generation via jsPDF Native Engine
  // Generation par tomes : chaque tome charge ses temoignages par lots, puis produit son propre PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setGenerationProgress(2);
    setGenerationStatus('Préparation du livre...');

    const BATCH = 50; // temoignages par requete (le serveur accepte jusqu'a 200)
    const TOME = 150; // temoignages par tome (environ 153 pages)
    const adminToken = localStorage.getItem('jean_michel_admin_token');

    try {
      if (!adminToken) throw new Error('Session administrateur introuvable : reconnectez-vous.');
      const authHeaders = { Authorization: `Bearer ${adminToken}` };

      const fetchBatch = async (page: number): Promise<{ items: GuestEntry[]; total: number }> => {
        const res = await fetch(`/api/admin/entries?book=1&page=${page}&limit=${BATCH}`, { headers: authHeaders });
        if (!res.ok) throw new Error(`Chargement des témoignages impossible (HTTP ${res.status})`);
        const payload = await res.json();
        return {
          items: Array.isArray(payload?.items) ? payload.items : [],
          total: Number(payload?.total) || 0,
        };
      };

      const first = await fetchBatch(1);
      const total = first.total;
      if (total === 0) throw new Error('Aucun témoignage approuvé à publier.');
      const tomeCount = Math.ceil(total / TOME);
      const batchesPerTome = TOME / BATCH;

      for (let t = 0; t < tomeCount; t++) {
        const tomeEntries: GuestEntry[] = [];
        setGenerationProgress(Math.round((t / tomeCount) * 100));
        setGenerationStatus(`Tome ${t + 1}/${tomeCount} : chargement des témoignages...`);
        for (let b = 0; b < batchesPerTome; b++) {
          const page = t * batchesPerTome + b + 1;
          if ((page - 1) * BATCH >= total) break;
          const batch = page === 1 ? first : await fetchBatch(page);
          tomeEntries.push(...batch.items);
        }

        const tomeLabel = tomeCount > 1 ? ` — TOME ${t + 1} / ${tomeCount}` : '';
        const pdfBlob = await generateGoldenBookPdf(tomeEntries, {
          theme: coverTheme,
          bookTitle: bookTitle + tomeLabel,
          recipientName: recipientName,
          dedicationSubtitle: dedicationSubtitle,
          eventDate: eventDate,
          includePhotos: true,
          onProgress: (progress, status) => {
            setGenerationProgress(Math.round(((t + progress / 100) / tomeCount) * 100));
            setGenerationStatus(`Tome ${t + 1}/${tomeCount} : ${status}`);
          },
        });

        const cleanName = recipientName.replace(/[^a-zA-Z0-9]/g, '_');
        const suffix = tomeCount > 1 ? `_Tome_${String(t + 1).padStart(2, '0')}_sur_${tomeCount}` : '';
        const fileName = `Livre_d_Or_${cleanName}${suffix}_2026.pdf`;

        const blobUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = fileName;
        downloadLink.target = '_blank';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        setTimeout(() => {
          if (document.body.contains(downloadLink)) {
            document.body.removeChild(downloadLink);
          }
          URL.revokeObjectURL(blobUrl);
        }, 4000);

        // Laisse le navigateur enregistrer le fichier avant de composer le tome suivant
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setGenerationProgress(100);
      setGenerationStatus(
        tomeCount > 1
          ? `Livre d’Or téléchargé en ${tomeCount} tomes (${total} témoignages).`
          : 'Livre d’Or téléchargé avec succès !'
      );
      setTimeout(() => {
        setIsGeneratingPdf(false);
      }, 1500);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      const detail = err instanceof Error ? err.message : '';
      alert(`La génération du PDF a échoué. ${detail}`.trim());
      setIsGeneratingPdf(false);
    }
  };

  // Direct browser print (uses CSS @media print with page breaks)
  const handlePrint = () => {
    window.print();
  };

  // Export standalone HTML book for instant offline opening and printing
  const handleExportHtmlBook = () => {
    if (!bookPrintRef.current) return;
    const content = bookPrintRef.current.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${bookTitle} - ${recipientName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; background: #f5f5f4; font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
    .pdf-render-page { page-break-after: always; break-after: page; min-height: 297mm; max-width: 210mm; margin: 20px auto; }
    @media print {
      body { background: #ffffff !important; }
      .pdf-render-page { margin: 0 !important; box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body>
  <div style="max-width: 210mm; margin: 0 auto; padding: 20px;">
    ${content}
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 800); };
  </script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `Livre_d_Or_${recipientName.replace(/[^a-zA-Z0-9]/g, '_')}_Document_Complet.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    }, 3000);
  };

  // Cover Style Themes
  const getCoverStyles = () => {
    switch (coverTheme) {
      case 'burgundy_gold':
        return {
          bg: 'bg-gradient-to-br from-[#420516] via-[#28030d] to-[#120005]',
          border: 'border-amber-400',
          innerBorder: 'border-amber-400/50',
          titleColor: 'text-amber-200',
          accentColor: 'text-amber-300',
          subtitleColor: 'text-amber-100/90',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
        };
      case 'emerald_prestige':
        return {
          bg: 'bg-gradient-to-br from-[#063323] via-[#032016] to-[#01100b]',
          border: 'border-emerald-400',
          innerBorder: 'border-amber-400/50',
          titleColor: 'text-emerald-200',
          accentColor: 'text-amber-300',
          subtitleColor: 'text-emerald-100/90',
          badgeBg: 'bg-emerald-500/20 text-amber-300 border-amber-400/40',
        };
      case 'classic_parchment':
        return {
          bg: 'bg-gradient-to-br from-[#fbf8f0] via-[#f3edd9] to-[#e6dbc2]',
          border: 'border-amber-800',
          innerBorder: 'border-amber-700/40',
          titleColor: 'text-stone-950',
          accentColor: 'text-amber-900',
          subtitleColor: 'text-stone-800',
          badgeBg: 'bg-amber-800/15 text-amber-950 border-amber-800/40',
        };
      case 'royal_navy':
      default:
        return {
          bg: 'bg-gradient-to-br from-[#0a1931] via-[#061021] to-[#02060d]',
          border: 'border-amber-400',
          innerBorder: 'border-amber-400/50',
          titleColor: 'text-amber-200',
          accentColor: 'text-amber-300',
          subtitleColor: 'text-amber-100/90',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
        };
    }
  };

  const coverStyle = getCoverStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/90 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-6xl h-[94vh] bg-stone-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-stone-100">
        {/* TOP BAR */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 border-b border-amber-600/30 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg sm:text-xl text-amber-100">
                  Livre d'Or Professionnel (Export PDF & Impression)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                  {bookEntries.length} Témoignages Intégraux
                </span>
              </div>
              <p className="text-xs text-amber-200/70 hidden sm:block">
                Édition complète haute définition avec couverture d'honneur, table des contributeurs et fiches paginées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-900/40 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              title="Générer et télécharger le livre en fichier .PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Télécharger PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 border border-amber-500/30 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
              title="Imprimer ou enregistrer au format PDF avec la boîte de dialogue native du navigateur"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimer / Enregistrer PDF</span>
            </button>

            <button
              onClick={handleExportHtmlBook}
              disabled={isGeneratingPdf}
              className="hidden lg:flex px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 font-medium text-xs items-center gap-1.5 transition-colors cursor-pointer"
              title="Télécharger l'ouvrage au format document autonome (.html)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Fichier HTML</span>
            </button>

            <button
              onClick={onClose}
              disabled={isGeneratingPdf}
              className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROGRESS BANNER */}
        {isGeneratingPdf && (
          <div className="bg-amber-950/90 border-b border-amber-500/30 px-6 py-3 shrink-0 flex items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-amber-200">{generationStatus}</p>
                <p className="text-[11px] text-amber-300/70">
                  Veuillez patienter pendant la composition et le rendu haute définition...
                </p>
              </div>
            </div>
            <div className="w-36 sm:w-56 bg-stone-800 rounded-full h-2.5 overflow-hidden border border-amber-500/40 shrink-0">
              <div
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* WORKSPACE */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* CUSTOMIZATION SIDEBAR */}
          <div className="w-full md:w-80 bg-stone-950/95 border-b md:border-b-0 md:border-r border-amber-900/30 p-4 sm:p-5 overflow-y-auto space-y-5 shrink-0 text-xs sm:text-sm no-print">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Style de Couverture
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCoverTheme('royal_navy')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    coverTheme === 'royal_navy'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="w-full h-4 rounded-md bg-[#0a1931] border border-amber-400/40 mb-1" />
                  <span className="text-[11px] block">Bleu Nuit & Or</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverTheme('burgundy_gold')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    coverTheme === 'burgundy_gold'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="w-full h-4 rounded-md bg-[#420516] border border-amber-400/40 mb-1" />
                  <span className="text-[11px] block">Bordeaux Royal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverTheme('emerald_prestige')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    coverTheme === 'emerald_prestige'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="w-full h-4 rounded-md bg-[#063323] border border-emerald-400/40 mb-1" />
                  <span className="text-[11px] block">Émeraude & Or</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverTheme('classic_parchment')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    coverTheme === 'classic_parchment'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-bold shadow-sm'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="w-full h-4 rounded-md bg-[#fbf8f0] border border-stone-400 mb-1" />
                  <span className="text-[11px] block">Parchemin Noble</span>
                </button>
              </div>
            </div>

            {/* Book Info Customization */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Titre du Recueil
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-100 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Nom mis à l'honneur
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-100 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Sous-titre / Dédicace
                </label>
                <textarea
                  rows={2}
                  value={dedicationSubtitle}
                  onChange={(e) => setDedicationSubtitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-100 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Date de l'hommage
                </label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-amber-100 text-xs focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-stone-900 border-stone-700"
                />
                <span className="text-xs text-stone-200">
                  Inclure les photos souvenirs jointes ({totalPhotosCount})
                </span>
              </label>
            </div>

            {/* Specifications summary */}
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <p className="font-serif font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                <Award className="w-4 h-4" /> Édition Professionnelle
              </p>
              <div className="space-y-1 text-[11px] text-stone-300">
                <p>✓ 100% des témoignages inclus dans leur intégralité</p>
                <p>✓ Mise en page soignée avec lettrines & citations</p>
                <p>✓ {includePhotos ? totalPhotosCount : 0} photos intégrées</p>
                <p>✓ {totalBookPages} pages format A4 prêtes à l'impression</p>
              </div>
            </div>
          </div>

          {/* SCROLLABLE LIVE BOOK PREVIEW */}
          <div className="flex-1 bg-stone-950/70 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
            <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between text-xs text-stone-400 no-print">
              <span className="font-medium text-amber-300">
                Aperçu exact du Livre d'Or (Format A4 - 210 x 297 mm)
              </span>
              <span>{totalBookPages} pages générées</span>
            </div>

            {/* COMPLETE BOOK CONTAINER FOR DIRECT PRINTING & PDF EXPORT */}
            <div
              ref={bookPrintRef}
              id="printable-book-container"
              className="w-full max-w-[210mm] space-y-8 print:space-y-0"
            >
              {/* ========================================================================= */}
              {/* PAGE 1 : COUVERTURE ROYALE D'HONNEUR (ROYAL COVER PAGE) */}
              {/* ========================================================================= */}
              <div
                className="pdf-render-page print-cover-page relative w-full aspect-[1/1.414] min-h-[297mm] overflow-hidden rounded-2xl print:rounded-none shadow-2xl"
                style={{
                  backgroundImage: "url('/images/couverture.png')",
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />

              {/* ========================================================================= */}
              {/* PAGE 2 : SOMMAIRE & PRÉFACE (PREFACE & CONTRIBUTORS INDEX) */}
              {/* ========================================================================= */}
              <div className="pdf-render-page print-page relative w-full aspect-[1/1.414] min-h-[297mm] bg-[#fcfbfa] text-stone-900 p-8 sm:p-14 flex flex-col justify-between rounded-2xl print:rounded-none shadow-2xl border border-stone-300">
                <div>
                  {/* Running Header */}
                  <div className="flex items-center justify-between pb-4 border-b-2 border-amber-600/30 mb-8">
                    <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-amber-900 font-bold">
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      <span>Livre d'Or Officiel — {recipientName}</span>
                    </div>
                    <span className="text-xs font-serif text-stone-500 font-medium">Page 2</span>
                  </div>

                  {/* Preface */}
                  <div className="mb-10 text-center max-w-xl mx-auto space-y-4">
                    <h3 className="font-serif font-bold text-2xl sm:text-3xl text-amber-950">
                      Préface & Hommage
                    </h3>
                    <div className="w-20 h-0.5 bg-amber-600 mx-auto" />
                    <p className="text-sm sm:text-base leading-relaxed text-stone-800 italic font-serif text-left">
                      « Le 27 septembre 2021, le royaume bamoun et le Cameroun perdaient Sa Majesté le
                      Sultan-Roi Ibrahim Mbombo Njoya, 19e souverain de la dynastie fondée par Nchare Yen.
                      Intronisé le 10 août 1992, il a porté pendant près de trente ans l'héritage d'un des
                      plus anciens et des plus prestigieux royaumes du pays. Gardien des traditions et de la
                      mémoire de Foumban, il a servi son peuple avec dignité, sagesse et dévouement.
                      {'\n'}{'\n'}
                      Ce livre d'or rassemble les mots sincères, les souvenirs et les prières de celles et
                      ceux qui l'ont connu, admiré ou simplement respecté. Il est offert en témoignage de
                      notre gratitude, afin que son nom, son œuvre et son exemple demeurent vivants dans nos
                      cœurs et dans ceux des générations à venir.
                      {'\n'}{'\n'}
                      Que son âme repose en paix. »
                    </p>
                  </div>

                  {/* Table of contributors */}
                  <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-300">
                      <h4 className="font-serif font-bold text-sm sm:text-base text-stone-950 uppercase tracking-wider">
                        Table des Contributeurs
                      </h4>
                      <span className="text-xs font-serif text-amber-800 font-semibold">
                        {bookEntries.length} Témoignages
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {bookEntries.map((entry, idx) => (
                        <div
                          key={entry.id || idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200/60"
                        >
                          <span className="font-semibold text-stone-950 truncate pr-2">
                            {entry.firstName} {entry.lastName}
                          </span>
                          <span className="text-amber-800 font-serif font-bold shrink-0">
                            p. {idx + 3}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500 font-serif">
                  <span>{bookTitle} • {eventDate}</span>
                  <span>Recueil Complet</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* PAGES 3+ : FICHES DES TÉMOIGNAGES (1 PAGE PAR TÉMOIGNAGE EN INTÉGRALITÉ) */}
              {/* ========================================================================= */}
              {bookEntries.map((entry, idx) => {
                const photos = getEntryPhotos(entry);
                const pageNumber = idx + 3;
                const formattedDate = entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : eventDate;

                return (
                  <div
                    key={entry.id || idx}
                    className="pdf-render-page print-page relative w-full aspect-[1/1.414] min-h-[297mm] bg-[#fcfbfa] text-stone-900 p-8 sm:p-12 flex flex-col justify-between rounded-2xl print:rounded-none shadow-2xl border border-stone-300"
                  >
                    <div>
                      {/* Running Header */}
                      <div className="flex items-center justify-between pb-3 border-b-2 border-amber-600/30 mb-6">
                        <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-amber-900 font-bold">
                          <Award className="w-4 h-4 text-amber-700" />
                          <span>Livre d'Or — {recipientName}</span>
                        </div>
                        <span className="text-xs font-serif font-bold text-amber-950 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full">
                          Page {pageNumber} sur {totalBookPages}
                        </span>
                      </div>

                      {/* Author Header Banner */}
                      <div className="bg-gradient-to-r from-amber-100/90 via-stone-100 to-amber-50 p-5 rounded-2xl border border-amber-300 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-800">
                            Hommage & Témoignage officiel
                          </p>
                          <h3 className="font-serif font-black text-2xl sm:text-3xl text-stone-950">
                            {entry.firstName} {entry.lastName}
                          </h3>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {entry.isPinned && (
                            <span className="px-3 py-1 bg-amber-500 text-stone-950 text-xs font-bold rounded-full shadow-sm">
                              ★ Message d'Honneur
                            </span>
                          )}
                          <span className="text-xs text-stone-500 font-serif">
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      {/* Full Message Section */}
                      <div className="relative bg-white p-6 rounded-2xl border border-stone-300 shadow-sm mb-5">
                        <Quote className="w-10 h-10 text-amber-500/20 absolute top-3 left-3 pointer-events-none" />
                        <div className="pl-4">
                          <p className="text-xs uppercase tracking-wider font-bold text-amber-900 mb-2">
                            Message personnel :
                          </p>
                          <p className="text-stone-900 text-sm sm:text-base leading-relaxed whitespace-pre-line font-serif italic">
                            « {entry.message} »
                          </p>
                        </div>
                      </div>

                      {/* Optional Anecdote Section */}
                      {entry.anecdote && (
                        <div className="bg-amber-50/80 border border-amber-300 p-4 rounded-xl mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            Souvenir partagé / Anecdote complice
                          </p>
                          <p className="text-xs sm:text-sm text-stone-800 leading-relaxed italic">
                            {entry.anecdote}
                          </p>
                        </div>
                      )}

                      {/* Optional Retirement Wish Section */}
                      {entry.wish && (
                        <div className="bg-emerald-50/80 border border-emerald-300 p-4 rounded-xl mb-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-1.5 flex items-center gap-1.5">
                            <Heart className="w-4 h-4 text-emerald-600" />
                            Souvenir & vœux de mémoire
                          </p>
                          <p className="text-xs sm:text-sm text-stone-800 leading-relaxed italic">
                            {entry.wish}
                          </p>
                        </div>
                      )}

                      {/* Full Photos Section (All attached photos rendered in full fidelity) */}
                      {includePhotos && photos.length > 0 && (
                        <div className="mt-4 pt-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-amber-600" />
                            Photos souvenirs jointes ({photos.length})
                          </p>
                          <div
                            className={`grid gap-3 ${
                              photos.length === 1
                                ? 'grid-cols-1 max-w-sm'
                                : photos.length === 2
                                ? 'grid-cols-2 max-w-lg'
                                : 'grid-cols-3 max-w-xl'
                            }`}
                          >
                            {photos.map((photo, pIdx) => (
                              <div
                                key={photo.id || pIdx}
                                className="rounded-xl overflow-hidden border border-amber-300 bg-stone-100 shadow-sm flex flex-col justify-between"
                              >
                                <img
                                  src={photo.url}
                                  alt={photo.caption || `Photo souvenir ${pIdx + 1}`}
                                  className="w-full h-36 object-cover"
                                />
                                {photo.caption && (
                                  <p className="text-[10px] text-stone-700 p-1.5 bg-amber-50/90 text-center italic truncate">
                                    📷 {photo.caption}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Page Footer */}
                    <div className="pt-4 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500 font-serif">
                      <span>Livre d'Or — {recipientName}</span>
                      <span>Page {pageNumber}</span>
                    </div>
                  </div>
                );
              })}

              {/* ========================================================================= */}
              {/* DERNIÈRE PAGE : CLÔTURE & GALERIE FINALE DES SOUVENIRS */}
              {/* ========================================================================= */}
              {totalPhotosCount > 0 && includePhotos && (
                <div className="pdf-render-page print-page relative w-full aspect-[1/1.414] min-h-[297mm] bg-[#fcfbfa] text-stone-900 p-8 sm:p-14 flex flex-col justify-between rounded-2xl print:rounded-none shadow-2xl border border-stone-300">
                  <div>
                    {/* Running Header */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-amber-600/30 mb-6">
                      <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-amber-900 font-bold">
                        <ImageIcon className="w-4 h-4 text-amber-700" />
                        <span>Mosaïque Finale des Souvenirs</span>
                      </div>
                      <span className="text-xs font-serif font-bold text-amber-950 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full">
                        Page {totalBookPages}
                      </span>
                    </div>

                    <div className="text-center mb-6">
                      <h3 className="font-serif font-bold text-2xl sm:text-3xl text-amber-950 mb-2">
                        Instants Précieux & Sourires Partagés
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-700 max-w-lg mx-auto">
                        Toutes les photographies souvenirs transmises par l'équipe pour célébrer votre parcours exceptionnel.
                      </p>
                    </div>

                    {/* Full Photo Grid of Team Memories */}
                    <div className="grid grid-cols-3 gap-3">
                      {allPhotosList.slice(0, 12).map((photo, pIdx) => (
                        <div
                          key={photo.id || pIdx}
                          className="rounded-xl overflow-hidden border border-amber-300 shadow-sm bg-stone-100 flex flex-col justify-between"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || 'Photo'}
                            className="w-full h-28 object-cover"
                          />
                          <div className="p-1 bg-amber-50 text-[10px] text-stone-800 text-center truncate font-medium">
                            {photo.author}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Final Farewell Quote */}
                    <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border-2 border-amber-400 text-center space-y-2">
                      <p className="font-serif font-extrabold text-xl text-amber-950">
                        Merci pour tout, Feu Sa Majesté Ibrahim Mbombo Njoya !
                      </p>
                      <p className="text-xs sm:text-sm text-stone-800 italic font-serif">
                        « Que votre mémoire demeure vivante dans nos cœurs, dans nos paroles et dans l’héritage que vous laissez à votre peuple. »
                      </p>
                      <p className="text-[11px] text-amber-900 font-bold pt-1">
                        — De la part de son peuple, de ses proches, de ses amis et de ses collaborateurs
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-300 flex items-center justify-between text-xs text-stone-500 font-serif">
                    <span>{bookTitle} • {eventDate}</span>
                    <span>Fin du Recueil Officiel</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfBookModal;
