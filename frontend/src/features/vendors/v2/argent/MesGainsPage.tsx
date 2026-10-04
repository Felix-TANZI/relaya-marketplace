// frontend/src/features/vendors/v2/argent/MesGainsPage.tsx
// Écran "Mes gains" — VD-09 §fig.5 (Gains.html). Route recommandée :
// /seller/v2/argent/gains, écran ENFANT (flèche retour via <ScreenHeader>,
// pas dans V2_ROOT_PATHS — contrairement à MonArgentPage.tsx qui, lui, est
// un écran racine). Garde la même barre d'onglets "Résumé / Se libère / Gelé
// / Mes gains" que le mockup (Gains.html a à la fois une flèche retour ET
// les 4 onglets).
//
// Tout ce qui est affiché ici est borné au MOIS EN COURS, comme dans le
// mockup source : aucun endpoint dédié n'existe pour "mes gains" — construit
// à partir de vendorsApi.getOrders() filtrées sur escrow_status RELEASED et
// updated_at dans le mois en cours (même proxy "t_fermeture ≈ updated_at"
// documenté dans backend/apps/vendors/views_money_v2.py, limite n°2). Le
// montant "gardé" par produit est réparti au prorata de line_total_xaf sur
// vendor_subtotal quand une commande contient plusieurs produits — ce n'est
// pas un chiffre renvoyé tel quel par l'API, mais une répartition honnête
// d'un montant réel (jamais un montant inventé).
//
// "Impayés : 0 F" / "Transport : 0 F" reprennent des règles produit
// structurelles (pas de paiement à la livraison sur VendorOrder aujourd'hui —
// voir accueil/types.ts:27 — et la livraison est toujours à la charge du
// client, jamais du vendeur) : ce ne sont pas des champs API, mais des faits
// vrais de la plateforme, donc jamais "0 F" par défaut faute de donnée.

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette, DARK } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';
import Collapsible from '../compte/shared/Collapsible';
import {
  vendorsApi,
  type VendorOrder,
  type WithdrawalRequest,
} from '@/services/api/vendors';
import { vendorsV2Api, type VendorMoneySummary } from '@/services/api/vendorsV2';
import { formatXaf, formatDaysLeft, formatShortDate, formatCurrentMonthLabel, orderRef, isSameMonth } from './format';

const TABS = [
  { path: '/seller/v2/argent', labelKey: 'sl12_argent.resume_tab_label' },
  { path: '/seller/v2/argent/se-libere', labelKey: 'sl12_argent.se_libere_title' },
  { path: '/seller/v2/argent/gele', labelKey: 'sl12_argent.gele_title' },
  { path: '/seller/v2/argent/gains', labelKey: 'sl12_argent.gains_title' },
] as const;

/** Même barre que MonArgentPage.tsx — dupliquée volontairement (voir l'en-tête). */
function ArgentTabs() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex rounded-full p-1 mb-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className="flex-1 rounded-full font-bold transition-colors"
            style={{
              padding: '9px 6px',
              fontSize: 11.5,
              background: active ? p.card : 'transparent',
              color: active ? p.text : p.textMuted,
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : undefined,
            }}
          >
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

interface ProductAgg { productId: number; title: string; qty: number; keptXaf: number }

