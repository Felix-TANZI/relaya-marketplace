import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import EvidenceRequestInbox from "@/components/disputes/EvidenceRequestInbox";
import type { LocationPrecisionResult } from "@/services/api/location";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bell,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  HelpCircle,
  IdCard,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu as MenuIcon,
  LogOut,
  MessageSquareText,
  Moon,
  PackageCheck,
  PackagePlus,
  QrCode,
  Scale,
  ShieldCheck,
  Sun,
  TimerReset,
  Truck,
  UserCircle,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { http } from "@/services/api/http";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import RelayReception, { type RelayArrival } from "./RelayReception";
import RelayFinances from "./RelayFinances";
import RelayReviews from "./RelayReviews";
import RelayTrust, { type RelayTrustScore } from "./RelayTrust";
import RelayTraining from "./RelayTraining";
import RelayReports from "./RelayReports";
import RelayClosure from "./RelayClosure";
import RelayInbox from "./RelayInbox";
import RelayOnboarding from "./RelayOnboarding";
import RelaySidebar from "./RelaySidebar";
import RelayMobileNav from "./RelayMobileNav";
import RelayDrawer from "./RelayDrawer";
import RelayProfileSheet, { RelaySettingsContent, type RelaySettingsProps } from "./RelayProfileSheet";
import { RELAY_TABS, type RelayNavGroup, type RelayTab } from "./relayNav";
import { Panel, StatusPill } from "./RelayUi";

function getInitialRelayTab(): RelayTab {
  const requested = new URLSearchParams(window.location.search).get("tab") as RelayTab | null;
  return requested && RELAY_TABS.includes(requested) ? requested : "dashboard";
}

interface RelayParcel {
  id: number;
  shipment_id: number;
  order_id: number;
  status: string;
  slot_code: string;
  pickup_code: string;
  customer_phone: string;
  delivery_address: string;
  city: string;
  parcel_size: string;
  parcel_size_label: string;
  courier_ref: string;
  courier_vehicle_label: string;
  received_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
  updated_at: string;
}

interface RelayNotification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

interface RelayDispute {
  id: number;
  ref: string;
  order_id: number;
  reason_display: string;
  status_display: string;
  description: string;
  city?: string;
  delivery_address?: string;
  address_precision?: Partial<LocationPrecisionResult>;
  updated_at: string;
}

interface ComplianceDocument {
  id: number;
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
}

const relayCopy = {
  fr: {
    groups: {
      pilotage: "Pilotage",
      operations: "Opérations",
      qualite: "Qualité",
      gestion: "Gestion",
      risque: "Risque",
      compte: "Compte",
    } satisfies Record<RelayNavGroup, string>,
    tabs: {
      dashboard: "Tableau de bord",
      reception: "Réception colis",
      stock: "Colis en stock",
      retrait: "Retrait acheteur",
      historique: "Historique 30 j",
      notifications: "Notifications",
      trust: "Trust Score PR",
      avis: "Avis acheteurs",
      niveaux: "Niveaux PR",
      formation: "Formation",
      finances: "Finances MoMo",
      rapports: "Rapports & export",
      capacite: "Capacité & horaires",
      reseau: "Réseau partenaires",
      fermeture: "Fermeture exceptionnelle",
      litiges: "Litiges",
      kyc: "Documents KYC",
      inscription: "Inscription & cycle de vie",
      messagerie: "Messagerie support",
      aide: "Aide & support",
      parametres: "Paramètres",
      tokens: "Relais Tokens",
    } satisfies Record<RelayTab, string>,
    space: "Espace gérant point relais",
    brand: "Point relais",
    brandKicker: "Point relais · Partenaire",
    footer: [
      "BelivaY Point Relais v1.0 — Juillet 2026",
      "Partenaire Indépendant · ANTIC · OHADA",
      "Anonymat V5 ch.1",
    ],
    profile: "Profil",
    openProfile: "Ouvrir le profil",
    logout: "Se déconnecter",
    close: "Fermer",
    emptyArrivals: "Aucune arrivée livreur connectée pour le moment.",
    emptyActivity: "Aucune activité opérationnelle connectée pour le moment.",
    emptyStock: "Aucun colis en stock connecté pour le moment.",
    dev: "En dev",
  },
  en: {
    groups: {
      pilotage: "Overview",
      operations: "Operations",
      qualite: "Quality",
      gestion: "Management",
      risque: "Risk",
      compte: "Account",
    } satisfies Record<RelayNavGroup, string>,
    tabs: {
      dashboard: "Dashboard",
      reception: "Parcel reception",
      stock: "Stored parcels",
      retrait: "Buyer pickup",
      historique: "History 30 d",
      notifications: "Notifications",
      trust: "Relay trust score",
      avis: "Buyer reviews",
      niveaux: "Relay levels",
      formation: "Training",
      finances: "MoMo finances",
      rapports: "Reports & export",
      capacite: "Capacity & hours",
      reseau: "Partner network",
      fermeture: "Exceptional closure",
      litiges: "Disputes",
      kyc: "KYC documents",
      inscription: "Onboarding & lifecycle",
      messagerie: "Support inbox",
      aide: "Help & support",
      parametres: "Settings",
      tokens: "Relay tokens",
    } satisfies Record<RelayTab, string>,
    space: "Relay point manager workspace",
    brand: "Relay point",
    brandKicker: "Relay point · Partner",
    footer: [
      "BelivaY Relay Point v1.0 — July 2026",
      "Independent partner · ANTIC · OHADA",
      "Anonymity V5 ch.1",
    ],
    profile: "Profile",
    openProfile: "Open profile",
    logout: "Log out",
    close: "Close",
    emptyArrivals: "No courier arrival connected yet.",
    emptyActivity: "No operational activity connected yet.",
    emptyStock: "No stored parcel connected yet.",
    dev: "In dev",
  },
};

const history: Array<[string, string, string, string]> = [];

