// frontend/src/features/vendors/v2/accueil/useAccueilData.ts
// Construit l'état de l'écran Accueil (VD-04) à partir des endpoints existants.
// GET /seller/today (VD-D05.A04) n'existe pas encore : dès qu'il sera livré,
// ce hook n'aura qu'à appeler cet endpoint unique et ce fichier pourra rétrécir
// à une simple normalisation de sa réponse.

import { useCallback, useEffect, useState } from 'react';
import { vendorsApi } from '@/services/api/vendors';
import { vendorsV2Api } from '@/services/api/vendorsV2';
import type {
  AccueilState,
  AccueilVariant,
  LaunchTierInfo,
  OnboardingGesture,
  TodoItem,
} from './types';

const LAUNCH_THRESHOLDS = { argent: 15, or: 40, platine: 80 } as const;

function computeLaunchTier(activeProducts: number): LaunchTierInfo {
  const current =
    activeProducts >= LAUNCH_THRESHOLDS.platine
      ? 'PLATINE'
      : activeProducts >= LAUNCH_THRESHOLDS.or
        ? 'OR'
        : activeProducts >= LAUNCH_THRESHOLDS.argent
          ? 'ARGENT'
          : 'BRONZE';
  const nextThreshold =
    current === 'BRONZE'
      ? LAUNCH_THRESHOLDS.argent
      : current === 'ARGENT'
        ? LAUNCH_THRESHOLDS.or
        : current === 'OR'
          ? LAUNCH_THRESHOLDS.platine
          : null;
  return { current, activeProducts, nextThreshold, thresholds: LAUNCH_THRESHOLDS };
}

const initialState: AccueilState = {
  variant: 'todo',
  loading: true,
  error: null,
  shopName: '',
  isPrepAccess: false,
  todos: [],
  lowStockCount: 0,
  launchTier: null,
  gestures: [],
  lifetimeEarnedXaf: null,
  releasingXaf: null,
  nextPayoutLabel: null,
  nextPayoutAmountXaf: null,
  totalOrdersCount: null,
  lastLoadedAt: null,
};

