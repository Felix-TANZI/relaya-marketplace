// frontend/src/features/vendors/SellerOrdersPage.tsx
// Page commandes vendeur — fidèle maquette + export CSV + factures HTML imprimables.

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Search, RefreshCw, CheckCircle, Clock,
  Truck, PackageCheck, XCircle, Package, FileText,
  Download, AlertTriangle,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorOrder,
  type VendorOrderFilters,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { exportOrdersCSV, openInvoice, fmtXAF, fmtDate, orderRef } from './orderUtils';

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
// CONFIG STATUTS
// ─────────────────────────────────────────────
type FulfillStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const STEPS: { key: string; label: string }[] = [
  { key: 'RECEIVED',   label: 'Reçue' },
  { key: 'PENDING',    label: 'Confirmée' },
  { key: 'PROCESSING', label: 'Préparation' },
  { key: 'SHIPPED',    label: 'Prête' },
  { key: 'DELIVERED',  label: 'Livrée' },
];

const STATUS_ORDER: Record<string, number> = {
  RECEIVED: 0, PENDING: 1, PROCESSING: 2, SHIPPED: 3, DELIVERED: 4, CANCELLED: -1,
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Confirmée',    color: T.amber,  bg: T.amberL  },
  PROCESSING: { label: 'Préparation',  color: T.blue,   bg: T.blueL   },
  SHIPPED:    { label: 'Prête',        color: T.violet, bg: T.violetL },
  DELIVERED:  { label: 'Livrée',       color: T.green,  bg: T.greenL  },
  CANCELLED:  { label: 'Annulée',      color: T.red,    bg: T.redL    },
};

