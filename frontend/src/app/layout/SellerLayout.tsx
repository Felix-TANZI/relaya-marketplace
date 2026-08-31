// frontend/src/app/layout/SellerLayout.tsx
// Espace vendeur BelivaY — même ADN que l'espace client (chaud, orange, propre).
// Sidebar brun foncé chaleureux + fond crème + orange dominant.

import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, DollarSign, Scale,
  FileText, Lock, CircleCheckBig,
  Plus, TrendingUp, Zap, Store, Award, CreditCard, Wallet,
  Settings, Sun, Moon, Bell, X, Menu,
  ChevronRight, Sparkles, ExternalLink,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { vendorsApi, type VendorProfile } from '@/services/api/vendors';
import SellerProfileSheet from '@/features/vendors/SellerProfileSheet';

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

/** Mentions legales du pied de la feuille compte. */
const SELLER_FOOTER = [
  'BelivaY Vendeur v1.0 — Juillet 2026',
  'Partenaire Independant · ANTIC · OHADA',
  'Anonymat V5 ch.1',
];

// ─── TYPES ──────────────────────────────────
interface NavItem {
  label:  string;
  path:   string;
  icon:   React.ComponentType<{ size?: number; className?: string }>;
  locked?: boolean;
  badge?: boolean;
}
interface NavSection { label: string; items: NavItem[] }

