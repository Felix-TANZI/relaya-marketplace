import { useEffect } from "react";

/**
 * Espace Livreur BelivaY.
 *
 * La maquette de référence (assets/belivay-livreur.html, ~5 000 lignes) est
 * servie statiquement depuis /livreur/index.html et affichée dans un iframe
 * plein écran afin de conserver à l'identique le thème sombre, la sidebar,
 * la topbar et les 15 pages (Dashboard, Tournée, Courses, Scanner, Carte,
 * Gains, Profil, Formation, Notifications, Messages, Incidents, Sécurité,
 * Paramètres, Litiges, Mon Compte). L'iframe isole le CSS/JS de l'app
 * client (couleurs vertes livreur vs orange marketplace, fonts, etc.).
 */
export default function DriverApp() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0D1117]">
      <iframe
        src="/livreur/index.html"
        title="BelivaY — Espace Livreur"
        className="h-full w-full border-0"
        allow="geolocation; camera; microphone"
      />
    </div>
  );
}
