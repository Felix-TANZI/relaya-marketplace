/**
 * Aide — les questions que le comptoir pose vraiment.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE FAQ EST UN ENGAGEMENT, PAS UN TEXTE D'ACCOMPAGNEMENT
 *
 * C'est ici qu'un gérant vient vérifier avant de répondre à un client. Une
 * phrase approximative y devient une phrase qu'il répétera au comptoir, et
 * qu'on lui opposera.
 *
 * D'où un choix : la réponse sur la rémunération ne contient AUCUN montant
 * écrit en dur. Elle lit la grille tarifaire réelle (`getRelayTariff`) et
 * les constantes de garde du serveur. Si le contrat change, la réponse suit
 * — au lieu de mentir jusqu'à ce que quelqu'un s'en aperçoive.
 */
import { useEffect, useMemo, useState } from "react";
import { Camera, MessageCircle, Minus, Plus, Search, Send } from "lucide-react";
import { getRelayTariff, type RelayTariffLine } from "@/services/api/relaySettlements";

/** Garde gratuite puis facturée — `RelayParcel.GARDE_*` côté serveur. */
const GARDE_GRATUITE_JOURS = 3;
const GARDE_TARIF_JOUR = 200;

const TAILLES: Record<string, string> = {
  SMALL: "petit",
  STANDARD: "standard",
  LARGE: "gros",
  BULKY: "encombrant",
};

const nf = (n: number) => n.toLocaleString("fr-FR");

interface Question {
  q: string;
  /** `string` pour les réponses fixes, fonction pour celles qui lisent l'état. */
  r: string | ((grille: RelayTariffLine[]) => string);
}

const QUESTIONS: Question[] = [
  {
    q: "Le livreur n'a pas de code de dépôt",
    r:
      "Ne prenez pas le lot. Écrivez au support ou demandez un rappel depuis l'app : BelivaY vérifie "
      + "la mission et vous donne le feu vert, ou fait repartir le livreur.",
  },
  {
    q: "Le client a perdu son code",
    r:
      "Il le réaffiche dans son app (QR ou 6 chiffres). Sans app, il demande un renvoi par SMS. "
      + "Jamais de remise sans code : vous ne voyez jamais le code, le client vous le donne.",
  },
  {
    q: "Mon relais est presque plein",
    r:
      "Préparez les départs en attente et demandez plus de places dans Capacité si votre local le "
      + "permet. Les retours déposés ne comptent pas dans vos places.",
  },
  {
    q: "Quand et comment suis-je payé ?",
    // La seule reponse qui parle d'argent : elle se compose a partir de la
    // grille servie par le serveur, jamais d'un montant recopie.
    r: (grille) => {
      const lignes = grille
        .filter((ligne) => TAILLES[ligne.parcel_size])
        .map((ligne) => `${nf(ligne.amount_xaf)} F ${TAILLES[ligne.parcel_size]}`)
        .join(", ");
      return (
        "Chaque vendredi, sans frais et sans minimum, sur votre numéro de versement vérifié"
        + (lignes ? ` : ${lignes}` : "")
        + `. La garde est offerte jusqu'au ${GARDE_GRATUITE_JOURS}e jour, puis facturée `
        + `${nf(GARDE_TARIF_JOUR)} F par jour au client. C'est BelivaY qui vous paie, même quand la `
        + "livraison est offerte au client."
      );
    },
  },
  {
    q: "Un colis est abîmé à l'arrivée",
    r:
      "Réserve avec photo si c'est léger, refus avec deux photos si le scellé du livreur (ou le film "
      + "d'un encombrant) est cassé : il repart avec le livreur et vous n'en êtes pas responsable.",
  },
  {
    q: "Un avis me semble injuste",
    r:
      "Signalez-le depuis la Messagerie : un avis n'est retiré que pour une insulte, une donnée "
      + "personnelle ou un hors-sujet, avec un motif tracé. Vous pouvez aussi répondre en privé au "
      + "client.",
  },
  {
    q: "Panne générale : le mode papier",
    r:
      "BelivaY vous prévient par un SMS ou un WhatsApp de diffusion : c'est le seul usage de WhatsApp "
      + "côté relais. Notez sur le registre papier la référence, le code donné par le client, sa "
      + "pièce d'identité, sa signature et l'heure. Seuls les colis sans montant à payer se "
      + "remettent. Saisissez tout dans l'app dès le retour du réseau, dans les 72 h.",
  },
];

