import {
  AlertTriangle,
  Bell,
  BookOpen,
  FileBadge2,
  Gauge,
  Map,
  Package,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  Store,
  User,
} from "lucide-react";

export type CourierTab =
  | "dashboard"
  | "tournee"
  | "courses"
  | "scanner"
  | "map"
  | "reseau"
  | "profil"
  | "formation"
  | "notifications"
  | "incidents"
  | "litiges"
  | "preuves"
  | "parametres";

export type CourierNavGroup = "pilotage" | "operations" | "qualite" | "compte";

export type IconComponent = typeof Gauge;

export interface CourierNavItem {
  id: CourierTab;
  labelKey: string;
  icon: IconComponent;
  /** Degrade de la pastille de badge : chaque metier garde sa couleur. */
  accent: string;
  group: CourierNavGroup;
}

export const COURIER_GROUP_LABEL_KEYS: Record<CourierNavGroup, string> = {
  pilotage: "courier_nav.group_pilotage",
  operations: "courier_nav.group_operations",
  qualite: "courier_nav.group_qualite",
  compte: "courier_nav.group_compte",
};

/**
 * Ordre du menu lateral, groupe par groupe. C'est la seule source de verite :
 * la colonne de bureau, le tiroir mobile, la barre d'onglets et la validation
 * du parametre ?tab= s'en servent toutes.
 */
export const COURIER_NAV_ITEMS: CourierNavItem[] = [
  // ── Pilotage ───────────────────────────────────────────────────────────────
  { id: "dashboard", labelKey: "courier_nav.tab_dashboard", icon: Gauge, accent: "from-emerald-400 to-green-600", group: "pilotage" },
  // ── Operations ─────────────────────────────────────────────────────────────
  { id: "tournee", labelKey: "courier_nav.tab_tournee", icon: Route, accent: "from-emerald-400 to-teal-600", group: "operations" },
  { id: "courses", labelKey: "courier_nav.tab_courses", icon: Package, accent: "from-lime-400 to-green-600", group: "operations" },
  { id: "scanner", labelKey: "courier_nav.tab_scanner", icon: ScanLine, accent: "from-green-300 to-emerald-500", group: "operations" },
  { id: "map", labelKey: "courier_nav.tab_map", icon: Map, accent: "from-sky-400 to-cyan-600", group: "operations" },
  { id: "reseau", labelKey: "courier_nav.tab_reseau", icon: Store, accent: "from-teal-300 to-emerald-500", group: "operations" },
  // ── Qualite & preuves ──────────────────────────────────────────────────────
  { id: "preuves", labelKey: "courier_nav.tab_preuves", icon: FileBadge2, accent: "from-green-400 to-emerald-600", group: "qualite" },
  { id: "incidents", labelKey: "courier_nav.tab_incidents", icon: AlertTriangle, accent: "from-amber-400 to-orange-500", group: "qualite" },
  { id: "litiges", labelKey: "courier_nav.tab_litiges", icon: ShieldCheck, accent: "from-orange-400 to-red-500", group: "qualite" },
  { id: "formation", labelKey: "courier_nav.tab_formation", icon: BookOpen, accent: "from-emerald-300 to-teal-500", group: "qualite" },
  // ── Compte ─────────────────────────────────────────────────────────────────
  { id: "profil", labelKey: "courier_nav.tab_profil", icon: User, accent: "from-emerald-400 to-green-600", group: "compte" },
  { id: "notifications", labelKey: "courier_nav.tab_notifications", icon: Bell, accent: "from-rose-400 to-red-500", group: "compte" },
  { id: "parametres", labelKey: "courier_nav.tab_parametres", icon: Settings2, accent: "from-slate-300 to-slate-500", group: "compte" },
];

export const COURIER_TABS: CourierTab[] = COURIER_NAV_ITEMS.map((item) => item.id);

export const COURIER_GROUP_ORDER: CourierNavGroup[] = ["pilotage", "operations", "qualite", "compte"];

export const TAB_LABEL_KEYS: Record<CourierTab, string> = COURIER_NAV_ITEMS.reduce(
  (labels, item) => ({ ...labels, [item.id]: item.labelKey }),
  {} as Record<CourierTab, string>,
);
