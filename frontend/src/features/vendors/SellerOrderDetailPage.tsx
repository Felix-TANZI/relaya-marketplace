// frontend/src/features/vendors/SellerOrderDetailPage.tsx
// Page de détail d'une commande vendeur.
// Infos client · Articles · Stepper · Actions · Facture individuelle

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, MapPin, Phone, Mail, FileText,
  RefreshCw, CheckCircle, Clock, Truck, PackageCheck,
  XCircle, AlertTriangle, User, DollarSign, StickyNote,
} from 'lucide-react';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { openInvoice, fmtXAF, fmtDate, orderRef } from './orderUtils';

// ─────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────
const T = {
  orange:  '#F47920',
  orangeL: '#FFF3E8',
  cream:   '#F5F0E8',
  creamAlt:'#EDE7DC',
  white:   '#FFFFFF',
  border:  '#E8E2D9',
  text:    '#1A1209',
  muted:   '#7C6E5A',
  mutedL:  '#B8A898',
  green:   '#16A34A',
  greenL:  'rgba(22,163,74,0.10)',
  red:     '#DC2626',
  redL:    'rgba(220,38,38,0.10)',
  amber:   '#D97706',
  amberL:  'rgba(217,119,6,0.10)',
  blue:    '#2563EB',
  blueL:   'rgba(37,99,235,0.10)',
  violet:  '#7C3AED',
  violetL: 'rgba(124,58,237,0.10)',
};

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
type FulfillStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const STEPS = [
  { key: 'RECEIVED',   label: 'Reçue',         icon: CheckCircle },
  { key: 'PENDING',    label: 'Confirmée',      icon: Clock },
  { key: 'PROCESSING', label: 'Préparation',    icon: Package },
  { key: 'SHIPPED',    label: 'Prête',          icon: Truck },
  { key: 'DELIVERED',  label: 'Livrée',         icon: PackageCheck },
];

const STATUS_ORDER: Record<string, number> = {
  RECEIVED: 0, PENDING: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4, CANCELLED: -1,
};

const FULFILL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Confirmée',    color: T.amber,  bg: T.amberL  },
  PROCESSING: { label: 'Préparation',  color: T.blue,   bg: T.blueL   },
  SHIPPED:    { label: 'Prête',        color: T.violet, bg: T.violetL },
  DELIVERED:  { label: 'Livrée',       color: T.green,  bg: T.greenL  },
  CANCELLED:  { label: 'Annulée',      color: T.red,    bg: T.redL    },
};

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'En attente',    color: T.amber,  bg: T.amberL },
  PAID:     { label: 'Payée',         color: T.green,  bg: T.greenL },
  FAILED:   { label: 'Échouée',       color: T.red,    bg: T.redL   },
  REFUNDED: { label: 'Remboursée',    color: T.blue,   bg: T.blueL  },
};

