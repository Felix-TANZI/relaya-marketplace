// frontend/src/features/payments/shared/FilterTabs.tsx
// Filtres d'une liste financiere.
//
// Le compteur fait partie du filtre : « À approuver · 4 » dit a la fois ou
// aller et combien attendent. Sans lui, il faut ouvrir chaque onglet pour
// savoir lequel demande une action.

import { FT } from './tokens';

export interface FilterTab {
  key: string;
  label: string;
  count?: number;
  /** Vrai quand ce filtre appelle une action. */
  urgent?: boolean;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (key: string) => void;
}

export default function FilterTabs({
  tabs, active, onChange,
}: FilterTabsProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {tabs.map((onglet) => {
        const selectionne = onglet.key === active;
        return (
          <button
            key={onglet.key}
            type="button"
            onClick={() => onChange(onglet.key)}
            style={{
              fontSize: 12, padding: '6px 12px',
              borderColor: selectionne
                ? FT.coral
                : onglet.urgent ? FT.amber : undefined,
              color: selectionne
                ? '#993C1D'
                : onglet.urgent ? FT.amberD : undefined,
            }}
          >
            {onglet.label}
            {onglet.count !== undefined && onglet.count > 0
              && ` · ${onglet.count}`}
          </button>
        );
      })}
    </div>
  );
}