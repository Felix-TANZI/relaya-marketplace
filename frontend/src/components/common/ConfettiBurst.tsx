// frontend/src/components/common/ConfettiBurst.tsx
// anim_04 — "Paiement accepté" (voir 05_Propositions_animations/
// Ile_BelivaY_propositions_animees.html, tuile #dOk : "Le cercle se dessine,
// la coche suit, des éclats orange et or partent du centre.").
//
// Le tracé de la coche existe déjà (styles/pfShell.tsx, `.pf-ok-badge`,
// utilisé par PaymentSheet.tsx) ; ce composant ajoute uniquement les éclats
// de particules. Purement décoratif — se monte/démonte sans toucher au flux
// de paiement.

import { useMemo } from "react";

interface ConfettiBurstProps {
  /** Déclenche une nouvelle salve à chaque passage à `true`. */
  active: boolean;
  /** Nombre de particules. */
  count?: number;
}

const COLORS = ["#F47920", "#FFB066", "#FFD45C", "#F2C31C"]; // orange + or, palette de marque

export default function ConfettiBurst({ active, count = 24 }: ConfettiBurstProps) {
  const particles = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 55 + Math.random() * 65;
      return {
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        size: 5 + Math.random() * 4,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, count]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="belivay-confetti-burst" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="belivay-confetti-particle"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            ["--tx" as string]: `${p.tx}px`,
            ["--ty" as string]: `${p.ty}px`,
          }}
        />
      ))}
    </div>
  );
}
