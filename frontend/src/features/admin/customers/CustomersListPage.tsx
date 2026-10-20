// frontend/src/features/admin/customers/CustomersListPage.tsx
// Gestion clients BelivaY — page admin complète.
// Sections : KPIs · Charts · Filtres · Sélection groupée · Tableau/Cards · Pagination
// Backend   : GET /api/vendors/admin/users/ (liste enrichie)
//             GET /api/vendors/admin/customers/stats/ (KPIs + graphiques)

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  ShoppingCart, UserX, UserCheck, MoreHorizontal, Eye,
  ArrowUpDown, ArrowUp, ArrowDown, Download,
  UserCheck2, Ban, BellRing, ToggleLeft, ToggleRight,
  ChevronDown, X, Filter,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { adminApi, type AdminUser as AdminUserBase, type CustomerStats } from '@/services/api/admin';

// Extension locale du type AdminUser avec les champs enrichis du nouveau serializer.
// Compatible avec l'ancien admin.ts (sans les champs) ET le nouveau (avec les champs).
// Les champs optionnels (?) évitent toute erreur TypeScript pendant la transition.
type AdminUser = AdminUserBase & {
  vendor_status?:        'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null;
  vendor_business_name?: string | null;
  vendor_plan?:          'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | null;
  courier_status?:       'APPROVED' | 'PENDING' | 'INACTIVE' | null;
  actor_roles?:          Array<'CLIENT' | 'VENDOR' | 'COURIER' | 'DELIVERY_ORGANIZATION' | 'RELAY_POINT' | 'STAFF' | 'ADMIN'>;
  loyalty_tier?:         'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  loyalty_points?:       number;
  city?:                 string | null;
};
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtShortDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const fmtRelative = (d: string | null, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return t('ad2_customers_list.relative_now');
  if (s < 3600)   return t('ad2_customers_list.relative_minutes', { count: Math.floor(s / 60) });
  if (s < 86400)  return t('ad2_customers_list.relative_hours', { count: Math.floor(s / 3600) });
  if (s < 604800) return t('ad2_customers_list.relative_days', { count: Math.floor(s / 86400) });
  return fmtDate(d);
};
const isNew = (d: string) => Date.now() - new Date(d).getTime() < 7 * 86400_000;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES LOCAUX
// ─────────────────────────────────────────────────────────────────────────────

