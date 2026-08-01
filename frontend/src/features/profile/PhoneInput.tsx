// frontend/src/features/profile/PhoneInput.tsx
// Champ téléphone avec sélecteur de pays (drapeau + indicatif) et validation de longueur.
// La valeur émise est au format compact "+237690000000" (indicatif + national), ou "" si vide.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type Country = { code: string; name: string; flag: string; dial: string; len: number[] };

const COUNTRIES: Country[] = [
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237', len: [9] },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241', len: [8] },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dial: '+235', len: [8] },
  { code: 'CF', name: 'Centrafrique', flag: '🇨🇫', dial: '+236', len: [8] },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242', len: [9] },
  { code: 'GQ', name: 'Guinée équ.', flag: '🇬🇶', dial: '+240', len: [9] },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dial: '+225', len: [10] },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221', len: [9] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dial: '+234', len: [10] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dial: '+233', len: [9] },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212', len: [9] },
  { code: 'FR', name: 'France', flag: '🇫🇷', dial: '+33', len: [9] },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32', len: [9] },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dial: '+44', len: [10] },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dial: '+1', len: [10] },
];

const DEFAULT_COUNTRY = COUNTRIES[0];

function parseValue(value: string): { country: Country; national: string } {
  const raw = (value || '').replace(/[\s()-]/g, '');
  if (raw.startsWith('+')) {
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    const match = sorted.find((c) => raw.startsWith(c.dial));
    if (match) return { country: match, national: raw.slice(match.dial.length).replace(/\D/g, '') };
  }
  return { country: DEFAULT_COUNTRY, national: raw.replace(/\D/g, '') };
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = 'Numéro',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const initial = useMemo(() => parseValue(value), [value]);
  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState<string>(initial.national);
  const [open, setOpen] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Resynchronise si la valeur externe change réellement (ne pas écraser un choix de pays quand le numéro est vide).
  // Ajustement pendant le rendu (pattern React recommandé) plutôt que dans un effet, pour éviter les rendus en cascade.
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = parseValue(value);
    if (parsed.national) {
      setCountry(parsed.country);
      setNational(parsed.national);
    } else {
      setNational('');
    }
  }

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const emit = (c: Country, n: string) => onChange(n ? `${c.dial}${n}` : '');

  const handleNational = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setNational(digits);
    emit(country, digits);
  };

  const pick = (c: Country) => {
    setCountry(c);
    setOpen(false);
    emit(c, national);
  };

  const valid = national.length === 0 || country.len.includes(national.length);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className={`pf-phone${valid ? '' : ' invalid'}`}>
        <button type="button" className="pf-phone-country" onClick={() => setOpen((v) => !v)} aria-label="Choisir le pays">
          <span style={{ fontSize: 16, lineHeight: 1 }}>{country.flag}</span>
          <span>{country.dial}</span>
          <ChevronDown size={13} />
        </button>
        <input
          className="pf-phone-input"
          inputMode="numeric"
          value={national}
          onChange={(event) => handleNational(event.target.value)}
          placeholder={placeholder}
        />
      </div>

      {!valid && (
        <div className="pf-phone-err">
          Numéro incorrect — {country.name} attend {country.len.join(' ou ')} chiffres ({national.length} saisis).
        </div>
      )}

      {open && (
        <div className="pf-phone-menu">
          {COUNTRIES.map((c) => (
            <button type="button" key={c.code} className="pf-phone-opt" onClick={() => pick(c)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{c.flag}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
              <span className="pf-phone-dial">{c.dial}</span>
              {c.code === country.code ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}