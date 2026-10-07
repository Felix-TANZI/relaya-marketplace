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
  IdCard,
  Layers,
  LockKeyhole,
  Menu as MenuIcon,
  LogOut,
  Moon,
  Scale,
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
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import RelayReception, { type RelayArrival, type RefuseInput } from "./RelayReception";
import RelayPickup, {
  type CounterIssueInput,
  type HandOverInput,
  type PickupCodeCheck,
  type RelayPickupParcel,
} from "./RelayPickup";
import RelayReviews from "./RelayReviews";
import RelayTrust, { type RelayTrustScore } from "./RelayTrust";
import RelayTraining from "./RelayTraining";
import RelayInbox from "./RelayInbox";
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
import RelayHistory from "./RelayHistory";
import RelayTiers from "./RelayTiers";
import RelayStatus from "./RelayStatus";
import RelayOffline from "./RelayOffline";
import RelayErrorStates from "./RelayErrorStates";
import RelayCamera from "./RelayCamera";
import RelayInstall from "./RelayInstall";
import RelayPinLogin from "./RelayPinLogin";
import RelayInvitation from "./RelayInvitation";
import RelayHelp from "./RelayHelp";
import RelayApply from "./RelayApply";
import RelayTrainingMobile from "./RelayTrainingMobile";
import RelayActivation from "./RelayActivation";
import RelayTeam from "./RelayTeam";
import RelayDocuments from "./RelayDocuments";
import RelayClosureMobile from "./RelayClosureMobile";
import RelayReportsMobile from "./RelayReportsMobile";
import RelayNotifications, { type NotifItem, type NotifSettings } from "./RelayNotifications";
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

/* La matiere du portail : le papier chaud du fond, le verre du bandeau et
   du dock, la carte, le bandeau orange, le panneau bleu nuit, et la mise
   en deux colonnes de la tablette. Importee ici et non dans `index.css`
   parce que cet ecran est charge a la demande : sa feuille arrive donc
   apres celle de Tailwind, et ses regles la recouvrent sans `!important`.
   Voir `relayTheme.css`, qui importe lui-meme la remise a la palette. */
import "./relayTheme.css";

/** Les destinations de la barre du bas : elles gardent le bandeau complet. */
const PRIMARY_TABS: RelayTab[] = ["dashboard", "reception", "retrait", "stock"];

/**
 * Ecrans qui ne portent PAS la boite des demandes de preuve.
 *
 * Elle appelle une action de dossier : sa place est au-dessus d'un ecran
 * metier, pas au-dessus d'un formulaire de reglages, ou elle coiffe le titre
 * et repousse ce qu'on est venu modifier. L'accueil l'affiche en pied de
 * page, et sa ligne « constat a completer » l'annonce depuis le haut.
 */
const ECRANS_SANS_BOITE_PREUVES: RelayTab[] = ["dashboard", "capacite"];


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
      reseau: "Mon équipe",
      fermeture: "Fermeture exceptionnelle",
      litiges: "Litiges",
      kyc: "Documents KYC",
      inscription: "Activation et partenariat",
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
      reseau: "My team",
      fermeture: "Exceptional closure",
      litiges: "Disputes",
      kyc: "KYC documents",
      inscription: "Activation & partnership",
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

