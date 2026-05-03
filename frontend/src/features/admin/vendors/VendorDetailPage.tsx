// frontend/src/features/admin/vendors/VendorDetailPage.tsx
// Fiche complète d'un vendeur — espace admin BelivaY
// Données : GET /api/vendors/admin/vendors/:id/  (endpoint existant)

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, RefreshCw, Store, ExternalLink,
  CheckCircle, XCircle, Ban, Phone, Mail, MapPin, Calendar,
  Package, DollarSign, ShoppingCart, Award, CreditCard,
  Globe, Wifi, WifiOff, FileCheck, Download, User,
  TrendingUp, ToggleLeft,
} from 'lucide-react';
import { adminApi, type VendorProfile } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf  = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG VISUELLE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'En attente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  APPROVED:  { label: 'Approuvé',   color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)' },
  REJECTED:  { label: 'Rejeté',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)'  },
  SUSPENDED: { label: 'Suspendu',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.35)'},
};

const PLAN_CFG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:     { label: 'Gratuit',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  STARTER:  { label: 'Starter', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  PRO:      { label: 'Pro',     color: '#F47920', bg: 'rgba(244,121,32,0.12)'  },
  BUSINESS: { label: 'Business',color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

const CERT_CFG: Record<string, { label: string; color: string; pts: number; next: string | null }> = {
  BRONZE:  { label: 'Bronze',  color: '#CD7F32', pts: 500,  next: 'Argent'  },
  SILVER:  { label: 'Argent',  color: '#A8A9AD', pts: 1000, next: 'Or'      },
  GOLD:    { label: 'Or',      color: '#FFD700', pts: 2000, next: 'Diamant' },
  DIAMOND: { label: 'Diamant', color: '#60A5FA', pts: 9999, next: null      },
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPE ÉTENDU (champs retournés par VendorProfileSerializer enrichi)
// ─────────────────────────────────────────────────────────────────────────────

interface VendorDetail extends VendorProfile {
  photo_url:                   string | null;
  banner_url:                  string | null;
  whatsapp_phone:              string;
  is_online:                   boolean;
  public_url:                  string | null;
  total_points:                number;
  plan_expires_at:             string | null;
  default_withdrawal_operator: string;
  default_withdrawal_phone:    string;
  current_plan_name:           string;
  active_plan_code:            string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, T, action }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  T: ReturnType<typeof useAdminTheme>;
  action?: React.ReactNode;
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

function InfoRow({ label, value, T }: { label: string; value: React.ReactNode; T: ReturnType<typeof useAdminTheme> }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.text, textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const T             = useAdminTheme();
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [vendor,  setVendor]  = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getVendorDetail(Number(id));
      setVendor(data as VendorDetail);
    } catch {
      showToast('Vendeur introuvable', 'error');
      navigate('/admin/vendors');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const doAction = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!vendor) return;
    const cfgs = {
      approve: { title: `Approuver ${vendor.business_name} ?`, message: 'La boutique pourra vendre sur la plateforme.',    type: 'warning' as const, confirmText: 'Approuver' },
      reject:  { title: `Rejeter ${vendor.business_name} ?`,   message: 'La demande sera définitivement rejetée.',          type: 'danger'  as const, confirmText: 'Rejeter'   },
      suspend: { title: `Suspendre ${vendor.business_name} ?`, message: 'La boutique sera immédiatement désactivée.',       type: 'danger'  as const, confirmText: 'Suspendre' },
    };
    const ok = await confirm({ ...cfgs[action], cancelText: 'Annuler' });
    if (!ok) return;
    setActing(true);
    try {
      if (action === 'approve')     await adminApi.approveVendor(vendor.id);
      else if (action === 'reject') await adminApi.rejectVendor(vendor.id);
      else                          await adminApi.suspendVendor(vendor.id);
      showToast('Action effectuée', 'success');
      await load();
    } catch { showToast('Erreur', 'error'); }
    finally  { setActing(false); }
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

  if (!vendor) return null;

  // ── Dérivés ───────────────────────────────────────────────────────────────
  const statusCfg  = STATUS_CFG[vendor.status] ?? STATUS_CFG.PENDING;
  const planCode   = vendor.active_plan_code ?? vendor.plan_code ?? 'FREE';
  const planCfg    = PLAN_CFG[planCode] ?? PLAN_CFG.FREE;
  const certTier   = vendor.certification_tier ?? 'BRONZE';
  const certCfg    = CERT_CFG[certTier];
  const totalPts   = vendor.total_points ?? 0;
  const ptsMax     = certCfg.next ? certCfg.pts : totalPts;
  const ptsPct     = Math.min(100, Math.round((totalPts / ptsMax) * 100));
  const initial    = (vendor.business_name?.[0] ?? 'V').toUpperCase();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + Actions ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/admin/vendors" className="flex items-center gap-1.5 text-[12.5px] font-medium transition-all"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <ArrowLeft size={14} /> Vendeurs
          </Link>
          <ChevronRight size={12} style={{ color: T.muted }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{vendor.business_name}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => load()}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <RefreshCw size={13} />
          </button>

          {/* Lien boutique publique */}
          {vendor.public_url && vendor.status === 'APPROVED' && (
            <a href={vendor.public_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.muted; }}>
              <Globe size={13} /> Voir la boutique <ExternalLink size={11} />
            </a>
          )}

          {/* Actions selon statut */}
          {vendor.status === 'PENDING' && (
            <>
              <button onClick={() => doAction('approve')} disabled={acting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
                <CheckCircle size={13} /> Approuver
              </button>
              <button onClick={() => doAction('reject')} disabled={acting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle size={13} /> Rejeter
              </button>
            </>
          )}
          {vendor.status === 'APPROVED' && (
            <button onClick={() => doAction('suspend')} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Ban size={13} /> Suspendre
            </button>
          )}
          {(vendor.status === 'SUSPENDED' || vendor.status === 'REJECTED') && (
            <button onClick={() => doAction('approve')} disabled={acting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
              <CheckCircle size={13} /> Réactiver
            </button>
          )}
        </div>
      </div>

      {/* ── Header boutique ─────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg,#111827 0%,#1a1f35 50%,#16213e 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
      }}>

        {/* Banner */}
        <div className="relative h-28 sm:h-36" style={{
          background: vendor.banner_url
            ? `url(${vendor.banner_url}) center/cover`
            : `linear-gradient(135deg, ${statusCfg.color}22 0%, transparent 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Badge statut en haut à droite */}
          <div className="absolute top-3 right-3">
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8,
              background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`,
            }}>
              {statusCfg.label}
            </span>
          </div>
          {/* Badge en ligne */}
          <div className="absolute top-3 left-3">
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5,
              background: (vendor.is_online ?? true) ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)',
              color:      (vendor.is_online ?? true) ? '#10B981' : '#9CA3AF',
              border:     `1px solid ${(vendor.is_online ?? true) ? 'rgba(16,185,129,0.4)' : 'rgba(107,114,128,0.3)'}`,
            }}>
              {(vendor.is_online ?? true) ? <Wifi size={11} /> : <WifiOff size={11} />}
              {(vendor.is_online ?? true) ? 'En ligne' : 'Hors ligne'}
            </span>
          </div>
        </div>

        {/* Corps */}
        <div className="px-5 pb-5">
          {/* Avatar + infos */}
          <div className="flex items-end gap-4 -mt-8 mb-4 flex-wrap">
            {/* Photo boutique */}
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: vendor.photo_url
                ? `url(${vendor.photo_url}) center/cover`
                : `linear-gradient(135deg, ${statusCfg.color}44, ${statusCfg.color}88)`,
              border: '3px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: statusCfg.color, fontWeight: 800, fontSize: 24, flexShrink: 0,
            }}>
              {!vendor.photo_url && initial}
            </div>

            <div className="flex-1 min-w-0 pt-8">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.1 }}>
                  {vendor.business_name}
                </h1>
                {/* Plan */}
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: planCfg.bg, color: planCfg.color, border: `1px solid ${planCfg.color}40` }}>
                  {planCfg.label}
                </span>
                {/* Certification */}
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: certCfg.color + '18', color: certCfg.color }}>
                  {certCfg.label}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(249,250,251,0.5)', marginBottom: 8 }}>
                @{vendor.user_full_name ?? vendor.username}
              </p>
              {/* Coordonnées rapides */}
              <div className="flex items-center gap-3 flex-wrap">
                {vendor.user_email && (
                  <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.45)' }}>
                    <Mail size={11} /> {vendor.user_email}
                  </span>
                )}
                {vendor.phone && (
                  <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.45)' }}>
                    <Phone size={11} /> {vendor.phone}
                  </span>
                )}
                {vendor.city && (
                  <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.45)' }}>
                    <MapPin size={11} /> {vendor.city}
                  </span>
                )}
                {vendor.created_at && (
                  <span className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: 'rgba(249,250,251,0.45)' }}>
                    <Calendar size={11} /> Inscrit le {fmtDate(vendor.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Lien commandes */}
            <Link to={`/admin/orders?vendor=${vendor.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(249,250,251,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; (e.currentTarget as HTMLElement).style.color = '#F9FAFB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(249,250,251,0.6)'; }}>
              <ShoppingCart size={13} /> Commandes <ExternalLink size={11} />
            </Link>
          </div>

          {/* Description */}
          {vendor.business_description && (
            <p style={{ fontSize: 13, color: 'rgba(249,250,251,0.45)', lineHeight: 1.7, marginTop: 4 }}>
              {vendor.business_description}
            </p>
          )}
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Produits',       value: `${vendor.total_products ?? 0}`,            sub: `${vendor.active_products ?? 0} actifs`,         icon: Package,      accent: '#3B82F6' },
          { label: 'Revenus générés',value: fmtXaf(vendor.total_revenue ?? 0),          sub: 'commandes payées',                              icon: DollarSign,   accent: '#10B981' },
          { label: 'Commandes',      value: `${vendor.total_orders ?? 0}`,              sub: 'impliquant cette boutique',                     icon: ShoppingCart, accent: '#F47920' },
          { label: 'Points fidélité',value: `${totalPts.toLocaleString('fr-FR')} pts`,  sub: `Tier : ${certCfg.label}`,                       icon: Award,        accent: certCfg.color },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{kpi.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: kpi.accent + '18' }}>
                  <Icon size={14} style={{ color: kpi.accent }} />
                </div>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: 4 }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: T.muted }}>{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Barre de progression certification ───────────────────────── */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={14} style={{ color: certCfg.color }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Certification <span style={{ color: certCfg.color }}>{certCfg.label}</span>
            </span>
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>
            {totalPts.toLocaleString('fr-FR')} pts
            {certCfg.next && ` / ${certCfg.pts.toLocaleString('fr-FR')} pts`}
          </span>
        </div>
        <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${ptsPct}%`, background: `linear-gradient(90deg, ${certCfg.color}88, ${certCfg.color})`, transition: 'width 0.6s ease' }} />
        </div>
        {certCfg.next && (
          <p style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
            {Math.max(0, certCfg.pts - totalPts).toLocaleString('fr-FR')} pts pour atteindre le niveau {certCfg.next}
          </p>
        )}
      </div>

      {/* ── Layout 2 colonnes ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* COLONNE GAUCHE */}
        <div className="space-y-5">

          {/* Informations boutique */}
          <Section title="Informations boutique" icon={Store} T={T}>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label="Nom boutique"    value={vendor.business_name}  T={T} />
              <InfoRow label="Slug / URL"      value={vendor.shop_slug ? <code style={{ fontSize: 11.5, background: T.cardAlt, padding: '2px 6px', borderRadius: 4 }}>{vendor.shop_slug}</code> : '—'} T={T} />
              <InfoRow label="Ville"           value={vendor.city}           T={T} />
              <InfoRow label="Adresse"         value={vendor.address}        T={T} />
              <InfoRow label="Téléphone"       value={vendor.phone}          T={T} />
              <InfoRow label="WhatsApp"        value={vendor.whatsapp_phone ?? '—'} T={T} />
              <InfoRow label="Statut"
                value={<span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>}
                T={T} />
              <InfoRow label="En ligne"
                value={<span style={{ color: (vendor.is_online ?? true) ? '#10B981' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  {(vendor.is_online ?? true) ? <><Wifi size={13} /> Oui</> : <><WifiOff size={13} /> Non</>}
                </span>}
                T={T} />
              <InfoRow label="Inscrit le"     value={fmtDate(vendor.created_at)} T={T} />
              {vendor.approved_at && (
                <InfoRow label="Approuvé le"  value={fmtDateTime(vendor.approved_at)} T={T} />
              )}
            </div>
          </Section>

          {/* Propriétaire */}
          <Section title="Propriétaire du compte" icon={User} T={T}
            action={
              <Link to={`/admin/customers/${vendor.user_id}`}
                className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.red }}>
                Voir profil <ExternalLink size={10} />
              </Link>
            }>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label="Nom complet"    value={vendor.user_full_name ?? vendor.username} T={T} />
              <InfoRow label="Email"          value={vendor.user_email ?? vendor.email}         T={T} />
            </div>
          </Section>

          {/* Document KYC */}
          <Section title="Document KYC" icon={FileCheck} T={T}>
            {vendor.id_document ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>Document fourni</p>
                  <p style={{ fontSize: 11, color: T.muted }} className="truncate">{vendor.id_document}</p>
                </div>
                {vendor.id_document.startsWith('http') && (
                  <a href={vendor.id_document} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
                    style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                    <Download size={13} /> Télécharger
                  </a>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: T.muted, textAlign: 'center', padding: '12px 0' }}>Aucun document fourni</p>
            )}
          </Section>
        </div>

        {/* COLONNE DROITE */}
        <div className="space-y-5">

          {/* Plan & Abonnement */}
          <Section title="Plan & Abonnement" icon={CreditCard} T={T}>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label="Plan actuel"
                value={<span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: planCfg.bg, color: planCfg.color, border: `1px solid ${planCfg.color}40` }}>
                  {planCfg.label}
                </span>}
                T={T} />
              <InfoRow label="Expire le"    value={vendor.plan_expires_at ? fmtDateTime(vendor.plan_expires_at) : 'Gratuit (sans expiration)'} T={T} />
            </div>

            {/* Détails plan */}
            <div className="mt-4 rounded-xl p-4" style={{ background: planCfg.bg, border: `1px solid ${planCfg.color}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: planCfg.color }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: planCfg.color }}>Plan {planCfg.label}</span>
              </div>
              <p style={{ fontSize: 12, color: T.muted }}>
                {planCode === 'FREE'     && 'Accès gratuit avec commission standard.'}
                {planCode === 'STARTER'  && 'Commission réduite, accès aux outils de base.'}
                {planCode === 'PRO'      && 'Commission compétitive, boosts mensuels inclus.'}
                {planCode === 'BUSINESS' && 'Commission minimale, toutes les fonctionnalités.'}
              </p>
            </div>
          </Section>

          {/* Paiements Mobile Money */}
          <Section title="Mobile Money (retraits)" icon={ToggleLeft} T={T}>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label="Opérateur préférentiel"
                value={
                  vendor.default_withdrawal_operator
                    ? <span style={{ fontWeight: 700 }}>{vendor.default_withdrawal_operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}</span>
                    : '—'
                }
                T={T} />
              <InfoRow label="Numéro MoMo" value={vendor.default_withdrawal_phone || '—'} T={T} />
            </div>
          </Section>

          {/* Activité récente — lien vers les commandes */}
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,121,32,0.12)' }}>
              <ShoppingCart size={16} style={{ color: '#F47920' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>
                {vendor.total_orders ?? 0} commande{(vendor.total_orders ?? 0) > 1 ? 's' : ''} générée{(vendor.total_orders ?? 0) > 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 12, color: T.muted }}>
                {fmtXaf(vendor.total_revenue ?? 0)} de revenus bruts
              </p>
            </div>
            <Link to={`/admin/orders?vendor=${vendor.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
              style={{ background: 'rgba(244,121,32,0.1)', color: '#F47920', border: '1px solid rgba(244,121,32,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,121,32,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244,121,32,0.1)')}>
              Voir <ExternalLink size={11} />
            </Link>
          </div>

          {/* Produits — lien vers le catalogue filtré */}
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <Package size={16} style={{ color: '#3B82F6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>
                {vendor.total_products ?? 0} produit{(vendor.total_products ?? 0) > 1 ? 's' : ''} au catalogue
              </p>
              <p style={{ fontSize: 12, color: T.muted }}>
                {vendor.active_products ?? 0} actifs sur {vendor.total_products ?? 0}
              </p>
            </div>
            <Link to={`/admin/catalogue?vendor=${vendor.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}>
              Voir <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}