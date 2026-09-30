// frontend/src/features/vendors/v2/catalogue/helpers.ts
// Ponts et calculs pour "Mes produits" / "Une offre" / "Nouvelle offre".
// Convention reprise de commandes/helpers.ts (Lot 5) : chaque approximation
// est documentée en commentaire, jamais silencieuse.

import { useEffect, useState } from 'react';
import {
  vendorsApi,
  type VendorProduct,
  type VendorProfile,
} from '@/services/api/vendors';
import {
  previewCommissionClientSide,
  type CommissionFamily,
  type CommissionTier,
} from '@/services/api/vendorsV2';
import type { ProductAttention, ProductCardState, ProductListItem } from './types';

// ── Constantes verrouillées (PRX-03, référentiel unique) ────────────────────

/** Prix minimum publiable (PRX-03) — jamais négociable. */
export const MIN_PUBLISHABLE_PRICE_XAF = 500;

/** Photos réelles (PHO-01) : 3 minimum, 8 maximum. */
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 8;

/** Poids/dimensions obligatoires au-delà de ce seuil (§3.4, classe de colis). */
export const OVERSIZE_WEIGHT_KG = 5;
export const OVERSIZE_DIM_CM = 50;

/** Seuil de stock bas par défaut quand le produit n'a pas de stock_threshold
 * propre (champ optionnel côté API) — purement local, à remplacer si l'API
 * expose un jour un seuil global de plateforme. */
const DEFAULT_LOW_STOCK_THRESHOLD = 3;

/**
 * Famille de commission M01 utilisée pour l'aperçu "Vous gardez" — aucune
 * fiche/master n'expose encore sa famille (A à E) côté API vendeur
 * (MANQUE BACKEND). Famille A prise par défaut (la plus commune dans les
 * exemples du guide VD-08 §3.4) : à corriger dès que le champ existera.
 */
export const DEFAULT_COMMISSION_FAMILY: CommissionFamily = 'A';

/** Convertit le palier Django (VendorProfile) vers le palier du barème M01. */
export function tierToCommissionTier(
  tier: VendorProfile['certification_tier'] | undefined,
): CommissionTier {
  switch (tier) {
    case 'SILVER': return 'argent';
    case 'GOLD': return 'or';
    case 'DIAMOND': return 'platine';
    default: return 'bronze';
  }
}

// ── Formatage ────────────────────────────────────────────────────────────

export function fmtXAF(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR')} F`;
}

export function fmtPercent1(ratio: number): string {
  return `${(ratio * 100).toFixed(1).replace('.', ',')} %`;
}

