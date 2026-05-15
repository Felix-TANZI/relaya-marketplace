import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  CircleHelp,
  Gift,
  GraduationCap,
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  Heart,
  Package,
  LogOut,
  Filter,
  Mic,
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
import { customerApi } from "@/services/api/customer";

const SEARCH_FILTER_CATEGORIES = [
  "Accessoires",
  "Alimentation",
  "Chaussures",
  "Sport",
  "Vêtements",
  "Électronique",
];

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

function composeSearchValue(category: string, details: string) {
  if (!category) return details.trim();
  return details.trim() ? `[${category}] ${details.trim()}` : `[${category}] `;
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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
      if (localStorage.getItem('access_token')) {
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const details = params.get("q") ?? params.get("search") ?? "";
    const category = params.get("category_label") ?? "";
    setSearchQuery(composeSearchValue(category, details));
  }, [location.search]);

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
    // Start with default unread count (welcome + fallback notifications)
    const stored = localStorage.getItem("belivay_notif_count");
    setNotifCount(stored ? parseInt(stored, 10) : 1);

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
    navigate(params.toString() ? `/search?${params.toString()}` : "/search");
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleVoiceSearch = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.onresult = (e: any) => {
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

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const clientNavItems = [
    { label: t("header_nav.home"), to: "/" },
    { label: t("header_nav.orders"), to: "/orders" },
    { label: "Mon compte", to: "/profile" },
    { label: "Promotions", to: "/promotions" },
    { label: t("header_nav.favorites"), to: "/wishlist" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white dark:bg-bg-dark border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2.5 py-3 sm:gap-4 sm:py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0" aria-label="Accueil BelivaY">
            <img
              src="/belivay-logo.png"
              alt="BelivaY"
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>

          {/* Search Bar - Desktop — style v29 */}
          <div
            id="search"
            data-tutorial="header-search"
            className="hidden lg:flex flex-1 mx-8 items-center"
            ref={desktopSearchRef}
            style={{ maxWidth: "560px", position: "relative" }}
          >
            <div
              className="search-bar-v29 flex w-full"
              style={{
                height: "42px",
                border: "1.5px solid #E5E7EB",
                borderRadius: "10px",
                overflow: "hidden",
                background: "#fff",
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
                  el.style.borderColor = "#E5E7EB";
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
                  background: "#F9FAFB",
                  borderRight: "1.5px solid #E5E7EB",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 150ms",
                  color: "#4B5563",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F9FAFB")}
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
                style={{
                  flex: 1,
                  padding: "0 12px",
                  fontSize: "13.5px",
                  color: "#1F2937",
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
                  color: "#9CA3AF",
                  transition: "color 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#F47920")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
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
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:gap-4">
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

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              {theme === "dark" ? (
                <Sun size={20} className="text-primary" />
              ) : (
                <Moon size={20} className="text-text-light-secondary" />
              )}
            </button>

            {/* Cart */}
            <Link
              to="/cart"
              id="cart"
              className="relative rounded-lg p-1.5 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              <ShoppingCart
                size={24}
                className="text-text-light dark:text-text-dark"
              />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Notifications */}
            {user && (
              <Link
                to="/notifications"
                onClick={() => { setNotifCount(0); localStorage.setItem("belivay_notif_count", "0"); }}
                className="relative rounded-lg p-1.5 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
              >
                <Bell size={22} className="text-text-light dark:text-text-dark" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Link>
            )}

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative rounded-lg p-1.5 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt sm:p-2"
            >
              <Heart size={22} className="text-text-light dark:text-text-dark" />
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
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-all hover:bg-bg-light-alt dark:hover:bg-bg-dark-alt sm:gap-2 sm:px-4 sm:py-2"
                >
                  <div className="w-9 h-9 overflow-hidden bg-primary rounded-full flex items-center justify-center ring-2 ring-primary/15">
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

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-bg-dark-alt rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                  >
                    <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary/10 via-orange-50 to-white dark:from-primary/10 dark:via-gray-800 dark:to-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-full bg-primary flex items-center justify-center shadow-sm">
                          {profileAvatar ? (
                            <img
                              src={profileAvatar}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-bold text-white">{userInitials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            {t("header_nav.connected_as")}
                          </p>
                          <p className="font-semibold text-text-light dark:text-text-dark truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        {t("header.profile")}
                      </span>
                    </Link>

                    <Link
                      to="/orders"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Package
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        {t("header.orders")}
                      </span>
                    </Link>

                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Heart
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        {t("header.wishlist")}
                      </span>
                    </Link>

                    <Link
                      to="/help"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <CircleHelp
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        Centre d'aide
                      </span>
                    </Link>

                    <a
                      href="https://wa.me/2370005568778"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Gift
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        Support WhatsApp
                      </span>
                    </a>

                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                      <div className="px-4 pb-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        <div className="truncate">Contact: +237 000 556 87 78</div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600"
                      >
                        <LogOut size={18} />
                        <span>{t("header.logout")}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
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
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-1.5 transition-all hover:bg-bg-light dark:hover:bg-bg-dark-alt lg:hidden sm:p-2"
            >
              {mobileMenuOpen ? (
                <X size={24} className="text-text-light dark:text-text-dark" />
              ) : (
                <Menu
                  size={24}
                  className="text-text-light dark:text-text-dark"
                />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile — style v29 */}
        <div id="search-mobile" className="lg:hidden pb-3 w-full" ref={mobileSearchRef}>
          <div
            className="flex w-full"
            style={{
              height: "40px",
              border: "1.5px solid #E5E7EB",
              borderRadius: "10px",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <button
              type="button"
              onClick={() => setSearchFilterOpen((open) => !open)}
              style={{
                width: "42px",
                background: "#F9FAFB",
                borderRight: "1.5px solid #E5E7EB",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#4B5563",
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
              style={{
                flex: 1,
                padding: "0 12px",
                fontSize: "13px",
                color: "#1F2937",
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

        <nav className="hidden lg:flex items-center gap-1 border-t border-gray-100 py-3 dark:border-gray-800 overflow-x-auto scrollbar-hide">
          {clientNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-text-light-secondary transition-all hover:bg-orange-50 hover:text-primary dark:text-text-dark-secondary dark:hover:bg-bg-dark-alt dark:hover:text-primary whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            <Link
              to="/catalog"
              className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="font-medium text-text-light dark:text-text-dark">
                {t("header.catalog")}
              </span>
            </Link>
            <Link
              to="/promotions"
              className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="font-medium text-text-light dark:text-text-dark">
                Promotions
              </span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/profile?tab=disputes"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    Litiges ouverts
                  </span>
                </Link>
                <Link
                  to="/profile"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    Mon compte
                  </span>
                </Link>
                <Link
                  to="/orders"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {t("header.orders")}
                  </span>
                </Link>
                <Link
                  to="/wishlist"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    Mes favoris
                  </span>
                </Link>
                <Link
                  to="/help"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    Centre d'aide
                  </span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 font-medium"
                >
                  {t("header.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {t("header.login")}
                  </span>
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-3 bg-primary text-white font-medium rounded-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("header.signup")}
                </Link>
              </>
            )}

            <button
              onClick={() => {
                toggleLanguage();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
            >
              <span className="font-medium text-text-light dark:text-text-dark">
                {i18n.language === "fr" ? "🇬🇧 English" : "🇫🇷 Français"}
              </span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
