// frontend/src/features/admin/orders/OrderDetailPage.tsx
// Détail complet d'une commande — admin BelivaY

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, RefreshCw, ShoppingCart, User,
  Phone, MapPin, DollarSign, Truck, Package, Clock,
  CheckCircle, XCircle, Ban, ExternalLink, CreditCard,
  FileText, AlertCircle, ChevronDown,
} from 'lucide-react';
import { adminApi, type AdminOrderDetail, type AdminOrderUpdate } from '@/services/api/admin';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtXaf     = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const fmtDateTime= (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'En attente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  PAID:     { label: 'Payée',       color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  FAILED:   { label: 'Échouée',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  REFUNDED: { label: 'Remboursée',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
};

const FULFILLMENT_STEPS = ['PENDING','PROCESSING','SHIPPED','DELIVERED'] as const;

const FULFILLMENT_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:    { label: 'En attente',  color: '#F59E0B', icon: Clock       },
  PROCESSING: { label: 'En cours',    color: '#3B82F6', icon: Package     },
  SHIPPED:    { label: 'Expédiée',    color: '#8B5CF6', icon: Truck       },
  DELIVERED:  { label: 'Livrée',      color: '#10B981', icon: CheckCircle },
  CANCELLED:  { label: 'Annulée',     color: '#EF4444', icon: Ban         },
};

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

