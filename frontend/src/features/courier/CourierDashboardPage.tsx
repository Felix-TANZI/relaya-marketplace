import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { BackgroundGeolocation } from "@/lib/backgroundGeolocation";
import { enqueueEvidence, syncPendingEvidence } from "@/lib/evidenceQueue";
import EvidenceRequestInbox from "@/components/disputes/EvidenceRequestInbox";
import AppDownloadBanner from "@/components/AppDownloadBanner";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bike,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileBadge2,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Navigation,
  Package,
  Phone,
  QrCode,
  Route,
  ScanLine,
  Settings2,
  ShieldCheck,
  Send,
  Sun,
  Moon,
  Menu as MenuIcon,
  Store,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import TrackingMap from "@/components/TrackingMap";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
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
import { customerApi, type OrderChatMessage } from "@/services/api/customer";
import { PayoutAccountVerificationCard } from "@/components/payments/PayoutAccountVerificationCard";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import * as QRCode from "qrcode";

import {
  COURIER_TABS,
  TAB_LABEL_KEYS,
  type CourierTab,
} from './courierNav';
import CourierSidebar from './CourierSidebar';
import CourierDrawer from './CourierDrawer';
import CourierMobileNav, { COURIER_TABBAR_IDS } from './CourierMobileNav';
import CourierProfileSheet from './CourierProfileSheet';

/** Mentions legales du pied de menu, communes a la colonne et au tiroir. */
const COURIER_FOOTER_KEYS = [
  "cr1_dashboard.footer.version",
  "cr1_dashboard.footer.partner",
  "cr1_dashboard.footer.anonymity",
];

function getInitialCourierTab(): CourierTab {
  const requested = new URLSearchParams(window.location.search).get("tab") as CourierTab | null;
  return requested && COURIER_TABS.includes(requested) ? requested : "dashboard";
}

