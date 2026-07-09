// frontend/src/services/api/categories.ts
// Service API pour les catégories

import { http } from "./http";
 
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * Catégorie enrichie Phase 1.1 avec tous les nouveaux champs :
 * hiérarchie (parent, level), présentation (icon_name, description),
 * état (is_active, is_deprecated), modération (requires_admin_approval).
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  level: number;
  icon_name: string;                       // Nom de composant Lucide (ex: "Smartphone")
  description: string;
  display_order: number;
  is_active: boolean;
  is_deprecated: boolean;
  requires_admin_approval: boolean;
  effective_requires_approval?: boolean;   // Hérité de la lignée
  full_path?: string;                      // "Electronics > Téléphonie > Smartphones iOS"
}
 
/**
 * Nœud d'arborescence — Category avec ses enfants imbriqués.
 * Retourné par l'endpoint /categories/tree/.
 */
export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  level: number;
  icon_name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  is_deprecated: boolean;
  requires_admin_approval: boolean;
  children: CategoryTreeNode[];
}
 
// ─────────────────────────────────────────────────────────────────────────────
// PARAMS DES ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
 
export interface CategoryTreeParams {
  include_deprecated?: boolean;
  include_inactive?: boolean;
  root_slug?: string;   // Ex: "electronics" pour ne charger que le sous-arbre Electronics
}
 
export interface CategoryFlatParams {
  leaves_only?: boolean;    // Ne retourne que les feuilles (catégories sans enfants)
  parent_slug?: string;     // Filtre : descendants de cette catégorie uniquement
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
 
export const categoriesApi = {
  /**
   * Arborescence complète des catégories, avec enfants imbriqués.
   *
   * Cas d'usage :
   *   - Menu de navigation acheteur
   *   - Sélecteur de catégorie du formulaire vendeur (CategoryTreePicker)
   *
   * Perf : UNE requête SQL côté backend, mise en cache HTTP recommandée
   * côté frontend (React Query staleTime : 5-10 minutes).
   */
  tree: async (params: CategoryTreeParams = {}): Promise<CategoryTreeNode[]> => {
    const qs = buildQuery(params);
    return http<CategoryTreeNode[]>(`/api/catalog/categories/tree/${qs}`);
  },
 
  /**
   * Liste plate des catégories avec full_path.
   * Pratique pour les selects HTML où on veut afficher le chemin complet.
   *
   * Ex : "Electronics > Téléphonie > Smartphones iOS"
   */
  flat: async (params: CategoryFlatParams = {}): Promise<Category[]> => {
    const qs = buildQuery(params);
    return http<Category[]>(`/api/catalog/categories/flat/${qs}`);
  },
};
 
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
 
/**
 * Retourne true si une catégorie appartient au sous-arbre Electronics.
 * Utilise le slug (convention "electronics-*" du seed Phase 1.1).
 *
 * Utile pour brancher conditionnellement le nouveau flow vendeur (Variant)
 * uniquement pour les catégories Electronics.
 */
export function isElectronicsCategory(category: Pick<Category, "slug">): boolean {
  return category.slug === "electronics" || category.slug.startsWith("electronics-");
}
 
/**
 * Aplatit un arbre de catégories en liste. Préserve la profondeur (level)
 * pour reconstruire l'indentation dans les selects.
 */
export function flattenCategoryTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  const walk = (list: CategoryTreeNode[]) => {
    for (const n of list) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return result;
}