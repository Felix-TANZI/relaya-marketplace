// frontend/src/features/payments/admin/analytics/FinanceAnalyticsPage.tsx
// Pilotage — comment ca evolue.
//
// ─────────────────────────────────────────────────────────────────────────
// ECRAN SEPARE DU TABLEAU DE BORD
//
// Celui-ci repond a « comment ca evolue ? », l'autre a « dois-je agir ce
// matin ? ». Les melanger nuirait aux deux : une alerte perdue au milieu de
// graphiques est une alerte manquee.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAnalytics } from '../../hooks/useFinanceAdmin';
import EmptyState from '../../shared/EmptyState';
import Money from '../../shared/Money';
import Sparkline from '../../shared/Sparkline';
import { FT } from '../../shared/tokens';
import { formatXaf } from '../../shared/format';
import { formatShortDate } from '../../shared/dates';

interface FinanceAnalyticsPageProps {
  basePath?: string;
}

const PERIODES = [
  { jours: 7, label: '7 j' },
  { jours: 30, label: '30 j' },
  { jours: 90, label: '90 j' },
];

function Bloc({ title, children, subtitle }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.25rem',
    }}>
      <p style={{
        fontSize: 11, margin: '0 0 3px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: FT.faint,
      }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ fontSize: 11.5, margin: '0 0 12px', color: FT.faint }}>
          {subtitle}
        </p>
      )}
      <div style={{ marginTop: subtitle ? 0 : 12 }}>{children}</div>
    </div>
  );
}

/** Une variation nulle s'affiche « — », jamais « +∞ % ». */
function Variation({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <span style={{ fontSize: 12, color: FT.faint }}>—</span>;
  }
  const positif = percent >= 0;
  return (
    <span style={{
      fontSize: 12, color: positif ? FT.greenD : FT.redD,
    }}>
      {positif ? '+' : '\u2212'}{Math.abs(percent)} %
    </span>
  );
}

function Barre({ value, max, color }: {
  value: number; max: number; color: string;
}) {
  return (
    <div style={{
      height: 5, borderRadius: 999, background: FT.border,
      overflow: 'hidden', marginTop: 5,
    }}>
      <div style={{
        width: `${max > 0 ? (value / max) * 100 : 0}%`,
        height: '100%', background: color,
      }} />
    </div>
  );
}

