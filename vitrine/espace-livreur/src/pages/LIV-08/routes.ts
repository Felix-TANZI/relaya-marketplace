// Routes du groupe LIV-08 (Incidents, hors connexion, clôture de journée) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-08',
  routes: [
    { route: 'incident', page: 'LIV-P21', titre: 'Signaler un incident', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./Incident') },
    { route: 'synchronisation', page: 'LIV-P22', titre: 'Synchronisation', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Synchronisation') },
    { route: 'cloture', page: 'LIV-P23', titre: 'Clôture de journée', entete: 'enfant', retour: 'aujourdhui', statut: 'repris', ecran: () => import('./Cloture') },
  ],
} satisfies RoutesGroupe
