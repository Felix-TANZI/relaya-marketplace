import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import EvidenceRequestInbox from "@/components/disputes/EvidenceRequestInbox";
import AppDownloadBanner from "@/components/AppDownloadBanner";
import type { LocationPrecisionResult } from "@/services/api/location";
import { ensureImageUnderLimit } from "@/lib/imageCompression";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BookOpen,
  ChevronLeft,
  Clock,
  FileCheck2,
  HelpCircle,
  IdCard,
  Layers,
  Layers3,
  LockKeyhole,
  Menu as MenuIcon,
  LogOut,
  MessageSquareText,
  Moon,
  Scale,
  ShieldCheck,
  Sun,
  Truck,
  UserCircle,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { http } from "@/services/api/http";
// Meme formateur de date que l'onglet Finances : « 25 sept. » doit s'ecrire
// pareil sur l'accueil et sur le releve.
import { formatCourt } from "@/services/api/relaySettlements";
import { PayoutAccountVerificationCard } from "@/components/payments/PayoutAccountVerificationCard";
import RelayFinancePanel from "./RelayFinancePanel";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import RelayReception, { type RelayArrival, type RefuseInput } from "./RelayReception";
import RelayPickup, {
  type CounterIssueInput,
  type HandOverInput,
  type RelayPickupParcel,
} from "./RelayPickup";
import RelayReviews from "./RelayReviews";
import RelayTrust, { type RelayTrustScore } from "./RelayTrust";
import RelayTraining from "./RelayTraining";
import RelayReports from "./RelayReports";
import RelayClosure from "./RelayClosure";
import RelayInbox from "./RelayInbox";
import RelayOnboarding from "./RelayOnboarding";
import RelaySidebar from "./RelaySidebar";
import RelayMobileNav from "./RelayMobileNav";
import RelayToday, { type RelayTodoItem } from "./RelayToday";
import RelayStates from "./RelayStates";
import RelayOutbound, {
  type CollectionPassage,
  type OutboundParcel,
  type OutboundReason,
  type RelayCollectionSchedule,
} from "./RelayOutbound";
import RelayCapacity from "./RelayCapacity";
import RelayDisputes, { type DisputeFile, type DisputeParcel } from "./RelayDisputes";
import RelayPayouts from "./RelayPayouts";
import { parseOpeningHours, todayClosing } from "./relayHours";
import RelayShelfPlan, { type ShelfParcel } from "./RelayShelfPlan";
import { placesOf } from "./relayShelf";
import RelayStockList from "./RelayStockList";
import RelayGardeGrid from "./RelayGardeGrid";
import RelayDrawer from "./RelayDrawer";
import RelayProfileSheet, { type RelaySettingsProps } from "./RelayProfileSheet";
import RelaySettings from "./RelaySettings";
import RelaySettingsBody from "./RelaySettingsBody";
import { RELAY_TABS, type RelayNavGroup, type RelayTab } from "./relayNav";
import { Panel, StatusPill } from "./RelayUi";

/** Les destinations de la barre du bas : elles gardent le bandeau complet. */
const PRIMARY_TABS: RelayTab[] = ["dashboard", "reception", "retrait", "stock"];

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
  authorized_pickup_name?: string;
  authorized_pickup_phone?: string;
  parcel_size: string;
  parcel_size_label: string;
  courier_ref: string;
  courier_vehicle_label: string;
  received_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
  /**
   * Garde au relais (Addendum Decisions v1.0 §3.2) : gratuite J0->J+3, puis
   * 200 F/jour jusqu'a J+7, prolongeable une fois. Le serveur calcule les deux
   * echeances, le portail se contente de les lire — dupliquer la regle ici
   * garantirait qu'elle diverge un jour.
   */
  garde_free_until: string | null;
  garde_deadline: string | null;
  garde_fee_due_xaf: number;
  garde_extended: boolean;
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
  created_at: string;
  // Avancement du dossier — ajoute par `relay_point_open_disputes`.
  vendor_contacted: boolean;
  vendor_replied: boolean;
  vendor_reply_deadline: string | null;
  has_mediator: boolean;
  resolution_display: string;
  is_closed: boolean;
  evidence_requests: Array<{ instructions: string; due_at: string | null }>;
}

interface ComplianceDocument {
  id: number;
  document_type: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_url: string | null;
}

const RELAY_NAV_GROUPS: RelayNavGroup[] = ["pilotage", "operations", "qualite", "gestion", "risque", "compte"];

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
      trust: "Trust Score",
      avis: "Avis des clients",
      niveaux: "Niveaux PR",
      formation: "Formation",
      finances: "Versements",
      rapports: "Rapports & export",
      capacite: "Capacité & horaires",
      reseau: "Réseau partenaires",
      fermeture: "Fermeture exceptionnelle",
      litiges: "Litiges",
      kyc: "Documents KYC",
      inscription: "Inscription & cycle de vie",
      messagerie: "Messagerie",
      aide: "Aide & support",
      parametres: "Paramètres",
      tokens: "Relais Tokens",
      etats: "Écrans d'état et d'accès",
      sortie: "À faire partir",
    } satisfies Record<RelayTab, string>,
    /**
     * Libelles courts de la barre du bas. « Retrait acheteur » s'y tronquait en
     * « Retrait ach... » sur un ecran de 360 px : autant nommer court des le
     * depart. Le menu lateral et le tiroir gardent les intitules complets, qui
     * y ont la place de lever toute ambiguite.
     */
    tabsShort: {
      dashboard: "Aujourd'hui",
      reception: "Réception",
      retrait: "Retrait",
      stock: "Stock",
    },
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
    emptyStock: "Aucun colis en stock connecté pour le moment.",
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
      finances: "Payouts",
      rapports: "Reports & export",
      capacite: "Capacity & hours",
      reseau: "Partner network",
      fermeture: "Exceptional closure",
      litiges: "Disputes",
      kyc: "KYC documents",
      inscription: "Onboarding & lifecycle",
      messagerie: "Messages",
      aide: "Help & support",
      parametres: "Settings",
      tokens: "Relay tokens",
      etats: "Status & access screens",
      sortie: "To ship out",
    } satisfies Record<RelayTab, string>,
    tabsShort: {
      dashboard: "Today",
      reception: "Check-in",
      retrait: "Pickup",
      stock: "Stock",
    },
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
    emptyStock: "No stored parcel connected yet.",
  },
};

const training: Array<{ titleKey: string; tagKey: string; bodyKey: string }> = [
  { titleKey: "rl1_point_page.training_reception_title", tagKey: "rl1_point_page.training_mandatory", bodyKey: "rl1_point_page.training_reception_body" },
  { titleKey: "rl1_point_page.training_id_title", tagKey: "rl1_point_page.training_mandatory", bodyKey: "rl1_point_page.training_id_body" },
  { titleKey: "rl1_point_page.training_storage_title", tagKey: "rl1_point_page.training_recommended", bodyKey: "rl1_point_page.training_storage_body" },
  { titleKey: "rl1_point_page.training_dispute_title", tagKey: "rl1_point_page.training_recommended", bodyKey: "rl1_point_page.training_dispute_body" },
];

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] || "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function anonymizedBuyerRef(parcel: RelayParcel) {
  const seed = `${parcel.order_id || parcel.id}`.padStart(4, "0").slice(-4);
  return `BV-ACH-${seed}`;
}

function precisionTone(score: number): "emerald" | "amber" | "red" {
  return score >= 75 ? "emerald" : score >= 55 ? "amber" : "red";
}

function PrecisionHint({ precision }: { precision?: Partial<LocationPrecisionResult> }) {
  const { t } = useTranslation();
  if (!precision || typeof precision.precisionScore !== "number") return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <StatusPill tone={precisionTone(precision.precisionScore)}>{t("rl1_point_page.precision_score", { score: precision.precisionScore })}</StatusPill>
      {precision.driverHint ? <span className="text-xs font-semibold text-amber-900/75 dark:text-amber-100/75">{precision.driverHint}</span> : null}
    </div>
  );
}

