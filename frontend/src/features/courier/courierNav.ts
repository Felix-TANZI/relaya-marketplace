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
  label: string;
  icon: IconComponent;
  /** Degrade de la pastille de badge : chaque metier garde sa couleur. */
  accent: string;
  group: CourierNavGroup;
}

export const COURIER_GROUP_LABELS: Record<CourierNavGroup, string> = {
  pilotage: "Pilotage",
  operations: "Operations",
  qualite: "Qualite & preuves",
  compte: "Compte",
};

/**
 * Ordre du menu lateral, groupe par groupe. C'est la seule source de verite :
 * la colonne de bureau, le tiroir mobile, la barre d'onglets et la validation
 * du parametre ?tab= s'en servent toutes.
 */
export const COURIER_NAV_ITEMS: CourierNavItem[] = [
  // ── Pilotage ───────────────────────────────────────────────────────────────
  { id: "dashboard", label: "Vue d'ensemble", icon: Gauge, accent: "from-emerald-400 to-green-600", group: "pilotage" },
  // ── Operations ─────────────────────────────────────────────────────────────
  { id: "tournee", label: "Ma Tournee", icon: Route, accent: "from-emerald-400 to-teal-600", group: "operations" },
  { id: "courses", label: "Courses", icon: Package, accent: "from-lime-400 to-green-600", group: "operations" },
  { id: "scanner", label: "Scanner QR", icon: ScanLine, accent: "from-green-300 to-emerald-500", group: "operations" },
  { id: "map", label: "Carte & Navigation", icon: Map, accent: "from-sky-400 to-cyan-600", group: "operations" },
  { id: "reseau", label: "Boutiques & Points Relais", icon: Store, accent: "from-teal-300 to-emerald-500", group: "operations" },
  // ── Qualite & preuves ──────────────────────────────────────────────────────
  { id: "preuves", label: "Preuves & Relais", icon: FileBadge2, accent: "from-green-400 to-emerald-600", group: "qualite" },
  { id: "incidents", label: "Incidents", icon: AlertTriangle, accent: "from-amber-400 to-orange-500", group: "qualite" },
  { id: "litiges", label: "Litiges", icon: ShieldCheck, accent: "from-orange-400 to-red-500", group: "qualite" },
  { id: "formation", label: "Formation", icon: BookOpen, accent: "from-emerald-300 to-teal-500", group: "qualite" },
  // ── Compte ─────────────────────────────────────────────────────────────────
  { id: "profil", label: "Mon Profil", icon: User, accent: "from-emerald-400 to-green-600", group: "compte" },
  { id: "notifications", label: "Notifications", icon: Bell, accent: "from-rose-400 to-red-500", group: "compte" },
  { id: "parametres", label: "Parametres", icon: Settings2, accent: "from-slate-300 to-slate-500", group: "compte" },
];

export const COURIER_TABS: CourierTab[] = COURIER_NAV_ITEMS.map((item) => item.id);

export const COURIER_GROUP_ORDER: CourierNavGroup[] = ["pilotage", "operations", "qualite", "compte"];

export const TAB_LABELS: Record<CourierTab, string> = COURIER_NAV_ITEMS.reduce(
  (labels, item) => ({ ...labels, [item.id]: item.label }),
  {} as Record<CourierTab, string>,
);
