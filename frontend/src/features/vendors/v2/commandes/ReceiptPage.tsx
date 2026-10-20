// frontend/src/features/vendors/v2/commandes/ReceiptPage.tsx
// Écran « Reçu vendeur » — VD-06 §RCU-01 à RCU-04.
// Route recommandée : /seller/v2/commandes/:id/recu
// Prix de vente et "Vous gardez" seulement, aucune ligne de commission
// (RCU-01) ; ni nom, ni numéro, ni adresse du client (RCU-03) — l'identité
// est explicitement affichée comme masquée plutôt qu'omise en silence, pour
// que le vendeur comprenne que ce n'est pas un oubli. La commission réelle
// n'apparaît que sur la facture mensuelle (RCU-02, hors périmètre de cet
// écran — lien vers Documents).

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Inbox, RefreshCw, Share2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, Collapsible, DocumentHeader, GhostRow, PageHeader, ProductThumb } from './ui';
import { fmtDateTime, fmtXAF, itemsSummary, orderRef, useOrder } from './helpers';

export default function ReceiptPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const summary = itemsSummary(order);

  async function handleShare() {
    const text = `${t('sl7_commandes.receipt_title')} ${orderRef(order!.id)} — ${t('sl7_commandes.you_keep')} : ${fmtXAF(order!.vendor_net_amount)}`;
    if (navigator.share) {
      try { await navigator.share({ title: t('sl7_commandes.receipt_title'), text }); return; } catch { /* annulé */ }
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(text).catch(() => {});
  }

  const rows: { labelKey: string; value: string }[] = [
    { labelKey: 'receipt_row_article', value: `${summary.title}${summary.qty > 1 ? ` ×${summary.qty}` : ''}` },
    { labelKey: 'receipt_row_customer', value: t('sl7_commandes.receipt_identity_masked') },
    { labelKey: 'receipt_row_collected_by', value: t('sl7_commandes.receipt_collected_by_value') },
    { labelKey: 'receipt_row_sale_price', value: fmtXAF(order.vendor_subtotal) },
  ];

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.receipt_title')} onBack={() => navigate(-1)} p={p} />

      <DocumentHeader
        label={t('sl7_commandes.receipt_document_label')}
        refText={orderRef(order.id)}
        lines={[t('sl7_commandes.receipt_row_date') + ' ' + fmtDateTime(order.created_at)]}
      />

      <Card p={p}>
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={r.labelKey} className="flex items-center justify-between" style={{ borderTop: i > 0 ? `1px solid ${p.border}` : undefined, paddingTop: i > 0 ? 8 : 0 }}>
              <span style={{ fontSize: 12, color: p.textMuted }}>{t(`sl7_commandes.${r.labelKey}`)}</span>
              {r.labelKey === 'receipt_row_article' ? (
                <span className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <ProductThumb imageUrl={summary.imageUrl} size={28} p={p} />
                  <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600, textAlign: 'right' }}>{r.value}</span>
                </span>
              ) : (
                <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600, textAlign: 'right' }}>{r.value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${p.border}` }}>
          <span className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl7_commandes.you_keep')}</span>
          <span className="font-black" style={{ fontSize: 22, color: p.green }}>{fmtXAF(order.vendor_net_amount)}</span>
        </div>

        <p className="mt-3 text-center" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl7_commandes.receipt_not_invoice')}</p>
      </Card>

      <div className="mt-3">
        <Collapsible title={t('sl7_commandes.receipt_mandatary_title')} p={p}>{t('sl7_commandes.receipt_mandatary_detail')}</Collapsible>
      </div>

      <div className="flex flex-col gap-2 mt-5">
        <button
          type="button"
          onClick={handleShare}
          className="w-full rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: p.orange, padding: '13px', fontSize: 13.5, minHeight: 48 }}
        >
          <Share2 size={16} /> {t('sl7_commandes.receipt_share')}
        </button>
        <GhostRow p={p} onClick={() => navigate('/seller/payments')}>
          <span className="flex items-center gap-2"><FileText size={15} /> {t('sl7_commandes.receipt_see_documents')}</span>
        </GhostRow>
      </div>
    </div>
  );
}
