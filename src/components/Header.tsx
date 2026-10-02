import React from 'react';
import { Award, Heart, Sparkles, Calendar, ShieldCheck, BookmarkCheck, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  onOpenWriter: () => void;
  onOpenVIP: () => void;
  totalCount: number;
  isAdmin?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWriter, onOpenVIP, totalCount, isAdmin }) => {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-amber-900 via-amber-950 to-stone-900 text-amber-50 pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-amber-600/30 shadow-2xl">
      {/* Decorative ambient lighting & background graphics */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Top Celebration Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mb-5 flex justify-center"
        >
          <div className="flex items-center gap-3 rounded-full border border-amber-400/40 bg-stone-900/40 px-4 py-2 shadow-[0_12px_24px_rgba(251,191,36,0.12)] backdrop-blur-sm">
            <img
              src="/images/logo-symbole.svg"
              alt="Logo royal Bamoun"
              className="h-8 w-8 object-contain"
            />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/90">
              Hommage Royal Bamoun
            </span>
          </div>
        </motion.div>

        {/* Main Title Header */}

        {/* Subtitle with Name */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-xl sm:text-2xl lg:text-3xl font-medium text-amber-200/95 mb-3 flex items-center justify-center gap-3 flex-wrap"
        >
          <Award className="w-7 h-7 text-amber-400 inline-block" />
          <span>Hommage à Feu Sa Majesté Ibrahim Mbombo Njoya</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 mb-8 flex justify-center"
        >
          <div className="relative rounded-[2rem] border border-amber-300/40 bg-stone-900/30 p-3 shadow-[0_30px_80px_rgba(251,191,36,0.2)] backdrop-blur-sm">
            <img
              src="/images/couverture.png"
              alt="Couverture du livre d’hommage"
              className="w-full max-w-xl rounded-[1.5rem] object-cover"
            />
          </div>
        </motion.div>

        {/* Date & Gratitude Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-base sm:text-lg text-amber-100/80 max-w-2xl mx-auto font-sans leading-relaxed mb-8 flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Hommage royal des Bamoun — Un souvenir vivant de la mémoire, du courage et du leadership de Feu Sa Majesté Ibrahim Mbombo Njoya.</span>
        </motion.p>

        {/* Action Bar inside Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-2"
        >
          <button
            onClick={onOpenWriter}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-sm sm:text-base shadow-lg shadow-amber-900/40 hover:shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 group cursor-pointer"
          >
            <Heart className="w-5 h-5 text-stone-950 fill-stone-950/20 group-hover:scale-110 transition-transform" />
            <span>Déposer mon hommage</span>
          </button>

          <button
            onClick={onOpenVIP}
            className="px-5 py-3.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-amber-200 border border-amber-500/30 font-medium text-sm sm:text-base backdrop-blur-sm transition-all hover:border-amber-400 flex items-center gap-2 cursor-pointer"
          >
            <BookmarkCheck className="w-5 h-5 text-amber-400" />
            <span>Album d’Hommage</span>
          </button>
        </motion.div>

        {/* Confidentiality Notice Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 pt-6 border-t border-amber-500/20 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-amber-300/80"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Hommage mémorial réservé à la mémoire de Feu Sa Majesté Ibrahim Mbombo Njoya</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-amber-500/40" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Un livre d’or dédié au souvenir de Feu Sa Majesté Ibrahim Mbombo Njoya, roi des Bamoun</span>
          </div>
        </motion.div>
      </div>
    </header>
  );
};

export default Header;
