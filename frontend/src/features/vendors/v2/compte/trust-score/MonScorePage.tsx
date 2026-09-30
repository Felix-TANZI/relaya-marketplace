// frontend/src/features/vendors/v2/compte/trust-score/MonScorePage.tsx
// Écran "Mon score" — VD-10 §SCO, Fig.2.
// Répond à « Qu'est-ce qui fait bouger mon score ? » : anneau de score + 6
// critères pondérés 25/20/20/15/10/10 (Ponctualité/Qualité/Satisfaction/
// Litiges/Documents/Ancienneté — règle C1).
//
// Pont API : vendorsApi.getCertifications() ne renvoie pas encore les 6
// sous-scores (GET /score n'existe pas côté service). Les poids affichés sont
// la règle système (fixes, jamais fabriqués) ; la note par critère reste "—"
// tant que l'API dédiée n'est pas branchée, pour ne jamais afficher un chiffre
// inventé (règle V16). Mémoire projet : le code backend implémenterait encore
// la V5.4 du Trust Score, pas la V5.5 canonique (µ=50, Wilson, veto ≤ 39).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type CertificationData } from '@/services/api/vendors';
import { palette } from '../../theme';
import ScreenHeader from '../shared/ScreenHeader';
import Collapsible from '../shared/Collapsible';
import { SCORE_CRITERIA } from '../shared/format';

export default function MonScorePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [cert, setCert] = useState<CertificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorsApi.getCertifications().then(setCert).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const score = cert?.total_points ?? 0;
  const ringPct = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * 42;
  const dash = (ringPct / 100) * circumference;

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl11_compte.score_title')} />

      {loading ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: p.card, border: `1px solid ${p.border}`, color: p.textMuted, fontSize: 12.5 }}>
          {t('sl11_compte.loading')}
        </div>
      ) : (
        <>
          {/* Anneau de score */}
          <div className="rounded-2xl p-5 mb-4 flex flex-col items-center" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <svg width={104} height={104} viewBox="0 0 104 104">
              <circle cx={52} cy={52} r={42} fill="none" stroke={p.border} strokeWidth={9} />
              <circle
                cx={52}
                cy={52}
                r={42}
                fill="none"
                stroke={p.orange}
                strokeWidth={9}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 52 52)"
              />
              <text x={52} y={58} textAnchor="middle" fontSize={26} fontWeight={900} fill={p.text}>
                {score}
              </text>
            </svg>
            <p className="mt-2 text-center" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.score_up_line')}</p>
            <p className="text-center" style={{ fontSize: 12, color: p.textMuted }}>{t('sl11_compte.score_down_line')}</p>
          </div>

          {/* Vos six critères */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: p.card, border: `1px solid ${p.border}` }}>
            <p className="font-bold mb-3" style={{ fontSize: 13.5, color: p.text }}>{t('sl11_compte.score_criteria_title')}</p>
            <div className="space-y-3">
              {SCORE_CRITERIA.map((c) => {
                const detail = cert?.breakdown?.[c.key];
                const note = detail ? Math.round(detail.points) : null;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 12.5, color: p.text, fontWeight: 600 }}>
                        {t(`sl11_compte.score_criterion_${c.key}`)} · {c.weight}%
                      </span>
                      <span style={{ fontSize: 12, color: p.textMuted }}>
                        {note !== null ? `${note}/100` : '—'}
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: p.border }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: note !== null ? `${note}%` : '0%', background: p.orange }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Collapsible title={t('sl11_compte.score_why_title')}>
            <p>{t('sl11_compte.score_why_body')}</p>
          </Collapsible>

          <Collapsible title={t('sl11_compte.how_it_works')}>
            <p className="mb-1">{t('sl11_compte.score_how_1')}</p>
            <p className="mb-1">{t('sl11_compte.score_how_2')}</p>
            <p className="mb-1">{t('sl11_compte.score_how_3')}</p>
            <p>{t('sl11_compte.score_how_4')}</p>
          </Collapsible>
        </>
      )}
    </div>
  );
}