export function parsePriceInput(raw: string): number {
  const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

// ── "Vous gardez" — jamais le mot commission (règle produit verrouillée) ────

/** Aperçu commission M01 pour un prix donné — famille par défaut documentée
 * ci-dessus, palier réel du vendeur, jamais d'offre de découverte détectable
 * aujourd'hui (aucun champ ne l'expose) donc toujours false. */
export function previewKeep(priceXaf: number, tier: CommissionTier) {
  return previewCommissionClientSide(priceXaf, DEFAULT_COMMISSION_FAMILY, tier, false);
}

/** "Vous gardez" par vente pour un produit déjà publié (carte Mes produits, PRD-03). */
export function keptPerSaleOf(product: VendorProduct, tier: CommissionTier): number {
  return previewKeep(product.price_xaf, tier).kept_xaf;
}

// ── État et bandes d'attention (PRD-04 à PRD-06, tri VD-D09.A02) ───────────

/**
 * État simplifié pour le liseré (PRD-06). VendorProduct n'expose que
 * is_active : impossible de distinguer "en vérification" (ambre) d'un
 * "brouillon/en pause" volontaire (gris) — MANQUE BACKEND (pas de champ
 * moderation_status). En attendant, tout produit inactif est traité "paused".
 */
export function stateOf(product: VendorProduct): ProductCardState {
  return product.is_active ? 'selling' : 'paused';
}

export interface AttentionLabels {
  lowStock: (stock: number) => string;
  lowStockAction: string;
  dispute: string;
  disputeAction: string;
}

/**
 * Bandes d'attention réellement détectables aujourd'hui (PRD-05) :
 *  - low_stock : calcul réel (stock_quantity vs stock_threshold du produit).
 *  - dispute : réel mais coûteux — voir useDisputedProductIds ci-dessous.
 *  - cheaper ("moins cher ailleurs") et moderation ("en vérification") ne
 *    sont PAS posées : aucune donnée de comparaison marché ni de statut de
 *    modération n'est exposée par l'API vendeur aujourd'hui (MANQUE BACKEND :
 *    GET /offers/{id}/price-advice, champ moderation{}). Le type reste prêt
 *    dans ProductAttentionType pour brancher dès que ces endpoints existeront.
 */
export function attentionsOf(
  product: VendorProduct,
  hasDispute: boolean,
  labels: AttentionLabels,
): ProductAttention[] {
  const out: ProductAttention[] = [];
  const threshold = product.stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  if (product.is_active && product.stock_quantity > 0 && product.stock_quantity <= threshold) {
    out.push({
      type: 'low_stock',
      label: labels.lowStock(product.stock_quantity),
      actionLabel: labels.lowStockAction,
    });
  }
  if (hasDispute) {
    out.push({ type: 'dispute', label: labels.dispute, actionLabel: labels.disputeAction });
  }
  return out;
}

/**
 * Tri par urgence (VD-D09.A02, jamais A à Z) : stock sous seuil d'abord,
 * puis "en vérification" (jamais posé aujourd'hui, voir stateOf), puis les
 * autres bandes d'attention (litige), puis brouillon/pause, puis le reste.
 */
export function sortByUrgency(items: ProductListItem[]): ProductListItem[] {
  function rank(item: ProductListItem): number {
    if (item.attentions.some((a) => a.type === 'low_stock')) return 0;
    if (item.state === 'moderation') return 1;
    if (item.attentions.length > 0) return 2;
    if (item.state === 'paused') return 3;
    return 4;
  }
  return [...items].sort((a, b) => rank(a) - rank(b) || b.product.id - a.product.id);
}

export function primaryImageOf(product: VendorProduct): string | null {
  const primary = product.images?.find((img) => img.is_primary) ?? product.images?.[0];
  return primary?.image_url ?? null;
}

export function buildListItems(
  products: VendorProduct[],
  disputedProductIds: Set<number>,
  tier: CommissionTier,
  labels: AttentionLabels,
): ProductListItem[] {
  return products.map((product) => ({
    product,
    state: stateOf(product),
    attentions: attentionsOf(product, disputedProductIds.has(product.id), labels),
    keptPerSaleXaf: keptPerSaleOf(product, tier),
    primaryImageUrl: primaryImageOf(product),
  }));
}

// ── Litiges → produits concernés (bridge coûteux, plafonné) ────────────────

/**
 * Relie les litiges ouverts à des produits (PRD-05 "litige"). Aucun champ ne
 * relie directement un litige à un produit (VendorDisputeListItem n'expose
 * que la commande) : on va chercher le détail de chaque commande litigieuse
 * pour en lire les articles. Plafonné à 20 litiges pour ne pas multiplier les
 * appels réseau sur un écran de liste (MANQUE BACKEND : un champ
 * dispute.product_ids éviterait ce détour).
 */
export function useDisputedProductIds(): Set<number> {
  const [ids, setIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const disputes = await vendorsApi.getDisputes();
        const open = disputes.filter((d) => d.status === 'OPEN' || d.status === 'IN_PROGRESS').slice(0, 20);
        const orders = await Promise.all(
          open.map((d) => vendorsApi.getOrderDetail(d.order).catch(() => null)),
        );
        if (cancelled) return;
        const next = new Set<number>();
        orders.forEach((order) => {
          order?.items.forEach((item) => next.add(item.product));
        });
        setIds(next);
      } catch {
        if (!cancelled) setIds(new Set());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return ids;
}

// ── Débounce générique (A22 : service de commission appelé à chaque frappe,
// débouncé 300 ms) ──────────────────────────────────────────────────────────

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

// ── Photos (PHO-01/02) ──────────────────────────────────────────────────────

/** Vérifie 800×800 px minimum (PHO-01) avant d'accepter une photo. */
export function checkMinDimensions(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth >= 800 && img.naturalHeight >= 800);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

export function oversizeFieldsRequired(weightKg: number, dimensionCm: number): boolean {
  return weightKg > OVERSIZE_WEIGHT_KG || dimensionCm > OVERSIZE_DIM_CM;
}
