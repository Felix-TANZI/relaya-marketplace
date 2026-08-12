// frontend/src/features/payments/shared/tokens.ts
// Jetons visuels du domaine financier.
//
// Ils prolongent l'identite BelivaY sans la remplacer : l'orange reste
// reserve a la marque et aux engagements — dates de versement, appel a
// l'action. Les etats financiers utilisent des teintes DISTINCTES, sinon un
// montant du se confondrait avec un bouton de navigation.

export const FT = {
  orange:   '#F47920',
  orangeD:  '#E06510',
  coral:    '#D85A30',
  coralL:   '#F0997B',

  green:    '#1D9E75',
  greenD:   '#0F6E56',
  amber:    '#EF9F27',
  amberD:   '#854F0B',
  blue:     '#85B7EB',
  blueD:    '#185FA5',
  red:      '#E24B4A',
  redD:     '#A32D2D',

  cream:    '#F5F0E8',
  creamAlt: '#EDE7DC',
  white:    '#FFFFFF',
  border:   '#E8E2D9',
  text:     '#1A1209',
  muted:    '#7C6E5A',
  faint:    '#B4B2A9',
} as const;

/** Chasse tabulaire : les chiffres s'alignent d'une ligne a l'autre. */
export const NUM: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};