// ─── NAV CONFIG (i18n via buildNav(t)) ──────
type TFn = (key: string) => string;
function buildNav(t: TFn): NavSection[] {
  return [
    {
      label: t('seller_layout.section_sales'),
      items: [
        { label: t('seller_layout.nav_dashboard'), path: '/seller/dashboard', icon: LayoutDashboard },
        { label: t('seller_layout.nav_orders'),    path: '/seller/orders',    icon: ShoppingBag, badge: true },
        { label: t('seller_layout.nav_disputes'),  path: '/seller/disputes',  icon: Scale },
      ],
    },
    {
      label: t('seller_layout.section_catalog'),
      items: [
        { label: t('seller_layout.nav_my_products'), path: '/seller/products',     icon: Package },
        { label: t('seller_layout.nav_add_product'), path: '/seller/products/new', icon: Plus },
      ],
    },
    {
      label: t('seller_layout.section_growth'),
      items: [
        { label: t('seller_layout.nav_analytics'), path: '/seller/analytics', icon: TrendingUp, locked: true },
        { label: t('seller_layout.nav_boost'),     path: '/seller/boost',     icon: Zap,        locked: true },
      ],
    },
    {
      label: t('seller_layout.section_shop'),
      items: [
        { label: t('seller_layout.nav_my_shop'),        path: '/seller/shop',           icon: Store },
        { label: t('seller_layout.nav_certifications'), path: '/seller/certifications', icon: Award },
        { label: t('seller_layout.nav_plans'),          path: '/seller/plans',          icon: CreditCard },
      ],
    },
    {
      label: t('seller_layout.section_account'),
      items: [
        { label: t('seller_layout.nav_wallet'),        path: '/seller/wallet',        icon: Wallet },
        { label: t('seller_layout.nav_payments'),      path: '/seller/payments',      icon: FileText },
        { label: t('seller_layout.nav_settlements'),   path: '/seller/settlements',   icon: CircleCheckBig },
        { label: t('seller_layout.nav_pending_funds'), path: '/seller/pending-funds', icon: Lock },
        { label: t('seller_layout.nav_adjustments'),   path: '/seller/adjustments',   icon: Scale },
        { label: t('seller_layout.nav_settings'),      path: '/seller/settings',      icon: Settings },
      ],
    },
  ];
}

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
  shopName, onClose, nav, t,
}: { shopName: string; onClose?: () => void; nav: NavSection[]; t: TFn }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: T.sidebar }}>

      {/* Header sidebar */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {onClose && (
          <div className="flex justify-end mb-4">
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
              <X size={14} />
            </button>
          </div>
        )}

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
              <span className="text-[10px]" style={{ color: '#9E8A70' }}>{t('seller_layout.plan_free')}</span>
            </div>
          </div>
          <Link to="/seller/plans" className="text-[10px] font-bold hover:underline flex-shrink-0" style={{ color: T.orange }}>
            {t('seller_layout.plan_pro')}
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {nav.map((section) => (
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
              <p className="text-white text-[12.5px] font-bold mb-0.5">{t('seller_layout.upgrade_title')}</p>
              <p className="text-purple-300/60 text-[10.5px] mb-2.5 leading-relaxed">
                {t('seller_layout.upgrade_desc')}
              </p>
              <Link to="/seller/plans" onClick={onClose}
                className="flex items-center gap-1.5 w-fit text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(139,92,246,0.35)', border: '1px solid rgba(139,92,246,0.4)' }}>
                {t('seller_layout.upgrade_cta')} <ChevronRight size={11} />
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
          {t('seller_layout.back_to_site')}
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
  const { i18n, t }            = useTranslation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [sheetFeedback,    setSheetFeedback]    = useState('');
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
      setProfileSheetOpen(false);
    }
  }, [location.pathname]);

  const shopName = profile?.business_name ?? user?.username ?? t('seller_layout.shop_default');

  const nav = buildNav(t);

  const MOBILE_TABS = [
    { label: t('seller_layout.nav_home'),     path: '/seller/dashboard', icon: LayoutDashboard },
    { label: t('seller_layout.nav_products'), path: '/seller/products',  icon: Package },
    { label: t('seller_layout.nav_orders'),   path: '/seller/orders',    icon: ShoppingBag },
    { label: t('seller_layout.nav_payments'), path: '/seller/payments',  icon: DollarSign },
  ];

  return (
    /* `belivay-portal` : scope typographique des espaces metier.
       Voir index.css — les titres reprennent le Plus Jakarta Sans du corps de
       texte au lieu du Syne de `font-display`. */
    <div className="belivay-portal min-h-screen" style={{ background: T.cream }}>

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
            {t('seller_layout.space_label')}
          </span>
        </div>

        <div className="flex-1" />

        {/* Shop name (desktop) */}
        <p className="hidden lg:block text-[13px] font-semibold truncate max-w-[160px]" style={{ color: T.muted }}>
          {shopName}
        </p>

        {/* Actions : notifications, theme, langue puis compte — meme ordre que
            les portails point relais, organisation et livreur. La deconnexion
            quitte le bandeau pour la feuille compte, ou elle est moins exposee
            a l'appui accidentel. */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => navigate('/seller/orders')}
            aria-label={t('seller_layout.nav_orders')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Bell size={16} />
          </button>
          <button onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => i18n.changeLanguage(i18n.language.startsWith('fr') ? 'en' : 'fr')}
            aria-label="Changer de langue"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-[11px] font-black active:scale-90"
            style={{ color: T.muted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.creamAlt; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {i18n.language.startsWith('fr') ? 'FR' : 'EN'}
          </button>
          <button onClick={() => setProfileSheetOpen(true)}
            aria-label={t('seller_layout.nav_settings_short')}
            aria-haspopup="dialog"
            aria-expanded={profileSheetOpen}
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-[11px] font-black text-white transition-all active:scale-90"
            style={{ background: `linear-gradient(135deg, ${T.orange}, #9A3412)` }}
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              : shopName.slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ═══ SIDEBAR DESKTOP ═══ */}
      <aside className="hidden lg:flex flex-col fixed top-[62px] left-0 bottom-0 w-[232px] z-[800]"
        style={{ background: T.sidebar }}>
        <SidebarContent shopName={shopName} nav={nav} t={t} />
      </aside>

      {/* ═══ SIDEBAR MOBILE OVERLAY ═══ */}
      <div onClick={() => setSidebarOpen(false)}
        className={`lg:hidden fixed inset-0 z-[790] transition-all duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(28,18,9,0.6)', backdropFilter: 'blur(4px)' }} />
      <aside className={`lg:hidden fixed top-0 left-0 bottom-0 z-[800] w-[78vw] max-w-[270px] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: T.sidebar }}>
        <SidebarContent shopName={shopName} nav={nav} t={t} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="lg:ml-[232px] pt-[62px] pb-[64px] lg:pb-0 min-h-screen">
        {/* Gouttiere resserree sur telephone : a 16px de chaque cote plus 20px
            de padding interne, chaque carte perdait un cinquieme de la
            largeur utile en fond creme. */}
        <div className="max-w-[1100px] mx-auto px-2 py-2 sm:px-5 sm:py-6 lg:px-7">
          <Outlet />
        </div>
      </main>

      {/* ═══ MOBILE BOTTOM NAV ═══
          Quatre raccourcis du quotidien, sans bouton « Plus » : le reste du
          menu s'ouvre par l'icone du bandeau, du meme cote que le tiroir. Un
          second point d'entree en bas dupliquait le geste et volait un
          cinquieme de la barre aux destinations du quotidien.
          Fond OPAQUE et `fixed` seul, sans classe CSS maison : une regle
          personnelle declarant `position` ecraserait l'utilitaire `fixed` de
          Tailwind (meme specificite, declaree plus loin dans la feuille) et la
          barre se remettrait a defiler avec la page. */}
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
              <NavLink key={tab.path} to={tab.path} className="flex-1 flex flex-col items-center justify-center gap-[3px] py-1 transition active:scale-[.93]">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={active ? { background: T.orange, boxShadow: `0 4px 14px rgba(244,121,32,0.45)` } : {}}>
                  <Icon size={17} style={{ color: active ? '#fff' : T.muted }} />
                </div>
                <span className="text-[8.5px] font-semibold" style={{ color: active ? T.orange : T.muted }}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Feuille compte : ouverte par l'avatar, elle glisse depuis la droite —
          le tiroir de navigation vient de gauche, les deux gestes restent donc
          distincts meme quand les deux panneaux ont ete appris. */}
      <SellerProfileSheet
        open={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        locale={i18n.language.startsWith('en') ? 'en' : 'fr'}
        theme={theme}
        onToggleTheme={toggleTheme}
        onChangeLanguage={(next) => void i18n.changeLanguage(next)}
        shop={{
          name: shopName,
          username: user?.username ?? '',
          email: user?.email ?? '',
          city: profile?.city ?? '',
          address: profile?.address ?? '',
          phone: profile?.phone ?? '',
          status:
            profile?.status === 'APPROVED'
              ? 'Approuvee'
              : profile?.status === 'SUSPENDED'
                ? 'Suspendue'
                : 'En attente',
          tier: profile?.certification_tier ?? 'BRONZE',
          points: profile?.total_points ?? 0,
          // Le certificat n'existe qu'une fois la boutique approuvee :
          // avant, le QR renverrait vers une vitrine non publiee.
          slug: profile?.status === 'APPROVED' ? (profile?.shop_slug ?? '') : '',
          memberSince: profile?.created_at ?? null,
        }}
        avatarUrl={user?.avatar_url || undefined}
        onLogout={() => { logout(); navigate('/'); }}
        onNavigate={(path) => { setProfileSheetOpen(false); navigate(path); }}
        onFeedback={setSheetFeedback}
        T={T}
        footer={SELLER_FOOTER}
      />

      {/* Retour des actions de la feuille compte (2FA, PWA) : un bandeau
          discret au-dessus de la barre du bas, qui s'efface au clic. */}
      {sheetFeedback ? (
        <button
          type="button"
          onClick={() => setSheetFeedback('')}
          className="fixed inset-x-3 bottom-[76px] z-[1700] rounded-[14px] px-4 py-3 text-left text-[13px] font-semibold lg:bottom-4 lg:left-auto lg:right-4 lg:w-[360px]"
          style={{ background: T.topbar, border: `1px solid ${T.border}`, color: T.text, boxShadow: '0 10px 30px rgba(28,18,9,0.18)' }}
        >
          {sheetFeedback}
        </button>
      ) : null}

    </div>
  );
}
