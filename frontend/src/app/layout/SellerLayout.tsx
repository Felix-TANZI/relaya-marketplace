// frontend/src/app/layout/SellerLayout.tsx
// Espace vendeur BelivaY — même ADN que l'espace client (chaud, orange, propre).
// Sidebar brun foncé chaleureux + fond crème + orange dominant.

import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, DollarSign, Scale,
  Plus, TrendingUp, Zap, Store, Award, CreditCard, Wallet,
  Settings, Sun, Moon, Bell, X, Menu, LogOut,
  ChevronRight, MoreHorizontal, Sparkles, ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';

// ─── TOKENS ─────────────────────────────────
const T = {
  orange:   '#F47920',
  orangeD:  '#E06510',
  cream:    '#F5F0E8',
  creamAlt: '#EDE7DC',
  sidebar:  '#1C1209',   // brun presque noir — chaleureux
  topbar:   '#FFFFFF',
  border:   '#E8E2D9',
  text:     '#1A1209',
  muted:    '#7C6E5A',
};

// ─── TYPES ──────────────────────────────────
interface NavItem {
  label:  string;
  path:   string;
  icon:   React.ComponentType<{ size?: number; className?: string }>;
  locked?: boolean;
  badge?: boolean;
}
interface NavSection { label: string; items: NavItem[] }

// ─── NAV CONFIG ─────────────────────────────
const NAV: NavSection[] = [
  {
    label: 'Ventes',
    items: [
      { label: 'Dashboard',        path: '/seller/dashboard',     icon: LayoutDashboard },
      { label: 'Commandes',        path: '/seller/orders',        icon: ShoppingBag, badge: true },
      { label: 'Paiements',        path: '/seller/payments',      icon: DollarSign },
      { label: 'Litiges',          path: '/seller/disputes',      icon: Scale },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Mes produits',     path: '/seller/products',      icon: Package },
      { label: 'Ajouter un produit', path: '/seller/products/new', icon: Plus },
    ],
  },
  {
    label: 'Croissance',
    items: [
      { label: 'Analytiques IA',   path: '/seller/analytics',     icon: TrendingUp, locked: true },
      { label: 'Boost & Pub',      path: '/seller/boost',         icon: Zap,        locked: true },
    ],
  },
  {
    label: 'Boutique',
    items: [
      { label: 'Ma boutique',      path: '/seller/shop',          icon: Store },
      { label: 'Certifications',   path: '/seller/certifications',icon: Award },
      { label: 'Plans & Tarifs',   path: '/seller/plans',         icon: CreditCard },
    ],
  },
  {
    label: 'Mon compte',
    items: [
      { label: 'Portefeuille',     path: '/seller/wallet',        icon: Wallet },
      { label: 'Paramètres',       path: '/seller/settings',      icon: Settings },
    ],
  },
];

