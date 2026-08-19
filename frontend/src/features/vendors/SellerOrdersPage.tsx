// frontend/src/features/vendors/SellerOrdersPage.tsx
// Commandes reçues — espace vendeur BelivaY.
// L'identité de l'acheteur n'est jamais affichée : ville, contenu et contact de livraison suffisent.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Download, FileText, Lock, Package,
  PackageCheck, RefreshCw, Search, ShieldCheck, ShoppingBag, Truck, XCircle,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorOrder,
  type VendorOrderFilters,
  type FulfillmentStatus,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { exportOrdersCSV, openInvoice, fmtXAF, fmtDate, orderRef } from './orderUtils';
import {
  T, card, nf, ESCROW, type EscrowKey,
  VendorStyles, PageHead, GhostBtn, Badge, Note,
} from './vendorTheme';

const STEPS = [
  { key: 'PAID_IN_ESCROW',      label: 'Payée' },
  { key: 'VENDOR_ACKNOWLEDGED', label: 'Confirmée' },
  { key: 'PREPARING',           label: 'Préparation' },
  { key: 'READY_FOR_PICKUP',    label: 'Prête' },
  { key: 'DELIVERED',           label: 'Livrée' },
];

const STATUS_ORDER: Record<string, number> = {
  CREATED: 0, PAID_IN_ESCROW: 1, VENDOR_ACKNOWLEDGED: 2, PREPARING: 3,
  READY_FOR_PICKUP: 4, DELIVERED: 5, CANCELLED: -1, DISPUTED: -1, REFUNDED: -1,
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  CREATED:             { label: 'Reçue',            color: T.muted,  bg: T.creamAlt },
  PAID_IN_ESCROW:      { label: 'À confirmer',      color: T.amber,  bg: T.amberL   },
  VENDOR_ACKNOWLEDGED: { label: 'Confirmée',        color: T.blue,   bg: T.blueL    },
  PREPARING:           { label: 'En préparation',   color: T.blue,   bg: T.blueL    },
  READY_FOR_PICKUP:    { label: 'Prête',            color: T.violet, bg: T.violetL  },
  DRIVER_ASSIGNED:     { label: 'Livreur assigné',  color: T.blue,   bg: T.blueL    },
  PICKED_UP:           { label: 'Pris en charge',   color: T.blue,   bg: T.blueL    },
  OUT_FOR_DELIVERY:    { label: 'En livraison',     color: T.blue,   bg: T.blueL    },
  DELIVERED:           { label: 'Livrée',           color: T.green,  bg: T.greenL   },
  BUYER_CONFIRMED:     { label: 'Reçue · Confirmée', color: T.green, bg: T.greenL   },
  AUTO_CONFIRMED:      { label: 'Confirmée auto',   color: T.green,  bg: T.greenL   },
  RELEASED_TO_VENDOR:  { label: 'Fonds libérés',    color: T.green,  bg: T.greenL   },
  DISPUTED:            { label: 'Litige',           color: T.red,    bg: T.redL     },
  CANCELLED:           { label: 'Annulée',          color: T.red,    bg: T.redL     },
  REFUNDED:            { label: 'Remboursée',       color: T.blue,   bg: T.blueL    },
};

type TabFilter = 'all' | 'PAID_IN_ESCROW' | 'PREPARING' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all',              label: 'Toutes' },
  { key: 'PAID_IN_ESCROW',   label: 'À confirmer' },
  { key: 'PREPARING',        label: 'En préparation' },
  { key: 'READY_FOR_PICKUP', label: 'Prêtes' },
  { key: 'DELIVERED',        label: 'Livrées' },
  { key: 'CANCELLED',        label: 'Annulées' },
  { key: 'DISPUTED',         label: 'Litiges' },
];

function useShopName(): string {
  const [name, setName] = useState('Ma Boutique');
  useEffect(() => {
    vendorsApi.getProfile().then(p => setName(p.business_name)).catch(() => null);
  }, []);
  return name;
}

