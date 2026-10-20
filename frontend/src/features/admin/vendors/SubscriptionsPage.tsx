// frontend/src/features/admin/vendors/SubscriptionsPage.tsx
// Abonnements vendeurs — admin BelivaY
// Liste + approbation manuelle des souscriptions en attente

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CreditCard, RefreshCw, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Subscription {
  id:              number;
  reference:       string;
  vendor_id:       number;
  business_name:   string;
  user_email:      string;
  plan_code:       'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';
  plan_name:       string;
  billing_cycle:   'MONTHLY' | 'ANNUAL' | 'TRIAL';
  is_trial:        boolean;
  amount_paid_xaf: number;
  operator:        'MTN_MOMO' | 'ORANGE_MONEY' | '';
  phone_number:    string;
  sub_status:      'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  started_at:      string | null;
  expires_at:      string | null;
  confirmed_at:    string | null;
  created_at:      string;
}

type StatusFilter = 'all' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

const STATUS_CFG: Record<string, { labelKey: string; color: string; bg: string }> = {
  PENDING:   { labelKey: 'ad4_subscriptions.status.pending',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  ACTIVE:    { labelKey: 'ad4_subscriptions.status.active',    color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  EXPIRED:   { labelKey: 'ad4_subscriptions.status.expired',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  CANCELLED: { labelKey: 'ad4_subscriptions.status.cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
};

const PLAN_CFG: Record<string, { color: string }> = {
  FREE:     { color: '#9CA3AF' },
  STARTER:  { color: '#3B82F6' },
  PRO:      { color: '#F47920' },
  BUSINESS: { color: '#8B5CF6' },
};

const PAGE_SIZES = [10, 20, 50] as const;

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

export default function SubscriptionsPage() {
  const { t }          = useTranslation();
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [subs,     setSubs]    = useState<Subscription[]>([]);
  const [loading,  setLoading] = useState(true);
  const [statusF,  setStatusF] = useState<StatusFilter>('PENDING');
  const [acting,   setActing]  = useState<number | null>(null);
  const [page,     setPage]    = useState(1);
  const [pageSize, setPageSize]= useState<10|20|50>(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusF === 'all'
        ? '/api/vendors/admin/subscriptions/'
        : `/api/vendors/admin/subscriptions/?status=${statusF}`;
      const data = await http<Subscription[]>(url, { headers: authHeader() });
      setSubs(data);
    } catch {
      showToast(t('ad4_subscriptions.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusF, showToast]);

  useEffect(() => { load(); }, [load]);

  const counts: Record<StatusFilter, number> = {
    all:       subs.length,
    PENDING:   subs.filter(s => s.sub_status === 'PENDING').length,
    ACTIVE:    subs.filter(s => s.sub_status === 'ACTIVE').length,
    EXPIRED:   subs.filter(s => s.sub_status === 'EXPIRED').length,
    CANCELLED: subs.filter(s => s.sub_status === 'CANCELLED').length,
  };

  const totalPages = Math.max(1, Math.ceil(subs.length / pageSize));
  const paginated  = subs.slice((page - 1) * pageSize, page * pageSize);

  const handleApprove = async (sub: Subscription) => {
    const ok = await confirm({
      title:       t('ad4_subscriptions.confirm_approve_title', { plan: sub.plan_name }),
      message:     t('ad4_subscriptions.confirm_approve_message', { business: sub.business_name, amount: fmtXaf(sub.amount_paid_xaf) }),
      type:        'warning', confirmText: t('ad4_subscriptions.confirm_approve_cta'), cancelText: t('ad4_subscriptions.confirm_cancel'),
    });
    if (!ok) return;
    setActing(sub.id);
    try {
      await http(`/api/vendors/admin/subscriptions/${sub.id}/approve/`, { method: 'POST', headers: authHeader() });
      showToast(t('ad4_subscriptions.approved_toast', { plan: sub.plan_name }), 'success');
      await load();
    } catch { showToast(t('ad4_subscriptions.approve_error'), 'error'); }
    finally  { setActing(null); }
  };

  const handleReject = async (sub: Subscription) => {
    const ok = await confirm({
      title:       t('ad4_subscriptions.confirm_reject_title'),
      message:     t('ad4_subscriptions.confirm_reject_message', { reference: sub.reference }),
      type:        'danger', confirmText: t('ad4_subscriptions.action_reject'), cancelText: t('ad4_subscriptions.confirm_cancel'),
    });
    if (!ok) return;
    setActing(sub.id);
    try {
      await http(`/api/vendors/admin/subscriptions/${sub.id}/reject/`, { method: 'POST', headers: authHeader() });
      showToast(t('ad4_subscriptions.rejected_toast'), 'success');
      await load();
    } catch { showToast(t('ad4_subscriptions.generic_error'), 'error'); }
    finally  { setActing(null); }
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'PENDING',   label: t('ad4_subscriptions.tab_pending') },
    { key: 'ACTIVE',    label: t('ad4_subscriptions.tab_active')     },
    { key: 'EXPIRED',   label: t('ad4_subscriptions.tab_expired')    },
    { key: 'CANCELLED', label: t('ad4_subscriptions.tab_cancelled')    },
    { key: 'all',       label: t('ad4_subscriptions.tab_all')       },
  ];

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad4_subscriptions.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {counts.PENDING > 0 && (
              <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>
                {t('ad4_subscriptions.pending_approval_count', { count: counts.PENDING })} ·
              </span>
            )}
            {t('ad4_subscriptions.subtitle')}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{t('ad4_subscriptions.refresh')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl p-3 flex gap-1 overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}`, scrollbarWidth: 'none' }}>
        {tabs.map(tab => {
          const cfg = STATUS_CFG[tab.key];
          const active = statusF === tab.key;
          return (
            <button key={tab.key}
              onClick={() => { setStatusF(tab.key); setPage(1); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all"
              style={{
                background: active ? (cfg?.color ?? T.red) : 'transparent',
                color:      active ? '#fff' : T.muted,
              }}>
              {tab.label}
              <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 999, fontWeight: 700, background: active ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: active ? '#fff' : T.muted }}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tableau */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <CreditCard size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>{t('ad4_subscriptions.no_subscriptions', { status: statusF !== 'all' ? t(STATUS_CFG[statusF]?.labelKey ?? '').toLowerCase() : '' })}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                    {[t('ad4_subscriptions.col_reference'), t('ad4_subscriptions.col_shop'), t('ad4_subscriptions.col_plan'), t('ad4_subscriptions.col_cycle'), t('ad4_subscriptions.col_amount'), t('ad4_subscriptions.col_operator'), t('ad4_subscriptions.col_status'), t('ad4_subscriptions.col_expires'), ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => (
                    <tr key={s.id}
                      style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 14px' }}>
                        <code style={{ fontSize: 11.5, color: T.red, background: T.cardAlt, padding: '2px 6px', borderRadius: 4 }}>{s.reference}</code>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/admin/vendors/${s.vendor_id}`}
                          style={{ fontSize: 13, fontWeight: 600, color: '#F47920' }}>
                          {s.business_name}
                        </Link>
                        <p style={{ fontSize: 11, color: T.muted }}>{s.user_email}</p>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_CFG[s.plan_code]?.color ?? '#9CA3AF' }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: PLAN_CFG[s.plan_code]?.color ?? T.text }}>{s.plan_name}</span>
                          {s.is_trial && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>{t('ad4_subscriptions.trial_badge')}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: T.muted }}>
                        {s.billing_cycle === 'MONTHLY' ? t('ad4_subscriptions.cycle_monthly') : s.billing_cycle === 'ANNUAL' ? t('ad4_subscriptions.cycle_annual') : t('ad4_subscriptions.cycle_trial')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>
                        {s.amount_paid_xaf > 0 ? fmtXaf(s.amount_paid_xaf) : <span style={{ color: '#10B981' }}>{t('ad4_subscriptions.free')}</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {s.operator ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: s.operator === 'MTN_MOMO' ? 'rgba(245,158,11,0.12)' : 'rgba(245,121,32,0.12)', color: s.operator === 'MTN_MOMO' ? '#F59E0B' : '#F47920', whiteSpace: 'nowrap' }}>
                            {s.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}
                          </span>
                        ) : <span style={{ color: T.muted, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: STATUS_CFG[s.sub_status]?.bg, color: STATUS_CFG[s.sub_status]?.color }}>
                          {t(STATUS_CFG[s.sub_status]?.labelKey ?? '')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>
                        {fmtDate(s.expires_at)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {s.sub_status === 'PENDING' && !s.is_trial && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => handleApprove(s)} disabled={acting === s.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                              {acting === s.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle size={12} />}
                              {t('ad4_subscriptions.action_approve')}
                            </button>
                            <button onClick={() => handleReject(s)} disabled={acting === s.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                              <XCircle size={13} />
                            </button>
                          </div>
                        )}
                        {s.confirmed_at && s.sub_status === 'ACTIVE' && (
                          <p style={{ fontSize: 10.5, color: T.muted, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{fmtDateTime(s.confirmed_at)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y" style={{ borderColor: T.border }}>
              {paginated.map(s => (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <code style={{ fontSize: 11.5, color: T.red }}>{s.reference}</code>
                      <Link to={`/admin/vendors/${s.vendor_id}`} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#F47920', marginTop: 2 }}>
                        {s.business_name}
                      </Link>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: STATUS_CFG[s.sub_status]?.bg, color: STATUS_CFG[s.sub_status]?.color, flexShrink: 0 }}>
                      {t(STATUS_CFG[s.sub_status]?.labelKey ?? '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: PLAN_CFG[s.plan_code]?.color }}>{s.plan_name}</span>
                    {s.is_trial && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10B981' }}>{t('ad4_subscriptions.trial_badge')}</span>}
                    <span style={{ fontSize: 12, color: T.muted }}>{s.amount_paid_xaf > 0 ? fmtXaf(s.amount_paid_xaf) : t('ad4_subscriptions.free')}</span>
                  </div>
                  {s.sub_status === 'PENDING' && !s.is_trial && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(s)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <CheckCircle size={12} /> {t('ad4_subscriptions.action_approve')}
                      </button>
                      <button onClick={() => handleReject(s)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <XCircle size={12} /> {t('ad4_subscriptions.action_reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {subs.length > pageSize && (
              <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: T.muted }}>{t('ad4_subscriptions.rows_label')}</span>
                  {PAGE_SIZES.map(s => (
                    <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                      className="w-8 h-7 rounded-lg text-[12px] font-semibold"
                      style={{ background: pageSize === s ? T.red : T.cardAlt, color: pageSize === s ? '#fff' : T.muted, border: `1px solid ${pageSize === s ? T.red : T.border}` }}>
                      {s}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: T.muted }}>
                  {t('ad4_subscriptions.pagination_range', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, subs.length), total: subs.length })}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === 1 ? 0.4 : 1 }}>
                    <ChevronLeft size={14} style={{ color: T.text }} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: T.cardAlt, border: `1px solid ${T.border}`, opacity: page === totalPages ? 0.4 : 1 }}>
                    <ChevronRight size={14} style={{ color: T.text }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}