const VEHICLE_LABEL_KEYS: Record<string, string> = {
  MOTORBIKE: "cr1_dashboard.vehicle.motorbike",
  CAR: "cr1_dashboard.vehicle.car",
  BIKE: "cr1_dashboard.vehicle.bike",
  TRICYCLE: "cr1_dashboard.vehicle.tricycle",
  VAN: "cr1_dashboard.vehicle.van",
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function vehicleLabel(t: TranslateFn, vehicle: string) {
  const key = VEHICLE_LABEL_KEYS[vehicle];
  return key ? t(key) : vehicle;
}

function statusLabel(t: TranslateFn, status: string) {
  switch (status) {
    case "ASSIGNED":
      return t("cr1_dashboard.status.assigned");
    case "PICKED_UP":
      return t("cr1_dashboard.status.picked_up");
    case "OUT_FOR_DELIVERY":
      return t("cr1_dashboard.status.out_for_delivery");
    case "DELIVERED":
      return t("cr1_dashboard.status.delivered");
    case "INCIDENT":
      return t("cr1_dashboard.status.incident");
    case "FAILED":
      return t("cr1_dashboard.status.failed");
    default:
      return t("cr1_dashboard.status.pending");
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
    case "INCIDENT":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusM = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatElapsedMinutes(t: TranslateFn, sinceMs: number) {
  const minutes = Math.floor((Date.now() - sinceMs) / 60000);
  if (minutes < 1) return t("cr1_dashboard.elapsed.now");
  if (minutes === 1) return t("cr1_dashboard.elapsed.one_minute");
  return t("cr1_dashboard.elapsed.minutes", { count: minutes });
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
            : action === "INCIDENT"
              ? "INCIDENT"
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
    <section className="relative overflow-hidden rounded-[28px] border border-emerald-100 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,.10)] dark:border-emerald-500/10 dark:bg-[linear-gradient(180deg,rgba(14,21,34,.98),rgba(9,14,26,.98))] dark:shadow-[0_24px_64px_rgba(0,0,0,.34)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,.12),transparent_52%)]" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_top_right,rgba(110,231,183,.08),transparent_60%)]" />
      <p className={`relative text-[11px] font-black uppercase tracking-[0.18em] ${accent}`}>{kicker}</p>
      <h2 className="relative mt-1 text-[24px] font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h2>
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
      {/* Libelle et icone sur la meme ligne : a deux cartes par rangee, une
          pastille posee au-dessus du texte mangeait la moitie de la carte. */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 text-[10px] font-bold uppercase leading-tight tracking-[0.12em] text-slate-600 dark:text-white/65 sm:text-[11px] sm:tracking-[0.16em]">
          {label}
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/40 text-slate-700 dark:bg-black/10 dark:text-white sm:h-11 sm:w-11 sm:rounded-2xl">
          <Icon className="h-4 w-4 sm:h-[19px] sm:w-[19px]" />
        </div>
      </div>
      <div className="relative mt-2 text-[22px] font-extrabold leading-none text-slate-950 dark:text-white sm:mt-3 sm:text-[24px]">{value}</div>
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
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [tab, setTab] = useState<CourierTab>(getInitialCourierTab);
  const [booting, setBooting] = useState(true);
  const [progress, setProgress] = useState(8);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
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
  const [pickupCodeDraft, setPickupCodeDraft] = useState("");
  const [capturedEvidence, setCapturedEvidence] = useState<Record<string, boolean>>({});
  const [pendingEvidenceCount, setPendingEvidenceCount] = useState(0);
  const [scanCode, setScanCode] = useState("");
  const [scanAction, setScanAction] = useState<"PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED">("PICKED_UP");
  const [scanFeedback, setScanFeedback] = useState<string>("");
  const [receiptQrDataUrl, setReceiptQrDataUrl] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [clientMessages, setClientMessages] = useState<OrderChatMessage[]>([]);
  const [clientReplyDraft, setClientReplyDraft] = useState("");
  const clientChatEndRef = useRef<HTMLDivElement | null>(null);
  const [disputePermissionStatus, setDisputePermissionStatus] = useState<Record<number, "locked" | "requested" | "granted">>({});
  const [disputeReplyDraft, setDisputeReplyDraft] = useState("");
  const [disputeFeedback, setDisputeFeedback] = useState("");
  const [trackingFeedback, setTrackingFeedback] = useState("");
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [lastLocationAt, setLastLocationAt] = useState<number | null>(null);
  const lastLocationPublishRef = useRef(0);
  const lastKnownPositionRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const gpsRetryTimeoutRef = useRef<number | null>(null);
  const gpsRetryDelayRef = useRef(10000);
  const [gpsRetryNonce, setGpsRetryNonce] = useState(0);

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
  const firstName = user?.first_name || user?.username || t("cr1_dashboard.common.courier_fallback_name");
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

  useEffect(() => {
    if (!selectedShipment || !currentGpsGranted || !currentIsOnline) return;
    if (!["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(selectedShipment.status)) return;

    const MAX_ACCURACY_M = 100;
    const MAX_PLAUSIBLE_SPEED_MPS = 60; // ~216 km/h : au-dela, on suppose un saut GPS aberrant

    let cancelled = false;
    let webWatchId: number | null = null;
    let nativeWatcherId: string | null = null;
    gpsRetryDelayRef.current = 10000;
    setGpsPermissionDenied(false);

    const isPlausibleFix = (lat: number, lng: number, accuracy: number | null, timestamp: number) => {
      if (accuracy != null && accuracy > MAX_ACCURACY_M) return false;
      const previous = lastKnownPositionRef.current;
      if (previous) {
        const elapsedS = (timestamp - previous.t) / 1000;
        if (elapsedS > 0) {
          const distanceM = haversineDistanceMeters(previous.lat, previous.lng, lat, lng);
          if (distanceM / elapsedS > MAX_PLAUSIBLE_SPEED_MPS) return false;
        }
      }
      return true;
    };

    const publishFix = (fix: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
      speed: number | null;
      heading: number | null;
      timestamp: number;
    }) => {
      const now = Date.now();
      if (now - lastLocationPublishRef.current < 5000) return;
      if (!isPlausibleFix(fix.latitude, fix.longitude, fix.accuracy, fix.timestamp)) return;
      lastLocationPublishRef.current = now;
      lastKnownPositionRef.current = { lat: fix.latitude, lng: fix.longitude, t: fix.timestamp };
      gpsRetryDelayRef.current = 10000;

      courierApi.publishLocation(selectedShipment.id, {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy_m: fix.accuracy,
        speed_mps: fix.speed,
        heading_deg: fix.heading,
        source: "DEVICE",
        captured_at: new Date(fix.timestamp).toISOString(),
      }).then((location) => {
        setLastLocationAt(Date.now());
        setTrackingFeedback(t("cr1_dashboard.map.position_shared_at", { time: new Date(location.captured_at).toLocaleTimeString("fr-FR") }));
        setShipments((current) => current.map((shipment) => shipment.id === selectedShipment.id
          ? {
              ...shipment,
              latest_location: location,
              location_history: [...shipment.location_history, location].slice(-100),
            }
          : shipment));
      }).catch(() => setTrackingFeedback(t("cr1_dashboard.map.position_send_failed")));
    };

    const scheduleWebRetry = () => {
      if (cancelled) return;
      const delay = gpsRetryDelayRef.current;
      gpsRetryTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) return;
        gpsRetryDelayRef.current = Math.min(delay * 2, 40000);
        startWebWatch();
      }, delay);
    };

    const startWebWatch = () => {
      if (!("geolocation" in navigator)) {
        setTrackingFeedback(t("cr1_dashboard.map.geolocation_unavailable"));
        return;
      }
      webWatchId = navigator.geolocation.watchPosition(
        (position) => {
          publishFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setGpsPermissionDenied(true);
            setTrackingFeedback(t("cr1_dashboard.map.authorize_location_web"));
            return;
          }
          setTrackingFeedback(t("cr1_dashboard.map.position_temporarily_unavailable_retry"));
          if (webWatchId != null) {
            navigator.geolocation.clearWatch(webWatchId);
            webWatchId = null;
          }
          scheduleWebRetry();
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
    };

    if (Capacitor.isNativePlatform()) {
      BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: t("cr1_dashboard.map.background_title"),
          backgroundMessage: t("cr1_dashboard.map.background_message"),
          requestPermissions: true,
          stale: false,
          distanceFilter: 10,
        },
        (location, error) => {
          if (cancelled) return;
          if (error) {
            if (error.code === "NOT_AUTHORIZED") {
              setGpsPermissionDenied(true);
              setTrackingFeedback(t("cr1_dashboard.map.authorize_location_native"));
              return;
            }
            setTrackingFeedback(t("cr1_dashboard.map.position_temporarily_unavailable"));
            return;
          }
          if (!location) return;
          publishFix({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.bearing,
            timestamp: location.time ?? Date.now(),
          });
        },
      ).then((id) => {
        if (cancelled) {
          BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
          return;
        }
        nativeWatcherId = id;
      }).catch(() => setTrackingFeedback(t("cr1_dashboard.map.native_gps_start_failed")));
    } else {
      startWebWatch();
    }

    return () => {
      cancelled = true;
      if (gpsRetryTimeoutRef.current != null) window.clearTimeout(gpsRetryTimeoutRef.current);
      if (webWatchId != null) navigator.geolocation.clearWatch(webWatchId);
      if (nativeWatcherId != null) BackgroundGeolocation.removeWatcher({ id: nativeWatcherId }).catch(() => {});
    };
  }, [currentGpsGranted, currentIsOnline, selectedShipment?.id, selectedShipment?.status, gpsRetryNonce, t]);

  useEffect(() => {
    if (!selectedShipment || !currentGpsGranted || !currentIsOnline) return;
    if (!["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(selectedShipment.status)) return;
    if (Capacitor.isNativePlatform() || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let sentinel: { release: () => Promise<void> } | null = null;

    const acquire = async () => {
      try {
        sentinel = await (navigator as unknown as { wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
      } catch {
        // Refus silencieux (batterie faible, onglet non visible, etc.)
      }
    };

    acquire();

    const reacquireOnVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };
    document.addEventListener("visibilitychange", reacquireOnVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", reacquireOnVisible);
      sentinel?.release().catch(() => {});
    };
  }, [currentGpsGranted, currentIsOnline, selectedShipment?.id, selectedShipment?.status]);

  useEffect(() => {
    if (!selectedShipment) {
      setClientMessages([]);
      return;
    }

    let cancelled = false;
    const fetchMessages = () => {
      customerApi.getOrderChatMessages(selectedShipment.order)
        .then((msgs) => { if (!cancelled) setClientMessages(msgs); })
        .catch(() => {});
    };

    fetchMessages();
    const interval = window.setInterval(fetchMessages, 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [selectedShipment]);

  useEffect(() => {
    clientChatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [clientMessages]);

  const selectedDisputePermission = selectedDispute
    ? disputePermissionStatus[selectedDispute.id] ?? (selectedDispute.can_reply ? "granted" : "locked")
    : "locked";

  const handleShipmentAction = async (action: CourierShipmentAction) => {
    if (!selectedShipment) return;
    setActionLoading(action);
    setActionFeedback("");

    try {
      const message = action === "NOTE" || action === "INCIDENT" ? noteDraft.trim() : undefined;
      const updated = await courierApi.actOnShipment(selectedShipment.id, {
        action,
        message,
        location: selectedShipment.city,
        pickup_code: action === "PICKED_UP" ? pickupCodeDraft.trim() : undefined,
      });
      setShipments((current) => current.map((shipment) => (shipment.id === updated.id ? updated : shipment)));
      if (action === "NOTE" || action === "INCIDENT") setNoteDraft("");
      if (action === "PICKED_UP") setPickupCodeDraft("");
      setActionFeedback(
        action === "ACCEPT"
          ? t("cr1_dashboard.feedback.action_accept")
          : action === "PICKED_UP"
            ? t("cr1_dashboard.feedback.action_picked_up")
            : action === "OUT_FOR_DELIVERY"
              ? t("cr1_dashboard.feedback.action_out_for_delivery")
              : action === "DELIVERED"
                ? t("cr1_dashboard.feedback.action_delivered")
                : action === "INCIDENT"
                  ? t("cr1_dashboard.feedback.action_incident")
                  : action === "NOTE"
                    ? t("cr1_dashboard.feedback.action_note")
                    : t("cr1_dashboard.feedback.action_generic"),
      );
    } catch {
      const message = action === "NOTE" || action === "INCIDENT" ? noteDraft.trim() : undefined;
      setShipments((current) =>
        current.map((shipment) =>
          shipment.id === selectedShipment.id
            ? applyLocalAction(shipment, action, message, selectedShipment.city)
            : shipment,
        ),
      );
      if (action === "NOTE" || action === "INCIDENT") setNoteDraft("");
      setActionFeedback(t("cr1_dashboard.feedback.action_local_only"));
    } finally {
      setActionLoading(null);
    }
  };

  // Capture obligatoire, transmission best-effort (regle verrouillee) : la
  // photo est mise en file localement des la prise, la synchro reseau se
  // fait en tache de fond sans jamais bloquer la course.
  useEffect(() => {
    const sync = () => { void syncPendingEvidence().then(({ remaining }) => setPendingEvidenceCount(remaining)); };
    sync();
    window.addEventListener("online", sync);
    const interval = window.setInterval(sync, 30000);
    return () => { window.removeEventListener("online", sync); window.clearInterval(interval); };
  }, []);

  const handleCapturePhoto = async (
    shipmentId: number,
    stage: "COURIER_PICKUP_VENDOR" | "CUSTOMER_DELIVERY",
    file: File,
  ) => {
    await enqueueEvidence({
      endpoint: `/api/shipping/my-shipments/${shipmentId}/evidence/`,
      fields: { stage },
      blob: file,
      fileName: file.name || "preuve.jpg",
    });
    setCapturedEvidence((current) => ({ ...current, [`${shipmentId}:${stage}`]: true }));
    void syncPendingEvidence().then(({ remaining }) => setPendingEvidenceCount(remaining));
  };

  const handleClaimShipment = async (id: number) => {
    setActionLoading("CLAIM");
    setActionFeedback("");
    try {
      const claimed = await courierApi.claimShipment(id);
      setAvailableShipmentsFromAPI((prev) => prev.filter((s) => s.id !== id));
      setShipments((prev) => [claimed, ...prev]);
      setSelectedShipmentId(claimed.id);
      setActionFeedback(t("cr1_dashboard.feedback.claim_success"));
      refreshCourierWork();
    } catch {
      setActionFeedback(t("cr1_dashboard.feedback.claim_failed"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleContactClient = async () => {
    if (!selectedShipment) return;
    setContactLoading(true);
    setActionFeedback("");
    try {
      await customerApi.sendOrderChatMessage(
        selectedShipment.order,
        t("cr1_dashboard.courses.contact_client_template"),
      );
      setActionFeedback(t("cr1_dashboard.feedback.contact_client_sent"));
    } catch {
      setActionFeedback(t("cr1_dashboard.feedback.contact_client_failed"));
    } finally {
      setContactLoading(false);
    }
  };

  const handleReplyClient = async () => {
    if (!selectedShipment || !clientReplyDraft.trim()) return;
    const message = clientReplyDraft.trim();
    setClientReplyDraft("");
    const optimisticMessage: OrderChatMessage = {
      id: -Date.now(),
      shipment: selectedShipment.id,
      channel: "CLIENT",
      sender_role: "COURIER",
      sender_name: firstName,
      message,
      created_at: new Date().toISOString(),
    };
    setClientMessages((prev) => [...prev, optimisticMessage]);
    try {
      const msg = await customerApi.sendOrderChatMessage(selectedShipment.order, message);
      setClientMessages((prev) => prev.map((item) => (item.id === optimisticMessage.id ? msg : item)));
    } catch {
      setClientReplyDraft(message);
      setClientMessages((prev) => prev.filter((item) => item.id !== optimisticMessage.id));
    }
  };

  const handleRequestDisputeReply = async (dispute: CourierDispute) => {
    setDisputeFeedback("");
    setDisputePermissionStatus((current) => ({ ...current, [dispute.id]: "requested" }));
    try {
      await courierApi.requestDisputeReplyPermission(dispute.id);
      setDisputeFeedback(t("cr1_dashboard.feedback.dispute_request_sent"));
    } catch {
      setDisputeFeedback(t("cr1_dashboard.feedback.dispute_request_local"));
    }
  };

  const handleSendDisputeReply = async () => {
    if (!selectedDispute || !disputeReplyDraft.trim() || selectedDisputePermission !== "granted") return;
    const message = disputeReplyDraft.trim();
    setDisputeReplyDraft("");
    setDisputeFeedback(t("cr1_dashboard.feedback.dispute_reply_sent"));
    try {
      await courierApi.sendDisputeReply(selectedDispute.id, { message });
    } catch {
      setDisputeFeedback(t("cr1_dashboard.feedback.dispute_reply_local"));
    }
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
      setScanFeedback(t("cr1_dashboard.feedback.scan_success", { order: updated.order }));
    } catch {
      setScanFeedback(t("cr1_dashboard.feedback.scan_failed"));
    }
  };


  const quickStats = [
    {
      label: t("cr1_dashboard.quick_stats.active"),
      value: activeShipments.length,
      icon: Package,
      tone: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: t("cr1_dashboard.quick_stats.delivered"),
      value: completedShipments.filter((shipment) => shipment.status === "DELIVERED").length,
      icon: CheckCircle2,
      tone: "text-green-300 bg-green-500/10 border-green-500/20",
    },
    {
      label: t("cr1_dashboard.quick_stats.status"),
      value: currentIsOnline ? t("cr1_dashboard.common.online") : t("cr1_dashboard.common.offline"),
      icon: Bell,
      tone: "text-sky-300 bg-sky-500/10 border-sky-500/20",
    },
    {
      label: t("cr1_dashboard.quick_stats.vehicle"),
      value: vehicleLabel(t, currentCourierVehicle),
      icon: Bike,
      tone: "text-lime-300 bg-lime-500/10 border-lime-500/20",
    },
  ];

  const leaderboard = dashboard?.leaderboard ?? [];

  const liveHeaderStats = [
    {
      label: t("cr1_dashboard.live_stats.trust_score"),
      value: dashboard ? `${dashboard.trust_score.score.toFixed(1)} · ${dashboard.trust_score.tier_display}` : "—",
      tone: dashboard?.trust_score.veto_active ? "text-red-300" : "text-emerald-300",
    },
    {
      label: t("cr1_dashboard.live_stats.online_time"),
      value: `${Math.floor((dashboard?.online_minutes ?? 0) / 60)}h ${String((dashboard?.online_minutes ?? 0) % 60).padStart(2, "0")}`,
      tone: "text-emerald-300",
    },
    {
      label: t("cr1_dashboard.quick_stats.status"),
      value: dashboard?.status_label ?? (currentIsOnline ? t("cr1_dashboard.common.online") : t("cr1_dashboard.common.offline")),
      tone: "text-green-300",
    },
    { label: t("cr1_dashboard.live_stats.distance"), value: `${(dashboard?.distance_km ?? 0).toFixed(1)} km`, tone: "text-sky-300" },
    { label: t("cr1_dashboard.live_stats.average_delivery"), value: `${dashboard?.average_delivery_minutes ?? 0} min`, tone: "text-cyan-300" },
    { label: t("cr1_dashboard.live_stats.performance"), value: `${dashboard?.performance_percent ?? 0}%`, tone: "text-orange-300" },
  ];

  const unreadNotifications = notifications.filter((item) => !item.is_read).length;

  const courierFooter = useMemo(() => COURIER_FOOTER_KEYS.map((key) => t(key)), [t]);

  /**
   * Carte d'identite du livreur, partagee par la colonne de bureau, le tiroir
   * mobile et la feuille compte : une seule source, donc aucune derive entre
   * les trois surfaces.
   */
  const courierIdentity = {
    name: `${user?.first_name || t("cr1_dashboard.common.courier_fallback_name")} ${user?.last_name || ""}`.trim(),
    city: currentCourierCity,
    vehicle: vehicleLabel(t, currentCourierVehicle),
    status: courierProfile
      ? currentIsOnline
        ? t("cr1_dashboard.common.available")
        : t("cr1_dashboard.common.offline")
      : t("cr1_dashboard.common.request_to_finalize"),
    online: currentIsOnline,
    avatarUrl: user?.avatar_url || undefined,
  };

  /**
   * Alertes portees par le menu, dans l'ordre ou un livreur les traite :
   * courses actives, litiges ouverts, notifications non lues.
   */
  const navBadges = useMemo<Partial<Record<CourierTab, number>>>(
    () => ({
      courses: activeShipments.length,
      litiges: disputes.length,
      notifications: unreadNotifications,
    }),
    [activeShipments.length, disputes.length, unreadNotifications],
  );

  /**
   * Alertes des destinations absentes de la barre du bas. Elles remontent sur
   * l'icone de menu du bandeau : sans ce report, un litige ouvert resterait
   * invisible sur telephone tant que le tiroir n'est pas ouvert. Les
   * notifications en sont exclues, la cloche du bandeau les affiche deja.
   */
  const hiddenBadgeTotal = useMemo(
    () =>
      Object.entries(navBadges).reduce(
        (total, [id, count]) =>
          COURIER_TABBAR_IDS.includes(id as CourierTab) || id === "notifications" ? total : total + (count || 0),
        0,
      ),
    [navBadges],
  );

  const mapShipment = selectedShipment ?? activeShipments[0] ?? shipments[0] ?? null;
  const receiptCode = mapShipment?.receipt_confirmation_code || "";

  useEffect(() => {
    if (!receiptCode) {
      setReceiptQrDataUrl("");
      return;
    }
    QRCode.toDataURL(receiptCode, { width: 220, margin: 1 })
      .then(setReceiptQrDataUrl)
      .catch(() => setReceiptQrDataUrl(""));
  }, [receiptCode]);

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
      title: activeShipments.length > 1 ? t("cr1_dashboard.tournee.insight_grouping_title") : t("cr1_dashboard.tournee.insight_next_title"),
      body:
        activeShipments.length > 1
          ? t("cr1_dashboard.tournee.insight_grouping_body", {
              zone: activeZones.join(", ") || courierProfile?.city || t("cr1_dashboard.common.your_zone"),
              count: activeShipments.length,
            })
          : nextTourStop
            ? nextTourStop.delivery_address
            : t("cr1_dashboard.tournee.insight_next_empty"),
      tone: "border-orange-500/20 bg-orange-500/5",
    },
    {
      title: t("cr1_dashboard.tournee.insight_window_title"),
      body: dashboard?.recommended_departure
        ? t("cr1_dashboard.tournee.insight_window_body", {
            time: dashboard.recommended_departure,
            traffic: dashboard.traffic_label?.toLowerCase() || t("cr1_dashboard.common.moderate"),
          })
        : t("cr1_dashboard.tournee.insight_window_empty"),
      tone: "border-sky-500/20 bg-sky-500/5",
    },
    {
      title: t("cr1_dashboard.tournee.insight_field_title"),
      body:
        activeShipments.length > 0
          ? t("cr1_dashboard.tournee.insight_field_body", { completed: completedToday, active: activeShipments.length })
          : t("cr1_dashboard.tournee.insight_field_empty"),
      tone: activeShipments.length > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-white/[0.03]",
    },
  ];

  function formatDuration(totalMinutes: number) {
    if (!totalMinutes) return t("cr1_dashboard.common.zero_minutes");
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return t("cr1_dashboard.common.minutes_short", { count: minutes });
    return t("cr1_dashboard.common.hours_minutes_short", { hours, minutes: String(minutes).padStart(2, "0") });
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
      setSettingsFeedback(t("cr1_dashboard.feedback.settings_synced"));
    } catch {
      setSettingsFeedback(t("cr1_dashboard.feedback.settings_sync_failed"));
    } finally {
      setSettingsSaving(null);
    }
  }

  const renderDashboard = () => (
    <>
      {!Capacitor.isNativePlatform() && <AppDownloadBanner portal="COURIER" />}
      {/* Briefing du jour en tete : c'est la premiere chose qu'un livreur
          veut lire en ouvrant l'app — son statut terrain et son depart
          conseille — avant meme ses compteurs. */}
      <SectionShell kicker={t("cr1_dashboard.briefing.kicker")} title={t("cr1_dashboard.briefing.title", { name: firstName })}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-black uppercase tracking-[0.15em] text-emerald-300">{t("cr1_dashboard.briefing.field_status")}</span>
              <InfoPill icon={Bike} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {currentIsOnline ? t("cr1_dashboard.common.available") : t("cr1_dashboard.common.offline")}
              </InfoPill>
            </div>
            <div className="space-y-2 text-[14px] text-slate-700 dark:text-white/85">
              <div className="flex items-center justify-between rounded-[14px] bg-white/70 px-4 py-3 dark:bg-black/10">
                <span>{t("cr1_dashboard.briefing.recommended_departure")}</span>
                <strong>{dashboard?.recommended_departure ?? "—"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[14px] bg-white/70 px-4 py-3 dark:bg-black/10">
                <span>{t("cr1_dashboard.briefing.traffic")}</span>
                <strong>{dashboard?.traffic_label ?? "—"}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[14px] bg-white/70 px-4 py-3 dark:bg-black/10">
                <span>{t("cr1_dashboard.briefing.weather")}</span>
                <strong>{dashboard?.weather_label ?? "—"}</strong>
              </div>
            </div>
          </div>
          <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-4">
            <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-green-300">{t("cr1_dashboard.briefing.checklist_title")}</div>
            <div className="space-y-3">
              {[
                t("cr1_dashboard.briefing.checklist_phone"),
                t("cr1_dashboard.briefing.checklist_gps"),
                t("cr1_dashboard.briefing.checklist_gear"),
                t("cr1_dashboard.briefing.checklist_data"),
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[14px] bg-white/70 px-4 py-3 text-[14px] text-slate-700 dark:bg-black/10 dark:text-white">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { ...quickStats[0], value: dashboard?.active_shipments ?? quickStats[0].value },
          { ...quickStats[1], value: dashboard?.delivered_shipments ?? quickStats[1].value },
          quickStats[2],
          quickStats[3],
        ].map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {liveHeaderStats.map((item) => (
          <article
            key={item.label}
            className="rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.02))] px-5 py-4 shadow-[0_18px_38px_rgba(0,0,0,.2)]"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">{item.label}</div>
            <div className={`mt-2 text-[24px] font-extrabold ${item.tone}`}>{item.value}</div>
          </article>
        ))}
      </section>

      {dashboard?.trust_score && (
        <section className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/5 px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-400">{t("cr1_dashboard.trust.cap_label")}</div>
              <div className="mt-1 font-extrabold text-slate-950 dark:text-white">
                {dashboard.trust_score.parcel_value_cap_xaf === null
                  ? t("cr1_dashboard.trust.cap_uncapped")
                  : t("cr1_dashboard.trust.cap_value", { amount: dashboard.trust_score.parcel_value_cap_xaf.toLocaleString("fr-FR") })}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-white/70 px-4 py-2 font-bold dark:bg-black/10">
              {t("cr1_dashboard.trust.sample_size", { count: dashboard.trust_score.sample_size })}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5">
        <SectionShell kicker={t("cr1_dashboard.leaderboard.kicker")} title={t("cr1_dashboard.leaderboard.title")} accent="text-green-300">
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
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/50">{t("cr1_dashboard.leaderboard.performance")}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                {t("cr1_dashboard.leaderboard.empty")}
              </div>
            )}
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SectionShell kicker={t("cr1_dashboard.hotzone.kicker")} title={t("cr1_dashboard.hotzone.title")}>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-emerald-500/15 bg-[#0b1220] p-2 shadow-[0_18px_48px_rgba(16,185,129,.08)]">
              <TrackingMap
                destinationAddress={mapShipment?.delivery_address}
                destinationCity={mapShipment?.city}
                destinationPrecision={mapShipment?.delivery_location_precision}
                destinationLabel={t("cr1_dashboard.map.destination_label")}
                currentLocation={mapShipment?.latest_location
                  ? [Number(mapShipment.latest_location.latitude), Number(mapShipment.latest_location.longitude)]
                  : undefined}
                locationHistory={(mapShipment?.location_history || []).map((location) => [
                  Number(location.latitude),
                  Number(location.longitude),
                ] as [number, number])}
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
                  {t("cr1_dashboard.hotzone.empty")}
                </div>
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell kicker={t("cr1_dashboard.available.kicker")} title={t("cr1_dashboard.available.title")} accent="text-emerald-300">
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
                    <div className="font-extrabold text-white">{t("cr1_dashboard.common.order_number", { order: shipment.order })}</div>
                    <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-extrabold text-emerald-300">
                      {shipment.city || currentCourierCity}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">{t("cr1_dashboard.common.zone")}</div>
                  </div>
                </div>
              </button>
            ))}
            {!availableShipments.length && !activeShipments.length ? (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] leading-6 text-[#8B949E]">
                {t("cr1_dashboard.available.empty")}
              </div>
            ) : null}
          </div>
        </SectionShell>
      </section>
    </>
  );

  const renderTournee = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker={t("cr1_dashboard.tournee.kicker")} title={t("cr1_dashboard.tournee.title")}>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <InfoPill icon={Route} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {t(tourShipments.length > 1 ? "cr1_dashboard.tournee.stops_plural" : "cr1_dashboard.tournee.stops", { count: tourShipments.length })}
              </InfoPill>
              <InfoPill icon={Clock3}>{formatDuration(estimatedTourMinutes)}</InfoPill>
              <InfoPill icon={Navigation}>{activeDistanceKm.toFixed(1)} km</InfoPill>
            </div>
            <p className="mt-3 text-[14px] leading-7 text-white/80">
              {nextTourStop
                ? t("cr1_dashboard.tournee.next_stop", { address: nextTourStop.delivery_address })
                : t("cr1_dashboard.tournee.no_active_mission")}
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
                      <div className="font-bold text-white">{t("cr1_dashboard.tournee.order_client")}</div>
                      <div className="mt-1 text-[12px] text-[#8B949E]">{t("cr1_dashboard.common.order_number", { order: shipment.order })}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                      {statusLabel(t, shipment.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">{shipment.delivery_address}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-white/60">
                    <span>{shipment.city || courierProfile?.city || t("cr1_dashboard.common.zone_unspecified")}</span>
                    <span>•</span>
                    <span>
                      {t("cr1_dashboard.tournee.recommended_eta", {
                        duration: formatDuration(Math.max((index + 1) * (dashboard?.average_delivery_minutes ?? 18), 12)),
                      })}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : availableShipments.length ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-sky-500/20 bg-sky-500/5 p-4 text-[13px] leading-6 text-sky-100">
                {t(
                  availableShipments.length > 1
                    ? "cr1_dashboard.tournee.available_waiting_plural"
                    : "cr1_dashboard.tournee.available_waiting",
                  { count: availableShipments.length },
                )}
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
                        <div className="font-bold text-white">{t("cr1_dashboard.common.order_number", { order: shipment.order })}</div>
                        <div className="mt-1 text-[12px] text-[#8B949E]">{t("cr1_dashboard.common.client_hidden")}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClaimShipment(shipment.id)}
                        disabled={Boolean(actionLoading)}
                        className="rounded-full bg-[linear-gradient(135deg,#3B82F6,#1D4ED8)] px-4 py-2 text-[11px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === "CLAIM" ? t("cr1_dashboard.common.claiming") : t("cr1_dashboard.common.claim")}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] leading-6 text-[#8B949E]">{shipment.delivery_address}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
              {t("cr1_dashboard.tournee.empty_steps", { city: currentCourierCity })}
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.tournee.field_kicker")} title={t("cr1_dashboard.tournee.field_title")} accent="text-orange-300">
        <div className="space-y-4">
          {tourInsights.map((item) => (
            <div key={item.title} className={`rounded-[18px] border p-4 ${item.tone}`}>
              <div className="font-bold text-white">{item.title}</div>
              <div className="mt-2 text-[13px] leading-6 text-white/75">{item.body}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-emerald-500/15 bg-[#0f1722] p-4">
            <div className="mb-3 text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">{t("cr1_dashboard.tournee.next_action")}</div>
            <button
              type="button"
              onClick={() => setTab(nextTourStop ? "courses" : "map")}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white"
            >
              {nextTourStop ? t("cr1_dashboard.tournee.open_active_mission") : t("cr1_dashboard.tournee.open_navigation")}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </SectionShell>
    </section>
  );

  const renderCourses = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker={t("cr1_dashboard.courses.kicker")} title={t("cr1_dashboard.courses.title")}>
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { label: t("cr1_dashboard.courses.pill_active"), count: activeShipments.length, tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
            { label: t("cr1_dashboard.courses.pill_available"), count: availableShipments.length, tone: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
            { label: t("cr1_dashboard.courses.pill_history"), count: completedShipments.length, tone: "border-white/10 bg-white/5 text-white" },
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
                  <div className="text-[13px] font-extrabold text-white">{t("cr1_dashboard.common.order_number", { order: shipment.order })}</div>
                  <div className="mt-1 text-[12px] text-[#8B949E]">{t("cr1_dashboard.common.client_hidden")}</div>
                  <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#8B949E]">
                    <MapPin size={12} />
                    {shipment.delivery_address}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/70">
                      {shipment.vendor_names?.join(", ") || t("cr1_dashboard.courses.vendor_unspecified")}
                    </span>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {isAvailable ? t("cr1_dashboard.status.available") : statusLabel(t, shipment.status)}
                </span>
              </div>
            </button>
            );
          })}
          {!visibleCourseShipments.length ? (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] leading-6 text-[#8B949E]">
              {t("cr1_dashboard.courses.empty", { city: currentCourierCity })}
            </div>
          ) : null}
        </div>
      </SectionShell>

      <SectionShell
        kicker={t("cr1_dashboard.courses.selected_kicker")}
        title={selectedShipment ? t("cr1_dashboard.common.order_number", { order: selectedShipment.order }) : t("cr1_dashboard.courses.no_mission")}
        accent="text-orange-300"
      >
        {selectedShipment ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">{t("cr1_dashboard.courses.client_label")}</div>
                <div className="mt-2 font-semibold text-white">{t("cr1_dashboard.courses.coordinates_hidden")}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">{t("cr1_dashboard.courses.use_chat_hint")}</div>
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">{t("cr1_dashboard.courses.mission_label")}</div>
                <div className="mt-2 text-[20px] font-extrabold text-emerald-300">{statusLabel(t, selectedShipment.status)}</div>
                <div className="mt-1 text-[12px] text-white/55">{selectedShipment.city || currentCourierCity}</div>
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
                  {actionLoading === "CLAIM" ? t("cr1_dashboard.courses.claiming_mission") : t("cr1_dashboard.courses.claim_mission")}
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
                    {actionLoading === "ACCEPT" ? t("cr1_dashboard.courses.validating") : t("cr1_dashboard.courses.accept_mission")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DECLINE")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "DECLINE" ? t("cr1_dashboard.courses.declining") : t("cr1_dashboard.courses.decline")}
                  </button>
                </>
              ) : null}
              {selectedShipment.status === "ASSIGNED" && selectedShipmentAccepted ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-[12px] font-extrabold text-emerald-300">
                  <BadgeCheck size={14} />
                  {t("cr1_dashboard.courses.mission_accepted")}
                </div>
              ) : null}
              {(selectedShipment.status === "PICKED_UP" || selectedShipment.status === "ASSIGNED") && (
                <>
                  {!capturedEvidence[`${selectedShipment.id}:COURIER_PICKUP_VENDOR`] && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-5 py-3 text-[12px] font-extrabold text-sky-300 transition hover:-translate-y-0.5">
                      <Camera size={14} /> {t("cr1_dashboard.courses.photo_package_required")}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleCapturePhoto(selectedShipment.id, "COURIER_PICKUP_VENDOR", file);
                        }}
                      />
                    </label>
                  )}
                  <input
                    value={pickupCodeDraft}
                    onChange={(event) => setPickupCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder={t("cr1_dashboard.courses.pickup_code_placeholder")}
                    maxLength={6}
                    className="w-[168px] rounded-full border border-amber-500/25 bg-[#0D1117] px-4 py-3 text-center text-[13px] font-black tracking-widest text-amber-300 outline-none placeholder:text-[10px] placeholder:font-bold placeholder:tracking-normal placeholder:text-amber-300/50"
                  />
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("PICKED_UP")}
                    disabled={Boolean(actionLoading) || !capturedEvidence[`${selectedShipment.id}:COURIER_PICKUP_VENDOR`] || pickupCodeDraft.length !== 6}
                    title={
                      !capturedEvidence[`${selectedShipment.id}:COURIER_PICKUP_VENDOR`]
                        ? t("cr1_dashboard.courses.hint_photo_package_first")
                        : pickupCodeDraft.length !== 6
                          ? t("cr1_dashboard.courses.hint_ask_pickup_code")
                          : undefined
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-[12px] font-extrabold text-amber-300 transition hover:-translate-y-0.5 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "PICKED_UP" ? <LoaderCircle size={14} className="animate-spin" /> : <Package size={14} />}
                    {actionLoading === "PICKED_UP" ? t("cr1_dashboard.courses.saving") : t("cr1_dashboard.courses.mark_picked_up")}
                  </button>
                </>
              )}
              {selectedShipment.status === "PICKED_UP" && (
                <button
                  type="button"
                  onClick={() => handleShipmentAction("OUT_FOR_DELIVERY")}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-[12px] font-extrabold text-orange-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "OUT_FOR_DELIVERY" ? <LoaderCircle size={14} className="animate-spin" /> : <Truck size={14} />}
                  {actionLoading === "OUT_FOR_DELIVERY" ? t("cr1_dashboard.courses.updating") : t("cr1_dashboard.courses.mark_out_for_delivery")}
                </button>
              )}
              {selectedShipment.status === "OUT_FOR_DELIVERY" && (
                <>
                  {!capturedEvidence[`${selectedShipment.id}:CUSTOMER_DELIVERY`] && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-5 py-3 text-[12px] font-extrabold text-sky-300 transition hover:-translate-y-0.5">
                      <Camera size={14} /> {t("cr1_dashboard.courses.photo_delivery_required")}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void handleCapturePhoto(selectedShipment.id, "CUSTOMER_DELIVERY", file);
                        }}
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("DELIVERED")}
                    disabled={Boolean(actionLoading) || !capturedEvidence[`${selectedShipment.id}:CUSTOMER_DELIVERY`]}
                    title={!capturedEvidence[`${selectedShipment.id}:CUSTOMER_DELIVERY`] ? t("cr1_dashboard.courses.hint_photo_delivery_first") : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,185,129,.28)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "DELIVERED" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {actionLoading === "DELIVERED" ? t("cr1_dashboard.courses.certifying") : t("cr1_dashboard.courses.certify_delivered")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShipmentAction("FAILED")}
                    disabled={Boolean(actionLoading)}
                    className="rounded-full border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading === "FAILED" ? t("cr1_dashboard.courses.reporting") : t("cr1_dashboard.courses.mark_failed")}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleContactClient}
                disabled={contactLoading}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[12px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contactLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Phone size={14} />}
                {contactLoading ? t("cr1_dashboard.courses.sending") : t("cr1_dashboard.courses.notify_client")}
              </button>
            </div>
            {actionFeedback ? (
              <div className="mt-4 rounded-[16px] border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-[13px] font-semibold text-emerald-300 animate-pulse">
                {actionFeedback}
              </div>
            ) : null}
            {pendingEvidenceCount > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-[12px] font-bold text-amber-300">
                <Camera size={13} />{" "}
                {t(pendingEvidenceCount > 1 ? "cr1_dashboard.courses.pending_sync_plural" : "cr1_dashboard.courses.pending_sync", { count: pendingEvidenceCount })}
              </div>
            )}

            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#8B949E]">
                {t("cr1_dashboard.courses.order_details")}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoPill icon={MapPin} tone="border-gray-200 bg-gray-50 text-gray-700">{t("cr1_dashboard.courses.detail_address", { address: selectedShipment.delivery_address })}</InfoPill>
                {selectedShipment.delivery_district ? (
                  <InfoPill icon={MapPin} tone="border-gray-200 bg-gray-50 text-gray-700">Quartier: {selectedShipment.delivery_district}</InfoPill>
                ) : null}
                <InfoPill icon={Store} tone="border-gray-200 bg-gray-50 text-gray-700">{t("cr1_dashboard.courses.detail_vendors", { vendors: selectedShipment.vendor_names?.join(", ") || t("cr1_dashboard.common.unspecified") })}</InfoPill>
                <InfoPill icon={Truck} tone="border-gray-200 bg-gray-50 text-gray-700">{t("cr1_dashboard.courses.detail_status", { status: statusLabel(t, selectedShipment.status) })}</InfoPill>
              </div>
              {selectedShipment.authorized_pickup_name ? (
                <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[13px] font-bold text-amber-200">
                  {t("cr1_dashboard.courses.authorized_pickup", { name: selectedShipment.authorized_pickup_name })}
                  {selectedShipment.authorized_pickup_phone ? ` · ${selectedShipment.authorized_pickup_phone}` : ""}
                  <span className="mt-1 block text-[11px] font-semibold text-amber-200/70">
                    {t("cr1_dashboard.courses.authorized_pickup_hint")}
                  </span>
                </div>
              ) : null}
              {selectedShipment.delivery_latitude != null && selectedShipment.delivery_longitude != null ? (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedShipment.delivery_latitude}&mlon=${selectedShipment.delivery_longitude}#map=17/${selectedShipment.delivery_latitude}/${selectedShipment.delivery_longitude}`}
                  target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-[12px] bg-emerald-500/10 px-4 py-2.5 text-[12.5px] font-bold text-emerald-300 hover:bg-emerald-500/15"
                >
                  <Navigation size={14} /> {t("cr1_dashboard.courses.exact_gps_link")}
                </a>
              ) : null}
            </div>

            <div className="mt-5 rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-sky-300">{t("cr1_dashboard.courses.client_chat")}</div>
                  <div className="mt-1 text-[12px] text-white/60">{t("cr1_dashboard.courses.client_chat_hint")}</div>
                </div>
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-bold text-sky-300">
                  {t(clientMessages.length > 1 ? "cr1_dashboard.courses.message_count_plural" : "cr1_dashboard.courses.message_count", { count: clientMessages.length })}
                </span>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto rounded-[16px] bg-[#0D1117] p-3">
                {clientMessages.length ? clientMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[86%] rounded-[16px] px-4 py-3 text-[13px] leading-6 ${
                      message.sender_role === "COURIER"
                        ? "ml-auto bg-emerald-500 text-white"
                        : "bg-white/8 text-white"
                    }`}
                  >
                    <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.14em] ${message.sender_role === "COURIER" ? "text-white/70" : "text-white/45"}`}>
                      {message.sender_name} · {new Date(message.created_at).toLocaleString("fr-FR")}
                    </div>
                    {message.message}
                  </div>
                )) : (
                  <div className="rounded-[16px] border border-dashed border-white/10 p-4 text-center text-[13px] text-white/55">
                    {t("cr1_dashboard.courses.no_client_message")}
                  </div>
                )}
                <div ref={clientChatEndRef} />
              </div>
              <div className="mt-3 flex gap-3">
                <input
                  value={clientReplyDraft}
                  onChange={(event) => setClientReplyDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleReplyClient();
                  }}
                  placeholder={t("cr1_dashboard.courses.reply_client_placeholder")}
                  className="min-w-0 flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
                />
                <button
                  type="button"
                  onClick={() => void handleReplyClient()}
                  disabled={!clientReplyDraft.trim()}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-emerald-500 text-white disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={t("cr1_dashboard.courses.reply_client_aria")}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#8B949E]">
                {t("cr1_dashboard.courses.add_note_title")}
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder={t("cr1_dashboard.courses.add_note_placeholder")}
                  className="flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
                />
                <button
                  type="button"
                  onClick={() => handleShipmentAction("NOTE")}
                  disabled={Boolean(actionLoading) || !noteDraft.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-white px-5 py-3 text-[12px] font-extrabold text-[#0D1117] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "NOTE" ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  {actionLoading === "NOTE" ? t("cr1_dashboard.courses.saving") : t("cr1_dashboard.courses.save")}
                </button>
                <button
                  type="button"
                  onClick={() => handleShipmentAction("INCIDENT")}
                  disabled={Boolean(actionLoading) || !noteDraft.trim()}
                  title={t("cr1_dashboard.courses.hint_describe_incident_first")}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-red-500/25 bg-red-500/10 px-5 py-3 text-[12px] font-extrabold text-red-300 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "INCIDENT" ? <LoaderCircle size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  {actionLoading === "INCIDENT" ? t("cr1_dashboard.courses.reporting") : t("cr1_dashboard.courses.report_incident")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
            {t("cr1_dashboard.courses.no_selected_course")}
          </div>
        )}
      </SectionShell>
    </section>
  );

  const renderScanner = () => (
    <div className="space-y-5">
    {receiptCode && (
      <SectionShell kicker={t("cr1_dashboard.scanner.receipt_kicker")} title={t("cr1_dashboard.scanner.receipt_title")} accent="text-emerald-300">
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-emerald-500/20 bg-[#0d1520] p-6 text-center sm:flex-row sm:text-left">
          {receiptQrDataUrl ? (
            <img src={receiptQrDataUrl} alt={t("cr1_dashboard.scanner.receipt_qr_alt")} className="h-[140px] w-[140px] rounded-2xl bg-white p-2" />
          ) : null}
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-emerald-300">{t("cr1_dashboard.common.order_number", { order: mapShipment?.order })}</div>
            <div className="mt-2 text-3xl font-black tracking-[0.3em] text-white">{receiptCode}</div>
            <p className="mt-2 text-[12px] leading-5 text-[#8B949E]">
              {t("cr1_dashboard.scanner.receipt_hint")}
            </p>
          </div>
        </div>
      </SectionShell>
    )}
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker={t("cr1_dashboard.scanner.kicker")} title={t("cr1_dashboard.scanner.title")}>
        <div className="rounded-[28px] border border-emerald-500/20 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,.18),_transparent_55%),#0d1520] p-6">
          <div className="mx-auto flex h-[280px] max-w-[320px] items-center justify-center rounded-[28px] border-2 border-dashed border-emerald-400/40 bg-black/20">
            <div className="text-center">
              <QrCode size={80} className="mx-auto text-emerald-300" />
              <div className="mt-4 text-[14px] font-bold text-white">{t("cr1_dashboard.scanner.place_qr")}</div>
              <div className="mt-2 text-[12px] text-[#8B949E]">{t("cr1_dashboard.scanner.confirms")}</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              placeholder={t("cr1_dashboard.scanner.code_placeholder")}
              className="rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
            />
            <div className="flex flex-wrap gap-2">
              {[
                ["PICKED_UP", t("cr1_dashboard.scanner.action_picked_up")],
                ["OUT_FOR_DELIVERY", t("cr1_dashboard.scanner.action_out_for_delivery")],
                ["DELIVERED", t("cr1_dashboard.scanner.action_delivered")],
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
              {t("cr1_dashboard.scanner.process_scan")}
            </button>
            <InfoPill icon={ScanLine}>{t("cr1_dashboard.scanner.hd_camera")}</InfoPill>
            <InfoPill icon={ShieldCheck}>{t("cr1_dashboard.scanner.secure_scan")}</InfoPill>
          </div>
          {scanFeedback ? <div className="mt-4 text-[13px] text-emerald-300">{scanFeedback}</div> : null}
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.scanner.history_kicker")} title={t("cr1_dashboard.scanner.history_title")} accent="text-sky-300">
        <div className="space-y-3">
          {(selectedShipment ? [selectedShipment] : shipments.slice(0, 1)).concat(shipments.slice(1, 4)).map((shipment, index) => (
            <div key={`${shipment.id}-${index}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-white">{t("cr1_dashboard.scanner.qr_order", { order: shipment.order })}</div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusTone(shipment.status)}`}>
                  {statusLabel(t, shipment.status)}
                </span>
              </div>
              <div className="mt-2 text-[12px] text-[#8B949E]">{new Date().toLocaleString("fr-FR")}</div>
            </div>
          ))}
          <div className="rounded-[18px] border border-orange-500/20 bg-orange-500/5 p-4 text-[13px] leading-6 text-white/80">
            {t("cr1_dashboard.scanner.tip")}
          </div>
        </div>
      </SectionShell>
    </section>
    </div>
  );

  const renderMap = () => (
    <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionShell kicker={t("cr1_dashboard.map.kicker")} title={t("cr1_dashboard.map.title")}>
        <div className="space-y-4">
            <div className="overflow-hidden rounded-[26px] border border-emerald-500/15 bg-[#0b1220] p-2 shadow-[0_18px_48px_rgba(16,185,129,.08)]">
            <TrackingMap
              destinationAddress={mapShipment?.delivery_address}
              destinationCity={mapShipment?.city}
              destinationPrecision={mapShipment?.delivery_location_precision}
              destinationLabel={t("cr1_dashboard.map.destination_label")}
              currentLocation={mapShipment?.latest_location
                ? [Number(mapShipment.latest_location.latitude), Number(mapShipment.latest_location.longitude)]
                : undefined}
              locationHistory={(mapShipment?.location_history || []).map((location) => [
                Number(location.latitude),
                Number(location.longitude),
              ] as [number, number])}
              className="rounded-[22px] border-none"
              height={420}
            />
          </div>
          {gpsPermissionDenied && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] font-semibold text-red-200">
              <span>
                {Capacitor.isNativePlatform()
                  ? t("cr1_dashboard.map.gps_denied_native")
                  : t("cr1_dashboard.map.gps_denied_web")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setGpsPermissionDenied(false);
                  setGpsRetryNonce((value) => value + 1);
                }}
                className="rounded-full border border-red-400/40 px-3 py-1 text-[11px] font-bold text-red-100 hover:bg-red-500/20"
              >
                {t("cr1_dashboard.map.gps_retry")}
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-[12px] text-white/80">
            <span>{trackingFeedback || (mapShipment?.latest_location
              ? t("cr1_dashboard.map.last_position", { time: new Date(mapShipment.latest_location.captured_at).toLocaleString("fr-FR") })
              : t("cr1_dashboard.map.enable_gps_hint"))}</span>
            <span className="flex items-center gap-3">
              {lastLocationAt != null && (
                <span className="text-white/60">{formatElapsedMinutes(t, lastLocationAt)}</span>
              )}
              <span className="font-black text-emerald-300">
                {t(
                  (mapShipment?.location_history.length || 0) > 1
                    ? "cr1_dashboard.map.gps_points_plural"
                    : "cr1_dashboard.map.gps_points",
                  { count: mapShipment?.location_history.length || 0 },
                )}
              </span>
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {zones.map((zone, index) => (
              <div key={zone} className="rounded-[20px] border border-white/5 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02))] p-4">
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-emerald-300">{zone}</div>
                <div className="mt-3 text-[24px] font-extrabold text-white">{t("cr1_dashboard.map.hotspots", { count: index + 3 })}</div>
                <div className="mt-1 text-[12px] text-[#8B949E]">{t("cr1_dashboard.map.optimal_time", { start: 11 + index, end: 15 + index })}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.map.driving_kicker")} title={t("cr1_dashboard.map.driving_title")} accent="text-green-300">
        <div className="space-y-3">
          {[
            t("cr1_dashboard.map.tip_warda"),
            t("cr1_dashboard.map.tip_bastos"),
            t("cr1_dashboard.map.tip_tunnel"),
            t("cr1_dashboard.map.tip_rain"),
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
        <SectionShell kicker={t("cr1_dashboard.reseau.kicker")} title={t("cr1_dashboard.reseau.title")}>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-emerald-500/15 bg-emerald-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">{t("cr1_dashboard.reseau.shops")}</div>
              <div className="mt-2 text-[24px] font-extrabold text-emerald-300">{shops.length}</div>
            </div>
            <div className="rounded-[18px] border border-sky-500/15 bg-sky-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">{t("cr1_dashboard.reseau.relay_points")}</div>
              <div className="mt-2 text-[24px] font-extrabold text-sky-300">{relayPoints.length}</div>
            </div>
            <div className="rounded-[18px] border border-orange-500/15 bg-orange-500/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#8B949E]">{t("cr1_dashboard.reseau.shops_online")}</div>
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
                        {shop.location_name || t("cr1_dashboard.reseau.main_shop")}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        shop.is_online
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-white/65"
                      }`}
                    >
                      {shop.is_online ? t("cr1_dashboard.common.online") : t("cr1_dashboard.common.offline")}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">{t("cr1_dashboard.reseau.address")}</div>
                      <div className="mt-1">{shop.address || t("cr1_dashboard.reseau.address_unspecified")}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">{t("cr1_dashboard.reseau.city")}</div>
                      <div className="mt-1">{shop.city || t("cr1_dashboard.reseau.city_unspecified")}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">{t("cr1_dashboard.reseau.phone")}</div>
                      <div className="mt-1">{shop.phone || t("cr1_dashboard.common.unspecified")}</div>
                    </div>
                    <div className="rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">{t("cr1_dashboard.reseau.gps_coordinates")}</div>
                      <div className="mt-1">
                        {shop.latitude !== null && shop.longitude !== null
                          ? `${shop.latitude}, ${shop.longitude}`
                          : t("cr1_dashboard.reseau.gps_unspecified")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                {t("cr1_dashboard.reseau.no_shops")}
              </div>
            )}
          </div>
        </SectionShell>

        <SectionShell kicker={t("cr1_dashboard.reseau.relay_kicker")} title={t("cr1_dashboard.reseau.relay_title")} accent="text-sky-300">
          <div className="space-y-3">
            {relayPoints.length ? (
              relayPoints.map((relay) => (
                <div key={`${relay.name}-${relay.city}`} className="rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{relay.name}</div>
                      <div className="mt-1 text-[12px] text-[#8B949E]">{relay.city || t("cr1_dashboard.reseau.city_unspecified")}</div>
                    </div>
                    <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
                      {t(relay.shipments_count > 1 ? "cr1_dashboard.reseau.missions_plural" : "cr1_dashboard.reseau.missions", { count: relay.shipments_count })}
                    </div>
                  </div>
                  <div className="mt-3 rounded-[14px] bg-black/10 px-4 py-3 text-[13px] text-white/80">
                    {relay.address || relay.name}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
                {t("cr1_dashboard.reseau.no_relay_points")}
              </div>
            )}
          </div>
        </SectionShell>
      </section>
    );
  };

  const renderProfil = () => (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker={t("cr1_dashboard.profil.kicker")} title={t("cr1_dashboard.profil.title")}>
        <div className="mb-5 flex flex-col gap-4 rounded-[18px] border border-emerald-500/15 bg-emerald-500/5 p-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-emerald-400/50 bg-[#07130f] text-2xl font-black text-emerald-300">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={t("cr1_dashboard.profil.photo_alt")} className="h-full w-full object-cover" />
            ) : (
              (user?.first_name?.[0] || user?.username?.[0] || "L").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-white">{t("cr1_dashboard.profil.photo_title")}</div>
            <p className="mt-1 text-[12px] leading-5 text-[#8B949E]">{t("cr1_dashboard.profil.photo_hint")}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-black text-[#022c22] transition hover:bg-emerald-400">
            <Camera size={16} />
            {t("cr1_dashboard.profil.edit")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                setAvatarFile(event.target.files?.[0] || null);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: t("cr1_dashboard.profil.phone"), value: courierProfile?.phone || user?.phone || "—", icon: Phone },
            { label: t("cr1_dashboard.profil.city"), value: courierProfile?.city || "Yaounde", icon: MapPin },
            { label: t("cr1_dashboard.profil.zones"), value: zones.join(", "), icon: Truck },
            { label: t("cr1_dashboard.profil.vehicle"), value: courierProfile ? vehicleLabel(t, courierProfile.vehicle_type) : t("cr1_dashboard.vehicle.motorbike"), icon: Bike },
            { label: t("cr1_dashboard.profil.id_card"), value: courierProfile?.id_card || t("cr1_dashboard.profil.pending"), icon: FileBadge2 },
            { label: t("cr1_dashboard.profil.status"), value: isApprovedCourier ? t("cr1_dashboard.common.approved") : t("cr1_dashboard.common.under_review"), icon: BadgeCheck },
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

      <SectionShell kicker={t("cr1_dashboard.profil.reputation_kicker")} title={t("cr1_dashboard.profil.reputation_title")} accent="text-orange-300">
        <div className="space-y-3">
          {[
            t("cr1_dashboard.profil.power_view_deliveries"),
            t("cr1_dashboard.profil.power_accept_decline"),
            t("cr1_dashboard.profil.power_mark_status"),
            t("cr1_dashboard.profil.power_add_note"),
            t("cr1_dashboard.profil.power_contact"),
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-emerald-500/15 bg-emerald-500/5 p-4 text-[13px] text-white">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#6EE7B7]" />
              {item}
            </div>
          ))}
          {[
            t("cr1_dashboard.profil.restriction_products"),
            t("cr1_dashboard.profil.restriction_orders"),
            t("cr1_dashboard.profil.restriction_escrow"),
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
      <SectionShell kicker={t("cr1_dashboard.formation.kicker")} title={t("cr1_dashboard.formation.title")}>
        <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.15em] text-[#6EE7B7]">{t("cr1_dashboard.formation.progress")}</div>
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
            t("cr1_dashboard.formation.module_pickup"),
            t("cr1_dashboard.formation.module_navigation"),
            t("cr1_dashboard.formation.module_incidents"),
            t("cr1_dashboard.formation.module_safety"),
          ].map((item, index) => (
            <div key={item} className="flex items-center justify-between rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="font-semibold text-white">{item}</div>
              <div className="text-[12px] font-bold text-[#8B949E]">{index < 2 ? t("cr1_dashboard.formation.validated") : t("cr1_dashboard.formation.to_complete")}</div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.formation.cert_kicker")} title={t("cr1_dashboard.formation.cert_title")} accent="text-sky-300">
        <div className="space-y-3">
          {[
            t("cr1_dashboard.formation.badge_punctuality"),
            t("cr1_dashboard.formation.badge_communication"),
            t("cr1_dashboard.formation.badge_safety"),
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
    <SectionShell kicker={t("cr1_dashboard.notifications.kicker")} title={t("cr1_dashboard.notifications.title")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[12px] text-[#8B949E]">
          {t(notifications.length > 1 ? "cr1_dashboard.notifications.count_plural" : "cr1_dashboard.notifications.count", { count: notifications.length })}
          {" · "}
          {t(unreadNotifications > 1 ? "cr1_dashboard.notifications.unread_plural" : "cr1_dashboard.notifications.unread", { count: unreadNotifications })}
        </div>
        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllNotificationsRead}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-white"
          >
            {t("cr1_dashboard.notifications.mark_all_read")}
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
                  {!item.is_read ? ` · ${t("cr1_dashboard.notifications.new")}` : ""}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
            {t("cr1_dashboard.notifications.empty")}
          </div>
        )}
      </div>
    </SectionShell>
  );

  const renderIncidents = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker={t("cr1_dashboard.incidents.kicker")} title={t("cr1_dashboard.incidents.title")}>
        <div className="space-y-3">
          {[
            t("cr1_dashboard.incidents.case_client_absent"),
            t("cr1_dashboard.incidents.case_address_not_found"),
            t("cr1_dashboard.incidents.case_package_damaged"),
            t("cr1_dashboard.incidents.case_road_blocked"),
          ].map((item) => (
            <div key={item} className="rounded-[18px] border border-red-500/15 bg-red-500/5 p-4">
              <div className="font-bold text-white">{item}</div>
              <div className="mt-2 text-[13px] text-white/75">
                {t("cr1_dashboard.incidents.protocol_hint")}
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.incidents.protocols_kicker")} title={t("cr1_dashboard.incidents.protocols_title")} accent="text-sky-300">
        <div className="space-y-3">
          {[
            t("cr1_dashboard.incidents.advice_call_twice"),
            t("cr1_dashboard.incidents.advice_geolocated_photo"),
            t("cr1_dashboard.incidents.advice_report_vendor"),
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
      <SectionShell kicker={t("cr1_dashboard.litiges.kicker")} title={t("cr1_dashboard.litiges.title")}>
        <div className="space-y-3">
          {disputes.length ? (
            disputes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDispute(item)}
                className={`flex w-full gap-4 rounded-[18px] border p-4 text-left transition ${
                  selectedDispute?.id === item.id
                    ? "border-orange-300 bg-orange-50 dark:border-orange-500/35 dark:bg-orange-500/10"
                    : "border-slate-200 bg-slate-50 hover:bg-white dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                }`}
              >
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-300" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold text-slate-950 dark:text-white">{item.ref} · {item.label}</div>
                    <div className="text-[12px] font-bold text-orange-300">{item.status_display}</div>
                  </div>
                  <div className="mt-1 text-[13px] leading-6 text-slate-600 dark:text-white/75">{item.detail}</div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.14em] text-[#8B949E]">
                    {item.reason_display} · {new Date(item.updated_at).toLocaleString("fr-FR")}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] text-[#8B949E]">
              {t("cr1_dashboard.litiges.empty")}
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell kicker={t("cr1_dashboard.litiges.framework_kicker")} title={t("cr1_dashboard.litiges.framework_title")} accent="text-orange-300">
        <div className="space-y-3">
          {selectedDispute ? (
            <div className="rounded-[18px] border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.16em] text-orange-300">
                    {selectedDispute.ref} · {selectedDispute.reason_display}
                  </div>
                  <div className="mt-2 text-[14px] font-bold text-slate-950 dark:text-white">{selectedDispute.label}</div>
                  <div className="mt-2 text-[13px] leading-6 text-slate-700 dark:text-white/75">{selectedDispute.detail}</div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                  selectedDisputePermission === "granted"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                    : selectedDisputePermission === "requested"
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/65"
                }`}>
                  {selectedDisputePermission === "granted"
                    ? t("cr1_dashboard.litiges.permission_granted")
                    : selectedDisputePermission === "requested"
                      ? t("cr1_dashboard.litiges.permission_requested")
                      : t("cr1_dashboard.litiges.permission_locked")}
                </span>
              </div>

              {selectedDisputePermission === "granted" ? (
                <div className="mt-4 flex gap-3">
                  <input
                    value={disputeReplyDraft}
                    onChange={(event) => setDisputeReplyDraft(event.target.value)}
                    placeholder={t("cr1_dashboard.litiges.reply_placeholder")}
                    className="min-w-0 flex-1 rounded-[14px] border border-white/10 bg-[#0D1117] px-4 py-3 text-[13px] text-white outline-none placeholder:text-[#6B7280]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendDisputeReply()}
                    disabled={!disputeReplyDraft.trim()}
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-orange-500 text-white disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label={t("cr1_dashboard.litiges.reply_aria")}
                  >
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleRequestDisputeReply(selectedDispute)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-[12px] font-extrabold text-amber-300 transition hover:-translate-y-0.5"
                >
                  <LockKeyhole size={14} />
                  {t("cr1_dashboard.litiges.request_permission")}
                </button>
              )}

              {disputeFeedback ? (
                <div className="mt-3 rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-[12px] font-semibold text-white/70">
                  {disputeFeedback}
                </div>
              ) : null}
            </div>
          ) : null}

          {[
            t("cr1_dashboard.litiges.rule_provide_proof"),
            t("cr1_dashboard.litiges.rule_no_self_close"),
            t("cr1_dashboard.litiges.rule_reply_only_when_authorized"),
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-[16px] border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <div className="text-[13px] leading-6 text-slate-700 dark:text-white/80">{item}</div>
            </div>
          ))}
        </div>
      </SectionShell>
    </section>
  );

  const renderPreuves = () => (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionShell kicker={t("cr1_dashboard.preuves.kicker")} title={t("cr1_dashboard.preuves.title")}>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <InfoPill icon={QrCode} tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                {t("cr1_dashboard.preuves.scan_required")}
              </InfoPill>
              <InfoPill icon={FileBadge2}>{t("cr1_dashboard.preuves.photos_signature")}</InfoPill>
              <InfoPill icon={Store}>{t("cr1_dashboard.preuves.relay_hidden_vendor")}</InfoPill>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-white/75">
              {t("cr1_dashboard.preuves.intro")}
            </p>
          </div>

          {[
            ["1", t("cr1_dashboard.preuves.step1_title"), t("cr1_dashboard.preuves.step1_body")],
            ["2", t("cr1_dashboard.preuves.step2_title"), t("cr1_dashboard.preuves.step2_body")],
            ["3", t("cr1_dashboard.preuves.step3_title"), t("cr1_dashboard.preuves.step3_body")],
          ].map(([step, title, body]) => (
            <div key={step} className="flex gap-4 rounded-[18px] border border-white/5 bg-white/[0.03] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-extrabold text-emerald-300">
                {step}
              </div>
              <div>
                <div className="font-bold text-white">{title}</div>
                <div className="mt-1 text-[13px] leading-6 text-[#8B949E]">{body}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        kicker={t("cr1_dashboard.preuves.selected_kicker")}
        title={selectedShipment ? t("cr1_dashboard.preuves.file_number", { order: selectedShipment.order }) : t("cr1_dashboard.courses.no_mission")}
        accent="text-sky-300"
      >
        {selectedShipment ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                [t("cr1_dashboard.preuves.mission_code"), `BVY-${selectedShipment.order}-${selectedShipment.id}`],
                [t("cr1_dashboard.preuves.status_label"), statusLabel(t, selectedShipment.status)],
                [t("cr1_dashboard.common.zone"), selectedShipment.city || currentCourierCity],
                [t("cr1_dashboard.preuves.relay"), selectedShipment.relay_point || t("cr1_dashboard.preuves.relay_tbd")],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8B949E]">{label}</div>
                  <div className="mt-2 text-[14px] font-bold text-white">{value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-[18px] border border-amber-500/15 bg-amber-500/5 p-4 text-[13px] leading-6 text-amber-100">
              {t("cr1_dashboard.preuves.masked_names_notice")}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[t("cr1_dashboard.preuves.photo_label"), t("cr1_dashboard.preuves.photo_package"), t("cr1_dashboard.preuves.signature_relay_client")].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-center text-[12px] font-extrabold text-white/70"
                >
                  {item}
                  <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B949E]">
                    {t("cr1_dashboard.preuves.to_connect")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/10 p-6 text-[13px] leading-6 text-[#8B949E]">
            {t("cr1_dashboard.preuves.select_course_hint")}
          </div>
        )}
      </SectionShell>
    </section>
  );

  const renderParametres = () => (
    <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <SectionShell kicker={t("cr1_dashboard.parametres.kicker")} title={t("cr1_dashboard.parametres.title")}>
        <div className="grid gap-3 md:grid-cols-2">
          {([
            [t("cr1_dashboard.parametres.city"), currentCourierCity, MapPin],
            [t("cr1_dashboard.parametres.vehicle"), vehicleLabel(t, currentCourierVehicle), Bike],
            [t("cr1_dashboard.quick_stats.status"), currentIsOnline ? t("cr1_dashboard.common.available") : t("cr1_dashboard.common.offline"), Gauge],
            [t("cr1_dashboard.parametres.language"), currentCourierLanguage.toUpperCase(), Settings2],
            [t("cr1_dashboard.parametres.gps"), currentGpsGranted ? t("cr1_dashboard.common.authorized") : t("cr1_dashboard.common.not_authorized"), Navigation],
            [t("cr1_dashboard.parametres.camera"), currentCameraGranted ? t("cr1_dashboard.common.authorized_f") : t("cr1_dashboard.common.not_authorized_f"), ScanLine],
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

      <SectionShell kicker={t("cr1_dashboard.parametres.actions_kicker")} title={t("cr1_dashboard.parametres.frequent_settings")} accent="text-orange-300">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => updateCourierSettings("online", { is_online: !currentIsOnline })}
            className="flex w-full items-center justify-between rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
          >
            <span>{currentIsOnline ? t("cr1_dashboard.parametres.disable_available_mode") : t("cr1_dashboard.parametres.enable_available_mode")}</span>
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
                {t("cr1_dashboard.parametres.interface_language", { language: language.toUpperCase() })}
              </button>
            ))}
          </div>
          <div className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4">
            <label className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8B949E]">{t("cr1_dashboard.parametres.main_zone")}</label>
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
              {t("cr1_dashboard.parametres.gps_summary", { status: currentGpsGranted ? t("cr1_dashboard.common.authorized") : t("cr1_dashboard.parametres.to_verify") })}
            </button>
            <button
              type="button"
              onClick={() => updateCourierSettings("camera", { camera_permission_granted: !currentCameraGranted })}
              className="rounded-[16px] border border-white/5 bg-white/[0.03] p-4 text-left text-[13px] text-white/80 transition hover:bg-white/[0.06]"
            >
              {t("cr1_dashboard.parametres.camera_summary", { status: currentCameraGranted ? t("cr1_dashboard.common.authorized_f") : t("cr1_dashboard.parametres.to_verify") })}
            </button>
          </div>
          {settingsFeedback ? <div className="text-[13px] font-semibold text-emerald-300">{settingsFeedback}</div> : null}
        </div>
      </SectionShell>

      <div className="xl:col-span-2">
        <SectionShell kicker={t("cr1_dashboard.parametres.payouts_kicker")} title={t("cr1_dashboard.parametres.payouts_title")} accent="text-emerald-300">
          <PayoutAccountVerificationCard ownerRole="COURIER" accent="#10B981" surfaceClassName="border-white/10 bg-white/[0.04] text-white dark:bg-white/[0.04]" />
        </SectionShell>
      </div>
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
      case "preuves":
        return renderPreuves();
      case "parametres":
        return renderParametres();
      default:
        return null;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /**
   * Boutons ronds du bandeau. Le fond du header passe au blanc en theme clair :
   * sans cette bascule, `text-white bg-white/10` rendait la cloche, le theme et
   * la langue invisibles — blanc sur blanc.
   */
  const headerButton =
    theme === "dark"
      ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";

  return (
    <div className={theme === "dark" ? "belivay-portal min-h-screen bg-[radial-gradient(circle_at_top,#101828_0%,#070b14_55%,#04070d_100%)] text-[#E6EDF3]" : "belivay-portal min-h-screen bg-[#F4F7F5] text-slate-950"}>
      <div className="fixed inset-x-0 top-0 z-[1000] h-1 bg-white/5">
        <div
          className="h-full bg-[linear-gradient(90deg,#10B981,#6EE7B7)] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header className={theme === "dark" ? "fixed inset-x-0 top-1 z-[950] flex h-[58px] items-center gap-2 border-b border-emerald-500/10 bg-[linear-gradient(135deg,#02120d,#05261c_55%,#0b2f25)] px-3 shadow-[0_2px_22px_rgba(0,0,0,.4)] sm:gap-4 sm:px-4" : "fixed inset-x-0 top-1 z-[950] flex h-[58px] items-center gap-2 border-b border-emerald-200 bg-white px-3 shadow-[0_2px_22px_rgba(15,23,42,.10)] sm:gap-4 sm:px-4"}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Le tiroir s'ouvrant depuis la gauche, son bouton d'appel reste de
              ce cote : le geste et l'animation vont dans le meme sens. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("cr1_dashboard.header.open_menu")}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition active:scale-90 lg:hidden ${
              theme === "dark" ? "text-white hover:bg-white/10" : "text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            <MenuIcon size={21} strokeWidth={2.2} />
            {/* Le menu porte seul les alertes des destinations hors barre du
                bas : un point suffit a dire « il y a quelque chose la-dedans »
                sans encombrer l'icone d'un compteur. */}
            {hiddenBadgeTotal > 0 ? (
              <span
                aria-hidden
                className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#05261c]"
              />
            ) : null}
          </button>

          <div className="flex h-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 px-1.5 sm:h-10 sm:rounded-2xl sm:px-2">
            <img
              src="/belivay-logo.png"
              alt="BelivaY"
              className="h-8 w-auto sm:h-9"
              style={{ filter: "brightness(0) saturate(100%) invert(63%) sepia(54%) saturate(673%) hue-rotate(104deg) brightness(93%) contrast(92%)" }}
            />
          </div>
          <div className="min-w-0">
            <div className={theme === "dark" ? "truncate text-[14px] font-extrabold tracking-tight text-emerald-300 sm:text-[15px]" : "truncate text-[14px] font-extrabold tracking-tight text-emerald-700 sm:text-[15px]"}>{t("cr1_dashboard.header.title")}</div>
            <div className={theme === "dark" ? "truncate text-[10px] text-white/70 sm:text-[11px]" : "truncate text-[10px] text-slate-500 sm:text-[11px]"}>{isApprovedCourier ? "" : t("cr1_dashboard.header.profile_pending")}</div>
          </div>
        </div>

        {/* ── Reglages telephone/tablette ────────────────────────────────────
            Notifications, theme, langue et compte, dans le meme ordre que les
            autres portails BelivaY. Le bouton menu vit a l'extreme gauche du
            bandeau, du cote d'ou sort le tiroir. */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <button
            type="button"
            onClick={() => setTab("notifications")}
            aria-label={t("cr1_dashboard.header.notifications")}
            className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${headerButton}`}
          >
            <Bell size={16} />
            {unreadNotifications > 0 ? (
              <span className="absolute right-[-2px] top-[-2px] flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-black leading-none text-[#022c22]">
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t("cr1_dashboard.header.toggle_theme")}
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${headerButton}`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language === "fr" ? "en" : "fr")}
            className={`flex h-9 flex-shrink-0 items-center justify-center rounded-full border px-2.5 text-[10px] font-black tracking-[0.12em] transition active:scale-90 ${headerButton}`}
            aria-label={t("cr1_dashboard.header.toggle_language")}
          >
            {i18n.language.startsWith("fr") ? "FR" : "EN"}
          </button>

          <button
            type="button"
            onClick={() => setProfileSheetOpen(true)}
            aria-label={t("cr1_dashboard.header.my_account")}
            aria-haspopup="dialog"
            aria-expanded={profileSheetOpen}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#10B981,#065F46)] text-[11px] font-black text-white ring-1 ring-emerald-300/40 transition active:scale-90"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (user?.first_name?.[0] || user?.username?.[0] || "L").toUpperCase()
            )}
          </button>
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white">
            {currentIsOnline ? t("cr1_dashboard.common.available") : t("cr1_dashboard.common.offline")}
          </div>
          <button
            type="button"
            onClick={() => setTab("notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label={t("cr1_dashboard.header.notifications")}
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
            aria-label={t("cr1_dashboard.header.toggle_language")}
          >
            {i18n.language.startsWith("fr") ? "FR" : "EN"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label={t("cr1_dashboard.header.toggle_theme")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
            aria-label={t("cr1_dashboard.header.logout")}
            title={t("cr1_dashboard.header.logout")}
          >
            <LogOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => setTab("profil")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label={t("cr1_dashboard.header.user_account")}
          >
            <User size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-white/15"
          >
            {t("cr1_dashboard.header.client_account")}
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
                aria-label={t("cr1_dashboard.header.close_notification")}
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-[14px] leading-7 text-white/85">
              {selectedNotification.message}
            </div>
            {selectedNotification.action_url ? (
              <div className="mt-4 rounded-[16px] border border-white/5 bg-white/[0.03] p-3 text-[12px] text-[#8B949E]">
                {t("cr1_dashboard.header.backend_reference", { reference: selectedNotification.action_url })}
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
                aria-label={t("cr1_dashboard.header.close_dispute")}
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="mt-5 rounded-[18px] border border-white/5 bg-white/[0.03] p-4 text-[14px] leading-7 text-white/85">
              {selectedDispute.detail}
            </div>
            <div className="mt-4 rounded-[16px] border border-white/5 bg-white/[0.03] p-3 text-[12px] text-[#8B949E]">
              {t("cr1_dashboard.header.dispute_reason", { reason: selectedDispute.reason_display })}
            </div>
          </div>
        </div>
      ) : null}

      <CourierSidebar
        activeTab={tab}
        onSelect={setTab}
        onLogout={handleLogout}
        badges={navBadges}
        courier={courierIdentity}
        footer={courierFooter}
      />

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
            <EvidenceRequestInbox accent="#10B981" />
            {/* Bandeau de contexte. Sur telephone il se resserre — coins et
                marges reduits, titre plus court, trois faits en une seule
                rangee — pour ne pas repousser le contenu du jour sous la ligne
                de flottaison. Rien n'est retire : tout reste lisible, en plus
                dense. */}
            <section className="overflow-hidden rounded-[22px] border border-emerald-500/10 bg-[linear-gradient(135deg,#0E1522,#10251d_58%,#111827)] p-4 shadow-[0_20px_56px_rgba(0,0,0,.32)] sm:rounded-[28px] sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300 sm:text-[11px] sm:tracking-[0.16em]">
                    <ShieldCheck size={13} />
                    {t("cr1_dashboard.header.actor_badge")}
                  </div>
                  <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-white sm:text-[30px]">
                    {t(TAB_LABEL_KEYS[tab])}
                  </h1>
                  <p className="mt-2 max-w-[760px] text-[12.5px] leading-6 text-[#8B949E] sm:text-[14px] sm:leading-7">
                    {t("cr1_dashboard.header.description")}
                  </p>
                </div>
                {/* Trois faits courts (une ville, un vehicule, un etat) : en
                    rangee de trois des le telephone, ils tiennent sur une ligne
                    au lieu d'ajouter trois blocs a faire defiler. */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:flex-shrink-0">
                  {([
                    [t("cr1_dashboard.parametres.city"), currentCourierCity, "text-emerald-300", "border-emerald-500/10"],
                    [t("cr1_dashboard.header.fact_vehicle"), vehicleLabel(t, currentCourierVehicle), "text-green-300", "border-green-500/10"],
                    [
                      t("cr1_dashboard.quick_stats.status"),
                      currentIsOnline ? t("cr1_dashboard.common.available") : isApprovedCourier ? t("cr1_dashboard.common.offline") : t("cr1_dashboard.common.pending"),
                      "text-emerald-300",
                      "border-emerald-500/10",
                    ],
                  ] as Array<[string, string, string, string]>).map(([label, value, tone, border]) => (
                    <div key={label} className={`rounded-[16px] border bg-white/5 p-3 sm:rounded-[20px] sm:p-4 ${border}`}>
                      <div className="text-[9px] uppercase leading-tight tracking-[0.1em] text-[#8B949E] sm:text-[11px] sm:tracking-[0.16em]">
                        {label}
                      </div>
                      <div className={`mt-1.5 break-words text-[14px] font-extrabold leading-tight sm:mt-2 sm:text-[22px] ${tone}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {renderCurrentTab()}
          </div>
        )}
      </main>

      {/* Barre du bas : uniquement les quatre raccourcis du travail
          quotidien. Le reste du menu s'ouvre par l'icone du bandeau — une
          seule liste de destinations, donc un seul endroit ou le livreur
          apprend a chercher. */}
      <CourierMobileNav activeTab={tab} onSelect={setTab} badges={navBadges} />

      <CourierDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={tab}
        onSelect={(next) => {
          setDrawerOpen(false);
          setTab(next);
        }}
        onLogout={handleLogout}
        badges={navBadges}
        courier={courierIdentity}
        footer={courierFooter}
      />

      {/* Feuille compte : ouverte par l'avatar, elle glisse depuis la droite —
          le tiroir de navigation vient de gauche, les deux gestes restent donc
          distincts meme quand les deux panneaux ont ete appris. */}
      <CourierProfileSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        locale={i18n.language.startsWith('en') ? 'en' : 'fr'}
        theme={theme}
        onToggleTheme={toggleTheme}
        onChangeLanguage={(next) => void updateCourierSettings('language', { preferred_language: next })}
        courier={{
          name: courierIdentity.name,
          username: user?.username || "",
          email: user?.email || "",
          city: courierIdentity.city,
          vehicle: courierIdentity.vehicle,
          zones: currentCourierZones,
          accountStatus: isApprovedCourier ? t("cr1_dashboard.common.approved") : t("cr1_dashboard.common.under_review"),
          online: currentIsOnline,
          trustScore: dashboard
            ? `${dashboard.trust_score.score.toFixed(1)} · ${dashboard.trust_score.tier_display}`
            : null,
          // Le certificat n'existe qu'une fois le dossier approuve : avant, le
          // QR renverrait vers une fiche livreur qui n'est pas encore publique.
          courierRef:
            isApprovedCourier && courierProfile?.id
              ? `BV-LIV-${String(courierProfile.id).padStart(4, "0")}`
              : "",
          memberSince: courierProfile?.created_at || null,
        }}
        avatarUrl={user?.avatar_url || undefined}
        onAvatarFile={setAvatarFile}
        gpsGranted={currentGpsGranted}
        cameraGranted={currentCameraGranted}
        onToggleGps={() => void updateCourierSettings('gps', { gps_permission_granted: !currentGpsGranted })}
        onToggleCamera={() => void updateCourierSettings('camera', { camera_permission_granted: !currentCameraGranted })}
        savingLabel={settingsSaving}
        onLogout={handleLogout}
        onNavigate={(next) => {
          setProfileSheetOpen(false);
          setTab(next);
        }}
        onFeedback={setSettingsFeedback}
        footer={courierFooter}
      />
      {avatarFile ? (
        <AvatarCropDialog
          file={avatarFile}
          accent="#10B981"
          onClose={() => setAvatarFile(null)}
          onUploaded={(updatedUser) => {
            setUser(updatedUser);
            setAvatarFile(null);
            setSettingsFeedback(t("cr1_dashboard.profil.photo_updated"));
          }}
        />
      ) : null}
    </div>
  );
}
