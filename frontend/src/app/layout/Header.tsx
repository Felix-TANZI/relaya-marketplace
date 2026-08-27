import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import MobileCategoryDrawer from "@/components/home/MobileCategoryDrawer";
import {
  Bell,
  CircleHelp,
  Gift,
  GraduationCap,
  Search,
  ShoppingCart,
  User,
  Menu,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Heart,
  Package,
  LogOut,
  Filter,
  Mic,
  House,
  Tag,
  Star,
  Gem,
  Info,
  Store,
  Award,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageSquare,
  Settings,
  Shield,
  Truck,
  Wallet,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  getStoredProfileAvatar,
  getUserDisplayName,
  getUserInitials,
} from "@/lib/profileAvatar";
import { getFavoriteProductIds } from "@/lib/favorites";
import { hasValidAccessToken } from "@/lib/authTokens";
import { customerApi } from "@/services/api/customer";
import { productsApi } from "@/services/api/products";
import { ordersApi } from "@/services/api/orders";
import { getUnreadSupportCount, SUPPORT_UPDATED_EVENT } from "@/lib/supportInbox";
import {
  ACCOUNT_UPDATED_EVENT,
  formatXaf,
  getBelivayAccount,
} from "@/lib/belivayAccount";

/** Statuts d'une commande encore en cours de traitement ou d'acheminement. */
const CLOSED_ORDER_STATUSES = [
  "DELIVERED",
  "BUYER_CONFIRMED",
  "AUTO_CONFIRMED",
  "RELEASED_TO_VENDOR",
  "CANCELLED",
  "REFUNDED",
];

const SEARCH_FILTER_CATEGORIES = [
  "Accessoires",
  "Alimentation",
  "Chaussures",
  "Sport",
  "Vêtements",
  "Électronique",
];

const LAST_SEARCH_STORAGE_KEY = "belivay_last_search";

function parseSearchValue(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) {
    return { category: "", details: trimmed };
  }
  return {
    category: match[1].trim(),
    details: match[2].trim(),
  };
}

type SpeechRecognitionResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

