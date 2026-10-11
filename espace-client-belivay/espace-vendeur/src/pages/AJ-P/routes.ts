// Routes du groupe AJ-P (Publicité, DP-59) : tableau de bord et campagnes, création en trois gestes, solde publicitaire.
// Pages nouvelles (pas d'état du prototype) : titre, retour et onglet donnent leur fiche et leur coque (npm run
// inventaire). Réservées au propriétaire (droit argent.voir, src/donnees/droits.ts).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-P',
  routes: [
    { route: 'publicite', statut: 'repris', titre: 'Publicité', retour: '#menu', onglet: 'produits', ecran: () => import('./Publicite') },
    { route: 'publicite_nouvelle', statut: 'repris', titre: 'Nouvelle campagne', retour: '#publicite', onglet: 'produits', ecran: () => import('./NouvelleCampagne') },
    { route: 'publicite_solde', statut: 'repris', titre: 'Solde publicitaire', retour: '#publicite', onglet: 'produits', ecran: () => import('./Solde') },
  ],
} satisfies RoutesGroupe
