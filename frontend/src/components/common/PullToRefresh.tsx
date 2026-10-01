// frontend/src/components/common/PullToRefresh.tsx
// anim_05 — "Tirer pour actualiser" (voir 05_Propositions_animations/
// Ile_BelivaY_propositions_animees.html, tuile #dPull : "À la place de la
// roue grise, le chariot BelivaY roule, ses roues tournent, puis la nouvelle
// ligne arrive en surbrillance.").
//
// Remplace le pull-to-refresh par défaut du navigateur/WebView par un geste
// tactile personnalisé : un tiré vers le bas depuis le haut de la page fait
// apparaître l'icône panier BelivaY, qui tourne pendant `onRefresh()`.
//
// Portée volontairement limitée à la page d'accueil pour ce chantier (voir
// consigne) : un déploiement sur toutes les pages demanderait de vérifier
// chaque conteneur scrollable individuellement (certains utilisent leur
// propre scroll interne) — laissé en travail futur.
//
// Les gestionnaires tactiles de React sont attachés en mode "passive" par
// défaut : `preventDefault()` n'y aurait aucun effet et le rebond natif du
// navigateur se superposerait au geste personnalisé. Le suivi est donc fait
// via un addEventListener natif `{ passive: false }` sur le conteneur.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ShoppingCart } from "lucide-react";

const THRESHOLD = 72;
const MAX_PULL = 110;

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const finishGesture = async () => {
      trackingRef.current = false;
      setTracking(false);
      startYRef.current = null;

      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 4 || refreshingRef.current) {
        trackingRef.current = false;
        return;
      }
      trackingRef.current = true;
      setTracking(true);
      startYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!trackingRef.current || startYRef.current === null) return;
      const delta = (event.touches[0]?.clientY ?? 0) - startYRef.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // On est en train de tirer depuis le haut : on prend la main sur le
      // geste pour empêcher le rebond natif du navigateur de s'y superposer.
      event.preventDefault();
      // Résistance : le tiré ralentit à mesure qu'on approche du maximum.
      const resisted = Math.min(MAX_PULL, delta * 0.45);
      pullRef.current = resisted;
      setPull(resisted);
    };

    const onTouchEnd = () => {
      if (!trackingRef.current) return;
      void finishGesture();
    };

    const onTouchCancel = () => {
      trackingRef.current = false;
      setTracking(false);
      pullRef.current = 0;
      setPull(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div ref={containerRef}>
      <div
        aria-hidden="true"
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: refreshing ? THRESHOLD : pull,
          transition: tracking ? "none" : "height .25s ease-out",
        }}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md dark:bg-gray-800 belivay-pull-icon ${refreshing ? "is-refreshing" : ""}`}
          style={{
            transform: refreshing ? undefined : `scale(${0.6 + progress * 0.4}) rotate(${progress * 220}deg)`,
            opacity: refreshing ? 1 : progress,
          }}
        >
          <ShoppingCart size={18} className="text-primary" />
        </div>
      </div>
      {children}
    </div>
  );
}
