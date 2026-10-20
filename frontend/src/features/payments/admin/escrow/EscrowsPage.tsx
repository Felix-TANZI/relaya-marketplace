// frontend/src/features/payments/admin/escrow/EscrowsPage.tsx
// Sequestres — geler, degeler, liberer.
//
// ─────────────────────────────────────────────────────────────────────────
// LE GEL EST SCOPE, ET L'ECRAN DOIT LE MONTRER
//
// Geler un colis ne gele NI les autres colis du meme paiement, NI le
// transport, NI les autres beneficiaires. C'est ce que la cle a quatre
// dimensions rend possible.
//
// Sans cette information visible, un operateur croirait avoir bloque tout
// le paiement — et laisserait partir l'argent qu'il pensait retenu.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminEscrow } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import ApprovalDialog from '../../shared/ApprovalDialog';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import StatusBadge from '../../shared/StatusBadge';
import { FT } from '../../shared/tokens';
import { formatXaf } from '../../shared/format';
import { formatShortDate } from '../../shared/dates';
import type { AdminEscrowRow } from '../../model/finance.types';

interface AdminEscrowsPageProps {
  basePath?: string;
}

type Dialogue =
  | { mode: 'freeze' | 'unfreeze' | 'release'; hold: AdminEscrowRow }
  | null;

const FILTRES: Record<string, string> = {
  held: 'HELD',
  scheduled: 'RELEASE_SCHEDULED',
  frozen: 'FROZEN',
  all: '',
};

