// frontend/src/features/vendors/v2/argent/DocumentsPage.tsx
// Écran « Documents » — VD-09 fig. 6. Relevés de vente, reçus de commande et
// factures de commission, pour la comptabilité du vendeur ou le support.
//
// Pont API (aucun nouveau endpoint) : vendorsApi.getOrders() + getProfile().
// Les relevés mensuels et les factures de commission sont recalculés ici
// côté client, par mois, à partir des mêmes champs déjà utilisés ailleurs
// (SellerPaymentsPage.tsx : vendor_subtotal, commission_rate,
// commission_amount, vendor_net_amount) — aucun montant n'est inventé.
//
// MANQUE BACKEND (volontairement honnête, pas de donnée fabriquée) :
//   - Pas de génération PDF côté serveur pour un relevé ou une facture de
//     commission : seul l'export CSV est réellement disponible (comme
//     SellerSettlementsPage.tsx / SellerPaymentsPage.tsx). Le bouton PDF du
//     mockup Documents.html (fig. 6) n'est donc pas reproduit tel quel.
//   - Les reçus de commande individuels, eux, existent réellement
//     (orderUtils.openInvoice, déjà utilisé par SellerPaymentsPage.tsx) : on
//     les réutilise tels quels plutôt que de les refaire.
//   - Pas de facture de commission "légale" avec RCCM/NIU/TVA : VendorProfile
//     n'expose aucun de ces champs. Le mockup mentionne un contrat vendeur
//     signé électroniquement et un identifiant RCCM/NIU — ni l'un ni l'autre
//     n'existe côté API vendeur aujourd'hui, donc la carte "Contrat et
//     données" ne montre pas de date de signature inventée : elle renvoie
//     vers le vrai écran Sécurité (/seller/v2/securite) et indique
//     explicitement qu'aucun document contractuel n'est pour l'instant
//     disponible au téléchargement.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Printer, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorOrder } from '@/services/api/vendors';
import { openInvoice } from '../../orderUtils';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import { formatXAF, formatPct } from '../compte/shared/format';

function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

interface MonthGroup {
  key: string; // "2026-09"
  label: string;
  isCurrent: boolean;
  orders: VendorOrder[];
  grossTotal: number;
  commissionTotal: number;
  netTotal: number;
}

function monthGroups(orders: VendorOrder[], locale: 'fr' | 'en'): MonthGroup[] {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const map = new Map<string, VendorOrder[]>();
  orders.forEach((o) => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const list = map.get(key) ?? [];
    list.push(o);
    map.set(key, list);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([key, list]) => {
      const [y, m] = key.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { month: 'long', year: 'numeric' });
      return {
        key,
        label,
        isCurrent: key === currentKey,
        orders: list,
        grossTotal: list.reduce((s, o) => s + (o.vendor_subtotal ?? 0), 0),
        commissionTotal: list.reduce((s, o) => s + (o.commission_amount ?? 0), 0),
        netTotal: list.reduce((s, o) => s + (o.vendor_net_amount ?? 0), 0),
      };
    });
}

