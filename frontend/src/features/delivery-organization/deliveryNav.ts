import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  Gauge,
  Map,
  MessageSquareText,
  PackageSearch,
  Route,
  Settings,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

export type OrgTab =
  | "dashboard"
  | "contract"
  | "fleet"
  | "missions"
  | "parcels"
  | "zones"
  | "pricing"
  | "proofs"
  | "disputes"
  | "performance"
  | "payments"
  | "messages"
  | "settings";

export type OrgNavGroup = "pilotage" | "company" | "operations" | "quality" | "finance" | "support";

export type IconComponent = typeof Gauge;

export interface OrgNavItem {
  id: OrgTab;
  icon: IconComponent;
  /** Degrade de la pastille de badge : chaque metier garde sa couleur. */
  accent: string;
  group: OrgNavGroup;
}

/**
 * Ordre du menu lateral, groupe par groupe. C'est la seule source de verite :
 * la colonne de bureau, le tiroir mobile, la barre d'onglets et la validation
 * du parametre ?tab= s'en servent toutes.
 */
export const ORG_NAV_ITEMS: OrgNavItem[] = [
  // ── Pilotage ───────────────────────────────────────────────────────────────
  { id: "dashboard", icon: Gauge, accent: "from-cyan-400 to-sky-600", group: "pilotage" },
  // ── Entreprise ─────────────────────────────────────────────────────────────
  { id: "contract", icon: FileCheck2, accent: "from-violet-400 to-purple-600", group: "company" },
  { id: "fleet", icon: Users, accent: "from-amber-400 to-orange-500", group: "company" },
  // ── Opérations ─────────────────────────────────────────────────────────────
  { id: "missions", icon: Truck, accent: "from-emerald-400 to-teal-600", group: "operations" },
  { id: "parcels", icon: PackageSearch, accent: "from-sky-400 to-blue-600", group: "operations" },
  { id: "zones", icon: Map, accent: "from-teal-300 to-cyan-500", group: "operations" },
  { id: "pricing", icon: Route, accent: "from-indigo-400 to-violet-600", group: "operations" },
  // ── Qualité ────────────────────────────────────────────────────────────────
  { id: "proofs", icon: ClipboardCheck, accent: "from-lime-400 to-green-600", group: "quality" },
  { id: "disputes", icon: AlertTriangle, accent: "from-amber-400 to-red-500", group: "quality" },
  { id: "performance", icon: BarChart3, accent: "from-blue-400 to-indigo-600", group: "quality" },
  // ── Finances ───────────────────────────────────────────────────────────────
  { id: "payments", icon: WalletCards, accent: "from-lime-400 to-green-600", group: "finance" },
  // ── Support ────────────────────────────────────────────────────────────────
  { id: "messages", icon: MessageSquareText, accent: "from-blue-300 to-sky-500", group: "support" },
  { id: "settings", icon: Settings, accent: "from-slate-300 to-slate-500", group: "support" },
];

export const ORG_TABS: OrgTab[] = ORG_NAV_ITEMS.map((item) => item.id);

export const ORG_GROUP_ORDER: OrgNavGroup[] = [
  "pilotage",
  "company",
  "operations",
  "quality",
  "finance",
  "support",
];
