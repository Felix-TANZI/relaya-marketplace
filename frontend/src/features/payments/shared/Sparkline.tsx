// frontend/src/features/payments/shared/Sparkline.tsx
// Une courbe minimale, sans axes ni legende.
//
// ─────────────────────────────────────────────────────────────────────────
// PAS DE BIBLIOTHEQUE DE GRAPHIQUES
//
// Une courbe de tendance n'a pas besoin de 200 Ko de dependance. Un SVG de
// quarante lignes suffit, et il s'accorde exactement au reste de
// l'interface — ce qu'aucune bibliotheque ne fait sans configuration
// laborieuse.
// ─────────────────────────────────────────────────────────────────────────

import { FT } from './tokens';

export interface SparkPoint {
  label: string;
  value: number;
  /** Serie secondaire, tracee en creux — remboursements, par exemple. */
  secondary?: number;
}

interface SparklineProps {
  points: SparkPoint[];
  height?: number;
  color?: string;
  secondaryColor?: string;
  /** Affiche une ligne de reference a la moyenne. */
  showAverage?: boolean;
}

export default function Sparkline({
  points, height = 64, color = FT.coral,
  secondaryColor = FT.red, showAverage = false,
}: SparklineProps) {
  if (points.length < 2) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, color: FT.faint }}>
          Pas assez de données
        </span>
      </div>
    );
  }

  const largeur = 100;
  const valeurs = points.map((p) => p.value);
  const secondaires = points.map((p) => p.secondary ?? 0);
  // Le maximum inclut les deux series : sinon la secondaire deborderait.
  const maximum = Math.max(...valeurs, ...secondaires, 1);
  const moyenne = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;

  const x = (index: number) => (index / (points.length - 1)) * largeur;
  const y = (valeur: number) => height - (valeur / maximum) * (height - 4) - 2;

  const chemin = valeurs
    .map((valeur, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(valeur)}`)
    .join(' ');

  const aire = `${chemin} L ${largeur} ${height} L 0 ${height} Z`;

  const cheminSecondaire = secondaires.some((v) => v > 0)
    ? secondaires
      .map((valeur, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(valeur)}`)
      .join(' ')
    : null;

  return (
    <svg
      viewBox={`0 0 ${largeur} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label="Évolution sur la période"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showAverage && (
        <line
          x1="0" y1={y(moyenne)} x2={largeur} y2={y(moyenne)}
          stroke={FT.border} strokeWidth="0.5" strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <path d={aire} fill="url(#spark-fill)" />
      <path
        d={chemin} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {cheminSecondaire && (
        <path
          d={cheminSecondaire} fill="none" stroke={secondaryColor}
          strokeWidth="1" strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}