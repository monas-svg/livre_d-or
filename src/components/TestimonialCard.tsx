import React, { useState } from 'react';
import { GuestEntry, CardStyle, GuestPhoto, getEntryPhotos } from '../types';
import { Heart, Pin, Camera, Edit3, Sparkles, MessageCircle, Quote, ThumbsUp, Images } from 'lucide-react';
import { motion } from 'motion/react';

interface TestimonialCardProps {
  entry: GuestEntry;
  currentGuestToken: string | null;
  onEdit: (entry: GuestEntry) => void;
  onReaction: (id: string, emoji: string) => void;
  onImageClick: (url: string, caption?: string, authorName?: string, photos?: GuestPhoto[], initialIndex?: number) => void;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  entry,
  currentGuestToken,
  onEdit,
  onReaction,
  onImageClick,
}) => {
  const [reactedEmoji, setReactedEmoji] = useState<string | null>(null);

  const isOwner = currentGuestToken && currentGuestToken === entry.token;
  const photos = getEntryPhotos(entry);
  const authorFullName = `${entry.firstName} ${entry.lastName}`;

  const handleEmojiClick = (emoji: string) => {
    onReaction(entry.id, emoji);
    setReactedEmoji(emoji);
    setTimeout(() => setReactedEmoji(null), 1000);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col justify-between bg-stone-900/95 hover:bg-stone-900 text-amber-50 border border-amber-500/30 hover:border-amber-400/60 shadow-xl shadow-amber-950/20 p-6 rounded-2xl backdrop-blur-sm transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Pinned Ribbon Badge */}
      {entry.isPinned && (
        <div className="absolute -top-3 -right-3 bg-amber-500 text-stone-950 text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 z-20 border border-amber-300">
          <Pin className="w-3.5 h-3.5 fill-stone-950" />
          <span>Épinglé</span>
        </div>
      )}

      {/* Owner Badge */}
      {isOwner && (
        <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-sm z-20 flex items-center gap-1">
          <span>Votre message</span>
          <button
            onClick={() => onEdit(entry)}
            className="ml-1 hover:underline text-emerald-100 flex items-center gap-0.5"
            title="Modifier"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}

      <div>
        {/* Photo Block if attached */}
        {photos.length > 0 && (
          <div className="mb-4">
            {photos.length === 1 ? (
              /* Single Photo View */
              <div className="relative group overflow-hidden rounded-xl border border-stone-300/40 dark:border-stone-700/50 bg-stone-100 dark:bg-stone-950">
                <img
                  src={photos[0].url}
                  alt={photos[0].caption || `Souvenir de ${entry.firstName}`}
                  className="w-full h-48 sm:h-56 object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
                  onClick={() => onImageClick(photos[0].url, photos[0].caption, authorFullName, photos, 0)}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="bg-stone-900/85 text-amber-200 text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                    <Camera className="w-3.5 h-3.5" /> Agrandir
                  </span>
                </div>
                {photos[0].caption && (
                  <p className="text-xs italic p-2 bg-stone-900/70 text-amber-100 text-center backdrop-blur-sm truncate">
                    📷 {photos[0].caption}
                  </p>
                )}
              </div>
            ) : photos.length === 2 ? (
              /* 2 Photos Layout */
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => onImageClick(p.url, p.caption, authorFullName, photos, idx)}
                    className="relative group cursor-pointer overflow-hidden rounded-xl border border-stone-700 bg-stone-950 h-36"
                  >
                    <img
                      src={p.url}
                      alt={p.caption || `Photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Camera className="w-4 h-4 text-amber-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 3+ Photos Collage Layout */
              <div className="grid grid-cols-3 gap-1.5">
                {photos.slice(0, 3).map((p, idx) => {
                  const isLastVisible = idx === 2 && photos.length > 3;
                  const remainingCount = photos.length - 3;
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => onImageClick(p.url, p.caption, authorFullName, photos, idx)}
                      className="relative group cursor-pointer overflow-hidden rounded-xl border border-stone-700 bg-stone-950 h-28"
                    >
                      <img
                        src={p.url}
                        alt={p.caption || `Photo ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isLastVisible ? (
                        <div className="absolute inset-0 bg-stone-950/75 flex flex-col items-center justify-center text-amber-300 font-bold text-xs gap-0.5">
                          <Images className="w-4 h-4" />
                          <span>+{remainingCount} photos</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Camera className="w-3.5 h-3.5 text-amber-200" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Header Metadata */}
        <div className="flex items-start justify-between gap-3 mb-3 pt-1">
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl leading-snug">
              {entry.firstName} {entry.lastName}
            </h3>
          </div>
        </div>

        {/* Main Tribute Message */}
        <div className="my-4 text-sm sm:text-base leading-relaxed whitespace-pre-line font-serif italic relative">
          <Quote className="w-6 h-6 opacity-20 absolute -top-3 -left-2" />
          <p className="pl-3">{entry.message}</p>
        </div>

        {/* Optional Anecdote */}
        {entry.anecdote && (
          <div className="my-3 p-3 rounded-lg bg-stone-500/10 border-l-2 border-amber-500/60 text-xs sm:text-sm">
            <span className="font-bold not-italic block mb-0.5 opacity-90">💡 Un souvenir marquant :</span>
            <p className="italic opacity-90">{entry.anecdote}</p>
          </div>
        )}

        {/* Optional Wish */}
        {entry.wish && (
          <div className="my-3 p-3 rounded-lg bg-amber-500/10 border-l-2 border-amber-400 text-xs sm:text-sm">
            <span className="font-bold not-italic block mb-0.5 opacity-90">🌟 Souhaits pour la retraite :</span>
            <p className="italic opacity-90">{entry.wish}</p>
          </div>
        )}
      </div>

      {/* Footer / Reaction Bar */}
      <div className="pt-4 mt-4 border-t border-stone-500/20 flex items-center justify-between text-xs gap-2 flex-wrap">
        <span className="opacity-60 text-[11px]">
          {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>

        {/* Emoji Reactions */}
        <div className="flex items-center gap-1.5">
          {['❤️', '🥂', '👏', '🌟'].map((emoji) => {
            const count = entry.reactions ? entry.reactions[emoji] || 0 : 0;
            return (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="px-2 py-1 rounded-lg bg-stone-500/10 hover:bg-amber-500/20 border border-stone-500/20 transition-all hover:scale-110 active:scale-95 flex items-center gap-1"
                title={`Reagir avec ${emoji}`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-bold text-[11px] opacity-80">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </motion.article>
  );
};
