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
  Settings,
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

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isSearchPage = location.pathname === "/search";
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    window.addEventListener("belivay-cart-updated", handleNewNotif);

    return () => {
      window.removeEventListener("belivay-new-notification", handleNewNotif);
      window.removeEventListener("belivay-cart-updated", handleNewNotif);
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

  const displayName = getUserDisplayName(user);
  const userInitials = getUserInitials(user);
  const clientNavItems = [
    { label: t("header_nav.home"), to: "/" },
    { label: t("header_nav.promotions"), to: "/catalog?promo=1" },
    { label: t("header_nav.categories"), to: "/categories" },
    { label: t("header_nav.orders"), to: "/orders" },
    { label: t("header_nav.favorites"), to: "/wishlist" },
    { label: t("header_nav.my_account"), to: "/profile" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-bg-dark border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-display font-bold text-text-light dark:text-text-dark">
              Belivay
            </span>
          </Link>

          {/* Search Bar - Desktop with category filter (hidden on search page) */}
          {!isSearchPage && (
            <div
              id="search"
              data-tutorial="header-search"
              className="hidden lg:flex flex-1 max-w-2xl mx-8 items-center rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all overflow-hidden bg-bg-light dark:bg-bg-dark-alt"
            >
              <select
                onChange={(e) => {
                  if (e.target.value) navigate(`/catalog?search=${e.target.value}`);
                }}
                defaultValue=""
                className="h-full border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 outline-none cursor-pointer min-w-[90px]"
              >
                <option value="">Tout</option>
                <option value="mode+femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="electronique">Tech</option>
                <option value="beaute">Beauté</option>
                <option value="chaussures">Chaussures</option>
                <option value="maison">Maison</option>
              </select>
              <button
                onClick={() => navigate("/search")}
                className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm text-gray-400 dark:text-gray-500 flex-1">
                  {t("header.search_placeholder")}
                </span>
              </button>
              <button
                onClick={() => navigate("/search")}
                className="flex h-full items-center justify-center bg-primary px-4 text-white hover:bg-primary-dark transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
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
              className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
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
              className="relative p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
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
                className="relative p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
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
              className="relative p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-bg-light-alt dark:hover:bg-bg-dark-alt transition-all"
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
                    className="text-text-light-secondary dark:text-text-dark-secondary"
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
                      to="/notifications"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Bell
                        size={18}
                        className="text-text-light-secondary dark:text-text-dark-secondary"
                      />
                      <span className="text-text-light dark:text-text-dark">
                        Notifications
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

                    {user.is_vendor && (
                      <Link
                        to="/vendor/dashboard"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings
                          size={18}
                          className="text-text-light-secondary dark:text-text-dark-secondary"
                        />
                        <span className="text-text-light dark:text-text-dark">
                          {t("header.seller_dashboard")}
                        </span>
                      </Link>
                    )}

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
              className="lg:hidden p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
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

        {/* Search Bar - Mobile (hidden on search page) */}
        {!isSearchPage && (
          <button
            onClick={() => navigate("/search")}
            id="search-mobile"
            className="lg:hidden pb-4 w-full"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-bg-light dark:bg-bg-dark-alt border border-gray-200 dark:border-gray-700 hover:border-primary transition-all">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-400 dark:text-gray-500">
                {t("header.search_placeholder")}
              </span>
            </div>
          </button>
        )}

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
              to="/categories"
              className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="font-medium text-text-light dark:text-text-dark">
                Categories
              </span>
            </Link>

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
              to="/catalog?promo=1"
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
                  to="/profile"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    {t("header.profile")}
                  </span>
                </Link>
                <Link
                  to="/notifications"
                  className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-medium text-text-light dark:text-text-dark">
                    Notifications
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
                {user.is_vendor && (
                  <Link
                    to="/vendor/dashboard"
                    className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="font-medium text-text-light dark:text-text-dark">
                      {t("header.seller_dashboard")}
                    </span>
                  </Link>
                )}
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
