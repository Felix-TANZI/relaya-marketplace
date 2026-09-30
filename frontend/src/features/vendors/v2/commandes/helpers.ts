// frontend/src/features/vendors/v2/commandes/helpers.ts
// Utilitaires communs à l'espace « Commandes » (VD-05 Commandes et préparation,
// VD-06 Remise/reçu/erreurs). Bridge assumé : les endpoints dédiés du paquet
// (GET /orders?state=, GET /orders/{id}/slip, /journal, /handover-code,
// /receipt, POST /orders/{id}/stockout, /extend) n'existent pas encore côté
// backend — tout ici dérive de vendorsApi.getOrders/getOrderDetail/
// updateFulfillmentStatus (voir commentaires ligne à ligne plus bas).

import { useEffect, useState } from 'react';
import { vendorsApi, type VendorOrder, type FulfillmentStatus, type VendorProfile } from '@/services/api/vendors';

// ── États et regroupements (CMD-01, VD-05 §3.3) ─────────────────────────────

export type OrderState =
  | 'paid'
  | 'to_prepare'
  | 'with_courier'
  | 'delivered'
  | 'dispute_frozen'
  | 'cancelled';

export type OrderBucket = 'prep' | 'in_progress' | 'done' | 'problems';

/** Dérive l'un des 8 libellés d'état VD-05 depuis fulfillment_status/escrow_status. */
export function orderStateOf(order: VendorOrder): OrderState {
  if (order.fulfillment_status === 'DISPUTED' || order.escrow_status === 'DISPUTED') return 'dispute_frozen';
  if (order.fulfillment_status === 'CANCELLED') return 'cancelled';
  switch (order.fulfillment_status) {
    case 'PAID_IN_ESCROW':
      return 'paid';
    case 'VENDOR_ACKNOWLEDGED':
    case 'PREPARING':
      return 'to_prepare';
    case 'READY_FOR_PICKUP':
    case 'DRIVER_ASSIGNED':
    case 'PICKED_UP':
    case 'OUT_FOR_DELIVERY':
      return 'with_courier';
    case 'DELIVERED':
    case 'BUYER_CONFIRMED':
    case 'AUTO_CONFIRMED':
    case 'RELEASED_TO_VENDOR':
      return 'delivered';
    default:
      return 'paid';
  }
}

/** Regroupe pour les 4 filtres CMD-01 : À préparer / En cours / Terminées / Problèmes. */
export function bucketOf(order: VendorOrder): OrderBucket {
  const s = orderStateOf(order);
  if (s === 'dispute_frozen') return 'problems';
  if (s === 'paid' || s === 'to_prepare') return 'prep';
  if (s === 'with_courier') return 'in_progress';
  return 'done'; // delivered, cancelled
}

// ── Argent (bridge : pas de money_state/payout_ref dédié, approximé) ────────

export type MoneyState = 'frozen' | 'releasing' | 'to_pay' | 'paid';

export function moneyStateOf(order: VendorOrder): MoneyState {
  if (order.escrow_status === 'DISPUTED' || order.escrow_status === 'BLOCKED') return 'frozen';
  if (order.escrow_status === 'RELEASE_PENDING') return 'releasing';
  if (order.escrow_status === 'RELEASED') return 'to_pay';
  return 'frozen';
}

// ── Formatage ────────────────────────────────────────────────────────────

