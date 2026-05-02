// frontend/src/features/admin/AdminLayout.tsx
// Layout principal de l'espace admin BelivaY.
//
// DESIGN :
//   - Topbar divisée en 2 zones fusionnées :
//       Zone gauche (232px) : #111827 — logo uniquement — même fond que la sidebar
//       Zone droite (flex-1) : gradient navy — actions, avatar, langue, thème
//   → Résultat : un "L sombre" continu topbar-left + sidebar, sans cassure visuelle
//   - Le logo n'apparaît QU'UNE SEULE FOIS (zone gauche topbar)
//   - La sidebar démarre directement sur la navigation (pas de header logo)
//   - Fond de page : suit le thème clair/sombre (useAdminTheme)
//   - Accent : rouge #DC2626

import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme }       from '@/context/ThemeContext';
import { useAuth }        from '@/context/AuthContext';
import { useAdminTheme }  from '@/hooks/useAdminTheme';
import {
  LayoutDashboard, Users, Radio, Store, MapPin, FileCheck,
  ArrowDownToLine, CreditCard, Award, FilePenLine, Truck,
  ShoppingCart, Map, Scale, Package, Tag, Star, BarChart3,
  TrendingUp, Zap, Megaphone, Bot, Shield, Bell, HeadphonesIcon,
  ScrollText, Terminal, Settings, Sun, Moon, Menu, X, LogOut,
  ChevronDown, ChevronRight, ExternalLink, DollarSign, Landmark,
  LayoutGrid,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  key:   string;
  path:  string;
  icon:  React.ElementType;
  soon?: boolean;
  badge?: number | null;
  end?:  boolean;
}

interface NavSection {
  key:   string;
  items: NavItem[];
  soon?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: NavSection[] = [
  {
    key: 'section_overview',
    items: [
      { key: 'dashboard',  path: '/admin/dashboard', icon: LayoutDashboard, end: true },
      { key: 'live_users', path: '/admin/live',       icon: Radio },
    ],
  },
  {
    key: 'section_clients',
    items: [
      { key: 'customers_overview',  path: '/admin/customers/overview', icon: LayoutGrid },
      { key: 'customers_list',      path: '/admin/customers',          icon: Users, end: true },
      { key: 'customers_loyalty',   path: '/admin/customers/loyalty',  icon: Award },
      { key: 'customers_broadcast', path: '/admin/customers/broadcast',icon: Megaphone },
    ],
  },
  {
    key: 'section_vendors',
    items: [
      { key: 'vendors_overview',      path: '/admin/vendors/overview',      icon: LayoutGrid },
      { key: 'vendors_list',          path: '/admin/vendors',               icon: Store, end: true },
      { key: 'vendors_map',           path: '/admin/vendors/map',           icon: MapPin },
      { key: 'vendors_kyc',           path: '/admin/vendors/kyc',           icon: FileCheck },
      { key: 'vendors_withdrawals',   path: '/admin/vendors/withdrawals',   icon: ArrowDownToLine },
      { key: 'vendors_subscriptions', path: '/admin/vendors/subscriptions', icon: CreditCard },
      { key: 'vendors_certifications',path: '/admin/vendors/certifications',icon: Award },
      { key: 'vendors_modifications', path: '/admin/vendors/modifications', icon: FilePenLine },
    ],
  },
  {
    key: 'section_deliveries',
    items: [
      { key: 'deliveries_overview', path: '/admin/deliveries/overview',    icon: LayoutGrid },
      { key: 'deliveries_list',     path: '/admin/deliveries',             icon: Truck, end: true },
      { key: 'deliveries_perf',     path: '/admin/deliveries/performance', icon: BarChart3,   soon: true },
    ],
  },
  {
    key: 'section_operations',
    items: [
      { key: 'orders',     path: '/admin/orders',               icon: ShoppingCart, end: true },
      { key: 'orders_map', path: '/admin/orders/map',           icon: Map },
      { key: 'disputes',   path: '/admin/disputes',             icon: Scale, end: true },
      { key: 'catalogue',  path: '/admin/catalogue',            icon: Package, end: true },
      { key: 'categories', path: '/admin/catalogue/categories', icon: Tag },
      { key: 'reviews',    path: '/admin/catalogue/reviews',    icon: Star },
    ],
  },
  {
    key: 'section_finances',
    items: [
      { key: 'finances', path: '/admin/finances', icon: DollarSign },
      { key: 'account',  path: '/admin/account',  icon: Landmark },
      { key: 'plans',    path: '/admin/plans',     icon: CreditCard },
    ],
  },
  {
    key: 'section_growth',
    soon: true,
    items: [
      { key: 'analytics', path: '/admin/analytics', icon: TrendingUp, soon: true },
      { key: 'boost',     path: '/admin/boost',     icon: Zap,        soon: true },
      { key: 'marketing', path: '/admin/marketing', icon: Megaphone,  soon: true },
      { key: 'ia',        path: '/admin/ia',        icon: Bot,        soon: true },
    ],
  },
  {
    key: 'section_security',
    soon: true,
    items: [
      { key: 'security', path: '/admin/security', icon: Shield, soon: true },
    ],
  },
  {
    key: 'section_system',
    items: [
      { key: 'notifications', path: '/admin/notifications', icon: Bell },
      { key: 'support',       path: '/admin/support',       icon: HeadphonesIcon, soon: true },
      { key: 'audit',         path: '/admin/audit',         icon: ScrollText },
      { key: 'logs',          path: '/admin/logs',          icon: Terminal },
      { key: 'settings',      path: '/admin/settings',      icon: Settings },
    ],
  },
];

const DEFAULT_OPEN = new Set([
  'section_overview', 'section_clients', 'section_vendors',
  'section_operations', 'section_system',
]);
const LS_KEY = 'belivay_admin_sidebar_open';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — état sections collapsibles persisté
// ─────────────────────────────────────────────────────────────────────────────

function useSectionState() {
  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return new Set(JSON.parse(saved));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) { /* localStorage indisponible */ }
    return DEFAULT_OPEN;
  });

  const toggle = useCallback((key: string) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])); } catch (_e) { /* silencieux */ }
      return next;
    });
  }, []);

  return { open, toggle };
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────────────────────

function SideNavItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const { t } = useTranslation();
  const Icon  = item.icon;
  const label = t(`admin.nav.${item.key}`);

  if (item.soon) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-[9px] mx-2 rounded-xl text-[12.5px]"
        style={{ color: 'rgba(249,250,251,0.22)', cursor: 'default' }}
      >
        <Icon size={14} />
        <span className="flex-1 truncate">{label}</span>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: '.04em',
          background: 'rgba(249,250,251,0.07)', color: 'rgba(249,250,251,0.3)',
          borderRadius: 4, padding: '1px 5px',
        }}>
          {t('admin.nav.soon_badge')}
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-[9px] mx-2 rounded-xl text-[12.5px] font-medium transition-all duration-150"
      style={({ isActive }) =>
        isActive
          ? {
              background: 'linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)',
              color: '#fff',
              boxShadow: '0 3px 14px rgba(220,38,38,0.38)',
              fontWeight: 600,
            }
          : { color: 'rgba(249,250,251,0.52)' }
      }
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        if (!el.style.background.includes('DC2626')) {
          el.style.background = 'rgba(249,250,251,0.07)';
          el.style.color      = 'rgba(249,250,251,0.88)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        if (!el.style.background.includes('DC2626')) {
          el.style.background = 'transparent';
          el.style.color      = 'rgba(249,250,251,0.52)';
        }
      }}
    >
      {({ isActive }) => (
        <>
          <Icon size={14} style={{ flexShrink: 0 }} />
          <span className="flex-1 truncate">{label}</span>
          {item.badge != null && item.badge > 0 && !isActive && (
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: '#DC2626', color: '#fff',
              borderRadius: 9999, padding: '0 6px', minWidth: 18,
              textAlign: 'center', lineHeight: '18px',
            }}>
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR CONTENT — navigation pure, sans logo (logo uniquement dans topbar)
// ─────────────────────────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { t }            = useTranslation();
  const { open, toggle } = useSectionState();
  const location         = useLocation();

  // Auto-ouvre la section qui contient la route active
  useEffect(() => {
    for (const section of SECTIONS) {
      const hasActive = section.items.some(item =>
        location.pathname === item.path ||
        location.pathname.startsWith(item.path + '/')
      );
      if (hasActive && !open.has(section.key)) toggle(section.key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Navigation scrollable — démarre directement sans header logo ── */}
      <nav
        className="flex-1 overflow-y-auto py-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
      >
        {SECTIONS.map(section => {
          const isOpen       = open.has(section.key);
          const sectionTitle = t(`admin.nav.${section.key}`);

          return (
            <div key={section.key}>
              <button
                onClick={() => toggle(section.key)}
                className="w-full flex items-center gap-2 px-5 py-2 mt-1 text-left"
              >
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '.08em',
                  color: section.soon ? 'rgba(249,250,251,0.18)' : 'rgba(249,250,251,0.32)',
                  textTransform: 'uppercase', flex: 1,
                }}>
                  {sectionTitle}
                </span>
                {section.soon && (
                  <span style={{
                    fontSize: 8.5, fontWeight: 800,
                    background: 'rgba(249,250,251,0.07)', color: 'rgba(249,250,251,0.25)',
                    borderRadius: 4, padding: '1px 5px',
                  }}>
                    {t('admin.nav.soon_badge')}
                  </span>
                )}
                {isOpen
                  ? <ChevronDown  size={12} style={{ color: 'rgba(249,250,251,0.28)', flexShrink: 0 }} />
                  : <ChevronRight size={12} style={{ color: 'rgba(249,250,251,0.28)', flexShrink: 0 }} />
                }
              </button>

              {isOpen && (
                <div className="pb-1">
                  {section.items.map(item => (
                    <SideNavItem key={item.key} item={item} onClick={onClose} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Pied de sidebar ── */}
      <div
        className="px-3 pb-4 pt-2 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all"
          style={{ color: 'rgba(249,250,251,0.28)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(249,250,251,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(249,250,251,0.28)'; }}
        >
          <ExternalLink size={13} />
          {t('admin.nav.back_to_site')}
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_W = 232;
const TOPBAR_H  = 60;

// Couleur de base sidebar — partagée entre zone-logo topbar et sidebar
const SIDEBAR_BG = '#111827';
// Gradient droite topbar
const TOPBAR_GRADIENT = 'linear-gradient(135deg,#16213e 0%,#1a1a2e 35%,#0f3460 70%,#1a1230 100%)';

export default function AdminLayout() {
  const { t, i18n }           = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout }      = useAuth();
  const navigate               = useNavigate();
  const location               = useLocation();
  const T                      = useAdminTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const close = () => setSidebarOpen(false);
    close();
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/'); };

  const initials = user
    ? (((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')) || (user.username?.[0] ?? 'A')).toUpperCase()
    : 'A';

  return (
    <div style={{ minHeight: '100vh', background: T.page, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>

      {/* ═══════════════════════════════════════════════════════════════════
          TOPBAR — divisée en 2 zones visuellement fusionnées
          Zone A (232px) : #111827 identique sidebar → logo uniquement
          Zone B (flex)  : gradient navy             → toutes les actions
      ═══════════════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-[900] flex"
        style={{
          height: TOPBAR_H,
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 2px 20px rgba(9,14,26,0.5)',
        }}
      >
        {/* ── Zone A : logo — même fond que la sidebar ── */}
        <div
          className="hidden lg:flex items-center px-5 flex-shrink-0"
          style={{
            width: SIDEBAR_W,
            background: SIDEBAR_BG,
            // Bordure basse subtile pour distinguer sans casser la fusion
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <Link to="/admin/dashboard" className="flex items-center">
            <img src="/admin-belivay-logo-red.png" alt="BelivaY Admin" className="h-11 w-auto object-contain" />
          </Link>
        </div>

        {/* ── Zone B : gradient + toutes les actions ── */}
        <div
          className="flex-1 flex items-center gap-3 px-4"
          style={{
            background: TOPBAR_GRADIENT,
            borderBottom: '1px solid rgba(220,38,38,0.1)',
          }}
        >
          {/* Burger mobile (masqué desktop car zone A le remplace) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ color: 'rgba(249,250,251,0.65)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Menu size={17} />
          </button>

          {/* Logo mobile (visible uniquement sur mobile, zone A n'existe pas) */}
          <Link to="/admin/dashboard" className="lg:hidden flex items-center flex-shrink-0">
            <img src="/admin-belivay-logo-red.png" alt="BelivaY Admin" className="h-9 w-auto object-contain" />
          </Link>

          {/* Indicateur production (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{
              background: '#10B981',
              boxShadow: '0 0 6px rgba(16,185,129,0.8)',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.45)', fontWeight: 600 }}>
              Production
            </span>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">

            {/* Langue */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black transition-all"
              style={{ color: 'rgba(249,250,251,0.55)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            >
              {i18n.language.toUpperCase()}
            </button>

            {/* Thème */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ color: 'rgba(249,250,251,0.55)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/admin/notifications')}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ color: 'rgba(249,250,251,0.55)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            >
              <Bell size={15} />
            </button>

            {/* Séparateur */}
            <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

            {/* Avatar + nom + logout */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[12px] text-white flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#DC2626,#FCA5A5)',
                  border: '2px solid rgba(220,38,38,0.45)',
                  boxShadow: '0 0 8px rgba(220,38,38,0.35)',
                }}
              >
                {initials}
              </div>

              <div className="hidden lg:block">
                <p style={{ fontSize: 12.5, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.2 }}>
                  {user?.first_name || user?.username}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(249,250,251,0.38)', fontWeight: 600 }}>
                  {t('admin.account.role_super')}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ color: 'rgba(249,250,251,0.42)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(249,250,251,0.42)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR DESKTOP
          top = TOPBAR_H → démarre exactement sous la zone A du topbar
          Même fond #111827 → fusion parfaite avec zone A
      ═══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex flex-col fixed z-[800]"
        style={{
          top: TOPBAR_H,
          left: 0,
          bottom: 0,
          width: SIDEBAR_W,
          background: SIDEBAR_BG,
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR MOBILE — drawer avec logo (zone A n'existe pas sur mobile)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        onClick={() => setSidebarOpen(false)}
        className="lg:hidden fixed inset-0 z-[850] transition-all duration-300"
        style={{
          background: 'rgba(9,14,26,0.7)',
          backdropFilter: 'blur(4px)',
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
        }}
      />
      <aside
        className="lg:hidden fixed top-0 left-0 bottom-0 z-[860] flex flex-col transition-transform duration-300"
        style={{
          width: Math.min(SIDEBAR_W + 20, 280),
          background: SIDEBAR_BG,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Header logo dans le drawer mobile */}
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{ height: TOPBAR_H, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <Link to="/admin/dashboard" onClick={() => setSidebarOpen(false)} className="flex items-center">
            <img src="/admin-belivay-logo-red.png" alt="BelivaY Admin" className="h-11 w-auto object-contain" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: 'rgba(249,250,251,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTENU PRINCIPAL
      ═══════════════════════════════════════════════════════════════════ */}
      <main
        style={{ paddingTop: TOPBAR_H, minHeight: '100vh' }}
        className="lg:ml-[232px]"
      >
        <div
          className="min-h-[calc(100vh-60px)] px-4 sm:px-5 lg:px-7 py-6"
          style={{ maxWidth: 1400, margin: '0 auto' }}
        >
          <Outlet />
        </div>
      </main>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
