// frontend/src/features/vendors/v2/compte/plans/LesPlansPage.tsx
// Écran "Les plans" — VD-10 §PLN, Fig.6/7 — onglet "Les plans" de l'écran
// "Plans & tarifs" (voir PlansTabs.tsx). Free/Boost/Pro/Sur-mesure — JAMAIS les
// anciens plans Gratuit/Starter/Pro/Business et leurs taux 20/18/12/10/5 %
// (retirés de la production, VD-D13.A02).
//
// Correction VD-D14 (comparaison aux vraies maquettes, Plans.jpg) : le contenu
// des 3 plans Free/Boost/Pro (prix, fonctionnalités à puces) est en réalité
// LARGEMENT STATIQUE côté produit — ce ne sont pas des données vendeur, mais
// la grille tarifaire elle-même (0 F / 2 500 F / 7 500 F, mêmes fonctionnalités
// pour tout le monde). Elle est donc écrite en dur ici plutôt que dépendue de
// vendorsApi.getPlans(), dont les objets renvoyés portent encore les noms de
// code ET les prix de l'ANCIEN barème (STARTER/PRO/BUSINESS, commission_rate
// 20/18/12/10/5 % — voir shared/format.ts::mapLegacyPlanCode). Seules restent
// branchées sur l'API les parties réellement propres au vendeur : son plan
// actif (vendorsApi.getPlans().active_plan_code, pour la pastille "Plan
// actuel") et sa progression dans l'offre de découverte (vendorsApi.getStats().
// total_orders, pour la barre "X commandes sur 50").

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, BarChart3, Gift, Sparkles } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type PlansResponse, type WithdrawalOperator } from '@/services/api/vendors';
import { palette } from '../../theme';
import PlansTabs from './PlansTabs';
import Collapsible from '../shared/Collapsible';
import { formatXAF, mapLegacyPlanCode, buildWhatsAppSupportLink, type SellerPlanKey } from '../shared/format';

/** Offre de découverte (Free uniquement) — VD-10 §PLN, plafond canonique. */
const DISCOVERY_MAX_ORDERS = 50;

type PaidPlanKey = 'BOOST' | 'PRO';

/** Code backend réel à envoyer à subscribePlan() pour chaque plan payant — bijection fixe avec mapLegacyPlanCode. */
const BACKEND_CODE: Record<PaidPlanKey, 'STARTER' | 'PRO'> = { BOOST: 'STARTER', PRO: 'PRO' };

/** Grille tarifaire canonique (Plans.jpg) — jamais fabriquée, jamais dépendue du backend legacy. */
const STATIC_PLANS = {
  FREE: { priceMonthly: 0, priceAnnual: null as number | null, featureKeys: ['plans_free_feature_1', 'plans_free_feature_2', 'plans_free_feature_3'] },
  BOOST: { priceMonthly: 2500, priceAnnual: 25000, featureKeys: ['plans_boost_feature_1', 'plans_boost_feature_2', 'plans_boost_feature_3', 'plans_boost_feature_4'] },
  PRO: { priceMonthly: 7500, priceAnnual: 75000, featureKeys: ['plans_pro_feature_1', 'plans_pro_feature_2', 'plans_pro_feature_3', 'plans_pro_feature_4'] },
} as const;

