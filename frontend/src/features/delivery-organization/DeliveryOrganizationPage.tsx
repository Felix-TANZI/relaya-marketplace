import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import EvidenceRequestInbox from "@/components/disputes/EvidenceRequestInbox";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  HeadphonesIcon,
  Languages,
  LogOut,
  Map,
  MessageSquareText,
  Moon,
  PackageSearch,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Truck,
  UserCircle,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { http } from "@/services/api/http";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { PayoutAccountVerificationCard } from "@/components/payments/PayoutAccountVerificationCard";
import TrackingMap from "@/components/TrackingMap";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import type { LocationPrecisionResult } from "@/services/api/location";
import { ensureImageUnderLimit } from "@/lib/imageCompression";

type OrgTab =
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

const ORG_TABS: OrgTab[] = [
  "dashboard",
  "contract",
  "fleet",
  "missions",
  "parcels",
  "zones",
  "pricing",
  "proofs",
  "disputes",
  "performance",
  "payments",
  "messages",
  "settings",
];

function getInitialOrgTab(): OrgTab {
  const requested = new URLSearchParams(window.location.search).get("tab") as OrgTab | null;
  return requested && ORG_TABS.includes(requested) ? requested : "dashboard";
}

type IconComponent = typeof Building2;

interface OrganizationCourier {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  zones: string[];
  vehicle_type: string;
  is_active: boolean;
  is_approved: boolean;
  is_online: boolean;
  availability_status: "AVAILABLE" | "ABSENT" | "LEAVE" | "SUSPENDED";
  availability_note: string;
  assigned_vehicle?: {
    id: number;
    label: string;
    registration: string;
    vehicle_type: string;
  } | null;
}

interface OrganizationVehicle {
  id: number;
  label: string;
  registration: string;
  vehicle_type: string;
  is_active: boolean;
  assigned_courier: { id: number; full_name: string } | null;
}

interface ComplianceDocument {
  id: number;
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
  updated_at: string;
}

interface OrganizationSummary {
  active_missions: number;
  open_disputes: number;
  couriers_total: number;
  couriers_approved: number;
  couriers_online: number;
  covered_zones: string[];
  delivered_30d: number;
  failed_30d: number;
  tracked_locations_30d: number;
}

interface OrganizationMission {
  id: number;
  order_id: number;
  reference: string;
  status: string;
  status_display: string;
  fulfillment_status: string;
  city: string;
  delivery_address: string;
  address_precision?: Partial<LocationPrecisionResult>;
  order_total_xaf: number;
  relay_point: string;
  vendor_names: string[];
  courier: {
    id: number;
    username: string;
    full_name: string;
    phone: string;
    vehicle_type: string;
  } | null;
  updated_at: string;
  latest_location: {
    id: number;
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
    speed_mps: number | null;
    heading_deg: number | null;
    source: "DEVICE" | "SIMULATION";
    captured_at: string;
  } | null;
  location_history: Array<{
    id: number;
    latitude: number;
    longitude: number;
    captured_at: string;
  }>;
  last_event?: { status: string; message: string; location: string; created_at: string } | null;
}

interface OrganizationDispute {
  id: number;
  ref: string;
  order_id: number;
  shipment_id: number | null;
  mission_reference: string;
  reason_display: string;
  status: string;
  status_display: string;
  description: string;
  organization_can_reply: boolean;
  messages_count: number;
  evidences_count: number;
  city: string;
  delivery_address: string;
  address_precision?: Partial<LocationPrecisionResult>;
  courier: {
    id: number;
    username: string;
    full_name: string;
    phone: string;
  } | null;
  updated_at: string;
}

const tabs: Array<{ id: OrgTab; icon: IconComponent; groupKey: "pilotage" | "company" | "operations" | "quality" | "finance" | "support" }> = [
  { id: "dashboard", icon: Gauge, groupKey: "pilotage" },
  { id: "contract", icon: FileCheck2, groupKey: "company" },
  { id: "fleet", icon: Users, groupKey: "company" },
  { id: "missions", icon: Truck, groupKey: "operations" },
  { id: "parcels", icon: PackageSearch, groupKey: "operations" },
  { id: "zones", icon: Map, groupKey: "operations" },
  { id: "pricing", icon: Route, groupKey: "operations" },
  { id: "proofs", icon: ClipboardCheck, groupKey: "quality" },
  { id: "disputes", icon: AlertTriangle, groupKey: "quality" },
  { id: "performance", icon: BarChart3, groupKey: "quality" },
  { id: "payments", icon: WalletCards, groupKey: "finance" },
  { id: "messages", icon: MessageSquareText, groupKey: "support" },
  { id: "settings", icon: Settings, groupKey: "support" },
];

const copy = {
  fr: {
    shell: {
      brand: "Organisation livraison",
      space: "Espace entreprise partenaire",
      status: "Statut partenaire",
      profile: "Profil partenaire",
      operationalData: "Données opérationnelles",
      notConnected: "À connecter",
      logout: "Se déconnecter",
      profileMenu: "Menu profil",
      openProfile: "Ouvrir le profil",
      customerProfile: "Compte utilisateur",
      close: "Fermer",
    },
    groups: {
      pilotage: "Pilotage",
      company: "Entreprise",
      operations: "Opérations",
      quality: "Qualité",
      finance: "Finances",
      support: "Support",
    },
    tabs: {
      dashboard: "Tableau de bord",
      contract: "Contrat & KYC",
      fleet: "Flotte & livreurs",
      missions: "Missions",
      parcels: "Colis",
      zones: "Zones & capacité",
      pricing: "Prix & SLA",
      proofs: "Preuves",
      disputes: "Litiges",
      performance: "Score qualité",
      payments: "Règlements",
      messages: "Messages",
      settings: "Paramètres",
    } satisfies Record<OrgTab, string>,
  },
  en: {
    shell: {
      brand: "Delivery organization",
      space: "Partner company workspace",
      status: "Partner status",
      profile: "Partner profile",
      operationalData: "Operational data",
      notConnected: "To connect",
      logout: "Log out",
      profileMenu: "Profile menu",
      openProfile: "Open profile",
      customerProfile: "User account",
      close: "Close",
    },
    groups: {
      pilotage: "Control",
      company: "Company",
      operations: "Operations",
      quality: "Quality",
      finance: "Finance",
      support: "Support",
    },
    tabs: {
      dashboard: "Dashboard",
      contract: "Contract & KYC",
      fleet: "Fleet & couriers",
      missions: "Missions",
      parcels: "Parcels",
      zones: "Zones & capacity",
      pricing: "Pricing & SLA",
      proofs: "Proofs",
      disputes: "Disputes",
      performance: "Quality score",
      payments: "Settlements",
      messages: "Messages",
      settings: "Settings",
    } satisfies Record<OrgTab, string>,
  },
};

const capabilitiesFr: Record<OrgTab, { title: string; description: string; methods: string[]; empty: string }> = {
  dashboard: {
    title: "Vue d'ensemble operationnelle",
    description: "Suivre l'etat global de l'entreprise partenaire : missions, livreurs, zones, blocages et qualite.",
    empty: "Les statistiques opérationnelles seront visibles dès que les missions seront connectées.",
    methods: [
      "Voir les missions en cours et les missions bloquees.",
      "Identifier les zones non couvertes ou en surcharge.",
      "Suivre la disponibilite de la flotte et les alertes SLA.",
    ],
  },
  contract: {
    title: "Contrat, KYC et validation entreprise",
    description: "Garder les informations legales et contractuelles de l'organisation visibles pour le partenaire.",
    empty: "Le dossier contrat/KYC utilise pour l'instant le profil créé par l'admin.",
    methods: [
      "Consulter le statut de validation de l'organisation.",
      "Voir la reference contrat, les zones contractuelles et le responsable operationnel.",
      "Preparrer les pieces KYC et informations administratives.",
    ],
  },
  fleet: {
    title: "Flotte et livreurs rattaches",
    description: "Gerer les livreurs et les vehicules appartenant a l'entreprise de livraison partenaire.",
    empty: "Aucun module de création livreur par organisation n'est encore connecté.",
    methods: [
      "Lister les livreurs rattaches a l'organisation.",
      "Suivre disponibilite, absence, conge et statut operationnel.",
      "Affecter ou reaffecter les vehicules de l'entreprise aux livreurs disponibles.",
    ],
  },
  missions: {
    title: "Missions de livraison",
    description: "Piloter les missions assignees a l'entreprise, depuis la boutique jusqu'a la livraison.",
    empty: "Aucune mission organisation n'est encore connectée.",
    methods: [
      "Voir les missions assignees, en route boutique, recuperees, en livraison et livrees.",
      "Affecter une mission a un livreur compatible.",
      "Suivre les echecs et demandes de reaffectation.",
    ],
  },
  parcels: {
    title: "Colis et commandes",
    description: "Consulter les colis confies a l'entreprise sans exposer les donnees client inutiles.",
    empty: "Aucun flux colis organisation n'est encore connecté.",
    methods: [
      "Voir les colis par statut, boutique de depart et zone de destination.",
      "Identifier les colis non affectes ou incompatibles capacite/transport.",
      "Consulter uniquement les informations operationnelles necessaires.",
    ],
  },
  zones: {
    title: "Zones, capacite et couverture",
    description: "Controler la couverture geographique, les limites de capacite et les raisons de non-affectation.",
    empty: "Les zones déclarées au profil sont visibles, les capacités fines restent à connecter.",
    methods: [
      "Declarer les zones couvertes par l'entreprise.",
      "Suivre la capacite par zone, livreur et moyen de transport.",
      "Rendre visibles les raisons de blocage : zone non couverte, capacite, indisponibilite.",
    ],
  },
  pricing: {
    title: "Prix, SLA et grille operationnelle",
    description: "Suivre les prix de livraison et les engagements de service attendus par BelivaY.",
    empty: "La grille tarifaire et les SLA ne sont pas encore connectés.",
    methods: [
      "Voir les tarifs par zone, volume, poids ou moyen de transport.",
      "Suivre les SLA de prise en charge et livraison.",
      "Identifier les missions dont le prix ou la zone necessite une decision BelivaY.",
    ],
  },
  proofs: {
    title: "Preuves de livraison",
    description: "Centraliser les photos, scans, signatures, OTP et traces necessaires pour securiser la livraison.",
    empty: "Les preuves de mission ne sont pas encore connectées à cette vue.",
    methods: [
      "Verifier les preuves de recuperation boutique.",
      "Verifier les preuves de remise client.",
      "Conserver les preuves utiles en cas de litige.",
    ],
  },
  disputes: {
    title: "Litiges et incidents",
    description: "Permettre a l'organisation de repondre aux litiges lorsque BelivaY l'autorise.",
    empty: "Aucun litige organisation n'est encore connecté.",
    methods: [
      "Voir les litiges lies a ses missions.",
      "Fournir les preuves livreur et commentaires operationnels.",
      "Suivre les decisions BelivaY : livreur disculpe, remboursement, retour ou penalite.",
    ],
  },
  performance: {
    title: "Score qualite partenaire",
    description: "Mesurer la ponctualite, les echecs, les litiges et la qualite des preuves.",
    empty: "Le score qualité sera calculé lorsque missions, preuves et litiges seront reliés.",
    methods: [
      "Suivre le taux de livraison reussie.",
      "Suivre les retards, echecs, litiges et preuves manquantes.",
      "Comparer la performance par zone et par livreur.",
    ],
  },
  payments: {
    title: "Reglements partenaire",
    description: "Raisonner le paiement au niveau de l'organisation, pas au niveau d'un livreur freelance.",
    empty: "Le rapprochement financier partenaire n'est pas encore connecté.",
    methods: [
      "Voir les missions reglees et a regler.",
      "Suivre les montants par periode, zone et statut.",
      "Preparer le rapprochement Mobile Money ou virement partenaire.",
    ],
  },
  messages: {
    title: "Communication operationnelle",
    description: "Coordonner l'entreprise, ses livreurs et BelivaY pendant les missions actives.",
    empty: "La messagerie organisation n'est pas encore connectée.",
    methods: [
      "Echanger avec BelivaY sur une mission ou un incident.",
      "Suivre les conversations liees aux livreurs.",
      "Garder la derniere recherche ou conversation recente visible.",
    ],
  },
  settings: {
    title: "Parametres de l'espace",
    description: "Gerer les preferences de base de l'espace organisation.",
    empty: "Les préférences locales sont disponibles via les boutons du header.",
    methods: [
      "Changer la langue de l'interface.",
      "Changer le theme clair/sombre.",
      "Acceder au profil et se deconnecter.",
    ],
  },
};

