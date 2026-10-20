import { useTranslation } from 'react-i18next';
import { CreditCard, Package, Percent, ShieldCheck } from 'lucide-react';
import { useAdminTheme } from '@/hooks/useAdminTheme';

const PLANS = [
  { key: 'FREE', labelKey: 'ad6_fin_commissions.plan_free', fee: 12, monthly: '0 FCFA' },
  { key: 'STARTER', labelKey: 'ad6_fin_commissions.plan_starter', fee: 10, monthly: '9 900 FCFA' },
  { key: 'PRO', labelKey: 'ad6_fin_commissions.plan_pro', fee: 7, monthly: '24 900 FCFA' },
  { key: 'BUSINESS', labelKey: 'ad6_fin_commissions.plan_business', fee: 5, monthly: '59 900 FCFA' },
];

const CATEGORIES = [
  { nameKey: 'ad6_fin_commissions.category_fashion', base: 1, volumeKey: 'ad6_fin_commissions.volume_high' },
  { nameKey: 'ad6_fin_commissions.category_electronics', base: 2, volumeKey: 'ad6_fin_commissions.volume_very_high' },
  { nameKey: 'ad6_fin_commissions.category_beauty', base: 0, volumeKey: 'ad6_fin_commissions.volume_medium' },
  { nameKey: 'ad6_fin_commissions.category_home', base: 1, volumeKey: 'ad6_fin_commissions.volume_medium' },
  { nameKey: 'ad6_fin_commissions.category_supermarket', base: -1, volumeKey: 'ad6_fin_commissions.volume_high' },
  { nameKey: 'ad6_fin_commissions.category_sport', base: 0, volumeKey: 'ad6_fin_commissions.volume_medium' },
  { nameKey: 'ad6_fin_commissions.category_baby', base: 0, volumeKey: 'ad6_fin_commissions.volume_stable' },
];

export default function CommissionsPage() {
  const T = useAdminTheme();
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: T.text }}>
            {t('ad6_fin_commissions.title')}
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: T.muted }}>
            {t('ad6_fin_commissions.subtitle')}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold"
          style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text }}>
          <ShieldCheck size={14} style={{ color: T.red }} />
          {t('ad6_fin_commissions.internal_reference')}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <article key={plan.key} className="rounded-2xl p-4"
            style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: T.red + '12', color: T.red }}>
                <CreditCard size={17} />
              </div>
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>{plan.monthly}</span>
            </div>
            <h2 style={{ marginTop: 14, color: T.text, fontSize: 18, fontWeight: 800 }}>{t(plan.labelKey)}</h2>
            <p style={{ marginTop: 4, color: T.muted, fontSize: 12 }}>
              {t('ad6_fin_commissions.standard_commission_from')} <strong style={{ color: T.text }}>{plan.fee}%</strong>
            </p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
          <Package size={15} style={{ color: T.red }} />
          <h2 style={{ color: T.text, fontSize: 14, fontWeight: 800 }}>{t('ad6_fin_commissions.table_title')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>{t('ad6_fin_commissions.th_category')}</th>
                {PLANS.map((plan) => (
                  <th key={plan.key} style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>
                    {t(plan.labelKey)}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', textAlign: 'left', color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>{t('ad6_fin_commissions.th_volume')}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((category) => (
                <tr key={category.nameKey} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '14px 16px', color: T.text, fontSize: 13, fontWeight: 700 }}>{t(category.nameKey)}</td>
                  {PLANS.map((plan) => (
                    <td key={plan.key} style={{ padding: '14px 16px' }}>
                      <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-black"
                        style={{ background: T.red + '10', color: T.red }}>
                        <Percent size={12} />
                        {Math.max(3, plan.fee + category.base)}%
                      </span>
                    </td>
                  ))}
                  <td style={{ padding: '14px 16px', color: T.muted, fontSize: 12, fontWeight: 700 }}>{t(category.volumeKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
