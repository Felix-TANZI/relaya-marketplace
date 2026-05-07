import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Bell,
  Bike,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  FileBadge2,
  Gauge,
  LoaderCircle,
  Map,
  MapPin,
  Navigation,
  Package,
  Phone,
  QrCode,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  Siren,
  Sun,
  Moon,
  MoreHorizontal,
  Store,
  Truck,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import TrackingMap from "@/components/TrackingMap";
import { useTheme } from "@/context/ThemeContext";
import { authApi, type CourierApplicationResponse, type User as AuthUser } from "@/services/api/auth";
import {
  courierApi,
  type CourierDashboard,
  type CourierDispute,
  type CourierNetwork,
  type CourierNotification,
  type CourierShipment,
  type CourierShipmentAction,
  type CourierSettings,
} from "@/services/api/courier";

type CourierTab =
  | "dashboard"
  | "tournee"
  | "courses"
  | "scanner"
  | "map"
  | "reseau"
  | "gains"
  | "profil"
  | "formation"
  | "notifications"
  | "incidents"
  | "litiges"
  | "securite"
  | "parametres";

const VEHICLE_LABELS: Record<string, string> = {
  MOTORBIKE: "Moto",
  CAR: "Voiture",
  BIKE: "Velo",
  TRICYCLE: "Tricycle",
  VAN: "Camionnette",
};

const TAB_LABELS: Record<CourierTab, string> = {
  dashboard: "Vue d'ensemble",
  tournee: "Ma Tournee",
  courses: "Courses",
  scanner: "Scanner QR",
  map: "Carte & Navigation",
  reseau: "Boutiques & Points Relais",
  gains: "Gains & Rentabilite",
  profil: "Mon Profil",
  formation: "Formation",
  notifications: "Notifications",
  incidents: "Incidents",
  litiges: "Litiges",
  securite: "Securite SOS",
  parametres: "Parametres",
};

