export type CardStyle = 'polaroid' | 'parchment' | 'gold' | 'sticky' | 'modern' | 'typewriter';

export type RelationshipType =
  | 'Collègue'
  | 'Ami'
  | 'Direction'
  | 'Membre de l\'équipe'
  | 'Ancien collègue'
  | 'Partenaire'
  | 'Famille'
  | 'Autre';

export interface GuestPhoto {
  id?: string;
  url: string;
  caption?: string;
}

export interface GuestEntry {
  id: string;
  token: string;
  firstName: string;
  lastName: string;
  email?: string;
  relationship: RelationshipType;
  yearsKnown?: string;
  message: string;
  anecdote?: string;
  wish?: string;
  photoUrl?: string;
  photoCaption?: string;
  photos?: GuestPhoto[];
  cardStyle: CardStyle;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  isPinned: boolean;
  isApproved: boolean;
  reactions: Record<string, number>;
}

export interface AdminStats {
  totalEntries: number;
  totalPhotos: number;
  totalLikes: number;
  relationshipsCount: Record<string, number>;
}

export interface EntryFormData {
  firstName: string;
  lastName: string;
  email?: string;
  relationship: RelationshipType;
  yearsKnown?: string;
  message: string;
  anecdote?: string;
  wish?: string;
  photoUrl?: string;
  photoCaption?: string;
  photos?: GuestPhoto[];
  cardStyle: CardStyle;
}

export function getEntryPhotos(entry?: {
  photos?: GuestPhoto[];
  photoUrl?: string;
  photoCaption?: string;
} | null): GuestPhoto[] {
  if (!entry) return [];
  if (entry.photos && entry.photos.length > 0) {
    return entry.photos.filter((p) => Boolean(p && p.url && p.url.trim() !== ''));
  }
  if (entry.photoUrl && entry.photoUrl.trim() !== '') {
    return [{ id: 'legacy-photo-0', url: entry.photoUrl, caption: entry.photoCaption || '' }];
  }
  return [];
}