// ─── NAV ITEM (hors composant principal) ────
function SidebarNavItem({
  item, onClick,
}: { item: NavItem; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end
      onClick={onClick}
      className={({ isActive }) => [
        'flex items-center gap-3 px-3 py-[10px] mx-3 rounded-xl text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'font-semibold'
          : 'text-[#9E8A70] hover:text-white hover:bg-white/8',
      ].join(' ')}
      style={({ isActive }) =>
        isActive
          ? {
              background: T.orange,
              color: '#fff',
              boxShadow: `0 4px 18px rgba(244,121,32,0.45)`,
              fontWeight: 600,
            }
          : {}
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? 'text-white' : ''} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.locked && !isActive && (
            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-purple-300 bg-purple-400/15">
              PRO
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── SIDEBAR CONTENT (hors composant principal) ─
function SidebarContent({
  shopName, onClose,
}: { shopName: string; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: T.sidebar }}>

      {/* Header sidebar */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          {/* Logo BelivaY */}
          <div className="flex items-center gap-2">
            <img
              src="/belivay-logo.png"
              alt="BelivaY"
              className="h-8 w-auto object-contain"
            />
            <div>
              <p className="text-[10px] font-semibold" style={{ color: T.orange }}>
                Espace Vendeur
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Shop card */}
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[13px] flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${T.orange},${T.orangeD})` }}>
            {shopName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[12px] truncate">{shopName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px]" style={{ color: '#9E8A70' }}>Plan Gratuit · Actif</span>
            </div>
          </div>
          <Link to="/seller/plans" className="text-[10px] font-bold hover:underline flex-shrink-0" style={{ color: T.orange }}>
            Pro
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {NAV.map((section) => (
          <div key={section.label} className="mb-2">
            <p className="px-6 py-1.5 text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: '#5A4A36' }}>
              {section.label}
            </p>
            {section.items.map((item) => (
              <SidebarNavItem key={item.path} item={item} onClick={onClose} />
            ))}
          </div>
        ))}
      </nav>

      {/* Upgrade Pro */}
      <div className="mx-3 mb-3">
        <div className="rounded-xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(109,40,217,0.15))', border: '1px solid rgba(124,58,237,0.25)' }}>
          <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-purple-400/10 pointer-events-none" />
          <div className="flex gap-2 items-start relative">
            <Sparkles size={15} className="text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-[12.5px] font-bold mb-0.5">Passer au Pro</p>
              <p className="text-purple-300/60 text-[10.5px] mb-2.5 leading-relaxed">
                Commission 10% · Analytics · 3 Boosts
              </p>
              <Link to="/seller/plans" onClick={onClose}
                className="flex items-center gap-1.5 w-fit text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(139,92,246,0.35)', border: '1px solid rgba(139,92,246,0.4)' }}>
                Découvrir <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back to site */}
      <div className="px-3 pb-4 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all"
          style={{ color: '#7C6E5A' }}
          onMouseEnter={e => (e.currentTarget.style.color = T.orange)}
          onMouseLeave={e => (e.currentTarget.style.color = '#7C6E5A')}
        >
          <ExternalLink size={13} />
          Retour au site
        </Link>
      </div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────
export default function SellerLayout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout }       = useAuth();
  const navigate               = useNavigate();
  const location               = useLocation();
  const { i18n }               = useTranslation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen,    setMoreOpen]    = useState(false);
  const [profile,     setProfile]     = useState<VendorProfile | null>(null);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    vendorsApi.getProfile()
      .then(setProfile)
      .catch(() => navigate('/become-seller'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setSidebarOpen(false);
      setMoreOpen(false);
    }
  }, [location.pathname]);

  const shopName = profile?.business_name ?? user?.username ?? 'Ma Boutique';

  const MOBILE_TABS = [
    { label: 'Accueil',   path: '/seller/dashboard', icon: LayoutDashboard },
    { label: 'Produits',  path: '/seller/products',  icon: Package },
    { label: 'Commandes', path: '/seller/orders',    icon: ShoppingBag },
    { label: 'Paiements', path: '/seller/payments',  icon: DollarSign },
  ];

  return (
    <div className="min-h-screen" style={{ background: T.cream }}>

      {/* ═══ TOPBAR ═══ */}
      <header
        className="fixed top-0 left-0 right-0 z-[900] h-[62px] flex items-center gap-3 px-4"
        style={{
          background: T.topbar,
          borderBottom: `1px solid ${T.border}`,
          boxShadow: '0 1px 0 rgba(0,0,0,0.05)',
        }}
      >
        {/* Burger mobile */}
        <button onClick={() => setSidebarOpen(true)}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ color: T.muted }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/belivay-logo.png"
            alt="BelivaY"
            className="h-8 w-auto object-contain"
          />
        </Link>

        {/* Séparateur + label espace */}
        <div className="hidden lg:flex items-center gap-2 ml-1">
          <span className="text-gray-300">·</span>
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `rgba(244,121,32,0.10)`, color: T.orange, border: `1px solid rgba(244,121,32,0.2)` }}>
            Espace Vendeur
          </span>
        </div>

        <div className="flex-1" />

        {/* Shop name (desktop) */}
        <p className="hidden lg:block text-[13px] font-semibold truncate max-w-[160px]" style={{ color: T.muted }}>
          {shopName}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-sm font-bold"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {i18n.language.toUpperCase()}
          </button>
          <button onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Bell size={16} />
          </button>
          <button onClick={() => { logout(); navigate('/'); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside className="hidden lg:flex flex-col fixed top-[62px] left-0 bottom-0 w-[232px] z-[800]"
        style={{ background: T.sidebar }}>
        <SidebarContent shopName={shopName} />
      </aside>

      {/* ═══ SIDEBAR MOBILE OVERLAY ═══ */}
      <div onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 z-[790] transition-all duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }} />
      <aside className={`lg:hidden fixed top-0 left-0 bottom-0 z-[800] w-[78vw] max-w-[270px] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: T.sidebar }}>
        <SidebarContent shopName={shopName} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="lg:ml-[232px] pt-[62px] pb-[64px] lg:pb-0 min-h-screen">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-5 lg:px-7 py-6">
          <Outlet />
        </div>
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[700]"
        style={{
          background: T.topbar,
          borderTop: `1px solid ${T.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}>
        <div className="flex items-center h-[56px] px-2">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
            return (
              <NavLink key={tab.path} to={tab.path} className="flex-1 flex flex-col items-center justify-center gap-[3px] py-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={active ? { background: T.orange, boxShadow: `0 4px 14px rgba(244,121,32,0.4)` } : {}}>
                  <Icon size={17} style={{ color: active ? '#fff' : T.muted }} />
                </div>
                <span className="text-[8px] font-semibold" style={{ color: active ? T.orange : T.muted }}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-[3px] py-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center">
              <MoreHorizontal size={17} style={{ color: T.muted }} />
            </div>
            <span className="text-[8px] font-semibold" style={{ color: T.muted }}>Plus</span>
          </button>
        </div>
      </nav>

      {/* MORE SHEET */}
      <div onClick={() => setMoreOpen(false)}
        className={`lg:hidden fixed inset-0 z-[1500] transition-all duration-300 ${moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }} />
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[1501] rounded-t-[22px] transition-transform duration-300 ${moreOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ background: T.topbar, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', borderTop: `1px solid ${T.border}` }}>
        <div className="w-8 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: T.border }} />
        {[
          { label: 'Litiges',       path: '/seller/disputes',      icon: Scale,      sub: 'Résolution de conflits' },
          { label: 'Ma boutique',   path: '/seller/shop',          icon: Store,      sub: 'Vitrine publique' },
          { label: 'Analytiques',  path: '/seller/analytics',     icon: TrendingUp, sub: 'Statistiques avancées' },
          { label: 'Boost',        path: '/seller/boost',         icon: Zap,        sub: 'Publicité & visibilité' },
          { label: 'Plans',        path: '/seller/plans',         icon: CreditCard, sub: 'Starter · Pro · Elite' },
          { label: 'Paramètres',   path: '/seller/settings',      icon: Settings,   sub: 'Compte & sécurité' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3.5 px-5 py-3 transition-colors"
              style={{ borderBottom: `1px solid ${T.border}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.cream; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `rgba(244,121,32,0.10)` }}>
                <Icon size={18} style={{ color: T.orange }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold" style={{ color: T.text }}>{item.label}</p>
                <p className="text-[10.5px]" style={{ color: T.muted }}>{item.sub}</p>
              </div>
              <ChevronRight size={14} style={{ color: T.muted }} />
            </NavLink>
          );
        })}
        <div className="px-5 pt-3">
          <button onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 transition-all"
            style={{ background: 'rgba(239,68,68,0.05)' }}>
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
