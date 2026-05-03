// frontend/src/features/admin/vendors/ModificationsPage.tsx
// Demandes de modification des champs sensibles de boutique — admin BelivaY

import { useEffect, useState, useCallback, useRef } from 'react';
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

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:       { label: 'En attente',         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  DOCS_REQUIRED: { label: 'Docs requis',         color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  DOCS_UPLOADED: { label: 'Docs fournis',        color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  APPROVED:      { label: 'Approuvée',           color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  REJECTED:      { label: 'Rejetée',             color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
};

const FIELD_LABELS: Record<string, string> = {
  business_name:        'Nom de la boutique',
  business_description: 'Description',
  city:                 'Ville',
  address:              'Adresse',
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
                  {cfg.label}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>{fmtDate(mod.created_at)}</span>
              </div>
            </div>

            {/* Champs demandés (résumé) */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {Object.keys(mod.fields_requested).map(f => (
                <span key={f} style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 5, background: 'rgba(244,121,32,0.1)', color: '#F47920' }}>
                  {FIELD_LABELS[f] ?? f}
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
                    Approuver
                  </button>
                  <button onClick={() => onReject(mod.id)} disabled={acting === mod.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <XCircle size={12} /> Rejeter
                  </button>
                </>
              )}
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[12px] font-semibold ml-auto"
                style={{ color: T.muted }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? 'Réduire' : 'Détails'}
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
            Modifications demandées
          </p>
          <div className="space-y-3 mb-4">
            {Object.entries(mod.fields_requested).map(([field, newVal]) => {
              const oldVal = mod.current_values[field];
              return (
                <div key={field} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: '#F47920', marginBottom: 8 }}>
                    {FIELD_LABELS[field] ?? field}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>Actuel</p>
                      <p style={{ fontSize: 13, color: T.muted, textDecoration: 'line-through', lineHeight: 1.5 }}>
                        {oldVal || '(vide)'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10.5, fontWeight: 600, color: '#10B981', marginBottom: 3 }}>Demandé</p>
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
              Justification du vendeur
            </p>
            <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7, background: T.card, padding: '10px 14px', borderRadius: 10, border: `1px solid ${T.border}` }}>
              {mod.reason}
            </p>
          </div>

          {/* Note admin si existante */}
          {mod.admin_note && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
                Note admin
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
              Traitée par @{mod.approved_by} le {fmtDate(mod.approved_at)}
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
      toastRef.current('Erreur chargement des modifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (modId: number) => {
    const ok = await confirm({
      title:       'Approuver cette modification ?',
      message:     'Les champs seront mis à jour immédiatement sur le profil de la boutique.',
      type:        'warning', confirmText: 'Approuver', cancelText: 'Annuler',
    });
    if (!ok) return;
    setActing(modId);
    try {
      await http(`/api/vendors/admin/modifications/${modId}/approve/`, { method: 'POST', headers: authHeader() });
      showToast('Modification approuvée et appliquée', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      showToast('Le motif est requis', 'error');
      return;
    }
    setActing(rejectModal);
    try {
      await http(`/api/vendors/admin/modifications/${rejectModal}/reject/`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ reason: rejectReason }),
      });
      showToast('Modification rejetée', 'success');
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const kpis = data?.kpis ?? { pending: 0, docs_required: 0, docs_uploaded: 0, approved: 0, rejected: 0 };
  const mods  = data?.modifications ?? [];

  const tabs: { key: StatusFilter; label: string; count: number; accent: string }[] = [
    { key: 'PENDING',       label: 'En attente',    count: kpis.pending,       accent: '#F59E0B' },
    { key: 'DOCS_REQUIRED', label: 'Docs requis',   count: kpis.docs_required, accent: '#EF4444' },
    { key: 'DOCS_UPLOADED', label: 'Docs fournis',  count: kpis.docs_uploaded, accent: '#3B82F6' },
    { key: 'APPROVED',      label: 'Approuvées',    count: kpis.approved,      accent: '#10B981' },
    { key: 'REJECTED',      label: 'Rejetées',      count: kpis.rejected,      accent: '#9CA3AF' },
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
            Demandes de Modification
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.pending > 0 && <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>{kpis.pending} en attente ·</span>}
            {kpis.docs_uploaded > 0 && <span style={{ color: '#3B82F6', fontWeight: 700, marginRight: 6 }}>{kpis.docs_uploaded} docs fournis ·</span>}
            Validation des modifications de champs sensibles des boutiques
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

      {/* Tabs */}
      <div className="rounded-2xl p-3 flex gap-1 overflow-x-auto" style={{ background: T.card, border: `1px solid ${T.border}`, scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setStatusF(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all"
            style={{ background: statusF === t.key ? t.accent : 'transparent', color: statusF === t.key ? '#fff' : T.muted }}>
            {t.label}
            <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 999, fontWeight: 700, background: statusF === t.key ? 'rgba(255,255,255,0.25)' : T.cardAlt, color: statusF === t.key ? '#fff' : T.muted }}>
              {t.count}
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
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Aucune demande</p>
          <p style={{ fontSize: 13, color: T.muted }}>Toutes les demandes de cette catégorie ont été traitées.</p>
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
              Rejeter la demande
            </h2>
            <div className="mb-4">
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>
                Motif de rejet <span style={{ color: T.red }}>*</span>
              </label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="Ex : Documents insuffisants, nom similaire existant…"
                style={{ ...inp, resize: 'none' }}
                onFocus={e => (e.target.style.borderColor = '#EF4444')}
                onBlur={e  => (e.target.style.borderColor = T.inputBorder)} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={!rejectReason.trim() || acting !== null}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white flex-1 justify-center"
                style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)', opacity: rejectReason.trim() ? 1 : 0.5 }}>
                {acting !== null ? <RefreshCw size={13} className="animate-spin" /> : <XCircle size={13} />}
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