export default function MesGainsPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const locale = i18n.language.startsWith('en') ? 'en' : 'fr';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [money, setMoney] = useState<VendorMoneySummary | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, ords, wds] = await Promise.all([
        vendorsV2Api.getMoneySummary(),
        vendorsApi.getOrders().catch(() => [] as VendorOrder[]),
        vendorsApi.getWithdrawals().catch(() => [] as WithdrawalRequest[]),
      ]);
      setMoney(m);
      setOrders(ords);
      setWithdrawals(wds);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="pb-24">
        <ScreenHeader title={t('sl12_argent.gains_title')} subtitle={t('sl12_argent.gains_subtitle')} />
        <ArgentTabs />
        <div className="rounded-2xl animate-pulse mb-4" style={{ height: 170, background: p.cardAlt }} />
        <div className="rounded-2xl animate-pulse" style={{ height: 220, background: p.cardAlt }} />
      </div>
    );
  }

  if (error || !money) {
    return (
      <div className="pb-24">
        <ScreenHeader title={t('sl12_argent.gains_title')} subtitle={t('sl12_argent.gains_subtitle')} />
        <ArgentTabs />
        <div className="rounded-2xl p-5 text-center mt-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.gains_error_title')}</p>
          {error ? <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{error}</p> : null}
          <button
            type="button"
            onClick={() => load()}
            className="rounded-xl font-bold px-5"
            style={{ minHeight: 44, background: p.orange, color: '#fff', fontSize: 13 }}
          >
            {t('sl12_argent.gains_error_retry')}
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const releasedThisMonth = orders
    .filter((o) => o.escrow_status === 'RELEASED' && isSameMonth(o.updated_at, now))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const monthlySalesXaf = releasedThisMonth.reduce((sum, o) => sum + o.vendor_subtotal, 0);
  const monthlyKeptXaf = releasedThisMonth.reduce((sum, o) => sum + o.vendor_net_amount, 0);
  const lifetimeEarnedXaf = money.to_pay.amount_xaf + money.paid_out.amount_xaf;

  const approvedFeesXaf = withdrawals
    .filter((w) => w.status === 'APPROVED')
    .reduce((sum, w) => sum + w.fee_amount_xaf, 0);

  // Répartition par produit (prorata line_total_xaf / vendor_subtotal — voir l'en-tête).
  const productMap = new Map<number, ProductAgg>();
  for (const o of releasedThisMonth) {
    const vendorSubtotal = o.vendor_subtotal || o.items.reduce((s, it) => s + it.line_total_xaf, 0);
    for (const it of o.items) {
      const share = vendorSubtotal > 0 ? it.line_total_xaf / vendorSubtotal : 0;
      const keptForItem = Math.round(o.vendor_net_amount * share);
      const existing = productMap.get(it.product);
      if (existing) {
        existing.qty += it.qty;
        existing.keptXaf += keptForItem;
      } else {
        productMap.set(it.product, { productId: it.product, title: it.product_title, qty: it.qty, keptXaf: keptForItem });
      }
    }
  }
  const topProducts = Array.from(productMap.values()).sort((a, b) => b.keptXaf - a.keptXaf).slice(0, 3);
  const maxKept = topProducts[0]?.keptXaf ?? 0;

  return (
    <div className="pb-24">
      <ScreenHeader title={t('sl12_argent.gains_title')} subtitle={t('sl12_argent.gains_subtitle')} />
      <ArgentTabs />

      {/* Carte nuit — gardé ce mois-ci + repères lifetime / prochaine libération. */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: DARK.card, border: `1px solid ${DARK.border}` }}>
        <p className="font-bold uppercase mb-1.5" style={{ fontSize: 10.5, letterSpacing: '.1em', color: 'rgba(255,255,255,.55)' }}>
          {t('sl12_argent.gains_hero_kicker', { month: formatCurrentMonthLabel(locale) })}
        </p>
        <p className="font-black mb-2" style={{ fontSize: 30, color: '#fff', letterSpacing: '-.02em' }}>
          {formatXaf(monthlyKeptXaf)}
        </p>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)' }}>
          {t('sl12_argent.gains_hero_sub', { amount: formatXaf(monthlySalesXaf) })}
        </p>

        <div className="h-px my-3.5" style={{ background: 'rgba(255,255,255,.14)' }} />

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.06em', color: 'rgba(255,255,255,.55)' }}>
              {t('sl12_argent.gains_lifetime_label')}
            </p>
            <p className="font-black mt-1" style={{ fontSize: 17, color: '#fff' }}>{formatXaf(lifetimeEarnedXaf)}</p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)' }}>{t('sl12_argent.gains_lifetime_sub')}</p>
          </div>
          <div className="text-right">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.06em', color: 'rgba(255,255,255,.55)' }}>
              {t('sl12_argent.gains_next_label')}
            </p>
            <p className="font-black mt-1" style={{ fontSize: 17, color: DARK.amber }}>
              {money.releasing.amount_xaf > 0 ? formatXaf(money.releasing.amount_xaf) : '—'}
            </p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)' }}>
              {money.releasing.amount_xaf > 0
                ? t('sl12_argent.gains_next_sub', { when: formatDaysLeft(money.releasing.days_left, locale) })
                : t('sl12_argent.gains_next_none')}
            </p>
          </div>
        </div>
      </div>

      {/* Par vente */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.gains_by_sale_title')}</p>
          <span className="font-bold" style={{ fontSize: 11, color: p.textMuted }}>{t('sl12_argent.gains_by_sale_badge')}</span>
        </div>
        {releasedThisMonth.length === 0 ? (
          <div className="text-center py-5">
            <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl12_argent.gains_empty_title')}</p>
            <p className="mt-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl12_argent.gains_empty_sub')}</p>
          </div>
        ) : releasedThisMonth.map((o) => {
          const firstItem = o.items[0];
          const extra = o.items.length > 1 ? ` +${o.items.length - 1}` : '';
          return (
            <div key={o.id} className="flex items-center gap-3" style={{ padding: '10px 0', borderTop: `1px solid ${p.border}` }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: p.cardAlt }}>
                {firstItem?.product_image ? (
                  <img src={firstItem.product_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package size={18} color={p.textMuted} />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate" style={{ fontSize: 12.5, color: p.text }}>
                  {orderRef(o.id)} · {firstItem?.product_title ?? ''}{extra}
                </span>
                <span className="block" style={{ fontSize: 11, color: p.textMuted }}>
                  {t('sl12_argent.gains_sale_sub', { amount: formatXaf(o.vendor_subtotal), date: formatShortDate(o.updated_at, locale) })}
                </span>
              </span>
              <span className="font-black flex-shrink-0" style={{ fontSize: 14, color: p.green }}>{formatXaf(o.vendor_net_amount)}</span>
            </div>
          );
        })}
      </div>

      {/* Par produit */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.gains_by_product_title')}</p>
        {topProducts.length === 0 ? (
          <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl12_argent.gains_by_product_empty')}</p>
        ) : (
          <>
            {topProducts.map((prod) => (
              <div key={prod.productId} className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate" style={{ fontSize: 12, color: p.text }}>
                    {t('sl12_argent.gains_by_product_row', { title: prod.title, qty: prod.qty })}
                  </span>
                  <span className="font-black flex-shrink-0" style={{ fontSize: 12.5, color: p.text }}>{formatXaf(prod.keptXaf)}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: p.cardAlt }}>
                  <div className="h-full rounded-full" style={{ width: `${maxKept > 0 ? Math.max(4, (prod.keptXaf / maxKept) * 100) : 0}%`, background: p.orange }} />
                </div>
              </div>
            ))}
            <p className="mt-1" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl12_argent.gains_by_product_sub')}</p>
          </>
        )}
      </div>

      {/* Retiré et disponible */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="font-bold mb-2" style={{ fontSize: 14, color: p.text }}>{t('sl12_argent.gains_paid_title')}</p>
        <div className="flex items-center justify-between" style={{ padding: '8px 0', borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl12_argent.gains_paid_already', { fees: formatXaf(approvedFeesXaf) })}</span>
          <span className="font-black" style={{ fontSize: 13.5, color: p.text }}>{formatXaf(money.paid_out.amount_xaf)}</span>
        </div>
        <div className="flex items-center justify-between" style={{ padding: '8px 0', borderTop: `1px solid ${p.border}` }}>
          <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl12_argent.gains_paid_available')}</span>
          <span className="font-black" style={{ fontSize: 13.5, color: p.green }}>{formatXaf(money.to_pay.amount_xaf)}</span>
        </div>
      </div>

      {/* Tuiles "Impayés" / "Transport" — faits structurels de la plateforme, pas des champs API (voir l'en-tête). */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-3.5" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.06em', color: p.textMuted }}>{t('sl12_argent.gains_unpaid_tile_label')}</p>
          <p className="font-black mt-1" style={{ fontSize: 18, color: p.green }}>{formatXaf(0)}</p>
          <p className="mt-1" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl12_argent.gains_unpaid_tile_sub')}</p>
        </div>
        <div className="rounded-2xl p-3.5" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.06em', color: p.textMuted }}>{t('sl12_argent.gains_transport_tile_label')}</p>
          <p className="font-black mt-1" style={{ fontSize: 18, color: p.green }}>{formatXaf(0)}</p>
          <p className="mt-1" style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl12_argent.gains_transport_tile_sub')}</p>
        </div>
      </div>

      <Collapsible title={t('sl12_argent.gains_how_it_works')}>
        <p className="mb-1.5">{t('sl12_argent.gains_how_1')}</p>
        <p>{t('sl12_argent.gains_how_2')}</p>
      </Collapsible>
    </div>
  );
}