export default function RelayPointPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTabState] = useState<RelayTab>(getInitialRelayTab);
  const [tabHistory, setTabHistory] = useState<RelayTab[]>([]);

  /**
   * La page ouverte depuis le menu, s'il y en a une.
   *
   * Le menu est une LISTE : on y vient pour parcourir, on ouvre une entree,
   * on revient en choisir une autre. Sans cette memoire, le retour renvoyait
   * a la page d'ou l'on venait avant d'ouvrir le menu — l'accueil, le plus
   * souvent — et il fallait rouvrir le tiroir a chaque fois pour avancer
   * d'une ligne dans la liste.
   *
   * Une reference et non un etat : elle ne change rien a l'affichage, et la
   * faire passer par un rendu ferait clignoter le tiroir.
   */
  const origineMenu = useRef<RelayTab | null>(null);
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
  const [complianceDocuments, setComplianceDocuments] = useState<ComplianceDocument[]>([]);
  /** Passages annonces au comptoir — voir `RelayPointCollectionScheduleView`. */
  const [collectionPassages, setCollectionPassages] = useState<CollectionPassage[]>([]);
  /** Les modules obligatoires sont-ils suivis ? Lu pour l'ecran d'accueil. */
  const [trainingDone, setTrainingDone] = useState(false);
  useEffect(() => {
    http<{ core_completed: number; core_total: number }>("/api/auth/relay-point/training/")
      .then((etat) => setTrainingDone(etat.core_total > 0 && etat.core_completed >= etat.core_total))
      .catch(() => setTrainingDone(false));
  }, []);

  /** Cours de formation deplie : la grille cede la place au module. */
  const [trainingOpen, setTrainingOpen] = useState(false);
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
  /** Un numero verifie par code : c'est l'etape 2 de l'activation. */
  const [payoutVerified, setPayoutVerified] = useState(false);
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
        setPayoutVerified(comptes.some((compte) => compte.status === "VERIFIED"));
      })
      .catch(() => {
        setPayoutMasked("");
        setPayoutVerified(false);
      });
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
    // On quitte l'ecran d'etat en meme temps que la page qui le portait.
    //
    // Sans cette ligne, revenir depuis « Connexion » ne faisait que retirer
    // le focus : on decouvrait la LISTE des etats, et il fallait un second
    // retour pour atteindre le menu. Une escale que personne n'a demandee,
    // sur un chemin qu'on ne prend que pour en sortir.
    setStateFocus(null);
    // Venu du menu, on y retourne — et seulement pour la page qu'on y a
    // ouverte : si le gerant a navigue plus loin depuis, c'est l'historique
    // qui reprend la main.
    if (origineMenu.current === tabRef.current) {
      origineMenu.current = null;
      // La page qui reste DERRIERE le menu est celle d'ou l'on venait avant
      // de l'ouvrir, et non celle qu'on vient de quitter : fermer le menu
      // sans rien choisir doit ramener la ou on etait, pas rouvrir l'ecran
      // qu'on fermait a l'instant.
      if (tabHistory.length > 0) {
        setTabState(tabHistory[tabHistory.length - 1]);
        setTabHistory((previous) => previous.slice(0, -1));
      }
      setDrawerOpen(true);
      return;
    }
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

  /**
   * L'ecriture des reglages du relais.
   *
   * Un seul appel pour tout ce que `/relay-point/profile/` accepte : la
   * capacite et les horaires, l'acceptation des encombrants, et l'identite —
   * celle-ci sous mot de passe, verifie par le serveur dans l'ecriture
   * elle-meme.
   */
  const updateRelaySettings = async (payload: {
    storage_capacity?: number;
    opening_hours?: string;
    accepts_bulky?: boolean;
    name?: string;
    manager_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    current_password?: string;
  }) => {
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

  /**
   * L'enregistrement de l'identité du relais.
   *
   * Rend le message d'erreur du serveur plutôt que de le pousser dans le
   * bandeau de la page : un « mot de passe incorrect » doit s'afficher dans
   * le formulaire, sous le champ, et non derrière la feuille qui le cache.
   */
  const saveRelayIdentity = async (payload: {
    name: string;
    manager_name: string;
    phone: string;
    address: string;
    city: string;
    current_password: string;
  }): Promise<string | null> => {
    try {
      await http("/api/auth/relay-point/profile/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setOperationMessage({ tone: "success", text: "Vos informations sont enregistrées." });
      // Le profil du relais vient de la session : on la relit plutôt que de
      // recopier les valeurs à la main dans dix endroits de l'écran.
      window.setTimeout(() => window.location.reload(), 500);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Enregistrement impossible.";
    }
  };

  /**
   * Une demande au support, depuis l'ecran d'aide.
   *
   * Le sujet et le corps sont passes en argument plutot que lus d'un etat de
   * page : le formulaire vit dans `RelayHelp`, et deux copies du meme texte
   * finiraient par diverger.
   */
  const sendRelaySupportMessage = async (sujet: string, corps: string): Promise<boolean> => {
    if (sujet.trim().length < 3 || corps.trim().length < 10) return false;
    setOperationBusy(true);
    setOperationMessage(null);
    try {
      await http("/api/contact/", {
        method: "POST",
        body: JSON.stringify({
          name: relayProfile.name,
          email: user?.email || "support@belivay.com",
          phone: relayAccount?.phone || "",
          subject: `[Point relais] ${sujet.trim()}`,
          message: corps.trim(),
        }),
      });
      setOperationMessage({ tone: "success", text: t("rl1_point_page.support_message_sent") });
      return true;
    } catch (error) {
      showOperationError(error);
      return false;
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
  /**
   * Le tableau de bord, et sa version « relais neuf ».
   *
   * `vide` met les compteurs a zero pour montrer l'ecran d'un relais qui
   * n'a encore rien vu passer — c'est une entree de demonstration du menu
   * « Etats », pas un etat du compte. On passe par le meme rendu : deux
   * appels separes divergeraient des le premier champ ajoute.
   */
  const renderDashboard = (vide = false) => (
    <RelayToday
      locale={locale}
      manager={relayProfile.manager}
      arrivalCount={vide ? 0 : arrivals.length}
      arrivalCourier={arrivalCourier}
      arrivalVehicle={arrivalVehicle}
      arrivalMission={arrivalMission}
      readyForPickup={vide ? 0 : todayCounters.readyForPickup}
      lastDay={vide ? 0 : todayCounters.lastDay}
      outbound={vide ? 0 : todayCounters.outbound}
      capacityUsed={vide ? 0 : relayProfile.capacityUsed}
      capacityMax={relayProfile.capacityMax}
      closingLabel={closingLabel}
      todos={vide ? [] : todayTodos}
      trust={relayProfile.trust}
      // Le signal d'un relais NEUF : aucun colis jamais passe. Les compteurs
      // du jour tombent a zero chaque matin — s'y fier ferait reapparaitre
      // l'ecran de bienvenue a un gerant qui travaille depuis six mois.
      lifetimeParcels={vide ? 0 : relayParcels.length}
      trainingDone={trainingDone}
      payoutVerified={payoutVerified}
      onNavigate={setTab}
      footer={
        <>
          <EvidenceRequestInbox accent="#2456D6" />
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
   * Un `RelayParcel` brut vers ce que l'ecran de retrait a besoin de voir.
   *
   * On ne lui passe pas le type brut : celui-ci n'a aucune raison de
   * connaitre le telephone du client ni son adresse. Il lui faut de quoi
   * retrouver un casier et controler une identite, rien de plus.
   */
  const toPickupParcel = (parcel: RelayParcel): RelayPickupParcel => ({
    id: parcel.id,
    orderId: parcel.order_id,
    ref: `BV-${parcel.order_id}`,
    slot: parcel.slot_code || "à définir",
    sizeLabel: parcel.parcel_size_label || "Taille non renseignée",
    pickupCode: parcel.pickup_code,
    authorizedName: parcel.authorized_pickup_name || "",
    authorizedPhone: parcel.authorized_pickup_phone || "",
    gardeFeeXaf: parcel.garde_fee_due_xaf || 0,
  });

  /**
   * Verifie un code de retrait aupres du serveur, seule source fiable pour
   * les deux sous-etats jusque-la invisibles au comptoir : code faux (avec
   * essais restants) et colis bloque 24 h apres 3 echecs consecutifs
   * (Regles Systeme DEV v2.0 §8.2). Remplace la comparaison locale : un
   * compteur qu'une simple recharge de page remettrait a zero ne protegerait
   * personne.
   */
  const checkPickupCode = async (code: string): Promise<PickupCodeCheck> => {
    try {
      const data = await http<{
        locked: boolean;
        locked_until: string | null;
        attempts_left: number | null;
        parcels: RelayParcel[];
      }>("/api/shipping/relay-point/pickup/check/", {
        method: "POST",
        body: JSON.stringify({ pickup_code: code }),
      });
      return {
        locked: data.locked,
        lockedUntil: data.locked_until,
        attemptsLeft: data.attempts_left,
        parcels: data.parcels.map(toPickupParcel),
      };
    } catch (error) {
      showOperationError(error);
      return { locked: false, lockedUntil: null, attemptsLeft: null, parcels: [] };
    }
  };

  const renderRetrait = () => (
    <RelayPickup
      busy={operationBusy}
      onCheckCode={checkPickupCode}
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
      onContactSupport={() => setTab("messagerie")}
    />
  );

  const renderTrust = () => <RelayTrust onError={showOperationError} onNavigate={setTab} />;

  const renderTokens = () => (
    <Panel kicker={t("rl1_point_page.tokens_kicker")} title={t("rl1_point_page.module_in_development_title")}>
      <div className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)]">
          <BadgeCheck size={30} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-blue-950">{t("rl1_point_page.tokens_in_development_title")}</h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-blue-950/70">
          {t("rl1_point_page.tokens_in_development_body")}
        </p>
      </div>
    </Panel>
  );

  /**
   * L'ecran des paliers.
   *
   * Il remplace un panneau « en cours de developpement » qui annoncait des
   * paliers Starter/Confirme/Premium non actives. Ils le sont : la regle
   * `ROLE_TIER_RULES[RELAY_POINT]` les applique depuis le serveur, avec un
   * seuil de score ET un seuil de volume.
   */
  const renderNiveaux = () => <RelayTiers />;

  /**
   * L'ecran des versements.
   *
   * `RelayPayouts` repond aux trois questions du gerant — combien, quand, sur
   * quel numero — et la page s'arrete la.
   *
   * L'ancien `RelayFinancePanel` vivait dessous. Il faisait doublon : la
   * grille tarifaire, le motif de blocage et la date du prochain versement
   * sont deja dans `RelayPayouts`, qui les lit des memes endpoints. Deux
   * lectures du meme chiffre sur un meme ecran, c'est une de trop — le jour
   * ou elles divergent, le gerant ne sait plus laquelle croire.
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
      {payoutFormOpen ? <PayoutAccountVerificationCard ownerRole="RELAY_POINT" accent="#2456D6" /> : null}
    </div>
  );

  const renderCapacite = () => (
    <RelayCapacity
      capacity={relayProfile.capacityMax}
      used={placesUsed}
      hours={relayAccount?.opening_hours || ""}
      acceptsBulky={relayAccount?.accepts_bulky ?? true}
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

  /**
   * Le resume du matin, et ce qui attend le gerant.
   *
   * ───────────────────────────────────────────────────────────────────────
   * TOUT EST DERIVE, RIEN N'EST STOCKE
   *
   * Aucune table ne range un « resume du matin ». Les chiffres sont lus de
   * l'etat reel du relais : colis annonces, colis qui attendent leur client,
   * colis qui doivent partir. Ils sont donc toujours justes.
   *
   * ───────────────────────────────────────────────────────────────────────
   * CE QUI N'EST PAS ANNONCE
   *
   * La maquette affiche « Livreur dans ~12 min ». Aucune donnee ne le
   * permet : le portail relais ne recoit ni position du livreur, ni heure de
   * passage — `RelayParcelSerializer` n'expose ni tournee, ni creneau, ni
   * `ShipmentLocation`. On annonce donc ce qu'on sait : qu'un livreur est en
   * route, avec sa mission, son nombre de colis et les places a prevoir.
   */
  /**
   * Les reglages de notification.
   *
   * Charges a part des autres donnees : ils ne changent pas d'un
   * rafraichissement a l'autre, et les recharger avec les colis ferait une
   * requete de plus toutes les minutes pour rien.
   */
  const [notifSettings, setNotifSettings] = useState<NotifSettings | null>(null);
  const [notifSettingsBusy, setNotifSettingsBusy] = useState(false);

  useEffect(() => {
    http<NotifSettings>("/api/auth/relay-point/notification-preferences/")
      .then(setNotifSettings)
      .catch(() => setNotifSettings(null));
  }, []);

  /**
   * Enregistrement optimiste.
   *
   * L'interrupteur bascule tout de suite, puis le serveur confirme. Attendre
   * l'aller-retour donnerait un bouton mou ; et si le serveur refuse — une
   * heure de resume avant 7 h, par exemple — sa reponse ecrase la valeur
   * affichee, donc rien ne reste faux a l'ecran.
   */
  const changeNotifSettings = useCallback(
    (patch: Partial<NotifSettings>) => {
      setNotifSettings((current) => (current ? { ...current, ...patch } : current));
      setNotifSettingsBusy(true);
      http<NotifSettings>("/api/auth/relay-point/notification-preferences/", {
        method: "PATCH",
        body: JSON.stringify(patch),
      })
        .then(setNotifSettings)
        .catch(() =>
          // Le refus du serveur fait foi : on relit plutot que de garder une
          // valeur que personne n'a acceptee.
          http<NotifSettings>("/api/auth/relay-point/notification-preferences/")
            .then(setNotifSettings)
            .catch(() => undefined),
        )
        .finally(() => setNotifSettingsBusy(false));
    },
    [],
  );

  const notifSummary = useMemo(
    () => ({
      toReceive: arrivals.length,
      pickupsExpected: todayCounters.readyForPickup,
      outbound: todayCounters.outbound,
      freePlaces: Math.max(0, (relayAccount?.storage_capacity || 0) - placesUsed),
      capacity: relayAccount?.storage_capacity || 0,
    }),
    [arrivals.length, placesUsed, relayAccount?.storage_capacity, todayCounters],
  );

  /** Ce qui appelle un geste, dans l'ordre ou il coute cher de l'ignorer. */
  const notifTodo = useMemo<NotifItem[]>(() => {
    const items: NotifItem[] = [];

    if (arrivals.length > 0) {
      // Places, pas colis : un encombrant en occupe cinq. Annoncer « 6 colis »
      // a un gerant qui n'a que six places libres lui ferait croire que ca
      // passe, et le livreur repartirait avec la moitie du lot.
      const places = relayParcels
        .filter((parcel) => parcel.status === "EXPECTED")
        .reduce((total, parcel) => total + placesOf(parcel.parcel_size || "STANDARD"), 0);
      items.push({
        id: "arrivee",
        tone: "orange",
        icon: "truck",
        title: arrivals.length > 1 ? `${arrivals.length} colis en route` : "Un colis en route",
        detail: [arrivalMission, `${arrivals.length} colis`, `${places} place${places > 1 ? "s" : ""} a prevoir`]
          .filter(Boolean)
          .join(" · "),
        at: "",
        onOpen: () => setTab("reception"),
      });
    }

    const aRenvoyer = outboundParcels.pending[0];
    if (aRenvoyer) {
      items.push({
        id: "renvoi",
        tone: "red",
        icon: "retour",
        title:
          outboundParcels.pending.length > 1
            ? `${outboundParcels.pending.length} colis a faire partir`
            : "Un colis a renvoyer",
        detail: `${aRenvoyer.ref} · ${aRenvoyer.detail}`,
        at: "",
        onOpen: () => setTab("sortie"),
      });
    }

    // Les pieces reclamees AU RELAIS. Celles qui visent le vendeur ou
    // l'acheteur ne le regardent pas.
    relayDisputes.forEach((dispute) => {
      (dispute.evidence_requests || []).forEach((demande, rang) => {
        items.push({
          id: `piece-${dispute.id}-${rang}`,
          tone: "gold",
          icon: "dossier",
          title: "Photo demandee",
          detail: `${dispute.ref} · ${demande.instructions}`,
          at: dispute.updated_at,
          onOpen: () => {
            setDisputeFocus("dossiers");
            setTab("litiges");
          },
        });
      });
    });

    return items;
  }, [arrivalMission, arrivals.length, outboundParcels.pending, relayDisputes, relayParcels, setTab]);

  /**
   * Ce qui ne demande rien.
   *
   * Les notifications du serveur (`UserNotification`) atterrissent ici, et
   * non dans « A traiter » : elles racontent ce qui s'est passe, pas ce
   * qu'on attend du gerant. Les melanger viderait la premiere section de
   * son sens.
   */
  const notifInfo = useMemo<NotifItem[]>(
    () =>
      notifications.slice(0, 8).map((notification) => {
        // Correspondance par TYPE, jamais par mots du titre : une icone
        // choisie sur le libelle changerait de sens a la premiere
        // reformulation, et personne ne saurait pourquoi.
        const parType: Record<string, { tone: NotifItem["tone"]; icon: NotifItem["icon"] }> = {
          PAYMENT: { tone: "green", icon: "versement" },
          SYSTEM: { tone: "blue", icon: "bouclier" },
          SUPPORT: { tone: "gold", icon: "dossier" },
          ORDER: { tone: "blue", icon: "colis" },
          PROMOTION: { tone: "orange", icon: "cloche" },
        };
        const style = parType[notification.notification_type] ?? { tone: "blue" as const, icon: "cloche" as const };
        return {
          id: `notif-${notification.id}`,
          tone: style.tone,
          icon: style.icon,
          title: notification.title,
          detail: notification.message,
          at: notification.created_at,
        };
      }),
    [notifications],
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
      // L'ancien panneau listait cinq lignes de conformite dans une grille
      // bureau. L'ecran mobile met en tete la seule chose qui decide : le
      // dossier autorise-t-il a recevoir et a etre paye. Les pieces suivent,
      // chacune avec son etat reel et son geste.
      return (
        <RelayDocuments
          documents={complianceDocuments}
          kycApproved={isKycApproved}
          busy={operationBusy}
          onUpload={(documentType, file) => void uploadRelayDocument(documentType, file)}
          onOpenPayoutNumber={() => {
            setPayoutFormOpen(true);
            setTab("finances");
          }}
        />
      );
    }

    if (kind === "historique") {
      // L'ancien panneau etait une console de bureau : quatre pseudo-filtres
      // sans effet, une grille de cartes, des statuts bruts. Il est remplace
      // par une ligne de temps que le serveur compose
      // (`RelayPointHistoryView`), et qui repond a la seule question posee au
      // comptoir : a quelle heure, a qui, avec quelle preuve.
      return <RelayHistory />;
    }

    if (kind === "aide") {
      // L'ancien panneau d'aide etait une page bureau. L'ecran mobile met en
      // tete le contact humain : quand on cherche de l'aide au comptoir, un
      // client attend, et lire sept questions n'est pas toujours la reponse.
      return (
        <RelayHelp
          onOpenInbox={() => setTab("messagerie")}
          busy={operationBusy}
          onSend={sendRelaySupportMessage}
        />
      );
    }

    if (kind === "notifications") {
      // L'ancien panneau listait les `UserNotification` brutes, statut
      // technique compris. Il est remplace par un resume derive de l'etat du
      // relais, puis par ce qui attend reellement un geste : un gerant qui
      // recoit une alerte par colis n'en lit plus aucune au bout d'une
      // semaine.
      return (
        <RelayNotifications
          summary={notifSummary}
          todo={notifTodo}
          info={notifInfo}
          settings={notifSettings}
          settingsBusy={notifSettingsBusy}
          onChangeSettings={changeNotifSettings}
        />
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
    // La grille mobile remplace le panneau bureau. `RelayTraining` garde le
    // CONTENU des modules : « Commencer » l'ouvre, au lieu de dupliquer le
    // cours dans deux composants qui divergeraient.
    formation: () =>
      // « Commencer » ouvre le COURS existant plutot qu'un second ecran : le
      // contenu pedagogique et le quiz vivent dans `RelayTraining`, et le
      // dupliquer garantirait qu'un jour les deux divergent.
      trainingOpen ? (
        <RelayTraining onError={showOperationError} />
      ) : (
        <RelayTrainingMobile onError={showOperationError} onOpenModule={() => setTrainingOpen(true)} />
      ),
    avis: () => <RelayReviews onError={showOperationError} />,
    // L'ancien `RelayReports` etait un panneau bureau : exports, bareme,
    // tableaux. L'ecran mobile repond d'abord a « combien ai-je touche »,
    // et les volumes ne viennent qu'ensuite, parce qu'ils EXPLIQUENT le
    // montant. L'export vit desormais sur l'ecran Historique, ou l'on
    // choisit deja une periode.
    rapports: () => <RelayReportsMobile onError={showOperationError} />,
    // Le menu annonce « Mon equipe » : l'ecran porte donc l'equipe, pas un
    // reseau de partenaires. L'onglet garde sa cle `reseau` pour ne pas
    // casser les liens existants.
    reseau: () => (
      <RelayTeam onError={showOperationError} onOpenHistory={() => setTab("historique")} />
    ),
    fermeture: () => <RelayClosureMobile onError={showOperationError} relay={relayIdentity} />,
    // Le menu annonce « Activation et partenariat ». L'ecran montre donc ou
    // en est l'ouverture, etape par etape, chacune lue d'un etat reel.
    inscription: () =>
      // Deux entrees du menu mènent ici : « Activation et partenariat »
      // regarde SON relais, « Devenir point relais » est la candidature d'un
      // commercant qui n'en a pas encore. Le focus les separe.
      stateFocus === "candidature" ? (
        <RelayApply onOpenTraining={() => setTab("formation")} />
      ) : (
      <RelayActivation
        relay={{
          name: relayProfile.name,
          city: relayAccount?.city || "",
          address: relayAccount?.address || "",
          openedAt: relayAccount?.created_at || "",
          capacity: relayAccount?.storage_capacity || 0,
          hours: relayAccount?.opening_hours || "",
        }}
        documents={complianceDocuments}
        payoutVerified={payoutVerified}
      />
    ),
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
          phone: relayAccount?.phone || "",
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
        onSaveIdentity={saveRelayIdentity}
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
    etats: () =>
      // « Statut du relais » est un ecran a part : il dit POURQUOI le relais
      // n'est pas ouvert, et ce qu'il reste a faire. Les autres entrees du
      // groupe (erreur, hors connexion, camera) restent sur `RelayStates`.
      stateFocus === "connexion" ? (
        // L'ecran de connexion occupe tout l'ecran : on y entre un PIN, et
        // rien d'autre ne doit attirer le pouce a ce moment-la.
        <div className="fixed inset-0 z-[90] overflow-y-auto">
          {/* `RelayPinLogin` sert aussi d'ecran d'entree hors du portail :
              on ne le fige pas lui-meme, on l'enveloppe ici, et on lui
              ajoute la sortie qui lui manque — sans elle, la demonstration
              serait sans retour. */}
          <button
            type="button"
            onClick={goBack}
            aria-label="Revenir"
            className="safe-pt-header absolute left-2 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full text-slate-900 transition active:scale-90 dark:text-white"
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <RelayPinLogin onAuthenticated={() => setTab("dashboard")} />
        </div>
      ) : stateFocus === "invitation" ? (
        <RelayInvitation
          relais={`${relayProfile.name} · ${relayProfile.city}`}
          inviteur={relayProfile.manager}
          onDone={() => setTab("dashboard")}
          onClose={goBack}
        />
      ) : stateFocus === "neuf" ? (
        // Le meme accueil, compteurs a zero : c'est ce que voit un gerant le
        // matin de son ouverture.
        renderDashboard(true)
      ) : stateFocus === "install" ? (
        <RelayInstall />
      ) : stateFocus === "camera" ? (
        // L'ecran camera occupe tout l'ecran : il se ferme en revenant a
        // l'accueil, comme n'importe quelle prise de vue du comptoir.
        <RelayCamera
          onClose={() => setTab("dashboard")}
          onManual={() => setTab("retrait")}
          onDecoded={() => setTab("retrait")}
        />
      ) : stateFocus === "erreur" ? (
        <RelayErrorStates onNavigate={setTab} />
      ) : stateFocus === "offline" ? (
        <RelayOffline />
      ) : stateFocus === "statut" ? (
        <RelayStatus
          status={relayAccount?.status || ""}
          documents={complianceDocuments}
          payoutVerified={payoutVerified}
          capacity={relayAccount?.storage_capacity || 0}
          hours={relayAccount?.opening_hours || ""}
          onNavigate={setTab}
        />
      ) : (
      <RelayStates
        focus={stateFocus}
        readiness={readiness}
        status={relayProfile.status}
        lastError={operationMessage?.tone === "error" ? operationMessage.text : null}
        onNavigate={setTab}
        onOpenScreen={setStateFocus}
      />
    ),
  }[tab];

  // Gris clair tres legerement chaud : les cartes blanches s'en detachent
  // sans que le fond ne tire vers l'orange de la marque, qui doit rester
  // reserve a ce qui presse.
  // `bg-fixed` cale le degrade sur la fenetre, pas sur la hauteur de page :
  // sans lui, un ecran long l'etire et un ecran court le coupe.
  return (
    <main className="belivay-portal relay-shell min-h-screen font-sans">
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
          <header className="safe-pt-header pr-glass sticky top-0 z-30 px-4 pb-3.5 sm:px-6 sm:pb-4 md:px-3 lg:px-6">
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
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0E1B38] text-[12px] font-black tracking-wide text-white ring-2 ring-blue-500 transition active:scale-90 dark:bg-slate-800"
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
              <p className="flex items-center gap-2 text-[12px] font-black uppercase leading-none tracking-[0.055em] text-[#2456D6] dark:text-blue-300">
                <span aria-hidden className="h-[9px] w-[9px] flex-shrink-0 rounded-[2px] bg-[#2456D6] dark:bg-blue-400" />
                <span className="truncate">
                  {ui.brand} · {relayProfile.name}{relayProfile.city ? `, ${relayProfile.city}` : ""}
                </span>
              </p>
              {tab === "dashboard" ? null : (
                <h1 className="truncate text-[17px] font-black leading-tight tracking-[-0.02em]">{activeLabel}</h1>
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
                className={`inline-flex h-[26px] flex-shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full border px-2.5 text-[12px] font-bold ${
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
              <span className="inline-flex h-[26px] flex-shrink-0 items-center whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-2.5 text-[12px] font-bold text-orange-600 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200">
                {relayProfile.capacityUsed} / {relayProfile.capacityMax} places
              </span>
              <span className="inline-flex h-[26px] flex-shrink-0 items-center whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2.5 text-[12px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                Trust {relayProfile.trust}
              </span>
            </div>

          </header>

          {/* `pb-tabbar` : le dernier bloc de chaque ecran reste atteignable
              au-dessus de la barre d'onglets fixe et de la barre gestuelle. */}
          <div className="pb-tabbar pb-tabbar-tall p-4 sm:p-6 md:px-7 lg:px-6 lg:pb-6">
            {/* Les demandes de preuve ouvrent les ecrans METIER, pas les
                ecrans de reglage : voir `ECRANS_SANS_BOITE_PREUVES`. */}
            {ECRANS_SANS_BOITE_PREUVES.includes(tab) ? null : <EvidenceRequestInbox accent="#2456D6" />}
            {operationMessage ? (
              <div className={`mb-5 flex items-start justify-between gap-3 rounded-[14px] border p-4 text-sm font-bold ${operationMessage.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <span>{operationMessage.text}</span>
                <button type="button" onClick={() => setOperationMessage(null)} className="rounded-lg p-1 hover:bg-black/5" title={t("rl1_point_page.close")}><X size={16} /></button>
              </div>
            ) : null}
            <div className="mb-5 hidden rounded-[14px] border border-blue-100 bg-blue-50 p-4 lg:block">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 flex-shrink-0 text-blue-700" size={20} />
                <p className="text-sm leading-6 text-blue-950/75">
                  {t("rl1_point_page.interface_compliance_notice")}
                </p>
              </div>
            </div>
            {/* La mise en page de la tablette se decide ici, une fois, parce
                que c'est ici qu'on sait quel ecran est affiche. Les regles
                sont dans `relayTheme.css`. */}
            <div className="pr-flow">{content()}</div>
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
          origineMenu.current = next;
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
          accent="#2456D6"
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
