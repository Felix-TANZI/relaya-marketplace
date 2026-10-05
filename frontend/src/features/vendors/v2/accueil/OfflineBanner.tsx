// frontend/src/features/vendors/v2/accueil/OfflineBanner.tsx
// Bandeau "Pas de connexion" (OFF-01). Le cache chiffré + la file d'actions
// signées (VD-D05.A17 : service worker, IndexedDB, expiration 72 h) ne sont
// pas construits : ce bandeau montre les données déjà chargées en mémoire
// (lastLoadedAt) plutôt qu'un vrai cache persistant — écart documenté dans le
// rapport final.
//
// Ce fichier porte aussi les pièces manquantes du mockup HorsLigne.html :
//
// - OfflineSyncInfoBanner : second bandeau explicatif, texte seul (OFF-écart).
//
// - HandoverSyncCard : carte "Code de remise" du mockup. Important — ce
//   n'est PAS la même file que frontend/src/lib/evidenceQueue.ts (vérifié
//   avant d'écrire ce composant) : evidenceQueue sert au livreur à mettre en
//   file des PHOTOS de preuve (Blob/FormData vers /shipping/.../evidence/),
//   un domaine et une forme de donnée entièrement différents du vendeur qui
//   consulte un code de remise déjà en texte. Aucune file d'actions vendeur
//   n'existe nulle part dans le code (ni IndexedDB ni service worker), et en
//   reconstruire une ici pour ce seul lot serait le sous-système "genuinely
//   large" que la consigne du lot autorise explicitement à ne pas bâtir :
//   la carte est donc honnêtement rendue avec un compteur et un journal
//   vides (aucune action fabriquée) plutôt que simulés. Le bouton "Code de
//   remise" sur les cartes "à préparer" (TodoRowCard/HeroCard), lui, est
//   entièrement réel : il ouvre commandes/HandoverPage.tsx, qui lit
//   shipment.pickup_confirmation_code déjà en cache local (REM-05) — aucun
//   réseau requis pour l'afficher.

import { useState } from 'react';
import { ChevronDown, RefreshCw, WifiOff } from 'lucide-react';
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

/** Second bandeau — précise ce qui fonctionne vraiment hors connexion (lecture
 * de données déjà en cache), par opposition aux actions qui exigent un
 * aller-retour serveur (voir offline_how_rule_3 plus bas). */
export function OfflineSyncInfoBanner() {
  const { t } = useTranslation();
  const p = DARK;

  return (
    <div
      className="rounded-2xl px-3.5 py-3 mb-4"
      style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}
    >
      <p style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.4 }}>{t('sl6_accueil.offline_sync_info')}</p>
    </div>
  );
}

/** Carte "Code de remise" (file de synchronisation) — compteur et journal
 * honnêtement vides, voir commentaire d'en-tête du fichier. `onRetry` réutilise
 * le même rechargement que le bandeau principal (seule action de "retry"
 * réelle disponible aujourd'hui). */
export function HandoverSyncCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const p = DARK;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  // Pas de file réelle (voir en-tête) : tableau vide assumé, prêt à recevoir
  // de vraies entrées le jour où une file d'actions vendeur existera.
  const pendingActions: { id: string; label: string; at: string }[] = [];

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl6_accueil.offline_sync_card_title')}</p>
        <button type="button" onClick={onRetry} className="font-semibold flex items-center gap-1 flex-shrink-0" style={{ fontSize: 12, color: p.orange, minHeight: 44 }}>
          <RefreshCw size={13} />
          {t('sl6_accueil.offline_sync_card_retry')}
        </button>
      </div>
      <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>
        {pendingActions.length > 0
          ? t('sl6_accueil.offline_sync_card_count', { count: pendingActions.length })
          : t('sl6_accueil.offline_sync_card_count_zero')}
      </p>

      <button
        type="button"
        onClick={() => setDetailsOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-xl mb-2"
        style={{ padding: '10px 12px', minHeight: 44, background: p.cardAlt }}
      >
        <span className="font-semibold" style={{ fontSize: 12, color: p.text }}>{t('sl6_accueil.offline_sync_card_details')}</span>
        <ChevronDown size={15} color={p.textMuted} style={{ transform: detailsOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {detailsOpen ? (
        <div className="mb-3 px-1">
          {pendingActions.length === 0 ? (
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl6_accueil.offline_sync_card_log_empty')}</p>
          ) : (
            <ul className="space-y-1.5 list-none">
              {pendingActions.map((a) => (
                <li key={a.id} className="flex items-center justify-between" style={{ fontSize: 11.5, color: p.textMuted }}>
                  <span>{a.label}</span>
                  <span>{formatClockTime(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="rounded-xl p-3 mb-3" style={{ background: `${p.amber}1F` }}>
        <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.4 }}>{t('sl6_accueil.offline_sync_card_expiry_warning')}</p>
      </div>

      <button
        type="button"
        onClick={() => setHowOpen((o) => !o)}
        className="w-full flex items-center justify-between"
        style={{ minHeight: 44 }}
      >
        <span className="font-semibold" style={{ fontSize: 12, color: p.orange }}>{t('sl6_accueil.tier_how_it_works')}</span>
        <ChevronDown size={15} color={p.orange} style={{ transform: howOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {howOpen ? (
        <ul className="mt-2 space-y-1.5 list-none" style={{ fontSize: 11.5, color: p.textMuted, lineHeight: 1.4 }}>
          <li>• {t('sl6_accueil.offline_how_rule_1')}</li>
          <li>• {t('sl6_accueil.offline_how_rule_2')}</li>
          <li>• {t('sl6_accueil.offline_how_rule_3')}</li>
        </ul>
      ) : null}
    </div>
  );
}
