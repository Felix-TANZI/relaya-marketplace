import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { 
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
  Settings
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const totalItems = items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

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

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.search_placeholder')}
                className="w-full px-6 py-3 pr-12 rounded-xl bg-bg-light dark:bg-bg-dark-alt border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
            >
              <Globe size={20} className="text-text-light-secondary dark:text-text-dark-secondary" />
              <span className="text-sm font-medium text-text-light dark:text-text-dark uppercase">
                {i18n.language}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-primary" />
              ) : (
                <Moon size={20} className="text-text-light-secondary" />
              )}
            </button>

            {/* Cart */}
            <Link to="/cart" className="relative p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all">
              <ShoppingCart size={24} className="text-text-light dark:text-text-dark" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-text-light dark:text-text-dark">
                    {user.first_name || user.email}
                  </span>
                  <ChevronDown size={16} className="text-text-light-secondary dark:text-text-dark-secondary" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-bg-dark-alt rounded-xl shadow-soft-lg border border-gray-200 dark:border-gray-700 py-2">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="font-semibold text-text-light dark:text-text-dark">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user.email}</p>
                    </div>
                    
                    <Link to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setUserMenuOpen(false)}>
                      <User size={18} className="text-text-light-secondary dark:text-text-dark-secondary" />
                      <span className="text-text-light dark:text-text-dark">{t('header.profile')}</span>
                    </Link>
                    
                    <Link to="/orders" className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setUserMenuOpen(false)}>
                      <Package size={18} className="text-text-light-secondary dark:text-text-dark-secondary" />
                      <span className="text-text-light dark:text-text-dark">{t('header.orders')}</span>
                    </Link>
                    
                    <Link to="/wishlist" className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setUserMenuOpen(false)}>
                      <Heart size={18} className="text-text-light-secondary dark:text-text-dark-secondary" />
                      <span className="text-text-light dark:text-text-dark">{t('header.wishlist')}</span>
                    </Link>

                    {user.is_vendor && (
                      <Link to="/vendor/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setUserMenuOpen(false)}>
                        <Settings size={18} className="text-text-light-secondary dark:text-text-dark-secondary" />
                        <span className="text-text-light dark:text-text-dark">{t('header.seller_dashboard')}</span>
                      </Link>
                    )}

                    <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600"
                      >
                        <LogOut size={18} />
                        <span>{t('header.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link to="/login">
                  <button className="px-4 py-2 text-text-light dark:text-text-dark font-medium hover:bg-bg-light dark:hover:bg-bg-dark-alt rounded-lg transition-all">
                    {t('header.login')}
                  </button>
                </Link>
                <Link to="/register">
                  <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-all">
                    {t('header.signup')}
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
                <Menu size={24} className="text-text-light dark:text-text-dark" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <form onSubmit={handleSearch} className="lg:hidden pb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('header.search_placeholder')}
              className="w-full px-4 py-2.5 pr-10 rounded-lg bg-bg-light dark:bg-bg-dark-alt border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded transition-all"
            >
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-bg-dark">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            <Link to="/catalog" className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setMobileMenuOpen(false)}>
              <span className="font-medium text-text-light dark:text-text-dark">{t('header.catalog')}</span>
            </Link>
            
            {user ? (
              <>
                <Link to="/profile" className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <span className="font-medium text-text-light dark:text-text-dark">{t('header.profile')}</span>
                </Link>
                <Link to="/orders" className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <span className="font-medium text-text-light dark:text-text-dark">{t('header.orders')}</span>
                </Link>
                {user.is_vendor && (
                  <Link to="/vendor/dashboard" className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setMobileMenuOpen(false)}>
                    <span className="font-medium text-text-light dark:text-text-dark">{t('header.seller_dashboard')}</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-red-600 font-medium"
                >
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block px-4 py-3 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark-alt transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <span className="font-medium text-text-light dark:text-text-dark">{t('header.login')}</span>
                </Link>
                <Link to="/register" className="block px-4 py-3 bg-primary text-white font-medium rounded-lg text-center" onClick={() => setMobileMenuOpen(false)}>
                  {t('header.signup')}
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
                {i18n.language === 'fr' ? '🇬🇧 English' : '🇫🇷 Français'}
              </span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}