const training = [
  ["Réception & garde des colis", "Obligatoire", "Scan QR, contrôle colis, photos et transfert de responsabilité."],
  ["Vérification CNI et code retrait", "Obligatoire", "Remise uniquement après code valide et contrôle d'identité si requis."],
  ["Sécurité du stockage", "Recommandé", "Classement par slot, anonymat vendeur et protection contre les pertes."],
  ["Gestion litige & médiateur", "Recommandé", "Escalade J+7, retour vendeur ou arbitrage BelivaY."],
];

function anonymizedBuyerRef(parcel: RelayParcel) {
  const seed = `${parcel.order_id || parcel.id}`.padStart(4, "0").slice(-4);
  return `BV-ACH-${seed}`;
}

function precisionTone(score: number): "emerald" | "amber" | "red" {
  return score >= 75 ? "emerald" : score >= 55 ? "amber" : "red";
}

function PrecisionHint({ precision }: { precision?: Partial<LocationPrecisionResult> }) {
  if (!precision || typeof precision.precisionScore !== "number") return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <StatusPill tone={precisionTone(precision.precisionScore)}>Précision {precision.precisionScore}/100</StatusPill>
      {precision.driverHint ? <span className="text-xs font-semibold text-amber-900/75 dark:text-amber-100/75">{precision.driverHint}</span> : null}
    </div>
  );
}

