import { useEffect, useRef, useState } from "react";

/**
 * Mesure la colonne principale pour que CategorySidebar puisse rester figée sur
 * toute sa hauteur, puis s'arrêter net en bas. Le re-mesurage périodique couvre
 * les changements de hauteur provoqués par le chargement des produits.
 */
export default function useSidebarTrack() {
  const mainRef = useRef<HTMLElement | null>(null);
  const [trackTop, setTrackTop] = useState(0);
  const [trackHeight, setTrackHeight] = useState(0);
  const [topOffset, setTopOffset] = useState(132);

  useEffect(() => {
    const updateMetrics = () => {
      const main = mainRef.current;
      const header = document.querySelector("header");
      if (!main) return;

      const rect = main.getBoundingClientRect();
      setTrackTop(rect.top + window.scrollY);
      setTrackHeight(main.offsetHeight);
      setTopOffset(Math.round((header?.getBoundingClientRect().bottom ?? 120) + 12));
    };

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    const timer = window.setInterval(updateMetrics, 350);

    return () => {
      window.removeEventListener("resize", updateMetrics);
      window.clearInterval(timer);
    };
  }, []);

  return { mainRef, trackTop, trackHeight, topOffset };
}
