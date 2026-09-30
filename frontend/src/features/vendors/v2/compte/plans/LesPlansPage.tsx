// frontend/src/features/vendors/v2/compte/plans/LesPlansPage.tsx
// Écran "Les plans" — VD-10 §PLN, Fig.6/Fig.7.
// Répond à « Quel plan me convient ? » avec Free/Boost/Pro/Sur-mesure —
// JAMAIS les anciens plans Gratuit/Starter/Pro/Business et leurs taux 20/18/
// 12/10/5 % (retirés de la production, VD-D13.A02).
//
// Pont API : vendorsApi.getPlans() / subscribePlan() (noms de code backend
// encore FREE/STARTER/PRO/BUSINESS — mappés ici vers Free/Boost/Pro/Sur-mesure
// par shared/format.ts::mapLegacyPlanCode). Les prix affichés (price_monthly_xaf,
// price_annual_xaf) sont les vraies valeurs renvoyées par l'API ; aucun
// pourcentage de commission n'est jamais affiché ici.

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, BarChart3 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type PlansResponse, type SubscriptionPlan, type WithdrawalOperator } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import { formatXAF, mapLegacyPlanCode, buildWhatsAppSupportLink } from '../shared/format';

export default function LesPlansPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [data, setData] = useState<PlansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialSheet, setTrialSheet] = useState<SubscriptionPlan | null>(null);
  const [operator, setOperator] = useState<WithdrawalOperator>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    vendorsApi.getPlans().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const plans = data?.plans ?? [];
  const currentPlan = plans.find((pl) => pl.is_current) ?? plans.find((pl) => pl.code === data?.active_plan_code);
  const otherPlans = plans.filter((pl) => pl !== currentPlan && mapLegacyPlanCode(pl.code) !== 'CUSTOM');
  const customPlan = plans.find((pl) => mapLegacyPlanCode(pl.code) === 'CUSTOM');

  const planName = (pl: SubscriptionPlan) => t(`sl11_compte.plan_${mapLegacyPlanCode(pl.code).toLowerCase()}`);

  const handleTrialConfirm = async () => {
    if (!trialSheet || !phone.trim()) return;
    setBusy(true);
    try {
      await vendorsApi.subscribePlan({
        plan_code: trialSheet.code,
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

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.plans_title')} />

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

          {/* Plan actuel — bord vert. */}
          {currentPlan ? (
            <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `2px solid ${p.green}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-black" style={{ fontSize: 15, color: p.text }}>{planName(currentPlan)}</p>
                <span className="px-2 py-0.5 rounded-full font-bold" style={{ fontSize: 10, background: `${p.green}22`, color: p.green }}>
                  {t('sl11_compte.plans_current_badge')}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: p.textMuted }}>
                {currentPlan.price_monthly_xaf > 0
                  ? t('sl11_compte.plans_price_monthly', { amount: formatXAF(currentPlan.price_monthly_xaf) })
                  : t('sl11_compte.plans_free')}
              </p>
              <p className="mt-2" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl11_compte.plans_discovery_note')}</p>
              <button
                type="button"
                onClick={() => navigate('/seller/v2/simulateur')}
                className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mt-3"
                style={{ padding: '11px', background: p.orange, fontSize: 13 }}
              >
                <BarChart3 size={15} />
                {t('sl11_compte.plans_compare_cta')}
              </button>
            </div>
          ) : null}

          {/* Autres plans */}
          {otherPlans.length > 0 ? (
            <div className="mb-4">
              <p className="font-black uppercase mb-2 px-1" style={{ fontSize: 10.5, letterSpacing: '.1em', color: p.textMuted }}>
                {t('sl11_compte.plans_others_title')}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ background: p.card, border: `1px solid ${p.border}` }}>
                {otherPlans.map((pl, i) => (
                  <div key={pl.id} style={{ padding: '14px', borderTop: i > 0 ? `1px solid ${p.border}` : undefined }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold" style={{ fontSize: 13.5, color: p.text }}>{planName(pl)}</p>
                      <p className="font-bold" style={{ fontSize: 13, color: p.text }}>
                        {pl.price_monthly_xaf > 0 ? `${formatXAF(pl.price_monthly_xaf)}/mois` : t('sl11_compte.plans_free')}
                      </p>
                    </div>
                    {pl.price_annual_xaf > 0 ? (
                      <p className="mb-1" style={{ fontSize: 11, color: p.textMuted }}>
                        {t('sl11_compte.plans_price_annual', { amount: formatXAF(pl.price_annual_xaf) })}
                      </p>
                    ) : null}
                    {pl.features?.length ? (
                      <ul className="mb-2 space-y-1">
                        {pl.features.slice(0, 4).map((f, j) => (
                          <li key={j} className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: p.textMuted }}>
                            <Check size={12} color={p.green} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setTrialSheet(pl)}
                      className="w-full rounded-xl font-bold"
                      style={{ padding: '10px', border: `1.5px solid ${p.orange}`, color: p.orange, fontSize: 12.5 }}
                    >
                      {t('sl11_compte.plans_trial_cta')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Sur-mesure — négocié, jamais en self-service. */}
          <div className="rounded-2xl p-4" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
            <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.text }}>
              {customPlan ? planName(customPlan) : t('sl11_compte.plan_custom')}
            </p>
            <p className="mb-3" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.plans_custom_desc')}</p>
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
              {t('sl11_compte.plans_trial_sheet_title', { plan: planName(trialSheet) })}
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
