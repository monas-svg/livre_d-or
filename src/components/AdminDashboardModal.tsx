import React, { useState } from 'react';
import { GuestEntry, AdminStats, GuestPhoto, getEntryPhotos } from '../types';
import { PdfBookModal } from './PdfBookModal';
import {
  X,
  Lock,
  ShieldCheck,
  Pin,
  Trash2,
  CheckCircle,
  EyeOff,
  Eye,
  Download,
  Printer,
  Users,
  Image as ImageIcon,
  Heart,
  BarChart2,
  Edit3,
  RefreshCw,
  Search,
  Camera,
  Maximize2,
  Grid,
  List,
  Filter,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Clock,
  UserCheck,
  Images,
  BookOpen,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToken: string | null;
  onAdminLogin: (passcode: string) => Promise<boolean>;
  onAdminLogout: () => void;
  entries: GuestEntry[];
  stats: AdminStats | null;
  onTogglePin: (id: string, isPinned: boolean) => Promise<void>;
  onToggleApprove: (id: string, isApproved: boolean) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onUpdateEntryByAdmin: (id: string, data: Partial<GuestEntry>) => Promise<void>;
  onImageClick?: (url: string, caption?: string, authorName?: string, photos?: GuestPhoto[], initialIndex?: number) => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  adminToken,
  onAdminLogin,
  onAdminLogout,
  entries,
  stats,
  onTogglePin,
  onToggleApprove,
  onDeleteEntry,
  onUpdateEntryByAdmin,
  onImageClick,
}) => {
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_photo' | 'pinned' | 'hidden'>('all');
  const [activeView, setActiveView] = useState<'table' | 'gallery'>('table');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [selectedEntryDetail, setSelectedEntryDetail] = useState<GuestEntry | null>(null);
  const [isPdfBookModalOpen, setIsPdfBookModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    const success = await onAdminLogin(passcode);
    if (!success) {
      setLoginError('Mot de passe administrateur incorrect.');
    } else {
      setPasscode('');
    }
    setLoading(false);
  };

  const entriesWithPhotos = entries.filter((e) => getEntryPhotos(e).length > 0);

  const filteredEntries = entries.filter((e) => {
    const entryPhotos = getEntryPhotos(e);
    const matchesSearch =
      e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entryPhotos.some((p) => p.caption && p.caption.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.relationship && e.relationship.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'with_photo') {
      return entryPhotos.length > 0;
    }
    if (filterType === 'pinned') {
      return Boolean(e.isPinned);
    }
    if (filterType === 'hidden') {
      return e.isApproved === false;
    }
    return true;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `livre_d_or_jean_michel_edimo_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintBook = () => {
    window.print();
  };

  const openLightbox = (url: string, caption?: string, authorName?: string, photos?: GuestPhoto[], initialIndex?: number) => {
    if (onImageClick) {
      onImageClick(url, caption, authorName, photos, initialIndex);
    }
  };

  const handleDownloadPhoto = (url: string, authorName: string, index = 1) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `photo_souvenir_jean_michel_${authorName.replace(/\s+/g, '_')}_${index}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl my-4 sm:my-8 bg-amber-50 dark:bg-stone-900 border border-amber-300 dark:border-amber-800/60 rounded-3xl shadow-2xl overflow-hidden text-stone-800 dark:text-amber-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950 text-amber-100 flex items-center justify-between border-b border-amber-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-2xl font-serif font-bold text-amber-100">
                  Dashboard Administrateur
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                  Accès Total & Photos
                </span>
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Modération des témoignages et consultation des photos de souvenirs pour Jean-Michel Edimo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-800 text-amber-200 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Section */}
        {!adminToken ? (
          /* LOGIN FORM */
          <div className="p-8 sm:p-12 max-w-md mx-auto my-auto text-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-serif font-bold text-stone-900 dark:text-amber-100 mb-2">
              Accès Administrateur
            </h4>
            <p className="text-xs text-stone-600 dark:text-amber-300/70 mb-6 leading-relaxed">
              Veuillez entrer le code d'accès administrateur pour débloquer l'ensemble des messages et voir les photos publiées.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Entrez le mot de passe (edimo2026)"
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-center text-lg font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {loginError && <p className="text-xs text-red-500 font-medium">{loginError}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Se connecter au Dashboard</span>
              </button>
            </form>
          </div>
        ) : (
          /* DASHBOARD PANEL */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 flex flex-col">
            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <button
                onClick={() => {
                  setFilterType('all');
                  setActiveView('table');
                }}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  filterType === 'all' && activeView === 'table'
                    ? 'bg-amber-500/20 border-amber-500 dark:bg-amber-950/40'
                    : 'bg-amber-100/60 dark:bg-stone-800/80 border-amber-300/50 dark:border-amber-800/40 hover:border-amber-400'
                }`}
              >
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>Total Témoignages</span>
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-amber-100">
                  {stats?.totalEntries || entries.length}
                </p>
              </button>

              {/* Photo Stat Card - clickable to switch to gallery */}
              <button
                onClick={() => {
                  setFilterType('with_photo');
                  setActiveView('gallery');
                }}
                className={`p-3.5 rounded-2xl text-left border transition-all group ${
                  activeView === 'gallery' || filterType === 'with_photo'
                    ? 'bg-amber-500/20 border-amber-500 dark:bg-amber-950/40 shadow-sm'
                    : 'bg-amber-100/60 dark:bg-stone-800/80 border-amber-300/50 dark:border-amber-800/40 hover:border-amber-400'
                }`}
                title="Cliquer pour voir la galerie photos"
              >
                <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-500" />
                    <span>Photos Souvenirs</span>
                  </span>
                  <span className="text-[10px] bg-amber-500/30 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-bold">
                    Voir 🖼️
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-serif font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span>{stats?.totalPhotos || entriesWithPhotos.length}</span>
                  <span className="text-xs font-sans font-normal opacity-80">photo(s)</span>
                </p>
              </button>

              <div className="p-3.5 rounded-2xl bg-amber-100/60 dark:bg-stone-800/80 border border-amber-300/50 dark:border-amber-800/40">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-semibold mb-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>Réactions reçues</span>
                </div>
                <p className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-amber-100">
                  {stats?.totalLikes || entries.reduce((acc, c) => acc + (c.likesCount || 0), 0)}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/15 to-amber-700/20 border-2 border-amber-500/50 dark:border-amber-400/50 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Livre d'Or PDF
                  </span>
                  <button
                    onClick={onAdminLogout}
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold"
                  >
                    🔒 Déconnexion
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 mt-2">
                  <button
                    onClick={() => setIsPdfBookModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    title="Ouvrir le module d'édition et d'impression du Livre d'Or en PDF"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Livre d'Or PDF & Impression</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full py-1 px-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                    title="Sauvegarder JSON"
                  >
                    <Download className="w-3 h-3" /> Backup JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Bar & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 pt-2">
              {/* View Switcher Tabs */}
              <div className="flex items-center p-1 bg-stone-200 dark:bg-stone-800 rounded-2xl border border-stone-300 dark:border-stone-700 self-start sm:self-auto">
                <button
                  onClick={() => setActiveView('table')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeView === 'table'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-600 dark:text-amber-200 hover:text-stone-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>Tableau Modération</span>
                </button>
                <button
                  onClick={() => setActiveView('gallery')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeView === 'gallery'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-600 dark:text-amber-200 hover:text-stone-900'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Galerie Photos ({entriesWithPhotos.length})</span>
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3" /> Filtrer :
                </span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                    filterType === 'all'
                      ? 'bg-stone-900 text-amber-300 dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-amber-200/80 hover:bg-stone-300'
                  }`}
                >
                  Tous ({entries.length})
                </button>
                <button
                  onClick={() => setFilterType('with_photo')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-medium flex items-center gap-1 ${
                    filterType === 'with_photo'
                      ? 'bg-amber-600 text-white dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-amber-200/80 hover:bg-stone-300'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Avec photo ({entriesWithPhotos.length})</span>
                </button>
                <button
                  onClick={() => setFilterType('pinned')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                    filterType === 'pinned'
                      ? 'bg-stone-900 text-amber-300 dark:bg-amber-400 dark:text-stone-950 font-bold'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-amber-200/80 hover:bg-stone-300'
                  }`}
                >
                  Épinglés ({entries.filter((e) => e.isPinned).length})
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-stone-400 dark:text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, mot-clé, légende ou relation..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* MAIN CONTENT AREA */}
            {activeView === 'gallery' ? (
              /* ============================================================ */
              /* GALERIE PHOTOS SOUVENIRS VIEW                                */
              /* ============================================================ */
              <div className="flex-1 overflow-y-auto">
                {entriesWithPhotos.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-amber-300/40 dark:border-amber-800/40 rounded-3xl bg-amber-50/50 dark:bg-stone-800/40">
                    <Camera className="w-12 h-12 text-amber-500/60 mx-auto mb-3" />
                    <h5 className="font-serif font-bold text-lg text-stone-800 dark:text-amber-100 mb-1">
                      Aucune photo souvenir déposée pour l'instant
                    </h5>
                    <p className="text-xs text-stone-500 dark:text-amber-300/70 max-w-md mx-auto">
                      Dès qu'un invité joint une photo à son témoignage, elle apparaîtra directement ici en haute définition pour constituer l'album souvenir.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                    {filteredEntries
                      .filter((e) => getEntryPhotos(e).length > 0)
                      .map((entry) => {
                        const photos = getEntryPhotos(entry);
                        const authorName = `${entry.firstName} ${entry.lastName}`;
                        return (
                          <div
                            key={entry.id}
                            className="bg-white dark:bg-stone-800 rounded-2xl overflow-hidden border border-amber-200 dark:border-amber-700/50 shadow-md hover:shadow-xl transition-all flex flex-col group"
                          >
                            {/* Image Thumbnail Container */}
                            <div className="relative aspect-video sm:aspect-square bg-stone-950 overflow-hidden cursor-pointer">
                              <img
                                src={photos[0].url}
                                alt={photos[0].caption || `Photo de ${authorName}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onClick={() => openLightbox(photos[0].url, photos[0].caption, authorName, photos, 0)}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLightbox(photos[0].url, photos[0].caption, authorName, photos, 0);
                                  }}
                                  className="px-3 py-1.5 rounded-full bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1 shadow-lg hover:bg-amber-400 transition-transform transform hover:scale-105"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>Agrandir</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadPhoto(photos[0].url, authorName);
                                  }}
                                  className="p-2 rounded-full bg-stone-900/90 text-amber-200 text-xs shadow-lg hover:bg-stone-800 transition-colors"
                                  title="Télécharger l'image"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Multi-photos badge */}
                              {photos.length > 1 && (
                                <span className="absolute top-2 right-2 bg-stone-950/85 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md border border-amber-500/40">
                                  <Images className="w-3 h-3 text-amber-400" />
                                  <span>{photos.length} photos</span>
                                </span>
                              )}

                              {/* Pinned badge */}
                              {entry.isPinned && (
                                <span className="absolute top-2 left-2 bg-amber-500 text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                  <Pin className="w-3 h-3 fill-stone-950" /> Épinglé
                                </span>
                              )}
                            </div>

                            {/* Card details */}
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h5 className="font-serif font-bold text-sm text-stone-900 dark:text-amber-100">
                                      {entry.firstName} {entry.lastName}
                                    </h5>
                                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                      {entry.relationship || 'Invité'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 font-mono">
                                    {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>

                                {photos[0]?.caption && (
                                  <p className="mt-2 text-xs font-serif italic text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-stone-900/80 p-2 rounded-lg border border-amber-300/40 dark:border-amber-700/30">
                                    📷 {photos[0].caption}
                                  </p>
                                )}

                                <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 line-clamp-2 italic">
                                  "{entry.message}"
                                </p>
                              </div>

                              <div className="pt-2 border-t border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                                <button
                                  onClick={() => setSelectedEntryDetail(entry)}
                                  className="text-amber-600 dark:text-amber-400 hover:underline font-semibold text-[11px] flex items-center gap-1"
                                >
                                  <span>Voir fiche complète</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onTogglePin(entry.id, !entry.isPinned)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      entry.isPinned
                                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                                        : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-amber-200 border-stone-300 dark:border-stone-600'
                                    }`}
                                    title={entry.isPinned ? 'Désépingler' : 'Épingler'}
                                  >
                                    <Pin className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onToggleApprove(entry.id, !entry.isApproved)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      entry.isApproved
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                        : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                                    }`}
                                    title={entry.isApproved ? 'Visible' : 'Masqué'}
                                  >
                                    {entry.isApproved ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Supprimer définitivement le témoignage de ${entry.firstName} ${entry.lastName} ?`)) {
                                        await onDeleteEntry(entry.id);
                                        if (selectedEntryDetail?.id === entry.id) {
                                          setSelectedEntryDetail(null);
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg border border-red-300 dark:border-red-800/60 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300 hover:bg-red-200 transition-colors"
                                    title="Supprimer ce témoignage"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================ */
              /* TABLEAU DE BORD / MODÉRATION LIST VIEW                       */
              /* ============================================================ */
              <div className="border border-amber-200 dark:border-amber-800/60 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-stone-800/90 flex-1 flex flex-col min-h-0">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-amber-100/90 dark:bg-stone-900 text-amber-950 dark:text-amber-200 font-serif border-b border-amber-200 dark:border-amber-800 sticky top-0 z-10">
                      <tr>
                        <th className="p-3.5">Photos</th>
                        <th className="p-3.5">Auteur</th>
                        <th className="p-3.5">Message / Témoignage</th>
                        <th className="p-3.5 text-center">Épinglé</th>
                        <th className="p-3.5 text-center">Visibilité</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-stone-500 dark:text-stone-400">
                            Aucun témoignage ne correspond à vos critères de recherche.
                          </td>
                        </tr>
                      ) : (
                        filteredEntries.map((entry) => {
                          const photos = getEntryPhotos(entry);
                          const authorName = `${entry.firstName} ${entry.lastName}`;
                          return (
                            <tr key={entry.id} className="hover:bg-amber-50/60 dark:hover:bg-stone-700/50 transition-colors">
                              {/* PHOTO THUMBNAIL COLUMN */}
                              <td className="p-3.5 whitespace-nowrap">
                                {photos.length > 0 ? (
                                  <div
                                    onClick={() =>
                                      openLightbox(photos[0].url, photos[0].caption, authorName, photos, 0)
                                    }
                                    className="relative group cursor-pointer w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/60 hover:border-amber-400 shadow-sm bg-stone-950 shrink-0"
                                    title="Cliquez pour agrandir les photos"
                                  >
                                    <img
                                      src={photos[0].url}
                                      alt="Miniature"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                      referrerPolicy="no-referrer"
                                    />
                                    {photos.length > 1 && (
                                      <span className="absolute bottom-0 right-0 px-1 bg-stone-950/90 text-amber-300 text-[9px] font-bold rounded-tl">
                                        +{photos.length - 1}
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl border border-stone-200 dark:border-stone-700/60 bg-stone-100 dark:bg-stone-800/60 flex items-center justify-center text-[10px] text-stone-400 dark:text-stone-500 font-medium">
                                    Sans photo
                                  </div>
                                )}
                              </td>

                              {/* AUTHOR COLUMN */}
                              <td className="p-3.5 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedEntryDetail(entry)}
                                  className="text-left group"
                                >
                                  <div className="font-bold text-stone-900 dark:text-amber-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                                    <span>{entry.firstName} {entry.lastName}</span>
                                  </div>
                                  <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium">
                                    {entry.relationship || 'Collègue'}
                                  </div>
                                </button>
                              </td>

                              {/* MESSAGE COLUMN */}
                              <td className="p-3.5 max-w-xs sm:max-w-sm">
                                {editingId === entry.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editMessage}
                                      onChange={(e) => setEditMessage(e.target.value)}
                                      className="w-full p-2.5 text-xs rounded-xl border border-amber-300 dark:border-amber-700 dark:bg-stone-900 text-stone-900 dark:text-amber-100 focus:ring-2 focus:ring-amber-500"
                                      rows={3}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={async () => {
                                          await onUpdateEntryByAdmin(entry.id, { message: editMessage });
                                          setEditingId(null);
                                        }}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
                                      >
                                        Enregistrer
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1 bg-stone-400 hover:bg-stone-500 text-white rounded-lg text-xs"
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="line-clamp-2 text-stone-700 dark:text-amber-100 italic">
                                      "{entry.message}"
                                    </p>
                                    {photos.length > 0 && (
                                      <span className="inline-block mt-1 text-[11px] text-amber-700 dark:text-amber-300/80 bg-amber-100/50 dark:bg-stone-900/60 px-2 py-0.5 rounded border border-amber-300/30">
                                        📷 {photos.length} {photos.length > 1 ? 'photos jointes' : 'photo jointe'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* PIN COLUMN */}
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => onTogglePin(entry.id, !entry.isPinned)}
                                  className={`p-2 rounded-xl border transition-colors ${
                                    entry.isPinned
                                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                                      : 'bg-stone-100 dark:bg-stone-700 text-stone-400 dark:text-stone-300 border-stone-300 dark:border-stone-600 hover:bg-stone-200'
                                  }`}
                                  title={entry.isPinned ? 'Désépingler' : 'Épingler en haut'}
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                              </td>

                              {/* VISIBILITY COLUMN */}
                              <td className="p-3.5 text-center whitespace-nowrap">
                                <button
                                  onClick={() => onToggleApprove(entry.id, !entry.isApproved)}
                                  className={`p-2 rounded-xl border transition-colors ${
                                    entry.isApproved
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                                  }`}
                                  title={entry.isApproved ? 'Masquer du livre' : 'Rendre visible'}
                                >
                                  {entry.isApproved ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                              </td>

                              {/* ACTIONS COLUMN */}
                              <td className="p-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedEntryDetail(entry)}
                                    className="p-2 rounded-xl bg-amber-100 dark:bg-stone-700 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors"
                                    title="Consulter toute la fiche"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingId(entry.id);
                                      setEditMessage(entry.message);
                                    }}
                                    className="p-2 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-amber-200 hover:bg-stone-200 transition-colors"
                                    title="Modifier le texte"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={async () => {
                                      if (confirm(`Supprimer définitivement le témoignage de ${entry.firstName} ${entry.lastName} ?`)) {
                                        await onDeleteEntry(entry.id);
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-300 hover:bg-red-200 transition-colors"
                                    title="Supprimer le témoignage"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL: FULL ENTRY DETAIL INSPECTION */}
        {selectedEntryDetail && (
          <div
            className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedEntryDetail(null)}
          >
            <div
              className="bg-amber-50 dark:bg-stone-900 border border-amber-400 dark:border-amber-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto text-stone-800 dark:text-amber-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-amber-300 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg text-stone-900 dark:text-amber-100">
                      {selectedEntryDetail.firstName} {selectedEntryDetail.lastName}
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {selectedEntryDetail.relationship} {selectedEntryDetail.yearsKnown ? `· Connu depuis : ${selectedEntryDetail.yearsKnown}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEntryDetail(null)}
                  className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PHOTOS IF PRESENT */}
              {(() => {
                const photos = getEntryPhotos(selectedEntryDetail);
                if (photos.length === 0) return null;
                const authorName = `${selectedEntryDetail.firstName} ${selectedEntryDetail.lastName}`;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 block">
                        Photos souvenirs ({photos.length}) :
                      </span>
                      <button
                        onClick={() => openLightbox(photos[0].url, photos[0].caption, authorName, photos, 0)}
                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Ouvrir la galerie ({photos.length})</span>
                      </button>
                    </div>

                    <div className={`grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                      {photos.map((photo, idx) => (
                        <div
                          key={photo.id || idx}
                          onClick={() => openLightbox(photo.url, photo.caption, authorName, photos, idx)}
                          className="group relative rounded-2xl overflow-hidden border border-amber-400/50 bg-stone-950 aspect-video sm:aspect-square cursor-pointer shadow-sm hover:shadow-md transition-all"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption || `Photo ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 font-bold text-[11px] flex items-center gap-1">
                              <Maximize2 className="w-3 h-3" /> Agrandir
                            </span>
                          </div>
                          {photo.caption && (
                            <div className="absolute bottom-0 inset-x-0 bg-stone-950/80 p-1.5 text-[10px] text-amber-200 truncate px-2">
                              {photo.caption}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* MESSAGE */}
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 block mb-1">
                  Message déposé :
                </span>
                <p className="p-4 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm leading-relaxed italic whitespace-pre-line">
                  "{selectedEntryDetail.message}"
                </p>
              </div>

              {/* ANECDOTE */}
              {selectedEntryDetail.anecdote && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 block mb-1">
                    Souvenir / Anecdote :
                  </span>
                  <p className="p-3 rounded-xl bg-amber-100/50 dark:bg-stone-800/80 border border-amber-200 dark:border-stone-700 text-xs">
                    {selectedEntryDetail.anecdote}
                  </p>
                </div>
              )}

              {/* WISH */}
              {selectedEntryDetail.wish && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 block mb-1">
                    Souhaits pour la retraite :
                  </span>
                  <p className="p-3 rounded-xl bg-yellow-100/50 dark:bg-stone-800/80 border border-yellow-200 dark:border-stone-700 text-xs">
                    {selectedEntryDetail.wish}
                  </p>
                </div>
              )}

              {/* ADMIN ACTION TOOLBAR */}
              <div className="pt-4 border-t border-amber-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTogglePin(selectedEntryDetail.id, !selectedEntryDetail.isPinned)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      selectedEntryDetail.isPinned
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-amber-200 border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{selectedEntryDetail.isPinned ? 'Désépingler' : 'Épingler'}</span>
                  </button>

                  <button
                    onClick={() => onToggleApprove(selectedEntryDetail.id, !selectedEntryDetail.isApproved)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      selectedEntryDetail.isApproved
                        ? 'bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    }`}
                  >
                    {selectedEntryDetail.isApproved ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{selectedEntryDetail.isApproved ? 'Masquer' : 'Rendre visible'}</span>
                  </button>
                </div>

                <button
                  onClick={async () => {
                    if (
                      confirm(
                        `Supprimer définitivement le témoignage de ${selectedEntryDetail.firstName} ${selectedEntryDetail.lastName} ?`
                      )
                    ) {
                      await onDeleteEntry(selectedEntryDetail.id);
                      setSelectedEntryDetail(null);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer ce témoignage</span>
                </button>
              </div>

              {/* METADATA FOOTER */}
              <div className="pt-2 text-center text-xs text-stone-500 dark:text-amber-400/70">
                Déposé le {new Date(selectedEntryDetail.createdAt).toLocaleString('fr-FR')} • Statut :{' '}
                {selectedEntryDetail.isApproved ? '✅ Visible' : '❌ Masqué'}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated PDF Book Generator Modal */}
        <PdfBookModal
          isOpen={isPdfBookModalOpen}
          onClose={() => setIsPdfBookModalOpen(false)}
          entries={entries}
        />
      </div>
    </div>
  );
};
