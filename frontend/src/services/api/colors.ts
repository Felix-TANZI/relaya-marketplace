// frontend/src/services/api/colors.ts
// Service dictionnaire couleurs & finitions
//   - Type ColorFamily (COLOR / FINISH)
//   - Type ColorDictionaryEntry
//   - Endpoints list (filtrable) + grouped (COLOR/FINISH séparés)

import { http } from "./http";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Famille : couleur vraie ou finition/matériau. */
export type ColorFamily = "COLOR" | "FINISH";

/**
 * Entrée du dictionnaire — bilingue FR/EN, avec rendu visuel.
 *
 * hex_code : format #RRGGBB. Vide pour les finitions non-colorées (Mat, Verre).
 * pattern_url : image optionnelle pour finitions à texture (Cuir, Bois).
 * is_neutral : vrai pour Noir/Blanc/Gris/Argent/Or/Titane — permet un filtre
 *              "Couleurs neutres uniquement" côté acheteur.
 */
export interface ColorDictionaryEntry {
  id: number;
  family: ColorFamily;
  name: string;         // Français
  name_en: string;      // Anglais
  slug: string;         // Ex: "color-noir", "finish-mat"
  hex_code: string;     // Format #RRGGBB ou vide
  pattern_url: string;
  is_neutral: boolean;
  display_order: number;
}

/**
 * Structure retournée par l'endpoint /colors/grouped/ — deux sections
 * distinctes prêtes à afficher côté frontend sans group-by client.
 */
export interface ColorDictionaryGrouped {
  COLOR: ColorDictionaryEntry[];
  FINISH: ColorDictionaryEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorListParams {
  family?: ColorFamily;         // Filtrer sur COLOR ou FINISH
  neutral_only?: boolean;       // Ne retourner que les neutres
  include_inactive?: boolean;   // Inclure les entrées désactivées
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

export const colorsApi = {
  /**
   * Liste plate — utilisée par <ColorPicker> quand on veut un affichage
   * en grille de pastilles (couleurs ET finitions mélangées ou filtrées).
   *
   * Perf : ce dictionnaire est TRÈS petit (~28 entrées après seed).
   * Le mettre en cache côté frontend pour toute la session (React Query
   * staleTime : Infinity) est parfaitement OK.
   */
  list: async (params: ColorListParams = {}): Promise<ColorDictionaryEntry[]> => {
    const qs = buildQuery(params);
    return http<ColorDictionaryEntry[]>(`/api/catalog/colors/${qs}`);
  },

  /**
   * Version groupée — rend deux sections distinctes "Couleurs" et "Finitions".
   * Utile si le vendeur doit choisir à la fois une couleur ET une finition
   * pour son variant (ex : coque smartphone en Cuir Noir).
   */
  grouped: async (): Promise<ColorDictionaryGrouped> => {
    return http<ColorDictionaryGrouped>(`/api/catalog/colors/grouped/`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Détermine la couleur de texte (noir ou blanc) qui sera lisible sur
 * un fond hex donné. Utile pour afficher un label sur une pastille couleur.
 *
 * Utilise la formule de luminance perçue (WCAG).
 */
export function getReadableTextColor(hexCode: string): "#000" | "#FFF" {
  if (!hexCode || hexCode.length !== 7) return "#000";
  const r = parseInt(hexCode.slice(1, 3), 16);
  const g = parseInt(hexCode.slice(3, 5), 16);
  const b = parseInt(hexCode.slice(5, 7), 16);
  // Luminance perçue
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000" : "#FFF";
}

/**
 * Retourne le nom d'affichage selon la langue courante.
 * Fallback sur le français si name_en est vide.
 */
export function getLocalizedColorName(
  entry: Pick<ColorDictionaryEntry, "name" | "name_en">,
  locale: "fr" | "en" = "fr",
): string {
  if (locale === "en" && entry.name_en) return entry.name_en;
  return entry.name;
}