import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, LifeBuoy, Lock, Mail, MessagesSquare, Scale, Send, Truck } from "lucide-react";
import { http } from "@/services/api/http";
import { ModuleHeader, Panel, StatusPill } from "./RelayUi";

/**
 * Messagerie supervisee du point relais.
 *
 * L'anonymat V5 ch.1 interdit tout contact direct avec les acheteurs et les
 * vendeurs : le gerant ne dispose que de trois canaux officiels. Seul le canal
 * support accepte une reponse libre (transmise via /api/contact/) ; le
 * mediateur et la coordination logistique sont des canaux descendants, ou la
 * reponse passe par le dossier litige ou par la mission concernee.
 */

interface RelayInboxProps {
  onError: (error: unknown) => void;
  relay: { name: string; email: string; phone: string };
  /** Bascule vers un autre onglet du portail (lien "ouvrir le dossier litige"). */
  onNavigate?: (tab: "litiges" | "reception") => void;
}

type ChannelKey = "support" | "mediateur" | "logistique";

interface ChannelMessageSeed {
  id: string;
  from: "belivay" | "relais";
  authorKey: string;
  bodyKey: string;
}

interface ChannelMessage {
  id: string;
  from: "belivay" | "relais";
  author: string;
  body: string;
  at: string;
}

interface Channel {
  key: ChannelKey;
  nameKey: string;
  icon: typeof LifeBuoy;
  /** Pastille de tete de conversation, une couleur par interlocuteur. */
  tile: string;
  roleKey: string;
  /** Canal descendant : la reponse libre y est fermee. */
  readOnly: boolean;
  official?: boolean;
  closedHintKey?: string;
  seed: ChannelMessageSeed[];
}

const CHANNELS: Channel[] = [
  {
    key: "support",
    nameKey: "rl2_inbox.channel_support_name",
    icon: LifeBuoy,
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
    roleKey: "rl2_inbox.channel_support_role",
    readOnly: false,
    seed: [
      {
        id: "support-1",
        from: "relais",
        authorKey: "rl2_inbox.author_you",
        bodyKey: "rl2_inbox.seed_support_1_body",
      },
      {
        id: "support-2",
        from: "belivay",
        authorKey: "rl2_inbox.channel_support_name",
        bodyKey: "rl2_inbox.seed_support_2_body",
      },
    ],
  },
  {
    key: "mediateur",
    nameKey: "rl2_inbox.channel_mediator_name",
    icon: Scale,
    tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
    roleKey: "rl2_inbox.channel_mediator_role",
    readOnly: true,
    closedHintKey: "rl2_inbox.channel_mediator_closed_hint",
    seed: [
      {
        id: "mediateur-1",
        from: "belivay",
        authorKey: "rl2_inbox.channel_mediator_name",
        bodyKey: "rl2_inbox.seed_mediator_1_body",
      },
    ],
  },
  {
    key: "logistique",
    nameKey: "rl2_inbox.channel_logistics_name",
    icon: Truck,
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
    roleKey: "rl2_inbox.channel_logistics_role",
    readOnly: true,
    official: true,
    closedHintKey: "rl2_inbox.channel_logistics_closed_hint",
    seed: [
      {
        id: "logistique-1",
        from: "belivay",
        authorKey: "rl2_inbox.channel_logistics_name",
        bodyKey: "rl2_inbox.seed_logistics_1_body",
      },
    ],
  },
];

const STORAGE_KEY = "belivay.relay.inbox";

interface StoredInbox {
  read: ChannelKey[];
  sent: Record<string, ChannelMessage[]>;
}

function readStoredInbox(): StoredInbox {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredInbox>) : null;
    return { read: parsed?.read ?? [], sent: parsed?.sent ?? {} };
  } catch {
    return { read: [], sent: {} };
  }
}

function writeStoredInbox(state: StoredInbox) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : la messagerie reste utilisable, sans memoire locale. */
  }
}

