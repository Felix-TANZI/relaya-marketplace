// frontend/src/features/vendors/v2/argent/GelePage.tsx
// Écran « Gelé — pourquoi » — VD-09 fig. 4. Montants bloqués par un litige ou
// un retour actif, avec la liste actionnable (répondre / inspecter) qui les
// débloque.
//
// Pont API : vendorsApi.getDisputes() (litiges, VendorDisputeListItem —
// vendor_escrow_amount, vendor_deadline_iso, hours_remaining déjà fournis par
// le backend) + vendorsApi.getReturns() (retours, OrderReturn) + getOrders()
// pour retrouver le montant net gelé par un retour (OrderReturn n'expose pas
// de montant vendeur — seulement refund_amount_xaf, qui reste null tant que
// rien n'est tranché ; VendorOrder.vendor_net_amount, lui, existe déjà).
//
// Le total « gelé » affiché en haut reprend exactement le même calcul que
// SellerPaymentsPage.tsx (sl4_payments) et SellerPendingFundsPage.tsx
// (sl4_pending_funds) : somme de vendor_net_amount des commandes dont
// escrow_status === 'DISPUTED'. On ne recalcule pas un autre total gelé
// ailleurs dans l'app pour ne pas afficher deux chiffres différents.
//
// Chaque carte litige renvoie vers la vraie page de réponse déjà construite
// (/seller/v2/litiges/:id, DisputeReplyPage.tsx) ; chaque carte retour renvoie
// vers la vraie page d'inspection (/seller/v2/retours/:id,
// ReturnInspectionPage.tsx). Ni le délai "48 h" ni "petit remboursement
// automatique" du mockup ne sont réaffichés ici sous forme de garantie
// chiffrée fixe : ce sont des règles plateforme, pas des champs par commande
// exposés par l'API vendeur — elles restent dans le bloc pédagogique
// "Comment ça marche", explicitement qualifiées de règle générale.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, PackageSearch, Scale, ShieldQuestion } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import {
  vendorsApi, type VendorDisputeListItem, type VendorOrder,
} from '@/services/api/vendors';
import type { OrderReturn } from '@/services/api/customer';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { formatXAF } from '../compte/shared/format';

function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

const ACTIVE_RETURN_STATUSES: OrderReturn['status'][] = ['REQUESTED', 'RECEIVED', 'APPROVED', 'AWAITING_DROPOFF'];

export default function GelePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [disputes, setDisputes] = useState<VendorDisputeListItem[]>([]);
  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([vendorsApi.getOrders(), vendorsApi.getDisputes(), vendorsApi.getReturns()])
      .then(([ords, disp, rets]) => {
        if (cancelled) return;
        setOrders(ords);
        setDisputes(disp);
        setReturns(rets);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const frozenTotal = useMemo(
    () => orders
      .filter((o) => o.escrow_status === 'DISPUTED')
      .reduce((sum, o) => sum + (o.vendor_net_amount ?? 0), 0),
    [orders],
  );
  const frozenOrdersCount = useMemo(
    () => orders.filter((o) => o.escrow_status === 'DISPUTED').length,
    [orders],
  );

  const openDisputes = useMemo(
    () => disputes
      .filter((d) => d.status === 'OPEN' || d.status === 'IN_PROGRESS')
      .sort((a, b) => a.hours_remaining - b.hours_remaining),
    [disputes],
  );

  const activeReturns = useMemo(
    () => returns.filter((r) => ACTIVE_RETURN_STATUSES.includes(r.status)),
    [returns],
  );

  function returnAmount(r: OrderReturn): number | null {
    const order = orders.find((o) => o.id === r.order);
    return order ? order.vendor_net_amount : null;
  }

  const hasAnyActionable = openDisputes.length > 0 || activeReturns.length > 0;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader
        title={t('sl12_argent.gele_title')}
        subtitle={t('sl12_argent.gele_subtitle')}
      />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl12_argent.loading')}
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-5 mb-4" style={{ background: `${p.red}17`, border: `1px solid ${p.red}44` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold" style={{ fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: p.red }}>
                {frozenOrdersCount > 0
                  ? t('sl12_argent.gele_hero_label_count', { count: frozenOrdersCount })
                  : t('sl12_argent.gele_hero_label')}
              </span>
              <span className="rounded-full font-bold" style={{ fontSize: 10.5, padding: '4px 9px', color: p.red, background: `${p.red}22` }}>
                {t('sl12_argent.gele_hero_pill')}
              </span>
            </div>
            <p className="font-black" style={{ fontSize: 28, color: p.red, letterSpacing: -0.5 }}>{formatXAF(frozenTotal)}</p>
            {frozenTotal === 0 ? (
              <p className="mt-2" style={{ fontSize: 12, color: p.textMuted, lineHeight: 1.5 }}>{t('sl12_argent.gele_hero_empty')}</p>
            ) : null}
          </div>

          {hasAnyActionable ? (
            <p className="font-bold mb-2" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.gele_to_unblock')}</p>
          ) : null}

          <div className="flex flex-col gap-3 mb-4">
            {openDisputes.map((d) => (
              <DisputeCard key={`d-${d.id}`} d={d} p={p} onOpen={() => navigate(`/seller/v2/litiges/${d.id}`)} />
            ))}
            {activeReturns.map((r) => (
              <ReturnCard
                key={`r-${r.id}`}
                r={r}
                amount={returnAmount(r)}
                p={p}
                onOpen={() => navigate(`/seller/v2/retours/${r.id}`)}
              />
            ))}
          </div>

          {!hasAnyActionable ? (
            <div className="rounded-2xl p-6 mb-4 text-center" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
              <Scale size={22} color={p.textMuted} className="mx-auto mb-2" />
              <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{t('sl12_argent.gele_empty_title')}</p>
              <p style={{ fontSize: 12, color: p.textMuted, marginTop: 4 }}>{t('sl12_argent.gele_empty_sub')}</p>
            </div>
          ) : null}

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="font-semibold mb-2" style={{ color: p.text }}>{t('sl12_argent.gele_how_causes_title')}</p>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={14} color={p.red} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{t('sl12_argent.gele_how_cause_dispute')}</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <PackageSearch size={14} color={p.red} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{t('sl12_argent.gele_how_cause_return')}</span>
            </div>
            <div className="flex items-start gap-2 mb-2">
              <ShieldQuestion size={14} color={p.red} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{t('sl12_argent.gele_how_cause_fraud')}</span>
            </div>
            <p className="mt-2">{t('sl12_argent.gele_how_tied_to_order')}</p>
            <p className="mt-1">{t('sl12_argent.gele_how_released_on_demand')}</p>
          </Collapsible>
        </>
      )}
    </div>
  );
}

