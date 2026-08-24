// frontend/src/features/payments/shared/FinanceTable.tsx
// Une liste financiere : lignes bordees, chiffres alignes.
//
// Pas de cartes arrondies pour des listes denses — un operateur qui balaie
// quarante versements a besoin de lignes, pas de vignettes.

import type { ReactNode } from 'react';

import EmptyState from './EmptyState';
import { FT } from './tokens';

export interface Column<T> {
  key: string;
  header: string;
  /** Les colonnes de montants s'alignent a droite. */
  align?: 'left' | 'right';
  width?: number | string;
  render: (row: T) => ReactNode;
}

interface FinanceTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function FinanceTable<T>({
  columns, rows, rowKey, loading = false, onRowClick,
  emptyTitle = 'Rien à afficher',
  emptyDescription,
}: FinanceTableProps<T>) {
  if (loading) {
    return (
      <div style={{ padding: '2.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted, #B4B2A9)' }}>
          Chargement…
        </span>
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div>
      <div style={{
        display: 'flex', padding: '0 1.25rem 10px',
        borderBottom: `0.5px solid ${FT.border}`,
      }}>
        {columns.map((colonne) => (
          <span
            key={colonne.key}
            style={{
              fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--text-muted, #B4B2A9)',
              flex: colonne.width ? undefined : 1,
              width: colonne.width,
              textAlign: colonne.align ?? 'left',
            }}
          >
            {colonne.header}
          </span>
        ))}
      </div>

      {rows.map((ligne) => (
        <div
          key={rowKey(ligne)}
          onClick={onRowClick ? () => onRowClick(ligne) : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '13px 1.25rem',
            borderBottom: `0.5px solid ${FT.border}`,
            cursor: onRowClick ? 'pointer' : 'default',
          }}
        >
          {columns.map((colonne) => (
            <span
              key={colonne.key}
              style={{
                fontSize: 13,
                color: 'var(--text-primary, #1A1209)',
                flex: colonne.width ? undefined : 1,
                width: colonne.width,
                textAlign: colonne.align ?? 'left',
                minWidth: 0,
              }}
            >
              {colonne.render(ligne)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}