type SortKey   = 'username' | 'date_joined' | 'last_login' | 'total_orders' | 'total_spent' | 'loyalty_points';
type SortDir   = 'asc' | 'desc';
type RoleTab   = 'all' | 'buyer' | 'vendor' | 'courier' | 'staff';
type StatusFilter = 'all' | 'active' | 'banned' | 'inactive';
type PlanFilter   = 'all' | 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
type DateFilter   = 'all' | 'today' | 'week' | 'month';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VISUELLE
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, { labelKey: string; color: string; bg: string }> = {
  FREE:     { labelKey: 'ad2_customers_list.plan_free',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  STARTER:  { labelKey: 'ad2_customers_list.plan_starter',  color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  PRO:      { labelKey: 'ad2_customers_list.plan_pro',      color: '#F47920', bg: 'rgba(244,121,32,0.12)'  },
  BUSINESS: { labelKey: 'ad2_customers_list.plan_business', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  TRIAL:    { labelKey: 'ad2_customers_list.plan_trial',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

const TIER_CONFIG: Record<string, { labelKey: string; color: string }> = {
  BRONZE:  { labelKey: 'ad2_customers_list.tier_bronze',  color: '#CD7F32' },
  SILVER:  { labelKey: 'ad2_customers_list.tier_silver',  color: '#A8A9AD' },
  GOLD:    { labelKey: 'ad2_customers_list.tier_gold',    color: '#FFD700' },
  DIAMOND: { labelKey: 'ad2_customers_list.tier_diamond', color: '#60A5FA' },
};

const ROLE_COLORS: Record<string, string> = {
  role_buyer:  '#3B82F6',
  role_vendor: '#F47920',
  role_courier:'#10B981',
  role_delivery_org: '#0891B2',
  role_relay_point:  '#1D4ED8',
  role_staff:  '#8B5CF6',
  role_admin:  '#DC2626',
};

const CHART_COLORS = ['#3B82F6', '#F47920', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Badge statut compte */
function StatusBadge({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const s: React.CSSProperties = { fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, display: 'inline-block' };
  if (user.is_superuser) return <span style={{ ...s, background: 'rgba(220,38,38,0.15)',   color: '#DC2626', border: '1px solid rgba(220,38,38,0.3)' }}>{t('ad2_customers_list.status_super_admin')}</span>;
  if (user.is_staff)     return <span style={{ ...s, background: 'rgba(139,92,246,0.15)',  color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' }}>{t('ad2_customers_list.status_staff')}</span>;
  if (user.is_banned)    return <span style={{ ...s, background: 'rgba(239,68,68,0.12)',   color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>{t('ad2_customers_list.status_banned')}</span>;
  if (!user.is_active)   return <span style={{ ...s, background: 'rgba(107,114,128,0.12)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.2)' }}>{t('ad2_customers_list.status_inactive')}</span>;
  return <span style={{ ...s, background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>{t('ad2_customers_list.status_active')}</span>;
}

/** Chips de rôles (Acheteur, Vendeur, Staff…) */
function RoleChips({ user }: { user: AdminUser }) {
  const { t } = useTranslation();
  const chips: { label: string; color: string }[] = [];
  const roles = user.actor_roles?.length ? user.actor_roles : [
    'CLIENT',
    ...(user.is_vendor ? ['VENDOR' as const] : []),
    ...(user.is_courier ? ['COURIER' as const] : []),
    ...(user.is_staff ? ['STAFF' as const] : []),
    ...(user.is_superuser ? ['ADMIN' as const] : []),
  ];
  if (roles.includes('CLIENT'))  chips.push({ label: t('ad2_customers_list.role_client'),  color: ROLE_COLORS.role_buyer });
  if (roles.includes('VENDOR'))  chips.push({ label: t('ad2_customers_list.role_vendor'), color: ROLE_COLORS.role_vendor });
  if (roles.includes('COURIER')) chips.push({ label: t('ad2_customers_list.role_courier'), color: ROLE_COLORS.role_courier });
  if (roles.includes('DELIVERY_ORGANIZATION')) chips.push({ label: t('ad2_customers_list.role_delivery_org'), color: ROLE_COLORS.role_delivery_org });
  if (roles.includes('RELAY_POINT'))           chips.push({ label: t('ad2_customers_list.role_relay_point'), color: ROLE_COLORS.role_relay_point });
  if (roles.includes('STAFF'))   chips.push({ label: t('ad2_customers_list.role_staff'),   color: ROLE_COLORS.role_staff });
  if (roles.includes('ADMIN'))   chips.push({ label: t('ad2_customers_list.role_admin'),   color: ROLE_COLORS.role_admin });

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c, i) => (
        <span key={i} style={{
          fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
          background: c.color + '18', color: c.color, border: `1px solid ${c.color}30`,
        }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** Badge plan vendeur */
function PlanBadge({ plan }: { plan: string | null }) {
  const { t } = useTranslation();
  if (!plan) return null;
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.FREE;
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>
      {t(cfg.labelKey)}
    </span>
  );
}

/** Badge niveau fidélité */
function TierBadge({ tier }: { tier: string }) {
  const { t } = useTranslation();
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.BRONZE;
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
      background: cfg.color + '18', color: cfg.color,
    }}>
      {t(cfg.labelKey)}
    </span>
  );
}

/** Avatar coloré selon rôle principal */
function UserAvatar({ user, size = 32 }: { user: AdminUser; size?: number }) {
  const initials = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '') || user.username[0]).toUpperCase();
  const bg =
    user.is_superuser ? 'linear-gradient(135deg,#DC2626,#991B1B)' :
    user.is_staff     ? 'linear-gradient(135deg,#8B5CF6,#6D28D9)' :
    user.is_vendor    ? 'linear-gradient(135deg,#F47920,#C2590A)' :
                        'linear-gradient(135deg,#374151,#1F2937)';
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size / 4,
        background: bg, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: size * 0.38, flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

/** Skeleton row (tableau desktop) */
function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  const shimmer = {
    height: 12, borderRadius: 6, background: T.border,
    backgroundImage: `linear-gradient(90deg,${T.border} 25%,${T.cardAlt} 50%,${T.border} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s ease-in-out infinite',
  };
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[16, 40, 25, 20, 15, 20, 18, 18, 10].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{ ...shimmer, width: `${w}px` }} />
        </td>
      ))}
    </tr>
  );
}

/** Tooltip custom recharts */
function ChartTooltip({ active, payload, label, suffix = '' }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; suffix?: string;
}) {
  const T = useAdminTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
      <p style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{payload[0].value}{suffix}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function CustomersListPage() {
  const T             = useAdminTheme();
  const { t }          = useTranslation();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  // ── État données ──────────────────────────────────────────────────────────
  const [users,    setUsers]   = useState<AdminUser[]>([]);
  const [stats,    setStats]   = useState<CustomerStats | null>(null);
  const [loading,  setLoading] = useState(true);

  // ── État filtres ──────────────────────────────────────────────────────────
  const [search,     setSearch]     = useState('');
  const [roleTab,    setRoleTab]    = useState<RoleTab>('all');
  const [statusF,    setStatusF]    = useState<StatusFilter>('all');
  const [planF,      setPlanF]      = useState<PlanFilter>('all');
  const [dateF,      setDateF]      = useState<DateFilter>('all');
  const [sort,       setSort]       = useState<SortKey>('date_joined');
  const [dir,        setDir]        = useState<SortDir>('desc');
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState<10 | 20 | 50>(20);

  // ── État UI ───────────────────────────────────────────────────────────────
  const [selected,   setSelected]   = useState<Set<number>>(new Set());
  const [mobileMenu, setMobileMenu] = useState<number | null>(null);
  const [acting,     setActing]     = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'status' | 'plan' | 'date' | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        adminApi.listUsers(),
        adminApi.getCustomerStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch {
      showToast(t('ad2_customers_list.toast_error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage ─────────────────────────────────────────────────────────────
  const now = Date.now();
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    if (q && ![u.username, u.email, u.first_name, u.last_name, u.vendor_business_name]
      .some(v => v?.toLowerCase().includes(q))) return false;

    if (roleTab === 'buyer'  && !u.actor_roles?.includes('CLIENT') && (u.is_staff || u.is_superuser)) return false;
    if (roleTab === 'vendor' && !u.is_vendor) return false;
    if (roleTab === 'courier' && !u.is_courier) return false;
    if (roleTab === 'staff'  && !u.is_staff && !u.is_superuser) return false;

    if (statusF === 'active'   && (!u.is_active || u.is_banned)) return false;
    if (statusF === 'banned'   && !u.is_banned) return false;
    if (statusF === 'inactive' && (u.is_active || u.is_banned)) return false;

    if (planF !== 'all' && u.vendor_plan !== planF) return false;

    const joined = new Date(u.date_joined).getTime();
    if (dateF === 'today' && now - joined > 86400_000)         return false;
    if (dateF === 'week'  && now - joined > 7 * 86400_000)     return false;
    if (dateF === 'month' && now - joined > 30 * 86400_000)    return false;

    return true;
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va =
      sort === 'username'      ? a.username :
      sort === 'date_joined'   ? a.date_joined :
      sort === 'last_login'    ? (a.last_login ?? '') :
      sort === 'total_orders'  ? a.total_orders :
      sort === 'total_spent'   ? a.total_spent :
      sort === 'loyalty_points'? a.loyalty_points :
      '';
    const vb =
      sort === 'username'      ? b.username :
      sort === 'date_joined'   ? b.date_joined :
      sort === 'last_login'    ? (b.last_login ?? '') :
      sort === 'total_orders'  ? b.total_orders :
      sort === 'total_spent'   ? b.total_spent :
      sort === 'loyalty_points'? b.loyalty_points :
      '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSort(k); setDir('desc'); }
    setPage(1);
  };

  const handleSearch = (v: string) => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setSearch(v); setPage(1); setSelected(new Set()); }, 220);
  };

  const activeFilters = [statusF !== 'all', planF !== 'all', dateF !== 'all'].filter(Boolean).length;

  const resetFilters = () => { setStatusF('all'); setPlanF('all'); setDateF('all'); setSearch(''); setPage(1); setSelected(new Set()); };

  // ── Sélection ─────────────────────────────────────────────────────────────
  const currentIds  = paginated.map(u => u.id);
  const allSelected = currentIds.length > 0 && currentIds.every(id => selected.has(id));
  const someSelected= currentIds.some(id => selected.has(id)) && !allSelected;

  const toggleAll  = () => {
    if (allSelected) setSelected(prev => { const s = new Set(prev); currentIds.forEach(id => s.delete(id)); return s; });
    else             setSelected(prev => { const s = new Set(prev); currentIds.forEach(id => s.add(id));    return s; });
  };
  const toggleOne  = (id: number) => setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const clearSel   = () => setSelected(new Set());

  // ── Actions individuelles ─────────────────────────────────────────────────
  const doAction = async (
    u: AdminUser,
    action: 'ban' | 'unban' | 'deactivate' | 'activate'
  ) => {
    const msgs = {
      ban:        { title: t('ad2_customers_list.confirm_ban_title', { username: u.username }),        message: t('ad2_customers_list.confirm_ban_message'), confirmText: t('ad2_customers_list.confirm_ban_confirm'),      type: 'danger'  as const },
      unban:      { title: t('ad2_customers_list.confirm_unban_title', { username: u.username }),      message: t('ad2_customers_list.confirm_unban_message'), confirmText: t('ad2_customers_list.confirm_unban_confirm'), type: 'warning' as const },
      deactivate: { title: t('ad2_customers_list.confirm_deactivate_title', { username: u.username }),    message: t('ad2_customers_list.confirm_deactivate_message'),     confirmText: t('ad2_customers_list.confirm_deactivate_confirm'),  type: 'warning' as const },
      activate:   { title: t('ad2_customers_list.confirm_activate_title', { username: u.username }),     message: t('ad2_customers_list.confirm_activate_message'),        confirmText: t('ad2_customers_list.confirm_activate_confirm'),   type: 'warning' as const },
    };
    const ok = await confirm({ ...msgs[action], cancelText: t('ad2_customers_list.confirm_cancel') });
    if (!ok) return;
    setActing(u.id);
    try {
      if (action === 'ban')        await adminApi.banUser(u.id, 'Décision admin');
      else if (action === 'unban') await adminApi.unbanUser(u.id);
      else                         await adminApi.updateUser(u.id, { is_active: action === 'activate' });
      showToast(t('ad2_customers_list.toast_action_done'), 'success');
      await load();
    } catch { showToast(t('ad2_customers_list.toast_error'), 'error'); }
    finally  { setActing(null); }
  };

  // ── Actions groupées ──────────────────────────────────────────────────────
  const bulkAction = async (action: 'ban' | 'deactivate') => {
    const targets = users.filter(u => selected.has(u.id) && !u.is_staff && !u.is_superuser);
    if (!targets.length) return;
    const ok = await confirm({
      title: action === 'ban'
        ? t('ad2_customers_list.confirm_bulk_ban_title', { count: targets.length })
        : t('ad2_customers_list.confirm_bulk_deactivate_title', { count: targets.length }),
      message: t('ad2_customers_list.confirm_bulk_message'),
      type: 'danger', confirmText: t('ad2_customers_list.confirm_bulk_confirm'), cancelText: t('ad2_customers_list.confirm_cancel'),
    });
    if (!ok) return;
    for (const u of targets) {
      try {
        if (action === 'ban') await adminApi.banUser(u.id, 'Bannissement groupé');
        else                  await adminApi.updateUser(u.id, { is_active: false });
      } catch { /* silencieux */ }
    }
    showToast(t('ad2_customers_list.toast_bulk_done', { count: targets.length }), 'success');
    clearSel();
    await load();
  };

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = (ids?: Set<number>) => {
    const data = ids ? sorted.filter(u => ids.has(u.id)) : sorted;
    const rows = data.map(u => [
      u.id, u.username, u.email,
      `${u.first_name} ${u.last_name}`.trim(),
      (u.actor_roles ?? []).join('+') || (u.is_superuser ? t('ad2_customers_list.csv_role_admin') : u.is_staff ? t('ad2_customers_list.csv_role_staff') : u.is_vendor ? t('ad2_customers_list.csv_role_client_vendor') : t('ad2_customers_list.csv_role_client')),
      u.is_banned ? t('ad2_customers_list.csv_status_banned') : u.is_active ? t('ad2_customers_list.csv_status_active') : t('ad2_customers_list.csv_status_inactive'),
      u.vendor_plan ?? '—', u.loyalty_tier, u.loyalty_points,
      u.total_orders, u.total_spent, u.city ?? '—',
      fmtDate(u.date_joined), fmtDate(u.last_login),
    ].join(';'));
    const headers = t('ad2_customers_list.csv_headers');
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `belivay_clients_${ids ? 'selection_' : ''}${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Icône tri ─────────────────────────────────────────────────────────────
  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k
      ? <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
      : dir === 'asc'
        ? <ArrowUp   size={11} style={{ color: T.red }} />
        : <ArrowDown size={11} style={{ color: T.red }} />;

  // ── Dropdown helpers ──────────────────────────────────────────────────────
  const DropBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap"
      style={{
        background: active ? T.red + '18' : T.cardAlt,
        color: active ? T.red : T.muted,
        border: `1px solid ${active ? T.red + '40' : T.border}`,
      }}
    >
      {label} <ChevronDown size={11} />
    </button>
  );

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? (
      <div
        className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[140px]"
        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
      >
        {children}
      </div>
    ) : null;

  const DropItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={() => { onClick(); setOpenDropdown(null); }}
      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px] transition-all"
      style={{ color: active ? T.red : T.text, background: active ? T.red + '10' : 'transparent', fontWeight: active ? 700 : 400 }}
    >
      {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, flexShrink: 0 }} />}
      {!active && <span style={{ width: 6, height: 6, flexShrink: 0 }} />}
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad2_customers_list.heading')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {stats && stats.kpis.new_this_week > 0 && (
              <span style={{ color: '#10B981', fontWeight: 700, marginRight: 6 }}>
                {t('ad2_customers_list.new_this_week', { count: stats.kpis.new_this_week })}
              </span>
            )}
            {t('ad2_customers_list.accounts_registered', { count: users.length })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => exportCSV()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            <Download size={13} /> <span className="hidden sm:inline">{t('ad2_customers_list.export_csv')}</span>
          </button>
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t('ad2_customers_list.refresh')}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('ad2_customers_list.kpi_total'),        value: stats?.kpis.total       ?? '—', sub: t('ad2_customers_list.kpi_total_sub', { count: stats?.kpis.new_this_month ?? 0 }),    accent: T.text,    tab: null as RoleTab | null },
          { label: t('ad2_customers_list.kpi_active_30d'),   value: stats?.kpis.active_30d  ?? '—', sub: t('ad2_customers_list.kpi_active_30d_sub'),                             accent: '#10B981', tab: null },
          { label: t('ad2_customers_list.kpi_vendors'),      value: stats?.kpis.vendors     ?? '—', sub: t('ad2_customers_list.kpi_vendors_sub', { count: stats?.kpis.pending_vendors ?? 0 }), accent: '#F47920', tab: 'vendor' as RoleTab | null },
          { label: t('ad2_customers_list.kpi_banned'),       value: stats?.kpis.banned      ?? '—', sub: t('ad2_customers_list.kpi_banned_sub'),                             accent: '#EF4444', tab: null },
        ].map((kpi, i) => (
          <button
            key={i}
            onClick={() => { if (kpi.tab) { setRoleTab(kpi.tab); setPage(1); } else if (i === 3) { setStatusF('banned'); setPage(1); } else if (i === 1) { setDateF('month'); setPage(1); } }}
            className="rounded-2xl p-4 text-left transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = kpi.accent + '55')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
          >
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              {kpi.label}
            </p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: loading ? T.border : T.text, lineHeight: 1 }}>
              {loading ? '—' : (typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value)}
            </p>
            <p style={{ fontSize: 11, color: kpi.accent === T.text ? T.muted : kpi.accent, marginTop: 4 }}>{kpi.sub}</p>
          </button>
        ))}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* AreaChart inscriptions — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text }}>
                  {t('ad2_customers_list.chart_registrations_title')}
                </p>
                <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                  {t('ad2_customers_list.chart_registrations_sub', { count: stats.kpis.new_this_month })}
                </p>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: 8,
                background: 'rgba(16,185,129,0.12)', color: '#10B981',
                fontSize: 11, fontWeight: 700,
              }}>
                {t('ad2_customers_list.chart_registrations_badge', { count: stats.kpis.new_this_week })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={stats.registrations_chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtShortDate}
                  tick={{ fill: T.muted, fontSize: 10 }}
                  axisLine={false} tickLine={false} interval={4}
                />
                <YAxis tick={{ fill: T.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix={t('ad2_customers_list.chart_tooltip_suffix')} />} />
                <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2}
                  fill="url(#regGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donuts — 1/3 */}
          <div className="rounded-2xl p-5 space-y-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>

            {/* Donut rôles */}
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>
                {t('ad2_customers_list.chart_roles_title')}
              </p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={90} height={90}>
                  <PieChart>
                    <Pie data={stats.role_distribution} dataKey="count" cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={2}>
                      {stats.role_distribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1">
                  {stats.role_distribution.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: CHART_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: T.muted }}>{d.role}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Séparateur */}
            <div style={{ height: 1, background: T.border }} />

            {/* Donut plans vendeurs */}
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 10 }}>
                {t('ad2_customers_list.chart_plans_title')}
              </p>
              {stats.plan_distribution.length === 0 ? (
                <p style={{ fontSize: 12, color: T.muted }}>{t('ad2_customers_list.chart_no_vendors')}</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={stats.plan_distribution} dataKey="count" cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={2}>
                        {stats.plan_distribution.map((d, i) => (
                          <Cell key={i} fill={PLAN_CONFIG[d.plan]?.color ?? CHART_COLORS[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {stats.plan_distribution.map((d, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: PLAN_CONFIG[d.plan]?.color ?? CHART_COLORS[i], flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: T.muted }}>{PLAN_CONFIG[d.plan] ? t(PLAN_CONFIG[d.plan].labelKey) : d.plan}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Barre filtres OU barre sélection ─────────────────────────────── */}
      <div className="rounded-2xl overflow-visible" style={{ background: T.card, border: `1px solid ${T.border}` }}>

        {selected.size > 0 ? (
          /* ── Barre sélection groupée ── */
          <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, flexShrink: 0 }}>
              {t('ad2_customers_list.selected_count', { count: selected.size })}
            </span>
            <div style={{ width: 1, height: 18, background: T.border }} />
            <button
              onClick={() => bulkAction('ban')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <Ban size={12} /> {t('ad2_customers_list.bulk_ban')}
            </button>
            <button
              onClick={() => bulkAction('deactivate')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            >
              <ToggleLeft size={12} /> {t('ad2_customers_list.bulk_deactivate')}
            </button>
            <button
              onClick={() => exportCSV(selected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            >
              <Download size={12} /> {t('ad2_customers_list.bulk_export', { count: selected.size })}
            </button>
            <button onClick={clearSel} className="ml-auto" style={{ color: T.muted }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          /* ── Filtres normaux ── */
          <div className="flex flex-col gap-3 p-4">

            {/* Ligne 1 : Tabs rôles + recherche */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {([
                  { key: 'all' as RoleTab,    label: t('ad2_customers_list.tab_all'),      count: users.length },
                  { key: 'buyer' as RoleTab,  label: t('ad2_customers_list.tab_buyer'),   count: users.filter(u => u.actor_roles?.includes('CLIENT') ?? true).length },
                  { key: 'vendor' as RoleTab, label: t('ad2_customers_list.tab_vendor'),  count: users.filter(u => u.is_vendor).length },
                  { key: 'courier' as RoleTab,label: t('ad2_customers_list.tab_courier'),  count: users.filter(u => u.is_courier).length },
                  { key: 'staff' as RoleTab,  label: t('ad2_customers_list.tab_staff'),     count: users.filter(u => u.is_staff || u.is_superuser).length },
                ] as { key: RoleTab; label: string; count: number }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setRoleTab(tab.key); setPage(1); setSelected(new Set()); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all"
                    style={{ background: roleTab === tab.key ? T.red : 'transparent', color: roleTab === tab.key ? '#fff' : T.muted }}
                    onMouseEnter={e => { if (roleTab !== tab.key) (e.currentTarget.style.color = T.text); }}
                    onMouseLeave={e => { if (roleTab !== tab.key) (e.currentTarget.style.color = T.muted); }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 700,
                      background: roleTab === tab.key ? 'rgba(255,255,255,0.25)' : T.cardAlt,
                      color: roleTab === tab.key ? '#fff' : T.muted,
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1 hidden sm:block" />

              {/* Recherche */}
              <div className="relative w-full sm:w-56 flex-shrink-0">
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
                <input
                  type="text"
                  placeholder={t('ad2_customers_list.search_placeholder')}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none transition-all"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                  onFocus={e  => (e.target.style.borderColor = T.red)}
                  onBlur={e   => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>
            </div>

            {/* Ligne 2 : Dropdowns de filtres */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />

              {/* Statut */}
              <div className="relative">
                <DropBtn
                  label={statusF === 'all' ? t('ad2_customers_list.filter_status') : { active: t('ad2_customers_list.filter_status_active'), banned: t('ad2_customers_list.filter_status_banned'), inactive: t('ad2_customers_list.filter_status_inactive') }[statusF] ?? t('ad2_customers_list.filter_status')}
                  active={statusF !== 'all'}
                  onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                />
                <DropMenu show={openDropdown === 'status'}>
                  {([['all', t('ad2_customers_list.filter_status_all')], ['active', t('ad2_customers_list.filter_status_active')], ['banned', t('ad2_customers_list.filter_status_banned')], ['inactive', t('ad2_customers_list.filter_status_inactive')]] as [StatusFilter, string][]).map(([k, l]) => (
                    <DropItem key={k} label={l} active={statusF === k} onClick={() => { setStatusF(k); setPage(1); }} />
                  ))}
                </DropMenu>
              </div>

              {/* Plan */}
              <div className="relative">
                <DropBtn
                  label={planF === 'all' ? t('ad2_customers_list.filter_plan') : (PLAN_CONFIG[planF] ? t(PLAN_CONFIG[planF].labelKey) : t('ad2_customers_list.filter_plan'))}
                  active={planF !== 'all'}
                  onClick={() => setOpenDropdown(openDropdown === 'plan' ? null : 'plan')}
                />
                <DropMenu show={openDropdown === 'plan'}>
                  <DropItem label={t('ad2_customers_list.filter_plan_all')} active={planF === 'all'} onClick={() => { setPlanF('all'); setPage(1); }} />
                  {(['FREE', 'STARTER', 'PRO', 'BUSINESS'] as PlanFilter[]).map(k => (
                    <DropItem key={k} label={PLAN_CONFIG[k] ? t(PLAN_CONFIG[k].labelKey) : k} active={planF === k} onClick={() => { setPlanF(k); setPage(1); }} />
                  ))}
                </DropMenu>
              </div>

              {/* Période */}
              <div className="relative">
                <DropBtn
                  label={({ all: t('ad2_customers_list.filter_date'), today: t('ad2_customers_list.filter_date_today'), week: t('ad2_customers_list.filter_date_week'), month: t('ad2_customers_list.filter_date_month') } as Record<DateFilter, string>)[dateF]}
                  active={dateF !== 'all'}
                  onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                />
                <DropMenu show={openDropdown === 'date'}>
                  {([['all', t('ad2_customers_list.filter_date_all')], ['today', t('ad2_customers_list.filter_date_today')], ['week', t('ad2_customers_list.filter_date_week')], ['month', t('ad2_customers_list.filter_date_month')]] as [DateFilter, string][]).map(([k, l]) => (
                    <DropItem key={k} label={l} active={dateF === k} onClick={() => { setDateF(k); setPage(1); }} />
                  ))}
                </DropMenu>
              </div>

              {/* Reset filtres actifs */}
              {activeFilters > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                  style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}
                >
                  <X size={11} /> {t(activeFilters > 1 ? 'ad2_customers_list.filters_active_plural' : 'ad2_customers_list.filters_active', { count: activeFilters })}
                </button>
              )}

              <p style={{ fontSize: 12, color: T.muted, marginLeft: 'auto' }}>
                {t(sorted.length > 1 ? 'ad2_customers_list.results_count_plural' : 'ad2_customers_list.results_count', { count: sorted.length })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tableau / Cards ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
        onClick={() => setOpenDropdown(null)}
      >
        {/* ── DESKTOP : tableau ── */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                {/* Checkbox all */}
                <th style={{ padding: '10px 16px', width: 40 }}>
                  <button onClick={toggleAll} style={{ color: T.muted }}>
                    {allSelected ? <UserCheck2 size={15} style={{ color: T.red }} /> :
                     someSelected ? <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.red}`, borderRadius: 3, background: T.red + '30' }} /> :
                     <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.border}`, borderRadius: 3 }} />}
                  </button>
                </th>
                {[
                  { label: t('ad2_customers_list.col_user'),    k: 'username'       as SortKey | null },
                  { label: t('ad2_customers_list.col_roles'),        k: null },
                  { label: t('ad2_customers_list.col_status'),         k: null },
                  { label: t('ad2_customers_list.col_loyalty'),       k: 'loyalty_points' as SortKey | null },
                  { label: t('ad2_customers_list.col_plan'),           k: null },
                  { label: t('ad2_customers_list.col_orders'),      k: 'total_orders'   as SortKey | null },
                  { label: t('ad2_customers_list.col_spent'),        k: 'total_spent'    as SortKey | null },
                  { label: t('ad2_customers_list.col_joined'),        k: 'date_joined'    as SortKey | null },
                  { label: t('ad2_customers_list.col_last_login'),   k: 'last_login'     as SortKey | null },
                  { label: '',               k: null },
                ].map((col, i) => (
                  <th
                    key={i}
                    onClick={col.k ? () => toggleSort(col.k!) : undefined}
                    className={col.k ? 'cursor-pointer select-none' : ''}
                    style={{
                      padding: '10px 12px', textAlign: 'left',
                      fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                      color: sort === col.k ? T.red : T.muted,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.k && <SortIcon k={col.k} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} T={T} />)
                : paginated.length === 0
                  ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '60px 0', textAlign: 'center' }}>
                        <div className="flex flex-col items-center gap-3">
                          <AlertCircle size={28} style={{ color: T.muted }} />
                          <p style={{ fontSize: 14, color: T.muted }}>{t('ad2_customers_list.no_users_found')}</p>
                          {activeFilters > 0 && (
                            <button onClick={resetFilters} style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>
                              {t('ad2_customers_list.reset_filters')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                  : paginated.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none',
                        background: selected.has(u.id) ? T.red + '08' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!selected.has(u.id)) e.currentTarget.style.background = T.cardAlt; }}
                      onMouseLeave={e => { e.currentTarget.style.background = selected.has(u.id) ? T.red + '08' : 'transparent'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => toggleOne(u.id)} style={{ color: T.muted }}>
                          {selected.has(u.id)
                            ? <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.red}`, borderRadius: 3, background: T.red, position: 'relative' }}>
                                <span style={{ position: 'absolute', top: 1, left: 2, color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>
                              </span>
                            : <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.border}`, borderRadius: 3 }} />
                          }
                        </button>
                      </td>
                      {/* Utilisateur */}
                      <td style={{ padding: '12px 12px' }}>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar user={u} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>
                                {(u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                              </p>
                              {isNew(u.date_joined) && (
                                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                                  {t('ad2_customers_list.badge_new')}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: T.muted }}>{u.email}</p>
                            {u.city && <p style={{ fontSize: 10.5, color: T.muted }}>{u.city}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Rôles */}
                      <td style={{ padding: '12px 12px' }}><RoleChips user={u} /></td>
                      {/* Statut */}
                      <td style={{ padding: '12px 12px' }}><StatusBadge user={u} /></td>
                      {/* Fidélité */}
                      <td style={{ padding: '12px 12px' }}>
                        <div>
                          <TierBadge tier={u.loyalty_tier} />
                          <p style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{t('ad2_customers_list.loyalty_pts', { count: u.loyalty_points })}</p>
                        </div>
                      </td>
                      {/* Plan */}
                      <td style={{ padding: '12px 12px' }}>
                        {u.is_vendor ? (
                          <div>
                            <PlanBadge plan={u.vendor_plan} />
                            {u.vendor_business_name && (
                              <p style={{ fontSize: 10, color: T.muted, marginTop: 2 }} className="truncate max-w-[100px]">{u.vendor_business_name}</p>
                            )}
                          </div>
                        ) : <span style={{ fontSize: 11, color: T.muted }}>—</span>}
                      </td>
                      {/* Commandes */}
                      <td style={{ padding: '12px 12px' }}>
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart size={12} style={{ color: T.muted }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.total_orders}</span>
                        </div>
                      </td>
                      {/* Dépensé */}
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: u.total_spent > 0 ? '#10B981' : T.muted }}>
                          {fmtXaf(u.total_spent)}
                        </span>
                      </td>
                      {/* Inscrit */}
                      <td style={{ padding: '12px 12px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtDate(u.date_joined)}
                      </td>
                      {/* Dernière co. */}
                      <td style={{ padding: '12px 12px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtRelative(u.last_login, t)}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            to={`/admin/customers/${u.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}
                          >
                            <Eye size={12} />
                          </Link>
                          {!u.is_superuser && (
                            <div className="relative">
                              <button
                                onClick={() => setMobileMenu(mobileMenu === u.id ? null : u.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                              >
                                {acting === u.id ? <RefreshCw size={11} className="animate-spin" /> : <MoreHorizontal size={12} />}
                              </button>
                              {mobileMenu === u.id && (
                                <div
                                  className="absolute right-0 top-8 z-20 rounded-xl py-1 overflow-hidden"
                                  style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', minWidth: 170 }}
                                >
                                  <Link
                                    to={`/admin/orders?user=${u.id}`}
                                    className="flex items-center gap-2 px-4 py-2.5 text-[12px]"
                                    style={{ color: T.text }}
                                    onClick={() => setMobileMenu(null)}
                                  >
                                    <ShoppingCart size={13} /> {t('ad2_customers_list.action_orders')}
                                  </Link>
                                  <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                                  {u.is_banned ? (
                                    <button onClick={() => { setMobileMenu(null); doAction(u, 'unban'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}>
                                      <UserCheck size={13} /> {t('ad2_customers_list.action_unban')}
                                    </button>
                                  ) : (
                                    <button onClick={() => { setMobileMenu(null); doAction(u, 'ban'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#EF4444' }}>
                                      <UserX size={13} /> {t('ad2_customers_list.action_ban')}
                                    </button>
                                  )}
                                  {u.is_active ? (
                                    <button onClick={() => { setMobileMenu(null); doAction(u, 'deactivate'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: T.muted }}>
                                      <ToggleLeft size={13} /> {t('ad2_customers_list.action_deactivate')}
                                    </button>
                                  ) : (
                                    <button onClick={() => { setMobileMenu(null); doAction(u, 'activate'); }}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}>
                                      <ToggleRight size={13} /> {t('ad2_customers_list.action_activate')}
                                    </button>
                                  )}
                                  <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                                  <button onClick={() => { setMobileMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: T.muted }}>
                                    <BellRing size={13} /> {t('ad2_customers_list.action_notify')} <span style={{ fontSize: 9, opacity: 0.6 }}>{t('ad2_customers_list.action_notify_soon')}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* ── MOBILE : cards ── */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={28} style={{ color: T.muted }} />
              <p style={{ fontSize: 14, color: T.muted }}>{t('ad2_customers_list.no_users_found')}</p>
              {activeFilters > 0 && (
                <button onClick={resetFilters} style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>
                  {t('ad2_customers_list.reset_filters')}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map(u => (
                <div
                  key={u.id}
                  className="p-4 flex items-start gap-3"
                  style={{ background: selected.has(u.id) ? T.red + '08' : 'transparent' }}
                >
                  {/* Checkbox mobile */}
                  <button onClick={() => toggleOne(u.id)} className="mt-1 flex-shrink-0">
                    {selected.has(u.id)
                      ? <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.red}`, borderRadius: 3, background: T.red, position: 'relative' }}>
                          <span style={{ position: 'absolute', top: 1, left: 2, color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>
                        </span>
                      : <span style={{ display: 'block', width: 14, height: 14, border: `2px solid ${T.border}`, borderRadius: 3 }} />
                    }
                  </button>

                  <UserAvatar user={u} size={40} />

                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : nom + statut */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p style={{ fontSize: 13, fontWeight: 600, color: T.text }} className="truncate">
                            {(u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                          </p>
                          {isNew(u.date_joined) && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981', flexShrink: 0 }}>
                              {t('ad2_customers_list.badge_new')}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: T.muted }} className="truncate">{u.email}</p>
                      </div>
                      <StatusBadge user={u} />
                    </div>

                    {/* Ligne 2 : chips rôles + plan */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <RoleChips user={u} />
                      {u.is_vendor && <PlanBadge plan={u.vendor_plan} />}
                      <TierBadge tier={u.loyalty_tier} />
                    </div>

                    {/* Ligne 3 : métriques */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span style={{ fontSize: 11, color: T.muted }}>
                        <ShoppingCart size={10} style={{ display: 'inline', marginRight: 3 }} />
                        {t('ad2_customers_list.orders_abbrev', { count: u.total_orders })}
                      </span>
                      {u.total_spent > 0 && (
                        <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>
                          {fmtXaf(u.total_spent)}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: T.muted }}>{fmtRelative(u.last_login, t)}</span>
                      {u.city && <span style={{ fontSize: 11, color: T.muted }}>{u.city}</span>}
                    </div>
                  </div>

                  {/* Menu mobile */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => setMobileMenu(mobileMenu === u.id ? null : u.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {mobileMenu === u.id && (
                      <div
                        className="absolute right-0 top-10 z-20 rounded-xl overflow-hidden py-1"
                        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', minWidth: 160 }}
                      >
                        <Link to={`/admin/customers/${u.id}`} className="flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: T.text }} onClick={() => setMobileMenu(null)}>
                          <Eye size={13} /> {t('ad2_customers_list.action_view_profile')}
                        </Link>
                        <Link to={`/admin/orders?user=${u.id}`} className="flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: T.text }} onClick={() => setMobileMenu(null)}>
                          <ShoppingCart size={13} /> {t('ad2_customers_list.action_orders')}
                        </Link>
                        {!u.is_superuser && (
                          <>
                            <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
                            {u.is_banned
                              ? <button onClick={() => { setMobileMenu(null); doAction(u, 'unban'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#10B981' }}><UserCheck size={13} /> {t('ad2_customers_list.action_unban')}</button>
                              : <button onClick={() => { setMobileMenu(null); doAction(u, 'ban'); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px]" style={{ color: '#EF4444' }}><UserX size={13} /> {t('ad2_customers_list.action_ban')}</button>
                            }
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && sorted.length > 0 && (
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3 flex-wrap gap-3"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            {/* Lignes par page */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12, color: T.muted }}>{t('ad2_customers_list.rows_per_page')}</span>
              {PAGE_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => { setPageSize(s); setPage(1); }}
                  className="w-8 h-7 rounded-lg text-[12px] font-semibold transition-all"
                  style={{
                    background: pageSize === s ? T.red : T.cardAlt,
                    color:      pageSize === s ? '#fff'  : T.muted,
                    border:     `1px solid ${pageSize === s ? T.red : T.border}`,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Info */}
            <p style={{ fontSize: 12, color: T.muted }}>
              {t('ad2_customers_list.pagination_range', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, sorted.length), total: sorted.length })}
            </p>

            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, color: page === 1 ? T.muted : T.text, border: `1px solid ${T.border}`, opacity: page === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <span key={`e${i}`} style={{ fontSize: 12, color: T.muted, padding: '0 4px' }}>…</span>
                    : <button key={p} onClick={() => setPage(p as number)}
                        className="w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center"
                        style={{ background: page === p ? T.red : T.cardAlt, color: page === p ? '#fff' : T.muted, border: `1px solid ${page === p ? T.red : T.border}` }}>
                        {p}
                      </button>
                )
              }
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, color: page === totalPages ? T.muted : T.text, border: `1px solid ${T.border}`, opacity: page === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