export default function AdminEscrowsPage({
  basePath = '/admin/finance',
}: AdminEscrowsPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtre = params.get('filter') ?? 'held';
  const [dialogue, setDialogue] = useState<Dialogue>(null);

  const requete = useMemo<ListParams>(() => {
    // Le client HTTP n'accepte pas `undefined` : on OMET la cle plutot que
    // de lui donner une valeur vide, sinon l'URL porterait
    // `?status=undefined`.
    const statut = FILTRES[filtre] ?? '';
    const params: ListParams = {};
    if (statut) params.status = statut;
    return params;
  }, [filtre]);

  const { data, loading, error, reload } = useAdminEscrow(requete);
  const action = useFinanceAction(() => {
    reload();
    setDialogue(null);
  });

  const lignes = data?.results ?? [];
  const total = lignes.reduce((somme, ligne) => somme + ligne.payable_xaf, 0);

  const onglets: FilterTab[] = [
    { key: 'held', label: t('pm1_escrows.tab_held') },
    { key: 'scheduled', label: t('pm1_escrows.tab_scheduled') },
    { key: 'frozen', label: t('pm1_escrows.tab_frozen'), urgent: true },
    { key: 'all', label: t('pm1_escrows.tab_all') },
  ];

  const confirmer = (motif: string) => {
    if (!dialogue) return;
    const reference = dialogue.hold.reference;
    const appels = {
      freeze: () => adminFinanceApi.freezeEscrow(reference, motif),
      unfreeze: () => adminFinanceApi.unfreezeEscrow(reference, motif),
      release: () => adminFinanceApi.releaseEscrow(reference, motif),
    };
    const messages = {
      freeze: t('pm1_escrows.toast_frozen'),
      unfreeze: t('pm1_escrows.toast_unfrozen'),
      release: t('pm1_escrows.toast_released'),
    };
    void action.run(appels[dialogue.mode], messages[dialogue.mode]);
  };

  return (
    <div style={{ maxWidth: 900 }}>
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
        {t('pm1_escrows.back_label')}
      </button>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: '1rem',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 19, margin: 0, color: 'var(--text-primary, #1A1209)',
          }}>
            {t('pm1_escrows.title')}
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            {t('pm1_escrows.total_count', { count: data?.count ?? 0 })}
            {total > 0 && t('pm1_escrows.total_on_page', { amount: formatXaf(total) })}
          </p>
        </div>
        <FilterTabs
          tabs={onglets}
          active={filtre}
          onChange={(cle) => setParams({ filter: cle })}
        />
      </div>

      {action.success && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
          padding: '0.9rem 1.25rem', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span aria-hidden="true" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: FT.green, flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary, #1A1209)' }}>
            {action.success}
          </span>
        </div>
      )}

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>{t('pm1_escrows.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title={t('pm1_escrows.error_title')}
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState icon="lock" title={t('pm1_escrows.empty_title')} />
        )}

        {!loading && !error && lignes.map((hold, index) => {
          const gele = hold.status === 'FROZEN';
          const actif = hold.status === 'HELD'
            || hold.status === 'RELEASE_SCHEDULED';

          return (
            <div
              key={hold.reference}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < lignes.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <div
                onClick={() => navigate(
                  `${basePath}/escrow/${hold.reference}`,
                )}
                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <p style={{
                  fontSize: 13.5, margin: 0,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {hold.order_id
                    ? t('pm1_escrows.order_number', { id: hold.order_id })
                    : hold.component_label}
                  <span style={{ color: FT.faint }}>
                    {' · '}{hold.payee.display_label || hold.payee.payee_code}
                  </span>
                </p>
                <div style={{ marginTop: 5 }}>
                  <StatusBadge
                    domain="escrow"
                    status={hold.status}
                    label={hold.status_label}
                    guidance={hold.guidance}
                    size="sm"
                  />
                </div>
                {hold.frozen_reason && (
                  <p style={{
                    fontSize: 11.5, margin: '5px 0 0', color: FT.redD,
                  }}>
                    {hold.frozen_reason}
                  </p>
                )}
                {!hold.frozen_reason && hold.release_at && (
                  <p style={{
                    fontSize: 11.5, margin: '5px 0 0', color: FT.faint,
                  }}>
                    {t('pm1_escrows.release_on', { date: formatShortDate(hold.release_at) })}
                  </p>
                )}
              </div>

              <span style={{ width: 92, textAlign: 'right', paddingTop: 2 }}>
                <Money value={hold.payable_xaf} size={15} />
              </span>

              <div style={{
                width: 96, textAlign: 'right', paddingTop: 2,
                display: 'flex', gap: 6, justifyContent: 'flex-end',
              }}>
                {gele && (
                  <button
                    type="button"
                    onClick={() => setDialogue({ mode: 'unfreeze', hold })}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    {t('pm1_escrows.unfreeze')}
                  </button>
                )}
                {actif && (
                  <button
                    type="button"
                    onClick={() => setDialogue({ mode: 'freeze', hold })}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    {t('pm1_escrows.freeze')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ApprovalDialog
        open={dialogue !== null}
        title={{
          freeze: t('pm1_escrows.dialog_title_freeze'),
          unfreeze: t('pm1_escrows.dialog_title_unfreeze'),
          release: t('pm1_escrows.dialog_title_release'),
        }[dialogue?.mode ?? 'freeze']}
        amountXaf={dialogue?.hold.payable_xaf ?? 0}
        fields={dialogue ? [
          {
            label: t('pm1_escrows.field_payee'),
            value: dialogue.hold.payee.display_label
              || dialogue.hold.payee.payee_code,
          },
          {
            label: t('pm1_escrows.field_order'),
            value: dialogue.hold.order_id
              ? `#${dialogue.hold.order_id}`
              : dialogue.hold.component_label,
          },
          { label: t('pm1_escrows.field_reference'), value: dialogue.hold.reference },
        ] : []}
        confirmLabel={{
          freeze: t('pm1_escrows.freeze'),
          unfreeze: t('pm1_escrows.unfreeze'),
          release: t('pm1_escrows.release'),
        }[dialogue?.mode ?? 'freeze']}
        // Toute action sur un sequestre exige un motif : elle deplace ou
        // retient de l'argent qui ne nous appartient pas.
        reasonRequired
        reasonPlaceholder={{
          freeze: t('pm1_escrows.placeholder_freeze'),
          unfreeze: t('pm1_escrows.placeholder_unfreeze'),
          release: t('pm1_escrows.placeholder_release'),
        }[dialogue?.mode ?? 'freeze']}
        danger={dialogue?.mode === 'release'}
        warning={dialogue?.mode === 'freeze'
          ? t('pm1_escrows.warning_freeze')
          : dialogue?.mode === 'release'
            ? t('pm1_escrows.warning_release')
            : undefined}
        running={action.running}
        error={action.error}
        onConfirm={confirmer}
        onCancel={() => setDialogue(null)}
      />
    </div>
  );
}