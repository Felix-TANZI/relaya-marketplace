// frontend/src/features/relay/relayShelf.ts
//
// =============================================================================
//  LE MODELE D'ETAGERES DU POINT RELAIS
//
//  Types, zones et regles d'etat partages par le plan des etageres et la
//  liste des colis. Ils vivent hors des composants pour deux raisons :
//
//  1. Le plan et la liste doivent parler des MEMES etats avec les MEMES
//     couleurs. Un colis vert sur le plan doit se retrouver dans l'onglet
//     « Gratuits », sinon les compteurs contredisent les cases.
//  2. Un fichier de composant qui exporte aussi des constantes casse le
//     rechargement a chaud de Vite. Meme separation que `relayNav.ts`.
// =============================================================================

/** Un colis en stock, vu par le plan. */
export interface ShelfParcel {
  id: number;
  orderId: number;
  ref: string;
  slot: string;
  /** Code brut du serveur : SMALL, STANDARD, LARGE, BULKY. */
  size: string;
  sizeLabel: string;
  buyerRef: string;
  status: string;
  pickupCode: string;
  receivedAt: string | null;
  gardeFreeUntil: string | null;
  gardeDeadline: string | null;
  gardeFeeXaf: number;
}

/** L'état d'une case, qui décide de sa couleur. */
export type CellState = "return" | "lastDay" | "paid" | "grouped" | "free" | "empty";

/**
 * Les trois zones.
 *
 * `places` est ce qu'un colis de cette zone consomme. `share` est la part de
 * la capacité totale que la zone reçoit — le reste va aux encombrants, pour
 * qu'aucune place ne se perde dans les arrondis.
 */
export const ZONES = [
  { key: "A", label: "Étagère A · Petits", places: 1, share: 0.4, cols: "grid-cols-8" },
  { key: "B", label: "Étagère B · Moyens", places: 2, share: 0.35, cols: "grid-cols-4" },
  { key: "C", label: "Sol C · Encombrants", places: 5, share: 0, cols: "grid-cols-2" },
] as const;

export type ZoneKey = (typeof ZONES)[number]["key"];

/** Un encombrant va au sol, un gros colis sur l'étagère du milieu. */
export function zoneOf(size: string): ZoneKey {
  if (size === "BULKY") return "C";
  if (size === "LARGE") return "B";
  return "A";
}

/**
 * Places qu'un colis occupe sur les etageres.
 *
 * Seule definition du taux de change taille -> places. Le plan, l'ecran de
 * capacite et le controle a la reception s'en servent tous : trois copies
 * finiraient par diverger, et le pourcentage affiche contredirait le plan.
 */
export function placesOf(size: string): number {
  return ZONES.find((zone) => zone.key === zoneOf(size))?.places ?? 1;
}

/**
 * Codes de retrait portes par plusieurs colis = remises groupees.
 *
 * Le serveur ne marque pas le groupage, mais il le dit : §8.3, un code remet
 * tous les colis de la commande presents ici. Deux colis qui partagent un
 * code partiront donc ensemble.
 */
export function groupedPickupCodes(parcels: ShelfParcel[]): Set<string> {
  const compte = new Map<string, number>();
  parcels.forEach((parcel) => {
    if (!parcel.pickupCode) return;
    compte.set(parcel.pickupCode, (compte.get(parcel.pickupCode) || 0) + 1);
  });
  return new Set([...compte.entries()].filter(([, n]) => n > 1).map(([code]) => code));
}

/** Nom court de la zone, tel qu'il se dit au comptoir. */
export const ZONE_SHORT: Record<ZoneKey, string> = { A: "petit", B: "moyen", C: "encombrant" };

export const CELL_STYLE: Record<CellState, string> = {
  return: "border-[#F2B8B8] bg-[#FDECEC] text-[#D84B4B]",
  lastDay: "border-[#F2D79B] bg-[#FDF6E3] text-[#B4791A]",
  paid: "border-[#F5C9A3] bg-[#FDF0E4] text-[#D97706]",
  grouped: "border-[#C3CCF5] bg-[#EEF1FD] text-[#5B6BD6]",
  free: "border-[#B7E0C4] bg-[#F1FAF3] text-[#2E7D4F]",
  empty: "border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600",
};

export const LEGEND: Array<{ state: Exclude<CellState, "empty">; label: string }> = [
  { state: "return", label: "À renvoyer" },
  { state: "lastDay", label: "Dernier jour" },
  { state: "paid", label: "Garde payante" },
  { state: "grouped", label: "Groupage" },
  { state: "free", label: "Gratuit" },
];

export const STATE_LABEL: Record<CellState, string> = {
  return: "À renvoyer",
  lastDay: "Dernier jour",
  paid: "Garde payante",
  grouped: "Groupage",
  free: "Garde gratuite",
  empty: "Emplacement libre",
};

export const nf = (value: number) => value.toLocaleString("fr-FR");

const DATE_COURTE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function formatJour(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : DATE_COURTE.format(date);
}

/**
 * L'état d'un colis, dans l'ordre où il compte.
 *
 * L'ordre n'est pas arbitraire : un colis à renvoyer ET groupé reste d'abord
 * un colis à renvoyer. On teste donc du plus contraignant au plus anodin, et
 * la première règle qui répond gagne.
 */
export function stateOf(parcel: ShelfParcel, groupedCodes: Set<string>): CellState {
  if (["RETURN_REQUESTED", "REFUSED"].includes(parcel.status)) return "return";

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const deadline = parcel.gardeDeadline ? new Date(parcel.gardeDeadline) : null;
  if (deadline && !Number.isNaN(deadline.getTime())) {
    if (deadline < now) return "return";
    if (deadline <= endOfToday) return "lastDay";
  }

  // Le groupage passe avant les frais : un colis gardé pour attendre ses
  // frères n'est pas en retard, il attend une remise unique.
  if (parcel.pickupCode && groupedCodes.has(parcel.pickupCode)) return "grouped";

  const freeUntil = parcel.gardeFreeUntil ? new Date(parcel.gardeFreeUntil) : null;
  if (freeUntil && !Number.isNaN(freeUntil.getTime()) && freeUntil <= now) return "paid";

  return "free";
}
