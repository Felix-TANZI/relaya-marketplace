// frontend/src/features/admin/operations/ReviewsPage.tsx
// Modération des avis produits — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, Search, RefreshCw, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Filter,
  ChevronDown, X, Package,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Review {
  id:                   number;
  product_id:           number;
  product_title:        string;
  product_slug:         string;
  vendor_name:          string;
  user_id:              number;
  user_name:            string;
  rating:               number;
  title:                string;
  comment:              string;
  is_approved:          boolean;
  is_verified_purchase: boolean;
  created_at:           string;
}

interface ReviewStats {
  total:    number;
  approved: number;
  pending:  number;
  avg_rating: number;
  by_rating: Record<string, number>;
}

type StatusFilter = 'all' | 'approved' | 'pending';
type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';

const PAGE_SIZES = [10, 20, 50] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} style={{ color: i <= rating ? '#F59E0B' : '#374151', fill: i <= rating ? '#F59E0B' : 'transparent' }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [stats,     setStats]     = useState<ReviewStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState<number | null>(null);
  const [statusF,   setStatusF]   = useState<StatusFilter>('all');
  const [ratingF,   setRatingF]   = useState<RatingFilter>('all');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState<10|20|50>(20);
  const [openDrop,  setOpenDrop]  = useState<'rating' | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusF !== 'all') params.append('is_approved', statusF === 'approved' ? 'true' : 'false');
      if (ratingF !== 'all') params.append('rating', ratingF);

      const [revData, statData] = await Promise.all([
        http<Review[]>(`/api/vendors/admin/reviews/?${params}`, { headers: authHeader() }),
        http<ReviewStats>('/api/vendors/admin/reviews/stats/', { headers: authHeader() }).catch(() => null),
      ]);
      setReviews(revData);
      if (statData) setStats(statData);
    } catch {
      showToast('Erreur chargement des avis', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusF, ratingF, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local ────────────────────────────────────────────────────────
  const filtered = reviews.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [r.product_title, r.user_name, r.comment, r.title, r.vendor_name]
      .some(v => v?.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSearch = (v: string) => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 220);
  };

  // ── KPIs locaux ───────────────────────────────────────────────────────────
  const kpis = {
    total:    stats?.total    ?? reviews.length,
    approved: stats?.approved ?? reviews.filter(r => r.is_approved).length,
    pending:  stats?.pending  ?? reviews.filter(r => !r.is_approved).length,
    avg:      stats?.avg_rating ?? (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleApproval = async (r: Review) => {
    const action = r.is_approved ? 'masquer' : 'approuver';
    const ok = await confirm({
      title:       `${r.is_approved ? 'Masquer' : 'Approuver'} cet avis ?`,
      message:     `L'avis de ${r.user_name} sur "${r.product_title}" sera ${r.is_approved ? 'retiré du catalogue' : 'visible publiquement'}.`,
      type:        r.is_approved ? 'warning' : 'warning',
      confirmText: r.is_approved ? 'Masquer' : 'Approuver',
      cancelText:  'Annuler',
    });
    if (!ok) return;
    setActing(r.id);
    try {
      await http(`/api/vendors/admin/reviews/${r.id}/toggle/`, { method: 'POST', headers: authHeader() });
      showToast(`Avis ${action === 'masquer' ? 'masqué' : 'approuvé'}`, 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const deleteReview = async (r: Review) => {
    const ok = await confirm({
      title:       'Supprimer cet avis définitivement ?',
      message:     `L'avis de ${r.user_name} sera supprimé de la base de données.`,
      type:        'danger', confirmText: 'Supprimer', cancelText: 'Annuler',
    });
    if (!ok) return;
    setActing(r.id);
    try {
      await http(`/api/vendors/admin/reviews/${r.id}/delete/`, { method: 'DELETE', headers: authHeader() });
      showToast('Avis supprimé', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const DropMenu = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
    show ? (
      <div className="absolute top-full left-0 mt-1 z-20 rounded-xl py-1 min-w-[140px]"
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

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Modération des Avis
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.pending > 0 && (
              <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>{kpis.pending} en attente ·</span>
            )}
            Note moyenne : <span style={{ color: '#F59E0B', fontWeight: 700 }}>{kpis.avg.toFixed(1)} ★</span>
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total avis',  value: kpis.total,    accent: T.text,    onClick: () => setStatusF('all') },
          { label: 'Approuvés',   value: kpis.approved, accent: '#10B981', onClick: () => setStatusF('approved') },
          { label: 'En attente',  value: kpis.pending,  accent: T.red,     onClick: () => setStatusF('pending') },
          { label: 'Note moy.',   value: `${kpis.avg.toFixed(1)} ★`, accent: '#F59E0B', onClick: undefined },
        ].map((k, i) => (
          <button key={i} onClick={() => { k.onClick?.(); setPage(1); }}
            className="rounded-2xl p-4 text-left w-full transition-all"
            style={{ background: T.card, border: `1px solid ${T.border}`, cursor: k.onClick ? 'pointer' : 'default' }}
            onMouseEnter={e => { if (k.onClick) (e.currentTarget.style.borderColor = k.accent + '55'); }}
            onMouseLeave={e => { if (k.onClick) (e.currentTarget.style.borderColor = T.border); }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>
              {loading ? '—' : k.value}
            </p>
          </button>
        ))}
      </div>

      {/* ── Filtres ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs statut */}
          <div className="flex gap-1 flex-shrink-0">
            {([
              { key: 'all'      as StatusFilter, label: 'Tous',         count: reviews.length },
              { key: 'approved' as StatusFilter, label: 'Approuvés',    count: kpis.approved },
              { key: 'pending'  as StatusFilter, label: 'En attente',   count: kpis.pending },
            ] as { key: StatusFilter; label: string; count: number }[]).map(t => (
              <button key={t.key}
                onClick={() => { setStatusF(t.key); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
                style={{ background: statusF === t.key ? T.red : 'transparent', color: statusF === t.key ? '#fff' : T.muted }}
                onMouseEnter={e => { if (statusF !== t.key) (e.currentTarget.style.color = T.text); }}
                onMouseLeave={e => { if (statusF !== t.key) (e.currentTarget.style.color = T.muted); }}>
                {t.label}
                <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 999, fontWeight: 700, background: statusF === t.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusF === t.key ? '#fff' : T.muted }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1 hidden sm:block" />
          {/* Recherche */}
          <div className="relative w-full sm:w-60 flex-shrink-0">
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input type="text" placeholder="Produit, client, commentaire…"
              onChange={e => handleSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] outline-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
              onFocus={e => (e.target.style.borderColor = T.red)}
              onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
          </div>
        </div>

        {/* Dropdown note */}
        <div className="flex items-center gap-2">
          <Filter size={13} style={{ color: T.muted }} />
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpenDrop(openDrop === 'rating' ? null : 'rating')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap"
              style={{ background: ratingF !== 'all' ? T.red + '18' : T.cardAlt, color: ratingF !== 'all' ? T.red : T.muted, border: `1px solid ${ratingF !== 'all' ? T.red + '40' : T.border}` }}>
              {ratingF === 'all' ? 'Note' : `${ratingF} ★`} <ChevronDown size={11} />
            </button>
            <DropMenu show={openDrop === 'rating'}>
              <DropItem label="Toutes notes" active={ratingF === 'all'} onClick={() => { setRatingF('all'); setPage(1); }} />
              {['5','4','3','2','1'].map(r => (
                <DropItem key={r} label={`${r} étoile${r === '1' ? '' : 's'}`} active={ratingF === r} onClick={() => { setRatingF(r as RatingFilter); setPage(1); load(); }} />
              ))}
            </DropMenu>
          </div>
          {(ratingF !== 'all') && (
            <button onClick={() => { setRatingF('all'); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
              style={{ background: T.red + '10', color: T.red, border: `1px solid ${T.red}30` }}>
              <X size={11} /> Effacer
            </button>
          )}
          <p style={{ fontSize: 12, color: T.muted, marginLeft: 'auto' }}>
            {filtered.length} avis
          </p>
        </div>
      </div>

      {/* ── Liste des avis ────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Star size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucun avis trouvé</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: T.border }}>
            {paginated.map(r => (
              <div key={r.id} className="p-5" style={{ background: !r.is_approved ? 'rgba(220,38,38,0.02)' : 'transparent' }}>
                <div className="flex items-start gap-4 flex-wrap">

                  {/* Infos produit + utilisateur */}
                  <div className="flex-1 min-w-0">
                    {/* Ligne 1 : produit */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link to={`/admin/catalogue`}
                        className="flex items-center gap-1.5 text-[12.5px] font-semibold"
                        style={{ color: '#F47920' }}>
                        <Package size={12} /> {r.product_title}
                      </Link>
                      <span style={{ fontSize: 11, color: T.muted }}>par {r.vendor_name}</span>
                      {r.is_verified_purchase && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>
                          Achat vérifié
                        </span>
                      )}
                      {!r.is_approved && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(220,38,38,0.12)', color: T.red }}>
                          Non approuvé
                        </span>
                      )}
                    </div>

                    {/* Ligne 2 : étoiles + auteur + date */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: 11.5, color: T.text, fontWeight: 600 }}>@{r.user_name}</span>
                      <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(r.created_at)}</span>
                    </div>

                    {/* Titre + commentaire */}
                    {r.title && (
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: T.text, marginBottom: 4 }}>{r.title}</p>
                    )}
                    {r.comment ? (
                      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{r.comment}</p>
                    ) : (
                      <p style={{ fontSize: 12.5, color: T.muted, fontStyle: 'italic' }}>Aucun commentaire écrit</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleApproval(r)} disabled={acting === r.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                      style={{
                        background: r.is_approved ? 'rgba(156,163,175,0.1)' : 'rgba(16,185,129,0.1)',
                        color:      r.is_approved ? '#9CA3AF'                : '#10B981',
                        border:     `1px solid ${r.is_approved ? 'rgba(156,163,175,0.2)' : 'rgba(16,185,129,0.3)'}`,
                      }}>
                      {acting === r.id ? <RefreshCw size={12} className="animate-spin" /> : r.is_approved ? <XCircle size={12} /> : <CheckCircle size={12} />}
                      {r.is_approved ? 'Masquer' : 'Approuver'}
                    </button>
                    <button onClick={() => deleteReview(r)} disabled={acting === r.id}
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <XCircle size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
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
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} style={{ color: T.text }} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e${i}`} style={{ fontSize: 12, color: T.muted, padding: '0 4px' }}>…</span>
                  : <button key={p} onClick={() => setPage(p as number)}
                      className="w-8 h-8 rounded-lg text-[12px] font-semibold flex items-center justify-center"
                      style={{ background: page === p ? T.red : T.cardAlt, color: page === p ? '#fff' : T.muted, border: `1px solid ${page === p ? T.red : T.border}` }}>
                      {p}
                    </button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} style={{ color: T.text }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}