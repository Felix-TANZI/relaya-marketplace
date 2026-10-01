/**
 * Constats et retours.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE GÉRANT EST TÉMOIN, PAS JUGE
 *
 * Quand un client revient avec un colis ouvert, deux récits s'opposent et
 * personne au siège n'était là. Le gérant, lui, y est : il voit l'objet, il
 * voit le client, il peut photographier les deux dans la même minute.
 *
 * Tout l'écran découle de ça. Il ne demande jamais au gérant de trancher —
 * ni « remboursez », ni « refusez » — il lui demande de CONSTATER : quel
 * colis, ce qu'il a, des photos. BelivaY décide ensuite sur pièces.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE SERVEUR PERMET
 *
 * Un point relais ne peut pas ouvrir de litige sur la commande d'un
 * acheteur : `OrderDisputeListCreateView` passe par `get_user_order_or_404`,
 * la commande doit appartenir au demandeur. Et c'est sain — le litige est le
 * droit de l'acheteur, pas celui du commerçant qui garde son colis.
 *
 * Le constat part donc en PREUVE (`/relay-point/evidence/`), horodatée et
 * attachée à l'expédition. Elle vaut pour le dossier que l'acheteur ouvre,
 * ou que le support ouvre à sa place.
 */
import { useMemo, useState } from "react";
import { Camera, Check, Eye, QrCode, Scale, Send, ShieldCheck, Tag, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import { useQrCamera } from "@/lib/useQrCamera";
import { http } from "@/services/api/http";
import { RelaySheet, RelaySheetHeader } from "./RelayUi";

/**
 * Un retour consulté avant dépôt — réponse de `/relay-point/returns/lookup/`.
 *
 * Le comptoir lit AVANT d'encaisser : si le motif n'est pas validé, le client
 * repart avec son colis au lieu de le laisser sans statut.
 */
export interface ReturnLookup {
  return_id: number;
  /** « RT-2240 ». */
  reference: string;
  order_id: number;
  reason: string;
  reason_label: string;
  status: string;
  status_label: string;
  /** Le seul booléen qui compte au comptoir : accepte-t-on le colis ? */
  depositable: boolean;
  parcel_size: string;
  parcel_size_label: string;
  item_name: string;
  /** Nom d'un AUTRE relais quand le retour y est attendu. Vide sinon. */
  assigned_elsewhere: string;
}

/** Les deux clichés du scellé. L'ordre est celui dans lequel on les prend. */
type SealKey = "seal" | "label";

const SEAL_SHOTS: Array<{ key: SealKey; label: string }> = [
  { key: "seal", label: "Le colis scellé" },
  { key: "label", label: "L'étiquette" },
];

/** Un colis du relais, vu par l'écran de constat. */
export interface DisputeParcel {
  id: number;
  orderId: number;
  ref: string;
  slot: string;
  sizeLabel: string;
  pickupCode: string;
  /** Renseignée dès que le colis a été remis : le compte à rebours part de là. */
  pickedUpAt: string | null;
}

/** Une pièce que BelivaY réclame au relais sur un dossier. */
export interface DisputeRequest {
  instructions: string;
  due_at: string | null;
}

/** Un dossier ouvert chez BelivaY, ou clos récemment. */
export interface DisputeFile {
  ref: string;
  orderId: number;
  reason: string;
  status: string;
  createdAt: string;
  vendorContacted: boolean;
  vendorReplied: boolean;
  vendorReplyDeadline: string | null;
  hasMediator: boolean;
  /** Libellé de la décision, vide tant qu'il n'y en a pas. */
  resolution: string;
  isClosed: boolean;
  /** Pièces réclamées AU RELAIS, en attente. */
  requests: DisputeRequest[];
}

/**
 * Les cinq étapes d'un dossier, telles que le contrat les annonce.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * QUATRE SONT RÉELLES, UNE NE L'EST PAS
 *
 * `Dispute.status` ne connaît que OPEN / IN_PROGRESS / RESOLVED / CLOSED.
 * L'avancement fin se lit sur des champs qui existent bel et bien :
 * `vendor_contacted` et `vendor_reply_deadline`, `assigned_admin`,
 * `resolution`.
 *
 * Le RECOURS n'a aucun champ. Son segment reste donc éteint en permanence —
 * l'allumer laisserait croire à une étape franchie que rien n'enregistre.
 */
const ETAPES = ["Constat", "Vendeur 48 h", "Médiation", "Décision", "Recours"] as const;

type EtapeTon = "done" | "current" | "todo";

const ETAPE_STYLE: Record<EtapeTon, string> = {
  done: "bg-[#2E7D4F]",
  current: "bg-[#E8A020]",
  todo: "bg-slate-200 dark:bg-slate-700",
};

/** Où en est le dossier, segment par segment. */
function avancement(file: DisputeFile): EtapeTon[] {
  if (file.isClosed) return ["done", "done", file.hasMediator ? "done" : "todo", "done", "todo"];
  const constat: EtapeTon = "done";
  const vendeur: EtapeTon = file.vendorReplied ? "done" : file.vendorContacted ? "current" : "todo";
  const mediation: EtapeTon = file.hasMediator ? "current" : "todo";
  const decision: EtapeTon = file.resolution ? "done" : "todo";
  // Le recours n'est enregistre nulle part : il ne s'allume jamais.
  return [constat, vendeur, mediation, decision, "todo"];
}

const JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const JOUR_HEURE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

function formatJour(valeur: string, avecHeure = false) {
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return "";
  return (avecHeure ? JOUR_HEURE : JOUR_MOIS).format(date);
}

/**
 * Les règles du litige, telles que le contrat les fixe.
 *
 * Tableau de référence, pas de données : il répond aux questions que le
 * client pose au comptoir sans que le gérant ait à appeler le support.
 */
const REGLES: Array<[string, string]> = [
  ["Le client peut signaler", "7 jours après le retrait"],
  ["Défaut caché · vice caché", "48 h · 100 jours"],
  ["Pendant le dossier", "ni garde ni renvoi"],
  ["Votre rôle", "constater, garder, remettre"],
  ["Réponse du vendeur", "48 h, sinon raison au client"],
  ["Médiation BelivaY", "décision sous 48 h"],
  ["Recours", "un seul, sous 3 jours"],
  ["Client sans réponse", "dossier clos après 5 jours"],
];

/** Fenêtre de contestation après remise, en jours (PlatformSettings.litige_window_days). */
const FENETRE_JOURS = 7;

/**
 * Les motifs, alignés sur `Return.Reason` côté serveur.
 *
 * « Défaut caché » n'a pas de code dédié : il part en `OTHER`, et la phrase
 * du gérant porte la précision. Inventer un code que le serveur ne connaît
 * pas ferait échouer le dossier à l'arrivée.
 */
const MOTIFS: Array<{ code: string; label: string; icon: LucideIcon }> = [
  { code: "NOT_AS_DESCRIBED", label: "Non conforme", icon: Tag },
  { code: "DAMAGED", label: "Abîmé", icon: TriangleAlert },
  { code: "COUNTERFEIT", label: "Contrefaçon", icon: ShieldCheck },
  { code: "OTHER", label: "Défaut caché", icon: Eye },
];

/** Les deux clichés du constat. L'ordre est celui dans lequel on les prend. */
type ShotKey = "parcel" | "problem";

const SHOTS: Array<{ key: ShotKey; label: string }> = [
  { key: "parcel", label: "Le colis" },
  { key: "problem", label: "Le problème" },
];

const TABS = [
  { key: "constat", label: "Constat" },
  { key: "retour", label: "Dépôt de retour" },
  { key: "dossiers", label: "Dossiers" },
] as const;

/** Depuis combien de jours le colis est parti, et si la fenêtre court encore. */
function fenetre(pickedUpAt: string | null) {
  if (!pickedUpAt) return null;
  const remis = new Date(pickedUpAt);
  if (Number.isNaN(remis.getTime())) return null;
  remis.setHours(0, 0, 0, 0);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const jours = Math.floor((aujourdhui.getTime() - remis.getTime()) / 86_400_000);
  return { jours, ouverte: jours <= FENETRE_JOURS };
}

/** Lecture du QR client : il porte le code de retrait, qui désigne le colis. */
function ScanSheet({ onCancel, onDecoded }: { onCancel: () => void; onDecoded: (code: string) => void }) {
  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    onDecode: (value) => {
      const code = value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
      if (code) onDecoded(code);
    },
  });

  return (
    <RelaySheet label="Scanner le colis" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={QrCode}
        title="Scanner le colis"
        subtitle="Le QR du client, ou l'étiquette BelivaY du colis."
        onClose={onCancel}
      />
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!streaming ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-bold text-blue-200/70">
            {error || "Activation de la caméra..."}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        Saisir la référence à la main
      </button>
    </RelaySheet>
  );
}

