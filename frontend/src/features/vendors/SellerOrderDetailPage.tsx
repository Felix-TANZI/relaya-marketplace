// frontend/src/features/vendors/SellerOrderDetailPage.tsx
// Détail d'une commande vendeur : progression, suivi livreur, argent, articles, note interne.
// L'identité de l'acheteur n'est pas affichée — seuls le lieu et un contact de livraison masqué.

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Bike, CheckCircle, Clock, FileText, Lock, MapPin,
  Navigation, Package, PackageCheck, Phone, RefreshCw, Route, Save, Scale,
  ShieldCheck, StickyNote, Truck, XCircle,
} from 'lucide-react';
import { vendorsApi, type VendorOrder, type FulfillmentStatus } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { openInvoice, fmtXAF, fmtDate, orderRef } from './orderUtils';
import {
  T, HERO, card, nf, ESCROW, type EscrowKey,
  VendorStyles, GhostBtn, Panel, Badge, Note,
} from './vendorTheme';

const RELEASE_H = 24;
const AUTO_CONFIRM_H = 48;

const STEPS = [
  { key: 'PAID_IN_ESCROW',      label: 'Payée',       icon: CheckCircle },
  { key: 'VENDOR_ACKNOWLEDGED', label: 'Confirmée',   icon: Clock },
  { key: 'PREPARING',           label: 'Préparation', icon: Package },
  { key: 'READY_FOR_PICKUP',    label: 'Prête',       icon: Truck },
  { key: 'DELIVERED',           label: 'Livrée',      icon: PackageCheck },
];

const STATUS_ORDER: Record<string, number> = {
  CREATED: 0, PAID_IN_ESCROW: 1, VENDOR_ACKNOWLEDGED: 2, PREPARING: 3,
  READY_FOR_PICKUP: 4, DELIVERED: 5, CANCELLED: -1,
};

const FULFILL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  CREATED:             { label: 'Reçue',            color: T.muted,  bg: T.creamAlt },
  PAID_IN_ESCROW:      { label: 'À confirmer',      color: T.amber,  bg: T.amberL   },
  VENDOR_ACKNOWLEDGED: { label: 'Confirmée',        color: T.blue,   bg: T.blueL    },
  PREPARING:           { label: 'En préparation',   color: T.blue,   bg: T.blueL    },
  READY_FOR_PICKUP:    { label: 'Prête',            color: T.violet, bg: T.violetL  },
  DELIVERED:           { label: 'Livrée',           color: T.green,  bg: T.greenL   },
  BUYER_CONFIRMED:     { label: 'Confirmée',        color: T.green,  bg: T.greenL   },
  AUTO_CONFIRMED:      { label: 'Confirmée auto',   color: T.green,  bg: T.greenL   },
  RELEASED_TO_VENDOR:  { label: 'Fonds libérés',    color: T.green,  bg: T.greenL   },
  DISPUTED:            { label: 'Litige',           color: T.red,    bg: T.redL     },
  CANCELLED:           { label: 'Annulée',          color: T.red,    bg: T.redL     },
  REFUNDED:            { label: 'Remboursée',       color: T.blue,   bg: T.blueL    },
};

const PAYMENT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'Paiement en attente', color: T.amber, bg: T.amberL },
  PAID:     { label: 'Payée',               color: T.green, bg: T.greenL },
  FAILED:   { label: 'Paiement échoué',     color: T.red,   bg: T.redL   },
  REFUNDED: { label: 'Remboursée',          color: T.blue,  bg: T.blueL  },
};

function shipmentLabel(status?: string) {
  switch (status) {
    case 'CREATED': return 'Livraison créée';
    case 'ASSIGNED': return 'Livreur assigné';
    case 'PICKED_UP': return 'Colis pris en main';
    case 'IN_TRANSIT': return 'En transit';
    case 'OUT_FOR_DELIVERY': return 'En livraison';
    case 'DELIVERED': return 'Livré';
    case 'FAILED': return 'Échec';
    case 'CANCELLED': return 'Annulée';
    default: return status || 'Non créée';
  }
}

