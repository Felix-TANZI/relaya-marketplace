/**
 * Messagerie supervisée du point relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS INTERLOCUTEURS, UN SEUL DESTINATAIRE
 *
 * L'anonymat V5 ch.1 interdit tout contact direct avec les acheteurs et les
 * vendeurs. Le gérant n'écrit jamais « au client » : il écrit à BelivaY, qui
 * relaie. Les trois conversations ne sont donc pas trois correspondants —
 * c'est le même, sur trois sujets, et le bandeau du bas le rappelle parce que
 * c'est exactement ce qu'on oublie quand une messagerie ressemble à WhatsApp.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI EST VRAI, ET CE QUI NE L'EST PAS
 *
 * Il n'existe pas de fil de discussion côté serveur pour un point relais.
 * Deux mécanismes réels tiennent lieu de messagerie :
 *
 *   · le support reçoit un message par `/api/contact/` — un envoi, pas un
 *     échange : la réponse arrive par notification, pas dans ce fil ;
 *   · les demandes de preuve sur litige (`/orders/evidence-requests/`) sont
 *     de vrais allers-retours : BelivaY demande une photo, le gérant répond
 *     avec le fichier, et le statut passe à SUBMITTED.
 *
 * Le fil « Dossier » est donc le seul réellement conversationnel. Les deux
 * autres le disent au lieu de faire semblant.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import i18n from "@/i18n";
import { Camera, Lock, Send, ShoppingCart, Truck } from "lucide-react";
import { http } from "@/services/api/http";
import { customerApi, type DisputeEvidenceRequest } from "@/services/api/customer";
import { ensureImageUnderLimit } from "@/lib/imageCompression";

interface RelayInboxProps {
  onError: (error: unknown) => void;
  relay: { name: string; email: string; phone: string };
  /** Bascule vers un autre onglet du portail. */
  onNavigate?: (tab: "litiges" | "reception" | "sortie") => void;
  /** Colis qui doivent quitter le local : la seule matière du canal logistique. */
  outbound?: number;
  /** Colis annoncés par un livreur. */
  arrivals?: number;
}

type Sender = "belivay" | "relais";

interface Message {
  id: string;
  from: Sender;
  body: string;
  at: string;
  /** Bulle sombre à part : un fichier transmis, pas une phrase. */
  attachment?: boolean;
}

const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function heure(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : HEURE.format(date);
}

/** Réponses d'un mot, celles qu'on tape dix fois par semaine. */
const RAPIDES = ["Photo ajoutée", i18n.t("rl3.le_colis_est_range"), "Rappelez-moi"];