export default function RelayDisputes({
  parcels,
  files,
  busy,
  focus,
  onReport,
  onReturnDeposit,
}: {
  parcels: DisputeParcel[];
  files: DisputeFile[];
  busy: boolean;
  /** Onglet à ouvrir quand on arrive depuis un autre écran. Vide sinon. */
  focus?: string;
  onReport: (input: { parcelId: number; reason: string; description: string; photos: File[] }) => Promise<boolean>;
  /**
   * Le dépôt porte désormais ses deux photos.
   *
   * Un retour déposé ne crée aucun `RelayParcel` : il échappe à toutes les
   * preuves de colis. Sans ces clichés, rien n'atteste l'état du paquet au
   * moment où le gérant l'a pris — et c'est lui qu'on interrogera si le
   * vendeur conteste à l'inspection.
   */
  onReturnDeposit: (returnId: number, photos: File[]) => Promise<boolean>;
}) {
  const [active, setActive] = useState<string>(TABS[0].key);

  /**
   * Ouverture sur l'onglet demandé par l'écran appelant.
   *
   * Ajustement pendant le rendu, pas dans un effet : un `useEffect` ferait
   * clignoter l'onglet « Constat » avant de basculer, et le gérant verrait
   * passer un écran qu'il n'a pas demandé. On mémorise le dernier `focus`
   * honoré pour ne pas reconduire la bascule à chaque rendu — sinon il ne
   * pourrait plus changer d'onglet à la main.
   */
  const [seenFocus, setSeenFocus] = useState(focus);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus && TABS.some((tab) => tab.key === focus)) setActive(focus);
  }

  const [query, setQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [shots, setShots] = useState<Partial<Record<ShotKey, { file: File; url: string }>>>({});

  // ── Dépôt de retour ──────────────────────────────────────────────────────
  const [returnRef, setReturnRef] = useState("");
  const [lookup, setLookup] = useState<ReturnLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [returnScanOpen, setReturnScanOpen] = useState(false);
  const [sealShots, setSealShots] = useState<Partial<Record<SealKey, { file: File; url: string }>>>({});

  /**
   * Consulte l'étiquette présentée par le client.
   *
   * La saisie est tolérante — « RT-2240 », « rt 2240 » ou « 2240 » désignent
   * le même retour, et c'est le serveur qui tranche : le comptoir ne doit pas
   * dépendre de la façon dont l'étiquette a été imprimée.
   */
  const consulter = async (saisie: string) => {
    const texte = saisie.trim();
    if (!texte) return;
    setLookupBusy(true);
    setLookupError("");
    setLookup(null);
    try {
      const retour = await http<ReturnLookup>(
        `/api/shipping/relay-point/returns/lookup/?ref=${encodeURIComponent(texte)}`,
      );
      setLookup(retour);
    } catch {
      setLookupError("Aucun retour validé ne porte cette référence. Le client garde son colis.");
    } finally {
      setLookupBusy(false);
    }
  };

  const addSealShot = async (key: SealKey, file: File | null) => {
    if (!file) return;
    try {
      const optimized = await ensureImageUnderLimit(file);
      setSealShots((current) => {
        const ancien = current[key];
        if (ancien) URL.revokeObjectURL(ancien.url);
        return { ...current, [key]: { file: optimized, url: URL.createObjectURL(optimized) } };
      });
    } catch {
      /* Une photo illisible ne bloque pas l'ecran : le gerant la reprend. */
    }
  };

  const sealReady = Boolean(sealShots.seal && sealShots.label);

  const submitReturn = async () => {
    if (!lookup || !sealShots.seal || !sealShots.label) return;
    const ok = await onReturnDeposit(lookup.return_id, [sealShots.seal.file, sealShots.label.file]);
    if (ok) {
      Object.values(sealShots).forEach((shot) => shot && URL.revokeObjectURL(shot.url));
      setSealShots({});
      setLookup(null);
      setReturnRef("");
    }
  };

  // La référence saisie désigne un colis par son numéro de commande ou par le
  // code de retrait du client — les deux figurent sur ce que le client montre.
  const matched = useMemo(() => {
    const texte = query.trim().toUpperCase();
    if (texte.length < 3) return null;
    const chiffres = texte.replace(/\D/g, "");
    return (
      parcels.find((parcel) => parcel.ref.toUpperCase() === texte)
      ?? parcels.find((parcel) => parcel.pickupCode && parcel.pickupCode.toUpperCase() === texte)
      ?? (chiffres ? parcels.find((parcel) => String(parcel.orderId) === chiffres) : undefined)
      ?? null
    );
  }, [parcels, query]);

  // Deux listes, deux lectures : ce qui réclame une action, et ce qui est
  // derrière soi. Les mêler obligerait le gérant à trier des dossiers clos
  // pour trouver celui qu'on attend de lui.
  const dossiersOuverts = useMemo(() => files.filter((file) => !file.isClosed), [files]);
  const dossiersClos = useMemo(() => files.filter((file) => file.isClosed), [files]);

  const delai = matched ? fenetre(matched.pickedUpAt) : null;
  // Les deux cliches sont exiges : le colis seul ne prouve pas le defaut,
  // le defaut seul ne prouve pas de quel colis il s'agit.
  const ready = Boolean(matched && reason && shots.parcel && shots.problem);

  const addShot = async (key: ShotKey, file: File | null) => {
    if (!file) return;
    try {
      const optimized = await ensureImageUnderLimit(file);
      setShots((current) => {
        const ancien = current[key];
        if (ancien) URL.revokeObjectURL(ancien.url);
        return { ...current, [key]: { file: optimized, url: URL.createObjectURL(optimized) } };
      });
    } catch {
      /* Une photo illisible ne bloque pas l'ecran : le gerant la reprend. */
    }
  };

  const submit = async () => {
    if (!matched || !reason || !shots.parcel || !shots.problem) return;
    const libelle = MOTIFS.find((motif) => motif.code === reason)?.label || reason;
    const ok = await onReport({
      parcelId: matched.id,
      reason,
      description: `${libelle} — constat au comptoir, colis + problème photographiés`,
      photos: [shots.parcel.file, shots.problem.file],
    });
    if (ok) {
      setQuery("");
      setReason(null);
      Object.values(shots).forEach((shot) => shot && URL.revokeObjectURL(shot.url));
      setShots({});
    }
  };

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Constats et retours
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium leading-[1.45] text-slate-500 dark:text-slate-400">
          Le litige se règle au comptoir, colis en main, vous comme témoin.
        </p>
      </header>

      {/* Un seul bandeau gris : la gouttiere entre les trois est ce qui dit
          qu'ils forment un choix unique, et non trois actions separees. */}
      <div
        role="tablist"
        aria-label="Constats et retours"
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#E9EBF2] p-1 dark:bg-slate-800/70"
      >
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tab.key)}
              className={`rounded-[11px] px-2 py-2.5 text-[13.5px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab.label}
              {tab.key === "dossiers" && dossiersOuverts.length > 0 ? ` ${dossiersOuverts.length}` : ""}
            </button>
          );
        })}
      </div>

      {/* ── Constat ──────────────────────────────────────────────────────── */}
      {active === "constat" ? (
        <>
          <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
              1 · Scannez le colis
            </h3>
            <div className="mt-3 flex items-stretch gap-2.5">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="BV-40077"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[16px] font-black tracking-wide text-slate-900 outline-none transition focus:border-[#1D4ED8] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                aria-label="Scanner le QR du client"
                className="flex w-[52px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[#1D4ED8] text-white transition active:scale-95"
              >
                <QrCode size={22} strokeWidth={2.2} />
              </button>
            </div>

            {matched ? (
              <p
                className={`mt-3 text-[13px] font-semibold ${
                  delai?.ouverte === false
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-[#2E7D4F] dark:text-emerald-400"
                }`}
              >
                {delai
                  ? delai.ouverte
                    ? `Remis il y a ${delai.jours} jour${delai.jours > 1 ? "s" : ""} · dans la fenêtre de ${FENETRE_JOURS} jours.`
                    : `Remis il y a ${delai.jours} jours · la fenêtre de ${FENETRE_JOURS} jours est dépassée, le constat part quand même au support.`
                  : `${matched.sizeLabel} · encore en stock, casier ${matched.slot || "à définir"}.`}
              </p>
            ) : query.trim().length >= 3 ? (
              <p className="mt-3 text-[13px] font-semibold text-red-600 dark:text-red-400">
                Aucun colis de votre relais ne porte cette référence.
              </p>
            ) : (
              <p className="mt-3 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                La référence BelivaY du colis, son numéro de commande, ou le code de retrait du client.
              </p>
            )}
          </section>

          <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
              2 · Que se passe-t-il ?
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {MOTIFS.map(({ code, label, icon: Icon }) => {
                const on = reason === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setReason(on ? null : code)}
                    aria-pressed={on}
                    className={`flex flex-col items-start rounded-[12px] border-2 px-4 py-3.5 text-left transition active:scale-[.97] ${
                      on
                        ? "border-[#E8590C] bg-[#FDEEE0] dark:border-orange-500 dark:bg-orange-950/50"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                    }`}
                  >
                    <Icon size={20} strokeWidth={2.2} className="text-[#E8590C] dark:text-orange-400" />
                    <span className="mt-3 text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-[12px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
              3 · Deux photos
            </h3>

            {/* Deux cliches, pas un. Le colis seul ne prouve pas le defaut ;
                le defaut seul ne prouve pas de quel colis il s'agit. C'est la
                paire qui tient devant une mediation.

                Celui qui reste a prendre s'allume en orange, celui qui est
                fait passe au sombre : l'ecran montre toujours le geste
                suivant, jamais le geste accompli. */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SHOTS.map(({ key, label }) => {
                const pris = shots[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-[14px] px-3 py-7 text-center transition active:scale-[.97] ${
                      pris
                        ? "bg-[#0F1C3F]"
                        : "border-2 border-dashed border-[#E8590C] bg-[#FDEEE0] dark:bg-orange-950/40"
                    }`}
                  >
                    {pris ? (
                      <>
                        <Check size={26} strokeWidth={3} className="text-[#4ADE80]" />
                        <span className="mt-2.5 text-[13.5px] font-black text-[#4ADE80]">
                          {label} · prise
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} strokeWidth={2.2} className="text-[#E8590C]" />
                        <span className="mt-2.5 text-[13.5px] font-black text-[#E8590C]">{label}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(event) => void addShot(key, event.target.files?.[0] || null)}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-[14px] bg-[#EEF3FE] px-4 py-3.5 dark:bg-blue-950/40">
            <ShieldCheck size={19} strokeWidth={2.2} className="mt-0.5 flex-shrink-0 text-[#5B7FC7] dark:text-blue-300" />
            <p className="text-[13.5px] font-medium leading-[1.55] text-[#4A5E8A] dark:text-blue-100/80">
              Le colis reste chez vous <strong className="font-black">sans frais de garde</strong> jusqu'à la
              décision. Vous constatez ; le vendeur répond sous 48 h, puis la médiation BelivaY tranche
              sur les photos.
            </p>
          </div>

          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-4 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(232,89,12,.38)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            <Send size={19} strokeWidth={2.6} /> {busy ? "Envoi..." : "Envoyer le constat"}
          </button>
        </>
      ) : null}

      {/* ── Dépôt de retour ──────────────────────────────────────────────── */}
      {active === "retour" ? (
        <>
          {/* ── La consigne, puis la lecture de l'étiquette ────────────────
              Le bleu nuit n'est pas décoratif : c'est la couleur que le
              portail réserve à ce qui engage le relais. Ici le gérant prend
              la garde d'un colis qui n'est pas le sien. */}
          <section
            className="overflow-hidden rounded-[18px] px-[18px] py-[18px] text-white shadow-[0_6px_18px_rgba(8,14,31,.28)]"
            style={{
              backgroundImage:
                "radial-gradient(80% 120% at 96% -4%, rgba(214,116,62,.30) 0%, rgba(214,116,62,0) 62%),"
                + " linear-gradient(140deg, #0A1230 0%, #101E48 48%, #17296B 100%)",
            }}
          >
            <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#E9A93A]">
              Dépôt d'un retour validé
            </p>
            <p className="mt-2 text-[14px] font-medium leading-[1.5] text-white/85">
              Seul un retour déjà accepté par BelivaY se dépose. Scannez l'étiquette que le client a
              reçue : si le motif n'est pas validé, le dépôt est refusé.
            </p>

            <div className="mt-3.5 flex items-stretch gap-2.5">
              <input
                value={returnRef}
                onChange={(event) => setReturnRef(event.target.value.toUpperCase())}
                onBlur={() => void consulter(returnRef)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void consulter(returnRef);
                }}
                placeholder="RT-0000"
                aria-label="Référence du retour"
                className="min-w-0 flex-1 rounded-[12px] border border-white/15 bg-white/[.08] px-4 py-3.5 text-[17px] font-black tracking-wide text-white outline-none transition placeholder:font-bold placeholder:text-white/35 focus:border-white/35"
              />
              <button
                type="button"
                onClick={() => setReturnScanOpen(true)}
                aria-label="Scanner l'étiquette du retour"
                className="flex w-[58px] flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-b from-[#F58A1F] to-[#E8590C] text-white shadow-[0_4px_12px_rgba(232,89,12,.4)] transition active:scale-[.95]"
              >
                <QrCode size={23} strokeWidth={2.2} />
              </button>
            </div>

            {lookupBusy ? (
              <p className="mt-2.5 text-[13px] font-semibold text-white/60">Lecture…</p>
            ) : null}
            {lookupError ? (
              <p className="mt-2.5 text-[13px] font-semibold leading-snug text-[#FFB4A8]">{lookupError}</p>
            ) : null}
          </section>

          {/* ── Le retour lu ───────────────────────────────────────────────── */}
          {lookup ? (
            <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-5 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[21px] font-black tracking-[-0.015em] tabular-nums text-slate-900 dark:text-white">
                  {lookup.reference}
                </h3>
                {/* La pastille dit si le colis s'accepte, pas si le dossier est
                    « beau » : c'est la seule chose que le gerant decide ici. */}
                <span
                  className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${
                    lookup.depositable
                      ? "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F]"
                      : "border-[#F2B8B8] bg-[#FDECEC] text-[#D84B4B]"
                  }`}
                >
                  {lookup.depositable ? "Motif validé" : "Non déposable"}
                </span>
              </div>

              <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Motif</dt>
                  <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">
                    {lookup.reason_label}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Taille</dt>
                  <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">
                    {/* « Hors capacite » est exact : un retour depose ne cree
                        aucun RelayParcel, il n'occupe donc aucune des places
                        comptees par `storage_capacity`. */}
                    {lookup.parcel_size_label} · hors capacité
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Ranger en</dt>
                  {/*
                    La maquette annonce un casier (« R-02 ». Le serveur n'en
                    attribue aucun : un retour ne passe par aucun RelayParcel,
                    donc par aucun `slot_code`. Afficher « R-02 » enverrait le
                    gerant ranger le colis a une place que personne ne pourra
                    retrouver — pire qu'une absence de consigne.
                  */}
                  <dd className="text-right text-[14px] font-black text-[#1D4ED8] dark:text-blue-400">
                    À part des colis clients
                  </dd>
                </div>
                {lookup.item_name ? (
                  <div className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">Article</dt>
                    <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">
                      {lookup.item_name}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {/* Le retour attendu ailleurs : le gerant renvoie le client au bon
                  comptoir au lieu d'encaisser un colis qu'on n'attend pas ici. */}
              {lookup.assigned_elsewhere ? (
                <p className="mt-3 rounded-[12px] border border-[#F2D79B] bg-[#FDF6E3] px-3.5 py-3 text-[13px] font-semibold leading-snug text-[#B4791A]">
                  Ce retour est attendu au {lookup.assigned_elsewhere}. Vous pouvez le prendre, mais
                  prévenez le client du changement.
                </p>
              ) : null}

              {lookup.depositable ? (
                <>
                  {/* ── Les deux clichés du scellé ──────────────────────────── */}
                  <div
                    className={`mt-3.5 rounded-[12px] border-2 border-dashed px-3.5 py-3 transition ${
                      sealReady
                        ? "border-[#B7E0C4] bg-[#F1FAF3] dark:border-emerald-800 dark:bg-emerald-950/30"
                        : "border-[#F0B96A] bg-[#FFF8ED] dark:border-orange-800 dark:bg-orange-950/20"
                    }`}
                  >
                    <p
                      className={`flex items-center gap-2 text-[13.5px] font-black leading-snug ${
                        sealReady ? "text-[#2E7D4F] dark:text-emerald-300" : "text-[#C77C1C] dark:text-orange-300"
                      }`}
                    >
                      {sealReady ? <Check size={17} strokeWidth={3} /> : <Camera size={17} strokeWidth={2.4} />}
                      {sealReady
                        ? "Scellé photographié · prêt à enregistrer"
                        : "Scellé du retour posé · 2 photos obligatoires"}
                    </p>

                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                      {SEAL_SHOTS.map((shot) => {
                        const pris = sealShots[shot.key];
                        return (
                          <label
                            key={shot.key}
                            className="relative flex h-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-slate-200 bg-white text-center transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-950"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="sr-only"
                              onChange={(event) => void addSealShot(shot.key, event.target.files?.[0] ?? null)}
                            />
                            {pris ? (
                              <img src={pris.url} alt={shot.label} className="h-full w-full object-cover" />
                            ) : (
                              <span className="px-2 text-[12.5px] font-bold leading-snug text-slate-400 dark:text-slate-500">
                                <Camera size={18} strokeWidth={2.2} className="mx-auto mb-1" />
                                {shot.label}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void submitReturn()}
                    disabled={busy || !sealReady}
                    className="mt-3.5 flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-4 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(232,89,12,.38)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
                  >
                    <Check size={19} strokeWidth={3} />
                    {busy ? "Enregistrement…" : "Enregistrer le dépôt"}
                  </button>
                </>
              ) : (
                <p className="mt-3.5 rounded-[12px] border border-[#F2B8B8] bg-[#FDECEC] px-3.5 py-3 text-[13px] font-semibold leading-snug text-[#D84B4B]">
                  {lookup.status_label} — ce retour ne se dépose pas. Le client garde son colis et
                  contacte BelivaY depuis sa commande.
                </p>
              )}

              {/*
                Ce que le depot coute et rapporte.

                ATTENTION : ces montants sont ecrits en dur. Aucun d'eux n'est
                lu d'une configuration — ni les 500 F de trajet, ni les
                200/250/400 F de remise. S'ils changent au contrat, ce
                paragraphe ne suivra pas tout seul.
              */}
              <p className="mt-3.5 text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
                Jamais facturé, hors capacité. Il part avec la prochaine collecte vers le vendeur, qui
                l'inspecte sous 48 h ; le trajet (500 F) est payé par la partie en tort. Vous touchez
                comme un colis remis : 200 F petit, 250 F moyen, 400 F encombrant.
              </p>
            </section>
          ) : null}
        </>
      ) : null}

      {/* ── Dossiers ─────────────────────────────────────────────────────── */}
      {active === "dossiers" ? (
        <>
          {/* ── En cours ─────────────────────────────────────────────────── */}
          {dossiersOuverts.length === 0 ? (
            <section className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-6 text-center shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[13.5px] font-medium text-slate-400 dark:text-slate-500">
                Aucun dossier en cours sur vos colis.
              </p>
            </section>
          ) : (
            dossiersOuverts.map((file) => {
              const etapes = avancement(file);
              const aCompleter = file.requests.length > 0;
              return (
                <section
                  key={file.ref}
                  className="rounded-[18px] border border-slate-200/70 bg-white px-4 pb-4 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#FDF3DC] text-[#B4791A] dark:bg-amber-950/50 dark:text-amber-300">
                      <Scale size={19} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-tight tabular-nums text-slate-900 dark:text-white">
                        {file.ref} · BV-{file.orderId}
                      </span>
                      <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {file.reason} · constat du {formatJour(file.createdAt)}
                      </span>
                    </span>
                    {/* « A completer » n'est pas le statut du dossier : c'est
                        ce que BelivaY attend DU GERANT. Les deux se confondent
                        a l'oeil, pas dans l'action. */}
                    <span
                      className={`flex-shrink-0 rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${
                        aCompleter
                          ? "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A]"
                          : "border-[#C3CCF5] bg-[#EEF1FD] text-[#5B6BD6]"
                      }`}
                    >
                      {aCompleter ? "À compléter" : file.status}
                    </span>
                  </div>

                  {/* ── L'avancement ──────────────────────────────────────── */}
                  <div className="mt-3.5 grid grid-cols-5 gap-1.5" aria-hidden>
                    {etapes.map((ton, rang) => (
                      <span key={ETAPES[rang]} className={`h-[5px] rounded-full ${ETAPE_STYLE[ton]}`} />
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                    {ETAPES.map((label, rang) => (
                      <span
                        key={label}
                        className={`text-[10.5px] font-semibold leading-tight ${
                          etapes[rang] === "todo"
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  {/* ── Ce que BelivaY réclame ────────────────────────────── */}
                  {file.requests.map((demande) => (
                    <p
                      key={demande.instructions}
                      className="mt-3.5 flex items-start gap-2.5 rounded-[12px] bg-[#FDF6E3] px-3.5 py-3 text-[13px] font-semibold leading-[1.5] text-[#B4791A] dark:bg-amber-950/30 dark:text-amber-200"
                    >
                      <Camera size={17} strokeWidth={2.4} className="mt-[2px] flex-shrink-0" />
                      <span>
                        {demande.instructions}
                        {file.vendorReplyDeadline
                          ? ` Le vendeur a jusqu'au ${formatJour(file.vendorReplyDeadline, true)} pour répondre.`
                          : ""}
                      </span>
                    </p>
                  ))}
                </section>
              );
            })
          )}

          {/* ── Clos ce mois ─────────────────────────────────────────────── */}
          {dossiersClos.length > 0 ? (
            <section className="rounded-[18px] border border-slate-200/70 bg-white px-4 pb-2 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
                Clos ce mois
              </h3>
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {dossiersClos.map((file) => (
                  <li key={file.ref} className="flex items-start gap-3 py-3.5">
                    <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] border-2 border-[#B7E0C4] bg-[#E8F6EC] text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <Check size={17} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black leading-tight tabular-nums text-slate-900 dark:text-white">
                        {file.ref} · BV-{file.orderId}
                      </span>
                      <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {file.reason}
                        {file.resolution ? ` · ${file.resolution.toLowerCase()} accepté` : ""}, vous n'êtes
                        pas mis en cause
                      </span>
                    </span>
                    <span className="flex-shrink-0 rounded-full border border-[#B7E0C4] bg-[#F1FAF3] px-3 py-[5px] text-[12.5px] font-semibold text-[#2E7D4F] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Clos
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── Les règles ───────────────────────────────────────────────── */}
          <section className="rounded-[18px] border border-slate-200/70 bg-white px-5 pb-4 pt-4 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
              Les règles
            </h3>
            <dl className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {REGLES.map(([regle, valeur]) => (
                <div key={regle} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{regle}</dt>
                  <dd className="text-right text-[14px] font-black text-slate-900 dark:text-white">{valeur}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : null}

      {scanOpen ? (
        <ScanSheet
          onCancel={() => setScanOpen(false)}
          onDecoded={(code) => {
            setScanOpen(false);
            setQuery(code);
          }}
        />
      ) : null}

      {/* L'etiquette du retour se lit au meme scanner : le gerant ne doit pas
          apprendre deux gestes pour deux codes imprimes par la meme maison. */}
      {returnScanOpen ? (
        <ScanSheet
          onCancel={() => setReturnScanOpen(false)}
          onDecoded={(code) => {
            setReturnScanOpen(false);
            setReturnRef(code.toUpperCase());
            void consulter(code);
          }}
        />
      ) : null}
    </div>
  );
}
