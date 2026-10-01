/**
 * Le retrait client au comptoir du point relais.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE GESTE QUI COMPTE : FAIRE OUVRIR LE COLIS
 *
 * Un colis remis fermé laisse le doute ouvert sept jours. Un colis ouvert
 * devant le gérant clôt l'affaire sur place : le client repart servi, le
 * vendeur est payé, et BelivaY n'a pas de litige à arbitrer trois jours plus
 * tard sur la foi de deux récits.
 *
 * D'où la hiérarchie de l'écran : « Tout est en ordre » est le seul bouton
 * plein, « Un problème » est son voisin immédiat parce qu'il est le coût de
 * la même ouverture, et « le client préfère ne pas ouvrir » est un lien —
 * toujours possible, jamais suggéré.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CHAQUE ISSUE DÉCLENCHE VRAIMENT
 *
 *   Tout est en ordre → remise + confirmation de réception AU NOM du client.
 *                       Sa fenêtre de retour se ferme, l'escrow vendeur passe
 *                       en attente de libération. C'est irréversible : d'où la
 *                       feuille de confirmation avec photo et signature.
 *   Ne pas ouvrir     → remise simple. La fenêtre de retour reste entière.
 *   Un problème       → AUCUNE remise. Le colis reste en stock, les photos
 *                       partent en preuve, BelivaY tranche.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Layers,
  Lock,
  MapPin,
  Minus,
  PenLine,
  PackageCheck,
  Plus,
  QrCode,
  RotateCcw,
  Scale,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import { useQrCamera } from "@/lib/useQrCamera";
import SignaturePad from "@/components/ui/SignaturePad";
import { RelaySheet, RelaySheetHeader } from "./RelayUi";

/** Un colis en stock, vu par le comptoir. */
export interface RelayPickupParcel {
  id: number;
  orderId: number;
  ref: string;
  slot: string;
  sizeLabel: string;
  pickupCode: string;
  authorizedName: string;
  authorizedPhone: string;
  /** Frais de garde accumules, calcules par le serveur (200 F/jour apres J+3). */
  gardeFeeXaf: number;
}

export type BuyerInspection = "ACCEPTED" | "SKIPPED";

export interface HandOverInput {
  parcelIds: number[];
  code: string;
  inspection: BuyerInspection;
  photo: File;
  signature: string;
  idReference: string;
  authorizedName: string;
}

export interface CounterIssueInput {
  parcelId: number;
  /** Une ou deux vues : le colis, le probleme. Chacune part en preuve. */
  photos: File[];
  description: string;
}

const nf = (value: number) => value.toLocaleString("fr-FR");

/**
 * Les situations que le gerant rencontre sans savoir quoi en faire.
 *
 * Ce sont des CONSIGNES, pas des actions : chaque entree dit ce que le portail
 * fait, ce qu'il ne fait pas, et vers qui basculer. Un gerant seul a son
 * comptoir face a un client mecontent n'a pas le temps d'appeler le support
 * pour apprendre qu'il n'y avait rien a faire.
 */
