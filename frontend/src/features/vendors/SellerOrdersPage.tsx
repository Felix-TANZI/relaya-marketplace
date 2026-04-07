// frontend/src/features/vendors/SellerOrdersPage.tsx
// Page commandes vendeur — fidèle à la maquette BelivaY.
// Cards verticales · Stepper progression · Timer · Boutons contextuels par statut

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Search, RefreshCw, CheckCircle, Clock,
  Truck, PackageCheck, XCircle, Package,
  FileText, Download, AlertTriangle,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorOrder,
  type VendorOrderFilters,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';

// ─────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────
const T = {
  orange:  '#F47920',
  orangeL: '#FFF3E8',
  orangeB: 'rgba(244,121,32,0.12)',
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
// TYPES & CONFIG
// ─────────────────────────────────────────────

type FulfillStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// Étapes du stepper — correspond au parcours dans la maquette
const STEPS: { key: FulfillStatus | 'RECEIVED'; label: string }[] = [
  { key: 'RECEIVED',   label: 'Reçue' },
  { key: 'PENDING',    label: 'Confirmée' },
  { key: 'PROCESSING', label: 'Préparation' },
  { key: 'SHIPPED',    label: 'Prête' },
  { key: 'DELIVERED',  label: 'Livrée' },
];

// Ordre numérique des statuts
const STATUS_ORDER: Record<string, number> = {
  RECEIVED: 0, PENDING: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4, CANCELLED: -1,
};

// Config badges statut
const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Confirmée',      color: T.amber,  bg: T.amberL  },
  PROCESSING: { label: 'Préparation',    color: T.blue,   bg: T.blueL   },
  SHIPPED:    { label: 'Prête',          color: T.violet, bg: T.violetL },
  DELIVERED:  { label: 'Livrée',         color: T.green,  bg: T.greenL  },
  CANCELLED:  { label: 'Annulée',        color: T.red,    bg: T.redL    },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function fmtXAF(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

// Calcule le timer restant (72h depuis création)
function computeTimer(createdAt: string): string | null {
  const created  = new Date(createdAt).getTime();
  const deadline = created + 72 * 60 * 60 * 1000;
  const now      = Date.now();
  const diff     = deadline - now;
  if (diff <= 0) return null;
  const h  = Math.floor(diff / 3600000);
  const m  = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}min restantes`;
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANT — BADGE STATUT
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span className="text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap flex items-center gap-1"
      style={{ color: cfg.color, background: cfg.bg }}>
      {status === 'DELIVERED' && <CheckCircle size={10} />}
      {status === 'CANCELLED' && <XCircle size={10} />}
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANT — STEPPER
// ─────────────────────────────────────────────

function OrderStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') return (
    <div className="flex items-center gap-2 mt-3">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: T.redL, border: `1.5px solid ${T.red}` }}>
        <XCircle size={11} style={{ color: T.red }} />
      </div>
      <span className="text-[11.5px] font-medium" style={{ color: T.red }}>Commande annulée</span>
    </div>
  );

  const currentOrder = STATUS_ORDER[status] ?? 1;

  return (
    <div className="flex items-start gap-0 mt-3">
      {STEPS.map((step, i) => {
        const stepOrder  = STATUS_ORDER[step.key] ?? i;
        const isDone     = stepOrder < currentOrder;
        const isCurrent  = step.key === status || (step.key === 'PENDING' && status === 'PENDING');
        const isFuture   = !isDone && !isCurrent;

        return (
          <div key={step.key} className="flex items-center">
            {/* Cercle */}
            <div className="flex flex-col items-center">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isDone   ? T.green
                    : isCurrent ? T.orange
                    : 'transparent',
                  border: isDone   ? `1.5px solid ${T.green}`
                    : isCurrent ? `1.5px solid ${T.orange}`
                    : `1.5px solid ${T.mutedL}`,
                }}
              >
                {isDone && <CheckCircle size={11} className="text-white" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                {isFuture && <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.mutedL }} />}
              </div>
              <span
                className="text-[9.5px] font-medium mt-1 whitespace-nowrap"
                style={{
                  color: isDone ? T.green : isCurrent ? T.orange : T.mutedL,
                  fontWeight: isCurrent ? 700 : 500,
                }}
              >
                {step.label}
              </span>
            </div>
            {/* Ligne connecteur */}
            {i < STEPS.length - 1 && (
              <div
                className="h-[1.5px] w-10 sm:w-14 mb-5 flex-shrink-0"
                style={{ background: isDone ? T.green : T.border }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANT — BOUTONS D'ACTION PAR STATUT
// ─────────────────────────────────────────────

interface ActionProps {
  order:      VendorOrder;
  onAdvance:  (order: VendorOrder, next: FulfillStatus) => Promise<void>;
  isUpdating: boolean;
}

function OrderActions({ order, onAdvance, isUpdating }: ActionProps) {
  const status = order.fulfillment_status as FulfillStatus;

  if (status === 'DELIVERED' || status === 'CANCELLED') {
    return (
      <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
        <Link to={`/seller/orders/${order.id}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
          style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
          <FileText size={13} />Détails
        </Link>
      </div>
    );
  }

  const spinner = <RefreshCw size={13} className="animate-spin" />;

  return (
    <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
      {/* PENDING → actions : Accepter, Préparer, Refuser */}
      {status === 'PENDING' && (
        <>
          <button
            onClick={() => onAdvance(order, 'PROCESSING')}
            disabled={isUpdating || !order.is_paid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
            style={{ background: T.green, boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
            title={!order.is_paid ? 'Paiement non confirmé' : undefined}>
            {isUpdating ? spinner : <CheckCircle size={13} />}
            Accepter
          </button>
          <button
            onClick={() => onAdvance(order, 'PROCESSING')}
            disabled={isUpdating || !order.is_paid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}>
            {isUpdating ? spinner : <Package size={13} />}
            Préparer
          </button>
          <button
            onClick={() => onAdvance(order, 'CANCELLED')}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)`, color: T.red }}>
            {isUpdating ? spinner : <XCircle size={13} />}
            Refuser
          </button>
        </>
      )}

      {/* PROCESSING → Prêt à expédier */}
      {status === 'PROCESSING' && (
        <button
          onClick={() => onAdvance(order, 'SHIPPED')}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
          {isUpdating ? spinner : <Truck size={13} />}
          Prêt à expédier
        </button>
      )}

      {/* SHIPPED → Expédier (marquer comme livré) */}
      {status === 'SHIPPED' && (
        <button
          onClick={() => onAdvance(order, 'DELIVERED')}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
          {isUpdating ? spinner : <PackageCheck size={13} />}
          Expédier
        </button>
      )}

      {/* Toujours : Détails */}
      <Link to={`/seller/orders/${order.id}`}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all ml-auto"
        style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
        <FileText size={13} />Détails
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────
// SOUS-COMPOSANT — CARD COMMANDE
// ─────────────────────────────────────────────

function OrderCard({
  order, onAdvance, isUpdating,
}: { order: VendorOrder; onAdvance: ActionProps['onAdvance']; isUpdating: boolean }) {
  const status  = order.fulfillment_status as FulfillStatus;
  const timer   = status === 'PENDING' ? computeTimer(order.created_at) : null;
  const hasDisp = Boolean((order as VendorOrder & { dispute?: unknown }).dispute);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>

      {/* ── Header carte ── */}
      <div className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {orderRef(order.id)}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
            {fmtDate(order.created_at)} · {order.city}
            {order.address && `, ${order.address}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasDisp && (
            <span className="flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2.5 py-1"
              style={{ color: T.amber, background: T.amberL }}>
              <AlertTriangle size={10} />Litige
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {/* ── Timer (commandes en attente) ── */}
      {timer && (
        <div className="flex items-center gap-2 px-5 py-2"
          style={{ background: 'rgba(22,163,74,0.06)', borderBottom: `1px solid rgba(22,163,74,0.12)` }}>
          <Clock size={13} style={{ color: T.green }} />
          <span className="text-[11.5px] font-semibold" style={{ color: T.green }}>
            {timer}
          </span>
        </div>
      )}

      {/* ── Produits ── */}
      <div className="px-5 py-4">
        {(order.items ?? []).slice(0, 3).map((item, i) => (
          <div key={item.id}
            className="flex items-center gap-3 py-2"
            style={i > 0 ? { borderTop: `1px solid ${T.creamAlt}` } : {}}>
            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: T.orangeL }}>
              {item.product_image
                ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                : <Package size={16} style={{ color: T.orange }} />}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] truncate" style={{ color: T.text }}>
                {item.product_title}
              </p>
              <p className="text-[11px]" style={{ color: T.muted }}>Qté : {item.qty}</p>
            </div>
            {/* Prix */}
            <p className="font-black text-[14px] flex-shrink-0" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              {fmtXAF(item.line_total_xaf)}
            </p>
          </div>
        ))}

        {/* S'il y a plus de 3 items */}
        {(order.items ?? []).length > 3 && (
          <p className="text-[11px] font-medium mt-2" style={{ color: T.muted }}>
            + {(order.items ?? []).length - 3} article{(order.items ?? []).length - 3 > 1 ? 's' : ''} de plus
          </p>
        )}

        {/* Stepper */}
        <OrderStepper status={status} />

        {/* Paiement non confirmé */}
        {!order.is_paid && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background: T.amberL }}>
            <AlertTriangle size={13} style={{ color: T.amber }} />
            <p className="text-[11.5px] font-semibold" style={{ color: T.amber }}>
              Paiement non encore confirmé
            </p>
          </div>
        )}

        {/* Boutons d'action */}
        <OrderActions order={order} onAdvance={onAdvance} isUpdating={isUpdating} />
      </div>

      {/* ── Footer total ── */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ background: T.cream, borderTop: `1px solid ${T.border}` }}>
        <p className="text-[11.5px] font-medium" style={{ color: T.muted }}>
          {order.customer_name}
          {order.customer_phone && ` · ${order.customer_phone}`}
        </p>
        <p className="font-black text-[15px]" style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
          {fmtXAF(order.vendor_total ?? order.total_xaf ?? 0)}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────