/** Prochain vendredi (KYC-04 : versement le vendredi, sans frais) — calcul calendaire, pas une donnée serveur. */
function nextFridayLabel(): string {
  const now = new Date();
  const day = now.getDay(); // 0=dimanche … 5=vendredi
  const delta = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + delta);
  return next.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function useAccueilData() {
  const [state, setState] = useState<AccueilState>(initialState);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const profile = await vendorsApi.getProfile();

      if (profile.status === 'SUSPENDED') {
        setState((s) => ({
          ...s,
          loading: false,
          variant: 'suspended',
          shopName: profile.business_name,
        }));
        return;
      }

      const [orders, stats, moneySummaryV2, paymentSummary] = await Promise.all([
        vendorsApi.getOrders().catch(() => []),
        vendorsApi.getStats().catch(() => null),
        // Source préférée pour "Gagné avec BelivaY" (VD-D05.A12) : approxime
        // les 5 états VD-09 (à verser/se libère/versé/gelé) sur les données
        // existantes. Repli sur getPaymentSummary() si indisponible (404 profil
        // non-vendeur, 403 boutique pas encore approuvée, etc.).
        vendorsV2Api.getMoneySummary().catch(() => null),
        vendorsApi.getPaymentSummary().catch(() => null),
      ]);

      // "À préparer" — seuls types que le vendeur peut faire passer par "C'est prêt".
      const prepareStatuses = new Set(['PAID_IN_ESCROW', 'VENDOR_ACKNOWLEDGED', 'PREPARING']);
      const todos: TodoItem[] = orders
        .filter((o) => prepareStatuses.has(o.fulfillment_status))
        .map((o): TodoItem => ({
          id: `prepare-${o.id}`,
          kind: 'prepare' as const,
          orderId: o.id,
          dueAt: o.vendor_reply_deadline,
          productTitle: o.items[0]?.product_title ?? '',
          productImage: o.items[0]?.product_image ?? null,
          qty: o.items.reduce((sum, it) => sum + it.qty, 0),
          keepAmount: o.vendor_net_amount,
          courierName: o.shipment?.courier_name ?? null,
          // Aucun champ COD sur VendorOrder aujourd'hui (E3/CMD-05) : toujours false en attendant le backend.
          isPayableOnPickup: false,
          createdAt: o.created_at,
          fulfillmentStatus: o.fulfillment_status,
        }))
        .concat(
          // Litiges : escrow_status DISPUTED. Pas d'échéance ni de motif exposés
          // aujourd'hui (VD-D05 ACC-05 attend un champ dédié) → tri par ancienneté.
          orders
            .filter((o) => o.escrow_status === 'DISPUTED')
            .map((o): TodoItem => ({
              id: `dispute-${o.id}`,
              kind: 'dispute' as const,
              orderId: o.id,
              dueAt: null,
              productTitle: o.items[0]?.product_title ?? '',
              productImage: o.items[0]?.product_image ?? null,
              qty: o.items.reduce((sum, it) => sum + it.qty, 0),
              keepAmount: o.vendor_net_amount,
              courierName: null,
              isPayableOnPickup: false,
              createdAt: o.created_at,
            })),
        )
        // Retours : aucun statut/endpoint de retour n'existe encore côté vendeur
        // (pas de champ "en retour" sur VendorOrder) → liste toujours vide pour l'instant.
        .sort((a, b) => {
          if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
          if (a.dueAt) return -1;
          if (b.dueAt) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      const activeProducts = stats?.active_products ?? 0;
      const launchTier = computeLaunchTier(activeProducts);

      const gestures: OnboardingGesture[] = [
        { key: 'add_product', done: activeProducts > 0, path: '/seller/products/new' },
        // Pas d'endpoint d'horaires boutique aujourd'hui (VD-11) : geste toujours
        // affiché mais jamais compté "fait" côté client — simplification assumée.
        { key: 'set_hours', done: false, path: '/seller/v2/horaires' },
        {
          key: 'verify_payout',
          done: Boolean(profile.default_withdrawal_operator && profile.default_withdrawal_phone),
          path: '/seller/payments',
        },
      ];
      const essentialGesturesDone = gestures
        .filter((g) => g.key !== 'set_hours')
        .every((g) => g.done);

      let variant: AccueilVariant;
      if (!isOnline) variant = 'offline';
      else if ((orders.length === 0) && !essentialGesturesDone) variant = 'first_day';
      else if (todos.length === 0) variant = 'empty';
      else variant = 'todo';

      // "Gagné avec BelivaY" (ACC-12/A12) : lifetimeEarnedXaf = déjà sorti de
      // l'escrow (à verser + versé), releasingXaf = sur le point de se
      // libérer. moneySummaryV2 (GET /api/vendors/v2/money-summary/) est la
      // source privilégiée ; repli sur getPaymentSummary() sinon (approximation
      // plus grossière : total_released_xaf confond à verser et versé).
      const lifetimeEarnedXaf = moneySummaryV2
        ? moneySummaryV2.to_pay.amount_xaf + moneySummaryV2.paid_out.amount_xaf
        : (paymentSummary?.total_released_xaf ?? null);
      const releasingXaf = moneySummaryV2
        ? moneySummaryV2.releasing.amount_xaf
        : (paymentSummary?.total_release_pending_xaf ?? null);
      const nextPayoutAmountXaf = moneySummaryV2
        ? moneySummaryV2.to_pay.amount_xaf
        : (paymentSummary?.total_released_xaf ?? null);
      const hasMoneyData = Boolean(moneySummaryV2 || paymentSummary);

      setState({
        loading: false,
        error: null,
        variant,
        shopName: profile.business_name,
        isPrepAccess: false,
        todos,
        // GET /seller/today doit fournir low_stock côté serveur (A05) ; en
        // attendant, aucune source fiable de seuil de stock bas n'est exposée
        // par getProducts() pour tous les produits d'un coup → 0 par défaut.
        lowStockCount: 0,
        launchTier,
        gestures,
        lifetimeEarnedXaf,
        releasingXaf,
        nextPayoutLabel: hasMoneyData ? nextFridayLabel() : null,
        nextPayoutAmountXaf,
        totalOrdersCount: stats?.total_orders ?? null,
        lastLoadedAt: new Date().toISOString(),
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, [isOnline]);

  // Recharge au montage et à chaque retour réseau ; passe en "offline" sans
  // recharger dès que le réseau tombe (OFF-01 à OFF-05).
  useEffect(() => {
    if (isOnline) {
      load();
    } else {
      setState((s) => (s.variant === 'suspended' ? s : { ...s, variant: 'offline' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  /**
   * "C'est prêt" (ACC-02/PRE-01) : POST /orders/{id}/ready n'existe pas (VD-D05.A04) ;
   * on rejoue les transitions PATCH une à une jusqu'à READY_FOR_PICKUP — même
   * bridge que markOrderReady() dans commandes/helpers.ts (lot Commandes),
   * dupliqué ici pour rester à l'intérieur du dossier accueil/.
   */
  const markReady = useCallback(async (orderId: number) => {
    const item = state.todos.find((it) => it.orderId === orderId && it.kind === 'prepare');
    const current = item?.fulfillmentStatus;
    if (current === 'PAID_IN_ESCROW') {
      await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'VENDOR_ACKNOWLEDGED' });
      await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'PREPARING' });
    } else if (current === 'VENDOR_ACKNOWLEDGED') {
      await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'PREPARING' });
    }
    await vendorsApi.updateFulfillmentStatus(orderId, { fulfillment_status: 'READY_FOR_PICKUP' });
    await load();
  }, [state.todos, load]);

  return { ...state, reload: load, markReady };
}
