// frontend/src/features/vendors/v2/commandes/PreparationSlipPage.tsx
// Écran « Bon de préparation » — VD-05 §BON-01/02.
// Route recommandée : /seller/v2/commandes/:id/bon-de-preparation
// Aucune donnée client ni lieu de retrait (BON-01) ; le code de remise ne
// figure jamais sur le bon (BON-02). Bridge : pas de GET /orders/{id}/slip —
// le bon est construit côté client depuis vendorsApi.getOrderDetail(), sur le
// même principe d'overlay imprimable que vendorsApi.openProductSheet().
// La classe de colis (parcel_class) n'a pas de champ dédié côté API
// aujourd'hui (parcelClassOf → null) : la ligne est masquée plutôt qu'inventée.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Inbox, Printer, RefreshCw, Share2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../theme';
import { Card, CenterState, DocumentHeader, PageHeader, ProductThumb } from './ui';
import {
  fmtDateTime, fmtXAF, itemsSummary, orderRef, parcelClassOf, preparationWindowLabel, useOrder,
} from './helpers';

const CHECK_KEYS = ['model', 'tested', 'accessories', 'box'] as const;

export default function PreparationSlipPage() {
  const { id } = useParams();
  const orderId = id ? Number(id) : undefined;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { order, loading, error } = useOrder(orderId);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  if (loading) {
    return <CenterState icon={<RefreshCw size={22} color={p.textMuted} />} title={t('sl7_commandes.loading')} p={p} />;
  }
  if (error || !order) {
    return <CenterState icon={<Inbox size={22} color={p.red} />} title={error ?? t('sl7_commandes.not_found')} p={p} />;
  }

  const summary = itemsSummary(order);
  const parcelClass = parcelClassOf(order);

  function buildSlipHtml(): string {
    const rows = CHECK_KEYS.map((k) => `<li>${t(`sl7_commandes.slip_check_${k}`)}</li>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>${t('sl7_commandes.slip_title')} ${orderRef(order!.id)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#1A1209;}
        h1{font-size:20px;margin:0 0 4px;}
        .muted{color:#7C6E5A;font-size:12px;}
        .article{font-size:22px;font-weight:900;margin:18px 0 4px;}
        .article-row{display:flex;align-items:center;gap:14px;margin-top:18px;}
        .article-row img{width:56px;height:56px;object-fit:cover;border-radius:12px;border:1px solid #E8E2D9;}
        ul{padding-left:18px;font-size:13px;line-height:1.7;}
        .keep{font-size:18px;font-weight:900;color:#16A34A;margin-top:18px;}
        .box{border:1px solid #E8E2D9;border-radius:12px;padding:12px;margin-top:14px;font-size:12.5px;}
      </style></head><body>
      <h1>${t('sl7_commandes.slip_title')}</h1>
      <p class="muted">${orderRef(order!.id)}${parcelClass ? ` · ${parcelClass}` : ''}</p>
      <p class="muted">${t('sl7_commandes.slip_paid_at', { time: fmtDateTime(order!.created_at) })}</p>
      <p class="muted">${t('sl7_commandes.slip_deadline', { time: preparationWindowLabel(order!) })}</p>
      <div class="article-row">
        ${summary.imageUrl ? `<img src="${summary.imageUrl}" alt="" />` : ''}
        <p class="article" style="margin:0;">${summary.title}${summary.qty > 1 ? ` ×${summary.qty}` : ''}</p>
      </div>
      <p class="muted">${t('sl7_commandes.slip_check_title')}</p>
      <ul>${rows}</ul>
      <p style="font-weight:700;">${t('sl7_commandes.slip_dont_close')}</p>
      <div class="box">${t('sl7_commandes.slip_pickup_note')}</div>
      <p class="keep">${t('sl7_commandes.you_keep')} : ${fmtXAF(order!.vendor_net_amount)}</p>
      </body></html>`;
  }

  function handlePrint() {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%', border: 'none', zIndex: '9999',
    });
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(buildSlipHtml());
    iframe.contentDocument?.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };
    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    window.setTimeout(cleanup, 60_000);
    iframe.contentWindow?.addEventListener('afterprint', cleanup);
  }

  async function handleShare() {
    const text = `${t('sl7_commandes.slip_title')} ${orderRef(order!.id)} — ${summary.title}`;
    if (navigator.share) {
      try { await navigator.share({ title: t('sl7_commandes.slip_title'), text }); return; } catch { /* annulé par l'utilisateur */ }
    }
    handlePrint();
  }

  return (
    <div className="pb-24 pt-2">
      <PageHeader title={t('sl7_commandes.slip_title')} onBack={() => navigate(-1)} p={p} />

      <DocumentHeader
        label={t('sl7_commandes.slip_document_label')}
        refText={orderRef(order.id)}
        badge={parcelClass ?? undefined}
        lines={[
          t('sl7_commandes.slip_paid_at', { time: fmtDateTime(order.created_at) }),
          t('sl7_commandes.slip_deadline', { time: preparationWindowLabel(order) }),
        ]}
      />

      <Card p={p}>
        <div className="flex items-center gap-3">
          <ProductThumb imageUrl={summary.imageUrl} size={52} p={p} />
          <p className="font-black" style={{ fontSize: 20, color: p.text }}>
            {summary.title}{summary.qty > 1 ? ` ×${summary.qty}` : ''}
          </p>
        </div>
      </Card>

      <p className="font-black uppercase mt-4 mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
        {t('sl7_commandes.slip_check_title')}
      </p>
      <Card p={p}>
        <div className="flex flex-col gap-2">
          {CHECK_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-3" style={{ minHeight: 44 }}>
              <input
                type="checkbox"
                checked={Boolean(checks[k])}
                onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 13, color: p.text }}>{t(`sl7_commandes.slip_check_${k}`)}</span>
            </label>
          ))}
        </div>
      </Card>

      <p className="font-bold mt-3" style={{ fontSize: 13, color: p.red }}>{t('sl7_commandes.slip_dont_close')}</p>

      <div className="rounded-2xl p-4 mt-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
        <p style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>{t('sl7_commandes.slip_pickup_note')}</p>
      </div>

      <div className="mt-4 px-1 flex items-center justify-between">
        <span style={{ fontSize: 12.5, color: p.textMuted, fontWeight: 600 }}>{t('sl7_commandes.you_keep')}</span>
        <span className="font-black" style={{ fontSize: 18, color: p.green }}>{fmtXAF(order.vendor_net_amount)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-5">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-2xl font-bold flex items-center justify-center gap-2"
          style={{ background: p.card, border: `1px solid ${p.border}`, color: p.text, padding: '13px', fontSize: 13.5, minHeight: 48 }}
        >
          <Printer size={16} /> {t('sl7_commandes.slip_print')}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: p.orange, padding: '13px', fontSize: 13.5, minHeight: 48 }}
        >
          <Share2 size={16} /> {t('sl7_commandes.slip_share')}
        </button>
      </div>
    </div>
  );
}
