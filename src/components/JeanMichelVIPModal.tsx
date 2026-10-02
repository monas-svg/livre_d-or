import React, { useState } from 'react';
import { GuestEntry, getEntryPhotos } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  Award,
  BookOpen,
  Camera,
  Images,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface JeanMichelVIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: GuestEntry[];
}

export const JeanMichelVIPModal: React.FC<JeanMichelVIPModalProps> = ({
  isOpen,
  onClose,
  entries,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  if (!isOpen) return null;

  // Filter approved entries
  const activeEntries = entries.filter((e) => e.isApproved !== false);
  const totalPages = activeEntries.length + 1; // Page 0 is Cover Page

  const triggerCelebration = () => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  const nextPage = () => {
    setSelectedPhotoIndex(0);
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    } else {
      setCurrentPage(0);
    }
  };

  const prevPage = () => {
    setSelectedPhotoIndex(0);
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const currentEntry = currentPage > 0 ? activeEntries[currentPage - 1] : null;
  const currentEntryPhotos = currentEntry ? getEntryPhotos(currentEntry) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/90 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden text-amber-100 min-h-[550px] flex flex-col justify-between p-6 sm:p-8">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-600/30">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg">
              📖
            </span>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-amber-200">
                Album Souvenir d'Hommage Numérique
              </h3>
              <p className="text-xs text-amber-300/70">
                Livre interactif réservé à Feu Sa Majesté Ibrahim Mbombo Njoya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerCelebration}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Confettis</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-amber-900/50 text-amber-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Page Content Display */}
        <div className="my-auto py-6 min-h-[380px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentPage === 0 ? (
              /* COVER PAGE */
              <motion.div
                key="cover"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-2xl px-4 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 mx-auto shadow-2xl">
                  <div className="w-full h-full rounded-full bg-stone-900 flex items-center justify-center">
                    <Award className="w-10 h-10 text-amber-400" />
                  </div>
                </div>

                <h1 className="text-3xl sm:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-yellow-400">
                  Ibrahim Mbombo Njoya
                </h1>

                <p className="text-lg sm:text-xl text-amber-200 font-serif italic">
                  Feu Sa Majesté Ibrahim Mbombo Njoya — Roi des Bamoun
                </p>

                <p className="text-sm sm:text-base text-amber-100/80 leading-relaxed font-sans max-w-lg mx-auto">
                  Feuilletez page par page les témoignages, souvenirs et souhaits chaleureux laissés par vos collègues, amis et proches à l'occasion de votre retraite.
                </p>

                <button
                  onClick={nextPage}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-serif font-bold text-base shadow-xl transition-all transform hover:scale-105 cursor-pointer"
                >
                  Ouvrir le livre souvenir ({activeEntries.length} témoignages) →
                </button>
              </motion.div>
            ) : (
              /* INDIVIDUAL ENTRY PAGE */
              currentEntry && (
                <motion.div
                  key={currentEntry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="w-full max-w-2xl bg-stone-900/90 border border-amber-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl relative max-h-[75vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-amber-600/30 pb-3 mb-4">
                    <div>
                      <h4 className="text-xl font-serif font-bold text-amber-200">
                        {currentEntry.firstName} {currentEntry.lastName}
                      </h4>
                      {currentEntry.relationship && (
                        <span className="text-xs text-amber-300/80">
                          {currentEntry.relationship} {currentEntry.yearsKnown ? `• ${currentEntry.yearsKnown}` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-300/60 font-mono">
                      Page {currentPage} / {totalPages - 1}
                    </span>
                  </div>

                  {/* Multi-Photos if present */}
                  {currentEntryPhotos.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <div className="rounded-xl overflow-hidden max-h-56 bg-stone-950 border border-amber-500/30 flex items-center justify-center relative">
                        <img
                          src={currentEntryPhotos[selectedPhotoIndex]?.url || currentEntryPhotos[0].url}
                          alt="Souvenir"
                          className="max-h-56 w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                        {(currentEntryPhotos[selectedPhotoIndex]?.caption || currentEntryPhotos[0].caption) && (
                          <div className="absolute bottom-0 inset-x-0 p-2 bg-stone-950/85 text-xs text-amber-200 text-center italic">
                            📷 {currentEntryPhotos[selectedPhotoIndex]?.caption || currentEntryPhotos[0].caption}
                          </div>
                        )}
                      </div>

                      {/* Thumbnails strip for multiple photos */}
                      {currentEntryPhotos.length > 1 && (
                        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                          {currentEntryPhotos.map((p, pIdx) => (
                            <button
                              key={p.id || pIdx}
                              onClick={() => setSelectedPhotoIndex(pIdx)}
                              className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                                selectedPhotoIndex === pIdx
                                  ? 'border-amber-400 scale-105 ring-2 ring-amber-400/50'
                                  : 'border-stone-700 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={p.url} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message */}
                  <p className="text-base sm:text-lg font-serif italic text-amber-100 leading-relaxed mb-4 whitespace-pre-line">
                    "{currentEntry.message}"
                  </p>

                  {/* Anecdote */}
                  {currentEntry.anecdote && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border-l-2 border-amber-400 text-xs sm:text-sm text-amber-200 mb-2">
                      <strong>Souvenir :</strong> {currentEntry.anecdote}
                    </div>
                  )}

                  {/* Wish */}
                  {currentEntry.wish && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border-l-2 border-yellow-400 text-xs sm:text-sm text-yellow-200">
                      <strong>Souhaits :</strong> {currentEntry.wish}
                    </div>
                  )}
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-amber-600/30">
          <button
            onClick={prevPage}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-xl bg-amber-900/60 hover:bg-amber-800 border border-amber-500/30 text-amber-200 text-sm font-medium disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Page précédente
          </button>

          <span className="text-xs font-serif font-bold text-amber-300">
            {currentPage === 0 ? 'Couverture' : `Page ${currentPage} sur ${totalPages - 1}`}
          </span>

          <button
            onClick={nextPage}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold shadow-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            Page suivante <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
