import CourierDashboardPage from "@/features/courier/CourierDashboardPage";

/**
 * Pont de compatibilité historique.
 *
 * Les anciennes routes /courier et /driver passaient par une maquette HTML
 * statique servie dans un iframe. On les redirige maintenant vers la vraie
 * page React du livreur, pour afficher les données dynamiques de l'utilisateur
 * connecté et éviter le contenu dur codé.
 */
export default function DriverApp() {
  return <CourierDashboardPage />;
}
