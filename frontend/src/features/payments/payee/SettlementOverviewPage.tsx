// frontend/src/features/payments/payee/SettlementOverviewPage.tsx
// Accueil financier — vendeur, entreprise de livraison, point relais.
//
// ─────────────────────────────────────────────────────────────────────────
// UN SEUL ECRAN POUR TROIS ESPACES
//
// Vendeur, transporteur et point relais sont LE MEME acteur financier : un
// compte beneficiaire qui consulte son du, ses reglements, ses ajustements.
//
// Les differences sont marginales — le relais a sa grille tarifaire, le
// transporteur ses preuves de livraison — et vivent dans `relay/` et
// `delivery/`. Dupliquer trois fois cet ecran aurait garanti qu'ils
// divergent au premier correctif.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAdjustments, useSettlements } from '../hooks/useSettlements';
import { useAmountDue } from '../hooks/useAmountDue';
import EmptyState from '../shared/EmptyState';
import FinancialAlert from '../shared/FinancialAlert';
import { FT } from '../shared/tokens';
import AmountDueCard from './components/AmountDueCard';
import SettlementRow from './components/SettlementRow';

interface SettlementOverviewPageProps {
  /** Racine des routes de l'espace : /seller, /relay-point, … */
  basePath?: string;
  /** Ou envoyer un partenaire dont le dossier bloque le versement. */
  profilePath?: string;
}

export default function SettlementOverviewPage({
  basePath = '/seller',
  profilePath,
}: SettlementOverviewPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: due, loading, error } = useAmountDue();
  const { data: batches } = useSettlements();
  const { data: adjustments } = useAdjustments();

  const derniers = useMemo(() => (batches ?? []).slice(0, 3), [batches]);

  /**
   * La retenue est remontee AU-DESSUS de sa place logique.
   *
   * Un partenaire qui recoit moins qu'attendu ouvre un litige ; le meme
   * qui lit « retard de livraison du 12 mars » verifie et passe a autre
   * chose.
   */
  const retenue = useMemo(
    () => (adjustments ?? []).find(
      (ajustement) => ajustement.direction === 'CREDIT'
        && ajustement.remaining_xaf > 0,
    ),
    [adjustments],
  );

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: FT.faint }}>{t('sl2_payee_settlements.loading')}</span>
      </div>
    );
  }

  if (error || !due) {
    return (
      <EmptyState
        icon="alert-circle"
        title={t('sl2_payee_settlements.overview_error_title')}
        description={error ?? t('sl2_payee_settlements.overview_retry')}
      />
    );
  }

  const titre = due.display_label || t('sl2_payee_settlements.overview_title');

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: '1.25rem',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{
            fontSize: 19, margin: 0, color: 'var(--text-primary, #1A1209)',
          }}>
            {t('sl2_payee_settlements.overview_title')}
          </p>
          <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
            {titre}
            {due.payee_type_label ? ` · ${due.payee_type_label.toLowerCase()}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/payments`)}
          style={{ fontSize: 12.5, padding: '7px 14px' }}
        >
          <i
            className="ti ti-file-text"
            aria-hidden="true"
            style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
          />
          {t('sl2_payee_settlements.all_statements')}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <AmountDueCard
          due={due}
          onResolveBlockers={
            profilePath ? () => navigate(profilePath) : undefined
          }
        />
      </div>

      {retenue && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`,
          borderRadius: 16, marginBottom: '1.5rem',
        }}>
          <FinancialAlert
            severity="ATTENTION"
            title={t('sl2_payee_settlements.holdback_title', { amount: retenue.remaining_xaf.toLocaleString('fr-FR') })}
            detail={retenue.reason}
            actionLabel={t('sl2_payee_settlements.detail')}
            onAction={() => navigate(`${basePath}/adjustments`)}
          />
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 10,
      }}>
        <p style={{
          fontSize: 11, margin: 0, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: FT.faint,
        }}>
          {t('sl2_payee_settlements.recent_settlements')}
        </p>
        {derniers.length > 0 && (
          <button
            type="button"
            onClick={() => navigate(`${basePath}/payments`)}
            style={{ fontSize: 12, padding: '5px 11px' }}
          >
            {t('sl2_payee_settlements.see_all')}
          </button>
        )}
      </div>

      <div style={{
        background: 'var(--surface-2, #FFFFFF)',
        border: `0.5px solid ${FT.border}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {derniers.length === 0 ? (
          <EmptyState
            icon="receipt"
            title={t('sl2_payee_settlements.empty_title')}
            description={t('sl2_payee_settlements.empty_description_short')}
          />
        ) : (
          derniers.map((lot, index) => (
            <SettlementRow
              key={lot.reference}
              batch={lot}
              showBorder={index < derniers.length - 1}
              onClick={() => navigate(`${basePath}/payments/${lot.reference}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}