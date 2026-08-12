// frontend/src/features/payments/admin/risk/RiskPage.tsx
// Risque — evaluations et scores de confiance.
//
// ─────────────────────────────────────────────────────────────────────────
// ON MARQUE, ON NE BLOQUE PAS
//
// Le blocage automatique est desactive par defaut. Un score eleve ALERTE,
// il ne refuse pas — un faux positif qui bloque un paiement legitime coute
// plus cher qu'une fraude marquee et verifiee.
//
// Et le payeur tiers n'est PAS un suspect : en diaspora, c'est le cas
// nominal.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

import { adminFinanceApi } from '../../api/admin-finance.api';
import { useAsync } from '../../hooks/useAsync';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface RiskPageProps {
  basePath?: string;
}

interface RiskRow {
  id: string;
  subject_type: string;
  subject_ref: string;
  score: number;
  decision: string;
  decision_label: string;
  note: string;
  signals: Array<{
    kind: string; severity: string; weight: number; detail: string;
  }>;
  created_at: string;
}

interface TrustRow {
  id: string;
  payee: { payee_code: string; display_label: string };
  score: number;
  previous_score: number;
  delta: number;
  orders_count: number;
  disputes_count: number;
  computed_at: string;
}

/** Un score eleve n'est pas une condamnation : c'est un signal a verifier. */
function teinteScore(score: number): string {
  if (score >= 70) return FT.red;
  if (score >= 40) return FT.amber;
  return FT.green;
}

export default function RiskPage({
  basePath = '/admin/finance',
}: RiskPageProps) {
  const [vue, setVue] = useState('assessments');

  const evaluations = useAsync<{ results: RiskRow[]; count: number }>(
    () => adminFinanceApi.riskAssessments({ page: 1 }), [],
  );
  const scores = useAsync<{ results: TrustRow[]; count: number }>(
    () => adminFinanceApi.trustScores({ page: 1 }), [],
  );

  const onglets: FilterTab[] = [
    { key: 'assessments', label: 'Évaluations' },
    { key: 'trust', label: 'Scores de confiance' },
  ];

  const chargement = vue === 'assessments'
    ? evaluations.loading : scores.loading;
  const erreur = vue === 'assessments' ? evaluations.error : scores.error;

  return (
    <AdminPageShell
      title="Risque"
      subtitle="Les scores alertent, ils ne bloquent pas."
      backTo={basePath}
      actions={(
        <FilterTabs tabs={onglets} active={vue} onChange={setVue} />
      )}
    >
      <AdminCard>
        {chargement && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!chargement && erreur && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher cette vue"
            description={erreur}
          />
        )}

        {!chargement && !erreur && vue === 'assessments' && (
          (evaluations.data?.results ?? []).length === 0 ? (
            <EmptyState
              icon="shield-check"
              title="Aucune évaluation"
              description="Aucun signal de risque détecté."
            />
          ) : (evaluations.data?.results ?? []).map((ligne, index, tout) => (
            <div
              key={ligne.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < tout.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                marginTop: 6, background: teinteScore(ligne.score),
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {ligne.subject_ref}
                  <span style={{ color: FT.faint }}>
                    {' · '}{ligne.decision_label}
                  </span>
                </p>
                {ligne.signals.slice(0, 3).map((signal) => (
                  <p
                    key={`${signal.kind}-${signal.detail}`}
                    style={{
                      fontSize: 12, margin: '4px 0 0', lineHeight: 1.5,
                      color: FT.muted,
                    }}
                  >
                    {signal.detail}
                  </p>
                ))}
                <p style={{ fontSize: 11.5, margin: '5px 0 0', color: FT.faint }}>
                  {formatShortDate(ligne.created_at)}
                </p>
              </div>

              <span style={{
                fontSize: 18, width: 48, textAlign: 'right',
                color: teinteScore(ligne.score),
                fontVariantNumeric: 'tabular-nums',
              }}>
                {ligne.score}
              </span>
            </div>
          ))
        )}

        {!chargement && !erreur && vue === 'trust' && (
          (scores.data?.results ?? []).length === 0 ? (
            <EmptyState
              icon="star"
              title="Aucun score de confiance"
              description="Les scores se calculent après quelques commandes."
            />
          ) : (scores.data?.results ?? []).map((ligne, index, tout) => (
            <div
              key={ligne.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < tout.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {ligne.payee.display_label || ligne.payee.payee_code}
                </p>
                <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
                  {ligne.orders_count} commande{ligne.orders_count > 1 ? 's' : ''}
                  {' · '}{ligne.disputes_count} litige
                  {ligne.disputes_count > 1 ? 's' : ''}
                  {' · '}{formatShortDate(ligne.computed_at)}
                </p>
              </div>

              {ligne.delta !== 0 && (
                <span style={{
                  fontSize: 12, width: 42, textAlign: 'right',
                  color: ligne.delta > 0 ? FT.greenD : FT.redD,
                }}>
                  {ligne.delta > 0 ? '+' : '\u2212'}{Math.abs(ligne.delta)}
                </span>
              )}

              <span style={{
                fontSize: 18, width: 48, textAlign: 'right',
                color: 'var(--text-primary, #1A1209)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {ligne.score}
              </span>
            </div>
          ))
        )}
      </AdminCard>
    </AdminPageShell>
  );
}