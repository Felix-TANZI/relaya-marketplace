// frontend/src/features/catalog/PublicShopPage.tsx
// Anonymat acheteur : plus de page boutique publique.
// La route /boutique/:slug sert uniquement à capter le parrainage (QR vendeur)
// puis redirige vers l'accueil — aucune information vendeur n'est affichée.

import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';

export default function PublicShopPage() {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (slug) {
      try { localStorage.setItem('belivay_ref_shop', slug); } catch { /* ignore */ }
    }
  }, [slug]);

  return <Navigate to="/" replace />;
}