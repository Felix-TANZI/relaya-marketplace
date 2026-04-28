// frontend/src/hooks/useAdminTheme.ts
// Hook qui retourne les tokens de couleur de l'espace admin BelivaY
// en fonction du thème actif (clair / sombre).
//
// UTILISATION dans chaque composant admin :
//   import { useAdminTheme } from '@/hooks/useAdminTheme';
//   const T = useAdminTheme();
//
// Accent admin : rouge #DC2626 — différencié de l'orange vendeur (#F47920)
// Topbar / Sidebar : toujours sombres dans les DEUX thèmes.
// Le thème clair/sombre n'affecte que le fond de page, les cards et le texte.

import { useTheme } from '@/context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminTokens {
  // ── Accent (rouge — autorité admin) ──────────────────────────────────────
  red:      string;  // #DC2626
  redL:     string;  // fond rouge pâle
  redB:     string;  // rouge très transparent (badges, hover)
  redDk:    string;  // rouge foncé (hover bouton)

  // ── Fonds / Surfaces ──────────────────────────────────────────────────────
  page:     string;  // fond de page général
  card:     string;  // surface card / panel
  cardAlt:  string;  // surface secondaire (header card, section)
  border:   string;  // bordure standard

  // ── Texte ─────────────────────────────────────────────────────────────────
  text:     string;  // texte principal
  muted:    string;  // texte secondaire
  mutedL:   string;  // texte tertiaire / placeholder

  // ── Layout (toujours sombres) ─────────────────────────────────────────────
  sidebar:  string;  // fond sidebar
  topbar:   string;  // fond topbar (gradient appliqué via CSS)
  sideText: string;  // texte sidebar items
  sideMuted:string;  // texte sidebar items inactifs

  // ── Statuts sémantiques ───────────────────────────────────────────────────
  green:    string;
  greenL:   string;
  orange:   string;  // orange BelivaY (accent secondaire, statuts)
  orangeL:  string;
  amber:    string;
  amberL:   string;
  blue:     string;
  blueL:    string;
  violet:   string;
  violetL:  string;
  gray:     string;
  grayL:    string;

  // ── Input ─────────────────────────────────────────────────────────────────
  input:    string;  // fond input
  inputBorder: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// THÈME CLAIR
// ─────────────────────────────────────────────────────────────────────────────
const LIGHT: AdminTokens = {
  red:      '#DC2626',
  redL:     '#FEF2F2',
  redB:     'rgba(220,38,38,0.10)',
  redDk:    '#B91C1C',

  page:     '#F3F4F6',
  card:     '#FFFFFF',
  cardAlt:  '#F9FAFB',
  border:   '#E5E7EB',

  text:     '#111827',
  muted:    '#6B7280',
  mutedL:   '#9CA3AF',

  // Layout — toujours sombres même en thème clair
  sidebar:  '#111827',
  topbar:   '#0F1117',
  sideText: '#F9FAFB',
  sideMuted:'rgba(249,250,251,0.45)',

  green:    '#16A34A',
  greenL:   'rgba(22,163,74,0.10)',
  orange:   '#F47920',
  orangeL:  'rgba(244,121,32,0.10)',
  amber:    '#D97706',
  amberL:   'rgba(217,119,6,0.10)',
  blue:     '#1D4ED8',
  blueL:    'rgba(29,78,216,0.10)',
  violet:   '#7C3AED',
  violetL:  'rgba(124,58,237,0.10)',
  gray:     '#6B7280',
  grayL:    'rgba(107,114,128,0.10)',

  input:    '#FFFFFF',
  inputBorder: '#D1D5DB',
};

// ─────────────────────────────────────────────────────────────────────────────
// THÈME SOMBRE
// ─────────────────────────────────────────────────────────────────────────────
const DARK: AdminTokens = {
  red:      '#F87171',
  redL:     'rgba(248,113,113,0.12)',
  redB:     'rgba(248,113,113,0.08)',
  redDk:    '#EF4444',

  page:     '#0D1117',
  card:     '#161B22',
  cardAlt:  '#1C2128',
  border:   'rgba(255,255,255,0.08)',

  text:     '#E2E8F0',
  muted:    '#9CA3AF',
  mutedL:   '#6B7280',

  // Layout — encore plus sombres en dark mode
  sidebar:  '#0D1117',
  topbar:   '#090E1A',
  sideText: '#F9FAFB',
  sideMuted:'rgba(249,250,251,0.40)',

  green:    '#4ADE80',
  greenL:   'rgba(74,222,128,0.12)',
  orange:   '#FB923C',
  orangeL:  'rgba(251,146,60,0.12)',
  amber:    '#FBBF24',
  amberL:   'rgba(251,191,36,0.12)',
  blue:     '#60A5FA',
  blueL:    'rgba(96,165,250,0.12)',
  violet:   '#A78BFA',
  violetL:  'rgba(167,139,250,0.12)',
  gray:     '#9CA3AF',
  grayL:    'rgba(156,163,175,0.12)',

  input:    '#1C2128',
  inputBorder: 'rgba(255,255,255,0.12)',
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOK EXPORTÉ
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminTheme(): AdminTokens {
  const { theme } = useTheme();
  return theme === 'dark' ? DARK : LIGHT;
}

// Exports statiques pour les contextes sans hook (ex : constantes en dehors
// d'un composant React, tests, etc.)
export { LIGHT as ADMIN_LIGHT, DARK as ADMIN_DARK };