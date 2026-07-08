// frontend/src/services/api/brands.ts
// Service registre des marques 
//   - Type Brand + BrandAutocomplete (léger pour dropdowns)
//   - Endpoints autocomplete / list / detail / propose (vendeur)

import { http } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Version légère — pour les inputs autocomplete du formulaire vendeur.
 * Contient uniquement ce qu'il faut pour rendre une ligne de suggestion :
 * name, slug, logo miniature, badge verified.
 */
export interface BrandLight {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_verified: boolean;
}

/**
 * Version complète — pour les pages détail marque et l'admin.
 */
export interface Brand extends BrandLight {
  description: string;
  country_of_origin: string;
  website: string;
  is_active: boolean;
  master_products_count: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandAutocompleteParams {
  q?: string;                // Chaîne à rechercher
  verified_only?: boolean;
  limit?: number;            // 1-50, défaut 10
}

export interface BrandListParams {
  verified_only?: boolean;   // Défaut true côté backend
}

export interface BrandProposePayload {
  name: string;
  country_of_origin?: string;
  website?: string;
}

/**
 * Réponse 409 Conflict lorsqu'une marque avec le même nom existe déjà.
 * Le frontend peut proposer au vendeur de rebasculer sur la marque existante.
 */
export interface BrandConflictResponse {
  detail: string;
  existing_brand: BrandLight;
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

export const brandsApi = {
  /**
   * Autocomplete pour le formulaire vendeur.
   * Retourne les marques triées par pertinence (verified d'abord).
   *
   * Cas d'usage : composant <BrandAutocomplete> — au fur et à mesure que
   * le vendeur tape "Samsu", on appelle brandsApi.autocomplete({ q: "Samsu" }).
   */
  autocomplete: async (
    params: BrandAutocompleteParams = {}
  ): Promise<BrandLight[]> => {
    const qs = buildQuery(params);
    return http<BrandLight[]>(`/api/catalog/brands/autocomplete/${qs}`);
  },

  /** Liste publique complète des marques (page /marques par ex). */
  list: async (params: BrandListParams = {}): Promise<Brand[]> => {
    const qs = buildQuery(params);
    return http<Brand[]>(`/api/catalog/brands/${qs}`);
  },

  /** Détail d'une marque par slug. */
  detail: async (slug: string): Promise<Brand> => {
    return http<Brand>(`/api/catalog/brands/${slug}/`);
  },

  /**
   * Propose une nouvelle marque (vendeur authentifié).
   *
   * Retourne :
   *   - 201 + Brand créée (is_verified=false, en attente admin)
   *   - 409 + BrandConflictResponse si une marque avec ce nom existe déjà
   *   - 400 sur validation (nom vide, trop court)
   *
   * Le frontend doit catch l'erreur et déballer la réponse pour proposer
   * au vendeur de rebasculer sur la marque existante en cas de 409.
   */
  propose: async (payload: BrandProposePayload): Promise<Brand> => {
    return http<Brand>(`/api/catalog/brands/propose/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Debounce simple pour l'autocomplete — évite de spammer le backend
 * à chaque keystroke. Usage :
 *
 *   const debounced = debouncePromise(brandsApi.autocomplete, 250);
 *   const results = await debounced({ q: 'samsu' });
 */
export function debouncePromise<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  wait: number,
): (...args: TArgs) => Promise<TResult> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((v: TResult) => void) | null = null;
  let pendingReject: ((e: unknown) => void) | null = null;

  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    return new Promise<TResult>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      timeout = setTimeout(() => {
        fn(...args).then(
          (v) => pendingResolve?.(v),
          (e) => pendingReject?.(e),
        );
      }, wait);
    });
  };
}