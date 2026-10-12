// Routes du groupe VD-06 : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générée (balisage du prototype) ; « repris » : écran repris, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'VD-06',
  routes: [
    // Remise, reçu et erreurs : repris, logiques et testés (tests/VD-06.gestes.spec.ts).
    { route: 'commande_prete', statut: 'repris', ecran: () => import('./CommandePrete') },
    { route: 'commande_remise', statut: 'repris', ecran: () => import('./CommandeRemise') },
    { route: 'recu', statut: 'repris', ecran: () => import('./Recu') },
    { route: 'erreurs', statut: 'repris', ecran: () => import('./Erreurs') },
  ],
} satisfies RoutesGroupe
