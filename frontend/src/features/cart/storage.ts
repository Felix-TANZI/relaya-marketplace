import type { CartItem } from "./types";

const KEY = "relaya_cart_v1";

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
