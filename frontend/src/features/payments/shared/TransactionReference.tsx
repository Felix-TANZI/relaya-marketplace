// frontend/src/features/payments/shared/TransactionReference.tsx
// Une reference financiere, copiable d'un clic.
//
// BLV-PAY-2026-0000412 est ce qu'un partenaire cite au support et ce qu'un
// operateur colle dans une recherche. La recopier a la main est une source
// d'erreur inutile.

import { useState } from 'react';

import { NUM } from './tokens';

interface TransactionReferenceProps {
  value: string;
  size?: number;
  muted?: boolean;
}

export default function TransactionReference({
  value, size = 12.5, muted = false,
}: TransactionReferenceProps) {
  const [copie, setCopie] = useState(false);

  const copier = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1600);
    });
  };

  return (
    <button
      type="button"
      onClick={copier}
      title={copie ? 'Copié' : 'Copier la référence'}
      style={{
        ...NUM,
        fontSize: size, padding: 0, border: 'none', background: 'none',
        color: muted
          ? 'var(--text-secondary, #7C6E5A)'
          : 'var(--text-primary, #1A1209)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {value}
      <i
        className={copie ? 'ti ti-check' : 'ti ti-copy'}
        aria-hidden="true"
        style={{ fontSize: 13, color: 'var(--text-muted, #B4B2A9)' }}
      />
    </button>
  );
}