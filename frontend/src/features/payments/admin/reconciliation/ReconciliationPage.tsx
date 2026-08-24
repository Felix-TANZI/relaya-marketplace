// frontend/src/features/payments/admin/reconciliation/ReconciliationPage.tsx
// Reconciliation — ecarts et qualification.
//
// ─────────────────────────────────────────────────────────────────────────
// UN ECART EST QUALIFIE, JAMAIS CORRIGE AUTOMATIQUEMENT
//
// Corriger un ecart mal compris deplacerait de l'argent sur la base d'une
// hypothese. L'operateur choisit une resolution et l'explique ; le systeme
// enregistre son jugement, il ne le remplace pas.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';

import { adminFinanceApi } from '../../api/admin-finance.api';
import type { ListParams } from '../../api/admin-finance.api';
import { useAdminDiscrepancies } from '../../hooks/useFinanceAdmin';
import { useFinanceAction } from '../../hooks/useFinanceAction';
import ApprovalDialog from '../../shared/ApprovalDialog';
import EmptyState from '../../shared/EmptyState';
import FilterTabs from '../../shared/FilterTabs';
import type { FilterTab } from '../../shared/FilterTabs';
import Money from '../../shared/Money';
import Pagination from '../../shared/Pagination';
import { FT } from '../../shared/tokens';
import { formatShortDate } from '../../shared/dates';
import type { AdminDiscrepancyRow } from '../../model/finance.types';
import AdminCard from '../components/AdminCard';
import AdminPageShell from '../components/AdminPageShell';

interface ReconciliationPageProps {
  basePath?: string;
}

const NIVEAUX = [
  { cle: 'solvency', label: 'Solvabilité' },
  { cle: 'escrow', label: 'Séquestres' },
  { cle: 'transactional', label: 'Transactions' },
  { cle: 'unknown_payouts', label: 'Issues inconnues' },
] as const;

const GRAVITES: Record<string, string> = {
  CRITICAL: FT.red,
  HIGH: FT.amber,
  MEDIUM: FT.amber,
  LOW: FT.faint,
};

