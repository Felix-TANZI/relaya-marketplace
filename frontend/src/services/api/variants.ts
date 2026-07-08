// frontend/src/services/api/variants.ts
// Service ProductVariant 
//   - Type ProductVariant (light + full)
//   - Endpoints public : list par master, detail par SKU
//   - Endpoint vendor CRUCIAL : find-or-create (idempotent)

import { http } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Dict {slug_axe: valeur} — l'input du vendeur.
 * Ex : { "phone-color": "titane", "phone-storage": "256" }
 */
export type AxisValues = Record<string, string | number>;

/**
 * Version légère — pour les listes (sélecteur de variant sur la page fiche,
 * résultats de recherche vendeur).
 */
export interface ProductVariantLight {
  id: number;
  sku: string;                          // BLV-V-{master:06d}-{variant:04d}
  barcode: string;
  axis_values: AxisValues;
  axis_key: string;                     // "phone-color=titane|phone-storage=256"
  is_active: boolean;
  moderation_status: ModerationStatus;
  display_name: string;                 // "iPhone 15 Pro — Titane / 256 Go"
  buy_box_price_xaf: number | null;     // null si aucune offre approuvée
  offers_count: number;
}

/**
 * Version complète — pour les pages détail Variant et les réponses des
 * endpoints vendor (find-or-create renvoie ça).
 */
export interface ProductVariant extends ProductVariantLight {
  master: number;
  master_title: string;
  master_slug: string;
  master_variant_axes: string[];        // Liste brute des slugs d'axes autorisés
  moderated_at: string | null;
  moderation_reason: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS & PAYLOADS
// ─────────────────────────────────────────────────────────────────────────────

export interface VariantsListParams {
  include_pending?: boolean;    // Public : ignoré sauf si user staff
                                // Vendor : inclut ses soumissions en attente
}

/**
 * Payload de find-or-create.
 * master : ID de la MasterProduct
 * axis_values : dict {slug_axe: valeur}
 */
export interface VariantFindOrCreatePayload {
  master: number;
  axis_values: AxisValues;
  barcode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

function buildQuery<T extends object>(params: T): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Distingue une réponse "found" (200) d'une réponse "created" (201).
 * Le backend renvoie le même schema dans les deux cas — on ne peut pas savoir
 * lequel a été fait sans regarder le status HTTP.
 *
 * Cette info est utile côté frontend pour informer le vendeur :
 *   "Nous avons trouvé un variant identique existant" (found)
 *   "Nouveau variant créé, en attente de validation admin" (created)
 *
 * Comme le wrapper http() ne remonte pas le status brut, on utilise ici
 * fetch directement pour ce cas particulier.
 */
export interface FindOrCreateResult {
  variant: ProductVariant;
  created: boolean;   // true si nouvelle création, false si existant retrouvé
}

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000")
  .replace(/\/api\/?$/, "");

export const variantsApi = {
  /**
   * Liste PUBLIQUE des Variants d'une fiche.
   * Ne retourne que les APPROVED sauf si include_pending=true côté staff.
   *
   * Cas d'usage : page fiche buyer — construire le sélecteur de Variant
   * (bulles couleur, dropdown stockage) au-dessus de la Buy Box.
   */
  listByMaster: async (
    masterSlug: string,
    params: VariantsListParams = {},
  ): Promise<ProductVariantLight[]> => {
    const qs = buildQuery(params);
    return http<ProductVariantLight[]>(
      `/api/catalog/master-products/${masterSlug}/variants/${qs}`,
    );
  },

  /**
   * Liste VENDOR — inclut les Variants en attente de modération.
   * Utilisé dans l'espace vendeur pour visualiser ses soumissions en cours.
   */
  listForVendor: async (
    masterId: number,
  ): Promise<ProductVariantLight[]> => {
    return http<ProductVariantLight[]>(
      `/api/catalog/vendor/masters/${masterId}/variants/`,
    );
  },

  /** Détail d'un Variant par son SKU canonique. */
  detailBySku: async (sku: string): Promise<ProductVariant> => {
    return http<ProductVariant>(`/api/catalog/variants/${sku}/`);
  },

  /**
   * FIND-OR-CREATE — endpoint idempotent CRITIQUE.
   *
   * Le vendeur soumet master + axis_values. Deux cas :
   *   - Un Variant identique existe → 200, on le retourne
   *   - Aucun Variant → 201, on en crée un (en PENDING)
   *
   * Le vendeur n'a JAMAIS besoin de vérifier au préalable si un Variant
   * existe : cet endpoint garantit qu'on n'aura jamais de doublons.
   *
   * Cette version retourne aussi le flag `created` pour que l'UI puisse
   * afficher un message différent selon le cas.
   */
  findOrCreate: async (
    payload: VariantFindOrCreatePayload,
  ): Promise<FindOrCreateResult> => {
    // On utilise fetch directement pour capturer le status 200 vs 201
    const url = `${API_BASE_URL}/api/catalog/vendor/variants/find-or-create/`;
    const token = localStorage.getItem("access_token");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Erreur ${response.status} lors du find-or-create Variant : ${text}`,
      );
    }

    const variant = (await response.json()) as ProductVariant;
    return {
      variant,
      created: response.status === 201,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule côté frontend le même axis_key que le backend.
 * Utile pour dédoublonner ou comparer côté client avant appel API.
 *
 * DOIT correspondre EXACTEMENT à la logique du backend
 * (ProductVariant.compute_axis_key) :
 *   - clés triées alphabétiquement
 *   - valeurs trimées
 *   - format "slug1=val1|slug2=val2"
 */
export function computeAxisKey(axisValues: AxisValues): string {
  const entries = Object.entries(axisValues);
  if (entries.length === 0) return "";
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries
    .map(([k, v]) => `${k}=${String(v).trim()}`)
    .join("|");
}

/**
 * Retourne un texte lisible d'un Variant pour affichage compact.
 * Ex : "Titane / 256 Go" (juste les valeurs, sans le titre master).
 */
export function formatAxisValuesShort(axisValues: AxisValues): string {
  const entries = Object.entries(axisValues);
  if (entries.length === 0) return "Standard";
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([, v]) => String(v)).join(" / ");
}