export default function FinanceAnalyticsPage({
  basePath = '/admin/finance',
}: FinanceAnalyticsPageProps) {
  const navigate = useNavigate();
  const [jours, setJours] = useState(30);
  const { data, loading, error } = useAnalytics(jours);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="alert-circle"
        title="Impossible d'afficher le pilotage"
        description={error ?? 'Réessayez dans un instant.'}
      />
    );
  }

  const { summary, funnel, revenue, disputes, operators } = data;

  const points = data.collections.map((jour) => ({
    label: jour.date,
    value: jour.collected_xaf,
    secondary: jour.refunded_xaf,
  }));

  const maxAging = Math.max(
    ...data.escrow_aging.map((tranche) => tranche.total_xaf), 1,
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: '1.25rem',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(basePath)}
            style={{ fontSize: 12.5, padding: '6px 12px', marginBottom: 10 }}
          >
            <i
              className="ti ti-arrow-left"
              aria-hidden="true"
              style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
            />
            Centre financier
          </button>
          <p style={{
            fontSize: 19, margin: 0, color: 'var(--text-primary, #1A1209)',
          }}>
            Pilotage
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PERIODES.map((periode) => (
            <button
              key={periode.jours}
              type="button"
              onClick={() => setJours(periode.jours)}
              style={{
                fontSize: 12, padding: '6px 12px',
                borderColor: jours === periode.jours ? FT.coral : undefined,
                color: jours === periode.jours ? '#993C1D' : undefined,
              }}
            >
              {periode.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, padding: '1.5rem', marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 24, flexWrap: 'wrap',
          marginBottom: '1.25rem',
        }}>
          <div>
            <p style={{
              fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: FT.faint,
            }}>
              Encaissé
            </p>
            <Money value={summary.current.collected_xaf} size={34} />
            <p style={{
              fontSize: 11.5, margin: '7px 0 0', color: FT.faint,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Variation percent={summary.change_percent.collected} />
              vs période précédente
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: FT.faint,
            }}>
              Panier moyen
            </p>
            <Money value={summary.current.average_xaf} size={22} />
            <p style={{ fontSize: 11.5, margin: '7px 0 0', color: FT.faint }}>
              {summary.current.count} paiement
              {summary.current.count > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Sparkline points={points} height={72} showAverage />

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8,
        }}>
          <span style={{ fontSize: 11, color: FT.faint }}>
            {formatShortDate(data.collections[0]?.date)}
          </span>
          <span style={{ fontSize: 11, color: FT.faint }}>
            {/* Le trait pointille est la serie des remboursements. */}
            — encaissements · ‑ ‑ remboursements
          </span>
          <span style={{ fontSize: 11, color: FT.faint }}>
            {formatShortDate(data.collections.at(-1)?.date)}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 12, marginBottom: 12,
      }}>
        <Bloc
          title="Conversion"
          subtitle={`${funnel.total} intention${funnel.total > 1 ? 's' : ''}`}
        >
          {[
            { label: 'Réussite', value: funnel.success_rate, color: FT.green },
            { label: 'Échec technique', value: funnel.failure_rate,
              color: FT.red },
            // Un abandon n'est pas un incident : l'acheteur n'a pas
            // compose son code.
            { label: 'Abandon', value: funnel.abandon_rate, color: FT.amber },
          ].map((ligne) => (
            <div key={ligne.label} style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 12.5, color: FT.muted }}>
                  {ligne.label}
                </span>
                <span style={{
                  fontSize: 13.5, color: 'var(--text-primary, #1A1209)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {ligne.value} %
                </span>
              </div>
              <Barre value={ligne.value} max={100} color={ligne.color} />
            </div>
          ))}
        </Bloc>

        <Bloc title="Revenus" subtitle="frais prestataire inclus">
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', paddingBottom: 10,
            borderBottom: `0.5px solid ${FT.border}`,
          }}>
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              Chiffre d’affaires
            </span>
            <Money value={revenue.revenue_total_xaf} size={14} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', padding: '10px 0',
            borderBottom: `0.5px solid ${FT.border}`,
          }}>
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              Frais prestataire
            </span>
            <Money value={-revenue.psp_fees_total_xaf} size={14} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'baseline', paddingTop: 10,
          }}>
            <span style={{ fontSize: 12.5, color: FT.muted }}>Marge nette</span>
            <Money
              value={revenue.net_margin_xaf}
              size={16}
              tone={revenue.net_margin_xaf >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </Bloc>

        <Bloc title="Opérateurs" subtitle="taux de réussite">
          {operators.length === 0 ? (
            <p style={{ fontSize: 12.5, margin: 0, color: FT.faint }}>
              Aucune donnée sur la période.
            </p>
          ) : operators.map((operateur) => (
            <div key={operateur.operator} style={{ marginBottom: 12 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 12.5, color: FT.muted }}>
                  {operateur.operator}
                </span>
                <span style={{
                  fontSize: 13.5, color: 'var(--text-primary, #1A1209)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {operateur.success_rate} %
                </span>
              </div>
              <Barre
                value={operateur.success_rate}
                max={100}
                color={FT.blue}
              />
              <p style={{ fontSize: 11, margin: '4px 0 0', color: FT.faint }}>
                {formatXaf(operateur.amount_xaf)} FCFA · {operateur.total}{' '}
                tentative{operateur.total > 1 ? 's' : ''}
              </p>
            </div>
          ))}
        </Bloc>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12,
      }}>
        <Bloc
          title="Ancienneté des séquestres"
          subtitle="au-delà de 30 jours : commande probablement oubliée"
        >
          {data.escrow_aging.map((tranche) => (
            <div key={tranche.label} style={{ marginBottom: 11 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 12.5, color: FT.muted }}>
                  {tranche.label}
                </span>
                <span style={{ fontSize: 12.5, color: FT.faint }}>
                  {tranche.count} · {formatXaf(tranche.total_xaf)}
                </span>
              </div>
              <Barre
                value={tranche.total_xaf}
                max={maxAging}
                color={tranche.max_days === null ? FT.red : FT.blue}
              />
            </div>
          ))}
        </Bloc>

        <Bloc
          title="Litiges"
          subtitle={`sur ${disputes.orders_with_escrow} commande${
            disputes.orders_with_escrow > 1 ? 's' : ''}`}
        >
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontSize: 28, color: 'var(--text-primary, #1A1209)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {disputes.dispute_rate}
            </span>
            <span style={{ fontSize: 14, color: FT.faint }}> %</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12.5, color: FT.muted, marginBottom: 8,
          }}>
            <span>Litiges ouverts</span>
            <span>{disputes.disputes_opened}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12.5, color: FT.muted,
          }}>
            <span>Remboursés</span>
            <span>{disputes.refunds_from_disputes}</span>
          </div>
        </Bloc>

        <Bloc title="Partenaires les plus réglés" subtitle="sur la période">
          {data.top_payees.length === 0 ? (
            <p style={{ fontSize: 12.5, margin: 0, color: FT.faint }}>
              Aucun versement sur la période.
            </p>
          ) : data.top_payees.slice(0, 5).map((partenaire) => (
            <div
              key={partenaire.payee_code}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 10,
              }}
            >
              <span style={{
                fontSize: 12.5, color: FT.muted, flex: 1,
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {partenaire.display_label || partenaire.payee_code}
              </span>
              <Money value={partenaire.total_xaf} size={13} />
            </div>
          ))}
        </Bloc>
      </div>
    </div>
  );
}