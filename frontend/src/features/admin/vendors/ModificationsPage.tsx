// frontend/src/features/admin/vendors/ModificationsPage.tsx
// Demandes de modification des champs sensibles de boutique — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FilePenLine, RefreshCw, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Modification {
  id:               number;
  vendor_id:        number;
  business_name:    string;
  user_email:       string;
  fields_requested: Record<string, string>;
  current_values:   Record<string, string>;
  reason:           string;
  status:           'PENDING' | 'DOCS_REQUIRED' | 'DOCS_UPLOADED' | 'APPROVED' | 'REJECTED';
  admin_note:       string;
  approved_by:      string | null;
  approved_at:      string | null;
  created_at:       string;
}

interface ModificationsData {
  kpis: {
    pending:       number;
    docs_required: number;
    docs_uploaded: number;
    approved:      number;
    rejected:      number;
  };
  modifications: Modification[];
}

type StatusFilter = 'PENDING' | 'DOCS_REQUIRED' | 'DOCS_UPLOADED' | 'APPROVED' | 'REJECTED' | 'all';

const STATUS_CFG: Record<string, { labelKey: string; color: string; bg: string }> = {
  PENDING:       { labelKey: 'ad4_modifications.status.pending',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  DOCS_REQUIRED: { labelKey: 'ad4_modifications.status.docs_required', color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  DOCS_UPLOADED: { labelKey: 'ad4_modifications.status.docs_uploaded', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  APPROVED:      { labelKey: 'ad4_modifications.status.approved',      color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:      { labelKey: 'ad4_modifications.status.rejected',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  business_name:        'ad4_modifications.field.business_name',
  business_description: 'ad4_modifications.field.description',
  city:                 'ad4_modifications.field.city',
  address:              'ad4_modifications.field.address',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// CARD DEMANDE
// ─────────────────────────────────────────────────────────────────────────────

function ModCard({
  mod, onApprove, onReject, acting, T,
}: {
  mod:       Modification;
  onApprove: (id: number) => void;
  onReject:  (id: number) => void;
  acting:    number | null;
  T:         ReturnType<typeof useAdminTheme>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(mod.status === 'PENDING' || mod.status === 'DOCS_UPLOADED');
  const cfg    = STATUS_CFG[mod.status] ?? STATUS_CFG.PENDING;
  const isPending = ['PENDING', 'DOCS_REQUIRED', 'DOCS_UPLOADED'].includes(mod.status);

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{ background: T.card, border: `1px solid ${isPending ? cfg.color + '30' : T.border}` }}>
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 flex-wrap">
          {/* Avatar boutique */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#F47920,#C2590A)' }}>
            {mod.business_name[0]?.toUpperCase()}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <div>
                <Link to={`/admin/vendors/${mod.vendor_id}`}
                  style={{ fontSize: 15, fontWeight: 800, color: '#F47920' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  {mod.business_name}
                </Link>
                <p style={{ fontSize: 12, color: T.muted }}>{mod.user_email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>
                  {t(cfg.labelKey)}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(mod.created_at)}</span>
              </div>
            </div>

            {/* Champs demandés (résumé) */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {Object.keys(mod.fields_requested).map(f => (
                <span key={f} style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: 'rgba(244,121,32,0.1)', color: '#F47920' }}>
                  {FIELD_LABEL_KEYS[f] ? t(FIELD_LABEL_KEYS[f]) : f}
                </span>
              ))}
            </div>

            {/* Actions + expand */}
            <div className="flex items-center gap-2 flex-wrap">
              {isPending && (
                <>
                  <button onClick={() => onApprove(mod.id)} disabled={acting === mod.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                    {acting === mod.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    {t('ad4_modifications.action_approve')}
                  </button>
                  <button onClick={() => onReject(mod.id)} disabled={acting === mod.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle size={12} /> {t('ad4_modifications.action_reject')}
                  </button>
                </>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[12px] font-semibold ml-auto"
                style={{ color: T.muted }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? t('ad4_modifications.collapse') : t('ad4_modifications.details')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Détails expandables */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 20px', background: T.cardAlt }}>
          {/* Comparaison avant/après */}
          <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            {t('ad4_modifications.requested_changes')}
          </p>
          <div className="space-y-3 mb-4">
            {Object.entries(mod.fields_requested).map(([field, newVal]) => {
              const oldVal = mod.current_values[field];
              return (
                <div key={field} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#F47920', marginBottom: 8 }}>
                    {FIELD_LABEL_KEYS[field] ? t(FIELD_LABEL_KEYS[field]) : field}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>{t('ad4_modifications.current')}</p>
                      <p style={{ fontSize: 13, color: T.muted, textDecoration: 'line-through', lineHeight: 1.5 }}>
                        {oldVal || t('ad4_modifications.empty_value')}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10.5, fontWeight: 600, color: '#10B981', marginBottom: 3 }}>{t('ad4_modifications.requested')}</p>
                      <p style={{ fontSize: 13, color: T.text, fontWeight: 600, lineHeight: 1.5 }}>{newVal}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Justification */}
          <div className="mb-4">
            <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
              {t('ad4_modifications.vendor_justification')}
            </p>
            <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, background: T.card, padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}` }}>
              {mod.reason}
            </p>
          </div>

          {/* Note admin si existante */}
          {mod.admin_note && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                {t('ad4_modifications.admin_note')}
              </p>
              <p style={{ fontSize: 13, color: mod.status === 'REJECTED' ? '#EF4444' : '#10B981', lineHeight: 1.7, background: T.card, padding: '10px 14px', borderRadius: 10, border: `1px solid ${mod.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                {mod.admin_note}
              </p>
            </div>
          )}

          {/* Approbation info */}
          {mod.approved_by && mod.approved_at && (
            <p style={{ fontSize: 11.5, color: T.muted, marginTop: 8 }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
              {t('ad4_modifications.processed_by', { user: mod.approved_by, date: fmtDate(mod.approved_at) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ModificationsPage() {
  const { t }          = useTranslation();
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();
  const toastRef      = useRef(showToast);
  useEffect(() => { toastRef.current = showToast; });

  const [data,     setData]     = useState<ModificationsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [statusF,  setStatusF]  = useState<StatusFilter>('PENDING');
  const [acting,   setActing]   = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await http<ModificationsData>(
        `/api/vendors/admin/modifications/?status=${statusF}`,
        { headers: authHeader() }
      );
      setData(result);
    } catch {
      toastRef.current(t('ad4_modifications.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (modId: number) => {
    const ok = await confirm({
      title:       t('ad4_modifications.confirm_approve_title'),
      message:     t('ad4_modifications.confirm_approve_message'),
      type:        'warning', confirmText: t('ad4_modifications.action_approve'), cancelText: t('ad4_modifications.cancel'),
    });
    if (!ok) return;
    setActing(modId);
    try {
      await http(`/api/vendors/admin/modifications/${modId}/approve/`, { method: 'POST', headers: authHeader() });
      showToast(t('ad4_modifications.approved_toast'), 'success');
      await load();
    } catch { showToast(t('ad4_modifications.generic_error'), 'error'); }
    finally  { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      showToast(t('ad4_modifications.reason_required'), 'error');
      return;
    }
    setActing(rejectModal);
    try {
      await http(`/api/vendors/admin/modifications/${rejectModal}/reject/`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ reason: rejectReason }),
      });
      showToast(t('ad4_modifications.rejected_toast'), 'success');
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch { showToast(t('ad4_modifications.generic_error'), 'error'); }
    finally  { setActing(null); }
  };

  const kpis = data?.kpis ?? { pending: 0, docs_required: 0, docs_uploaded: 0, approved: 0, rejected: 0 };
  const mods  = data?.modifications ?? [];

  const tabs: { key: StatusFilter; label: string; count: number; accent: string }[] = [
    { key: 'PENDING',       label: t('ad4_modifications.tab_pending'),    count: kpis.pending,       accent: '#F59E0B' },
    { key: 'DOCS_REQUIRED', label: t('ad4_modifications.tab_docs_required'),   count: kpis.docs_required, accent: '#EF4444' },
    { key: 'DOCS_UPLOADED', label: t('ad4_modifications.tab_docs_uploaded'),  count: kpis.docs_uploaded, accent: '#3B82F6' },
    { key: 'APPROVED',      label: t('ad4_modifications.tab_approved'),    count: kpis.approved,      accent: '#10B981' },
    { key: 'REJECTED',      label: t('ad4_modifications.tab_rejected'),      count: kpis.rejected,      accent: '#9CA3AF' },
  ];

  const inp: React.CSSProperties = {
    background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`,
    borderRadius: 12, padding: '10px 14px', fontSize: 13, outline: 'none', width: '100%',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            {t('ad4_modifications.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.pending > 0 && <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>{t('ad4_modifications.pending_count', { count: kpis.pending })} ·</span>}
            {kpis.docs_uploaded > 0 && <span style={{ color: '#3B82F6', fontWeight: 700, marginRight: 6 }}>{t('ad4_modifications.docs_uploaded_count', { count: kpis.docs_uploaded })} ·</span>}
            {t('ad4_modifications.subtitle')}
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
          style={{ background: 'rgba(220,38,38,0.1)', color: T.red, border: '1px solid rgba(220,38,38,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.1)')}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{t('ad4_modifications.refresh')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl p-3 flex gap-1 overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}`, scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button key={tab.key}
            onClick={() => setStatusF(tab.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all"
            style={{ background: statusF === tab.key ? tab.accent : 'transparent', color: statusF === tab.key ? '#fff' : T.muted }}>
            {tab.label}
            <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 999, fontWeight: 700, background: statusF === tab.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusF === tab.key ? '#fff' : T.muted }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : mods.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <FilePenLine size={40} style={{ color: T.muted }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{t('ad4_modifications.no_requests')}</p>
          <p style={{ fontSize: 13, color: T.muted }}>{t('ad4_modifications.all_requests_processed')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mods.map(m => (
            <ModCard key={m.id} mod={m} onApprove={handleApprove}
              onReject={(id) => { setRejectModal(id); setRejectReason(''); }} acting={acting} T={T} />
          ))}
        </div>
      )}

      {/* Modal Rejet */}
      {rejectModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setRejectModal(null)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: T.card, border: '1px solid rgba(239,68,68,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: '#EF4444', marginBottom: 12 }}>
              {t('ad4_modifications.reject_modal_title')}
            </h2>
            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                {t('ad4_modifications.reject_reason_label')} <span style={{ color: T.red }}>*</span>
              </label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder={t('ad4_modifications.reject_reason_placeholder')}
                style={{ ...inp, resize: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#EF4444')}
                onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!rejectReason.trim() || acting !== null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-1 justify-center"
                style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)', opacity: rejectReason.trim() ? 1 : 0.5 }}>
                {acting !== null ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
                {t('ad4_modifications.confirm_rejection')}
              </button>
              <button onClick={() => setRejectModal(null)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                {t('ad4_modifications.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}