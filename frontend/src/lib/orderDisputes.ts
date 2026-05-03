import type { Order } from "@/types/order";

const STORAGE_KEY = "belivay_order_disputes";
const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DISPUTABLE_STATUSES = ["DELIVERED", "BUYER_CONFIRMED"] as const;

export interface StoredDisputeMessage {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface StoredOrderDispute {
  id: string;
  orderId: number;
  orderLabel: string;
  reason: string;
  status: "OPEN";
  createdAt: string;
  updatedAt: string;
  windowExpiresAt: string;
  messages: StoredDisputeMessage[];
}

function readStorage(): StoredOrderDispute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredOrderDispute[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(disputes: StoredOrderDispute[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(disputes));
  window.dispatchEvent(new Event("belivay-disputes-updated"));
}

export function getStoredOrderDisputes() {
  return readStorage().sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function getOrderDisputes(orderId: number) {
  return getStoredOrderDisputes().filter((dispute) => dispute.orderId === orderId);
}

export function getDisputeEligibility(order: Order | null) {
  if (!order) {
    return {
      eligible: false,
      expiresAt: null as string | null,
      remainingMs: 0,
      message: "Commande introuvable.",
    };
  }

  if (!DISPUTABLE_STATUSES.includes(order.fulfillment_status as (typeof DISPUTABLE_STATUSES)[number])) {
    return {
      eligible: false,
      expiresAt: null,
      remainingMs: 0,
      message: "Le litige s'ouvre seulement apres reception du colis.",
    };
  }

  const receivedAt = new Date(order.updated_at).getTime();
  const expiresAt = new Date(receivedAt + DISPUTE_WINDOW_MS).toISOString();
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());

  if (remainingMs <= 0) {
    return {
      eligible: false,
      expiresAt,
      remainingMs,
      message: "Le délai de 24h après réception est dépassé pour cette commande.",
    };
  }

  return {
    eligible: true,
    expiresAt,
    remainingMs,
    message: "Vous pouvez encore signaler un problème sur cette commande.",
  };
}

export function formatRemainingDisputeTime(remainingMs: number) {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")} min`;
}

export function openOrderDispute(
  order: Order,
  reason: string,
  description: string,
  disputeId?: number | string,
) {
  const existing = getOrderDisputes(order.id)[0];
  if (existing) return existing;

  const eligibility = getDisputeEligibility(order);
  if (!eligibility.eligible || !eligibility.expiresAt) {
    throw new Error("Cette commande n'est plus éligible à l'ouverture d'un litige.");
  }

  const now = new Date().toISOString();
  const dispute: StoredOrderDispute = {
    id: disputeId ? String(disputeId) : `dispute-${order.id}-${Date.now()}`,
    orderId: order.id,
    orderLabel: `CMD-${order.id}`,
    reason,
    status: "OPEN",
    createdAt: now,
    updatedAt: now,
    windowExpiresAt: eligibility.expiresAt,
    messages: [
      {
        id: `msg-${Date.now()}`,
        author: "Vous",
        text: description,
        createdAt: now,
      },
      {
        id: `msg-${Date.now()}-support`,
        author: "Médiation BelivaY",
        text: `Le litige a été ouvert pour la commande CMD-${order.id}. Un agent va poursuivre l'échange dans ce chat.`,
        createdAt: now,
      },
    ],
  };

  writeStorage([dispute, ...readStorage()]);
  return dispute;
}

export function addDisputeMessage(disputeId: string, text: string, author = "Vous") {
  const next = readStorage().map((dispute) => {
    if (dispute.id !== disputeId) return dispute;
    const now = new Date().toISOString();
    return {
      ...dispute,
      updatedAt: now,
      messages: [
        ...dispute.messages,
        {
          id: `${dispute.id}-${Date.now()}`,
          author,
          text,
          createdAt: now,
        },
      ],
    };
  });
  writeStorage(next);
  return next.find((dispute) => dispute.id === disputeId) ?? null;
}