function formatXaf(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function statusLabel(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "Assignee";
    case "PICKED_UP":
      return "Pris en charge";
    case "OUT_FOR_DELIVERY":
      return "En livraison";
    case "DELIVERED":
      return "Livree";
    case "FAILED":
      return "Echec";
    default:
      return "En attente";
  }
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "PICKED_UP":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "OUT_FOR_DELIVERY":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "DELIVERED":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function applyLocalAction(
  shipment: CourierShipment,
  action: CourierShipmentAction,
  message?: string,
  location?: string,
) {
  const nextStatus =
    action === "ACCEPT"
      ? "ASSIGNED"
      : action === "PICKED_UP"
        ? "PICKED_UP"
        : action === "OUT_FOR_DELIVERY"
          ? "OUT_FOR_DELIVERY"
          : action === "DELIVERED"
            ? "DELIVERED"
            : action === "FAILED"
              ? "FAILED"
              : action === "DECLINE"
                ? "CREATED"
                : shipment.status;

  return {
    ...shipment,
    status: nextStatus,
    events: [
      ...shipment.events,
      {
        id: Date.now(),
        status: nextStatus,
        message: message || action,
        location: location || shipment.city,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

function SectionShell({
  kicker,
  title,
  children,
  accent = "text-emerald-300",
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-500/10 bg-[linear-gradient(180deg,rgba(14,21,34,.98),rgba(9,14,26,.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,.34)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.12),transparent_52%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_top_right,rgba(110,231,183,.08),transparent_60%)]" />
      <p className={`relative text-[11px] font-black uppercase tracking-[0.18em] ${accent}`}>{kicker}</p>
      <h2 className="relative mt-1 text-[24px] font-extrabold tracking-tight text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
}) {
  return (
    <article className={`relative overflow-hidden rounded-[24px] border p-4 shadow-[0_18px_38px_rgba(0,0,0,.22)] ${tone}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.12),transparent_65%)]" />
      <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/10">
        <Icon size={19} />
      </div>
      <div className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">{label}</div>
      <div className="relative mt-2 text-[24px] font-extrabold text-white">{value}</div>
    </article>
  );
}

function InfoPill({
  icon: Icon,
  children,
  tone = "border-white/10 bg-white/5 text-white",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-bold ${tone}`}>
      <Icon size={13} />
      {children}
    </div>
  );
}

export default function CourierDashboardPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<CourierTab>("dashboard");
  const [booting, setBooting] = useState(true);
  const [progress, setProgress] = useState(8);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [application, setApplication] = useState<CourierApplicationResponse | null>(null);
  const [dashboard, setDashboard] = useState<CourierDashboard | null>(null);
  const [network, setNetwork] = useState<CourierNetwork | null>(null);
  const [courierSettings, setCourierSettings] = useState<CourierSettings | null>(null);
  const [disputes, setDisputes] = useState<CourierDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<CourierDispute | null>(null);
  const [notifications, setNotifications] = useState<CourierNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<CourierNotification | null>(null);
  const [shipments, setShipments] = useState<CourierShipment[]>([]);
  const [availableShipmentsFromAPI, setAvailableShipmentsFromAPI] = useState<CourierShipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanAction, setScanAction] = useState<"PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED">("PICKED_UP");
  const [scanFeedback, setScanFeedback] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState("");
  const [sosLoading, setSosLoading] = useState(false);
  const [sosFeedback, setSosFeedback] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const refreshCourierWork = useCallback(async () => {
    const [shipmentsResult, dashboardResult, availableResult, notificationsResult] = await Promise.allSettled([
      courierApi.listMyShipments(),
      courierApi.getDashboard(),
      courierApi.listAvailableShipments(),
      courierApi.getNotifications(),
    ]);

    if (shipmentsResult.status === "fulfilled") setShipments(shipmentsResult.value);
    if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
    if (availableResult.status === "fulfilled") setAvailableShipmentsFromAPI(availableResult.value);
    if (notificationsResult.status === "fulfilled") setNotifications(notificationsResult.value);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((value) => Math.min(value + 12, 94));
    }, 110);

    Promise.allSettled([
      authApi.getProfile(),
      authApi.getCourierApplication(),
      courierApi.listMyShipments(),
      courierApi.getDashboard(),
      courierApi.getNetwork(),
      courierApi.getSettings(),
      courierApi.getDisputes(),
      courierApi.getNotifications(),
      courierApi.listAvailableShipments(),
    ])
      .then(([profileResult, applicationResult, shipmentsResult, dashboardResult, networkResult, settingsResult, disputesResult, notificationsResult, availableResult]) => {
        const resolvedShipments =
          shipmentsResult.status === "fulfilled"
            ? shipmentsResult.value
            : [];
        const resolvedAvailable =
          availableResult.status === "fulfilled"
            ? availableResult.value
            : [];

        if (profileResult.status === "fulfilled") setUser(profileResult.value);
        if (applicationResult.status === "fulfilled") setApplication(applicationResult.value);
        if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value);
        if (networkResult.status === "fulfilled") setNetwork(networkResult.value);
        if (settingsResult.status === "fulfilled") setCourierSettings(settingsResult.value);
        if (disputesResult.status === "fulfilled") setDisputes(disputesResult.value);
        if (notificationsResult.status === "fulfilled") setNotifications(notificationsResult.value);
        setShipments(resolvedShipments);
        setAvailableShipmentsFromAPI(resolvedAvailable);
        setSelectedShipmentId((current) => current ?? resolvedShipments[0]?.id ?? resolvedAvailable[0]?.id ?? null);
      })
      .finally(() => {
        window.clearInterval(interval);
        setProgress(100);
        window.setTimeout(() => setBooting(false), 320);
      });

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshCourierWork();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refreshCourierWork]);

  const courierProfile = application?.application ?? user?.courier_profile ?? null;
  const isApprovedCourier = application?.status === "approved" || Boolean(user?.is_courier);
  const firstName = user?.first_name || user?.username || "Livreur";
  const zones = courierProfile?.zones?.length ? courierProfile.zones : [];
  const currentCourierCity = courierSettings?.city ?? courierProfile?.city ?? "Yaounde";
  const currentCourierZones = courierSettings?.zones?.length ? courierSettings.zones : zones;
  const currentCourierVehicle = courierSettings?.vehicle_type ?? courierProfile?.vehicle_type ?? "MOTORBIKE";
  const currentCourierLanguage = courierSettings?.preferred_language ?? courierProfile?.preferred_language ?? (i18n.language.startsWith("en") ? "en" : "fr");
  const currentGpsGranted = courierSettings?.gps_permission_granted ?? courierProfile?.gps_permission_granted ?? false;
  const currentCameraGranted = courierSettings?.camera_permission_granted ?? courierProfile?.camera_permission_granted ?? false;
  const currentIsOnline = courierSettings?.is_online ?? courierProfile?.is_online ?? false;

  const activeShipments = useMemo(
    () => shipments.filter((shipment) => ["ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(shipment.status)),
    [shipments],
  );
  const completedShipments = useMemo(
    () => shipments.filter((shipment) => ["DELIVERED", "FAILED"].includes(shipment.status)),
    [shipments],
  );
  const availableShipments = availableShipmentsFromAPI;
  const visibleCourseShipments = useMemo(() => {
    const byId = new globalThis.Map<number, CourierShipment>();
    for (const shipment of availableShipmentsFromAPI) byId.set(shipment.id, shipment);
    for (const shipment of shipments) byId.set(shipment.id, shipment);
    return Array.from(byId.values()).sort(
      (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    );
  }, [availableShipmentsFromAPI, shipments]);
  const tourShipments = useMemo(
    () =>
      [...activeShipments, ...completedShipments].sort(
        (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
      ),
    [activeShipments, completedShipments],
  );
  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ??
    availableShipmentsFromAPI.find((shipment) => shipment.id === selectedShipmentId) ??
    activeShipments[0] ??
    shipments[0] ??
    null;
  const selectedIsAvailable = availableShipmentsFromAPI.some((s) => s.id === selectedShipmentId);
  const selectedShipmentAccepted = Boolean(
    selectedShipment?.events.some((event) =>
      event.status === "ASSIGNED" && ["ACCEPT", "ACCEPTED", "Acceptee", "Accept"].includes(event.message),
    ),
  );

  const earnings = useMemo(() => {
    const delivered = shipments.filter((shipment) => shipment.status === "DELIVERED");
    const total = delivered.reduce((sum, shipment) => sum + Math.round(shipment.order_total_xaf * 0.08), 0);
    const today = delivered.slice(0, 2).reduce((sum, shipment) => sum + Math.round(shipment.order_total_xaf * 0.08), 0);
    return {
      total,
      today,
      average: delivered.length ? Math.round(total / delivered.length) : 0,
      deliveredCount: delivered.length,
      pending: Math.round(activeShipments.reduce((sum, shipment) => sum + shipment.order_total_xaf * 0.08, 0)),
    };
  }, [activeShipments, shipments]);

  const handleShipmentAction = async (action: CourierShipmentAction) => {
    if (!selectedShipment) return;
    setActionLoading(action);
    setActionFeedback("");

    try {
      const updated = await courierApi.actOnShipment(selectedShipment.id, {
        action,
        message: action === "NOTE" ? noteDraft.trim() : undefined,
        location: selectedShipment.city,
      });
      setShipments((current) => current.map((shipment) => (shipment.id === updated.id ? updated : shipment)));
      if (action === "NOTE") setNoteDraft("");
      setActionFeedback(
        action === "ACCEPT"
          ? "Mission acceptee et synchronisee."
          : action === "PICKED_UP"
            ? "Colis marque comme pris en charge."
            : action === "OUT_FOR_DELIVERY"
              ? "Course marquee en livraison."
              : action === "DELIVERED"
                ? "Colis remis au client et livraison certifiee."
                : action === "NOTE"
                  ? "Note enregistree sur la mission."
                  : "Action synchronisee.",
      );
    } catch {
      setShipments((current) =>
        current.map((shipment) =>
          shipment.id === selectedShipment.id
            ? applyLocalAction(shipment, action, action === "NOTE" ? noteDraft.trim() : undefined, selectedShipment.city)
            : shipment,
        ),
      );
      if (action === "NOTE") setNoteDraft("");
      setActionFeedback("Action appliquee localement. La synchronisation backend sera a reverifier.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClaimShipment = async (id: number) => {
    setActionLoading("CLAIM");
    setActionFeedback("");
    try {
      const claimed = await courierApi.claimShipment(id);
      setAvailableShipmentsFromAPI((prev) => prev.filter((s) => s.id !== id));
      setShipments((prev) => [claimed, ...prev]);
      setSelectedShipmentId(claimed.id);
      setActionFeedback("Mission prise en charge avec succès.");
      refreshCourierWork();
    } catch {
      setActionFeedback("Impossible de prendre cette mission. Elle a peut-être déjà été assignée.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleContactClient = () => {
    if (!selectedShipment?.customer_phone) return;
    setContactLoading(true);
    setActionFeedback("Ouverture de l'appel client...");
    window.setTimeout(() => {
      window.location.href = `tel:${selectedShipment.customer_phone}`;
      setContactLoading(false);
    }, 450);
  };

  const handleScanShipment = async () => {
    if (!scanCode.trim()) return;

    try {
      const updated = await courierApi.scanShipment({
        code: scanCode.trim(),
        action: scanAction,
      });
      setShipments((current) => current.map((shipment) => (shipment.id === updated.id ? updated : shipment)));
      setSelectedShipmentId(updated.id);
      setScanFeedback(`Scan traite pour la commande #${updated.order}.`);
    } catch {
      setScanFeedback("Le scan a echoue. Verifie le code et l'assignation de la mission.");
    }
  };

  const menu = [
    { id: "dashboard", label: "Vue d'ensemble", icon: Gauge },
    { id: "tournee", label: "Ma Tournee", icon: Route },
    { id: "courses", label: "Courses", icon: Package },
    { id: "scanner", label: "Scanner QR", icon: ScanLine },
    { id: "map", label: "Carte & Navigation", icon: Map },
    { id: "reseau", label: "Boutiques & Points Relais", icon: Store },
    { id: "gains", label: "Gains & Rentabilite", icon: BadgeDollarSign },
    { id: "profil", label: "Mon Profil", icon: User },
    { id: "formation", label: "Formation", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "litiges", label: "Litiges", icon: ShieldCheck },
    { id: "securite", label: "Securite SOS", icon: Siren },
    { id: "parametres", label: "Parametres", icon: Settings2 },
  ] as const;
  const mobileTabs = menu.slice(0, 4);
  const mobileMoreTabs = menu.slice(4);

  const quickStats = [
    {
      label: "Courses actives",
      value: activeShipments.length,
      icon: Package,
      tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Livrees",
      value: earnings.deliveredCount,
      icon: CheckCircle2,
      tone: "text-green-300 bg-green-500/10 border-green-500/20",
    },
    {
      label: "Gains du jour",
      value: formatXaf(earnings.today),
      icon: Wallet,
      tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Moyenne/course",
      value: formatXaf(earnings.average),
      icon: Gauge,
      tone: "text-lime-300 bg-lime-500/10 border-lime-500/20",
    },
  ];

  const leaderboard = dashboard?.leaderboard ?? [];

  const liveHeaderStats = [
    {
      label: "Temps en ligne",
      value: `${Math.floor((dashboard?.online_minutes ?? 0) / 60)}h ${String((dashboard?.online_minutes ?? 0) % 60).padStart(2, "0")}`,
      tone: "text-emerald-300",
    },
    { label: "Statut", value: dashboard?.status_label ?? (currentIsOnline ? "En ligne" : "Hors ligne"), tone: "text-green-300" },
    { label: "Parcourus", value: `${(dashboard?.distance_km ?? 0).toFixed(1)} km`, tone: "text-sky-300" },
    { label: "Temps moyen / livraison", value: `${dashboard?.average_delivery_minutes ?? 0} min`, tone: "text-cyan-300" },
    { label: "Performance", value: `${dashboard?.performance_percent ?? 0}%`, tone: "text-orange-300" },
  ];

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const mapShipment = selectedShipment ?? activeShipments[0] ?? shipments[0] ?? null;
  const nextTourStop = activeShipments[0] ?? tourShipments[0] ?? null;
  const estimatedTourMinutes =
    activeShipments.length > 0
      ? activeShipments.length * Math.max(dashboard?.average_delivery_minutes ?? 24, 12)
      : 0;
  const activeDistanceKm =
    activeShipments.length > 0
      ? Number(
          (
            dashboard?.distance_km ??
            activeShipments.reduce((sum, shipment) => sum + (shipment.city === courierProfile?.city ? 4.2 : 6.5), 0)
          ).toFixed(1),
        )
      : 0;
  const activeZones = Array.from(
    new Set(
      activeShipments
        .map((shipment) => shipment.city || courierProfile?.city)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const completedToday = completedShipments.filter((shipment) => {
    const updated = new Date(shipment.updated_at);
    const now = new Date();
    return (
      updated.getFullYear() === now.getFullYear() &&
      updated.getMonth() === now.getMonth() &&
      updated.getDate() === now.getDate()
    );
  }).length;
  const tourInsights = [
    {
      title: activeShipments.length > 1 ? "Regroupement detecte" : "Prochaine destination",
      body:
        activeShipments.length > 1
          ? `${activeZones.join(", ") || courierProfile?.city || "Votre zone"} concentre ${activeShipments.length} livraison(s) active(s).`
          : nextTourStop
            ? `${nextTourStop.customer_name} · ${nextTourStop.delivery_address}`
            : "Aucune livraison active pour le moment.",
      tone: "border-orange-500/20 bg-orange-500/5",
    },
    {
      title: "Fenetre conseillee",
      body: dashboard?.recommended_departure
        ? `Depart recommande a ${dashboard.recommended_departure} avec trafic ${dashboard.traffic_label?.toLowerCase() || "modere"}.`
        : "La prochaine mission apparaitra ici des qu'une course est assignee.",
      tone: "border-sky-500/20 bg-sky-500/5",
    },
    {
      title: "Suivi terrain",
      body:
        activeShipments.length > 0
          ? `${completedToday} mission(s) cloturee(s) aujourd'hui, ${activeShipments.length} encore en cours.`
          : "Aucune mission en cours. Reste disponible pour recevoir de nouvelles assignations.",
      tone: activeShipments.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]",
    },
  ];

  function formatDuration(totalMinutes: number) {
    if (!totalMinutes) return "0 min";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} min`;
    return `${hours}h ${String(minutes).padStart(2, "0")} min`;
  }

  function notificationTone(type: CourierNotification["notification_type"]) {
    switch (type) {
      case "ORDER":
        return "text-orange-300";
      case "PAYMENT":
        return "text-sky-300";
      case "PROMOTION":
        return "text-fuchsia-300";
      case "SUPPORT":
        return "text-amber-300";
      default:
        return "text-emerald-300";
    }
  }

  async function handleNotificationClick(notification: CourierNotification) {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        const updated = await courierApi.markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelectedNotification(updated);
      } catch {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );
        setSelectedNotification({ ...notification, is_read: true });
      }
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await courierApi.markAllNotificationsRead();
    } finally {
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    }
  }

  async function updateCourierSettings(
    label: string,
    payload: Partial<Omit<CourierSettings, "id" | "updated_at">>,
  ) {
    setSettingsSaving(label);
    setSettingsFeedback("");
    try {
      const updated = await courierApi.updateSettings(payload);
      setCourierSettings(updated);
      if (payload.preferred_language) {
        i18n.changeLanguage(payload.preferred_language);
      }
      setSettingsFeedback("Reglage synchronise avec le backend.");
    } catch {
      setSettingsFeedback("Impossible de synchroniser ce reglage pour le moment.");
    } finally {
      setSettingsSaving(null);
    }
  }

  async function handleSOSAlert() {
    setSosLoading(true);
    setSosFeedback("");
    try {
      const alert = await courierApi.triggerSOS({
        message: "Alerte SOS declenchee depuis l'espace livreur.",
        location: currentCourierCity,
      });
      setSosFeedback(`Alerte SOS #${alert.id} envoyee au support securite.`);
      const latestNotifications = await courierApi.getNotifications();
      setNotifications(latestNotifications);
    } catch {
      setSosFeedback("Impossible d'envoyer l'alerte SOS. Contacte le support par telephone.");
    } finally {
      setSosLoading(false);
    }
  }

  const renderDashboard = () => (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            ...quickStats[0],
            value: dashboard?.active_shipments ?? quickStats[0].value,
          },
          {
            ...quickStats[1],
            value: dashboard?.delivered_shipments ?? quickStats[1].value,
          },
          {
            ...quickStats[2],
            value: formatXaf(dashboard?.today_earnings_xaf ?? earnings.today),
          },
          {
            ...quickStats[3],
            value: formatXaf(dashboard?.average_payout_xaf ?? earnings.average),
          },
        ].map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {liveHeaderStats.map((item) => (
          <article
            key={item.label}
            className="rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] px-5 py-4 shadow-[0_18px_38px_rgba(0,0,0,.2)]"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">{item.label}</div>
            <div className={`mt-2 text-[24px] font-extrabold ${item.tone}`}>{item.value}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionShell kicker="Briefing du jour" title={`Bonjour ${firstName}, prete pour la tournee ?`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-[0.15em] text-emerald-300">Statut terrain</span>
                <InfoPill icon={Bike} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  {currentIsOnline ? "Disponible" : "Hors ligne"}
                </InfoPill>
              </div>
              <div className="space-y-2 text-[14px] text-white/85">
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Depart conseille</span>
                  <strong>{dashboard?.recommended_departure ?? "—"}</strong>
                </div>
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Trafic</span>
                  <strong>{dashboard?.traffic_label ?? "—"}</strong>
                </div>
                <div className="flex items-center justify-between rounded-[14px] bg-black/10 px-4 py-3">
                  <span>Meteo</span>
                  <strong>{dashboard?.weather_label ?? "—"}</strong>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-green-300">Checklist pre-shift</div>
              <div className="space-y-3">
                {["Telephone charge", "Application GPS active", "Casque et gilet", "Solde data suffisant"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[14px] bg-black/10 px-4 py-3 text-[14px] text-white">
                    <CheckCircle2 size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell kicker="Classement" title="Top livreurs & score" accent="text-green-300">
          <div className="space-y-3">
            {leaderboard.length ? (
              leaderboard.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-extrabold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className={`text-[12px] font-semibold ${item.tone}`}>{item.badge}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-extrabold text-white">{item.score}</div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">Performance</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                Aucun classement backend disponible pour le moment.
              </div>
            )}
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionShell kicker="Carte rapide" title="Zone chaude & disponibilites">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-emerald-500/15 bg-[#0b1220] p-2 shadow-[0_18px_48px_rgba(16,185,129,.08)]">
              <TrackingMap
                destinationAddress={mapShipment?.delivery_address}
                destinationCity={mapShipment?.city}
                destinationLabel={mapShipment?.customer_name || "Client"}
                className="rounded-[22px] border-none"
                height={300}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {dashboard?.zone_heatmap?.length ? (
                dashboard.zone_heatmap.map((item) => (
                  <div key={item.zone} className="rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025))] p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.15em] text-emerald-300">
                      <MapPin size={13} />
                      {item.zone}
                    </div>
                    <div className="mt-3 text-[28px] font-extrabold text-white">{item.demand_percent}%</div>
                    <div className="mt-1 text-[12px] text-[#8B949E]">{item.hint}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 p-4 text-[13px] text-[#8B949E] md:col-span-3">
                  Aucune donnee de zone chaude n'est encore disponible.
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell kicker="Courses" title="Missions disponibles" accent="text-emerald-300">
          <div className="space-y-3">
            {(availableShipments.length ? availableShipments : activeShipments).slice(0, 4).map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                onClick={() => {
                  setTab("courses");
                  setSelectedShipmentId(shipment.id);
                }}
                className="w-full rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-white">Commande #{shipment.order}</div>
                    <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-extrabold text-emerald-300">
                      {formatXaf(Math.round(shipment.order_total_xaf * 0.08))}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">Estime</div>
                  </div>
                </div>
              </button>
            ))}
            {!availableShipments.length && !activeShipments.length ? (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] leading-6 text-[#8B949E]">
                Aucune mission visible dans ta zone pour le moment. Verifie que le livreur est disponible et que la
                commande est dans la meme ville que ton profil livreur.
              </div>
            ) : null}
          </div>
        </SectionShell>
      </section>
    </>
  );

  const renderTournee = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Route optimise" title="Ma tournee du jour">
        <div className="space-y-4">
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <InfoPill icon={Route} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {tourShipments.length} stop{tourShipments.length > 1 ? "s" : ""}
              </InfoPill>
              <InfoPill icon={Clock3}>{formatDuration(estimatedTourMinutes)}</InfoPill>
              <InfoPill icon={Navigation}>{activeDistanceKm.toFixed(1)} km</InfoPill>
            </div>
            <p className="mt-3 text-[14px] leading-7 text-white/80">
              {nextTourStop
                ? `Prochain arret conseille: ${nextTourStop.customer_name}, ${nextTourStop.delivery_address}.`
                : "Aucune mission active pour le moment. Les prochaines livraisons assignees apparaitront ici."}
            </p>
          </div>
          {tourShipments.length ? (
            tourShipments.slice(0, 5).map((shipment, index) => (
              <button
                key={shipment.id}
                type="button"
                onClick={() => {
                  setSelectedShipmentId(shipment.id);
                  setTab("courses");
                }}
                className="flex w-full gap-4 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-extrabold text-emerald-300">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{shipment.customer_name}</div>
                      <div className="mt-1 text-[12px] text-[#8B949E]">Commande #{shipment.order}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                      {statusLabel(shipment.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-white/60">
                    <span>{shipment.city || courierProfile?.city || "Zone non renseignee"}</span>
                    <span>•</span>
                    <span>
                      ETA recommandee: {formatDuration(Math.max((index + 1) * (dashboard?.average_delivery_minutes ?? 18), 12))}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : availableShipments.length ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-sky-500/20 bg-sky-500/5 p-4 text-[13px] leading-6 text-sky-100">
                Aucune mission n'est encore dans ta tournee, mais {availableShipments.length} livraison
                {availableShipments.length > 1 ? "s" : ""} disponible{availableShipments.length > 1 ? "s" : ""} attend
                {availableShipments.length > 1 ? "ent" : ""} une prise en charge.
              </div>
              {availableShipments.slice(0, 5).map((shipment, index) => (
                <div
                  key={shipment.id}
                  className="flex gap-4 rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 font-extrabold text-sky-300">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">Commande #{shipment.order}</div>
                        <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.customer_name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClaimShipment(shipment.id)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-full bg-[linear-gradient(135deg,#3B82F6,#1D4ED8)] px-4 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === "CLAIM" ? "Prise..." : "Prendre"}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] leading-6 text-[#8B949E]">{shipment.delivery_address}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
              Aucune etape de tournee disponible. Les commandes visibles ici doivent etre dans ta ville livreur
              ({currentCourierCity}) ou dans tes zones.
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell kicker="Terrain" title="Conseils live & regroupement" accent="text-orange-300">
        <div className="space-y-4">
          {tourInsights.map((item) => (
            <div key={item.title} className={`rounded-[18px] border p-4 ${item.tone}`}>
              <div className="font-bold text-white">{item.title}</div>
              <div className="mt-2 text-[13px] leading-6 text-white/75">{item.body}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-emerald-500/15 bg-[#0f1722] p-4">
            <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">Prochaine action</div>
            <button
              type="button"
              onClick={() => setTab(nextTourStop ? "courses" : "map")}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
            >
              {nextTourStop ? "Ouvrir la mission active" : "Ouvrir la navigation"}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderCourses = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Operations" title="Toutes les courses">
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: "Actives", count: activeShipments.length, tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
            { label: "Disponibles", count: availableShipments.length, tone: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
            { label: "Historique", count: completedShipments.length, tone: "border-white/10 bg-white/5 text-white" },
          ].map((pill) => (
            <div key={pill.label} className={`rounded-full border px-4 py-2 text-[12px] font-bold ${pill.tone}`}>
              {pill.label} · {pill.count}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {visibleCourseShipments.map((shipment) => {
            const isAvailable = availableShipmentsFromAPI.some((available) => available.id === shipment.id);
            return (
            <button
              key={shipment.id}
              type="button"
              onClick={() => setSelectedShipmentId(shipment.id)}
              className={`w-full rounded-[18px] border p-4 text-left transition ${
                selectedShipment?.id === shipment.id
                  ? "border-orange-500/35 bg-orange-500/8"
                  : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-extrabold text-white">Commande #{shipment.order}</div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.customer_name}</div>
                  <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#8B949E]">
                    <MapPin size={12} />
                    {shipment.delivery_address}
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {isAvailable ? "Disponible" : statusLabel(shipment.status)}
                </span>
              </div>
            </button>
            );
          })}
          {!visibleCourseShipments.length ? (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] leading-6 text-[#8B949E]">
              Aucune course trouvee. Sur Render, une nouvelle commande apparait ici seulement si son mode est
              livraison et si sa ville correspond a ton profil livreur ({currentCourierCity}) ou a tes zones.
            </div>
          ) : null}
        </div>
      </SectionShell>

      <SectionShell kicker="Mission selectionnee" title={selectedShipment ? `Commande #${selectedShipment.order}` : "Aucune mission"} accent="text-orange-300">
        {selectedShipment ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Client</div>
                <div className="mt-2 font-semibold text-white">{selectedShipment.customer_name}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">{selectedShipment.customer_phone}</div>
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Valeur commande</div>
                <div className="mt-2 text-[20px] font-extrabold text-emerald-300">{formatXaf(selectedShipment.order_total_xaf)}</div>
                <div className="mt-1 text-[12px] text-white/55">Commission estimee: {formatXaf(Math.round(selectedShipment.order_total_xaf * 0.08))}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {selectedIsAvailable && selectedShipment.status === "CREATED" ? (
                <button
                  type="button"
                  onClick={() => handleClaimShipment(selectedShipment.id)}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#3B82F6,#1D4ED8)] px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(59,130,246,.28)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "CLAIM" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {actionLoading === "CLAIM" ? "Prise en charge..." : "Prendre la mission"}
                </button>
              ) : null}
              {selectedShipment.status === "ASSIGNED" && !selectedShipmentAccepted ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("ACCEPT")}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,185,129,.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "ACCEPT" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {actionLoading === "ACCEPT" ? "Validation..." : "Accepter la mission"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DECLINE")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "DECLINE" ? "Refus..." : "Refuser"}
                  </button>
                </>
              ) : null}
              {selectedShipment.status === "ASSIGNED" && selectedShipmentAccepted ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-[12px] font-extrabold text-emerald-300">
                  <BadgeCheck size={14} />
                  Mission acceptee
                </div>
              ) : null}
              {(selectedShipment.status === "PICKED_UP" || selectedShipment.status === "ASSIGNED") && (
                <button
                  type="button"
                  onClick={() => handleShipmentAction("PICKED_UP")}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-[12px] font-extrabold text-amber-300 transition hover:-translate-y-0.5 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "PICKED_UP" ? <LoaderCircle size={14} className="animate-spin" /> : <Package size={14} />}
                  {actionLoading === "PICKED_UP" ? "Enregistrement..." : "Marquer pris en charge"}
                </button>
              )}
              {selectedShipment.status === "PICKED_UP" && (
                <button
                  type="button"
                  onClick={() => handleShipmentAction("OUT_FOR_DELIVERY")}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-[12px] font-extrabold text-orange-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "OUT_FOR_DELIVERY" ? <LoaderCircle size={14} className="animate-spin" /> : <Truck size={14} />}
                  {actionLoading === "OUT_FOR_DELIVERY" ? "Mise a jour..." : "Marquer en cours de livraison"}
                </button>
              )}
              {selectedShipment.status === "OUT_FOR_DELIVERY" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DELIVERED")}
                    disabled={Boolean(actionLoading)}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,185,129,.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "DELIVERED" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {actionLoading === "DELIVERED" ? "Certification..." : "Certifier colis remis"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("FAILED")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "FAILED" ? "Signalement..." : "Marquer echec"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleContactClient}
                disabled={contactLoading || !selectedShipment.customer_phone}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contactLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Phone size={14} />}
                {contactLoading ? "Ouverture..." : "Contacter le client"}
              </button>
            </div>
            {actionFeedback ? (
              <div className="mt-4 rounded-[16px] border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-[13px] font-semibold text-emerald-300 animate-pulse">
                {actionFeedback}
              </div>
            ) : null}

            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#8B949E]">
                Ajouter une note ou une position
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Ex: client joint, arrivee estimee 12 min"
                  className="flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
                />
                <button
                  type="button"
                  onClick={() => handleShipmentAction("NOTE")}
                  disabled={Boolean(actionLoading) || !noteDraft.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-white px-5 py-3 text-[12px] font-extrabold text-[#0D1117] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "NOTE" ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {actionLoading === "NOTE" ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
            Aucune course selectionnee.
          </div>
        )}
      </SectionShell>
    </section>
  );

  const renderScanner = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Verification colis" title="Scanner QR">
        <div className="rounded-[28px] border border-emerald-500/20 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,.18),_transparent_55%),#0d1520] p-6">
          <div className="mx-auto flex h-[280px] max-w-[320px] items-center justify-center rounded-[28px] border-2 border-dashed border-emerald-400/40 bg-black/20">
            <div className="text-center">
              <QrCode size={80} className="mx-auto text-emerald-300" />
              <div className="mt-4 text-[14px] font-bold text-white">Place le QR du colis dans la zone de scan</div>
              <div className="mt-2 text-[12px] text-[#8B949E]">Le systeme confirme le retrait, la remise ou le retour.</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              placeholder="Ex: BLV-12, SHIP-4 ou 12"
              className="rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
            />
            <div className="flex flex-wrap gap-2">
              {[
                ["PICKED_UP", "Prise en charge"],
                ["OUT_FOR_DELIVERY", "En livraison"],
                ["DELIVERED", "Livree"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScanAction(value as "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED")}
                  className={`rounded-full border px-4 py-2 text-[12px] font-bold ${
                    scanAction === value
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleScanShipment}
              className="rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
            >
              Traiter le scan test
            </button>
            <InfoPill icon={ScanLine}>Mode camera HD</InfoPill>
            <InfoPill icon={ShieldCheck}>Scan securise</InfoPill>
          </div>
          {scanFeedback ? <div className="mt-4 text-[13px] text-emerald-300">{scanFeedback}</div> : null}
        </div>
      </SectionShell>

      <SectionShell kicker="Historique" title="Derniers scans" accent="text-sky-300">
        <div className="space-y-3">
          {(selectedShipment ? [selectedShipment] : shipments.slice(0, 1)).concat(shipments.slice(1, 4)).map((shipment, index) => (
            <div key={`${shipment.id}-${index}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-white">QR Commande #{shipment.order}</div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {statusLabel(shipment.status)}
                </span>
              </div>
              <div className="mt-2 text-[12px] text-[#8B949E]">{new Date().toLocaleString("fr-FR")}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-orange-500/20 bg-orange-500/5 p-4 text-[13px] leading-6 text-white/80">
            Conseil: scanne toujours au retrait et a la remise pour horodater automatiquement la mission.
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderMap = () => (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionShell kicker="Navigation" title="Carte & itineraire">
        <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-emerald-500/15 bg-[#0b1220] p-2 shadow-[0_18px_48px_rgba(16,185,129,.08)]">
            <TrackingMap
              destinationAddress={mapShipment?.delivery_address}
              destinationCity={mapShipment?.city}
              destinationLabel={mapShipment?.customer_name || "Client"}
              className="rounded-[22px] border-none"
              height={420}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {zones.map((zone, index) => (
              <div key={zone} className="rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] p-4">
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-emerald-300">{zone}</div>
                <div className="mt-3 text-[24px] font-extrabold text-white">{index + 3} hotspots</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">Heure optimale: {11 + index}h - {15 + index}h</div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Aide conduite" title="Meilleurs choix terrain" accent="text-green-300">
        <div className="space-y-3">
          {[
            "Contourner le carrefour Warda entre 17h10 et 18h.",
            "Zone Bastos plus rentable en debut d'apres-midi.",
            "Relancer la navigation si GPS faible sous tunnel.",
            "Mode pluie disponible automatiquement si precipitation detectee.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <Navigation size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderReseau = () => {
    const shops = network?.shops ?? [];
    const relayPoints = network?.relay_points ?? [];

    return (
      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionShell kicker="Reseau terrain" title="Boutiques partenaires">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Boutiques</div>
              <div className="mt-2 text-[24px] font-extrabold text-emerald-300">{shops.length}</div>
            </div>
            <div className="rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Points relais</div>
              <div className="mt-2 text-[24px] font-extrabold text-sky-300">{relayPoints.length}</div>
            </div>
            <div className="rounded-[18px] border border-orange-500/15 bg-orange-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Boutiques en ligne</div>
              <div className="mt-2 text-[24px] font-extrabold text-orange-300">
                {shops.filter((item) => item.is_online).length}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {shops.length ? (
              shops.map((shop) => (
                <div key={`${shop.vendor_id}-${shop.location_name || shop.address}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{shop.vendor_name}</div>
                      <div className="mt-1 text-[12px] text-emerald-300">
                        {shop.location_name || "Boutique principale"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        shop.is_online
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {shop.is_online ? "En ligne" : "Hors ligne"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">Adresse</div>
                      <div className="mt-1">{shop.address || "Adresse non renseignee"}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">Ville</div>
                      <div className="mt-1">{shop.city || "Ville non renseignee"}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">Telephone</div>
                      <div className="mt-1">{shop.phone || "Non renseigne"}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">Coordonnees GPS</div>
                      <div className="mt-1">
                        {shop.latitude !== null && shop.longitude !== null
                          ? `${shop.latitude}, ${shop.longitude}`
                          : "Non renseignees"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                Aucune boutique approuvee n'est encore remontee par le backend.
              </div>
            )}
          </div>
        </SectionShell>

        <SectionShell kicker="Points relais" title="Relais BelivaY observes" accent="text-sky-300">
          <div className="space-y-3">
            {relayPoints.length ? (
              relayPoints.map((relay) => (
                <div key={`${relay.name}-${relay.city}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{relay.name}</div>
                      <div className="mt-1 text-[12px] text-[#8B949E]">{relay.city || "Ville non renseignee"}</div>
                    </div>
                    <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
                      {relay.shipments_count} mission{relay.shipments_count > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="mt-3 rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                    {relay.address || relay.name}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                Aucun point relais n'est encore enregistre dans les shipments. Des qu'un `relay_point` sera utilise,
                il apparaitra ici.
              </div>
            )}
          </div>
        </SectionShell>
      </section>
    );
  };

  const renderGains = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
      <SectionShell kicker="Monetisation" title="Gains & rentabilite">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total gains"
            value={formatXaf(dashboard?.month_earnings_xaf ?? earnings.total)}
            icon={Wallet}
            tone="text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
          />
          <MetricCard label="Aujourd'hui" value={formatXaf(earnings.today)} icon={BadgeDollarSign} tone="text-orange-300 bg-orange-500/10 border-orange-500/20" />
          <MetricCard label="En attente" value={formatXaf(earnings.pending)} icon={CreditCard} tone="text-sky-300 bg-sky-500/10 border-sky-500/20" />
        </div>
        <div className="mt-5 rounded-[22px] border border-white/5 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#8B949E]">Objectif du mois</div>
            <div className="text-right">
              <div className="text-[13px] font-bold text-white">{dashboard?.monthly_goal_percent ?? 0}%</div>
              <div className="text-[11px] text-[#8B949E]">
                {formatXaf(dashboard?.month_earnings_xaf ?? 0)} / {formatXaf(dashboard?.monthly_target_xaf ?? 0)}
              </div>
            </div>
          </div>
          <div className="h-3 rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)]"
              style={{ width: `${dashboard?.monthly_goal_percent ?? 0}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {(dashboard?.weekly_progress ?? []).map((week) => (
              <div key={week.label} className="rounded-[16px] border border-white/5 bg-black/10 p-3">
                <div className="flex h-28 items-end">
                  <div
                    className="w-full rounded-t-[14px] bg-[linear-gradient(180deg,#6EE7B7,#10B981)]"
                    style={{ height: `${Math.max(week.percent, 8)}%` }}
                  />
                </div>
                <div className="mt-3 text-center text-[12px] font-bold text-white">{week.label}</div>
                <div className="mt-1 text-center text-[11px] text-[#8B949E]">{formatXaf(week.earnings_xaf)}</div>
                <div className="mt-1 text-center text-[10px] uppercase tracking-[0.12em] text-emerald-300">
                  {week.deliveries} livraison{week.deliveries > 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker="Versements" title="Mobile Money & historique" accent="text-sky-300">
        <div className="space-y-3">
          {completedShipments.slice(0, 5).map((shipment) => (
            <div key={shipment.id} className="flex items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <div>
                <div className="text-[13px] font-bold text-white">Commande #{shipment.order}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">
                  {shipment.status === "DELIVERED" ? "Versement programme" : "Pas de versement"}
                </div>
              </div>
              <div className={`text-[18px] font-extrabold ${shipment.status === "DELIVERED" ? "text-[#6EE7B7]" : "text-red-300"}`}>
                {shipment.status === "DELIVERED" ? `+${formatXaf(Math.round(shipment.order_total_xaf * 0.08))}` : "0 FCFA"}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderProfil = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Identite" title="Mon Profil">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Telephone", value: courierProfile?.phone || user?.phone || "—", icon: Phone },
            { label: "Ville", value: courierProfile?.city || "Yaounde", icon: MapPin },
            { label: "Zones", value: zones.join(", "), icon: Truck },
            { label: "Vehicule", value: courierProfile ? VEHICLE_LABELS[courierProfile.vehicle_type] || courierProfile.vehicle_type : "Moto", icon: Bike },
            { label: "Piece d'identite", value: courierProfile?.id_card || "En attente", icon: FileBadge2 },
            { label: "Statut", value: isApprovedCourier ? "Approuve" : "En validation", icon: BadgeCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#8B949E]">
                  <Icon size={13} className="text-[#6EE7B7]" />
                  {item.label}
                </div>
                <div className="text-[14px] font-semibold text-white">{item.value}</div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell kicker="Reputation" title="Badges & pouvoir metier" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Voir vos livraisons assignees",
            "Accepter ou refuser une mission",
            "Marquer pris en charge, en livraison, livre ou echec",
            "Ajouter une note ou une position",
            "Contacter client et vendeur si necessaire",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-emerald-500/15 bg-emerald-500/5 p-4 text-[13px] text-white">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#6EE7B7]" />
              {item}
            </div>
          ))}
          {[
            "Modifier les produits ou les prix",
            "Voir toutes les commandes de tous les vendeurs",
            "Changer les paiements ou l'escrow",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-red-500/15 bg-red-500/5 p-4 text-[13px] text-white">
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderFormation = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Academie" title="Formation livreur">
        <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">Progression</div>
              <div className="mt-1 text-[26px] font-extrabold text-white">72%</div>
            </div>
            <BookOpen size={28} className="text-emerald-300" />
          </div>
          <div className="mt-4 h-3 rounded-full bg-black/20">
            <div className="h-full w-[72%] rounded-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)]" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            "Retrait et verification du colis",
            "Navigation intelligente et etiquette client",
            "Gestion des incidents et preuves",
            "Securite nuit & bouton SOS",
          ].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{item}</div>
              <div className="text-[12px] font-bold text-[#8B949E]">{index < 2 ? "Valide" : "A terminer"}</div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Certification" title="Quiz & badges" accent="text-sky-300">
        <div className="space-y-3">
          {[
            "Badge Ponctualite",
            "Badge Communication client",
            "Badge Securite terrain",
          ].map((item) => (
            <div key={item} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-[14px] font-semibold text-white">
              {item}
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderNotifications = () => (
    <SectionShell kicker="Centre d'alertes" title="Notifications">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[12px] text-[#8B949E]">
          {notifications.length} notification{notifications.length > 1 ? "s" : ""} · {unreadNotifications} non lue{unreadNotifications > 1 ? "s" : ""}
        </div>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllNotificationsRead}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-white"
          >
            Tout marquer comme lu
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {notifications.length ? (
          notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNotificationClick(item)}
              className={`flex w-full gap-4 rounded-[18px] border p-4 text-left transition hover:bg-white/[0.05] ${
                item.is_read ? "border-white/5 bg-white/[0.03]" : "border-emerald-500/15 bg-emerald-500/5"
              }`}
            >
              <Bell size={18} className={`mt-0.5 shrink-0 ${notificationTone(item.notification_type)}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-white">{item.title}</div>
                  <div className="text-[11px] text-[#8B949E]">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="mt-1 text-[13px] leading-6 text-white/75">{item.message}</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">
                  {item.notification_type}
                  {!item.is_read ? " · Nouveau" : ""}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
            Aucune notification disponible pour le moment.
          </div>
        )}
      </div>
    </SectionShell>
  );

  const renderIncidents = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Assistant terrain" title="Incidents">
        <div className="space-y-3">
          {[
            "Client absent",
            "Adresse introuvable",
            "Colis endommage",
            "Route bloquee / trafic severe",
          ].map((item) => (
            <div key={item} className="rounded-[18px] border border-red-500/15 bg-red-500/5 p-4">
              <div className="font-bold text-white">{item}</div>
              <div className="mt-2 text-[13px] text-white/75">
                Ouvre un protocole rapide avec preuves, photo, horodatage et message automatique.
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Protocoles" title="Actions conseillees" accent="text-sky-300">
        <div className="space-y-3">
          {[
            "Appeler le client 2 fois avant de cloturer un echec.",
            "Joindre une photo geolocalisee si depot refuse.",
            "Signaler le vendeur si le colis ne correspond pas.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-orange-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderLitiges = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.95fr]">
      <SectionShell kicker="Mediation" title="Litiges livreur">
        <div className="space-y-3">
          {disputes.length ? (
            disputes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDispute(item)}
                className="flex w-full gap-4 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
              >
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-300" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-white">{item.ref} · {item.label}</div>
                    <div className="text-[12px] font-bold text-orange-300">{item.status_display}</div>
                  </div>
                  <div className="mt-1 text-[13px] leading-6 text-white/75">{item.detail}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">
                    {item.reason_display} · {new Date(item.updated_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
              Aucun litige lie a tes commandes assignees pour le moment.
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell kicker="Cadre metier" title="Droits & obligations" accent="text-orange-300">
        <div className="space-y-3">
          {[
            "Toujours fournir les preuves de passage ou de remise.",
            "Ne jamais cloturer un litige hors protocole support.",
            "Le livreur peut repondre, pas arbitrer seul.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div className="text-[13px] leading-6 text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderSecurite = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker="Urgence" title="Securite SOS">
        <div className="rounded-[26px] border border-red-500/20 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,.18),_transparent_48%),#1c1013] p-6 text-center">
          <button
            type="button"
            onClick={handleSOSAlert}
            disabled={sosLoading || !isApprovedCourier}
            className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-red-400/30 bg-red-500/15 text-red-300 shadow-[0_0_0_14px_rgba(239,68,68,.06)] transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sosLoading ? <LoaderCircle size={54} className="animate-spin" /> : <Siren size={54} />}
          </button>
          <div className="mt-5 text-[22px] font-extrabold text-white">Declencher une alerte SOS</div>
          <div className="mt-2 text-[13px] leading-6 text-white/70">
            Envoie une alerte backend au support securite avec ton profil livreur et ta zone actuelle.
          </div>
          {sosFeedback ? <div className="mt-4 text-[13px] font-semibold text-red-200">{sosFeedback}</div> : null}
        </div>
      </SectionShell>

      <SectionShell kicker="Protection" title="Contacts & procedures" accent="text-sky-300">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Livreur", firstName],
              ["Ville", currentCourierCity],
              ["Mode disponible", currentIsOnline ? "Actif" : "Inactif"],
              ["GPS", currentGpsGranted ? "Autorise" : "A verifier"],
              ["Camera", currentCameraGranted ? "Autorisee" : "A verifier"],
              ["Support surete", "24/7"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8B949E]">{label}</div>
                <div className="mt-2 text-[14px] font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4 text-[13px] leading-6 text-white/80">
            Chaque alerte SOS est enregistree en base et ajoute une notification support a ton compte.
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderParametres = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker="Configuration backend" title="Parametres livreur">
        <div className="grid gap-3 md:grid-cols-2">
          {([
            ["Ville", currentCourierCity, MapPin],
            ["Vehicule", VEHICLE_LABELS[currentCourierVehicle] || currentCourierVehicle, Bike],
            ["Statut", currentIsOnline ? "Disponible" : "Hors ligne", Gauge],
            ["Langue", currentCourierLanguage.toUpperCase(), Settings2],
            ["GPS", currentGpsGranted ? "Autorise" : "Non autorise", Navigation],
            ["Camera", currentCameraGranted ? "Autorisee" : "Non autorisee", ScanLine],
          ] as Array<[string, string, ComponentType<{ size?: number; className?: string }>]>) .map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#8B949E]">
                <Icon size={14} />
                {label}
              </div>
              <div className="mt-2 text-[18px] font-extrabold text-white">{value}</div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker="Actions backend" title="Reglages frequents" accent="text-orange-300">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => updateCourierSettings("online", { is_online: !currentIsOnline })}
            className="flex w-full items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
          >
            <span>{currentIsOnline ? "Desactiver le mode disponible" : "Activer le mode disponible"}</span>
            {settingsSaving === "online" ? <LoaderCircle size={15} className="animate-spin" /> : <ChevronRight size={15} />}
          </button>
          <div className="grid gap-2 md:grid-cols-2">
            {(["fr", "en"] as const).map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => updateCourierSettings("language", { preferred_language: language })}
                className={`rounded-[16px] border p-4 text-left text-[13px] font-bold transition ${
                  currentCourierLanguage === language
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-white/5 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                Interface {language.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
            <label className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8B949E]">Zone principale</label>
            <div className="mt-3 flex gap-2">
              <input
                defaultValue={currentCourierCity}
                onBlur={(event) => {
                  const city = event.target.value.trim();
                  if (city && city !== currentCourierCity) {
                    updateCourierSettings("city", { city, zones: [city, ...currentCourierZones.filter((zone) => zone !== city)] });
                  }
                }}
                className="min-w-0 flex-1 rounded-[12px] border border-white/10 bg-[#0D1117] px-3 py-2 text-[13px] text-white outline-none"
              />
              {settingsSaving === "city" ? <LoaderCircle size={18} className="mt-2 animate-spin text-orange-300" /> : null}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={() => updateCourierSettings("gps", { gps_permission_granted: !currentGpsGranted })}
              className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
            >
              GPS: {currentGpsGranted ? "autorise" : "a verifier"}
            </button>
            <button
              type="button"
              onClick={() => updateCourierSettings("camera", { camera_permission_granted: !currentCameraGranted })}
              className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
            >
              Camera: {currentCameraGranted ? "autorisee" : "a verifier"}
            </button>
          </div>
          {settingsFeedback ? <div className="text-[13px] font-semibold text-emerald-300">{settingsFeedback}</div> : null}
        </div>
      </SectionShell>
    </section>
  );

  const renderCurrentTab = () => {
    switch (tab) {
      case "dashboard":
        return renderDashboard();
      case "tournee":
        return renderTournee();
      case "courses":
        return renderCourses();
      case "scanner":
        return renderScanner();
      case "map":
        return renderMap();
      case "reseau":
        return renderReseau();
      case "gains":
        return renderGains();
      case "profil":
        return renderProfil();
      case "formation":
        return renderFormation();
      case "notifications":
        return renderNotifications();
      case "incidents":
        return renderIncidents();
      case "litiges":
        return renderLitiges();
      case "securite":
        return renderSecurite();
      case "parametres":
        return renderParametres();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#101828_0%,#070b14_55%,#04070d_100%)] text-[#E6EDF3]">
      <div className="fixed inset-x-0 top-0 z-[1000] h-1 bg-white/5">
        <div
          className="h-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className="fixed inset-x-0 top-1 z-[950] flex h-[58px] items-center gap-4 border-b border-emerald-500/10 bg-[linear-gradient(135deg,#02120d,#05261c_55%,#0b2f25)] px-4 shadow-[0_2px_22px_rgba(0,0,0,.4)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 items-center justify-center rounded-2xl bg-emerald-500/10 px-2">
            <img
              src="/belivay-logo.png"
              alt="BelivaY"
              className="h-7 w-auto"
              style={{ filter: "brightness(0) saturate(100%) invert(63%) sepia(54%) saturate(673%) hue-rotate(104deg) brightness(93%) contrast(92%)" }}
            />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-emerald-300">Espace livreur</div>
            <div className="text-[11px] text-white/70">{isApprovedCourier ? "" : "Validation du profil en attente"}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr")}
          className="ml-auto flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-black tracking-[0.14em] text-white transition hover:bg-white/15 md:hidden"
          aria-label="Changer de langue"
        >
          {i18n.language.startsWith("fr") ? "FR" : "EN"}
        </button>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
            {currentIsOnline ? "Disponible" : "Hors ligne"}
          </div>
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadNotifications > 0 ? (
              <span className="absolute right-[-2px] top-[-2px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black text-[#022c22]">
                {unreadNotifications}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr")}
            className="flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-black tracking-[0.14em] text-white transition hover:bg-white/15"
            aria-label="Changer de langue"
          >
            {i18n.language.startsWith("fr") ? "FR" : "EN"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Changer de thème"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setTab("profil")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Compte utilisateur"
          >
            <User size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-white/15"
          >
            Mon compte client
          </button>
        </div>
      </header>

      {selectedNotification ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[24px] border border-emerald-500/15 bg-[#0D1117] p-5 shadow-[0_28px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${notificationTone(selectedNotification.notification_type)}`}>
                  {selectedNotification.notification_type}
                </div>
                <h3 className="text-[22px] font-extrabold text-white">{selectedNotification.title}</h3>
                <div className="mt-1 text-[12px] text-[#8B949E]">
                  {new Date(selectedNotification.created_at).toLocaleString("fr-FR")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Fermer la notification"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-[14px] leading-7 text-white/85">
              {selectedNotification.message}
            </div>
            {selectedNotification.action_url ? (
              <div className="mt-4 rounded-[16px] border border-white/5 bg-white/[0.03] p-3 text-[12px] text-[#8B949E]">
                Reference backend : {selectedNotification.action_url}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedDispute ? (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[24px] border border-orange-500/15 bg-[#0D1117] p-5 shadow-[0_28px_80px_rgba(0,0,0,.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-orange-300">
                  {selectedDispute.status_display}
                </div>
                <h3 className="text-[22px] font-extrabold text-white">{selectedDispute.ref} · {selectedDispute.label}</h3>
                <div className="mt-1 text-[12px] text-[#8B949E]">
                  {new Date(selectedDispute.updated_at).toLocaleString("fr-FR")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Fermer le litige"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-[14px] leading-7 text-white/85">
              {selectedDispute.detail}
            </div>
            <div className="mt-4 rounded-[16px] border border-white/5 bg-white/[0.03] p-3 text-[12px] text-[#8B949E]">
              Motif : {selectedDispute.reason_display}
            </div>
          </div>
        </div>
      ) : null}

      <aside className="fixed bottom-0 left-0 top-[59px] hidden w-[232px] border-r border-emerald-500/8 bg-[#0A1020] lg:block">
        <div className="m-4 rounded-[14px] border border-emerald-500/15 bg-emerald-500/5 p-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] text-lg font-extrabold text-white">
            {user?.first_name?.[0] || user?.username?.[0] || "L"}
          </div>
          <div className="font-bold text-white">
            {user?.first_name || "Livreur"} {user?.last_name || ""}
          </div>
          <div className="mt-1 text-[12px] text-emerald-300">
            {courierProfile ? `${currentCourierCity} · ${VEHICLE_LABELS[currentCourierVehicle] || currentCourierVehicle}` : "Demande a finaliser"}
          </div>
        </div>

        <nav className="px-3 pb-8">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left text-[13px] font-semibold transition ${
                  active
                    ? "border-l-[3px] border-emerald-300 bg-emerald-500/10 text-emerald-300"
                    : "text-[#8B949E] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="px-4 pb-24 pt-[84px] lg:ml-[232px] lg:pb-12 lg:px-6">
        {booting ? (
          <div className="mx-auto max-w-[1180px] animate-pulse space-y-4">
            <div className="h-32 rounded-[24px] bg-white/5" />
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-[20px] bg-white/5" />
              ))}
            </div>
            <div className="h-[420px] rounded-[24px] bg-white/5" />
          </div>
        ) : (
          <div className="mx-auto max-w-[1180px] space-y-5">
            <section className="overflow-hidden rounded-[28px] border border-emerald-500/10 bg-[linear-gradient(135deg,#0E1522,#10251d_58%,#111827)] p-6 shadow-[0_20px_56px_rgba(0,0,0,.32)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
                    <ShieldCheck size={13} />
                    Acteur livreur
                  </div>
                  <h1 className="text-[30px] font-extrabold tracking-tight text-white">
                    {TAB_LABELS[tab]}
                  </h1>
                  <p className="mt-2 max-w-[760px] text-[14px] leading-7 text-[#8B949E]">
                    Cette interface reprend toutes les vues du modele BelivaY Livreur: operations, securite,
                    gains, communication, navigation et suivi metier du livreur.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-emerald-500/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Ville</div>
                    <div className="mt-2 text-[22px] font-extrabold text-emerald-300">{currentCourierCity}</div>
                  </div>
                  <div className="rounded-[20px] border border-green-500/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Vehicule</div>
                    <div className="mt-2 text-[22px] font-extrabold text-green-300">
                      {VEHICLE_LABELS[currentCourierVehicle] || currentCourierVehicle}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-emerald-500/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">Statut</div>
                    <div className="mt-2 text-[22px] font-extrabold text-emerald-300">
                      {currentIsOnline ? "Disponible" : isApprovedCourier ? "Hors ligne" : "Pending"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {renderCurrentTab()}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-[900] border-t border-emerald-500/10 bg-[#07130f]/95 shadow-[0_-8px_30px_rgba(0,0,0,.35)] backdrop-blur lg:hidden">
        <div className="flex h-[58px] items-center px-2">
          {mobileTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => { setTab(item.id); setMoreOpen(false); }} className="flex flex-1 flex-col items-center justify-center gap-[3px]">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-emerald-500 text-[#022c22]" : "text-[#8B949E]"}`}>
                  <Icon size={17} />
                </span>
                <span className={`max-w-full truncate text-[8px] font-bold ${active ? "text-emerald-300" : "text-[#8B949E]"}`}>{item.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-[3px]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8B949E]">
              <MoreHorizontal size={17} />
            </span>
            <span className="text-[8px] font-bold text-[#8B949E]">Plus</span>
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      <div
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm transition lg:hidden ${moreOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <div className={`fixed inset-x-0 bottom-0 z-[1301] max-h-[72vh] overflow-y-auto rounded-t-[24px] border-t border-emerald-500/15 bg-[#0A1020] pb-[calc(18px+env(safe-area-inset-bottom))] shadow-[0_-18px_60px_rgba(0,0,0,.45)] transition-transform lg:hidden ${moreOpen ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto my-3 h-1 w-9 rounded-full bg-white/15" />
        {mobileMoreTabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); setMoreOpen(false); }}
              className={`flex w-full items-center gap-3 px-5 py-3 text-left ${active ? "text-emerald-300" : "text-white/75"}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-emerald-500/20" : "bg-white/5"}`}>
                <Icon size={18} />
              </span>
              <span className="flex-1 text-[13px] font-bold">{item.label}</span>
              <ChevronRight size={14} className="text-white/35" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
