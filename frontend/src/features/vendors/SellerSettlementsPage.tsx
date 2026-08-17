// frontend/src/features/vendors/SellerSettlementsPage.tsx
// Mes règlements — ce que BelivaY a réellement versé sur le Mobile Money du vendeur.
// Dérivé de WithdrawalRequest (APPROVED) + les commandes RELEASED antérieures à chaque versement.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, CircleCheckBig, Clock, Download, RefreshCw, ShieldCheck, Wallet,
} from 'lucide-react';
import { vendorsApi, type VendorOrder, type WithdrawalRequest } from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtDate, orderRef } from './orderUtils';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import {
  T, HERO, nf, VendorStyles, PageHead, GhostBtn, StatCard,
  Hero, HeroAmount, Panel, Tabs, Badge, Note, Skeleton, WITHDRAWAL,
} from './vendorTheme';

type Range = 'all' | 'year' | 'month';

/** Un règlement + les commandes libérées qu'il couvre (les plus récentes avant son traitement). */
function coverOrders(wd: WithdrawalRequest, released: VendorOrder[]): VendorOrder[] {
  const cutoff = new Date(wd.processed_at ?? wd.created_at).getTime();
  const before = released
    .filter(o => new Date(o.updated_at ?? o.created_at).getTime() <= cutoff)
    .sort((a, b) => new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime());

  const out: VendorOrder[] = [];
  let acc = 0;
  for (const o of before) {
    if (acc >= wd.amount_xaf) break;
    out.push(o);
    acc += o.vendor_net_amount ?? 0;
  }
  return out;
}

