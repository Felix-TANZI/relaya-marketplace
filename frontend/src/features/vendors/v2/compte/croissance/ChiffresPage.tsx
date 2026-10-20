// frontend/src/features/vendors/v2/compte/croissance/ChiffresPage.tsx
// Écran "Mes chiffres" — VD-10 §NUM, Fig.11.
//
// Pont API : GET /api/vendors/stats/ (vendorsApi.getStats) existe bel et bien
// côté backend (backend/apps/vendors/views.py::vendor_stats), mais ne renvoie
// que des TOTAUX toutes périodes (total_products, active_products,
// total_orders, total_revenue) — jamais une fenêtre "30 derniers jours".
//
// MANQUE BACKEND pour tout le reste de la maquette VD-10 : pas de panier moyen
// déjà calculé côté serveur, pas de taux de retour, pas de vues/conversion,
// pas de répartition des ventes par produit, pas d'historique quotidien. On
// affiche les deux chiffres réels avec un libellé honnête ("total encaissé",
// jamais "30 derniers jours" puisque l'API ne sait pas filtrer par date), un
// panier moyen dérivé par un calcul pur (total ÷ commandes — pas une donnée
// inventée), et un "—" explicite partout où aucune donnée réelle n'existe
// (même discipline que MonScorePage / LesPaliersPage : règle V16, jamais de
// chiffre fabriqué).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorStats } from '@/services/api/vendors';
import { palette, primaryGradient } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { formatXAF } from '../shared/format';

export default function ChiffresPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorsApi.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalRevenue = stats ? Number(stats.total_revenue) : null;
  const totalOrders = stats?.total_orders ?? null;
  const hasSales = (totalOrders ?? 0) > 0;
  const avgBasket = hasSales && totalRevenue !== null ? totalRevenue / (totalOrders as number) : null;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl14_croissance.chiffres_title')} subtitle={t('sl14_croissance.chiffres_subtitle')} />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl14_croissance.loading')}
        </div>
      ) : (
        <>
          {/* Carte nuit — chiffre réel, jamais "30 derniers jours" (l'API ne filtre pas par date). */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: primaryGradient(p) }}>
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)' }}>{t('sl14_croissance.chiffres_hero_label')}</p>
            <p className="font-black text-white" style={{ fontSize: 28, letterSpacing: '-0.01em' }}>
              {hasSales ? formatXAF(totalRevenue) : '—'}
            </p>
            <p className="mt-1" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
              {hasSales ? t('sl14_croissance.chiffres_orders', { count: totalOrders ?? 0 }) : t('sl14_croissance.chiffres_empty_body')}
            </p>
          </div>

          {!hasSales ? (
            <div className="rounded-2xl p-4 mb-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
              <p className="font-bold mb-1" style={{ fontSize: 13, color: p.text }}>{t('sl14_croissance.chiffres_empty_title')}</p>
              <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl14_croissance.chiffres_empty_body')}</p>
            </div>
          ) : null}

          {/* Indicateurs — réels quand disponibles (panier moyen dérivé), "—" sinon. */}
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <StatRow p={p} label={t('sl14_croissance.chiffres_avg_basket')} sub={t('sl14_croissance.chiffres_avg_basket_sub')} value={avgBasket !== null ? formatXAF(avgBasket) : '—'} first />
            <StatRow p={p} label={t('sl14_croissance.chiffres_returns')} value={t('sl14_croissance.chiffres_unavailable')} />
            <StatRow p={p} label={t('sl14_croissance.chiffres_views')} value={t('sl14_croissance.chiffres_unavailable')} />
            <StatRow p={p} label={t('sl14_croissance.chiffres_conversion')} sub={t('sl14_croissance.chiffres_conversion_sub')} value={t('sl14_croissance.chiffres_unavailable')} />
          </div>

          {/* Répartition par produit — pas de donnée réelle, état vide honnête. */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <p className="font-bold mb-2" style={{ fontSize: 13.5, color: p.text }}>{t('sl14_croissance.chiffres_by_product_title')}</p>
            <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl14_croissance.chiffres_by_product_empty')}</p>

            <button
              type="button"
              onClick={() => navigate('/seller/v2/demande')}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mt-3 active:scale-[0.99] transition-transform"
              style={{ padding: '11px', background: p.orange, fontSize: 13 }}
            >
              <Search size={16} />
              {t('sl14_croissance.chiffres_demand_cta')}
            </button>
          </div>

          {/* Lien plans — reprend les paliers Boost/Pro déjà décrits dans sl11_compte.plans_*. */}
          <button
            type="button"
            onClick={() => navigate('/seller/v2/plans')}
            className="w-full flex items-center justify-between rounded-2xl mb-4 text-left"
            style={{ padding: '13px 14px', background: p.cardAlt, border: `1px solid ${p.border}` }}
          >
            <span style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl14_croissance.chiffres_plans_note')}</span>
          </button>

          <Collapsible title={t('sl14_croissance.how_it_works')}>
            <p>{t('sl14_croissance.chiffres_how')}</p>
          </Collapsible>
        </>
      )}
    </div>
  );
}

function StatRow({
  p, label, sub, value, first,
}: {
  p: ReturnType<typeof palette>;
  label: string;
  sub?: string;
  value: string;
  first?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '13px 14px', borderTop: first ? undefined : `1px solid ${p.border}` }}
    >
      <div className="min-w-0">
        <p className="font-semibold" style={{ fontSize: 13, color: p.text }}>{label}</p>
        {sub ? <p style={{ fontSize: 11, color: p.textMuted }}>{sub}</p> : null}
      </div>
      <span className="font-black flex-shrink-0 ml-2" style={{ fontSize: 15, color: p.text }}>{value}</span>
    </div>
  );
}