const capabilitiesEn: Record<OrgTab, { title: string; description: string; methods: string[]; empty: string }> = {
  dashboard: {
    title: "Operational dashboard",
    description: "Track the partner company's missions, couriers, zones, blocking reasons and quality.",
    empty: "Operational statistics will appear once organization missions are connected.",
    methods: ["View active and blocked missions.", "Identify uncovered or overloaded zones.", "Track fleet availability and SLA alerts."],
  },
  contract: {
    title: "Contract, KYC and company validation",
    description: "Keep legal and contractual information visible for the partner.",
    empty: "The contract/KYC file currently uses the profile created by the admin.",
    methods: ["Check organization validation status.", "View contract reference, contractual zones and operations manager.", "Prepare legal/KYC documents."],
  },
  fleet: {
    title: "Fleet and attached couriers",
    description: "Manage couriers and vehicles owned by the partner delivery company.",
    empty: "Courier creation by organization is not connected yet.",
    methods: ["List couriers attached to the organization.", "Track availability, absence, leave and operational status.", "Assign or reassign company-owned vehicles to available couriers."],
  },
  missions: {
    title: "Delivery missions",
    description: "Manage missions assigned to the company from pickup to delivery.",
    empty: "No organization mission feed is connected yet.",
    methods: ["View assigned, pickup, in-delivery and delivered missions.", "Assign a mission to a compatible courier.", "Track failures and reassignment requests."],
  },
  parcels: {
    title: "Parcels and orders",
    description: "View parcels entrusted to the company without exposing unnecessary customer data.",
    empty: "No organization parcel feed is connected yet.",
    methods: ["View parcels by status, pickup shop and destination zone.", "Identify unassigned or incompatible parcels.", "Show only required operational data."],
  },
  zones: {
    title: "Zones, capacity and coverage",
    description: "Control geographic coverage, capacity limits and non-assignment reasons.",
    empty: "Profile zones are visible; detailed capacity rules remain to connect.",
    methods: ["Declare company coverage zones.", "Track capacity by zone, courier and vehicle.", "Expose blocking reasons: uncovered zone, capacity, unavailability."],
  },
  pricing: {
    title: "Pricing, SLA and operational grid",
    description: "Track delivery prices and BelivaY service commitments.",
    empty: "Pricing grid and SLA data are not connected yet.",
    methods: ["View rates by zone, volume, weight or vehicle.", "Track pickup and delivery SLAs.", "Flag missions requiring BelivaY decision."],
  },
  proofs: {
    title: "Delivery proofs",
    description: "Centralize photos, scans, signatures, OTP and traces required to secure delivery.",
    empty: "Mission proofs are not connected to this view yet.",
    methods: ["Verify pickup proofs.", "Verify customer handoff proofs.", "Keep useful proof for disputes."],
  },
  disputes: {
    title: "Disputes and incidents",
    description: "Allow the organization to respond to disputes when BelivaY authorizes it.",
    empty: "No organization dispute feed is connected yet.",
    methods: ["View disputes linked to company missions.", "Provide courier proofs and operational notes.", "Track BelivaY decisions."],
  },
  performance: {
    title: "Partner quality score",
    description: "Measure punctuality, failures, disputes and proof quality.",
    empty: "Quality score will be calculated when missions, proofs and disputes are connected.",
    methods: ["Track successful delivery rate.", "Track delays, failures, disputes and missing proofs.", "Compare performance by zone and courier."],
  },
  payments: {
    title: "Partner settlements",
    description: "Handle payments at organization level, not as a freelance courier marketplace.",
    empty: "Partner financial reconciliation is not connected yet.",
    methods: ["View settled and pending missions.", "Track amounts by period, zone and status.", "Prepare Mobile Money or bank transfer reconciliation."],
  },
  messages: {
    title: "Operational communication",
    description: "Coordinate the company, its couriers and BelivaY during active missions.",
    empty: "Organization messaging is not connected yet.",
    methods: ["Discuss a mission or incident with BelivaY.", "Track conversations linked to couriers.", "Keep the latest search or conversation visible."],
  },
  settings: {
    title: "Workspace settings",
    description: "Manage base organization workspace preferences.",
    empty: "Local preferences are available from the header buttons.",
    methods: ["Change interface language.", "Switch light/dark theme.", "Open profile and log out."],
  },
};

function groupTabs() {
  return tabs.reduce<Record<string, typeof tabs>>((acc, item) => {
    acc[item.groupKey] = [...(acc[item.groupKey] ?? []), item];
    return acc;
  }, {});
}

function formatCoverageZone(zone: string, city: string) {
  const trimmedZone = zone.trim();
  const normalizedCity = city.trim().toUpperCase();
  if (!trimmedZone || !normalizedCity || trimmedZone.toUpperCase() === normalizedCity) return trimmedZone;
  if (trimmedZone.toUpperCase().startsWith(`${normalizedCity},`)) return trimmedZone;
  return `${normalizedCity}, ${trimmedZone}`;
}

