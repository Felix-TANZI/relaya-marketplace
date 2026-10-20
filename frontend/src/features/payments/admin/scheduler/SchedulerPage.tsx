// frontend/src/features/payments/admin/scheduler/SchedulerPage.tsx
// Ordonnanceur — sante des taches planifiees.
//
// ─────────────────────────────────────────────────────────────────────────
// SANS ORDONNANCEUR, AUCUN VENDEUR N'EST JAMAIS PAYE
//
// Les sequestres ne s'auto-confirment pas, les lots ne se construisent pas,
// les paiements bloques restent invisibles. Cet ecran doit le montrer AVANT
// qu'un partenaire ne le signale.
// ─────────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import { useTaskHealth } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import EmptyState from '../../shared/EmptyState';
import { FT } from '../../shared/tokens';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface SchedulerPageProps {
  basePath?: string;
}

function horodatage(valeur: string | null, jamaisLabel: string): string {
  if (!valeur) return jamaisLabel;
  return new Date(valeur).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function SchedulerPage({
  basePath = '/admin/finance',
}: SchedulerPageProps) {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useTaskHealth();
  const action = useFinanceAction(reload);

  const taches = data?.health ?? [];
  const jamais = taches.filter((tache) => tache.last_success_at === null);
  const toutesMuettes = taches.length > 0 && jamais.length === taches.length;

  return (
    <AdminPageShell
      title={t('pm1_scheduler.title')}
      subtitle={t(
        taches.length > 1
          ? 'pm1_scheduler.subtitle_count_plural'
          : 'pm1_scheduler.subtitle_count',
        { count: taches.length },
      )}
      backTo={basePath}
      actions={(
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
          {t('pm1_scheduler.refresh_button')}
        </button>
      )}
    >
      {toutesMuettes && (
        <div style={{ marginBottom: 12 }}>
          <AdminCard padded>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: FT.red, flexShrink: 0, marginTop: 6,
              }} />
              <div>
                <p style={{
                  fontSize: 14, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {t('pm1_scheduler.never_run_title')}
                </p>
                <p style={{
                  fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.6,
                  color: FT.muted,
                }}>
                  {t('pm1_scheduler.never_run_description_prefix')}
                  <span style={{ color: FT.redD }}>
                    {t('pm1_scheduler.never_run_description_emphasis')}
                  </span>
                  {t('pm1_scheduler.never_run_description_suffix')}
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {action.success && (
        <p style={{ fontSize: 12.5, margin: '0 0 12px', color: FT.greenD }}>
          {action.success}
        </p>
      )}
      {action.error && (
        <p style={{ fontSize: 12.5, margin: '0 0 12px', color: FT.redD }}>
          {action.error}
        </p>
      )}

      <AdminCard>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_scheduler.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_scheduler.error_title')}
            description={error}
          />
        )}

        {!loading && !error && taches.length === 0 && (
          <EmptyState icon="clock-play" title={t('pm1_scheduler.empty_title')} />
        )}

        {!loading && !error && taches.map((tache, index) => {
          const couleur = tache.alert
            ? FT.red : tache.stale ? FT.amber : FT.green;
          const etat = tache.alert
            ? t('pm1_scheduler.status_alert')
            : tache.stale ? t('pm1_scheduler.status_stale') : t('pm1_scheduler.status_ok');

          return (
            <div
              key={tache.task_name}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 1.25rem',
                borderBottom: index < taches.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%',
                background: couleur, flexShrink: 0,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {tache.task_name}
                  {tache.critical && (
                    <span style={{ fontSize: 11, color: FT.faint }}>
                      {' '}
                      {t('pm1_scheduler.critical_label')}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11.5, margin: '2px 0 0', color: FT.faint }}>
                  {t('pm1_scheduler.task_status_line', {
                    status: etat,
                    timestamp: horodatage(
                      tache.last_success_at,
                      t('pm1_scheduler.never'),
                    ),
                  })}
                </p>
              </div>

              <button
                type="button"
                disabled={action.running}
                onClick={() => {
                  void action.run(
                    () => adminFinanceApi.runTask(tache.task_name),
                    t('pm1_scheduler.task_executed_success', { name: tache.task_name }),
                  );
                }}
                style={{ fontSize: 12, padding: '5px 12px' }}
              >
                {t('pm1_scheduler.execute_button')}
              </button>
            </div>
          );
        })}
      </AdminCard>
    </AdminPageShell>
  );
}