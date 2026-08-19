// frontend/src/features/payments/admin/components/AdminCard.tsx
// Le conteneur des listes et blocs du centre financier.

import type { ReactNode } from 'react';

import { FT } from '../../shared/tokens';

interface AdminCardProps {
  children: ReactNode;
  padded?: boolean;
  title?: string;
}

export default function AdminCard({
  children, padded = false, title,
}: AdminCardProps) {
  return (
    <div style={{
      background: 'var(--surface-2, #FFFFFF)',
      border: `0.5px solid ${FT.border}`,
      borderRadius: 16, overflow: 'hidden',
      padding: padded ? '1.25rem' : 0,
    }}>
      {title && (
        <p style={{
          fontSize: 11, margin: padded ? '0 0 14px' : '1rem 1.25rem 0.5rem',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: FT.faint,
        }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}