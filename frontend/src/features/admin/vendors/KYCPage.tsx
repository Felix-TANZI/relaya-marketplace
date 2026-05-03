// frontend/src/features/admin/vendors/KYCPage.tsx
// File d'attente KYC — validation des vendeurs par l'admin BelivaY

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck, RefreshCw, AlertCircle, CheckCircle,
  XCircle, Clock, ExternalLink, User, MapPin,
  Phone, Mail, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminApi } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { http } from '@/services/api/http';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface KYCVendor {
  id:                   number;
  user_id:              number;
  user_email:           string;
  user_full_name:       string;
  business_name:        string;
  business_description: string;
  phone:                string;
  city:                 string;
  address:              string;
  id_document:          string;
  status:               'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  days_waiting:         number;
  created_at:           string;
  approved_at:          string | null;
}

interface KYCData {
  kpis:    { pending: number; approved: number; rejected: number; suspended: number };
  vendors: KYCVendor[];
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const authHeader = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// CARD VENDEUR KYC
// ─────────────────────────────────────────────────────────────────────────────

function VendorKYCCard({
  vendor, onApprove, onReject, acting, T,
}: {
  vendor:    KYCVendor;
  onApprove: (id: number) => void;
  onReject:  (id: number) => void;
  acting:    number | null;
  T:         ReturnType<typeof useAdminTheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUrgent = vendor.days_waiting >= 3 && vendor.status === 'PENDING';

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: T.card,
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : T.border}`,
        boxShadow: isUrgent ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none',
      }}
    >
      {/* Header card */}
      <div className="p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#F47920,#C2590A)' }}
          >
            {vendor.business_name[0]?.toUpperCase()}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
              <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>
                {vendor.business_name}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isUrgent && (
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                    URGENT
                  </span>
                )}
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Clock size={10} /> {vendor.days_waiting}j d'attente
                </span>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.muted }}>
                <User size={11} /> {vendor.user_full_name}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.muted }}>
                <Mail size={11} /> {vendor.user_email}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.muted }}>
                <Phone size={11} /> {vendor.phone}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.muted }}>
                <MapPin size={11} /> {vendor.city}
              </span>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: T.muted }}>
                <Calendar size={11} /> {fmtDate(vendor.created_at)}
              </span>
            </div>

            {/* Description courte */}
            {vendor.business_description && (
              <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }} className="line-clamp-2">
                {vendor.business_description}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {vendor.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => onApprove(vendor.id)}
                    disabled={acting === vendor.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}
                  >
                    {acting === vendor.id ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Approuver la boutique
                  </button>
                  <button
                    onClick={() => onReject(vendor.id)}
                    disabled={acting === vendor.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <XCircle size={13} /> Rejeter
                  </button>
                </>
              )}
              <Link
                to={`/admin/vendors/${vendor.id}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
              >
                Fiche complète <ExternalLink size={11} />
              </Link>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[12px] font-semibold ml-auto"
                style={{ color: T.muted }}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? 'Réduire' : 'Voir détails'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Détails expandables */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: '16px 20px', background: T.cardAlt }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Adresse
              </p>
              <p style={{ fontSize: 13, color: T.text }}>{vendor.address}</p>
            </div>
            <div>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Document d'identité
              </p>
              {vendor.id_document ? (
                <div className="flex items-center gap-2">
                  <FileCheck size={14} style={{ color: '#10B981' }} />
                  {vendor.id_document.startsWith('http') ? (
                    <a href={vendor.id_document} target="_blank" rel="noreferrer"
                      className="text-[13px] font-semibold"
                      style={{ color: T.red }}>
                      Voir le document <ExternalLink size={11} style={{ display: 'inline', marginLeft: 3 }} />
                    </a>
                  ) : (
                    <p style={{ fontSize: 13, color: T.text }} className="truncate">{vendor.id_document}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>Aucun document fourni</span>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <p style={{ fontSize: 11.5, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Description complète
              </p>
              <p style={{ fontSize: 13, color: T.text, lineHeight: 1.7 }}>
                {vendor.business_description || 'Aucune description fournie'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function KYCPage() {
  const T             = useAdminTheme();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [data,      setData]      = useState<KYCData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [statusTab, setStatusTab] = useState<StatusFilter>('PENDING');
  const [acting,    setActing]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await http<KYCData>(
        `/api/vendors/admin/kyc/?status=${statusTab}`,
        { headers: authHeader() }
      );
      setData(result);
    } catch {
      showToast('Erreur chargement KYC', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusTab, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (vendorId: number) => {
    const ok = await confirm({
      title:       'Approuver cette boutique ?',
      message:     'Le vendeur pourra mettre ses produits en vente sur la plateforme.',
      type:        'warning', confirmText: 'Approuver', cancelText: 'Annuler',
    });
    if (!ok) return;
    setActing(vendorId);
    try {
      await adminApi.approveVendor(vendorId);
      showToast('Boutique approuvée', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const handleReject = async (vendorId: number) => {
    const ok = await confirm({
      title:       'Rejeter cette boutique ?',
      message:     'La demande sera définitivement rejetée. Le vendeur sera notifié.',
      type:        'danger', confirmText: 'Rejeter', cancelText: 'Annuler',
    });
    if (!ok) return;
    setActing(vendorId);
    try {
      await adminApi.rejectVendor(vendorId);
      showToast('Boutique rejetée', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(null); }
  };

  const kpis = data?.kpis ?? { pending: 0, approved: 0, rejected: 0, suspended: 0 };
  const vendors = data?.vendors ?? [];

  const tabs: { key: StatusFilter; label: string; count: number; accent: string }[] = [
    { key: 'PENDING',   label: 'En attente', count: kpis.pending,   accent: '#F59E0B' },
    { key: 'APPROVED',  label: 'Approuvés',  count: kpis.approved,  accent: '#10B981' },
    { key: 'REJECTED',  label: 'Rejetés',    count: kpis.rejected,  accent: '#EF4444' },
    { key: 'SUSPENDED', label: 'Suspendus',  count: kpis.suspended, accent: '#9CA3AF' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
            Validation KYC Vendeurs
          </h1>
          <p style={{ fontSize: 13, color: T.muted }}>
            {kpis.pending > 0 && (
              <span style={{ color: T.red, fontWeight: 700, marginRight: 6 }}>
                {kpis.pending} boutique{kpis.pending > 1 ? 's' : ''} en attente ·
              </span>
            )}
            Vérification des documents et approbation des nouveaux vendeurs
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setStatusTab(t.key)}
            className="rounded-2xl p-4 text-left transition-all"
            style={{
              background: statusTab === t.key ? t.accent + '15' : T.card,
              border: `1px solid ${statusTab === t.key ? t.accent + '55' : T.border}`,
            }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: statusTab === t.key ? t.accent : T.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              {t.label}
            </p>
            <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: statusTab === t.key ? t.accent : T.text, lineHeight: 1 }}>
              {t.count}
            </p>
          </button>
        ))}
      </div>

      {/* ── Liste vendeurs KYC ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.red, animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 gap-3" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <FileCheck size={40} style={{ color: T.muted }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            {statusTab === 'PENDING' ? 'Aucune boutique en attente' : 'Aucune boutique dans cette catégorie'}
          </p>
          <p style={{ fontSize: 13, color: T.muted }}>
            {statusTab === 'PENDING' ? 'Toutes les demandes ont été traitées.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map(v => (
            <VendorKYCCard
              key={v.id}
              vendor={v}
              onApprove={handleApprove}
              onReject={handleReject}
              acting={acting}
              T={T}
            />
          ))}
        </div>
      )}
    </div>
  );
}