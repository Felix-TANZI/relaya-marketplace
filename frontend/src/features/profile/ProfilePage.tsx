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
  const { t, i18n } = useTranslation();
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
    toConversations(getSupportConversations(t)),
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
      .catch(() => showToast(t("cl3_profile_dashboard.error_loading_profile"), "error"))
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
    const syncSupport = () => setSupportConversations(toConversations(getSupportConversations(t)));
    window.addEventListener(SUPPORT_UPDATED_EVENT, syncSupport);
    window.addEventListener("storage", syncSupport);
    return () => {
      window.removeEventListener(SUPPORT_UPDATED_EVENT, syncSupport);
      window.removeEventListener("storage", syncSupport);
    };
  }, [t]);

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
    markSupportConversationRead(selectedConversationId, t);
  }, [activePanel, selectedConversationId, t]);

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
        name: t("cl3_profile_messages.dispute_name", { order: dispute.orderLabel }),
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
  const fidelityTier = clientReward?.tier_display ?? user?.loyalty_tier ?? t("cl3_profile_loyalty.tier_bronze");
  const fidelityTrust = clientReward?.trust_score ?? 70;

  const greetingName = user?.first_name?.trim() || displayName.split(" ")[0] || t("cl3_profile_dashboard.greeting_fallback_name");
  const unreadMessages = conversations.reduce((sum, conversation) => sum + (conversation.unread || 0), 0);
  const joinedDate = user?.date_joined;
  const memberSince = joinedDate
    ? new Date(joinedDate).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : null;
  const defaultCity =
    normalizedAddresses.find((address) => address.default)?.line.split("·").pop()?.trim() ||
    normalizedAddresses[0]?.line.split("·").pop()?.trim() ||
    t("cl3_profile_shell.default_country");
  const TIER_LADDER = [
    { name: t("cl3_profile_loyalty.tier_bronze"), threshold: 0 },
    { name: t("cl3_profile_loyalty.tier_silver"), threshold: 500 },
    { name: t("cl3_profile_loyalty.tier_gold"), threshold: 1500 },
    { name: t("cl3_profile_loyalty.tier_platinum"), threshold: 3000 },
  ];
  const TIER_THRESHOLDS = TIER_LADDER.map((tier) => tier.threshold);
  const nextTier = TIER_LADDER.find((tier) => tier.threshold > fidelityPoints) ?? null;
  const nextTierLabel = nextTier ? nextTier.name : t("cl3_profile_loyalty.max_level");
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
    !user?.last_name?.trim() ? t("cl3_profile_dashboard.missing_last_name") : null,
    !user?.phone ? t("cl3_profile_dashboard.missing_phone") : null,
    !avatar ? t("cl3_profile_dashboard.missing_photo") : null,
    normalizedAddresses.length === 0 ? t("cl3_profile_dashboard.missing_address") : null,
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
      showToast(t("cl3_profile_account.toast_profile_updated"), "success");
    } catch {
      showToast(t("cl3_profile_account.toast_update_error"), "error");
    } finally {
      setPfSaving(false);
    }
  };

  const handleAvatarRemove = async () => {
    try {
      const updated = await authApi.removeAvatar();
      setUser(updated);
      showToast(t("cl3_profile_account.toast_photo_removed"), "success");
    } catch {
      showToast(t("cl3_profile_account.toast_generic_error"), "error");
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((current) => current.map((address) => ({ ...address, default: address.id === id })));
    showToast(t("cl3_profile_addresses.toast_default_updated"), "success");
  };

  const setAddressType = (id: string, type: "home" | "office") => {
    setAddresses((current) => current.map((address) => (address.id === id ? { ...address, type } : address)));
  };

  const saveAddressEdit = (id: string) => {
    const target = addresses.find((address) => address.id === id);
    if (!target || !target.line.trim()) {
      showToast(t("cl3_profile_addresses.toast_incomplete_address"), "error");
      return;
    }
    setDraftAddressId(null);
    setEditingAddressId(null);
    showToast(t("cl3_profile_addresses.toast_address_saved"), "success");
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
    showToast(t("cl3_profile_addresses.toast_address_deleted"), "success");
  };

  const handleSendChatMessage = () => {
    if (!selectedConversation || !chatDraft.trim()) return;

    if (selectedConversation.type === "litige") {
      addDisputeMessage(selectedConversation.id, chatDraft.trim());
      setDisputes(getStoredOrderDisputes());
    } else {
      addSupportMessage(selectedConversation.id, chatDraft.trim(), t);
    }

    setChatDraft("");
  };

  const handleRefreshAccount = () => {
    setAccount(refreshBelivayAccount());
    showToast(t("cl3_profile_wallet.toast_account_refreshed"), "success");
  };

  const handleDeposit = () => {
    const national = toNationalNumber(depositPhone);
    if (!isValidNationalNumber(national)) {
      showToast(t("cl3_profile_wallet.toast_invalid_momo_number"), "error");
      return;
    }

    /* Le numéro doit appartenir à l'opérateur choisi, sinon le transfert
       n'arrivera jamais sur le compte BelivaY sélectionné. */
    const operator = detectOperator(national)?.name;
    const expected = depositProvider === "ORANGE_MONEY" ? "Orange" : "MTN";
    if (operator && operator !== expected) {
      showToast(t("cl3_profile_wallet.toast_operator_mismatch", { operator, expected }), "error");
      return;
    }

    const amount = Number(depositAmount.replace(/\s/g, ""));
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT_XAF) {
      showToast(t("cl3_profile_wallet.toast_min_deposit", { amount: formatXaf(MIN_DEPOSIT_XAF) }), "error");
      return;
    }

    try {
      const deposit = createBelivayDeposit({
        provider: depositProvider,
        senderPhone: national,
        amountXaf: amount,
      }, t);
      setAccount(getBelivayAccount());
      setDepositAmount("");
      showToast(t("cl3_profile_wallet.toast_deposit_recorded", { reference: deposit.reference }), {
        description: t("cl3_profile_wallet.toast_deposit_recorded_description"),
        type: "success",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("cl3_profile_wallet.toast_deposit_failed"), "error");
    }
  };

  const handleResetDeposit = () => {
    setDepositPhone("");
    setDepositAmount("");
    setDepositProvider("ORANGE_MONEY");
  };

  const handlePayPlan = (planId: "ESSENTIEL" | "PREMIUM") => {
    try {
      const charge = payBelivaySubscription(planId, t);
      setAccount(getBelivayAccount());
      showToast(t("cl3_profile_wallet.toast_subscription_paid"), {
        description: t("cl3_profile_wallet.toast_subscription_valid_until", {
          date: new Date(charge.periodEnd).toLocaleDateString("fr-FR"),
        }),
        type: "success",
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : t("cl3_profile_wallet.toast_payment_failed"), "error");
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
      showToast(t("cl3_profile_seller.toast_activated"), "success");
      openPanel("dashboard");
    } catch {
      showToast(t("cl3_profile_seller.toast_apply_error"), "error");
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
    const trackerSteps = [
      t("cl3_profile_dashboard.tracker_confirmed"),
      t("cl3_profile_dashboard.tracker_prepared"),
      t("cl3_profile_dashboard.tracker_en_route"),
      t("cl3_profile_dashboard.tracker_delivered"),
    ];
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
          <div className="pf-hello">{t("cl3_profile_dashboard.greeting", { name: greetingName })}</div>
          <div className="pf-hello-sub">{t("cl3_profile_dashboard.greeting_sub")}</div>
        </div>

        {activeOrder ? (
          <div className="pf-card pf-anim">
            <div className="pf-tk-head">
              <div>
                <div className="pf-k">{t("cl3_profile_dashboard.active_order_label", { id: activeOrder.id })}</div>
                <div className="pf-t">{t("cl3_profile_dashboard.active_order_title")}</div>
              </div>
              <button type="button" className="pf-btn-accent" onClick={() => navigate(`/orders/${activeOrder.id}`)}>
                <Truck size={14} />{t("cl3_profile_dashboard.track_btn")}
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
              <div className="pf-t">{t("cl3_profile_dashboard.no_active_order")}</div>
              <div className="pf-sub">{t("cl3_profile_dashboard.no_active_order_sub")}</div>
            </div>
            <button type="button" className="pf-btn-accent" onClick={() => navigate("/catalog")}>
              <Package size={14} />{t("cl3_profile_dashboard.explore_btn")}
            </button>
          </div>
        )}

        <div className="pf-stats">
          {stat(Package, orderCount, t("cl3_profile_dashboard.stat_orders"), "o")}
          {stat(Truck, activeCount, t("cl3_profile_dashboard.stat_in_progress"), "b")}
          {stat(Heart, favoritesCount, t("cl3_profile_dashboard.stat_favorites"), "p")}
          {stat(Award, fidelityPoints.toLocaleString("fr-FR"), t("cl3_profile_dashboard.stat_points"), "a")}
        </div>

        <div className="pf-twoup">
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">{t("cl3_profile_dashboard.loyalty_program")}</span>
              <span className="pf-muted-sm">
                {fidelityTier} → <span style={{ color: "var(--pf-accent)", fontWeight: 600 }}>{t("cl3_profile_dashboard.tier_silver")}</span>
              </span>
            </div>
            <div className="pf-bar"><i style={{ width: `${tierProgress}%` }} /></div>
            <div className="pf-muted-sm pf-mt">
              {fidelityPoints.toLocaleString("fr-FR")} / {nextTierThreshold.toLocaleString("fr-FR")} pts
              {pointsToNextTier > 0
                ? t("cl3_profile_dashboard.points_remaining", { points: pointsToNextTier.toLocaleString("fr-FR") })
                : t("cl3_profile_dashboard.max_level")}
            </div>
          </div>
          <button type="button" className="pf-card pf-anim pf-notif" onClick={() => openPanel("messages", "support")}>
            <span className="pf-notif-ic">
              <Bell size={20} />
              {unreadMessages > 0 && <span className="pf-notif-b">{unreadMessages}</span>}
            </span>
            <span>
              <span className="pf-notif-t">{t("cl3_profile_dashboard.notifications")}</span>
              <span className="pf-muted-sm">
                {unreadMessages > 0
                  ? t(unreadMessages > 1 ? "cl3_profile_dashboard.unread_count_plural" : "cl3_profile_dashboard.unread_count", { count: unreadMessages })
                  : t("cl3_profile_dashboard.up_to_date")}
              </span>
            </span>
          </button>
        </div>

        {recentOrders.length > 0 && (
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">{t("cl3_profile_dashboard.recent_orders")}</span>
              <button type="button" className="pf-link" onClick={() => navigate("/orders")}>{t("cl3_profile_dashboard.see_all")}</button>
            </div>
            {recentOrders.map((order) => (
              <div key={order.id} className="pf-order-line">
                <div className="pf-order-ic"><Package size={16} /></div>
                <div className="pf-order-mid">
                  <div className="pf-order-id">{t("cl3_profile_dashboard.order_label", { id: order.id })}</div>
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
              <span className="pf-support-t">{t("cl3_profile_dashboard.contact_support")}</span>
              <span className="pf-muted-sm">{t("cl3_profile_dashboard.contact_support_sub")}</span>
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
              <span className="pf-support-t">{isVendor ? t("cl3_profile_dashboard.seller_space") : t("cl3_profile_dashboard.become_seller")}</span>
              <span className="pf-muted-sm">
                {isVendor ? (vendorProfile?.business_name || t("cl3_profile_dashboard.your_shop")) : t("cl3_profile_dashboard.open_your_shop")}
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
                <span className="pf-notif-t">{t("cl3_profile_dashboard.your_cart")}</span>
                <span className="pf-muted-sm">
                  {t(itemCount > 1 ? "cl3_profile_dashboard.cart_items_plural" : "cl3_profile_dashboard.cart_items", { count: itemCount })}
                  {" · "}{total.toLocaleString("fr-FR")} FCFA
                </span>
              </span>
              <span className="pf-pill">{t("cl3_profile_dashboard.order_cta")}</span>
            </button>
          ) : (
            <button type="button" className="pf-card pf-notif" onClick={() => navigate("/catalog")}>
              <span className="pf-support-ic"><ShoppingCart size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="pf-notif-t">{t("cl3_profile_dashboard.empty_cart")}</span>
                <span className="pf-muted-sm">{t("cl3_profile_dashboard.browse_catalog")}</span>
              </span>
              <ArrowRight size={16} className="pf-muted" />
            </button>
          )}

          <div className="pf-card">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">{t("cl3_profile_dashboard.delivery_address")}</span>
              <button type="button" className="pf-link" onClick={() => openPanel("adresses")}>{t("cl3_profile_dashboard.manage")}</button>
            </div>
            {defaultAddress ? (
              <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span className="pf-order-ic"><MapPin size={16} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="pf-order-id">{defaultAddress.label}{defaultAddress.default ? ` · ${t("cl3_profile_dashboard.default_suffix")}` : ""}</div>
                  <div className="pf-muted-sm">{defaultAddress.line}</div>
                </div>
              </div>
            ) : (
              <button type="button" className="pf-btn-accent" onClick={() => openPanel("adresses")}>
                <Plus size={14} />{t("cl3_profile_dashboard.add_address")}
              </button>
            )}
          </div>
        </div>

        {profileComplete < 100 && (
          <div className="pf-card pf-anim">
            <div className="pf-row-between pf-mb">
              <span className="pf-card-title">{t("cl3_profile_dashboard.complete_profile")}</span>
              <span style={{ color: "var(--pf-accent)", fontWeight: 700, fontSize: 13 }}>{profileComplete}%</span>
            </div>
            <div className="pf-bar"><i style={{ width: `${profileComplete}%` }} /></div>
            <div className="pf-row-between" style={{ marginTop: 12, gap: 10 }}>
              <span className="pf-muted-sm">
                {profileMissing.length > 0
                  ? t("cl3_profile_dashboard.to_add", { items: profileMissing.join(", ") })
                  : t("cl3_profile_dashboard.profile_complete")}
              </span>
              <button type="button" className="pf-btn-ghost" onClick={() => openPanel("profil")}>{t("cl3_profile_dashboard.complete_btn")}</button>
            </div>
          </div>
        )}

        <div className="pf-anim">
          <div className="pf-card-title pf-mb">{t("cl3_profile_dashboard.shortcuts")}</div>
          <div className="pf-quick">
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/promotions")}>
              <span className="pf-quick-ic o"><Sparkles size={18} /></span>
              {t("cl3_profile_dashboard.shortcut_promotions")}
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/notifications")}>
              <span className="pf-quick-ic b"><Bell size={18} /></span>
              {t("cl3_profile_dashboard.notifications")}
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("parrain")}>
              <span className="pf-quick-ic p"><Gift size={18} /></span>
              {t("cl3_profile_dashboard.shortcut_referral")}
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => navigate("/help")}>
              <span className="pf-quick-ic a"><HelpCircle size={18} /></span>
              {t("cl3_profile_dashboard.shortcut_help_center")}
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("compte-belivay")}>
              <span className="pf-quick-ic o"><Wallet size={18} /></span>
              {t("cl3_profile_dashboard.shortcut_belivay_account")}
              <span className="pf-muted-sm">{formatXaf(account.availableXaf)}</span>
            </button>
            <button type="button" className="pf-quick-tile" onClick={() => openPanel("reglages")}>
              <span className="pf-quick-ic b"><Settings size={18} /></span>
              {t("cl3_profile_dashboard.shortcut_settings")}
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
              <button type="button" className="pf-btn-ghost" onClick={handleAvatarRemove} aria-label={t("cl3_profile_account.remove_photo_aria")}>
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
          <div className="pf-summary">
            <div className="pf-summary-row"><span className="pf-muted-sm">{t("cl3_profile_account.member_since")}</span><span className="pf-summary-v">{memberSince || "—"}</span></div>
            <div className="pf-summary-row"><span className="pf-muted-sm">{t("cl3_profile_account.account_type")}</span><span className="pf-summary-v">{isVendor ? t("cl3_profile_account.account_type_seller") : t("cl3_profile_account.account_type_client")}</span></div>
            <div className="pf-summary-row"><span className="pf-muted-sm">{t("cl3_profile_account.loyalty")}</span><span className="pf-summary-v">{fidelityTier} · {fidelityPoints.toLocaleString("fr-FR")} pts</span></div>
          </div>
        </section>

        <section className="pf-glass-panel">
          <div className="pf-card-title pf-mb">{t("cl3_profile_account.preferences")}</div>
          <div className="pf-toggle-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div><div className="pf-toggle-t">{t("cl3_profile_account.language")}</div><div className="pf-muted-sm">{t("cl3_profile_account.language_sub")}</div></div>
            <div className="pf-lang">
              <button type="button" className={`pf-lang-btn${(i18n.language || "fr").startsWith("fr") ? " on" : ""}`} onClick={() => i18n.changeLanguage("fr")}>🇫🇷 FR</button>
              <button type="button" className={`pf-lang-btn${(i18n.language || "").startsWith("en") ? " on" : ""}`} onClick={() => i18n.changeLanguage("en")}>🇬🇧 EN</button>
            </div>
          </div>
          <div className="pf-toggle-row">
            <div><div className="pf-toggle-t">{t("cl3_profile_account.newsletter")}</div><div className="pf-muted-sm">{t("cl3_profile_account.newsletter_sub")}</div></div>
            <button type="button" role="switch" aria-checked={pfNewsletter} aria-label={t("cl3_profile_account.newsletter")} className={`pf-switch${pfNewsletter ? " on" : ""}`} onClick={() => setPfNewsletter((v) => !v)}><span /></button>
          </div>
          <div className="pf-toggle-row">
            <div><div className="pf-toggle-t">{t("cl3_profile_account.sms_notifications")}</div><div className="pf-muted-sm">{t("cl3_profile_account.sms_notifications_sub")}</div></div>
            <button type="button" role="switch" aria-checked={pfSms} aria-label={t("cl3_profile_account.sms_aria")} className={`pf-switch${pfSms ? " on" : ""}`} onClick={() => setPfSms((v) => !v)}><span /></button>
          </div>
          <button type="button" className="pf-btn-ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={() => openPanel("securite")}>
            <Shield size={14} />{t("cl3_profile_account.security_and_password")}
          </button>
        </section>
      </div>

      <section className="pf-glass-panel">
        <div className="pf-panel-head">
          <div>
            <div className="pf-panel-title">{t("cl3_profile_account.personal_info")}</div>
            <div className="pf-panel-sub">{t("cl3_profile_account.personal_info_sub")}</div>
          </div>
        </div>
        <div className="pf-form-grid">
          <div className="pf-field">
            <label className="pf-label">{t("cl3_profile_account.first_name")}</label>
            <input className="pf-input" value={pfForm.first_name} onChange={(e) => setPfForm((f) => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="pf-field">
            <label className="pf-label">{t("cl3_profile_account.last_name")}</label>
            <input className="pf-input" value={pfForm.last_name} onChange={(e) => setPfForm((f) => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">{t("cl3_profile_account.email")}</label>
            <input className="pf-input" type="email" value={pfForm.email} onChange={(e) => setPfForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">{t("cl3_profile_account.phone")}</label>
            <PhoneInput value={pfForm.phone} onChange={(v) => setPfForm((f) => ({ ...f, phone: v }))} placeholder="6XX XXX XXX" />
          </div>
          <div className="pf-field pf-col2">
            <label className="pf-label">{t("cl3_profile_account.bio")}</label>
            <textarea className="pf-input pf-textarea" value={pfForm.bio} onChange={(e) => setPfForm((f) => ({ ...f, bio: e.target.value }))} placeholder={t("cl3_profile_account.bio_placeholder")} />
          </div>
        </div>
        <div className="pf-form-actions">
          <button type="button" className="pf-btn-accent" onClick={handleSaveProfile} disabled={pfSaving}>
            <ShieldCheck size={14} />{pfSaving ? t("cl3_profile_account.saving") : t("cl3_profile_account.save")}
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
            {t("cl3_profile_account.cancel")}
          </button>
        </div>
      </section>
    </div>
  );

  const renderAdresses = () => (
    <section className="pf-glass-panel">
      <div className="pf-panel-head">
        <div>
          <div className="pf-panel-title">{t("cl3_profile_addresses.title")}</div>
          <div className="pf-panel-sub">{t("cl3_profile_addresses.subtitle")}</div>
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
          <Plus size={14} />{t("cl3_profile_addresses.add")}
        </button>
      </div>

      {normalizedAddresses.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-ic"><MapPin size={22} /></span>
          <div className="pf-empty-t">{t("cl3_profile_addresses.empty_title")}</div>
          <div className="pf-muted-sm">{t("cl3_profile_addresses.empty_sub")}</div>
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
                  {address.label || (isEditing ? t("cl3_profile_addresses.new_address") : t("cl3_profile_addresses.unnamed"))}
                  {address.default ? <span className="pf-badge-soft">{t("cl3_profile_addresses.default_badge")}</span> : null}
                </div>

                {isEditing ? (
                  <div className="pf-addr-edit">
                    <div className="pf-type-toggle">
                      <button type="button" className={`pf-type-btn${address.type === "home" ? " on" : ""}`} onClick={() => setAddressType(address.id, "home")}><Home size={13} />{t("cl3_profile_addresses.type_home")}</button>
                      <button type="button" className={`pf-type-btn${address.type === "office" ? " on" : ""}`} onClick={() => setAddressType(address.id, "office")}><Building2 size={13} />{t("cl3_profile_addresses.type_office")}</button>
                    </div>
                    <input className="pf-input" value={address.label} onChange={(e) => handleAddressUpdate(address.id, "label", e.target.value)} placeholder={t("cl3_profile_addresses.label_placeholder")} />
                    <input className="pf-input" value={address.person} onChange={(e) => handleAddressUpdate(address.id, "person", e.target.value)} placeholder={t("cl3_profile_addresses.recipient_placeholder")} />
                    <PhoneInput value={address.phone} onChange={(v) => handleAddressUpdate(address.id, "phone", v)} placeholder="6XX XXX XXX" />
                    <textarea className="pf-input pf-textarea" value={address.line} onChange={(e) => handleAddressUpdate(address.id, "line", e.target.value)} placeholder={t("cl3_profile_addresses.line_placeholder")} />
                  </div>
                ) : (
                  <div className="pf-addr-line">
                    {address.person}{address.phone ? ` · ${address.phone}` : ""}<br />
                    {address.line || t("cl3_profile_addresses.line_incomplete")}
                  </div>
                )}

                <div className="pf-addr-actions">
                  {isEditing ? (
                    <>
                      <button type="button" className="pf-btn-accent" onClick={() => saveAddressEdit(address.id)}>{t("cl3_profile_addresses.save")}</button>
                      <button type="button" className="pf-btn-ghost" onClick={() => cancelAddressEdit(address.id)}><X size={13} />{t("cl3_profile_addresses.close")}</button>
                    </>
                  ) : (
                    <>
                      {!address.default ? (
                        <button type="button" className="pf-btn-ghost" onClick={() => handleSetDefaultAddress(address.id)}>{t("cl3_profile_addresses.set_default")}</button>
                      ) : null}
                      <button type="button" className="pf-btn-ghost" onClick={() => setEditingAddressId(address.id)}><Pencil size={13} />{t("cl3_profile_addresses.edit")}</button>
                      <button type="button" className="pf-btn-danger" onClick={() => handleDeleteAddress(address.id)} aria-label={t("cl3_profile_addresses.delete")}><Trash2 size={13} /></button>
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
      { icon: Medal, name: t("cl3_profile_loyalty.tier_bronze"), min: 0, range: t("cl3_profile_loyalty.range_bronze"), perk: t("cl3_profile_loyalty.perk_bronze") },
      { icon: Award, name: t("cl3_profile_loyalty.tier_silver"), min: 500, range: t("cl3_profile_loyalty.range_silver"), perk: t("cl3_profile_loyalty.perk_silver") },
      { icon: Trophy, name: t("cl3_profile_loyalty.tier_gold"), min: 2000, range: t("cl3_profile_loyalty.range_gold"), perk: t("cl3_profile_loyalty.perk_gold") },
      { icon: Star, name: t("cl3_profile_loyalty.tier_platinum"), min: 5000, range: t("cl3_profile_loyalty.range_platinum"), perk: t("cl3_profile_loyalty.perk_platinum") },
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
          <div className="pf-hero-top"><Award size={15} />{t("cl3_profile_loyalty.points_balance")}</div>
          <div className="pf-hero-pts">{fidelityPoints.toLocaleString("fr-FR")} <span>pts</span></div>
          <div className="pf-hero-sub">{t("cl3_profile_loyalty.level_trust", { tier: fidelityTier, trust: fidelityTrust })}</div>
          <div className="pf-hero-bar">
            <div className="pf-hero-bar-head">
              <span>{nextTier ? t("cl3_profile_loyalty.toward_tier", { tier: nextTier.name }) : t("cl3_profile_loyalty.max_level_reached")}</span>
              <span>
                {nextTier
                  ? t("cl3_profile_loyalty.points_remaining", { points: ptsToNext.toLocaleString("fr-FR") })
                  : t("cl3_profile_loyalty.points_cumulated", { points: (clientReward?.lifetime_points ?? fidelityPoints).toLocaleString("fr-FR") })}
              </span>
            </div>
            <div className="pf-hero-track"><div className="pf-hero-fill" style={{ width: `${tierPct}%` }} /></div>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">{t("cl3_profile_loyalty.tiers_title")}</div>
          <div className="pf-tier-grid">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <div key={tier.name} className={`pf-tier${index === currentIndex ? " on" : ""}`}>
                  <span className="pf-tier-ic"><Icon size={26} /></span>
                  <div className="pf-tier-name">{tier.name}</div>
                  <div className="pf-tier-range">{tier.range}</div>
                  <div className="pf-tier-perk">{tier.perk}</div>
                  {index === currentIndex ? <span className="pf-tier-badge">{t("cl3_profile_loyalty.current_level")}</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} />{t("cl3_profile_loyalty.points_history")}
          </div>
          {history.length === 0 ? (
            <div className="pf-muted-sm" style={{ padding: "8px 0" }}>
              {t("cl3_profile_loyalty.no_transactions")}
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
          .then(() => showToast(t("cl3_profile_referral.toast_link_copied"), "success"))
          .catch(() => showToast(t("cl3_profile_referral.toast_copy_error"), "error"));
      }
    };
    const referralSteps = [
      t("cl3_profile_referral.step_1"),
      t("cl3_profile_referral.step_2"),
      t("cl3_profile_referral.step_3"),
      t("cl3_profile_referral.step_4"),
    ];
    return (
      <div className="pf-stack">
        <section className="pf-hero pf-anim" style={{ background: "linear-gradient(120deg,#6d28d9,#a855f7 60%,#c084fc)", boxShadow: "0 16px 44px rgba(124,58,237,.4)" }}>
          <span className="pf-hero-glow" />
          <div className="pf-hero-top"><Gift size={15} />{t("cl3_profile_referral.hero_top")}</div>
          <div style={{ position: "relative", zIndex: 1, fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", marginTop: 4 }}>{t("cl3_profile_referral.hero_title")}</div>
          <div className="pf-hero-sub">{t("cl3_profile_referral.hero_sub")}</div>
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div className="pf-ref-code">{refCode}</div>
            <button type="button" className="pf-btn-ghost" style={{ background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff" }} onClick={share}>
              <Send size={13} />{t("cl3_profile_referral.copy_link")}
            </button>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">{t("cl3_profile_referral.how_it_works")}</div>
          {referralSteps.map((step, index) => (
            <div key={step} className="pf-step">
              <span className="pf-step-n">{index + 1}</span>{step}
            </div>
          ))}
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-card-title pf-mb">{t("cl3_profile_referral.my_referrals")}</div>
          <div className="pf-muted-sm" style={{ padding: "8px 0" }}>
            {t("cl3_profile_referral.empty_referrals")}
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
            {t("cl3_profile_messages.tab_all", { count: conversations.length })}
          </button>
          <button
            type="button"
            onClick={() => openPanel("messages", "support")}
            className={`rounded-[8px] px-4 py-2 text-[12px] font-bold ${messageTab === "support" ? "bg-[#fff4eb] text-[#c85e14] dark:bg-primary/10 dark:text-primary" : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"}`}
          >
            {t("cl3_profile_messages.tab_support")}
          </button>
          <button
            type="button"
            onClick={() => openPanel("messages", "litige")}
            className={`inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[12px] font-bold ${messageTab === "litige" ? "bg-[#fff4eb] text-[#c85e14] dark:bg-primary/10 dark:text-primary" : "bg-[#f9fafb] text-[#4b5563] dark:bg-gray-800 dark:text-gray-300"}`}
          >
            <Shield size={14} />
            {t("cl3_profile_messages.tab_disputes")}
          </button>
        </div>
        <ActionButton variant="primary" onClick={() => navigate("/orders")}>
          <Package size={14} className="mr-1" />
          {t("cl3_profile_messages.go_to_orders")}
        </ActionButton>
      </div>

      <div className="mb-4 rounded-[12px] border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] leading-[1.7] text-[#7c4b27] dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
                {t("cl3_profile_messages.dispute_note")}
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
              {t("cl3_profile_messages.empty_filter")}
            </div>
          ) : null}
        </div>

        <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          {selectedConversation ? (
            <>
              <div className="mb-4 border-b border-[#e5e7eb] pb-3 dark:border-gray-800">
                <div className="text-[14px] font-extrabold text-[#111827] dark:text-white">{selectedConversation.name}</div>
                <div className="mt-1 text-[12px] text-[#6b7280] dark:text-gray-400">
                  {selectedConversation.type === "litige" ? t("cl3_profile_messages.dispute_chat_open") : t("cl3_profile_messages.support_conversation")}
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
                  {t("cl3_profile_messages.dispute_readonly_note")}
                </div>
              ) : (
                <div className="mt-4 flex gap-2 border-t border-[#e5e7eb] pt-3 dark:border-gray-800">
                  <input
                    className="flex-1 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder={t("cl3_profile_messages.chat_placeholder")}
                  />
                  <ActionButton variant="primary" onClick={handleSendChatMessage}>
                    <Send size={14} className="mr-1" />
                    {t("cl3_profile_messages.send")}
                  </ActionButton>
                </div>
              )}
            </>
          ) : (
            <div className="text-[13px] text-[#6b7280] dark:text-gray-400">{t("cl3_profile_messages.no_conversation")}</div>
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
              <div className="pf-panel-title">{t("cl3_profile_seller.you_are_seller")}</div>
              <div className="pf-panel-sub">{t("cl3_profile_seller.shop_active")}</div>
            </div>
          </div>
          <div className="pf-vendor-active">
            <span className="pf-vendor-ic"><Store size={20} /></span>
            <div>
              <div className="pf-toggle-t">{t("cl3_profile_seller.active_seller")}{vendorProfile?.business_name ? ` · ${vendorProfile.business_name}` : ""}</div>
              <div className="pf-muted-sm">{t("cl3_profile_seller.active_seller_sub")}</div>
            </div>
          </div>
          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={() => navigate("/seller/dashboard")}><Store size={14} />{t("cl3_profile_seller.open_seller_space")}</button>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("dashboard")}>{t("cl3_profile_seller.dashboard")}</button>
          </div>
        </>
      ) : (
        <>
          <div className="pf-panel-head">
            <div>
              <div className="pf-panel-title">{t("cl3_profile_seller.become_seller_title")}</div>
              <div className="pf-panel-sub">{t("cl3_profile_seller.become_seller_sub")}</div>
            </div>
          </div>

          <div className="pf-benefits">
            {[
              { icon: Store, title: t("cl3_profile_seller.benefit_shop_title"), desc: t("cl3_profile_seller.benefit_shop_desc") },
              { icon: Wallet, title: t("cl3_profile_seller.benefit_momo_title"), desc: t("cl3_profile_seller.benefit_momo_desc") },
              { icon: Award, title: t("cl3_profile_seller.benefit_visibility_title"), desc: t("cl3_profile_seller.benefit_visibility_desc") },
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
            <div className="pf-field"><label className="pf-label">{t("cl3_profile_seller.shop_name")}</label><input className="pf-input" value={sellerForm.shopName} onChange={(e) => handleSellerField("shopName", e.target.value)} placeholder={t("cl3_profile_seller.shop_name_placeholder")} /></div>
            <div className="pf-field"><label className="pf-label">{t("cl3_profile_seller.main_category")}</label><input className="pf-input" value={sellerForm.category} onChange={(e) => handleSellerField("category", e.target.value)} placeholder={t("cl3_profile_seller.main_category_placeholder")} /></div>
            <div className="pf-field"><label className="pf-label">{t("cl3_profile_seller.city")}</label><input className="pf-input" value={sellerForm.city} onChange={(e) => handleSellerField("city", e.target.value)} /></div>
            <div className="pf-field"><label className="pf-label">{t("cl3_profile_seller.business_phone")}</label><PhoneInput value={sellerForm.phone} onChange={(v) => handleSellerField("phone", v)} placeholder="6XX XXX XXX" /></div>
            <div className="pf-field pf-col2"><label className="pf-label">{t("cl3_profile_seller.shop_address")}</label><input className="pf-input" value={sellerForm.address} onChange={(e) => handleSellerField("address", e.target.value)} placeholder={t("cl3_profile_seller.shop_address_placeholder")} /></div>
            <div className="pf-field pf-col2"><label className="pf-label">{t("cl3_profile_seller.id_document")}</label><input className="pf-input" value={sellerForm.idDocument} onChange={(e) => handleSellerField("idDocument", e.target.value)} placeholder={t("cl3_profile_seller.id_document_placeholder")} /></div>
            <div className="pf-field pf-col2"><label className="pf-label">{t("cl3_profile_seller.motivation")}</label><textarea className="pf-input pf-textarea" value={sellerForm.motivation} onChange={(e) => handleSellerField("motivation", e.target.value)} placeholder={t("cl3_profile_seller.motivation_placeholder")} /></div>
          </div>

          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={handleSellerApplication} disabled={sellerSubmitting}><Store size={14} />{sellerSubmitting ? t("cl3_profile_seller.submitting") : t("cl3_profile_seller.submit_application")}</button>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("dashboard")}>{t("cl3_profile_seller.back")}</button>
          </div>
        </>
      )}
    </section>
  );

  const renderSecurite = () => (
    <section className="pf-glass-panel">
      <div className="pf-panel-head" style={{ marginBottom: 6 }}>
        <div>
          <div className="pf-panel-title">{t("cl3_profile_security.title")}</div>
          <div className="pf-panel-sub">{t("cl3_profile_security.subtitle")}</div>
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
                {t("cl3_profile_wallet.my_belivay_account")}
              </div>
              <div className="pf-panel-sub">{t("cl3_profile_wallet.balance_deposits_subscription")}</div>
            </div>
            <button type="button" className="pf-btn-ghost" onClick={handleRefreshAccount}>
              <RefreshCw size={13} />{t("cl3_profile_wallet.refresh")}
            </button>
          </div>

          <div className="pf-wal-grid">
            <div className="pf-wal o">
              <span className="pf-wal-ic"><Wallet size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.availableXaf)}</div>
              <div className="pf-wal-l">{t("cl3_profile_wallet.available_balance")}</div>
              <div className="pf-wal-s">{t("cl3_profile_wallet.available_balance_sub")}</div>
            </div>
            <div className="pf-wal g">
              <span className="pf-wal-ic"><CreditCard size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.totalDepositedXaf)}</div>
              <div className="pf-wal-l">{t("cl3_profile_wallet.total_deposited")}</div>
              <div className="pf-wal-s">
                {t(account.depositCount > 1 ? "cl3_profile_wallet.deposit_count_plural" : "cl3_profile_wallet.deposit_count", { count: account.depositCount })}
              </div>
            </div>
            <div className="pf-wal y">
              <span className="pf-wal-ic"><Clock size={17} /></span>
              <div className="pf-wal-amt">{formatXaf(account.pendingXaf)}</div>
              <div className="pf-wal-l">{t("cl3_profile_wallet.pending")}</div>
              <div className="pf-wal-s">{t("cl3_profile_wallet.pending_sub")}</div>
            </div>
          </div>

          <div className="pf-info-note">
            <span className="pf-info-ic"><Sparkles size={16} /></span>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--pf-text2)" }}>
              <strong style={{ color: "var(--pf-text)" }}>{t("cl3_profile_wallet.info_note_title")}</strong>{" "}
              {t("cl3_profile_wallet.info_note_body_1")} <strong style={{ color: "var(--pf-text)" }}>{t("cl3_profile_wallet.info_note_body_strong")}</strong>{" "}
              {t("cl3_profile_wallet.info_note_body_2")}
            </div>
          </div>
        </section>

        <section className="pf-glass-panel pf-anim">
          <div className="pf-panel-head" style={{ marginBottom: 14 }}>
            <div>
              <div className="pf-panel-title">{t("cl3_profile_wallet.deposit_funds")}</div>
              <div className="pf-panel-sub">{t("cl3_profile_wallet.min_deposit", { amount: formatXaf(MIN_DEPOSIT_XAF) })}</div>
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
                <span className="pf-op-s">{t("cl3_profile_wallet.send_to_belivay")}</span>
              </button>
            ))}
          </div>

          <div className="pf-field" style={{ marginTop: 16 }}>
            <label className="pf-label" htmlFor="belivay-deposit-phone">
              {t("cl3_profile_wallet.your_number_label", { provider: PROVIDER_LABELS[depositProvider] })}
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
                ? t("cl3_profile_wallet.operator_detected", { operator: phoneOperator })
                : t("cl3_profile_wallet.phone_format_hint")}
            </div>
          </div>

          <div className="pf-field" style={{ marginTop: 14 }}>
            <span className="pf-label">{t("cl3_profile_wallet.recipient_number_label")}</span>
            <div className="pf-recv">
              <span className="pf-recv-n">
                <span
                  className={`pf-op-dot ${depositProvider === "ORANGE_MONEY" ? "orange" : "mtn"}`}
                  style={{ width: 16, height: 16 }}
                />
                {BELIVAY_RECEIVERS[depositProvider]}
              </span>
              <span className="pf-muted-sm">{t("cl3_profile_wallet.official_account")}</span>
            </div>
          </div>

          <div className="pf-form-grid" style={{ marginTop: 14 }}>
            <div className="pf-field">
              <label className="pf-label" htmlFor="belivay-deposit-amount">{t("cl3_profile_wallet.amount_label")}</label>
              <input
                id="belivay-deposit-amount"
                className="pf-input"
                inputMode="numeric"
                placeholder={t("cl3_profile_wallet.amount_placeholder")}
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value.replace(/[^\d\s]/g, ""))}
              />
            </div>
            <div className="pf-field">
              <span className="pf-label">{t("cl3_profile_wallet.new_estimated_balance")}</span>
              <div className="pf-estimate">
                {validAmount ? formatXaf(account.availableXaf + validAmount) : t("cl3_profile_wallet.estimate_placeholder")}
              </div>
            </div>
          </div>

          <div className="pf-form-actions">
            <button type="button" className="pf-btn-accent" onClick={handleDeposit}>
              <ArrowDownToLine size={14} />{t("cl3_profile_wallet.confirm_deposit")}
            </button>
            <button type="button" className="pf-btn-ghost" onClick={handleResetDeposit}>
              <RotateCcw size={13} />{t("cl3_profile_wallet.reset")}
            </button>
          </div>
        </section>

        {account.deposits.length > 0 ? (
          <section className="pf-glass-panel pf-anim">
            <div className="pf-card-title pf-mb">{t("cl3_profile_wallet.deposit_history")}</div>
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
                    {deposit.status === "CREDITED" ? t("cl3_profile_wallet.credited") : t("cl3_profile_wallet.pending_validation")}
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
              {t("cl3_profile_wallet.pay_premium_subscription")}
            </div>
          </div>

          <div className="pf-plan-current">
            <div className="pf-plan-k">{t("cl3_profile_wallet.current_plan")}</div>
            <div className="pf-plan-name">{currentPlan ? currentPlan.name : t("cl3_profile_wallet.free_plan")}</div>
            <div className="pf-plan-sub">
              {currentPlan && account.planExpiresAt
                ? t("cl3_profile_wallet.active_until", { date: new Date(account.planExpiresAt).toLocaleDateString("fr-FR") })
                : t("cl3_profile_wallet.go_premium_hint")}
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
                    {plan.priceXaf.toLocaleString("fr-FR")} FCFA<span>{t("cl3_profile_wallet.per_month")}</span>
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
                    title={affordable ? undefined : t("cl3_profile_wallet.insufficient_balance")}
                  >
                    {isCurrent ? t("cl3_profile_wallet.renew_cta") : t("cl3_profile_wallet.pay_cta")}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pf-muted-sm" style={{ marginTop: 12, textAlign: "center" }}>
            {t("cl3_profile_wallet.funds_usage_note")}
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
            <div className="pf-panel-title">{t("cl3_profile_settings.title")}</div>
            <div className="pf-panel-sub">{t("cl3_profile_settings.subtitle")}</div>
          </div>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">{t("cl3_profile_settings.appearance")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.appearance_sub")}</div>
          </div>
          <button type="button" className="pf-btn-ghost" onClick={toggleTheme}>
            {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "dark" ? t("cl3_profile_settings.dark") : t("cl3_profile_settings.light")}
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">{t("cl3_profile_settings.language")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.language_sub")}</div>
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
            <div className="pf-toggle-t">{t("cl3_profile_settings.text_size")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.text_size_sub")}</div>
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
            <div className="pf-toggle-t">{t("cl3_profile_settings.colorblind_mode")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.colorblind_mode_sub")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={daltonianMode}
            aria-label={t("cl3_profile_settings.colorblind_mode")}
            className={`pf-switch${daltonianMode ? " on" : ""}`}
            onClick={() => setDaltonianMode((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">{t("cl3_profile_settings.newsletter")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.newsletter_sub")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pfNewsletter}
            aria-label={t("cl3_profile_settings.newsletter")}
            className={`pf-switch${pfNewsletter ? " on" : ""}`}
            onClick={() => setPfNewsletter((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-toggle-row">
          <div>
            <div className="pf-toggle-t">{t("cl3_profile_settings.sms_notifications")}</div>
            <div className="pf-muted-sm">{t("cl3_profile_settings.sms_notifications_sub")}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pfSms}
            aria-label={t("cl3_profile_settings.sms_notifications")}
            className={`pf-switch${pfSms ? " on" : ""}`}
            onClick={() => setPfSms((value) => !value)}
          >
            <span />
          </button>
        </div>

        <div className="pf-form-actions">
          <button type="button" className="pf-btn-accent" onClick={handleSaveProfile} disabled={pfSaving}>
            <Check size={14} />{pfSaving ? t("cl3_profile_settings.saving") : t("cl3_profile_settings.save_preferences")}
          </button>
        </div>
      </section>

      <section className="pf-glass-panel pf-anim pf-supportrow">
        <button type="button" className="pf-support-item" onClick={() => openPanel("securite")}>
          <span className="pf-support-ic accent"><Shield size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">{t("cl3_profile_settings.security_and_password")}</span>
            <span className="pf-muted-sm">{t("cl3_profile_settings.security_and_password_sub")}</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => navigate("/notifications")}>
          <span className="pf-support-ic"><Bell size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">{t("cl3_profile_settings.notification_center")}</span>
            <span className="pf-muted-sm">{t("cl3_profile_settings.notification_center_sub")}</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => navigate("/help")}>
          <span className="pf-support-ic"><HelpCircle size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t">{t("cl3_profile_settings.help_center")}</span>
            <span className="pf-muted-sm">{t("cl3_profile_settings.help_center_sub")}</span>
          </span>
          <ArrowRight size={16} className="pf-muted" />
        </button>
        <button type="button" className="pf-support-item" onClick={() => { logout(); navigate("/"); }}>
          <span className="pf-support-ic"><LogOut size={18} /></span>
          <span className="pf-support-txt">
            <span className="pf-support-t" style={{ color: "#dc2626" }}>{t("cl3_profile_settings.logout")}</span>
            <span className="pf-muted-sm">{t("cl3_profile_settings.logout_sub")}</span>
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
    { key: "dashboard", label: t("cl3_profile_nav.overview"), icon: Home, panel: "dashboard" },
    { key: "orders", label: t("cl3_profile_nav.orders"), icon: Package, to: "/orders" },
    { key: "wishlist", label: t("cl3_profile_nav.favorites"), icon: Heart, to: "/wishlist" },
    { key: "messages", label: t("cl3_profile_nav.messages"), icon: MessageSquare, panel: "messages", badge: unreadMessages || undefined },
    { key: "fidelite", label: t("cl3_profile_nav.loyalty"), icon: Award, panel: "fidelite" },
  ];
  const accountNav: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    panel: PanelId;
  }> = [
    { key: "profil", label: t("cl3_profile_nav.profile"), icon: User, panel: "profil" },
    { key: "adresses", label: t("cl3_profile_nav.addresses"), icon: MapPin, panel: "adresses" },
    { key: "paiements", label: t("cl3_profile_nav.payments"), icon: CreditCard, panel: "paiements" },
    { key: "historique-paiements", label: t("cl3_profile_nav.payment_history"), icon: Wallet, panel: "historique-paiements" },
    { key: "parrain", label: t("cl3_profile_nav.referral"), icon: Gift, panel: "parrain" },
    { key: "securite", label: t("cl3_profile_nav.security"), icon: Shield, panel: "securite" },
    { key: "compte-belivay", label: t("cl3_profile_nav.belivay_account"), icon: Building2, panel: "compte-belivay" },
    { key: "reglages", label: t("cl3_profile_nav.settings"), icon: Settings, panel: "reglages" },
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
    { key: "dashboard", label: t("cl3_profile_nav.home"), icon: Home, panel: "dashboard" },
    { key: "profil", label: t("cl3_profile_nav.profile"), icon: User, panel: "profil" },
    { key: "adresses", label: t("cl3_profile_nav.addresses"), icon: MapPin, panel: "adresses" },
    { key: "paiements", label: t("cl3_profile_nav.payment"), icon: CreditCard, panel: "paiements" },
    { key: "fidelite", label: t("cl3_profile_nav.loyalty"), icon: Award, panel: "fidelite" },
    { key: "parrain", label: t("cl3_profile_nav.referral"), icon: Gift, panel: "parrain" },
    { key: "messages", label: t("cl3_profile_nav.messages"), icon: MessageSquare, panel: "messages", badge: unreadMessages || undefined },
    { key: "securite", label: t("cl3_profile_nav.security"), icon: Shield, panel: "securite" },
    { key: "compte-belivay", label: t("cl3_profile_nav.belivay_account"), icon: Building2, panel: "compte-belivay" },
    { key: "reglages", label: t("cl3_profile_nav.settings"), icon: Settings, panel: "reglages" },
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
      label: t("cl3_profile_nav.orders"),
      icon: Package,
      badge: orderCount || undefined,
      active: false,
      onSelect: () => navigate("/orders"),
    },
    {
      key: "favorites",
      label: t("cl3_profile_nav.favorites"),
      icon: Heart,
      badge: favoritesCount || undefined,
      active: false,
      onSelect: () => navigate("/wishlist"),
    },
    {
      key: "messages",
      label: t("cl3_profile_nav.messages"),
      icon: MessageSquare,
      badge: unreadMessages || undefined,
      active: activePanel === "messages",
      onSelect: () => openPanel("messages"),
    },
    {
      key: "wallet",
      label: t("cl3_profile_nav.wallet"),
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
                <span><Calendar size={13} />{t("cl3_profile_shell.member_since", { date: memberSince })}</span>
              )}
              <span><MapPin size={13} />{defaultCity}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pf-chip"><Award size={14} style={{ color: "var(--pf-accent)" }} />{fidelityTier} · {fidelityPoints.toLocaleString("fr-FR")} pts</span>
            <button type="button" className="pf-btn-ghost" onClick={() => openPanel("profil")}>
              <Pencil size={13} />{t("cl3_profile_shell.edit")}
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
            aria-label={t("cl3_profile_shell.view_loyalty_program")}
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
            <div className="pf-sec">{t("cl3_profile_shell.nav_main")}</div>
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

            <div className="pf-sec">{t("cl3_profile_shell.nav_account")}</div>
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
              <span style={{ flex: 1 }}>{isVendor ? t("cl3_profile_dashboard.seller_space") : t("cl3_profile_dashboard.become_seller")}</span>
            </button>
            <button type="button" className="pf-nav" onClick={() => { logout(); navigate("/"); }}>
              <LogOut size={17} />
              <span style={{ flex: 1 }}>{t("cl3_profile_settings.logout")}</span>
            </button>

            <div className="pf-a11y">
              <div className="pf-sec" style={{ padding: "0 0 8px" }}>{t("cl3_profile_shell.accessibility")}</div>
              <div className="pf-a11y-row">
                <span className="pf-a11y-l">{t("cl3_profile_settings.appearance")}</span>
                <button type="button" className="pf-btn-ghost" onClick={toggleTheme} aria-label={t("cl3_profile_shell.toggle_theme")}>
                  {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  {theme === "dark" ? t("cl3_profile_settings.dark") : t("cl3_profile_settings.light")}
                </button>
              </div>
              <div className="pf-a11y-row">
                <span className="pf-a11y-l">{t("cl3_profile_settings.text_size")}</span>
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
                <span className="pf-a11y-l">{t("cl3_profile_settings.colorblind_mode")}</span>
                <button
                  type="button"
                  onClick={() => setDaltonianMode((v) => !v)}
                  aria-label={t("cl3_profile_settings.colorblind_mode")}
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
            showToast(t("cl3_profile_account.toast_photo_cropped"), "success");
          }}
        />
      )}
    </div>
  );
}