export function fmtXAF(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} F`;
}

export function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** "2 h 54" à partir d'une durée en ms (valeur absolue). */
export function fmtDurationShort(ms: number): string {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  if (h <= 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

interface CountdownState {
  ms: number | null;
  overdue: boolean;
}

/**
 * Compte à rebours recalculé chaque minute — jamais Date.now() pendant le
 * rendu. Le premier calcul est différé d'un setTimeout(0) : appeler
 * setState() de façon synchrone dans le corps de l'effet déclenche des rendus
 * en cascade (règle react-hooks/set-state-in-effect) — même convention que
 * SellerShopPage.tsx (setState uniquement dans des callbacks différés).
 */
export function useCountdown(deadlineIso: string | null | undefined): CountdownState {
  const [state, setState] = useState<CountdownState>({ ms: null, overdue: false });
  useEffect(() => {
    let cancelled = false;
    if (!deadlineIso) {
      const resetId = window.setTimeout(() => { if (!cancelled) setState({ ms: null, overdue: false }); }, 0);
      return () => { cancelled = true; window.clearTimeout(resetId); };
    }
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => {
      if (cancelled) return;
      const diff = deadline - Date.now();
      setState({ ms: diff, overdue: diff <= 0 });
    };
    const firstId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 60_000);
    return () => { cancelled = true; window.clearTimeout(firstId); window.clearInterval(intervalId); };
  }, [deadlineIso]);
  return state;
}

/** Barre de progression réelle (PRE-04) : (maintenant − début) ÷ (échéance − début). */
export function progressRatio(startIso: string, dueIso: string | null | undefined): number {
  if (!dueIso) return 0;
  const start = new Date(startIso).getTime();
  const due = new Date(dueIso).getTime();
  if (due <= start) return 1;
  const ratio = (Date.now() - start) / (due - start);
  return Math.min(1, Math.max(0, ratio));
}

// ── Chargement d'une commande (partagé par tous les écrans de détail) ──────

interface UseOrderState {
  order: VendorOrder | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Charge une commande par id ; reload() permet de rafraîchir après une action.
 * Les setState de remise à zéro sont différés d'un setTimeout(0) pour éviter
 * les rendus en cascade dans l'effet (react-hooks/set-state-in-effect).
 */
export function useOrder(orderId: number | undefined): UseOrderState {
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const resetId = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    }, 0);
    vendorsApi.getOrderDetail(orderId)
      .then((o) => { if (!cancelled) setOrder(o); })
      .catch((e) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(resetId); };
  }, [orderId, tick]);

  return { order, loading, error, reload: () => setTick((n) => n + 1) };
}

/** Résumé "1er article + n autres" pour une carte commande. */
export function itemsSummary(order: VendorOrder): { title: string; extra: number; qty: number; imageUrl: string | null } {
  const first = order.items[0];
  return {
    title: first ? first.product_title : '—',
    extra: Math.max(0, order.items.length - 1),
    qty: first ? first.qty : 0,
    imageUrl: first?.product_image ?? null,
  };
}

/**
 * Libellé d'état affichable (CMD-01/CMD-09) — jamais le texte brut de l'API
 * (`fulfillment_status_display` renvoie encore "Escrow bloqué" côté v1, un mot
 * banni par GEN-11). Clé i18n à résoudre par l'appelant : `sl7_commandes.pill_*`.
 */
export function pillLabelKeyOf(order: VendorOrder): string {
  const s = orderStateOf(order);
  if (order.fulfillment_status === 'CANCELLED') return 'sl7_commandes.pill_cancelled';
  if (s === 'dispute_frozen') return 'sl7_commandes.pill_problem';
  if (order.payment_status !== 'PAID' && order.can_be_fulfilled) return 'sl7_commandes.pill_counter';
  switch (s) {
    case 'paid': return 'sl7_commandes.pill_paid';
    case 'to_prepare': return 'sl7_commandes.pill_to_prepare';
    case 'with_courier': return 'sl7_commandes.pill_with_courier';
    case 'delivered': return 'sl7_commandes.pill_delivered';
    default: return 'sl7_commandes.pill_paid';
  }
}

// ── Actions bridgées sur vendorsApi (pas d'endpoint dédié VD-05/06) ─────────

/**
 * "C'est prêt" (PRE-01) : VD-05 attend un seul POST /orders/{id}/ready.
 * En son absence, on rejoue la chaîne de transitions déjà supportée par le
 * backend (PAID_IN_ESCROW → VENDOR_ACKNOWLEDGED → PREPARING → READY_FOR_PICKUP).
 */
export async function markOrderReady(orderId: number, current: FulfillmentStatus): Promise<VendorOrder> {
  let latest: VendorOrder | null = null;
  if (current === 'PAID_IN_ESCROW') {
    latest = await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'VENDOR_ACKNOWLEDGED' });
    latest = await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'PREPARING' });
  } else if (current === 'VENDOR_ACKNOWLEDGED') {
    latest = await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'PREPARING' });
  }
  if (current === 'PREPARING' || latest) {
    latest = await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'READY_FOR_PICKUP' });
  }
  return latest ?? vendorsApi.getOrderDetail(orderId);
}

/**
 * Rupture (RUP-01) : VD-05 attend POST /orders/{id}/stockout (réattribution au
 * vendeur suivant si Trust ≥ 75, sinon remboursement — CDE-20). Cette logique
 * serveur n'existe pas encore : on bridge sur CANCELLED + remise du stock à 0.
 */
export async function reportStockout(
  orderId: number,
  productIds: number[],
  setStockZero: boolean,
): Promise<VendorOrder> {
  const updated = await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'CANCELLED' });
  if (setStockZero) {
    await Promise.all(productIds.map((pid) => vendorsApi.updateProductStock(pid, 0).catch(() => null)));
  }
  return updated;
}

// ── Livreur, code de remise, journal (bridge sur VendorShipmentTracking) ────

/** Réseau — cas d'erreur "Pas de réseau" (E9-bis / V01) à la remise. */
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

/**
 * Livreur du créneau (PRE-03) : VD-05/06 attendent aussi photo et entreprise
 * (courier.photo_url, courier.company, courier.slot) — VendorShipmentTracking
 * n'expose que courier_name/courier_phone aujourd'hui. Champs absents omis.
 */
export function courierOf(order: VendorOrder): { name: string; phone: string } | null {
  if (!order.shipment?.courier_name) return null;
  return { name: order.shipment.courier_name, phone: order.shipment.courier_phone };
}

/**
 * Code de remise (REM-01/02/05/09) : bridge sur shipment.pickup_confirmation_code,
 * seul champ réel disponible (pas d'endpoint dédié GET /orders/{id}/handover-code).
 * Reformaté en deux groupes de trois chiffres si 6 chiffres exacts.
 */
export function handoverCodeOf(order: VendorOrder): string | null {
  const raw = order.shipment?.pickup_confirmation_code;
  if (!raw) return null;
  const digits = raw.replace(/\s+/g, '');
  if (/^\d{6}$/.test(digits)) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return raw;
}

/** Délai de libération (REM-07) selon le palier : 3 j Bronze/Argent, 1 j Or/Platine. */
export function releaseDelayDays(tier: VendorProfile['certification_tier'] | undefined): number {
  return tier === 'GOLD' || tier === 'DIAMOND' ? 1 : 3;
}

export type HandoverIssue = 'offline' | 'order_cancelled' | 'deadline_passed';

/**
 * Détecte, parmi les 6 cas d'erreur de la remise (VD-06 §1.6), les seuls que
 * les données déjà exposées par vendorsApi permettent de déclencher réellement
 * (les 3 autres — livreur absent, code bloqué, plafond de valeur — resteraient
 * un registre prêt à brancher, voir ErrorCard.tsx).
 */
export function detectHandoverIssue(order: VendorOrder, isOnline: boolean): HandoverIssue | null {
  if (!isOnline) return 'offline';
  if (order.fulfillment_status === 'CANCELLED') return 'order_cancelled';
  if (order.vendor_reply_deadline && Date.now() > new Date(order.vendor_reply_deadline).getTime()) {
    return 'deadline_passed';
  }
  return null;
}

export interface JournalEvent {
  id: string;
  label: string;
  detail: string;
  location: string;
  at: string;
}

/**
 * Journal (JRN-01/02) : pas d'endpoint GET /orders/{id}/journal ni d'auteur
 * signé (actor_id) exposés aujourd'hui — on reconstitue un fil en lecture
 * seule à partir de la création de la commande et de shipment.timeline (déjà
 * réel, déjà horodaté), du plus récent au plus ancien.
 */
export function journalEventsOf(order: VendorOrder): JournalEvent[] {
  const events: JournalEvent[] = [
    {
      // Toujours "Payée" (jamais fulfillment_status_display, qui renvoie le
      // libellé v1 ACTUEL — pas celui de la création — et peut contenir
      // "Escrow", un mot banni par GEN-11).
      id: 'created',
      label: 'Payée',
      detail: orderRef(order.id),
      location: '',
      at: order.created_at,
    },
    ...(order.shipment?.timeline ?? []).map((ev) => ({
      id: String(ev.id),
      label: ev.label || ev.status,
      detail: ev.message || '',
      location: ev.location || '',
      at: ev.created_at,
    })),
  ];
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ── Prolongation (bridge : pas de POST /orders/{id}/extend) ────────────────

export const EXTENSION_NOTE_MARKER = '[sl7:extension]';

/** Une seule prolongation par commande (DEL-01) — lue depuis la note interne. */
export async function hasRequestedExtension(orderId: number): Promise<boolean> {
  const note = await vendorsApi.getNote(orderId).catch(() => null);
  return Boolean(note?.content?.includes(EXTENSION_NOTE_MARKER));
}

/**
 * "Besoin de plus de temps" (DEL-01 à 04) : VD-05 attend POST /orders/{id}/extend
 * côté serveur (nouvelle échéance, avertit client + livreur). Cet endpoint
 * n'existe pas : on trace la demande dans la note interne vendeur (visible du
 * vendeur seul) pour respecter la règle "une seule fois", sans prétendre
 * notifier réellement le client ou le livreur.
 */
export async function requestExtension(orderId: number, choiceLabel: string): Promise<void> {
  const existing = await vendorsApi.getNote(orderId).catch(() => null);
  const prefix = existing?.content ? `${existing.content}\n` : '';
  await vendorsApi.saveNote(orderId, `${prefix}${EXTENSION_NOTE_MARKER} +${choiceLabel} demandé le ${new Date().toLocaleString('fr-FR')}`);
}

/** Échéance absolue (DEL-03/E4) : 24 h après le paiement, jamais dépassable. */
export function absoluteDeadline(order: VendorOrder): Date {
  return new Date(new Date(order.created_at).getTime() + 24 * 3600_000);
}

/** Vrai si l'échéance absolue est déjà dépassée : bloque toute prolongation (DEL-03). */
export function isPastAbsoluteDeadline(order: VendorOrder): boolean {
  return Date.now() > absoluteDeadline(order).getTime();
}

// ── Payable au retrait (bridge : pas de champ cod_allowed/is_counter sur   ──
// ── VendorOrder aujourd'hui — E3 dit qu'une commande non payée n'entre    ──
// ── dans la liste vendeur que si elle est "payable au retrait ET validée" ──
// ── donc is_paid=false ici ne peut signifier que ce cas-là (CMD-05).      ──

/** Payable au retrait (CMD-05) : approximé par is_paid=false (E3 : sinon la commande ne serait pas listée). */
export function isCounterPayment(order: VendorOrder): boolean {
  return !order.is_paid;
}

// ── Classe de colis (bridge : champ parcel_class absent de VendorOrderItem) ──

/** Classe de colis S/M/L/XL (CMD-04) : pas de champ dédié côté API aujourd'hui — volontairement omis plutôt qu'inventé. */
export function parcelClassOf(order: VendorOrder): string | null {
  void order; // signature prête pour le jour où parcel_class sera exposé par l'API
  return null;
}

// ── Bon de préparation (bridge : pas de GET /orders/{id}/slip) ─────────────

/** Fenêtre de préparation lisible ("avant 12 h 42") pour le bon (BON-01/02). */
export function preparationWindowLabel(order: VendorOrder): string {
  return order.vendor_reply_deadline ? fmtDateTime(order.vendor_reply_deadline) : '—';
}
