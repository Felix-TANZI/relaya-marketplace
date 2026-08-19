// frontend/src/features/payments/payee/AdjustmentsPage.tsx
// Penalites et compensations.
//
// ─────────────────────────────────────────────────────────────────────────
// LE MOTIF EST LE SUJET, PAS LE MONTANT
//
// Une retenue sans explication est contractuellement indefendable, et c'est
// la premiere source de litige avec un partenaire.
//
// D'ou la mise en page : le motif en premier, en taille normale ; la
// categorie en dessous, en gris. L'inverse — categorie en titre, motif en
// note — ferait lire « Penalite » a quelqu'un qui veut savoir POURQUOI.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';

import { useAdjustments } from '../hooks/useSettlements';
import EmptyState from '../shared/EmptyState';
import Money from '../shared/Money';
import { FT } from '../shared/tokens';
import { formatDay } from '../shared/dates';
import type { Adjustment } from '../model/adjustment.types';

function Ligne({ adjustment, showBorder }: {
  adjustment: Adjustment; showBorder: boolean;
}) {
  const estRetenue = adjustment.direction === 'CREDIT';
  const solde = adjustment.remaining_xaf === 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 1.25rem',
      borderBottom: showBorder ? `0.5px solid ${FT.border}` : 'none',
    }}>
      <span
        aria-hidden="true"
        style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          marginTop: 6,
          background: solde ? FT.faint : estRetenue ? FT.amber : FT.green,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13.5, margin: 0, lineHeight: 1.5,
          color: 'var(--text-primary, #1A1209)',
        }}>
          {adjustment.reason}
        </p>
        <p style={{ fontSize: 11.5, margin: '3px 0 0', color: FT.faint }}>
          {adjustment.category_label} · {formatDay(adjustment.created_at)}
          {solde && ' · soldé'}
        </p>
      </div>

      <div style={{ textAlign: 'right' }}>
        <Money
          value={estRetenue ? -adjustment.amount_xaf : adjustment.amount_xaf}
          size={15}
        />
        {!solde && adjustment.remaining_xaf !== adjustment.amount_xaf && (
          <p style={{ fontSize: 11, margin: '2px 0 0', color: FT.faint }}>
            reste {adjustment.remaining_xaf.toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdjustmentsPage() {
  const { data, loading, error } = useAdjustments();

  const { enCours, soldes } = useMemo(() => {
    const tous = data ?? [];
    return {
      enCours: tous.filter((a) => a.remaining_xaf > 0),
      soldes: tous.filter((a) => a.remaining_xaf === 0),
    };
  }, [data]);

  return (
    <div style={{ maxWidth: 880 }}>
      <p style={{
        fontSize: 19, margin: '0 0 4px', color: 'var(--text-primary, #1A1209)',
      }}>
        Mes ajustements
      </p>
      <p style={{ fontSize: 12.5, margin: '0 0 1.25rem', color: FT.muted }}>
        Retenues et compensations appliquées à vos règlements.
      </p>

      {loading && (
        <div style={{ padding: '2.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: FT.faint }}>Chargement…</span>
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon="alert-circle"
          title="Impossible d'afficher vos ajustements"
          description={error}
        />
      )}

      {!loading && !error && enCours.length === 0 && soldes.length === 0 && (
        <div style={{
          background: 'var(--surface-2, #FFFFFF)',
          border: `0.5px solid ${FT.border}`, borderRadius: 16,
        }}>
          <EmptyState
            icon="check"
            title="Aucun ajustement"
            description="Aucune retenue ni compensation sur votre compte."
          />
        </div>
      )}

      {enCours.length > 0 && (
        <div style={{ marginBottom: soldes.length > 0 ? '1.5rem' : 0 }}>
          <p style={{
            fontSize: 11, margin: '0 0 10px', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: FT.faint,
          }}>
            En cours
          </p>
          <div style={{
            background: 'var(--surface-2, #FFFFFF)',
            border: `0.5px solid ${FT.border}`,
            borderRadius: 16, overflow: 'hidden',
          }}>
            {enCours.map((ajustement, index) => (
              <Ligne
                key={ajustement.reference}
                adjustment={ajustement}
                showBorder={index < enCours.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {soldes.length > 0 && (
        <div>
          <p style={{
            fontSize: 11, margin: '0 0 10px', letterSpacing: '0.08em',
            textTransform: 'uppercase', color: FT.faint,
          }}>
            Soldés
          </p>
          <div style={{
            background: 'var(--surface-2, #FFFFFF)',
            border: `0.5px solid ${FT.border}`,
            borderRadius: 16, overflow: 'hidden',
          }}>
            {soldes.map((ajustement, index) => (
              <Ligne
                key={ajustement.reference}
                adjustment={ajustement}
                showBorder={index < soldes.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}