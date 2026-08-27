import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  Building2,
  CreditCard,
  Gift,
  Heart,
  Home,
  MapPin,
  Medal,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Moon,
  Star,
  Store,
  Sun,
  Trash2,
  Trophy,
  User,
  Wallet,
  X,
  Bell,
  Mail,
  Truck,
  Check,
  ArrowRight,
  LogOut,
  Calendar,
  ShoppingCart,
  Sparkles,
  HelpCircle,
  ArrowDownToLine,
  Clock,
  Gem,
  RefreshCw,
  RotateCcw,
  Settings,
} from "lucide-react";
import { authApi, type User as UserType } from "@/services/api/auth";
import { api } from "@/services/api/client";
import { vendorsApi, type VendorProfile } from "@/services/api/vendors";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { getStoredProfileAvatar, getUserDisplayName, getUserInitials } from "@/lib/profileAvatar";
import {
  addDisputeMessage,
  getStoredOrderDisputes,
  type StoredOrderDispute,
} from "@/lib/orderDisputes";
import TwoFactorCard from './TwoFactorCard';
import PasswordCard from './PasswordCard';
import { SavedPaymentMethods } from "@/features/payments/SavedPaymentMethods";
import { PaymentsHistoryPanel } from "@/features/payments/PaymentsHistoryPanel";
import { PfShellStyles } from "@/styles/pfShell";
import { ordersApi } from "@/services/api/orders";
import type { Order } from "@/types/order";
import { useAuth } from "@/context/AuthContext";
import { getFavoriteProductIds } from "@/lib/favorites";
import { useCart } from "@/context/CartContext";
import PhoneInput from './PhoneInput';
import { useTranslation } from "react-i18next";
import SessionsCard from './SessionsCard';
import AvatarCropDialog from '@/components/profile/AvatarCropDialog';
import {
  addSupportMessage,
  formatSupportTime,
  getSupportConversations,
  markSupportConversationRead,
  SUPPORT_UPDATED_EVENT,
  type SupportConversation as StoredSupportConversation,
} from "@/lib/supportInbox";
import {
  ACCOUNT_UPDATED_EVENT,
  BELIVAY_PLANS,
  BELIVAY_RECEIVERS,
  MIN_DEPOSIT_XAF,
  PROVIDER_LABELS,
  createBelivayDeposit,
  formatXaf,
  getBelivayAccount,
  payBelivaySubscription,
  refreshBelivayAccount,
  type BelivayAccount,
  type BelivayProvider,
} from "@/lib/belivayAccount";
import { detectOperator, formatNational, isValidNationalNumber, toNationalNumber } from "@/lib/phone";

type FontSize = "small" | "normal" | "large";
type PanelId =
  | "dashboard"
  | "profil"
  | "adresses"
  | "paiements"
  | "historique-paiements"
  | "fidelite"
  | "parrain"
  | "messages"
  | "vendeur"
  | "securite"
  | "compte-belivay"
  | "reglages";

const PANEL_IDS: PanelId[] = [
  "dashboard",
  "profil",
  "adresses",
  "paiements",
  "historique-paiements",
  "fidelite",
  "parrain",
  "messages",
  "vendeur",
  "securite",
  "compte-belivay",
  "reglages",
];
type MessageTab = "all" | "support" | "litige";

type AddressItem = {
  id: string;
  label: string;
  type: "home" | "office";
  person: string;
  phone: string;
  line: string;
  default: boolean;
};

type ConversationMessage = {
  id: string;
  author: string;
  text: string;
  time: string;
};

type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  type: "support" | "litige";
  messages: ConversationMessage[];
};

type RewardAccount = {
  id: number;
  role: "CLIENT" | "VENDOR" | "COURIER" | "RELAY";
  role_display: string;
  points_balance: number;
  lifetime_points: number;
  trust_score: number;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  tier_display: string;
  show_monetary_value: boolean;
  transactions: Array<{
    id: number;
    delta: number;
    source: string;
    reason: string;
    reference: string;
    created_at: string;
  }>;
};

/** Fils du support, format partagé (lib/supportInbox) → format d'affichage. */
function toConversations(stored: StoredSupportConversation[]): Conversation[] {
  return stored.map((conversation) => ({
    id: conversation.id,
    name: conversation.name,
    preview: conversation.preview,
    time: formatSupportTime(conversation.updatedAt),
    unread: conversation.unread,
    type: "support",
    messages: conversation.messages.map((message) => ({
      id: message.id,
      author: message.author,
      text: message.text,
      time: formatSupportTime(message.createdAt),
    })),
  }));
}

const fontSizeClassMap: Record<FontSize, string> = {
  small: "text-[14px]",
  normal: "text-[15px]",
  large: "text-[16px]",
};

