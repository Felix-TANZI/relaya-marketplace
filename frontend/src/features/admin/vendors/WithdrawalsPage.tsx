// frontend/src/features/admin/vendors/WithdrawalsPage.tsx
// Gestion des retraits vendeurs — admin BelivaY

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownToLine, RefreshCw,CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Withdrawal {
  id:             number;
  reference:      string;
  vendor_id:      number;
  business_name:  string;
  user_email:     string;
  amount_xaf:     number;
  fee_amount_xaf: number;
  net_amount_xaf: number;
  operator:       'MTN_MOMO' | 'ORANGE_MONEY';
  phone_number:   string;
  status:         'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  admin_note:     string;
  processed_at:   string | null;
  created_at:     string;
}

type StatusFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'En attente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  APPROVED:  { label: 'Approuvé',   color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  REJECTED:  { label: 'Rejeté',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  CANCELLED: { label: 'Annulé',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function WithdrawalsPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [statusTab,   setStatusTab]   = useState<StatusFilter>('PENDING');
  const [acting,      setActing]      = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<Withdrawal | null>(null);
  const [rejectReason,setRejectReason]= useState('');
  const [approveNote, setApproveNote] = useState('');
  const [approveModal,setApproveModal]= useState<Withdrawal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url  = statusTab === 'all'
        ? '/api/vendors/admin/withdrawals/'
        : `/api/vendors/admin/withdrawals/?status=${statusTab}`;
      const data = await http<Withdrawal[]>(url, { headers: authHeader() });
      setWithdrawals(data);
    } catch {
      showToast('Erreur chargement des retraits', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusTab, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Comptes par statut ────────────────────────────────────────────────────
  const counts: Record<StatusFilter, number> = {
    all:       withdrawals.length,
    PENDING:   withdrawals.filter(w => w.status === 'PENDING').length,
    APPROVED:  withdrawals.filter(w => w.status === 'APPROVED').length,
    REJECTED:  withdrawals.filter(w => w.status === 'REJECTED').length,
    CANCELLED: withdrawals.filter(w => w.status === 'CANCELLED').length,
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveModal) return;
    setActing(approveModal.id);
    try {
      await http(`/api/vendors/admin/withdrawals/${approveModal.id}/approve/`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ admin_note: approveNote }),
      });
      showToast(`Retrait ${approveModal.reference} approuvé`, 'success');
      setApproveModal(null);
      setApproveNote('');
      await load();
    } catch { showToast('Erreur lors de l\'approbation', 'error'); }
    finally  { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      showToast('Le motif de rejet est requis', 'error');
      return;
    }
    setActing(rejectModal.id);
    try {
      await http(`/api/vendors/admin/withdrawals/${rejectModal.id}/reject/`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ reason: rejectReason }),
      });
      showToast(`Retrait ${rejectModal.reference} rejeté`, 'success');
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch { showToast('Erreur lors du rejet', 'error'); }
    finally  { setActing(null); }
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'PENDING',   label: 'En attente' },
    { key: 'APPROVED',  label: 'Approuvés'  },
    { key: 'REJECTED',  label: 'Rejetés'    },
    { key: 'CANCELLED', label: 'Annulés'    },
    { key: 'all',       label: 'Tous'       },
  ];

  const inp: React.CSSProperties = {
    background: T.input, color: T.text,
    border: `1px solid ${T.inputBorder}`,
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
    fontFamily: "'Plus Jakarta Sans',sans-serif",
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Demandes de Retrait
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {counts.PENDING > 0 && (
              <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>
                {counts.PENDING} en attente de traitement ·
              </span>
            )}
            Validation manuelle des retraits Mobile Money vendeurs
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

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-3 flex gap-1 overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}`, scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setStatusTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all"
            style={{
              background: statusTab === t.key
                ? t.key === 'PENDING' ? '#F59E0B' : t.key === 'APPROVED' ? '#10B981' : t.key === 'REJECTED' ? '#EF4444' : T.red
                : 'transparent',
              color: statusTab === t.key ? '#fff' : T.muted,
            }}
            onMouseEnter={e => { if (statusTab !== t.key) (e.currentTarget.style.color = T.text); }}
            onMouseLeave={e => { if (statusTab !== t.key) (e.currentTarget.style.color = T.muted); }}>
            {t.label}
            <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 999, fontWeight: 700, background: statusTab === t.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusTab === t.key ? '#fff' : T.muted }}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tableau ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <ArrowDownToLine size={32} style={{ color: T.muted }} />
            <p style={{ fontSize: 14, color: T.muted }}>Aucun retrait {statusTab !== 'all' ? STATUS_CFG[statusTab]?.label.toLowerCase() : ''}</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                    {['Référence', 'Boutique', 'Opérateur', 'Numéro', 'Montant demandé', 'Frais', 'Net à verser', 'Statut', 'Demandé le', ''].map((h, i) => (
                      <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w, i) => (
                    <tr key={w.id}
                      style={{ borderBottom: i < withdrawals.length - 1 ? `1px solid ${T.border}` : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.cardAlt)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px 14px' }}>
                        <code style={{ fontSize: 11.5, color: T.red, background: T.cardAlt, padding: '2px 7px', borderRadius: 5 }}>{w.reference}</code>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/admin/vendors/${w.vendor_id}`}
                          style={{ fontSize: 13, fontWeight: 600, color: '#F47920' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          {w.business_name}
                        </Link>
                        <p style={{ fontSize: 11, color: T.muted }}>{w.user_email}</p>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                          background: w.operator === 'MTN_MOMO' ? 'rgba(245,158,11,0.12)' : 'rgba(245,121,32,0.12)',
                          color:      w.operator === 'MTN_MOMO' ? '#F59E0B'                : '#F47920',
                        }}>
                          {w.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12.5, color: T.muted }}>{w.phone_number}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>{fmtXaf(w.amount_xaf)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#EF4444', whiteSpace: 'nowrap' }}>-{fmtXaf(w.fee_amount_xaf)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#10B981', whiteSpace: 'nowrap' }}>{fmtXaf(w.net_amount_xaf)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div>
                          <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: STATUS_CFG[w.status]?.bg, color: STATUS_CFG[w.status]?.color }}>
                            {STATUS_CFG[w.status]?.label}
                          </span>
                          {w.admin_note && w.status !== 'PENDING' && (
                            <p style={{ fontSize: 10.5, color: T.muted, marginTop: 3, maxWidth: 140 }} className="truncate" title={w.admin_note}>{w.admin_note}</p>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11.5, color: T.muted, whiteSpace: 'nowrap' }}>{fmtDate(w.created_at)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {w.status === 'PENDING' && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button onClick={() => setApproveModal(w)} disabled={acting === w.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <CheckCircle size={12} /> Approuver
                            </button>
                            <button onClick={() => setRejectModal(w)} disabled={acting === w.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                              <XCircle size={12} /> Rejeter
                            </button>
                          </div>
                        )}
                        {w.processed_at && (
                          <p style={{ fontSize: 11, color: T.muted, textAlign: 'right' }}>{fmtDate(w.processed_at)}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden divide-y" style={{ borderColor: T.border }}>
              {withdrawals.map(w => (
                <div key={w.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <code style={{ fontSize: 11.5, color: T.red }}>{w.reference}</code>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#F47920', marginTop: 2 }}>{w.business_name}</p>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: STATUS_CFG[w.status]?.bg, color: STATUS_CFG[w.status]?.color, flexShrink: 0 }}>
                      {STATUS_CFG[w.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span style={{ fontSize: 11, color: T.muted }}>
                      {w.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'} · {w.phone_number}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>Net: {fmtXaf(w.net_amount_xaf)}</span>
                  </div>
                  {w.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => setApproveModal(w)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <CheckCircle size={12} /> Approuver
                      </button>
                      <button onClick={() => setRejectModal(w)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-1 justify-center"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <XCircle size={12} /> Rejeter
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal Approbation ─────────────────────────────────────────────── */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setApproveModal(null)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: T.card, border: `1px solid rgba(16,185,129,0.3)` }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>
              Approuver le retrait
            </h2>
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
              Confirmez que vous avez effectué le virement de <strong style={{ color: T.text }}>{fmtXaf(approveModal.net_amount_xaf)}</strong> vers {approveModal.phone_number} via {approveModal.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}.
            </p>
            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Note de confirmation (optionnel)</label>
              <input type="text" value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder="Ex : Virement effectué le 28/04/2026 ref: XXXX"
                style={inp}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={acting === approveModal.id}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-1 justify-center"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
                {acting === approveModal.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Confirmer l'approbation
              </button>
              <button onClick={() => setApproveModal(null)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Rejet ───────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setRejectModal(null)}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: T.card, border: `1px solid rgba(239,68,68,0.3)` }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 800, color: '#EF4444', marginBottom: 4 }}>
              Rejeter le retrait
            </h2>
            <p style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
              Retrait <strong style={{ color: T.text }}>{rejectModal.reference}</strong> — {fmtXaf(rejectModal.amount_xaf)} — {rejectModal.business_name}
            </p>
            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Motif de rejet <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="Ex : Numéro de téléphone invalide / Solde insuffisant / Documents manquants"
                style={{ ...inp, resize: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#EF4444')}
                onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={acting === rejectModal.id || !rejectReason.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-1 justify-center"
                style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)', opacity: rejectReason.trim() ? 1 : 0.5 }}>
                {acting === rejectModal.id ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
                Confirmer le rejet
              </button>
              <button onClick={() => setRejectModal(null)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}