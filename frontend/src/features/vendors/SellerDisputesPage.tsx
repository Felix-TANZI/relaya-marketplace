// frontend/src/features/vendors/SellerDisputesPage.tsx
// Page Litiges — espace vendeur BelivaY.
//
// Flux métier :
//   1. L'acheteur ouvre un litige depuis son espace (espace client).
//   2. L'admin reçoit le litige, décide de contacter le vendeur.
//   3. Dès que vendor_contacted=True → page active, vendeur notifié.
//   4. Le vendeur répond formellement (formulaire séparé du chat).
//   5. Le vendeur et l'admin échangent via messagerie.
//   6. L'admin prend la décision finale.
//
// Sections :
//   A. Alerte urgence (réponse requise < 72h configurable)
//   B. 4 KPIs
//   C. 4 filtres
//   D. Liste litiges (stepper + deadline + plainte acheteur)
//   E. Panneau détail (formulaire réponse + chat + upload preuves)
//   F. Droits & obligations

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Clock, Lock, BarChart2, RefreshCw,
  CheckCircle, Scale, MessageSquare,
  Paperclip, Send, ChevronRight, ExternalLink,
  FileText, Image as ImageIcon, X,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorDisputeListItem,
  type VendorDisputeDetail,
  type VendorReplyType,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtXAF, fmtDate } from './orderUtils';

// ─────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────
const T = {
  orange:  '#F47920', orangeL: '#FFF3E8', orangeB: 'rgba(244,121,32,0.12)',
  cream:   '#F5F0E8', creamAlt:'#EDE7DC',
  white:   '#FFFFFF', border:  '#E8E2D9',
  text:    '#1A1209', muted:   '#7C6E5A', mutedL: '#B8A898',
  green:   '#16A34A', greenL:  'rgba(22,163,74,0.10)', greenB: 'rgba(22,163,74,0.20)',
  red:     '#DC2626', redL:    'rgba(220,38,38,0.10)',  redB: 'rgba(220,38,38,0.20)',
  amber:   '#D97706', amberL:  'rgba(217,119,6,0.10)',
  blue:    '#2563EB', blueL:   'rgba(37,99,235,0.10)',
};

type TabFilter = 'all' | 'urgent' | 'mediation' | 'closed';
const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',       label: 'Tous'         },
  { key: 'urgent',    label: 'À traiter'    },
  { key: 'mediation', label: 'En médiation' },
  { key: 'closed',    label: 'Clôturés'     },
];

const REASON_LABELS: Record<string, string> = {
  DEFECT: 'Produit défectueux', WRONG: 'Mauvais produit reçu',
  MISSING: 'Produit non reçu', DAMAGED: 'Produit endommagé', OTHER: 'Autre motif',
};