function ActionButton({
  children,
  onClick,
  variant = "ghost",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "outline" | "primary";
}) {
  const classes =
    variant === "primary"
      ? "bg-[#f47920] text-white shadow-[0_8px_24px_rgba(244,121,32,.26)] hover:bg-[#c85e14]"
      : variant === "outline"
        ? "border border-[#f47920] text-[#c85e14] hover:bg-[#fff4eb] dark:hover:bg-primary/10"
        : "border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f9fafb] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-[10px] px-4 py-2 text-[12.5px] font-bold transition ${classes}`}
    >
      {children}
    </button>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { itemCount, total } = useCart();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [pfForm, setPfForm] = useState({ first_name: "", last_name: "", email: "", phone: "", bio: "" });
  const [pfNewsletter, setPfNewsletter] = useState(true);
  const [pfSms, setPfSms] = useState(true);
  const [pfSaving, setPfSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId>("dashboard");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [daltonianMode, setDaltonianMode] = useState(false);
  const [messageTab, setMessageTab] = useState<MessageTab>("all");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [supportConversations, setSupportConversations] = useState<Conversation[]>(() =>
    toConversations(getSupportConversations()),
  );
  const [account, setAccount] = useState<BelivayAccount>(() => getBelivayAccount());
  const [depositProvider, setDepositProvider] = useState<BelivayProvider>("ORANGE_MONEY");
  const [depositPhone, setDepositPhone] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [disputes, setDisputes] = useState<StoredOrderDispute[]>(() => getStoredOrderDisputes());
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [rewardAccounts, setRewardAccounts] = useState<RewardAccount[]>([]);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [draftAddressId, setDraftAddressId] = useState<string | null>(null);
  const [sellerForm, setSellerForm] = useState({
    shopName: "",
    category: "Mode & accessoires",
    city: "Yaoundé",
    phone: "",
    address: "",
    idDocument: "",
    motivation: "",
  });
  const [addresses, setAddresses] = useState<AddressItem[]>([
    {
      id: "home",
      label: "Domicile",
      type: "home",
      person: "",
      phone: "",
      line: "Bastos, face pharmacie du Coin · Yaoundé",
      default: true,
    },
    {
      id: "office",
      label: "Bureau",
      type: "office",
      person: "",
      phone: "",
      line: "Immeuble Mbanga, Centre Commercial · Douala",
      default: false,
    },
  ]);

  useEffect(() => {
    authApi
      .getProfile()
      .then((profile) => {
        setUser(profile);
        vendorsApi.getProfile().then(setVendorProfile).catch(() => setVendorProfile(null));
        api.get<RewardAccount[]>("/auth/rewards/").then(setRewardAccounts).catch(() => setRewardAccounts([]));
      })
      .catch(() => showToast("Erreur chargement profil", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    const isActive = (order: Order) =>
      ![
        "DELIVERED",
        "BUYER_CONFIRMED",
        "AUTO_CONFIRMED",
        "RELEASED_TO_VENDOR",
        "CANCELLED",
        "REFUNDED",
      ].includes(order.fulfillment_status);
    ordersApi
      .getMyOrders()
      .then((orders) => {
        setActiveOrder(orders.find(isActive) ?? null);
        setRecentOrders(orders.slice(0, 3));
        setOrderCount(orders.length);
        setActiveCount(orders.filter(isActive).length);
      })
      .catch(() => {
        setActiveOrder(null);
        setRecentOrders([]);
      });
  }, []);

  useEffect(() => {
    const sync = () => setFavoritesCount(getFavoriteProductIds().length);
    sync();
    window.addEventListener("belivay-favorites-updated", sync);
    return () => window.removeEventListener("belivay-favorites-updated", sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    setPfForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      phone: user.phone || "",
      bio: user.bio || "",
    });
    setPfNewsletter(user.newsletter_subscribed ?? true);
    setPfSms(user.sms_notifications ?? true);
  }, [user]);

  useEffect(() => {
    const requested = searchParams.get("panel") as PanelId | null;
    const panel = requested && PANEL_IDS.includes(requested) ? requested : "dashboard";
    const tab = (searchParams.get("tab") as MessageTab) || "all";
    setActivePanel(panel);
    setMessageTab(tab === "support" || tab === "litige" || tab === "all" ? tab : "all");
  }, [searchParams]);

  useEffect(() => {
    const syncDisputes = () => setDisputes(getStoredOrderDisputes());
    window.addEventListener("belivay-disputes-updated", syncDisputes);
    return () => window.removeEventListener("belivay-disputes-updated", syncDisputes);
  }, []);

  useEffect(() => {
    const syncSupport = () => setSupportConversations(toConversations(getSupportConversations()));
    window.addEventListener(SUPPORT_UPDATED_EVENT, syncSupport);
    window.addEventListener("storage", syncSupport);
    return () => {
      window.removeEventListener(SUPPORT_UPDATED_EVENT, syncSupport);
      window.removeEventListener("storage", syncSupport);
    };
  }, []);

  useEffect(() => {
    const syncAccount = () => setAccount(getBelivayAccount());
    window.addEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
    window.addEventListener("storage", syncAccount);
    return () => {
      window.removeEventListener(ACCOUNT_UPDATED_EVENT, syncAccount);
      window.removeEventListener("storage", syncAccount);
    };
  }, []);

  /* Ouvrir un fil le marque comme lu — la pastille du header suit aussitôt. */
  useEffect(() => {
    if (activePanel !== "messages" || !selectedConversationId) return;
    markSupportConversationRead(selectedConversationId);
  }, [activePanel, selectedConversationId]);

  const displayName = useMemo(() => getUserDisplayName(user), [user]);
  const userInitials = useMemo(() => getUserInitials(user), [user]);
  const avatar = user?.avatar_url || getStoredProfileAvatar();
  const isVendor = Boolean(user?.is_vendor || vendorProfile);
  const normalizedAddresses = addresses.map((address) => ({
    ...address,
    person: address.person || displayName,
    phone: address.phone,
  }));
  const disputeConversations = useMemo<Conversation[]>(
    () =>
      disputes.map((dispute) => ({
        id: dispute.id,
        name: `Litige ${dispute.orderLabel}`,
        preview: dispute.messages[dispute.messages.length - 1]?.text ?? dispute.reason,
        time: new Date(dispute.updatedAt).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        unread: 0,
        type: "litige",
        messages: dispute.messages.map((message) => ({
          id: message.id,
          author: message.author,
          text: message.text,
          time: new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      })),
    [disputes],
  );
  const conversations = useMemo(
    () => [...disputeConversations, ...supportConversations],
    [disputeConversations, supportConversations],
  );
  const filteredConversations = conversations.filter((conversation) => {
    if (messageTab === "all") return true;
    return conversation.type === messageTab;
  });
  const selectedConversation =
    filteredConversations.find((conversation) => conversation.id === selectedConversationId) ??
    filteredConversations[0] ??
    null;
  const clientReward = rewardAccounts.find((account) => account.role === "CLIENT") ?? null;
  const fidelityPoints = clientReward?.points_balance ?? user?.loyalty_points ?? 0;
  const fidelityTier = clientReward?.tier_display ?? user?.loyalty_tier ?? "Bronze";
  const fidelityTrust = clientReward?.trust_score ?? 70;

  const greetingName = user?.first_name?.trim() || displayName.split(" ")[0] || "vous";
  const unreadMessages = conversations.reduce((sum, conversation) => sum + (conversation.unread || 0), 0);
  const joinedDate = user?.date_joined;
  const memberSince = joinedDate
    ? new Date(joinedDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;
  const defaultCity =
    normalizedAddresses.find((address) => address.default)?.line.split("·").pop()?.trim() ||
    normalizedAddresses[0]?.line.split("·").pop()?.trim() ||
    "Cameroun";
  const TIER_LADDER = [
    { name: "Bronze", threshold: 0 },
    { name: "Argent", threshold: 500 },
    { name: "Or", threshold: 1500 },
    { name: "Platinum", threshold: 3000 },
  ];
  const TIER_THRESHOLDS = TIER_LADDER.map((tier) => tier.threshold);
  const nextTier = TIER_LADDER.find((tier) => tier.threshold > fidelityPoints) ?? null;
  const nextTierLabel = nextTier ? nextTier.name : "Niveau max";
  const nextTierThreshold = nextTier ? nextTier.threshold : 3000;
  const prevTierThreshold = [...TIER_THRESHOLDS].reverse().find((threshold) => threshold <= fidelityPoints) ?? 0;
  const tierProgress =
    nextTierThreshold > prevTierThreshold
      ? Math.min(100, ((fidelityPoints - prevTierThreshold) / (nextTierThreshold - prevTierThreshold)) * 100)
      : 100;
  const pointsToNextTier = Math.max(0, nextTierThreshold - fidelityPoints);

  const defaultAddress = normalizedAddresses.find((address) => address.default) || normalizedAddresses[0] || null;
  const profileChecks = [
    Boolean(user?.first_name?.trim()),
    Boolean(user?.last_name?.trim()),
    Boolean(user?.email?.trim()),
    Boolean(user?.phone),
    Boolean(avatar),
    normalizedAddresses.length > 0,
  ];
  const profileComplete = Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100);
  const profileMissing = [
    !user?.last_name?.trim() ? "nom" : null,
    !user?.phone ? "téléphone" : null,
    !avatar ? "photo" : null,
    normalizedAddresses.length === 0 ? "adresse" : null,
  ].filter(Boolean) as string[];

  const handleSaveProfile = async () => {
    setPfSaving(true);
    try {
      const updated = await authApi.updateProfile({
        first_name: pfForm.first_name,
        last_name: pfForm.last_name,
        email: pfForm.email,
        phone: pfForm.phone || null,
        bio: pfForm.bio || null,
        newsletter_subscribed: pfNewsletter,
        sms_notifications: pfSms,
      });
      setUser(updated);
      showToast("Profil mis à jour !", "success");
    } catch {
      showToast("Erreur lors de la mise à jour.", "error");
    } finally {
      setPfSaving(false);
    }
  };

  const handleAvatarRemove = async () => {
    try {
      const updated = await authApi.removeAvatar();
      setUser(updated);
      showToast("Photo supprimée.", "success");
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((current) => current.map((address) => ({ ...address, default: address.id === id })));
    showToast("Adresse par défaut mise à jour.", "success");
  };

  const setAddressType = (id: string, type: "home" | "office") => {
    setAddresses((current) => current.map((address) => (address.id === id ? { ...address, type } : address)));
  };

  const saveAddressEdit = (id: string) => {
    const target = addresses.find((address) => address.id === id);
    if (!target || !target.line.trim()) {
      showToast("Renseignez l'adresse complète.", "error");
      return;
    }
    setDraftAddressId(null);
    setEditingAddressId(null);
    showToast("Adresse enregistrée.", "success");
  };

  const cancelAddressEdit = (id: string) => {
    if (draftAddressId === id) {
      setAddresses((current) => current.filter((address) => address.id !== id));
      setDraftAddressId(null);
    }
    setEditingAddressId(null);
  };

  useEffect(() => {
    if (!filteredConversations.length) {
      setSelectedConversationId("");
      return;
    }

    if (!filteredConversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConversationId]);

  const openPanel = (panel: PanelId, tab?: MessageTab) => {
    setActivePanel(panel);
    const params = new URLSearchParams(searchParams);
    params.set("panel", panel);
    if (tab) {
      params.set("tab", tab);
      setMessageTab(tab);
    } else {
      params.delete("tab");
    }
    setSearchParams(params);
  };

  const handleAddressUpdate = (id: string, field: "label" | "phone" | "line" | "person", value: string) => {
    setAddresses((current) =>
      current.map((address) =>
        address.id === id
          ? {
              ...address,
              [field]: value,
            }
          : address,
      ),
    );
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((current) => current.filter((address) => address.id !== id));
    if (editingAddressId === id) {
      setEditingAddressId(null);
    }
    showToast("Adresse supprimée", "success");
  };

  const handleSendChatMessage = () => {
    if (!selectedConversation || !chatDraft.trim()) return;

    if (selectedConversation.type === "litige") {
      addDisputeMessage(selectedConversation.id, chatDraft.trim());
      setDisputes(getStoredOrderDisputes());
    } else {
      addSupportMessage(selectedConversation.id, chatDraft.trim());
    }

    setChatDraft("");
  };

  const handleRefreshAccount = () => {
    setAccount(refreshBelivayAccount());
    showToast("Compte BelivaY actualisé.", "success");
  };

  const handleDeposit = () => {
    const national = toNationalNumber(depositPhone);
    if (!isValidNationalNumber(national)) {
      showToast("Numéro Mobile Money invalide.", "error");
      return;
    }

    /* Le numéro doit appartenir à l'opérateur choisi, sinon le transfert
       n'arrivera jamais sur le compte BelivaY sélectionné. */
    const operator = detectOperator(national)?.name;
    const expected = depositProvider === "ORANGE_MONEY" ? "Orange" : "MTN";
    if (operator && operator !== expected) {
      showToast(`Ce numéro est ${operator}, pas ${expected}.`, "error");
      return;
    }

    const amount = Number(depositAmount.replace(/\s/g, ""));
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_XAF) {
      showToast(`Le dépôt minimum est de ${formatXaf(MIN_DEPOSIT_XAF)}.`, "error");
      return;
    }

    try {
      const deposit = createBelivayDeposit({
        provider: depositProvider,
        senderPhone: national,
        amountXaf: amount,
      });
      setAccount(getBelivayAccount());
      setDepositAmount("");
      showToast(`Dépôt enregistré · réf. ${deposit.reference}`, {
        description: "Crédité sur votre solde sous 24–72h après validation de l'opérateur.",
        type: "success",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Dépôt impossible.", "error");
    }
  };

  const handleResetDeposit = () => {
    setDepositPhone("");
    setDepositAmount("");
    setDepositProvider("ORANGE_MONEY");
  };

  const handlePayPlan = (planId: "ESSENTIEL" | "PREMIUM") => {
    try {
      const charge = payBelivaySubscription(planId);
      setAccount(getBelivayAccount());
      showToast("Abonnement réglé depuis votre Compte BelivaY.", {
        description: `Valable jusqu'au ${new Date(charge.periodEnd).toLocaleDateString("fr-FR")}.`,
        type: "success",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Paiement impossible.", "error");
    }
  };

  const handleSellerField = (
    field: "shopName" | "category" | "city" | "phone" | "address" | "idDocument" | "motivation",
    value: string,
  ) => {
    setSellerForm((current) => ({ ...current, [field]: value }));
  };

  const handleSellerApplication = async () => {
    if (sellerSubmitting || isVendor) return;

    try {
      setSellerSubmitting(true);
      const vendor = await vendorsApi.apply({
        business_name: sellerForm.shopName,
        business_description: sellerForm.motivation || `Categorie principale : ${sellerForm.category}`,
        phone: sellerForm.phone,
        address: sellerForm.address,
        city: sellerForm.city,
        id_document: sellerForm.idDocument,
      });
      const profile = await authApi.getProfile().catch(() => user);
      setVendorProfile(vendor);
      if (profile) setUser({ ...profile, is_vendor: true });
      window.dispatchEvent(new Event("belivay-vendor-updated"));
      showToast("Votre compte vendeur est activé.", "success");
      openPanel("dashboard");
    } catch {
      showToast("Impossible d'enregistrer la demande vendeur.", "error");
    } finally {
      setSellerSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] px-4 py-8 dark:bg-gray-950">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="skeleton h-[900px] rounded-[20px]" />
            <div className="skeleton h-[900px] rounded-[20px]" />
          </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    const status = activeOrder?.fulfillment_status ?? "";
    const activeStep = !activeOrder
      ? 0
      : ["DELIVERED", "BUYER_CONFIRMED", "AUTO_CONFIRMED", "RELEASED_TO_VENDOR"].includes(status)
        ? 3
        : ["OUT_FOR_DELIVERY", "SHIPPED", "PICKED_UP", "DRIVER_ASSIGNED"].includes(status)
          ? 2
          : ["READY_FOR_PICKUP"].includes(status)
            ? 1
            : 1;
    const trackerSteps = ["Confirmée", "Préparée", "En route", "Livrée"];
    const stat = (
      Icon: React.ComponentType<{ size?: number }>,
      value: React.ReactNode,
      label: string,
      tone: string,
    ) => (
      <div className="pf-stat pf-anim">
        <div className={`pf-stat-ic ${tone}`}><Icon size={18} /></div>
        <div className="pf-stat-body">
          <div className="pf-stat-n">{value}</div>
          <div className="pf-stat-l">{label}</div>
        </div>
      </div>
    );
    return (
      <div className="pf-stack">
        <div className="pf-anim">
          <div className="pf-hello">Bonjour, {greetingName}</div>
          <div className="pf-hello-sub">Voici l'essentiel de votre compte aujourd'hui.</div>
        </div>

        {activeOrder ? (
          <div className="pf-card pf-anim">
            <div className="pf-tk-head">
              <div>
                <div className="pf-k">Commande #{activeOrder.id} · en cours</div>
                <div className="pf-t">Suivez votre livraison</div>
              </div>
              <button type="button" className="pf-btn-accent" onClick={() => navigate(`/orders/${activeOrder.id}`)}>
                <Truck size={14} />Suivre
              </button>
            </div>
            <div className="pf-steps">
              <div className="pf-track" />
              <div className="pf-fill" style={{ width: `${(activeStep / 3) * 75}%` }} />
              <div className="pf-steps-row">
                {trackerSteps.map((label, index) => {
                  const done = index < activeStep;
                  const current = index === activeStep;
                  return (
                    <div key={label} className="pf-st">
                      <span className={`pf-d ${done ? "done" : current ? "cur" : "todo"}`}>
                        {done ? <Check size={11} /> : current ? <Truck size={11} /> : null}
                      </span>
                      <div className={`pf-lbl ${current ? "cur" : ""}`}>{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="pf-card pf-anim pf-row-between">
            <div>
              <div className="pf-t">Aucune commande en cours</div>
              <div className="pf-sub">Parcourez le catalogue pour votre prochain achat.</div>
            </div>
            <button type="button" className="pf-btn-accent" onClick={() => navigate("/catalog")}>
              <Package size={14} />Explorer
            </button>
          </div>
        )}

        <div className="pf-stats">
          {stat(Package, orderCount, "Commandes", "o")}
          {stat(Truck, activeCount, "En cours", "b")}
          {stat(Heart, favoritesCount, "Favoris", "p")}
          {stat(Award, fidelityPoints.toLocaleString("fr-FR"), "Points", "a")}
        </div>

        <div className="pf-twoup">
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">Programme fidélité</span>
              <span className="pf-muted-sm">
                {fidelityTier} → <span style={{ color: "var(--pf-accent)", fontWeight: 600 }}>Argent</span>
              </span>
            </div>
            <div className="pf-bar"><i style={{ width: `${tierProgress}%` }} /></div>
            <div className="pf-muted-sm pf-mt">
              {fidelityPoints.toLocaleString("fr-FR")} / {nextTierThreshold.toLocaleString("fr-FR")} pts
              {pointsToNextTier > 0 ? ` — encore ${pointsToNextTier.toLocaleString("fr-FR")} pts` : " — niveau max"}
            </div>
          </div>
          <button type="button" className="pf-card pf-anim pf-notif" onClick={() => openPanel("messages", "support")}>
            <span className="pf-notif-ic">
              <Bell size={20} />
              {unreadMessages > 0 && <span className="pf-notif-b">{unreadMessages}</span>}
            </span>
            <span>
              <span className="pf-notif-t">Notifications</span>
              <span className="pf-muted-sm">
                {unreadMessages > 0 ? `${unreadMessages} non lue${unreadMessages > 1 ? "s" : ""}` : "À jour"}
              </span>
            </span>
          </button>
        </div>

        {recentOrders.length > 0 && (
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">Commandes récentes</span>
              <button type="button" className="pf-link" onClick={() => navigate("/orders")}>Tout voir</button>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="pf-order-line">
                <div className="pf-order-ic"><Package size={16} /></div>
                <div className="pf-order-mid">
                  <div className="pf-order-id">Commande #{order.id}</div>
                  <div className="pf-muted-sm">
                    {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div className="pf-order-total">{order.total_xaf.toLocaleString("fr-FR")} FCFA</div>
              </div>
            ))}
          </div>
        )}

        <div className="pf-card pf-anim pf-supportrow">
          <button type="button" className="pf-support-item" onClick={() => openPanel("messages", "support")}>
            <span className="pf-support-ic accent"><MessageSquare size={18} /></span>
            <span className="pf-support-txt">
              <span className="pf-support-t">Contacter le support</span>
              <span className="pf-muted-sm">L'équipe BelivaY répond vite</span>
            </span>
            <ArrowRight size={16} className="pf-muted" />
          </button>
          <button
            type="button"
            className="pf-support-item"
            onClick={() => (isVendor ? navigate("/seller/dashboard") : openPanel("vendeur"))}
          >
            <span className="pf-support-ic"><Store size={18} /></span>
            <span className="pf-support-txt">
              <span className="pf-support-t">{isVendor ? "Espace vendeur" : "Devenir vendeur"}</span>
              <span className="pf-muted-sm">
                {isVendor ? (vendorProfile?.business_name || "Votre boutique") : "Ouvrez votre boutique BelivaY"}
              </span>
            </span>
            <ArrowRight size={16} className="pf-muted" />
          </button>
        </div>

        <div className="pf-twoup pf-anim">
          {itemCount > 0 ? (
            <button type="button" className="pf-card pf-notif" onClick={() => navigate("/cart")}>
              <span className="pf-support-ic accent"><ShoppingCart size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="pf-notif-t">Votre panier</span>
                <span className="pf-muted-sm">{itemCount} article{itemCount > 1 ? "s" : ""} · {total.toLocaleString("fr-FR")} FCFA</span>
              </span>
              <span className="pf-pill">Commander</span>
            </button>
          ) : (
            <button type="button" className="pf-card pf-notif" onClick={() => navigate("/catalog")}>
              <span className="pf-support-ic"><ShoppingCart size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="pf-notif-t">Votre panier est vide</span>
                <span className="pf-muted-sm">Parcourez le catalogue</span>
              </span>
              <ArrowRight size={16} className="pf-muted" />
            </button>
          )}

          <div className="pf-card">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">Adresse de livraison</span>
              <button type="button" className="pf-link" onClick={() => openPanel("adresses")}>Gérer</button>
            </div>
            {defaultAddress ? (
              <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span className="pf-order-ic"><MapPin size={16} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="pf-order-id">{defaultAddress.label}{defaultAddress.default ? " · par défaut" : ""}</div>
                  <div className="pf-muted-sm">{defaultAddress.line}</div>
                </div>
              </div>
            ) : (
              <button type="button" className="pf-btn-accent" onClick={() => openPanel("adresses")}>
                <Plus size={14} />Ajouter une adresse
              </button>
            )}
          </div>
        </div>

        {profileComplete < 100 && (
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">Complétez votre profil</span>
              <span style={{ color: "var(--pf-accent)", fontWeight: 700, fontSize: 13 }}>{profileComplete}%</span>
            </div>
            <div className="pf-bar"><i style={{ width: `${profileComplete}%` }} /></div>
            <div className="pf-row-between" style={{ marginTop: 12, gap: 10 }}>
              <span className="pf-muted-sm">
                {profileMissing.length > 0 ? `À ajouter : ${profileMissing.join(", ")}` : "Profil complet"}
              </span>
              <button type="button" className="pf-btn-ghost" onClick={() => openPanel("profil")}>Compléter</button>
            </div>
          </div>
        )}

        <div className="pf-anim">
          <div className="pf-card-title pf-mb">Raccourcis</div>
          <div className="pf-quick">
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/promotions")}>
              <span className="pf-quick-ic o"><Sparkles size={18} /></span>
              Promotions
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/notifications")}>
              <span className="pf-quick-ic b"><Bell size={18} /></span>
              Notifications
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("parrain")}>
              <span className="pf-quick-ic p"><Gift size={18} /></span>
              Parrainage
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/help")}>
              <span className="pf-quick-ic a"><HelpCircle size={18} /></span>
              Centre d'aide
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("compte-belivay")}>
              <span className="pf-quick-ic o"><Wallet size={18} /></span>
              Compte BelivaY
              <span className="pf-muted-sm">{formatXaf(account.availableXaf)}</span>
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("reglages")}>
              <span className="pf-quick-ic b"><Settings size={18} /></span>
              Réglages
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProfil = () => (
    <div className="pf-profile-grid">
      <div className="pf-stack" style={{ gap: 16 }}>
        <section className="pf-glass-panel" style={{ textAlign: "center" }}>
          <div className="pf-avatar-lg" style={{ margin: "0 auto 14px" }}>
            {avatar ? <img src={avatar} alt={displayName} /> : userInitials || "U"}
          </div>
          <div className="pf-panel-title" style={{ fontSize: 17 }}>{displayName}</div>
          <div className="pf-muted-sm">@{user?.username}</div>
          <div className="pf-avatar-actions" style={{ justifyContent: "center", marginTop: 14 }}>
            <label className="pf-btn-accent" style={{ cursor: "pointer" }}>
              <Pencil size={13} />Photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setAvatarFile(file);
                  event.target.value = '';
                }}
              />
            </label>
            {avatar ? (
              <button type="button" className="pf-btn-ghost" onClick={handleAvatarRemove} aria-label="Retirer la photo">
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
          <div className="pf-summary">
            <div className="pf-summary-row"><span className="pf-muted-sm">Membre depuis</span><span className="pf-summary-v">{memberSince || "—"}</span></div>
            <div className="pf-summary-row"><span className="pf-muted-sm">Type de compte</span><span className="pf-summary-v">{isVendor ? "Vendeur" : "Client"}</span></div>
            <div className="pf-summary-row"><span className="pf-muted-sm">Fidélité</span><span className="pf-summary-v">{fidelityTier} · {fidelityPoints.toLocaleString("fr-FR")} pts</span></div>
          </div>
        </section>

        <section className="pf-glass-panel">
          <div className="pf-card-title pf-mb">Préférences</div>
          <div className="pf-toggle-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div><div className="pf-toggle-t">Langue</div><div className="pf-muted-sm">Interface de l'application</div></div>
            <div className="pf-lang">
              <button type="button" className={`pf-lang-btn${(i18n.language || "fr").startsWith("fr") ? " on" : ""}`} onClick={() => i18n.changeLanguage("fr")}>🇫🇷 FR</button>
              <button type="button" className={`pf-lang-btn${(i18n.language || "").startsWith("en") ? " on" : ""}`} onClick={() => i18n.changeLanguage("en")}>🇬🇧 EN</button>
            </div>
          </div>
          <div className="pf-toggle-row">
            <div><div className="pf-toggle-t">Newsletter</div><div className="pf-muted-sm">Offres par email</div></div>
            <button type="button" role="switch" aria-checked={pfNewsletter} aria-label="Newsletter" className={`pf-switch${pfNewsletter ? " on" : ""}`} onClick={() => setPfNewsletter((v) => !v)}><span /></button>
          </div>
          <div className="pf-toggle-row">
            <div><div className="pf-toggle-t">Notifications SMS</div><div className="pf-muted-sm">Suivi par SMS</div></div>
            <button type="button" role="switch" aria-checked={pfSms} aria-label="SMS" className={`pf-switch${pfSms ? " on" : ""}`} onClick={() => setPfSms((v) => !v)}><span /></button>
          </div>
          <button type="button" className="pf-btn-ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={() => openPanel("securite")}>
            <Shield size={14} />Sécurité & mot de passe
          </button>
        </section>
      </div>

      <section className="pf-glass-panel">
        <div className="pf-panel-head">
          <div>
            <div className="pf-panel-title">Informations personnelles</div>
            <div className="pf-panel-sub">Mettez à jour vos coordonnées</div>
          </div>
        </div>
        <div className="pf-form-grid">
          <div className="pf-field">
            <label className="pf-label">Prénom</label>
            <input className="pf-input" value={pfForm.first_name} onChange={(e) => setPfForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="pf-field">
            <label className="pf-label">Nom</label>
            <input className="pf-input" value={pfForm.last_name} onChange={(e) => setPfForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">Email</label>
            <input className="pf-input" type="email" value={pfForm.email} onChange={(e) => setPfForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">Téléphone</label>
            <PhoneInput value={pfForm.phone} onChange={(v) => setPfForm((f) => ({ ...f, phone: v }))} placeholder="6XX XXX XXX" />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">Biographie</label>
            <textarea className="pf-input pf-textarea" value={pfForm.bio} onChange={(e) => setPfForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Parlez-nous de vous…" />
          </div>
        </div>
        <div className="pf-form-actions">
          <button type="button" className="pf-btn-accent" onClick={handleSaveProfile} disabled={pfSaving}>
            <ShieldCheck size={14} />{pfSaving ? "Enregistrement…" : "Sauvegarder"}
          </button>
          <button
            type="button"
            className="pf-btn-ghost"
            onClick={() => {
              if (user) {
                setPfForm({
                  first_name: user.first_name || "",
                  last_name: user.last_name || "",
                  email: user.email || "",
                  phone: user.phone || "",
                  bio: user.bio || "",
                });
              }
            }}
          >
            Annuler
          </button>
        </div>
      </section>
    </div>
  );

  const renderAdresses = () => (
    <section className="pf-glass-panel">
      <div className="pf-panel-head">
        <div>
          <div className="pf-panel-title">Mes adresses</div>
          <div className="pf-panel-sub">Gérez vos lieux de livraison</div>
        </div>
        <button
          type="button"
          className="pf-btn-accent"
          onClick={() => {
            const nextId = `addr-${Date.now()}`;
            setAddresses((current) => [
              ...current,
              { id: nextId, label: "", type: "home", person: displayName, phone: "", line: "", default: current.length === 0 },
            ]);
            setEditingAddressId(nextId);
            setDraftAddressId(nextId);
          }}
        >
          <Plus size={14} />Ajouter
        </button>
      </div>

      {normalizedAddresses.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-ic"><MapPin size={22} /></span>
          <div className="pf-empty-t">Aucune adresse enregistrée</div>
          <div className="pf-muted-sm">Ajoutez une adresse pour accélérer vos commandes.</div>
        </div>
      ) : (
        <div className="pf-addr-grid">
          {normalizedAddresses.map((address) => {
            const isEditing = editingAddressId === address.id;
            const AddressIcon = address.type === "office" ? Building2 : Home;
            return (
              <div key={address.id} className={`pf-addr${address.default ? " def" : ""}`}>
                <div className="pf-addr-label">
                  <span className="pf-addr-ic"><AddressIcon size={14} /></span>
                  {address.label || (isEditing ? "Nouvelle adresse" : "Sans nom")}
                  {address.default ? <span className="pf-badge-soft">Par défaut</span> : null}
                </div>

                {isEditing ? (
                  <div className="pf-addr-edit">
                    <div className="pf-type-toggle">
                      <button type="button" className={`pf-type-btn${address.type === "home" ? " on" : ""}`} onClick={() => setAddressType(address.id, "home")}><Home size={13} />Maison</button>
                      <button type="button" className={`pf-type-btn${address.type === "office" ? " on" : ""}`} onClick={() => setAddressType(address.id, "office")}><Building2 size={13} />Bureau</button>
                    </div>
                    <input className="pf-input" value={address.label} onChange={(e) => handleAddressUpdate(address.id, "label", e.target.value)} placeholder="Libellé (Maison, Bureau…)" />
                    <input className="pf-input" value={address.person} onChange={(e) => handleAddressUpdate(address.id, "person", e.target.value)} placeholder="Destinataire" />
                    <PhoneInput value={address.phone} onChange={(v) => handleAddressUpdate(address.id, "phone", v)} placeholder="6XX XXX XXX" />
                    <textarea className="pf-input pf-textarea" value={address.line} onChange={(e) => handleAddressUpdate(address.id, "line", e.target.value)} placeholder="Adresse complète (quartier, ville, repère…)" />
                  </div>
                ) : (
                  <div className="pf-addr-line">
                    {address.person}{address.phone ? ` · ${address.phone}` : ""}<br />
                    {address.line || "Adresse à compléter"}
                  </div>
                )}

                <div className="pf-addr-actions">
                  {isEditing ? (
                    <>
                      <button type="button" className="pf-btn-accent" onClick={() => saveAddressEdit(address.id)}>Sauvegarder</button>
                      <button type="button" className="pf-btn-ghost" onClick={() => cancelAddressEdit(address.id)}><X size={13} />Fermer</button>
                    </>
                  ) : (
                    <>
                      {!address.default ? (
                        <button type="button" className="pf-btn-ghost" onClick={() => handleSetDefaultAddress(address.id)}>Par défaut</button>
                      ) : null}
                      <button type="button" className="pf-btn-ghost" onClick={() => setEditingAddressId(address.id)}><Pencil size={13} />Modifier</button>
                      <button type="button" className="pf-btn-danger" onClick={() => handleDeleteAddress(address.id)} aria-label="Supprimer"><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderPaiements = () => (
    <section className="pf-glass-panel">
      <SavedPaymentMethods />
    </section>
  );

  const renderHistoriquePaiements = () => (
    <section className="pf-glass-panel">
      <PaymentsHistoryPanel />
    </section>
  );

  const renderFidelite = () => {
    const tiers = [
      { icon: Medal, name: "Bronze", min: 0, range: "0 – 499 pts", perk: "Accès basique" },
      { icon: Award, name: "Argent", min: 500, range: "500 – 1 999 pts", perk: "Livraison -10%" },
      { icon: Trophy, name: "Or", min: 2000, range: "2 000 – 4 999 pts", perk: "Livraison gratuite" },
      { icon: Star, name: "Platinum", min: 5000, range: "5 000+ pts", perk: "Accès VIP total" },
    ];
    let currentIndex = 0;
    tiers.forEach((tier, index) => {
      if (fidelityPoints >= tier.min) currentIndex = index;
    });
    const nextTier = tiers[currentIndex + 1] || null;
    const ptsToNext = nextTier ? nextTier.min - fidelityPoints : 0;
    const tierPct = nextTier
      ? Math.min(100, Math.max(4, ((fidelityPoints - tiers[currentIndex].min) / (nextTier.min - tiers[currentIndex].min)) * 100))
      : 100;
    const history = clientReward?.transactions.length
      ? clientReward.transactions.map((entry) => ({
          label: entry.reason,
          date: new Date(entry.created_at).toLocaleDateString("fr-FR"),
          points: `${entry.delta > 0 ? "+" : ""}${entry.delta} pts`,
          positive: entry.delta >= 0,
        }))
      : [];
    return (
      <div className="pf-stack">
        <section className="pf-hero pf-anim">
          <span className="pf-hero-glow" />
          <div className="pf-hero-top"><Award size={15} />Solde BelivaY Points</div>
          <div className="pf-hero-pts">{fidelityPoints.toLocaleString("fr-FR")} <span>pts</span></div>
          <div className="pf-hero-sub">Niveau {fidelityTier} · Indice de confiance {fidelityTrust}/100</div>
          <div className="pf-hero-bar">
            <div className="pf-hero-bar-head">
              <span>{nextTier ? `Vers ${nextTier.name}` : "Niveau maximum atteint"}</span>
              <span>{nextTier ? `${ptsToNext.toLocaleString("fr-FR")} pts restants` : `${(clientReward?.lifetime_points ?? fidelityPoints).toLocaleString("fr-FR")} pts cumulés`}</span>
            </div>
            <div className="pf-hero-track"><div className="pf-hero-fill" style={{ width: `${tierPct}%` }} /></div>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">Niveaux de fidélité</div>
          <div className="pf-tier-grid">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <div key={tier.name} className={`pf-tier${index === currentIndex ? " on" : ""}`}>
                  <span className="pf-tier-ic"><Icon size={26} /></span>
                  <div className="pf-tier-name">{tier.name}</div>
                  <div className="pf-tier-range">{tier.range}</div>
                  <div className="pf-tier-perk">{tier.perk}</div>
                  {index === currentIndex ? <span className="pf-tier-badge">Niveau actuel</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} />Historique des points
          </div>
          {history.length === 0 ? (
            <div className="pf-muted-sm" style={{ padding: "8px 0" }}>
              Aucune transaction pour le moment. Passez commande pour cumuler des points.
            </div>
          ) : (
            history.map((entry, index) => (
              <div key={`${entry.label}-${index}`} className="pf-hist">
                <div>
                  <div className="pf-hist-label">{entry.label}</div>
                  <div className="pf-muted-sm">{entry.date}</div>
                </div>
                <div className={`pf-hist-pts${entry.positive ? " pos" : " neg"}`}>{entry.points}</div>
              </div>
            ))
          )}
        </section>
      </div>
    );
  };

  const renderParrain = () => {
    const refCode = (user?.username || "belivay").toUpperCase();
    const refLink = `https://belivay.com/register?ref=${user?.username || ""}`;
    const share = () => {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(refLink)
          .then(() => showToast("Lien de parrainage copié !", "success"))
          .catch(() => showToast("Copie impossible.", "error"));
      }
    };
    return (
      <div className="pf-stack">
        <section className="pf-hero pf-anim" style={{ background: "linear-gradient(120deg,#6d28d9,#a855f7 60%,#c084fc)", boxShadow: "0 16px 44px rgba(124,58,237,.4)" }}>
          <span className="pf-hero-glow" />
          <div className="pf-hero-top"><Gift size={15} />Parrainez, gagnez</div>
          <div style={{ position: "relative", zIndex: 1, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>Invitez vos proches sur BelivaY</div>
          <div className="pf-hero-sub">Vous et votre filleul gagnez des points de fidélité dès sa première commande.</div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div className="pf-ref-code">{refCode}</div>
            <button type="button" className="pf-btn-ghost" style={{ background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff" }} onClick={share}>
              <Send size={13} />Copier mon lien
            </button>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">Comment ça marche</div>
          {[
            "Partagez votre lien ou votre code unique",
            "Votre filleul s'inscrit via votre lien",
            "Il réalise sa première commande",
            "Vous recevez tous les deux des points de fidélité",
          ].map((step, index) => (
            <div key={step} className="pf-step">
              <span className="pf-step-n">{index + 1}</span>{step}
            </div>
          ))}
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">Mes parrainages</div>
          <div className="pf-muted-sm" style={{ padding: "8px 0" }}>
            Vos parrainages apparaîtront ici dès que vos filleuls s'inscriront via votre lien.
          </div>
        </section>
      </div>
    );
  };

  const renderMessages = () => (
    <section className="pf-glass-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e7eb] pb-3 dark:border-gray-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openPanel("messages", "all")}
            className={`rounded-[8px] px-4 py-2 text-[12px] font-bold ${messageTab === "all" ? "bg-[#fff4eb] text-[#c85e14] dark:bg-primary/10 dark:text-primary" : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"}`}
          >
            Tous ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => openPanel("messages", "support")}
            className={`rounded-[8px] px-4 py-2 text-[12px] font-bold ${messageTab === "support" ? "bg-[#fff4eb] text-[#c85e14] dark:bg-primary/10 dark:text-primary" : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"}`}
          >
            Support
          </button>
          <button
            type="button"
            onClick={() => openPanel("messages", "litige")}
            className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[12px] font-bold ${messageTab === "litige" ? "bg-[#fff4eb] text-[#c85e14] dark:bg-primary/10 dark:text-primary" : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"}`}
          >
            <Shield size={14} />
            Litiges
          </button>
        </div>
        <ActionButton variant="primary" onClick={() => navigate("/orders")}>
          <Package size={14} className="mr-1" />
          Aller aux commandes
        </ActionButton>
      </div>

      <div className="mb-4 rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] leading-[1.7] text-[#7c4b27] dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
                Un litige se fait dans le detail d'une commande. Cette page permet ensuite de consulter l'historique des litiges ouverts.
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3">
          {filteredConversations.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => setSelectedConversationId(conversation.id)}
              className={`w-full rounded-[12px] border p-4 text-left ${
                conversation.type === "litige"
                  ? "border-[#fecaca] bg-[rgba(239,68,68,.04)]"
                  : "border-[#e5e7eb] bg-[#fff] dark:border-gray-700 dark:bg-gray-800"
              } ${selectedConversation?.id === conversation.id ? "ring-2 ring-[#f47920]/25" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-extrabold text-[#111827] dark:text-white">{conversation.name}</div>
                  <div className="mt-1 text-[12px] leading-[1.7] text-[#6b7280] dark:text-gray-400">{conversation.preview}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-[#9ca3af] dark:text-gray-500">{conversation.time}</div>
                  {conversation.unread > 0 ? (
                    <span className="mt-2 inline-flex rounded-full bg-[#fff4eb] px-2 py-1 text-[10px] font-bold text-[#c85e14]">
                      {conversation.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#e5e7eb] bg-[#f9fafb] p-4 text-[13px] text-[#6b7280] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Aucun échange dans ce filtre pour le moment.
            </div>
          ) : null}
        </div>

        <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {selectedConversation ? (
            <>
              <div className="mb-4 border-b border-[#e5e7eb] pb-3 dark:border-gray-800">
                <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">{selectedConversation.name}</div>
                <div className="mt-1 text-[12px] text-[#6b7280] dark:text-gray-400">
                  {selectedConversation.type === "litige" ? "Chat de litige ouvert" : "Conversation avec le support"}
                </div>
              </div>
              <div className="space-y-3">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-[12px] px-3 py-2 text-[12.5px] leading-[1.65] ${
                      message.author === "Vous"
                        ? "ml-auto bg-[#fff4eb] text-[#111827] dark:bg-primary/10 dark:text-white"
                        : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-bold text-[#9ca3af] dark:text-gray-500">{message.author} · {message.time}</div>
                    {message.text}
                  </div>
                ))}
              </div>
              {selectedConversation.type === "litige" ? (
                <div className="mt-4 rounded-[10px] border border-dashed border-[#e5e7eb] bg-[#f9fafb] px-3 py-3 text-[12.5px] text-[#6b7280] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  Historique en lecture seule. Les reponses aux litiges se font depuis la page de commande.
                </div>
              ) : (
                <div className="mt-4 flex gap-2 border-t border-[#e5e7eb] pt-3 dark:border-gray-800">
                  <input
                    className="flex-1 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Envoyer un message au support..."
                  />
                  <ActionButton variant="primary" onClick={handleSendChatMessage}>
                    <Send size={14} className="mr-1" />
                    Envoyer
                  </ActionButton>
                </div>
              )}
            </>
          ) : (
            <div className="text-[13px] text-[#6b7280] dark:text-gray-400">Aucune conversation disponible.</div>
          )}
        </div>
      </div>
    </section>
  );

  const renderVendeur = () => (
    <section className="pf-glass-panel">
      {isVendor ? (
        <>
          <div className="pf-panel-head">
            <div>
              <div className="pf-panel-title">Vous êtes vendeur</div>
              <div className="pf-panel-sub">Votre boutique est active sur BelivaY</div>
            </div>
          </div>
          <div className="pf-vendor-active">
            <span className="pf-vendor-ic"><Store size={20} /></span>
            <div>
              <div className="pf-toggle-t">Vendeur actif{vendorProfile?.business_name ? ` · ${vendorProfile.business_name}` : ""}</div>
              <div className="pf-muted-sm">Gérez vos produits, commandes et revenus depuis l'espace vendeur.</div>
            </div>
          </div>
          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={() => navigate("/seller/dashboard")}><Store size={14} />Ouvrir l'espace vendeur</button>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("dashboard")}>Tableau de bord</button>
          </div>
        </>
      ) : (
        <>
          <div className="pf-panel-head">
            <div>
              <div className="pf-panel-title">Devenir vendeur</div>
              <div className="pf-panel-sub">Lancez votre boutique sur BelivaY</div>
            </div>
          </div>

          <div className="pf-benefits">
            {[
              { icon: Store, title: "Votre boutique", desc: "Vendez à tout le marché CEMAC" },
              { icon: Wallet, title: "Mobile Money", desc: "Encaissez via MTN & Orange" },
              { icon: Award, title: "Visibilité", desc: "Vos fiches mises en avant" },
            ].map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="pf-benefit">
                  <span className="pf-benefit-ic"><Icon size={17} /></span>
                  <div>
                    <div className="pf-benefit-t">{benefit.title}</div>
                    <div className="pf-muted-sm">{benefit.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pf-form-grid">
            <div className="pf-field"><label className="pf-label">Nom de boutique</label><input className="pf-input" value={sellerForm.shopName} onChange={(e) => handleSellerField("shopName", e.target.value)} placeholder="Ex: Maison Wax Premium" /></div>
            <div className="pf-field"><label className="pf-label">Catégorie principale</label><input className="pf-input" value={sellerForm.category} onChange={(e) => handleSellerField("category", e.target.value)} placeholder="Mode, Beauté, Tech…" /></div>
            <div className="pf-field"><label className="pf-label">Ville</label><input className="pf-input" value={sellerForm.city} onChange={(e) => handleSellerField("city", e.target.value)} /></div>
            <div className="pf-field"><label className="pf-label">Téléphone business</label><PhoneInput value={sellerForm.phone} onChange={(v) => handleSellerField("phone", v)} placeholder="6XX XXX XXX" /></div>
            <div className="pf-field pf-col2"><label className="pf-label">Adresse boutique</label><input className="pf-input" value={sellerForm.address} onChange={(e) => handleSellerField("address", e.target.value)} placeholder="Ex: Marché central, entrée principale" /></div>
            <div className="pf-field pf-col2"><label className="pf-label">Pièce d'identité (N° CNI / RCCM)</label><input className="pf-input" value={sellerForm.idDocument} onChange={(e) => handleSellerField("idDocument", e.target.value)} placeholder="Référence officielle" /></div>
            <div className="pf-field pf-col2"><label className="pf-label">Pourquoi devenir vendeur ?</label><textarea className="pf-input pf-textarea" value={sellerForm.motivation} onChange={(e) => handleSellerField("motivation", e.target.value)} placeholder="Présentez votre activité, vos produits et votre objectif sur BelivaY." /></div>
          </div>

          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={handleSellerApplication} disabled={sellerSubmitting}><Store size={14} />{sellerSubmitting ? "Enregistrement…" : "Envoyer la demande"}</button>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("dashboard")}>Retour</button>
          </div>
        </>
      )}
    </section>
  );

  const renderSecurite = () => (
    <section className="pf-glass-panel">
      <div className="pf-panel-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="pf-panel-title">Sécurité</div>
          <div className="pf-panel-sub">Protégez l'accès à votre compte</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
        <TwoFactorCard />
        <PasswordCard />
        <SessionsCard />
      </div>
    </section>
  );

  const renderCompteBelivay = () => {
    const parsedAmount = Number(depositAmount.replace(/\s/g, ""));
    const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
    const currentPlan = BELIVAY_PLANS.find((plan) => plan.id === account.plan);
    const nationalPhone = toNationalNumber(depositPhone);
    const phoneOperator = detectOperator(nationalPhone)?.name;

    return (
      <div className="pf-stack">
        <section className="pf-glass-panel pf-anim">
          <div className="pf-panel-head" style={{ marginBottom: 14 }}>
            <div>
              <div className="pf-panel-title" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Building2 size={19} style={{ color: "var(--pf-accent)" }} />
                Mon Compte BelivaY
              </div>
              <div className="pf-panel-sub">Solde · Dépôts · Payer mon abonnement</div>
            </div>
            <button type="button" className="pf-btn-ghost" onClick={handleRefreshAccount}>
              <RefreshCw size={13} />Actualiser
            </button>
          </div>

          <div className="pf-wal-grid">
            <div className="pf-wal o">
              <span className="pf-wal-ic"><Wallet size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.availableXaf)}</div>
              <div className="pf-wal-l">Solde disponible</div>
              <div className="pf-wal-s">Utilisable pour abonnement</div>
            </div>
            <div className="pf-wal g">
              <span className="pf-wal-ic"><CreditCard size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.totalDepositedXaf)}</div>
              <div className="pf-wal-l">Total déposé</div>
              <div className="pf-wal-s">
                {account.depositCount} dépôt{account.depositCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="pf-wal y">
              <span className="pf-wal-ic"><Clock size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.pendingXaf)}</div>
              <div className="pf-wal-l">En attente</div>
              <div className="pf-wal-s">Crédit sous 24–72h</div>
            </div>
          </div>

          <div className="pf-info-note">
            <span className="pf-info-ic"><Sparkles size={16} /></span>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--pf-text2)" }}>
              <strong style={{ color: "var(--pf-text)" }}>À quoi sert mon Compte BelivaY ?</strong>{" "}
              Déposez des fonds pour <strong style={{ color: "var(--pf-text)" }}>régler votre abonnement Premium</strong>{" "}
              directement sur la plateforme, sans avoir à ressaisir vos coordonnées à chaque fois.
            </div>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-panel-head" style={{ marginBottom: 14 }}>
            <div>
              <div className="pf-panel-title">Déposer des fonds</div>
              <div className="pf-panel-sub">Dépôt minimum {formatXaf(MIN_DEPOSIT_XAF)}</div>
            </div>
          </div>

          <div className="pf-op-grid">
            {(["ORANGE_MONEY", "MTN_MOMO"] as BelivayProvider[]).map((provider) => (
              <button
                key={provider}
                type="button"
                aria-pressed={depositProvider === provider}
                className={`pf-op${depositProvider === provider ? " on" : ""}`}
                onClick={() => setDepositProvider(provider)}
              >
                <span className={`pf-op-dot ${provider === "ORANGE_MONEY" ? "orange" : "mtn"}`} />
                <span className="pf-op-n">{PROVIDER_LABELS[provider]}</span>
                <span className="pf-op-s">Envoyer vers BelivaY</span>
              </button>
            ))}
          </div>

          <div className="pf-field" style={{ marginTop: 16 }}>
            <label className="pf-label" htmlFor="belivay-deposit-phone">
              Votre numéro {PROVIDER_LABELS[depositProvider]} (expéditeur)
            </label>
            <div className={`pf-phone${nationalPhone && !isValidNationalNumber(nationalPhone) ? " invalid" : ""}`}>
              <span className="pf-phone-country">🇨🇲 +237</span>
              <input
                id="belivay-deposit-phone"
                className="pf-phone-input"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="690 000 000"
                value={formatNational(nationalPhone)}
                onChange={(event) => setDepositPhone(toNationalNumber(event.target.value))}
              />
            </div>
            <div className="pf-muted-sm" style={{ marginTop: 6 }}>
              {phoneOperator
                ? `Opérateur détecté : ${phoneOperator}`
                : "Format : 690 000 000 (Orange) ou 680 000 000 (MTN)"}
            </div>
          </div>

          <div className="pf-field" style={{ marginTop: 14 }}>
            <span className="pf-label">Numéro BelivaY destinataire</span>
            <div className="pf-recv">
              <span className="pf-recv-n">
                <span
                  className={`pf-op-dot ${depositProvider === "ORANGE_MONEY" ? "orange" : "mtn"}`}
                  style={{ width: 16, height: 16 }}
                />
                {BELIVAY_RECEIVERS[depositProvider]}
              </span>
              <span className="pf-muted-sm">Compte officiel BelivaY</span>
            </div>
          </div>

          <div className="pf-form-grid" style={{ marginTop: 14 }}>
            <div className="pf-field">
              <label className="pf-label" htmlFor="belivay-deposit-amount">Montant (FCFA)</label>
              <input
                id="belivay-deposit-amount"
                className="pf-input"
                inputMode="numeric"
                placeholder="Ex : 10 000"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d\s]/g, ""))}
              />
            </div>
            <div className="pf-field">
              <span className="pf-label">Nouveau solde estimé</span>
              <div className="pf-estimate">
                {validAmount ? formatXaf(account.availableXaf + validAmount) : "— FCFA"}
              </div>
            </div>
          </div>

          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={handleDeposit}>
              <ArrowDownToLine size={14} />Confirmer le dépôt
            </button>
            <button type="button" className="pf-btn-ghost" onClick={handleResetDeposit}>
              <RotateCcw size={13} />Réinitialiser
            </button>
          </div>
        </section>

        {account.deposits.length > 0 ? (
          <section className="pf-glass-panel pf-anim">
            <div className="pf-card-title pf-mb">Historique des dépôts</div>
            {account.deposits.slice(0, 8).map((deposit) => (
              <div key={deposit.id} className="pf-dep-line">
                <span className="pf-order-ic">
                  {deposit.status === "CREDITED" ? <Check size={16} /> : <Clock size={16} />}
                </span>
                <div className="pf-order-mid">
                  <div className="pf-order-id">
                    {PROVIDER_LABELS[deposit.provider]} · {deposit.reference}
                  </div>
                  <div className="pf-muted-sm">
                    {new Date(deposit.createdAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {deposit.status === "CREDITED" ? "Crédité" : "En attente de validation"}
                  </div>
                </div>
                <div className="pf-order-total">{formatXaf(deposit.amountXaf)}</div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="pf-glass-panel pf-anim">
          <div className="pf-panel-head" style={{ marginBottom: 14 }}>
            <div className="pf-panel-title" style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <Gem size={18} style={{ color: "var(--pf-accent)" }} />
              Payer mon abonnement Premium
            </div>
          </div>

          <div className="pf-plan-current">
            <div className="pf-plan-k">Plan actuel</div>
            <div className="pf-plan-name">{currentPlan ? currentPlan.name : "Gratuit"}</div>
            <div className="pf-plan-sub">
              {currentPlan && account.planExpiresAt
                ? `Actif jusqu'au ${new Date(account.planExpiresAt).toLocaleDateString("fr-FR")}`
                : "Passez Premium pour accéder aux avantages exclusifs"}
            </div>
          </div>

          <div className="pf-plan-grid">
            {BELIVAY_PLANS.map((plan) => {
              const isCurrent = account.plan === plan.id;
              const affordable = account.availableXaf >= plan.priceXaf;
              return (
                <div key={plan.id} className={`pf-plan${plan.id === "PREMIUM" ? " violet" : ""}`}>
                  {plan.id === "PREMIUM" ? (
                    <Gem size={20} style={{ color: "#7c3aed" }} />
                  ) : (
                    <Star size={20} style={{ color: "var(--pf-accent)" }} />
                  )}
                  <div className="pf-plan-t">{plan.name}</div>
                  <div className="pf-plan-p">
                    {plan.priceXaf.toLocaleString("fr-FR")} FCFA<span>/mois</span>
                  </div>
                  <ul className="pf-plan-perks">
                    {plan.perks.map((perk) => (
                      <li key={perk}>
                        <Check size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--pf-accent)" }} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="pf-plan-cta"
                    disabled={!affordable}
                    onClick={() => handlePayPlan(plan.id)}
                    title={affordable ? undefined : "Solde insuffisant : faites un dépôt d'abord."}
                  >
                    {isCurrent ? "Renouveler →" : "Payer →"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pf-muted-sm" style={{ marginTop: 12, textAlign: "center" }}>
            Les fonds de votre Compte BelivaY seront utilisés pour le paiement.
          </div>
        </section>
      </div>
    );
  };

  const renderReglages = () => (
    <div className="pf-stack">
      <section className="pf-glass-panel pf-anim">
        <div className="pf-panel-head" style={{ marginBottom: 6 }}>
          <div>
            <div className="pf-panel-title">Réglages</div>
            <div className="pf-panel-sub">Apparence, langue et notifications</div>
          </div>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Apparence</div>
            <div className="pf-muted-sm">Thème clair ou sombre</div>
          </div>
          <button type="button" className="pf-btn-ghost" onClick={toggleTheme}>
            {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "dark" ? "Sombre" : "Clair"}
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Langue</div>
            <div className="pf-muted-sm">Interface de l'application</div>
          </div>
          <div className="pf-lang">
            <button
              type="button"
              className={`pf-lang-btn${(i18n.language || "fr").startsWith("fr") ? " on" : ""}`}
              onClick={() => i18n.changeLanguage("fr")}
            >
              🇫🇷 FR
            </button>
            <button
              type="button"
              className={`pf-lang-btn${(i18n.language || "").startsWith("en") ? " on" : ""}`}
              onClick={() => i18n.changeLanguage("en")}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Taille du texte</div>
            <div className="pf-muted-sm">Confort de lecture</div>
          </div>
          <div style={{ display: "inline-flex", gap: 4 }}>
            {(["small", "normal", "large"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className="pf-btn-ghost"
                style={{
                  padding: "4px 10px",
                  ...(fontSize === size
                    ? { background: "var(--pf-accent)", color: "#fff", borderColor: "var(--pf-accent)" }
                    : {}),
                }}
              >
                {size === "small" ? "A-" : size === "normal" ? "A" : "A+"}
              </button>
            ))}
          </div>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Mode daltonien</div>
            <div className="pf-muted-sm">Contraste renforcé, saturation réduite</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={daltonianMode}
            aria-label="Mode daltonien"
            className={`pf-switch${daltonianMode ? " on" : ""}`}
            onClick={() => setDaltonianMode((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Newsletter</div>
            <div className="pf-muted-sm">Offres par email</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pfNewsletter}
            aria-label="Newsletter"
            className={`pf-switch${pfNewsletter ? " on" : ""}`}
            onClick={() => setPfNewsletter((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">Notifications SMS</div>
            <div className="pf-muted-sm">Suivi de commande par SMS</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pfSms}
            aria-label="Notifications SMS"
            className={`pf-switch${pfSms ? " on" : ""}`}
            onClick={() => setPfSms((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-form-actions">
          <button type="button" className="pf-btn-accent" onClick={handleSaveProfile} disabled={pfSaving}>
            <Check size={14} />{pfSaving ? "Enregistrement…" : "Enregistrer les préférences"}
          </button>
        </div>
      </section>

      <section className="pf-glass-panel pf-anim pf-supportrow">
        <button type="button" className="pf-support-item" onClick={() => openPanel("securite")}>
          <span className="pf-support-ic accent"><Shield size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">Sécurité & mot de passe</span>
            <span className="pf-muted-sm">2FA, sessions actives</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => navigate("/notifications")}>
          <span className="pf-support-ic"><Bell size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">Centre de notifications</span>
            <span className="pf-muted-sm">Historique des alertes</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => navigate("/help")}>
          <span className="pf-support-ic"><HelpCircle size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">Centre d'aide</span>
            <span className="pf-muted-sm">FAQ et contact</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => { logout(); navigate("/"); }}>
          <span className="pf-support-ic"><LogOut size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t" style={{ color: "#dc2626" }}>Déconnexion</span>
            <span className="pf-muted-sm">Fermer la session sur cet appareil</span>
          </span>
        </button>
      </section>
    </div>
  );

  const renderPanel = () => {
    switch (activePanel) {
      case "profil":
        return renderProfil();
      case "adresses":
        return renderAdresses();
      case "paiements":
        return renderPaiements();
      case "historique-paiements":
        return renderHistoriquePaiements();
      case "fidelite":
        return renderFidelite();
      case "parrain":
        return renderParrain();
      case "messages":
        return renderMessages();
      case "vendeur":
        return renderVendeur();
      case "securite":
        return renderSecurite();
      case "compte-belivay":
        return renderCompteBelivay();
      case "reglages":
        return renderReglages();
      default:
        return renderDashboard();
    }
  };

  const primaryNav: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    panel?: PanelId;
    to?: string;
    badge?: number;
  }> = [
    { key: "dashboard", label: "Vue d'ensemble", icon: Home, panel: "dashboard" },
    { key: "orders", label: "Commandes", icon: Package, to: "/orders" },
    { key: "wishlist", label: "Favoris", icon: Heart, to: "/wishlist" },
    { key: "messages", label: "Messages", icon: MessageSquare, panel: "messages", badge: unreadMessages || undefined },
    { key: "fidelite", label: "Fidélité", icon: Award, panel: "fidelite" },
  ];
  const accountNav: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    panel: PanelId;
  }> = [
    { key: "profil", label: "Profil", icon: User, panel: "profil" },
    { key: "adresses", label: "Adresses", icon: MapPin, panel: "adresses" },
    { key: "paiements", label: "Paiements", icon: CreditCard, panel: "paiements" },
    { key: "historique-paiements", label: "Historique des paiements", icon: Wallet, panel: "historique-paiements" },
    { key: "parrain", label: "Parrainage", icon: Gift, panel: "parrain" },
    { key: "securite", label: "Sécurité", icon: Shield, panel: "securite" },
    { key: "compte-belivay", label: "Compte BelivaY", icon: Building2, panel: "compte-belivay" },
    { key: "reglages", label: "Réglages", icon: Settings, panel: "reglages" },
  ];

  /*
    Rail mobile : la même arborescence que la colonne de gauche, mise à plat
    dans un ruban défilant. « Accueil » ramène sur la vue d'ensemble.
  */
  const railNav: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    panel: PanelId;
    badge?: number;
  }> = [
    { key: "dashboard", label: "Accueil", icon: Home, panel: "dashboard" },
    { key: "profil", label: "Profil", icon: User, panel: "profil" },
    { key: "adresses", label: "Adresses", icon: MapPin, panel: "adresses" },
    { key: "paiements", label: "Paiement", icon: CreditCard, panel: "paiements" },
    { key: "fidelite", label: "Fidélité", icon: Award, panel: "fidelite" },
    { key: "parrain", label: "Parrainage", icon: Gift, panel: "parrain" },
    { key: "messages", label: "Messages", icon: MessageSquare, panel: "messages", badge: unreadMessages || undefined },
    { key: "securite", label: "Sécurité", icon: Shield, panel: "securite" },
    { key: "compte-belivay", label: "Compte BelivaY", icon: Building2, panel: "compte-belivay" },
    { key: "reglages", label: "Réglages", icon: Settings, panel: "reglages" },
  ];

  /* Les quatre tuiles de raccourci sous l'identité, en mobile. */
  const mobileTiles: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: number;
    active: boolean;
    onSelect: () => void;
  }> = [
    {
      key: "orders",
      label: "Commandes",
      icon: Package,
      badge: orderCount || undefined,
      active: false,
      onSelect: () => navigate("/orders"),
    },
    {
      key: "favorites",
      label: "Favoris",
      icon: Heart,
      badge: favoritesCount || undefined,
      active: false,
      onSelect: () => navigate("/wishlist"),
    },
    {
      key: "messages",
      label: "Messages",
      icon: MessageSquare,
      badge: unreadMessages || undefined,
      active: activePanel === "messages",
      onSelect: () => openPanel("messages"),
    },
    {
      key: "wallet",
      label: "Wallet",
      icon: Wallet,
      active: activePanel === "compte-belivay",
      onSelect: () => openPanel("compte-belivay"),
    },
  ];

  return (
    <div
      className={`pf-root min-h-screen px-4 md:px-8 lg:px-14 py-6 md:py-8 ${fontSizeClassMap[fontSize]}`}
      style={daltonianMode ? { filter: "contrast(1.08) saturate(.72)" } : undefined}
    >
      <PfShellStyles />
      <div className="mx-auto max-w-[1800px]">

        <div className="pf-ident pf-anim">
          <div className="pf-avatar">
            {avatar ? <img src={avatar} alt={displayName} /> : userInitials || "U"}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="pf-name">{displayName}</div>
            <div className="pf-meta">
              {user?.email && (
                <span><Mail size={13} />{user?.email}</span>
              )}
              {memberSince && (
                <span><Calendar size={13} />Membre depuis {memberSince}</span>
              )}
              <span><MapPin size={13} />{defaultCity}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pf-chip"><Award size={14} style={{ color: "var(--pf-accent)" }} />{fidelityTier} · {fidelityPoints.toLocaleString("fr-FR")} pts</span>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("profil")}>
              <Pencil size={13} />Modifier
            </button>
          </div>
        </div>

        {/*
          En-tête mobile : identité, progression de fidélité, tuiles de
          raccourci et rail de sections. Il remplace, sous 1024px, la carte
          d'identité et la colonne de navigation (masquées en CSS).
        */}
        <div className="pf-mhead">
          <div className="pf-mid">
            <div className="pf-mid-av">
              {avatar ? <img src={avatar} alt={displayName} /> : userInitials || "U"}
            </div>
            <div className="pf-mid-txt">
              <div className="pf-mid-n">{displayName}</div>
              <div className="pf-mid-s">• {defaultCity}</div>
            </div>
            <span className="pf-mid-tier">
              <Medal size={14} />
              {fidelityTier}
            </span>
          </div>

          <button
            type="button"
            className="pf-mprog"
            onClick={() => openPanel("fidelite")}
            aria-label="Voir le programme de fidélité"
          >
            <span className="pf-mprog-l">
              → {nextTierLabel} <Medal size={12} />
            </span>
            <span className="pf-mprog-b">
              <i style={{ width: `${tierProgress}%` }} />
            </span>
            <span className="pf-mprog-v">{fidelityPoints.toLocaleString("fr-FR")} pts</span>
          </button>

          <div className="pf-mtiles">
            {mobileTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.key}
                  type="button"
                  className={`pf-mtile${tile.active ? " on" : ""}`}
                  onClick={tile.onSelect}
                >
                  <span className="pf-mtile-ic">
                    <Icon size={19} />
                    {tile.badge ? <span className="pf-mtile-b">{tile.badge}</span> : null}
                  </span>
                  {tile.label}
                </button>
              );
            })}
          </div>

          <div className="pf-rail">
            {railNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`pf-rail-btn${activePanel === item.panel ? " on" : ""}`}
                  onClick={() => openPanel(item.panel)}
                >
                  <Icon size={15} />
                  {item.label}
                  {item.badge ? <span className="pf-rail-b">{item.badge}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pf-grid">
          <nav className="pf-navcard pf-anim">
            <div className="pf-sec">Principal</div>
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = item.panel !== undefined && activePanel === item.panel;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`pf-nav${active ? " on" : ""}`}
                  onClick={() => (item.to ? navigate(item.to) : openPanel(item.panel as PanelId))}
                >
                  <Icon size={17} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge ? <span className="pf-badge">{item.badge}</span> : null}
                </button>
              );
            })}

            <div className="pf-sec">Compte</div>
            {accountNav.map((item) => {
              const Icon = item.icon;
              const active = activePanel === item.panel;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`pf-nav${active ? " on" : ""}`}
                  onClick={() => openPanel(item.panel)}
                >
                  <Icon size={17} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </button>
              );
            })}

            <div className="pf-navsep" />

            <button
              type="button"
              className={`pf-nav${activePanel === "vendeur" ? " on" : ""}`}
              onClick={() => openPanel("vendeur")}
            >
              <Store size={17} />
              <span style={{ flex: 1 }}>{isVendor ? "Espace vendeur" : "Devenir vendeur"}</span>
            </button>
            <button type="button" className="pf-nav" onClick={() => { logout(); navigate("/"); }}>
              <LogOut size={17} />
              <span style={{ flex: 1 }}>Déconnexion</span>
            </button>

            <div className="pf-a11y">
              <div className="pf-sec" style={{ padding: "0 0 8px" }}>Accessibilité</div>
              <div className="pf-a11y-row">
                <span className="pf-a11y-l">Apparence</span>
                <button type="button" className="pf-btn-ghost" onClick={toggleTheme} aria-label="Basculer le thème">
                  {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  {theme === "dark" ? "Sombre" : "Clair"}
                </button>
              </div>
              <div className="pf-a11y-row">
                <span className="pf-a11y-l">Taille du texte</span>
                <div style={{ display: "inline-flex", gap: 4 }}>
                  {(["small", "normal", "large"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className="pf-btn-ghost"
                      style={{ padding: "4px 10px", ...(fontSize === size ? { background: "var(--pf-accent)", color: "#fff", borderColor: "var(--pf-accent)" } : {}) }}
                    >
                      {size === "small" ? "A-" : size === "normal" ? "A" : "A+"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pf-a11y-row">
                <span className="pf-a11y-l">Mode daltonien</span>
                <button
                  type="button"
                  onClick={() => setDaltonianMode((v) => !v)}
                  aria-label="Mode daltonien"
                  style={{ position: "relative", height: 24, width: 40, borderRadius: 999, border: "none", cursor: "pointer", background: daltonianMode ? "var(--pf-accent)" : "var(--pf-bstrong)", transition: ".15s" }}
                >
                  <span style={{ position: "absolute", top: 4, height: 16, width: 16, borderRadius: "50%", background: "#fff", transition: ".15s", left: daltonianMode ? 20 : 4 }} />
                </button>
              </div>
            </div>
          </nav>

          <main>
            <div key={activePanel} className="pf-anim">{renderPanel()}</div>
          </main>
        </div>
      </div>
      {avatarFile && (
        <AvatarCropDialog
          file={avatarFile}
          onClose={() => setAvatarFile(null)}
          onUploaded={(updated) => {
            setUser(updated);
            setAvatarFile(null);
            showToast("Photo rognée, compressée et enregistrée.", "success");
          }}
        />
      )}
    </div>
  );
}
