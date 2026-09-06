// frontend/src/features/vendors/SellerPendingFundsPage.tsx
// Mes fonds en attente — ce qui revient au vendeur mais n'est pas encore retirable.
// Dérivé de Order.escrow_status : BLOCKED, RELEASE_PENDING, DISPUTED.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Lock, Package, RefreshCw, Scale, TriangleAlert } from 'lucide-react';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { orderRef } from './orderUtils';
import { SegmentBar } from './EscrowPipeline';
import {
  T, HERO, card, nf, VendorStyles, PageHead, GhostBtn,
  Hero, HeroAmount, Badge, Note, Skeleton,
} from './vendorTheme';

const RELEASE_H = 24;       // Order.escrow_release_h
const AUTO_CONFIRM_H = 48;  // Order.escrow_auto_confirm_h

type Bucket = 'soon' | 'after_delivery' | 'action' | 'frozen';

const BUCKETS: Record<Bucket, { title: string; sub: string; color: string; bg: string }> = {
  soon: {
    title: 'Arrive sous 24 h',
    sub: 'Confirmation acquise · versement en cours',
    color: T.blue, bg: T.blueL,
  },
  after_delivery: {
    title: 'Après livraison',
    sub: "Le décompte démarre quand l'acheteur reçoit le colis",
    color: T.amber, bg: T.amberL,
  },
  action: {
    title: 'En attente de vous',
    sub: 'Préparez ces commandes pour lancer le décompte',
    color: T.orange, bg: T.orangeB,
  },
  frozen: {
    title: 'Gelé par litige',
    sub: "Libération suspendue jusqu'à l'arbitrage BelivaY",
    color: T.red, bg: T.redL,
  },
};

const PENDING_ACTION = ['PAID_IN_ESCROW', 'VENDOR_ACKNOWLEDGED', 'PREPARING'];

function classify(o: VendorOrder): Bucket {
  if (o.escrow_status === 'DISPUTED') return 'frozen';
  if (o.escrow_status === 'RELEASE_PENDING') return 'soon';
  if (PENDING_ACTION.includes(o.fulfillment_status)) return 'action';
  return 'after_delivery';
}

/**
 * Échéance lisible : ce qui débloque le montant, et quand.
 *
 * `maintenant` est passé en argument plutôt que lu via `Date.now()` : cette
 * fonction est appelée pendant le rendu, et une horloge lue là rendrait le
 * composant impur — les compteurs sauteraient à chaque re-rendu.
 */
function timing(o: VendorOrder, maintenant: number): { blocker: string; timer: string; tone: string } {
  if (o.escrow_status === 'DISPUTED') {
    return { blocker: 'Litige ouvert sur cette commande', timer: 'Suspendu', tone: T.red };
  }
  if (o.escrow_status === 'RELEASE_PENDING') {
    const base = new Date(o.updated_at ?? o.created_at).getTime() + RELEASE_H * 3600000;
    const left = base - maintenant;
    const h = Math.max(0, Math.floor(left / 3600000));
    return {
      blocker: 'Réception confirmée · versement programmé',
      timer: left > 0 ? `Dans ${h} h` : 'Imminent',
      tone: T.blue,
    };
  }
  if (PENDING_ACTION.includes(o.fulfillment_status)) {
    return { blocker: o.fulfillment_status === 'PREPARING' ? 'En préparation chez vous' : 'À confirmer de votre côté', timer: 'Action requise', tone: T.orange };
  }
  if (o.fulfillment_status === 'DELIVERED') {
    const base = new Date(o.updated_at ?? o.created_at).getTime() + AUTO_CONFIRM_H * 3600000;
    const left = base - maintenant;
    const h = Math.max(0, Math.floor(left / 3600000));
    return {
      blocker: "Livrée · en attente de confirmation acheteur",
      timer: left > 0 ? `Dans ${h + RELEASE_H} h` : 'Imminent',
      tone: T.amber,
    };
  }
  return { blocker: 'En cours de livraison', timer: 'Après livraison', tone: T.amber };
}