/** Les sujets, pour que le support sache qui lire en premier. */
const SUJETS = ["Réception", "Retrait", "Stock", "Argent", "Autre"];

export default function RelayHelp({
  onOpenInbox,
  busy,
  onSend,
}: {
  onOpenInbox: () => void;
  busy: boolean;
  /** Rend `true` si la demande est partie. */
  onSend: (sujet: string, corps: string) => Promise<boolean>;
}) {
  const [ouvertes, setOuvertes] = useState<string[]>([]);
  const [sujet, setSujet] = useState(SUJETS[0]);
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [envoye, setEnvoye] = useState(false);

  const envoyer = async () => {
    // La reference rejoint le corps : `/api/contact/` ne porte qu'un sujet et
    // un message, et la perdre obligerait le support a la redemander.
    const corps = [reference.trim() ? `Colis : ${reference.trim()}` : "", message.trim()]
      .filter(Boolean)
      .join("\n");
    const ok = await onSend(sujet, corps);
    if (!ok) return;
    setReference("");
    setMessage("");
    setPhoto(null);
    setEnvoye(true);
  };
  const [recherche, setRecherche] = useState("");
  const [grille, setGrille] = useState<RelayTariffLine[]>([]);

  useEffect(() => {
    let vivant = true;
    getRelayTariff()
      .then((lignes) => {
        if (vivant) setGrille(Array.isArray(lignes) ? lignes : []);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  const basculer = (q: string) =>
    setOuvertes((actuelles) =>
      actuelles.includes(q) ? actuelles.filter((item) => item !== q) : [...actuelles, q],
    );

  /** La recherche porte sur la question ET sur sa réponse. */
  const visibles = useMemo(() => {
    const texte = recherche.trim().toLowerCase();
    if (!texte) return QUESTIONS;
    return QUESTIONS.filter((item) => {
      const reponse = typeof item.r === "function" ? item.r(grille) : item.r;
      return `${item.q} ${reponse}`.toLowerCase().includes(texte);
    });
  }, [grille, recherche]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center pt-1">
        <img src="/belivay-logo.png" alt="" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
        <h2 className="mt-3.5 text-center text-[23px] font-black leading-[1.14] tracking-[-0.03em] text-slate-900 dark:text-white">
          Comment peut-on vous aider ?
        </h2>
      </div>

      <div className="relative">
        <Search
          size={19}
          strokeWidth={2.4}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#EF6A00]"
          aria-hidden
        />
        <input
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder="Code perdu, relais plein, versement…"
          aria-label="Rechercher dans l'aide"
          className="w-full rounded-[14px] border-2 border-[#F6CFA8] bg-white py-3.5 pl-12 pr-4 text-[14.5px] font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-[#EF6A00] dark:border-orange-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* ── Parler à quelqu'un ─────────────────────────────────────────────
          En vert, et au-dessus de la FAQ : quand on cherche de l'aide au
          comptoir, un client attend. Lire sept questions n'est pas toujours
          la bonne reponse. */}
      <button
        type="button"
        onClick={onOpenInbox}
        className="flex w-full items-center gap-3.5 rounded-[14px] bg-gradient-to-r from-[#1F7A4D] to-[#155C39] px-4 py-3.5 text-left text-white shadow-[0_4px_14px_rgba(21,92,57,.3)] transition active:scale-[.98]"
      >
        <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-[#1F7A4D]">
          <MessageCircle size={21} strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-black leading-tight">Parler à quelqu'un</span>
          <span className="mt-0.5 block text-[13px] font-medium text-white/85">
            Messagerie ou rappel · 8 h – 20 h, 7 j / 7
          </span>
        </span>
        <span className="flex-shrink-0 text-[20px] font-black text-white/70" aria-hidden>
          ›
        </span>
      </button>

      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Questions fréquentes
        </h3>

        {visibles.length === 0 ? (
          <p className="py-6 text-center text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
            Aucune réponse ne correspond. Écrivez-nous, quelqu'un vous répondra.
          </p>
        ) : (
          <dl className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {visibles.map((item) => {
              const ouverte = ouvertes.includes(item.q);
              const reponse = typeof item.r === "function" ? item.r(grille) : item.r;
              return (
                <div key={item.q} className="py-3.5">
                  <dt>
                    <button
                      type="button"
                      onClick={() => basculer(item.q)}
                      aria-expanded={ouverte}
                      className="flex w-full items-start justify-between gap-4 text-left"
                    >
                      <span className="min-w-0 flex-1 text-[15.5px] font-black leading-snug text-slate-900 dark:text-white">
                        {item.q}
                      </span>
                      <span className="mt-[3px] flex-shrink-0 text-[#2456D6] dark:text-indigo-400">
                        {ouverte ? <Minus size={18} strokeWidth={2.6} /> : <Plus size={18} strokeWidth={2.6} />}
                      </span>
                    </button>
                  </dt>
                  {ouverte ? (
                    <dd className="mt-2 text-[13.5px] font-medium leading-[1.6] text-slate-500 dark:text-slate-400">
                      {reponse}
                    </dd>
                  ) : null}
                </div>
              );
            })}
          </dl>
        )}
      </section>

      {/* ── Écrire au support ──────────────────────────────────────────── */}
      <section className="rounded-[14px] border border-slate-200 bg-white px-5 pb-5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Écrire au support
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUJETS.map((item) => {
            const on = item === sujet;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={on}
                onClick={() => setSujet(item)}
                className={`rounded-full border px-3.5 py-[7px] text-[13px] font-bold transition active:scale-[.96] ${
                  on
                    ? "border-[#F6CFA8] bg-[#FFF1E2] text-[#EF6A00] dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Référence du colis (si concerné)
        </label>
        <input
          value={reference}
          onChange={(event) => setReference(event.target.value.toUpperCase())}
          placeholder="BV-00000"
          aria-label="Référence du colis"
          className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-bold tabular-nums text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:font-medium placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <label className="mt-4 block text-[11.5px] font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Message
        </label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Décrivez ce qui se passe"
          aria-label="Message"
          className="mt-2 w-full resize-none rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-medium leading-snug text-slate-900 outline-none transition focus:border-[#EF6A00] placeholder:text-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <label className="flex cursor-pointer items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            <Camera size={18} strokeWidth={2.2} /> {photo ? "Photo jointe" : "Photo"}
          </label>
          <button
            type="button"
            onClick={() => void envoyer()}
            disabled={busy || message.trim().length < 10}
            className="pr-btn flex items-center justify-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[15px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            <Send size={18} strokeWidth={2.4} /> {busy ? "Envoi…" : "Envoyer"}
          </button>
        </div>

        {/*
          La photo est collectee mais PAS transmise : `/api/contact/` n'accepte
          qu'un sujet et un texte, aucun fichier. Le dire evite qu'un gerant
          joigne la preuve d'un colis abime en croyant l'avoir envoyee.
        */}
        {photo ? (
          <p className="mt-2.5 text-[12.5px] font-medium leading-snug text-[#8A5A00] dark:text-amber-400">
            La photo ne part pas encore avec ce formulaire : le support vous la redemandera depuis la
            Messagerie.
          </p>
        ) : null}

        {envoye ? (
          <p className="mt-2.5 text-[13px] font-semibold text-[#1F7A4D] dark:text-emerald-400">
            Demande transmise. Le support répond depuis la Messagerie.
          </p>
        ) : null}
      </section>
    </div>
  );
}
