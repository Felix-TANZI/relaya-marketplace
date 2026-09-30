// frontend/src/features/vendors/v2/compte/trust-score/TrustScoreTabs.tsx
// En-tête + barre d'onglets communs aux 3 écrans Trust Score — VD-10 §PAL/SCO/
// PAL-04, Fig.1/2/3. Le paquet source ne prévoit qu'UN SEUL écran "Trust Score"
// avec 3 onglets internes ("Mon palier" / "Mon score" / "Les paliers"), visibles
// ensemble sous l'en-tête et cliquables sans recharger toute la page — jamais
// 3 pages séparées avec leur propre en-tête. Les 3 routes existantes
// (/seller/v2/palier, /seller/v2/score, /seller/v2/paliers) restent inchangées :
// ce composant se contente de déterminer l'onglet actif depuis l'URL courante
// et de naviguer entre elles.

import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';

const TABS = [
  { path: '/seller/v2/palier', labelKey: 'sl11_compte.palier_title' },
  { path: '/seller/v2/score', labelKey: 'sl11_compte.score_title' },
  { path: '/seller/v2/paliers', labelKey: 'sl11_compte.tiers_title' },
] as const;

export default function TrustScoreTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="pt-1">
      {/* En-tête partagée — toujours "Trust Score", jamais le titre d'un onglet (Palier.jpg). */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex items-center justify-center rounded-full flex-shrink-0 active:scale-95 transition-transform"
          style={{ width: 36, height: 36, background: p.card, border: `1px solid ${p.border}` }}
        >
          <ChevronLeft size={19} color={p.text} />
        </button>
        {/* Pas un <h1> : le vrai titre de page est celui, spécifique à l'onglet, affiché juste en dessous. */}
        <p className="font-black truncate" style={{ fontSize: 17, color: p.text }}>
          {t('sl11_compte.trust_score_label')}
        </p>
      </div>

      {/* Barre de 3 onglets — l'actif est déterminé par l'URL, pas par un état local. */}
      <div className="flex rounded-full p-1 mb-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
        {TABS.map((tab) => {
          const active = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className="flex-1 rounded-full font-bold transition-colors"
              style={{
                padding: '9px 6px',
                fontSize: 12,
                background: active ? p.card : 'transparent',
                color: active ? p.text : p.textMuted,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined,
              }}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
