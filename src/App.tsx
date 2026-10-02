import React, { useState, useEffect, useCallback } from 'react';
import { GuestEntry, EntryFormData, AdminStats, GuestPhoto } from './types';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { TeamTribute } from './components/TeamTribute';
import { TestimonialsWall } from './components/TestimonialsWall';
import { GuestDashboardModal } from './components/GuestDashboardModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { JeanMichelVIPModal } from './components/JeanMichelVIPModal';
import { PhotoLightbox } from './components/PhotoLightbox';
import { Footer } from './components/Footer';

export default function App() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [adminEntries, setAdminEntries] = useState<GuestEntry[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  // Auth / Tokens
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [currentGuestEntry, setCurrentGuestEntry] = useState<GuestEntry | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Modals & Lightbox
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isVIPModalOpen, setIsVIPModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState<string>('');
  const [lightboxAuthor, setLightboxAuthor] = useState<string>('');
  const [lightboxPhotos, setLightboxPhotos] = useState<GuestPhoto[]>([]);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState<number>(0);

  // 1. Check guest token & admin token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('guestToken');
    const tokenFromStorage = localStorage.getItem('jean_michel_guest_token');

    const activeToken = tokenFromUrl || tokenFromStorage;
    if (activeToken) {
      setGuestToken(activeToken);
      localStorage.setItem('jean_michel_guest_token', activeToken);
    }

    const savedAdminToken = sessionStorage.getItem('jean_michel_admin_token');
    if (savedAdminToken) {
      setAdminToken(savedAdminToken);
    }
  }, []);

  // 2. Fetch Entries (only guest's own testimonial or all if admin)
  const fetchEntries = useCallback(async () => {
    try {
      const url = guestToken
        ? `/api/entries?guestToken=${encodeURIComponent(guestToken)}&page=1&limit=50`
        : '/api/entries?page=1&limit=50';
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const payload = await res.json();
        setEntries(Array.isArray(payload?.items) ? payload.items : []);
      }
    } catch (err) {
      console.error('Erreur chargement témoignages:', err);
    }
  }, [guestToken, adminToken]);

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 8000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  // 3. Fetch Guest Entry owned by current guest token
  useEffect(() => {
    if (!guestToken) {
      setCurrentGuestEntry(null);
      return;
    }
    async function fetchGuestEntry() {
      try {
        const res = await fetch(`/api/entries/token/${guestToken}`);
        if (res.ok) {
          const data: GuestEntry = await res.json();
          setCurrentGuestEntry(data);
        } else {
          setCurrentGuestEntry(null);
        }
      } catch (err) {
        console.error('Erreur chargement fiche invité:', err);
      }
    }
    fetchGuestEntry();
  }, [guestToken]);

  // 4. Fetch Admin Data if admin authenticated
  const fetchAdminData = useCallback(async (token: string) => {
    try {
      const resEntries = await fetch('/api/admin/entries?page=1&limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resEntries.ok) {
        const payload = await resEntries.json();
        setAdminEntries(Array.isArray(payload?.items) ? payload.items : []);
      }

      const resStats = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setAdminStats(dataStats);
      }
    } catch (err) {
      console.error('Erreur chargement admin:', err);
    }
  }, []);

  useEffect(() => {
    if (adminToken) {
      fetchAdminData(adminToken);
    }
  }, [adminToken, fetchAdminData]);

  // Submit / Update Guest Entry
  const handleSubmitGuestEntry = async (formData: EntryFormData) => {
    const body = {
      ...formData,
      token: guestToken,
    };

    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error('Erreur lors de la sauvegarde');
    }

    const data = await res.json();
    if (data.token) {
      setGuestToken(data.token);
      localStorage.setItem('jean_michel_guest_token', data.token);
      // Update URL search params gracefully
      const newUrl = `${window.location.pathname}?guestToken=${data.token}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }

    if (data.entry) {
      setCurrentGuestEntry(data.entry);
    }

    fetchEntries();
    if (adminToken) fetchAdminData(adminToken);
  };

  // Delete Guest Entry by token
  const handleDeleteGuestEntry = async () => {
    if (!guestToken) return;
    const res = await fetch(`/api/entries/token/${guestToken}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setGuestToken(null);
      setCurrentGuestEntry(null);
      localStorage.removeItem('jean_michel_guest_token');
      const newUrl = window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
      fetchEntries();
      if (adminToken) fetchAdminData(adminToken);
    }
  };

  // Reaction click handler
  const handleReaction = async (id: string, emoji: string) => {
    try {
      const res = await fetch(`/api/entries/${id}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, reactions: data.reactions, likesCount: data.likesCount }
              : e
          )
        );
      }
    } catch (err) {
      console.error('Erreur réaction:', err);
    }
  };

  // Admin Actions
  const handleAdminLogin = async (passcode: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        sessionStorage.setItem('jean_michel_admin_token', data.token);
        fetchAdminData(data.token);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('jean_michel_admin_token');
    setAdminEntries([]);
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isPinned }),
    });

    if (res.ok) {
      fetchEntries();
      fetchAdminData(adminToken);
    }
  };

  const handleToggleApprove = async (id: string, isApproved: boolean) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isApproved }),
    });

    if (res.ok) {
      fetchEntries();
      fetchAdminData(adminToken);
    }
  };

  const handleDeleteEntryByAdmin = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (res.ok) {
      fetchEntries();
      fetchAdminData(adminToken);
    }
  };

  const handleUpdateEntryByAdmin = async (id: string, updateData: Partial<GuestEntry>) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      fetchEntries();
      fetchAdminData(adminToken);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navbar */}
      <Navbar
        onOpenWriter={() => setIsGuestModalOpen(true)}
        onOpenGuestDashboard={() => setIsGuestModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenVIP={() => setIsVIPModalOpen(true)}
        guestToken={guestToken}
        hasAdminToken={Boolean(adminToken)}
      />

      {/* Main Hero Header */}
      <Header
        onOpenWriter={() => setIsGuestModalOpen(true)}
        onOpenVIP={() => setIsVIPModalOpen(true)}
        totalCount={adminStats?.totalEntries || (currentGuestEntry ? 1 : 0)}
        isAdmin={Boolean(adminToken)}
      />

      {/* Team Tribute Section */}
      <TeamTribute />

      {/* Testimonials Wall (Private & Secure for guests, only admin sees all comments) */}
      <TestimonialsWall
        entries={adminEntries.length > 0 ? adminEntries : entries}
        currentGuestToken={guestToken}
        currentGuestEntry={currentGuestEntry}
        isAdmin={Boolean(adminToken)}
        onOpenWriteModal={() => setIsGuestModalOpen(true)}
        onEditEntry={() => setIsGuestModalOpen(true)}
        onDeleteEntry={handleDeleteGuestEntry}
        onReaction={handleReaction}
        onImageClick={(url, caption, author, photos, index) => {
          setLightboxUrl(url);
          setLightboxCaption(caption || '');
          setLightboxAuthor(author || '');
          setLightboxPhotos(photos || []);
          setLightboxInitialIndex(index ?? 0);
        }}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
      />

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenVIP={() => setIsVIPModalOpen(true)}
      />

      {/* Guest Dashboard / Write Modal */}
      <GuestDashboardModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSubmit={handleSubmitGuestEntry}
        onDelete={handleDeleteGuestEntry}
        existingEntry={currentGuestEntry}
        guestToken={guestToken}
      />

      {/* Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        adminToken={adminToken}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        entries={adminEntries.length > 0 ? adminEntries : entries}
        stats={adminStats}
        onTogglePin={handleTogglePin}
        onToggleApprove={handleToggleApprove}
        onDeleteEntry={handleDeleteEntryByAdmin}
        onUpdateEntryByAdmin={handleUpdateEntryByAdmin}
        onImageClick={(url, caption, author, photos, index) => {
          setLightboxUrl(url);
          setLightboxCaption(caption || '');
          setLightboxAuthor(author || '');
          setLightboxPhotos(photos || []);
          setLightboxInitialIndex(index ?? 0);
        }}
      />

      {/* Jean-Michel VIP Presentation Modal */}
      <JeanMichelVIPModal
        isOpen={isVIPModalOpen}
        onClose={() => setIsVIPModalOpen(false)}
        entries={adminEntries.length > 0 ? adminEntries : entries}
      />

      {/* Photo Lightbox */}
      <PhotoLightbox
        url={lightboxUrl}
        caption={lightboxCaption}
        authorName={lightboxAuthor}
        photos={lightboxPhotos}
        initialIndex={lightboxInitialIndex}
        onClose={() => {
          setLightboxUrl(null);
          setLightboxCaption('');
          setLightboxAuthor('');
          setLightboxPhotos([]);
          setLightboxInitialIndex(0);
        }}
      />
    </div>
  );
}
