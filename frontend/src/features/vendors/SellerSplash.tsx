// frontend/src/features/vendors/SellerSplash.tsx
// Splash screen espace vendeur BelivaY.
// Affiché au chargement de la page, disparaît en fondu après ~2.2s.

import { useEffect, useState } from 'react';

export default function SellerSplash() {
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Masquer après 2200ms (le temps que React charge et monte le contenu)
    const fadeTimer = setTimeout(() => setDone(true), 2200);

    // Retirer du DOM après la fin du fondu (500ms de transition)
    const hideTimer = setTimeout(() => setHidden(true), 2700);

    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  // Retiré du DOM complètement après le fondu
  if (hidden) return null;

  return (
    <>
      {/* ── STYLES INLINE : pas de dépendance Tailwind pour garantir le rendu ── */}
      <style>{`
        @keyframes blv-splash-fill {
          0%   { width: 0%; }
          60%  { width: 78%; }
          100% { width: 100%; }
        }
        @keyframes blv-splash-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.75; transform: scale(0.97); }
        }
        .blv-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F5F0E8;
          transition: opacity 500ms ease, visibility 500ms ease;
        }
        .blv-splash-overlay.done {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .blv-splash-logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          animation: blv-splash-pulse 1.6s ease-in-out infinite;
        }
        .blv-splash-logo-box {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: #F47920;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
          color: white;
          font-family: 'Poppins', sans-serif;
          flex-shrink: 0;
        }
        .blv-splash-brand {
          font-size: 26px;
          font-weight: 800;
          color: #1A1209;
          font-family: 'Poppins', sans-serif;
          letter-spacing: -0.5px;
        }
        .blv-splash-sub {
          font-size: 12px;
          font-weight: 600;
          color: #7C6E5A;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
          font-family: 'Inter', sans-serif;
        }
        .blv-splash-bar-track {
          width: 160px;
          height: 4px;
          background: #E8E2D9;
          border-radius: 2px;
          overflow: hidden;
        }
        .blv-splash-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #F47920, #FBBF24);
          border-radius: 2px;
          animation: blv-splash-fill 1.8s ease-in-out forwards;
        }
        .blv-splash-txt {
          font-size: 11px;
          color: #B8A898;
          margin-top: 10px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.04em;
        }
      `}</style>

      <div className={`blv-splash-overlay${done ? ' done' : ''}`} role="progressbar" aria-label="Chargement de l'espace vendeur">
        {/* Logo + marque */}
        <div className="blv-splash-logo-wrap">
          <div className="blv-splash-logo-box">B</div>
          <span className="blv-splash-brand">BelivaY</span>
        </div>

        {/* Label espace */}
        <div className="blv-splash-sub">Espace Vendeur</div>

        {/* Barre de progression */}
        <div className="blv-splash-bar-track">
          <div className="blv-splash-bar-fill" />
        </div>

        {/* Texte */}
        <div className="blv-splash-txt">Chargement...</div>
      </div>
    </>
  );
}