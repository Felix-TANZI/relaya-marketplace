// frontend/src/features/payments/admin/adjustments/AdjustmentsPage.tsx
// Ajustements — penalites et compensations.
//
// ─────────────────────────────────────────────────────────────────────────
// LE MOTIF EST OBLIGATOIRE, ET C'EST LE SUJET
//
// Une retenue sans explication est contractuellement indefendable, et c'est
// la premiere source de litige avec un partenaire.
//
// Le formulaire impose donc le motif avant tout enregistrement — le service
// le refuserait de toute facon.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminAdjustments } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';

interface AdminAdjustmentsPageProps {
  basePath?: string;
}

const FILTRES: Record<string, string> = {
  pending: 'PENDING_APPROVAL',
  approved: 'APPROVED',
  all: '',
};

export default function AdminAdjustmentsPage({
  basePath = '/admin/finance',
}: AdminAdjustmentsPageProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtre = params.get('filter') ?? 'pending';

  const requete = useMemo<ListParams>(() => {
    // Le client HTTP n'accepte pas `undefined` : on OMET la cle plutot que
    // de lui donner une valeur vide, sinon l'URL porterait
    // `?status=undefined`.
    const statut = FILTRES[filtre] ?? '';
    const params: ListParams = {};
    if (statut) params.status = statut;
    return params;
  }, [filtre]);

  const { data, loading, error, reload } = useAdminAdjustments(requete);
  const action = useFinanceAction(reload);

  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'pending', label: 'À approuver', urgent: true },
    { key: 'approved', label: 'Approuvés' },
    { key: 'all', label: 'Tous' },
  ];

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
        Centre financier
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
            Ajustements
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            Retenues et compensations appliquées aux règlements.
          </p>
        </div>
        <FilterTabs
          tabs={onglets}
          active={filtre}
          onChange={(cle) => setParams({ filter: cle })}
        />
      </div>

      {action.error && (
        <p style={{ fontSize: 12.5, margin: '0 0 12px', color: FT.redD }}>
          {action.error}
        </p>
      )}

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher les ajustements"
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState icon="adjustments" title="Aucun ajustement" />
        )}

        {!loading && !error && lignes.map((ajustement, index) => {
          const estRetenue = ajustement.direction === 'CREDIT';
          const aApprouver = ajustement.status === 'PENDING_APPROVAL';
          const contractuel = Boolean(ajustement.source_contract);

          return (
            <div
              key={ajustement.reference}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 1.25rem',
                borderBottom: index < lignes.length - 1
                  ? `0.5px solid ${FT.border}` : 'none',
              }}
            >
              <span aria-hidden="true" style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                marginTop: 6,
                background: aApprouver
                  ? FT.amber : estRetenue ? FT.faint : FT.green,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Le motif en premier : c'est ce qu'on veut lire. */}
                <p style={{
                  fontSize: 13.5, margin: 0, lineHeight: 1.5,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {ajustement.reason}
                </p>
                <p style={{ fontSize: 11.5, margin: '4px 0 0', color: FT.faint }}>
                  {ajustement.direction_label}
                  {' · '}{ajustement.payee.display_label
                    || ajustement.payee.payee_code}
                  {' · '}{formatShortDate(ajustement.created_at)}
                  {contractuel && ' · autorisé par contrat'}
                </p>
              </div>

              <div style={{ textAlign: 'right', paddingTop: 2 }}>
                <Money
                  value={estRetenue
                    ? -ajustement.amount_xaf : ajustement.amount_xaf}
                  size={15}
                />
                {ajustement.remaining_xaf !== ajustement.amount_xaf && (
                  <p style={{ fontSize: 11, margin: '2px 0 0', color: FT.faint }}>
                    reste {ajustement.remaining_xaf.toLocaleString('fr-FR')}
                  </p>
                )}
              </div>

              <div style={{ width: 96, textAlign: 'right', paddingTop: 2 }}>
                {aApprouver && (
                  <button
                    type="button"
                    disabled={action.running}
                    onClick={() => {
                      void action.run(
                        () => adminFinanceApi.approveAdjustment(
                          ajustement.reference,
                        ),
                      );
                    }}
                    style={{
                      fontSize: 12, padding: '5px 12px',
                      borderColor: FT.green, color: FT.greenD,
                    }}
                  >
                    Approuver
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}