const REPLY_OPTIONS: { key: VendorReplyType; label: string; desc: string; color: string; bg: string }[] = [
  {
    key: 'ACCEPT', label: 'Accepter le remboursement', color: T.green, bg: T.greenL,
    desc: "Vous reconnaissez le problème et acceptez le remboursement demandé. BelivaY libérera les fonds à l'acheteur.",
  },
  {
    key: 'CONTEST', label: 'Contester le litige', color: T.red, bg: T.redL,
    desc: 'Vous estimez que la plainte est injustifiée. Joignez des preuves pour appuyer votre position.',
  },
  {
    key: 'COMPROMISE', label: 'Proposer un compromis', color: T.amber, bg: T.amberL,
    desc: 'Vous proposez un remboursement partiel. Indiquez le montant et votre explication.',
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS VISUELS
// ─────────────────────────────────────────────────────────────

function StepDot({ done, active, label, num }: {
  done: boolean; active: boolean; label: string; num: number;
}) {
  const bg = done ? T.green : active ? T.orange : T.border;
  const fg = (done || active) ? T.white : T.muted;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 relative z-10">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
        style={{ background: bg, color: fg }}>
        {done ? <CheckCircle size={13} /> : num}
      </div>
      <p className="text-[10px] text-center leading-tight"
        style={{ color: done ? T.green : active ? T.orange : T.muted }}>
        {label}
      </p>
    </div>
  );
}

function DeadlineBar({ h }: { h: number }) {
  const pct = Math.min(100, Math.round((1 - h / 72) * 100));
  return (
    <div className="rounded-xl p-3" style={{ background: T.redL, border: `1px solid ${T.redB}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11.5px] font-bold" style={{ color: '#991B1B' }}>Délai de réponse</span>
        <span className="text-[12.5px] font-black" style={{ color: T.red }}>{h}h restantes</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(220,38,38,0.15)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: h <= 12 ? T.red : T.amber }} />
      </div>
      <p className="text-[10.5px] mt-1" style={{ color: '#991B1B' }}>
        Sans réponse → BelivaY décide automatiquement en faveur de l'acheteur.
      </p>
    </div>
  );
}

function StatusBadge({ d }: { d: VendorDisputeListItem }) {
  if (!d.vendor_contacted)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.amberL, color: T.amber }}>En attente d'examen</span>;
  if (['OPEN','IN_PROGRESS'].includes(d.status) && !d.vendor_replied)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: T.redL, color: T.red }}>Réponse requise</span>;
  if (d.status === 'IN_PROGRESS' && d.vendor_replied)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.blueL, color: T.blue }}>En médiation</span>;
  if (d.status === 'RESOLVED')
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.greenL, color: T.green }}>Résolu</span>;
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.creamAlt, color: T.muted }}>{d.status_display}</span>;
}

function calcStep(d: VendorDisputeListItem | VendorDisputeDetail): number {
  if (['RESOLVED','CLOSED'].includes(d.status)) return 4;
  if (d.vendor_replied) return 3;
  if (d.vendor_contacted) return 2;
  return 1;
}

// ─────────────────────────────────────────────────────────────
// PANNEAU DÉTAIL LITIGE
// ─────────────────────────────────────────────────────────────

function DisputeDetailPanel({ dispute, onClose, onRefresh }: {
  dispute: VendorDisputeDetail;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const step = calcStep(dispute);
  const isResolved = ['RESOLVED','CLOSED'].includes(dispute.status);
  const canAct = dispute.vendor_contacted && !isResolved;

  const [replyType,   setReplyType]   = useState<VendorReplyType | null>(dispute.vendor_reply_type ?? null);
  const [replyText,   setReplyText]   = useState(dispute.vendor_reply_text ?? '');
  const [replyAmt,    setReplyAmt]    = useState(dispute.vendor_proposed_amount ? String(dispute.vendor_proposed_amount) : '');
  const [submitting,  setSubmitting]  = useState(false);
  const [chatMsg,     setChatMsg]     = useState('');
  const [sendingMsg,  setSendingMsg]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const chatEndRef    = useRef<HTMLDivElement>(null);
  const fileRefForm   = useRef<HTMLInputElement>(null);
  const fileRefChat   = useRef<HTMLInputElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [dispute.messages.length]);

  const handleReply = async () => {
    if (!replyType || replyText.trim().length < 20) { showToast('Explication trop courte (min 20 caractères).','error'); return; }
    if (replyType === 'COMPROMISE' && !replyAmt) { showToast('Indiquez le montant proposé.','error'); return; }
    try {
      setSubmitting(true);
      await vendorsApi.submitDisputeReply(dispute.id, {
        reply_type: replyType, reply_text: replyText,
        proposed_amount: replyAmt ? parseInt(replyAmt,10) : undefined,
      });
      showToast('Réponse enregistrée.','success');
      onRefresh();
    } catch { showToast('Erreur lors de la soumission.','error'); }
    finally { setSubmitting(false); }
  };

  const handleSend = async () => {
    if (!chatMsg.trim()) return;
    try {
      setSendingMsg(true);
      await vendorsApi.sendDisputeMessage(dispute.id, chatMsg.trim());
      setChatMsg('');
      onRefresh();
    } catch { showToast("Erreur d'envoi.",'error'); }
    finally { setSendingMsg(false); }
  };

  const handleUpload = async (file: File, desc?: string) => {
    try {
      setUploading(true);
      await vendorsApi.uploadDisputeEvidence(dispute.id, file, desc);
      showToast('Pièce jointe ajoutée.','success');
      onRefresh();
    } catch { showToast("Erreur lors de l'upload.",'error'); }
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
            <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              Litige #{dispute.id} — {dispute.order_ref}
            </p>
            <p className="text-[12px]" style={{ color: T.muted }}>
              {REASON_LABELS[dispute.reason] ?? dispute.reason} · {fmtDate(dispute.created_at)}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.creamAlt }}>
            <X size={15} style={{ color: T.muted }} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Stepper */}
          <div className="flex items-start relative">
            <div className="absolute top-3.5 left-0 right-0 h-[2px]" style={{ background: T.border }} />
            {(['Litige reçu','Votre réponse','Médiation','Décision'] as const).map((label, i) => (
              <StepDot key={i} num={i+1} label={label} done={i+1 < step} active={i+1 === step} />
            ))}
          </div>

          {/* Deadline */}
          {canAct && !dispute.vendor_replied && dispute.hours_remaining <= 48 && (
            <DeadlineBar h={dispute.hours_remaining} />
          )}

          {/* Plainte acheteur */}
          <div className="rounded-xl p-4" style={{ background: T.cream, border: `1px solid ${T.border}` }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: T.muted }}>Plainte de l'acheteur</p>
            <p className="text-[12.5px] font-semibold mb-1" style={{ color: T.red }}>Motif : {REASON_LABELS[dispute.reason] ?? dispute.reason}</p>
            <p className="text-[13px] leading-relaxed" style={{ color: T.text }}>{dispute.description}</p>
            <p className="text-[11px] mt-2" style={{ color: T.mutedL }}>Fonds en jeu : <strong>{fmtXAF(dispute.vendor_escrow_amount)}</strong></p>
          </div>

          {/* Formulaire réponse formelle */}
          {dispute.vendor_contacted && !isResolved && (
            <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${T.orangeB}` }}>
              <div className="px-4 py-3" style={{ background: T.orangeL }}>
                <p className="font-bold text-[13px]" style={{ color: T.orange }}>
                  {dispute.vendor_replied ? 'Votre réponse enregistrée' : 'Votre réponse formelle'}
                </p>
                {dispute.vendor_replied && dispute.vendor_reply_type && (
                  <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
                    {REPLY_OPTIONS.find(r => r.key === dispute.vendor_reply_type)?.label}
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
                      style={{
                        background:  replyType === opt.key ? opt.bg : T.cream,
                        borderColor: replyType === opt.key ? opt.color : T.border,
                        opacity:     dispute.vendor_replied && replyType !== opt.key ? 0.4 : 1,
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: replyType === opt.key ? opt.color : T.border }}>
                        {replyType === opt.key && <div className="w-2 h-2 rounded-full" style={{ background: opt.color }} />}
                      </div>
                      <div>
                        <p className="text-[12.5px] font-bold" style={{ color: opt.color }}>{opt.label}</p>
                        {replyType === opt.key && <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>{opt.desc}</p>}
                      </div>
                    </button>
                  ))}
                </div>

                {replyType === 'COMPROMISE' && (
                  <div>
                    <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.text }}>Montant proposé (FCFA)</label>
                    <input type="number" value={replyAmt} min={1} disabled={dispute.vendor_replied}
                      onChange={e => setReplyAmt(e.target.value)} placeholder="Ex : 15 000"
                      className="w-full rounded-xl px-4 py-2.5 text-[14px] font-bold outline-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }} />
                  </div>
                )}

                {replyType && (
                  <div>
                    <label className="text-[12px] font-semibold mb-1 block" style={{ color: T.text }}>
                      Votre explication <span style={{ color: T.red }}>*</span>
                    </label>
                    <textarea value={replyText} disabled={dispute.vendor_replied} rows={4}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Décrivez clairement votre position… (min 20 caractères)"
                      className="w-full rounded-xl px-4 py-3 text-[13px] outline-none resize-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }} />
                    <p className="text-[10.5px] mt-0.5 text-right" style={{ color: T.mutedL }}>{replyText.length}/5000</p>
                  </div>
                )}

                {/* Pièces jointes formulaire */}
                {!dispute.vendor_replied && (
                  <>
                    <input type="file" ref={fileRefForm} className="hidden" accept="image/*,.pdf"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f,'Preuve formulaire'); e.target.value=''; }} />
                    <button type="button" onClick={() => fileRefForm.current?.click()} disabled={uploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                      {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Paperclip size={12} />}
                      Ajouter une preuve
                    </button>
                  </>
                )}

                {dispute.evidences.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {dispute.evidences.map(ev => (
                      <a key={ev.id} href={ev.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                        style={{ background: T.blueL, color: T.blue, border: `1px solid ${T.border}` }}>
                        {ev.file_url.endsWith('.pdf') ? <FileText size={11}/> : <ImageIcon size={11}/>}
                        {ev.description || `Pièce ${ev.id}`}
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
                    {submitting ? <><RefreshCw size={13} className="animate-spin"/>Soumission…</> : <><Send size={13}/>Soumettre ma réponse</>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Résolution */}
          {isResolved && dispute.resolution_note && (
            <div className="rounded-xl p-4" style={{ background: T.greenL, border: `1px solid ${T.greenB}` }}>
              <p className="font-bold text-[13px] mb-1" style={{ color: T.green }}>Litige résolu</p>
              <p className="text-[12.5px]" style={{ color: T.text }}>{dispute.resolution_note}</p>
              {dispute.refund_amount_xaf && (
                <p className="text-[12px] mt-1" style={{ color: T.muted }}>Remboursement acheteur : {fmtXAF(dispute.refund_amount_xaf)}</p>
              )}
            </div>
          )}

          {/* Chat admin ↔ vendeur */}
          {dispute.vendor_contacted && (
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: T.creamAlt, borderBottom: `1px solid ${T.border}` }}>
                <MessageSquare size={14} style={{ color: T.muted }}/>
                <p className="font-bold text-[13px]" style={{ color: T.text }}>Discussion avec Admin BelivaY</p>
              </div>

              <div className="px-4 py-4 space-y-3 max-h-64 overflow-y-auto" style={{ background: T.cream }}>
                {dispute.messages.length === 0
                  ? <p className="text-center text-[12px]" style={{ color: T.mutedL }}>Aucun message pour l'instant.</p>
                  : dispute.messages.map(msg => {
                      const isV = msg.sender_role === 'VENDOR';
                      return (
                        <div key={msg.id} className={`flex ${isV ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[80%] space-y-0.5">
                            <p className="text-[10px] font-semibold px-1" style={{ color: T.muted, textAlign: isV ? 'right' : 'left' }}>
                              {isV ? 'Vous' : msg.sender_display}
                            </p>
                            <div className="px-3 py-2 text-[12.5px] leading-relaxed"
                              style={{
                                background:  isV ? T.orange : T.white,
                                color:       isV ? T.white : T.text,
                                borderRadius: isV ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                border:      isV ? 'none' : `1px solid ${T.border}`,
                              }}>
                              {msg.message}
                            </div>
                            <p className="text-[10px] px-1" style={{ color: T.mutedL, textAlign: isV ? 'right' : 'left' }}>
                              {fmtDate(msg.created_at)}
                            </p>
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
                      onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }}
                      placeholder="Écrivez un message à l'admin…"
                      className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none resize-none"
                      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}/>
                    <div className="flex flex-col gap-1.5">
                      <input type="file" ref={fileRefChat} className="hidden" accept="image/*,.pdf"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f,'Pièce jointe chat'); e.target.value=''; }}/>
                      <button type="button" onClick={() => fileRefChat.current?.click()} disabled={uploading}
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
                        {uploading ? <RefreshCw size={13} className="animate-spin" style={{color:T.muted}}/> : <Paperclip size={13} style={{color:T.muted}}/>}
                      </button>
                      <button type="button" onClick={handleSend} disabled={!chatMsg.trim() || sendingMsg}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                        style={{ background: T.orange }}>
                        {sendingMsg ? <RefreshCw size={13} className="animate-spin"/> : <Send size={13}/>}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px]" style={{ color: T.mutedL }}>Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
                </div>
              )}
            </div>
          )}

          {/* Lien commande */}
          <Link to={`/seller/orders/${dispute.order}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-[12.5px] font-semibold"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
            Voir la commande {dispute.order_ref}
            <ChevronRight size={14}/>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────

export default function SellerDisputesPage() {
  const { showToast } = useToast();
  const [disputes,      setDisputes]      = useState<VendorDisputeListItem[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<TabFilter>('all');
  const [selected,      setSelected]      = useState<VendorDisputeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setDisputes(await vendorsApi.getDisputes()); }
    catch { showToast('Erreur de chargement','error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (d: VendorDisputeListItem) => {
    try { setLoadingDetail(true); setSelected(await vendorsApi.getDisputeDetail(d.id)); }
    catch { showToast('Erreur de chargement','error'); }
    finally { setLoadingDetail(false); }
  };

  const refreshDetail = async () => {
    if (!selected) return;
    try { setSelected(await vendorsApi.getDisputeDetail(selected.id)); await load(); }
    catch { /* silencieux */ }
  };

  // KPIs
  const actifs    = disputes.filter(d => ['OPEN','IN_PROGRESS'].includes(d.status));
  const urgent    = actifs.filter(d => d.vendor_contacted && !d.vendor_replied);
  const clos      = disputes.filter(d => ['RESOLVED','CLOSED'].includes(d.status));
  const tauxFav   = clos.length > 0 ? Math.round(clos.filter(d => d.status==='RESOLVED').length / clos.length * 100) : 100;
  const fondsRisque = actifs.reduce((s,d) => s + d.vendor_escrow_amount, 0);
  const minH      = urgent.length > 0 ? Math.min(...urgent.map(d => d.hours_remaining)) : null;

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
          <h1 className="font-black text-[22px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>Litiges reçus</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Contestations acheteurs · Messagerie admin · Médiation</p>
        </div>
        <button type="button" onClick={load}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <RefreshCw size={13}/>Actualiser
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
                Action requise : {urgent.length} litige{urgent.length>1?'s':''} en attente de votre réponse
              </p>
              <p className="text-[12px]" style={{ color: T.red }}>
                Sans réponse dans le délai imparti, BelivaY tranchera en faveur de l'acheteur.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setTab('urgent')}
            className="px-4 py-2 rounded-xl text-[12.5px] font-bold text-white flex-shrink-0"
            style={{ background: T.red }}>
            Voir maintenant
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { ico: <Scale size={16}/>,    color: actifs.length>0?T.red:T.green,   bg: actifs.length>0?T.redL:T.greenL, val: String(actifs.length),   label: 'Litiges actifs' },
          { ico: <Clock size={16}/>,    color: minH!==null?T.red:T.muted,       bg: minH!==null?T.redL:T.creamAlt,  val: minH!==null?`${minH}h`:'—', label: 'Délai le plus court' },
          { ico: <Lock size={16}/>,     color: fondsRisque>0?T.amber:T.muted,   bg: fondsRisque>0?T.amberL:T.creamAlt, val: fmtXAF(fondsRisque),   label: 'Fonds bloqués' },
          { ico: <BarChart2 size={16}/>,color: tauxFav>=70?T.green:tauxFav>=40?T.amber:T.red, bg: tauxFav>=70?T.greenL:tauxFav>=40?T.amberL:T.redL, val: `${tauxFav}%`, label: 'Résolutions favorables' },
        ].map((kpi,i) => (
          <div key={i} className="rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
              <span style={{ color: kpi.color }}>{kpi.ico}</span>
            </div>
            <p className="font-black text-[18px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{kpi.val}</p>
            <p className="text-[11px]" style={{ color: T.muted }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* FILTRES */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: tab===t.key?T.orange:T.cream, color: tab===t.key?T.white:T.muted, border: `1px solid ${tab===t.key?T.orange:T.border}` }}>
            {t.label}
            {counts[t.key]>0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: tab===t.key?'rgba(255,255,255,0.25)':T.creamAlt }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LISTE */}
      {filtered.length===0 ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <p className="text-4xl mb-3">{disputes.length===0?'🕊️':'✅'}</p>
          <p className="font-bold text-[16px] mb-1" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {disputes.length===0 ? 'Aucun litige reçu' : 'Aucun litige dans ce filtre'}
          </p>
          <p className="text-[13px]" style={{ color: T.muted }}>
            {disputes.length===0 ? 'Excellent ! Continuez à soigner la qualité de vos produits.' : 'Essayez un autre filtre.'}
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
                  {/* Stepper compact */}
                  <div className="flex items-start relative">
                    <div className="absolute top-3.5 left-0 right-0 h-[2px]" style={{ background: T.border }}/>
                    {(['Litige reçu','Votre réponse','Médiation','Décision'] as const).map((label,i) => (
                      <StepDot key={i} num={i+1} label={label} done={i+1<stp} active={i+1===stp}/>
                    ))}
                  </div>

                  {isUrgent && d.hours_remaining <= 48 && <DeadlineBar h={d.hours_remaining}/>}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12.5px] font-semibold" style={{ color: T.text }}>{REASON_LABELS[d.reason] ?? d.reason}</p>
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: T.muted }}>{d.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>{fmtXAF(d.vendor_escrow_amount)}</p>
                      <p className="text-[10.5px]" style={{ color: T.mutedL }}>En escrow</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {d.unread_messages>0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: T.blue }}>
                          <MessageSquare size={11}/>{d.unread_messages} message{d.unread_messages>1?'s':''}
                        </span>
                      )}
                      {d.assigned_admin_name && (
                        <span className="text-[11px]" style={{ color: T.muted }}>Suivi par {d.assigned_admin_name}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: T.orange }}>
                      Voir le détail <ChevronRight size={12}/>
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
        <p className="font-bold text-[14px] mb-4" style={{ color: '#991B1B', fontFamily: 'Poppins,sans-serif' }}>
          Vos droits & obligations en cas de litige
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: 'Vos délais', items: ['Réponse vendeur : 72h max', "Sans réponse → décision auto en faveur de l'acheteur", 'Médiation BelivaY : 48h après votre réponse', 'Décision finale irrévocable sous 7 jours'] },
            { title: 'Preuves que vous pouvez fournir', items: ['Photos produit avant expédition', "Bon de livraison signé par l'acheteur", 'Captures conversations WhatsApp', 'Numéro de suivi de colis'] },
            { title: 'Impact sur vos fonds', items: ['Fonds bloqués en Escrow pendant la procédure', 'Remboursement déduit de vos prochains versements', 'Décision favorable → libération immédiate'] },
            { title: 'Conseils pour éviter les litiges', items: ['Photographiez chaque produit avant expédition', 'Exigez toujours une signature à la livraison', 'Décrivez précisément vos produits (taille, couleur)', "Répondez aux questions acheteur avant l'expédition"] },
          ].map((s,i) => (
            <div key={i}>
              <p className="font-bold text-[12px] mb-2" style={{ color: T.text }}>{s.title}</p>
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

      {/* DÉTAIL (overlay) */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(28,18,9,0.4)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: T.white }}/>
        </div>
      )}
      {selected && <DisputeDetailPanel dispute={selected} onClose={() => setSelected(null)} onRefresh={refreshDetail}/>}

    </div>
  );
}
