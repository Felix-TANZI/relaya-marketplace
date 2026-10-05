// frontend/src/features/vendors/v2/accueil/ShopStatusBar.tsx
// Carte d'une ligne "Boutique ouverte" (ACC-06) + état "Fermée aujourd'hui"
// (mockup FermeAujourdhui.html, écart comblé ici). Toujours pas d'endpoint
// réel pour fermer la boutique le jour même : VendorProfile n'expose que
// `closed_days` (jours de fermeture hebdomadaire récurrents, utilisés en
// interne par business_hours.py pour les délais de préparation) et ce champ
// n'est même pas renvoyé par VendorProfileSerializer au frontend — vérifié à
// nouveau pour ce lot, toujours aucun POST /shop/closed-today ni
// POST /shop/reopen (VD-11).
//
// Faute d'endpoint, "Fermer aujourd'hui"/"Rouvrir maintenant" ne persistent
// rien : ils basculent un état purement local (pas de rechargement, pas
// d'appel réseau) pour que l'écran soit démontrable dans ses deux états, et
// préviennent par toast que l'action n'est pas encore reliée au serveur —
// même logique honnête que l'ancien "Bientôt disponible", mais qui ne
// bloquait pas l'affichage de l'état fermé pour autant (il n'existait pas du
// tout avant ce lot).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { palette } from '../theme';

interface Props {
  /** Nombre de commandes déjà reçues encore à préparer (state.todos filtré
   * "prepare" dans AccueilPage) — sert la phrase "Les N commandes déjà
   * reçues restent à préparer" du bandeau de fermeture. */
  prepareCount?: number;
}

export default function ShopStatusBar({ prepareCount = 0 }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const p = palette(theme);
  // État purement local et non persisté — voir commentaire d'en-tête.
  const [closedToday, setClosedToday] = useState(false);

  const handleClose = () => {
    showToast(t('sl6_accueil.shop_close_toast'), 'info');
    setClosedToday(true);
  };

  const handleReopen = () => {
    showToast(t('sl6_accueil.shop_reopen_toast'), 'info');
    setClosedToday(false);
  };

  return (
    <div className="mb-4">
      <div
        className="rounded-2xl px-3.5 py-3 flex items-center justify-between gap-2"
        style={{ background: p.card, border: `1px solid ${p.border}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="rounded-full flex-shrink-0"
            style={{ width: 8, height: 8, background: closedToday ? p.amber : p.green }}
          />
          <span className="font-semibold truncate" style={{ fontSize: 13, color: p.text }}>
            {closedToday ? t('sl6_accueil.shop_closed_today') : t('sl6_accueil.shop_open')}
          </span>
        </div>
        {!closedToday ? (
          <button
            type="button"
            onClick={handleClose}
            className="font-semibold flex-shrink-0"
            style={{ fontSize: 12, color: p.textMuted, minHeight: 44, padding: '0 4px' }}
          >
            {t('sl6_accueil.shop_close_today')}
          </button>
        ) : null}
      </div>

      {closedToday ? (
        <div
          className="rounded-2xl p-4 mt-3"
          style={{ background: theme === 'dark' ? 'rgba(240,192,76,0.08)' : '#FFFBEB', border: `1px solid ${p.amber}` }}
        >
          <p className="font-bold mb-1.5" style={{ fontSize: 13.5, color: p.text }}>
            {t('sl6_accueil.shop_closed_banner_title')}
          </p>
          <p className="mb-3" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
            {prepareCount > 0
              ? t('sl6_accueil.shop_closed_banner_body', { count: prepareCount })
              : t('sl6_accueil.shop_closed_banner_body_zero')}
          </p>
          <button
            type="button"
            onClick={handleReopen}
            className="w-full rounded-xl font-bold"
            style={{ minHeight: 44, fontSize: 13, color: '#fff', background: p.amber }}
          >
            {t('sl6_accueil.shop_reopen_now')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