const COUNTER_SITUATIONS: Array<{
  id: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  body: string;
}> = [
  {
    id: "payable",
    icon: CreditCard,
    tone: "bg-[#FDEADC] text-[#E07B3C] dark:bg-orange-950 dark:text-orange-300",
    title: "Commande payable au retrait",
    body:
      "Pas encore de code : retrouvez le colis par sa référence ou le numéro du client. Le ticket affiche "
      + "le montant à encaisser (ex. 18 500 F : articles + garde ; la livraison est toujours payée d'avance). "
      + "Le client paie en MoMo sur son téléphone : ce paiement débloque le code. Jamais d'espèces. "
      + "Les conditions sont vérifiées à la commande, pas par vous.",
  },
  {
    id: "refuse",
    icon: X,
    tone: "bg-[#FDECEC] text-[#E05B5B] dark:bg-red-950 dark:text-red-300",
    title: "Le client refuse le colis",
    body:
      "Avec un motif (non conforme, abîmé, contrefaçon) : ouvrez un constat au comptoir, avec photos. "
      + "Le colis reste chez vous sans frais jusqu'à la décision, puis passe dans « À faire partir ». "
      + "Commande payable au retrait refusée sans motif : elle est annulée, le colis repart au vendeur et "
      + "la livraison n'est pas remboursée. Après deux refus, le client doit payer d'avance.",
  },
  {
    id: "multiple",
    icon: Layers,
    tone: "bg-[#E8EFFD] text-[#4F7DF3] dark:bg-blue-950 dark:text-blue-300",
    title: "Plusieurs colis pour un même client",
    body:
      "Un code par groupe de remise, envoyé à l'arrivée du dernier colis du groupe. L'écran liste tous les "
      + "emplacements : deux colis annoncés, deux colis remis, sinon la validation est refusée. Une seule photo.",
  },
  {
    id: "contest",
    icon: Scale,
    tone: "bg-[#FDF3DC] text-[#E0A020] dark:bg-amber-950 dark:text-amber-300",
    title: "Le client ouvre et conteste sur place",
    body:
      "Il touche « Un problème » à l'étape « Tout est en ordre ? » : ne remettez pas le colis. Le constat au "
      + "comptoir s'ouvre, photos tout de suite ; le colis reste chez vous sans frais jusqu'à la décision.",
  },
  {
    id: "code",
    icon: Lock,
    tone: "bg-[#F0F1F3] text-[#9AA1AC] dark:bg-slate-800 dark:text-slate-300",
    title: "Code bloqué ou oublié",
    body:
      "Le client réaffiche son code (QR ou 6 chiffres) dans son app. Sans app, il demande un renvoi payant "
      + "par SMS, 3 fois par 24 h au plus. Après 3 codes faux, seul le support débloque. Vous ne voyez "
      + "jamais le code.",
  },
  {
    id: "transfer",
    icon: MapPin,
    tone: "bg-[#E8EFFD] text-[#4F7DF3] dark:bg-blue-950 dark:text-blue-300",
    title: "Le client veut changer de relais",
    body:
      "Il le demande dans son app : gratuit avant la collecte, 400 F si le colis est déjà arrivé. Un nouveau "
      + "code remplace l'ancien. Le colis passe dans « À faire partir » ; au nouveau relais, les jours offerts "
      + "repartent de zéro.",
  },
];

