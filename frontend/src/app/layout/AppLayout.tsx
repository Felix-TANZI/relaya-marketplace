// frontend/src/app/layout/AppLayout.tsx
// Layout principal de l'application avec header, footer et outlet pour les pages

import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  UserCircle,
  Package,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { itemCount } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMobileMenuOpen(false);
    });

    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Fonction pour changer de langue
  const toggleLanguage = () => {
    const newLang = i18n.language === "fr" ? "en" : "fr";
    i18n.changeLanguage(newLang);
    localStorage.setItem("relaya-language", newLang);
  };

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-dark-text">
      {/* HEADER */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-strong shadow-lg" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-holographic rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-10 h-10 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-display font-bold text-xl">
                  R
                </div>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">
                Relaya
              </span>
            </Link>

            {/* Desktop Search */}
            <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary group-focus-within:text-holo-cyan transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={t("header.search_placeholder")}
                  className="w-full pl-12 pr-4 py-3 rounded-full glass border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all text-dark-text placeholder:text-dark-text-tertiary outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="px-2 py-1 text-xs rounded bg-white/5 text-dark-text-tertiary border border-white/10">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all"
                title={theme === "dark" ? "Mode clair" : "Mode sombre"}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/*  Bouton langue avec affichage de la langue actuelle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 p-3 rounded-xl glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all"
                title={
                  i18n.language === "fr"
                    ? "Switch to English"
                    : "Passer en Français"
                }
              >
                <Globe size={20} />
                <span className="text-xs font-bold uppercase">
                  {i18n.language}
                </span>
              </button>

              <Link
                to="/cart"
                className="relative p-3 rounded-xl glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all"
              >
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-holo-pink text-white text-xs font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Desktop User Section */}
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-purple hover-glow-purple transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-bold text-sm">
                      {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{user.first_name || user.username}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        profileDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 glass-strong border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-right">
                      {/* Header du dropdown */}
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-bold text-lg">
                            {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-dark-text">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                            </p>
                            <p className="text-xs text-dark-text-tertiary">@{user.username}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <Link
                          to="/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-dark-text"
                        >
                          <UserCircle size={20} className="text-holo-purple" />
                          <span>Mon profil</span>
                        </Link>

                        <Link
                          to="/orders"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-dark-text"
                        >
                          <Package size={20} className="text-holo-cyan" />
                          <span>Mes commandes</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="border-t border-white/10 py-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-red-400"
                        >
                          <LogOut size={20} />
                          <span>{t("auth.logout")}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <button className="px-6 py-3 rounded-xl bg-gradient-holographic animate-gradient-bg text-white shadow-md hover:shadow-xl transition-all font-medium">
                    <User size={18} className="inline mr-2" />
                    {t("header.login")}
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 rounded-xl glass border border-white/10"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-strong border-t border-white/10">
            <div className="container mx-auto px-4 py-6 space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary"
                  size={20}
                />
                <input
                  type="text"
                  placeholder={t("header.search_placeholder")}
                  className="w-full pl-12 pr-4 py-3 rounded-xl glass border border-white/10 text-dark-text placeholder:text-dark-text-tertiary outline-none"
                />
              </div>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col gap-2">
                <Link
                  to="/"
                  className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-cyan transition-all"
                >
                  {t("header.home")}
                </Link>
                <Link
                  to="/catalog"
                  className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-cyan transition-all"
                >
                  {t("header.catalog")}
                </Link>
                <Link
                  to="/shops"
                  className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-cyan transition-all"
                >
                  {t("header.shops")}
                </Link>
                
                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-3 glass border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-bold">
                          {(user.first_name?.[0] || user.username[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-dark-text text-sm">
                            {user.first_name || user.username}
                          </p>
                          <p className="text-xs text-dark-text-tertiary">@{user.username}</p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/profile"
                      className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-purple transition-all flex items-center gap-2"
                    >
                      <UserCircle size={18} />
                      Mon profil
                    </Link>
                    <Link
                      to="/orders"
                      className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-holo-cyan transition-all flex items-center gap-2"
                    >
                      <Package size={18} />
                      {t("orders.title")}
                    </Link>
                    <button
                      onClick={logout}
                      className="px-4 py-3 rounded-xl glass border border-white/10 hover:border-red-500 hover:text-red-400 transition-all text-left flex items-center gap-2"
                    >
                      <LogOut size={18} />
                      {t("auth.logout")}
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-3 rounded-xl bg-gradient-holographic text-white text-center"
                  >
                    {t("header.login")}
                  </Link>
                )}
              </nav>

              {/* Mobile Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={toggleTheme}
                  className="flex-1 p-3 rounded-xl glass border border-white/10"
                >
                  {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={toggleLanguage}
                  className="flex-1 p-3 rounded-xl glass border border-white/10 flex items-center justify-center gap-2"
                >
                  <Globe size={20} />
                  <span className="text-xs font-bold uppercase">
                    {i18n.language}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="glass-strong border-t border-white/10 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-holographic flex items-center justify-center text-white font-display font-bold">
                  R
                </div>
                <span className="font-display font-bold text-xl">Relaya</span>
              </div>
              <p className="text-dark-text-secondary mb-6">
                {t("footer.description")}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  className="w-10 h-10 rounded-full glass border border-white/10 hover:border-holo-cyan hover-glow-cyan transition-all flex items-center justify-center"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full glass border border-white/10 hover:border-holo-purple hover-glow-purple transition-all flex items-center justify-center"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full glass border border-white/10 hover:border-holo-pink hover-glow-pink transition-all flex items-center justify-center"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links 1 */}
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">
                {t("footer.marketplace")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/catalog"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("header.catalog")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shops"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("header.shops")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/categories"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.categories")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/deals"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.deals")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links 2 */}
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">
                {t("footer.sellers")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/sell"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.become_seller")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/seller-guide"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.seller_guide")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/seller-dashboard"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.seller_dashboard")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links 3 */}
            <div>
              <h3 className="font-display font-semibold text-lg mb-4">
                {t("footer.support")}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/help"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.help")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shipping"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.shipping")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/returns"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.returns")}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-dark-text-secondary hover:text-holo-cyan transition-colors"
                  >
                    {t("footer.contact")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-dark-text-tertiary text-sm">
              © {new Date().getFullYear()} Relaya. {t("footer.rights")}
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link
                to="/privacy"
                className="text-dark-text-tertiary hover:text-holo-cyan transition-colors"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                to="/terms"
                className="text-dark-text-tertiary hover:text-holo-cyan transition-colors"
              >
                {t("footer.terms")}
              </Link>
              <Link
                to="/legal"
                className="text-dark-text-tertiary hover:text-holo-cyan transition-colors"
              >
                {t("footer.legal")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}