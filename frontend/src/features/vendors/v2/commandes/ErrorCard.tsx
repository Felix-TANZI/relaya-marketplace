// frontend/src/features/vendors/v2/commandes/ErrorCard.tsx
// Composant générique ERR-01 (VD-06 §1.3/1.6) : titre, 1-2 lignes, un seul
// bouton, un lien facultatif, "Pourquoi ?" replié. Rouge = bloquant, ambre =
// temporaire, encre = information. Les 6 cas de la remise sont décrits dans
// HANDOVER_ERROR_CASES ; seuls ceux détectables avec les données déjà
// exposées par vendorsApi sont réellement déclenchés par HandoverPage (voir
// commentaire sur chaque cas ci-dessous) — les autres restent un registre prêt
// à brancher dès que le backend exposera le bon champ.

import type { ReactNode } from 'react';
import { AlertTriangle, Ban, Clock, PackageX, WifiOff, Gem } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VendorPalette } from '../theme';
import { Collapsible } from './ui';

export type ErrorTone = 'red' | 'amber' | 'muted';

export interface ErrorCardProps {
  tone: ErrorTone;
  icon: ReactNode;
  title: string;
  detail: string;
  actionLabel: string;
  onAction?: () => void;
  why?: string;
  p: VendorPalette;
}

export function ErrorCard({ tone, icon, title, detail, actionLabel, onAction, why, p }: ErrorCardProps) {
  const { t } = useTranslation();
  const c = tone === 'red' ? p.red : tone === 'amber' ? p.amber : p.textMuted;
  return (
    <div className="rounded-2xl p-4" style={{ background: `${c}14`, border: `1px solid ${c}44` }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c}26`, color: c }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{title}</p>
          <p style={{ fontSize: 12.5, color: p.textMuted, marginTop: 2, lineHeight: 1.4 }}>{detail}</p>
        </div>
      </div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="w-full rounded-xl font-bold text-white mt-3"
          style={{ background: c, padding: '11px 14px', fontSize: 13, minHeight: 44 }}
        >
          {actionLabel}
        </button>
      ) : null}
      {why ? (
        <div className="mt-2">
          <Collapsible title={t('sl7_commandes.why')} p={p}>{why}</Collapsible>
        </div>
      ) : null}
    </div>
  );
}

/** Registre des 6 cas d'erreur à la remise (VD-06 §1.6) — icônes + gravité. */
export const HANDOVER_ERROR_CASES = [
  { key: 'courier_absent', tone: 'amber' as ErrorTone, icon: <Clock size={17} /> }, // E9 — réel : créneau dépassé sans passage
  { key: 'code_blocked', tone: 'red' as ErrorTone, icon: <Ban size={17} /> }, // E6 — référence : pas de champ "lockout" exposé côté vendeur aujourd'hui
  { key: 'order_cancelled', tone: 'amber' as ErrorTone, icon: <PackageX size={17} /> }, // V11 — réel : fulfillment_status === 'CANCELLED'
  { key: 'deadline_passed', tone: 'red' as ErrorTone, icon: <AlertTriangle size={17} /> }, // C3 — réel : compte à rebours dépassé
  { key: 'offline', tone: 'amber' as ErrorTone, icon: <WifiOff size={17} /> }, // V01 — réel : navigator.onLine === false
  { key: 'value_cap', tone: 'muted' as ErrorTone, icon: <Gem size={17} /> }, // E8 — référence : plafond livreur non exposé côté vendeur aujourd'hui
] as const;

export type HandoverErrorKey = (typeof HANDOVER_ERROR_CASES)[number]['key'];
