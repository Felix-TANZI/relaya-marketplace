// frontend/src/features/vendors/SellerDisputesPage.tsx
// Page Litiges — espace vendeur BelivaY.

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Clock, Lock, BarChart2, RefreshCw,
  CheckCircle, Scale, MessageSquare, Paperclip, Send,
  ChevronRight, ExternalLink, FileText, Image as ImageIcon,
  X, Gavel, HelpCircle, ListFilter, ShieldCheck, Hourglass,
  BookOpen, Timer, BadgeAlert, MessagesSquare,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorDisputeListItem,
  type VendorDisputeDetail,
  type VendorReplyType,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { ensureImageUnderLimit } from '@/lib/imageCompression';
import { fmtXAF, fmtDate } from './orderUtils';

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  orange: '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream: '#F5F0E8', creamAlt: '#EDE7DC',
  white: '#FFFFFF', border: '#E8E2D9',
  text: '#1A1209', muted: '#7C6E5A', mutedL: '#B8A898',
  green: '#16A34A', greenL: 'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.20)',
  red: '#DC2626', redL: 'rgba(220,38,38,0.10)', redB: 'rgba(220,38,38,0.20)',
  amber: '#D97706', amberL: 'rgba(217,119,6,0.10)',
  blue: '#2563EB', blueL: 'rgba(37,99,235,0.10)',
};

type TabFilter = 'all' | 'urgent' | 'mediation' | 'closed';

// ── Onglets avec icônes ──────────────────────────────────────────────────────
const TABS: { key: TabFilter; labelKey: string; Icon: React.FC<{ size?: number }> }[] = [
  { key: 'all',       labelKey: 'sl4_disputes.tab_all',       Icon: ListFilter    },
  { key: 'urgent',    labelKey: 'sl4_disputes.tab_urgent',    Icon: BadgeAlert    },
  { key: 'mediation', labelKey: 'sl4_disputes.tab_mediation', Icon: Hourglass     },
  { key: 'closed',    labelKey: 'sl4_disputes.tab_closed',    Icon: ShieldCheck   },
];

const REASON_LABELS: Record<string, string> = {
  DEFECT: 'sl4_disputes.reason_defect', WRONG: 'sl4_disputes.reason_wrong',
  MISSING: 'sl4_disputes.reason_missing',  DAMAGED: 'sl4_disputes.reason_damaged', OTHER: 'sl4_disputes.reason_other',
};