type TabFilter = 'all' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',        label: 'Toutes' },
  { key: 'PENDING',    label: 'En attente' },
  { key: 'PROCESSING', label: 'Préparation' },
  { key: 'SHIPPED',    label: 'Expédiées' },
  { key: 'DELIVERED',  label: 'Livrées' },
  { key: 'CANCELLED',  label: 'Annulées' },
];

export default function SellerOrdersPage() {
  const { showToast } = useToast();

  const [orders,     setOrders]     = useState<VendorOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<TabFilter>('all');
  const [search,     setSearch]     = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // ── Chargement ──
  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const filters: VendorOrderFilters = {};
      if (tab !== 'all') filters.fulfillment_status = tab as VendorOrder['fulfillment_status'];
      const data = await vendorsApi.getOrders(filters);
      setOrders(data);
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); setRefreshing(false); }
  }, [tab, showToast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Update statut fulfillment ──
  const handleAdvance = async (order: VendorOrder, next: FulfillStatus) => {
    try {
      setUpdatingId(order.id);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, {
        fulfillment_status: next,
      });
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      const label = STATUS_CFG[next]?.label ?? next;
      showToast(`Commande mise à jour : ${label}`, 'success');
    } catch {
      showToast('Erreur de mise à jour du statut', 'error');
    } finally { setUpdatingId(null); }
  };

  // ── Filtrage local par recherche ──
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      orderRef(o.id).toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_phone ?? '').includes(q) ||
      o.city.toLowerCase().includes(q) ||
      (o.items ?? []).some(i => i.product_title?.toLowerCase().includes(q))
    );
  });

  // ── Statistiques ──
  const stats = {
    pending:    orders.filter(o => o.fulfillment_status === 'PENDING').length,
    processing: orders.filter(o => o.fulfillment_status === 'PROCESSING').length,
    shipped:    orders.filter(o => o.fulfillment_status === 'SHIPPED').length,
    delivered:  orders.filter(o => o.fulfillment_status === 'DELIVERED').length,
    cancelled:  orders.filter(o => o.fulfillment_status === 'CANCELLED').length,
    caDelivered:orders.filter(o => o.fulfillment_status === 'DELIVERED')
      .reduce((acc, o) => acc + (o.vendor_total ?? 0), 0),
  };

  // Compteurs par tab (pour le badge)
  const tabCounts: Record<string, number> = {
    all:        orders.length,
    PENDING:    stats.pending,
    PROCESSING: stats.processing,
    SHIPPED:    stats.shipped,
    DELIVERED:  stats.delivered,
    CANCELLED:  stats.cancelled,
  };

  return (
    <div className="space-y-5">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            Commandes reçues
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {orders.length} commande{orders.length > 1 ? 's' : ''}
            {stats.pending > 0 && ` · ${stats.pending} en attente`}
            {stats.delivered > 0 && ` · ${stats.delivered} livrée${stats.delivered > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
            <Download size={13} />Exporter
          </button>
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all text-white"
            style={{ background: T.orange }}>
            <FileText size={13} />Factures
          </button>
          <button onClick={() => loadOrders(true)} disabled={refreshing}
            className="p-2 rounded-xl transition-all"
            style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══ 6 MÉTRIQUES ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'En attente',      value: stats.pending,    icon: Clock,        color: T.amber,  bg: T.amberL },
          { label: 'En préparation',  value: stats.processing, icon: Package,      color: T.blue,   bg: T.blueL  },
          { label: 'Expédiées',       value: stats.shipped,    icon: Truck,        color: T.violet, bg: T.violetL},
          { label: 'Livrées',         value: stats.delivered,  icon: PackageCheck, color: T.green,  bg: T.greenL },
          { label: 'Annulées',        value: stats.cancelled,  icon: XCircle,      color: T.red,    bg: T.redL   },
          {
            label: 'CA livré',
            value: null,
            rawValue: fmtXAF(stats.caDelivered),
            icon: ShoppingBag,
            color: T.orange,
            bg: T.orangeL,
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-2xl p-4"
              style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(28,18,9,0.05)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.bg }}>
                <Icon size={17} style={{ color: s.color }} />
              </div>
              <p className="text-[24px] font-black leading-none mb-1"
                style={{ color: s.color, fontFamily: 'Poppins,sans-serif' }}>
                {s.rawValue ?? s.value}
              </p>
              <p className="text-[11px] font-medium" style={{ color: T.muted }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ TABS + SEARCH ═══ */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(28,18,9,0.05)' }}>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide" style={{ borderBottom: `1px solid ${T.border}` }}>
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const count    = tabCounts[t.key] ?? 0;
            return (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all border-b-2"
                style={{
                  borderBottomColor: isActive ? T.orange : 'transparent',
                  color: isActive ? T.orange : T.muted,
                  background: isActive ? T.orangeL : 'transparent',
                }}>
                {t.label}
                {count > 0 && t.key !== 'all' && (
                  <span className="text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center text-white"
                    style={{ background: isActive ? T.orange : T.mutedL }}>
                    {count}
                  </span>
                )}
                {t.key === 'all' && (
                  <span className="text-[10px] font-semibold" style={{ color: T.mutedL }}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Barre de recherche */}
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher ID, acheteur, produit..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{
                background: T.cream,
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = T.orange; }}
              onBlur={e  => { e.currentTarget.style.borderColor = T.border; }}
            />
          </div>
        </div>
      </div>

      {/* ═══ LISTE DES COMMANDES ═══ */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl p-5 animate-pulse"
              style={{ background: T.white, border: `1px solid ${T.border}` }}>
              <div className="flex justify-between mb-3">
                <div className="h-4 w-24 rounded-lg" style={{ background: T.creamAlt }} />
                <div className="h-6 w-20 rounded-full" style={{ background: T.creamAlt }} />
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: T.creamAlt }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded-lg" style={{ background: T.creamAlt }} />
                  <div className="h-3 w-1/2 rounded-lg" style={{ background: T.creamAlt }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl py-16 text-center"
          style={{ background: T.white, border: `1px solid ${T.border}` }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.orangeL }}>
            <ShoppingBag size={24} style={{ color: T.orange }} />
          </div>
          <p className="font-semibold text-[15px] mb-1" style={{ color: T.text }}>
            {search ? 'Aucun résultat' : 'Aucune commande'}
          </p>
          <p className="text-[13px]" style={{ color: T.muted }}>
            {search
              ? `Aucune commande ne correspond à "${search}"`
              : tab === 'all'
              ? 'Vos commandes apparaîtront ici dès que des clients achèteront vos produits.'
              : `Aucune commande avec le statut "${TABS.find(t => t.key === tab)?.label}".`
            }
          </p>
          {search && (
            <button onClick={() => setSearch('')}
              className="mt-4 px-4 py-2 rounded-xl text-[12.5px] font-semibold"
              style={{ background: T.orangeL, color: T.orange }}>
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAdvance={handleAdvance}
              isUpdating={updatingId === order.id}
            />
          ))}

          {/* Footer résumé */}
          <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ background: T.creamAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[12px] font-medium" style={{ color: T.muted }}>
              {filtered.length} commande{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
              {search && ` · Recherche : "${search}"`}
            </p>
            <p className="text-[12px] font-bold" style={{ color: T.orange }}>
              Total : {fmtXAF(filtered.reduce((a, o) => a + (o.vendor_total ?? 0), 0))}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