/** Ligne chiffree du recapitulatif : libelle a gauche, valeur en gras a droite. */
function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-black ${tone || "text-slate-950 dark:text-white"}`}>{value}</span>
    </div>
  );
}

/**
 * Feuille de remise : les preuves exigees avant que le colis ne quitte le local.
 *
 * Point de garde strict — le point relais est un lieu fixe, presume connecte :
 * la photo et la signature doivent etre prises ICI, pas promises pour plus tard.
 */
function HandOverSheet({
  inspection,
  parcels,
  busy,
  onCancel,
  onConfirm,
}: {
  inspection: BuyerInspection;
  parcels: RelayPickupParcel[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: { photo: File; signature: string; idReference: string }) => void;
}) {
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [idReference, setIdReference] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const authorized = parcels.find((parcel) => parcel.authorizedName);
  const needsId = Boolean(authorized);
  const ready = Boolean(photo && signature && (!needsId || idReference.trim()));

  const addPhoto = async (file: File | null) => {
    if (!file) return;
    setError("");
    try {
      const optimized = await ensureImageUnderLimit(file);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ file: optimized, url: URL.createObjectURL(optimized) });
    } catch {
      setError("Cette photo n'a pas pu être préparée. Reprenez-la.");
    }
  };

  const accepted = inspection === "ACCEPTED";

  return (
    <RelaySheet label="Confirmer la remise" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={accepted ? CheckCircle2 : PackageCheck}
        tone={
          accepted
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
        }
        title={accepted ? "Colis ouvert et accepté" : "Remise sans ouverture"}
        subtitle={
          accepted
            ? "Le client a vérifié son colis devant vous. Sa fenêtre de retour se ferme et le vendeur sera payé."
            : "Le client repart sans ouvrir. Sa fenêtre de retour de 7 jours reste entière."
        }
        onClose={onCancel}
      />

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {parcels.length > 1 ? `${parcels.length} colis remis` : "Colis remis"}
        </div>
        <div className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
          {parcels.map((parcel) => `${parcel.ref} · ${parcel.slot}`).join(" — ")}
        </div>
      </div>

      {needsId ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
            Retrait par un tiers — {authorized?.authorizedName}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-900/75 dark:text-amber-100/75">
            Le client a autorisé cette personne
            {authorized?.authorizedPhone ? ` (${authorized.authorizedPhone})` : ""} à retirer à sa place.
            Contrôlez sa pièce avant de valider.
          </p>
          <input
            value={idReference}
            onChange={(event) => setIdReference(event.target.value)}
            placeholder="Ex : CNI n° 1234567890"
            className="mt-2 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-amber-500 dark:border-amber-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      ) : null}

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3.5 text-sm font-black text-slate-600 transition active:scale-[.98] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
        <Camera size={17} />
        {photo ? "Photo de la remise prête — reprendre" : "Photo de la remise (obligatoire)"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void addPhoto(event.target.files?.[0] || null)}
        />
      </label>

      {photo ? (
        <img src={photo.url} alt="" className="mt-3 h-32 w-full rounded-2xl object-cover" />
      ) : null}

      <div className="mt-4">
        <SignaturePad
          label="Signature du client"
          hint="Contrôle au retrait : code + photo + signature"
          onChange={setSignature}
          disabled={busy}
        />
      </div>

      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => photo && signature && onConfirm({ photo: photo.file, signature, idReference: idReference.trim() })}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            accepted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <CheckCircle2 size={16} /> {busy ? "Validation..." : "Valider la remise"}
        </button>
      </div>
    </RelaySheet>
  );
}

/** Feuille de constat : le colis ne sort pas, les preuves partent tout de suite. */
function IssueSheet({
  parcels,
  busy,
  onCancel,
  onConfirm,
}: {
  parcels: RelayPickupParcel[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (input: CounterIssueInput) => void;
}) {
  const [parcelId, setParcelId] = useState(parcels[0]?.id ?? 0);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);

  const addPhoto = async (file: File | null) => {
    if (!file) return;
    setError("");
    try {
      const optimized = await ensureImageUnderLimit(file);
      if (photo) URL.revokeObjectURL(photo.url);
      setPhoto({ file: optimized, url: URL.createObjectURL(optimized) });
    } catch {
      setError("Cette photo n'a pas pu être préparée. Reprenez-la.");
    }
  };

  return (
    <RelaySheet label="Constat au comptoir" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={AlertTriangle}
        tone="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
        title="Constat au comptoir"
        subtitle="Le colis ne sort pas. Vos photos partent en preuve et BelivaY reprend la main."
        onClose={onCancel}
      />

      {parcels.length > 1 ? (
        <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Colis concerné
          <select
            value={parcelId}
            onChange={(event) => setParcelId(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 outline-none transition focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {parcels.map((parcel) => (
              <option key={parcel.id} value={parcel.id}>
                {parcel.ref} · {parcel.slot} · {parcel.sizeLabel}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        Ce que vous constatez
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Ex : le client a ouvert le colis, l'article est cassé."
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3.5 text-sm font-black text-slate-600 transition active:scale-[.98] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
        <Camera size={17} />
        {photo ? "Photo prête — reprendre" : "Photo du constat (obligatoire)"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => void addPhoto(event.target.files?.[0] || null)}
        />
      </label>

      {photo ? <img src={photo.url} alt="" className="mt-3 h-32 w-full rounded-2xl object-cover" /> : null}
      {error ? <p className="mt-2 text-xs font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!photo || description.trim().length < 5 || busy}
          onClick={() => photo && onConfirm({ parcelId, photos: [photo.file], description: description.trim() })}
          className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle size={16} /> {busy ? "Envoi..." : "Envoyer le constat"}
        </button>
      </div>
    </RelaySheet>
  );
}

/**
 * Lecture du QR de retrait presente par le client.
 *
 * L'application acheteur encode le code de retrait tel quel dans le QR de sa
 * commande : ce qui sort du decodeur est donc directement le code, sans
 * traitement. On le remonte au parent, qui le traite comme une saisie clavier.
 *
 * Six chiffres lus sur un ecran fissure, au-dessus d'un comptoir, avec la
 * queue derriere : c'est exactement la situation ou l'on se trompe d'un
 * chiffre et ou l'on accuse le client d'avoir le mauvais code.
 */
function PickupScanSheet({
  onCancel,
  onDecoded,
}: {
  onCancel: () => void;
  onDecoded: (code: string) => void;
}) {
  const { videoRef, canvasRef, error, streaming } = useQrCamera({
    onDecode: (value) => {
      const code = value.trim().replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
      if (code) onDecoded(code);
    },
  });

  return (
    <RelaySheet label="Scanner le QR du client" onClose={onCancel} size="sm">
      <RelaySheetHeader
        icon={QrCode}
        title="Scanner le QR du client"
        subtitle="Le client l'affiche dans sa commande. Il porte le même code que son SMS."
        onClose={onCancel}
      />

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {!streaming ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-blue-200/70">
            <QrCode size={72} strokeWidth={1.2} />
            <span className="px-6 text-center text-xs font-bold">
              {error ? "Caméra indisponible — saisissez le code à la main" : "Activation de la caméra..."}
            </span>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-6 rounded-2xl">
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-blue-400" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-blue-400" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-blue-400" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-blue-400" />
          <span className="animate-qr-scan absolute inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-blue-300 to-transparent shadow-[0_0_18px_rgba(96,165,250,.9)]" />
        </div>
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-amber-600">{error}</p> : null}

      <button
        type="button"
        onClick={onCancel}
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        Saisir le code à la main
      </button>
    </RelaySheet>
  );
}

export default function RelayPickup({
  parcels,
  busy,
  onHandOver,
  onIssue,
  onOpenReturnDeposit,
  onOpenErrorStates,
}: {
  parcels: RelayPickupParcel[];
  busy: boolean;
  onHandOver: (input: HandOverInput) => Promise<boolean>;
  onIssue: (input: CounterIssueInput) => Promise<boolean>;
  /**
   * Envoie vers l'écran « Constats et retours », onglet « Dépôt de retour ».
   *
   * Le dépôt ne se fait plus ici : il exige deux photos du scellé, et un
   * formulaire replié sous un accordéon du comptoir n'est pas l'endroit pour
   * demander à quelqu'un de sortir son appareil photo. Un seul chemin de
   * dépôt, qui collecte la preuve.
   */
  onOpenReturnDeposit: () => void;
  /** Ouvre la liste des états du portail, sur l'entrée « États d'erreur ». */
  onOpenErrorStates: () => void;
}) {
  const [code, setCode] = useState("");
  const [onCounter, setOnCounter] = useState<number[]>([]);
  const [sheet, setSheet] = useState<BuyerInspection | "ISSUE" | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [signatureHelp, setSignatureHelp] = useState(false);
  /**
   * Consignes depliees.
   *
   * Plusieurs a la fois, pas une seule : au comptoir, deux situations se
   * cumulent souvent — un client qui refuse ET qui a plusieurs colis. Un
   * accordeon qui referme la consigne precedente obligerait a faire des
   * allers-retours, une main sur le telephone et le client qui attend.
   *
   * Toutes fermees au depart : elles se consultent quand un cas se presente,
   * pas au chargement. En laisser une depliee ferait croire qu'elle concerne
   * le client qui est devant vous.
   */
  const [openSituations, setOpenSituations] = useState<string[]>([]);
  const toggleSituation = (id: string) =>
    setOpenSituations((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  // Un code entier fait foi : tant qu'il n'est pas complet on ne montre rien,
  // sinon le recapitulatif clignoterait a chaque frappe.
  const matched = useMemo(() => {
    if (code.length < 6) return [];
    return parcels.filter((parcel) => parcel.pickupCode.toUpperCase() === code.toUpperCase());
  }, [code, parcels]);

  /**
   * Changer de code remet le comptoir a zero.
   *
   * Les colis coches appartenaient au client precedent : les garder coches
   * ferait passer la validation du suivant sans que personne n'ait regarde
   * dans les casiers.
   */
  const changeCode = (next: string) => {
    setCode(next);
    setOnCounter([]);
  };

  const resolved = matched.length > 0;
  const gardeTotal = matched.reduce((total, parcel) => total + (parcel.gardeFeeXaf || 0), 0);
  const allOnCounter = resolved && onCounter.length === matched.length;
  const notFound = code.length === 6 && matched.length === 0;

  const toggleCounter = (id: number) =>
    setOnCounter((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const submitHandOver = async (
    inspection: BuyerInspection,
    input: { photo: File; signature: string; idReference: string },
  ) => {
    const success = await onHandOver({
      parcelIds: matched.map((parcel) => parcel.id),
      code: code.toUpperCase(),
      inspection,
      authorizedName: matched.find((parcel) => parcel.authorizedName)?.authorizedName || "",
      ...input,
    });
    if (success) {
      setSheet(null);
      changeCode("");
    }
  };

  const submitIssue = async (input: CounterIssueInput) => {
    const success = await onIssue(input);
    if (success) {
      setSheet(null);
      changeCode("");
    }
  };

  return (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Retrait client
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium text-slate-500 dark:text-slate-400">
          Code ou QR, montant calculé, photo. Moins d'une minute.
        </p>
      </header>

      {/* ── Saisie du code ─────────────────────────────────────────────────
          Le code est la seule chose qui autorise la sortie d'un colis : il
          occupe donc tout le haut de l'ecran tant qu'il n'a rien ouvert.

          Le QR du client porte exactement le meme code : le scanner evite au
          gerant de recopier six chiffres lus sur un ecran fissure, au-dessus
          d'un comptoir, avec la queue derriere. */}
      {!resolved ? (
        <section className="rounded-[18px] border border-slate-200/70 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-[11px] font-black uppercase leading-none tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Code de retrait du client
          </label>
          <input
            value={code}
            onChange={(event) => changeCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000000"
            className={`mt-3 w-full rounded-2xl border-2 bg-white px-4 py-4 text-center text-[30px] font-black tracking-[0.3em] text-slate-950 outline-none transition dark:bg-slate-950 dark:text-white ${
              notFound
                ? "border-red-400 focus:border-red-500"
                : "border-slate-200 focus:border-[#1D4ED8] dark:border-slate-700"
            }`}
          />

          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[15px] font-black text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <QrCode size={18} strokeWidth={2.2} /> Scanner le QR du client
          </button>

          {notFound ? (
            <p className="mt-3 flex items-start gap-2 text-[13.5px] font-semibold text-red-600 dark:text-red-400">
              <XCircle size={16} className="mt-0.5 flex-shrink-0" />
              Aucun colis en stock ne porte ce code. Vérifiez les 6 chiffres du SMS du client.
            </p>
          ) : (
            <p className="mt-3 text-[13.5px] font-medium leading-[1.5] text-slate-500 dark:text-slate-400">
              Le client le reçoit par SMS à l'arrivée de son colis, et le retrouve en QR dans sa commande.
              Sans code, pas de remise — c'est ce qui vous protège si quelqu'un réclame le colis d'un autre.
            </p>
          )}
        </section>
      ) : (
        /* ── Recapitulatif et issues ─────────────────────────────────────── */
        <section className="rounded-[18px] border border-slate-200/70 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[19px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
              Tout est en ordre ?
            </h3>
            <span
              className={`flex-shrink-0 rounded-full px-3 py-[5px] text-[12.5px] font-semibold ${
                gardeTotal > 0
                  ? "bg-[#FDF3DC] text-[#B4791A] dark:bg-amber-950 dark:text-amber-300"
                  : "bg-[#E3F5E9] text-[#2E7D4F] dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {gardeTotal > 0 ? `${nf(gardeTotal)} F de garde` : "Garde offerte"}
            </span>
          </div>

          <p className="mt-2.5 text-[14px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            Avant de valider la remise, invitez le client à ouvrir son colis ici, devant vous.
            « Tout est en ordre » ferme la fenêtre de retour et libère l'argent du vendeur.
          </p>

          <div className="mt-4 space-y-3">
            <SummaryRow label="Colis annoncés" value={String(matched.length)} />
            <SummaryRow
              label="Colis posés sur le comptoir"
              value={`${onCounter.length} sur ${matched.length}`}
              tone={allOnCounter ? undefined : "text-orange-600 dark:text-orange-400"}
            />
          </div>

          {/* Un seul colis : son casier suffit, le gerant va le chercher et
              revient. Plusieurs colis : chacun se coche, parce que c'est le
              seul moment ou quelqu'un verifie qu'il ne manque rien — et qu'une
              remise incomplete se solde par un litige a J+3. */}
          {matched.length === 1 ? (
            <p className="mt-3 text-[13px] font-semibold text-slate-400 dark:text-slate-500">
              Casier {matched[0].slot} · {matched[0].ref} · {matched[0].sizeLabel}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {matched.map((parcel) => {
                const checked = onCounter.includes(parcel.id);
                return (
                  <li key={parcel.id}>
                    <button
                      type="button"
                      onClick={() => toggleCounter(parcel.id)}
                      aria-pressed={checked}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[.98] ${
                        checked
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50"
                          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition ${
                          checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                        }`}
                      >
                        {checked ? <CheckCircle2 size={14} strokeWidth={3} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-slate-900 dark:text-white">
                          Casier {parcel.slot}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {parcel.ref} · {parcel.sizeLabel}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            disabled={!allOnCounter || busy}
            onClick={() => setSheet("ACCEPTED")}
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[12px] bg-gradient-to-r from-[#F58A1F] to-[#E8590C] px-4 py-4 text-[17px] font-black text-white shadow-[0_4px_14px_rgba(232,89,12,.38)] transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          >
            <Check size={19} strokeWidth={3} /> Tout est en ordre
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setSheet("ISSUE")}
            className="mt-2.5 flex w-full items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-3.5 text-[16px] font-bold text-slate-700 transition active:scale-[.97] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            Un problème
          </button>

          <button
            type="button"
            disabled={!allOnCounter || busy}
            onClick={() => setSheet("SKIPPED")}
            className="mt-4 w-full text-center text-[14px] font-black text-[#1D4ED8] transition active:scale-95 disabled:opacity-40 dark:text-blue-300"
          >
            Le client préfère ne pas ouvrir · continuer
          </button>

          <p className="mt-4 text-[13px] font-medium leading-[1.55] text-slate-400 dark:text-slate-500">
            « Un problème » ouvre un constat au comptoir, photos tout de suite : le colis reste chez vous et
            la garde s'arrête jusqu'à la décision. Si le client préfère ne pas ouvrir, continuez : sa fenêtre
            de retour reste ouverte 7 jours. S'il manque un colis annoncé, la validation est refusée.
          </p>

          <button
            type="button"
            onClick={() => changeCode("")}
            className="mt-3 w-full text-center text-xs font-bold text-slate-400 transition active:scale-95 dark:text-slate-500"
          >
            Saisir un autre code
          </button>
        </section>
      )}

      {/* ── Consignes de comptoir ──────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,.05)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-5 pb-1 pt-5 text-[18px] font-black tracking-[-0.015em] text-slate-900 dark:text-white">
          Autres situations au comptoir
        </h3>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {COUNTER_SITUATIONS.map(({ id, icon: Icon, tone, title, body }) => {
            const open = openSituations.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggleSituation(id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition active:scale-[.99]"
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-black leading-snug text-slate-900 dark:text-white">
                    {title}
                  </span>
                  {/* Plus / moins plutot qu'un chevron : ici on n'ouvre pas un
                      sous-menu, on deplie un texte. Le « + » dit qu'il y a
                      quelque chose en plus a lire, le chevron aurait promis
                      une navigation. */}
                  {open ? (
                    <Minus size={19} strokeWidth={2.6} className="flex-shrink-0 text-[#1D4ED8] dark:text-blue-300" />
                  ) : (
                    <Plus size={19} strokeWidth={2.6} className="flex-shrink-0 text-[#1D4ED8] dark:text-blue-300" />
                  )}
                </button>
                {open ? (
                  <p className="px-5 pb-4 pl-[4.25rem] text-[13px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
                    {body}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Deux sorties de secours du comptoir. Elles ne font pas partie du
          geste de remise — d'ou la forme sobre, cote a cote, hors des cartes
          blanches qui portent le travail. */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSignatureHelp(true)}
          className="flex items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 py-3.5 text-[14px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <PenLine size={17} strokeWidth={2.2} /> Signature PIN
        </button>
        <button
          type="button"
          onClick={onOpenErrorStates}
          className="flex items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-3 py-3.5 text-[14px] font-bold text-slate-700 transition active:scale-[.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <AlertTriangle size={17} strokeWidth={2.2} /> États d'erreur
        </button>
      </div>

      {/* ── Depot d'un retour ────────────────────────────────────
          L'autre raison pour laquelle un client se presente au comptoir. Vert
          parce que le colis entre au lieu de sortir.

          Le formulaire n'est plus ici. Le depot exige deux photos du scelle,
          et un accordeon du comptoir n'est pas l'endroit ou demander a
          quelqu'un de sortir son appareil photo pendant qu'un client attend.
          Un seul chemin, celui qui collecte la preuve. */}
      <button
        type="button"
        onClick={onOpenReturnDeposit}
        className="flex w-full items-center gap-3 overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition active:scale-[.99] dark:border-emerald-900 dark:bg-emerald-950/40"
      >
        <RotateCcw size={19} className="flex-shrink-0 text-emerald-700 dark:text-emerald-300" strokeWidth={2.4} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-black text-emerald-900 dark:text-emerald-100">
            Un client depose un retour valide
          </span>
          <span className="mt-0.5 block text-[13px] font-semibold text-emerald-900/70 dark:text-emerald-100/65">
            Scannez l'etiquette et photographiez le scelle
          </span>
        </span>
        <ChevronRight size={18} className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.4} />
      </button>

      {signatureHelp ? (
        <RelaySheet label="Signature du client" onClose={() => setSignatureHelp(false)} size="sm">
          <RelaySheetHeader
            icon={PenLine}
            title="Comment le client signe"
            subtitle="Ce qui vaut preuve de remise, et ce qui n'existe pas encore."
            onClose={() => setSignatureHelp(false)}
          />
          <p className="text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            Le client signe au doigt, sur votre écran, au moment de la remise. Cette signature part
            en preuve avec la photo : c'est elle qui vous dégage si quelqu'un conteste avoir reçu
            son colis.
          </p>
          <p className="mt-3 text-[13.5px] font-medium leading-[1.55] text-slate-500 dark:text-slate-400">
            La signature par code PIN n'est pas disponible : BelivaY ne conserve aucun code secret
            côté client, et le code de retrait ne peut pas en tenir lieu — il a déjà servi à ouvrir
            la remise. Si un client ne peut pas signer, notez-le dans « Un problème » plutôt que de
            valider sans preuve.
          </p>
          <button
            type="button"
            onClick={() => setSignatureHelp(false)}
            className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            J'ai compris
          </button>
        </RelaySheet>
      ) : null}

      {scanOpen ? (
        <PickupScanSheet
          onCancel={() => setScanOpen(false)}
          onDecoded={(value) => {
            setScanOpen(false);
            changeCode(value);
          }}
        />
      ) : null}

      {sheet === "ACCEPTED" || sheet === "SKIPPED" ? (
        <HandOverSheet
          inspection={sheet}
          parcels={matched}
          busy={busy}
          onCancel={() => setSheet(null)}
          onConfirm={(input) => void submitHandOver(sheet, input)}
        />
      ) : null}

      {sheet === "ISSUE" ? (
        <IssueSheet
          parcels={matched}
          busy={busy}
          onCancel={() => setSheet(null)}
          onConfirm={(input) => void submitIssue(input)}
        />
      ) : null}
    </div>
  );
}
