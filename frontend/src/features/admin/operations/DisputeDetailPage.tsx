// frontend/src/features/admin/operations/DisputeDetailPage.tsx
// Détail d'un litige + messagerie + arbitrage — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ChevronRight, RefreshCw, MessageSquare,
  Send, ExternalLink, ShoppingCart, User, CheckCircle,
  Clock, AlertCircle, Lock, Eye, EyeOff, ChevronDown,
  FileText, DollarSign, Store, Truck, ShieldCheck, ShieldOff,
  FileSearch,
} from 'lucide-react';
import { adminApi, type AdminDisputeDetail } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { labelKey: string; color: string; bg: string }> = {
  OPEN:        { labelKey: 'ad5b_dispute_detail.status_open',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  IN_PROGRESS: { labelKey: 'ad5b_dispute_detail.status_in_progress', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  RESOLVED:    { labelKey: 'ad5b_dispute_detail.status_resolved',    color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  CLOSED:      { labelKey: 'ad5b_dispute_detail.status_closed',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const REASON_LABELS: Record<string, string> = {
  NOT_RECEIVED:    'ad5b_dispute_detail.reason_not_received',
  DAMAGED:         'ad5b_dispute_detail.reason_damaged',
  WRONG_ITEM:      'ad5b_dispute_detail.reason_wrong_item',
  NOT_AS_DESCRIBED:'ad5b_dispute_detail.reason_not_as_described',
  REFUND_REQUEST:  'ad5b_dispute_detail.reason_refund_request',
  OTHER:           'ad5b_dispute_detail.reason_other',
};

const RESOLUTION_OPTIONS = [
  { value: 'REFUND',         labelKey: 'ad5b_dispute_detail.resolution_refund_total' },
  { value: 'PARTIAL_REFUND', labelKey: 'ad5b_dispute_detail.resolution_refund_partial' },
  { value: 'EXCHANGE',       labelKey: 'ad5b_dispute_detail.resolution_exchange' },
  { value: 'REJECTED',       labelKey: 'ad5b_dispute_detail.resolution_rejected' },
  { value: 'OTHER',          labelKey: 'ad5b_dispute_detail.resolution_other' },
];

const STATUS_FLOW = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf      = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, T, action }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: T.red }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DisputeDetailPage() {
  const { t }          = useTranslation();
  const { id }        = useParams<{ id: string }>();
  const T             = useAdminTheme();
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();
  const messagesEndRef= useRef<HTMLDivElement>(null);

  const [dispute,       setDispute]      = useState<AdminDisputeDetail | null>(null);
  const [loading,       setLoading]      = useState(true);
  const [message,       setMessage]      = useState('');
  const [isInternal,    setIsInternal]   = useState(false);
  const [sending,       setSending]      = useState(false);
  const [acting,        setActing]       = useState(false);
  const [togglingReply, setTogglingReply]= useState(false);
  const [showResolve,   setShowResolve]  = useState(false);
  const [requestingEvidence, setRequestingEvidence] = useState(false);
  const [evidenceRequestForm, setEvidenceRequestForm] = useState({
    recipient_role: 'VENDOR',
    instructions: '',
    due_at: '',
  });
  const [resolveForm,   setResolveForm]  = useState({
    resolution:        'REFUND',
    resolution_note:   '',
    refund_amount_xaf: 0,
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getDisputeDetail(Number(id));
      setDispute(data);
      setResolveForm(f => ({ ...f, refund_amount_xaf: data.order_detail.total_xaf }));
    } catch {
      showToast(t('ad5b_dispute_detail.toast_not_found'), 'error');
      navigate('/admin/disputes');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, navigate, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dispute?.messages]);

  // ── Envoi message ────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!dispute || !message.trim()) return;
    setSending(true);
    try {
      await adminApi.addDisputeMessage(dispute.id, message.trim(), isInternal);
      setMessage('');
      showToast(t('ad5b_dispute_detail.toast_message_sent'), 'success');
      await load();
    } catch { showToast(t('ad5b_dispute_detail.toast_message_error'), 'error'); }
    finally  { setSending(false); }
  };

  // ── Toggle permission de réponse vendeur/livreur ─────────────────────────
  const handleToggleReply = async (role: 'vendor' | 'courier', allow: boolean) => {
    if (!dispute) return;
    setTogglingReply(true);
    try {
      const updated = await adminApi.toggleDisputeReply(dispute.id, role, allow);
      setDispute(updated);
      const who = role === 'vendor' ? t('ad5b_dispute_detail.role_vendor') : t('ad5b_dispute_detail.role_courier');
      showToast(allow ? t('ad5b_dispute_detail.toast_reply_allowed', { who }) : t('ad5b_dispute_detail.toast_reply_revoked', { who }), 'success');
    } catch {
      showToast(t('ad5b_dispute_detail.toast_permission_error'), 'error');
    } finally {
      setTogglingReply(false);
    }
  };

  // ── Changement de statut ─────────────────────────────────────────────────
  const handleStatusChange = async (newStatus: string) => {
    if (!dispute) return;
    const ok = await confirm({
      title:       t('ad5b_dispute_detail.confirm_status_title', { status: STATUS_CFG[newStatus] ? t(STATUS_CFG[newStatus].labelKey) : newStatus }),
      message:     t('ad5b_dispute_detail.confirm_status_message'),
      type:        'warning', confirmText: t('ad5b_dispute_detail.confirm_button'), cancelText: t('ad5b_dispute_detail.cancel_button'),
    });
    if (!ok) return;
    setActing(true);
    try {
      await adminApi.updateDispute(dispute.id, { status: newStatus as AdminDisputeDetail['status'] });
      showToast(t('ad5b_dispute_detail.toast_status_updated'), 'success');
      await load();
    } catch { showToast(t('ad5b_dispute_detail.toast_generic_error'), 'error'); }
    finally  { setActing(false); }
  };

  // ── Résolution ────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!dispute) return;
    const ok = await confirm({
      title:       t('ad5b_dispute_detail.confirm_resolve_title'),
      message:     t('ad5b_dispute_detail.confirm_resolve_message', { resolution: RESOLUTION_OPTIONS.find(o => o.value === resolveForm.resolution) ? t(RESOLUTION_OPTIONS.find(o => o.value === resolveForm.resolution)!.labelKey) : '' }),
      type:        'warning', confirmText: t('ad5b_dispute_detail.confirm_resolve_button'), cancelText: t('ad5b_dispute_detail.cancel_button'),
    });
    if (!ok) return;
    setActing(true);
    try {
      await adminApi.resolveDispute(
        dispute.id,
        resolveForm.resolution,
        resolveForm.resolution_note,
        resolveForm.refund_amount_xaf > 0 ? resolveForm.refund_amount_xaf : undefined,
      );
      showToast(t('ad5b_dispute_detail.toast_resolved'), 'success');
      setShowResolve(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('ad5b_dispute_detail.toast_resolve_error'), 'error');
    }
    finally  { setActing(false); }
  };

  const handleRequestEvidence = async () => {
    if (!dispute || !evidenceRequestForm.instructions.trim()) return;
    setRequestingEvidence(true);
    try {
      const updated = await adminApi.requestDisputeEvidence(dispute.id, {
        recipient_role: evidenceRequestForm.recipient_role,
        evidence_types: ['PHOTO', 'DOCUMENT'],
        instructions: evidenceRequestForm.instructions.trim(),
        due_at: evidenceRequestForm.due_at ? new Date(evidenceRequestForm.due_at).toISOString() : undefined,
      });
      setDispute(updated);
      setEvidenceRequestForm((current) => ({ ...current, instructions: '', due_at: '' }));
      showToast(t('ad5b_dispute_detail.toast_evidence_sent'), 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('ad5b_dispute_detail.toast_evidence_error'), 'error');
    } finally {
      setRequestingEvidence(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!dispute) return null;

  const statusCfg = STATUS_CFG[dispute.status] ?? STATUS_CFG.OPEN;
  const isResolved= dispute.status === 'RESOLVED' || dispute.status === 'CLOSED';
  const stepIdx   = STATUS_FLOW.indexOf(dispute.status as typeof STATUS_FLOW[number]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + Actions ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/admin/disputes" className="flex items-center gap-1.5 text-[12.5px] font-medium"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <ArrowLeft size={14} /> {t('ad5b_dispute_detail.breadcrumb_disputes')}
          </Link>
          <ChevronRight size={12} style={{ color: T.muted }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{t('ad5b_dispute_detail.breadcrumb_dispute', { id: dispute.id })}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => load()} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <RefreshCw size={13} />
          </button>
          {/* Changement de statut */}
          {!isResolved && dispute.status !== 'IN_PROGRESS' && (
            <button onClick={() => handleStatusChange('IN_PROGRESS')} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Clock size={13} /> {t('ad5b_dispute_detail.take_charge')}
            </button>
          )}
          {!isResolved && (
            <button onClick={() => setShowResolve(!showResolve)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: showResolve ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle size={13} /> {t('ad5b_dispute_detail.resolve_button')}
            </button>
          )}
          {dispute.status === 'RESOLVED' && (
            <button onClick={() => handleStatusChange('CLOSED')} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
              <Lock size={13} /> {t('ad5b_dispute_detail.close_button')}
            </button>
          )}
        </div>
      </div>

      {/* ── Header litige ────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 sm:p-6" style={{
        background: 'linear-gradient(135deg,#111827 0%,#1a1f35 50%,#16213e 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-5">
          {STATUS_FLOW.map((s, i) => {
            const cfg     = STATUS_CFG[s];
            const isPast  = i <= stepIdx;
            const isCurr  = i === stepIdx;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isPast ? cfg.color : 'rgba(255,255,255,0.1)',
                    border: `2px solid ${isPast ? cfg.color : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isCurr ? `0 0 10px ${cfg.color}66` : 'none',
                  }}>
                    {isPast ? <CheckCircle size={12} style={{ color: '#fff' }} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />}
                  </div>
                  <p style={{ fontSize: 9.5, color: isPast ? cfg.color : 'rgba(255,255,255,0.3)', marginTop: 4, whiteSpace: 'nowrap', fontWeight: isCurr ? 700 : 400 }}>
                    {t(cfg.labelKey)}
                  </p>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div style={{ flex: 1, height: 2, margin: '0 4px', marginBottom: 18, background: i < stepIdx ? STATUS_CFG[STATUS_FLOW[i + 1]].color + '50' : 'rgba(255,255,255,0.1)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Infos principales */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#F9FAFB', marginBottom: 6 }}>
              {t('ad5b_dispute_detail.dispute_title')} <span style={{ color: T.red }}>#{dispute.id}</span>
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontSize: 12, color: 'rgba(249,250,251,0.5)' }}>
                {t('ad5b_dispute_detail.opened_by')} <span style={{ color: '#F9FAFB', fontWeight: 600 }}>{dispute.opened_by_name}</span>
              </span>
              <span style={{ fontSize: 12, color: 'rgba(249,250,251,0.35)' }}>{fmtDateTime(dispute.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>
              {t(statusCfg.labelKey)}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' }}>
              {REASON_LABELS[dispute.reason] ? t(REASON_LABELS[dispute.reason]) : dispute.reason}
            </span>
          </div>
        </div>

        {/* Résolution (si résolu) */}
        {isResolved && dispute.resolution && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#6EE7B7' }}>
                  {RESOLUTION_OPTIONS.find(o => o.value === dispute.resolution) ? t(RESOLUTION_OPTIONS.find(o => o.value === dispute.resolution)!.labelKey) : ''}
                  {dispute.refund_amount_xaf && <span style={{ marginLeft: 8 }}>· {fmtXaf(dispute.refund_amount_xaf)}</span>}
                </p>
                {dispute.resolution_note && (
                  <p style={{ fontSize: 12, color: 'rgba(16,185,129,0.7)', marginTop: 3 }}>{dispute.resolution_note}</p>
                )}
                <p style={{ fontSize: 11, color: 'rgba(249,250,251,0.35)', marginTop: 3 }}>
                  {t('ad5b_dispute_detail.resolved_by', { name: dispute.resolved_by_name, date: fmtDateTime(dispute.resolved_at) })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Formulaire de résolution (si ouvert) ─────────────────────── */}
      {showResolve && !isResolved && (
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `2px solid rgba(16,185,129,0.3)` }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: '#10B981', marginBottom: 16 }}>
            {t('ad5b_dispute_detail.resolve_form_title')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Type de résolution */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                {t('ad5b_dispute_detail.resolution_type_label')}
              </label>
              <div className="relative">
                <select
                  value={resolveForm.resolution}
                  onChange={e => setResolveForm(f => ({ ...f, resolution: e.target.value }))}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                  {RESOLUTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Montant remboursement */}
            {(resolveForm.resolution === 'REFUND' || resolveForm.resolution === 'PARTIAL_REFUND') && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                  {t('ad5b_dispute_detail.refund_amount_label')}
                </label>
                <input
                  type="number"
                  value={resolveForm.refund_amount_xaf}
                  onChange={e => setResolveForm(f => ({ ...f, refund_amount_xaf: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}
                  onFocus={e  => (e.target.style.borderColor = '#10B981')}
                  onBlur={e   => (e.target.style.borderColor = T.inputBorder)}
                />
              </div>
            )}
          </div>
          {/* Note de résolution */}
          <div className="mb-4">
            <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
              {t('ad5b_dispute_detail.resolution_note_label')}
            </label>
            <textarea
              value={resolveForm.resolution_note}
              onChange={e => setResolveForm(f => ({ ...f, resolution_note: e.target.value }))}
              rows={3}
              minLength={40}
              placeholder={t('ad5b_dispute_detail.resolution_note_placeholder')}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              onFocus={e  => (e.target.style.borderColor = '#10B981')}
              onBlur={e   => (e.target.style.borderColor = T.inputBorder)}
            />
            <p style={{ fontSize: 11, marginTop: 4, color: resolveForm.resolution_note.trim().length < 40 ? '#DC2626' : T.muted }}>
              {t('ad5b_dispute_detail.resolution_note_counter', { count: resolveForm.resolution_note.trim().length })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleResolve} disabled={acting || resolveForm.resolution_note.trim().length < 40}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
              {acting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {t('ad5b_dispute_detail.confirm_resolution_button')}
            </button>
            <button onClick={() => setShowResolve(false)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
              {t('ad5b_dispute_detail.cancel_button')}
            </button>
          </div>
        </div>
      )}

      {/* ── Layout principal ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* COLONNE GAUCHE : messagerie (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description initiale */}
          <Section title={t('ad5b_dispute_detail.section_description')} icon={AlertCircle} T={T}>
            <p style={{ fontSize: 13.5, color: T.text, lineHeight: 1.8 }}>{dispute.description}</p>
          </Section>

          {/* Messagerie */}
          <Section title={t('ad5b_dispute_detail.section_messages', { count: dispute.messages.length })} icon={MessageSquare} T={T}>

            {/* Liste messages */}
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${T.border} transparent` }}>
              {dispute.messages.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <MessageSquare size={24} style={{ color: T.muted }} />
                  <p style={{ fontSize: 13, color: T.muted }}>{t('ad5b_dispute_detail.no_messages_yet')}</p>
                </div>
              ) : (
                dispute.messages.map(msg => {
                  const isAdmin = msg.sender === dispute.opened_by ? false : true;
                  return (
                    <div key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div style={{
                        maxWidth: '75%',
                        background: msg.is_internal
                          ? 'rgba(245,158,11,0.1)'
                          : isAdmin
                            ? 'rgba(220,38,38,0.1)'
                            : T.cardAlt,
                        border: `1px solid ${msg.is_internal ? 'rgba(245,158,11,0.25)' : isAdmin ? 'rgba(220,38,38,0.2)' : T.border}`,
                        borderRadius: 14,
                        padding: '10px 14px',
                      }}>
                        {/* Indicateurs */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: msg.is_internal ? '#F59E0B' : isAdmin ? T.red : T.text }}>
                            {msg.sender_name}
                          </span>
                          {msg.is_internal && (
                            <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                              {t('ad5b_dispute_detail.internal_badge')}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{msg.message}</p>
                        <p style={{ fontSize: 10.5, color: T.muted, marginTop: 4, textAlign: 'right' }}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer message */}
            {!isResolved && (
              <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                {/* Toggle interne/public */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setIsInternal(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{ background: !isInternal ? T.red + '18' : T.cardAlt, color: !isInternal ? T.red : T.muted, border: `1px solid ${!isInternal ? T.red + '40' : T.border}` }}>
                    <Eye size={11} /> {t('ad5b_dispute_detail.visibility_public')}
                  </button>
                  <button
                    onClick={() => setIsInternal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{ background: isInternal ? 'rgba(245,158,11,0.15)' : T.cardAlt, color: isInternal ? '#F59E0B' : T.muted, border: `1px solid ${isInternal ? 'rgba(245,158,11,0.35)' : T.border}` }}>
                    <EyeOff size={11} /> {t('ad5b_dispute_detail.visibility_internal')}
                  </button>
                </div>
                {/* Zone de saisie */}
                <div className="flex gap-3">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendMessage(); }}
                    placeholder={isInternal ? t('ad5b_dispute_detail.message_placeholder_internal') : t('ad5b_dispute_detail.message_placeholder_public')}
                    rows={3}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
                    style={{
                      background: T.input, color: T.text,
                      border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : T.inputBorder}`,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                    }}
                    onFocus={e  => (e.target.style.borderColor = isInternal ? '#F59E0B' : T.red)}
                    onBlur={e   => (e.target.style.borderColor = isInternal ? 'rgba(245,158,11,0.3)' : T.inputBorder)}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sending}
                    className="w-11 h-11 rounded-xl flex items-center justify-center self-end flex-shrink-0 transition-all"
                    style={{
                      background: message.trim() ? 'linear-gradient(135deg,#DC2626,#991B1B)' : T.border,
                      color: '#fff',
                    }}>
                    {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{t('ad5b_dispute_detail.ctrl_enter_hint')}</p>
              </div>
            )}
          </Section>

          {/* Demandes de preuve */}
          {!isResolved && (
            <Section title={t('ad5b_dispute_detail.section_request_evidence')} icon={FileSearch} T={T}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold" style={{ color: T.muted }}>{t('ad5b_dispute_detail.evidence_actor_label')}</label>
                  <select value={evidenceRequestForm.recipient_role} onChange={e => setEvidenceRequestForm(current => ({ ...current, recipient_role: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                    <option value="CLIENT">{t('ad5b_dispute_detail.role_client')}</option>
                    <option value="VENDOR">{t('ad5b_dispute_detail.role_vendor')}</option>
                    <option value="COURIER">{t('ad5b_dispute_detail.role_courier')}</option>
                    <option value="LOGISTICS">{t('ad5b_dispute_detail.role_logistics')}</option>
                    <option value="RELAY_POINT">{t('ad5b_dispute_detail.role_relay_point')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold" style={{ color: T.muted }}>{t('ad5b_dispute_detail.evidence_due_label')}</label>
                  <input type="datetime-local" value={evidenceRequestForm.due_at} onChange={e => setEvidenceRequestForm(current => ({ ...current, due_at: e.target.value }))} className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
                </div>
              </div>
              <textarea value={evidenceRequestForm.instructions} onChange={e => setEvidenceRequestForm(current => ({ ...current, instructions: e.target.value }))} rows={3} placeholder={t('ad5b_dispute_detail.evidence_instructions_placeholder')} className="mt-3 w-full resize-none rounded-xl px-3 py-2.5 text-[13px] outline-none" style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }} />
              <button onClick={handleRequestEvidence} disabled={!evidenceRequestForm.instructions.trim() || requestingEvidence} className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
                {requestingEvidence ? <RefreshCw size={14} className="animate-spin" /> : <FileSearch size={14} />}
                {t('ad5b_dispute_detail.send_request_button')}
              </button>

              {dispute.evidence_requests?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {dispute.evidence_requests.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                      <div>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{item.requested_from_name} · {item.recipient_role}</p>
                        <p className="mt-1" style={{ fontSize: 12, color: T.muted }}>{item.instructions}</p>
                        {item.due_at && <p className="mt-1" style={{ fontSize: 11, color: T.muted }}>{t('ad5b_dispute_detail.evidence_due_date', { date: fmtDateTime(item.due_at) })}</p>}
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: item.status === 'SUBMITTED' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', color: item.status === 'SUBMITTED' ? '#10B981' : '#F59E0B' }}>
                        {item.status === 'SUBMITTED' ? t('ad5b_dispute_detail.evidence_status_submitted') : t('ad5b_dispute_detail.evidence_status_pending')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Preuves */}
          {dispute.evidences && dispute.evidences.length > 0 && (
            <Section title={t('ad5b_dispute_detail.section_evidences', { count: dispute.evidences.length })} icon={FileText} T={T}>
              <div className="space-y-2">
                {dispute.evidences.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                    <FileText size={16} style={{ color: T.muted, flexShrink: 0, marginTop: 2 }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 2 }}>{ev.description || t('ad5b_dispute_detail.attached_file')}</p>
                      <p style={{ fontSize: 11, color: T.muted }}>{t('ad5b_dispute_detail.uploaded_by', { name: ev.uploaded_by_name })}</p>
                    </div>
                    {ev.file_url && (
                      <a href={ev.file_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-[12px] font-semibold flex-shrink-0"
                        style={{ color: T.red }}>
                        {t('ad5b_dispute_detail.view_link')} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* COLONNE DROITE (1/3) */}
        <div className="space-y-5">

          {/* Infos commande */}
          <Section title={t('ad5b_dispute_detail.section_order')} icon={ShoppingCart} T={T}
            action={
              <Link to={`/admin/orders/${dispute.order}`}
                className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.red }}>
                {t('ad5b_dispute_detail.view_link')} <ExternalLink size={10} />
              </Link>
            }>
            <div>
              <div className="flex justify-between py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_order')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>#{dispute.order}</span>
              </div>
              <div className="flex justify-between py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_total_amount')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtXaf(dispute.order_detail.total_xaf)}</span>
              </div>
              <div className="flex justify-between py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_phone')}</span>
                <span style={{ fontSize: 13, color: T.text }}>{dispute.order_detail.customer_phone}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_order_date')}</span>
                <span style={{ fontSize: 12, color: T.muted }}>{fmtDateTime(dispute.order_detail.created_at)}</span>
              </div>
            </div>
          </Section>

          {/* Infos client */}
          <Section title={t('ad5b_dispute_detail.section_claimant')} icon={User} T={T}
            action={
              <Link to={`/admin/customers/${dispute.opened_by}`}
                className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.red }}>
                {t('ad5b_dispute_detail.view_profile')} <ExternalLink size={10} />
              </Link>
            }>
            <div>
              <div className="flex justify-between py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_name')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{dispute.opened_by_name}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span style={{ fontSize: 12.5, color: T.muted }}>{t('ad5b_dispute_detail.field_email')}</span>
                <span style={{ fontSize: 12.5, color: T.text }}>{dispute.order_detail.customer_email ?? '—'}</span>
              </div>
            </div>
          </Section>

          {/* ── Permissions de réponse ──────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
              <ShieldCheck size={13} style={{ color: T.red }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{t('ad5b_dispute_detail.allow_reply_title')}</span>
            </div>
            <div className="p-4 space-y-3">
              <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
                {t('ad5b_dispute_detail.allow_reply_intro')}
              </p>

              {/* Vendeur */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <Store size={14} style={{ color: '#F47920' }} />
                  <div>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{t('ad5b_dispute_detail.role_vendor')}</p>
                    <p style={{ fontSize: 11, color: dispute?.vendor_can_reply ? '#10B981' : T.muted }}>
                      {dispute?.vendor_can_reply ? t('ad5b_dispute_detail.reply_allowed') : t('ad5b_dispute_detail.reply_disabled')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleReply('vendor', !dispute?.vendor_can_reply)}
                  disabled={togglingReply || isResolved}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                  style={{
                    background: dispute?.vendor_can_reply ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color:      dispute?.vendor_can_reply ? '#EF4444'              : '#10B981',
                    border:     `1px solid ${dispute?.vendor_can_reply ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    opacity: isResolved ? 0.4 : 1,
                  }}>
                  {togglingReply ? <RefreshCw size={11} className="animate-spin" /> :
                   dispute?.vendor_can_reply ? <ShieldOff size={11} /> : <ShieldCheck size={11} />}
                  {dispute?.vendor_can_reply ? t('ad5b_dispute_detail.revoke_button') : t('ad5b_dispute_detail.allow_button')}
                </button>
              </div>

              {/* Livreur */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2">
                  <Truck size={14} style={{ color: '#06B6D4' }} />
                  <div>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{t('ad5b_dispute_detail.role_courier')}</p>
                    <p style={{ fontSize: 11, color: dispute?.courier_can_reply ? '#10B981' : T.muted }}>
                      {dispute?.courier_can_reply ? t('ad5b_dispute_detail.reply_allowed') : t('ad5b_dispute_detail.reply_disabled')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleReply('courier', !dispute?.courier_can_reply)}
                  disabled={togglingReply || isResolved}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
                  style={{
                    background: dispute?.courier_can_reply ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color:      dispute?.courier_can_reply ? '#EF4444'              : '#10B981',
                    border:     `1px solid ${dispute?.courier_can_reply ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    opacity: isResolved ? 0.4 : 1,
                  }}>
                  {togglingReply ? <RefreshCw size={11} className="animate-spin" /> :
                   dispute?.courier_can_reply ? <ShieldOff size={11} /> : <ShieldCheck size={11} />}
                  {dispute?.courier_can_reply ? t('ad5b_dispute_detail.revoke_button') : t('ad5b_dispute_detail.allow_button')}
                </button>
              </div>

              {isResolved && (
                <p style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>
                  {t('ad5b_dispute_detail.permissions_locked')}
                </p>
              )}
            </div>
          </div>

          {/* Actions rapides statut */}
          {!isResolved && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                {t('ad5b_dispute_detail.change_status_title')}
              </p>
              {STATUS_FLOW.filter(s => s !== dispute.status && s !== 'CLOSED').map(s => {
                const cfg = STATUS_CFG[s];
                return (
                  <button key={s} onClick={() => handleStatusChange(s)} disabled={acting}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                    onMouseEnter={e => (e.currentTarget.style.background = cfg.color + '25')}
                    onMouseLeave={e => (e.currentTarget.style.background = cfg.bg)}>
                    {t(cfg.labelKey)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Montants si remboursement */}
          {dispute.refund_amount_xaf && (
            <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={14} style={{ color: '#10B981' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t('ad5b_dispute_detail.refund_title')}</span>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: '#10B981' }}>
                {fmtXaf(dispute.refund_amount_xaf)}
              </p>
              <p style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>
                {t('ad5b_dispute_detail.refund_out_of', { amount: fmtXaf(dispute.order_detail.total_xaf) })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
