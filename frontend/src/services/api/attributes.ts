// frontend/src/services/api/attributes.ts
// Service attributs enrichi
//   - Types AttributeRole / AttributeValueType
//   - Type ProductAttributeEnriched avec role, values_type, unit, slug, is_universal
//   - Endpoint canonique /api/catalog/attributes/ (remplace /vendors/products/attributes/)
//   - Endpoint /api/catalog/master-products/<slug>/axes/ (axes résolus)
//
// COEXISTE avec l'ancien ProductAttribute dans vendors.ts qui n'a pas
// role/values_type/slug. Le nouveau code utilise ce fichier.

import { http } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Les 3 rôles d'attribut du BelivaY Product Representation Model (§3). */
export type AttributeRole = "AXE" | "SPEC" | "OFFRE";

/**
 * Type technique des valeurs — détermine l'input HTML côté formulaire vendeur.
 *
 *   SELECT     : liste fermée (dropdown), values est renseigné
 *   NUMBER     : nombre (input type="number"), unit affichée en suffixe
 *   BOOL       : oui/non (toggle)
 *   TEXT       : texte libre (à éviter)
 *   COLORDICT  : piocher dans le ColorDictionary Phase 1.3
 *   BRAND      : piocher dans le registre Brand Phase 1.2
 */
export type AttributeValueType =
  | "SELECT"
  | "NUMBER"
  | "BOOL"
  | "TEXT"
  | "COLORDICT"
  | "BRAND";

/**
 * Attribut enrichi Phase 2.
 *
 * Compatible avec l'ancien ProductAttribute (vendors.ts) sur les champs
 * partagés (id, name, values), enrichi avec role/values_type/slug/is_universal
 * et unit.
 */
export interface ProductAttributeEnriched {
  id: number;
  slug: string;
  name: string;
  attribute_type: "SIZE" | "COLOR" | "MATERIAL" | "OTHER";   // Legacy sémantique
  role: AttributeRole;
  values_type: AttributeValueType;
  values: (string | number)[];    // Utilisé si values_type=SELECT
  unit: string;                    // Suffixe pour NUMBER (Go, mAh, W...)
  is_universal: boolean;
  category: number | null;
  category_name: string | null;
  display_order: number;
}

/**
 * Réponse de /master-products/<slug>/axes/ — axes déclarés par le master
 * AVEC les informations complètes de chaque attribut, dans l'ordre.
 */
export interface MasterProductAxes {
  id: number;
  slug: string;
  title: string;
  variant_axes: string[];   // Liste brute des slugs
  variant_axes_resolved: ResolvedAxis[];
}

/** Un axe résolu — c'est ce que le formulaire vendeur va rendre. */
export interface ResolvedAxis {
  slug: string;
  name: string;
  values_type: AttributeValueType;
  values: (string | number)[];
  unit: string;
  is_universal: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS
// ─────────────────────────────────────────────────────────────────────────────

export interface AttributesListParams {
  category?: string;              // Slug catégorie — inclut ancêtres + universels
  role?: AttributeRole;           // Filtrer par rôle
  values_type?: AttributeValueType;
  universal_only?: boolean;       // Que les universels
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

export const attributesApi = {
  /**
   * Liste des attributs disponibles pour une catégorie.
   *
   * Comportement backend :
   *   - Sans category : uniquement les universels
   *   - Avec category : universels + attributs de la catégorie + ancêtres
   *   - Avec role : filtre supplémentaire
   *
   * Cas d'usage principal : formulaire vendeur —
   * après choix de la catégorie, on charge les attributs pour construire
   * dynamiquement les inputs (couleur, stockage, etc.).
   */
  list: async (params: AttributesListParams = {}): Promise<ProductAttributeEnriched[]> => {
    const qs = buildQuery(params);
    return http<ProductAttributeEnriched[]>(`/api/catalog/attributes/${qs}`);
  },

  /**
   * Axes de variante d'une MasterProduct — résolus (name, values, unit inclus).
   *
   * Cas d'usage : formulaire vendeur — après le choix du master
   * (via recherche fiche), on appelle cet endpoint pour savoir QUELS axes
   * doivent être rendus et COMMENT (SELECT / NUMBER / COLORDICT...).
   *
   * Si variant_axes est vide côté master (fiche mono-variant),
   * variant_axes_resolved est vide aussi et le formulaire skip cette étape.
   */
  getMasterAxes: async (masterSlug: string): Promise<MasterProductAxes> => {
    return http<MasterProductAxes>(
      `/api/catalog/master-products/${masterSlug}/axes/`,
    );
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Groupe les attributs par rôle — pratique pour afficher 3 sections
 * distinctes dans un formulaire admin (Axes / Specs / Offre).
 */
export function groupAttributesByRole(
  attributes: ProductAttributeEnriched[],
): Record<AttributeRole, ProductAttributeEnriched[]> {
  const groups: Record<AttributeRole, ProductAttributeEnriched[]> = {
    AXE: [],
    SPEC: [],
    OFFRE: [],
  };
  for (const attr of attributes) {
    groups[attr.role].push(attr);
  }
  return groups;
}

/**
 * Retourne un label lisible pour un values_type — pour affichage tooltip
 * ou aide utilisateur dans les formulaires admin.
 */
export function getValuesTypeLabel(vt: AttributeValueType): string {
  switch (vt) {
    case "SELECT":
      return "Liste fermée";
    case "NUMBER":
      return "Nombre";
    case "BOOL":
      return "Oui/Non";
    case "TEXT":
      return "Texte libre";
    case "COLORDICT":
      return "Dictionnaire couleurs";
    case "BRAND":
      return "Registre marques";
  }
}