// frontend/src/hooks/useFixedHeaderHeight.ts
//
// Le ruban d'annonces et le header sont en `position: fixed`. Leur hauteur cumulée
// varie selon le palier responsive : barre de recherche mobile, rangée de navigation
// qui apparaît à partir de md, logo plus grand à partir de sm… Plutôt que de figer
// une valeur qui ne peut être juste qu'à une seule largeur, on la mesure et on la
// publie dans `--belivay-header-h`, consommée par le padding haut du contenu.

import { useEffect } from "react";

const CSS_VARIABLE = "--belivay-header-h";

export default function useFixedHeaderHeight() {
  useEffect(() => {
    const publish = () => {
      const bar = document.querySelector<HTMLElement>("[data-fixed-top-bar]");
      const header = document.querySelector<HTMLElement>("header");
      if (!header) return;

      const total = (bar?.offsetHeight ?? 0) + header.offsetHeight;
      document.documentElement.style.setProperty(CSS_VARIABLE, `${total}px`);
    };

    /* Première mesure hors du corps de l'effet : le layout doit être posé. */
    const raf = requestAnimationFrame(publish);

    const header = document.querySelector<HTMLElement>("header");
    const observer = new ResizeObserver(publish);
    if (header) observer.observe(header);

    window.addEventListener("resize", publish);
    window.addEventListener("orientationchange", publish);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", publish);
      window.removeEventListener("orientationchange", publish);
      document.documentElement.style.removeProperty(CSS_VARIABLE);
    };
  }, []);
}
