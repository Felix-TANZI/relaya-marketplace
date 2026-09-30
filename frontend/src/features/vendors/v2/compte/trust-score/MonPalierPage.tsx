// frontend/src/features/vendors/v2/compte/trust-score/MonPalierPage.tsx
// Écran "Mon palier" — VD-10 §PAL, Fig.1.
// Répond à « Où j'en suis et comment monter ? » : palier + Trust Score, prochain
// geste, gain du palier suivant.
//
// Pont API : vendorsApi.getCertifications() (ancien moteur à points). Le moteur
// Trust Score à 6 critères (GET /tiers, next.keep_gain, next.orders_to_go) n'est
// pas encore exposé par le service — voir compte/shared/format.ts. Tant que ce
// endpoint n'existe pas, le gain en francs du palier suivant n'est PAS fabriqué
// (règle V16 : jamais de chiffre faux) : on affiche le multiplicateur canonique
// (VD-10) et un exemple explicitement étiqueté "Exemple".

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Medal, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type CertificationData } from '@/services/api/vendors';
import { palette, primaryGradient } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { mapLegacyTier, TIER_KEEP_BONUS_PCT, TIER_RELEASE_DAYS, formatPct } from '../shared/format';

export default function MonPalierPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const p = palette(theme);
  const [cert, setCert] = useState<CertificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorsApi.getCertifications().then(setCert).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tier = mapLegacyTier(cert?.current_tier);
  const tierLabel = t(`sl11_compte.tier_${tier.toLowerCase()}`);
  const nextTierLabel = cert?.next_tier_label || null;
  const score = cert?.total_points ?? 0;
  const progress = Math.max(0, Math.min(100, cert?.progress_pct ?? 0));

  // Palier suivant "affiché" (Bronze/Argent/Or/Platine uniquement — jamais Diamant).
  const nextTierCode = tier === 'BRONZE' ? 'SILVER' : tier === 'SILVER' ? 'GOLD' : tier === 'GOLD' ? 'PLATINUM' : null;
  const nextBonus = nextTierCode ? TIER_KEEP_BONUS_PCT[nextTierCode] : null;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.palier_title')} />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl11_compte.loading')}
        </div>
      ) : (
        <>
          {/* Carte nuit — médaille, score, barre vers le seuil suivant (PAL-01). */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: primaryGradient(p) }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.16)' }}>
                <Medal size={24} color="#fff" />
              </div>
              <div>
                <p className="font-black text-white" style={{ fontSize: 16 }}>{tierLabel}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                  {t('sl11_compte.trust_score_label')} · {score}
                </p>
              </div>
            </div>
            {nextTierLabel ? (
              <>
                <div className="w-full rounded-full overflow-hidden mb-1.5" style={{ height: 8, background: 'rgba(255,255,255,0.22)' }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#fff' }} />
                </div>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>
                  {t('sl11_compte.palier_progress_to', { pct: formatPct(progress), next: nextTierLabel })}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.85)' }}>{t('sl11_compte.palier_max')}</p>
            )}
          </div>

          {/* Carte "Pour passer à [palier]" — conditions tenues 14 jours (règle C4). */}
          {nextTierLabel ? (
            <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
              <p className="font-bold mb-2" style={{ fontSize: 13.5, color: p.text }}>
                {t('sl11_compte.palier_next_conditions_title', { next: nextTierLabel })}
              </p>
              {cert?.how_to_earn?.length ? (
                <ul className="space-y-1.5">
                  {cert.how_to_earn.map((h, i) => (
                    <li key={i} className="flex items-center justify-between" style={{ fontSize: 12.5, color: p.textMuted }}>
                      <span>{h.action}</span>
                      <span className="font-semibold" style={{ color: p.text }}>{h.points}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.palier_conditions_pending')}</p>
              )}
              <p className="mt-2" style={{ fontSize: 11, color: p.textMuted }}>{t('sl11_compte.palier_condition_held_14d')}</p>
            </div>
          ) : null}

          {/* Carte verte "Ce que vous gagnez" — multiplicateur canonique VD-10, jamais les taux d'abonnement retirés. */}
          {nextTierCode && nextBonus ? (
            <div className="rounded-2xl p-4 mb-4" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}55` }}>
              <p className="font-bold mb-1" style={{ fontSize: 13.5, color: p.green }}>
                {t('sl11_compte.palier_gain_title')}
              </p>
              <p style={{ fontSize: 12.5, color: p.text }}>
                {t('sl11_compte.palier_gain_bonus', { pct: nextBonus })}
              </p>
              <p className="mt-1" style={{ fontSize: 11, color: p.textMuted }}>
                {t('sl11_compte.palier_gain_example')}
              </p>
            </div>
          ) : null}

          {/* Ligne "Sanctions et contrôle" (TRU-06). */}
          <button
            type="button"
            onClick={() => navigate('/seller/v2/sanctions')}
            className="w-full flex items-center justify-between rounded-2xl mb-4"
            style={{ padding: '13px 14px', background: p.card, border: `1px solid ${p.border}` }}
          >
            <span className="font-semibold" style={{ fontSize: 13, color: p.text }}>{t('sl11_compte.sanctions_link')}</span>
            <ChevronRight size={16} color={p.textMuted} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/seller/orders')}
            className="w-full rounded-2xl font-bold text-white mb-4 active:scale-[0.99] transition-transform"
            style={{ padding: '13px', background: p.orange, fontSize: 13.5 }}
          >
            {t('sl11_compte.palier_cta_orders')}
          </button>

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="mb-1">{t('sl11_compte.palier_how_1')}</p>
            <p className="mb-1">{t('sl11_compte.palier_how_2', { days: TIER_RELEASE_DAYS.BRONZE })}</p>
            <p>{t('sl11_compte.palier_how_3', { days: TIER_RELEASE_DAYS.GOLD })}</p>
          </Collapsible>
        </>
      )}
    </div>
  );
}
