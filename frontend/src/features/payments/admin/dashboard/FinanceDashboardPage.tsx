// frontend/src/features/payments/admin/dashboard/FinanceDashboardPage.tsx
// Le centre financier — la question du matin.
//
// ─────────────────────────────────────────────────────────────────────────
// LES ALERTES D'ABORD, LES CHIFFRES ENSUITE
//
// Un operateur ouvre cet ecran pour savoir s'il doit AGIR. La tresorerie,
// l'integrite et l'ordonnanceur viennent apres : ce sont du contexte, pas
// des consignes.
// ─────────────────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';

import { useFinanceDashboard } from '../../hooks/useFinanceDashboard';
import EmptyState from '../../shared/EmptyState';
import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import { formatXaf } from '../../shared/format';
import SectionNav from '../components/SectionNav';
import type { NavEntry } from '../components/SectionNav';
import SignalList from '../components/SignalList';
import TreasuryCard from '../components/TreasuryCard';

interface FinanceDashboardPageProps {
  basePath?: string;
}

function Carte({ title, children }: {
  title: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, padding: '1.25rem',
    }}>
      <p style={{
        fontSize: 11, margin: '0 0 14px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: FT.faint,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Point({ color, children }: {
  color: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11,
    }}>
      <span aria-hidden="true" style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: 'var(--text-primary, #1A1209)' }}>
        {children}
      </span>
    </div>
  );
}

export default function FinanceDashboardPage({
  basePath = '/admin/finance',
}: FinanceDashboardPageProps) {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFinanceDashboard();

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
        title="Impossible d'afficher le centre financier"
        description={error ?? 'Réessayez dans un instant.'}
      />
    );
  }

  const { treasury, integrity, scheduler, activity, settlements } = data;
  const aJour = scheduler.tasks.filter((t) => !t.stale).length;
  const enRetard = scheduler.tasks.filter((t) => t.stale).length;

  const navigation: NavEntry[] = [
    {
      icon: 'credit-card', label: 'Paiements', path: '/intents',
      count: `${activity.intents_total} sur 7 j`,
    },
    {
      icon: 'lock', label: 'Séquestres', path: '/escrow',
      count: `${Object.values(data.escrow.by_status)
        .reduce((somme, v) => somme + v.count, 0)} au total`,
    },
    {
      icon: 'send', label: 'Versements', path: '/payouts',
      count: settlements.awaiting_approval > 0
        ? `${settlements.awaiting_approval} à approuver`
        : '—',
      urgent: settlements.awaiting_approval > 0,
    },
    {
      icon: 'arrow-back-up', label: 'Remboursements', path: '/refunds',
      count: '—',
    },
    {
      icon: 'adjustments', label: 'Ajustements', path: '/adjustments',
      count: '—',
    },
    {
      icon: 'scale', label: 'Réconciliation', path: '/reconciliation',
      count: integrity.discrepancies.open_total > 0
        ? `${integrity.discrepancies.open_total} écart${
          integrity.discrepancies.open_total > 1 ? 's' : ''}`
        : '—',
      urgent: integrity.discrepancies.critical_open > 0,
    },
    {
      icon: 'shield-check', label: 'Risque', path: '/risk', count: '—',
    },
    {
      icon: 'clock-play', label: 'Ordonnanceur', path: '/scheduler',
      count: enRetard > 0 ? `${enRetard} en retard` : `${aJour} à jour`,
      urgent: scheduler.critical_alerts.length > 0,
    },
    {
      icon: 'settings', label: 'Configuration', path: '/configuration',
      count: '—',
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: '1.25rem',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 19, margin: 0, color: 'var(--text-primary, #1A1209)',
          }}>
            Centre financier
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            {new Date(data.generated_at).toLocaleString('fr-FR', {
              day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/analytics`)}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            Pilotage
          </button>
          <button
            type="button"
            onClick={reload}
            style={{ fontSize: 12.5, padding: '7px 14px' }}
          >
            <i
              className="ti ti-refresh"
              aria-hidden="true"
              style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
            />
            Actualiser
          </button>
        </div>
      </div>

      {/* Les alertes AVANT les chiffres. */}
      <div style={{ marginBottom: '1.5rem' }}>
        <SignalList signals={data.signals} basePath={basePath} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <TreasuryCard treasury={treasury} />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 12, marginBottom: '1.5rem',
      }}>
        <Carte title="Intégrité">
          <Point color={integrity.trial_balance === 0 ? FT.green : FT.red}>
            {integrity.trial_balance === 0
              ? 'Balance équilibrée'
              : `Balance : écart de ${formatXaf(integrity.trial_balance)}`}
          </Point>
          <Point color={integrity.invariants_ok ? FT.green : FT.red}>
            {integrity.invariants_ok
              ? 'Invariants respectés'
              : `${integrity.violations.length} invariant(s) violé(s)`}
          </Point>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: integrity.discrepancies.open_total === 0
                ? FT.faint : FT.amber,
            }} />
            <span style={{ fontSize: 13, color: FT.muted }}>
              {integrity.discrepancies.open_total === 0
                ? 'Aucun écart ouvert'
                : `${integrity.discrepancies.open_total} écart(s) ouvert(s)`}
            </span>
          </div>
        </Carte>

        <Carte title="Ordonnanceur">
          <Point color={aJour > 0 ? FT.green : FT.faint}>
            {aJour} tâche{aJour > 1 ? 's' : ''} à jour
          </Point>
          <Point color={enRetard > 0 ? FT.amber : FT.faint}>
            {enRetard} en retard
          </Point>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: scheduler.never_run ? FT.red : FT.faint,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: FT.muted }}>
              {scheduler.never_run
                ? 'jamais exécuté'
                : `${scheduler.critical_alerts.length} alerte(s) critique(s)`}
            </span>
          </div>
        </Carte>

        <Carte title={`${activity.period_days} derniers jours`}>
          <div style={{ marginBottom: 3 }}>
            <Money value={activity.collected_xaf} size={24} />
          </div>
          <p style={{ fontSize: 11.5, margin: '0 0 12px', color: FT.faint }}>
            encaissés · {activity.intents_total} paiement
            {activity.intents_total > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: activity.pending > 0 ? FT.amber : FT.faint,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              {activity.pending} en attente de confirmation
            </span>
          </div>
        </Carte>
      </div>

      <p style={{
        fontSize: 11, margin: '0 0 10px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: FT.faint,
      }}>
        Navigation du centre
      </p>
      <SectionNav entries={navigation} basePath={basePath} />
    </div>
  );
}