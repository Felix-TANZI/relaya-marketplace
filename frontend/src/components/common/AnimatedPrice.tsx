// frontend/src/components/common/AnimatedPrice.tsx
// anim_02 — "Le prix flash qui roule" (voir 05_Propositions_animations/
// Ile_BelivaY_propositions_animees.html, tuile #dPrice : "Les chiffres
// défilent jusqu'au nouveau prix, comme un compteur.").
//
// Petit compteur numérique réutilisable : interpole la valeur affichée vers
// `value` via requestAnimationFrame à chaque changement, au lieu d'un saut
// instantané. N'importe/ne recalcule jamais le montant lui-même — `value`
// reste la seule source de vérité, exactement comme avant ce composant.

import { useEffect, useRef, useState } from "react";

interface AnimatedPriceProps {
  /** Montant final à afficher (déjà calculé par l'appelant). */
  value: number;
  /** Formatte le nombre affiché à chaque frame (ex: `${n.toLocaleString()} FCFA`). */
  formatter?: (n: number) => string;
  /** Durée totale du défilement, en ms. */
  durationMs?: number;
  className?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedPrice({
  value,
  formatter = (n) => Math.round(n).toLocaleString("fr-FR"),
  durationMs = 500,
  className,
}: AnimatedPriceProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    if (reducedMotionRef.current) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{formatter(display)}</span>;
}
