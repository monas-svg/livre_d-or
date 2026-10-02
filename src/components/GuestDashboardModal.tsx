import React, { useState, useEffect, useRef } from 'react';
import { GuestEntry, EntryFormData, CardStyle, RelationshipType, GuestPhoto, getEntryPhotos } from '../types';
import { X, Save, Trash2, Copy, Check, Upload, RefreshCw, Plus, Images, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GuestDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: EntryFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  existingEntry?: GuestEntry | null;
  guestToken: string | null;
}

// Client-side image resize helper to keep multiple photos lightweight & performant
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxDimension = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const GuestDashboardModal: React.FC<GuestDashboardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  existingEntry,
  guestToken,
}) => {
  const [formData, setFormData] = useState<EntryFormData>({
    firstName: '',
    lastName: '',
    email: '',
    relationship: 'Collègue',
    yearsKnown: 'Plusieurs années',
    message: '',
    photoUrl: '',
    photoCaption: '',
    photos: [],
    cardStyle: 'polaroid',
  });

  const [photosList, setPhotosList] = useState<GuestPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingEntry) {
      const initialPhotos = getEntryPhotos(existingEntry);
      setPhotosList(initialPhotos);
      setFormData({
        firstName: existingEntry.firstName || '',
        lastName: existingEntry.lastName || '',
        email: existingEntry.email || '',
        relationship: existingEntry.relationship || 'Collègue',
        yearsKnown: existingEntry.yearsKnown || '',
        message: existingEntry.message || '',
        photoUrl: existingEntry.photoUrl || (initialPhotos[0]?.url || ''),
        photoCaption: existingEntry.photoCaption || (initialPhotos[0]?.caption || ''),
        photos: initialPhotos,
        cardStyle: existingEntry.cardStyle || 'polaroid',
      });
    } else {
      setPhotosList([]);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        relationship: 'Collègue',
        yearsKnown: '',
        message: '',
        photoUrl: '',
        photoCaption: '',
        photos: [],
        cardStyle: 'polaroid',
      });
    }
  }, [existingEntry, isOpen]);

  if (!isOpen) return null;

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    // Check max limit (allow up to 12 photos)
    const currentCount = photosList.length;
    if (currentCount + fileArray.length > 15) {
      alert('Vous pouvez ajouter jusqu\'à 15 photos au total par témoignage.');
      return;
    }

    setProcessingPhotos(true);
    try {
      const newPhotos: GuestPhoto[] = [];
      for (const file of fileArray) {
        if (file.size > 15 * 1024 * 1024) {
          alert(`Le fichier ${file.name} dépasse 15 Mo et a été ignoré.`);
          continue;
        }
        const dataUrl = await processImageFile(file);
        newPhotos.push({
          id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          url: dataUrl,
          caption: '',
        });
      }

      const updated = [...photosList, ...newPhotos];
      setPhotosList(updated);
      setFormData((prev) => ({
        ...prev,
        photos: updated,
        photoUrl: updated[0]?.url || '',
        photoCaption: updated[0]?.caption || '',
      }));
    } catch (err) {
      console.error(err);
      alert('Une erreur est survenue lors du chargement des images.');
    } finally {
      setProcessingPhotos(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photosList.filter((_, i) => i !== index);
    setPhotosList(updated);
    setFormData((prev) => ({
      ...prev,
      photos: updated,
      photoUrl: updated[0]?.url || '',
      photoCaption: updated[0]?.caption || '',
    }));
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updated = [...photosList];
    updated[index] = { ...updated[index], caption };
    setPhotosList(updated);
    setFormData((prev) => ({
      ...prev,
      photos: updated,
      photoUrl: updated[0]?.url || '',
      photoCaption: updated[0]?.caption || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.message) {
      alert('Veuillez renseigner votre Nom, Prénom et votre message de témoignage.');
      return;
    }

    setLoading(true);
    try {
      const submissionData: EntryFormData = {
        ...formData,
        photos: photosList,
        photoUrl: photosList[0]?.url || '',
        photoCaption: photosList[0]?.caption || '',
      };
      await onSubmit(submissionData);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement de votre témoignage.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const link = window.location.origin + (guestToken ? `?guestToken=${guestToken}` : '');
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-4 sm:my-8 bg-amber-50 dark:bg-stone-900 border border-amber-300 dark:border-amber-800/60 rounded-3xl shadow-2xl overflow-hidden text-stone-800 dark:text-amber-100 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-900 via-stone-900 to-stone-900 text-amber-100 flex items-center justify-between border-b border-amber-700/40 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xl">
              ✍️
            </span>
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-amber-100">
                {existingEntry ? 'Mon Espace Invité — Modifier mon hommage' : 'Rédiger mon hommage pour Feu Sa Majesté Ibrahim Mbombo Njoya'}
              </h3>
              <p className="text-xs text-amber-300/80">
                Partagez vos vœux de retraite et ajoutez vos photos de souvenirs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-800 text-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
          {/* Identity Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1.5">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Ex: Sophie"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1.5">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Ex: Bernard"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Message textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1.5">
              Votre mot doux & message principal pour Feu Sa Majesté Ibrahim Mbombo Njoya *
            </label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Feu Sa Majesté Ibrahim Mbombo Njoya, votre mémoire restera gravée dans nos cœurs..."
              className="w-full p-4 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm leading-relaxed focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* ============================================================ */}
          {/* MULTI-PHOTOS UPLOAD SECTION                                  */}
          {/* ============================================================ */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  Photos de souvenirs (Optionnel — Plusieurs photos autorisées)
                </label>
                <p className="text-[11px] text-stone-500 dark:text-amber-300/70">
                  Vous pouvez sélectionner ou glisser-déposer plusieurs photos à la fois (repas d'équipe, événements, collègues...).
                </p>
              </div>
              {photosList.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-500/30">
                  {photosList.length} {photosList.length > 1 ? 'photos ajoutées' : 'photo ajoutée'}
                </span>
              )}
            </div>

            {/* Hidden multi-file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesSelected(e.target.files);
                }
              }}
              className="hidden"
            />

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left ${
                isDraggingOver
                  ? 'border-amber-500 bg-amber-100/80 dark:bg-amber-950/50 scale-[1.01]'
                  : 'border-amber-300/80 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-400 bg-white/60 dark:bg-stone-800/60'
              }`}
            >
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                {processingPhotos ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                ) : (
                  <Images className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-amber-100">
                  {processingPhotos
                    ? 'Optimisation et chargement des photos en cours...'
                    : 'Cliquez pour choisir plusieurs photos ou glissez-déposez-les ici'}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-amber-300/60 mt-0.5">
                  Formats acceptés : JPG, PNG, WEBP, GIF · Sélection multiple possible
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Parcourir</span>
              </button>
            </div>

            {/* List of uploaded photos with captions */}
            {photosList.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photosList.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      className="p-3 rounded-2xl bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 flex flex-col gap-2.5 shadow-sm hover:shadow transition-shadow relative group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail */}
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-950 border border-amber-400/40 shrink-0">
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-stone-900/85 text-amber-300 font-mono text-[9px] font-bold rounded">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Caption input */}
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">
                            Légende photo #{index + 1}
                          </label>
                          <input
                            type="text"
                            value={photo.caption || ''}
                            onChange={(e) => handleCaptionChange(index, e.target.value)}
                            placeholder="Ex: Séminaire d'été 2022..."
                            className="w-full px-3 py-1.5 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 hover:text-red-700 transition-colors self-start"
                          title="Supprimer cette photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/80 dark:bg-stone-800 border border-amber-300/60 dark:border-stone-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter d'autres photos</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Personal guest token link info box */}
          {guestToken && (
            <div className="p-4 rounded-2xl bg-amber-100/70 dark:bg-stone-800/80 border border-amber-300/80 dark:border-amber-700/60 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200">
                <span>🔑 Votre lien d'accès invité personnel :</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 text-amber-900 dark:text-amber-200 font-medium transition-colors flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copié !' : 'Copier mon lien'}</span>
                </button>
              </div>
              <p className="text-stone-600 dark:text-amber-300/70">
                Conservez ce lien pour revenir modifier votre message ou vos photos à tout moment depuis n'importe quel appareil.
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between gap-4 flex-wrap">
            {existingEntry && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer définitivement votre message ?')) {
                    await onDelete();
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Supprimer mon message</span>
              </button>
            )}

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-amber-200 text-xs sm:text-sm font-medium transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={loading || processingPhotos}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{existingEntry ? 'Enregistrer les modifications' : 'Publier mon témoignage'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
