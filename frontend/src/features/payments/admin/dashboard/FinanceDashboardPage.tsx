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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFinanceDashboard();

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_dashboard.loading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="alert-circle"
        title={t('pm1_dashboard.error_title')}
        description={error ?? t('pm1_dashboard.error_fallback')}
      />
    );
  }

  const { treasury, integrity, scheduler, activity, settlements } = data;
  const aJour = scheduler.tasks.filter((t) => !t.stale).length;
  const enRetard = scheduler.tasks.filter((t) => t.stale).length;

  const navigation: NavEntry[] = [
    {
      icon: 'credit-card', label: t('pm1_dashboard.nav_payments'), path: '/intents',
      count: t('pm1_dashboard.nav_count_last_7d', { count: activity.intents_total }),
    },
    {
      icon: 'lock', label: t('pm1_dashboard.nav_escrows'), path: '/escrow',
      count: t('pm1_dashboard.nav_count_total', {
        count: Object.values(data.escrow.by_status)
          .reduce((somme, v) => somme + v.count, 0),
      }),
    },
    {
      icon: 'send', label: t('pm1_dashboard.nav_payouts'), path: '/payouts',
      count: settlements.awaiting_approval > 0
        ? t('pm1_dashboard.nav_count_to_approve', { count: settlements.awaiting_approval })
        : '—',
      urgent: settlements.awaiting_approval > 0,
    },
    {
      icon: 'arrow-back-up', label: t('pm1_dashboard.nav_refunds'), path: '/refunds',
      count: '—',
    },
    {
      icon: 'adjustments', label: t('pm1_dashboard.nav_adjustments'), path: '/adjustments',
      count: '—',
    },
    {
      icon: 'scale', label: t('pm1_dashboard.nav_reconciliation'), path: '/reconciliation',
      count: integrity.discrepancies.open_total > 0
        ? t(integrity.discrepancies.open_total > 1
          ? 'pm1_dashboard.nav_count_gap_plural'
          : 'pm1_dashboard.nav_count_gap', { count: integrity.discrepancies.open_total })
        : '—',
      urgent: integrity.discrepancies.critical_open > 0,
    },
    {
      icon: 'shield-check', label: t('pm1_dashboard.nav_risk'), path: '/risk', count: '—',
    },
    {
      icon: 'clock-play', label: t('pm1_dashboard.nav_scheduler'), path: '/scheduler',
      count: enRetard > 0
        ? t('pm1_dashboard.nav_count_late', { count: enRetard })
        : t('pm1_dashboard.nav_count_up_to_date', { count: aJour }),
      urgent: scheduler.critical_alerts.length > 0,
    },
    {
      icon: 'settings', label: t('pm1_dashboard.nav_configuration'), path: '/configuration',
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
            {t('pm1_dashboard.title')}
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
            {t('pm1_dashboard.analytics_link')}
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
            {t('pm1_dashboard.refresh')}
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
        <Carte title={t('pm1_dashboard.card_integrity')}>
          <Point color={integrity.trial_balance === 0 ? FT.green : FT.red}>
            {integrity.trial_balance === 0
              ? t('pm1_dashboard.balance_ok')
              : t('pm1_dashboard.balance_gap', { amount: formatXaf(integrity.trial_balance) })}
          </Point>
          <Point color={integrity.invariants_ok ? FT.green : FT.red}>
            {integrity.invariants_ok
              ? t('pm1_dashboard.invariants_ok')
              : t('pm1_dashboard.invariants_violated', { count: integrity.violations.length })}
          </Point>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: integrity.discrepancies.open_total === 0
                ? FT.faint : FT.amber,
            }} />
            <span style={{ fontSize: 13, color: FT.muted }}>
              {integrity.discrepancies.open_total === 0
                ? t('pm1_dashboard.no_open_gaps')
                : t('pm1_dashboard.open_gaps_count', { count: integrity.discrepancies.open_total })}
            </span>
          </div>
        </Carte>

        <Carte title={t('pm1_dashboard.card_scheduler')}>
          <Point color={aJour > 0 ? FT.green : FT.faint}>
            {t(aJour > 1 ? 'pm1_dashboard.tasks_up_to_date_plural' : 'pm1_dashboard.tasks_up_to_date', { count: aJour })}
          </Point>
          <Point color={enRetard > 0 ? FT.amber : FT.faint}>
            {t('pm1_dashboard.tasks_late', { count: enRetard })}
          </Point>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: scheduler.never_run ? FT.red : FT.faint,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: FT.muted }}>
              {scheduler.never_run
                ? t('pm1_dashboard.never_run')
                : t('pm1_dashboard.critical_alerts_count', { count: scheduler.critical_alerts.length })}
            </span>
          </div>
        </Carte>

        <Carte title={t('pm1_dashboard.card_period', { days: activity.period_days })}>
          <div style={{ marginBottom: 3 }}>
            <Money value={activity.collected_xaf} size={24} />
          </div>
          <p style={{ fontSize: 11.5, margin: '0 0 12px', color: FT.faint }}>
            {t(activity.intents_total > 1 ? 'pm1_dashboard.collected_meta_plural' : 'pm1_dashboard.collected_meta', { count: activity.intents_total })}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden="true" style={{
              width: 7, height: 7, borderRadius: '50%',
              background: activity.pending > 0 ? FT.amber : FT.faint,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12.5, color: FT.muted }}>
              {t('pm1_dashboard.pending_confirmation', { count: activity.pending })}
            </span>
          </div>
        </Carte>
      </div>

      <p style={{
        fontSize: 11, margin: '0 0 10px', letterSpacing: '0.08em',
        textTransform: 'uppercase', color: FT.faint,
      }}>
        {t('pm1_dashboard.nav_section_title')}
      </p>
      <SectionNav entries={navigation} basePath={basePath} />
    </div>
  );
}