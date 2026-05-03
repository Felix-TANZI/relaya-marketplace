// frontend/src/features/admin/UsersManagementPage.tsx
// Gestion des utilisateurs — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, RefreshCw, Download, Eye,
  ShieldOff, Shield, Trash2, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, Store, Filter, ChevronDown, X, Bike,
} from 'lucide-react';
import { adminApi, type AdminUser, type UserFilters } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CFG = {
  vendor:     { label: 'Vendeur',     color: '#F47920', bg: 'rgba(244,121,32,0.12)' },
  courier:    { label: 'Livreur',     color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
};

type SortKey = 'date_joined' | 'last_login' | 'username';
type SortDir = 'asc' | 'desc';
type RoleFilter = 'all' | 'vendor' | 'courier' | 'banned';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const getRoles = (u: AdminUser): string[] => {
  const roles: string[] = [];
  if (u.is_vendor) roles.push('vendor');
  if (u.is_courier) roles.push('courier');
  return roles.length ? roles : ['courier'];
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadges({ user }: { user: AdminUser }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {getRoles(user).map(role => {
        const cfg = ROLE_CFG[role as keyof typeof ROLE_CFG] ?? ROLE_CFG.courier;
        return (
          <span key={role} style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        );
      })}
      {user.is_banned && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
          BANNI
        </span>
      )}
    </div>
  );
}