/** Masque le milieu du numéro : le vendeur peut appeler sans lire l'identité complète. */
function maskPhone(p?: string) {
  if (!p) return '—';
  const d = p.replace(/\D/g, '');
  if (d.length < 9) return p;
  return `+237 ${d.slice(-9, -8)} •• •• ${d.slice(-4, -2)} ${d.slice(-2)}`;
}

function useShopName(): string {
  const [name, setName] = useState('Ma Boutique');
  useEffect(() => {
    vendorsApi.getProfile().then(p => setName(p.business_name)).catch(() => null);
  }, []);
  return name;
}

/** Minuterie d'acceptation (72 h) — Date.now() jamais appelé pendant le rendu. */
function useTimer(createdAt: string, active: boolean): string | null {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    if (!active || !createdAt) return;
    const deadline = new Date(createdAt).getTime() + 72 * 3600000;
    const tick = () => {
      const d = deadline - Date.now();
      setT(d <= 0 ? null : `${Math.floor(d / 3600000)} h ${Math.floor((d % 3600000) / 60000)} min restantes`);
    };
    const a = setTimeout(tick, 0);
    const b = setInterval(tick, 60_000);
    return () => { clearTimeout(a); clearInterval(b); };
  }, [active, createdAt]);
  return active ? t : null;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderL}` }}>
      <span className="flex-shrink-0" style={{ color: T.mutedL, marginTop: 2 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.mutedL }}>{label}</p>
        <p className="font-semibold mt-0.5" style={{ fontSize: 12.5, color: T.text, lineHeight: 1.4 }}>{value}</p>
      </div>
    </div>
  );
}

export default function SellerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const shopName = useShopName();

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [data, noteData] = await Promise.all([
        vendorsApi.getOrderDetail(parseInt(id, 10)),
        vendorsApi.getNote(parseInt(id, 10)),
      ]);
      setOrder(data);
      setNote(noteData.content);
      setNoteDraft(noteData.content);
    } catch {
      showToast('Commande introuvable', 'error');
      navigate('/seller/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const advance = async (next: FulfillmentStatus) => {
    if (!order) return;
    try {
      setUpdating(true);
      const updated = await vendorsApi.updateFulfillmentStatus(order.id, { fulfillment_status: next });
      setOrder(updated);
      showToast(`Statut mis à jour : ${FULFILL_CFG[next]?.label ?? next}`, 'success');
    } catch {
      showToast('Erreur de mise à jour', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const saveNote = async () => {
    if (!order) return;
    try {
      setNoteSaving(true);
      const saved = await vendorsApi.saveNote(order.id, noteDraft);
      setNote(saved.content);
      setNoteDraft(saved.content);
      showToast('Note sauvegardée', 'success');
    } catch {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setNoteSaving(false);
    }
  };

  const status = order?.fulfillment_status as FulfillmentStatus | undefined;
  const timer = useTimer(order?.created_at ?? '', status === 'PAID_IN_ESCROW');

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-2xl animate-pulse" style={{ height: 64, background: T.creamAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 240, background: T.creamAlt }} />
      </div>
    );
  }
  if (!order || !status) return null;

  const fulfillCfg = FULFILL_CFG[status];
  const paymentCfg = PAYMENT_CFG[order.payment_status];
  const escrow = ESCROW[order.escrow_status as EscrowKey] ?? ESCROW.PENDING;
  const cur = STATUS_ORDER[status] ?? 1;
  const isCancelled = status === 'CANCELLED';
  const isDelivered = ['DELIVERED', 'BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR'].includes(status);
  const spin = <RefreshCw size={13} className="animate-spin" />;
  const items = order.items ?? [];
  const units = items.reduce((s, i) => s + (i.qty ?? 0), 0);

  const releaseLeft = (() => {
    if (order.escrow_status === 'RELEASED') return null;
    if (order.escrow_status === 'DISPUTED') return 'Suspendu par litige';
    if (!isDelivered) return 'Après livraison';
    const base = new Date(order.updated_at ?? order.created_at).getTime();
    const target = order.escrow_status === 'RELEASE_PENDING'
      ? base + RELEASE_H * 3600000
      : base + (AUTO_CONFIRM_H + RELEASE_H) * 3600000;
    const left = target - Date.now();
    return left > 0 ? `Dans ${Math.floor(left / 3600000)} h` : 'Imminent';
  })();

  /** Rang de l'escrow, pour savoir quelle étape du parcours de l'argent est franchie. */
  const escrowRank: Record<string, number> = {
    PENDING: 0, BLOCKED: 1, DISPUTED: 1, REFUNDED: 1, PARTIAL_REFUNDED: 1,
    RELEASE_PENDING: 2, RELEASED: 3,
  };
  const rank = escrowRank[order.escrow_status] ?? 0;
  const stepRank: Record<string, number> = { paid: 1, commission: 1, delivered: 2, released: 3 };

  const moneySteps = [
    {
      key: 'paid', title: 'Acheteur payé — fonds bloqués',
      time: order.is_paid ? fmtDate(order.created_at) : 'En attente',
      desc: 'BelivaY conserve la totalité. Vous êtes couvert même si le colis se perd.',
      amount: `+ ${fmtXAF(order.vendor_subtotal)} encaissés`, tone: T.green,
    },
    {
      key: 'commission', title: 'Commission retenue',
      time: order.is_paid ? fmtDate(order.created_at) : '—',
      desc: 'Taux de votre plan figé sur cette commande. Il ne bougera pas, même si vous changez de plan.',
      amount: `− ${fmtXAF(order.commission_amount)} (${order.commission_rate.toFixed(1)} %)`, tone: T.red,
    },
    {
      key: 'delivered', title: 'Colis livré — décompte lancé',
      time: isDelivered ? fmtDate(order.updated_at ?? order.created_at) : 'À venir',
      desc: `L'acheteur a ${AUTO_CONFIRM_H} h pour confirmer ou ouvrir un litige. Sans réponse, la confirmation est automatique.`,
      amount: `${fmtXAF(order.vendor_net_amount ?? 0)} en attente`, tone: T.amber,
    },
    {
      key: 'released', title: 'Versement sur votre solde',
      time: rank >= 3 ? fmtDate(order.updated_at ?? order.created_at) : (releaseLeft ?? 'À venir'),
      desc: 'Le net rejoint votre solde retirable, puis part vers votre Mobile Money à la demande.',
      amount: `${fmtXAF(order.vendor_net_amount ?? 0)} ${rank >= 3 ? 'versés' : 'à venir'}`,
      tone: rank >= 3 ? T.green : T.mutedL,
    },
  ];

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      {/* ═══ EN-TÊTE ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/seller/orders">
          <button type="button" className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: T.white, border: `1px solid ${T.border}`, color: T.text }}>
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="flex-1" style={{ minWidth: 200 }}>
          <h1 className="font-black" style={{ fontSize: 21, color: T.text, letterSpacing: '-.025em' }}>
            Commande {orderRef(order.id)}
          </h1>
          <p className="mt-0.5" style={{ fontSize: 12, color: T.muted }}>
            {fmtDate(order.created_at)} · {items.length} article{items.length > 1 ? 's' : ''} · {order.city}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {paymentCfg && <Badge label={paymentCfg.label} color={paymentCfg.color} bg={paymentCfg.bg} />}
          {fulfillCfg && <Badge label={fulfillCfg.label} color={fulfillCfg.color} bg={fulfillCfg.bg} />}
          <Badge label={escrow.label} color={escrow.color} bg={escrow.bg} />
          <button type="button" onClick={() => openInvoice([order], shopName)}
            className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
            style={{ padding: '9px 14px', fontSize: 12, background: T.orange, boxShadow: '0 8px 18px -8px rgba(244,121,32,.8)' }}>
            <FileText size={13} />Facture
          </button>
        </div>
      </div>

      {/* ═══ PROGRESSION ═══ */}
      <div className="rounded-2xl p-5" style={card}>
        <p className="font-bold uppercase mb-4" style={{ fontSize: 10.5, letterSpacing: '.18em', color: T.mutedL }}>
          Progression de la commande
        </p>

        {timer && (
          <div className="flex items-center gap-2 mb-4 rounded-xl"
            style={{ padding: '11px 14px', background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.14)' }}>
            <Clock size={14} style={{ color: T.green, flexShrink: 0 }} />
            <span className="font-semibold" style={{ fontSize: 12, color: T.green }}>{timer} pour accepter</span>
          </div>
        )}

        {isCancelled ? (
          <div className="flex items-center gap-3 rounded-xl" style={{ padding: 13, background: T.redL }}>
            <XCircle size={18} style={{ color: T.red, flexShrink: 0 }} />
            <div>
              <p className="font-bold" style={{ fontSize: 13, color: T.red }}>Commande annulée</p>
              <p style={{ fontSize: 11, color: T.red }}>Le {fmtDate(order.updated_at ?? order.created_at)}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="flex items-start" style={{ minWidth: 440 }}>
              {STEPS.map((s, i) => {
                const ord = STATUS_ORDER[s.key] ?? i;
                const done = ord < cur;
                const now = s.key === status;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? T.green : now ? T.orange : T.creamAlt,
                          border: `2px solid ${done ? T.green : now ? T.orange : T.border}`,
                          boxShadow: now ? '0 0 0 4px rgba(244,121,32,.15)' : 'none',
                        }}>
                        <Icon size={14} style={{ color: done || now ? '#fff' : T.mutedL }} />
                      </span>
                      <span className="whitespace-nowrap"
                        style={{ fontSize: 10, fontWeight: now ? 700 : 500, color: done ? T.green : now ? T.orange : T.mutedL }}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="flex-shrink-0"
                        style={{ height: 2, width: 52, margin: '0 5px 20px', background: done ? T.green : T.border }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isCancelled && !isDelivered && (
          <div className="flex gap-2 mt-5 pt-4 flex-wrap" style={{ borderTop: `1px solid ${T.border}` }}>
            {status === 'PAID_IN_ESCROW' && (
              <>
                <button type="button" onClick={() => advance('VENDOR_ACKNOWLEDGED')}
                  disabled={updating || !order.is_paid}
                  title={!order.is_paid ? 'En attente du paiement' : undefined}
                  className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px disabled:opacity-60"
                  style={{ padding: '11px 17px', fontSize: 12.5, background: T.green, boxShadow: '0 8px 20px -10px rgba(22,163,74,.8)' }}>
                  {updating ? spin : <CheckCircle size={14} />}Accepter la commande
                </button>
                <button type="button" onClick={() => advance('PREPARING')} disabled={updating || !order.is_paid}
                  className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
                  style={{ padding: '11px 16px', fontSize: 12.5, background: T.cream, border: `1px solid ${T.border}`, color: T.text }}>
                  {updating ? spin : <Package size={14} />}Passer en préparation
                </button>
                <button type="button" onClick={() => advance('CANCELLED')} disabled={updating}
                  className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
                  style={{ padding: '11px 16px', fontSize: 12.5, background: T.redL, border: `1px solid ${T.redB}`, color: T.red }}>
                  {updating ? spin : <XCircle size={14} />}Refuser
                </button>
              </>
            )}
            {status === 'VENDOR_ACKNOWLEDGED' && (
              <button type="button" onClick={() => advance('PREPARING')} disabled={updating}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 17px', fontSize: 12.5, background: T.blue, boxShadow: '0 8px 20px -10px rgba(37,99,235,.8)' }}>
                {updating ? spin : <Package size={14} />}Commencer la préparation
              </button>
            )}
            {status === 'PREPARING' && (
              <button type="button" onClick={() => advance('READY_FOR_PICKUP')} disabled={updating}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
                style={{ padding: '11px 17px', fontSize: 12.5, background: T.orange, boxShadow: '0 8px 20px -10px rgba(244,121,32,.85)' }}>
                {updating ? spin : <Truck size={14} />}Marquer comme prêt à expédier
              </button>
            )}
            {status === 'READY_FOR_PICKUP' && (
              <span className="flex items-center gap-1.5 font-medium" style={{ fontSize: 12, color: T.muted }}>
                <Truck size={14} />En attente du livreur BelivaY
              </span>
            )}
          </div>
        )}

        {!order.is_paid && !isCancelled && (
          <div className="flex items-center gap-2 mt-3 rounded-xl"
            style={{ padding: '10px 13px', background: T.amberL, border: `1px solid ${T.amberB}` }}>
            <AlertTriangle size={13} style={{ color: T.amber, flexShrink: 0 }} />
            <p className="font-semibold" style={{ fontSize: 12, color: T.amber }}>
              Le paiement n'est pas encore confirmé. Vous ne pouvez pas traiter cette commande.
            </p>
          </div>
        )}
      </div>

      {/* ═══ SUIVI COLIS ═══ */}
      <Panel title="Suivi du colis · vendeur ↔ livreur" right={<Route size={15} style={{ color: T.orange }} />}>
        {order.shipment ? (
          <>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.blueL, border: '1px solid rgba(37,99,235,.16)' }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.blue }}>Statut livraison</p>
                <p className="font-black mt-1.5" style={{ fontSize: 13, color: T.text }}>{shipmentLabel(order.shipment.status)}</p>
              </div>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.greenL, border: `1px solid ${T.greenB}` }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.green }}>
                  <Navigation size={11} />Distance calculée
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 17, color: T.text }}>
                  {order.shipment.distance_km.toFixed(1)} km
                </p>
              </div>
              <div className="rounded-2xl" style={{ padding: '13px 15px', background: T.orangeL, border: '1px solid rgba(244,121,32,.16)' }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.orange }}>
                  <Bike size={11} />Livreur
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 13, color: T.text }}>
                  {order.shipment.courier_name || 'En attente'}
                </p>
                {order.shipment.courier_phone && (
                  <p style={{ fontSize: 10.5, color: T.muted, marginTop: 2 }}>{order.shipment.courier_phone}</p>
                )}
              </div>
            </div>

            {order.shipment.pickup_confirmation_code && (
              <div className="mt-4 rounded-2xl" style={{ padding: '14px 16px', background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: '#92400E' }}>
                  Code de remise — à donner au livreur
                </p>
                <p className="font-black mt-1.5" style={{ fontSize: 24, letterSpacing: '.15em', color: '#78350F' }}>
                  {order.shipment.pickup_confirmation_code}
                </p>
                <p style={{ fontSize: 11, color: '#92400E', marginTop: 4 }}>
                  Lisez ce code au livreur au moment du ramassage. Il en a besoin pour valider la prise en charge.
                </p>
              </div>
            )}

            <div className="mt-5">
              {(order.shipment.timeline ?? []).map((e, i, arr) => {
                const isLast = i === arr.length - 1;
                return (
                  <div key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 32 }}>
                      <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: isLast ? T.orange : T.creamAlt, color: isLast ? '#fff' : T.muted }}>
                        {isLast ? <Truck size={14} /> : <CheckCircle size={14} />}
                      </span>
                      {!isLast && <span className="flex-1" style={{ width: 1, minHeight: 24, background: T.border }} />}
                    </div>
                    <div className="flex-1 min-w-0" style={{ paddingBottom: isLast ? 0 : 16 }}>
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="font-black" style={{ fontSize: 12.5, color: T.text }}>{e.label}</p>
                        <span className="font-semibold" style={{ fontSize: 10.5, color: T.mutedL }}>{fmtDate(e.created_at)}</span>
                      </div>
                      <p className="mt-1" style={{ fontSize: 11.5, lineHeight: 1.5, color: T.muted }}>
                        {e.message || shipmentLabel(e.status)}
                      </p>
                      {e.location && (
                        <p className="flex items-center gap-1 font-bold mt-1.5" style={{ fontSize: 10.5, color: T.mutedL }}>
                          <MapPin size={11} />{e.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="rounded-xl" style={{ padding: '13px 15px', background: T.cream, fontSize: 13, color: T.muted }}>
            Aucun suivi de colis n'est encore associé à cette commande.
          </div>
        )}
      </Panel>

      {/* ═══ ARGENT ═══ */}
      <div className="flex gap-3.5 items-start flex-wrap">
        <div className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 340 }}>

          <Panel title="Cycle de vie de l'argent" right={<Lock size={15} style={{ color: escrow.color }} />}>
            {moneySteps.map((s, i, arr) => {
              const done = rank >= (stepRank[s.key] ?? 0);
              const isNow = !done && (i === 0 || rank >= (stepRank[arr[i - 1].key] ?? 0));
              return (
                <div key={s.key} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 26 }}>
                    <span className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 26, height: 26, color: '#fff',
                        background: done ? T.green : isNow ? T.amber : '#E2DACE',
                        boxShadow: isNow ? '0 0 0 5px rgba(217,119,6,.16)' : 'none',
                      }}>
                      {(done || isNow) && <CheckCircle size={13} />}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="flex-1"
                        style={{ width: 2, minHeight: 30, margin: '5px 0', background: done ? 'rgba(22,163,74,.28)' : T.border }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0" style={{ paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                      <p className="font-bold" style={{ fontSize: 13, color: done || isNow ? T.text : T.mutedL }}>{s.title}</p>
                      <span style={{ fontSize: 10.5, color: T.mutedL, fontVariantNumeric: 'tabular-nums' }}>{s.time}</span>
                    </div>
                    <p className="mt-1" style={{ fontSize: 11.5, lineHeight: 1.55, color: T.muted, maxWidth: 460 }}>{s.desc}</p>
                    <span className="inline-block font-black rounded-lg mt-2.5"
                      style={{ fontSize: 11.5, padding: '5px 11px', color: s.tone, background: `${s.tone}1a` }}>
                      {s.amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </Panel>

          <Panel
            title="Décomposition du paiement"
            right={<GhostBtn icon={<FileText size={13} />} onClick={() => openInvoice([order], shopName)}>Facture</GhostBtn>}
          >
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between" style={{ padding: '14px 16px', background: T.cream }}>
                <span style={{ fontSize: 12, color: T.muted }}>Sous-total de vos articles</span>
                <span className="font-bold" style={{ fontSize: 13.5, color: T.text }}>{fmtXAF(order.vendor_subtotal)}</span>
              </div>
              <div className="flex items-center justify-between"
                style={{ padding: '14px 16px', background: T.white, borderTop: `1px solid ${T.borderL}` }}>
                <span style={{ fontSize: 12, color: T.mutedL }}>Livraison (encaissée par BelivaY)</span>
                <span className="font-semibold" style={{ fontSize: 13, color: T.mutedL }}>
                  {(order.delivery_fee_xaf ?? 0) === 0 ? 'Offerte' : fmtXAF(order.delivery_fee_xaf ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3"
                style={{ padding: '14px 16px', background: 'rgba(220,38,38,.06)', borderTop: '1px solid rgba(220,38,38,.14)' }}>
                <span style={{ fontSize: 12, color: T.red }}>
                  Commission BelivaY {order.commission_rate.toFixed(1)} %{' '}
                  <span style={{ fontSize: 10, opacity: .8 }}>(figée à la commande)</span>
                </span>
                <span className="font-bold flex-shrink-0" style={{ fontSize: 13.5, color: T.red }}>
                  − {fmtXAF(order.commission_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3"
                style={{ padding: '17px 16px', background: T.greenL, borderTop: `1px solid ${T.greenB}` }}>
                <span className="font-bold" style={{ fontSize: 12, color: T.green }}>Net qui vous revient</span>
                <span className="font-black flex-shrink-0"
                  style={{ fontSize: 22, color: T.green, letterSpacing: '-.02em' }}>
                  {fmtXAF(order.vendor_net_amount ?? 0)}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        {/* ═══ COLONNE DROITE ═══ */}
        <aside className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 270, maxWidth: 340 }}>
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: HERO.dark }}>
            <span className="v-glow absolute pointer-events-none"
              style={{ top: -50, right: -30, width: 160, height: 160, borderRadius: '50%',
                background: `radial-gradient(circle,${escrow.color}88,transparent 68%)` }} />
            <div className="relative">
              <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.42)' }}>
                {rank >= 3 ? 'Déjà versé' : 'Bloqué pour vous'}
              </p>
              <p className="font-black mt-2"
                style={{ fontSize: 29, color: '#fff', letterSpacing: '-.025em' }}>
                {nf(order.vendor_net_amount ?? 0)} <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>FCFA</span>
              </p>

              {releaseLeft && (
                <div className="flex items-center gap-3 mt-4 rounded-2xl"
                  style={{ padding: 13, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.13)' }}>
                  <span className="relative flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34 }}>
                    <span className="v-pulse absolute inset-0 rounded-full" style={{ border: `1.5px solid ${escrow.color}99` }} />
                    <Clock size={16} style={{ color: escrow.color, position: 'relative' }} />
                  </span>
                  <span>
                    <span className="block font-bold" style={{ fontSize: 11.5, color: '#fff' }}>
                      Libération {releaseLeft.toLowerCase()}
                    </span>
                    <span className="block mt-0.5" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)' }}>
                      {order.escrow_status === 'DISPUTED' ? "Reprend après l'arbitrage" : "Ou dès que l'acheteur confirme"}
                    </span>
                  </span>
                </div>
              )}

              <p className="mt-3" style={{ fontSize: 11, lineHeight: 1.6, color: 'rgba(255,255,255,.55)' }}>
                Confirmation automatique <strong style={{ color: '#fff' }}>{AUTO_CONFIRM_H} h</strong> après livraison,
                puis versement <strong style={{ color: '#fff' }}>{RELEASE_H} h</strong> plus tard.
              </p>

              <Link to="/seller/pending-funds">
                <span className="block mt-3 font-bold" style={{ fontSize: 11, color: T.orange }}>
                  Voir tous mes fonds en attente →
                </span>
              </Link>
            </div>
          </div>

          {/* Livraison — sans identité acheteur */}
          <Panel title="Livraison" right={<MapPin size={15} style={{ color: T.orange }} />}>
            <DetailRow icon={<MapPin size={13} />} label="Ville" value={order.city} />
            {order.address && <DetailRow icon={<MapPin size={13} />} label="Adresse de livraison" value={order.address} />}
            <DetailRow icon={<Phone size={13} />} label="Contact de livraison" value={maskPhone(order.customer_phone)} />

            {order.note && (
              <div className="mt-3 rounded-2xl" style={{ padding: 13, background: T.orangeL, border: '1px solid rgba(244,121,32,.16)' }}>
                <p className="flex items-center gap-1.5 font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.orange }}>
                  <StickyNote size={12} />Consigne du client
                </p>
                <p className="mt-1.5" style={{ fontSize: 12, lineHeight: 1.5, color: T.text }}>{order.note}</p>
              </div>
            )}

            <div className="mt-3">
              <Note icon={<ShieldCheck size={14} />}>
                L'identité de l'acheteur reste chez BelivaY. Vous recevez l'adresse et un contact de livraison,
                rien de plus.
              </Note>
            </div>
          </Panel>

          {order.escrow_status === 'DISPUTED' && (
            <Link to="/seller/disputes">
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ ...card, border: `1px solid ${T.redB}` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.redL, color: T.red }}><Scale size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold" style={{ fontSize: 12.5, color: T.text }}>Litige en cours</span>
                  <span className="block" style={{ fontSize: 10.5, color: T.muted }}>
                    {fmtXAF(order.vendor_net_amount ?? 0)} gelés — répondre au litige
                  </span>
                </span>
              </div>
            </Link>
          )}
        </aside>
      </div>

      {/* ═══ ARTICLES ═══ */}
      <Panel
        pad={false}
        title="Articles commandés"
        sub={`${items.length} article${items.length > 1 ? 's' : ''} · ${units} unité${units > 1 ? 's' : ''}`}
        right={<Package size={15} style={{ color: T.orange }} />}
      >
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3.5 flex-wrap"
            style={{ padding: '15px 20px', borderBottom: `1px solid ${T.borderL}` }}>
            <span className="rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ width: 52, height: 52, background: T.orangeL }}>
              {item.product_image
                ? <img src={item.product_image} alt={item.product_title} className="w-full h-full object-cover" />
                : <Package size={21} style={{ color: T.orange }} />}
            </span>
            <div className="flex-1" style={{ minWidth: 170 }}>
              <p className="font-semibold" style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{item.product_title}</p>
              <p className="mt-1" style={{ fontSize: 11.5, color: T.muted }}>
                Qté <strong style={{ color: T.text }}>{item.qty}</strong> · Prix unitaire{' '}
                <strong style={{ color: T.text }}>{fmtXAF(item.product_price ?? 0)}</strong>
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black" style={{ fontSize: 15.5, color: T.text, letterSpacing: '-.01em' }}>
                {fmtXAF(item.line_total_xaf)}
              </p>
              <p style={{ fontSize: 10.5, color: T.mutedL, marginTop: 2 }}>
                net {fmtXAF(Math.round(item.line_total_xaf * (1 - order.commission_rate / 100)))}
              </p>
            </div>
          </div>
        ))}
      </Panel>

      {/* ═══ NOTE INTERNE ═══ */}
      <div className="rounded-2xl overflow-hidden" style={card}>
        <div className="flex items-center justify-between gap-3 flex-wrap"
          style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.violetL, color: T.violet }}><StickyNote size={15} /></span>
            <span className="font-bold" style={{ fontSize: 13.5, color: T.text }}>Note interne</span>
            <span className="font-bold rounded-full"
              style={{ fontSize: 10, padding: '4px 9px', background: T.violetL, color: T.violet }}>
              Visible uniquement par vous
            </span>
          </div>
          {noteDraft !== note && (
            <span className="font-medium" style={{ fontSize: 11, color: T.amber }}>Modifications non sauvegardées</span>
          )}
        </div>

        <div style={{ padding: '18px 20px' }}>
          <textarea
            value={noteDraft}
            onChange={e => setNoteDraft(e.target.value)}
            placeholder="Ex : client régulier — emballage cadeau · vérifier le numéro de série avant expédition…"
            maxLength={2000}
            rows={4}
            className="w-full resize-none rounded-2xl outline-none transition-all"
            style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, background: T.cream, border: `1px solid ${T.border}`, color: T.text, fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = T.violet; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <div className="flex items-center justify-between gap-2.5 mt-3 flex-wrap">
            <p style={{ fontSize: 11, color: T.mutedL }}>{noteDraft.length}/2 000 caractères</p>
            <div className="flex gap-2">
              {noteDraft !== note && (
                <button type="button" onClick={() => setNoteDraft(note)}
                  className="rounded-xl font-semibold"
                  style={{ padding: '9px 15px', fontSize: 12, background: T.creamAlt, color: T.muted }}>
                  Annuler
                </button>
              )}
              <button type="button" onClick={saveNote} disabled={noteSaving || noteDraft === note}
                className="flex items-center gap-1.5 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                style={{ padding: '9px 17px', fontSize: 12.5, background: T.violet, boxShadow: '0 8px 20px -10px rgba(124,58,237,.85)' }}>
                {noteSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {noteSaving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5"
          style={{ padding: '13px 20px', background: 'rgba(124,58,237,.04)', borderTop: `1px solid ${T.border}` }}>
          <StickyNote size={12} style={{ color: T.violet, flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 11, lineHeight: 1.6, color: T.muted }}>
            Cette note est strictement privée. Elle n'est ni visible par l'acheteur, ni par l'équipe BelivaY,
            ni par d'autres vendeurs. Utilisez-la pour vos instructions de préparation ou tout mémo interne.
          </p>
        </div>
      </div>

      {/* ═══ PIED DE PAGE ═══ */}
      <div className="rounded-2xl flex items-center justify-between gap-3 flex-wrap"
        style={{ padding: '16px 20px', background: T.creamAlt, border: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 11.5, color: T.muted }}>
          Commande créée le {fmtDate(order.created_at)}
          {order.updated_at && order.updated_at !== order.created_at && ` · mise à jour le ${fmtDate(order.updated_at)}`}
        </p>
        <button type="button" onClick={() => openInvoice([order], shopName)}
          className="flex items-center gap-2 rounded-xl font-bold text-white transition-all hover:-translate-y-px"
          style={{ padding: '10px 17px', fontSize: 12.5, background: T.orange, boxShadow: '0 8px 20px -10px rgba(244,121,32,.85)' }}>
          <FileText size={14} />Imprimer la facture
        </button>
      </div>
    </div>
  );
}