// ─────────────────────────────────────────────
// HOOK shop name
// ─────────────────────────────────────────────
function useShopName(): string {
  const [name, setName] = useState('Ma Boutique');
  useEffect(() => {
    vendorsApi.getProfile().then(p => setName(p.business_name)).catch(() => null);
  }, []);
  return name;
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────

function InfoCard({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: T.orangeL, color: T.orange }}>
          {icon}
        </div>
        <span className="font-bold text-[14px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          {title}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: `1px solid ${T.creamAlt}` }}>
      <div className="flex-shrink-0 mt-0.5" style={{ color: T.mutedL }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: T.mutedL }}>
          {label}
        </p>
        <p className="text-[13.5px] font-semibold" style={{ color: T.text }}>{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────

export default function SellerOrderDetailPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { showToast } = useToast();
  const shopName   = useShopName();

  const [order,      setOrder]      = useState<VendorOrder | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [updating,   setUpdating]   = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await vendorsApi.getOrderDetail(parseInt(id));
      setOrder(data);
    } catch {
      showToast('Commande introuvable', 'error');
      navigate('/seller/orders');
    } finally { setLoading(false); }
  }, [id, navigate, showToast]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const handleAdvance = async (next: FulfillStatus) => {
    if (!order) return;
    try {
      setUpdating(true);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, { fulfillment_status: next });
      setOrder(updated);
      showToast(`Statut mis à jour : ${FULFILL_CFG[next]?.label ?? next}`, 'success');
    } catch {
      showToast('Erreur de mise à jour', 'error');
    } finally { setUpdating(false); }
  };

  const handleInvoice = () => {
    if (order) openInvoice([order], shopName);
  };

  // ── Skeleton ──
  if (loading) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-24 rounded-xl animate-pulse" style={{ background: T.creamAlt }} />
        <div className="h-7 w-40 rounded-xl animate-pulse" style={{ background: T.creamAlt }} />
      </div>
      <div className="rounded-2xl h-40 animate-pulse" style={{ background: T.white, border: `1px solid ${T.border}` }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0,1].map(i => (
          <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: T.white, border: `1px solid ${T.border}` }} />
        ))}
      </div>
    </div>
  );

  if (!order) return null;

  const fulfillCfg  = FULFILL_CFG[order.fulfillment_status];
  const paymentCfg  = PAYMENT_CFG[order.payment_status];
  const currentOrd  = STATUS_ORDER[order.fulfillment_status] ?? 1;
  const status      = order.fulfillment_status as FulfillStatus;
  const isCancelled = status === 'CANCELLED';
  const isDelivered = status === 'DELIVERED';
  const spinner     = <RefreshCw size={13} className="animate-spin" />;

  // Calcul timer (72h)
  const diffMs = new Date(order.created_at).getTime() + 72 * 3600000 - Date.now();
  const timer  = status === 'PENDING' && diffMs > 0
    ? `${Math.floor(diffMs / 3600000)}h ${Math.floor((diffMs % 3600000) / 60000)}min restantes`
    : null;

  return (
    <div className="space-y-5">

      {/* ═══ NAVIGATION ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/seller/orders"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
          style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted,
            boxShadow: '0 1px 3px rgba(28,18,9,0.06)' }}>
          <ArrowLeft size={14} />Retour
        </Link>
        <h1 className="text-[20px] font-black" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
          Commande {orderRef(order.id)}
        </h1>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {fulfillCfg && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1"
              style={{ color: fulfillCfg.color, background: fulfillCfg.bg }}>
              {fulfillCfg.label}
            </span>
          )}
          {paymentCfg && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-1"
              style={{ color: paymentCfg.color, background: paymentCfg.bg }}>
              {paymentCfg.label}
            </span>
          )}
          <button onClick={handleInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:-translate-y-px"
            style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.35)` }}>
            <FileText size={13} />Facture
          </button>
        </div>
      </div>

      {/* ═══ PROGRESSION ═══ */}
      <div className="rounded-2xl p-5"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: T.mutedL }}>
          Progression de la commande
        </p>

        {/* Timer */}
        {timer && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.12)' }}>
            <Clock size={13} style={{ color: T.green }} />
            <span className="text-[12px] font-semibold" style={{ color: T.green }}>{timer}</span>
          </div>
        )}

        {/* Stepper */}
        {isCancelled ? (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: T.redL }}>
            <XCircle size={18} style={{ color: T.red }} />
            <div>
              <p className="font-bold text-[13px]" style={{ color: T.red }}>Commande annulée</p>
              <p className="text-[11px]" style={{ color: T.red }}>Le 01 jan. 2025 à 14:30</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start overflow-x-auto pb-2">
            {STEPS.map((step, i) => {
              const stepOrd  = STATUS_ORDER[step.key] ?? i;
              const isDone   = stepOrd < currentOrd;
              const isCur    = step.key === status;
              const isFuture = !isDone && !isCur;
              const Icon     = step.icon;

              return (
                <div key={step.key} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Cercle */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isDone ? T.green : isCur ? T.orange : T.creamAlt,
                        border: isDone ? `2px solid ${T.green}` : isCur ? `2px solid ${T.orange}` : `2px solid ${T.border}`,
                        boxShadow: isCur ? `0 0 0 4px rgba(244,121,32,0.15)` : 'none',
                      }}>
                      {isDone && <Icon size={14} className="text-white" />}
                      {isCur  && <Icon size={14} style={{ color: 'white' }} />}
                      {isFuture && <Icon size={14} style={{ color: T.mutedL }} />}
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-semibold whitespace-nowrap"
                      style={{ color: isDone ? T.green : isCur ? T.orange : T.mutedL, fontWeight: isCur ? 700 : 500 }}>
                      {step.label}
                    </span>
                  </div>
                  {/* Ligne */}
                  {i < STEPS.length - 1 && (
                    <div className="h-[2px] w-12 sm:w-16 mb-5 flex-shrink-0 mx-1"
                      style={{ background: isDone ? T.green : T.border }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Boutons d'action */}
        {!isCancelled && !isDelivered && (
          <div className="flex gap-2 mt-5 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
            {status === 'PENDING' && (
              <>
                <button onClick={() => handleAdvance('PROCESSING')}
                  disabled={updating || !order.is_paid}
                  title={!order.is_paid ? 'En attente du paiement' : undefined}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
                  style={{ background: T.green, boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                  {updating ? spinner : <CheckCircle size={14} />}Accepter la commande
                </button>
                <button onClick={() => handleAdvance('PROCESSING')}
                  disabled={updating || !order.is_paid}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all"
                  style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}>
                  {updating ? spinner : <Package size={14} />}Passer en préparation
                </button>
                <button onClick={() => handleAdvance('CANCELLED')}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all"
                  style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)`, color: T.red }}>
                  {updating ? spinner : <XCircle size={14} />}Refuser
                </button>
              </>
            )}
            {status === 'PROCESSING' && (
              <button onClick={() => handleAdvance('SHIPPED')}
                disabled={updating}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
                style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
                {updating ? spinner : <Truck size={14} />}Marquer comme prêt à expédier
              </button>
            )}
            {status === 'SHIPPED' && (
              <button onClick={() => handleAdvance('DELIVERED')}
                disabled={updating}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
                style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
                {updating ? spinner : <PackageCheck size={14} />}Marquer comme livré
              </button>
            )}
          </div>
        )}

        {/* Alerte paiement non confirmé */}
        {!order.is_paid && !isCancelled && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background: T.amberL, border: `1px solid rgba(217,119,6,0.2)` }}>
            <AlertTriangle size={13} style={{ color: T.amber }} />
            <p className="text-[12px] font-semibold" style={{ color: T.amber }}>
              Le paiement n'est pas encore confirmé. Vous ne pouvez pas traiter cette commande.
            </p>
          </div>
        )}
      </div>

      {/* ═══ GRILLE — Client + Résumé ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Infos client */}
        <InfoCard icon={<User size={15} />} title="Informations client">
          <DetailRow icon={<User size={13} />}    label="Nom"       value={order.customer_name} />
          {order.customer_phone && (
            <DetailRow icon={<Phone size={13} />}   label="Téléphone" value={order.customer_phone} />
          )}
          {order.customer_email && (
            <DetailRow icon={<Mail size={13} />}    label="Email"     value={order.customer_email} />
          )}
          <DetailRow icon={<MapPin size={13} />}  label="Ville"     value={order.city} />
          {order.address && (
            <DetailRow icon={<MapPin size={13} />} label="Adresse"   value={order.address} />
          )}
          {order.note && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: T.orangeL, border: `1px solid rgba(244,121,32,0.15)` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <StickyNote size={12} style={{ color: T.orange }} />
                <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: T.orange }}>
                  Note du client
                </span>
              </div>
              <p className="text-[12.5px]" style={{ color: T.text }}>{order.note}</p>
            </div>
          )}
        </InfoCard>

        {/* Résumé financier */}
        <InfoCard icon={<DollarSign size={15} />} title="Résumé financier">
          <div className="space-y-3">
            {[
              { label: 'Sous-total produits', value: fmtXAF(order.subtotal_xaf ?? 0), strong: false },
              {
                label: 'Frais de livraison',
                value: (order.delivery_fee_xaf ?? 0) === 0 ? 'Offerts' : fmtXAF(order.delivery_fee_xaf ?? 0),
                strong: false,
              },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2"
                style={{ borderBottom: `1px solid ${T.creamAlt}` }}>
                <span className="text-[13px]" style={{ color: T.muted }}>{row.label}</span>
                <span className="text-[13px] font-semibold" style={{ color: T.text }}>{row.value}</span>
              </div>
            ))}

            {/* Total vendeur */}
            <div className="flex items-center justify-between p-3 rounded-xl mt-2"
              style={{ background: T.text }}>
              <span className="text-[13px] font-bold text-white">Votre revenu</span>
              <span className="text-[17px] font-black" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
                {fmtXAF(order.vendor_total ?? 0)}
              </span>
            </div>

            {/* Statuts */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {paymentCfg && (
                <div className="rounded-xl px-3 py-2 text-center"
                  style={{ background: paymentCfg.bg }}>
                  <p className="text-[9.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: paymentCfg.color }}>
                    Paiement
                  </p>
                  <p className="text-[12.5px] font-bold" style={{ color: paymentCfg.color }}>
                    {paymentCfg.label}
                  </p>
                </div>
              )}
              {fulfillCfg && (
                <div className="rounded-xl px-3 py-2 text-center"
                  style={{ background: fulfillCfg.bg }}>
                  <p className="text-[9.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: fulfillCfg.color }}>
                    Livraison
                  </p>
                  <p className="text-[12.5px] font-bold" style={{ color: fulfillCfg.color }}>
                    {fulfillCfg.label}
                  </p>
                </div>
              )}
            </div>
          </div>
        </InfoCard>
      </div>

      {/* ═══ ARTICLES COMMANDÉS ═══ */}
      <InfoCard icon={<Package size={15} />} title={`Articles commandés (${(order.items ?? []).length})`}>
        <div className="divide-y" style={{ borderColor: T.creamAlt }}>
          {(order.items ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              {/* Image */}
              <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                style={{ background: T.orangeL }}>
                {item.product_image
                  ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                  : <Package size={20} style={{ color: T.orange }} />}
              </div>

              {/* Info produit */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px]" style={{ color: T.text }}>{item.product_title}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[12px]" style={{ color: T.muted }}>
                    Qté : <strong style={{ color: T.text }}>{item.qty}</strong>
                  </span>
                  <span className="text-[12px]" style={{ color: T.muted }}>
                    Prix unit. : <strong style={{ color: T.text }}>
                      {fmtXAF(item.product_price ?? item.price_xaf_snapshot ?? 0)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Total ligne */}
              <div className="text-right flex-shrink-0">
                <p className="font-black text-[16px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
                  {fmtXAF(item.line_total_xaf)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* ═══ PIED DE PAGE ═══ */}
      <div className="rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
        <p className="text-[12px]" style={{ color: T.muted }}>
          Commande créée le {fmtDate(order.created_at)}
          {order.updated_at && order.updated_at !== order.created_at
            ? ` · Mise à jour le ${fmtDate(order.updated_at)}`
            : ''}
        </p>
        <button onClick={handleInvoice}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.35)` }}>
          <FileText size={13} />Imprimer la facture
        </button>
      </div>
    </div>
  );
}