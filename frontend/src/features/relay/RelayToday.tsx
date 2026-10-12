/**
 * L'ecran « Aujourd'hui » du point relais — la vue d'accueil du portail.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QU'IL REMPLACE
 *
 * L'ancien tableau de bord etait une grille de panneaux pensee pour un ecran
 * large : quatre compteurs, un panneau d'arrivees, un panneau Trust. Sur le
 * telephone du gerant — le seul ecran qu'il a vraiment au guichet — cela
 * donnait une pile de blocs sans hierarchie, ou « six livreurs arrivent »
 * pesait autant que « module en cours de developpement ».
 *
 * Cet ecran repose sur une seule question : QU'EST-CE QUE JE FAIS LA,
 * MAINTENANT ? D'ou l'ordre des blocs, du plus urgent au plus informatif :
 *
 *   1. l'arrivee livreur      — la seule chose qui a une contrainte de temps
 *   2. les quatre compteurs   — l'etat du local d'un coup d'oeil
 *   3. « A faire maintenant » — la liste des actions reellement en attente
 *   4. les gains              — la raison pour laquelle il fait ce metier
 *   5. Trust + avis           — sa reputation, consultable, pas urgente
 *
 * ─────────────────────────────────────────────────────────────────────────
 * UNE SEULE COULEUR PLEINE PAR ECRAN
 *
 * L'orange n'est pas une couleur d'accent ici, c'est un minuteur : il ne sert
 * qu'a ce qui expire. La carte d'arrivee et le chiffre du dernier jour le
 * portent, rien d'autre. Le bleu designe ce qui se consulte, le vert ce qui
 * est acquis, le fond sombre ce qui recompense. Un gerant qui apprend ces
 * quatre regles lit l'ecran sans le lire.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * AUCUN CHIFFRE INVENTE
 *
 * Chaque nombre affiche ici vient des donnees deja chargees par le portail ou
 * d'un appel au coeur metier existant (`getRelayDue`, avis acheteurs). Quand
 * une donnee n'existe pas — l'heure d'arrivee exacte du livreur, par exemple —
 * le bloc ne la fabrique pas : il montre ce qu'il sait.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight, CreditCard, KeyRound, ShieldCheck, Truck, Wifi, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { http } from "@/services/api/http";
import {
  formatLong,
  getRelayDue,
  humaniserBlocage,
  type RelayAmountDue,
} from "@/services/api/relaySettlements";

const nf = (value: number) => value.toLocaleString("fr-FR");

/** Circonference de l'anneau du Trust Score (r = 15.5 dans un viewBox de 36). */
const TRUST_RING = 2 * Math.PI * 15.5;

export type TodoTone = "blue" | "amber" | "orange" | "slate" | "red";

/** Une action en attente, telle que la liste « A faire maintenant » l'affiche. */
export interface RelayTodoItem {
  id: string;
  icon: LucideIcon;
  tone: TodoTone;
  title: string;
  detail: string;
  onClick: () => void;
}

/** Destinations atteignables depuis cet ecran. */
export type TodayTarget =
  | "reception"
  | "retrait"
  | "stock"
  | "sortie"
  | "capacite"
  | "finances"
  | "trust"
  | "avis";

/** Pastille de l'icone : une couleur par famille d'action. */
const TODO_TONE: Record<TodoTone, string> = {
  blue: "bg-[#EAF0FF] text-[#3A6BEA] dark:bg-blue-950 dark:text-blue-300",
  amber: "bg-[#FFF4D6] text-[#E8A10E] dark:bg-amber-950 dark:text-amber-300",
  orange: "bg-[#FFF1E2] text-[#EF6A00] dark:bg-orange-950 dark:text-orange-300",
  slate: "bg-[#F1ECE6] text-[#9FAACB] dark:bg-slate-800 dark:text-slate-300",
  red: "bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-300",
};

/** Couleur du grand nombre d'une tuile : neutre, ou teintee si elle appelle une action. */
const TILE_TONE = {
  slate: "text-slate-900 dark:text-white",
  amber: "text-[#EF6A00] dark:text-orange-400",
  blue: "text-[#2456D6] dark:text-blue-400",
} as const;

