// Routes du groupe LIV-09 (Historique, activité et gains, Trust Score) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-09',
  routes: [
    { route: 'historique', page: 'LIV-P24', titre: 'Historique et preuves', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Historique') },
    { route: 'activite', page: 'LIV-P25', titre: 'Mes gains', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Activite') },
    { route: 'trust', page: 'LIV-P26', titre: 'Mon Trust Score', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Trust') },
  ],
} satisfies RoutesGroupe
