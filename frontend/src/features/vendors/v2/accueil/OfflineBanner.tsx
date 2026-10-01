// frontend/src/features/vendors/v2/accueil/OfflineBanner.tsx
// Bandeau "Pas de connexion" (OFF-01). Le cache chiffré + la file d'actions
// signées (VD-D05.A17 : service worker, IndexedDB, expiration 72 h) ne sont
// pas construits : ce bandeau montre les données déjà chargées en mémoire
// (lastLoadedAt) plutôt qu'un vrai cache persistant — écart documenté dans le
// rapport final.

import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DARK } from '../theme';
import { formatClockTime } from './format';

export default function OfflineBanner({ lastLoadedAt, onRetry }: { lastLoadedAt: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  const p = DARK;

  return (
    <div
      className="rounded-2xl px-3.5 py-3 mb-4 flex items-center justify-between gap-2"
      style={{ background: p.card, border: `1px solid ${p.border}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff size={16} color={p.amber} />
        <span className="font-semibold truncate" style={{ fontSize: 12.5, color: p.text }}>
          {lastLoadedAt
            ? t('sl6_accueil.offline_banner', { time: formatClockTime(lastLoadedAt) })
            : t('sl6_accueil.offline_banner_no_data')}
        </span>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="font-semibold flex-shrink-0"
        style={{ fontSize: 12, color: p.orange, minHeight: 44, padding: '0 4px' }}
      >
        {t('sl6_accueil.offline_retry')}
      </button>
    </div>
  );
}
