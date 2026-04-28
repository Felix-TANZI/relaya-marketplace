// frontend/src/features/admin/system/AuditPage.tsx
// Journal d'audit — toutes les actions admin tracées

import { useEffect, useState, useCallback } from 'react';
import {
  ScrollText, RefreshCw, AlertCircle, Search,
  ChevronLeft, ChevronRight, ChevronDown, Filter, X,
  User, Shield, ShoppingCart, Package, DollarSign, Settings,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id:          number;
  admin_id:    number;
  admin_name:  string;
  action:      string;
  entity_type: string;
  entity_id:   number | null;
  old_value:   string | null;
  new_value:   string | null;
  ip_address:  string | null;
  created_at:  string;
}

type EntityFilter = 'all' | 'user' | 'vendor' | 'order' | 'product' | 'review' | 'settings' | 'withdrawal';

const PAGE_SIZES = [20, 50, 100] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  user:       { label: 'Utilisateur',  color: '#3B82F6', icon: User       },
  vendor:     { label: 'Vendeur',      color: '#F47920', icon: Shield     },
  order:      { label: 'Commande',     color: '#8B5CF6', icon: ShoppingCart },
  product:    { label: 'Produit',      color: '#10B981', icon: Package    },
  review:     { label: 'Avis',         color: '#F59E0B', icon: ScrollText },
  settings:   { label: 'Paramètres',   color: '#9CA3AF', icon: Settings   },
  withdrawal: { label: 'Retrait',      color: '#EF4444', icon: DollarSign },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [entries,   setEntries]  = useState<AuditEntry[]>([]);
  const [loading,   setLoading]  = useState(true);
  const [entityF,   setEntityF]  = useState<EntityFilter>('all');
  const [search,    setSearch]   = useState('');
  const [page,      setPage]     = useState(1);
  const [pageSize,  setPageSize] = useState<20|50|100>(20);
  const [openDrop,  setOpenDrop] = useState<'entity' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityF !== 'all') params.append('entity_type', entityF);
      const data = await http<AuditEntry[]>(
        `/api/vendors/admin/audit/?${params}`,
        { headers: authHeader() }
      );
      setEntries(data);
    } catch {
      showToast('Erreur chargement du journal d\'audit', 'error');
    } finally {
      setLoading(false);
    }
  }, [entityF, showToast]);

  useEffect(() => { load(); }, [load]);

  // Filtrage local
  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.action, e.admin_name, e.entity_type, e.ip_address, String(e.entity_id ?? '')]
      .some(v => v?.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  // Export CSV
  const exportCSV = () => {
    const headers = 'ID;Admin;Action;Entité;ID entité;Ancienne valeur;Nouvelle valeur;IP;Date';
    const rows = filtered.map(e => [
      e.id, e.admin_name, e.action, e.entity_type, e.entity_id ?? '',
      e.old_value ?? '', e.new_value ?? '', e.ip_address ?? '',
      fmtDateTime(e.created_at),
    ].join(';'));
    const csv  = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url, download: `belivay_audit_${new Date().toISOString().slice(0,10)}.csv`,
    });
    a.click(); URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" onClick={() => setOpenDrop(null)}>

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Journal d'Audit
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {entries.length.toLocaleString('fr-FR')} action{entries.length > 1 ? 's' : ''} enregistrée{entries.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <ScrollText size={13} /> <span className="hidden sm:inline">Exporter CSV</span>
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

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex items-center gap-3 flex-wrap" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <Filter size={13} style={{ color: T.muted, flexShrink: 0 }} />

        {/* Type d'entité */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setOpenDrop(openDrop === 'entity' ? null : 'entity')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
            style={{ background: entityF !== 'all' ? T.red + '18' : T.cardAlt, color: entityF !== 'all' ? T.red : T.muted, border: `1px solid ${entityF !== 'all' ? T.red + '40' : T.border}` }}>
            {entityF === 'all' ? 'Entité' : ENTITY_CFG[entityF]?.label ?? entityF} <ChevronDown size={11} />
          </button>
          <DropMenu show={openDrop === 'entity'}>
            <DropItem label="Toutes entités" active={entityF === 'all'} onClick={() => { setEntityF('all'); setPage(1); }} />
            {Object.entries(ENTITY_CFG).map(([k, v]) => (
              <DropItem key={k} label={v.label} active={entityF === k} onClick={() => { setEntityF(k as EntityFilter); setPage(1); }} />
            ))}
          </DropMenu>
        </div>

        {entityF !== 'all' && (
          <button onClick={() => { setEntityF('all'); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}>
            <X size={11} /> Effacer
          </button>
        )}

        {/* Recherche */}
        <div className="relative flex-1 max-w-80 ml-auto">
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
          <input type="text" placeholder="Admin, action, IP…"
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
            style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
            onFocus={e => (e.target.style.borderColor = T.red)}
            onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
        </div>

        <p style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{filtered.length} entrée{filtered.length > 1 ? 's' : ''}</p>
      </div>

      {/* ── Tableau d'audit ───────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <AlertCircle size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucune entrée dans le journal</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                    {['Entité', 'Action', 'Admin', 'Avant → Après', 'IP', 'Date'].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, i) => {
                    const cfg  = ENTITY_CFG[e.entity_type] ?? ENTITY_CFG.user;
                    const Icon = cfg.icon;
                    return (
                      <tr key={e.id}
                        style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = T.cardAlt)}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        {/* Entité */}
                        <td style={{ padding: '10px 14px' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + '18' }}>
                              <Icon size={13} style={{ color: cfg.color }} />
                            </div>
                            <div>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                              {e.entity_id && <p style={{ fontSize: 10.5, color: T.muted }}>#{e.entity_id}</p>}
                            </div>
                          </div>
                        </td>
                        {/* Action */}
                        <td style={{ padding: '10px 14px' }}>
                          <p style={{ fontSize: 13, color: T.text, maxWidth: 240 }} className="line-clamp-2">{e.action}</p>
                        </td>
                        {/* Admin */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8B5CF6' }}>@{e.admin_name}</span>
                        </td>
                        {/* Avant → Après */}
                        <td style={{ padding: '10px 14px' }}>
                          {(e.old_value || e.new_value) ? (
                            <div style={{ fontSize: 11.5, maxWidth: 200 }}>
                              {e.old_value && <span style={{ color: '#EF4444', textDecoration: 'line-through' }} className="truncate block">{e.old_value}</span>}
                              {e.new_value && <span style={{ color: '#10B981' }} className="truncate block">{e.new_value}</span>}
                            </div>
                          ) : <span style={{ color: T.muted, fontSize: 11.5 }}>—</span>}
                        </td>
                        {/* IP */}
                        <td style={{ padding: '10px 14px' }}>
                          <code style={{ fontSize: 11.5, color: T.muted }}>{e.ip_address ?? '—'}</code>
                        </td>
                        {/* Date */}
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                          {fmtDateTime(e.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y" style={{ borderColor: T.border }}>
              {paginated.map(e => {
                const cfg  = ENTITY_CFG[e.entity_type] ?? ENTITY_CFG.user;
                const Icon = cfg.icon;
                return (
                  <div key={e.id} className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.color + '18' }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color }}>{cfg.label} {e.entity_id ? `#${e.entity_id}` : ''}</span>
                          <span style={{ fontSize: 10.5, color: T.muted }}>{fmtDateTime(e.created_at)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: T.text, marginBottom: 2 }}>{e.action}</p>
                        <p style={{ fontSize: 11.5, color: '#8B5CF6' }}>@{e.admin_name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: T.muted }}>Lignes :</span>
                {PAGE_SIZES.map(s => (
                  <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                    className="px-2.5 h-7 rounded-lg text-[12px] font-semibold"
                    style={{ background: pageSize === s ? T.red : T.cardAlt, color: pageSize === s ? '#fff' : T.muted, border: `1px solid ${pageSize === s ? T.red : T.border}` }}>
                    {s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: T.muted }}>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} sur {filtered.length}
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
          </>
        )}
      </div>
    </div>
  );
}