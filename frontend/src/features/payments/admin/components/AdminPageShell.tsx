// frontend/src/features/payments/admin/components/AdminPageShell.tsx
// L'ossature commune des ecrans du centre financier.
//
// Retour, titre, sous-titre, actions. Huit ecrans partagent exactement
// cette structure — la repeter huit fois garantirait qu'ils divergent.

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { FT } from '../../shared/tokens';

interface AdminPageShellProps {
  title: string;
  subtitle?: ReactNode;
  backTo: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}

export default function AdminPageShell({
  title, subtitle, backTo, backLabel = 'Centre financier',
  actions, children, maxWidth = 900,
}: AdminPageShellProps) {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth }}>
      <button
        type="button"
        onClick={() => navigate(backTo)}
        style={{ fontSize: 12.5, padding: '6px 12px', marginBottom: 10 }}
      >
        <i
          className="ti ti-arrow-left"
          aria-hidden="true"
          style={{ fontSize: 14, verticalAlign: -2, marginRight: 6 }}
        />
        {backLabel}
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
            {title}
          </p>
          {subtitle && (
            <p style={{ fontSize: 12.5, margin: '4px 0 0', color: FT.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </div>

      {children}
    </div>
  );
}