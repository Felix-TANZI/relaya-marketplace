// frontend/src/features/vendors/v2/theme.ts
// Design system de l'espace vendeur v2 — VD-01 §DS-01 à DS-14.
// Remplace les tokens ad hoc de vendorTheme.tsx : palette figée par la spec,
// jamais de bleu (GEN-12), violet réservé au plan Pro.

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

export const TEXT_SIZE = { normal: 1, large: 1.15, xlarge: 1.3 } as const;

export interface VendorPalette {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  orange: string;
  orangeGradientFrom: string;
  orangeGradientTo: string;
  green: string;
  amber: string;
  red: string;
  violet: string; // plan Pro uniquement (GEN-12)
  glass: string;
}

/** Palette claire — verre dépoli sur fond crème (DS-02). */
export const LIGHT: VendorPalette = {
  bg: '#F7F3EE',
  card: '#FFFFFF',
  cardAlt: '#FBF8F4',
  border: '#E8E2D9',
  text: '#1A1209',
  textMuted: '#7C6E5A',
  orange: '#F47920',
  orangeGradientFrom: '#CC4A0B',
  orangeGradientTo: '#AE3B06',
  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
  violet: '#7C3AED',
  glass: 'rgba(255,255,255,0.56)',
};

/** Palette sombre — "Graphite pro" (DS-09). */
export const DARK: VendorPalette = {
  bg: '#0F0F10',
  card: '#18181A',
  cardAlt: '#1D1D20',
  border: 'rgba(255,255,255,0.08)',
  text: '#F3F2F0',
  textMuted: '#A9A5A0',
  orange: '#FF9549',
  orangeGradientFrom: '#CC4A0B',
  orangeGradientTo: '#AE3B06',
  green: '#4FD08F',
  amber: '#F0C04C',
  red: '#FF8A80',
  violet: '#9D6BFF',
  glass: 'rgba(24,24,26,0.72)',
};

export function palette(theme: 'light' | 'dark'): VendorPalette {
  return theme === 'dark' ? DARK : LIGHT;
}

/** Dégradé du bouton principal (DS-06). */
export function primaryGradient(p: VendorPalette): string {
  return `linear-gradient(135deg, ${p.orangeGradientFrom}, ${p.orangeGradientTo})`;
}