const REPLY_OPTIONS: {
  key: VendorReplyType; labelKey: string; descKey: string; color: string; bg: string;
}[] = [
  { key: 'ACCEPT',     labelKey: 'sl4_disputes.reply_accept_label', color: T.green, bg: T.greenL,
    descKey: 'sl4_disputes.reply_accept_desc' },
  { key: 'CONTEST',    labelKey: 'sl4_disputes.reply_contest_label',        color: T.red,   bg: T.redL,
    descKey: 'sl4_disputes.reply_contest_desc' },
  { key: 'COMPROMISE', labelKey: 'sl4_disputes.reply_compromise_label',      color: T.amber, bg: T.amberL,
    descKey: 'sl4_disputes.reply_compromise_desc' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STEP_LABEL_KEYS = [
  'sl4_disputes.step_received', 'sl4_disputes.step_your_reply',
  'sl4_disputes.step_mediation', 'sl4_disputes.step_decision',
] as const;

function calcStep(d: VendorDisputeListItem | VendorDisputeDetail): number {
  if (['RESOLVED','CLOSED'].includes(d.status)) return 4;
  if (d.vendor_replied)   return 3;
  if (d.vendor_contacted) return 2;
  return 1;
}

function StepDot({ done, active, label, num }: {
  done: boolean; active: boolean; label: string; num: number;
}) {
  const bg = done ? T.green : active ? T.orange : T.border;
  const fg = (done || active) ? T.white : T.muted;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 relative z-10">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
        style={{ background: bg, color: fg }}>
        {done ? <CheckCircle size={13}/> : num}
      </div>
      <p className="text-[10px] text-center leading-tight"
        style={{ color: done ? T.green : active ? T.orange : T.muted }}>{label}</p>
    </div>
  );
}

function DeadlineBar({ h }: { h: number }) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((1 - h / 72) * 100));
  return (
    <div className="rounded-xl p-3" style={{ background: T.redL, border: `1px solid ${T.redB}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold" style={{ color: '#991B1B' }}>
          <Timer size={12}/> {t('sl4_disputes.deadline_label')}
        </span>
        <span className="text-[12.5px] font-black" style={{ color: T.red }}>{t('sl4_disputes.hours_remaining', { count: h })}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(220,38,38,0.15)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h <= 12 ? T.red : T.amber }}/>
      </div>
      <p className="text-[10.5px] mt-1" style={{ color: '#991B1B' }}>
        {t('sl4_disputes.deadline_warning')}
      </p>
    </div>
  );
}

function StatusBadge({ d }: { d: VendorDisputeListItem }) {
  const { t } = useTranslation();
  if (!d.vendor_contacted)
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>
      <HelpCircle size={10}/> {t('sl4_disputes.status_awaiting_review')}
    </span>;
  if (['OPEN','IN_PROGRESS'].includes(d.status) && !d.vendor_replied)
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: T.redL, color: T.red }}>
      <BadgeAlert size={10}/> {t('sl4_disputes.status_reply_required')}
    </span>;
  if (d.status === 'IN_PROGRESS' && d.vendor_replied)
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.blueL, color: T.blue }}>
      <Hourglass size={10}/> {t('sl4_disputes.status_mediation')}
    </span>;
  if (d.status === 'RESOLVED')
    return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.greenL, color: T.green }}>
      <ShieldCheck size={10}/> {t('sl4_disputes.status_resolved')}
    </span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.creamAlt, color: T.muted }}>
    <CheckCircle size={10}/> {d.status_display}
  </span>;
}

// ─── PANNEAU DÉTAIL ───────────────────────────────────────────────────────────

function DisputeDetailPanel({ dispute, onClose, onRefresh }: {
  dispute: VendorDisputeDetail; onClose: () => void; onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const step = calcStep(dispute);
  const isResolved = ['RESOLVED','CLOSED'].includes(dispute.status);
  const canAct = dispute.vendor_contacted && !isResolved;

  const [replyType,  setReplyType]  = useState<VendorReplyType | null>(dispute.vendor_reply_type ?? null);
  const [replyText,  setReplyText]  = useState(dispute.vendor_reply_text ?? '');
  const [replyAmt,   setReplyAmt]   = useState(dispute.vendor_proposed_amount ? String(dispute.vendor_proposed_amount) : '');
  const [submitting, setSubmitting] = useState(false);
  const [chatMsg,    setChatMsg]    = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const pendingEvidenceRequest = dispute.evidence_requests?.find(request => request.status === 'PENDING');
  const chatEndRef  = useRef<HTMLDivElement>(null);
  const fileRefForm = useRef<HTMLInputElement>(null);
  const fileRefChat = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dispute.messages.length]);

  const handleReply = async () => {
    if (!replyType || replyText.trim().length < 20) { showToast(t('sl4_disputes.toast_explanation_too_short'),'error'); return; }
    if (replyType === 'COMPROMISE' && !replyAmt) { showToast(t('sl4_disputes.toast_amount_required'),'error'); return; }
    try {
      setSubmitting(true);
      await vendorsApi.submitDisputeReply(dispute.id, {
        reply_type: replyType, reply_text: replyText,
        proposed_amount: replyAmt ? parseInt(replyAmt,10) : undefined,
      });
      showToast(t('sl4_disputes.toast_reply_saved'),'success'); onRefresh();
    } catch { showToast(t('sl4_disputes.toast_submit_error'),'error'); }
    finally { setSubmitting(false); }
  };

  const handleSend = async () => {
    if (!chatMsg.trim()) return;
    try {
      setSendingMsg(true);
      await vendorsApi.sendDisputeMessage(dispute.id, chatMsg.trim());
      setChatMsg(''); onRefresh();
    } catch { showToast(t('sl4_disputes.toast_send_error'),'error'); }
    finally { setSendingMsg(false); }
  };

  const handleUpload = async (file: File, desc?: string) => {
    if (!pendingEvidenceRequest) {
      showToast(t('sl4_disputes.toast_no_pending_evidence_request'), 'error');
      return;
    }
    try {
      setUploading(true);
      const compressedFile = await ensureImageUnderLimit(file);
      await vendorsApi.uploadDisputeEvidence(dispute.id, pendingEvidenceRequest.id, compressedFile, desc);
      showToast(t('sl4_disputes.toast_evidence_added'),'success'); onRefresh();
    } catch { showToast(t('sl4_disputes.toast_upload_error'),'error'); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(28,18,9,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" style={{ background: T.white }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ background: T.white, borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="font-black text-[15px]" style={{ color: T.text }}>
              <Gavel size={14} className="inline mr-1.5 mb-0.5" style={{ color: T.orange }}/>
              {t('sl4_disputes.dispute_header', { id: dispute.id, ref: dispute.order_ref })}
            </p>
            <p className="text-[12px]" style={{ color: T.muted }}>
              {t(REASON_LABELS[dispute.reason] ?? dispute.reason)} · {fmtDate(dispute.created_at)}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.creamAlt }}>
            <X size={15} style={{ color: T.muted }}/>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Stepper */}
          <div className="flex items-start relative">
            <div className="absolute top-3.5 left-0 right-0 h-[2px]" style={{ background: T.border }}/>
            {STEP_LABEL_KEYS.map((labelKey, i) => (
              <StepDot key={i} num={i+1} label={t(labelKey)} done={i+1 < step} active={i+1 === step}/>
            ))}
          </div>

          {/* Deadline */}
          {canAct && !dispute.vendor_replied && dispute.hours_remaining <= 48 && (
            <DeadlineBar h={dispute.hours_remaining}/>
          )}

          {/* Plainte acheteur */}
          <div className="rounded-xl p-4" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: T.muted }}>
              <BookOpen size={11}/> {t('sl4_disputes.buyer_complaint_title')}
            </p>
            <p className="text-[12.5px] font-semibold mb-1" style={{ color: T.red }}>
              {t('sl4_disputes.reason_label', { reason: t(REASON_LABELS[dispute.reason] ?? dispute.reason) })}
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: T.text }}>{dispute.description}</p>
            <p className="text-[11px] mt-2" style={{ color: T.mutedL }}>{t('sl4_disputes.funds_at_stake_label')} <strong>{fmtXAF(dispute.vendor_escrow_amount)}</strong></p>
          </div>

          {/* Formulaire réponse */}
          {dispute.vendor_contacted && !isResolved && (
            <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${T.orangeB}` }}>
              <div className="px-4 py-3" style={{ background: T.orangeL }}>
                <p className="flex items-center gap-1.5 font-bold text-[13px]" style={{ color: T.orange }}>
                  <MessagesSquare size={13}/>
                  {dispute.vendor_replied ? t('sl4_disputes.your_reply_saved') : t('sl4_disputes.your_formal_reply')}
                </p>
                {dispute.vendor_replied && dispute.vendor_reply_type && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
                    {t(REPLY_OPTIONS.find(r => r.key === dispute.vendor_reply_type)?.labelKey ?? '')}
                    {dispute.vendor_proposed_amount ? ` — ${fmtXAF(dispute.vendor_proposed_amount)}` : ''}
                  </p>
                )}
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="grid gap-2">
                  {REPLY_OPTIONS.map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => !dispute.vendor_replied && setReplyType(opt.key)}
                      disabled={dispute.vendor_replied}
                      className="flex items-start gap-3 rounded-xl p-3 text-left border-2 transition-all"
                      style={{ background: replyType===opt.key?opt.bg:T.cream, borderColor: replyType===opt.key?opt.color:T.border, opacity: dispute.vendor_replied&&replyType!==opt.key?0.4:1 }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: replyType===opt.key?opt.color:T.border }}>
                        {replyType===opt.key && <div className="w-2 h-2 rounded-full" style={{ background: opt.color }}/>}
                      </div>
                      <div>
                        <p className="text-[12.5px] font-bold" style={{ color: opt.color }}>{t(opt.labelKey)}</p>
                        {replyType===opt.key && <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>{t(opt.descKey)}</p>}
                      </div>
                    </button>
                  ))}
                </div>
                {replyType === 'COMPROMISE' && (
                  <div>
                    <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.text }}>{t('sl4_disputes.proposed_amount_label')}</label>
                    <input type="number" value={replyAmt} min={1} disabled={dispute.vendor_replied}
                      onChange={e => setReplyAmt(e.target.value)} placeholder={t('sl4_disputes.proposed_amount_placeholder')}
                      className="w-full rounded-xl px-4 py-2.5 text-[14px] font-bold outline-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}/>
                  </div>
                )}
                {replyType && (
                  <div>
                    <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.text }}>
                      {t('sl4_disputes.your_explanation_label')} <span style={{ color: T.red }}>*</span>
                    </label>
                    <textarea value={replyText} disabled={dispute.vendor_replied} rows={4}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder={t('sl4_disputes.explanation_placeholder')}
                      className="w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}/>
                    <p className="text-[10.5px] mt-0.5 text-right" style={{ color: T.mutedL }}>{replyText.length}/5000</p>
                  </div>
                )}
                {!dispute.vendor_replied && pendingEvidenceRequest && (
                  <>
                    <input type="file" ref={fileRefForm} className="hidden" accept="image/*,.pdf"
                      onChange={e => { const f=e.target.files?.[0]; if(f) handleUpload(f, t('sl4_disputes.evidence_desc_form')); e.target.value=''; }}/>
                    <button type="button" onClick={() => fileRefForm.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                      {uploading ? <RefreshCw size={12} className="animate-spin"/> : <Paperclip size={12}/>}
                      {t('sl4_disputes.respond_evidence_request_button')}
                    </button>
                    <p className="text-[11.5px]" style={{ color: T.muted }}>{pendingEvidenceRequest.instructions}</p>
                  </>
                )}
                {dispute.evidences.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {dispute.evidences.map(ev => (
                      <a key={ev.id} href={ev.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                        style={{ background: T.blueL, color: T.blue, border: `1px solid ${T.border}` }}>
                        {ev.file_url.endsWith('.pdf') ? <FileText size={11}/> : <ImageIcon size={11}/>}
                        {ev.description || t('sl4_disputes.evidence_fallback_label', { id: ev.id })}
                        <ExternalLink size={9}/>
                      </a>
                    ))}
                  </div>
                )}
                {!dispute.vendor_replied && (
                  <button type="button" onClick={handleReply}
                    disabled={!replyType || replyText.trim().length < 20 || submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13.5px] text-white disabled:opacity-50"
                    style={{ background: T.orange }}>
                    {submitting ? <><RefreshCw size={13} className="animate-spin"/>{t('sl4_disputes.submitting')}</> : <><Send size={13}/>{t('sl4_disputes.submit_reply_button')}</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Résolution */}
          {isResolved && dispute.resolution_note && (
            <div className="rounded-xl p-4" style={{ background: T.greenL, border: `1px solid ${T.greenB}` }}>
              <p className="flex items-center gap-1.5 font-bold text-[13px] mb-1" style={{ color: T.green }}>
                <ShieldCheck size={13}/> {t('sl4_disputes.dispute_resolved_title')}
              </p>
              <p className="text-[12.5px]" style={{ color: T.text }}>{dispute.resolution_note}</p>
              {dispute.refund_amount_xaf && (
                <p className="text-[12px] mt-1" style={{ color: T.muted }}>{t('sl4_disputes.buyer_refund_label')} {fmtXAF(dispute.refund_amount_xaf)}</p>
              )}
            </div>
          )}

          {/* Chat */}
          {dispute.vendor_contacted && (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: T.creamAlt, borderBottom: `1px solid ${T.border}` }}>
                <MessagesSquare size={14} style={{ color: T.muted }}/>
                <p className="font-bold text-[13px]" style={{ color: T.text }}>{t('sl4_disputes.chat_title')}</p>
              </div>
              <div className="px-4 py-4 space-y-3 max-h-64 overflow-y-auto" style={{ background: T.cream }}>
                {dispute.messages.length === 0
                  ? <p className="text-center text-[12px]" style={{ color: T.mutedL }}>{t('sl4_disputes.no_messages_yet')}</p>
                  : dispute.messages.map(msg => {
                      const isV = msg.sender_role === 'VENDOR';
                      return (
                        <div key={msg.id} className={`flex ${isV ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%] space-y-0.5">
                            <p className="text-[10px] font-semibold px-1" style={{ color: T.muted, textAlign: isV?'right':'left' }}>
                              {isV ? t('sl4_disputes.you_label') : msg.sender_display}
                            </p>
                            <div className="px-3 py-2 text-[12.5px] leading-relaxed"
                              style={{ background: isV?T.orange:T.white, color: isV?T.white:T.text,
                                borderRadius: isV?'18px 18px 4px 18px':'18px 18px 18px 4px',
                                border: isV?'none':`1px solid ${T.border}` }}>
                              {msg.message}
                            </div>
                            <p className="text-[10px] px-1" style={{ color: T.mutedL, textAlign: isV?'right':'left' }}>{fmtDate(msg.created_at)}</p>
                          </div>
                        </div>
                      );
                    })
                }
                <div ref={chatEndRef}/>
              </div>
              {!isResolved && (
                <div className="px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${T.border}` }}>
                  <div className="flex gap-2 items-end">
                    <textarea value={chatMsg} rows={2} onChange={e => setChatMsg(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }}
                      placeholder={t('sl4_disputes.chat_placeholder')}
                      className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none resize-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}/>
                    <div className="flex flex-col gap-1.5">
                      {pendingEvidenceRequest && <>
                        <input type="file" ref={fileRefChat} className="hidden" accept="image/*,.pdf"
                          onChange={e => { const f=e.target.files?.[0]; if(f) handleUpload(f, t('sl4_disputes.evidence_desc_chat')); e.target.value=''; }}/>
                        <button type="button" title={t('sl4_disputes.respond_evidence_request_button')} onClick={() => fileRefChat.current?.click()} disabled={uploading}
                          className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                          {uploading ? <RefreshCw size={13} className="animate-spin" style={{color:T.muted}}/> : <Paperclip size={13} style={{color:T.muted}}/>}
                        </button>
                      </>}
                      <button type="button" onClick={handleSend} disabled={!chatMsg.trim()||sendingMsg}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                        style={{ background: T.orange }}>
                        {sendingMsg ? <RefreshCw size={13} className="animate-spin"/> : <Send size={13}/>}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px]" style={{ color: T.mutedL }}>{t('sl4_disputes.chat_hint')}</p>
                </div>
              )}
            </div>
          )}

          <Link to={`/seller/orders/${dispute.order}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-[12.5px] font-semibold"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            {t('sl4_disputes.view_order_button', { ref: dispute.order_ref })}
            <ChevronRight size={14}/>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────────────────

export default function SellerDisputesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [disputes,      setDisputes]      = useState<VendorDisputeListItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<TabFilter>('all');
  const [selected,      setSelected]      = useState<VendorDisputeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setDisputes(await vendorsApi.getDisputes()); }
    catch { showToast(t('sl4_disputes.toast_load_error'),'error'); }
    finally { setLoading(false); }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (d: VendorDisputeListItem) => {
    try { setLoadingDetail(true); setSelected(await vendorsApi.getDisputeDetail(d.id)); }
    catch { showToast(t('sl4_disputes.toast_load_error'),'error'); }
    finally { setLoadingDetail(false); }
  };

  const refreshDetail = async () => {
    if (!selected) return;
    try { setSelected(await vendorsApi.getDisputeDetail(selected.id)); await load(); }
    catch { /* silencieux */ }
  };

  // KPIs
  const actifs     = disputes.filter(d => ['OPEN','IN_PROGRESS'].includes(d.status));
  const urgent     = actifs.filter(d => d.vendor_contacted && !d.vendor_replied);
  const clos       = disputes.filter(d => ['RESOLVED','CLOSED'].includes(d.status));
  const tauxFav    = clos.length > 0 ? Math.round(clos.filter(d => d.status==='RESOLVED').length / clos.length * 100) : 100;
  const fondsRisque = actifs.reduce((s,d) => s + d.vendor_escrow_amount, 0);
  const minH       = urgent.length > 0 ? Math.min(...urgent.map(d => d.hours_remaining)) : null;

  const filtered = disputes.filter(d => {
    if (tab==='all')       return true;
    if (tab==='urgent')    return ['OPEN','IN_PROGRESS'].includes(d.status) && d.vendor_contacted && !d.vendor_replied;
    if (tab==='mediation') return d.status==='IN_PROGRESS' && d.vendor_replied;
    if (tab==='closed')    return ['RESOLVED','CLOSED'].includes(d.status);
    return true;
  });

  const counts: Record<TabFilter,number> = {
    all: disputes.length,
    urgent: urgent.length,
    mediation: disputes.filter(d => d.status==='IN_PROGRESS' && d.vendor_replied).length,
    closed: clos.length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="animate-spin" style={{ color: T.orange }}/>
    </div>
  );

  return (
    <div className="space-y-5 pb-10">

      {/* EN-TÊTE */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 font-black text-[22px]"
            style={{ color: T.text }}>
            <Gavel size={20} style={{ color: T.orange }}/> {t('sl4_disputes.page_title')}
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {t('sl4_disputes.page_subtitle')}
          </p>
        </div>
        <button type="button" onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <RefreshCw size={13}/> {t('sl4_disputes.refresh')}
        </button>
      </div>

      {/* ALERTE URGENCE */}
      {urgent.length > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap"
          style={{ background: 'linear-gradient(135deg,#FEF2F2,#FFF5F5)', border: `1px solid ${T.redB}` }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} style={{ color: T.red, flexShrink: 0 }}/>
            <div>
              <p className="font-bold text-[13.5px]" style={{ color: '#991B1B' }}>
                {t(urgent.length > 1 ? 'sl4_disputes.action_required_plural' : 'sl4_disputes.action_required', { count: urgent.length })}
              </p>
              <p className="text-[12px]" style={{ color: T.red }}>
                {t('sl4_disputes.urgent_alert_sub')}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setTab('urgent')}
            className="px-4 py-2 rounded-xl text-[12.5px] font-bold text-white flex-shrink-0"
            style={{ background: T.red }}>
            {t('sl4_disputes.view_now_button')}
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { ico: <Scale size={16}/>,     color: actifs.length>0?T.red:T.green,   bg: actifs.length>0?T.redL:T.greenL,   val: String(actifs.length),   label: t('sl4_disputes.kpi_active_label')        },
          { ico: <Clock size={16}/>,     color: minH!==null?T.red:T.muted,       bg: minH!==null?T.redL:T.creamAlt,     val: minH!==null?`${minH}h`:'—', label: t('sl4_disputes.kpi_shortest_delay_label')  },
          { ico: <Lock size={16}/>,      color: fondsRisque>0?T.amber:T.muted,   bg: fondsRisque>0?T.amberL:T.creamAlt, val: fmtXAF(fondsRisque),     label: t('sl4_disputes.kpi_blocked_funds_label')        },
          { ico: <BarChart2 size={16}/>, color: tauxFav>=70?T.green:tauxFav>=40?T.amber:T.red, bg: tauxFav>=70?T.greenL:tauxFav>=40?T.amberL:T.redL, val: `${tauxFav}%`, label: t('sl4_disputes.kpi_favorable_resolutions_label') },
        ].map((kpi,i) => (
          <div key={i} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
              <span style={{ color: kpi.color }}>{kpi.ico}</span>
            </div>
            <p className="font-black text-[18px]" style={{ color: T.text }}>{kpi.val}</p>
            <p className="text-[11px]" style={{ color: T.muted }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── FILTRES / ONGLETS ─────────────────────────────────────────────────
          Style : fond transparent, bordure + texte colorés quand actif.
          Pas de fond orange plein — fidèle à l'HTML vendeur de référence.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, labelKey, Icon }) => {
          const active = tab === key;
          return (
            <button key={key} type="button" onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
              style={{
                background:  active ? T.orangeL : T.cream,
                color:       active ? T.orange  : T.muted,
                border:      active ? `1.5px solid ${T.orange}` : `1px solid ${T.border}`,
              }}>
              <Icon size={13}/>
              {t(labelKey)}
              {counts[key] > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? T.orangeB : T.creamAlt, color: active ? T.orange : T.muted }}>
                  {counts[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* LISTE */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <p className="text-4xl mb-3">{disputes.length===0?'🕊️':'✅'}</p>
          <p className="font-bold text-[16px] mb-1" style={{ color: T.text }}>
            {disputes.length===0 ? t('sl4_disputes.empty_none_received') : t('sl4_disputes.empty_no_match_filter')}
          </p>
          <p className="text-[13px]" style={{ color: T.muted }}>
            {disputes.length===0 ? t('sl4_disputes.empty_none_received_sub') : t('sl4_disputes.empty_try_other_filter')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const isUrgent = d.vendor_contacted && !d.vendor_replied && ['OPEN','IN_PROGRESS'].includes(d.status);
            const stp = calcStep(d);
            return (
              <div key={d.id} onClick={() => openDetail(d)}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-px"
                style={{ background: T.white, border: `2px solid ${isUrgent?T.red:T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-[13px]" style={{ color: T.orange }}>{d.order_ref}</p>
                    <StatusBadge d={d}/>
                  </div>
                  <p className="text-[11.5px]" style={{ color: T.muted }}>{fmtDate(d.created_at)}</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-start relative">
                    <div className="absolute top-3.5 left-0 right-0 h-[2px]" style={{ background: T.border }}/>
                    {STEP_LABEL_KEYS.map((labelKey,i) => (
                      <StepDot key={i} num={i+1} label={t(labelKey)} done={i+1<stp} active={i+1===stp}/>
                    ))}
                  </div>
                  {isUrgent && d.hours_remaining <= 48 && <DeadlineBar h={d.hours_remaining}/>}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>
                        {t(REASON_LABELS[d.reason] ?? d.reason)}
                      </p>
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: T.muted }}>{d.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-[14px]" style={{ color: T.text }}>{fmtXAF(d.vendor_escrow_amount)}</p>
                      <p className="text-[10.5px]" style={{ color: T.mutedL }}>{t('sl4_disputes.in_escrow_label')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {d.unread_messages > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: T.blue }}>
                          <MessageSquare size={11}/>{t(d.unread_messages > 1 ? 'sl4_disputes.unread_messages_plural' : 'sl4_disputes.unread_messages', { count: d.unread_messages })}
                        </span>
                      )}
                      {d.assigned_admin_name && (
                        <span className="text-[11px]" style={{ color: T.muted }}>{t('sl4_disputes.followed_by', { name: d.assigned_admin_name })}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: T.orange }}>
                      {t('sl4_disputes.view_detail')} <ChevronRight size={12}/>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DROITS & OBLIGATIONS */}
      <div className="rounded-2xl p-5" style={{ background: T.white, border: `1px solid ${T.border}` }}>
        <p className="flex items-center gap-2 font-bold text-[14px] mb-4"
          style={{ color: '#991B1B' }}>
          <BookOpen size={15}/> {t('sl4_disputes.rights_title')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: <Timer size={12}/>,       title: t('sl4_disputes.rights_delays_title'),              items: [t('sl4_disputes.rights_delays_item1'), t('sl4_disputes.rights_delays_item2'), t('sl4_disputes.rights_delays_item3'), t('sl4_disputes.rights_delays_item4')] },
            { icon: <Paperclip size={12}/>,    title: t('sl4_disputes.rights_evidence_title'),       items: [t('sl4_disputes.rights_evidence_item1'), t('sl4_disputes.rights_evidence_item2'), t('sl4_disputes.rights_evidence_item3'), t('sl4_disputes.rights_evidence_item4')] },
            { icon: <Lock size={12}/>,         title: t('sl4_disputes.rights_funds_title'),    items: [t('sl4_disputes.rights_funds_item1'), t('sl4_disputes.rights_funds_item2'), t('sl4_disputes.rights_funds_item3')] },
            { icon: <ShieldCheck size={12}/>,  title: t('sl4_disputes.rights_tips_title'),     items: [t('sl4_disputes.rights_tips_item1'), t('sl4_disputes.rights_tips_item2'), t('sl4_disputes.rights_tips_item3'), t('sl4_disputes.rights_tips_item4')] },
          ].map((s,i) => (
            <div key={i}>
              <p className="flex items-center gap-1.5 font-bold text-[12px] mb-2" style={{ color: T.text }}>
                <span style={{ color: T.orange }}>{s.icon}</span>{s.title}
              </p>
              <ul className="space-y-1">
                {s.items.map((item,j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[12px]" style={{ color: T.muted }}>
                    <span className="flex-shrink-0 mt-0.5" style={{ color: T.orange }}>·</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* OVERLAY */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(28,18,9,0.4)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: T.white }}/>
        </div>
      )}
      {selected && <DisputeDetailPanel dispute={selected} onClose={() => setSelected(null)} onRefresh={refreshDetail}/>}
    </div>
  );
}
