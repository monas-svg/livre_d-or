import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { GuestPhoto } from '../types';

interface PhotoLightboxProps {
  url: string | null;
  caption?: string;
  authorName?: string;
  photos?: GuestPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  url,
  caption,
  authorName,
  photos,
  initialIndex = 0,
  onClose,
}) => {
  // Normalize photos list
  const photoList: GuestPhoto[] =
    photos && photos.length > 0
      ? photos
      : url
      ? [{ url, caption: caption || '' }]
      : [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < photoList.length) {
      setCurrentIndex(initialIndex);
    } else if (url && photoList.length > 0) {
      const idx = photoList.findIndex((p) => p.url === url);
      if (idx !== -1) setCurrentIndex(idx);
      else setCurrentIndex(0);
    }
  }, [url, initialIndex, photos]);

  const totalPhotos = photoList.length;
  const currentPhoto = photoList[currentIndex] || (url ? { url, caption } : null);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && totalPhotos > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && totalPhotos > 1) {
        handleNext();
      }
    };
    if (currentPhoto) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPhoto, totalPhotos, onClose]);

  if (!currentPhoto || !currentPhoto.url) return null;

  const activeUrl = currentPhoto.url;
  const activeCaption = currentPhoto.caption || caption || '';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = activeUrl;
    link.download = `photo_souvenir_jean_michel_${authorName ? authorName.replace(/\s+/g, '_') : 'invite'}_${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[95vh] w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between pb-3 px-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
            {totalPhotos > 1 ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
                Photo {currentIndex + 1} sur {totalPhotos}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 opacity-80">
                <Images className="w-4 h-4 text-amber-400" />
                Photo Souvenir
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-amber-200 hover:text-white bg-stone-900/80 hover:bg-stone-800 border border-amber-500/30 rounded-full transition-colors flex items-center gap-1 text-xs"
              title="Télécharger la photo"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-300 hover:text-white bg-stone-900/80 hover:bg-stone-800 border border-stone-700 rounded-full transition-colors"
              title="Fermer (Échap)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Image View with Navigation Arrows */}
        <div className="relative w-full flex items-center justify-center">
          {totalPhotos > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 z-10 p-2.5 sm:p-3 rounded-full bg-stone-900/80 hover:bg-amber-600 text-amber-100 hover:text-stone-950 border border-amber-500/40 shadow-xl transition-all hover:scale-110"
              title="Photo précédente (←)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}

          <img
            key={activeUrl}
            src={activeUrl}
            alt={activeCaption || 'Photo agrandie'}
            className="max-w-full max-h-[70vh] object-contain rounded-2xl border-2 border-amber-500/40 shadow-2xl transition-all"
            referrerPolicy="no-referrer"
          />

          {totalPhotos > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-10 p-2.5 sm:p-3 rounded-full bg-stone-900/80 hover:bg-amber-600 text-amber-100 hover:text-stone-950 border border-amber-500/40 shadow-xl transition-all hover:scale-110"
              title="Photo suivante (→)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Bottom Metadata & Thumbnails Strip */}
        <div className="mt-3 w-full max-w-xl flex flex-col items-center gap-2">
          {(activeCaption || authorName) && (
            <div className="px-4 py-2 rounded-xl bg-stone-900/90 border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-serif text-center w-full">
              {activeCaption && <p className="italic">📷 {activeCaption}</p>}
              {authorName && (
                <p className="text-[11px] text-amber-400/80 font-sans mt-0.5 font-medium">
                  Partagé par : {authorName}
                </p>
              )}
            </div>
          )}

          {/* Miniature strip if multiple */}
          {totalPhotos > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full px-2">
              {photoList.map((p, idx) => (
                <button
                  key={p.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === currentIndex
                      ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                      : 'border-stone-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={p.url} alt={`Miniature ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

