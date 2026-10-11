// Routes du groupe AJ-A (pages ajoutées, DP-58) : stock et inventaire, promotions, questions des clients, livraison
// et colis. Pages nouvelles (pas d'état du prototype) : titre, retour et onglet donnent leur fiche et leur coque
// (npm run inventaire : pages.json, etats.json) ; tests
// tests/AJ-A.gestes.spec.ts.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-A',
  routes: [
    { route: 'stock', statut: 'repris', titre: 'Stock et inventaire', retour: '#menu', onglet: 'produits', ecran: () => import('./Stock') },
    { route: 'promotions', statut: 'repris', titre: 'Promotions', retour: '#menu', onglet: 'produits', ecran: () => import('./Promotions') },
    { route: 'questions', statut: 'repris', titre: 'Questions des clients', retour: '#menu', ecran: () => import('./Questions') },
    { route: 'livraison', statut: 'repris', titre: 'Livraison et colis', retour: '#menu', ecran: () => import('./Livraison') },
  ],
} satisfies RoutesGroupe
