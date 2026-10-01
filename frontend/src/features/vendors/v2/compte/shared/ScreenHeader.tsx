// frontend/src/features/vendors/v2/compte/shared/ScreenHeader.tsx
// En-tête réutilisable des écrans "Vendre plus" / "Mon compte" — flèche retour
// + titre, même style que les autres écrans du Lot 1 (theme.ts, palette(theme)).

import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { palette } from '../../theme';

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 mb-4 pt-1">
      <button
        type="button"
        onClick={onBack ?? (() => navigate(-1))}
        aria-label="Retour"
        className="flex items-center justify-center rounded-full flex-shrink-0 active:scale-95 transition-transform"
        style={{ width: 36, height: 36, background: p.card, border: `1px solid ${p.border}` }}
      >
        <ChevronLeft size={19} color={p.text} />
      </button>
      <div className="min-w-0">
        <h1 className="font-black truncate" style={{ fontSize: 17, color: p.text }}>
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate" style={{ fontSize: 11.5, color: p.textMuted }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
