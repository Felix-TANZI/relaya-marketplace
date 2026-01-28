import type { CartItem } from "./types";
import { loadCart, saveCart } from "./storage";

type Listener = (items: CartItem[]) => void;

let cart: CartItem[] = loadCart();
const listeners = new Set<Listener>();

function notify() {
  saveCart(cart);
  listeners.forEach((l) => l(cart));
}

export function getCart(): CartItem[] {
  return cart;
}

export function subscribeCart(listener: Listener) {
  listeners.add(listener);
  listener(cart); // push initial

  // IMPORTANT: cleanup must return void, not boolean
  return () => {
    listeners.delete(listener);
  };
}

export function cartCount(): number {
  return cart.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotalXaf(): number {
  return cart.reduce((sum, i) => sum + i.qty * i.price_xaf, 0);
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1) {
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) existing.qty += qty;
  else cart.push({ ...item, qty });
  notify();
}

export function setQty(productId: number, qty: number) {
  cart = cart
    .map((i) => (i.productId === productId ? { ...i, qty } : i))
    .filter((i) => i.qty > 0);
  notify();
}

export function removeFromCart(productId: number) {
  cart = cart.filter((i) => i.productId !== productId);
  notify();
}

export function clearCart() {
  cart = [];
  notify();
}
