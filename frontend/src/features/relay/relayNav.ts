import {
  BellRing,
  Boxes,
  CalendarClock,
  CalendarOff,
  FileChartColumn,
  GraduationCap,
  History,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Medal,
  MessageSquareHeart,
  MessagesSquare,
  Network,
  PackagePlus,
  Scale,
  Settings2,
  ShieldCheck,
  UserRoundCheck,
  Wallet,
} from "lucide-react";

export type RelayTab =
  | "dashboard"
  | "reception"
  | "stock"
  | "retrait"
  | "historique"
  | "notifications"
  | "trust"
  | "avis"
  | "niveaux"
  | "formation"
  | "finances"
  | "rapports"
  | "capacite"
  | "reseau"
  | "fermeture"
  | "litiges"
  | "kyc"
  | "inscription"
  | "messagerie"
  | "aide"
  | "parametres"
  | "tokens";

export type RelayNavGroup = "pilotage" | "operations" | "qualite" | "gestion" | "risque" | "compte";

export type IconComponent = typeof LayoutDashboard;

export interface RelayNavItem {
  id: RelayTab;
  icon: IconComponent;
  /** Degrade de la pastille de badge : chaque metier a sa couleur. */
  accent: string;
  group: RelayNavGroup;
}

/**
 * Ordre du menu lateral, groupe par groupe. C'est la seule source de verite :
 * la barre laterale, la barre d'onglets mobile et la validation du parametre
 * ?tab= s'en servent toutes.
 */
export const RELAY_NAV_ITEMS: RelayNavItem[] = [
  // ── Pilotage ───────────────────────────────────────────────────────────────
  { id: "dashboard", icon: LayoutDashboard, accent: "from-sky-400 to-blue-600", group: "pilotage" },
  // ── Opérations ─────────────────────────────────────────────────────────────
  { id: "reception", icon: PackagePlus, accent: "from-emerald-400 to-teal-600", group: "operations" },
  { id: "stock", icon: Boxes, accent: "from-amber-400 to-orange-500", group: "operations" },
  { id: "retrait", icon: KeyRound, accent: "from-violet-400 to-purple-600", group: "operations" },
  { id: "historique", icon: History, accent: "from-cyan-400 to-sky-600", group: "operations" },
  { id: "notifications", icon: BellRing, accent: "from-rose-400 to-pink-600", group: "operations" },
  // ── Qualité ────────────────────────────────────────────────────────────────
  { id: "trust", icon: ShieldCheck, accent: "from-yellow-300 to-amber-500", group: "qualite" },
  { id: "avis", icon: MessageSquareHeart, accent: "from-sky-300 to-indigo-500", group: "qualite" },
  { id: "niveaux", icon: Medal, accent: "from-orange-400 to-rose-500", group: "qualite" },
  { id: "formation", icon: GraduationCap, accent: "from-teal-300 to-emerald-500", group: "qualite" },
  // ── Gestion ────────────────────────────────────────────────────────────────
  { id: "finances", icon: Wallet, accent: "from-lime-400 to-green-600", group: "gestion" },
  { id: "rapports", icon: FileChartColumn, accent: "from-blue-400 to-indigo-600", group: "gestion" },
  { id: "capacite", icon: CalendarClock, accent: "from-cyan-300 to-teal-500", group: "gestion" },
  { id: "reseau", icon: Network, accent: "from-indigo-400 to-violet-600", group: "gestion" },
  { id: "inscription", icon: UserRoundCheck, accent: "from-sky-400 to-cyan-600", group: "gestion" },
  // ── Risque ─────────────────────────────────────────────────────────────────
  { id: "litiges", icon: Scale, accent: "from-amber-400 to-red-500", group: "risque" },
  { id: "fermeture", icon: CalendarOff, accent: "from-rose-400 to-red-600", group: "risque" },
  { id: "kyc", icon: IdCard, accent: "from-fuchsia-400 to-purple-600", group: "risque" },
  // ── Compte ─────────────────────────────────────────────────────────────────
  { id: "messagerie", icon: MessagesSquare, accent: "from-blue-300 to-sky-500", group: "compte" },
  { id: "aide", icon: LifeBuoy, accent: "from-emerald-300 to-cyan-500", group: "compte" },
  { id: "parametres", icon: Settings2, accent: "from-slate-300 to-slate-500", group: "compte" },
];

/** "tokens" reste atteignable par ?tab=tokens mais ne figure plus au menu. */
export const RELAY_TABS: RelayTab[] = [...RELAY_NAV_ITEMS.map((item) => item.id), "tokens"];