function timeLabel(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function preview(text: string, size = 46) {
  return text.length > size ? `${text.slice(0, size)}…` : text;
}

export default function RelayInbox({ onError, relay, onNavigate }: RelayInboxProps) {
  const { t } = useTranslation();
  const [inbox, setInbox] = useState<StoredInbox>(readStoredInbox);
  const [openKey, setOpenKey] = useState<ChannelKey | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  useEffect(() => {
    writeStoredInbox(inbox);
  }, [inbox]);

  /** Fil complet d'un canal : messages officiels + reponses deja envoyees. */
  const threadOf = useMemo(
    () => (channel: Channel): ChannelMessage[] => [
      ...channel.seed.map((message) => ({
        id: message.id,
        from: message.from,
        author: t(message.authorKey),
        body: t(message.bodyKey),
        at: "",
      })),
      ...(inbox.sent[channel.key] ?? []),
    ],
    [inbox.sent, t],
  );

  const unreadCount = (channel: Channel) => (inbox.read.includes(channel.key) ? 0 : 1);
  const totalUnread = CHANNELS.reduce((sum, channel) => sum + unreadCount(channel), 0);

  const open = (channel: Channel) => {
    setOpenKey(channel.key);
    setDraft("");
    setSentNotice(null);
    if (!inbox.read.includes(channel.key)) {
      setInbox((previous) => ({ ...previous, read: [...previous.read, channel.key] }));
    }
  };

  const openChannel = CHANNELS.find((channel) => channel.key === openKey) ?? null;

  const send = async () => {
    if (!openChannel || openChannel.readOnly || draft.trim().length < 10) return;
    setBusy(true);
    setSentNotice(null);
    const body = draft.trim();

    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relay.name,
          email: relay.email,
          phone: relay.phone,
          subject: t("rl2_inbox.contact_subject", { name: relay.name }),
          message: body,
        }),
      });

      const message: ChannelMessage = {
        id: `${openChannel.key}-${Date.now()}`,
        from: "relais",
        author: t("rl2_inbox.author_you"),
        body,
        at: new Date().toISOString(),
      };
      setInbox((previous) => ({
        ...previous,
        sent: { ...previous.sent, [openChannel.key]: [...(previous.sent[openChannel.key] ?? []), message] },
      }));
      setDraft("");
      setSentNotice(t("rl2_inbox.sent_notice"));
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        icon={Mail}
        title={t("rl2_inbox.header_title")}
        subtitle={t("rl2_inbox.header_subtitle")}
      />

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/30">
        <Lock size={17} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-300" />
        <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
          {t("rl2_inbox.supervised_notice_prefix")}{" "}
          <strong className="font-black text-blue-800 dark:text-blue-200">{t("rl2_inbox.supervised_notice_strong")}</strong>.{" "}
          {t("rl2_inbox.supervised_notice_suffix")}
        </p>
      </div>

      {openChannel === null ? (
        <Panel
          icon={MessagesSquare}
          title={t("rl2_inbox.conversations_title")}
          action={<StatusPill tone={totalUnread > 0 ? "blue" : "slate"}>{CHANNELS.length}</StatusPill>}
        >
          <div className="space-y-2.5">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const thread = threadOf(channel);
              const last = thread[thread.length - 1];
              const unread = unreadCount(channel);
              return (
                <button
                  key={channel.key}
                  type="button"
                  onClick={() => open(channel)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 text-left transition hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800 dark:hover:bg-slate-800"
                >
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${channel.tile}`}>
                    <Icon size={18} strokeWidth={2.4} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-950 dark:text-white">{t(channel.nameKey)}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {last ? preview(last.body) : t(channel.roleKey)}
                    </span>
                  </span>
                  {channel.official ? (
                    <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                      {t("rl2_inbox.official_badge")}
                    </span>
                  ) : unread > 0 ? (
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                      {unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel
          icon={openChannel.icon}
          title={t(openChannel.nameKey)}
          action={
            <button
              type="button"
              onClick={() => setOpenKey(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft size={14} strokeWidth={2.6} /> {t("rl2_inbox.back_to_conversations")}
            </button>
          }
        >
          <p className="-mt-2 mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{t(openChannel.roleKey)}</p>

          <div className="space-y-3">
            {threadOf(openChannel).map((message) => {
              const mine = message.from === "relais";
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      mine
                        ? "bg-blue-600 text-white"
                        : "border border-slate-100 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className={`text-[11px] font-black uppercase tracking-[0.12em] ${mine ? "text-white/70" : "text-slate-400"}`}>
                      {message.author}
                      {message.at ? ` · ${timeLabel(message.at)}` : ""}
                    </div>
                    <p className="mt-1.5">{message.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {openChannel.readOnly ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                <Lock size={16} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-slate-400" />
                {openChannel.closedHintKey ? t(openChannel.closedHintKey) : ""}
              </p>
              {onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate(openChannel.key === "mediateur" ? "litiges" : "reception")}
                  className="mt-3 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200"
                >
                  {openChannel.key === "mediateur" ? t("rl2_inbox.open_disputes") : t("rl2_inbox.open_parcel_reception")}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              {sentNotice ? (
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                  {sentNotice}
                </div>
              ) : null}
              <label className="block">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t("rl2_inbox.your_message_label")}</span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t("rl2_inbox.message_placeholder")}
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {draft.trim().length < 10 ? t("rl2_inbox.min_characters") : t("rl2_inbox.ready_to_send")}
                </span>
                <button
                  type="button"
                  onClick={send}
                  disabled={busy || draft.trim().length < 10}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={15} strokeWidth={2.6} />
                  {busy ? t("rl2_inbox.sending") : t("rl2_inbox.send_button")}
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