// ─────────────────────────────────────────────
// HOOK — shop name
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}>
      {status === 'DELIVERED' && <CheckCircle size={10} />}
      {status === 'CANCELLED' && <XCircle size={10} />}
      {cfg.label}
    </span>
  );
}

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
    <div className="flex items-start gap-0 mt-3 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const stepOrder = STATUS_ORDER[step.key] ?? i;
        const isDone    = stepOrder < currentOrder;
        const isCurrent = step.key === status;
        const isFuture  = !isDone && !isCurrent;

        return (
          <div key={step.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDone ? T.green : isCurrent ? T.orange : 'transparent',
                  border: isDone ? `1.5px solid ${T.green}`
                    : isCurrent ? `1.5px solid ${T.orange}`
                    : `1.5px solid ${T.mutedL}`,
                }}>
                {isDone    && <CheckCircle size={11} className="text-white" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                {isFuture  && <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.mutedL }} />}
              </div>
              <span className="text-[9.5px] font-medium mt-1 whitespace-nowrap"
                style={{ color: isDone ? T.green : isCurrent ? T.orange : T.mutedL, fontWeight: isCurrent ? 700 : 500 }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-[1.5px] w-10 sm:w-14 mb-5 flex-shrink-0"
                style={{ background: isDone ? T.green : T.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ActionProps {
  order:     VendorOrder;
  onAdvance: (order: VendorOrder, next: FulfillStatus) => Promise<void>;
  onInvoice: (order: VendorOrder) => void;
  isUpdating:boolean;
}

function OrderActions({ order, onAdvance, onInvoice, isUpdating }: ActionProps) {
  const status  = order.fulfillment_status as FulfillStatus;
  const spinner = <RefreshCw size={13} className="animate-spin" />;

  const btnDetails = (
    <Link to={`/seller/orders/${order.id}`}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
      <FileText size={13} />Détails
    </Link>
  );

  const btnInvoice = (
    <button onClick={() => onInvoice(order)}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
      style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
      <FileText size={13} />Facture
    </button>
  );

  if (status === 'DELIVERED' || status === 'CANCELLED') {
    return (
      <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
        {btnDetails}
        {btnInvoice}
      </div>
    );
  }

  return (
    <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
      {status === 'PENDING' && (
        <>
          <button onClick={() => onAdvance(order, 'PROCESSING')}
            disabled={isUpdating || !order.is_paid}
            title={!order.is_paid ? 'Paiement non confirmé' : undefined}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
            style={{ background: T.green, boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
            {isUpdating ? spinner : <CheckCircle size={13} />}Accepter
          </button>
          <button onClick={() => onAdvance(order, 'PROCESSING')}
            disabled={isUpdating || !order.is_paid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text }}>
            {isUpdating ? spinner : <Package size={13} />}Préparer
          </button>
          <button onClick={() => onAdvance(order, 'CANCELLED')}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all"
            style={{ background: T.redL, border: `1px solid rgba(220,38,38,0.2)`, color: T.red }}>
            {isUpdating ? spinner : <XCircle size={13} />}Refuser
          </button>
        </>
      )}
      {status === 'PROCESSING' && (
        <button onClick={() => onAdvance(order, 'SHIPPED')}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
          {isUpdating ? spinner : <Truck size={13} />}Prêt à expédier
        </button>
      )}
      {status === 'SHIPPED' && (
        <button onClick={() => onAdvance(order, 'DELIVERED')}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
          style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.3)` }}>
          {isUpdating ? spinner : <PackageCheck size={13} />}Expédier
        </button>
      )}
      <div className="flex gap-2 ml-auto">
        {btnDetails}
        {btnInvoice}
      </div>
    </div>
  );
}

// Hook timer — conforme aux règles react-hooks/purity et set-state-in-effect.
// Date.now() et setTimer sont appelés UNIQUEMENT dans des callbacks asynchrones,
// jamais de façon synchrone pendant le rendu ou dans le corps d'un effect.
function useOrderTimer(createdAt: string, isPending: boolean): string | null {
  const [timer, setTimer] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) return;

    const deadline = new Date(createdAt).getTime() + 72 * 3600000;

    // tick est un callback asynchrone — ne s'exécute jamais pendant le rendu
    const tick = () => {
      const diff = deadline - Date.now();
      setTimer(
        diff <= 0
          ? null
          : `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}min restantes`
      );
    };

    // setTimeout(0) : différé hors du corps synchrone de l'effect
    const initId = setTimeout(tick, 0);
    // Rafraîchissement toutes les 60 secondes
    const loopId = setInterval(tick, 60_000);

    return () => { clearTimeout(initId); clearInterval(loopId); };
  }, [isPending, createdAt]);

  return isPending ? timer : null;
}

function OrderCard({ order, onAdvance, onInvoice, isUpdating }: {
  order: VendorOrder;
  onAdvance: ActionProps['onAdvance'];
  onInvoice: (o: VendorOrder) => void;
  isUpdating: boolean;
}) {
  const status = order.fulfillment_status as FulfillStatus;
  const timer  = useOrderTimer(order.created_at, status === 'PENDING');

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 4px rgba(28,18,9,0.06)' }}>

      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4"
        style={{ borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="font-black text-[15px]" style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
            {orderRef(order.id)}
          </p>
          <p className="text-[11.5px] mt-0.5" style={{ color: T.muted }}>
            {fmtDate(order.created_at)} · {order.city}{order.address ? `, ${order.address}` : ''}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Timer */}
      {timer && (
        <div className="flex items-center gap-2 px-5 py-2"
          style={{ background: 'rgba(22,163,74,0.06)', borderBottom: `1px solid rgba(22,163,74,0.12)` }}>
          <Clock size={13} style={{ color: T.green }} />
          <span className="text-[11.5px] font-semibold" style={{ color: T.green }}>{timer}</span>
        </div>
      )}

      {/* Produits */}
      <div className="px-5 py-4">
        {(order.items ?? []).slice(0, 3).map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 py-2"
            style={i > 0 ? { borderTop: `1px solid ${T.creamAlt}` } : {}}>
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: T.orangeL }}>
              {item.product_image
                ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                : <Package size={16} style={{ color: T.orange }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[13px] truncate" style={{ color: T.text }}>{item.product_title}</p>
              <p className="text-[11px]" style={{ color: T.muted }}>Qté : {item.qty}</p>
            </div>
            <p className="font-black text-[14px] flex-shrink-0"
              style={{ color: T.text, fontFamily: 'Poppins,sans-serif' }}>
              {fmtXAF(item.line_total_xaf)}
            </p>
          </div>
        ))}
        {(order.items ?? []).length > 3 && (
          <p className="text-[11px] mt-2" style={{ color: T.muted }}>
            + {(order.items ?? []).length - 3} article{(order.items ?? []).length - 3 > 1 ? 's' : ''} de plus
          </p>
        )}

        <OrderStepper status={status} />

        {!order.is_paid && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl"
            style={{ background: T.amberL }}>
            <AlertTriangle size={13} style={{ color: T.amber }} />
            <p className="text-[11.5px] font-semibold" style={{ color: T.amber }}>
              Paiement non encore confirmé
            </p>
          </div>
        )}

        <OrderActions order={order} onAdvance={onAdvance} onInvoice={onInvoice} isUpdating={isUpdating} />
      </div>

      {/* Footer total */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ background: T.cream, borderTop: `1px solid ${T.border}` }}>
        <p className="text-[11.5px] font-medium" style={{ color: T.muted }}>
          {order.customer_name}{order.customer_phone ? ` · ${order.customer_phone}` : ''}
        </p>
        <p className="font-black text-[15px]"
          style={{ color: T.orange, fontFamily: 'Poppins,sans-serif' }}>
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
  { key: 'all',        label: 'Toutes'      },
  { key: 'PENDING',    label: 'En attente'  },
  { key: 'PROCESSING', label: 'Préparation' },
  { key: 'SHIPPED',    label: 'Expédiées'   },
  { key: 'DELIVERED',  label: 'Livrées'     },
  { key: 'CANCELLED',  label: 'Annulées'    },
];

export default function SellerOrdersPage() {
  const { showToast } = useToast();
  const shopName = useShopName();

  const [orders,     setOrders]     = useState<VendorOrder[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<TabFilter>('all');
  const [search,     setSearch]     = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const filters: VendorOrderFilters = {};
      if (tab !== 'all') filters.fulfillment_status = tab as VendorOrder['fulfillment_status'];
      setOrders(await vendorsApi.getOrders(filters));
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally { setLoading(false); setRefreshing(false); }
  }, [tab, showToast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleAdvance = async (order: VendorOrder, next: FulfillStatus) => {
    try {
      setUpdatingId(order.id);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, { fulfillment_status: next });
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      showToast(`Commande mise à jour : ${STATUS_CFG[next]?.label ?? next}`, 'success');
    } catch {
      showToast('Erreur de mise à jour', 'error');
    } finally { setUpdatingId(null); }
  };

  const handleInvoiceOne = (order: VendorOrder) => openInvoice([order], shopName);

  const handleExportAll = () => {
    if (filtered.length === 0) { showToast('Aucune commande à exporter', 'error'); return; }
    exportOrdersCSV(filtered, shopName);
    showToast(`${filtered.length} commandes exportées en CSV`, 'success');
  };

  const handleInvoiceAll = () => {
    if (filtered.length === 0) { showToast('Aucune commande à facturer', 'error'); return; }
    openInvoice(filtered, shopName);
  };

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

  const stats = {
    pending:    orders.filter(o => o.fulfillment_status === 'PENDING').length,
    processing: orders.filter(o => o.fulfillment_status === 'PROCESSING').length,
    shipped:    orders.filter(o => o.fulfillment_status === 'SHIPPED').length,
    delivered:  orders.filter(o => o.fulfillment_status === 'DELIVERED').length,
    cancelled:  orders.filter(o => o.fulfillment_status === 'CANCELLED').length,
    caDelivered:orders.filter(o => o.fulfillment_status === 'DELIVERED')
      .reduce((acc, o) => acc + (o.vendor_total ?? 0), 0),
  };

  const tabCounts: Record<string, number> = {
    all: orders.length, PENDING: stats.pending, PROCESSING: stats.processing,
    SHIPPED: stats.shipped, DELIVERED: stats.delivered, CANCELLED: stats.cancelled,
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
            {stats.pending > 0    && ` · ${stats.pending} en attente`}
            {stats.delivered > 0  && ` · ${stats.delivered} livrée${stats.delivered > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Exporter CSV */}
          <button onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:-translate-y-px"
            style={{ background: T.white, border: `1px solid ${T.border}`, color: T.muted,
              boxShadow: '0 1px 3px rgba(28,18,9,0.06)' }}
            title="Télécharger la liste en CSV">
            <Download size={13} />Exporter
          </button>

          {/* Toutes les factures */}
          <button onClick={handleInvoiceAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all hover:-translate-y-px"
            style={{ background: T.orange, boxShadow: `0 2px 8px rgba(244,121,32,0.35)` }}
            title="Générer et imprimer toutes les factures">
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
          { label: 'En attente',     value: stats.pending,    icon: Clock,        color: T.amber,  bg: T.amberL  },
          { label: 'En préparation', value: stats.processing, icon: Package,      color: T.blue,   bg: T.blueL   },
          { label: 'Expédiées',      value: stats.shipped,    icon: Truck,        color: T.violet, bg: T.violetL },
          { label: 'Livrées',        value: stats.delivered,  icon: PackageCheck, color: T.green,  bg: T.greenL  },
          { label: 'Annulées',       value: stats.cancelled,  icon: XCircle,      color: T.red,    bg: T.redL    },
          { label: 'CA livré',       value: null, rawValue: fmtXAF(stats.caDelivered), icon: ShoppingBag, color: T.orange, bg: T.orangeL },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-2xl p-4"
              style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(28,18,9,0.05)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.bg }}>
                <Icon size={17} style={{ color: s.color }} />
              </div>
              <p className="text-[22px] font-black leading-none mb-1"
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
        <div className="flex overflow-x-auto scrollbar-hide" style={{ borderBottom: `1px solid ${T.border}` }}>
          {TABS.map((t) => {
            const isActive = tab === t.key;
            const count    = tabCounts[t.key] ?? 0;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-[12.5px] font-semibold whitespace-nowrap flex-shrink-0 transition-all border-b-2"
                style={{
                  borderBottomColor: isActive ? T.orange : 'transparent',
                  color: isActive ? T.orange : T.muted,
                  background: isActive ? T.orangeL : 'transparent',
                }}>
                {t.label}
                {t.key !== 'all' && count > 0 && (
                  <span className="text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center text-white"
                    style={{ background: isActive ? T.orange : T.mutedL }}>{count}</span>
                )}
                {t.key === 'all' && (
                  <span className="text-[10px] font-medium" style={{ color: T.mutedL }}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher ID, acheteur, produit..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'inherit' }}
              onFocus={e => { e.currentTarget.style.borderColor = T.orange; }}
              onBlur={e  => { e.currentTarget.style.borderColor = T.border;  }} />
          </div>
        </div>
      </div>

      {/* ═══ LISTE ═══ */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl p-5 space-y-3 animate-pulse"
              style={{ background: T.white, border: `1px solid ${T.border}` }}>
              <div className="flex justify-between">
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
          <p className="text-[13px] max-w-xs mx-auto" style={{ color: T.muted }}>
            {search
              ? `Aucune commande ne correspond à "${search}"`
              : tab === 'all'
              ? 'Vos commandes apparaîtront ici dès que des clients achèteront vos produits.'
              : `Aucune commande avec le statut "${TABS.find(t => t.key === tab)?.label}".`}
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
            <OrderCard key={order.id} order={order}
              onAdvance={handleAdvance}
              onInvoice={handleInvoiceOne}
              isUpdating={updatingId === order.id} />
          ))}
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