function SkeletonRow({ T }: { T: ReturnType<typeof useAdminTheme> }) {
  return (
    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
      {[40, 120, 100, 80, 70, 70, 50].map((w, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <div style={{ height: 11, width: w, borderRadius: 5, background: T.border, animation: 'shimmer 1.4s ease-in-out infinite', backgroundImage: `linear-gradient(90deg,${T.border} 25%,${T.cardAlt} 50%,${T.border} 75%)`, backgroundSize: '200% 100%' }} />
        </td>
      ))}
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function UsersManagementPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<number | null>(null);

  const [roleF,    setRoleF]    = useState<RoleFilter>('all');
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState<SortKey>('date_joined');
  const [dir,      setDir]      = useState<SortDir>('desc');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState<10|20|50>(20);
  const [openDrop, setOpenDrop] = useState<'role' | null>(null);
  const searchRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const filters: UserFilters = {};
    if (roleF === 'vendor') filters.role = 'vendor';
    if (roleF === 'courier') filters.role = 'courier';
    if (roleF === 'banned') filters.is_banned = true;
    try {
      const data = await adminApi.listUsers(filters);
      setUsers(data);
    } catch {
      toastRef.current('Erreur chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleF]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local ────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [u.username, u.email, u.first_name, u.last_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const va = sort === 'username' ? a.username : sort === 'date_joined' ? a.date_joined : a.last_login ?? '';
    const vb = sort === 'username' ? b.username : sort === 'date_joined' ? b.date_joined : b.last_login ?? '';
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
    searchRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 220);
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort !== k
      ? <ArrowUpDown size={11} style={{ color: T.muted, opacity: 0.4 }} />
      : dir === 'asc' ? <ArrowUp size={11} style={{ color: T.red }} /> : <ArrowDown size={11} style={{ color: T.red }} />;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = {
    total:   users.length,
    couriers: users.filter(u => u.is_courier).length,
    vendors: users.filter(u => u.is_vendor).length,
    banned:  users.filter(u => u.is_banned).length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleBan = async (u: AdminUser) => {
    const reason = window.prompt(`Raison du bannissement de @${u.username} :`);
    if (!reason?.trim()) return;
    setActing(u.id);
    try {
      await adminApi.banUser(u.id, reason.trim());
      showToast(`@${u.username} banni`, 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const handleUnban = async (u: AdminUser) => {
    const ok = await confirm({ title: `Débannir @${u.username} ?`, message: 'L\'accès sera restauré immédiatement.', type: 'warning', confirmText: 'Débannir', cancelText: 'Annuler' });
    if (!ok) return;
    setActing(u.id);
    try {
      await adminApi.unbanUser(u.id);
      showToast(`@${u.username} débanni`, 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const handleDelete = async (u: AdminUser) => {
    const ok = await confirm({ title: `Supprimer @${u.username} ?`, message: 'Cette action est irréversible.', type: 'danger', confirmText: 'Supprimer', cancelText: 'Annuler' });
    if (!ok) return;
    setActing(u.id);
    try {
      await adminApi.deleteUser(u.id);
      showToast('Utilisateur supprimé', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const exportCSV = () => {
    const url = adminApi.exportUsersCSV({ role: roleF !== 'all' && roleF !== 'banned' ? roleF : undefined, is_banned: roleF === 'banned' ? true : undefined });
    window.open(url, '_blank');
  };

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? (
      <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[160px]"
        style={{ background: T.card, border: `1px solid ${T.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
        {children}
      </div>
    ) : null;

  const DropItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={() => { onClick(); setOpenDrop(null); }}
      className="w-full flex items-center gap-2 px-4 py-2 text-left text-[12px]"
      style={{ color: active ? T.red : T.text, background: active ? T.red + '10' : 'transparent', fontWeight: active ? 700 : 400 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? T.red : 'transparent', flexShrink: 0 }} />
      {label}
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" onClick={() => setOpenDrop(null)}>

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Gestion des Utilisateurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.banned > 0 && <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>{kpis.banned} bannis ·</span>}
            {users.length.toLocaleString('fr-FR')} utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <Download size={13} /> <span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => load()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Acteurs',  value: kpis.total,   accent: T.text,    onClick: () => setRoleF('all') },
          { label: 'Vendeurs', value: kpis.vendors, accent: '#F47920', onClick: () => setRoleF('vendor') },
          { label: 'Livreurs', value: kpis.couriers, accent: '#10B981', onClick: () => setRoleF('courier') },
          { label: 'Bannis',   value: kpis.banned,  accent: T.red,     onClick: () => setRoleF('banned') },
        ].map((k, i) => (
          <button key={i} onClick={() => { k.onClick(); setPage(1); }}
            className="rounded-2xl p-4 text-left w-full transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = k.accent + '55')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
              {loading ? '—' : k.value.toLocaleString('fr-FR')}
            </p>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />
        {/* Dropdown rôle */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setOpenDrop(openDrop === 'role' ? null : 'role')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
            style={{ background: roleF !== 'all' ? T.red + '18' : T.cardAlt, color: roleF !== 'all' ? T.red : T.muted, border: `1px solid ${roleF !== 'all' ? T.red + '40' : T.border}` }}>
            {({ all: 'Tous les acteurs', vendor: 'Vendeurs', courier: 'Livreurs', banned: 'Bannis' } as Record<RoleFilter, string>)[roleF]} <ChevronDown size={11} />
          </button>
          <DropMenu show={openDrop === 'role'}>
            {([['all','Tous les acteurs'],['vendor','Vendeurs'],['courier','Livreurs'],['banned','Bannis']] as [RoleFilter,string][]).map(([k,l]) => (
              <DropItem key={k} label={l} active={roleF === k} onClick={() => { setRoleF(k); setPage(1); }} />
            ))}
          </DropMenu>
        </div>
        {roleF !== 'all' && (
          <button onClick={() => { setRoleF('all'); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}>
            <X size={11} /> Effacer
          </button>
        )}
        {/* Recherche */}
        <div className="relative flex-1 max-w-72 ml-auto">
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
          <input type="text" placeholder="Username, email, boutique…"
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
            style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
            onFocus={e => (e.target.style.borderColor = T.red)}
            onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
        </div>
        <p style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{sorted.length} résultat{sorted.length > 1 ? 's' : ''}</p>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                {([
                  { label: 'Utilisateur', k: 'username'    as SortKey | null },
                  { label: 'Email',       k: null },
                  { label: 'Rôles',       k: null },
                  { label: 'Boutique',    k: null },
                  { label: 'Inscrit le',  k: 'date_joined' as SortKey | null },
                  { label: 'Dernière connexion', k: 'last_login' as SortKey | null },
                  { label: '',            k: null },
                ] as { label: string; k: SortKey | null }[]).map((col, i) => (
                  <th key={i}
                    onClick={col.k ? () => toggleSort(col.k!) : undefined}
                    className={col.k ? 'cursor-pointer select-none' : ''}
                    style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: sort === col.k ? T.red : T.muted }}>
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
                  ? <tr><td colSpan={7} style={{ padding: '60px 0', textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-3">
                        <Users size={28} style={{ color: T.muted }} />
                        <p style={{ fontSize: 14, color: T.muted }}>Aucun utilisateur trouvé</p>
                      </div>
                    </td></tr>
                  : paginated.map((u, i) => (
                    <tr key={u.id}
                      style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none', opacity: u.is_banned ? 0.65 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Utilisateur */}
                      <td style={{ padding: '12px 12px' }}>
                        <Link to={`/admin/users/${u.id}`} style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
                          @{u.username}
                        </Link>
                        <p style={{ fontSize: 11, color: T.muted }}>{u.first_name} {u.last_name}</p>
                      </td>
                      {/* Email */}
                      <td style={{ padding: '12px 12px', fontSize: 12.5, color: T.muted }} className="truncate max-w-[180px]">
                        {u.email}
                      </td>
                      {/* Rôles */}
                      <td style={{ padding: '12px 12px' }}><RoleBadges user={u} /></td>
                      {/* Boutique */}
                      <td style={{ padding: '12px 12px' }}>
                        {u.is_vendor ? (
                          <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#F47920', fontWeight: 600 }}>
                            <Store size={12} /> Vendeur
                          </span>
                        ) : u.is_courier ? (
                          <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>
                            <Bike size={12} /> Livreur
                          </span>
                        ) : <span style={{ color: T.muted, fontSize: 12 }}>—</span>}
                      </td>
                      {/* Dates */}
                      <td style={{ padding: '12px 12px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(u.date_joined)}</td>
                      <td style={{ padding: '12px 12px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(u.last_login)}</td>
                      {/* Actions */}
                      <td style={{ padding: '12px 12px' }}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link to={`/admin/users/${u.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; (e.currentTarget as HTMLElement).style.borderColor = T.red + '40'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}>
                            <Eye size={12} />
                          </Link>
                          {u.is_banned ? (
                            <button onClick={() => handleUnban(u)} disabled={acting === u.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                              <ShieldOff size={12} />
                            </button>
                          ) : (
                            <button onClick={() => handleBan(u)} disabled={acting === u.id || u.is_superuser}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)', opacity: u.is_superuser ? 0.3 : 1 }}>
                              <Shield size={12} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(u)} disabled={acting === u.id || u.is_superuser}
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', opacity: u.is_superuser ? 0.3 : 1 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: T.border }}>
              {paginated.map(u => (
                <div key={u.id} className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                    style={{ background: u.is_vendor ? 'linear-gradient(135deg,#F47920,#C85E14)' : 'linear-gradient(135deg,#10B981,#065F46)' }}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link to={`/admin/users/${u.id}`} style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
                        @{u.username}
                      </Link>
                      <RoleBadges user={u} />
                    </div>
                    <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }} className="truncate">{u.email}</p>
                    {u.is_vendor && (
                      <p style={{ fontSize: 11.5, color: '#F47920', fontWeight: 600 }}>
                        <Store size={10} style={{ display: 'inline', marginRight: 3 }} />Vendeur
                      </p>
                    )}
                    {u.is_courier && (
                      <p style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600 }}>
                        <Bike size={10} style={{ display: 'inline', marginRight: 3 }} />Livreur
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 flex-wrap gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12, color: T.muted }}>Lignes :</span>
              {PAGE_SIZES.map(s => (
                <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                  className="w-8 h-7 rounded-lg text-[12px] font-semibold"
                  style={{ background: pageSize === s ? T.red : T.cardAlt, color: pageSize === s ? '#fff' : T.muted, border: `1px solid ${pageSize === s ? T.red : T.border}` }}>
                  {s}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.muted }}>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} sur {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} style={{ color: T.text }} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                return p > 0 && p <= totalPages ? (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center"
                    style={{ background: page === p ? T.red : T.cardAlt, color: page === p ? '#fff' : T.muted, border: `1px solid ${page === p ? T.red : T.border}` }}>
                    {p}
                  </button>
                ) : null;
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} style={{ color: T.text }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