export default function SellerPendingFundsPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  // Horloge figée au chargement : voir le commentaire de `timing`.
  const [maintenant, setMaintenant] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const ords = await vendorsApi.getOrders();
      setOrders(ords);
      setMaintenant(Date.now());
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(
    () => orders.filter(o => ['BLOCKED', 'RELEASE_PENDING', 'DISPUTED'].includes(o.escrow_status)),
    [orders],
  );

  const groups = useMemo(() => {
    const map: Record<Bucket, VendorOrder[]> = { soon: [], after_delivery: [], action: [], frozen: [] };
    pending.forEach(o => map[classify(o)].push(o));
    return (['soon', 'action', 'after_delivery', 'frozen'] as Bucket[])
      .map(k => ({ key: k, ...BUCKETS[k], rows: map[k], total: map[k].reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0) }))
      .filter(g => g.rows.length > 0);
  }, [pending]);

  const total = pending.reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0);
  const soon = groups.find(g => g.key === 'soon')?.total ?? 0;
  const frozen = groups.find(g => g.key === 'frozen')?.total ?? 0;
  const blocked = total - soon - frozen;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <Skeleton h={140} n={2} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <Link to="/seller/payments">
        <button type="button" className="flex items-center gap-1.5 rounded-xl font-semibold transition-all"
          style={{ padding: '8px 13px', fontSize: 12.5, background: T.white, border: `1px solid ${T.border}`, color: T.muted }}>
          <ArrowLeft size={14} />Paiements & Escrow
        </button>
      </Link>

      <PageHead
        kicker="Séquestre" kickerColor={T.amber}
        title="Mes fonds en attente"
        subtitle="Ce qui vous revient, et la date à laquelle chaque montant devient retirable"
        actions={<GhostBtn icon={<RefreshCw size={13} />} onClick={load}>Actualiser</GhostBtn>}
      />

      <Hero gradient={HERO.amber} blobColor="rgba(217,119,6,.6)">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <HeroAmount
            kicker="Total en attente" value={nf(total)}
            note={
              <>
                {pending.length} commande{pending.length > 1 ? 's' : ''}
                {frozen > 0 ? <> · dont <strong style={{ color: '#ff8a80' }}>{nf(frozen)} FCFA gelés</strong> par litige</> : null}
              </>
            }
          />
          <div className="text-right">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.4)' }}>
              Arrive sous 24 h
            </p>
            <p className="font-black mt-1.5" style={{ fontSize: 24, color: '#34d399', letterSpacing: '-.02em' }}>
              {nf(soon)} <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>FCFA</span>
            </p>
          </div>
        </div>

        <SegmentBar segments={[
          { pct: pct(blocked), color: T.amber, label: `En escrow ${nf(blocked)}` },
          { pct: pct(soon),    color: T.blue,  label: `Libération 24 h ${nf(soon)}` },
          { pct: pct(frozen),  color: T.red,   label: frozen > 0 ? `Gelé ${nf(frozen)}` : undefined },
        ]} />
      </Hero>

      <div className="flex gap-3.5 items-start flex-wrap">
        <div className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 320 }}>
          {groups.length === 0 ? (
            <div className="rounded-2xl text-center" style={{ ...card, padding: '44px 20px' }}>
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: T.greenL, color: T.green }}><Lock size={24} /></span>
              <p className="font-bold" style={{ fontSize: 14, color: T.text }}>Aucun fonds en attente</p>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                Tout ce qui vous revient est déjà disponible au retrait.
              </p>
            </div>
          ) : groups.map(g => (
            <section key={g.key} className="rounded-2xl overflow-hidden" style={card}>
              <div className="flex items-center gap-3 flex-wrap"
                style={{ padding: '15px 18px', borderBottom: `1px solid ${T.border}` }}>
                <span className="rounded-full flex-shrink-0"
                  style={{ width: 9, height: 9, background: g.color, boxShadow: `0 0 0 4px ${g.bg}` }} />
                <div className="flex-1" style={{ minWidth: 140 }}>
                  <p className="font-bold" style={{ fontSize: 13, color: T.text }}>{g.title}</p>
                  <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{g.sub}</p>
                </div>
                <p className="font-black flex-shrink-0" style={{ fontSize: 15, color: g.color, letterSpacing: '-.02em' }}>
                  {nf(g.total)} FCFA
                </p>
              </div>

              {g.rows.map(o => {
                const t = timing(o, maintenant);
                return (
                  <Link key={o.id} to={`/seller/orders/${o.id}`}>
                    <div className="flex items-center gap-3.5 flex-wrap transition-colors"
                      style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderL}` }}>
                      <span className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                        <Package size={15} />
                      </span>
                      <div className="flex-1" style={{ minWidth: 150 }}>
                        <p className="font-black" style={{ fontSize: 12, color: T.orange }}>{orderRef(o.id)}</p>
                        <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>{t.blocker}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black" style={{ fontSize: 14, color: T.text }}>{nf(o.vendor_net_amount ?? 0)}</p>
                        <p style={{ fontSize: 10, color: T.mutedL, marginTop: 1 }}>sur {nf(o.vendor_subtotal)}</p>
                      </div>
                      <Badge label={t.timer} color={t.tone} bg={`${t.tone}1a`} minWidth={96} />
                    </div>
                  </Link>
                );
              })}
            </section>
          ))}
        </div>

        <aside className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 270, maxWidth: 340 }}>
          <div className="rounded-2xl p-5" style={card}>
            <p className="font-bold mb-4" style={{ fontSize: 13.5, color: T.text }}>Pourquoi cette attente</p>
            {[
              { n: '1', t: 'Paiement encaissé', d: "BelivaY conserve la totalité dès que l'acheteur paie. Vous êtes couvert même si le colis se perd." },
              { n: '2', t: `${AUTO_CONFIRM_H} h après livraison`, d: "L'acheteur confirme, ou la confirmation devient automatique s'il ne se manifeste pas." },
              { n: '3', t: `${RELEASE_H} h de libération`, d: 'Le net rejoint alors votre solde retirable, commission déjà déduite.' },
            ].map(s => (
              <div key={s.n} className="flex gap-3 mb-4">
                <span className="w-[26px] h-[26px] rounded-lg flex items-center justify-center flex-shrink-0 font-black"
                  style={{ background: T.amberL, color: T.amber, fontSize: 11.5 }}>{s.n}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold" style={{ fontSize: 12, color: T.text }}>{s.t}</span>
                  <span className="block mt-1" style={{ fontSize: 11, lineHeight: 1.55, color: T.muted }}>{s.d}</span>
                </span>
              </div>
            ))}
            <Note icon={<Clock size={15} />}>
              Les deux délais — <strong style={{ color: T.text }}>{AUTO_CONFIRM_H} h</strong> de confirmation automatique
              et <strong style={{ color: T.text }}>{RELEASE_H} h</strong> de libération — sont réglés par BelivaY
              et identiques pour tous les vendeurs.
            </Note>
          </div>

          {frozen > 0 && (
            <div className="rounded-2xl" style={{ ...card, border: `1px solid ${T.redB}`, padding: 18 }}>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: T.redL, color: T.red }}><TriangleAlert size={15} /></span>
                <p className="font-bold flex-1" style={{ fontSize: 12.5, color: T.text }}>Montant gelé</p>
              </div>
              <p className="font-black mt-3" style={{ fontSize: 24, color: T.red, letterSpacing: '-.02em' }}>
                {nf(frozen)} FCFA
              </p>
              <p className="mt-1.5" style={{ fontSize: 11, lineHeight: 1.55, color: T.muted }}>
                {groups.find(g => g.key === 'frozen')?.rows.length} commande(s) sous litige.
                La libération reprend dès l'arbitrage rendu.
              </p>
              <Link to="/seller/disputes">
                <button type="button" className="mt-3.5 w-full flex items-center justify-center gap-2 rounded-xl font-bold"
                  style={{ padding: 11, fontSize: 11.5, background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                  <Scale size={14} />Voir les litiges concernés
                </button>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
