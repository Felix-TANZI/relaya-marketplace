import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Capacitor } from "@capacitor/core";
import EvidenceRequestInbox from "@/components/disputes/EvidenceRequestInbox";
import AppDownloadBanner from "@/components/AppDownloadBanner";
import {
  AlertTriangle,
  BarChart3,
  Building2,
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
  Menu as MenuIcon,
  MessageSquareText,
  Moon,
  PackageSearch,
  Route,
  Search,
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
import DeliverySettlementsPanel from "./DeliverySettlementsPanel";
import TrackingMap from "@/components/TrackingMap";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import type { LocationPrecisionResult } from "@/services/api/location";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import {
  ORG_NAV_ITEMS,
  ORG_TABS,
  type OrgTab,
} from "./deliveryNav";
import DeliverySidebar from "./DeliverySidebar";
import DeliveryDrawer from "./DeliveryDrawer";
import DeliveryMobileNav, { DELIVERY_TABBAR_IDS } from "./DeliveryMobileNav";
import DeliveryProfileSheet, {
  DeliverySettingsContent,
  type DeliverySettingsProps,
} from "./DeliveryProfileSheet";

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

interface BourseTournee {
  id: number;
  zone: string;
  city: string;
  slot_date: string;
  period: "MORNING" | "AFTERNOON";
  colis_count: number;
  is_forced_exit: boolean;
  composed_at: string;
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

/**
 * Cle de traduction par onglet : les libelles capabilities sont resolus via
 * `t()` au rendu (dans le composant), jamais au niveau module — sinon ils ne
 * suivraient pas un changement de langue en direct.
 */
const CAPABILITY_KEYS: Record<OrgTab, { titleKey: string; descriptionKey: string; emptyKey: string; methodKeys: string[] }> = {
  dashboard: {
    titleKey: "do1_page.capabilities.dashboard.title",
    descriptionKey: "do1_page.capabilities.dashboard.description",
    emptyKey: "do1_page.capabilities.dashboard.empty",
    methodKeys: ["do1_page.capabilities.dashboard.method_1", "do1_page.capabilities.dashboard.method_2", "do1_page.capabilities.dashboard.method_3"],
  },
  contract: {
    titleKey: "do1_page.capabilities.contract.title",
    descriptionKey: "do1_page.capabilities.contract.description",
    emptyKey: "do1_page.capabilities.contract.empty",
    methodKeys: ["do1_page.capabilities.contract.method_1", "do1_page.capabilities.contract.method_2", "do1_page.capabilities.contract.method_3"],
  },
  fleet: {
    titleKey: "do1_page.capabilities.fleet.title",
    descriptionKey: "do1_page.capabilities.fleet.description",
    emptyKey: "do1_page.capabilities.fleet.empty",
    methodKeys: ["do1_page.capabilities.fleet.method_1", "do1_page.capabilities.fleet.method_2", "do1_page.capabilities.fleet.method_3"],
  },
  missions: {
    titleKey: "do1_page.capabilities.missions.title",
    descriptionKey: "do1_page.capabilities.missions.description",
    emptyKey: "do1_page.capabilities.missions.empty",
    methodKeys: ["do1_page.capabilities.missions.method_1", "do1_page.capabilities.missions.method_2", "do1_page.capabilities.missions.method_3"],
  },
  parcels: {
    titleKey: "do1_page.capabilities.parcels.title",
    descriptionKey: "do1_page.capabilities.parcels.description",
    emptyKey: "do1_page.capabilities.parcels.empty",
    methodKeys: ["do1_page.capabilities.parcels.method_1", "do1_page.capabilities.parcels.method_2", "do1_page.capabilities.parcels.method_3"],
  },
  zones: {
    titleKey: "do1_page.capabilities.zones.title",
    descriptionKey: "do1_page.capabilities.zones.description",
    emptyKey: "do1_page.capabilities.zones.empty",
    methodKeys: ["do1_page.capabilities.zones.method_1", "do1_page.capabilities.zones.method_2", "do1_page.capabilities.zones.method_3"],
  },
  pricing: {
    titleKey: "do1_page.capabilities.pricing.title",
    descriptionKey: "do1_page.capabilities.pricing.description",
    emptyKey: "do1_page.capabilities.pricing.empty",
    methodKeys: ["do1_page.capabilities.pricing.method_1", "do1_page.capabilities.pricing.method_2", "do1_page.capabilities.pricing.method_3"],
  },
  proofs: {
    titleKey: "do1_page.capabilities.proofs.title",
    descriptionKey: "do1_page.capabilities.proofs.description",
    emptyKey: "do1_page.capabilities.proofs.empty",
    methodKeys: ["do1_page.capabilities.proofs.method_1", "do1_page.capabilities.proofs.method_2", "do1_page.capabilities.proofs.method_3"],
  },
  disputes: {
    titleKey: "do1_page.capabilities.disputes.title",
    descriptionKey: "do1_page.capabilities.disputes.description",
    emptyKey: "do1_page.capabilities.disputes.empty",
    methodKeys: ["do1_page.capabilities.disputes.method_1", "do1_page.capabilities.disputes.method_2", "do1_page.capabilities.disputes.method_3"],
  },
  performance: {
    titleKey: "do1_page.capabilities.performance.title",
    descriptionKey: "do1_page.capabilities.performance.description",
    emptyKey: "do1_page.capabilities.performance.empty",
    methodKeys: ["do1_page.capabilities.performance.method_1", "do1_page.capabilities.performance.method_2", "do1_page.capabilities.performance.method_3"],
  },
  payments: {
    titleKey: "do1_page.capabilities.payments.title",
    descriptionKey: "do1_page.capabilities.payments.description",
    emptyKey: "do1_page.capabilities.payments.empty",
    methodKeys: ["do1_page.capabilities.payments.method_1", "do1_page.capabilities.payments.method_2", "do1_page.capabilities.payments.method_3"],
  },
  messages: {
    titleKey: "do1_page.capabilities.messages.title",
    descriptionKey: "do1_page.capabilities.messages.description",
    emptyKey: "do1_page.capabilities.messages.empty",
    methodKeys: ["do1_page.capabilities.messages.method_1", "do1_page.capabilities.messages.method_2", "do1_page.capabilities.messages.method_3"],
  },
  settings: {
    titleKey: "do1_page.capabilities.settings.title",
    descriptionKey: "do1_page.capabilities.settings.description",
    emptyKey: "do1_page.capabilities.settings.empty",
    methodKeys: ["do1_page.capabilities.settings.method_1", "do1_page.capabilities.settings.method_2", "do1_page.capabilities.settings.method_3"],
  },
};

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

function vehicleLabel(value: string | undefined, t: TFunction) {
  const keys: Record<string, string> = {
    MOTORBIKE: "do1_page.common.vehicle_types.motorbike",
    CAR: "do1_page.common.vehicle_types.car",
    VAN: "do1_page.common.vehicle_types.van",
    TRUCK: "do1_page.common.vehicle_types.truck",
    BICYCLE: "do1_page.common.vehicle_types.bicycle",
  };
  const key = keys[value || ""];
  return key ? t(key) : value || "-";
}

const MISSION_STATUS_KEYS: Record<string, string> = {
  ASSIGNED: "do1_page.common.mission_status.assigned",
  PICKED_UP: "do1_page.common.mission_status.picked_up",
  IN_TRANSIT: "do1_page.common.mission_status.in_transit",
  OUT_FOR_DELIVERY: "do1_page.common.mission_status.out_for_delivery",
  DELIVERED: "do1_page.common.mission_status.delivered",
  FAILED: "do1_page.common.mission_status.failed",
  RETURNED: "do1_page.common.mission_status.returned",
  VALUE_LIMIT_EXCEEDED: "do1_page.common.mission_status.value_limit_exceeded",
};

function missionStatusLabel(status: string, fallback: string, t: TFunction) {
  const key = MISSION_STATUS_KEYS[status];
  return key ? t(key) : fallback;
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

function PrecisionHint({ precision }: { precision?: Partial<LocationPrecisionResult> }) {
  const { t } = useTranslation();
  if (!precision || typeof precision.precisionScore !== "number") return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <StatusPill tone={precisionTone(precision.precisionScore)}>
        {t("do1_page.common.precision_label")} {precision.precisionScore}/100
      </StatusPill>
      {precision.driverHint ? (
        <span className="text-xs font-semibold text-slate-500">{precision.driverHint}</span>
      ) : null}
    </div>
  );
}

export default function DeliveryOrganizationPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<OrgTab>(getInitialOrgTab);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [couriers, setCouriers] = useState<OrganizationCourier[]>([]);
  const [summary, setSummary] = useState<OrganizationSummary | null>(null);
  const [missions, setMissions] = useState<OrganizationMission[]>([]);
  const [missionQueue, setMissionQueue] = useState<OrganizationMission[]>([]);
  const [bourseTournees, setBourseTournees] = useState<BourseTournee[]>([]);
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
  const locale = i18n.language.startsWith("en") ? "en" : "fr";
  const orgProfile = user?.delivery_organization_profile;
  const tabLabels: Record<OrgTab, string> = {
    dashboard: t("do1_page.tabs.dashboard"),
    contract: t("do1_page.tabs.contract"),
    fleet: t("do1_page.tabs.fleet"),
    missions: t("do1_page.tabs.missions"),
    parcels: t("do1_page.tabs.parcels"),
    zones: t("do1_page.tabs.zones"),
    pricing: t("do1_page.tabs.pricing"),
    proofs: t("do1_page.tabs.proofs"),
    disputes: t("do1_page.tabs.disputes"),
    performance: t("do1_page.tabs.performance"),
    payments: t("do1_page.tabs.payments"),
    messages: t("do1_page.tabs.messages"),
    settings: t("do1_page.tabs.settings"),
  };
  const groupLabels = {
    pilotage: t("do1_page.groups.pilotage"),
    company: t("do1_page.groups.company"),
    operations: t("do1_page.groups.operations"),
    quality: t("do1_page.groups.quality"),
    finance: t("do1_page.groups.finance"),
    support: t("do1_page.groups.support"),
  };
  const footerLines = [t("do1_page.footer.line1"), t("do1_page.footer.line2"), t("do1_page.footer.line3")];
  const activeCapabilityKeys = CAPABILITY_KEYS[tab];
  const active = {
    title: t(activeCapabilityKeys.titleKey),
    description: t(activeCapabilityKeys.descriptionKey),
    empty: t(activeCapabilityKeys.emptyKey),
    methods: activeCapabilityKeys.methodKeys.map((key) => t(key)),
  };

  useEffect(() => {
    setAvatarUrl(user?.avatar_url || "");
  }, [user?.avatar_url]);

  const organization = {
    name: orgProfile?.company_name || t("do1_page.shell.brand"),
    manager: orgProfile?.manager_name || user?.first_name || user?.username || t("do1_page.common.manager_fallback"),
    city: orgProfile?.city || t("do1_page.common.city_to_define"),
    phone: orgProfile?.phone || t("do1_page.common.phone_to_complete"),
    zones: orgProfile?.zones || [],
    address: orgProfile?.address || t("do1_page.common.address_to_complete"),
    contract: orgProfile?.contract_reference || t("do1_page.common.contract_to_define"),
    status: orgProfile?.status === "APPROVED" ? t("do1_page.common.status_approved") : orgProfile?.status === "SUSPENDED" ? t("do1_page.common.status_suspended") : t("do1_page.common.status_pending"),
  };

  const switchLanguage = () => i18n.changeLanguage(i18n.language.startsWith("fr") ? "en" : "fr");
  const changeLanguage = (next: "fr" | "en") => void i18n.changeLanguage(next);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const showOrganizationError = (message: string) => setOrganizationMessage({ tone: "error", text: message });
  const showOrganizationSuccess = (message: string) => setOrganizationMessage({ tone: "success", text: message });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.courier_availability_updated") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.vehicle_added") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.vehicle_assignment_updated") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.dispute_reply_added") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.zones_saved") });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.courier_attached") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.support_message_sent") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.document_uploaded") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
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
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.mission_assigned") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
    } finally {
      setActionBusy(false);
    }
  };
  const claimTournee = async (tourneeId: number) => {
    setActionBusy(true);
    setOrganizationMessage(null);
    try {
      await http(`/api/auth/delivery-organization/bourse/${tourneeId}/claim/`, { method: "POST" });
      const [activeItems, bourseItems, summaryData] = await Promise.all([
        http<OrganizationMission[]>("/api/auth/delivery-organization/missions/active/"),
        http<BourseTournee[]>("/api/auth/delivery-organization/bourse/"),
        http<OrganizationSummary>("/api/auth/delivery-organization/summary/"),
      ]);
      setMissions(activeItems); setBourseTournees(bourseItems); setSummary(summaryData);
      setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.package_claimed") });
    } catch (error) {
      setOrganizationMessage({ tone: "error", text: error instanceof Error ? error.message : t("do1_page.common.action_impossible") });
      // Un autre transporteur a peut-être déjà revendiqué ce paquet : on rafraîchit la liste.
      http<BourseTournee[]>("/api/auth/delivery-organization/bourse/").then(setBourseTournees).catch(() => undefined);
    } finally {
      setActionBusy(false);
    }
  };
  const tabIcon = ORG_NAV_ITEMS.find((item) => item.id === tab)?.icon ?? Gauge;
  const ActiveIcon = tabIcon;
  const displayZones = normalizeCoverageZones(organization.zones, organization.city);
  const coveredZones = displayZones.length ? displayZones : [t("do1_page.common.no_covered_zone")];
  const approvedCouriers = summary?.couriers_approved ?? couriers.filter((courier) => courier.is_approved).length;
  const onlineCouriers = summary?.couriers_online ?? couriers.filter((courier) => courier.is_online).length;
  const activeMissionsCount = summary?.active_missions ?? missions.length;
  const openDisputesCount = summary?.open_disputes ?? disputes.length;

  /**
   * Alertes portees par le menu, dans l'ordre ou un dispatcher les traite :
   * missions a affecter, livreurs en attente d'approbation, litiges ouverts.
   */
  const navBadges = useMemo<Partial<Record<OrgTab, number>>>(
    () => ({
      missions: missionQueue.length,
      fleet: couriers.filter((courier) => !courier.is_approved).length,
      disputes: openDisputesCount,
    }),
    [couriers, missionQueue.length, openDisputesCount],
  );

  /**
   * Alertes des destinations absentes de la barre du bas. Elles remontent sur
   * l'icone de menu du bandeau : sans ce report, un litige ouvert resterait
   * invisible sur telephone tant que le tiroir n'est pas ouvert.
   */
  const hiddenBadgeTotal = useMemo(
    () =>
      Object.entries(navBadges).reduce(
        (total, [id, count]) => (DELIVERY_TABBAR_IDS.includes(id as OrgTab) ? total : total + (count || 0)),
        0,
      ),
    [navBadges],
  );

  const assignedMissions = missions.filter((mission) => mission.status === "ASSIGNED").length;
  const pickedUpMissions = missions.filter((mission) => ["PICKED_UP", "IN_TRANSIT"].includes(mission.status)).length;
  const outForDeliveryMissions = missions.filter((mission) => mission.status === "OUT_FOR_DELIVERY").length;
  const isOrgApproved = orgProfile?.status === "APPROVED";
  const isOrgSuspended = orgProfile?.status === "SUSPENDED";
  const hasContract = Boolean(orgProfile?.contract_reference?.trim());
  const hasAgencyAddress = Boolean(orgProfile?.address?.trim());
  const hasZones = organization.zones.length > 0;
  const hasFleet = approvedCouriers > 0;
  // Le statut d'exploitation pilote a la fois le libelle affiche et la teinte
  // du badge : on garde un identifiant stable (`operationalStatusKind`) pour la
  // teinte, plutot que de comparer le texte traduit qui varie selon la langue.
  const operationalStatusKind: "suspended" | "ready" | "configuring" = isOrgSuspended
    ? "suspended"
    : isOrgApproved && hasContract && hasAgencyAddress && hasZones && hasFleet
      ? "ready"
      : "configuring";
  const operationalStatus = t(
    operationalStatusKind === "suspended"
      ? "do1_page.common.status_suspended"
      : operationalStatusKind === "ready"
        ? "do1_page.common.status_operational"
        : "do1_page.common.status_configuring",
  );
  const operationalTone = operationalStatusKind === "suspended" ? "red" : operationalStatusKind === "ready" ? "emerald" : "amber";

  /**
   * Reglages partages par la feuille ouverte depuis l'avatar et par l'onglet
   * « Parametres » : un seul objet, donc aucune derive possible entre les deux
   * points d'entree.
   */
  const settingsProps: DeliverySettingsProps = {
    locale,
    theme,
    onToggleTheme: toggleTheme,
    onChangeLanguage: changeLanguage,
    organization: {
      name: organization.name,
      manager: organization.manager,
      city: organization.city,
      address: organization.address,
      phone: organization.phone,
      contract: organization.contract,
      status: operationalStatus,
      memberSince: orgProfile?.created_at || null,
      zones: displayZones,
      fleetSummary: `${approvedCouriers}/${couriers.length}`,
    },
    username: user?.username || organization.manager,
    email: user?.email || "",
    avatarUrl: avatarUrl || undefined,
    onAvatarFile: setAvatarFile,
    onLogout: handleLogout,
    onNavigate: (next) => {
      setProfileSheetOpen(false);
      setTab(next);
    },
    onError: showOrganizationError,
    onSuccess: showOrganizationSuccess,
    footer: footerLines,
  };
  const activationSteps = [
    [t("do1_page.contract.step_belivay_validation"), isOrgApproved, organization.status],
    [t("do1_page.contract.contract_reference"), hasContract, organization.contract],
    [t("do1_page.contract.kyc_coverage_label"), hasZones, hasZones ? displayZones.join(", ") : t("do1_page.contract.to_declare")],
    [t("do1_page.contract.step_agency_address"), hasAgencyAddress, organization.address],
    [t("do1_page.contract.step_approved_couriers"), hasFleet, `${approvedCouriers}/${couriers.length}`],
  ] as const;
  const kycItems = [
    [t("do1_page.contract.kyc_company_record_label"), isOrgApproved ? "ok" : "to_send", t("do1_page.contract.kyc_company_record_body")],
    [t("do1_page.contract.kyc_manager_id_label"), isOrgApproved ? "ok" : "to_send", t("do1_page.contract.kyc_manager_id_body")],
    [t("do1_page.contract.contract_reference"), hasContract ? "ready" : "missing", t("do1_page.contract.kyc_contract_body")],
    [t("do1_page.contract.kyc_coverage_label"), hasZones ? "ready" : "missing", hasZones ? displayZones.join(", ") : t("do1_page.contract.kyc_coverage_body_declared")],
    [t("do1_page.contract.kyc_payment_label"), "to_connect", t("do1_page.contract.kyc_payment_body")],
  ] as const;
  const kycStatusLabel = (kind: string) =>
    kind === "ok" || kind === "ready"
      ? kind === "ok"
        ? t("do1_page.contract.kyc_verified")
        : t("do1_page.contract.kyc_ready")
      : kind === "to_send"
        ? t("do1_page.contract.kyc_to_send")
        : kind === "missing"
          ? t("do1_page.contract.kyc_missing")
          : t("do1_page.contract.kyc_to_connect");
  const kycStatusTone = (kind: string): "emerald" | "slate" | "amber" =>
    kind === "ok" || kind === "ready" ? "emerald" : kind === "to_connect" ? "slate" : "amber";

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

  const WorkCard = ({ title, value, body, icon: Icon }: { title: string; value: string; body: string; icon: IconComponent }) => (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
        </div>
        {/* Pastille reduite sur telephone : a deux cartes par rangee, la
            version 44px poussait la valeur sur deux lignes. */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200 sm:h-11 sm:w-11 sm:rounded-2xl">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <p className="mt-3 hidden text-sm leading-6 text-slate-600 dark:text-slate-300 sm:block">{body}</p>
    </article>
  );

  const renderSectionIntro = () => (
    <Panel kicker={tabLabels[tab]} title={active.title}>
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
      kicker={tabLabels.fleet}
      title={t("do1_page.fleet.title")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
        <p className="max-w-2xl text-sm font-semibold leading-6 text-cyan-950 dark:text-cyan-100">
          {t("do1_page.fleet.banner_description")}
        </p>
        <button type="button" onClick={() => setShowAttachCourier((visible) => !visible)} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white">
          {t("do1_page.fleet.add_courier_button")}
        </button>
      </div>
      {showAttachCourier ? (
        <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-cyan-200 bg-white p-4 dark:border-cyan-800 dark:bg-slate-900 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{t("do1_page.fleet.existing_courier_label")}<input value={courierUsernameInput} onChange={(event) => setCourierUsernameInput(event.target.value)} placeholder="livreur_mvan" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
          <button type="button" onClick={attachCourier} disabled={actionBusy || !courierUsernameInput.trim()} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{t("do1_page.fleet.attach_button")}</button>
        </div>
      ) : null}
      {couriers.length === 0 ? (
        <EmptyState>
          {couriersLoading ? t("do1_page.fleet.loading") : t("do1_page.fleet.empty")}
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
              originLabel={missions[0].courier?.full_name || t("do1_page.fleet.map_assigned_courier")}
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
                ? `${t("do1_page.fleet.last_gps_update")}: ${new Date(missions[0].latest_location.captured_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR")}`
                : t("do1_page.fleet.waiting_gps")}</span>
              <span>{missions[0].location_history.length} {t("do1_page.fleet.captured_points")}</span>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 p-5 text-sm font-semibold text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-100">
            {t("do1_page.fleet.no_active_mission_map")}
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
                <StatusPill tone={courier.is_online ? "emerald" : "slate"}>{courier.is_online ? t("do1_page.common.online") : t("do1_page.common.offline")}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2">
                <Field label={t("do1_page.common.assigned_vehicle")} value={vehicleLabel(courier.vehicle_type, t)} icon={Truck} />
                <Field label={t("do1_page.common.city")} value={courier.city || "-"} icon={Map} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(courier.zones.length ? normalizeCoverageZones(courier.zones, courier.city || organization.city) : ["-"]).map((zone) => (
                  <span key={zone} className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{zone}</span>
                ))}
              </div>
              <select disabled={actionBusy} value={courier.availability_status || "AVAILABLE"} onChange={(event) => void updateCourierAvailability(courier.id, event.target.value as OrganizationCourier["availability_status"])} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                <option value="AVAILABLE">{t("do1_page.common.availability.available")}</option><option value="ABSENT">{t("do1_page.common.availability.absent")}</option><option value="LEAVE">{t("do1_page.common.availability.leave")}</option><option value="SUSPENDED">{t("do1_page.common.availability.suspended")}</option>
              </select>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70">
              <span>{t("do1_page.common.courier")}</span>
              <span>{t("do1_page.common.assigned_vehicle")}</span>
              <span>{t("do1_page.common.zones")}</span>
              <span>{t("do1_page.common.status")}</span>
            </div>
            {couriers.map((courier) => (
              <div key={courier.id} className="grid grid-cols-[1.2fr_.8fr_.8fr_.8fr] gap-3 border-t border-slate-100 px-4 py-4 text-sm dark:border-slate-800">
                <div>
                  <div className="font-black text-slate-950 dark:text-white">{courier.full_name || courier.username}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">@{courier.username} · {courier.phone || courier.email}</div>
                </div>
                <div className="font-bold text-slate-700 dark:text-slate-200">{vehicleLabel(courier.vehicle_type, t)}</div>
                <div className="flex flex-wrap gap-1">
                  {(courier.zones.length ? normalizeCoverageZones(courier.zones, courier.city || organization.city) : ["-"]).slice(0, 3).map((zone) => (
                    <span key={zone} className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-bold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{zone}</span>
                  ))}
                </div>
                <div className="space-y-2">
                  <StatusPill tone={courier.availability_status === "AVAILABLE" ? "emerald" : "amber"}>{courier.availability_status || "AVAILABLE"}</StatusPill>
                  <select disabled={actionBusy} value={courier.availability_status || "AVAILABLE"} onChange={(event) => void updateCourierAvailability(courier.id, event.target.value as OrganizationCourier["availability_status"])} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <option value="AVAILABLE">{t("do1_page.common.availability.available")}</option><option value="ABSENT">{t("do1_page.common.availability.absent")}</option><option value="LEAVE">{t("do1_page.common.availability.leave")}</option><option value="SUSPENDED">{t("do1_page.common.availability.suspended")}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 hidden gap-3 md:grid md:grid-cols-4">
          {[
            [t("do1_page.fleet.cards.approve_suspend.title"), t("do1_page.fleet.cards.approve_suspend.body")],
            [t("do1_page.fleet.cards.absence_leave.title"), t("do1_page.fleet.cards.absence_leave.body")],
            [t("do1_page.fleet.cards.reassign_vehicle.title"), t("do1_page.fleet.cards.reassign_vehicle.body")],
            [t("do1_page.fleet.cards.assign_zones.title"), t("do1_page.fleet.cards.assign_zones.body")],
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
    <Panel kicker={t("do1_page.missions.bourse_kicker")} title={t("do1_page.missions.bourse_title")}>
      {bourseTournees.length === 0 ? (
        <EmptyState>{t("do1_page.missions.bourse_empty")}</EmptyState>
      ) : (
        <div className="space-y-3">
          {bourseTournees.map((tournee) => (
            <div key={tournee.id} className="grid gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30 md:grid-cols-[1fr_1fr_auto] md:items-center">
              <div>
                <strong className="text-cyan-950 dark:text-cyan-100">{tournee.zone} · {tournee.city}</strong>
                <p className="mt-1 text-xs text-cyan-900/70 dark:text-cyan-200/70">
                  {tournee.colis_count} {t("do1_page.missions.packages_label")} · {tournee.period === "MORNING" ? t("do1_page.missions.morning_slot") : t("do1_page.missions.afternoon_slot")}
                </p>
              </div>
              <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                {new Date(tournee.slot_date).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")}
              </div>
              <button type="button" onClick={() => void claimTournee(tournee.id)} disabled={actionBusy} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                {t("do1_page.missions.claim_button")}
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
    <Panel kicker={t("do1_page.missions.dispatch_kicker")} title={t("do1_page.missions.dispatch_title")}>
      {missionQueue.length === 0 ? <EmptyState>{t("do1_page.missions.dispatch_empty")}</EmptyState> : <div className="space-y-3">{missionQueue.map((mission) => (
        <div key={mission.id} className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 md:grid-cols-[1fr_1.3fr_1fr_auto] md:items-center">
          <div><strong className="text-amber-950 dark:text-amber-100">{mission.reference}</strong><p className="mt-1 text-xs text-amber-900/70">{missionStatusLabel(mission.status, mission.status_display, t)} · {mission.order_total_xaf.toLocaleString("fr-FR")} FCFA</p></div>
          <div>
            <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">{mission.city} · {mission.delivery_address}</div>
            <PrecisionHint precision={mission.address_precision} />
          </div>
          <select value={missionAssignments[mission.id] || ""} onChange={(event) => setMissionAssignments((current) => ({ ...current, [mission.id]: event.target.value }))} className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 dark:bg-slate-900 dark:text-white"><option value="">{t("do1_page.missions.choose_courier")}</option>{couriers.filter((courier) => courier.is_approved && courier.is_active && courier.availability_status === "AVAILABLE" && courier.assigned_vehicle).map((courier) => <option key={courier.id} value={courier.id}>{courier.full_name} · {courier.assigned_vehicle?.label}</option>)}</select>
          <button type="button" onClick={() => void assignMission(mission.id)} disabled={actionBusy || !missionAssignments[mission.id]} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{t("do1_page.missions.assign_button")}</button>
        </div>
      ))}</div>}
    </Panel>
    <Panel kicker={tabLabels.missions} title={t("do1_page.missions.active_title")}>
      {missions.length === 0 ? (
        <EmptyState>
          {operationsLoading ? t("do1_page.missions.active_loading") : t("do1_page.missions.active_empty")}
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
                  <PrecisionHint precision={mission.address_precision} />
                </div>
                <StatusPill>{missionStatusLabel(mission.status, mission.status_display, t)}</StatusPill>
              </div>
              <div className="mt-4 grid gap-2">
                <Field label={t("do1_page.common.courier")} value={mission.courier?.full_name || "-"} icon={Users} />
                <Field label={t("do1_page.common.assigned_vehicle")} value={vehicleLabel(mission.courier?.vehicle_type, t)} icon={Truck} />
                <Field label={t("do1_page.common.updated")} value={new Date(mission.updated_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR")} icon={Clock3} />
              </div>
              {mission.vendor_names.length ? (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
                  {t("do1_page.missions.origin_label")}: {mission.vendor_names.join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[.8fr_1fr_1.2fr_.9fr_.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70">
              <span>{t("do1_page.missions.col_mission")}</span>
              <span>{t("do1_page.common.courier")}</span>
              <span>{t("do1_page.missions.col_route")}</span>
              <span>{t("do1_page.common.status")}</span>
              <span>{t("do1_page.missions.col_updated_short")}</span>
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
                  <PrecisionHint precision={mission.address_precision} />
                  {mission.vendor_names.length ? <div className="mt-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">{mission.vendor_names.join(", ")}</div> : null}
                </div>
                <StatusPill>{missionStatusLabel(mission.status, mission.status_display, t)}</StatusPill>
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
    <Panel kicker={tabLabels.disputes} title={t("do1_page.disputes.title")}>
      {disputes.length === 0 ? (
        <EmptyState>
          {operationsLoading ? t("do1_page.disputes.loading") : t("do1_page.disputes.empty")}
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
                      {dispute.organization_can_reply ? t("do1_page.disputes.reply_allowed") : t("do1_page.disputes.read_only")}
                    </StatusPill>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{dispute.reason_display} · {dispute.mission_reference || t("do1_page.disputes.order_ref", { id: dispute.order_id })}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{dispute.description}</p>
                </div>
                <div className="text-right text-xs font-semibold text-slate-500">
                  {new Date(dispute.updated_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR")}
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <Field label={t("do1_page.common.courier")} value={dispute.courier?.full_name || "-"} icon={Users} />
                <Field label={t("do1_page.common.city")} value={dispute.city || "-"} icon={Map} />
                <Field label={t("do1_page.common.messages")} value={dispute.messages_count.toString()} icon={MessageSquareText} />
                <Field label={t("do1_page.common.evidence")} value={dispute.evidences_count.toString()} icon={FileText} />
              </div>
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-500">{dispute.delivery_address}</p>
                <PrecisionHint precision={dispute.address_precision} />
              </div>
              {dispute.organization_can_reply ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <textarea value={disputeReplies[dispute.id] || ""} onChange={(event) => setDisputeReplies((current) => ({ ...current, [dispute.id]: event.target.value }))} placeholder={t("do1_page.disputes.reply_placeholder")} className="min-h-20 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <button type="button" onClick={() => void replyToDispute(dispute.id)} disabled={actionBusy || !disputeReplies[dispute.id]?.trim()} className="self-end rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{t("do1_page.disputes.send_reply")}</button>
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
          {!Capacitor.isNativePlatform() && <AppDownloadBanner portal="DELIVERY_ORG" />}
          {/* Deux cartes par rangee des le telephone : empilees une par une, ces
              quatre reperes poussaient le dispatch sous la ligne de flottaison.
              En 2x2 le responsable les embrasse d'un seul regard. */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <WorkCard title="SLA" value="48h" body={t("do1_page.dashboard.sla_body")} icon={Clock3} />
            <WorkCard title={t("do1_page.dashboard.fleet_readiness_title")} value={`${approvedCouriers}/${couriers.length}`} body={t("do1_page.dashboard.fleet_readiness_body")} icon={Users} />
            <WorkCard title={t("do1_page.dashboard.active_missions_title")} value={activeMissionsCount.toString()} body={t("do1_page.dashboard.active_missions_body")} icon={Truck} />
            <WorkCard title={t("do1_page.dashboard.open_disputes_title")} value={openDisputesCount.toString()} body={t("do1_page.dashboard.open_disputes_body")} icon={AlertTriangle} />
          </section>
          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Panel kicker={t("do1_page.dashboard.live_dispatch_kicker")} title={t("do1_page.dashboard.mission_pipeline_title")}>
              {/* Deux etapes par rangee sur telephone : le pipeline reste lisible
                  d'un coup d'oeil au lieu de s'etirer sur trois ecrans. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([
                  [t("do1_page.dashboard.assigned_stage"), assignedMissions, Truck],
                  [t("do1_page.dashboard.picked_up_stage"), pickedUpMissions, PackageSearch],
                  [t("do1_page.dashboard.last_mile_stage"), outForDeliveryMissions, Route],
                ] as Array<[string, number, IconComponent]>).map(([title, value, Icon]) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800 sm:p-4">
                    <Icon className="h-4 w-4 text-cyan-700 dark:text-cyan-300 sm:h-5 sm:w-5" />
                    <div className="mt-3 text-2xl font-black leading-none text-slate-950 dark:text-white sm:mt-4">{value}</div>
                    <div className="mt-1.5 text-[10px] font-black uppercase leading-tight tracking-[0.1em] text-slate-500 sm:text-xs sm:tracking-[0.12em]">{title}</div>
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
                    <StatusPill>{missionStatusLabel(mission.status, mission.status_display, t)}</StatusPill>
                  </div>
                ))}
                {missions.length === 0 ? <EmptyState>{t("do1_page.dashboard.no_active_mission_yet")}</EmptyState> : null}
              </div>
            </Panel>
            <Panel kicker={t("do1_page.dashboard.risk_desk_kicker")} title={t("do1_page.dashboard.disputes_blockers_title")}>
              <div className="space-y-3">
                {(disputes.length ? disputes.slice(0, 3) : []).map((dispute) => (
                  <div key={dispute.id} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-amber-950 dark:text-amber-100">{dispute.ref} · {dispute.reason_display}</strong>
                      <StatusPill tone={dispute.organization_can_reply ? "emerald" : "slate"}>
                        {dispute.organization_can_reply ? t("do1_page.dashboard.action_label") : t("do1_page.dashboard.follow_label")}
                      </StatusPill>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-amber-900/75 dark:text-amber-100/75">{dispute.description}</p>
                  </div>
                ))}
                {disputes.length === 0 ? <EmptyState>{t("do1_page.dashboard.no_open_dispute")}</EmptyState> : null}
              </div>
            </Panel>
          </div>
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel kicker={t("do1_page.dashboard.fleet_control_kicker")} title={t("do1_page.dashboard.courier_availability_title")}>
              <div className="space-y-3">
                {couriers.slice(0, 5).map((courier) => (
                  <div key={courier.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <div>
                      <div className="font-black text-slate-950 dark:text-white">{courier.full_name}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{courier.city} · {vehicleLabel(courier.vehicle_type, t)}</div>
                    </div>
                    <StatusPill tone={courier.is_online ? "emerald" : "slate"}>{courier.is_online ? t("do1_page.common.online") : t("do1_page.common.offline")}</StatusPill>
                  </div>
                ))}
                {couriers.length === 0 ? <EmptyState>{t("do1_page.dashboard.no_courier_attached")}</EmptyState> : null}
              </div>
            </Panel>
            <Panel kicker={t("do1_page.dashboard.coverage_kicker")} title={t("do1_page.dashboard.zones_contract_title")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("do1_page.common.contract")} value={organization.contract} icon={FileText} />
                <Field label={t("do1_page.common.manager")} value={organization.manager} icon={Users} />
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
          <Panel kicker={tabLabels.contract} title={t("do1_page.contract.company_file_title")}>
            <div className="mb-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                    {t("do1_page.contract.activation_status_label")}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-cyan-950 dark:text-cyan-100">
                    {t("do1_page.contract.activation_description")}
                  </p>
                </div>
                <StatusPill tone={operationalTone}>{operationalStatus}</StatusPill>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={t("do1_page.contract.legal_name")} value={organization.name} icon={Building2} />
              <Field label={t("do1_page.contract.contract_reference")} value={organization.contract} icon={FileText} />
              <Field label={t("do1_page.contract.operations_manager")} value={organization.manager} icon={Users} />
              <Field label={t("do1_page.contract.operational_address")} value={organization.address} icon={Map} />
              <Field label={t("do1_page.common.phone")} value={organization.phone} icon={HeadphonesIcon} />
              <Field label={t("do1_page.contract.validation_label")} value={organization.status} icon={ShieldCheck} />
            </div>
          </Panel>
          <Panel kicker="KYC" title={t("do1_page.contract.kyc_title")}>
            <div className="space-y-3">
              {kycItems.map(([label, statusKind, body], index) => {
                const documentType = ["COMPANY_RECORD", "MANAGER_ID", "CONTRACT", "COVERAGE", "PAYOUT_ACCOUNT"][index];
                const uploaded = complianceDocuments.find((document) => document.document_type === documentType);
                return (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{label}</span>
                    <StatusPill tone={kycStatusTone(statusKind)}>{kycStatusLabel(statusKind)}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-cyan-700 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
                    {uploaded ? `${t("do1_page.contract.uploaded_label")} · ${uploaded.status}` : t("do1_page.contract.send_document_label")}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" disabled={actionBusy} onChange={(event) => void uploadComplianceDocument(documentType, event.target.files?.[0])} />
                  </label>
                </div>
                );
              })}
            </div>
          </Panel>
          <div className="xl:col-span-2">
            <Panel kicker={t("do1_page.contract.activation_chain_kicker")} title={t("do1_page.contract.activation_chain_title")}>
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
            <WorkCard title={t("do1_page.fleet.total_couriers_title")} value={couriers.length.toString()} body={t("do1_page.fleet.total_couriers_body")} icon={Users} />
            <WorkCard title={t("do1_page.fleet.approved_title")} value={approvedCouriers.toString()} body={t("do1_page.fleet.approved_body")} icon={ShieldCheck} />
            <WorkCard title={t("do1_page.fleet.online_title")} value={onlineCouriers.toString()} body={t("do1_page.fleet.online_body")} icon={Truck} />
          </section>
          <Panel kicker={t("do1_page.fleet.company_assets_kicker")} title={t("do1_page.fleet.vehicle_pool_title")}>
            <div className="grid gap-3 lg:grid-cols-[.85fr_1.15fr]">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/30">
                <h3 className="font-black text-cyan-950 dark:text-cyan-100">{t("do1_page.fleet.add_vehicle_title")}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <input value={vehicleLabelInput} onChange={(event) => setVehicleLabelInput(event.target.value)} placeholder={t("do1_page.fleet.vehicle_label_placeholder")} className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
                  <input value={vehicleRegistration} onChange={(event) => setVehicleRegistration(event.target.value.toUpperCase())} placeholder={t("do1_page.fleet.registration_placeholder")} className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
                  <select value={vehicleTypeInput} onChange={(event) => setVehicleTypeInput(event.target.value)} className="rounded-xl border border-cyan-200 bg-white px-3 py-2.5 font-semibold text-slate-950 outline-none dark:bg-slate-900 dark:text-white">
                    <option value="MOTORBIKE">{t("do1_page.fleet.vehicle_options.motorbike")}</option><option value="CAR">{t("do1_page.fleet.vehicle_options.car")}</option><option value="TRICYCLE">{t("do1_page.fleet.vehicle_options.tricycle")}</option><option value="VAN">{t("do1_page.fleet.vehicle_options.van")}</option><option value="BIKE">{t("do1_page.fleet.vehicle_options.bike")}</option>
                  </select>
                  <button type="button" onClick={createVehicle} disabled={actionBusy || !vehicleLabelInput.trim() || !vehicleRegistration.trim()} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{t("do1_page.fleet.add_vehicle_button")}</button>
                </div>
              </div>
              <div className="space-y-2">
                {vehicles.length === 0 ? <EmptyState>{t("do1_page.fleet.no_vehicle_registered")}</EmptyState> : vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_1fr] sm:items-center">
                    <div><div className="font-black text-slate-950 dark:text-white">{vehicle.label} · {vehicle.registration}</div><div className="mt-1 text-xs font-semibold text-slate-500">{vehicleLabel(vehicle.vehicle_type, t)}</div></div>
                    <select disabled={actionBusy} value={vehicle.assigned_courier?.id || ""} onChange={(event) => void assignVehicle(vehicle.id, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      <option value="">{t("do1_page.fleet.unassigned")}</option>
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
      // Meme rendu que la feuille ouverte par l'avatar : profil entreprise,
      // securite, certificat verifiable et etat de l'application. Un seul
      // ecran de reglages a maintenir pour les deux points d'entree.
      return <DeliverySettingsContent {...settingsProps} />;
    }

    if (tab === "zones") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <Panel kicker={tabLabels.zones} title={t("do1_page.zones.coverage_title")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/40">
              <p className="max-w-2xl text-sm font-semibold leading-6 text-cyan-950 dark:text-cyan-100">
                {t("do1_page.zones.banner_description")}
              </p>
              <div className="flex min-w-[280px] flex-1 gap-2 sm:max-w-xl">
                <input value={zonesInput} onChange={(event) => setZonesInput(event.target.value)} placeholder={t("do1_page.zones.zone_input_placeholder")} className="min-w-0 flex-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-white" />
                <button type="button" onClick={saveZones} disabled={actionBusy || !zonesInput.trim()} className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                  {t("do1_page.common.save")}
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(displayZones.length ? displayZones : [t("do1_page.zones.no_zone_declared")]).map((zone) => (
                <div key={zone} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <Map className="text-cyan-700 dark:text-cyan-300" size={20} />
                  <div className="mt-3 font-black text-slate-950 dark:text-white">{zone}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t("do1_page.zones.capacity_note")}
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
          <Panel kicker={tabLabels.pricing} title={t("do1_page.pricing.grid_title")}>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 dark:border-cyan-900 dark:bg-cyan-950/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-cyan-950 dark:text-cyan-50">
                    {hasContract ? organization.contract : t("do1_page.pricing.contract_pending")}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-950/75 dark:text-cyan-100/80">
                    {t("do1_page.pricing.banner_description")}
                  </p>
                </div>
                <StatusPill tone={hasContract ? "emerald" : "amber"}>{hasContract ? t("do1_page.pricing.active_label") : t("do1_page.common.status_pending")}</StatusPill>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                [t("do1_page.pricing.zone_rates_title"), t("do1_page.pricing.zone_rates_body")],
                ["SLA", t("do1_page.pricing.sla_body")],
                [t("do1_page.pricing.exceptions_title"), t("do1_page.pricing.exceptions_body")],
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
          <DeliverySettlementsPanel
            locale={locale}
            onOpenSettings={() => setTab("settings")}
          />
          <Panel
            kicker={t("do1_page.payments.payment_method_kicker")}
            title={t("do1_page.payments.settlement_account_title")}
          >
            <PayoutAccountVerificationCard
              ownerRole="DELIVERY_ORGANIZATION"
              accent="#0891B2"
            />
          </Panel>
        </div>
      );
    }

    if (tab === "messages") {
      return (
        <div className="space-y-5">
          {renderSectionIntro()}
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel kicker={tabLabels.messages} title={t("do1_page.messages_tab.channels_title")}>
              <div className="space-y-3">
                {[
                  [t("do1_page.messages_tab.belivay_ops_title"), t("do1_page.messages_tab.belivay_ops_body")],
                  [t("do1_page.messages_tab.courier_threads_title"), t("do1_page.messages_tab.courier_threads_body")],
                  [t("do1_page.messages_tab.incident_notes_title"), t("do1_page.messages_tab.incident_notes_body")],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                    <div className="font-black text-slate-950 dark:text-white">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel kicker={t("do1_page.messages_tab.composer_kicker")} title={t("do1_page.messages_tab.new_message_title")}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <MessageSquareText className="text-cyan-700 dark:text-cyan-300" />
                <input value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder={t("do1_page.messages_tab.subject_placeholder")} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder={t("do1_page.messages_tab.describe_placeholder")} className="mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <button type="button" onClick={sendSupportMessage} disabled={actionBusy || supportSubject.trim().length < 3 || supportMessage.trim().length < 10} className="mt-3 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                  {t("do1_page.messages_tab.send_to_support")}
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
          [t("do1_page.proofs_parcels_perf.parcels_pickup_title"), PackageSearch, t("do1_page.proofs_parcels_perf.parcels_pickup_body")],
          [t("do1_page.proofs_parcels_perf.parcels_in_transit_title"), Truck, t("do1_page.proofs_parcels_perf.parcels_in_transit_body")],
          [t("do1_page.proofs_parcels_perf.parcels_closed_title"), CheckCircle2, t("do1_page.proofs_parcels_perf.parcels_closed_body")],
        ],
        proofs: [
          [t("do1_page.proofs_parcels_perf.proofs_pickup_title"), ClipboardCheck, t("do1_page.proofs_parcels_perf.proofs_pickup_body")],
          [t("do1_page.proofs_parcels_perf.proofs_delivery_title"), FileCheck2, t("do1_page.proofs_parcels_perf.proofs_delivery_body")],
          [t("do1_page.proofs_parcels_perf.proofs_review_title"), Search, t("do1_page.proofs_parcels_perf.proofs_review_body")],
        ],
        performance: [
          [t("do1_page.proofs_parcels_perf.performance_success_rate_title"), BarChart3, t("do1_page.proofs_parcels_perf.performance_success_rate_body")],
          [t("do1_page.proofs_parcels_perf.performance_sla_delays_title"), Clock3, t("do1_page.proofs_parcels_perf.performance_sla_delays_body")],
          [t("do1_page.proofs_parcels_perf.performance_proof_quality_title"), ShieldCheck, t("do1_page.proofs_parcels_perf.performance_proof_quality_body")],
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
                <StatusPill tone="slate">{t("do1_page.proofs_parcels_perf.waiting_data")}</StatusPill>
              </div>
            ))}
          </section>
          {tab === "parcels" ? (
            <Panel kicker={tabLabels.parcels} title={t("do1_page.proofs_parcels_perf.parcels_register_title")}>
              {missions.length === 0 ? <EmptyState>{t("do1_page.proofs_parcels_perf.parcels_none_active")}</EmptyState> : <div className="space-y-3">{missions.map((mission) => (
                <div key={mission.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800 md:grid-cols-[.7fr_1fr_1fr_.7fr]">
                  <strong className="text-slate-950 dark:text-white">{mission.reference}</strong><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{mission.city} · {mission.delivery_address}</span><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{mission.courier?.full_name || t("do1_page.fleet.unassigned")}</span><StatusPill>{missionStatusLabel(mission.status, mission.status_display, t)}</StatusPill>
                </div>
              ))}</div>}
            </Panel>
          ) : tab === "proofs" ? (
            <Panel kicker={tabLabels.proofs} title={t("do1_page.proofs_parcels_perf.proofs_captured_title")}>
              {missions.filter((mission) => mission.last_event || mission.latest_location).length === 0 ? <EmptyState>{t("do1_page.proofs_parcels_perf.proofs_none_captured")}</EmptyState> : <div className="space-y-3">{missions.filter((mission) => mission.last_event || mission.latest_location).map((mission) => (
                <div key={mission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800"><div className="flex items-center justify-between gap-3"><strong className="text-slate-950 dark:text-white">{mission.reference}</strong><StatusPill tone={mission.latest_location ? "emerald" : "amber"}>{mission.location_history.length} {t("do1_page.proofs_parcels_perf.proofs_gps_points")}</StatusPill></div><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{mission.last_event?.message || t("do1_page.proofs_parcels_perf.proofs_position_captured")}</p></div>
              ))}</div>}
            </Panel>
          ) : (
            <Panel kicker={tabLabels.performance} title={t("do1_page.proofs_parcels_perf.performance_indicators_title")}>
              <div className="grid gap-3 sm:grid-cols-3"><Field label={t("do1_page.proofs_parcels_perf.performance_delivered")} value={`${summary?.delivered_30d || 0}`} icon={CheckCircle2} /><Field label={t("do1_page.proofs_parcels_perf.performance_failed")} value={`${summary?.failed_30d || 0}`} icon={AlertTriangle} /><Field label={t("do1_page.proofs_parcels_perf.performance_gps_points")} value={`${summary?.tracked_locations_30d || 0}`} icon={Map} /></div>
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
        [t("do1_page.operational_cards.missions.active.title"), activeMissionsCount.toString(), t("do1_page.operational_cards.missions.active.body"), Truck],
        [t("do1_page.operational_cards.missions.to_dispatch.title"), missionQueue.length.toString(), t("do1_page.operational_cards.missions.to_dispatch.body"), Route],
        [t("do1_page.operational_cards.missions.exceptions.title"), missionQueue.filter((mission) => ["VEHICLE_INCOMPATIBLE", "CAPACITY_BLOCKED"].includes(mission.status)).length.toString(), t("do1_page.operational_cards.missions.exceptions.body"), AlertTriangle],
      ],
      parcels: [
        [t("do1_page.operational_cards.parcels.pickup_queue.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.parcels.pickup_queue.body"), PackageSearch],
        [t("do1_page.operational_cards.parcels.in_transit.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.parcels.in_transit.body"), Truck],
        [t("do1_page.operational_cards.parcels.closed.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.parcels.closed.body"), CheckCircle2],
      ],
      zones: [
        [t("do1_page.operational_cards.zones.covered_zones.title"), organization.zones.length.toString(), t("do1_page.operational_cards.zones.covered_zones.body"), Map],
        [t("do1_page.operational_cards.zones.capacity.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.zones.capacity.body"), Gauge],
        [t("do1_page.operational_cards.zones.blocked_zones.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.zones.blocked_zones.body"), AlertTriangle],
      ],
      pricing: [
        [t("do1_page.operational_cards.pricing.base_grid.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.pricing.base_grid.body"), CreditCard],
        ["SLA", t("do1_page.shell.notConnected"), t("do1_page.operational_cards.pricing.sla.body"), Clock3],
        [t("do1_page.operational_cards.pricing.approval_queue.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.pricing.approval_queue.body"), ShieldCheck],
      ],
      proofs: [
        [t("do1_page.operational_cards.proofs.pickup_proof.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.proofs.pickup_proof.body"), ClipboardCheck],
        [t("do1_page.operational_cards.proofs.delivery_proof.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.proofs.delivery_proof.body"), FileCheck2],
        [t("do1_page.operational_cards.proofs.review_queue.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.proofs.review_queue.body"), Search],
      ],
      disputes: [
        [t("do1_page.operational_cards.disputes.open_cases.title"), openDisputesCount.toString(), t("do1_page.operational_cards.disputes.open_cases.body"), AlertTriangle],
        [t("do1_page.operational_cards.disputes.evidence.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.disputes.evidence.body"), FileText],
        [t("do1_page.operational_cards.disputes.decision.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.disputes.decision.body"), ShieldCheck],
      ],
      performance: [
        [t("do1_page.operational_cards.performance.success_rate.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.performance.success_rate.body"), BarChart3],
        [t("do1_page.operational_cards.performance.late_rate.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.performance.late_rate.body"), Clock3],
        [t("do1_page.operational_cards.performance.proof_quality.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.performance.proof_quality.body"), ClipboardCheck],
      ],
      payments: [
        [t("do1_page.operational_cards.payments.to_settle.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.payments.to_settle.body"), WalletCards],
        [t("do1_page.operational_cards.payments.paid.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.payments.paid.body"), CheckCircle2],
        [t("do1_page.operational_cards.payments.reconciliation.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.payments.reconciliation.body"), CreditCard],
      ],
      messages: [
        [t("do1_page.operational_cards.messages.belivay_channel.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.messages.belivay_channel.body"), MessageSquareText],
        [t("do1_page.operational_cards.messages.courier_threads.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.messages.courier_threads.body"), Users],
        [t("do1_page.operational_cards.messages.incident_notes.title"), t("do1_page.shell.notConnected"), t("do1_page.operational_cards.messages.incident_notes.body"), AlertTriangle],
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
          <Panel kicker={tabLabels.zones} title={t("do1_page.zones.declared_coverage_title")}>
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
    http<BourseTournee[]>("/api/auth/delivery-organization/bourse/")
      .then((items) => { if (alive) setBourseTournees(items); })
      .catch(() => { if (alive) setBourseTournees([]); });
    const operationsInterval = window.setInterval(loadOperations, 5000);

    return () => {
      alive = false;
      window.clearInterval(operationsInterval);
    };
  }, []);

  return (
    <main className="belivay-portal min-h-screen bg-[#f4f7fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex">
        <DeliverySidebar
          activeTab={tab}
          onSelect={setTab}
          onLogout={handleLogout}
          labels={tabLabels}
          groupLabels={groupLabels}
          badges={navBadges}
          brandKicker={t("do1_page.shell.brand")}
          logoutLabel={t("do1_page.shell.logout")}
          organization={{
            name: organization.name,
            manager: organization.manager,
            city: organization.city,
            contract: organization.contract,
            status: operationalStatus,
            avatarUrl: avatarUrl || undefined,
          }}
          statusLabel={t("do1_page.shell.status")}
          footer={footerLines}
        />

        <section className="min-w-0 flex-1">
          {/* `safe-pt` : sous l'encoche, la barre collante ne passe plus sous le
              statut systeme. La densite se resserre sur telephone (menu + logo
              + reglages) et retrouve toutes les actions a partir de `lg`. */}
          <header className="safe-pt sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 sm:py-3">
            {/* ── Bandeau telephone/tablette ──────────────────────────────────
                Menu et logo a gauche, reglages a droite. Le tiroir s'ouvrant
                depuis la gauche, son bouton d'appel reste de ce cote : le geste
                et l'animation vont dans le meme sens. */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("do1_page.shell.space")}
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
                className="tap-target relative -ml-1 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <MenuIcon size={22} strokeWidth={2.2} />
                {/* Le menu porte seul les alertes des destinations hors barre du
                    bas : un point suffit a dire « il y a quelque chose la-dedans »
                    sans encombrer l'icone d'un compteur. */}
                {hiddenBadgeTotal > 0 ? (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-red-600 ring-2 ring-white dark:ring-slate-900"
                  />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => setTab("dashboard")}
                aria-label={tabLabels.dashboard}
                className="flex min-w-0 flex-shrink items-center rounded-xl px-1 py-1 transition active:scale-95"
              >
                <img src="/belivay-logo-delivery-org.png" alt="BelivaY" className="h-8 w-auto object-contain" />
              </button>

              <div className="flex-1" />

              {/* Canal d'alerte du portail organisation : ce sont les litiges
                  ouverts qui reclament une reponse, pas des notifications. */}
              <button
                type="button"
                onClick={() => setTab("disputes")}
                aria-label={tabLabels.disputes}
                className="tap-target relative flex flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <AlertTriangle size={19} />
                {openDisputesCount ? (
                  <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
                    {openDisputesCount > 99 ? "99+" : openDisputesCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("do1_page.shell.light_mode") : t("do1_page.shell.dark_mode")}
                className="tap-target flex flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
              </button>

              <button
                type="button"
                onClick={switchLanguage}
                aria-label={t("do1_page.shell.change_language_aria")}
                className="tap-target flex flex-shrink-0 items-center justify-center rounded-xl px-1 text-xs font-black text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {locale === "fr" ? "FR" : "EN"}
              </button>

              <button
                type="button"
                onClick={() => setProfileSheetOpen(true)}
                aria-label={t("do1_page.shell.openProfile")}
                aria-haspopup="dialog"
                aria-expanded={profileSheetOpen}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-700 text-xs font-black text-white ring-1 ring-black/5 transition active:scale-90"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user?.username || organization.manager).slice(0, 2).toUpperCase()
                )}
              </button>
            </div>

            {/* Titre de l'ecran : sorti du bandeau pour lui laisser toute sa
                largeur, il garde sa place de repere de navigation. */}
            <div className="mt-2 min-w-0 lg:hidden">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">{t("do1_page.shell.space")}</p>
              <h1 className="truncate text-[19px] font-black leading-tight tracking-tight">{tabLabels[tab]}</h1>
            </div>

            <div className="hidden flex-wrap items-center justify-between gap-3 lg:flex">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{t("do1_page.shell.space")}</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">{active.title}</h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProfileSheetOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={profileSheetOpen}
                  title={t("do1_page.shell.profile")}
                  className="tap-target flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <UserCircle size={17} />}
                  <span className="max-w-[150px] truncate">{user?.username || organization.manager}</span>
                </button>
                <button type="button" onClick={switchLanguage} className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <Languages size={15} className="mr-1" />
                  {locale === "fr" ? "FR" : "EN"}
                </button>
                <button type="button" onClick={toggleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button type="button" onClick={handleLogout} title={t("do1_page.shell.logout")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100">
                  <LogOut size={17} />
                </button>
              </div>
            </div>

            {/* Ruban de contexte : ce que le responsable doit avoir sous les yeux
                en permanence (statut partenaire, flotte, missions, zones). Il
                remplace l'ancien defilement lateral des 13 onglets, desormais
                repartis entre la barre du bas et le tiroir. */}
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto lg:hidden">
              <span className="flex-shrink-0 whitespace-nowrap">
                <StatusPill tone={operationalTone}>{operationalStatus}</StatusPill>
              </span>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                {approvedCouriers}/{couriers.length} {t("do1_page.header.couriers_suffix")}
              </span>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {activeMissionsCount} {t("do1_page.header.missions_suffix")}
              </span>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {displayZones.length} {t("do1_page.header.zones_suffix")}
              </span>
            </div>
          </header>

          {/* `pb-tabbar` : le dernier bloc de chaque ecran reste atteignable
              au-dessus de la barre d'onglets fixe et de la barre gestuelle. */}
          <div className="pb-tabbar space-y-5 p-4 sm:p-6 lg:pb-6">
            <EvidenceRequestInbox accent="#0891B2" />
            {organizationMessage ? (
              <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${organizationMessage.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span>{organizationMessage.text}</span>
                <button type="button" onClick={() => setOrganizationMessage(null)} className="rounded-lg p-1 hover:bg-black/5" title={t("do1_page.shell.close")}><X size={16} /></button>
              </div>
            ) : null}
            {renderModuleContent()}
          </div>
        </section>
      </div>

      {/* Barre du bas : uniquement les quatre raccourcis du travail quotidien
          d'un dispatcher. Le reste du menu s'ouvre par l'icone du bandeau — une
          seule liste de destinations, donc un seul endroit ou l'utilisateur
          apprend a chercher. */}
      <DeliveryMobileNav
        activeTab={tab}
        onSelect={(next) => {
          setDrawerOpen(false);
          setTab(next);
        }}
        labels={tabLabels}
        badges={navBadges}
        navLabel={t("do1_page.shell.space")}
      />

      <DeliveryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={tab}
        onSelect={(next) => {
          setDrawerOpen(false);
          setTab(next);
        }}
        onLogout={handleLogout}
        labels={tabLabels}
        groupLabels={groupLabels}
        badges={navBadges}
        brandKicker={t("do1_page.shell.brand")}
        logoutLabel={t("do1_page.shell.logout")}
        organization={{
          name: organization.name,
          manager: organization.manager,
          city: organization.city,
          contract: organization.contract,
          status: operationalStatus,
          avatarUrl: avatarUrl || undefined,
        }}
        statusLabel={t("do1_page.shell.status")}
        footer={footerLines}
        title={t("do1_page.shell.space")}
        closeLabel={t("do1_page.shell.close")}
      />

      {/* Feuille compte : ouverte par l'avatar, elle glisse depuis la droite —
          le tiroir de navigation vient de gauche, les deux gestes restent donc
          distincts meme quand les deux panneaux ont ete appris. */}
      <DeliveryProfileSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} {...settingsProps} />

      {avatarFile ? (
        <AvatarCropDialog
          file={avatarFile}
          accent="#0891B2"
          onClose={() => setAvatarFile(null)}
          onUploaded={(updatedUser) => {
            setAvatarUrl(updatedUser.avatar_url || "");
            setAvatarFile(null);
            setOrganizationMessage({ tone: "success", text: t("do1_page.toasts.profile_photo_updated") });
          }}
        />
      ) : null}
    </main>
  );
}
