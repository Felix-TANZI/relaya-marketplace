// frontend/src/features/payments/shared/SearchBar.tsx
// Recherche d'une liste financiere.
//
// La saisie est DIFFEREE : chercher a chaque frappe declencherait une
// requete par caractere sur des tables qui grossissent vite.

import { useEffect, useState } from 'react';

import { FT } from './tokens';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export default function SearchBar({
  value, onChange, placeholder = 'Rechercher…', delay = 350,
}: SearchBarProps) {
  const [saisie, setSaisie] = useState(value);

  useEffect(() => {
    if (saisie === value) return;
    const minuteur = window.setTimeout(() => onChange(saisie), delay);
    return () => window.clearTimeout(minuteur);
  }, [saisie, value, onChange, delay]);

  return (
    <div style={{ position: 'relative', minWidth: 220 }}>
      <i
        className="ti ti-search"
        aria-hidden="true"
        style={{
          position: 'absolute', left: 11, top: '50%',
          transform: 'translateY(-50%)', fontSize: 14, color: FT.faint,
        }}
      />
      <input
        type="search"
        value={saisie}
        onChange={(evenement) => setSaisie(evenement.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', fontSize: 12.5, paddingLeft: 32 }}
      />
    </div>
  );
}