function DisputeCard({
  d, p, onOpen,
}: { d: VendorDisputeListItem; p: ReturnType<typeof palette>; onOpen: () => void }) {
  const { t } = useTranslation();
  const expired = d.hours_remaining <= 0;
  const h = Math.max(0, Math.floor(d.hours_remaining));
  const m = Math.max(0, Math.round((d.hours_remaining - h) * 60));
  return (
    <div className="rounded-2xl p-4" style={{ background: p.card, border: `1px solid ${p.red}55`, borderLeftWidth: 3 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold uppercase" style={{ fontSize: 10.5, letterSpacing: 0.3, color: p.red }}>
          {t('sl12_argent.gele_card_dispute_label')} · {orderRef(d.order)}
        </span>
        <span className="font-black" style={{ fontSize: 14.5, color: p.red }}>{formatXAF(d.vendor_escrow_amount)}</span>
      </div>
      <p className="font-bold mb-2" style={{ fontSize: 13.5, color: p.text }}>« {d.reason_display} »</p>
      <p className="font-semibold mb-3" style={{ fontSize: 12, color: expired ? p.red : p.amber }}>
        {expired
          ? t('sl12_argent.gele_card_deadline_expired')
          : t('sl12_argent.gele_card_deadline', { h, m })}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-xl font-bold"
        style={{ padding: '11px 14px', fontSize: 13, minHeight: 44, background: p.orange, color: '#fff' }}
      >
        {t('sl12_argent.gele_card_dispute_cta')}
      </button>
    </div>
  );
}

function ReturnCard({
  r, amount, p, onOpen,
}: { r: OrderReturn; amount: number | null; p: ReturnType<typeof palette>; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl p-4" style={{ background: p.card, border: `1px solid ${p.red}55`, borderLeftWidth: 3 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold uppercase" style={{ fontSize: 10.5, letterSpacing: 0.3, color: p.red }}>
          {t('sl12_argent.gele_card_return_label')} · {orderRef(r.order)}
        </span>
        <span className="font-black" style={{ fontSize: 14.5, color: p.red }}>
          {amount !== null ? formatXAF(amount) : '—'}
        </span>
      </div>
      <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{r.order_item_title}</p>
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-xl font-semibold"
        style={{ padding: '11px 14px', fontSize: 12.5, minHeight: 44, color: p.text, border: `1px solid ${p.border}` }}
      >
        {t('sl12_argent.gele_card_return_cta')}
      </button>
    </div>
  );
}
