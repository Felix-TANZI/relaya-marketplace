// frontend/src/features/vendors/v2/compte/plans/PlansTabs.tsx
// En-tête + barre d'onglets communs aux 2 écrans "Plans & tarifs" — VD-10 §PLN/
// SIM, Fig.6/7/8. Comme pour Trust Score (voir trust-score/TrustScoreTabs.tsx),
// le paquet source ne prévoit qu'UN SEUL écran "Plans & tarifs" avec 2 onglets
// internes ("Les plans" / "Simulateur"), jamais 2 pages séparées avec leur
// propre en-tête. Les 2 routes existantes (/seller/v2/plans, /seller/v2/
// simulateur) restent inchangées : ce composant détermine l'onglet actif
// depuis l'URL courante et navigue entre elles.

import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';

const TABS = [
  { path: '/seller/v2/plans', labelKey: 'sl11_compte.plans_title' },
  { path: '/seller/v2/simulateur', labelKey: 'sl11_compte.sim_tab_label' },
] as const;

export default function PlansTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="pt-1">
      {/* En-tête partagée — toujours "Plans & tarifs", jamais le titre d'un onglet. */}
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
          {t('sl11_compte.plans_header_title')}
        </p>
      </div>

      {/* Barre de 2 onglets — l'actif est déterminé par l'URL, pas par un état local. */}
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
                fontSize: 12.5,
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
