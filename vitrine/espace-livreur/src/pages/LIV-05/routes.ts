// Routes du groupe LIV-05 (La tournée et la navigation) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-05',
  routes: [
    { route: 'tournee', page: 'LIV-P08', titre: 'Ma tournée', entete: 'racine', onglet: 'tournee', statut: 'repris', ecran: () => import('./Tournee') },
    { route: 'navigation', page: 'LIV-P09', titre: 'Navigation', entete: 'enfant', retour: 'tournee', onglet: 'tournee', statut: 'repris', ecran: () => import('./Navigation') },
    // LIV-P33 · Appel (DP-61) : page ajoutée au paquet (32 écrans → 33) ; appel masqué livreur ↔ client, vendeur,
    // gérant, entreprise, support, ouvert seulement pendant la mission.
    { route: 'appel', page: 'LIV-P33', titre: 'Appel', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./Appel') },
  ],
} satisfies RoutesGroupe