function downloadCSV(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DocumentsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [shopName, setShopName] = useState('Ma Boutique');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([vendorsApi.getOrders(), vendorsApi.getProfile()])
      .then(([ords, profile]) => {
        if (cancelled) return;
        setOrders(ords);
        setShopName(profile.business_name);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => monthGroups(orders, locale), [orders, locale]);
  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
    [orders],
  );

  function exportStatement(g: MonthGroup) {
    downloadCSV(
      `belivay_releve_${shopName}_${g.key}.csv`,
      [
        t('sl12_argent.documents_csv_col_ref'), t('sl12_argent.documents_csv_col_date'),
        t('sl12_argent.documents_csv_col_gross'), t('sl12_argent.documents_csv_col_commission'),
        t('sl12_argent.documents_csv_col_net'), t('sl12_argent.documents_csv_col_status'),
      ],
      g.orders.map((o) => [
        orderRef(o.id), new Date(o.created_at).toLocaleDateString('fr-FR'),
        Math.round(o.vendor_subtotal ?? 0), Math.round(o.commission_amount ?? 0),
        Math.round(o.vendor_net_amount ?? 0), o.escrow_status_display,
      ]),
    );
  }

  function exportCommissionInvoice(g: MonthGroup) {
    downloadCSV(
      `belivay_facture_commission_${shopName}_${g.key}.csv`,
      [
        t('sl12_argent.documents_csv_col_ref'), t('sl12_argent.documents_csv_col_date'),
        t('sl12_argent.documents_csv_col_gross'), t('sl12_argent.documents_csv_col_commission_rate'),
        t('sl12_argent.documents_csv_col_commission'),
      ],
      g.orders.map((o) => [
        orderRef(o.id), new Date(o.created_at).toLocaleDateString('fr-FR'),
        Math.round(o.vendor_subtotal ?? 0), formatPct(o.commission_rate, 1),
        Math.round(o.commission_amount ?? 0),
      ]),
    );
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader
        title={t('sl12_argent.documents_title')}
        subtitle={t('sl12_argent.documents_subtitle')}
      />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl12_argent.loading')}
        </div>
      ) : (
        <>
          <SectionLabel p={p}>{t('sl12_argent.documents_section_statements')}</SectionLabel>
          {groups.length === 0 ? (
            <EmptyRow p={p} text={t('sl12_argent.documents_empty_statements')} />
          ) : (
            <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
              {groups.map((g) => (
                <div key={g.key} className="flex items-center gap-3" style={{ padding: '13px 14px', borderBottom: `1px solid ${p.border}` }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1A`, color: p.orange }}>
                    <FileText size={16} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold capitalize" style={{ fontSize: 13, color: p.text }}>{g.label}</span>
                    <span className="block" style={{ fontSize: 10.5, color: p.textMuted, marginTop: 1 }}>
                      {g.isCurrent
                        ? t('sl12_argent.documents_statement_in_progress')
                        : t('sl12_argent.documents_statement_order_count', { count: g.orders.length })}
                      {' · '}{formatXAF(g.netTotal)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => exportStatement(g)}
                    className="flex items-center gap-1.5 font-bold rounded-lg flex-shrink-0"
                    style={{ fontSize: 11.5, padding: '8px 11px', minHeight: 40, color: p.orange, border: `1px solid ${p.orange}55` }}
                  >
                    <Download size={13} /> CSV
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mb-4" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl12_argent.documents_pdf_unavailable')}</p>

          <SectionLabel p={p}>{t('sl12_argent.documents_section_receipts')}</SectionLabel>
          {recentOrders.length === 0 ? (
            <EmptyRow p={p} text={t('sl12_argent.documents_empty_receipts')} />
          ) : (
            <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
              {recentOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => openInvoice([o], shopName, t)}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ padding: '12px 14px', borderBottom: `1px solid ${p.border}` }}
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.cardAlt, color: p.textMuted }}>
                    <Printer size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold" style={{ fontSize: 12.5, color: p.orange }}>{orderRef(o.id)}</span>
                    <span className="block" style={{ fontSize: 10.5, color: p.textMuted, marginTop: 1 }}>
                      {new Date(o.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR')}
                    </span>
                  </span>
                  <span className="font-semibold flex-shrink-0" style={{ fontSize: 11, color: p.textMuted }}>
                    {t('sl12_argent.documents_receipt_cta')}
                  </span>
                </button>
              ))}
            </div>
          )}

          <SectionLabel p={p}>{t('sl12_argent.documents_section_invoices')}</SectionLabel>
          {groups.length === 0 ? (
            <EmptyRow p={p} text={t('sl12_argent.documents_empty_invoices')} />
          ) : (
            <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
              {groups.filter((g) => !g.isCurrent).map((g) => (
                <div key={g.key} className="flex items-center gap-3" style={{ padding: '13px 14px', borderBottom: `1px solid ${p.border}` }}>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold capitalize" style={{ fontSize: 13, color: p.text }}>{g.label}</span>
                    <span className="block" style={{ fontSize: 10.5, color: p.textMuted, marginTop: 1 }}>
                      {t('sl12_argent.documents_invoice_total', { amount: formatXAF(g.commissionTotal) })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => exportCommissionInvoice(g)}
                    className="flex items-center gap-1.5 font-bold rounded-lg flex-shrink-0"
                    style={{ fontSize: 11.5, padding: '8px 11px', minHeight: 40, color: p.text, border: `1px solid ${p.border}` }}
                  >
                    <Download size={13} /> CSV
                  </button>
                </div>
              ))}
              {groups.find((g) => g.isCurrent) ? (
                <div className="flex items-center gap-3" style={{ padding: '13px 14px' }}>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold capitalize" style={{ fontSize: 13, color: p.textMuted }}>
                      {groups.find((g) => g.isCurrent)?.label}
                    </span>
                    <span className="block" style={{ fontSize: 10.5, color: p.textMuted, marginTop: 1 }}>
                      {t('sl12_argent.documents_invoice_pending')}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          )}
          <p className="mb-4" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl12_argent.documents_invoice_legal_note')}</p>

          <SectionLabel p={p}>{t('sl12_argent.documents_section_legal')}</SectionLabel>
          <button
            type="button"
            onClick={() => navigate('/seller/v2/securite')}
            className="w-full flex items-center gap-3 rounded-2xl mb-4 text-left"
            style={{ padding: '14px', background: p.card, border: `1px solid ${p.border}` }}
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.green}1A`, color: p.green }}>
              <ShieldCheck size={16} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.documents_legal_title')}</span>
              <span className="block" style={{ fontSize: 10.5, color: p.textMuted, marginTop: 1 }}>{t('sl12_argent.documents_legal_sub')}</span>
            </span>
          </button>

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="mb-1.5">{t('sl12_argent.documents_how_1')}</p>
            <p>{t('sl12_argent.documents_how_2')}</p>
          </Collapsible>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children, p }: { children: React.ReactNode; p: ReturnType<typeof palette> }) {
  return (
    <p className="font-bold uppercase mb-2" style={{ fontSize: 11, letterSpacing: 0.5, color: p.textMuted }}>
      {children}
    </p>
  );
}

function EmptyRow({ text, p }: { text: string; p: ReturnType<typeof palette> }) {
  return (
    <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: p.cardAlt, border: `1px solid ${p.border}`, fontSize: 12, color: p.textMuted }}>
      {text}
    </div>
  );
}