export default function RelayPointPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  /** Le formulaire de numero de versement ne s'ouvre que sur demande. */
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  /** Entree de l'ecran d'etats a deplier, quand on y arrive depuis le menu. */
  const [stateFocus, setStateFocus] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [relayParcels, setRelayParcels] = useState<RelayParcel[]>([]);
  const [notifications, setNotifications] = useState<RelayNotification[]>([]);
  const [relayDisputes, setRelayDisputes] = useState<RelayDispute[]>([]);
  const [operationBusy, setOperationBusy] = useState(false);
  const [operationMessage, setOperationMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [complianceDocuments, setComplianceDocuments] = useState<ComplianceDocument[]>([]);
  /** Passages annonces au comptoir — voir `RelayPointCollectionScheduleView`. */
  const [collectionPassages, setCollectionPassages] = useState<CollectionPassage[]>([]);
  /** Onglet a ouvrir sur « Constats et retours » quand on y arrive d'ailleurs. */
  const [disputeFocus, setDisputeFocus] = useState("");
  const locale = i18n.language.startsWith("en") ? "en" : "fr";
  const ui = relayCopy[locale];
  const tabLabels = useMemo(
    () => Object.fromEntries(RELAY_TABS.map((tabId) => [tabId, t(`rl1_point_page.tabs.${tabId}`)])) as Record<RelayTab, string>,
    [t],
  );
  const groupLabels = useMemo(
    () => Object.fromEntries(RELAY_NAV_GROUPS.map((group) => [group, t(`rl1_point_page.groups.${group}`)])) as Record<RelayNavGroup, string>,
    [t],
  );
  const footerLines = useMemo(
    () => [t("rl1_point_page.footer_line1"), t("rl1_point_page.footer_line2"), t("rl1_point_page.footer_line3")],
    [t],
  );
  const activeLabel = tabLabels[tab] ?? t("rl1_point_page.brand");
  const relayAccount = user?.relay_point_profile;
  useEffect(() => {
    setAvatarUrl(user?.avatar_url || "");
  }, [user?.avatar_url]);
  const refreshRelayData = useCallback(async () => {
    const [parcelResult, notificationResult, disputeResult, documentResult, collectionResult] =
      await Promise.allSettled([
        http<RelayParcel[]>("/api/shipping/relay-point/parcels/"),
        http<RelayNotification[]>("/api/auth/notifications/"),
        http<RelayDispute[]>("/api/auth/relay-point/disputes/open/"),
        http<ComplianceDocument[]>("/api/auth/compliance-documents/"),
        http<RelayCollectionSchedule>("/api/shipping/relay-point/collections/"),
      ]);
    setRelayParcels(parcelResult.status === "fulfilled" && Array.isArray(parcelResult.value) ? parcelResult.value : []);
    setNotifications(notificationResult.status === "fulfilled" && Array.isArray(notificationResult.value) ? notificationResult.value : []);
    setRelayDisputes(disputeResult.status === "fulfilled" && Array.isArray(disputeResult.value) ? disputeResult.value : []);
    setComplianceDocuments(documentResult.status === "fulfilled" && Array.isArray(documentResult.value) ? documentResult.value : []);
    setCollectionPassages(
      collectionResult.status === "fulfilled" && Array.isArray(collectionResult.value?.passages)
        ? collectionResult.value.passages
        : [],
    );
  }, []);

  useEffect(() => {
    void refreshRelayData();
  }, [refreshRelayData]);

  // Score de confiance affiche dans le menu lateral et le tableau de bord.
  // Il est calcule par le serveur a partir des operations reelles.
  const [trustScore, setTrustScore] = useState(0);
  /** Palier public, affiche en pastille sur l'ecran Parametres. */
  const [trustTier, setTrustTier] = useState("");
  useEffect(() => {
    http<RelayTrustScore>("/api/auth/trust-score/?role=RELAY_POINT")
      .then((payload) => {
        setTrustScore(Math.round(payload.score));
        setTrustTier(payload.tier_display || "");
      })
      .catch(() => setTrustScore(0));
  }, []);

  /**
   * Numero de versement masque, pour l'ecran Parametres.
   *
   * Lu ici plutot que dans le composant : l'ecran des versements l'affiche
   * deja, et deux composants qui interrogent le meme endpoint au meme
   * moment ne se valent pas un appel de plus.
   */
  const [payoutMasked, setPayoutMasked] = useState("");
  useEffect(() => {
    http<Array<{ operator: string; masked_phone: string; is_primary: boolean; status: string }>>(
      "/api/auth/payout-accounts/",
    )
      .then((comptes) => {
        const principal =
          comptes.find((compte) => compte.is_primary)
          ?? comptes.find((compte) => compte.status === "VERIFIED")
          ?? comptes[0];
        setPayoutMasked(
          principal ? `${principal.operator.replace("_MOMO", "").replace("_MONEY", "")} ${principal.masked_phone}` : "",
        );
      })
      .catch(() => setPayoutMasked(""));
  }, []);

  const parcels = useMemo(
    () =>
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status))
        .map((parcel) => ({
          ref: `BV-${parcel.order_id}`,
          slot: parcel.slot_code || t("rl1_point_page.slot_to_define"),
          buyer: anonymizedBuyerRef(parcel),
          age: parcel.received_at ? new Date(parcel.received_at).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR") : "-",
          status: parcel.status === "STORED" ? t("rl1_point_page.status_stored") : parcel.status,
          tone: "emerald" as const,
        })),
    [locale, relayParcels, t],
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
          sizeLabel: parcel.parcel_size_label || t("rl1_point_page.size_not_specified"),
          buyerRef: anonymizedBuyerRef(parcel),
          pickupCode: parcel.pickup_code || "",
        })),
    [relayParcels, t],
  );

  /** Casiers occupes : le calcul d'emplacement a la reception les evite. */
  const occupiedSlots = useMemo(
    () =>
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status) && parcel.slot_code)
        .map((parcel) => parcel.slot_code),
    [relayParcels],
  );

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
  const operationalStatusCode: "SUSPENDED" | "OPEN" | "CONFIGURING" = isSuspended
    ? "SUSPENDED"
    : isKycApproved && hasCapacity && hasHours
      ? "OPEN"
      : "CONFIGURING";
  const operationalStatus = t(`rl1_point_page.status_${operationalStatusCode.toLowerCase()}`);
  const readiness = [
    [t("rl1_point_page.readiness_kyc_label"), isKycApproved, isKycApproved ? t("rl1_point_page.status_validated") : t("rl1_point_page.readiness_kyc_pending")],
    [
      t("rl1_point_page.readiness_capacity_label"),
      hasCapacity,
      hasCapacity ? t("rl1_point_page.readiness_capacity_declared", { count: relayAccount?.storage_capacity }) : t("rl1_point_page.readiness_capacity_pending"),
    ],
    [t("rl1_point_page.readiness_hours_label"), hasHours, hasHours ? relayAccount?.opening_hours || "" : t("rl1_point_page.readiness_hours_pending")],
  ] as const;
  const kycItems = [
    [t("rl1_point_page.kyc_manager_id_label"), isKycApproved ? t("rl1_point_page.status_verified") : t("rl1_point_page.status_to_send"), t("rl1_point_page.kyc_manager_id_body")],
    [t("rl1_point_page.kyc_activity_record_label"), isKycApproved ? t("rl1_point_page.status_verified") : t("rl1_point_page.status_to_send"), t("rl1_point_page.kyc_activity_record_body")],
    [t("rl1_point_page.kyc_payout_account_label"), isKycApproved ? t("rl1_point_page.status_verified") : t("rl1_point_page.status_to_configure"), t("rl1_point_page.kyc_payout_account_body")],
    [t("rl1_point_page.kyc_premises_photos_label"), isKycApproved ? t("rl1_point_page.status_verified") : t("rl1_point_page.status_to_send"), t("rl1_point_page.kyc_premises_photos_body")],
    [t("rl1_point_page.kyc_field_validation_label"), isKycApproved ? t("rl1_point_page.status_validated") : t("rl1_point_page.status_to_plan"), t("rl1_point_page.kyc_field_validation_body")],
  ] as const;

  const relayProfile = {
    name: relayAccount?.name || t("rl1_point_page.default_relay_name"),
    manager: relayAccount?.manager_name || user?.first_name || user?.username || t("rl1_point_page.default_manager_name"),
    city: relayAccount?.city || t("rl1_point_page.default_city"),
    address: relayAccount?.address || t("rl1_point_page.default_address"),
    hours: relayAccount?.opening_hours || t("rl1_point_page.default_hours"),
    status: operationalStatus,
    statusCode: operationalStatusCode,
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
  const statusTone = relayProfile.statusCode === "OPEN" ? "emerald" : relayProfile.statusCode === "SUSPENDED" ? "red" : "amber";

  /**
   * « 19 h » : l'echeance que le gerant repete toute la journee a ses clients.
   *
   * Lue dans la semaine, pas dans la chaine brute : un samedi qui ferme a 17 h
   * ne doit pas devenir l'heure annoncee le mercredi.
   */
  const closingLabel = useMemo(() => todayClosing(parseOpeningHours(relayProfile.hours)), [relayProfile.hours]);

  /**
   * Les quatre compteurs de l'ecran « Aujourd'hui ».
   *
   * Ils lisent les memes colis que le reste du portail : un chiffre affiche en
   * haut de l'accueil et l'ecran qu'il ouvre ne peuvent pas se contredire.
   */
  const todayCounters = useMemo(() => {
    const inStock = relayParcels.filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status));

    // « Dernier jour » = la garde se termine aujourd'hui, ou elle est deja
    // depassee. Les deux cas appellent le meme geste au guichet, donc la meme
    // ligne : relancer l'acheteur, ou declencher le retour vendeur.
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const deadlineReached = (value: string | null) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= endOfToday;
    };

    const now = Date.now();
    const stillFree = (value: string | null) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.getTime() > now;
    };

    const lastDayParcels = inStock.filter((parcel) => deadlineReached(parcel.garde_deadline));
    const freeGardeParcels = inStock.filter((parcel) => stillFree(parcel.garde_free_until));

    // Prochaine sortie de garde gratuite : c'est la date qui interesse le
    // gerant, pas la liste des colis concernes.
    const nextFreeEnd = freeGardeParcels
      .map((parcel) => parcel.garde_free_until)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

    return {
      readyForPickup: inStock.filter((parcel) => parcel.pickup_code).length,
      lastDay: lastDayParcels.length,
      // Ce qui doit QUITTER le local au prochain passage du livreur. Un colis
      // deja parti porte une date de retour : il ne compte plus.
      outbound: relayParcels.filter(
        (parcel) => ["RETURN_REQUESTED", "REFUSED"].includes(parcel.status) && !parcel.returned_at,
      ).length,
      freeGarde: freeGardeParcels.length,
      nextFreeEnd,
    };
  }, [relayParcels]);

  /**
   * Identite du transporteur annonce. Quand plusieurs missions convergent, on
   * annonce leur nombre plutot que d'en elire une au hasard.
   */
  const arrivalCourier = useMemo(() => {
    const refs = [...new Set(arrivals.map((arrival) => arrival.courierRef).filter(Boolean))];
    if (refs.length === 0) return "";
    if (refs.length === 1) return refs[0];
    return locale === "en" ? `${refs.length} couriers` : `${refs.length} transporteurs`;
  }, [arrivals, locale]);

  const arrivalVehicle = useMemo(() => {
    const labels = [...new Set(arrivals.map((arrival) => arrival.vehicleLabel).filter(Boolean))];
    return labels.length === 1 ? labels[0] : "";
  }, [arrivals]);

  /**
   * Reference de la mission attendue.
   *
   * Elle n'a de sens que pour une arrivee unique : annoncer « mission M-412 »
   * quand trois livreurs convergent enverrait le gerant chercher la mauvaise.
   */
  const arrivalMission = useMemo(
    () => (arrivals.length === 1 ? `mission M-${arrivals[0].shipmentId}` : ""),
    [arrivals],
  );

  /**
   * « A faire maintenant » : la liste des choses reellement en attente, dans
   * l'ordre ou elles coutent cher si on les laisse trainer.
   *
   * Aucune ligne de remplissage — une liste qui affiche quelque chose en
   * permanence cesse d'etre lue. Quand il n'y a rien, elle le dit.
   */
  const todayTodos = useMemo<RelayTodoItem[]>(() => {
    const items: RelayTodoItem[] = [];

    if (todayCounters.outbound > 0) {
      items.push({
        id: "outbound",
        icon: Truck,
        tone: "blue",
        title: locale === "en"
          ? `Prepare the courier collection`
          : `Préparer la collecte livreur`,
        detail: locale === "en"
          ? `${todayCounters.outbound} parcel(s) to hand back: return, send-back, transfer.`
          : `${todayCounters.outbound} colis à remettre au livreur : renvoi, retour, transfert.`,
        onClick: () => setTab("sortie"),
      });
    }

    if (todayCounters.lastDay > 0) {
      items.push({
        id: "last-day",
        icon: Clock,
        tone: "amber",
        title: locale === "en"
          ? `${todayCounters.lastDay} buyer(s) on the last day`
          : `${todayCounters.lastDay} client(s) au dernier jour`,
        detail: locale === "en"
          ? "Storage ends today — chase the buyer, or start the return to the seller."
          : "La garde se termine — relancez l'acheteur, ou lancez le retour vendeur.",
        onClick: () => setTab("stock"),
      });
    }

    if (relayDisputes.length > 0) {
      const first = relayDisputes[0];
      items.push({
        id: "disputes",
        icon: Scale,
        tone: "orange",
        title: locale === "en"
          ? `${relayDisputes.length} report to complete`
          : `${relayDisputes.length} constat à compléter`,
        detail: `${first.ref} · ${first.reason_display}`,
        onClick: () => setTab("litiges"),
      });
    }

    if (!isKycApproved) {
      items.push({
        id: "kyc",
        icon: IdCard,
        tone: "red",
        title: locale === "en" ? "KYC file to complete" : "Dossier KYC à compléter",
        detail: locale === "en"
          ? "BelivaY cannot pay you out until your documents are verified."
          : "BelivaY ne peut pas vous verser vos gains tant que vos pièces ne sont pas vérifiées.",
        onClick: () => setTab("kyc"),
      });
    }

    if (!hasCapacity || !hasHours) {
      items.push({
        id: "setup",
        icon: Warehouse,
        tone: "red",
        title: locale === "en" ? "Finish your setup" : "Terminer votre configuration",
        detail: !hasCapacity
          ? (locale === "en" ? "Declare how many slots your relay has." : "Déclarez le nombre de places de votre relais.")
          : (locale === "en" ? "Set your opening days and hours." : "Renseignez vos jours et horaires d'ouverture."),
        onClick: () => setTab("capacite"),
      });
    }

    if (todayCounters.freeGarde > 0) {
      items.push({
        id: "free-garde",
        icon: Layers,
        tone: "slate",
        title: locale === "en"
          ? `${todayCounters.freeGarde} parcel(s) under free storage`
          : `${todayCounters.freeGarde} colis en garde gratuite`,
        detail: todayCounters.nextFreeEnd
          ? (locale === "en"
              ? `No fee until ${formatCourt(todayCounters.nextFreeEnd)}, then 200 F per day.`
              : `Sans frais jusqu'au ${formatCourt(todayCounters.nextFreeEnd)}, puis 200 F par jour.`)
          : (locale === "en" ? "No storage fee yet." : "Aucun frais de garde pour l'instant."),
        onClick: () => setTab("stock"),
      });
    }

    return items;
  }, [hasCapacity, hasHours, isKycApproved, locale, relayDisputes, setTab, todayCounters]);
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
    setOperationMessage({ tone: "error", text: error instanceof Error ? error.message : t("rl1_point_page.generic_error") });
  }, [t]);

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
          ? t("rl1_point_page.receive_success_with_slot", { slot: slotCode })
          : t("rl1_point_page.receive_success"),
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

  /** Refus motive au controle — Addendum Decisions v1.0 §9 : scelle rompu, colis endommage. */
  const refuseScannedParcel = async ({ shipmentId, reason, note, photo }: RefuseInput): Promise<boolean> => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      const form = new FormData();
      form.append("shipment_id", String(shipmentId));
      form.append("reason", reason);
      form.append("note", note);
      form.append("file", photo, photo.name || "refus.jpg");
      await http("/api/shipping/relay-point/refuse/", { method: "POST", body: form });
      setOperationMessage({ tone: "success", text: t("rl1_point_page.refuse_success") });
      await refreshRelayData();
      return true;
    } catch (error) {
      showOperationError(error);
      return false;
    } finally {
      setOperationBusy(false);
    }
  };

  /**
   * Remise au comptoir.
   *
   * Un seul code couvre tous les colis de la commande presents chez nous
   * (§8.3) : les preuves partent donc colis par colis — chaque expedition doit
   * pouvoir se defendre seule devant un litige — mais la remise, elle, part en
   * un seul appel.
   *
   * Point de garde strict (regle verrouillee) : le relais est un lieu fixe,
   * presume connecte. Les preuves doivent REUSSIR avant la remise, pas etre
   * mises en file d'attente.
   */
  const handOverParcels = async (input: HandOverInput): Promise<boolean> => {
    if (input.parcelIds.length === 0) return false;
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      for (const parcelId of input.parcelIds) {
        const photoForm = new FormData();
        photoForm.append("parcel_id", String(parcelId));
        photoForm.append("stage", "RELAY_RELEASED");
        photoForm.append("file", input.photo, input.photo.name || "remise.jpg");
        await http("/api/shipping/relay-point/evidence/", { method: "POST", body: photoForm });

        const signatureForm = new FormData();
        signatureForm.append("parcel_id", String(parcelId));
        signatureForm.append("stage", "RELAY_RELEASED_SIGNATURE");
        signatureForm.append("file", dataUrlToBlob(input.signature), "signature.png");
        await http("/api/shipping/relay-point/evidence/", { method: "POST", body: signatureForm });
      }

      await http<RelayParcel>("/api/shipping/relay-point/pickup/", {
        method: "POST",
        body: JSON.stringify({
          parcel_id: input.parcelIds[0],
          pickup_code: input.code,
          buyer_inspection: input.inspection,
          proof_note:
            input.inspection === "ACCEPTED"
              ? "Colis ouvert et accepte par le client au comptoir"
              : "Remise au comptoir sans ouverture",
          picked_up_by_name: input.authorizedName,
          picked_up_by_id_reference: input.idReference,
        }),
      });

      const count = input.parcelIds.length;
      setOperationMessage({
        tone: "success",
        text:
          input.inspection === "ACCEPTED"
            ? `${count > 1 ? `${count} colis remis` : "Colis remis"} et accepté par le client — le vendeur va être payé.`
            : `${count > 1 ? `${count} colis remis` : "Colis remis"}. Le client garde 7 jours pour signaler un problème.`,
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

  /**
   * Constat au comptoir : le colis NE SORT PAS.
   *
   * On n'appelle donc pas la remise — le colis reste en stock, et la preuve
   * photo suffit a ouvrir le dossier cote BelivaY. Un point relais ne peut pas
   * ouvrir de litige sur la commande d'un acheteur, et c'est voulu : il
   * constate, il ne juge pas.
   */
  const reportCounterIssue = async (input: CounterIssueInput): Promise<boolean> => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      // Une preuve par cliche : le serveur attache un fichier par appel, et
      // deux vues valent mieux qu'une devant une mediation.
      for (const [index, photo] of input.photos.entries()) {
        const form = new FormData();
        form.append("parcel_id", String(input.parcelId));
        form.append("stage", "RELAY_RELEASED");
        form.append("file", photo, photo.name || `constat-${index + 1}.jpg`);
        form.append("description", `Constat au comptoir — ${input.description}`);
        await http("/api/shipping/relay-point/evidence/", { method: "POST", body: form });
      }

      setOperationMessage({
        tone: "success",
        text: "Constat transmis à BelivaY. Le colis reste en stock chez vous jusqu'à la décision.",
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

  /**
   * Dépôt d'un retour au comptoir, avec ses deux photos de scellé.
   *
   * Le serveur les EXIGE désormais (`RelayPointReturnReceiveView`) : un
   * retour déposé ne crée aucun `RelayParcel`, il échappe donc à toutes les
   * preuves de colis. Ces deux clichés sont la seule trace de l'état du
   * paquet au moment où le gérant l'a pris en charge.
   *
   * L'envoi passe en `FormData` — pas de JSON, il transporte des fichiers.
   */
  const receiveReturn = async (returnId: number, photos: File[]): Promise<boolean> => {
    if (!returnId || photos.length !== 2) return false;
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      const form = new FormData();
      form.append("return_id", String(returnId));
      photos.forEach((photo) => form.append("photos", photo));
      await http("/api/shipping/relay-point/returns/receive/", { method: "POST", body: form });
      setOperationMessage({
        tone: "success",
        text: `Retour RT-${returnId} enregistré — il part à l'inspection avec la prochaine collecte.`,
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

  const updateRelaySettings = async (payload: { storage_capacity?: number; opening_hours?: string }) => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http("/api/auth/relay-point/profile/", { method: "PATCH", body: JSON.stringify(payload) });
      setOperationMessage({ tone: "success", text: t("rl1_point_page.settings_saved") });
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
      setOperationMessage({ tone: "success", text: t("rl1_point_page.support_message_sent") });
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
      setOperationMessage({ tone: "success", text: t("rl1_point_page.document_sent") });
    } catch (error) {
      showOperationError(error);
    } finally {
      setOperationBusy(false);
    }
  };


  /**
   * L'onglet d'accueil.
   *
   * Tout ce qui se lit au guichet vit dans `RelayToday` : salutation, arrivee
   * livreur, etat du local, actions en attente, gains, reputation. Cet ecran
   * est concu pour un telephone tenu d'une main, et s'elargit proprement.
   *
   * Il ne porte plus le rappel des 4 etapes du guichet ni le journal
   * operationnel : le premier repetait la procedure detaillee de l'ecran
   * Reception, le second n'a jamais eu de source de donnees. Deux panneaux de
   * lecture sous la pile d'actions donnaient surtout a l'accueil une longueur
   * que personne ne faisait defiler.
   */
  const renderDashboard = () => (
    <RelayToday
      locale={locale}
      manager={relayProfile.manager}
      arrivalCount={arrivals.length}
      arrivalCourier={arrivalCourier}
      arrivalVehicle={arrivalVehicle}
      arrivalMission={arrivalMission}
      readyForPickup={todayCounters.readyForPickup}
      lastDay={todayCounters.lastDay}
      outbound={todayCounters.outbound}
      capacityUsed={relayProfile.capacityUsed}
      capacityMax={relayProfile.capacityMax}
      closingLabel={closingLabel}
      todos={todayTodos}
      trust={relayProfile.trust}
      onNavigate={setTab}
      footer={
        <>
          <EvidenceRequestInbox accent="#2563EB" />
          {!Capacitor.isNativePlatform() && <AppDownloadBanner portal="RELAY_POINT" />}
        </>
      }
    />
  );

  /**
   * Reserve a la reception : le colis entre, mais son etat est date.
   *
   * On ne refuse pas — le client attend son colis et un angle enfonce ne le
   * rend pas inutilisable. La photo part en preuve `RELAY_RECEIVED`, donc
   * attachee a l'expedition : si le contenu est casse, la reserve prouve que
   * le dommage etait la avant nous.
   */
  const reserveOnReception = async (input: { parcelId: number; photo: File; note: string }): Promise<boolean> => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      const form = new FormData();
      form.append("parcel_id", String(input.parcelId));
      form.append("stage", "RELAY_RECEIVED");
      form.append("file", input.photo, input.photo.name || "reserve.jpg");
      form.append("description", `Réserve au contrôle — ${input.note}`);
      await http("/api/shipping/relay-point/evidence/", { method: "POST", body: form });
      setOperationMessage({ tone: "success", text: "Réserve enregistrée. Le colis peut entrer en stock." });
      return true;
    } catch (error) {
      showOperationError(error);
      return false;
    } finally {
      setOperationBusy(false);
    }
  };

  /**
   * Ecart de comptage.
   *
   * Aucun endpoint ne compare l'annonce au reel : on le trace par le canal
   * support, horodate, pendant que le livreur est encore la. C'est ce qui
   * fait la difference entre un ecart constate et un colis disparu.
   */
  const reportLotGap = async (note: string): Promise<boolean> => {
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relayProfile.name,
          email: user?.email || "support@belivay.com",
          phone: relayAccount?.phone || "",
          subject: "[Point relais] Écart de comptage à la réception",
          message: note,
        }),
      });
      setOperationMessage({ tone: "success", text: "Écart signalé à BelivaY. Le livreur en répond." });
      return true;
    } catch (error) {
      showOperationError(error);
      return false;
    } finally {
      setOperationBusy(false);
    }
  };

  const renderReception = () => (
    <RelayReception
      arrivals={arrivals}
      busy={operationBusy}
      occupiedSlots={occupiedSlots}
      managerName={relayProfile.manager}
      onReceive={receiveScannedParcel}
      onRefuse={refuseScannedParcel}
      onReserve={reserveOnReception}
      onReportGap={reportLotGap}
      placesUsed={placesUsed}
      capacityMax={relayProfile.capacityMax}
      outbound={todayCounters.outbound}
      onOpenOutbound={() => setTab("sortie")}
    />
  );

  /**
   * Les colis en stock, vus par le plan des etageres.
   *
   * Le plan a besoin des echeances de garde, que le serveur calcule deja, et
   * de la taille brute — c'est elle qui decide de la zone. Il n'a besoin ni
   * du telephone du client ni de son adresse.
   */
  const shelfParcels = useMemo<ShelfParcel[]>(
    () =>
      relayParcels
        .filter((parcel) => !["PICKED_UP", "RETURNED_TO_VENDOR", "RETURNED_TO_BELIVAY"].includes(parcel.status))
        .map((parcel) => ({
          id: parcel.id,
          orderId: parcel.order_id,
          ref: `BV-${parcel.order_id}`,
          slot: parcel.slot_code || "",
          size: parcel.parcel_size || "STANDARD",
          sizeLabel: parcel.parcel_size_label || "Taille non renseignée",
          buyerRef: anonymizedBuyerRef(parcel),
          status: parcel.status,
          pickupCode: parcel.pickup_code || "",
          receivedAt: parcel.received_at,
          gardeFreeUntil: parcel.garde_free_until,
          gardeDeadline: parcel.garde_deadline,
          gardeFeeXaf: parcel.garde_fee_due_xaf || 0,
        })),
    [relayParcels],
  );

  /**
   * Places occupees, et non nombre de colis.
   *
   * Un encombrant mange la place de cinq petits : compter les colis pour
   * mesurer un local revient a dire qu'un refrigerateur et une enveloppe
   * s'equivalent.
   */
  const placesUsed = useMemo(
    () => shelfParcels.reduce((total, parcel) => total + placesOf(parcel.size), 0),
    [shelfParcels],
  );

  /**
   * Les sorties du relais.
   *
   * Un colis quitte le local pour trois raisons que le serveur sait dire :
   * refuse au controle, renvoye faute de retrait, ou retour valide. Le motif
   * n'est pas un champ — il se lit du statut et de l'echeance de garde, et
   * c'est lui qui decide de la couleur et de la phrase affichees.
   */
  const outboundParcels = useMemo(() => {
    const now = Date.now();

    const jourDeGarde = (parcel: RelayParcel) => {
      if (!parcel.received_at) return 0;
      const recu = new Date(parcel.received_at);
      if (Number.isNaN(recu.getTime())) return 0;
      return Math.floor((now - recu.getTime()) / 86_400_000) + 1;
    };

    const motif = (parcel: RelayParcel): OutboundReason => {
      if (parcel.status === "REFUSED") return "refus";
      const echeance = parcel.garde_deadline ? new Date(parcel.garde_deadline) : null;
      if (echeance && !Number.isNaN(echeance.getTime()) && echeance.getTime() < now) return "renvoi";
      return "retour";
    };

    const decrire = (parcel: RelayParcel, reason: OutboundReason) => {
      if (reason === "refus") return "refusé au contrôle → vendeur";
      if (reason === "renvoi") return `non retiré (J${jourDeGarde(parcel)}) → vendeur`;
      return "retour validé → vendeur";
    };

    const vers = (parcel: RelayParcel, reason: OutboundReason): OutboundParcel => ({
      id: parcel.id,
      ref: `BV-${parcel.order_id}`,
      slot: parcel.slot_code || "",
      reason,
      detail: decrire(parcel, reason),
      returnedAt: parcel.returned_at,
    });

    const pending = relayParcels
      .filter((parcel) => ["RETURN_REQUESTED", "REFUSED"].includes(parcel.status) && !parcel.returned_at)
      .map((parcel) => vers(parcel, motif(parcel)));

    const departed = relayParcels
      .filter((parcel) => Boolean(parcel.returned_at))
      .sort((a, b) => (b.returned_at || "").localeCompare(a.returned_at || ""))
      .map((parcel) => vers(parcel, parcel.status === "REFUSED" ? "refus" : "renvoi"));

    return { pending, departed };
  }, [relayParcels]);

  /**
   * Sortie validee : un appel par colis, vers le vendeur.
   *
   * On ne s'arrete pas au premier echec — le livreur est deja reparti avec
   * les colis acceptes, et marquer les autres comme restes est plus juste
   * que d'annuler tout le lot.
   */
  const validateOutbound = async (ids: number[]): Promise<boolean> => {
    if (ids.length === 0) return false;
    setOperationBusy(true);
    setOperationMessage(null);
    const echecs: number[] = [];
    try {
      for (const parcelId of ids) {
        try {
          await http("/api/shipping/relay-point/return/", {
            method: "POST",
            body: JSON.stringify({
              parcel_id: parcelId,
              destination: "VENDOR",
              proof_note: `Sortie validée au comptoir · ${new Date().toLocaleString("fr-FR")}`,
            }),
          });
        } catch {
          echecs.push(parcelId);
        }
      }
      const partis = ids.length - echecs.length;
      setOperationMessage(
        echecs.length === 0
          ? { tone: "success", text: `${partis} colis remis au livreur — la garde ne vous incombe plus.` }
          : {
              tone: "error",
              text: `${partis} colis sortis, ${echecs.length} refusés par le serveur. Les colis refusés restent chez vous.`,
            },
      );
      await refreshRelayData();
      return echecs.length === 0;
    } finally {
      setOperationBusy(false);
    }
  };

  const renderStock = () => (
    <div className="space-y-4">
      <header className="pt-0.5">
        <h2 className="text-[27px] font-black leading-[1.15] tracking-[-0.015em] text-slate-900 dark:text-white">
          Colis en stock
        </h2>
        <p className="mt-1.5 text-[14.5px] font-medium text-slate-500 dark:text-slate-400">
          {shelfParcels.length} colis · {placesUsed} places sur {relayProfile.capacityMax}
        </p>
      </header>

      <RelayShelfPlan
        parcels={shelfParcels}
        capacityPlaces={relayProfile.capacityMax}
        onOpenParcel={() => setTab("retrait")}
      />

      <RelayStockList parcels={shelfParcels} onOpenParcel={() => setTab("retrait")} />

      <RelayGardeGrid />
    </div>
  );


  /**
   * Les colis en stock, tels que le comptoir a besoin de les voir.
   *
   * On ne passe pas `RelayParcel` brut a l'ecran de retrait : celui-ci n'a
   * aucune raison de connaitre le telephone du client ni son adresse. Il lui
   * faut de quoi retrouver un casier et controler une identite, rien de plus.
   */
  const pickupParcels = useMemo<RelayPickupParcel[]>(
    () =>
      relayParcels
        .filter((parcel) => ["RECEIVED", "STORED"].includes(parcel.status) && parcel.pickup_code)
        .map((parcel) => ({
          id: parcel.id,
          orderId: parcel.order_id,
          ref: `BV-${parcel.order_id}`,
          slot: parcel.slot_code || "à définir",
          sizeLabel: parcel.parcel_size_label || "Taille non renseignée",
          pickupCode: parcel.pickup_code,
          authorizedName: parcel.authorized_pickup_name || "",
          authorizedPhone: parcel.authorized_pickup_phone || "",
          gardeFeeXaf: parcel.garde_fee_due_xaf || 0,
        })),
    [relayParcels],
  );

  const renderRetrait = () => (
    <RelayPickup
      parcels={pickupParcels}
      busy={operationBusy}
      onHandOver={handOverParcels}
      onIssue={reportCounterIssue}
      onOpenReturnDeposit={() => {
        setDisputeFocus("retour");
        setTab("litiges");
      }}
      onOpenErrorStates={() => {
        setStateFocus("erreur");
        setTab("etats");
      }}
    />
  );

  const renderTrust = () => <RelayTrust onError={showOperationError} onNavigate={setTab} />;

  const renderTokens = () => (
    <Panel kicker={t("rl1_point_page.tokens_kicker")} title={t("rl1_point_page.module_in_development_title")}>
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <BadgeCheck size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">{t("rl1_point_page.tokens_in_development_title")}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          {t("rl1_point_page.tokens_in_development_body")}
        </p>
      </div>
    </Panel>
  );

  const renderNiveaux = () => (
    <Panel kicker={t("rl1_point_page.levels_kicker")} title={t("rl1_point_page.module_in_development_title")}>
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
          <Layers3 size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">{t("rl1_point_page.levels_in_development_title")}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          {t("rl1_point_page.levels_in_development_body")}
        </p>
      </div>
    </Panel>
  );

  /**
   * L'ecran des versements.
   *
   * `RelayPayouts` repond aux trois questions du gerant — combien, quand, sur
   * quel numero. Le panneau complet reste dessous : grille tarifaire,
   * ajustements, historique des versements. On ne perd rien, on hierarchise.
   */
  const renderFinances = () => (
    <div className="space-y-4">
      <RelayPayouts
        onSupport={() => setTab("messagerie")}
        onChangeNumber={() => setPayoutFormOpen(true)}
      />
      {/* Le parcours de changement de numero — deux codes SMS puis
          verification — ne se deroule que si on le demande : sur un ecran
          qu'on ouvre pour voir son argent, un formulaire de numero ouvert en
          permanence invite a toucher a ce qui marche. */}
      {payoutFormOpen ? <PayoutAccountVerificationCard ownerRole="RELAY_POINT" accent="#1D4ED8" /> : null}
      <RelayFinancePanel onOpenKyc={() => setTab("kyc")} />
    </div>
  );

  const renderCapacite = () => (
    <RelayCapacity
      capacity={relayProfile.capacityMax}
      used={placesUsed}
      hours={relayAccount?.opening_hours || ""}
      busy={operationBusy}
      onSave={(payload) => void updateRelaySettings(payload)}
      onOpenClosure={() => setTab("fermeture")}
    />
  );

  /**
   * Les colis du relais, vus par l'ecran de constat.
   *
   * On ne filtre pas sur le stock : un client revient contester APRES avoir
   * emporte son colis, et c'est precisement la que le constat compte.
   */
  const disputeParcels = useMemo<DisputeParcel[]>(
    () =>
      relayParcels.map((parcel) => ({
        id: parcel.id,
        orderId: parcel.order_id,
        ref: `BV-${parcel.order_id}`,
        slot: parcel.slot_code || "",
        sizeLabel: parcel.parcel_size_label || "Taille non renseignée",
        pickupCode: parcel.pickup_code || "",
        pickedUpAt: parcel.picked_up_at,
      })),
    [relayParcels],
  );

  const disputeFiles = useMemo<DisputeFile[]>(
    () =>
      relayDisputes.map((dispute) => ({
        ref: dispute.ref,
        orderId: dispute.order_id,
        reason: dispute.reason_display,
        status: dispute.status_display,
        createdAt: dispute.created_at,
        vendorContacted: Boolean(dispute.vendor_contacted),
        vendorReplied: Boolean(dispute.vendor_replied),
        vendorReplyDeadline: dispute.vendor_reply_deadline ?? null,
        hasMediator: Boolean(dispute.has_mediator),
        resolution: dispute.resolution_display || "",
        isClosed: Boolean(dispute.is_closed),
        requests: dispute.evidence_requests ?? [],
      })),
    [relayDisputes],
  );

  const renderLitiges = () => (
    <RelayDisputes
      parcels={disputeParcels}
      files={disputeFiles}
      busy={operationBusy}
      onReport={(input) =>
        reportCounterIssue({ parcelId: input.parcelId, photos: input.photos, description: input.description })
      }
      focus={disputeFocus}
      onReturnDeposit={receiveReturn}
    />
  );

  const renderSimple = (kind: RelayTab) => {
    if (kind === "kyc") {
      return (
        <Panel kicker={t("rl1_point_page.compliance_kicker")} title={t("rl1_point_page.kyc_documents_title")}>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="space-y-3">
              {kycItems.map(([title, status, body], index) => {
                const documentType = ["MANAGER_ID", "ACTIVITY_RECORD", "PAYOUT_ACCOUNT", "PREMISES_PHOTOS", "FIELD_VALIDATION"][index];
                const uploaded = complianceDocuments.find((document) => document.document_type === documentType);
                return (
                <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-slate-950 dark:text-white">{title}</strong>
                    <StatusPill tone={isKycApproved ? "emerald" : "amber"}>{status}</StatusPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">
                    {uploaded ? t("rl1_point_page.document_uploaded_status", { status: uploaded.status }) : t("rl1_point_page.send_document")}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={operationBusy} className="sr-only" onChange={(event) => void uploadRelayDocument(documentType, event.target.files?.[0])} />
                  </label>
                </div>
                );
              })}
            </div>
            <div className="hidden rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40 lg:block">
              <FileCheck2 className="text-blue-700 dark:text-blue-300" />
              <h3 className="mt-4 font-black text-blue-950 dark:text-blue-50">{t("rl1_point_page.opening_rule_title")}</h3>
              <p className="mt-2 text-sm leading-7 text-blue-950/75 dark:text-blue-100/80">
                {t("rl1_point_page.opening_rule_body")}
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
        <Panel kicker={t("rl1_point_page.traceability_kicker")} title={t("rl1_point_page.operational_history_title")}>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            {[t("rl1_point_page.filter_today"), t("rl1_point_page.filter_7_days"), t("rl1_point_page.filter_30_days"), t("rl1_point_page.filter_all_statuses")].map((filter) => (
              <button key={filter} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {filter}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {relayParcels.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800">{t("rl1_point_page.no_operations_recorded")}</div> : relayParcels.map((parcel) => (
                <article key={parcel.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3"><strong className="text-slate-950 dark:text-white">BV-{parcel.order_id}</strong><StatusPill tone={parcel.status === "PICKED_UP" ? "emerald" : parcel.status.startsWith("RETURNED_") ? "amber" : "blue"}>{parcel.status}</StatusPill></div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("rl1_point_page.slot_updated_at", { slot: parcel.slot_code || t("rl1_point_page.slot_undefined"), date: new Date(parcel.updated_at).toLocaleString(locale === "en" ? "en-US" : "fr-FR") })}</p>
                </article>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[[t("rl1_point_page.stat_receptions"), receivedCount], [t("rl1_point_page.stat_pickups"), pickedUpCount], [t("rl1_point_page.stat_returns"), returnedCount], [t("rl1_point_page.stat_disputes"), relayDisputes.length]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("rl1_point_page.computed_from_operations")}</p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      );
    }

    if (kind === "aide") {
      return (
        <Panel kicker={t("rl1_point_page.support_kicker")} title={t("rl1_point_page.help_support_title")}>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [HelpCircle, t("rl1_point_page.help_quick_guide_title"), t("rl1_point_page.help_quick_guide_body")],
              [MessageSquareText, t("rl1_point_page.help_contact_title"), t("rl1_point_page.help_contact_body")],
              [ShieldCheck, t("rl1_point_page.help_mediation_title"), t("rl1_point_page.help_mediation_body")],
            ].map(([Icon, title, body]) => (
              <div key={title as string} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <Icon className="text-blue-700 dark:text-blue-300" />
                <h3 className="mt-4 font-black text-slate-950 dark:text-white">{title as string}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body as string}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-[.8fr_1.2fr_auto] sm:items-end">
            <label className="text-xs font-black uppercase tracking-[0.12em] text-blue-900 dark:text-blue-100">{t("rl1_point_page.support_subject_label")}<input value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder={t("rl1_point_page.support_subject_placeholder")} className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none dark:bg-slate-900 dark:text-white" /></label>
            <label className="text-xs font-black uppercase tracking-[0.12em] text-blue-900 dark:text-blue-100">{t("rl1_point_page.support_message_label")}<textarea value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder={t("rl1_point_page.support_message_placeholder")} className="mt-2 min-h-20 w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-normal normal-case text-slate-900 outline-none dark:bg-slate-900 dark:text-white" /></label>
            <button type="button" onClick={sendRelaySupportMessage} disabled={operationBusy || supportSubject.trim().length < 3 || supportBody.trim().length < 10} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{t("rl1_point_page.send")}</button>
          </div>
        </Panel>
      );
    }

    if (kind === "notifications") {
      return (
        <Panel kicker={t("rl1_point_page.alerts_kicker")} title={t("rl1_point_page.operational_notifications_title")}>
          <div className="space-y-3">
            {notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-500">{t("rl1_point_page.no_notification")}</div> : notifications.map((notification) => (
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
                  <StatusPill tone={notification.is_read ? "emerald" : "amber"}>{notification.is_read ? t("rl1_point_page.read_status") : t("rl1_point_page.unread_status")}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    if (kind === "formation") {
      return (
        <Panel kicker={t("rl1_point_page.training_kicker")} title={t("rl1_point_page.training_modules_title")}>
          <div className="grid gap-4 md:grid-cols-2">
            {training.map((module) => (
              <div key={module.titleKey} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <BookOpen className="text-blue-700 dark:text-blue-300" />
                  <StatusPill tone={module.tagKey === "rl1_point_page.training_mandatory" ? "amber" : "slate"}>{t(module.tagKey)}</StatusPill>
                </div>
                <h3 className="mt-4 font-black text-slate-950 dark:text-white">{t(module.titleKey)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(module.bodyKey)}</p>
                <button className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-black text-blue-700 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">{t("rl1_point_page.open_module")}</button>
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    return (
      <Panel kicker={t("rl1_point_page.brand")} title={tabLabels[kind] ?? t("rl1_point_page.brand")}>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
          {t("rl1_point_page.section_not_configured")}
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
    footer: footerLines,
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
    messagerie: () => (
      <RelayInbox
        onError={showOperationError}
        relay={relayIdentity}
        onNavigate={setTab}
        outbound={todayCounters.outbound}
        arrivals={arrivals.length}
      />
    ),
    parametres: () => (
      <RelaySettings
        profile={{
          name: relayProfile.name,
          manager: relayProfile.manager,
          city: relayProfile.city,
          address: relayProfile.address,
          relayCode: relayAccount?.relay_code || "",
          status: relayProfile.status,
          memberSince: relayAccount?.created_at || null,
          tier: trustTier,
        }}
        username={user?.username || relayProfile.manager}
        avatarUrl={avatarUrl || undefined}
        onAvatarFile={setAvatarFile}
        onRequestChange={() => setTab("messagerie")}
      >
        <RelaySettingsBody
          locale={locale}
          theme={theme}
          onToggleTheme={toggleTheme}
          onChangeLanguage={changeLanguage}
          version={ui.footer[0] || ""}
          payoutMasked={payoutMasked}
          onOpenPayout={() => setTab("finances")}
          onInstall={() => {
            setStateFocus("install");
            setTab("etats");
          }}
          onSupport={() => setTab("messagerie")}
          onLogout={handleLogout}
        />
      </RelaySettings>
    ),
    sortie: () => (
      <RelayOutbound
        pending={outboundParcels.pending}
        departed={outboundParcels.departed}
        courierRef={arrivalCourier}
        passages={collectionPassages}
        busy={operationBusy}
        onValidate={validateOutbound}
      />
    ),
    etats: () => (
      <RelayStates
        focus={stateFocus}
        readiness={readiness}
        status={relayProfile.status}
        manager={relayProfile.manager}
        email={user?.email || ""}
        lastError={operationMessage?.tone === "error" ? operationMessage.text : null}
        parcelCount={relayParcels.length}
        onNavigate={setTab}
        onLogout={handleLogout}
      />
    ),
  }[tab];

  // Gris clair tres legerement chaud : les cartes blanches s'en detachent
  // sans que le fond ne tire vers l'orange de la marque, qui doit rester
  // reserve a ce qui presse.
  // `bg-fixed` cale le degrade sur la fenetre, pas sur la hauteur de page :
  // sans lui, un ecran long l'etire et un ecran court le coupe.
  return (
    <main className="belivay-portal min-h-screen bg-[linear-gradient(180deg,#F5F4F2_0%,#F1EFEC_55%,#EDEAE5_100%)] bg-fixed font-sans text-slate-950 dark:bg-slate-950 dark:bg-none dark:text-white">
      <div className="flex">
        <RelaySidebar
          activeTab={tab}
          onSelect={setTab}
          onLogout={handleLogout}
          labels={tabLabels}
          groupLabels={groupLabels}
          badges={navBadges}
          brandKicker={t("rl1_point_page.brand_kicker")}
          logoutLabel={t("rl1_point_page.logout")}
          profile={{
            name: relayProfile.name,
            status: relayProfile.status,
            city: relayProfile.city,
            trust: relayProfile.trust,
            avatarUrl: avatarUrl || undefined,
          }}
          footer={footerLines}
        />

        <section className="min-w-0 flex-1">
          {/* `safe-pt` : sous l'encoche, la barre collante ne passe plus sous le
              statut systeme. La densite se resserre sur telephone (icone + titre
              + avatar) et retrouve toutes les actions a partir de `lg`. */}
          {/* Le bandeau se detache du contenu par une ombre douce, pas par un
              trait : un filet de 1 px se lit comme une separation de tableau,
              une ombre comme une surface posee au-dessus de la page qui
              defile dessous. */}
          <header className="safe-pt-header sticky top-0 z-30 bg-white/90 px-4 pb-3.5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_4px_12px_rgba(15,23,42,.04)] backdrop-blur-xl dark:bg-slate-900/90 dark:shadow-[0_1px_2px_rgba(0,0,0,.4)] sm:px-6 sm:pb-4">
            {/* ── Bandeau de sous-page ───────────────────────────────────────
                Les quatre destinations de la barre du bas sont l'application :
                elles gardent le bandeau complet. Tout le reste est une page ou
                l'on entre et d'ou l'on ressort — retour, titre, marque, rien
                d'autre. Y laisser le menu et la cloche inviterait a partir
                ailleurs au milieu d'un reglage. */}
            {!PRIMARY_TABS.includes(tab) ? (
              <div className="flex min-h-[44px] items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={locale === "en" ? "Back" : "Retour"}
                  className="tap-target -ml-2 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-800 transition active:scale-90 dark:text-slate-100"
                >
                  <ChevronLeft size={26} strokeWidth={2.4} />
                </button>
                <h1 className="min-w-0 flex-1 truncate text-[18px] font-black tracking-[-0.01em]">
                  {activeLabel}
                </h1>
                <img
                  src="/favicon-belivay-cart.png"
                  alt="BelivaY"
                  className="h-8 w-auto flex-shrink-0 object-contain dark:brightness-0 dark:invert"
                />
              </div>
            ) : null}

            {/* ── Bandeau telephone/tablette ──────────────────────────────────
                Menu et logo a gauche, reglages a droite. Le tiroir s'ouvrant
                depuis la gauche, son bouton d'appel reste de ce cote : le geste
                et l'animation vont dans le meme sens. */}
            <div className={`min-h-[44px] items-center gap-1 lg:hidden ${PRIMARY_TABS.includes(tab) ? "flex" : "hidden"}`}>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t("rl1_point_page.space")}
                aria-haspopup="dialog"
                aria-expanded={drawerOpen}
                className="tap-target relative -ml-1 flex flex-shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <MenuIcon size={24} strokeWidth={2.2} />
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
                aria-label={tabLabels.dashboard}
                className="flex min-w-0 flex-shrink items-center rounded-xl px-1 py-1 transition active:scale-95"
              >
                {/* Logo BelivaY orange, pas la declinaison bleue du portail :
                    le gerant est chez BelivaY, la couleur de la marque ne
                    change pas selon le metier de celui qui regarde l'ecran.
                    En mode sombre l'orange passerait mal sur fond ardoise, on
                    le rend alors en blanc plein. */}
                <img
                  src="/belivay-logo.png"
                  alt="BelivaY"
                  className="h-[34px] w-auto object-contain dark:brightness-0 dark:invert"
                />
              </button>

              <div className="flex-1" />

              {/* Theme puis cloche puis avatar — trois boutons, pas quatre.
                  La bascule de langue vivait ici et n'y avait rien a faire :
                  on change de langue une fois dans sa vie, on regarde ses
                  notifications vingt fois par jour. Elle reste accessible dans
                  la feuille compte, a cote du reste des reglages. */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                className="tap-target flex flex-shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
              </button>

              <button
                type="button"
                onClick={() => setTab("notifications")}
                aria-label={ui.tabs.notifications}
                className="tap-target relative flex flex-shrink-0 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Bell size={22} />
                {navBadges.notifications ? (
                  <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
                    {navBadges.notifications > 99 ? "99+" : navBadges.notifications}
                  </span>
                ) : null}
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

            {/* Identite du relais, puis titre de l'ecran.
                Sur telephone c'est le seul endroit qui dit OU l'on est : le
                gerant qui tient deux points de depot doit le verifier sans
                ouvrir le tiroir.
                L'accueil, lui, n'affiche pas de titre : « Bonjour X » ouvre
                l'ecran trois lignes plus bas, et deux titres empiles valent
                zero titre. */}
            <div className={`mt-2.5 min-w-0 lg:hidden ${PRIMARY_TABS.includes(tab) ? "" : "hidden"}`}>
              <p className="flex items-center gap-2 text-[12px] font-black uppercase leading-none tracking-[0.055em] text-[#1D4ED8] dark:text-blue-300">
                <span aria-hidden className="h-[9px] w-[9px] flex-shrink-0 rounded-[2px] bg-[#1D4ED8] dark:bg-blue-400" />
                <span className="truncate">
                  {ui.brand} · {relayProfile.name}{relayProfile.city ? `, ${relayProfile.city}` : ""}
                </span>
              </p>
              {tab === "dashboard" ? null : (
                <h1 className="truncate text-[19px] font-black leading-tight tracking-tight">{activeLabel}</h1>
              )}
            </div>

            <div className="hidden items-center justify-between gap-2 lg:flex sm:flex-wrap sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none sm:gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  aria-label={t("rl1_point_page.back")}
                  title={t("rl1_point_page.back")}
                  className="tap-target inline-flex flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition active:scale-90 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300 sm:text-[11px] sm:tracking-[0.18em]">{t("rl1_point_page.space")}</p>
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
                  title={t("rl1_point_page.profile")}
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
                  title={t("rl1_point_page.change_language")}
                >
                  {locale === "fr" ? "FR" : "EN"}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:inline-flex"
                  title={theme === "dark" ? t("rl1_point_page.light_mode") : t("rl1_point_page.dark_mode")}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100 lg:inline-flex"
                  title={t("rl1_point_page.logout")}
                >
                  <LogOut size={17} />
                </button>
                <div className="hidden flex-wrap items-center gap-2 xl:flex">
                  <StatusPill tone={statusTone}>{relayProfile.status}</StatusPill>
                  <StatusPill tone="blue">{t("rl1_point_page.places_count", { used: relayProfile.capacityUsed, max: relayProfile.capacityMax })}</StatusPill>
                  <StatusPill tone="slate">{relayProfile.hours}</StatusPill>
                </div>
              </div>
            </div>
            {/* Ruban de contexte : ce que le gerant doit avoir sous les yeux en
                permanence (etat d'ouverture, places restantes, horaires). Il
                remplace l'ancien defilement lateral des 22 onglets, desormais
                repartis entre la barre du bas et la feuille « Menu ». */}
            <div className={`no-scrollbar mt-2.5 gap-2 overflow-x-auto lg:hidden ${PRIMARY_TABS.includes(tab) ? "flex" : "hidden"}`}>
              {/* Etat et heure de fermeture dans la meme pastille : « ouvert »
                  sans « jusqu'a quand » ne repond pas a la question que se
                  pose le gerant en arrivant le matin. Le point coloré porte
                  l'etat a lui seul, lisible avant meme d'avoir lu le mot. */}
              <span
                className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-[5px] text-[12.5px] font-semibold ${
                  statusTone === "emerald"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    : statusTone === "red"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                }`}
              >
                <span
                  aria-hidden
                  className={`mr-1.5 h-[6px] w-[6px] flex-shrink-0 rounded-full ${
                    statusTone === "emerald" ? "bg-emerald-500" : statusTone === "red" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                {relayProfile.status} · {closingLabel || relayProfile.hours}
              </span>
              {/* La capacite est le seul chiffre du bandeau qui peut devenir
                  bloquant : il porte donc l'orange, pas le bleu d'information. */}
              <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-3 py-[5px] text-[12.5px] font-semibold text-orange-600 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                {relayProfile.capacityUsed} / {relayProfile.capacityMax} places
              </span>
              <span className="inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-[5px] text-[12.5px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                Trust {relayProfile.trust}
              </span>
            </div>

          </header>

          {/* `pb-tabbar` : le dernier bloc de chaque ecran reste atteignable
              au-dessus de la barre d'onglets fixe et de la barre gestuelle. */}
          <div className="pb-tabbar pb-tabbar-tall p-4 sm:p-6 lg:pb-6">
            {/* Les demandes de preuve ouvrent chaque ecran metier — sauf
                l'accueil, ou elles passeraient devant « Bonjour X » et
                l'arrivee livreur. Elles y sont rendues en pied de page, et la
                ligne « constat a completer » les annonce depuis le haut. */}
            {tab === "dashboard" ? null : <EvidenceRequestInbox accent="#2563EB" />}
            {operationMessage ? (
              <div className={`mb-5 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold ${operationMessage.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span>{operationMessage.text}</span>
                <button type="button" onClick={() => setOperationMessage(null)} className="rounded-lg p-1 hover:bg-black/5" title={t("rl1_point_page.close")}><X size={16} /></button>
              </div>
            ) : null}
            <div className="mb-5 hidden rounded-2xl border border-blue-100 bg-blue-50 p-4 lg:block">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700" size={20} />
                <p className="text-sm leading-6 text-blue-950/75">
                  {t("rl1_point_page.interface_compliance_notice")}
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
        labels={{ ...ui.tabs, ...ui.tabsShort }}
        badges={navBadges}
        navLabel={t("rl1_point_page.space")}
      />

      <RelayDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelect={(next, focus) => {
          setDrawerOpen(false);
          setStateFocus(focus ?? null);
          setTab(next);
        }}
        labels={ui.tabs}
        badges={navBadges}
        outbound={todayCounters.outbound}
        trust={relayProfile.trust}
        profile={{
          name: relayProfile.name,
          status: relayProfile.status,
          city: relayProfile.city,
          manager: relayProfile.manager,
          avatarUrl: avatarUrl || undefined,
        }}
        footer={footerLines}
        title={t("rl1_point_page.space")}
        closeLabel={t("rl1_point_page.close")}
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
            setOperationMessage({ tone: "success", text: t("rl1_point_page.avatar_updated") });
          }}
        />
      ) : null}
    </main>
  );
}
