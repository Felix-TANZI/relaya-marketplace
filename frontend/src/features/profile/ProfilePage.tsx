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
  Smartphone,
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
import { ordersApi } from "@/services/api/orders";
import type { Order } from "@/types/order";
import { useAuth } from "@/context/AuthContext";
import { getFavoriteProductIds } from "@/lib/favorites";
import { useCart } from "@/context/CartContext";
import PhoneInput from './PhoneInput';
import { useTranslation } from "react-i18next";
import SessionsCard from './SessionsCard';
import AvatarCropDialog from '@/components/profile/AvatarCropDialog';

type FontSize = "small" | "normal" | "large";
type PanelId =
  | "dashboard"
  | "profil"
  | "adresses"
  | "paiements"
  | "fidelite"
  | "parrain"
  | "messages"
  | "vendeur"
  | "securite";
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

const INITIAL_SUPPORT_CONVERSATIONS: Conversation[] = [
  {
    id: "support-1",
    name: "Support BelivaY",
    preview: "Votre demande a été prise en charge.",
    time: "Aujourd'hui",
    unread: 2,
    type: "support",
    messages: [
      { id: "m1", author: "Support", text: "Bonjour, nous avons bien reçu votre demande.", time: "09:12" },
      { id: "m2", author: "Vous", text: "Merci, je voulais vérifier le statut de mon remboursement.", time: "09:18" },
      { id: "m3", author: "Support", text: "Le dossier est en cours de traitement, retour sous 24h.", time: "09:20" },
    ],
  },
  {
    id: "support-2",
    name: "Support abonnement",
    preview: "Votre dépôt Mobile Money a été validé.",
    time: "Hier",
    unread: 0,
    type: "support",
    messages: [
      { id: "m7", author: "Support", text: "Votre dépôt a bien été validé sur votre compte.", time: "Hier" },
    ],
  },
];

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
  const [payMethods, setPayMethods] = useState<Array<{ id: string; operator: "MTN" | "ORANGE"; phone: string; default: boolean }>>([]);
  const [payDraft, setPayDraft] = useState<{ operator: "MTN" | "ORANGE"; phone: string }>({ operator: "MTN", phone: "" });
  const [activePanel, setActivePanel] = useState<PanelId>("dashboard");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [daltonianMode, setDaltonianMode] = useState(false);
  const [messageTab, setMessageTab] = useState<MessageTab>("all");
  const [selectedConversationId, setSelectedConversationId] = useState(INITIAL_SUPPORT_CONVERSATIONS[0].id);
  const [chatDraft, setChatDraft] = useState("");
  const [supportConversations, setSupportConversations] = useState(INITIAL_SUPPORT_CONVERSATIONS);
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
    try {
      const raw = localStorage.getItem("belivay-payment-methods");
      if (raw) setPayMethods(JSON.parse(raw) as Array<{ id: string; operator: "MTN" | "ORANGE"; phone: string; default: boolean }>);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const panel = (searchParams.get("panel") as PanelId) || "dashboard";
    const tab = (searchParams.get("tab") as MessageTab) || "all";
    setActivePanel(panel);
    setMessageTab(tab === "support" || tab === "litige" || tab === "all" ? tab : "all");
  }, [searchParams]);

  useEffect(() => {
    const syncDisputes = () => setDisputes(getStoredOrderDisputes());
    window.addEventListener("belivay-disputes-updated", syncDisputes);
    return () => window.removeEventListener("belivay-disputes-updated", syncDisputes);
  }, []);

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
  const TIER_THRESHOLDS = [0, 500, 1500, 3000];
  const nextTierThreshold = TIER_THRESHOLDS.find((threshold) => threshold > fidelityPoints) ?? 3000;
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

  const savePayMethods = (list: Array<{ id: string; operator: "MTN" | "ORANGE"; phone: string; default: boolean }>) => {
    setPayMethods(list);
    try {
      localStorage.setItem("belivay-payment-methods", JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const addPayMethod = () => {
    if (!payDraft.phone) {
      showToast("Renseignez le numéro.", "error");
      return;
    }
    savePayMethods([
      ...payMethods,
      { id: `pm-${Date.now()}`, operator: payDraft.operator, phone: payDraft.phone, default: payMethods.length === 0 },
    ]);
    setPayDraft({ operator: "MTN", phone: "" });
    showToast("Moyen de paiement ajouté.", "success");
  };

  const removePayMethod = (id: string) => {
    savePayMethods(payMethods.filter((method) => method.id !== id));
  };

  const setDefaultPayMethod = (id: string) => {
    savePayMethods(payMethods.map((method) => ({ ...method, default: method.id === id })));
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
      setSupportConversations((current) =>
        current.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                preview: chatDraft.trim(),
                time: "À l'instant",
                messages: [
                  ...conversation.messages,
                  {
                    id: `${conversation.id}-${Date.now()}`,
                    author: "Vous",
                    text: chatDraft.trim(),
                    time: "Maintenant",
                  },
                ],
              }
            : conversation,
        ),
      );
    }

    setChatDraft("");
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
      <div className="pf-panel-head">
        <div>
          <div className="pf-panel-title">Mes paiements</div>
          <div className="pf-panel-sub">Vos comptes Mobile Money enregistrés sur cet appareil</div>
        </div>
      </div>

      {payMethods.length === 0 ? (
        <div className="pf-empty">
          <span className="pf-empty-ic"><Wallet size={22} /></span>
          <div className="pf-empty-t">Aucun moyen de paiement</div>
          <div className="pf-muted-sm">Ajoutez un compte Mobile Money ci-dessous.</div>
        </div>
      ) : (
        <div className="pf-addr-grid" style={{ marginBottom: 16 }}>
          {payMethods.map((method) => (
            <div key={method.id} className={`pf-addr${method.default ? " def" : ""}`}>
              <div className="pf-addr-label">
                <span className="pf-addr-ic" style={method.operator === "ORANGE" ? { background: "rgba(255,140,0,.16)", color: "#ff8c00" } : undefined}><Smartphone size={14} /></span>
                {method.operator === "MTN" ? "MTN Mobile Money" : "Orange Money"}
                {method.default ? <span className="pf-badge-soft">Par défaut</span> : null}
              </div>
              <div className="pf-addr-line">{method.phone || "—"}</div>
              <div className="pf-addr-actions">
                {!method.default ? (
                  <button type="button" className="pf-btn-ghost" onClick={() => setDefaultPayMethod(method.id)}>Par défaut</button>
                ) : null}
                <button type="button" className="pf-btn-danger" onClick={() => removePayMethod(method.id)}><Trash2 size={13} />Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pf-card-title pf-mb">Ajouter un compte</div>
      <div className="pf-pay-form">
        <div className="pf-type-toggle">
          <button type="button" className={`pf-type-btn${payDraft.operator === "MTN" ? " on" : ""}`} onClick={() => setPayDraft((d) => ({ ...d, operator: "MTN" }))}><Smartphone size={13} />MTN</button>
          <button type="button" className={`pf-type-btn${payDraft.operator === "ORANGE" ? " on" : ""}`} onClick={() => setPayDraft((d) => ({ ...d, operator: "ORANGE" }))}><Smartphone size={13} />Orange</button>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <PhoneInput value={payDraft.phone} onChange={(v) => setPayDraft((d) => ({ ...d, phone: v }))} placeholder="6XX XXX XXX" />
        </div>
        <button type="button" className="pf-btn-accent" onClick={addPayMethod}><Plus size={14} />Ajouter</button>
      </div>

      <div className="pf-info-note">
        <span className="pf-info-ic"><Wallet size={15} /></span>
        <div>
          <div className="pf-toggle-t" style={{ fontSize: 13 }}>Modes acceptés sur BelivaY</div>
          <div className="pf-muted-sm">Mobile Money (MTN, Orange) et paiement en ligne. Le règlement s'effectue au moment de la commande.</div>
        </div>
      </div>
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

  const renderPanel = () => {
    switch (activePanel) {
      case "profil":
        return renderProfil();
      case "adresses":
        return renderAdresses();
      case "paiements":
        return renderPaiements();
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
    { key: "parrain", label: "Parrainage", icon: Gift, panel: "parrain" },
    { key: "securite", label: "Sécurité", icon: Shield, panel: "securite" },
  ];

  return (
    <div
      className={`pf-root min-h-screen px-4 md:px-8 lg:px-14 py-6 md:py-8 ${fontSizeClassMap[fontSize]}`}
      style={daltonianMode ? { filter: "contrast(1.08) saturate(.72)" } : undefined}
    >
      <style>{`
.pf-root{--pf-accent:#f4610f;--pf-accent2:#ff8a3d;--pf-text:#1a1420;--pf-text2:#5b5563;--pf-muted:#9b93a3;--pf-glass:rgba(255,255,255,.68);--pf-glass-border:rgba(255,255,255,.9);--pf-border:rgba(120,80,50,.14);--pf-bstrong:rgba(120,80,50,.22);--pf-s3:rgba(244,97,15,.10);--pf-asoft:rgba(244,97,15,.12);--pf-aring:rgba(244,97,15,.4);--pf-shadow:0 10px 40px rgba(244,97,15,.10),0 2px 10px rgba(20,10,5,.05);color:var(--pf-text);background:radial-gradient(1100px 620px at 6% -8%,rgba(255,176,110,.42),transparent 60%),radial-gradient(880px 520px at 96% -2%,rgba(255,138,190,.26),transparent 55%),radial-gradient(1000px 720px at 55% 108%,rgba(150,168,255,.20),transparent 60%),#f5f3f7;background-attachment:fixed;}
.dark .pf-root{--pf-accent:#ff8a3d;--pf-accent2:#ffa661;--pf-text:#f5f2f7;--pf-text2:#b3aec0;--pf-muted:#7f7990;--pf-glass:rgba(26,24,32,.55);--pf-glass-border:rgba(255,255,255,.09);--pf-border:rgba(255,255,255,.08);--pf-bstrong:rgba(255,255,255,.16);--pf-s3:rgba(255,255,255,.07);--pf-asoft:rgba(255,138,61,.16);--pf-aring:rgba(255,138,61,.45);--pf-shadow:0 14px 44px rgba(0,0,0,.5),0 2px 12px rgba(0,0,0,.35);background:radial-gradient(1100px 620px at 6% -8%,rgba(140,60,12,.55),transparent 60%),radial-gradient(880px 520px at 96% -2%,rgba(90,24,70,.45),transparent 55%),radial-gradient(1000px 720px at 55% 108%,rgba(34,34,90,.4),transparent 60%),#09080c;}
@keyframes pfUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pf-anim{opacity:0;animation:pfUp .55s cubic-bezier(.22,.61,.36,1) forwards}
.pf-anim:nth-child(1){animation-delay:0s}.pf-anim:nth-child(2){animation-delay:.06s}.pf-anim:nth-child(3){animation-delay:.12s}.pf-anim:nth-child(4){animation-delay:.18s}.pf-anim:nth-child(5){animation-delay:.24s}.pf-anim:nth-child(6){animation-delay:.3s}.pf-anim:nth-child(7){animation-delay:.36s}
.pf-glass-panel{border-radius:18px;padding:20px;background:var(--pf-glass);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow)}
.pf-ident{display:flex;align-items:center;gap:16px;flex-wrap:wrap;border-radius:22px;padding:20px 22px;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);position:relative;overflow:hidden}
.pf-ident::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(244,97,15,.1),transparent 42%);pointer-events:none}
.pf-avatar{width:58px;height:58px;border-radius:50%;flex-shrink:0;overflow:hidden;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;box-shadow:0 8px 22px rgba(244,97,15,.4);position:relative;z-index:1}
.pf-avatar img{width:100%;height:100%;object-fit:cover}
.pf-name{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--pf-text);position:relative;z-index:1}
.pf-meta{margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--pf-text2);position:relative;z-index:1}
.pf-meta span{display:inline-flex;align-items:center;gap:6px}.pf-meta svg{color:var(--pf-accent)}
.pf-chip{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:600;color:var(--pf-accent);background:var(--pf-asoft);border:1px solid var(--pf-aring);white-space:nowrap;position:relative;z-index:1}
.pf-btn-ghost{border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.4);color:var(--pf-text);border-radius:999px;padding:8px 15px;font-size:12.5px;font-weight:600;cursor:pointer;transition:.18s;font-family:inherit;display:inline-flex;align-items:center;gap:6px;position:relative;z-index:1}
.dark .pf-btn-ghost{background:rgba(255,255,255,.06)}
.pf-btn-ghost:hover{border-color:var(--pf-accent);color:var(--pf-accent);transform:translateY(-1px)}
.pf-grid{display:grid;grid-template-columns:242px minmax(0,1fr);gap:22px;margin-top:22px}
@media(max-width:1023px){.pf-grid{grid-template-columns:1fr}}
.pf-navcard{border-radius:22px;padding:9px;align-self:start;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow)}
.pf-sec{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--pf-muted);padding:13px 13px 6px}
.pf-nav{position:relative;display:flex;align-items:center;gap:11px;width:100%;padding:10px 13px;border-radius:13px;font-size:13.5px;font-weight:500;color:var(--pf-text2);cursor:pointer;background:transparent;border:none;text-align:left;transition:all .18s;font-family:inherit}
.pf-nav svg{width:18px;height:18px;color:var(--pf-muted);transition:color .18s}
.pf-nav:hover{background:var(--pf-asoft);color:var(--pf-text)}.pf-nav:hover svg{color:var(--pf-accent)}
.pf-nav.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;font-weight:600;box-shadow:0 8px 20px rgba(244,97,15,.34)}
.pf-nav.on svg{color:#fff}
.pf-badge{margin-left:auto;font-size:11px;font-weight:700;min-width:18px;height:18px;padding:0 5px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--pf-accent);color:#fff}
.pf-nav.on .pf-badge{background:rgba(255,255,255,.28)}
.pf-navsep{height:1px;background:var(--pf-border);margin:8px 11px}
.pf-a11y{border-top:1px solid var(--pf-border);padding:13px 11px 6px;margin-top:5px}
.pf-a11y-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.pf-a11y-l{font-size:12px;font-weight:600;color:var(--pf-text2)}
.pf-stack{display:flex;flex-direction:column;gap:16px}
.pf-hello{font-size:26px;font-weight:800;letter-spacing:-.03em;color:var(--pf-text)}
.pf-hello-sub{font-size:14px;color:var(--pf-text2);margin-top:4px}
.pf-card{border-radius:20px;padding:20px;background:var(--pf-glass);backdrop-filter:blur(22px) saturate(1.6);-webkit-backdrop-filter:blur(22px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);transition:transform .2s,box-shadow .2s}
.pf-card:hover{transform:translateY(-2px)}
.pf-row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pf-mb{margin-bottom:12px}.pf-mt{margin-top:10px}
.pf-k{font-size:11px;font-weight:700;color:var(--pf-accent);text-transform:uppercase;letter-spacing:.05em}
.pf-t{font-size:16px;font-weight:700;color:var(--pf-text);margin-top:3px}
.pf-sub{font-size:13px;color:var(--pf-text2);margin-top:3px}
.pf-card-title{font-size:14px;font-weight:700;color:var(--pf-text)}
.pf-muted-sm{font-size:12px;color:var(--pf-muted)}.pf-muted{color:var(--pf-muted)}
.pf-btn-accent{border:none;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;border-radius:999px;padding:9px 18px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:.18s;font-family:inherit;white-space:nowrap;box-shadow:0 8px 20px rgba(244,97,15,.34)}
.pf-btn-accent:hover{transform:translateY(-2px);filter:brightness(1.06)}
.pf-tk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px}
.pf-steps{position:relative;padding:0 2px}
.pf-track{position:absolute;top:10px;left:12.5%;right:12.5%;height:3px;border-radius:3px;background:var(--pf-s3)}
.pf-fill{position:absolute;top:10px;left:12.5%;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 0 14px rgba(244,97,15,.6);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}
.pf-steps-row{position:relative;display:flex}.pf-st{flex:1;text-align:center}
.pf-d{width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto}
.pf-d.done,.pf-d.cur{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.45)}
.pf-d.cur{box-shadow:0 0 0 6px var(--pf-asoft),0 5px 14px rgba(244,97,15,.45)}
.pf-d.todo{background:var(--pf-s3);border:1.5px solid var(--pf-bstrong)}
.pf-lbl{font-size:11px;color:var(--pf-text2);margin-top:9px}.pf-lbl.cur{color:var(--pf-accent);font-weight:700}
.pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:640px){.pf-stats{grid-template-columns:repeat(2,1fr)}}
.pf-stat{display:flex;align-items:center;gap:13px;border-radius:18px;padding:16px;background:var(--pf-glass);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);transition:transform .2s}
.pf-stat:hover{transform:translateY(-3px)}
.pf-stat-ic{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
.pf-stat-ic.o{background:linear-gradient(135deg,#ffa04d,#f4610f);box-shadow:0 6px 16px rgba(244,97,15,.4)}
.pf-stat-ic.b{background:linear-gradient(135deg,#5bb8ff,#2563eb);box-shadow:0 6px 16px rgba(37,99,235,.35)}
.pf-stat-ic.p{background:linear-gradient(135deg,#ff86bb,#e11d74);box-shadow:0 6px 16px rgba(225,29,116,.35)}
.pf-stat-ic.a{background:linear-gradient(135deg,#ffd45c,#f59e0b);box-shadow:0 6px 16px rgba(245,158,11,.35)}
.pf-stat-body{min-width:0;display:block}
.pf-stat-n{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--pf-text);line-height:1.1}
.pf-stat-l{display:block;font-size:12px;color:var(--pf-text2);margin-top:4px}
.pf-twoup{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}
@media(max-width:640px){.pf-twoup{grid-template-columns:1fr}}
.pf-bar{height:9px;border-radius:999px;background:var(--pf-s3);overflow:hidden}
.pf-bar>i{display:block;height:100%;background:linear-gradient(90deg,var(--pf-accent2),var(--pf-accent));border-radius:999px;box-shadow:0 0 12px rgba(244,97,15,.5);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}
.pf-notif{display:flex;align-items:center;gap:13px;text-align:left;cursor:pointer;font-family:inherit;transition:transform .2s}
.pf-notif:hover{transform:translateY(-2px)}
.pf-notif-ic{position:relative;flex-shrink:0;width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent)}
.pf-notif-b{position:absolute;top:-5px;right:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(244,97,15,.4)}
.pf-notif-t{display:block;font-size:13px;font-weight:700;color:var(--pf-text)}
.pf-order-line{display:flex;align-items:center;gap:13px;padding:12px 0;border-top:1px solid var(--pf-border)}
.pf-order-line:first-of-type{border-top:none}
.pf-order-ic{width:38px;height:38px;border-radius:12px;background:var(--pf-asoft);color:var(--pf-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pf-order-mid{flex:1;min-width:0}
.pf-order-id{font-size:13px;font-weight:700;color:var(--pf-text)}
.pf-order-total{font-size:13px;font-weight:700;color:var(--pf-accent);white-space:nowrap}
.pf-link{border:none;background:transparent;color:var(--pf-accent);font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.pf-supportrow{padding:6px 20px}
.pf-support-item{display:flex;align-items:center;gap:13px;width:100%;padding:13px 0;border:none;border-top:1px solid var(--pf-border);background:transparent;cursor:pointer;text-align:left;font-family:inherit;transition:padding-left .18s}
.pf-support-item:first-of-type{border-top:none}
.pf-support-item:hover{padding-left:4px}
.pf-support-ic{width:38px;height:38px;border-radius:12px;background:var(--pf-s3);color:var(--pf-text2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pf-support-ic.accent{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.35)}
.pf-support-txt{flex:1;min-width:0}
.pf-support-t{display:block;font-size:13.5px;font-weight:600;color:var(--pf-text)}
.pf-pill{display:inline-flex;align-items:center;padding:6px 13px;border-radius:999px;font-size:11.5px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 5px 14px rgba(244,97,15,.35);white-space:nowrap;flex-shrink:0}.pf-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media(max-width:640px){.pf-quick{grid-template-columns:repeat(2,1fr)}}.pf-quick-tile{display:flex;flex-direction:column;align-items:flex-start;gap:11px;padding:16px;border-radius:18px;background:var(--pf-glass);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:var(--pf-text);text-align:left;transition:transform .2s}.pf-quick-tile:hover{transform:translateY(-3px)}.pf-quick-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff}.pf-quick-ic.o{background:linear-gradient(135deg,#ffa04d,#f4610f);box-shadow:0 6px 16px rgba(244,97,15,.4)}.pf-quick-ic.b{background:linear-gradient(135deg,#5bb8ff,#2563eb);box-shadow:0 6px 16px rgba(37,99,235,.35)}.pf-quick-ic.p{background:linear-gradient(135deg,#ff86bb,#e11d74);box-shadow:0 6px 16px rgba(225,29,116,.35)}.pf-quick-ic.a{background:linear-gradient(135deg,#ffd45c,#f59e0b);box-shadow:0 6px 16px rgba(245,158,11,.35)}.pf-anim:nth-child(8){animation-delay:.42s}.pf-anim:nth-child(9){animation-delay:.48s}.pf-anim:nth-child(10){animation-delay:.54s}
.pf-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap}.pf-panel-title{font-size:19px;font-weight:800;letter-spacing:-.02em;color:var(--pf-text)}.pf-panel-sub{font-size:13px;color:var(--pf-text2);margin-top:2px}.pf-avatar-row{display:flex;align-items:center;gap:16px;margin-bottom:22px;flex-wrap:wrap}.pf-avatar-lg{width:76px;height:76px;border-radius:50%;flex-shrink:0;overflow:hidden;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px;box-shadow:0 10px 26px rgba(244,97,15,.4)}.pf-avatar-lg img{width:100%;height:100%;object-fit:cover}.pf-avatar-actions{display:flex;gap:9px;flex-wrap:wrap}.pf-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}@media(max-width:640px){.pf-form-grid{grid-template-columns:1fr}}.pf-field{display:flex;flex-direction:column;gap:6px}.pf-col2{grid-column:1/-1}.pf-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--pf-muted)}.pf-input{width:100%;border-radius:12px;border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.9);padding:11px 14px;font-size:13.5px;color:var(--pf-text);outline:none;font-family:inherit;transition:border-color .18s,box-shadow .18s}.dark .pf-input{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}.pf-input::placeholder{color:var(--pf-muted)}.pf-input:focus{border-color:var(--pf-accent);box-shadow:0 0 0 3px var(--pf-asoft)}.pf-textarea{min-height:92px;resize:vertical;line-height:1.6}.pf-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 0;border-top:1px solid var(--pf-border)}.pf-toggle-t{font-size:13.5px;font-weight:600;color:var(--pf-text)}.pf-switch{position:relative;width:44px;height:26px;border-radius:999px;border:none;cursor:pointer;background:var(--pf-bstrong);transition:background .2s;flex-shrink:0}.pf-switch.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));box-shadow:0 4px 12px rgba(244,97,15,.35)}.pf-switch span{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}.pf-switch.on span{left:21px}.pf-form-actions{display:flex;gap:11px;margin-top:20px;flex-wrap:wrap}.pf-empty{text-align:center;padding:30px 16px}.pf-empty-ic{display:inline-flex;width:52px;height:52px;border-radius:16px;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent);margin-bottom:12px}.pf-empty-t{font-size:14px;font-weight:700;color:var(--pf-text)}.pf-addr-list{display:flex;flex-direction:column;gap:12px}.pf-addr{border-radius:16px;padding:16px;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.42);transition:border-color .2s}.dark .pf-addr{background:rgba(255,255,255,.04)}.pf-addr.def{border:1.5px solid var(--pf-accent);background:var(--pf-asoft)}.pf-addr-label{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--pf-text);margin-bottom:8px;flex-wrap:wrap}.pf-addr-ic{display:inline-flex;width:28px;height:28px;border-radius:9px;align-items:center;justify-content:center;background:var(--pf-asoft);color:var(--pf-accent)}.pf-addr-line{font-size:13px;line-height:1.7;color:var(--pf-text2)}.pf-addr-edit{display:flex;flex-direction:column;gap:9px;margin-top:4px}.pf-addr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.pf-badge-soft{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:700;background:var(--pf-accent);color:#fff}.pf-btn-danger{display:inline-flex;align-items:center;gap:6px;border-radius:999px;border:1px solid rgba(220,38,38,.4);background:rgba(220,38,38,.08);color:#dc2626;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.18s}.pf-btn-danger:hover{background:rgba(220,38,38,.16)}.pf-hero{position:relative;overflow:hidden;border-radius:22px;padding:26px;color:#fff;background:linear-gradient(120deg,#f4610f,#ff9d4d 60%,#ffb36b);box-shadow:0 16px 44px rgba(244,97,15,.4)}.pf-hero-glow{position:absolute;top:-40%;right:-8%;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 70%);pointer-events:none}.pf-hero-top{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;opacity:.92;position:relative;z-index:1}.pf-hero-pts{font-size:44px;font-weight:800;line-height:1.05;letter-spacing:-.02em;margin-top:4px;position:relative;z-index:1}.pf-hero-pts span{font-size:20px;font-weight:700;opacity:.85}.pf-hero-sub{font-size:13.5px;opacity:.92;margin:4px 0 18px;position:relative;z-index:1}.pf-hero-bar{position:relative;z-index:1;border-radius:14px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.25);padding:13px}.pf-hero-bar-head{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:8px}.pf-hero-track{height:8px;border-radius:999px;background:rgba(255,255,255,.28);overflow:hidden}.pf-hero-fill{height:100%;border-radius:999px;background:#fff;box-shadow:0 0 12px rgba(255,255,255,.7);transition:width 1.2s cubic-bezier(.22,.61,.36,1)}.pf-tier-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}@media(max-width:900px){.pf-tier-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.pf-tier-grid{grid-template-columns:1fr}}.pf-tier{border-radius:16px;padding:16px;text-align:center;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.4)}.dark .pf-tier{background:rgba(255,255,255,.04)}.pf-tier.on{border:1.5px solid var(--pf-accent);background:var(--pf-asoft);box-shadow:0 8px 22px rgba(244,97,15,.2)}.pf-tier-ic{display:inline-flex;width:48px;height:48px;border-radius:14px;align-items:center;justify-content:center;color:var(--pf-muted);margin-bottom:10px}.pf-tier.on .pf-tier-ic{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 6px 16px rgba(244,97,15,.4)}.pf-tier-name{font-size:15px;font-weight:800;color:var(--pf-text)}.pf-tier-range{font-size:11.5px;color:var(--pf-muted);margin-top:2px}.pf-tier-perk{font-size:12px;color:var(--pf-text2);margin-top:6px}.pf-tier-badge{display:inline-flex;margin-top:11px;padding:4px 11px;border-radius:999px;font-size:10px;font-weight:700;background:var(--pf-accent);color:#fff}.pf-hist{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--pf-border)}.pf-hist:first-of-type{border-top:none}.pf-hist-label{font-size:13px;font-weight:600;color:var(--pf-text)}.pf-hist-pts{font-size:13.5px;font-weight:800}.pf-hist-pts.pos{color:#16a34a}.pf-hist-pts.neg{color:#dc2626}
.pf-profile-grid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:16px;align-items:start}@media(max-width:1023px){.pf-profile-grid{grid-template-columns:1fr}}.pf-summary{margin-top:16px;border-top:1px solid var(--pf-border);padding-top:14px;text-align:left}.pf-summary-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0}.pf-summary-v{font-size:12.5px;font-weight:700;color:var(--pf-text)}.pf-lang{display:inline-flex;gap:5px}.pf-lang-btn{border:1px solid var(--pf-bstrong);background:transparent;color:var(--pf-text2);border-radius:999px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}.pf-lang-btn.on{background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(244,97,15,.3)}.pf-addr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:768px){.pf-addr-grid{grid-template-columns:1fr}}.pf-type-toggle{display:flex;gap:8px}.pf-type-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--pf-bstrong);background:transparent;color:var(--pf-text2);border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}.pf-type-btn.on{background:var(--pf-asoft);color:var(--pf-accent);border-color:var(--pf-accent)}.pf-phone{display:flex;align-items:center;border-radius:12px;border:1px solid var(--pf-bstrong);background:rgba(255,255,255,.9);overflow:hidden;transition:border-color .18s,box-shadow .18s}.dark .pf-phone{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}.pf-phone:focus-within{border-color:var(--pf-accent);box-shadow:0 0 0 3px var(--pf-asoft)}.pf-phone.invalid{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.12)}.pf-phone-country{display:flex;align-items:center;gap:6px;padding:11px 12px;background:var(--pf-asoft);border:none;border-right:1px solid var(--pf-bstrong);color:var(--pf-text);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}.pf-phone-input{flex:1;min-width:0;border:none;background:transparent;padding:11px 14px;font-size:13.5px;color:var(--pf-text);outline:none;font-family:inherit}.pf-phone-input::placeholder{color:var(--pf-muted)}.pf-phone-err{margin-top:6px;font-size:11.5px;font-weight:600;color:#dc2626}.pf-phone-menu{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:30;max-height:240px;overflow-y:auto;border-radius:14px;background:var(--pf-glass);backdrop-filter:blur(24px) saturate(1.6);-webkit-backdrop-filter:blur(24px) saturate(1.6);border:1px solid var(--pf-glass-border);box-shadow:var(--pf-shadow);padding:6px}.pf-phone-opt{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border:none;background:transparent;border-radius:10px;font-size:13px;color:var(--pf-text);cursor:pointer;font-family:inherit;text-align:left}.pf-phone-opt:hover{background:var(--pf-asoft)}.pf-phone-dial{font-size:12px;color:var(--pf-muted);font-weight:600}
.pf-pay-form{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;margin-bottom:6px}.pf-info-note{display:flex;gap:12px;align-items:flex-start;margin-top:18px;padding:14px;border-radius:14px;background:var(--pf-asoft);border:1px solid var(--pf-aring)}.pf-info-ic{display:inline-flex;width:34px;height:34px;flex-shrink:0;border-radius:10px;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff}.pf-vendor-active{display:flex;gap:13px;align-items:flex-start;padding:16px;border-radius:16px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.35);margin-bottom:6px}.pf-vendor-ic{display:inline-flex;width:44px;height:44px;flex-shrink:0;border-radius:13px;align-items:center;justify-content:center;background:linear-gradient(135deg,#34d399,#059669);color:#fff;box-shadow:0 6px 16px rgba(5,150,105,.35)}.pf-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}@media(max-width:768px){.pf-benefits{grid-template-columns:1fr}}.pf-benefit{display:flex;gap:11px;align-items:flex-start;padding:14px;border-radius:14px;border:1px solid var(--pf-glass-border);background:rgba(255,255,255,.4)}.dark .pf-benefit{background:rgba(255,255,255,.04)}.pf-benefit-ic{display:inline-flex;width:38px;height:38px;flex-shrink:0;border-radius:12px;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff;box-shadow:0 5px 14px rgba(244,97,15,.35)}.pf-benefit-t{font-size:13.5px;font-weight:700;color:var(--pf-text)}.pf-ref-code{font-size:18px;font-weight:800;letter-spacing:.06em;padding:10px 16px;border-radius:12px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff}.pf-step{display:flex;align-items:flex-start;gap:11px;font-size:13px;color:var(--pf-text2);padding:7px 0}.pf-step-n{flex-shrink:0;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:linear-gradient(135deg,var(--pf-accent2),var(--pf-accent));color:#fff}
`}</style>
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