export type TileTone = keyof typeof TILE_TONE;

/** Date du jour en toutes lettres, premiere lettre en capitale. */
function todayLabel(locale: "fr" | "en") {
  const formatted = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function Tile({
  label,
  value,
  sub,
  tone = "slate",
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: TileTone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900"
    >
      <span className="text-[11px] font-black uppercase leading-none tracking-[0.085em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className={`mt-3 text-[30px] font-black leading-none ${TILE_TONE[tone]}`}>{value}</span>
      <span className="mt-2.5 text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">{sub}</span>
    </button>
  );
}

/** Resume public des avis acheteurs, tel que le renvoie l'API des avis. */
interface ReviewSummary {
  average: number;
  count: number;
}

export default function RelayToday({
  locale,
  manager,
  arrivalCount,
  arrivalCourier,
  arrivalVehicle,
  arrivalMission,
  readyForPickup,
  lastDay,
  outbound,
  capacityUsed,
  capacityMax,
  closingLabel,
  todos,
  trust,
  lifetimeParcels,
  trainingDone,
  payoutVerified,
  onNavigate,
  footer,
}: {
  locale: "fr" | "en";
  manager: string;
  /** Colis annonces par un livreur et pas encore controles au guichet. */
  arrivalCount: number;
  /** Transporteur de l'arrivee, quand toutes les lignes viennent du meme. */
  arrivalCourier: string;
  arrivalVehicle: string;
  /** Reference de la mission, quand une seule est attendue. */
  arrivalMission: string;
  /** Colis en stock porteurs d'un code de retrait : remisables tout de suite. */
  readyForPickup: number;
  /** Colis dont la garde expire aujourd'hui, ou est deja depassee. */
  lastDay: number;
  /** Colis qui doivent quitter le local : renvoi, retour vendeur, transfert. */
  outbound: number;
  capacityUsed: number;
  capacityMax: number;
  /** Heure de fermeture (« 19 h »), vide si les horaires ne se lisent pas. */
  closingLabel: string;
  todos: RelayTodoItem[];
  trust: number;
  /**
   * Nombre de colis jamais passes par ce relais.
   *
   * C'est le seul signal honnete d'un relais NEUF. Les compteurs du jour
   * tombent a zero chaque matin : s'y fier ferait reapparaitre l'ecran de
   * bienvenue a un gerant qui travaille depuis six mois.
   */
  lifetimeParcels: number;
  /** Les modules obligatoires sont-ils suivis ? */
  trainingDone: boolean;
  /** Le numero de versement est-il confirme par code ? */
  payoutVerified: boolean;
  onNavigate: (tab: TodayTarget) => void;
  /**
   * Blocs du portail qui ne sont pas du travail de guichet (bannieres,
   * demandes de preuve). Ils passent SOUS l'ecran : places en haut, ils
   * repoussaient « Bonjour X » et l'arrivee livreur hors du premier ecran.
   */
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [due, setDue] = useState<RelayAmountDue | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [staleData, setStaleData] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Ces deux appels sont secondaires pour le travail du guichet : ils
    // echouent en silence plutot que de faire tomber l'ecran d'accueil.
    getRelayDue()
      .then((payload) => { if (mounted) setDue(payload); })
      .catch(() => undefined);
    http<{ summary: ReviewSummary }>("/api/shipping/relay-point/reviews/")
      .then((payload) => { if (mounted) setReviews(payload.summary); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  // Etat reseau : le portail sert deja ses GET depuis un cache local quand la
  // connexion tombe. Le gerant doit savoir qu'il regarde une photo du passe.
  useEffect(() => {
    const goOnline = () => { setOnline(true); setStaleData(false); };
    const goOffline = () => setOnline(false);
    const goStale = () => setStaleData(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("belivay-offline-fallback", goStale);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("belivay-offline-fallback", goStale);
    };
  }, []);

  /**
   * Un relais neuf : aucun colis n'est jamais passe par lui.
   *
   * L'ecran d'accueil ordinaire suppose une activite — « 3 retraits prevus »,
   * « livreur en approche ». Sur un comptoir qui ouvre, il n'affiche que des
   * zeros, et un gerant devant quatre zeros croit que rien ne marche. On lui
   * montre donc son premier jour, pas le vide.
   */
  const relaisNeuf = lifetimeParcels === 0;

  const freeSlots = Math.max(0, capacityMax - capacityUsed);
  const occupancyPct = capacityMax > 0 ? Math.round((capacityUsed / capacityMax) * 100) : 0;
  // Une reception occupe une place par colis : c'est le seul arbitrage que le
  // gerant doit faire AVANT que le livreur ne descende de sa moto.
  const slotsShort = capacityMax > 0 && arrivalCount > freeSlots;

  // La date de versement n'est annoncee que si rien ne la bloque : promettre un
  // virement qui n'aura pas lieu coute plus cher que de ne rien dire.
  const firstBlocker = due?.blockers?.[0];
  const connected = online && !staleData;

  /**
   * Ce que la carte sombre annonce comme « gagne cette semaine ».
   *
   * `released_not_settled_xaf` est l'argent ACQUIS depuis le dernier
   * versement, pas encore regroupe dans un lot : sur un cycle hebdomadaire,
   * c'est exactement la semaine en cours. Quand ce compteur est vide — juste
   * apres un versement, ou avant la premiere course — on bascule sur le total
   * du, et la ligne du dessous dit lequel des deux on regarde.
   *
   * Cette phrase n'est pas du remplissage : deux montants differents peuvent
   * s'afficher au meme endroit d'un jour a l'autre, et un gerant qui ne sait
   * pas lequel il voit ouvre un litige.
   */
  const acquired = due?.released_not_settled_xaf ?? 0;
  const earned = acquired > 0 ? acquired : due?.due_xaf ?? 0;
  const earnedLabel =
    acquired > 0
      ? locale === "en"
        ? "acquired since your last payout"
        : "acquis depuis votre dernier versement"
      : locale === "en"
        ? "total owed, net of deductions"
        : "total dû, net des retenues";

  return (
    <div className="space-y-3.5">
      {/* ── Salutation ───────────────────────────────────────────────────── */}
      <header className="pt-0.5">
        <h2 className="text-[23px] font-black leading-[1.14] tracking-[-0.03em] text-slate-900 dark:text-white">
          {relaisNeuf
            ? locale === "en"
              ? "Welcome to your relay!"
              : "Bienvenue au relais !"
            : `${locale === "en" ? "Hello" : "Bonjour"} ${manager}`}
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          {relaisNeuf
            ? locale === "en"
              ? "You are open. Here is how your first day goes."
              : "Vous êtes ouvert. Voici comment se passe votre premier jour."
            : `${todayLabel(locale)} · ${readyForPickup} ${
                locale === "en"
                  ? `pickup${readyForPickup > 1 ? "s" : ""} expected today`
                  : `retrait${readyForPickup > 1 ? "s" : ""} prévu${readyForPickup > 1 ? "s" : ""} aujourd'hui`
              }`}
        </p>
      </header>

      {/* ── Arrivee livreur ──────────────────────────────────────────────────
          Le seul bloc a contrainte de temps, donc le seul en couleur pleine.
          Sans arrivee, la carte reste mais se tait : un guichet libre est une
          information, pas un trou dans la page. */}
      {relaisNeuf && arrivalCount === 0 ? (
        // Meme degrade que l'arrivee livreur : c'est la meme place dans
        // l'ecran, et le gerant doit la reconnaitre quand elle se remplira.
        <section
          className="pr-span pr-sunrise pr-hero overflow-hidden p-[18px]"
        >
          <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.085em] text-white">
            {locale === "en" ? "Waiting for the first courier" : "En attente du premier livreur"}
          </p>
          <div className="mt-3 text-[25px] font-black leading-tight tracking-[-0.015em]">
            {locale === "en" ? "No parcel announced yet" : "Aucun colis annoncé pour l'instant"}
          </div>
          <p className="mt-3 text-[14.5px] font-medium leading-[1.58] text-white/95">
            {locale === "en"
              ? "As soon as a delivery company picks a batch for your relay, it appears here with its arrival window."
              : "Dès qu'une entreprise de livraison choisit un lot pour votre relais, il apparaît ici avec sa fenêtre d'arrivée."}
          </p>
        </section>
      ) : null}

      {arrivalCount > 0 ? (
        // Le degrade n'est pas un simple `to-br` : un halo dore en haut a
        // droite, la ou l'oeil entre dans la carte, puis une descente vers un
        // orange profond en bas a gauche. C'est ce qui donne du volume au
        // bloc — un degrade lineaire seul l'aplatit.
        <section
          className="pr-span pr-sunrise pr-hero overflow-hidden p-[18px]"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.085em] text-white">
              {locale === "en" ? "Courier inbound" : "Livreur en approche"}
            </p>
            {arrivalVehicle ? (
              <span className="-mt-1.5 flex-shrink-0 rounded-full bg-white/25 px-3.5 py-1.5 text-[12px] font-semibold leading-none text-white">
                {arrivalVehicle}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-start gap-3.5">
            <span className="text-[58px] font-black leading-[0.82] tracking-[-0.025em]">{arrivalCount}</span>
            <div className="min-w-0 pt-1">
              <div className="text-[18px] font-black leading-tight">
                {locale === "en" ? "parcels to check in" : "colis à réceptionner"}
              </div>
              {arrivalCourier || arrivalMission ? (
                <div className="mt-1 truncate text-[13.5px] font-semibold text-white/90">
                  {[arrivalCourier, arrivalMission].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
          </div>

          <p className="mt-4 text-[14.5px] font-medium leading-[1.58] text-white/95">
            {capacityMax === 0
              ? locale === "en"
                ? "Declare your storage capacity so BelivaY can size your arrivals."
                : "Déclarez votre nombre de places pour que BelivaY calibre vos arrivées."
              : slotsShort
                ? locale === "en"
                  ? `You need ${arrivalCount} slots and only ${freeSlots} are free. Free some space, or refuse the surplus at check-in.`
                  : `Il faut ${arrivalCount} places, vous n'en avez que ${freeSlots}. Libérez de la place, ou refusez le surplus au contrôle.`
                : locale === "en"
                  ? `You need ${arrivalCount} slots: ${freeSlots} are free.`
                  : `Il faudra ${arrivalCount} places : vous en avez ${freeSlots}.`}
            {outbound > 0
              ? locale === "en"
                ? ` The courier leaves with ${outbound} parcel${outbound > 1 ? "s" : ""}.`
                : ` Le livreur repart avec ${outbound} colis.`
              : ""}
          </p>

          <button
            type="button"
            onClick={() => onNavigate("reception")}
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-white px-4 py-4 text-[16px] font-black text-[#D95000] shadow-[0_3px_10px_rgba(107,71,0,.18)] transition active:scale-[.97]"
          >
            <KeyRound size={19} strokeWidth={2.4} />
            {locale === "en" ? "Prepare the check-in" : "Préparer la réception"}
          </button>
        </section>
      ) : (
        <section className="rounded-[14px] border border-dashed border-slate-300 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Truck size={20} />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-black text-slate-900 dark:text-white">
                {locale === "en" ? "No courier inbound" : "Aucun livreur en approche"}
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {locale === "en"
                  ? "BelivaY warns you as soon as a mission targets your relay."
                  : "BelivaY vous prévient dès qu'une mission vise votre relais."}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Etat du local ────────────────────────────────────────────────── */}
      <section className="pr-span pr-span-grid grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label={locale === "en" ? "To hand over" : "À remettre"}
          value={nf(readyForPickup)}
          sub={locale === "en" ? "parcels ready for pickup" : "colis prêts au retrait"}
          onClick={() => onNavigate("retrait")}
        />
        <Tile
          label={locale === "en" ? "Last day" : "Dernier jour"}
          value={nf(lastDay)}
          sub={
            closingLabel
              ? locale === "en"
                ? `to collect before ${closingLabel}`
                : `à retirer avant ${closingLabel}`
              : locale === "en"
                ? "storage ends today"
                : "garde échue aujourd'hui"
          }
          tone={lastDay > 0 ? "amber" : "slate"}
          onClick={() => onNavigate("stock")}
        />
        <Tile
          label={locale === "en" ? "To ship out" : "À faire partir"}
          value={nf(outbound)}
          sub={locale === "en" ? "return, send-back, transfer" : "renvoi, retour, transfert"}
          tone={outbound > 0 ? "blue" : "slate"}
          onClick={() => onNavigate("sortie")}
        />
        <Tile
          label={locale === "en" ? "Free slots" : "Places libres"}
          value={capacityMax > 0 ? nf(freeSlots) : "—"}
          sub={
            capacityMax > 0
              ? `${locale === "en" ? "of" : "sur"} ${capacityMax} · ${occupancyPct} % ${locale === "en" ? "used" : "occupé"}`
              : locale === "en"
                ? "capacity to declare"
                : "capacité à déclarer"
          }
          onClick={() => onNavigate("capacite")}
        />
      </section>

      {/* ── Votre premier jour ───────────────────────────────────────────────
          Ce qui remplace « A faire maintenant » tant que rien n'est arrive :
          une liste de MISE EN ROUTE. Les deux premieres lignes se lisent de
          l'etat reel du compte, les trois suivantes menent quelque part. */}
      {relaisNeuf ? (
        <>
          <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
              {locale === "en" ? "Your first day" : "Votre premier jour"}
            </h3>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {[
                {
                  cle: "formation",
                  fait: trainingDone,
                  titre: locale === "en" ? "Training completed" : "Formation terminée",
                  detail: locale === "en" ? "The required modules" : "Les modules obligatoires",
                  cible: "formation" as TodayTarget,
                },
                {
                  cle: "versement",
                  fait: payoutVerified,
                  titre: locale === "en" ? "Payout number verified" : "Numéro de versement vérifié",
                  detail: locale === "en" ? "Confirmed by code" : "Confirmé par code",
                  cible: "finances" as TodayTarget,
                },
                {
                  cle: "etageres",
                  fait: false,
                  titre: locale === "en" ? "Prepare your shelves" : "Préparez vos étagères",
                  detail: locale === "en" ? "Label A, B and C as on the plan" : "Étiquetez A, B et C comme sur le plan",
                  cible: "stock" as TodayTarget,
                },
                {
                  cle: "horaires",
                  fait: capacityMax > 0 && Boolean(closingLabel),
                  titre: locale === "en" ? "Check your hours" : "Vérifiez vos horaires",
                  detail: locale === "en" ? "Clients pick your relay on them" : "Les clients choisissent votre relais selon eux",
                  cible: "capacite" as TodayTarget,
                },
              ].map((ligne) => (
                <li key={ligne.cle}>
                  <button
                    type="button"
                    onClick={() => onNavigate(ligne.cible)}
                    className="flex w-full items-center gap-3 px-1 py-3.5 text-left transition active:scale-[.99]"
                  >
                    <span
                      className={`flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] ${
                        ligne.fait
                          ? "bg-[#E6F4EC] text-[#1F7A4D] dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/50 dark:text-blue-300"
                      }`}
                    >
                      {ligne.fait ? <Check size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={2.4} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                        {ligne.titre}
                      </span>
                      <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {ligne.detail}
                      </span>
                    </span>
                    {ligne.fait ? (
                      <span className="flex-shrink-0 rounded-full border border-[#BFE3CF] bg-[#E6F4EC] px-3 py-[5px] text-[12.5px] font-semibold text-[#1F7A4D] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {locale === "en" ? "Done" : "Fait"}
                      </span>
                    ) : (
                      <ChevronRight size={18} className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Pas encore de gains ──────────────────────────────────────── */}
          <section className="rounded-[14px] border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            <CreditCard size={22} strokeWidth={2.2} className="mx-auto text-[#2456D6] dark:text-blue-400" />
            <div className="mt-2.5 text-[17px] font-black text-slate-900 dark:text-white">
              {locale === "en" ? "No earnings yet" : "Pas encore de gains"}
            </div>
            {/*
              Aucun montant n'est annonce.

              La maquette promet « vos premiers 200 F ». La remuneration reelle
              depend de la taille du colis — le moteur a paye 100 F pour un
              petit et 150 F pour un standard. Annoncer un chiffre rond ferait
              attendre une somme que personne ne versera.
            */}
            <p className="mt-2 text-[13.5px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
              {locale === "en"
                ? "Your first earnings arrive with your first hand-over. Payout every Friday."
                : "Vos premiers gains arrivent à la première remise. Versement chaque vendredi."}
            </p>
          </section>

          {/* ── Trust Score en construction ──────────────────────────────── */}
          <section className="rounded-[14px] border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck size={22} strokeWidth={2.2} className="mx-auto text-[#2456D6] dark:text-blue-400" />
            <div className="mt-2.5 text-[17px] font-black text-slate-900 dark:text-white">
              {locale === "en" ? "Trust Score: building up" : "Trust Score : en construction"}
            </div>
            <p className="mt-2 text-[13.5px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
              {locale === "en"
                ? "You start from a neutral mark; it sharpens after your first operations."
                : "Vous démarrez à une note neutre ; elle se précise après vos premières opérations."}
            </p>
          </section>
        </>
      ) : null}

      {/* ── A faire maintenant ────────────────────────────────────────────── */}
      {/* `-mx-1` : ce cadre deborde de 4 px de chaque cote sur la colonne des
          autres blocs. C'est la seule liste de l'ecran qui demande une action
          — lui donner un peu plus de largeur qu'aux cartes de consultation la
          designe sans avoir a la colorer. */}
      <section className="-mx-1 rounded-[14px] border border-slate-200 bg-white px-4 pb-1.5 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
            {locale === "en" ? "To do now" : "À faire maintenant"}
          </h3>
          <span
            className={`flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-[13px] font-black ${
              todos.length > 0
                ? "bg-[#FFF1E2] text-[#B84A00] dark:bg-orange-950 dark:text-orange-300"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {todos.length}
          </span>
        </div>

        {todos.length === 0 ? (
          <p className="pb-4 pt-3 text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
            {locale === "en"
              ? "Nothing pending. Your relay is up to date."
              : "Rien en attente. Votre relais est à jour."}
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {todos.map(({ id, icon: Icon, tone, title, detail, onClick }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={onClick}
                  className="flex w-full items-center gap-3.5 py-4 text-left transition active:scale-[.99]"
                >
                  <span className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center self-start rounded-[12px] ${TODO_TONE[tone]}`}>
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-black leading-tight text-slate-900 dark:text-white">{title}</span>
                    <span className="mt-1.5 block text-[13.5px] font-medium leading-[1.42] text-slate-500 dark:text-slate-400">
                      {detail}
                    </span>
                  </span>
                  <ChevronRight size={19} strokeWidth={2} className="flex-shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Gains ────────────────────────────────────────────────────────────
          Le seul bloc sombre de la page : il ne demande rien, il recompense.
          Le contraste le detache de la pile d'actions qui le precede. */}
      {/* Bleu nuit traverse d'une lueur chaude au coin haut droit. Les deux
          couleurs ne sont pas decoratives : le bleu est celui du portail, la
          lueur orange celle de la marque — la carte qui parle d'argent est la
          seule ou les deux se touchent. */}
      <button
        type="button"
        onClick={() => onNavigate("finances")}
        className="block w-full rounded-[18px] px-[18px] py-[18px] text-left text-white shadow-[0_6px_18px_rgba(14,27,56,.28)] transition active:scale-[.98]"
        style={{
          backgroundImage:
            "radial-gradient(85% 130% at 99% -8%, rgba(239,106,0,.55) 0%, rgba(239,106,0,.18) 38%, rgba(239,106,0,0) 66%),"
            + " linear-gradient(112deg, #070C1B 0%, #0E1A3C 42%, #1B3577 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-black uppercase leading-none tracking-[0.075em] text-[#E8A10E]">
            {locale === "en" ? "Earned this week" : "Gagné cette semaine"}
          </p>
          <ChevronRight size={19} strokeWidth={2.4} className="-mt-0.5 flex-shrink-0 text-[#E8A10E]" />
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-[34px] font-black leading-none tracking-[-0.02em]">{due ? nf(earned) : "—"}</span>
          <span className="text-[13px] font-bold uppercase tracking-[0.05em] text-white/55">FCFA</span>
        </div>
        <p className="mt-2 text-[13.5px] font-medium leading-[1.5] text-white/75">
          {!due ? (
            locale === "en" ? "Loading your balance…" : "Chargement de votre solde…"
          ) : (
            <>
              {earnedLabel}
              {firstBlocker ? (
                <> · {humaniserBlocage(firstBlocker, t)}</>
              ) : due.next_settlement_at ? (
                <>
                  {locale === "en" ? " · payout expected " : " · versement prévu "}
                  <strong className="font-black text-white">{formatLong(due.next_settlement_at)}</strong>
                </>
              ) : due.next_settlement_cycle ? (
                <> · {due.next_settlement_cycle}</>
              ) : null}
            </>
          )}
        </p>
      </button>

      {/* ── Reputation ───────────────────────────────────────────────────── */}
      <section className="pr-span grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate("trust")}
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 text-left shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Anneau plutot que cercle plein : le score se lit d'abord comme une
              proportion — on voit ce qu'il reste a gagner avant de lire le
              chiffre. Un simple contour ne dirait que « il y a un nombre ici ». */}
          <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-blue-100 dark:stroke-blue-900/70" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className="stroke-[#2456D6] transition-[stroke-dasharray] duration-700 dark:stroke-blue-400"
                strokeDasharray={`${(Math.min(100, Math.max(0, trust)) / 100) * TRUST_RING} ${TRUST_RING}`}
              />
            </svg>
            <span className="text-[14px] font-black text-[#2456D6] dark:text-blue-300">{trust}</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-black leading-tight text-slate-900 dark:text-white">Trust Score</span>
            <span className="mt-0.5 block text-[12px] font-medium leading-[1.35] text-slate-500 dark:text-slate-400">
              {trust > 0
                ? locale === "en"
                  ? "Public buyer score"
                  : "Score public acheteur"
                : locale === "en"
                  ? "Awaiting data"
                  : "En attente de données"}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("avis")}
          className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 text-left shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] transition active:scale-[.97] dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF1E2] text-[14px] font-black text-[#EF6A00] dark:bg-amber-950 dark:text-amber-300">
            {reviews && reviews.count > 0 ? reviews.average.toFixed(1).replace(".", ",") : "—"}
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-black leading-tight text-slate-900 dark:text-white">
              {locale === "en" ? "Buyer reviews" : "Avis clients"}
            </span>
            <span className="mt-0.5 block text-[12px] font-medium leading-[1.35] text-slate-500 dark:text-slate-400">
              {reviews && reviews.count > 0
                ? `${reviews.count} ${locale === "en" ? "reviews" : "avis"}`
                : locale === "en"
                  ? "No review yet"
                  : "Aucun avis pour l'instant"}
            </span>
          </span>
        </button>
      </section>

      {/* ── Etat de la connexion ─────────────────────────────────────────── */}
      <p className="flex items-center justify-center gap-2 pt-1 text-[12.5px] font-medium text-slate-400 dark:text-slate-500">
        {connected ? (
          <Wifi size={14} strokeWidth={2.2} className="text-emerald-500" />
        ) : (
          <WifiOff size={14} strokeWidth={2.2} className="text-amber-500" />
        )}
        {connected
          ? locale === "en"
            ? "Connected · nothing waiting to be sent"
            : "Connecté · aucune opération en attente d'envoi"
          : locale === "en"
            ? "Offline · showing the last data received"
            : "Hors ligne · affichage des dernières données reçues"}
      </p>

      {footer}
    </div>
  );
}