function exportCSV(list: WithdrawalRequest[], shopName: string) {
  const rows = [
    'Référence,Date de traitement,Opérateur,Numéro,Brut (FCFA),Frais (FCFA),Reçu (FCFA),Statut',
    ...list.map(w => [
      w.reference,
      fmtDate(w.processed_at ?? w.created_at),
      w.operator === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money',
      w.phone_number, w.amount_xaf, w.fee_amount_xaf, w.net_amount_xaf, w.status_display,
    ].join(',')),
  ];
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `belivay_reglements_${shopName}_${new Date().getFullYear()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SellerSettlementsPage() {
  const { showToast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [shopName, setShopName] = useState('Ma Boutique');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('all');
  const [open, setOpen] = useState<number | null>(null);
  // Horodatage fige au chargement : lire l'heure courante pendant le rendu
  // rendrait le composant impur et ferait recalculer le filtre a chaque rendu.
  const [today, setToday] = useState<{ year: number; month: number }>({ year: 0, month: -1 });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [wds, ords, profile] = await Promise.all([
        vendorsApi.getWithdrawals(),
        vendorsApi.getOrders(),
        vendorsApi.getProfile(),
      ]);
      setWithdrawals(wds);
      setOrders(ords);
      setShopName(profile.business_name);
      const d = new Date();
      setToday({ year: d.getFullYear(), month: d.getMonth() });
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const settled = useMemo(
    () => withdrawals.filter(w => w.status === 'APPROVED'),
    [withdrawals],
  );
  const releasedOrders = useMemo(
    () => orders.filter(o => o.escrow_status === 'RELEASED'),
    [orders],
  );

  const filtered = useMemo(() => settled.filter(w => {
    const d = new Date(w.processed_at ?? w.created_at);
    if (range === 'year')  return d.getFullYear() === today.year;
    if (range === 'month') return d.getFullYear() === today.year && d.getMonth() === today.month;
    return true;
  }), [settled, range, today]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, w) => s + w.net_amount_xaf, 0);
    const fees  = filtered.reduce((s, w) => s + w.fee_amount_xaf, 0);
    const delays = filtered
      .filter(w => w.processed_at)
      .map(w => new Date(w.processed_at as string).getTime() - new Date(w.created_at).getTime())
      .filter(ms => ms > 0);
    const avgMs = delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
    const h = Math.floor(avgMs / 3600000);
    const m = Math.floor((avgMs % 3600000) / 60000);
    return {
      total, fees, count: filtered.length,
      delay: delays.length ? (h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`) : '—',
    };
  }, [filtered]);

  const last = filtered[0];

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 180, background: T.creamAlt }} />
        <Skeleton h={96} n={3} />
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
        kicker="Encaissements" kickerColor={T.green}
        title="Mes règlements"
        subtitle="Ce que BelivaY a réellement versé sur votre Mobile Money"
        actions={
          <>
            <GhostBtn icon={<Download size={13} />} onClick={() => exportCSV(filtered, shopName)}>Relevé CSV</GhostBtn>
            <GhostBtn icon={<RefreshCw size={13} />} onClick={load}>Actualiser</GhostBtn>
          </>
        }
      />

      <Hero gradient={HERO.green} blobColor="rgba(52,211,153,.55)">
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <HeroAmount
            kicker={range === 'month' ? 'Total réglé ce mois' : range === 'year' ? `Total réglé en ${today.year}` : 'Total réglé'}
            value={nf(stats.total)}
            note={
              stats.count === 0
                ? 'Aucun règlement sur cette période'
                : <>{stats.count} règlement{stats.count > 1 ? 's' : ''}{last ? <> · dernier le {fmtDate(last.processed_at ?? last.created_at)} pour <strong style={{ color: '#fff' }}>{nf(last.net_amount_xaf)} FCFA</strong></> : null}</>
            }
          />
          {last && (
            <div className="flex items-center gap-3.5 rounded-2xl"
              style={{ padding: '14px 18px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)' }}>
              <OperatorLogo provider={last.operator} size={36} />
              <span>
                <span className="block font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.42)' }}>
                  Compte crédité
                </span>
                <span className="block font-bold mt-0.5" style={{ fontSize: 12.5, color: '#fff' }}>{last.phone_number}</span>
              </span>
            </div>
          )}
        </div>
      </Hero>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))' }}>
        <StatCard icon={<CircleCheckBig size={17} />} value={nf(stats.total)} label="Total réglé" sub="Net reçu, frais déduits" color={T.green} bg={T.greenL} />
        <StatCard icon={<Download size={17} />} value={String(stats.count)} label="Règlements" sub="Virements Mobile Money" color={T.blue} bg={T.blueL} />
        <StatCard icon={<Wallet size={17} />} value={nf(stats.fees)} label="Frais cumulés" sub="Retenus par BelivaY" color={T.red} bg={T.redL} />
        <StatCard icon={<Clock size={17} />} value={stats.delay} label="Délai moyen" sub="De la demande au crédit" color={T.amber} bg={T.amberL} />
      </div>

      <Panel
        pad={false}
        title="Historique des règlements"
        sub="Dépliez une ligne pour voir les commandes couvertes par le versement"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={14} style={{ color: T.mutedL }} />
            <Tabs<Range>
              value={range} onChange={setRange} accent={T.green}
              items={[
                { key: 'all',   label: 'Tous',     n: settled.length },
                { key: 'year',  label: String(today.year) },
                { key: 'month', label: 'Ce mois' },
              ]}
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="text-center" style={{ padding: '44px 20px' }}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: T.greenL, color: T.green }}><CircleCheckBig size={24} /></span>
            <p className="font-bold" style={{ fontSize: 14, color: T.text }}>Aucun règlement pour l'instant</p>
            <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              Vos versements apparaîtront ici dès qu'une demande de retrait sera approuvée.
            </p>
            <Link to="/seller/wallet">
              <button type="button" className="mt-4 rounded-xl font-bold text-white"
                style={{ padding: '11px 18px', fontSize: 12.5, background: HERO.orange }}>
                Demander un retrait
              </button>
            </Link>
          </div>
        ) : filtered.map(w => {
          const covered = coverOrders(w, releasedOrders);
          const isOpen = open === w.id;
          const cfg = WITHDRAWAL[w.status] ?? WITHDRAWAL.CANCELLED;
          return (
            <div key={w.id} className="v-row" style={{ padding: '16px 20px', borderBottom: `1px solid ${T.borderL}` }}>
              <div className="flex items-center gap-3.5 flex-wrap">
                <OperatorLogo provider={w.operator} size={38} />
                <div className="flex-1" style={{ minWidth: 160 }}>
                  <p className="font-black" style={{ fontSize: 12.5, color: T.text }}>{w.reference}</p>
                  <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>
                    Traité le {fmtDate(w.processed_at ?? w.created_at)} · {w.phone_number}
                  </p>
                </div>

                <div className="text-right flex-shrink-0" style={{ minWidth: 92 }}>
                  <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>Brut</p>
                  <p className="font-semibold" style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{nf(w.amount_xaf)}</p>
                </div>
                <div className="text-right flex-shrink-0" style={{ minWidth: 92 }}>
                  <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(220,38,38,.7)' }}>
                    Frais {parseFloat(String(w.fee_percent_snapshot)).toFixed(1)} %
                  </p>
                  <p className="font-semibold" style={{ fontSize: 12.5, color: T.red, marginTop: 2 }}>− {nf(w.fee_amount_xaf)}</p>
                </div>
                <div className="text-right flex-shrink-0" style={{ minWidth: 112 }}>
                  <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.1em', color: T.mutedL }}>Reçu</p>
                  <p className="font-black" style={{ fontSize: 15, color: T.green, marginTop: 2 }}>{nf(w.net_amount_xaf)}</p>
                </div>

                <Badge label={w.status_display} color={cfg.color} bg={cfg.bg} minWidth={84} />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap mt-3 pt-3"
                style={{ borderTop: `1px dashed ${T.border}` }}>
                <span className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.12em', color: T.mutedL }}>
                  Commandes couvertes
                </span>
                {(isOpen ? covered : covered.slice(0, 3)).map(o => (
                  <Link key={o.id} to={`/seller/orders/${o.id}`}>
                    <span className="font-bold rounded-lg"
                      style={{ fontSize: 10.5, padding: '4px 9px', background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                      {orderRef(o.id)}
                    </span>
                  </Link>
                ))}
                {covered.length === 0 && (
                  <span style={{ fontSize: 10.5, color: T.mutedL }}>Rapprochement indisponible</span>
                )}
                <span className="flex-1" />
                {covered.length > 3 && (
                  <button type="button" onClick={() => setOpen(isOpen ? null : w.id)}
                    className="font-bold" style={{ fontSize: 11, color: T.orange }}>
                    {isOpen ? 'Réduire' : `Voir les ${covered.length} commandes`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Panel>

      <Note icon={<ShieldCheck size={15} />} tone="green">
        Un règlement est définitif. La référence <strong style={{ color: T.text }}>BLV-WD-…</strong> vous sert de preuve
        auprès de votre opérateur en cas de contestation. Conservez le relevé pour votre comptabilité.
      </Note>
    </div>
  );
}
