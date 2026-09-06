// frontend/src/lib/supportInbox.ts
//
// Boîte de réception du support client. Elle vivait dans l'état local de
// ProfilePage, ce qui empêchait le header d'afficher un compteur de messages
// non lus : la donnée est désormais partagée, persistée et notifiée par
// événement, comme les favoris et les litiges.

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
function seed(): SupportConversation[] {
  const now = Date.now();
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

  return [
    {
      id: "support-1",
      name: "Support BelivaY",
      preview: "Le dossier est en cours de traitement, retour sous 24h.",
      unread: 2,
      updatedAt: at(45),
      messages: [
        { id: "m1", author: "Support", text: "Bonjour, nous avons bien reçu votre demande.", createdAt: at(60) },
        { id: "m2", author: "Vous", text: "Merci, je voulais vérifier le statut de mon remboursement.", createdAt: at(52) },
        { id: "m3", author: "Support", text: "Le dossier est en cours de traitement, retour sous 24h.", createdAt: at(45) },
      ],
    },
    {
      id: "support-2",
      name: "Support abonnement",
      preview: "Votre dépôt Mobile Money a été validé.",
      unread: 0,
      updatedAt: at(24 * 60),
      messages: [
        {
          id: "m7",
          author: "Support",
          text: "Votre dépôt a bien été validé sur votre Compte BelivaY.",
          createdAt: at(24 * 60),
        },
      ],
    },
  ];
}

function read(): SupportConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed();
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

export function getSupportConversations(): SupportConversation[] {
  return read().sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function getUnreadSupportCount(): number {
  return read().reduce((sum, conversation) => sum + (conversation.unread || 0), 0);
}

/** Marque une conversation comme lue — appelée à l'ouverture du fil. */
export function markSupportConversationRead(id: string) {
  const current = read();
  if (!current.some((conversation) => conversation.id === id && conversation.unread > 0)) return;
  write(current.map((conversation) => (conversation.id === id ? { ...conversation, unread: 0 } : conversation)));
}

export function addSupportMessage(id: string, text: string, author = "Vous") {
  const trimmed = text.trim();
  if (!trimmed) return;

  const now = new Date().toISOString();
  write(
    read().map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            preview: trimmed,
            updatedAt: now,
            unread: author === "Vous" ? 0 : conversation.unread + 1,
            messages: [
              ...conversation.messages,
              { id: `${conversation.id}-${Date.now()}`, author, text: trimmed, createdAt: now },
            ],
          }
        : conversation,
    ),
  );
}

/** Ouvre un nouveau fil support, par exemple depuis un formulaire de contact. */
export function openSupportConversation(name: string, firstMessage: string): SupportConversation {
  const now = new Date().toISOString();
  const conversation: SupportConversation = {
    id: `support-${Date.now()}`,
    name,
    preview: firstMessage,
    unread: 0,
    updatedAt: now,
    messages: [{ id: `msg-${Date.now()}`, author: "Vous", text: firstMessage, createdAt: now }],
  };
  write([conversation, ...read()]);
  return conversation;
}

/** Horodatage court utilisé dans la liste des conversations. */
export function formatSupportTime(iso: string): string {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  if (sameDay) return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