export default function RelayInbox({ onError, relay, onNavigate, outbound = 0, arrivals = 0 }: RelayInboxProps) {
  const [requests, setRequests] = useState<DisputeEvidenceRequest[]>([]);
  const [active, setActive] = useState<string>("support");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  /** Ce que le gérant a envoyé au support pendant cette session. */
  const [sent, setSent] = useState<Message[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const load = () =>
    customerApi
      .getPendingEvidenceRequests()
      .then(setRequests)
      .catch(() => setRequests([]));

  useEffect(() => {
    void load();
  }, []);

  /**
   * Les conversations, dans l'ordre où elles pressent : le support répond,
   * les dossiers attendent une pièce, la logistique informe.
   */
  const conversations = useMemo(() => {
    const dossiers = requests.map((demande) => ({
      key: `dossier-${demande.id}`,
      title: `Dossier LT-${String(demande.dispute).padStart(4, "0")}`,
      subtitle: `${demande.evidence_types.join(", ") || "Pièce demandée"} · demande de ${demande.requested_by_name}`,
      preview: demande.instructions || "BelivaY vous demande une pièce.",
      badge: demande.status === "PENDING" ? 1 : 0,
      time: heure(demande.created_at),
      avatar: "initials" as const,
      initials: "LT",
      status: demande.status === "PENDING" ? "En examen" : i18n.t("rl3.piece_envoyee"),
      request: demande,
      messages: [
        {
          id: `d-${demande.id}-ask`,
          from: "belivay" as Sender,
          body: demande.instructions || "Pouvez-vous ajouter une photo ?",
          at: demande.created_at,
        },
        ...(demande.responded_at
          ? [{ id: `d-${demande.id}-ok`, from: "relais" as Sender, body: i18n.t("rl3.photo_envoyee"), at: demande.responded_at, attachment: true }]
          : []),
      ],
    }));

    return [
      {
        key: "support",
        title: "Support BelivaY",
        subtitle: i18n.t("rl3.assistance_operationnelle_reception_stocka"),
        preview: sent.length > 0 ? sent[sent.length - 1].body : i18n.t("rl3.ecrivez_nous_reponse_sous_un_jour_ouvre"),
        badge: 0,
        time: sent.length > 0 ? heure(sent[sent.length - 1].at) : "",
        avatar: "cart" as const,
        initials: "",
        status: "Ouvert",
        request: null,
        messages: sent,
      },
      ...dossiers,
      {
        key: "logistique",
        title: i18n.t("rl3.collectes_et_livraisons"),
        subtitle: i18n.t("rl3.canal_descendant_belivay_vous_informe"),
        preview:
          outbound > 0
            ? i18n.t("c06.relais.a_remettre_prochain_passage", { count: outbound })
            : arrivals > 0
              ? i18n.t("c06.relais.annonces_a_receptionner", { count: arrivals })
              : i18n.t("rl3.aucun_mouvement_prevu_pour_l_instant"),
        badge: 0,
        time: "",
        avatar: "truck" as const,
        initials: "",
        status: "Lecture seule",
        request: null,
        messages: [] as Message[],
      },
    ];
  }, [arrivals, outbound, requests, sent]);

  const courante = conversations.find((conversation) => conversation.key === active) ?? conversations[0];
  const lectureSeule = courante.key === "logistique";

  const envoyer = async () => {
    const texte = draft.trim();
    if (!texte || sending) return;
    setSending(true);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relay.name,
          email: relay.email,
          phone: relay.phone,
          subject: `[Point relais] ${courante.title}`,
          message: texte,
        }),
      });
      setSent((current) => [
        ...current,
        { id: `s-${Date.now()}`, from: "relais", body: texte, at: new Date().toISOString() },
      ]);
      setDraft("");
    } catch (error) {
      onError(error);
    } finally {
      setSending(false);
    }
  };

  /**
   * La photo n'est pas une pièce jointe de discussion : c'est une réponse à
   * une demande officielle, qui clôt la demande côté serveur. Hors d'un
   * dossier, elle n'aurait aucun destinataire.
   */
  const envoyerPhoto = async (file: File | null) => {
    if (!file || !courante.request) return;
    setSending(true);
    try {
      const optimized = await ensureImageUnderLimit(file);
      await customerApi.respondToEvidenceRequest(courante.request.id, [optimized], "Pièce transmise par le point relais");
      await load();
    } catch (error) {
      onError(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Les conversations ──────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <ul>
          {conversations.map((conversation) => {
            const on = conversation.key === courante.key;
            return (
              <li key={conversation.key}>
                <button
                  type="button"
                  onClick={() => setActive(conversation.key)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:scale-[.99] ${
                    on ? "bg-[#EAF0FF] dark:bg-blue-950/40" : ""
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                      conversation.avatar === "cart"
                        ? "border border-slate-200 bg-white text-[#EF6A00] dark:border-slate-700 dark:bg-slate-800"
                        : conversation.avatar === "truck"
                          ? "bg-[#0E1B38] text-[#E8A10E]"
                          : "bg-[#6B4700] text-[13px] font-black text-white"
                    }`}
                  >
                    {conversation.avatar === "cart" ? (
                      <ShoppingCart size={20} strokeWidth={2.2} />
                    ) : conversation.avatar === "truck" ? (
                      <Truck size={20} strokeWidth={2.2} />
                    ) : (
                      conversation.initials
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {conversation.title}
                    </span>
                    <span className="mt-1 block truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {conversation.preview}
                    </span>
                  </span>

                  {conversation.badge > 0 ? (
                    <span className="flex h-[26px] min-w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#FFF1E2] px-1.5 text-[12.5px] font-black text-[#B84A00] dark:bg-orange-950 dark:text-orange-300">
                      {conversation.badge}
                    </span>
                  ) : conversation.time ? (
                    <span className="flex-shrink-0 text-[12px] font-medium text-slate-400 dark:text-slate-500">
                      {conversation.time}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Le fil ─────────────────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-4 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-black text-slate-900 dark:text-white">{courante.title}</h3>
            <p className="mt-0.5 truncate text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
              {courante.subtitle}
            </p>
          </div>
          <span className="flex-shrink-0 rounded-full bg-[#FFF4D6] px-3 py-[5px] text-[12.5px] font-bold text-[#8A5A00] dark:bg-amber-950 dark:text-amber-300">
            {courante.status}
          </span>
        </div>

        <div className="space-y-3 py-4">
          {courante.messages.length === 0 ? (
            <p className="py-4 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
              {lectureSeule
                ? i18n.t("rl3.belivay_publie_ici_les_collectes_et_les_ar")
                : i18n.t("rl3.aucun_message_pour_l_instant")}
            </p>
          ) : (
            courante.messages.map((message) =>
              message.attachment ? (
                <div key={message.id} className="flex justify-end">
                  <div className="flex items-center gap-2 rounded-[14px] bg-[#0E1B38] px-4 py-3.5 text-[14.5px] font-black text-[#E8A10E]">
                    <Camera size={17} strokeWidth={2.4} /> {message.body}
                  </div>
                </div>
              ) : message.from === "relais" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="pr-sunrise max-w-[82%] rounded-[16px] rounded-br-[4px] px-4 py-3 text-white">
                    <p className="text-[14.5px] font-medium leading-[1.45]">{message.body}</p>
                    <p className="mt-1.5 text-[11.5px] font-medium text-white/80">{i18n.t("t06.vous")}{heure(message.at)}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[82%] rounded-[14px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[14.5px] font-medium leading-[1.45] text-slate-900 dark:text-white">
                      {message.body}
                    </p>
                    <p className="mt-1.5 text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
                      BelivaY · {heure(message.at)}
                    </p>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {lectureSeule ? (
          <button
            type="button"
            onClick={() => onNavigate?.(outbound > 0 ? "sortie" : "reception")}
            className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-black text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {outbound > 0 ? i18n.t("rl3.voir_ce_qui_doit_partir") : i18n.t("rl3.voir_les_arrivees")}
          </button>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {RAPIDES.map((texte) => (
                <button
                  key={texte}
                  type="button"
                  onClick={() => setDraft(texte)}
                  className="rounded-full border border-[#C9D7FB] bg-[#EAF0FF] px-3.5 py-[7px] text-[13px] font-semibold text-[#2456D6] transition active:scale-95 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
                >
                  {texte}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              {/* L'appareil photo ne s'allume que dans un dossier : ailleurs,
                  la pièce n'aurait aucune demande à laquelle répondre. */}
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={!courante.request || sending}
                aria-label={i18n.t("rl3.joindre_une_photo")}
                className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-600 transition active:scale-90 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Camera size={20} strokeWidth={2.2} />
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => void envoyerPhoto(event.target.files?.[0] || null)}
              />

              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void envoyer();
                }}
                placeholder={i18n.t("rl3.votre_message")}
                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-[14.5px] font-medium text-slate-900 outline-none transition focus:border-[#2456D6] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />

              <button
                type="button"
                onClick={() => void envoyer()}
                disabled={!draft.trim() || sending}
                aria-label="Envoyer"
                className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center pr-sunrise rounded-full transition active:scale-90 disabled:opacity-40"
              >
                <Send size={19} strokeWidth={2.4} />
              </button>
            </div>
          </>
        )}
      </section>

      {/* ── Le rappel qui compte ───────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-[14px] bg-[#EAF0FF] px-4 py-3.5 dark:bg-blue-950/40">
        <Lock size={18} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#8FB0FF] dark:text-blue-300" />
        <p className="text-[13.5px] font-medium leading-[1.55] text-[#9FAACB] dark:text-blue-100/80">{i18n.t("t06.vous_echangez_uniquement_avec_belivay_jama")}</p>
      </div>
    </div>
  );
}
