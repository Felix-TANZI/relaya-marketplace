// frontend/src/lib/recentlyViewed.ts
//
// Historique local des fiches produit ouvertes. Rien ne part au serveur : la liste
// vit dans le navigateur du visiteur et alimente la frame « Récemment consultés ».

const STORAGE_KEY = "belivay_recently_viewed";
const MAX_ENTRIES = 12;

export function getRecentlyViewedIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is number => typeof value === "number").slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** Place le produit en tête de l'historique, sans doublon. */
export function recordProductView(productId: number) {
  if (!productId) return;

  try {
    const next = [productId, ...getRecentlyViewedIds().filter((id) => id !== productId)].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("belivay-recently-viewed-updated"));
  } catch {
    /* Stockage indisponible (navigation privée, quota) : l'historique est simplement perdu. */
  }
}
