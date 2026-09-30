// frontend/src/features/vendors/v2/litiges/helpers.ts
// Utilitaires communs aux écrans « Litiges et retours » (VD-07, VD-D08.A01…).
//
// Bridge assumé (endpoints du paquet VD-07 absents du backend actuel — voir
// espace_vendeur_synthese_detail/batch5_VD06-08.md §2.5 et le Lot 6 de
// ESPACE_VENDEUR_BUILD_PLAN.md) :
//   - Pas de total gelé pré-calculé côté serveur : on le recalcule côté
//     client en sommant vendor_escrow_amount des litiges non clos (VD-D08.A01).
//   - Pas de GET /returns/{id} dédié : le détail d'un retour est retrouvé en
//     filtrant la liste vendorsApi.getReturns() par id.
//   - Pas de POST /returns/{id}/inspection ni /replacement : les trois écrans
//     (Inspection, Remplacement) bridgent sur vendorsApi.reviewReturn(id,
//     'APPROVED'|'REJECTED', note) déjà branché côté backend, en consignant le
//     détail (constats, verdict, remède choisi) dans la note texte transmise.
//     Un futur Lot 6 backend doit remplacer ce pont par les vrais endpoints.
//   - Aucune upload de preuve retour n'existe (uploadDisputeEvidence est
//     scopé aux litiges uniquement) : les photos d'inspection restent côté
//     client (validation de présence seulement), volontairement non envoyées
//     plutôt que prétendre les avoir persistées.
//
// Règle produit non négociable reprise ici (ESPACE_VENDEUR_BUILD_PLAN.md) :
// PAS d'arbitrage automatique à l'échéance des 48 h. Toute échéance dépassée
// est présentée comme « présomption en faveur du client — BelivaY décide »,
// jamais comme un remboursement déclenché automatiquement par le système.

import { useEffect, useState } from 'react';
import {
  vendorsApi,
  type VendorDisputeListItem,
  type DisputeStatus,
} from '@/services/api/vendors';
import type { OrderReturn } from '@/services/api/customer';

// ── Formatage ────────────────────────────────────────────────────────────

export function fmtXAF(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} F`;
}

export function fmtDateTime(iso: string | null | undefined, locale: 'fr' | 'en' = 'fr'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

interface CountdownState {
  hours: number;
  minutes: number;
  expired: boolean;
}

/**
 * Compte à rebours dérivé de hours_remaining (déjà calculé côté serveur pour
 * les litiges, VendorDisputeListItem.hours_remaining) — recalculé chaque
 * minute côté client pour l'affichage, jamais Date.now() pendant le rendu.
 */
export function useCountdownFromHours(hoursRemaining: number | null | undefined): CountdownState {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (hoursRemaining === null || hoursRemaining === undefined) {
    return { hours: 0, minutes: 0, expired: true };
  }
  // hoursRemaining est figé au dernier chargement : on ne fait qu'afficher un
  // tick régulier pour que le composant se re-rende (pas de dérive calculée
  // sans re-fetch, on évite d'inventer une précision que l'API ne garantit pas).
  void now;
  const totalMinutes = Math.max(0, Math.round(hoursRemaining * 60));
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    expired: hoursRemaining <= 0,
  };
}

/** Échéance absolue à partir d'un ISO de départ + un nombre d'heures (ex. réception + 48h). */
export function useCountdownFromDeadline(deadlineIso: string | null | undefined): CountdownState {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!deadlineIso) return { hours: 0, minutes: 0, expired: false };
  const diffMs = new Date(deadlineIso).getTime() - nowMs;
  const expired = diffMs <= 0;
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, expired };
}

// ── Litiges — filtres « À répondre / En médiation / Clos » (LIT-xx) ────────

export type DisputeTab = 'to_answer' | 'mediation' | 'closed';

export function disputeTabOf(d: VendorDisputeListItem): DisputeTab {
  const s: DisputeStatus = d.status;
  if (s === 'RESOLVED' || s === 'CLOSED') return 'closed';
  if (s === 'IN_PROGRESS' || d.vendor_replied) return 'mediation';
  return 'to_answer';
}

/** Le litige le plus urgent (délai le plus court, encore à répondre) — seul bouton plein (LIT-04). */
export function mostUrgentDisputeId(disputes: VendorDisputeListItem[]): number | null {
  const toAnswer = disputes
    .filter((d) => disputeTabOf(d) === 'to_answer')
    .sort((a, b) => a.hours_remaining - b.hours_remaining);
  return toAnswer[0]?.id ?? null;
}

/** Total gelé (VD-D08.A01) : somme des montants en escrow des litiges non clos. */
export function frozenTotal(disputes: VendorDisputeListItem[]): number {
  return disputes
    .filter((d) => disputeTabOf(d) !== 'closed')
    .reduce((sum, d) => sum + (d.vendor_escrow_amount || 0), 0);
}

// ── Retours — filtres « À décider / En route / Clos » ──────────────────────

export type ReturnTab = 'to_decide' | 'on_the_way' | 'closed';

export function returnTabOf(r: OrderReturn): ReturnTab {
  switch (r.status) {
    case 'REQUESTED':
    case 'RECEIVED':
      return 'to_decide';
    case 'APPROVED':
    case 'AWAITING_DROPOFF':
      return 'on_the_way';
    default:
      return 'closed'; // REJECTED, REFUNDED, CLOSED_NO_REFUND
  }
}

/** Détail d'un retour — pas de GET /returns/{id} dédié : on filtre la liste déjà chargée. */
export function useReturnById(returnId: number | undefined) {
  const [item, setItem] = useState<OrderReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!returnId) return;
    let cancelled = false;
    // Reste différé : appeler setState de façon synchrone dans le corps de
    // l'effet déclenche des rendus en cascade (react-hooks/set-state-in-effect).
    const resetTimer = setTimeout(() => {
      if (!cancelled) { setLoading(true); setError(null); }
    }, 0);
    vendorsApi.getReturns()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((r) => r.id === returnId) ?? null;
        setItem(found);
      })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(resetTimer); };
  }, [returnId, tick]);

  return { item, loading, error, reload: () => setTick((n) => n + 1) };
}

/** Réseau — REP-04 : « Répondre à un litige demande le réseau ». */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

// ── Décision d'un litige tranché (DCS-01/02) ────────────────────────────────

export type DisputeIssue = 'mediation' | 'won' | 'lost' | 'compromise';

/**
 * Dérive l'issue affichée depuis les champs disponibles (pas de champ
 * `resolution` typé côté API) : comparaison du remboursement arbitré au
 * montant gelé vendeur.
 */
export function disputeIssueOf(status: DisputeStatus, refundAmount: number | null, escrowAmount: number): DisputeIssue {
  if (status !== 'RESOLVED' && status !== 'CLOSED') return 'mediation';
  const refund = refundAmount ?? 0;
  if (refund <= 0) return 'won';
  if (escrowAmount > 0 && refund >= escrowAmount) return 'lost';
  return 'compromise';
}