function InfoRow({ label, value, T }: { label: string; value: React.ReactNode; T: ReturnType<typeof useAdminTheme> }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12.5, color: T.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: T.text, textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const T             = useAdminTheme();
  const navigate      = useNavigate();
  const { showToast } = useToast();
  const { confirm }   = useConfirm();

  const [order,   setOrder]   = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [editMode, setEditMode]= useState(false);
  const [editData, setEditData]= useState<AdminOrderUpdate>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminApi.getOrderDetail(Number(id));
      setOrder(data);
      setEditData({ payment_status: data.payment_status, fulfillment_status: data.fulfillment_status, note: data.note ?? '' });
    } catch {
      showToast('Commande introuvable', 'error');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  }, [id, showToast, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!order) return;
    setActing(true);
    try {
      await adminApi.updateOrder(order.id, editData);
      showToast('Commande mise à jour', 'success');
      setEditMode(false);
      await load();
    } catch { showToast('Erreur lors de la mise à jour', 'error'); }
    finally  { setActing(false); }
  };

  const handleCancel = async () => {
    if (!order) return;
    const ok = await confirm({
      title: `Annuler la commande #${order.id} ?`,
      message: 'Cette action est irréversible.',
      type: 'danger', confirmText: 'Annuler la commande', cancelText: 'Garder',
    });
    if (!ok) return;
    setActing(true);
    try {
      await adminApi.cancelOrder(order.id);
      showToast('Commande annulée', 'success');
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

  if (!order) return null;

  const payCfg  = PAYMENT_CFG[order.payment_status] ?? PAYMENT_CFG.PENDING;
  const fillCfg = FULFILLMENT_CFG[order.fulfillment_status] ?? FULFILLMENT_CFG.PENDING;
  const isCancelled = order.fulfillment_status === 'CANCELLED';
  const isDelivered = order.fulfillment_status === 'DELIVERED';
  const canEdit     = !isCancelled && !isDelivered;

  // Index de l'étape actuelle dans le stepper
  const stepIdx = FULFILLMENT_STEPS.indexOf(order.fulfillment_status as typeof FULFILLMENT_STEPS[number]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Breadcrumb + Actions ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/admin/orders" className="flex items-center gap-1.5 text-[12.5px] font-medium"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <ArrowLeft size={14} /> Commandes
          </Link>
          <ChevronRight size={12} style={{ color: T.muted }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>Commande #{order.id}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => load()} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
            <RefreshCw size={13} />
          </button>
          {canEdit && !editMode && (
            <>
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                Modifier les statuts
              </button>
              <button onClick={handleCancel} disabled={acting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <XCircle size={13} /> Annuler
              </button>
            </>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                style={{ background: T.cardAlt, color: T.muted, border: `1px solid ${T.border}` }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={acting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
                {acting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                Enregistrer
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Header commande ──────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 sm:p-6" style={{
        background: 'linear-gradient(135deg,#111827 0%,#1a1f35 50%,#16213e 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#F9FAFB', lineHeight: 1.1, marginBottom: 6 }}>
              Commande <span style={{ color: T.red }}>#{order.id}</span>
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(249,250,251,0.45)' }}>
              Passée le {fmtDateTime(order.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 8, background: payCfg.bg, color: payCfg.color, border: `1px solid ${payCfg.color}40` }}>
              {payCfg.label}
            </span>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 8, background: fillCfg.color + '18', color: fillCfg.color, border: `1px solid ${fillCfg.color}40` }}>
              {fillCfg.label}
            </span>
          </div>
        </div>

        {/* Stepper de livraison (masqué si annulé) */}
        {!isCancelled && (
          <div className="flex items-center gap-0">
            {FULFILLMENT_STEPS.map((step, i) => {
              const cfg      = FULFILLMENT_CFG[step];
              const Icon     = cfg.icon;
              const isPast   = i <= stepIdx;
              const isCurrent= i === stepIdx;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  {/* Point */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isPast ? cfg.color : 'rgba(255,255,255,0.1)',
                      border: `2px solid ${isPast ? cfg.color : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isCurrent ? `0 0 12px ${cfg.color}66` : 'none',
                    }}>
                      <Icon size={14} style={{ color: isPast ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                    </div>
                    <p style={{ fontSize: 10, color: isPast ? cfg.color : 'rgba(255,255,255,0.3)', marginTop: 4, whiteSpace: 'nowrap', fontWeight: isCurrent ? 700 : 400 }}>
                      {cfg.label}
                    </p>
                  </div>
                  {/* Connecteur */}
                  {i < FULFILLMENT_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, margin: '0 4px', marginBottom: 20, background: i < stepIdx ? FULFILLMENT_CFG[FULFILLMENT_STEPS[i + 1]].color + '60' : 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isCancelled && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ban size={16} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 13, color: '#FCA5A5', fontWeight: 600 }}>Cette commande a été annulée</span>
          </div>
        )}
      </div>

      {/* ── Formulaire de modification (si editMode) ─────────────────── */}
      {editMode && (
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.red}40` }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 16 }}>
            Modifier la commande
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Statut paiement */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Statut paiement</label>
              <div className="relative">
                <select
                  value={editData.payment_status}
                  onChange={e => setEditData(d => ({ ...d, payment_status: e.target.value as AdminOrderUpdate['payment_status'] }))}
                  className="w-full appearance-none pr-8 pl-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                  {['PENDING','PAID','FAILED','REFUNDED'].map(s => <option key={s} value={s}>{PAYMENT_CFG[s]?.label ?? s}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }} />
              </div>
            </div>
            {/* Statut livraison */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Statut livraison</label>
              <div className="relative">
                <select
                  value={editData.fulfillment_status}
                  onChange={e => setEditData(d => ({ ...d, fulfillment_status: e.target.value as AdminOrderUpdate['fulfillment_status'] }))}
                  className="w-full appearance-none pr-8 pl-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}` }}>
                  {['PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{FULFILLMENT_CFG[s]?.label ?? s}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
          {/* Note admin */}
          <div className="mt-4">
            <label style={{ fontSize: 12, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 6 }}>Note admin (interne)</label>
            <textarea
              value={editData.note ?? ''}
              onChange={e => setEditData(d => ({ ...d, note: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
              style={{ background: T.input, color: T.text, border: `1px solid ${T.inputBorder}`, fontFamily: "'Plus Jakarta Sans',sans-serif" }}
              onFocus={e  => (e.target.style.borderColor = T.red)}
              onBlur={e   => (e.target.style.borderColor = T.inputBorder)}
              placeholder="Note visible uniquement par l'équipe admin…"
            />
          </div>
        </div>
      )}

      {/* ── Layout 2 colonnes ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* COLONNE GAUCHE (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Articles commandés */}
          <Section title="Articles" icon={ShoppingCart} T={T}>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={item.id} className="flex items-start gap-3 py-3" style={{ borderBottom: i < order.items.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  {/* Image */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                    background: item.product_image ? `url(${item.product_image}) center/cover` : T.cardAlt,
                    border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {!item.product_image && <Package size={18} style={{ color: T.muted }} />}
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }} className="truncate">
                      {item.product_title}
                    </p>
                    <p style={{ fontSize: 11.5, color: T.muted }}>
                      par <span style={{ color: '#F47920', fontWeight: 600 }}>{item.vendor_name}</span>
                    </p>
                    <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                      {fmtXaf(item.price_xaf_snapshot)} × {item.qty}
                    </p>
                  </div>
                  {/* Total ligne */}
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.text, flexShrink: 0 }}>
                    {fmtXaf(item.line_total_xaf)}
                  </p>
                </div>
              ))}
            </div>

            {/* Récapitulatif montants */}
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ fontSize: 13, color: T.muted }}>Sous-total</span>
                  <span style={{ fontSize: 13, color: T.text }}>{fmtXaf(order.subtotal_xaf)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 13, color: T.muted }}>Frais de livraison</span>
                  <span style={{ fontSize: 13, color: T.text }}>
                    {order.delivery_fee_xaf === 0 ? <span style={{ color: '#10B981' }}>Gratuit</span> : fmtXaf(order.delivery_fee_xaf)}
                  </span>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: order.payment_status === 'PAID' ? '#10B981' : T.text }}>{fmtXaf(order.total_xaf)}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Historique */}
          {order.history && order.history.length > 0 && (
            <Section title="Historique des modifications" icon={FileText} T={T}>
              <div className="space-y-0">
                {order.history.map((h, i) => (
                  <div key={h.id} className="flex items-start gap-3 py-3" style={{ borderBottom: i < order.history.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(220,38,38,0.1)' }}>
                      <FileText size={13} style={{ color: T.red }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{h.action}</p>
                      {h.field_name && (
                        <p style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>
                          {h.field_name} : <span style={{ color: '#EF4444' }}>{h.old_value}</span> → <span style={{ color: '#10B981' }}>{h.new_value}</span>
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        par {h.user_name} · {fmtDateTime(h.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* COLONNE DROITE (1/3) */}
        <div className="space-y-5">

          {/* Client */}
          <Section title="Client" icon={User} T={T}
            action={order.user ? (
              <Link to={`/admin/customers/${order.user}`} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: T.red }}>
                Voir profil <ExternalLink size={10} />
              </Link>
            ) : undefined}>
            <div style={{ marginBottom: -10 }}>
              <InfoRow label="Nom"        value={order.customer_name}  T={T} />
              <InfoRow label="Email"      value={order.customer_email} T={T} />
              <InfoRow label="Téléphone"  value={<span className="flex items-center gap-1.5"><Phone size={12} style={{ color: T.muted }} />{order.customer_phone}</span>} T={T} />
              <InfoRow label="Ville"      value={<span className="flex items-center gap-1.5"><MapPin size={12} style={{ color: T.muted }} />{order.city}</span>}            T={T} />
              <InfoRow label="Adresse"    value={order.address}        T={T} />
            </div>
            {order.note && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 4 }}>Note client</p>
                <p style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{order.note}</p>
              </div>
            )}
          </Section>

          {/* Paiements */}
          <Section title="Transactions de paiement" icon={CreditCard} T={T}>
            {!order.payment_transactions || order.payment_transactions.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <AlertCircle size={24} style={{ color: T.muted }} />
                <p style={{ fontSize: 13, color: T.muted }}>Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-3">
                {order.payment_transactions.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-xl" style={{ background: T.cardAlt, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{tx.provider}</span>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                        background: tx.status === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: tx.status === 'SUCCESS' ? '#10B981' : '#EF4444',
                      }}>
                        {tx.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>{fmtXaf(tx.amount_xaf)}</p>
                    <div style={{ marginBottom: -6 }}>
                      <InfoRow label="Numéro"     value={tx.payer_phone} T={T} />
                      {tx.external_ref && <InfoRow label="Réf. externe" value={<code style={{ fontSize: 11, background: T.border, padding: '1px 5px', borderRadius: 3 }}>{tx.external_ref}</code>} T={T} />}
                      <InfoRow label="Date"       value={fmtDateTime(tx.created_at)} T={T} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Résumé financier */}
          <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign size={14} style={{ color: T.red }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Résumé financier</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span style={{ fontSize: 12, color: T.muted }}>Sous-total</span>
                <span style={{ fontSize: 12, color: T.text }}>{fmtXaf(order.subtotal_xaf)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ fontSize: 12, color: T.muted }}>Livraison</span>
                <span style={{ fontSize: 12, color: order.delivery_fee_xaf === 0 ? '#10B981' : T.text }}>
                  {order.delivery_fee_xaf === 0 ? 'Gratuit' : fmtXaf(order.delivery_fee_xaf)}
                </span>
              </div>
              <div className="flex justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: order.payment_status === 'PAID' ? '#10B981' : T.text }}>
                  {fmtXaf(order.total_xaf)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}