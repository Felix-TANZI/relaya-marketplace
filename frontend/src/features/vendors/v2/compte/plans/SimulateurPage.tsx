// frontend/src/features/vendors/v2/compte/plans/SimulateurPage.tsx
// Écran "Le simulateur" — VD-10 §SIM, Fig.8.
// Dit la vérité : ce que le vendeur garderait ce mois avec chaque plan
// (formule SIM-01/M01 : gardé(plan) = ventes − commission prélevée − prix du
// plan). Calcul fait uniquement à partir des vraies valeurs renvoyées par
// vendorsApi.getPlans() (commission_rate, price_monthly_xaf) — jamais affichées
// en pourcentage brut à l'écran (règle produit : jamais 20/18/12/10/5 %).
//
// QUESTION OUVERTE : la grille de commission par plan renvoyée aujourd'hui par
// /api/vendors/plans/ peut encore refléter l'ancien barème (VD-D13.A02 demande
// son retrait) plutôt que la formule de remise D8 du VD-10 (bonus plafonné au
// prix du plan). Le calcul ci-dessous est donc correct arithmétiquement mais sa
// justesse dépend de la mise à jour du barème côté backend (hors périmètre ici).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type PlansResponse } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { formatXAF, mapLegacyPlanCode } from '../shared/format';

export default function SimulateurPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [data, setData] = useState<PlansResponse | null>(null);
  const [sales, setSales] = useState(60000);

  useEffect(() => {
    vendorsApi.getPlans().then(setData).catch(() => {});
  }, []);

  const plans = (data?.plans ?? []).filter((pl) => mapLegacyPlanCode(pl.code) !== 'CUSTOM');
  const kept = plans.map((pl) => {
    const commission = sales * (Number(pl.commission_rate) / 100);
    const value = Math.max(0, sales - commission - pl.price_monthly_xaf);
    return { plan: pl, value };
  });
  const bestValue = kept.length ? Math.max(...kept.map((k) => k.value)) : 0;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.sim_title')} />

      {/* Curseur de ventes */}
      <div className="rounded-2xl p-5 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
        <p className="mb-1" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.sim_sales_label')}</p>
        <p className="font-black mb-3" style={{ fontSize: 22, color: p.text }}>{formatXAF(sales)}</p>
        <input
          type="range"
          min={0}
          max={2000000}
          step={10000}
          value={sales}
          onChange={(e) => setSales(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: p.orange }}
        />
      </div>

      {/* 3 colonnes Free/Boost/Pro, meilleur cerclé de vert */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {kept.map(({ plan, value }) => {
          const isBest = value === bestValue && bestValue > 0;
          return (
            <div
              key={plan.id}
              className="rounded-2xl p-3 text-center"
              style={{ background: p.card, border: isBest ? `2px solid ${p.green}` : `1px solid ${p.border}` }}
            >
              <p className="font-bold mb-2" style={{ fontSize: 12, color: p.text }}>
                {t(`sl11_compte.plan_${mapLegacyPlanCode(plan.code).toLowerCase()}`)}
              </p>
              <p className="font-black" style={{ fontSize: 13.5, color: isBest ? p.green : p.text }}>
                {formatXAF(value)}
              </p>
              {!isBest && bestValue > value ? (
                <p style={{ fontSize: 10, color: p.textMuted }}>
                  {t('sl11_compte.sim_not_yet_profitable')}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <Collapsible title={t('sl11_compte.sim_detail_title')}>
        <p>{t('sl11_compte.sim_detail_body')}</p>
      </Collapsible>

      <button
        type="button"
        onClick={() => navigate('/seller/v2/se-faire-voir')}
        className="w-full rounded-2xl font-bold text-white mt-2"
        style={{ padding: '13px', background: p.orange, fontSize: 13.5 }}
      >
        {t('sl11_compte.sim_stay_free_cta')}
      </button>
    </div>
  );
}
