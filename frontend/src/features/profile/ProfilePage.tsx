import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  BadgePercent,
  Bell,
  Bike,
  Building2,
  CircleDollarSign,
  CreditCard,
  Gift,
  Heart,
  Home,
  Lock,
  MapPin,
  Medal,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  Store,
  Trash2,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import { authApi, type User as UserType } from "@/services/api/auth";
import { vendorsApi, type VendorProfile } from "@/services/api/vendors";
import { useToast } from "@/context/ToastContext";
import { getStoredProfileAvatar, getUserDisplayName, getUserInitials } from "@/lib/profileAvatar";
import {
  addDisputeMessage,
  getStoredOrderDisputes,
  type StoredOrderDispute,
} from "@/lib/orderDisputes";

type FontSize = "small" | "normal" | "large";
type PanelId =
  | "dashboard"
  | "profil"
  | "adresses"
  | "paiements"
  | "fidelite"
  | "parrain"
  | "messages"
  | "livreur"
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

const DASHBOARD_STATS = [
  { icon: Package, value: "2", label: "En cours", classes: "border-[#e5e7eb] bg-[#f9fafb] text-[#f47920]" },
  { icon: CircleDollarSign, value: "131K", label: "Dépensés", classes: "border-[rgba(244,121,32,.2)] bg-[linear-gradient(135deg,#fff4eb,#fff9f4)] text-[#f47920]" },
  { icon: Heart, value: "18,2K", label: "Économisés", classes: "border-[#DCFCE7] bg-[linear-gradient(135deg,#F0FDF4,#DCFCE7)] text-[#16A34A]" },
  { icon: Award, value: "940", label: "Points", classes: "border-[#FEF3C7] bg-[linear-gradient(135deg,#FFFBEB,#FEF3C7)] text-[#B45309]" },
];

const RECENT_ORDERS = [
  { icon: BadgePercent, id: "BK-12345", date: "15 Jan 2025", total: "14 500 FCFA" },
  { icon: Smartphone, id: "BK-12312", date: "12 Jan 2025", total: "155 000 FCFA" },
  { icon: Medal, id: "BK-12298", date: "08 Jan 2025", total: "16 500 FCFA" },
];

const BADGES = [
  { icon: Package, title: "Premier Achat", description: "Bienvenue !", earned: true },
  { icon: Star, title: "Testeur d'or", description: "5 avis laissés", earned: true },
  { icon: Trophy, title: "Fan de promos", description: "3 achats promo", earned: true },
  { icon: Medal, title: "Platinum VIP", description: "5000 pts requis", earned: false },
];

const POINTS_HISTORY = [
  { label: "Commande BK-12345", date: "15 Jan 2025", points: "+145 pts", positive: true },
  { label: "Commande BK-12201", date: "02 Jan 2025", points: "+360 pts", positive: true },
  { label: "Réduction utilisée", date: "28 Déc 2024", points: "-200 pts", positive: false },
  { label: "Parrainage Marie N.", date: "20 Déc 2024", points: "+100 pts", positive: true },
];