function normalizeCoverageZones(zones: string[], city: string) {
  const formattedZones = zones.map((zone) => formatCoverageZone(zone, city)).filter(Boolean);
  const seen = new Set<string>();
  const uniqueZones = formattedZones.filter((zone) => {
    const key = zone.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const normalizedCity = city.trim().toUpperCase();
  const hasDetailedCityZones = uniqueZones.some((zone) => zone.toUpperCase().startsWith(`${normalizedCity},`));

  if (!hasDetailedCityZones) return uniqueZones;
  return uniqueZones.filter((zone) => zone.toUpperCase() !== normalizedCity);
}

function nextSettlementDate(locale: "fr" | "en") {
  const date = new Date();
  const daysUntilFriday = (5 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilFriday);
  return date.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function vehicleLabel(value?: string) {
  const labels: Record<string, string> = {
    MOTORBIKE: "Moto",
    CAR: "Voiture",
    VAN: "Fourgon",
    TRUCK: "Camion",
    BICYCLE: "Vélo",
  };
  return labels[value || ""] || value || "-";
}

function missionStatusLabel(status: string, fallback: string, locale: "fr" | "en") {
  if (locale === "en") return fallback;
  const labels: Record<string, string> = {
    ASSIGNED: "Assignée",
    PICKED_UP: "Collectée",
    IN_TRANSIT: "En transit",
    OUT_FOR_DELIVERY: "En livraison",
    DELIVERED: "Livrée",
    FAILED: "Échec",
    RETURNED: "Retournée",
    VALUE_LIMIT_EXCEEDED: "Valeur supérieure au plafond du livreur",
  };
  return labels[status] || fallback;
}

function Panel({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {kicker ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">{kicker}</p> : null}
      <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusPill({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "slate" | "emerald" | "amber" | "red" }) {
  const cls = {
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
    slate: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}

function precisionTone(score: number): "emerald" | "amber" | "red" {
  return score >= 75 ? "emerald" : score >= 55 ? "amber" : "red";
}

function PrecisionHint({ precision, locale }: { precision?: Partial<LocationPrecisionResult>; locale: "fr" | "en" }) {
  if (!precision || typeof precision.precisionScore !== "number") return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <StatusPill tone={precisionTone(precision.precisionScore)}>
        {locale === "en" ? "Precision" : "Précision"} {precision.precisionScore}/100
      </StatusPill>
      {precision.driverHint ? (
        <span className="text-xs font-semibold text-slate-500">{precision.driverHint}</span>
      ) : null}
    </div>
  );
}

export default function DeliveryOrganizationPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<OrgTab>(getInitialOrgTab);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [couriers, setCouriers] = useState<OrganizationCourier[]>([]);
  const [summary, setSummary] = useState<OrganizationSummary | null>(null);
  const [missions, setMissions] = useState<OrganizationMission[]>([]);
  const [missionQueue, setMissionQueue] = useState<OrganizationMission[]>([]);
  const [disputes, setDisputes] = useState<OrganizationDispute[]>([]);
  const [vehicles, setVehicles] = useState<OrganizationVehicle[]>([]);
  const [vehicleLabelInput, setVehicleLabelInput] = useState("");
  const [vehicleRegistration, setVehicleRegistration] = useState("");
  const [vehicleTypeInput, setVehicleTypeInput] = useState("MOTORBIKE");
  const [organizationMessage, setOrganizationMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [disputeReplies, setDisputeReplies] = useState<Record<number, string>>({});
  const [zonesInput, setZonesInput] = useState("");
  const [showAttachCourier, setShowAttachCourier] = useState(false);
  const [courierUsernameInput, setCourierUsernameInput] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [complianceDocuments, setComplianceDocuments] = useState<ComplianceDocument[]>([]);
  const [missionAssignments, setMissionAssignments] = useState<Record<number, string>>({});
  const [couriersLoading, setCouriersLoading] = useState(true);
  const [operationsLoading, setOperationsLoading] = useState(true);
  const menu = useMemo(() => groupTabs(), []);
  const locale = i18n.language.startsWith("en") ? "en" : "fr";
  const ui = copy[locale];
  const capabilities = locale === "en" ? capabilitiesEn : capabilitiesFr;
  const orgProfile = user?.delivery_organization_profile;
  const active = capabilities[tab];

  useEffect(() => {
    setAvatarUrl(user?.avatar_url || "");
  }, [user?.avatar_url]);

  const organization = {
    name: orgProfile?.company_name || ui.shell.brand,
    manager: orgProfile?.manager_name || user?.first_name || user?.username || (locale === "en" ? "Manager" : "Responsable"),
    city: orgProfile?.city || (locale === "en" ? "City to define" : "Ville à définir"),
    phone: orgProfile?.phone || (locale === "en" ? "Phone to complete" : "Téléphone à compléter"),
    zones: orgProfile?.zones || [],
    address: orgProfile?.address || (locale === "en" ? "Address to complete" : "Adresse à compléter"),
    contract: orgProfile?.contract_reference || (locale === "en" ? "Contract to define" : "Contrat à définir"),
    status: orgProfile?.status === "APPROVED" ? (locale === "en" ? "Approved" : "Approuvée") : orgProfile?.status === "SUSPENDED" ? (locale === "en" ? "Suspended" : "Suspendue") : (locale === "en" ? "Pending" : "En attente"),
  };

  const switchLanguage = () => i18n.changeLanguage(i18n.language.startsWith("fr") ? "en" : "fr");
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const refreshFleet = async () => {
    const [courierItems, vehicleItems] = await Promise.all([
      http<OrganizationCourier[]>("/api/auth/delivery-organization/couriers/"),
      http<OrganizationVehicle[]>("/api/auth/delivery-organization/vehicles/"),
    ]);
    setCouriers(courierItems);
    setVehicles(vehicleItems);
  };
  const updateCourierAvailability = async (courierId: number, availabilityStatus: OrganizationCourier["availability_status"]) => {
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http(`/api/auth/delivery-organization/couriers/${courierId}/`, {
        method: "PATCH",
        body: JSON.stringify({ availability_status: availabilityStatus }),
      });
      await refreshFleet();
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Courier availability updated." : "Disponibilité du livreur mise à jour." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const createVehicle = async () => {
    if (!vehicleLabelInput.trim() || !vehicleRegistration.trim()) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http("/api/auth/delivery-organization/vehicles/", {
        method: "POST",
        body: JSON.stringify({ label: vehicleLabelInput.trim(), registration: vehicleRegistration.trim(), vehicle_type: vehicleTypeInput }),
      });
      setVehicleLabelInput("");
      setVehicleRegistration("");
      await refreshFleet();
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Vehicle added to the company fleet." : "Véhicule ajouté au parc de l'entreprise." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const assignVehicle = async (vehicleId: number, courierId: string) => {
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http("/api/auth/delivery-organization/vehicles/", {
        method: "PATCH",
        body: JSON.stringify({ vehicle_id: vehicleId, courier_id: courierId || null }),
      });
      await refreshFleet();
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Vehicle assignment updated." : "Affectation du véhicule mise à jour." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const replyToDispute = async (disputeId: number) => {
    const message = disputeReplies[disputeId]?.trim();
    if (!message) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http(`/api/auth/delivery-organization/disputes/${disputeId}/reply/`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setDisputeReplies((current) => ({ ...current, [disputeId]: "" }));
      setDisputes(await http<OrganizationDispute[]>("/api/auth/delivery-organization/disputes/open/"));
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Reply added to the dispute." : "Réponse ajoutée au dossier de litige." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const saveZones = async () => {
    const zones = zonesInput.split(",").map((zone) => zone.trim()).filter(Boolean);
    if (!zones.length) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http("/api/auth/delivery-organization/profile/", { method: "PATCH", body: JSON.stringify({ zones }) });
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Coverage zones updated." : "Zones de couverture enregistrées." });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
      setActionBusy(false);
    }
  };
  const attachCourier = async () => {
    if (!courierUsernameInput.trim()) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http("/api/auth/delivery-organization/couriers/", { method: "POST", body: JSON.stringify({ username: courierUsernameInput.trim() }) });
      setCourierUsernameInput("");
      setShowAttachCourier(false);
      await refreshFleet();
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Courier attached to the organization." : "Livreur rattaché à l'organisation." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const sendSupportMessage = async () => {
    if (supportSubject.trim().length < 3 || supportMessage.trim().length < 10) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: organization.name,
          email: user?.email || "support@belivay.com",
          phone: organization.phone,
          subject: `[Organisation] ${supportSubject.trim()}`,
          message: supportMessage.trim(),
        }),
      });
      setSupportSubject("");
      setSupportMessage("");
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Message sent to BelivaY support." : "Message transmis au support BelivaY." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const uploadComplianceDocument = async (documentType: string, file?: File) => {
    if (!file) return;
    const compressedFile = await ensureImageUnderLimit(file);
    setActionBusy(true);
    setOrganizationMessage(null);
    const body = new FormData();
    body.append("document_type", documentType);
    body.append("file", compressedFile);
    try {
      await http<ComplianceDocument>("/api/auth/compliance-documents/", { method: "POST", body });
      setComplianceDocuments(await http<ComplianceDocument[]>("/api/auth/compliance-documents/"));
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Document uploaded for BelivaY review." : "Document envoyé pour contrôle BelivaY." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const assignMission = async (shipmentId: number) => {
    const courierId = missionAssignments[shipmentId];
    if (!courierId) return;
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http(`/api/auth/delivery-organization/missions/${shipmentId}/assign/`, { method: "POST", body: JSON.stringify({ courier_id: Number(courierId) }) });
      const [activeItems, queueItems, summaryData] = await Promise.all([
        http<OrganizationMission[]>("/api/auth/delivery-organization/missions/active/"),
        http<OrganizationMission[]>("/api/auth/delivery-organization/missions/queue/"),
        http<OrganizationSummary>("/api/auth/delivery-organization/summary/"),
      ]);
      setMissions(activeItems); setMissionQueue(queueItems); setSummary(summaryData);
      setOrganizationMessage({ tone: "success", text: locale === "en" ? "Mission assigned to the courier." : "Mission affectée au livreur." });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : "Action impossible." });
    } finally {
      setActionBusy(false);
    }
  };
  const tabIcon = tabs.find((item) => item.id === tab)?.icon ?? Gauge;
  const ActiveIcon = tabIcon;
  const displayZones = normalizeCoverageZones(organization.zones, organization.city);
  const coveredZones = displayZones.length ? displayZones : [locale === "en" ? "No covered zone declared" : "Aucune zone couverte déclarée"];
  const approvedCouriers = summary?.couriers_approved ?? couriers.filter((courier) => courier.is_approved).length;
  const onlineCouriers = summary?.couriers_online ?? couriers.filter((courier) => courier.is_online).length;
  const activeMissionsCount = summary?.active_missions ?? missions.length;
  const openDisputesCount = summary?.open_disputes ?? disputes.length;
  const assignedMissions = missions.filter((mission) => mission.status === "ASSIGNED").length;
  const pickedUpMissions = missions.filter((mission) => ["PICKED_UP", "IN_TRANSIT"].includes(mission.status)).length;
  const outForDeliveryMissions = missions.filter((mission) => mission.status === "OUT_FOR_DELIVERY").length;
  const payoutDate = nextSettlementDate(locale);
  const isOrgApproved = orgProfile?.status === "APPROVED";
  const isOrgSuspended = orgProfile?.status === "SUSPENDED";
  const hasContract = Boolean(orgProfile?.contract_reference?.trim());
  const hasAgencyAddress = Boolean(orgProfile?.address?.trim());
  const hasZones = organization.zones.length > 0;
  const hasFleet = approvedCouriers > 0;
  const operationalStatus = isOrgSuspended
    ? locale === "en" ? "Suspended" : "Suspendue"
    : isOrgApproved && hasContract && hasAgencyAddress && hasZones && hasFleet
      ? locale === "en" ? "Ready" : "Opérationnelle"
      : locale === "en" ? "Configuring" : "En configuration";
  const operationalTone = isOrgSuspended ? "red" : operationalStatus === "Opérationnelle" || operationalStatus === "Ready" ? "emerald" : "amber";
  const activationSteps = [
    [locale === "en" ? "BelivaY validation" : "Validation BelivaY", isOrgApproved, organization.status],
    [locale === "en" ? "Contract reference" : "Référence contrat", hasContract, organization.contract],
    [locale === "en" ? "Covered zones" : "Zones couvertes", hasZones, hasZones ? displayZones.join(", ") : locale === "en" ? "To declare" : "À déclarer"],
    [locale === "en" ? "Agency address" : "Adresse agence", hasAgencyAddress, organization.address],
    [locale === "en" ? "Approved couriers" : "Livreurs approuvés", hasFleet, `${approvedCouriers}/${couriers.length}`],
  ] as const;
  const kycItems = [
    [locale === "en" ? "Legal company record" : "Registre de commerce", isOrgApproved ? locale === "en" ? "Verified" : "Vérifié" : locale === "en" ? "To send" : "À envoyer", locale === "en" ? "Legal document identifying the partner company." : "Document légal identifiant l'entreprise partenaire."],
    [locale === "en" ? "Manager identity" : "Pièce du responsable", isOrgApproved ? locale === "en" ? "Verified" : "Vérifié" : locale === "en" ? "To send" : "À envoyer", locale === "en" ? "Identity document for the operations manager." : "Pièce d'identité du responsable opérationnel."],
    [locale === "en" ? "Contract reference" : "Référence contrat", hasContract ? locale === "en" ? "Ready" : "Prêt" : locale === "en" ? "Missing" : "Manquant", locale === "en" ? "BelivaY contract used for pricing and payout rules." : "Contrat BelivaY utilisé pour la grille tarifaire et les paiements."],
    [locale === "en" ? "Covered zones" : "Zones couvertes", hasZones ? locale === "en" ? "Ready" : "Prêt" : locale === "en" ? "Missing" : "Manquant", hasZones ? displayZones.join(", ") : locale === "en" ? "Declared delivery coverage for routing." : "Couverture déclarée pour le routage des missions."],
    [locale === "en" ? "Payment method" : "Moyen de paiement", locale === "en" ? "To connect" : "À connecter", locale === "en" ? "Mobile Money or bank account for settlements." : "Compte Mobile Money ou virement pour les règlements."],
  ] as const;

  const Field = ({ label, value, icon: Icon }: { label: string; value: string; icon: IconComponent }) => (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
      <Icon className="mt-0.5 flex-shrink-0 text-cyan-700 dark:text-cyan-300" size={18} />
      <div>
        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</div>
        <div className="mt-1 font-bold text-slate-800 dark:text-slate-100">{value}</div>
      </div>
    </div>
  );

  const EmptyState = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 p-5 text-sm font-semibold text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100">
      {children}
    </div>
  );

  const renderMobileBrief = () => (
    <section className="mb-3 rounded-2xl border border-cyan-100 bg-white p-3 shadow-sm dark:border-cyan-900/50 dark:bg-slate-900 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
          <ActiveIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">{ui.shell.brand}</p>
          <h2 className="truncate text-lg font-black leading-tight text-slate-950 dark:text-white">{ui.tabs[tab]}</h2>
        </div>
        <StatusPill tone={operationalTone}>{operationalStatus}</StatusPill>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-black">
        <span className="flex-shrink-0 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
          {approvedCouriers}/{couriers.length} livreurs
        </span>
        <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {activeMissionsCount} missions
        </span>
        <span className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {displayZones.length} zones
        </span>
      </div>
    </section>
  );

  const WorkCard = ({ title, value, body, icon: Icon }: { title: string; value: string; body: string; icon: IconComponent }) => (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
        </div>
        <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200 sm:flex">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 hidden text-sm leading-6 text-slate-600 dark:text-slate-300 sm:block">{body}</p>
    </article>
  );

  const renderBrandBlock = () => (
    <div className="mb-5 rounded-[22px] border border-cyan-100/15 bg-[linear-gradient(145deg,rgba(103,232,249,.18),rgba(255,255,255,.04))] p-4 shadow-[0_18px_40px_rgba(8,51,68,.35)]">
      <div className="flex min-h-16 items-center justify-center">
        <img src="/belivay-logo-delivery-org.png" alt="BelivaY" className="h-14 w-full object-contain drop-shadow-[0_10px_24px_rgba(103,232,249,.18)]" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">{ui.shell.brand}</span>
        <span className="rounded-full bg-cyan-100/15 px-2 py-1 text-[10px] font-black text-cyan-50">{operationalStatus}</span>
      </div>
    </div>
  );

  const renderSectionIntro = () => (
    <Panel kicker={ui.tabs[tab]} title={active.title}>
      <div className="flex gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
          <ActiveIcon size={24} />
        </div>
        <div>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{active.description}</p>
          <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
            {active.methods.map((method) => (
              <span key={method} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-100">
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );

  const renderFleet = () => (
    <Panel
      kicker={ui.tabs.fleet}
      title={locale === "en" ? "Attached courier roster" : "Registre des livreurs rattachés"}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
        <p className="max-w-2xl text-sm font-semibold leading-6 text-cyan-950 dark:text-cyan-100">
          {locale === "en"
            ? "The partner company manages its couriers and owns the vehicles. A vehicle can be reassigned when a courier is absent, on leave or unavailable."
            : "L'entreprise partenaire gère ses livreurs et possède les véhicules. Un véhicule peut être réaffecté lorsqu'un livreur est absent, en congé ou indisponible."}
        </p>
        <button type="button" onClick={() => setShowAttachCourier((visible) => !visible)} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white">
          {locale === "en" ? "Add courier" : "Ajouter un livreur"}
        </button>
      </div>
      {showAttachCourier ? (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-cyan-200 bg-white p-4 dark:border-cyan-800 dark:bg-slate-900 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{locale === "en" ? "Existing courier username" : "Identifiant d'un compte livreur existant"}<input value={courierUsernameInput} onChange={(event) => setCourierUsernameInput(event.target.value)} placeholder="livreur_mvan" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
          <button type="button" onClick={attachCourier} disabled={actionBusy || !courierUsernameInput.trim()} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{locale === "en" ? "Attach" : "Rattacher"}</button>
        </div>
      ) : null}
      {couriers.length === 0 ? (
        <EmptyState>
          {couriersLoading
            ? locale === "en" ? "Loading couriers..." : "Chargement des livreurs..."
            : locale === "en" ? "No courier is attached to this organization yet." : "Aucun livreur n'est encore rattaché à cette organisation."}
        </EmptyState>
      ) : (
        <>
        {missions.length > 0 ? (
          <div className="mb-5 overflow-hidden rounded-2xl border border-cyan-100 bg-slate-950 p-2 dark:border-cyan-900/50">
            <TrackingMap
              destinationAddress={missions[0].delivery_address}
              destinationCity={missions[0].city}
              destinationPrecision={missions[0].address_precision}
              destinationLabel={`${missions[0].reference} · ${missions[0].delivery_address}`}
              originLabel={missions[0].courier?.full_name || (locale === "en" ? "Assigned courier" : "Livreur affecté")}
              currentLocation={missions[0].latest_location
                ? [missions[0].latest_location.latitude, missions[0].latest_location.longitude]
                : undefined}
              locationHistory={missions[0].location_history.map((location) => [
                location.latitude,
                location.longitude,
              ] as [number, number])}
              height={360}
              className="border-0"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs font-bold text-cyan-50">
              <span>{missions[0].latest_location
                ? `${locale === "en" ? "Last GPS update" : "Dernière position GPS"}: ${new Date(missions[0].latest_location.captured_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR")}`
                : locale === "en" ? "Waiting for courier GPS position." : "En attente de la position GPS du livreur."}</span>
              <span>{missions[0].location_history.length} {locale === "en" ? "captured points" : "points enregistrés"}</span>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 p-5 text-sm font-semibold text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100">
            {locale === "en"
              ? "No active mission to display on the map. The courier roster remains available below."
              : "Aucune mission active à afficher sur la carte. Le registre des livreurs reste disponible ci-dessous."}
          </div>
        )}
        <div className="grid gap-3 md:hidden">
          {couriers.map((courier) => (
            <article key={courier.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">{courier.full_name || courier.username}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">@{courier.username} · {courier.phone || courier.email}</p>
                </div>
                <StatusPill tone={courier.is_online ? "emerald" : "slate"}>{courier.is_online ? locale === "en" ? "Online" : "En ligne" : locale === "en" ? "Offline" : "Hors ligne"}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2">
                <Field label={locale === "en" ? "Assigned vehicle" : "Véhicule affecté"} value={vehicleLabel(courier.vehicle_type)} icon={Truck} />
                <Field label={locale === "en" ? "City" : "Ville"} value={courier.city || "-"} icon={Map} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(courier.zones.length ? normalizeCoverageZones(courier.zones, courier.city || organization.city) : ["-"]).map((zone) => (
                  <span key={zone} className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{zone}</span>
                ))}
              </div>
              <select disabled={actionBusy} value={courier.availability_status || "AVAILABLE"} onChange={(event) => void updateCourierAvailability(courier.id, event.target.value as OrganizationCourier["availability_status"])} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="AVAILABLE">Disponible</option><option value="ABSENT">Absent</option><option value="LEAVE">En congé</option><option value="SUSPENDED">Suspendu</option>
              </select>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70">
              <span>{locale === "en" ? "Courier" : "Livreur"}</span>
              <span>{locale === "en" ? "Assigned vehicle" : "Véhicule affecté"}</span>
              <span>{locale === "en" ? "Zones" : "Zones"}</span>
              <span>{locale === "en" ? "Status" : "Statut"}</span>
            </div>
            {couriers.map((courier) => (
              <div key={courier.id} className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 border-t border-slate-100 px-4 py-4 text-sm dark:border-slate-800">
                <div>
                  <div className="font-black text-slate-950 dark:text-white">{courier.full_name || courier.username}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">@{courier.username} · {courier.phone || courier.email}</div>
                </div>
                <div className="font-bold text-slate-700 dark:text-slate-200">{vehicleLabel(courier.vehicle_type)}</div>
                <div className="flex flex-wrap gap-1">
                  {(courier.zones.length ? normalizeCoverageZones(courier.zones, courier.city || organization.city) : ["-"]).slice(0, 3).map((zone) => (
                    <span key={zone} className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{zone}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  <StatusPill tone={courier.availability_status === "AVAILABLE" ? "emerald" : "amber"}>{courier.availability_status || "AVAILABLE"}</StatusPill>
                  <select disabled={actionBusy} value={courier.availability_status || "AVAILABLE"} onChange={(event) => void updateCourierAvailability(courier.id, event.target.value as OrganizationCourier["availability_status"])} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="AVAILABLE">Disponible</option><option value="ABSENT">Absent</option><option value="LEAVE">En congé</option><option value="SUSPENDED">Suspendu</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-4">
          {[
            [locale === "en" ? "Approve / suspend" : "Approuver / suspendre", locale === "en" ? "Control which couriers can receive missions." : "Contrôler les livreurs autorisés à recevoir des missions."],
            [locale === "en" ? "Absence / leave" : "Absence / congé", locale === "en" ? "Mark a courier unavailable without losing the vehicle." : "Marquer un livreur indisponible sans immobiliser le véhicule."],
            [locale === "en" ? "Reassign vehicle" : "Réaffecter véhicule", locale === "en" ? "Move a company vehicle to another available courier." : "Affecter le véhicule de l'entreprise à un autre livreur disponible."],
            [locale === "en" ? "Assign zones" : "Affecter les zones", locale === "en" ? "Limit missions to covered zones and vehicle capacity." : "Limiter les missions aux zones et capacités véhicule compatibles."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <div className="font-black text-slate-950 dark:text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </div>
          ))}
        </div>
        </>
      )}
    </Panel>
  );

  const renderMissions = () => (
    <div className="space-y-5">
    <Panel kicker={locale === "en" ? "Dispatch queue" : "File d'affectation"} title={locale === "en" ? "Missions waiting for a courier" : "Missions en attente d'un livreur"}>
      {missionQueue.length === 0 ? <EmptyState>{locale === "en" ? "No compatible mission is waiting." : "Aucune mission compatible en attente."}</EmptyState> : <div className="space-y-3">{missionQueue.map((mission) => (
        <div key={mission.id} className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 md:grid-cols-[1fr_1.3fr_1fr_auto] md:items-center">
          <div><strong className="text-amber-950 dark:text-amber-100">{mission.reference}</strong><p className="mt-1 text-xs text-amber-900/70">{missionStatusLabel(mission.status, mission.status_display, locale)} · {mission.order_total_xaf.toLocaleString("fr-FR")} FCFA</p></div>
          <div>
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">{mission.city} · {mission.delivery_address}</div>
            <PrecisionHint precision={mission.address_precision} locale={locale} />
          </div>
          <select value={missionAssignments[mission.id] || ""} onChange={(event) => setMissionAssignments((current) => ({ ...current, [mission.id]: event.target.value }))} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:bg-slate-900 dark:text-white"><option value="">{locale === "en" ? "Choose courier" : "Choisir un livreur"}</option>{couriers.filter((courier) => courier.is_approved && courier.is_active && courier.availability_status === "AVAILABLE" && courier.assigned_vehicle).map((courier) => <option key={courier.id} value={courier.id}>{courier.full_name} · {courier.assigned_vehicle?.label}</option>)}</select>
          <button type="button" onClick={() => void assignMission(mission.id)} disabled={actionBusy || !missionAssignments[mission.id]} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{locale === "en" ? "Assign" : "Affecter"}</button>
        </div>
      ))}</div>}
    </Panel>
    <Panel kicker={ui.tabs.missions} title={locale === "en" ? "Active missions" : "Missions en cours"}>
      {missions.length === 0 ? (
        <EmptyState>
          {operationsLoading
            ? locale === "en" ? "Loading missions..." : "Chargement des missions..."
            : locale === "en" ? "No active mission for this organization." : "Aucune mission en cours pour cette organisation."}
        </EmptyState>
      ) : (
        <>
        <div className="grid gap-3 md:hidden">
          {missions.map((mission) => (
            <article key={mission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">{mission.reference}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{mission.city} · {mission.delivery_address}</p>
                  <PrecisionHint precision={mission.address_precision} locale={locale} />
                </div>
                <StatusPill>{missionStatusLabel(mission.status, mission.status_display, locale)}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2">
                <Field label={locale === "en" ? "Courier" : "Livreur"} value={mission.courier?.full_name || "-"} icon={Users} />
                <Field label={locale === "en" ? "Assigned vehicle" : "Véhicule affecté"} value={vehicleLabel(mission.courier?.vehicle_type)} icon={Truck} />
                <Field label={locale === "en" ? "Updated" : "Mise à jour"} value={new Date(mission.updated_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")} icon={Clock3} />
              </div>
              {mission.vendor_names.length ? (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
                  {locale === "en" ? "Origin" : "Origine"}: {mission.vendor_names.join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[.8fr_1fr_1.2fr_.9fr_.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70">
              <span>{locale === "en" ? "Mission" : "Mission"}</span>
              <span>{locale === "en" ? "Courier" : "Livreur"}</span>
              <span>{locale === "en" ? "Route" : "Trajet"}</span>
              <span>{locale === "en" ? "Status" : "Statut"}</span>
              <span>{locale === "en" ? "Updated" : "MAJ"}</span>
            </div>
            {missions.map((mission) => (
              <div key={mission.id} className="grid grid-cols-[.8fr_1fr_1.2fr_.9fr_.8fr] gap-3 border-t border-slate-100 px-4 py-4 text-sm dark:border-slate-800">
                <div className="font-black text-slate-950 dark:text-white">{mission.reference}</div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{mission.courier?.full_name || "-"}</div>
                  <div className="mt-1 text-xs text-slate-500">{mission.courier?.phone || mission.courier?.username || ""}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{mission.city}</div>
                  <div className="mt-1 line-clamp-1 text-xs text-slate-500">{mission.delivery_address}</div>
                  <PrecisionHint precision={mission.address_precision} locale={locale} />
                  {mission.vendor_names.length ? <div className="mt-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">{mission.vendor_names.join(", ")}</div> : null}
                </div>
                <StatusPill>{missionStatusLabel(mission.status, mission.status_display, locale)}</StatusPill>
                <div className="text-xs font-semibold text-slate-500">{new Date(mission.updated_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")}</div>
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </Panel></div>
  );

  const renderDisputes = () => (
    <Panel kicker={ui.tabs.disputes} title={locale === "en" ? "Open logistics disputes" : "Litiges logistiques ouverts"}>
      {disputes.length === 0 ? (
        <EmptyState>
          {operationsLoading
            ? locale === "en" ? "Loading disputes..." : "Chargement des litiges..."
            : locale === "en" ? "No open dispute is linked to this organization's missions." : "Aucun litige ouvert n'est lié aux missions de cette organisation."}
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {disputes.map((dispute) => (
            <article key={dispute.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950 dark:text-white">{dispute.ref}</h3>
                    <StatusPill tone={dispute.status === "OPEN" ? "cyan" : "slate"}>{dispute.status_display}</StatusPill>
                    <StatusPill tone={dispute.organization_can_reply ? "emerald" : "slate"}>
                      {dispute.organization_can_reply
                        ? locale === "en" ? "Reply allowed" : "Réponse autorisée"
                        : locale === "en" ? "Read only" : "Lecture seule"}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{dispute.reason_display} · {dispute.mission_reference || `Commande #${dispute.order_id}`}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{dispute.description}</p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  {new Date(dispute.updated_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <Field label={locale === "en" ? "Courier" : "Livreur"} value={dispute.courier?.full_name || "-"} icon={Users} />
                <Field label={locale === "en" ? "City" : "Ville"} value={dispute.city || "-"} icon={Map} />
                <Field label={locale === "en" ? "Messages" : "Messages"} value={dispute.messages_count.toString()} icon={MessageSquareText} />
                <Field label={locale === "en" ? "Evidence" : "Preuves"} value={dispute.evidences_count.toString()} icon={FileText} />
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500">{dispute.delivery_address}</p>
                <PrecisionHint precision={dispute.address_precision} locale={locale} />
              </div>
              {dispute.organization_can_reply ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <textarea value={disputeReplies[dispute.id] || ""} onChange={(event) => setDisputeReplies((current) => ({ ...current, [dispute.id]: event.target.value }))} placeholder={locale === "en" ? "Add the organization's operational response" : "Ajouter la réponse opérationnelle de l'organisation"} className="min-h-20 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <button type="button" onClick={() => void replyToDispute(dispute.id)} disabled={actionBusy || !disputeReplies[dispute.id]?.trim()} className="self-end rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{locale === "en" ? "Send reply" : "Envoyer la réponse"}</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );

  const renderModuleContent = () => {
    if (tab === "dashboard") {
      return (
        <div className="space-y-5">
          <section className="grid gap-4 lg:grid-cols-4">
            <WorkCard title="SLA" value="48h" body={locale === "en" ? "BelivaY target for visible pickup and delivery tracking." : "Objectif BelivaY pour le suivi prise en charge et livraison."} icon={Clock3} />
            <WorkCard title={locale === "en" ? "Fleet readiness" : "Disponibilité flotte"} value={`${approvedCouriers}/${couriers.length}`} body={locale === "en" ? "Approved couriers ready for assignment." : "Livreurs approuvés prêts à recevoir des missions."} icon={Users} />
            <WorkCard title={locale === "en" ? "Active missions" : "Missions en cours"} value={activeMissionsCount.toString()} body={locale === "en" ? "Assigned to couriers from this organization." : "Assignées aux livreurs de cette organisation."} icon={Truck} />
            <WorkCard title={locale === "en" ? "Open disputes" : "Litiges ouverts"} value={openDisputesCount.toString()} body={locale === "en" ? "Operational cases requiring BelivaY decision." : "Dossiers opérationnels en attente d'arbitrage BelivaY."} icon={AlertTriangle} />
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Panel kicker={locale === "en" ? "Live dispatch" : "Dispatch temps réel"} title={locale === "en" ? "Mission pipeline" : "Pipeline des missions"}>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  [locale === "en" ? "Assigned" : "Assignées", assignedMissions, Truck],
                  [locale === "en" ? "Picked up" : "Collectées", pickedUpMissions, PackageSearch],
                  [locale === "en" ? "Last mile" : "Dernier km", outForDeliveryMissions, Route],
                ] as Array<[string, number, IconComponent]>).map(([title, value, Icon]) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <Icon className="text-cyan-700 dark:text-cyan-300" size={20} />
                    <div className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {(missions.length ? missions.slice(0, 4) : []).map((mission) => (
                  <div key={mission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <div className="font-black text-slate-950 dark:text-white">{mission.reference}</div>
                      <div className="mt-1 text-sm text-slate-500">{mission.city} · {mission.courier?.full_name || "-"}</div>
                    </div>
                    <StatusPill>{missionStatusLabel(mission.status, mission.status_display, locale)}</StatusPill>
                  </div>
                ))}
                {missions.length === 0 ? <EmptyState>{locale === "en" ? "No active mission for this organization yet." : "Aucune mission active pour cette organisation."}</EmptyState> : null}
              </div>
            </Panel>
            <Panel kicker={locale === "en" ? "Risk desk" : "Cellule risques"} title={locale === "en" ? "Disputes and blockers" : "Litiges et blocages"}>
              <div className="space-y-3">
                {(disputes.length ? disputes.slice(0, 3) : []).map((dispute) => (
                  <div key={dispute.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-amber-950 dark:text-amber-100">{dispute.ref} · {dispute.reason_display}</strong>
                      <StatusPill tone={dispute.organization_can_reply ? "emerald" : "slate"}>
                        {dispute.organization_can_reply ? "Action" : "Suivi"}
                      </StatusPill>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-amber-900/75 dark:text-amber-100/75">{dispute.description}</p>
                  </div>
                ))}
                {disputes.length === 0 ? <EmptyState>{locale === "en" ? "No open logistics dispute." : "Aucun litige logistique ouvert."}</EmptyState> : null}
              </div>
            </Panel>
          </div>
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel kicker={locale === "en" ? "Fleet control" : "Contrôle flotte"} title={locale === "en" ? "Courier availability" : "Disponibilité des livreurs"}>
              <div className="space-y-3">
                {couriers.slice(0, 5).map((courier) => (
                  <div key={courier.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <div>
                      <div className="font-black text-slate-950 dark:text-white">{courier.full_name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{courier.city} · {vehicleLabel(courier.vehicle_type)}</div>
                    </div>
                    <StatusPill tone={courier.is_online ? "emerald" : "slate"}>{courier.is_online ? locale === "en" ? "Online" : "En ligne" : locale === "en" ? "Offline" : "Hors ligne"}</StatusPill>
                  </div>
                ))}
                {couriers.length === 0 ? <EmptyState>{locale === "en" ? "No courier attached yet." : "Aucun livreur rattaché pour le moment."}</EmptyState> : null}
              </div>
            </Panel>
            <Panel kicker={locale === "en" ? "Coverage" : "Couverture"} title={locale === "en" ? "Zones and contract" : "Zones et contrat"}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={locale === "en" ? "Contract" : "Contrat"} value={organization.contract} icon={FileText} />
                <Field label={locale === "en" ? "Manager" : "Responsable"} value={organization.manager} icon={Users} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {coveredZones.map((zone) => (
                  <span key={zone} className="rounded-full bg-cyan-100 px-3 py-2 text-sm font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">{zone}</span>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (tab === "contract") {
      return (
        <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
          <Panel kicker={ui.tabs.contract} title={locale === "en" ? "Company verification file" : "Dossier entreprise"}>
            <div className="mb-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                    {locale === "en" ? "Activation status" : "Statut d'activation"}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-cyan-950 dark:text-cyan-100">
                    {locale === "en"
                      ? "The company can operate only after validation, zones, fleet and contract setup."
                      : "L'entreprise ne peut opérer qu'après validation, zones, flotte et contrat configurés."}
                  </p>
                </div>
                <StatusPill tone={operationalTone}>{operationalStatus}</StatusPill>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={locale === "en" ? "Legal name" : "Nom légal"} value={organization.name} icon={Building2} />
              <Field label={locale === "en" ? "Contract reference" : "Référence contrat"} value={organization.contract} icon={FileText} />
              <Field label={locale === "en" ? "Operations manager" : "Responsable opérationnel"} value={organization.manager} icon={Users} />
              <Field label={locale === "en" ? "Operational address" : "Adresse opérationnelle"} value={organization.address} icon={Map} />
              <Field label={locale === "en" ? "Phone" : "Téléphone"} value={organization.phone} icon={HeadphonesIcon} />
              <Field label={locale === "en" ? "Validation" : "Validation"} value={organization.status} icon={ShieldCheck} />
            </div>
          </Panel>
          <Panel kicker="KYC" title={locale === "en" ? "Compliance checklist" : "Checklist conformité"}>
            <div className="space-y-3">
              {kycItems.map(([label, status, body], index) => {
                const documentType = ["COMPANY_RECORD", "MANAGER_ID", "CONTRACT", "COVERAGE", "PAYOUT_ACCOUNT"][index];
                const uploaded = complianceDocuments.find((document) => document.document_type === documentType);
                return (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{label}</span>
                    <StatusPill tone={["Vérifié", "Verified", "Prêt", "Ready"].includes(status) ? "emerald" : status === "À connecter" || status === "To connect" ? "slate" : "amber"}>{status}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-700 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
                    {uploaded ? `${locale === "en" ? "Uploaded" : "Envoyé"} · ${uploaded.status}` : locale === "en" ? "Send document" : "Envoyer le document"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={actionBusy} onChange={(event) => void uploadComplianceDocument(documentType, event.target.files?.[0])} />
                  </label>
                </div>
                );
              })}
            </div>
          </Panel>
          <div className="xl:col-span-2">
            <Panel kicker={locale === "en" ? "Activation chain" : "Chaîne d'activation"} title={locale === "en" ? "What still blocks operations" : "Ce qui conditionne les opérations"}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {activationSteps.map(([label, ok, detail]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-slate-950 dark:text-white">{label}</strong>
                      {ok ? <CheckCircle2 className="text-emerald-600" size={18} /> : <AlertTriangle className="text-amber-600" size={18} />}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (tab === "fleet") {
      return (
        <div className="space-y-5">
          <section className="grid grid-cols-3 gap-2 sm:gap-4">
            <WorkCard title={locale === "en" ? "Total couriers" : "Livreurs total"} value={couriers.length.toString()} body={locale === "en" ? "People attached to this organization." : "Personnes rattachées à cette organisation."} icon={Users} />
            <WorkCard title={locale === "en" ? "Approved" : "Approuvés"} value={approvedCouriers.toString()} body={locale === "en" ? "Allowed to receive delivery missions." : "Autorisés à recevoir des missions."} icon={ShieldCheck} />
            <WorkCard title={locale === "en" ? "Online" : "En ligne"} value={onlineCouriers.toString()} body={locale === "en" ? "Live availability will update from courier app." : "La disponibilité viendra de l'application livreur."} icon={Truck} />
          </section>
          <Panel kicker={locale === "en" ? "Company assets" : "Actifs de l'entreprise"} title={locale === "en" ? "Vehicle pool" : "Parc véhicules"}>
            <div className="grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                <h3 className="font-black text-cyan-950 dark:text-cyan-100">{locale === "en" ? "Add a company vehicle" : "Ajouter un véhicule d'entreprise"}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <input value={vehicleLabelInput} onChange={(event) => setVehicleLabelInput(event.target.value)} placeholder={locale === "en" ? "Vehicle label" : "Nom du véhicule"} className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
                  <input value={vehicleRegistration} onChange={(event) => setVehicleRegistration(event.target.value.toUpperCase())} placeholder="Immatriculation" className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
                  <select value={vehicleTypeInput} onChange={(event) => setVehicleTypeInput(event.target.value)} className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white">
                    <option value="MOTORBIKE">Moto</option><option value="CAR">Voiture</option><option value="TRICYCLE">Tricycle</option><option value="VAN">Camionnette</option><option value="BIKE">Vélo</option>
                  </select>
                  <button type="button" onClick={createVehicle} disabled={actionBusy || !vehicleLabelInput.trim() || !vehicleRegistration.trim()} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{locale === "en" ? "Add vehicle" : "Ajouter au parc"}</button>
                </div>
              </div>
              <div className="space-y-2">
                {vehicles.length === 0 ? <EmptyState>{locale === "en" ? "No company vehicle registered." : "Aucun véhicule d'entreprise enregistré."}</EmptyState> : vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr] sm:items-center">
                    <div><div className="font-black text-slate-950 dark:text-white">{vehicle.label} · {vehicle.registration}</div><div className="mt-1 text-xs font-semibold text-slate-500">{vehicleLabel(vehicle.vehicle_type)}</div></div>
                    <select disabled={actionBusy} value={vehicle.assigned_courier?.id || ""} onChange={(event) => void assignVehicle(vehicle.id, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">{locale === "en" ? "Unassigned" : "Non affecté"}</option>
                      {couriers.filter((courier) => courier.is_approved && courier.is_active && courier.availability_status === "AVAILABLE").map((courier) => <option key={courier.id} value={courier.id}>{courier.full_name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
          {renderFleet()}
        </div>
      );
    }

    if (tab === "settings") {
      return (
        <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
          <Panel kicker={ui.tabs.settings} title={locale === "en" ? "Workspace preferences" : "Préférences de l'espace"}>
            <div className="grid gap-3">
              <button type="button" onClick={switchLanguage} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                <span className="flex items-center gap-3"><Languages size={18} />{locale === "en" ? "Interface language" : "Langue de l'interface"}</span>
                <StatusPill>{locale === "fr" ? "FR" : "EN"}</StatusPill>
              </button>
              <button type="button" onClick={toggleTheme} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                <span className="flex items-center gap-3">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}{locale === "en" ? "Display theme" : "Thème d'affichage"}</span>
                <StatusPill>{theme === "dark" ? locale === "en" ? "Dark" : "Sombre" : locale === "en" ? "Light" : "Clair"}</StatusPill>
              </button>
              <button type="button" onClick={handleLogout} className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-left font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30">
                <span className="flex items-center gap-3"><LogOut size={18} />{ui.shell.logout}</span>
              </button>
            </div>
          </Panel>
          <Panel kicker={locale === "en" ? "Account" : "Compte"} title={locale === "en" ? "Profile summary" : "Résumé du profil"}>
            <div className="space-y-3">
              <div className="flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30 sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-cyan-300 bg-white text-2xl font-black text-cyan-700 dark:bg-slate-900">
                  {avatarUrl ? <img src={avatarUrl} alt="Photo du responsable" className="h-full w-full object-cover" /> : (user?.first_name?.[0] || user?.username?.[0] || "O").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-cyan-950 dark:text-cyan-100">{locale === "en" ? "Profile photo" : "Photo de profil"}</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-cyan-800/70 dark:text-cyan-200/70">{locale === "en" ? "Crop and compress the manager photo before upload." : "Rognez et compressez la photo du responsable avant son transfert."}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white hover:bg-cyan-600">
                  <Camera size={16} />{locale === "en" ? "Edit" : "Modifier"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { setAvatarFile(event.target.files?.[0] || null); event.currentTarget.value = ""; }} />
                </label>
              </div>
              <Field label={locale === "en" ? "Username" : "Identifiant"} value={user?.username || "-"} icon={UserCircle} />
              <Field label={locale === "en" ? "Organization" : "Organisation"} value={organization.name} icon={Building2} />
              <Field label={locale === "en" ? "Partner status" : "Statut partenaire"} value={organization.status} icon={ShieldCheck} />
            </div>
          </Panel>
        </div>
      );
    }

    if (tab === "zones") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <Panel kicker={ui.tabs.zones} title={locale === "en" ? "Coverage declared by the partner" : "Couverture déclarée par l'entreprise"}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <p className="max-w-2xl text-sm font-semibold leading-6 text-cyan-950 dark:text-cyan-100">
                {locale === "en"
                  ? "Zones drive routing, courier compatibility and mission blocking reasons."
                  : "Les zones pilotent le routage, la compatibilité livreur et les raisons de blocage mission."}
              </p>
              <div className="flex min-w-[280px] flex-1 gap-2 sm:max-w-xl">
                <input value={zonesInput} onChange={(event) => setZonesInput(event.target.value)} placeholder={locale === "en" ? "Mvan, Bastos, Akwa" : "Mvan, Bastos, Akwa"} className="min-w-0 flex-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-white" />
                <button type="button" onClick={saveZones} disabled={actionBusy || !zonesInput.trim()} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                  {locale === "en" ? "Save" : "Enregistrer"}
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(displayZones.length ? displayZones : [locale === "en" ? "No zone declared" : "Aucune zone déclarée"]).map((zone) => (
                <div key={zone} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <Map className="text-cyan-700 dark:text-cyan-300" size={20} />
                  <div className="mt-3 font-black text-slate-950 dark:text-white">{zone}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {locale === "en" ? "Capacity, vehicle rules and attached couriers remain to connect." : "Capacité, moyens compatibles et livreurs rattachés restent à connecter."}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      );
    }

    if (tab === "pricing") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <Panel kicker={ui.tabs.pricing} title={locale === "en" ? "BelivaY contract pricing grid" : "Grille tarifaire contractuelle BelivaY"}>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 dark:border-cyan-900 dark:bg-cyan-950/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-cyan-950 dark:text-cyan-50">
                    {hasContract ? organization.contract : locale === "en" ? "Contract pending" : "Contrat en attente"}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-950/75 dark:text-cyan-100/80">
                    {locale === "en"
                      ? "The partner views the negotiated grid in read-only mode. BelivaY defines prices by contract, zone, package profile and service level."
                      : "Le partenaire consulte la grille négociée en lecture seule. BelivaY fixe les prix par contrat, zone, profil colis et niveau de service."}
                  </p>
                </div>
                <StatusPill tone={hasContract ? "emerald" : "amber"}>{hasContract ? locale === "en" ? "Active" : "Active" : locale === "en" ? "Pending" : "En attente"}</StatusPill>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                [locale === "en" ? "Zone rates" : "Tarifs par zone", locale === "en" ? "Waiting for BelivaY pricing data." : "En attente des données tarifaires BelivaY."],
                ["SLA", locale === "en" ? "Pickup and delivery commitments by contract." : "Engagements de collecte et remise selon le contrat."],
                [locale === "en" ? "Exceptions" : "Exceptions", locale === "en" ? "Missions requiring BelivaY decision." : "Missions nécessitant une décision BelivaY."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div className="font-black text-slate-950 dark:text-white">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      );
    }

    if (tab === "payments") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <section className="grid gap-4 md:grid-cols-4">
            <WorkCard title={locale === "en" ? "To settle" : "À régler"} value="0 FCFA" body={locale === "en" ? "Validated missions pending payout." : "Missions validées en attente de règlement."} icon={WalletCards} />
            <WorkCard title={locale === "en" ? "Paid" : "Payé"} value="0 FCFA" body={locale === "en" ? "Closed settlements by period." : "Règlements clôturés par période."} icon={CheckCircle2} />
            <WorkCard title={locale === "en" ? "Next payout" : "Prochaine échéance"} value={hasContract ? payoutDate : locale === "en" ? "Pending" : "En attente"} body={locale === "en" ? "Estimated from the weekly contract cycle." : "Estimée depuis le cycle hebdomadaire du contrat."} icon={Clock3} />
            <WorkCard title={locale === "en" ? "Payment method" : "Moyen paiement"} value={locale === "en" ? "To configure" : "À configurer"} body={locale === "en" ? "Mobile Money or bank transfer." : "Mobile Money ou virement."} icon={CreditCard} />
          </section>
          <Panel kicker={locale === "en" ? "Payment method" : "Moyen de paiement"} title={locale === "en" ? "Settlement account" : "Compte de règlement"}>
            <PayoutAccountVerificationCard ownerRole="DELIVERY_ORGANIZATION" accent="#0891B2" />
          </Panel>
          <Panel kicker={locale === "en" ? "Reconciliation" : "Rapprochement"} title={locale === "en" ? "Settlement history" : "Historique des règlements"}>
            <EmptyState>
              {locale === "en"
                ? "No real settlement is connected yet. Future rows will show period, amount, payout method, status and transaction reference."
                : "Aucun règlement réel n'est encore connecté. Les lignes afficheront période, montant, moyen de paiement, statut et référence transaction."}
            </EmptyState>
          </Panel>
        </div>
      );
    }

    if (tab === "messages") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel kicker={ui.tabs.messages} title={locale === "en" ? "Conversation channels" : "Canaux de conversation"}>
              <div className="space-y-3">
                {[
                  [locale === "en" ? "BelivaY operations" : "Opérations BelivaY", locale === "en" ? "Contract, mission and incident coordination." : "Coordination contrat, mission et incident."],
                  [locale === "en" ? "Courier threads" : "Fils livreurs", locale === "en" ? "Messages linked to attached couriers." : "Messages liés aux livreurs rattachés."],
                  [locale === "en" ? "Incident notes" : "Notes incidents", locale === "en" ? "Notes attached to disputes and exceptions." : "Notes attachées aux litiges et exceptions."],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <div className="font-black text-slate-950 dark:text-white">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel kicker={locale === "en" ? "Composer" : "Composer"} title={locale === "en" ? "New message" : "Nouveau message"}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <MessageSquareText className="text-cyan-700 dark:text-cyan-300" />
                <input value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder={locale === "en" ? "Subject" : "Objet"} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder={locale === "en" ? "Describe the mission, incident or request" : "Décrivez la mission, l'incident ou la demande"} className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <button type="button" onClick={sendSupportMessage} disabled={actionBusy || supportSubject.trim().length < 3 || supportMessage.trim().length < 10} className="mt-3 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                  {locale === "en" ? "Send to support" : "Envoyer au support"}
                </button>
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (tab === "proofs" || tab === "parcels" || tab === "performance") {
      const configs: Array<[string, IconComponent, string]> = {
        parcels: [
          [locale === "en" ? "Pickup queue" : "File collecte", PackageSearch, locale === "en" ? "Vendor or relay pickup parcels." : "Colis à collecter chez vendeur ou point relais."],
          [locale === "en" ? "In transit" : "En transit", Truck, locale === "en" ? "Parcels currently moving through the network." : "Colis en mouvement dans le réseau."],
          [locale === "en" ? "Closed" : "Clôturés", CheckCircle2, locale === "en" ? "Delivered, returned or cancelled parcels." : "Colis livrés, retournés ou annulés."],
        ],
        proofs: [
          [locale === "en" ? "Pickup proof" : "Preuve collecte", ClipboardCheck, locale === "en" ? "Photo, scan or vendor OTP." : "Photo, scan ou OTP vendeur."],
          [locale === "en" ? "Delivery proof" : "Preuve remise", FileCheck2, locale === "en" ? "Signature, OTP or handoff photo." : "Signature, OTP ou photo de remise."],
          [locale === "en" ? "Review queue" : "File de revue", Search, locale === "en" ? "Proofs reviewed during disputes." : "Preuves examinées pendant les litiges."],
        ],
        performance: [
          [locale === "en" ? "Success rate" : "Taux réussite", BarChart3, locale === "en" ? "Completed missions compared with assigned missions." : "Missions terminées sur missions assignées."],
          [locale === "en" ? "SLA delays" : "Retards SLA", Clock3, locale === "en" ? "Late pickup or delivery by zone and courier." : "Retards collecte ou livraison par zone et livreur."],
          [locale === "en" ? "Proof quality" : "Qualité preuves", ShieldCheck, locale === "en" ? "Missing or rejected operational proofs." : "Preuves opérationnelles manquantes ou rejetées."],
        ],
      }[tab] as Array<[string, IconComponent, string]>;
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <section className="grid gap-4 md:grid-cols-3">
            {configs.map(([title, Icon, body]) => (
              <div key={title as string} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Icon className="text-cyan-700 dark:text-cyan-300" size={24} />
                <h3 className="mt-4 font-black text-slate-950 dark:text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</p>
                <StatusPill tone="slate">{locale === "en" ? "Waiting for data" : "En attente de données"}</StatusPill>
              </div>
            ))}
          </section>
          {tab === "parcels" ? (
            <Panel kicker={ui.tabs.parcels} title={locale === "en" ? "Operational parcel register" : "Registre opérationnel des colis"}>
              {missions.length === 0 ? <EmptyState>{locale === "en" ? "No active parcel in this organization." : "Aucun colis actif dans cette organisation."}</EmptyState> : <div className="space-y-3">{missions.map((mission) => (
                <div key={mission.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800 md:grid-cols-[.7fr_1fr_1fr_.7fr]">
                  <strong className="text-slate-950 dark:text-white">{mission.reference}</strong><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{mission.city} · {mission.delivery_address}</span><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{mission.courier?.full_name || "Non affecté"}</span><StatusPill>{missionStatusLabel(mission.status, mission.status_display, locale)}</StatusPill>
                </div>
              ))}</div>}
            </Panel>
          ) : tab === "proofs" ? (
            <Panel kicker={ui.tabs.proofs} title={locale === "en" ? "Captured operational evidence" : "Preuves opérationnelles enregistrées"}>
              {missions.filter((mission) => mission.last_event || mission.latest_location).length === 0 ? <EmptyState>{locale === "en" ? "No operational evidence captured yet." : "Aucune preuve opérationnelle enregistrée pour le moment."}</EmptyState> : <div className="space-y-3">{missions.filter((mission) => mission.last_event || mission.latest_location).map((mission) => (
                <div key={mission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"><div className="flex items-center justify-between gap-3"><strong className="text-slate-950 dark:text-white">{mission.reference}</strong><StatusPill tone={mission.latest_location ? "emerald" : "amber"}>{mission.location_history.length} points GPS</StatusPill></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{mission.last_event?.message || "Position GPS capturée"}</p></div>
              ))}</div>}
            </Panel>
          ) : (
            <Panel kicker={ui.tabs.performance} title={locale === "en" ? "30-day operational indicators" : "Indicateurs opérationnels sur 30 jours"}>
              <div className="grid gap-3 sm:grid-cols-3"><Field label={locale === "en" ? "Delivered" : "Livrées"} value={`${summary?.delivered_30d || 0}`} icon={CheckCircle2} /><Field label={locale === "en" ? "Failed" : "Échecs"} value={`${summary?.failed_30d || 0}`} icon={AlertTriangle} /><Field label={locale === "en" ? "GPS points" : "Points GPS"} value={`${summary?.tracked_locations_30d || 0}`} icon={Map} /></div>
            </Panel>
          )}
        </div>
      );
    }

    const operationalCards: Record<OrgTab, Array<[string, string, string, IconComponent]>> = {
      dashboard: [],
      contract: [],
      fleet: [],
      settings: [],
      missions: [
        [locale === "en" ? "Active" : "En cours", activeMissionsCount.toString(), locale === "en" ? "Missions assigned to this partner's couriers." : "Missions assignées aux livreurs de ce partenaire.", Truck],
        [locale === "en" ? "To dispatch" : "À affecter", missionQueue.length.toString(), locale === "en" ? "Compatible courier selection by zone, vehicle and capacity." : "Sélection livreur compatible par zone, moyen et capacité.", Route],
        [locale === "en" ? "Exceptions" : "Exceptions", missionQueue.filter((mission) => ["VEHICLE_INCOMPATIBLE", "CAPACITY_BLOCKED"].includes(mission.status)).length.toString(), locale === "en" ? "Failures, refusals and reassignment requests." : "Échecs, refus et demandes de réaffectation.", AlertTriangle],
      ],
      parcels: [
        [locale === "en" ? "Pickup queue" : "File collecte", ui.shell.notConnected, locale === "en" ? "Parcels waiting at vendors or relay points." : "Colis en attente chez vendeur ou point relais.", PackageSearch],
        [locale === "en" ? "In transit" : "En transit", ui.shell.notConnected, locale === "en" ? "Operational visibility without unnecessary customer data." : "Visibilité opérationnelle sans données client inutiles.", Truck],
        [locale === "en" ? "Closed" : "Clôturés", ui.shell.notConnected, locale === "en" ? "Delivered, returned or cancelled parcels." : "Colis livrés, retournés ou annulés.", CheckCircle2],
      ],
      zones: [
        [locale === "en" ? "Covered zones" : "Zones couvertes", organization.zones.length.toString(), locale === "en" ? "Declared in the organization profile." : "Déclarées dans le profil organisation.", Map],
        [locale === "en" ? "Capacity" : "Capacité", ui.shell.notConnected, locale === "en" ? "Capacity rules per zone and courier remain to connect." : "Capacités par zone et livreur à connecter.", Gauge],
        [locale === "en" ? "Blocked zones" : "Zones bloquées", ui.shell.notConnected, locale === "en" ? "Uncovered or saturated areas." : "Zones non couvertes ou saturées.", AlertTriangle],
      ],
      pricing: [
        [locale === "en" ? "Base grid" : "Grille de base", ui.shell.notConnected, locale === "en" ? "Price by zone, weight, volume and service level." : "Prix par zone, poids, volume et niveau de service.", CreditCard],
        ["SLA", ui.shell.notConnected, locale === "en" ? "Pickup and handoff commitments." : "Engagements de collecte et de remise.", Clock3],
        [locale === "en" ? "Approval queue" : "Validation BelivaY", ui.shell.notConnected, locale === "en" ? "Cases requiring marketplace decision." : "Cas nécessitant une décision marketplace.", ShieldCheck],
      ],
      proofs: [
        [locale === "en" ? "Pickup proof" : "Preuve collecte", ui.shell.notConnected, locale === "en" ? "Vendor pickup photo, scan or OTP." : "Photo, scan ou OTP à la collecte vendeur.", ClipboardCheck],
        [locale === "en" ? "Delivery proof" : "Preuve remise", ui.shell.notConnected, locale === "en" ? "Customer signature, OTP or delivery photo." : "Signature, OTP ou photo de remise client.", FileCheck2],
        [locale === "en" ? "Review queue" : "File de revue", ui.shell.notConnected, locale === "en" ? "Proofs useful during disputes." : "Preuves utiles pendant les litiges.", Search],
      ],
      disputes: [
        [locale === "en" ? "Open cases" : "Dossiers ouverts", openDisputesCount.toString(), locale === "en" ? "Incidents tied to organization missions." : "Incidents liés aux missions de l'organisation.", AlertTriangle],
        [locale === "en" ? "Evidence" : "Preuves", ui.shell.notConnected, locale === "en" ? "Courier notes and operational proofs." : "Notes livreur et preuves opérationnelles.", FileText],
        [locale === "en" ? "Decision" : "Décision", ui.shell.notConnected, locale === "en" ? "BelivaY resolution and penalties if applicable." : "Résolution BelivaY et pénalités si applicable.", ShieldCheck],
      ],
      performance: [
        [locale === "en" ? "Success rate" : "Taux réussite", ui.shell.notConnected, locale === "en" ? "Completed missions divided by assigned missions." : "Missions terminées sur missions assignées.", BarChart3],
        [locale === "en" ? "Late rate" : "Retards", ui.shell.notConnected, locale === "en" ? "SLA breaches by zone and courier." : "Dépassements SLA par zone et livreur.", Clock3],
        [locale === "en" ? "Proof quality" : "Qualité preuves", ui.shell.notConnected, locale === "en" ? "Missing or rejected proofs." : "Preuves manquantes ou rejetées.", ClipboardCheck],
      ],
      payments: [
        [locale === "en" ? "To settle" : "À régler", ui.shell.notConnected, locale === "en" ? "Validated missions pending payout." : "Missions validées en attente de paiement.", WalletCards],
        [locale === "en" ? "Paid" : "Payé", ui.shell.notConnected, locale === "en" ? "Closed settlements by period." : "Règlements clôturés par période.", CheckCircle2],
        [locale === "en" ? "Reconciliation" : "Rapprochement", ui.shell.notConnected, locale === "en" ? "Mobile Money or bank transfer control." : "Contrôle Mobile Money ou virement.", CreditCard],
      ],
      messages: [
        [locale === "en" ? "BelivaY channel" : "Canal BelivaY", ui.shell.notConnected, locale === "en" ? "Operational conversation with marketplace team." : "Conversation opérationnelle avec l'équipe marketplace.", MessageSquareText],
        [locale === "en" ? "Courier threads" : "Fils livreurs", ui.shell.notConnected, locale === "en" ? "Conversations related to attached couriers." : "Conversations liées aux livreurs rattachés.", Users],
        [locale === "en" ? "Incident notes" : "Notes incidents", ui.shell.notConnected, locale === "en" ? "Messages attached to missions and disputes." : "Messages liés aux missions et litiges.", AlertTriangle],
      ],
    };

    return (
      <div className="space-y-5">
        {renderSectionIntro()}
        <section className="hidden gap-4 sm:grid sm:grid-cols-3">
          {operationalCards[tab].map(([title, value, body, Icon]) => (
            <WorkCard key={title} title={title} value={value} body={body} icon={Icon} />
          ))}
        </section>
        {tab === "missions" ? renderMissions() : tab === "disputes" ? renderDisputes() : tab === "zones" ? (
          <Panel kicker={ui.tabs.zones} title={locale === "en" ? "Declared coverage" : "Couverture déclarée"}>
            <div className="flex flex-wrap gap-2">
              {coveredZones.map((zone) => (
                <span key={zone} className="rounded-full bg-cyan-100 px-3 py-2 text-sm font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100">{zone}</span>
              ))}
            </div>
          </Panel>
        ) : (
          <EmptyState>{active.empty}</EmptyState>
        )}
      </div>
    );
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      http<OrganizationCourier[]>("/api/auth/delivery-organization/couriers/"),
      http<OrganizationVehicle[]>("/api/auth/delivery-organization/vehicles/"),
      http<ComplianceDocument[]>("/api/auth/compliance-documents/"),
    ])
      .then(([items, vehicleItems, documentItems]) => {
        if (alive) {
          setCouriers(items);
          setVehicles(vehicleItems);
          setComplianceDocuments(documentItems);
        }
      })
      .catch(() => {
        if (alive) {
          setCouriers([]);
          setVehicles([]);
        }
      })
      .finally(() => {
        if (alive) setCouriersLoading(false);
      });
    const loadOperations = () => Promise.all([
        http<OrganizationSummary>("/api/auth/delivery-organization/summary/"),
        http<OrganizationMission[]>("/api/auth/delivery-organization/missions/active/"),
        http<OrganizationMission[]>("/api/auth/delivery-organization/missions/queue/"),
        http<OrganizationDispute[]>("/api/auth/delivery-organization/disputes/open/"),
      ])
        .then(([summaryData, missionItems, queueItems, disputeItems]) => {
          if (!alive) return;
          setSummary(summaryData);
          setMissions(missionItems);
          setMissionQueue(queueItems);
          setDisputes(disputeItems);
        })
        .catch(() => {
          if (!alive) return;
          setSummary(null);
          setMissions([]);
          setMissionQueue([]);
          setDisputes([]);
        })
        .finally(() => {
          if (alive) setOperationsLoading(false);
        });
    void loadOperations();
    const operationsInterval = window.setInterval(loadOperations, 5000);

    return () => {
      alive = false;
      window.clearInterval(operationsInterval);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex">
        <aside className="hidden min-h-screen w-[278px] flex-shrink-0 bg-[linear-gradient(185deg,#083344,#0E7490_58%,#155E75)] p-4 text-white lg:block">
          {renderBrandBlock()}

          <div className="mb-5 rounded-2xl border border-white/10 bg-white/8 p-4">
            <div className="font-black">{organization.name}</div>
            <div className="mt-1 text-xs text-cyan-100/70">{organization.manager} · {organization.city}</div>
            <div className="mt-1 text-xs text-cyan-100/55">{organization.contract}</div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <span className="text-cyan-100/70">{ui.shell.status}</span>
              <strong>{operationalStatus}</strong>
            </div>
          </div>

          <nav className="space-y-4">
            {Object.entries(menu).map(([group, items]) => (
              <div key={group}>
                <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/40">{ui.groups[group as keyof typeof ui.groups]}</div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === tab;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                          isActive ? "bg-white/18 text-white" : "text-cyan-50/75 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={17} />
                        <span className="min-w-0 flex-1 truncate">{ui.tabs[item.id]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{ui.shell.space}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">{active.title}</h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="relative hidden sm:block">
                  <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  aria-expanded={profileMenuOpen}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <UserCircle size={17} />}
                  <span className="max-w-[150px] truncate">{user?.username || organization.manager}</span>
                </button>
                  {profileMenuOpen ? (
                    <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,.16)] dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
                        <div>
                          <div className="font-black text-slate-950 dark:text-white">{user?.username}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{organization.name}</div>
                        </div>
                        <button type="button" onClick={() => setProfileMenuOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title={ui.shell.close}>
                          <X size={15} />
                        </button>
                      </div>
                      <button type="button" onClick={() => { setProfileMenuOpen(false); navigate("/profile"); }} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                        <UserCircle size={16} />
                        {ui.shell.openProfile}
                      </button>
                      <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <LogOut size={16} />
                        {ui.shell.logout}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button type="button" onClick={switchLanguage} className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <Languages size={15} className="mr-1" />
                  {locale === "fr" ? "FR" : "EN"}
                </button>
                <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button type="button" onClick={handleLogout} title={ui.shell.logout} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100">
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </header>

          <div className="block border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`inline-flex flex-shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
                      tab === item.id
                        ? "border-cyan-700 bg-cyan-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <Icon size={14} />
                    {ui.tabs[item.id]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <EvidenceRequestInbox accent="#0891B2" />
            {renderMobileBrief()}
            {organizationMessage ? (
              <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${organizationMessage.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span>{organizationMessage.text}</span>
                <button type="button" onClick={() => setOrganizationMessage(null)} className="rounded-lg p-1 hover:bg-black/5" title={ui.shell.close}><X size={16} /></button>
              </div>
            ) : null}
            {renderModuleContent()}
          </div>
        </section>
      </div>
      {avatarFile ? (
        <AvatarCropDialog
          file={avatarFile}
          accent="#0891B2"
          onClose={() => setAvatarFile(null)}
          onUploaded={(updatedUser) => {
            setAvatarUrl(updatedUser.avatar_url || "");
            setAvatarFile(null);
            setOrganizationMessage({ tone: "success", text: locale === "en" ? "Profile photo updated." : "Photo de profil mise à jour." });
          }}
        />
      ) : null}
    </main>
  );
}
