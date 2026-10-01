// frontend/src/features/vendors/v2/compte/shared/Collapsible.tsx
// Bloc replié "Comment ça marche" — motif répété sur presque tous les écrans
// VD-09/VD-10/VD-11 (bloc pédagogique fermé par défaut, jamais de préchargement
// coûteux tant qu'il n'est pas ouvert).

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';

export default function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const { theme } = useTheme();
  const p = palette(theme);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between"
        style={{ padding: '12px 14px', minHeight: 44 }}
      >
        <span className="font-bold" style={{ fontSize: 13, color: p.text }}>{title}</span>
        <ChevronDown
          size={16}
          color={p.textMuted}
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
        />
      </button>
      {open ? (
        <div style={{ padding: '0 14px 14px 14px', fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