interface SpeechRecognitionLike {
  lang: string;
  onresult: (event: SpeechRecognitionResultEvent) => void;
  start: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function composeSearchValue(category: string, details: string) {
  if (!category) return details.trim();
  return details.trim() ? `[${category}] ${details.trim()}` : `[${category}] `;
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  /* Remise maximale du catalogue, pour la pastille de l'onglet « Promos ». */
  const [maxPromo, setMaxPromo] = useState(0);

  useEffect(() => {
    let cancelled = false;
    productsApi
      .list({ page_size: 60, is_active: true })
      .then((response) => {
        if (cancelled) return;
        const best = (response.results ?? []).reduce(
          (max, product) => Math.max(max, product.discount_percent ?? product.discount ?? 0),
          0,
        );
        setMaxPromo(Math.round(best));
      })
      .catch(() => { /* la pastille reste masquée */ });
    return () => { cancelled = true; };
  }, []);
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [notifCount, setNotifCount] = useState(() => {
    const stored = localStorage.getItem("belivay_notif_count");
    return stored ? parseInt(stored, 10) : 1;
  });
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncedSearch, setLastSyncedSearch] = useState<string | null>(null);
  const [searchFilterOpen, setSearchFilterOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const totalItems = items.reduce(
    (sum: number, item: { quantity: number }) => sum + item.quantity,
    0,
  );

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const syncAvatar = () => setProfileAvatar(getStoredProfileAvatar() || user?.avatar_url || null);

    syncAvatar();
    window.addEventListener("storage", syncAvatar);
    window.addEventListener("belivay-avatar-updated", syncAvatar as EventListener);

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("belivay-avatar-updated", syncAvatar as EventListener);
    };
  }, [user?.avatar_url]);

  useEffect(() => {
    const syncFavorites = () => {
      // Always read localStorage first for instant counter update
      setFavoritesCount(getFavoriteProductIds().length);

      // Then sync from API if logged in (may update later)
      if (hasValidAccessToken()) {
        customerApi.getFavorites()
          .then((favorites) => setFavoritesCount(favorites.length))
          .catch(() => {/* keep localStorage count */});
      }
    };

    syncFavorites();
    window.addEventListener("belivay-favorites-updated", syncFavorites as EventListener);

    return () => {
      window.removeEventListener(
        "belivay-favorites-updated",
        syncFavorites as EventListener,
      );
    };
  }, []);

  /* Messages non lus et solde du Compte BelivaY — les deux pastilles du menu
     profil. Les stores émettent un événement, le header n'a rien à sonder. */
  useEffect(() => {
    const sync = () => {
      setUnreadMessages(getUnreadSupportCount());
      setWalletBalance(getBelivayAccount().availableXaf);
    };

    sync();
    window.addEventListener(SUPPORT_UPDATED_EVENT, sync);
    window.addEventListener(ACCOUNT_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SUPPORT_UPDATED_EVENT, sync);
      window.removeEventListener(ACCOUNT_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /* Le nombre de commandes en cours n'est chargé qu'à l'ouverture du menu :
     inutile d'appeler l'API sur chaque page pour une pastille repliée. */
  useEffect(() => {
    if (!userMenuOpen || !hasValidAccessToken()) return;
    let cancelled = false;

    ordersApi
      .getMyOrders()
      .then((orders) => {
        if (cancelled) return;
        setActiveOrdersCount(
          orders.filter((order) => !CLOSED_ORDER_STATUSES.includes(order.fulfillment_status)).length,
        );
      })
      .catch(() => { /* la pastille reste masquée */ });

    return () => { cancelled = true; };
  }, [userMenuOpen]);

  // Sync the search box with the URL during render (avoids a setState effect).
  if (location.search !== lastSyncedSearch) {
    const params = new URLSearchParams(location.search);
    const details = params.get("q") ?? params.get("search") ?? "";
    const category = params.get("category_label") ?? "";
    setLastSyncedSearch(location.search);
    setSearchQuery(composeSearchValue(category, details));
  }

  useEffect(() => {
    const handleOutsideSearch = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedDesktop = desktopSearchRef.current?.contains(target);
      const clickedMobile = mobileSearchRef.current?.contains(target);
      if (!clickedDesktop && !clickedMobile) {
        setSearchFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideSearch);
    return () => document.removeEventListener("mousedown", handleOutsideSearch);
  }, []);

  // Notification count
  useEffect(() => {
    const handleNewNotif = () => {
      setNotifCount((prev) => {
        const next = prev + 1;
        localStorage.setItem("belivay_notif_count", String(next));
        return next;
      });
    };

    window.addEventListener("belivay-new-notification", handleNewNotif);

    return () => {
      window.removeEventListener("belivay-new-notification", handleNewNotif);
    };
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  const handleSearch = () => {
    const { category, details } = parseSearchValue(searchQuery);
    const params = new URLSearchParams();
    if (details) params.set("q", details);
    if (category) params.set("category_label", category);
    if (details || category) {
      localStorage.setItem(
        LAST_SEARCH_STORAGE_KEY,
        JSON.stringify({ query: details, category, createdAt: new Date().toISOString() }),
      );
    }
    navigate(params.toString() ? `/search?${params.toString()}` : "/search");
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleVoiceSearch = () => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.onresult = (e: SpeechRecognitionResultEvent) => {
      const transcript = e.results[0][0].transcript;
      const { category } = parseSearchValue(searchQuery);
      setSearchQuery(composeSearchValue(category, transcript));
    };
    rec.start();
  };

  const handleCategorySelect = (category: string) => {
    const { details } = parseSearchValue(searchQuery);
    setSearchQuery(composeSearchValue(category, details));
    setSearchFilterOpen(false);
  };

  // Palette de la barre de recherche — suit le thème clair/sombre
  const isDark = theme === "dark";
  const searchBarStyles = {
    border: isDark ? "#1F2937" : "#E5E7EB",
    background: isDark ? "#111827" : "#fff",
    text: isDark ? "#F9FAFB" : "#1F2937",
    sideButtonBg: isDark ? "#0F1626" : "#F9FAFB",
    sideButtonBgHover: isDark ? "#1B2436" : "#F3F4F6",
    icon: isDark ? "#D1D5DB" : "#4B5563",
    iconMuted: isDark ? "#6B7280" : "#9CA3AF",
  };

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const clientNavItems = [
    { label: t("header_nav.home"), to: "/", icon: House, tone: "text-primary" },
    { label: "Promos", to: "/promotions", icon: Tag, tone: "text-primary", promo: true },
    { label: t("header_nav.orders"), to: "/orders", icon: Package, tone: "text-primary" },
    { label: t("header_nav.favorites"), to: "/wishlist", icon: Heart, tone: "text-red-500" },
    { label: "Compte", to: "/profile", icon: User, tone: "text-gray-600 dark:text-gray-300" },
    { label: "Sélection", to: "/selection-premium", icon: Star, tone: "text-amber-500" },
    { label: "Abonnements", to: "/premium", icon: Gem, tone: "text-primary" },
    { label: "À propos", to: "/about", icon: Info, tone: "text-blue-500" },
  ];

  /*
    Menu profil — toutes les entrées de l'espace client, groupées. Chacune
    pointe vers sa page réelle ; les panneaux du compte passent par le
    paramètre `panel` de /profile, que ProfilePage lit au montage.
  */
  type UserMenuEntry = {
    label: string;
    to: string;
    icon: typeof User;
    /** Pastille arrondie à droite (compteur, statut). */
    badge?: string;
    /** Libellé discret à droite, sans pastille. */
    note?: string;
    external?: boolean;
    tone?: "default" | "accent";
  };

  const userMenuSections: { title?: string; items: UserMenuEntry[] }[] = [
    {
      items: [
        { label: "Mon Compte", to: "/profile", icon: User },
        {
          label: "Mes Commandes",
          to: "/orders",
          icon: Package,
          badge: activeOrdersCount > 0 ? `${activeOrdersCount} en cours` : undefined,
        },
        {
          label: "Mes Favoris",
          to: "/wishlist",
          icon: Heart,
          badge: favoritesCount > 0 ? String(favoritesCount) : undefined,
        },
        {
          label: "Messages",
          to: "/profile?panel=messages",
          icon: MessageSquare,
          badge: unreadMessages > 0 ? String(unreadMessages) : undefined,
        },
        {
          label: "Mon Compte BelivaY",
          to: "/profile?panel=compte-belivay",
          icon: Wallet,
          note: walletBalance > 0 ? formatXaf(walletBalance) : "Wallet",
          tone: "accent",
        },
      ],
    },
    {
      title: "Mon activité",
      items: [
        {
          label: "Notifications",
          to: "/notifications",
          icon: Bell,
          badge: notifCount > 0 ? String(notifCount) : undefined,
        },
        {
          label: "Fidélité",
          to: "/profile?panel=fidelite",
          icon: Award,
          note: `${(user?.loyalty_points ?? 0).toLocaleString("fr-FR")} pts`,
        },
        { label: "Parrainage", to: "/profile?panel=parrain", icon: Gift },
        { label: "Ventes flash", to: "/flash-deals", icon: Tag },
      ],
    },
    {
      title: "Paramètres du compte",
      items: [
        { label: "Mes adresses", to: "/profile?panel=adresses", icon: MapPin },
        { label: "Moyens de paiement", to: "/profile?panel=paiements", icon: CreditCard },
        { label: "Sécurité", to: "/profile?panel=securite", icon: Shield },
        { label: "Réglages", to: "/profile?panel=reglages", icon: Settings },
      ],
    },
    {
      title: "Plus",
      items: [
        { label: "Abonnement BelivaY+", to: "/premium", icon: Gem, tone: "accent" },
        {
          label: user?.is_vendor ? "Espace vendeur" : "Devenir vendeur",
          to: user?.is_vendor ? "/seller/dashboard" : "/profile?panel=vendeur",
          icon: Store,
        },
        { label: "Centre d'aide", to: "/help", icon: CircleHelp },
        {
          label: "Support WhatsApp",
          to: "https://wa.me/237689002812",
          icon: MessageSquare,
          external: true,
        },
      ],
    },
  ];

  return (
    <header className="fixed inset-x-0 top-8 z-50 bg-white dark:bg-bg-dark border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-2.5 sm:px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-1.5 py-2.5 sm:gap-4 sm:py-4">
          {/* Menu des categories — a gauche du logo, mobile et tablette uniquement */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir les categories"
            aria-expanded={mobileMenuOpen}
            className="-ml-1 flex-shrink-0 rounded-lg p-1.5 text-text-light transition-all hover:bg-bg-light dark:text-text-dark dark:hover:bg-bg-dark-alt lg:hidden"
          >
            <Menu size={24} />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Accueil BelivaY">
            <img
              src="/belivay-logo.png"
              alt="BelivaY"
              className="h-8 w-auto object-contain max-[380px]:h-7 sm:h-10"
            />
          </Link>

          {/* Search Bar - Desktop — style v29 */}
          <div
            id="search"
            data-tutorial="header-search"
            className="hidden lg:flex flex-1 ml-5 mr-auto items-center"
            ref={desktopSearchRef}
            style={{ maxWidth: "620px", position: "relative" }}
          >
            <div
              className="search-bar-v29 flex w-full"
              style={{
                height: "42px",
                border: `1.5px solid ${searchBarStyles.border}`,
                borderRadius: "10px",
                overflow: "hidden",
                background: searchBarStyles.background,
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "#F47920";
                el.style.boxShadow = "0 0 0 3px rgba(244,121,32,.22)";
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  const el = e.currentTarget;
                  el.style.borderColor = searchBarStyles.border;
                  el.style.boxShadow = "none";
                }
              }}
            >
              {/* Filter funnel button */}
              <button
                type="button"
                onClick={() => setSearchFilterOpen((open) => !open)}
                title="Filtres"
                aria-label="Ouvrir les filtres"
                style={{
                  padding: "0 12px",
                  background: searchBarStyles.sideButtonBg,
                  borderRight: `1.5px solid ${searchBarStyles.border}`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 150ms",
                  color: searchBarStyles.icon,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = searchBarStyles.sideButtonBgHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = searchBarStyles.sideButtonBg)
                }
              >
                <Filter size={15} strokeWidth={2.5} />
              </button>

              {/* Text input */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKey}
                placeholder={t("header.search_placeholder") || "Rechercher votre produit"}
                aria-label="Rechercher"
                className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
                style={{
                  flex: 1,
                  padding: "0 12px",
                  fontSize: "13.5px",
                  color: searchBarStyles.text,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  minWidth: 0,
                }}
              />

              {/* Voice search button */}
              <button
                onClick={handleVoiceSearch}
                title="Recherche vocale"
                aria-label="Recherche vocale"
                style={{
                  padding: "0 8px",
                  background: "transparent",
                  border: "none",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: searchBarStyles.iconMuted,
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F47920")}
                onMouseLeave={(e) => (e.currentTarget.style.color = searchBarStyles.iconMuted)}
              >
                <Mic size={15} strokeWidth={2} />
              </button>

              {/* Orange search button */}
              <button
                onClick={handleSearch}
                aria-label="Lancer la recherche"
                style={{
                  width: "44px",
                  background: "#F47920",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 150ms",
                  border: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#C85E14")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F47920")}
              >
                <Search size={16} color="#fff" strokeWidth={2.5} />
              </button>
            </div>

            {searchFilterOpen && (
              <div className="absolute left-0 right-0 top-[calc(100%+7px)] z-50 overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_16px_48px_rgba(9,14,26,.12)]">
                <div className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                  Catégories
                </div>
                <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                  {SEARCH_FILTER_CATEGORIES.map((category) => {
                    const isActive = parseSearchValue(searchQuery).category === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategorySelect(category)}
                        className={`rounded-xl px-3 py-3 text-left text-[12px] font-bold transition-all ${
                          isActive
                            ? "bg-orange-50 text-primary"
                            : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3 lg:gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
            >
              <Globe
                size={20}
                className="text-text-light-secondary dark:text-text-dark-secondary"
              />
              <span className="text-sm font-medium text-text-light dark:text-text-dark uppercase">
                {i18n.language}
              </span>
            </button>

            {/* Theme Toggle - desktop only */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex rounded-lg p-1 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              {theme === "dark" ? (
                <Sun size={18} className="text-primary sm:h-5 sm:w-5" />
              ) : (
                <Moon size={18} className="text-text-light-secondary sm:h-5 sm:w-5" />
              )}
            </button>

            {/* Notifications — toujours présente : sans session, la cloche mène à la
                connexion plutôt que de disparaître et de déséquilibrer le header. */}
            <Link
              to={user ? "/notifications" : "/login"}
              aria-label={user ? "Notifications" : "Se connecter pour voir les notifications"}
              onClick={() => {
                if (!user) return;
                setNotifCount(0);
                localStorage.setItem("belivay_notif_count", "0");
              }}
              className="relative rounded-lg p-1 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              <Bell size={20} className="text-text-light dark:text-text-dark sm:h-[22px] sm:w-[22px]" />
              {user && notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              id="cart"
              className="relative rounded-lg p-1 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              <ShoppingCart
                size={21}
                className="text-text-light dark:text-text-dark sm:h-6 sm:w-6"
              />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Wishlist - desktop only */}
            <Link
              to="/wishlist"
              className="relative rounded-lg p-1 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt hidden sm:flex sm:p-2"
            >
              <Heart size={20} className="text-text-light dark:text-text-dark sm:h-[22px] sm:w-[22px]" />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("belivay-open-tutorial"))}
              className="hidden lg:inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-light transition-all hover:bg-bg-light dark:text-text-dark dark:hover:bg-bg-dark-alt"
            >
              <GraduationCap size={18} />
              {t("header_nav.guide")}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  id="account"
                  data-tutorial="header-profile"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 rounded-lg px-1 py-1 transition-all hover:bg-bg-light-alt dark:hover:bg-bg-dark-alt sm:gap-2 sm:px-4 sm:py-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary ring-2 ring-primary/15 sm:h-9 sm:w-9">
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white">{userInitials}</span>
                    )}
                  </div>
                  <span className="hidden md:inline text-text-light dark:text-text-dark font-medium">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={16}
                    className="hidden text-text-light-secondary dark:text-text-dark-secondary sm:block"
                  />
                </button>

                {/* Menu profil — tout l'espace client, groupé et cliquable */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-[#f3d9c6] bg-white shadow-[0_24px_60px_rgba(15,23,42,.22)] dark:border-gray-700 dark:bg-bg-dark-alt">
                    {/* En-tête d'identité, posé sur le dégradé de marque. */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#f9a04d] via-[#f47920] to-[#e26a10] px-4 py-4">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-7 -top-9 h-28 w-28 rotate-12 rounded-3xl border-2 border-white/20"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-12 right-12 h-24 w-24 rotate-45 rounded-3xl border-2 border-white/15"
                      />
                      <div className="relative flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25 ring-2 ring-white/70">
                          {profileAvatar ? (
                            <img
                              src={profileAvatar}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-black text-white">{userInitials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-black leading-tight text-white">
                            {displayName}
                          </p>
                          <p className="truncate text-[11.5px] font-medium text-white/85">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-[58vh] overflow-y-auto overscroll-contain">
                      {userMenuSections.map((section, sectionIndex) => (
                        <div
                          key={section.title ?? `menu-section-${sectionIndex}`}
                          className={
                            sectionIndex > 0
                              ? "border-t-[6px] border-[#f6f7f9] dark:border-gray-900/70"
                              : "pt-1"
                          }
                        >
                          {section.title ? (
                            <div className="px-4 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
                              {section.title}
                            </div>
                          ) : null}

                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const rowClass =
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#fff7ef] dark:hover:bg-gray-800";
                            const content = (
                              <>
                                <Icon
                                  size={18}
                                  className={
                                    item.tone === "accent"
                                      ? "flex-shrink-0 text-primary"
                                      : "flex-shrink-0 text-gray-500 dark:text-gray-400"
                                  }
                                />
                                <span className="flex-1 truncate text-[13.5px] font-semibold text-gray-800 dark:text-gray-100">
                                  {item.label}
                                </span>
                                {item.badge ? (
                                  <span className="flex-shrink-0 rounded-full bg-[#fff1e3] px-2.5 py-1 text-[10.5px] font-black text-[#c85e14] dark:bg-primary/20 dark:text-orange-200">
                                    {item.badge}
                                  </span>
                                ) : item.note ? (
                                  <span className="flex-shrink-0 text-[11.5px] font-black text-primary">
                                    {item.note}
                                  </span>
                                ) : (
                                  <ChevronRight
                                    size={15}
                                    className="flex-shrink-0 text-gray-300 dark:text-gray-600"
                                  />
                                )}
                              </>
                            );

                            return item.external ? (
                              <a
                                key={item.label}
                                href={item.to}
                                target="_blank"
                                rel="noreferrer"
                                className={rowClass}
                                onClick={() => setUserMenuOpen(false)}
                              >
                                {content}
                              </a>
                            ) : (
                              <Link
                                key={item.label}
                                to={item.to}
                                className={rowClass}
                                onClick={() => setUserMenuOpen(false)}
                              >
                                {content}
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-[13.5px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:border-gray-800 dark:hover:bg-red-900/20"
                    >
                      <LogOut size={18} />
                      {t("header.logout")}
                    </button>

                    <div className="border-t border-[#f6e6d8] bg-[#fffaf4] px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/60">
                      <div className="flex items-center gap-2 rounded-xl bg-[#fff1e3] px-3 py-2 text-[11.5px] font-bold text-[#a24d0a] dark:bg-primary/15 dark:text-orange-200">
                        <Truck size={14} className="flex-shrink-0" />
                        Livraison offerte dès 30 000 FCFA
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Sans session : la pastille ronde tient la place de l'avatar en bout
                    de header sur mobile, là où les boutons Connexion/Inscription ne
                    tiennent pas. Elle mène à la connexion. */}
                <Link
                  to="/login"
                  aria-label={t("header.login")}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/15 transition-all hover:bg-primary/20 lg:hidden"
                >
                  <User size={17} />
                </Link>

                <div className="hidden lg:flex items-center gap-2">
                  <Link to="/become-seller">
                    <button className="px-4 py-2 text-text-light dark:text-text-dark font-medium hover:bg-bg-light dark:hover:bg-bg-dark-alt rounded-lg transition-all">
                      Vendre sur BelivaY
                    </button>
                  </Link>
                  <Link to="/login">
                    <button className="px-4 py-2 text-text-light dark:text-text-dark font-medium hover:bg-bg-light dark:hover:bg-bg-dark-alt rounded-lg transition-all">
                      {t("header.login")}
                    </button>
                  </Link>
                  <Link to="/register">
                    <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all">
                      {t("header.signup")}
                    </button>
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Search Bar - Mobile — style v29 */}
        <div id="search-mobile" className="lg:hidden pb-3 w-full" ref={mobileSearchRef}>
          <div
            className="flex w-full"
            style={{
              height: "40px",
              border: `1.5px solid ${searchBarStyles.border}`,
              borderRadius: "10px",
              overflow: "hidden",
              background: searchBarStyles.background,
            }}
          >
            <button
              type="button"
              onClick={() => setSearchFilterOpen((open) => !open)}
              style={{
                width: "42px",
                background: searchBarStyles.sideButtonBg,
                borderRight: `1.5px solid ${searchBarStyles.border}`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: searchBarStyles.icon,
                cursor: "pointer",
              }}
            >
              <Filter size={15} strokeWidth={2.5} />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder={t("header.search_placeholder") || "Rechercher votre produit"}
              className="placeholder:text-gray-400 dark:placeholder:text-gray-500"
              style={{
                flex: 1,
                padding: "0 12px",
                fontSize: "13px",
                color: searchBarStyles.text,
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                width: "42px",
                background: "#F47920",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
              }}
            >
              <Search size={15} color="#fff" strokeWidth={2.5} />
            </button>
          </div>
          {searchFilterOpen && (
            <div className="mt-2 overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_16px_48px_rgba(9,14,26,.12)]">
              <div className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                Catégories
              </div>
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {SEARCH_FILTER_CATEGORIES.map((category) => {
                  const isActive = parseSearchValue(searchQuery).category === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`rounded-xl px-3 py-3 text-left text-[12px] font-bold transition-all ${
                        isActive
                          ? "bg-orange-50 text-primary"
                          : "text-gray-700 hover:bg-gray-50 hover:text-primary"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <nav className="scrollbar-hide hidden items-center gap-0.5 overflow-x-auto border-t border-gray-100 py-3 md:flex lg:gap-1 dark:border-gray-800">
          {clientNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 pb-[6px] pt-2 text-sm font-medium leading-5 transition-colors duration-200 ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-light-secondary hover:text-primary dark:text-text-dark-secondary"
                }`}
              >
                <Icon
                  size={14}
                  className={`flex-shrink-0 ${item.tone}`}
                  fill={item.label === "Sélection" || item.label === t("header_nav.favorites") ? "currentColor" : "none"}
                />
                {item.label}
                {item.promo && maxPromo > 0 ? (
                  <span className="ml-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-500 dark:bg-red-500/15 dark:text-red-300">
                    −{maxPromo}%
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tiroir des categories — ouvert par l'icone de menu, a gauche du header.
          Devenir Vendeur y est ajoute explicitement : c'est le seul point
          d'entree visible pour un visiteur mobile non connecte (la pastille
          de connexion ne mene qu'au login, et le menu de compte riche
          n'existe que pour un utilisateur deja authentifie). */}
      <MobileCategoryDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        extraLinks={[
          { label: "Promotions", to: "/promotions" },
          { label: "Selection Premium", to: "/selection-premium" },
          { label: "Abonnements BelivaY", to: "/premium" },
          { label: "Mes commandes", to: "/orders" },
          { label: "Devenir Vendeur", to: "/become-seller" },
          { label: "A propos", to: "/about" },
          { label: "Aide", to: "/help" },
        ]}
      />
    </header>
  );
}