const REFERRALS = [
  { name: "Marie N.", date: "20 Déc", points: "+500 pts" },
  { name: "Paul T.", date: "15 Jan", points: "+500 pts" },
  { name: "Amina K.", date: "28 Jan", points: "+500 pts" },
];

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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserType | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId>("dashboard");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [daltonianMode, setDaltonianMode] = useState(false);
  const [messageTab, setMessageTab] = useState<MessageTab>("all");
  const [selectedConversationId, setSelectedConversationId] = useState(INITIAL_SUPPORT_CONVERSATIONS[0].id);
  const [chatDraft, setChatDraft] = useState("");
  const [supportConversations, setSupportConversations] = useState(INITIAL_SUPPORT_CONVERSATIONS);
  const [disputes, setDisputes] = useState<StoredOrderDispute[]>(() => getStoredOrderDisputes());
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [sellerForm, setSellerForm] = useState({
    shopName: "",
    category: "Mode & accessoires",
    city: "Yaoundé",
    phone: "",
    address: "",
    idDocument: "",
    motivation: "",
  });
  const [courierForm, setCourierForm] = useState({
    phone: "",
    city: "Yaoundé",
    zones: "Bastos, Centre-ville, Mvog-Ada",
    vehicle_type: "MOTORBIKE" as "MOTORBIKE" | "CAR" | "BIKE" | "TRICYCLE" | "VAN",
    id_card: "",
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
        if (profile.courier_profile) {
          setCourierForm({
            phone: profile.courier_profile.phone,
            city: profile.courier_profile.city,
            zones: profile.courier_profile.zones.join(", "),
            vehicle_type: profile.courier_profile.vehicle_type,
            id_card: profile.courier_profile.id_card,
          });
        }
        vendorsApi.getProfile().then(setVendorProfile).catch(() => setVendorProfile(null));
      })
      .catch(() => showToast("Erreur chargement profil", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

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
    phone: address.phone || user?.phone || "+237 690 000 000",
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

  const handleAddressUpdate = (id: string, field: "label" | "phone" | "line", value: string) => {
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

  const handleCourierField = (
    field: "phone" | "city" | "zones" | "vehicle_type" | "id_card",
    value: string,
  ) => {
    setCourierForm((current) => ({ ...current, [field]: value }));
  };

  const handleCourierApplication = async () => {
    try {
      const payload = {
        phone: courierForm.phone,
        city: courierForm.city,
        zones: courierForm.zones.split(",").map((zone) => zone.trim()).filter(Boolean),
        vehicle_type: courierForm.vehicle_type,
        id_card: courierForm.id_card,
      };

      if (user?.courier_profile) {
        await authApi.updateCourierApplication(payload);
      } else {
        await authApi.applyCourier(payload);
      }

      const profile = await authApi.getProfile();
      setUser(profile);
      showToast("Votre demande livreur a été enregistrée.", "success");
    } catch {
      showToast("Impossible d'enregistrer la demande livreur.", "error");
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

  const renderDashboard = () => (
    <div className="flex flex-col gap-[14px]">
      <section className="relative mb-2 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#f47920,#FF9D4D)] p-5 text-white">
        <div className="pointer-events-none absolute right-[-20px] top-[-20px] h-[120px] w-[120px] rounded-full bg-white/10" />
        <div className="relative z-[1]">
          <div className="mb-[6px] flex items-center gap-2 text-[13px] opacity-90">
            <User size={14} />
            <span>Mon profil</span>
          </div>
          <div className="font-display text-[24px] font-extrabold">{displayName}</div>
          <div className="mt-2 flex items-center gap-2 text-[12px] opacity-85">
            <Medal size={14} />
            <span>Membre depuis Jan 2024 · Bronze</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_STATS.map((stat) => (
          <article key={stat.label} className={`rounded-[16px] border p-4 shadow-[0_2px_8px_rgba(9,14,26,.06)] ${stat.classes}`}>
            <div className="mb-2"><stat.icon size={22} /></div>
            <div className="text-[24px] font-extrabold leading-none">{stat.value}</div>
            <div className="mt-2 text-[11px] font-semibold text-[#6b7280]">{stat.label}</div>
          </article>
        ))}
      </section>

      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 font-display text-[14px] font-extrabold text-[#111827]">
          <Award size={16} />
          <span>Programme de fidélité</span>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 font-extrabold text-[#111827]"><Medal size={14} />Bronze</span>
          <span className="text-[12px] text-[#9ca3af]">150 pts avant Argent</span>
        </div>
        <div className="mb-2 h-[9px] overflow-hidden rounded-[5px] bg-[#e5e7eb]">
          <div className="h-full w-[70%] rounded-[5px] bg-[linear-gradient(90deg,#CD7F32,#E88C40)]" />
        </div>
        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-[#9ca3af]">
          <span>0 pts</span>
          <span>940 pts</span>
          <span>500 pts</span>
        </div>
        <div className="mb-3 flex gap-2 text-[12px] leading-[1.65] text-[#6b7280]">
          <Gift size={14} className="mt-0.5 shrink-0 text-[#f47920]" />
          <span>Gagnez <strong>1 point par 100 FCFA</strong> dépensé. Redeem des points pour des réductions !</span>
        </div>
        <ActionButton variant="outline" onClick={() => openPanel("fidelite")}>
          Voir mes avantages →
        </ActionButton>
      </section>

      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 font-display text-[14px] font-extrabold text-[#111827]">Commandes récentes</div>
        {RECENT_ORDERS.map((order) => (
          <div key={order.id} className="flex items-center justify-between border-b border-[#f3f4f6] py-[10px] last:border-b-0">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border border-[#e5e7eb] bg-[#f9fafb] text-[#f47920]">
                <order.icon size={18} />
              </div>
              <div>
                <div className="text-[12.5px] font-bold text-[#111827]">#{order.id}</div>
                <div className="text-[11.5px] text-[#9ca3af]">{order.date}</div>
              </div>
            </div>
            <div className="text-[13.5px] font-extrabold text-[#f47920]">{order.total}</div>
          </div>
        ))}
        <div className="mt-[11px]">
          <ActionButton variant="outline" onClick={() => navigate("/orders")}>
            Voir toutes les commandes →
          </ActionButton>
        </div>
      </section>

      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 font-display text-[14px] font-extrabold text-[#111827]">
          <Trophy size={16} />
          <span>Mes badges</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BADGES.map((badge) => (
            <article
              key={badge.title}
              className={`rounded-[16px] border p-4 text-center ${
                badge.earned
                  ? "border-orange-200 bg-[linear-gradient(135deg,#fff9f4,#fff)]"
                  : "border-[#e5e7eb] bg-[#f9fafb] opacity-75"
              }`}
            >
              <div className="mb-2 flex justify-center text-[#f47920]"><badge.icon size={28} /></div>
              <div className="text-[13px] font-extrabold text-[#111827]">{badge.title}</div>
              <div className="mt-1 text-[11.5px] text-[#6b7280]">{badge.description}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-[18px] font-extrabold text-[#111827] dark:text-white">
              {isVendor ? "Vous êtes vendeur" : "Devenir vendeur"}
            </div>
            <div className="mt-1 text-[13px] text-[#6b7280] dark:text-gray-400">
              {isVendor
                ? `Votre boutique ${vendorProfile?.business_name || "BelivaY"} est activée.`
                : "Ouvrez votre boutique BelivaY depuis votre compte client."}
            </div>
          </div>
          {isVendor ? (
            <ActionButton variant="primary" onClick={() => navigate("/seller/dashboard")}>
              <Store size={14} className="mr-1" />
              Ouvrir l'espace vendeur
            </ActionButton>
          ) : (
            <ActionButton variant="primary" onClick={() => openPanel("vendeur")}>
              <Store size={14} className="mr-1" />
              Devenir vendeur
            </ActionButton>
          )}
        </div>
      </section>

      <section className="rounded-[16px] border border-[#d1fae5] bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-emerald-900/40 dark:bg-[linear-gradient(180deg,#0f2a21,#111827)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-[18px] font-extrabold text-[#111827] dark:text-white">Devenir livreur</div>
            <div className="mt-1 text-[13px] text-[#6b7280] dark:text-gray-400">
              Postulez pour rejoindre le réseau de livraison BelivaY.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {user?.courier_status === "approved" ? (
              <ActionButton variant="primary" onClick={() => navigate("/courier")}>
                <Bike size={14} className="mr-1" />
                Ouvrir l'espace livreur
              </ActionButton>
            ) : (
              <ActionButton variant="primary" onClick={() => openPanel("livreur")}>
                <Bike size={14} className="mr-1" />
                Devenir livreur
              </ActionButton>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  const renderProfil = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 font-display text-[18px] font-extrabold text-[#111827]">Mon Profil</div>
      <div className="mb-5 text-[13px] text-[#6b7280]">Gérez vos informations personnelles</div>
      <div className="grid gap-[14px] md:grid-cols-2">
        {[
          { label: "Prénom", value: user?.first_name || "Jeanine" },
          { label: "Nom", value: user?.last_name || "Nkolo" },
          { label: "Email", value: user?.email || "jeanine.nkolo@gmail.com" },
          { label: "Téléphone MoMo", value: user?.phone || "+237 690 000 000" },
          { label: "Ville", value: "Yaoundé" },
          { label: "Quartier", value: "Bastos" },
        ].map((field) => (
          <div key={field.label} className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280]">{field.label}</label>
            <input className="rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none" value={field.value} readOnly />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280]">Biographie</label>
          <textarea className="min-h-[90px] w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none" readOnly value="Passionnée de mode africaine et de beauté naturelle." />
        </div>
      </div>
      <div className="mt-[18px] flex gap-[11px]">
        <ActionButton variant="primary" onClick={() => showToast("Profil mis à jour !", "success")}>
          Sauvegarder
        </ActionButton>
        <ActionButton>Annuler</ActionButton>
      </div>
    </section>
  );

  const renderAdresses = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="font-display text-[18px] font-extrabold text-[#111827]">Mes Adresses</div>
        <ActionButton
          variant="primary"
          onClick={() => {
            const nextId = `addr-${Date.now()}`;
            setAddresses((current) => [
              ...current,
              {
                id: nextId,
                label: "Nouvelle adresse",
                type: "home",
                person: displayName,
                phone: user?.phone || "+237 690 000 000",
                line: "Renseigne l'adresse complète",
                default: false,
              },
            ]);
            setEditingAddressId(nextId);
          }}
        >
          <Plus size={14} className="mr-1" />
          Ajouter
        </ActionButton>
      </div>
      <div className="space-y-[11px]">
        {normalizedAddresses.map((address) => {
          const isEditing = editingAddressId === address.id;
          const AddressIcon = address.type === "office" ? Building2 : Home;
          return (
            <div
              key={address.id}
              className={`rounded-[12px] p-[15px] ${address.default ? "border-2 border-[#f47920] bg-[#fff9f4]" : "border border-[#e5e7eb]"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-[7px] text-[13.5px] font-extrabold text-[#111827]">
                    <span className="inline-flex items-center gap-2"><AddressIcon size={14} />{address.label}</span>
                    {address.default ? <span className="ml-1 rounded-full bg-[#fff4eb] px-2 py-1 text-[10px] font-bold text-[#c85e14]">Par défaut</span> : null}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none"
                        value={address.label}
                        onChange={(event) => handleAddressUpdate(address.id, "label", event.target.value)}
                      />
                      <input
                        className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none"
                        value={address.phone}
                        onChange={(event) => handleAddressUpdate(address.id, "phone", event.target.value)}
                      />
                      <textarea
                        className="min-h-[84px] w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none"
                        value={address.line}
                        onChange={(event) => handleAddressUpdate(address.id, "line", event.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="text-[13px] leading-[1.75] text-[#4b5563]">
                      {address.person} · {address.phone}<br />
                      {address.line}
                    </div>
                  )}
                </div>
                <div className="flex gap-[7px]">
                  {isEditing ? (
                    <>
                      <ActionButton
                        variant="primary"
                        onClick={() => {
                          setEditingAddressId(null);
                          showToast("Adresse enregistrée", "success");
                        }}
                      >
                        Sauvegarder
                      </ActionButton>
                      <ActionButton onClick={() => setEditingAddressId(null)}>
                        <X size={14} className="mr-1" />
                        Fermer
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      <ActionButton onClick={() => setEditingAddressId(address.id)}>
                        <Pencil size={14} className="mr-1" />
                        Modifier
                      </ActionButton>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(address.id)}
                        className="inline-flex items-center rounded-[10px] border border-[#fecaca] px-4 py-2 text-[12.5px] font-bold text-[#dc2626] transition hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderPaiements = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="font-display text-[18px] font-extrabold text-[#111827]">Mes Paiements</div>
        <ActionButton variant="primary" onClick={() => showToast("Ajout moyen de paiement", "success")}>
          <Plus size={14} className="mr-1" />
          Ajouter
        </ActionButton>
      </div>
      <div className="space-y-[11px]">
        <div className="flex items-center justify-between rounded-[12px] border-2 border-[#f47920] bg-[#fff9f4] p-[15px]">
          <div className="flex items-center gap-3">
            <Smartphone size={27} className="text-[#f47920]" />
            <div>
              <div className="font-extrabold text-[#111827]">MTN Mobile Money</div>
              <div className="text-[12px] text-[#6b7280]">+237 690 000 000 · Principal</div>
            </div>
          </div>
          <span className="rounded-full bg-[#DCFCE7] px-2 py-1 text-[10px] font-bold text-[#14532D]">Actif</span>
        </div>
        <div className="flex items-center justify-between rounded-[12px] border border-[#e5e7eb] p-[15px]">
          <div className="flex items-center gap-3">
            <Wallet size={27} className="text-[#f47920]" />
            <div>
              <div className="font-extrabold text-[#111827]">Orange Money</div>
              <div className="text-[12px] text-[#6b7280]">+237 655 000 000</div>
            </div>
          </div>
          <span className="rounded-full bg-[#f3f4f6] px-2 py-1 text-[10px] font-bold text-[#6b7280]">Secondaire</span>
        </div>
      </div>
    </section>
  );

  const renderFidelite = () => (
    <div className="flex flex-col gap-[14px]">
      <section className="overflow-hidden rounded-[20px] bg-[linear-gradient(110deg,#f47920,#FF9D4D)] p-6 text-white">
        <div className="mb-1 flex items-center gap-2 text-[13px] opacity-85"><Award size={14} />Solde BelivaY Points</div>
        <div className="font-display text-[42px] font-extrabold leading-none">940 pts</div>
        <div className="mb-4 mt-1 text-[14px] opacity-85">≈ 9 400 FCFA de réduction disponible</div>
        <div className="rounded-[12px] border border-white/20 bg-white/20 p-3">
          <div className="mb-[7px] flex items-center justify-between text-[12px] font-bold">
            <span>Progression → Argent</span>
            <span>350 / 500</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded bg-white/30">
            <div className="h-full w-[70%] rounded bg-white" />
          </div>
        </div>
      </section>
      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 font-display text-[14px] font-extrabold text-[#111827]">Niveaux de fidélité</div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Medal, name: "Bronze", range: "0 – 499 pts", perk: "Accès basique", current: true },
            { icon: Award, name: "Argent", range: "500 – 1 999 pts", perk: "Livraison -10%" },
            { icon: Trophy, name: "Or", range: "2 000 – 4 999 pts", perk: "Livraison gratuite" },
            { icon: Star, name: "Platinum", range: "5 000+ pts", perk: "Accès VIP total" },
          ].map((tier) => (
            <div key={tier.name} className={`rounded-[16px] border p-4 text-center ${tier.current ? "border-[#f47920] bg-[#fff9f4]" : "border-[#e5e7eb] bg-[#f9fafb]"}`}>
              <div className="mb-2 flex justify-center text-[#f47920]"><tier.icon size={28} /></div>
              <div className="font-extrabold text-[#111827]">{tier.name}</div>
              <div className="mt-1 text-[11.5px] text-[#9ca3af]">{tier.range}</div>
              <div className="mt-2 text-[12px] text-[#6b7280]">{tier.perk}</div>
              {tier.current ? <span className="mt-3 inline-flex rounded-full bg-[#DCFCE7] px-2 py-1 text-[10px] font-bold text-[#14532D]">Actuel</span> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2 font-display text-[14px] font-extrabold text-[#111827]"><Package size={16} />Historique des points</div>
        {POINTS_HISTORY.map((entry) => (
          <div key={`${entry.label}-${entry.date}`} className="flex items-center justify-between border-b border-[#f3f4f6] py-[9px] last:border-b-0">
            <div>
              <div className="text-[13px] font-bold text-[#111827]">{entry.label}</div>
              <div className="text-[11.5px] text-[#9ca3af]">{entry.date}</div>
            </div>
            <div className={`text-[13px] font-extrabold ${entry.positive ? "text-[#16A34A]" : "text-[#DC2626]"}`}>{entry.points}</div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderParrain = () => (
    <div className="flex flex-col gap-[14px]">
      <section className="grid gap-4 rounded-[20px] bg-[linear-gradient(135deg,#4C1D95,#7C3AED)] p-6 text-white md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-center gap-2 font-display text-[20px] font-extrabold"><Gift size={20} />Parrainez, gagnez !</div>
          <div className="mb-4 text-[13px] leading-[1.7] text-white/80">
            Invitez vos amis sur BelivaY.<br />
            <strong className="text-white">Vous gagnez 500 pts</strong> · <strong className="text-white">Eux 200 pts</strong>
          </div>
          <button type="button" className="rounded-[10px] border border-white/30 bg-white/15 px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-white/25">
            Partager mon lien
          </button>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[.06em] text-white/70">Votre code</div>
          <div className="rounded-[12px] border border-white/20 bg-white/15 px-4 py-3 font-display text-[18px] font-extrabold">JEANINE2025</div>
        </div>
      </section>
      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 font-display text-[14px] font-extrabold text-[#111827]">Comment ça marche</div>
        {[
          "Partagez votre lien ou code unique",
          "Votre ami s'inscrit et fait son 1er achat",
          "Vous recevez 500 pts · Votre ami 200 pts",
          "Pas de limite de parrainages !",
        ].map((step, index) => (
          <div key={step} className="mb-[10px] flex items-start gap-[10px] text-[13px] text-[#4b5563] last:mb-0">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#f47920] text-[11px] font-extrabold text-white">
              {index + 1}
            </div>
            {step}
          </div>
        ))}
      </section>
      <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 font-display text-[14px] font-extrabold text-[#111827]">Mes parrainages (3)</div>
        {REFERRALS.map((item) => (
          <div key={item.name} className="flex items-center justify-between border-b border-[#f3f4f6] py-[9px] last:border-b-0">
            <div className="text-[13px] font-bold text-[#111827]">{item.name}</div>
            <div className="text-[12px] text-[#9ca3af]">{item.date}</div>
            <div className="text-[13px] font-extrabold text-[#16A34A]">{item.points}</div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderMessages = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
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
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      {isVendor ? (
        <>
          <div className="mb-1 font-display text-[18px] font-extrabold text-[#111827] dark:text-white">
            Vous êtes vendeur
          </div>
          <div className="mb-5 text-[13px] text-[#6b7280] dark:text-gray-400">
            Le formulaire vendeur disparaît parce que votre boutique est déjà activée.
          </div>
          <div className="rounded-[14px] border border-[#d1fae5] bg-[#ecfdf5] p-4 text-[13px] leading-7 text-[#166534] dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            Statut actuel : <strong>Vendeur actif</strong>
            {vendorProfile?.business_name ? ` · ${vendorProfile.business_name}` : ""}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton variant="primary" onClick={() => navigate("/seller/dashboard")}>
              <Store size={14} className="mr-1" />
              Ouvrir l'espace vendeur
            </ActionButton>
            <ActionButton variant="outline" onClick={() => openPanel("dashboard")}>
              Retour au tableau de bord
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <div className="mb-1 font-display text-[18px] font-extrabold text-[#111827] dark:text-white">
            Devenir vendeur
          </div>
          <div className="mb-5 text-[13px] text-[#6b7280] dark:text-gray-400">
            Remplissez cette demande pour lancer votre boutique sur BelivaY.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Nom de boutique
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.shopName}
            onChange={(event) => handleSellerField("shopName", event.target.value)}
            placeholder="Ex: Maison Wax Premium"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Categorie principale
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.category}
            onChange={(event) => handleSellerField("category", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Ville
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.city}
            onChange={(event) => handleSellerField("city", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Telephone business
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.phone}
            onChange={(event) => handleSellerField("phone", event.target.value)}
            placeholder="+237 6XX XXX XXX"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Adresse boutique
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.address}
            onChange={(event) => handleSellerField("address", event.target.value)}
            placeholder="Ex: Marché central, entrée principale"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Pièce d'identité
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={sellerForm.idDocument}
            onChange={(event) => handleSellerField("idDocument", event.target.value)}
            placeholder="N° CNI, RCCM ou référence officielle"
          />
        </div>
          </div>

          <div className="mt-4">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
          Pourquoi voulez-vous devenir vendeur ?
        </label>
        <textarea
          className="min-h-[110px] w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={sellerForm.motivation}
          onChange={(event) => handleSellerField("motivation", event.target.value)}
          placeholder="Presentez votre activite, vos produits et votre objectif sur BelivaY."
        />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton variant="primary" onClick={handleSellerApplication}>
          <Store size={14} className="mr-1" />
          {sellerSubmitting ? "Enregistrement..." : "Envoyer la demande"}
        </ActionButton>
        <ActionButton variant="outline" onClick={() => openPanel("dashboard")}>
          Retour au tableau de bord
        </ActionButton>
          </div>
        </>
      )}
    </section>
  );

  const renderLivreur = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-1 font-display text-[18px] font-extrabold text-[#111827] dark:text-white">
        Devenir livreur
      </div>
      <div className="mb-5 text-[13px] text-[#6b7280] dark:text-gray-400">
        Remplissez votre dossier. BelivaY validera ensuite votre profil avant activation.
      </div>

      <div className="mb-4 rounded-[12px] border border-[#d1fae5] bg-[#ecfdf5] p-4 text-[13px] leading-[1.7] text-[#166534] dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
        Statut actuel :{" "}
        <strong>
          {user?.courier_status === "approved"
            ? "Approuvé"
            : user?.courier_status === "pending"
              ? "En attente de validation"
              : "Aucune demande envoyée"}
        </strong>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Téléphone
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={courierForm.phone}
            onChange={(event) => handleCourierField("phone", event.target.value)}
            placeholder="+237 6XX XXX XXX"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Ville
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={courierForm.city}
            onChange={(event) => handleCourierField("city", event.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Zones de livraison
          </label>
          <input
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={courierForm.zones}
            onChange={(event) => handleCourierField("zones", event.target.value)}
            placeholder="Bastos, Centre-ville, Mvog-Ada"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
            Type de véhicule
          </label>
          <select
            className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={courierForm.vehicle_type}
            onChange={(event) => handleCourierField("vehicle_type", event.target.value)}
          >
            <option value="MOTORBIKE">Moto</option>
            <option value="CAR">Voiture</option>
            <option value="BIKE">Velo</option>
            <option value="TRICYCLE">Tricycle</option>
            <option value="VAN">Camionnette</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[.04em] text-[#6b7280] dark:text-gray-400">
          Pièce d'identité
        </label>
        <input
          className="w-full rounded-[10px] border border-[#e5e7eb] bg-white px-[14px] py-3 text-[13.5px] text-[#1f2937] outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          value={courierForm.id_card}
          onChange={(event) => handleCourierField("id_card", event.target.value)}
          placeholder="N° CNI, permis ou référence officielle"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton variant="primary" onClick={handleCourierApplication}>
          <Bike size={14} className="mr-1" />
          Envoyer la demande
        </ActionButton>
        {user?.courier_status === "approved" ? (
          <ActionButton variant="outline" onClick={() => navigate("/courier")}>
            Ouvrir l'espace livreur
          </ActionButton>
        ) : null}
        <ActionButton variant="outline" onClick={() => openPanel("dashboard")}>
          Retour au tableau de bord
        </ActionButton>
      </div>
    </section>
  );

  const renderSecurite = () => (
    <section className="rounded-[16px] border border-[#e5e7eb] bg-white p-5 shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-[18px] font-display text-[18px] font-extrabold text-[#111827]">Sécurité</div>
      <div className="space-y-[10px]">
        {[
          { icon: Lock, name: "Mot de passe", sub: "Modifié il y a 3 mois", action: "Modifier" },
          { icon: Smartphone, name: "2FA SMS", sub: "Code SMS à chaque connexion", toggle: true },
          { icon: Bell, name: "Alertes connexion", sub: "Email à chaque connexion", toggle: true },
          { icon: Shield, name: "Sessions actives", sub: "1 session · Chrome / Windows", action: "Gérer" },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-[12px] border border-[#e5e7eb] p-[14px]">
            <div className="flex items-center gap-[11px]">
              <item.icon size={21} className="text-[#f47920]" />
              <div>
                <div className="font-bold text-[#111827]">{item.name}</div>
                <div className="text-[12px] text-[#9ca3af]">{item.sub}</div>
              </div>
            </div>
            {item.toggle ? (
              <div className="relative h-[22px] w-10 rounded-full bg-[#f47920]">
                <div className="absolute right-1 top-1 h-[14px] w-[14px] rounded-full bg-white shadow" />
              </div>
            ) : (
              <ActionButton>{item.action}</ActionButton>
            )}
          </div>
        ))}
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
      case "livreur":
        return renderLivreur();
      case "vendeur":
        return renderVendeur();
      case "securite":
        return renderSecurite();
      default:
        return renderDashboard();
    }
  };

  const menuItems: Array<{
    id: PanelId;
    label: string;
    suffix?: string;
    tone?: "orange" | "green";
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { id: "dashboard", label: "Tableau de bord", icon: Package },
    { id: "profil", label: "Mon Profil", suffix: "›", icon: User },
    { id: "adresses", label: "Mes Adresses", suffix: "›", icon: MapPin },
    { id: "paiements", label: "Mes Paiements", suffix: "›", icon: CreditCard },
    { id: "livreur", label: "Devenir livreur", suffix: user?.courier_status === "approved" ? "Actif" : "›", tone: user?.courier_status === "approved" ? "green" : undefined, icon: Bike },
    { id: "vendeur", label: isVendor ? "Vendeur" : "Devenir vendeur", suffix: isVendor ? "Actif" : "›", tone: isVendor ? "green" : undefined, icon: Store },
    { id: "fidelite", label: "Fidélité & Badges", suffix: "›", icon: Star },
    { id: "parrain", label: "Parrainage", suffix: "+500 pts", tone: "green", icon: Gift },
    { id: "messages", label: "Litiges ouverts", suffix: String(disputeConversations.length), tone: "orange", icon: MessageSquare },
    { id: "securite", label: "Sécurité", suffix: "›", icon: ShieldCheck },
  ];

  return (
    <div
      className={`min-h-screen bg-[linear-gradient(135deg,#f3f4f6_0%,#f9fafb_100%)] px-4 py-6 text-[#1f2937] dark:bg-gray-950 dark:text-gray-100 ${fontSizeClassMap[fontSize]}`}
      style={daltonianMode ? { filter: "contrast(1.08) saturate(.72)" } : undefined}
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-[linear-gradient(135deg,#fff,#f9fafb)] shadow-[0_2px_8px_rgba(9,14,26,.06)] dark:border-gray-800 dark:bg-gray-900">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#f47920,#FF9D4D)] p-6 text-white">
              <div className="pointer-events-none absolute right-[-20px] top-[-20px] h-[100px] w-[100px] rounded-full bg-white/10" />
              <div className="relative z-[1]">
                <div className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-white/25 text-[32px]">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    userInitials || "U"
                  )}
                </div>
                <div className="mb-1 text-[18px] font-extrabold">{displayName}</div>
                <div className="mb-3 flex items-center gap-2 text-[13px] opacity-90"><MapPin size={14} />Yaoundé · Cameroun</div>
                <div className="mb-[14px] inline-flex items-center gap-2 rounded-[8px] bg-white/20 px-3 py-2">
                  <Award size={18} />
                  <div>
                    <div className="text-[14px] font-extrabold">350 pts</div>
                    <div className="text-[11px] opacity-90">Bronze</div>
                  </div>
                </div>
                <div className="mb-[10px]">
                  <div className="mb-[6px] flex items-center gap-2 text-[11px] font-bold opacity-90"><Medal size={12} />Progression → Argent</div>
                  <div className="h-2 overflow-hidden rounded-[4px] bg-white/25">
                    <div className="h-full w-[70%] rounded-[4px] bg-[linear-gradient(90deg,#fff,rgba(255,255,255,.6))]" />
                  </div>
                </div>
                <div className="text-[11px] opacity-85">150 pts avant passage à Argent</div>
                <div className="mt-[14px] grid grid-cols-2 gap-2 border-t border-white/20 pt-[14px]">
                  <div className="rounded-[10px] bg-white/15 p-[10px] text-center">
                    <div className="text-[20px] font-extrabold text-white">6</div>
                    <div className="mt-[3px] text-[11px] opacity-90">Commandes</div>
                  </div>
                  <div className="rounded-[10px] bg-white/15 p-[10px] text-center">
                    <div className="text-[20px] font-extrabold text-white">98%</div>
                    <div className="mt-[3px] text-[11px] opacity-90">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] py-2 dark:border-gray-800">
              {menuItems.map((item) => {
                const active = activePanel === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openPanel(item.id)}
                    className={`mx-2 my-1 flex w-[calc(100%-16px)] items-center rounded-[10px] px-4 py-3 text-left transition ${
                      active
                        ? "border-l-[3px] border-l-[#f47920] bg-[#fff4eb] dark:bg-primary/10"
                        : "hover:bg-[#f9fafb] dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className={`flex items-center gap-3 ${active ? "text-[#c85e14] dark:text-primary" : "text-[#374151] dark:text-gray-200"}`}>
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
                    </span>
                    {item.suffix ? (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                          item.tone === "green"
                            ? "bg-[#DCFCE7] text-[#14532D]"
                            : item.tone === "orange" && item.suffix !== "›"
                              ? "bg-[#fff4eb] text-[#c85e14]"
                              : "px-0 text-[18px] text-[#9ca3af]"
                        }`}
                      >
                        {item.suffix}
                      </span>
                    ) : (
                      <span className="text-[18px] text-[#9ca3af] dark:text-gray-500">›</span>
                    )}
                  </button>
                );
              })}

              <div className="my-2 h-px bg-[#e5e7eb] dark:bg-gray-800" />

              <button
                type="button"
                onClick={() => showToast("À bientôt !", "success")}
                className="mx-2 my-1 flex w-[calc(100%-16px)] items-center rounded-[10px] px-4 py-3 text-left text-[#dc2626] transition hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <span className="flex-1 text-[13px] font-semibold">Déconnexion</span>
              </button>
            </div>

            <div className="border-t border-[#e5e7eb] px-[14px] py-3 dark:border-gray-800">
              <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.06em] text-[#9ca3af]">Accessibilité</div>
              <div className="mb-[7px] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#4b5563] dark:text-gray-300">Taille du texte</span>
                <div className="overflow-hidden rounded-full border border-[#e5e7eb] bg-[#f9fafb] dark:border-gray-700 dark:bg-gray-800">
                  {(["small", "normal", "large"] as const).map((size, index) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setFontSize(size)}
                      className={`px-3 py-1.5 text-[12px] font-bold ${
                        fontSize === size ? "bg-[#f47920] text-white" : "text-[#4b5563] dark:text-gray-300"
                      } ${index !== 2 ? "border-r border-[#e5e7eb] dark:border-gray-700" : ""}`}
                    >
                      {size === "small" ? "A-" : size === "normal" ? "A" : "A+"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#4b5563] dark:text-gray-300">Mode daltonien</span>
                <button
                  type="button"
                  onClick={() => setDaltonianMode((value) => !value)}
                  className={`relative h-6 w-10 rounded-full transition ${daltonianMode ? "bg-[#f47920]" : "bg-[#d1d5db]"}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${daltonianMode ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>
          </aside>

          <main>{renderPanel()}</main>
        </div>
      </div>
    </div>
  );
}
