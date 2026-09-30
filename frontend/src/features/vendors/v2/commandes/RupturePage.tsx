// frontend/src/features/vendors/v2/commandes/RupturePage.tsx
// Écran « Rupture » — VD-05 §RUP-01 à RUP-04.
// Route recommandée : /seller/v2/commandes/:id/rupture
// Conséquences écrites avant la confirmation (RUP-01/04). Bridge : pas de
// POST /orders/{id}/stockout côté backend — reportStockout() (helpers.ts)
// rejoue CANCELLED (transition déjà supportée) + remise du stock à 0 sur les
// produits de la commande. L'annulation directe par le vendeur est retirée
// (VD-D06.A13) : la rupture la remplace.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, Inbox, RefreshCw } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, Collapsible, GhostRow, PageHeader, Toggle } from './ui';
import { itemsSummary, orderRef, reportStockout, useOrder } from './helpers';

export default function RupturePage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);
  const [setStockZero, setSetStockZero] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const summary = itemsSummary(order);

  async function handleConfirm() {
    if (!order) return;
    setSaving(true);
    setActionError(null);
    try {
      const productIds = order.items.map((it) => it.product);
      await reportStockout(order.id, productIds, setStockZero);
      setDone(true);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="pb-24 pt-2">
        <PageHeader title={t('sl7_commandes.rupture_title')} p={p} />
        <Card p={p} accent={p.amber}>
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl7_commandes.rupture_done_title')}</p>
          <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
            {t('sl7_commandes.rupture_done_detail')}
          </p>
        </Card>
        <div className="mt-4">
          <GhostRow p={p} onClick={() => navigate('/seller/v2/commandes')}>
            <span>{t('sl7_commandes.back_to_list')}</span>
          </GhostRow>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.rupture_title')} subtitle={t('sl7_commandes.rupture_subtitle')} onBack={() => navigate(-1)} p={p} />

      <Card p={p}>
        <div className="flex items-center gap-2 mb-1">
          <AlertOctagon size={16} color={p.amber} />
          <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>
            {summary.title}{summary.qty > 1 ? ` ×${summary.qty}` : ''}
          </p>
        </div>
        <p style={{ fontSize: 11.5, color: p.textMuted }}>{orderRef(order.id)}</p>
      </Card>

      <p className="font-black uppercase mt-4 mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl7_commandes.rupture_consequences_title')}
      </p>
      <Card p={p}>
        <ul className="flex flex-col gap-2">
          {(['next_vendor', 'refund_today', 'no_fee', 'punctuality'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2" style={{ fontSize: 13, color: p.text, lineHeight: 1.4 }}>
              <span className="mt-1.5 flex-shrink-0 rounded-full" style={{ width: 5, height: 5, background: p.amber }} />
              {t(`sl7_commandes.rupture_consequence_${k}`)}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-3">
        <Collapsible title={t('sl7_commandes.how_it_works')} p={p}>
          {t('sl7_commandes.rupture_how')}
        </Collapsible>
      </div>

      <div className="mt-3">
        <Toggle checked={setStockZero} onChange={setSetStockZero} label={t('sl7_commandes.rupture_toggle_stock_zero')} p={p} />
      </div>

      {actionError ? <p className="mt-3" style={{ fontSize: 12, color: p.red }}>{actionError}</p> : null}

      <div className="flex flex-col gap-2 mt-5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="w-full rounded-2xl font-bold text-white disabled:opacity-60"
          style={{ background: p.red, padding: '14px 18px', fontSize: 14.5, minHeight: 48 }}
        >
          {saving ? t('sl7_commandes.saving') : t('sl7_commandes.rupture_confirm')}
        </button>
        <GhostRow p={p} onClick={() => navigate(-1)}>
          <span className="w-full text-center">{t('sl7_commandes.rupture_cancel')}</span>
        </GhostRow>
      </div>
    </div>
  );
}
