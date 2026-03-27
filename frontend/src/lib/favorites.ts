const FAVORITES_KEY = "belivay_favorite_product_ids";

export function getFavoriteProductIds(): number[] {
  const rawValue = localStorage.getItem(FAVORITES_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter((value) => typeof value === "number")
      : [];
  } catch {
    return [];
  }
}

export function isFavoriteProduct(productId: number) {
  return getFavoriteProductIds().includes(productId);
}

export function toggleFavoriteProduct(productId: number) {
  const currentIds = getFavoriteProductIds();
  const nextIds = currentIds.includes(productId)
    ? currentIds.filter((id) => id !== productId)
    : [...currentIds, productId];

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextIds));
  window.dispatchEvent(new Event("belivay-favorites-updated"));
  return nextIds;
}
