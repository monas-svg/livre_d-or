import React from 'react';
import { GuestEntry, GuestPhoto, getEntryPhotos } from '../types';
import {
  Lock,
  ShieldCheck,
  Edit3,
  Trash2,
  Heart,
  Camera,
  Plus,
  Sparkles,
  Quote,
  Clock,
  Images,
} from 'lucide-react';
import { motion } from 'motion/react';

interface TestimonialsWallProps {
  entries: GuestEntry[];
  currentGuestToken: string | null;
  currentGuestEntry: GuestEntry | null;
  isAdmin: boolean;
  onOpenWriteModal: () => void;
  onEditEntry: () => void;
  onDeleteEntry: () => void;
  onReaction: (id: string, emoji: string) => void;
  onImageClick: (url: string, caption?: string, authorName?: string, photos?: GuestPhoto[], initialIndex?: number) => void;
  onOpenAdmin: () => void;
}

export const TestimonialsWall: React.FC<TestimonialsWallProps> = ({
  entries,
  currentGuestToken,
  currentGuestEntry,
  isAdmin,
  onOpenWriteModal,
  onEditEntry,
  onDeleteEntry,
  onImageClick,
  onOpenAdmin,
}) => {
  const currentEntryPhotos = currentGuestEntry ? getEntryPhotos(currentGuestEntry) : [];
  const currentAuthorName = currentGuestEntry
    ? `${currentGuestEntry.firstName} ${currentGuestEntry.lastName}`
    : '';

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 my-12" id="espace-temoignages">
      {/* Section Header with Privacy & Confidentiality Badges */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-serif tracking-wide mb-3 shadow-sm">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Espace Hommage Privé & Confidentiel</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-100 mb-3 tracking-tight">
          Votre Hommage pour Feu Sa Majesté Ibrahim Mbombo Njoya
        </h2>
        <p className="text-stone-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Chaque invité a accès uniquement à son propre témoignage. Tous les messages sont centralisés de manière sécurisée et transmis exclusivement à l'administrateur pour la confection du Livre d'Or.
        </p>
      </div>

      {/* Guest Space: Either displays their own registered message or an invitation to write */}
      {currentGuestEntry ? (
        /* Guest already submitted their testimonial */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xl shrink-0">
                ✓
              </div>
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-200">
                  Votre message a bien été enregistré
                </h3>
                <p className="text-xs text-stone-300 flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Transmis de manière privée à l'administrateur
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={onEditEntry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier mon message</span>
              </button>
              <button
                onClick={onDeleteEntry}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 font-medium text-xs transition-colors cursor-pointer"
                title="Supprimer mon message"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>

          {/* Details of Guest's Testimonial */}
          <div className="pt-6 space-y-5">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block mb-1">
                Auteur du témoignage
              </span>
              <p className="font-serif font-semibold text-lg text-stone-100">
                {currentGuestEntry.firstName} {currentGuestEntry.lastName}
              </p>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block mb-1">
                Votre Message personnel pour Feu Sa Majesté Ibrahim Mbombo Njoya
              </span>
              <div className="text-stone-200 text-sm sm:text-base leading-relaxed bg-stone-950/70 p-5 rounded-2xl border border-stone-800 italic relative">
                <Quote className="w-6 h-6 text-amber-500/20 absolute top-3 left-3 pointer-events-none" />
                <p className="pl-4 whitespace-pre-line">« {currentGuestEntry.message} »</p>
              </div>
            </div>

            {currentGuestEntry.anecdote && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Souvenir partagé / Anecdote complice
                </span>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed bg-stone-950/40 p-4 rounded-xl border border-stone-800/80 italic">
                  {currentGuestEntry.anecdote}
                </p>
              </div>
            )}

            {currentGuestEntry.wish && (
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold block mb-1 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" /> Vœux pour la retraite
                </span>
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed bg-stone-950/40 p-4 rounded-xl border border-stone-800/80 italic">
                  {currentGuestEntry.wish}
                </p>
              </div>
            )}

            {currentEntryPhotos.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  {currentEntryPhotos.length > 1
                    ? `Photos souvenirs jointes (${currentEntryPhotos.length})`
                    : 'Photo souvenir jointe'}
                </span>
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                  {currentEntryPhotos.map((photo, pIdx) => (
                    <div
                      key={photo.id || pIdx}
                      onClick={() =>
                        onImageClick(
                          photo.url,
                          photo.caption,
                          currentAuthorName,
                          currentEntryPhotos,
                          pIdx
                        )
                      }
                      className="relative group cursor-pointer shrink-0 overflow-hidden rounded-2xl border border-amber-500/40 w-36 h-36 bg-stone-950 shadow-md"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo souvenir ${pIdx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-stone-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-amber-300" />
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 inset-x-0 p-1.5 bg-stone-950/90 text-[10px] text-amber-200 truncate text-center">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        /* Guest hasn't submitted yet */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-b from-stone-900/90 to-stone-950 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center backdrop-blur-md"
        >
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 shadow-inner">
            <Heart className="w-8 h-8" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-100 mb-3">
            Vous n'avez pas encore déposé de message
          </h3>

          <p className="text-stone-300 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
            Prenez quelques instants pour lui adresser un mot chaleureux, partager un souvenir ou joindre vos plus belles photos. Votre hommage sera honoré en mémoire de Feu Sa Majesté Ibrahim Mbombo Njoya.
          </p>

          <button
            onClick={onOpenWriteModal}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-base shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer inline-flex items-center gap-2.5"
          >
            <Plus className="w-5 h-5" />
            <span>Déposer mon hommage pour Feu Sa Majesté Ibrahim Mbombo Njoya</span>
          </button>
        </motion.div>
      )}

      {/* Admin Protected Access Footer Button */}
      <div className="mt-12 text-center pt-8 border-t border-stone-800">
        <p className="text-xs text-stone-500 mb-2.5">
          Accès exclusif à la centralisation, modération et impression du livre d'or :
        </p>
        <button
          onClick={onOpenAdmin}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-amber-400 border border-amber-500/25 text-xs hover:border-amber-400/50 shadow-md transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Dashboard Administrateur (Mot de passe requis)</span>
        </button>
      </div>
    </section>
  );
};

export default TestimonialsWall;