/** Minuterie 72 h — Date.now() jamais appelé pendant le rendu. */
function useOrderTimer(createdAt: string, isPending: boolean): string | null {
  const [timer, setTimer] = useState<string | null>(null);
  useEffect(() => {
    if (!isPending) return;
    const deadline = new Date(createdAt).getTime() + 72 * 3600000;
    const tick = () => {
      const diff = deadline - Date.now();
      setTimer(diff <= 0 ? null
        : `${Math.floor(diff / 3600000)} h ${Math.floor((diff % 3600000) / 60000)} min restantes`);
    };
    const initId = setTimeout(tick, 0);
    const loopId = setInterval(tick, 60_000);
    return () => { clearTimeout(initId); clearInterval(loopId); };
  }, [isPending, createdAt]);
  return isPending ? timer : null;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return null;
  return (
    <span className="inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap"
      style={{ fontSize: 11, padding: '5px 11px', color: cfg.color, background: cfg.bg }}>
      {status === 'DELIVERED' && <CheckCircle size={10} />}
      {status === 'CANCELLED' && <XCircle size={10} />}
      {cfg.label}
    </span>
  );
}

function Stepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 mt-3">
        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: T.redL, border: `1.5px solid ${T.red}` }}>
          <XCircle size={11} style={{ color: T.red }} />
        </span>
        <span className="font-medium" style={{ fontSize: 11.5, color: T.red }}>Commande annulée</span>
      </div>
    );
  }
  const cur = STATUS_ORDER[status] ?? 1;
  return (
    <div className="flex items-start mt-3 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const ord = STATUS_ORDER[s.key] ?? i;
        const done = ord < cur;
        const now = s.key === status;
        return (
          <div key={s.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? T.green : now ? T.orange : 'transparent',
                  border: `1.5px solid ${done ? T.green : now ? T.orange : T.mutedL}`,
                }}>
                {done ? <CheckCircle size={11} className="text-white" />
                  : now ? <span className="rounded-full bg-white" style={{ width: 8, height: 8 }} />
                  : <span className="rounded-full" style={{ width: 6, height: 6, background: T.mutedL }} />}
              </span>
              <span className="mt-1 whitespace-nowrap"
                style={{ fontSize: 9.5, fontWeight: now ? 700 : 500, color: done ? T.green : now ? T.orange : T.mutedL }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="flex-shrink-0"
                style={{ height: 1.5, width: 44, marginBottom: 20, background: done ? T.green : T.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Actions({ order, onAdvance, onInvoice, updating }: {
  order: VendorOrder;
  onAdvance: (o: VendorOrder, next: FulfillmentStatus) => Promise<void>;
  onInvoice: (o: VendorOrder) => void;
  updating: boolean;
}) {
  const status = order.fulfillment_status as FulfillmentStatus;
  const spin = <RefreshCw size={13} className="animate-spin" />;
  const ghost = { padding: '9px 15px', fontSize: 12.5, background: T.cream, border: `1px solid ${T.border}`, color: T.muted };

  const details = (
    <Link to={`/seller/orders/${order.id}`}
      className="flex items-center gap-1.5 rounded-xl font-semibold transition-all" style={ghost}>
      <FileText size={13} />Détails
    </Link>
  );
  const invoice = (
    <button type="button" onClick={() => onInvoice(order)}
      className="flex items-center gap-1.5 rounded-xl font-semibold transition-all" style={ghost}>
      <FileText size={13} />Facture
    </button>
  );

  const terminal = ['DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR', 'CANCELLED', 'REFUNDED', 'DISPUTED'];
  const waiting = ['READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'];

  if (terminal.includes(status)) {
    return <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>{details}{invoice}</div>;
  }
  if (waiting.includes(status)) {
    return (
      <div className="flex gap-2 mt-4 pt-4 flex-wrap items-center" style={{ borderTop: `1px solid ${T.border}` }}>
        <span className="flex items-center gap-1.5 font-medium" style={{ fontSize: 11.5, color: T.muted }}>
          <Truck size={13} />En attente du livreur
        </span>
        <span className="ml-auto flex gap-2">{details}{invoice}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mt-4 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
      {status === 'PAID_IN_ESCROW' && (
        <>
          <button type="button" onClick={() => onAdvance(order, 'VENDOR_ACKNOWLEDGED')}
            disabled={updating || !order.is_paid}
            title={!order.is_paid ? 'Paiement non confirmé' : undefined}
            className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
            style={{ padding: '9px 16px', fontSize: 12.5, background: T.green, boxShadow: '0 8px 18px -8px rgba(22,163,74,.7)' }}>
            {updating ? spin : <CheckCircle size={13} />}Accepter
          </button>
          <button type="button" onClick={() => onAdvance(order, 'CANCELLED')} disabled={updating}
            className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
            style={{ padding: '9px 15px', fontSize: 12.5, background: T.redL, border: `1px solid ${T.redB}`, color: T.red }}>
            {updating ? spin : <XCircle size={13} />}Refuser
          </button>
        </>
      )}
      {status === 'VENDOR_ACKNOWLEDGED' && (
        <button type="button" onClick={() => onAdvance(order, 'PREPARING')} disabled={updating}
          className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
          style={{ padding: '9px 16px', fontSize: 12.5, background: T.blue, boxShadow: '0 8px 18px -8px rgba(37,99,235,.7)' }}>
          {updating ? spin : <Package size={13} />}Commencer la préparation
        </button>
      )}
      {status === 'PREPARING' && (
        <button type="button" onClick={() => onAdvance(order, 'READY_FOR_PICKUP')} disabled={updating}
          className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
          style={{ padding: '9px 16px', fontSize: 12.5, background: T.orange, boxShadow: '0 8px 18px -8px rgba(244,121,32,.8)' }}>
          {updating ? spin : <Truck size={13} />}Prêt à expédier
        </button>
      )}
      <span className="flex gap-2 ml-auto">{details}{invoice}</span>
    </div>
  );
}

function OrderCard({ order, onAdvance, onInvoice, updating }: {
  order: VendorOrder;
  onAdvance: (o: VendorOrder, next: FulfillmentStatus) => Promise<void>;
  onInvoice: (o: VendorOrder) => void;
  updating: boolean;
}) {
  const status = order.fulfillment_status as FulfillmentStatus;
  const timer = useOrderTimer(order.created_at, status === 'PAID_IN_ESCROW');
  const items = order.items ?? [];
  const escrow = ESCROW[order.escrow_status as EscrowKey] ?? ESCROW.PENDING;

  return (
    <div className="rounded-2xl overflow-hidden v-row" style={card}>
      {/* En-tête : référence + lieu, jamais d'identité acheteur */}
      <div className="flex items-start justify-between gap-3 flex-wrap"
        style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
        <div>
          <p className="font-black" style={{ fontSize: 15, color: T.text }}>{orderRef(order.id)}</p>
          <p className="mt-0.5" style={{ fontSize: 11.5, color: T.muted }}>
            {fmtDate(order.created_at)} · {order.city}
            {items.length > 0 && ` · ${items.length} article${items.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge label={escrow.label} color={escrow.color} bg={escrow.bg} />
          <StatusBadge status={status} />
        </div>
      </div>

      {timer && (
        <div className="flex items-center gap-2"
          style={{ padding: '9px 20px', background: 'rgba(22,163,74,.06)', borderBottom: '1px solid rgba(22,163,74,.12)' }}>
          <Clock size={13} style={{ color: T.green }} />
          <span className="font-semibold" style={{ fontSize: 11.5, color: T.green }}>{timer}</span>
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>
        {items.slice(0, 3).map((item, i) => (
          <div key={item.id} className="flex items-center gap-3"
            style={{ padding: '8px 0', borderTop: i > 0 ? `1px solid ${T.borderL}` : undefined }}>
            <span className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: T.orangeL }}>
              {item.product_image
                ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                : <Package size={16} style={{ color: T.orange }} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold v-cell" style={{ fontSize: 13, color: T.text }}>{item.product_title}</p>
              <p style={{ fontSize: 11, color: T.muted }}>Qté : {item.qty}</p>
            </div>
            <p className="font-black flex-shrink-0" style={{ fontSize: 14, color: T.text }}>
              {fmtXAF(item.line_total_xaf)}
            </p>
          </div>
        ))}
        {items.length > 3 && (
          <p className="mt-2" style={{ fontSize: 11, color: T.muted }}>
            + {items.length - 3} article{items.length - 3 > 1 ? 's' : ''} de plus
          </p>
        )}

        <Stepper status={status} />

        {!order.is_paid && (
          <div className="flex items-center gap-2 mt-3 rounded-xl"
            style={{ padding: '9px 13px', background: T.amberL, border: `1px solid ${T.amberB}` }}>
            <AlertTriangle size={13} style={{ color: T.amber, flexShrink: 0 }} />
            <p className="font-semibold" style={{ fontSize: 11.5, color: T.amber }}>
              Paiement non encore confirmé — vous ne pouvez pas traiter cette commande
            </p>
          </div>
        )}

        <Actions order={order} onAdvance={onAdvance} onInvoice={onInvoice} updating={updating} />
      </div>

      {/* Pied : l'argent, pas l'acheteur */}
      <div className="flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: '12px 20px', background: T.cream, borderTop: `1px solid ${T.border}` }}>
        <p className="flex items-center gap-1.5 font-medium flex-wrap" style={{ fontSize: 11.5, color: T.muted }}>
          <Lock size={12} style={{ color: escrow.color }} />
          Brut {fmtXAF(order.vendor_subtotal)} · commission {order.commission_rate.toFixed(1)} %
          <span style={{ color: T.red }}>− {nf(order.commission_amount)}</span>
        </p>
        <p className="font-black" style={{ fontSize: 15, color: T.orange }}>
          {fmtXAF(order.vendor_net_amount ?? 0)}
        </p>
      </div>
    </div>
  );
}

export default function SellerOrdersPage() {
  const { showToast } = useToast();
  const shopName = useShopName();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const filters: VendorOrderFilters = {};
      if (tab !== 'all') filters.fulfillment_status = tab as VendorOrder['fulfillment_status'];
      setOrders(await vendorsApi.getOrders(filters));
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, showToast]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleAdvance = async (order: VendorOrder, next: FulfillmentStatus) => {
    try {
      setUpdatingId(order.id);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, { fulfillment_status: next });
      setOrders(prev => prev.map(o => (o.id === order.id ? updated : o)));
      showToast(`Commande mise à jour : ${STATUS_CFG[next]?.label ?? next}`, 'success');
    } catch {
      showToast('Erreur de mise à jour', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Recherche sur référence, ville et produits — plus sur l'acheteur
  const filtered = useMemo(() => orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      orderRef(o.id).toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      (o.items ?? []).some(i => i.product_title?.toLowerCase().includes(q))
    );
  }), [orders, search]);

  const stats = useMemo(() => ({
    pending:     orders.filter(o => o.fulfillment_status === 'PAID_IN_ESCROW').length,
    processing:  orders.filter(o => o.fulfillment_status === 'PREPARING').length,
    shipped:     orders.filter(o => o.fulfillment_status === 'READY_FOR_PICKUP').length,
    delivered:   orders.filter(o => o.fulfillment_status === 'DELIVERED').length,
    cancelled:   orders.filter(o => o.fulfillment_status === 'CANCELLED').length,
    caDelivered: orders.filter(o => o.fulfillment_status === 'DELIVERED')
      .reduce((a, o) => a + (o.vendor_net_amount ?? 0), 0),
    inEscrow: orders.filter(o => o.escrow_status === 'BLOCKED' || o.escrow_status === 'RELEASE_PENDING')
      .reduce((a, o) => a + (o.vendor_net_amount ?? 0), 0),
  }), [orders]);

  const counts: Record<string, number> = {
    all: orders.length, PAID_IN_ESCROW: stats.pending, PREPARING: stats.processing,
    READY_FOR_PICKUP: stats.shipped, DELIVERED: stats.delivered, CANCELLED: stats.cancelled,
  };

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <PageHead
        kicker="Commandes" title="Commandes reçues"
        subtitle={
          `${orders.length} commande${orders.length > 1 ? 's' : ''}` +
          (stats.pending > 0 ? ` · ${stats.pending} en attente` : '') +
          (stats.inEscrow > 0 ? ` · ${nf(stats.inEscrow)} FCFA en escrow` : '')
        }
        actions={
          <>
            <GhostBtn icon={<Download size={13} />}
              onClick={() => {
                if (filtered.length === 0) { showToast('Aucune commande à exporter', 'error'); return; }
                exportOrdersCSV(filtered, shopName);
                showToast(`${filtered.length} commandes exportées en CSV`, 'success');
              }}>
              Exporter
            </GhostBtn>
            <button type="button"
              onClick={() => {
                if (filtered.length === 0) { showToast('Aucune commande à facturer', 'error'); return; }
                openInvoice(filtered, shopName);
              }}
              className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
              style={{ padding: '9px 14px', fontSize: 12, background: T.orange, boxShadow: '0 8px 18px -8px rgba(244,121,32,.8)' }}>
              <FileText size={13} />Factures
            </button>
            <button type="button" onClick={() => loadOrders(true)} disabled={refreshing}
              className="rounded-xl transition-all"
              style={{ padding: 9, background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </>
        }
      />

      {/* ═══ 6 MÉTRIQUES ═══ */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(148px,1fr))' }}>
        {[
          { label: 'En attente',     value: String(stats.pending),     icon: Clock,        color: T.amber,  bg: T.amberL  },
          { label: 'En préparation', value: String(stats.processing),  icon: Package,      color: T.blue,   bg: T.blueL   },
          { label: 'Expédiées',      value: String(stats.shipped),     icon: Truck,        color: T.violet, bg: T.violetL },
          { label: 'Livrées',        value: String(stats.delivered),   icon: PackageCheck, color: T.green,  bg: T.greenL  },
          { label: 'Annulées',       value: String(stats.cancelled),   icon: XCircle,      color: T.red,    bg: T.redL    },
          { label: 'CA livré',       value: fmtXAF(stats.caDelivered), icon: ShoppingBag,  color: T.orange, bg: T.orangeL },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4" style={card}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.bg }}><Icon size={17} style={{ color: s.color }} /></span>
              <p className="font-black leading-none mb-1" style={{ fontSize: 21, color: s.color }}>{s.value}</p>
              <p className="font-medium" style={{ fontSize: 11, color: T.muted }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ═══ ONGLETS + RECHERCHE ═══ */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="flex overflow-x-auto" style={{ borderBottom: `1px solid ${T.border}` }}>
          {TABS.map(t => {
            const on = tab === t.key;
            const n = counts[t.key] ?? 0;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  padding: '13px 16px', fontSize: 12.5,
                  borderBottom: `2px solid ${on ? T.orange : 'transparent'}`,
                  color: on ? T.orange : T.muted,
                  background: on ? T.orangeL : 'transparent',
                }}>
                {t.label}
                {t.key !== 'all' && n > 0 && (
                  <span className="font-black rounded-full flex items-center justify-center text-white"
                    style={{ fontSize: 10, width: 16, height: 16, background: on ? T.orange : T.mutedL }}>{n}</span>
                )}
                {t.key === 'all' && <span className="font-medium" style={{ fontSize: 10, color: T.mutedL }}>({n})</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: 12 }}>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.mutedL }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une référence, une ville ou un produit…"
              className="w-full rounded-xl outline-none"
              style={{ padding: '10px 12px 10px 36px', fontSize: 13, background: T.cream, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'inherit' }}
              onFocus={e => { e.currentTarget.style.borderColor = T.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border; }} />
          </div>
        </div>
      </div>

      <Note icon={<ShieldCheck size={15} />}>
        L'identité de l'acheteur n'apparaît pas dans cette liste. La ville, le contenu de la commande et le contact
        de livraison — disponible dans le détail — couvrent tout ce que la préparation demande.
      </Note>

      {/* ═══ LISTE ═══ */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl p-5 space-y-3 animate-pulse" style={card}>
              <div className="flex justify-between">
                <div className="rounded-lg" style={{ height: 16, width: 96, background: T.creamAlt }} />
                <div className="rounded-full" style={{ height: 24, width: 80, background: T.creamAlt }} />
              </div>
              <div className="flex gap-3">
                <div className="rounded-xl" style={{ width: 40, height: 40, background: T.creamAlt }} />
                <div className="flex-1 space-y-2">
                  <div className="rounded-lg" style={{ height: 12, width: '75%', background: T.creamAlt }} />
                  <div className="rounded-lg" style={{ height: 12, width: '50%', background: T.creamAlt }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl text-center" style={{ ...card, padding: '60px 20px' }}>
          <span className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: T.orangeL }}><ShoppingBag size={24} style={{ color: T.orange }} /></span>
          <p className="font-semibold mb-1" style={{ fontSize: 15, color: T.text }}>
            {search ? 'Aucun résultat' : 'Aucune commande'}
          </p>
          <p className="mx-auto" style={{ fontSize: 13, color: T.muted, maxWidth: 320 }}>
            {search
              ? `Aucune commande ne correspond à « ${search} »`
              : tab === 'all'
                ? 'Vos commandes apparaîtront ici dès que des clients achèteront vos produits.'
                : `Aucune commande avec le statut « ${TABS.find(t => t.key === tab)?.label} ».`}
          </p>
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="mt-4 rounded-xl font-semibold"
              style={{ padding: '9px 16px', fontSize: 12.5, background: T.orangeL, color: T.orange }}>
              Effacer la recherche
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(o => (
            <OrderCard key={o.id} order={o}
              onAdvance={handleAdvance}
              onInvoice={ord => openInvoice([ord], shopName)}
              updating={updatingId === o.id} />
          ))}
          <div className="rounded-2xl flex items-center justify-between gap-3 flex-wrap"
            style={{ padding: '13px 18px', background: T.creamAlt, border: `1px solid ${T.border}` }}>
            <p className="font-medium" style={{ fontSize: 12, color: T.muted }}>
              {filtered.length} commande{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
              {search && ` · Recherche : « ${search} »`}
            </p>
            <p className="font-bold" style={{ fontSize: 12, color: T.orange }}>
              Net total : {fmtXAF(filtered.reduce((a, o) => a + (o.vendor_net_amount ?? 0), 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}