export default function ReconciliationPage({
  basePath = '/admin/finance',
}: ReconciliationPageProps) {
  const [filtre, setFiltre] = useState('open');
  const [page, setPage] = useState(1);
  const [ecart, setEcart] = useState<AdminDiscrepancyRow | null>(null);
  const [resolution, setResolution] = useState('RESOLVED');

  const requete = useMemo<ListParams>(() => {
    const params: ListParams = { page };
    if (filtre === 'open') params.resolution = 'OPEN';
    if (filtre === 'critical') params.severity = 'CRITICAL';
    return params;
  }, [filtre, page]);

  const { data, loading, error, reload } = useAdminDiscrepancies(requete);
  const action = useFinanceAction(() => {
    reload();
    setEcart(null);
  });

  const lignes = data?.results ?? [];

  const onglets: FilterTab[] = [
    { key: 'open', label: 'Ouverts', urgent: true },
    { key: 'critical', label: 'Critiques' },
    { key: 'all', label: 'Tous' },
  ];

  return (
    <AdminPageShell
      title="Réconciliation"
      subtitle={`${data?.count ?? 0} écart${(data?.count ?? 0) > 1 ? 's' : ''}`}
      backTo={basePath}
      actions={(
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <FilterTabs
            tabs={onglets}
            active={filtre}
            onChange={(cle) => { setFiltre(cle); setPage(1); }}
          />
        </div>
      )}
    >
      <div style={{ marginBottom: 12 }}>
        <AdminCard padded title="Lancer une vérification">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {NIVEAUX.map((niveau) => (
              <button
                key={niveau.cle}
                type="button"
                disabled={action.running}
                onClick={() => {
                  void action.run(
                    () => adminFinanceApi.runReconciliation(niveau.cle),
                    `${niveau.label} : vérification lancée.`,
                  );
                }}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                {niveau.label}
              </button>
            ))}
          </div>
          {action.success && (
            <p style={{ fontSize: 12.5, margin: '12px 0 0', color: FT.greenD }}>
              {action.success}
            </p>
          )}
          {action.error && (
            <p style={{ fontSize: 12.5, margin: '12px 0 0', color: FT.redD }}>
              {action.error}
            </p>
          )}
        </AdminCard>
      </div>

      <AdminCard>
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon="alert-circle"
            title="Impossible d'afficher les écarts"
            description={error}
          />
        )}

        {!loading && !error && lignes.length === 0 && (
          <EmptyState
            icon="check"
            title="Aucun écart"
            description="Le registre et le prestataire concordent."
          />
        )}

        {!loading && !error && lignes.map((ligne, index) => {
          const ouvert = ligne.resolution === 'OPEN';
          return (
            <div
              key={ligne.id}
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
                background: ouvert
                  ? (GRAVITES[ligne.severity] ?? FT.faint) : FT.faint,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 13.5, margin: 0, lineHeight: 1.5,
                  color: 'var(--text-primary, #1A1209)',
                }}>
                  {ligne.detail || ligne.kind_label}
                </p>
                {/* L'action suggeree vient du backend : elle sait ce qu'il
                    faut faire mieux que l'interface. */}
                {ouvert && ligne.suggested_action && (
                  <p style={{
                    fontSize: 12.5, margin: '4px 0 0', lineHeight: 1.55,
                    color: FT.muted,
                  }}>
                    {ligne.suggested_action}
                  </p>
                )}
                {!ouvert && ligne.resolution_note && (
                  <p style={{
                    fontSize: 12, margin: '4px 0 0', color: FT.faint,
                  }}>
                    {ligne.resolution_label} — « {ligne.resolution_note} »
                    {ligne.resolved_by_username
                      && ` · ${ligne.resolved_by_username}`}
                  </p>
                )}
                <p style={{ fontSize: 11.5, margin: '5px 0 0', color: FT.faint }}>
                  {ligne.subject_ref}
                  {' · '}{ligne.severity_label}
                  {' · '}{formatShortDate(ligne.created_at)}
                </p>
              </div>

              {ligne.gap_xaf !== 0 && (
                <span style={{ width: 88, textAlign: 'right', paddingTop: 2 }}>
                  <Money value={ligne.gap_xaf} size={14} showSign />
                </span>
              )}

              <div style={{ width: 96, textAlign: 'right', paddingTop: 2 }}>
                {ouvert && (
                  <button
                    type="button"
                    onClick={() => { setEcart(ligne); setResolution('RESOLVED'); }}
                    style={{ fontSize: 12, padding: '5px 12px' }}
                  >
                    Qualifier
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            count={data.count}
            onChange={setPage}
            label="écart"
          />
        )}
      </AdminCard>

      {ecart && (
        <div style={{ marginTop: 12 }}>
          <AdminCard padded title="Résolution">
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12,
            }}>
              {[
                { cle: 'RESOLVED', label: 'Résolu' },
                { cle: 'INVESTIGATING', label: 'En investigation' },
                { cle: 'ACCEPTED', label: 'Écart accepté' },
                { cle: 'FALSE_POSITIVE', label: 'Faux positif' },
              ].map((choix) => (
                <button
                  key={choix.cle}
                  type="button"
                  onClick={() => setResolution(choix.cle)}
                  style={{
                    fontSize: 12, padding: '6px 12px',
                    borderColor: resolution === choix.cle ? FT.coral : undefined,
                    color: resolution === choix.cle ? '#993C1D' : undefined,
                  }}
                >
                  {choix.label}
                </button>
              ))}
            </div>
          </AdminCard>
        </div>
      )}

      <ApprovalDialog
        open={ecart !== null}
        title="Qualifier cet écart"
        amountXaf={ecart?.gap_xaf ?? 0}
        fields={ecart ? [
          { label: 'Nature', value: ecart.kind_label },
          { label: 'Sujet', value: ecart.subject_ref },
          { label: 'Résolution', value: resolution },
        ] : []}
        confirmLabel="Enregistrer"
        // Une resolution sans note ne vaut rien : le prochain operateur
        // relira ce champ, pas la conversation qui a mene a la decision.
        reasonRequired
        reasonPlaceholder="Ce que vous avez constaté et pourquoi…"
        warning="Un écart est qualifié, jamais corrigé automatiquement."
        running={action.running}
        error={action.error}
        onConfirm={(note) => {
          if (!ecart) return;
          void action.run(
            () => adminFinanceApi.resolveDiscrepancy(
              ecart.id, resolution, note,
            ),
            'Écart qualifié.',
          );
        }}
        onCancel={() => setEcart(null)}
      />
    </AdminPageShell>
  );
}