export default function RelayPointPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTabState] = useState<RelayTab>(getInitialRelayTab);
  const [tabHistory, setTabHistory] = useState<RelayTab[]>([]);
  const tabRef = useRef<RelayTab>(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // Le portail relais est mono-page : la fleche de retour rejoue la pile des
  // onglets visites, puis retombe sur le dashboard, puis sur l'historique du
  // navigateur si le gerant veut vraiment sortir du portail.
  const setTab = useCallback((next: RelayTab) => {
    const current = tabRef.current;
    if (current === next) return;
    setTabHistory((previous) => [...previous, current].slice(-20));
    setTabState(next);
  }, []);
  const [pickupCode, setPickupCode] = useState("");
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [relayParcels, setRelayParcels] = useState<RelayParcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(true);
  const [capacityInput, setCapacityInput] = useState("");
  const [hoursInput, setHoursInput] = useState("");
  const [notifications, setNotifications] = useState<RelayNotification[]>([]);
  const [relayDisputes, setRelayDisputes] = useState<RelayDispute[]>([]);
  const [operationBusy, setOperationBusy] = useState(false);
  const [operationMessage, setOperationMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [complianceDocuments, setComplianceDocuments] = useState<ComplianceDocument[]>([]);
  const locale = i18n.language.startsWith("en") ? "en" : "fr";
  const ui = relayCopy[locale];
  const activeLabel = ui.tabs[tab] ?? ui.brand;
  const relayAccount = user?.relay_point_profile;
  useEffect(() => {
    setAvatarUrl(user?.avatar_url || "");
  }, [user?.avatar_url]);
  const refreshRelayData = useCallback(async () => {
    setParcelsLoading(true);
    const [parcelResult, notificationResult, disputeResult, documentResult] = await Promise.allSettled([
      http<RelayParcel[]>("/api/shipping/relay-point/parcels/"),
      http<RelayNotification[]>("/api/auth/notifications/"),
      http<RelayDispute[]>("/api/auth/relay-point/disputes/open/"),
      http<ComplianceDocument[]>("/api/auth/compliance-documents/"),
    ]);
    setRelayParcels(parcelResult.status === "fulfilled" && Array.isArray(parcelResult.value) ? parcelResult.value : []);
    setNotifications(notificationResult.status === "fulfilled" && Array.isArray(notificationResult.value) ? notificationResult.value : []);
    setRelayDisputes(disputeResult.status === "fulfilled" && Array.isArray(disputeResult.value) ? disputeResult.value : []);
    setComplianceDocuments(documentResult.status === "fulfilled" && Array.isArray(documentResult.value) ? documentResult.value : []);
    setParcelsLoading(false);
  }, []);

  useEffect(() => {
    void refreshRelayData();
  }, [refreshRelayData]);

  // Score de confiance affiche dans le menu lateral et le tableau de bord.
  // Il est calcule par le serveur a partir des operations reelles.
  const [trustScore, setTrustScore] = useState(0);
  useEffect(() => {
    http<RelayTrustScore>("/api/auth/trust-score/?role=RELAY_POINT")
      .then((payload) => setTrustScore(Math.round(payload.score)))
      .catch(() => setTrustScore(0));
  }, []);

  const parcels = useMemo(
    () =>
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status))
        .map((parcel) => ({
          ref: `BV-${parcel.order_id}`,
          slot: parcel.slot_code || "A definir",
          buyer: anonymizedBuyerRef(parcel),
          age: parcel.received_at ? new Date(parcel.received_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR") : "-",
          status: parcel.status === "STORED" ? (locale === "en" ? "Stored" : "Stocke") : parcel.status,
          tone: "emerald" as const,
        })),
    [locale, relayParcels],
  );

  const arrivals = useMemo<RelayArrival[]>(
    () =>
      relayParcels
        .filter((parcel) => parcel.status === "EXPECTED")
        .map((parcel) => ({
          id: parcel.id,
          shipmentId: parcel.shipment_id,
          orderId: parcel.order_id,
          internalRef: `BV-${parcel.order_id}`,
          courierRef: parcel.courier_ref || "",
          vehicleLabel: parcel.courier_vehicle_label || "",
          sizeLabel: parcel.parcel_size_label || "Taille non renseignée",
          buyerRef: anonymizedBuyerRef(parcel),
          pickupCode: parcel.pickup_code || "",
        })),
    [relayParcels],
  );

  const suggestedSlot = useMemo(() => {
    const used = new Set(
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status))
        .map((parcel) => (parcel.slot_code || "").toUpperCase()),
    );
    for (let index = 1; index <= 999; index += 1) {
      const candidate = `A-${String(index).padStart(2, "0")}`;
      if (!used.has(candidate)) return candidate;
    }
    return "";
  }, [relayParcels]);

  const navBadges = useMemo<Partial<Record<RelayTab, number>>>(
    () => ({
      reception: arrivals.length,
      stock: parcels.length,
      retrait: relayParcels.filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status) && parcel.pickup_code).length,
      notifications: notifications.filter((notification) => !notification.is_read).length,
      litiges: relayDisputes.length,
    }),
    [arrivals.length, notifications, parcels.length, relayDisputes.length, relayParcels],
  );

  /**
   * Alertes des destinations absentes de la barre du bas. Elles remontent sur
   * l'icone de menu du bandeau : sans ce report, un litige ouvert resterait
   * invisible sur telephone tant que le tiroir n'est pas ouvert.
   */
  const hiddenBadgeTotal = useMemo(() => {
    // « notifications » a deja sa cloche dans le bandeau : la recompter ici
    // afficherait deux fois la meme alerte a 40 pixels d'ecart.
    const alreadyVisible: RelayTab[] = ["dashboard", "reception", "retrait", "stock", "notifications"];
    return Object.entries(navBadges).reduce(
      (total, [id, count]) => (alreadyVisible.includes(id as RelayTab) ? total : total + (count || 0)),
      0,
    );
  }, [navBadges]);

  const isKycApproved = relayAccount?.status === "APPROVED";
  const isSuspended = relayAccount?.status === "SUSPENDED";
  const hasCapacity = Number(relayAccount?.storage_capacity || 0) > 0;
  const hasHours = Boolean(relayAccount?.opening_hours?.trim());
  const operationalStatus = isSuspended
    ? "Suspendu"
    : isKycApproved && hasCapacity && hasHours
      ? "Ouvert"
      : "En configuration";
  const readiness = [
    ["KYC BelivaY", isKycApproved, isKycApproved ? "Validé" : "À valider par BelivaY"],
    ["Capacité", hasCapacity, hasCapacity ? `${relayAccount?.storage_capacity} places déclarées` : "Nombre de places à déclarer"],
    ["Horaires", hasHours, hasHours ? relayAccount?.opening_hours || "" : "Jours et créneaux à définir"],
  ] as const;
  const kycItems = [
    ["Pièce d'identité du gérant", isKycApproved ? "Vérifié" : "À envoyer", "CNI ou passeport du responsable opérationnel."],
    ["Registre ou preuve d'activité", isKycApproved ? "Vérifié" : "À envoyer", "Document permettant d'identifier le point de dépôt."],
    ["Numéro MoMo de reversement", isKycApproved ? "Vérifié" : "À configurer", "Compte utilisé pour les paiements hebdomadaires."],
    ["Photos du local", isKycApproved ? "Vérifié" : "À envoyer", "Entrée, espace de stockage et zone de remise client."],
    ["Validation physique BelivaY", isKycApproved ? "Validée" : "À planifier", "Contrôle terrain avant ouverture opérationnelle."],
  ] as const;

  const relayProfile = {
    name: relayAccount?.name || "Point relais BelivaY",
    manager: relayAccount?.manager_name || user?.first_name || user?.username || "Gerant",
    city: relayAccount?.city || "Ville a definir",
    address: relayAccount?.address || "Adresse a completer",
    hours: relayAccount?.opening_hours || "Horaires a completer",
    status: operationalStatus,
    trust: trustScore,
    capacityUsed: parcels.length,
    capacityMax: relayAccount?.storage_capacity || 0,
    tokens: 0,
    monthlyRevenue: 0,
  };

  /** Identite du declarant reprise par les ecrans fermeture, messagerie et inscription. */
  const relayIdentity = {
    name: relayProfile.name,
    email: user?.email || "support@belivay.com",
    phone: relayAccount?.phone || "",
    address: relayProfile.address,
    status: relayAccount?.status ?? null,
  };
  const capacityPct = Math.round((relayProfile.capacityUsed / relayProfile.capacityMax) * 100);
  const safeCapacityPct = Number.isFinite(capacityPct) ? capacityPct : 0;
  const statusTone = relayProfile.status === "Ouvert" ? "emerald" : relayProfile.status === "Suspendu" ? "red" : "amber";
  const switchLanguage = () => i18n.changeLanguage(i18n.language.startsWith("fr") ? "en" : "fr");
  const changeLanguage = (next: "fr" | "en") => void i18n.changeLanguage(next);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const goBack = () => {
    if (tabHistory.length > 0) {
      setTabState(tabHistory[tabHistory.length - 1]);
      setTabHistory((previous) => previous.slice(0, -1));
      return;
    }
    if (tab !== "dashboard") {
      setTabState("dashboard");
      return;
    }
    navigate(-1);
  };

  // Reference stable : les modules enfants (rapports, fermeture, inscription...)
  // declenchent leurs chargements sur cette fonction, elle ne doit pas changer
  // a chaque rendu du portail.
  const showOperationError = useCallback((error: unknown) => {
    setOperationMessage({ tone: "error", text: error instanceof Error ? error.message : "Impossible de terminer cette action." });
  }, []);

  const showOperationSuccess = useCallback((text: string) => {
    setOperationMessage({ tone: "success", text });
  }, []);

  /** Reception issue du workflow scan : slot + preuves resumees dans le proof_note. */
  const receiveScannedParcel = async ({
    shipmentId,
    slotCode,
    proofNote,
  }: {
    shipmentId: number;
    slotCode: string;
    proofNote: string;
  }): Promise<boolean> => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http<RelayParcel>("/api/shipping/relay-point/receive/", {
        method: "POST",
        body: JSON.stringify({ shipment_id: shipmentId, slot_code: slotCode, proof_note: proofNote }),
      });
      setOperationMessage({
        tone: "success",
        text: slotCode
          ? `Colis réceptionné et placé en stock au slot ${slotCode}.`
          : "Colis réceptionné, tracé et placé en stock.",
      });
      await refreshRelayData();
      return true;
    } catch (error) {
      showOperationError(error);
      return false;
    } finally {
      setOperationBusy(false);
    }
  };

  const pickupParcel = async () => {
    const parcel = relayParcels.find(
      (item) => ["RECEIVED", "STORED"].includes(item.status) && item.pickup_code.toUpperCase() === pickupCode.toUpperCase(),
    );
    if (!parcel) {
      setOperationMessage({ tone: "error", text: "Aucun colis en stock ne correspond à ce code de retrait." });
      return;
    }
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http<RelayParcel>("/api/shipping/relay-point/pickup/", {
        method: "POST",
        body: JSON.stringify({ parcel_id: parcel.id, pickup_code: pickupCode.toUpperCase(), proof_note: "Remise confirmée au guichet" }),
      });
      setOperationMessage({ tone: "success", text: `Retrait de la commande BV-${parcel.order_id} confirmé.` });
      setPickupCode("");
      await refreshRelayData();
    } catch (error) {
      showOperationError(error);
    } finally {
      setOperationBusy(false);
    }
  };

  const updateRelaySettings = async (payload: { storage_capacity?: number; opening_hours?: string }) => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http("/api/auth/relay-point/profile/", { method: "PATCH", body: JSON.stringify(payload) });
      setOperationMessage({ tone: "success", text: "Configuration du point relais enregistrée." });
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      showOperationError(error);
      setOperationBusy(false);
    }
  };

  const sendRelaySupportMessage = async () => {
    if (supportSubject.trim().length < 3 || supportBody.trim().length < 10) return;
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({ name: relayProfile.name, email: user?.email || "support@belivay.com", phone: relayAccount?.phone || "", subject: `[Point relais] ${supportSubject.trim()}`, message: supportBody.trim() }),
      });
      setSupportSubject("");
      setSupportBody("");
      setOperationMessage({ tone: "success", text: "Demande transmise au support BelivaY." });
    } catch (error) {
      showOperationError(error);
    } finally {
      setOperationBusy(false);
    }
  };

  const uploadRelayDocument = async (documentType: string, file?: File) => {
    if (!file) return;
    const compressedFile = await ensureImageUnderLimit(file);
    setOperationBusy(true);
    setOperationMessage(null);
    const body = new FormData();
    body.append("document_type", documentType);
    body.append("file", compressedFile);
    try {
      await http<ComplianceDocument>("/api/auth/compliance-documents/", { method: "POST", body });
      await refreshRelayData();
      setOperationMessage({ tone: "success", text: "Document envoyé pour vérification BelivaY." });
    } catch (error) {
      showOperationError(error);
    } finally {
      setOperationBusy(false);
    }
  };


  const renderDashboard = () => (
    <div className="space-y-5">
      {/* Deux cartes par rangee des le telephone : empilees une par une, ces
          quatre reperes poussaient les arrivees du jour sous la ligne de
          flottaison. En 2x2 le gerant les embrasse d'un seul regard. */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          ["Arrivees a confirmer", arrivals.length.toString(), PackagePlus, "Scan QR + preuves"],
          ["Colis en stock", parcels.length.toString(), PackageCheck, "Slots anonymisés"],
          ["Capacite", `${relayProfile.capacityUsed}/${relayProfile.capacityMax}`, Warehouse, `${safeCapacityPct}% utilise`],
          [ui.tabs.tokens, ui.dev, BadgeCheck, locale === "en" ? "Module pending" : "Module en cours"],
        ].map(([label, value, Icon, sub]) => (
          <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            {/* Libelle et icone sur la meme ligne : a demi-largeur, une pastille
                posee au-dessus du texte mangeait la moitie de la carte. */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-[10px] font-black uppercase leading-tight tracking-[0.1em] text-slate-500 sm:text-[11px] sm:tracking-[0.14em]">
                {label as string}
              </div>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200 sm:h-11 sm:w-11 sm:rounded-2xl">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black leading-none text-slate-950 dark:text-white sm:mt-3 sm:text-3xl">{value as string}</div>
            <div className="mt-1.5 text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">{sub as string}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          kicker="Arrivees prevues"
          title="Livreurs en approche"
          action={<button onClick={() => setTab("reception")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white">Receptionner</button>}
        >
          <div className="space-y-3">
            {arrivals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                {ui.emptyArrivals}
              </div>
            ) : arrivals.map((arrival) => (
              <div key={arrival.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="font-black text-slate-950 dark:text-white">{arrival.internalRef} · {arrival.sizeLabel}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {arrival.courierRef || "Livreur à assigner"}{arrival.vehicleLabel ? ` · ${arrival.vehicleLabel}` : ""}
                    </div>
                  </div>
                </div>
                <button onClick={() => setTab("reception")} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700">
                  Scanner QR
                </button>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="Trust & revenus" title="Performance point relais">
          <div className="flex items-center gap-5">
            <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-full border-[10px] border-blue-100 bg-white dark:border-blue-950 dark:bg-slate-900">
              <div className="text-center">
                <div className="text-3xl font-black text-blue-700">{relayProfile.trust}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">/100</div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <StatusPill tone={relayProfile.trust > 0 ? "blue" : "slate"}>{relayProfile.trust > 0 ? "Score public acheteur" : "Score en attente de données"}</StatusPill>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Le Trust Score dépend de la ponctualité, de la sécurité du stockage, des retraits sans litige et de la satisfaction acheteur.
                Il reste à 0 tant que BelivaY n'a pas assez d'opérations réelles pour le calculer.
              </p>
              <button onClick={() => setTab("trust")} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-blue-700">
                Voir le detail <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel kicker="Workflow guichet" title="Actions attendues">
          <div className="space-y-3">
            {[
              ["1", "Reception livreur", "Scanner la mission, controler l'etat du colis, prendre les preuves.", QrCode],
              ["2", "Stockage anonyme", "Attribuer un slot sans exposer le vendeur ni le détail client inutile.", Warehouse],
              ["3", "Retrait acheteur", "Vérifier le code de retrait et la pièce d'identité si BelivaY l'exige.", KeyRound],
              ["4", "Litige J+7", "Remonter tout colis bloque, endommage ou non retire.", Scale],
            ].map(([step, title, body, Icon]) => (
              <div key={step as string} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">Etape {step as string}</div>
                  <div className="font-black text-slate-950 dark:text-white">{title as string}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel kicker="Activite recente" title="Journal operationnel">
          <div className="grid gap-3">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                {ui.emptyActivity}
              </div>
            ) : history.map(([time, action, ref, detail]) => (
              <div key={`${time}-${ref}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm text-slate-950 dark:text-white">{action}</strong>
                  <span className="text-xs font-bold text-slate-400">{time}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ref} · {detail}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );

  const renderReception = () => (
    <RelayReception
      arrivals={arrivals}
      loading={parcelsLoading}
      busy={operationBusy}
      suggestedSlot={suggestedSlot}
      managerName={relayProfile.manager}
      onReceive={receiveScannedParcel}
    />
  );

  const renderStock = () => (
    <div className="space-y-5">
      <Panel kicker="Stock anonyme" title="Colis en stock">
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-blue-950">Capacite utilisee</span>
            <strong className="text-sm text-blue-700">{safeCapacityPct}%</strong>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div className={`h-full ${safeCapacityPct > 85 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${safeCapacityPct}%` }} />
          </div>
        </div>
        <div className="grid gap-3 md:hidden">
          {parcelsLoading ? (
            <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5 text-sm font-semibold text-blue-900">Chargement des colis...</div>
          ) : parcels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              {ui.emptyStock}
            </div>
          ) : parcels.map((parcel) => (
            <article key={parcel.ref} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-950 dark:text-white">{parcel.ref}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{parcel.buyer}</p>
                </div>
                <StatusPill tone={parcel.tone as "emerald" | "amber" | "red"}>{parcel.status}</StatusPill>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Slot</div>
                  <div className="mt-1 font-black text-slate-950 dark:text-white">{parcel.slot}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 dark:bg-slate-900">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Recu</div>
                  <div className="mt-1 font-black text-slate-950 dark:text-white">{parcel.age}</div>
                </div>
              </div>
              <button onClick={() => setTab("retrait")} className="mt-3 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">Passer au retrait</button>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="py-3">Reference</th>
                <th>Slot</th>
                <th>Acheteur</th>
                <th>Delai</th>
                <th>Statut</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parcels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm font-semibold text-slate-500">
                    {ui.emptyStock}
                  </td>
                </tr>
              ) : parcels.map((parcel) => (
                <tr key={parcel.ref}>
                  <td className="py-4 font-black text-slate-950">{parcel.ref}</td>
                  <td>{parcel.slot}</td>
                  <td>{parcel.buyer}</td>
                  <td>{parcel.age}</td>
                  <td><StatusPill tone={parcel.tone as "emerald" | "amber" | "red"}>{parcel.status}</StatusPill></td>
                  <td className="text-right">
                    <button onClick={() => setTab("retrait")} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700">Retrait</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );

  const renderRetrait = () => (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel kicker="Retrait acheteur" title="Code de retrait">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Code a 6 chiffres</label>
          <input
            value={pickupCode}
            onChange={(event) => setPickupCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6))}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-3xl font-black tracking-[0.35em] outline-none focus:border-blue-500"
            placeholder="000000"
          />
          <button type="button" onClick={pickupParcel} disabled={operationBusy || pickupCode.length !== 6} className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45">
            {operationBusy ? "Vérification..." : "Vérifier et remettre"}
          </button>
        </div>
      </Panel>
      <Panel kicker="Procedure de remise" title="Verification avant sortie">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Code retrait", "Correspondance exacte avec le colis.", KeyRound],
            ["Identité", "Contrôle CNI si requis par BelivaY.", IdCard],
            ["Photo remise", "Preuve de remise avant clôture.", Camera],
          ].map(([title, body, Icon]) => (
            <div key={title as string} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <Icon className="text-blue-700" size={22} />
              <div className="mt-3 font-black text-slate-950">{title as string}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{body as string}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderTrust = () => <RelayTrust onError={showOperationError} />;

  const renderTokens = () => (
    <Panel kicker="Relais Tokens" title="Module en cours de developpement">
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <BadgeCheck size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">Relais Tokens en cours de developpement</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          La logique de tokens point relais sera activee plus tard. Pour la phase actuelle, BelivaY conserve le module visible,
          mais aucun solde fictif n'est affiche.
        </p>
      </div>
    </Panel>
  );

  const renderNiveaux = () => (
    <Panel kicker="Niveaux PR" title="Module en cours de developpement">
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <Layers3 size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">Niveaux PR en cours de developpement</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          La vue finale prevoit des paliers Starter, Confirme et Premium avec quotas, remuneration et avantages.
          Pour la phase actuelle, BelivaY n'active pas encore cette logique.
        </p>
      </div>
    </Panel>
  );

  const renderFinances = () => <RelayFinances onError={showOperationError} />;

  const renderCapacite = () => (
    <Panel kicker="Capacite & horaires" title="Disponibilite du point relais">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
          <Warehouse className="text-blue-700 dark:text-blue-300" />
          <div className="mt-3 font-black text-slate-950 dark:text-white">Stockage par slots</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {relayProfile.capacityUsed} colis stockés sur {relayProfile.capacityMax} places. La capacité doit être déclarée avant ouverture.
          </p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
            <div className={`h-full ${safeCapacityPct > 85 ? "bg-amber-500" : "bg-blue-600"}`} style={{ width: `${safeCapacityPct}%` }} />
          </div>
          <div className="mt-4 flex gap-2">
            <input value={capacityInput} onChange={(event) => setCapacityInput(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`${relayProfile.capacityMax || 50}`} className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-4 py-2 font-bold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
            <button type="button" disabled={operationBusy || !capacityInput} onClick={() => void updateRelaySettings({ storage_capacity: Number(capacityInput) })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Enregistrer</button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
          <Clock3 className="text-blue-700 dark:text-blue-300" />
          <div className="mt-3 font-black text-slate-950 dark:text-white">Horaires d'accueil</div>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {relayProfile.hours}. Les horaires alimentent la sélection côté acheteur et les tournées livreur.
          </p>
          <div className="mt-4 flex gap-2">
            <input value={hoursInput} onChange={(event) => setHoursInput(event.target.value)} placeholder={relayProfile.hours} className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-slate-950 outline-none dark:bg-slate-900 dark:text-white" />
            <button type="button" disabled={operationBusy || !hoursInput.trim()} onClick={() => void updateRelaySettings({ opening_hours: hoursInput.trim() })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Enregistrer</button>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {readiness.map(([label, ok, detail]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-slate-950 dark:text-white">{label}</strong>
              {ok ? <CheckCircle2 className="text-emerald-600" size={18} /> : <TimerReset className="text-amber-600" size={18} />}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );

  const renderLitiges = () => (
    <Panel kicker="Risque & mediation" title="Litiges Point Relais">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {relayDisputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
              <div className="flex items-start gap-3">
                <Scale className="mt-0.5 text-blue-700 dark:text-blue-300" size={20} />
                <div><div className="font-black text-slate-950 dark:text-white">Aucun litige ouvert</div><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Les dossiers liés aux colis traités par ce point relais apparaîtront ici.</p></div>
              </div>
            </div>
          ) : relayDisputes.map((dispute) => (
            <article key={dispute.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center justify-between gap-3"><strong className="text-amber-950 dark:text-amber-100">{dispute.ref} · Commande #{dispute.order_id}</strong><StatusPill tone="amber">{dispute.status_display}</StatusPill></div>
              <p className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-200">{dispute.reason_display}</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/75 dark:text-amber-100/75">{dispute.description}</p>
              {dispute.delivery_address ? (
                <p className="mt-2 text-xs font-semibold text-amber-900/75 dark:text-amber-100/75">{dispute.city} · {dispute.delivery_address}</p>
              ) : null}
              <PrecisionHint precision={dispute.address_precision} />
            </article>
          ))}
        </div>
        <div className="grid gap-3">
          {[
            ["Rappel J+6", "Notifier le client avant bascule litige.", Bell],
            ["Escalade J+7", "Créer un dossier avec preuves, historique et photos.", AlertTriangle],
            ["Décision", "Retour livreur vers vendeur ou arbitrage BelivaY.", FileText],
          ].map(([title, body, Icon]) => (
            <div key={title as string} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <Icon className="mt-0.5 flex-shrink-0 text-blue-700 dark:text-blue-300" size={18} />
              <div>
                <div className="font-black text-slate-950 dark:text-white">{title as string}</div>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );

  const renderSimple = (kind: RelayTab) => {
    if (kind === "kyc") {
      return (
        <Panel kicker="Conformité" title="Documents KYC du point relais">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-3">
              {kycItems.map(([title, status, body], index) => {
                const documentType = ["MANAGER_ID", "ACTIVITY_RECORD", "PAYOUT_ACCOUNT", "PREMISES_PHOTOS", "FIELD_VALIDATION"][index];
                const uploaded = complianceDocuments.find((document) => document.document_type === documentType);
                return (
                <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-slate-950 dark:text-white">{title}</strong>
                    <StatusPill tone={status === "Vérifié" || status === "Validée" ? "emerald" : "amber"}>{status}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
                    {uploaded ? `Envoyé · ${uploaded.status}` : "Envoyer le document"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={operationBusy} className="sr-only" onChange={(event) => void uploadRelayDocument(documentType, event.target.files?.[0])} />
                  </label>
                </div>
                );
              })}
            </div>
            <div className="hidden rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40 lg:block">
              <FileCheck2 className="text-blue-700 dark:text-blue-300" />
              <h3 className="mt-4 font-black text-blue-950 dark:text-blue-50">Règle d'ouverture BelivaY</h3>
              <p className="mt-2 text-sm leading-7 text-blue-950/75 dark:text-blue-100/80">
                Le point relais ne doit être visible comme ouvert que si le KYC est validé, la capacité est déclarée et les horaires sont définis.
                Ces trois prérequis protègent les colis, les clients et le réseau de livraison.
              </p>
            </div>
          </div>
        </Panel>
      );
    }

    if (kind === "historique") {
      const receivedCount = relayParcels.filter((parcel) => parcel.received_at).length;
      const pickedUpCount = relayParcels.filter((parcel) => parcel.status === "PICKED_UP").length;
      const returnedCount = relayParcels.filter((parcel) => parcel.status.startsWith("RETURNED_")).length;
      return (
        <Panel kicker="Traçabilité" title="Historique opérationnel">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {["Aujourd'hui", "7 jours", "30 jours", "Tous statuts"].map((filter) => (
              <button key={filter} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {filter}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {relayParcels.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800">Aucune opération enregistrée.</div> : relayParcels.map((parcel) => (
                <article key={parcel.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3"><strong className="text-slate-950 dark:text-white">BV-{parcel.order_id}</strong><StatusPill tone={parcel.status === "PICKED_UP" ? "emerald" : parcel.status.startsWith("RETURNED_") ? "amber" : "blue"}>{parcel.status}</StatusPill></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Slot {parcel.slot_code || "non défini"} · mise à jour {new Date(parcel.updated_at).toLocaleString("fr-FR")}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[["Réceptions", receivedCount], ["Retraits", pickedUpCount], ["Retours", returnedCount], ["Litiges", relayDisputes.length]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Calculé depuis les opérations enregistrées.</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      );
    }

    if (kind === "aide") {
      return (
        <Panel kicker="Support" title="Aide & support BelivaY">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [HelpCircle, "Consignes rapides", "Réception, stockage, retrait et litige J+7 résumés pour le guichet."],
              [MessageSquareText, "Contacter BelivaY", "Créer une demande support avec référence colis et photos."],
              [ShieldCheck, "Médiation", "Demander l'arbitrage BelivaY lorsqu'un retour ou remboursement est contesté."],
            ].map(([Icon, title, body]) => (
              <div key={title as string} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <Icon className="text-blue-700 dark:text-blue-300" />
                <h3 className="mt-4 font-black text-slate-950 dark:text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-[.8fr_1.2fr_auto] sm:items-end">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-blue-900 dark:text-blue-100">Objet<input value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder="Colis, retrait, litige..." className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-white" /></label>
            <label className="text-xs font-black uppercase tracking-[0.12em] text-blue-900 dark:text-blue-100">Message<textarea value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder="Décrivez la situation avec la référence du colis" className="mt-2 min-h-20 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-900 outline-none dark:bg-slate-900 dark:text-white" /></label>
            <button type="button" onClick={sendRelaySupportMessage} disabled={operationBusy || supportSubject.trim().length < 3 || supportBody.trim().length < 10} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Envoyer</button>
          </div>
        </Panel>
      );
    }

    if (kind === "notifications") {
      return (
        <Panel kicker="Alertes" title="Notifications opérationnelles">
          <div className="space-y-3">
            {notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">Aucune notification.</div> : notifications.map((notification) => (
              <div key={notification.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex gap-3">
                  <Bell className="mt-0.5 flex-shrink-0 text-blue-700 dark:text-blue-300" size={18} />
                  <div>
                    <div className="font-black text-slate-950 dark:text-white">{notification.title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="slate">{notification.notification_type}</StatusPill>
                  <StatusPill tone={notification.is_read ? "emerald" : "amber"}>{notification.is_read ? "Lu" : "Non lu"}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    if (kind === "formation") {
      return (
        <Panel kicker="Formation" title="Modules point relais">
          <div className="grid gap-4 md:grid-cols-2">
            {training.map(([title, tag, body]) => (
              <div key={title as string} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <BookOpen className="text-blue-700 dark:text-blue-300" />
                  <StatusPill tone={tag === "Obligatoire" ? "amber" : "slate"}>{tag as string}</StatusPill>
                </div>
                <h3 className="mt-4 font-black text-slate-950 dark:text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</p>
                <button className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">Ouvrir le module</button>
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    return (
      <Panel kicker="Point relais" title={ui.tabs[kind] ?? ui.brand}>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Cette section n'est pas encore configurée pour le point relais.
        </div>
      </Panel>
    );
  };

  /**
   * Reglages partages par la feuille ouverte depuis l'avatar et par l'onglet
   * « Parametres » : un seul objet, donc aucune derive possible entre les deux
   * points d'entree.
   */
  const settingsProps: RelaySettingsProps = {
    locale,
    theme,
    onToggleTheme: toggleTheme,
    onChangeLanguage: changeLanguage,
    profile: {
      name: relayProfile.name,
      manager: relayProfile.manager,
      city: relayProfile.city,
      address: relayProfile.address,
      relayCode: relayAccount?.relay_code || "",
      status: relayProfile.status,
      trust: relayProfile.trust,
      memberSince: relayAccount?.created_at || null,
      zones: Array.isArray(relayAccount?.zones) ? relayAccount.zones : [],
    },
    username: user?.username || relayProfile.manager,
    email: user?.email || "",
    avatarUrl: avatarUrl || undefined,
    onAvatarFile: setAvatarFile,
    onLogout: handleLogout,
    onNavigate: (next) => {
      setProfileSheetOpen(false);
      setTab(next);
    },
    onError: showOperationError,
    onSuccess: showOperationSuccess,
    footer: ui.footer,
  };

  const content = {
    dashboard: renderDashboard,
    reception: renderReception,
    stock: renderStock,
    retrait: renderRetrait,
    historique: () => renderSimple("historique"),
    trust: renderTrust,
    tokens: renderTokens,
    niveaux: renderNiveaux,
    finances: renderFinances,
    capacite: renderCapacite,
    litiges: renderLitiges,
    kyc: () => renderSimple("kyc"),
    aide: () => renderSimple("aide"),
    notifications: () => renderSimple("notifications"),
    formation: () => <RelayTraining onError={showOperationError} />,
    avis: () => <RelayReviews onError={showOperationError} />,
    rapports: () => <RelayReports onError={showOperationError} />,
    reseau: () => renderSimple("reseau"),
    fermeture: () => <RelayClosure onError={showOperationError} relay={relayIdentity} />,
    inscription: () => <RelayOnboarding onError={showOperationError} relay={relayIdentity} />,
    messagerie: () => <RelayInbox onError={showOperationError} relay={relayIdentity} onNavigate={setTab} />,
    parametres: () => <RelaySettingsContent {...settingsProps} />,
  }[tab];

  return (
    <main className="belivay-portal min-h-screen bg-[#f6f7fb] font-sans text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex">
        <RelaySidebar
          activeTab={tab}
          onSelect={setTab}
          onLogout={handleLogout}
          labels={ui.tabs}
          groupLabels={ui.groups}
          badges={navBadges}
          brandKicker={ui.brandKicker}
          logoutLabel={ui.logout}
          profile={{
            name: relayProfile.name,
            status: relayProfile.status,
            city: relayProfile.city,
            trust: relayProfile.trust,
            avatarUrl: avatarUrl || undefined,
          }}
          footer={ui.footer}
        />

        <section className="min-w-0 flex-1">
          {/* `safe-pt` : sous l'encoche, la barre collante ne passe plus sous le
              statut systeme. La densite se resserre sur telephone (icone + titre
              + avatar) et retrouve toutes les actions a partir de `lg`. */}
          <header className="safe-pt sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 sm:py-3">
            {/* ── Bandeau telephone/tablette ──────────────────────────────────
                Menu et logo a gauche, reglages a droite. Le tiroir s'ouvrant
                depuis la gauche, son bouton d'appel reste de ce cote : le geste
                et l'animation vont dans le meme sens. */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={ui.space}
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
                className="tap-target relative -ml-1 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <MenuIcon size={22} strokeWidth={2.2} />
                {/* Le menu porte desormais seul les alertes des destinations
                    hors barre du bas : un point suffit a dire « il y a quelque
                    chose la-dedans » sans encombrer l'icone d'un compteur. */}
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
                aria-label={ui.tabs.dashboard}
                className="flex min-w-0 flex-shrink items-center rounded-xl px-1 py-1 transition active:scale-95"
              >
                <img src="/belivay-logo-relay-point.png" alt="BelivaY" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
              </button>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => setTab("notifications")}
                aria-label={ui.tabs.notifications}
                className="tap-target relative flex flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell size={19} />
                {navBadges.notifications ? (
                  <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
                    {navBadges.notifications > 99 ? "99+" : navBadges.notifications}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                className="tap-target flex flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
              </button>

              <button
                type="button"
                onClick={switchLanguage}
                aria-label="Changer de langue"
                className="tap-target flex flex-shrink-0 items-center justify-center rounded-xl px-1 text-xs font-black text-slate-600 transition active:scale-90 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {locale === "fr" ? "FR" : "EN"}
              </button>

              <button
                type="button"
                onClick={() => setProfileSheetOpen(true)}
                aria-label={ui.openProfile}
                aria-haspopup="dialog"
                aria-expanded={profileSheetOpen}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-black text-white ring-1 ring-blue-300/40 shadow-[0_2px_10px_rgba(37,99,235,.45)] transition active:scale-90"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user?.username || relayProfile.manager).slice(0, 2).toUpperCase()
                )}
              </button>
            </div>

            {/* Titre de l'ecran : sorti du bandeau pour lui laisser toute sa
                largeur, il garde sa place de repere de navigation. */}
            <div className="mt-2 min-w-0 lg:hidden">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{ui.space}</p>
              <h1 className="truncate text-[19px] font-black leading-tight tracking-tight">{activeLabel}</h1>
            </div>

            <div className="hidden items-center justify-between gap-2 lg:flex sm:flex-wrap sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={locale === "en" ? "Back" : "Retour"}
                  title={locale === "en" ? "Back" : "Retour"}
                  className="tap-target inline-flex flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-90 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300 sm:text-[11px] sm:tracking-[0.18em]">{ui.space}</p>
                  <h1 className="truncate text-[17px] font-black leading-tight tracking-tight sm:mt-1 sm:text-2xl">{activeLabel}</h1>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center justify-end gap-1.5 sm:flex-wrap sm:gap-2">
                <div className="relative">
                  <button
                  type="button"
                  onClick={() => setProfileSheetOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={profileSheetOpen}
                  className="tap-target flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  title={ui.profile}
                >
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <UserCircle size={17} />}
                  <span className="hidden max-w-[140px] truncate sm:inline">{user?.username || relayProfile.manager}</span>
                </button>
                </div>
                {/* Sur telephone ces trois reglages vivent dans la bottom sheet
                    « Menu » : garder cinq boutons dans une barre de 360px
                    ecraserait le titre de l'ecran. */}
                <button
                  type="button"
                  onClick={switchLanguage}
                  className="hidden h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:inline-flex"
                  title="Changer de langue"
                >
                  {locale === "fr" ? "FR" : "EN"}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:inline-flex"
                  title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100 lg:inline-flex"
                  title="Se deconnecter"
                >
                  <LogOut size={17} />
                </button>
                <div className="hidden flex-wrap items-center gap-2 xl:flex">
                  <StatusPill tone={statusTone}>{relayProfile.status}</StatusPill>
                  <StatusPill tone="blue">{relayProfile.capacityUsed}/{relayProfile.capacityMax} places</StatusPill>
                  <StatusPill tone="slate">{relayProfile.hours}</StatusPill>
                </div>
              </div>
            </div>
            {/* Ruban de contexte : ce que le gerant doit avoir sous les yeux en
                permanence (etat d'ouverture, places restantes, horaires). Il
                remplace l'ancien defilement lateral des 22 onglets, desormais
                repartis entre la barre du bas et la feuille « Menu ». */}
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto lg:hidden">
              <span className="flex-shrink-0 whitespace-nowrap">
                <StatusPill tone={statusTone}>{relayProfile.status}</StatusPill>
              </span>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {relayProfile.capacityUsed}/{relayProfile.capacityMax} places
              </span>
              <span className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {relayProfile.hours}
              </span>
            </div>

          </header>

          {/* `pb-tabbar` : le dernier bloc de chaque ecran reste atteignable
              au-dessus de la barre d'onglets fixe et de la barre gestuelle. */}
          <div className="pb-tabbar p-4 sm:p-6 lg:pb-6">
            <EvidenceRequestInbox accent="#2563EB" />
            {operationMessage ? (
              <div className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${operationMessage.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span>{operationMessage.text}</span>
                <button type="button" onClick={() => setOperationMessage(null)} className="rounded-lg p-1 hover:bg-black/5" title="Fermer"><X size={16} /></button>
              </div>
            ) : null}
            <div className="mb-5 hidden rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:block">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700" size={20} />
                <p className="text-sm leading-6 text-blue-950/75">
                  Interface point relais conforme a la vision BelivaY : anonymat vendeur, preuves de transfert, stockage par slot,
                  code de retrait, litiges J+7, Trust Score public et finances MoMo. Les niveaux PR restent volontairement en developpement.
                </p>
              </div>
            </div>
            {content()}
          </div>
        </section>
      </div>

      {/* Barre du bas : uniquement les quatre raccourcis du travail quotidien.
          Le reste du menu s'ouvre par l'icone du bandeau — une seule liste de
          destinations, donc un seul endroit ou l'utilisateur apprend a
          chercher. */}
      <RelayMobileNav
        activeTab={tab}
        onSelect={(next) => {
          setDrawerOpen(false);
          setTab(next);
        }}
        labels={ui.tabs}
        badges={navBadges}
        navLabel={ui.space}
      />

      <RelayDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={tab}
        onSelect={(next) => {
          setDrawerOpen(false);
          setTab(next);
        }}
        onLogout={handleLogout}
        labels={ui.tabs}
        groupLabels={ui.groups}
        badges={navBadges}
        brandKicker={ui.brandKicker}
        logoutLabel={ui.logout}
        profile={{
          name: relayProfile.name,
          status: relayProfile.status,
          city: relayProfile.city,
          trust: relayProfile.trust,
          avatarUrl: avatarUrl || undefined,
        }}
        footer={ui.footer}
        title={ui.space}
        closeLabel={ui.close}
      />

      {/* Feuille compte : ouverte par l'avatar, elle glisse depuis la droite —
          le tiroir de navigation vient de gauche, les deux gestes restent donc
          distincts meme quand les deux panneaux ont ete appris. */}
      <RelayProfileSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} {...settingsProps} />

      {avatarFile ? (
        <AvatarCropDialog
          file={avatarFile}
          accent="#2563EB"
          onClose={() => setAvatarFile(null)}
          onUploaded={(updatedUser) => {
            setAvatarUrl(updatedUser.avatar_url || "");
            setAvatarFile(null);
            setOperationMessage({ tone: "success", text: locale === "en" ? "Profile photo updated." : "Photo de profil mise à jour." });
          }}
        />
      ) : null}
    </main>
  );
}
