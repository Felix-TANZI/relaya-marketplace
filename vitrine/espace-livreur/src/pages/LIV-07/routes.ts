// Routes du groupe LIV-07 (Remises : relais, domicile, départs, retours) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-07',
  routes: [
    { route: 'depot-relais', page: 'LIV-P16', titre: 'Dépôt au point relais', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./DepotRelais') },
    { route: 'domicile', page: 'LIV-P17', titre: 'Remise à domicile', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./Domicile') },
    { route: 'echec-domicile', page: 'LIV-P18', titre: 'Remise impossible', entete: 'enfant', retour: 'domicile', statut: 'repris', ecran: () => import('./EchecDomicile') },
    { route: 'collecte', page: 'LIV-P19', titre: 'Collecte au relais', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./Collecte') },
    { route: 'retour-vendeur', page: 'LIV-P20', titre: 'Retour chez le vendeur', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./RetourVendeur') },
  ],
} satisfies RoutesGroupe
