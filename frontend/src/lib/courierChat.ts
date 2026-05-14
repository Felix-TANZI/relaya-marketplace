export type CourierChatRole = "client" | "courier";

export type CourierChatMessage = {
  id: string;
  orderId: number;
  role: CourierChatRole;
  senderName: string;
  text: string;
  createdAt: string;
};

const STORAGE_KEY = "belivay_courier_conversations";
export const COURIER_CHAT_EVENT = "belivay:courier-chat-updated";

type StoredConversations = Record<string, CourierChatMessage[]>;

function readConversations(): StoredConversations {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredConversations) : {};
  } catch {
    return {};
  }
}

function writeConversations(conversations: StoredConversations) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  window.dispatchEvent(new CustomEvent(COURIER_CHAT_EVENT));
}

export function getCourierConversation(orderId: number): CourierChatMessage[] {
  return readConversations()[String(orderId)] ?? [];
}

export function addCourierConversationMessage(
  orderId: number,
  role: CourierChatRole,
  text: string,
  senderName = role === "client" ? "Client" : "Livreur"
): CourierChatMessage[] {
  const conversations = readConversations();
  const key = String(orderId);
  const nextMessage: CourierChatMessage = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    orderId,
    role,
    senderName,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  conversations[key] = [...(conversations[key] ?? []), nextMessage];
  writeConversations(conversations);
  return conversations[key];
}
