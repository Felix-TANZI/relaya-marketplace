// frontend/src/features/payments/admin/components/SectionNav.tsx
// Ou aller, et ce qui attend.
//
// Les compteurs qui appellent une ACTION sont en ambre ; les autres en
// gris. Un operateur voit ou aller sans ouvrir cinq ecrans.

import { useNavigate } from 'react-router-dom';

import { FT } from '../../shared/tokens';

export interface NavEntry {
  icon: string;
  label: string;
  path: string;
  count?: string;
  /** Vrai quand ce compteur appelle une action. */
  urgent?: boolean;
}

interface SectionNavProps {
  entries: NavEntry[];
  basePath: string;
}

export default function SectionNav({ entries, basePath }: SectionNavProps) {
  const navigate = useNavigate();

  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      {entries.map((entree, index) => (
        <div
          key={entree.path}
          onClick={() => navigate(`${basePath}${entree.path}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '13px 1.25rem', cursor: 'pointer',
            borderBottom: index < entries.length - 1
              ? `0.5px solid ${FT.border}` : 'none',
          }}
        >
          <i
            className={`ti ti-${entree.icon}`}
            aria-hidden="true"
            style={{
              fontSize: 17, width: 20,
              color: entree.urgent ? FT.amberD : FT.faint,
            }}
          />
          <span style={{
            flex: 1, fontSize: 13.5, color: 'var(--text-primary, #1A1209)',
          }}>
            {entree.label}
          </span>
          {entree.count && (
            <span style={{
              fontSize: 12,
              color: entree.urgent ? FT.amberD : FT.faint,
            }}>
              {entree.count}
            </span>
          )}
          <i
            className="ti ti-chevron-right"
            aria-hidden="true"
            style={{ fontSize: 15, color: FT.faint }}
          />
        </div>
      ))}
    </div>
  );
}