export default function LesPlansPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [data, setData] = useState<PlansResponse | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trialSheet, setTrialSheet] = useState<PaidPlanKey | null>(null);
  const [operator, setOperator] = useState<WithdrawalOperator>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      vendorsApi.getPlans().catch(() => null),
      vendorsApi.getStats().catch(() => null),
    ]).then(([plansData, stats]) => {
      setData(plansData);
      setTotalOrders(stats?.total_orders ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  // Repli honnête : la plupart des boutiques démarrent sur Free (VD-D14) ;
  // dès que getPlans() répond, la pastille "Plan actuel" reflète la vraie valeur.
  const activePlanKey: SellerPlanKey = mapLegacyPlanCode(data?.active_plan_code ?? 'FREE');
  const isCurrent = (key: SellerPlanKey) => activePlanKey === key;

  const discoveryOrders = Math.min(totalOrders, DISCOVERY_MAX_ORDERS);
  const discoveryPct = (discoveryOrders / DISCOVERY_MAX_ORDERS) * 100;

  const handleTrialConfirm = async () => {
    if (!trialSheet || !phone.trim()) return;
    setBusy(true);
    try {
      await vendorsApi.subscribePlan({
        plan_code: BACKEND_CODE[trialSheet],
        billing_cycle: 'MONTHLY',
        operator,
        phone_number: phone.trim(),
      });
      setFeedback(t('sl11_compte.plans_trial_success'));
      setTrialSheet(null);
    } catch {
      setFeedback(t('sl11_compte.plans_trial_error'));
    } finally {
      setBusy(false);
    }
  };

  const featureList = (keys: readonly string[]) => (
    <ul className="space-y-1.5 mb-3">
      {keys.map((k) => (
        <li key={k} className="flex items-start gap-1.5" style={{ fontSize: 12, color: p.textMuted }}>
          <Check size={13} color={p.green} className="flex-shrink-0 mt-0.5" />
          <span>{t(`sl11_compte.${k}`)}</span>
        </li>
      ))}
    </ul>
  );

  const currentBadge = (
    <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 10, background: `${p.green}22`, color: p.green }}>
      {t('sl11_compte.plans_current_badge')}
    </span>
  );

  return (
    <div className="pb-24 pt-2">
      <PlansTabs />
      <h1 className="font-black mb-1" style={{ fontSize: 20, color: p.text }}>{t('sl11_compte.plans_header_title')}</h1>
      <p className="mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl11_compte.plans_subtitle')}</p>

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl11_compte.loading')}
        </div>
      ) : (
        <>
          {feedback ? (
            <div className="rounded-xl p-3 mb-3" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
              <p style={{ fontSize: 12, color: p.green, fontWeight: 700 }}>{feedback}</p>
            </div>
          ) : null}

          {/* Free */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: isCurrent('FREE') ? `2px solid ${p.green}` : `1px solid ${p.border}` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="font-black" style={{ fontSize: 15, color: p.text }}>{t('sl11_compte.plan_free')}</p>
                {isCurrent('FREE') ? currentBadge : null}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black" style={{ fontSize: 17, color: p.text }}>{formatXAF(STATIC_PLANS.FREE.priceMonthly)}</p>
                <p style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.plans_per_month')}</p>
              </div>
            </div>

            {/* Offre de découverte — dynamique : progression réelle sur les commandes du vendeur. */}
            <div className="rounded-xl p-3 mb-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <Gift size={15} color={p.green} />
                <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl11_compte.plans_discovery_title')}</p>
              </div>
              <p className="mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl11_compte.plans_discovery_desc')}</p>
              <div className="w-full rounded-full overflow-hidden mb-1.5" style={{ height: 6, background: p.border }}>
                <div className="h-full rounded-full" style={{ width: `${discoveryPct}%`, background: p.orange }} />
              </div>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 11, fontWeight: 700, color: p.text }}>
                  {t('sl11_compte.plans_discovery_progress', { count: discoveryOrders, max: DISCOVERY_MAX_ORDERS })}
                </span>
                <span style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.plans_discovery_until')}</span>
              </div>
              <p style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.plans_discovery_note_short')}</p>
            </div>

            {featureList(STATIC_PLANS.FREE.featureKeys)}

            <div className="rounded-xl p-2.5 mb-3 flex items-center gap-2" style={{ background: `${p.green}14` }}>
              <Check size={14} color={p.green} className="flex-shrink-0" />
              <p style={{ fontSize: 11.5, color: p.green, fontWeight: 700 }}>{t('sl11_compte.plans_free_best_value')}</p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/seller/v2/simulateur')}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white"
              style={{ padding: '11px', background: p.orange, fontSize: 13 }}
            >
              <BarChart3 size={15} />
              {t('sl11_compte.plans_compare_cta')}
            </button>
          </div>

          {/* Autres plans */}
          <p className="font-black mb-2" style={{ fontSize: 15.5, color: p.text }}>{t('sl11_compte.plans_others_title')}</p>

          <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: isCurrent('BOOST') ? `2px solid ${p.green}` : `1px solid ${p.border}` }}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="font-black" style={{ fontSize: 15, color: p.text }}>{t('sl11_compte.plan_boost')}</p>
                {isCurrent('BOOST') ? currentBadge : null}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black" style={{ fontSize: 17, color: p.text }}>{formatXAF(STATIC_PLANS.BOOST.priceMonthly)}</p>
                <p style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.plans_per_month')}</p>
              </div>
            </div>
            <p className="mb-3" style={{ fontSize: 11, color: p.textMuted }}>
              {t('sl11_compte.plans_boost_annual', { amount: formatXAF(STATIC_PLANS.BOOST.priceAnnual) })}
            </p>
            {featureList(STATIC_PLANS.BOOST.featureKeys)}
            <button
              type="button"
              onClick={() => setTrialSheet('BOOST')}
              className="w-full rounded-xl font-bold"
              style={{ padding: '11px', border: `1.5px solid ${p.orange}`, color: p.orange, fontSize: 12.5 }}
            >
              {t('sl11_compte.plans_trial_cta')}
            </button>
          </div>

          <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: isCurrent('PRO') ? `2px solid ${p.green}` : `1px solid ${p.border}` }}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="font-black flex items-center gap-1" style={{ fontSize: 15, color: p.text }}>
                  {t('sl11_compte.plan_pro')} <Sparkles size={13} color={p.violet} />
                </p>
                {isCurrent('PRO') ? currentBadge : null}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black" style={{ fontSize: 17, color: p.text }}>{formatXAF(STATIC_PLANS.PRO.priceMonthly)}</p>
                <p style={{ fontSize: 10.5, color: p.textMuted }}>{t('sl11_compte.plans_per_month')}</p>
              </div>
            </div>
            <p className="mb-3" style={{ fontSize: 11, color: p.textMuted }}>
              {t('sl11_compte.plans_boost_annual', { amount: formatXAF(STATIC_PLANS.PRO.priceAnnual) })}
            </p>
            {featureList(STATIC_PLANS.PRO.featureKeys)}
            <button
              type="button"
              onClick={() => setTrialSheet('PRO')}
              className="w-full rounded-xl font-bold"
              style={{ padding: '11px', border: `1.5px solid ${p.violet}`, color: p.violet, fontSize: 12.5 }}
            >
              {t('sl11_compte.plans_trial_cta')}
            </button>
          </div>

          {/* Sur-mesure — négocié, jamais en self-service. */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
            <div className="flex items-start justify-between mb-1">
              <p className="font-black" style={{ fontSize: 15, color: p.text }}>{t('sl11_compte.plan_custom')}</p>
              <p className="font-black" style={{ fontSize: 13.5, color: p.text }}>{t('sl11_compte.plans_custom_negotiated')}</p>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.plans_custom_from')}</p>
              <p style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.plans_custom_per_contract')}</p>
            </div>
            {featureList(['plans_custom_feature_1', 'plans_custom_feature_2'])}
            <a
              href={buildWhatsAppSupportLink(t('sl11_compte.plans_custom_whatsapp_message'))}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center rounded-xl font-bold"
              style={{ padding: '11px', background: p.orange, color: '#fff', fontSize: 12.5 }}
            >
              {t('sl11_compte.plans_custom_cta')}
            </a>
          </div>

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p>{t('sl11_compte.plans_how')}</p>
          </Collapsible>
        </>
      )}

      {trialSheet ? (
        <div className="fixed inset-0 z-[900] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setTrialSheet(null)}>
          <div
            className="w-full max-w-md rounded-t-3xl p-5"
            style={{ background: p.card, border: `1px solid ${p.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-black mb-1" style={{ fontSize: 15, color: p.text }}>
              {t('sl11_compte.plans_trial_sheet_title', { plan: t(`sl11_compte.plan_${trialSheet.toLowerCase()}`) })}
            </p>
            <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.plans_trial_sheet_desc')}</p>

            <div className="flex gap-2 mb-3">
              {(['MTN_MOMO', 'ORANGE_MONEY'] as WithdrawalOperator[]).map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setOperator(op)}
                  className="flex-1 rounded-xl font-semibold"
                  style={{
                    padding: '10px',
                    fontSize: 12.5,
                    border: `1.5px solid ${operator === op ? p.orange : p.border}`,
                    color: operator === op ? p.orange : p.text,
                  }}
                >
                  {op === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money'}
                </button>
              ))}
            </div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="6XX XXX XXX"
              className="w-full rounded-xl p-3 mb-3"
              style={{ background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text, fontSize: 13 }}
            />
            <button
              type="button"
              disabled={busy || !phone.trim()}
              onClick={handleTrialConfirm}
              className="w-full rounded-xl font-bold text-white"
              style={{ padding: '12px', background: p.orange, fontSize: 13, opacity: busy ? 0.7 : 1 }}
            >
              {busy ? t('sl11_compte.loading') : t('sl11_compte.plans_trial_confirm')}
            </button>
            <button type="button" onClick={() => setTrialSheet(null)} className="w-full mt-2" style={{ fontSize: 12, color: p.textMuted }}>
              {t('sl11_compte.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
