import type { CheckoutDraft } from "./types";

const KEY = "relaya_checkout_draft_v1";

export function loadCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft() {
  localStorage.removeItem(KEY);
}
