// frontend/src/lib/supportInbox.ts
//
// Boîte de réception du support client. Elle vivait dans l'état local de
// ProfilePage, ce qui empêchait le header d'afficher un compteur de messages
// non lus : la donnée est désormais partagée, persistée et notifiée par
// événement, comme les favoris et les litiges.

import type { TFunction } from "i18next";

const STORAGE_KEY = "belivay_support_inbox";
export const SUPPORT_UPDATED_EVENT = "belivay-support-updated";

export interface SupportMessage {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  name: string;
  preview: string;
  unread: number;
  updatedAt: string;
  messages: SupportMessage[];
}

/** Conversations de démarrage, posées une seule fois au premier accès. */
function seed(t: TFunction): SupportConversation[] {
  const now = Date.now();
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  const support = t("misc1_support_inbox.author_support");
  const you = t("misc1_support_inbox.author_you");

  return [
    {
      id: "support-1",
      name: t("misc1_support_inbox.seed_conversation1_name"),
      preview: t("misc1_support_inbox.seed_message_case_in_progress"),
      unread: 2,
      updatedAt: at(45),
      messages: [
        { id: "m1", author: support, text: t("misc1_support_inbox.seed_message_request_received"), createdAt: at(60) },
        { id: "m2", author: you, text: t("misc1_support_inbox.seed_message_refund_status_question"), createdAt: at(52) },
        { id: "m3", author: support, text: t("misc1_support_inbox.seed_message_case_in_progress"), createdAt: at(45) },
      ],
    },
    {
      id: "support-2",
      name: t("misc1_support_inbox.seed_conversation2_name"),
      preview: t("misc1_support_inbox.seed_message_deposit_validated"),
      unread: 0,
      updatedAt: at(24 * 60),
      messages: [
        {
          id: "m7",
          author: support,
          text: t("misc1_support_inbox.seed_message_deposit_validated"),
          createdAt: at(24 * 60),
        },
      ],
    },
  ];
}

function read(t: TFunction): SupportConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed(t);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as SupportConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(conversations: SupportConversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  window.dispatchEvent(new Event(SUPPORT_UPDATED_EVENT));
}

export function getSupportConversations(t: TFunction): SupportConversation[] {
  return read(t).sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function getUnreadSupportCount(t: TFunction): number {
  return read(t).reduce((sum, conversation) => sum + (conversation.unread || 0), 0);
}

/** Marque une conversation comme lue — appelée à l'ouverture du fil. */
export function markSupportConversationRead(id: string, t: TFunction) {
  const current = read(t);
  if (!current.some((conversation) => conversation.id === id && conversation.unread > 0)) return;
  write(current.map((conversation) => (conversation.id === id ? { ...conversation, unread: 0 } : conversation)));
}

export function addSupportMessage(id: string, text: string, t: TFunction, author?: string) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const resolvedAuthor = author ?? t("misc1_support_inbox.author_you");
  const now = new Date().toISOString();
  write(
    read(t).map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            preview: trimmed,
            updatedAt: now,
            unread: resolvedAuthor === t("misc1_support_inbox.author_you") ? 0 : conversation.unread + 1,
            messages: [
              ...conversation.messages,
              { id: `${conversation.id}-${Date.now()}`, author: resolvedAuthor, text: trimmed, createdAt: now },
            ],
          }
        : conversation,
    ),
  );
}

/** Ouvre un nouveau fil support, par exemple depuis un formulaire de contact. */
export function openSupportConversation(name: string, firstMessage: string, t: TFunction): SupportConversation {
  const now = new Date().toISOString();
  const conversation: SupportConversation = {
    id: `support-${Date.now()}`,
    name,
    preview: firstMessage,
    unread: 0,
    updatedAt: now,
    messages: [{ id: `msg-${Date.now()}`, author: t("misc1_support_inbox.author_you"), text: firstMessage, createdAt: now }],
  };
  write([conversation, ...read(t)]);
  return conversation;
}

/** Horodatage court utilisé dans la liste des conversations. */
export function formatSupportTime(iso: string): string {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
