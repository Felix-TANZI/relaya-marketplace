// Routes du groupe LIV-04 (Aujourd’hui, disponibilité, paquet et kit) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-04',
  routes: [
    { route: 'aujourdhui', page: 'LIV-P04', titre: 'Aujourd’hui', entete: 'racine', onglet: 'aujourdhui', statut: 'repris', ecran: () => import('./Aujourdhui') },
    { route: 'statut', page: 'LIV-P05', titre: 'Mon statut', entete: 'racine', onglet: 'aujourdhui', statut: 'repris', ecran: () => import('./Statut') },
    { route: 'paquet', page: 'LIV-P06', titre: 'Mon paquet', entete: 'enfant', retour: 'aujourdhui', statut: 'repris', ecran: () => import('./Paquet') },
    { route: 'kit', page: 'LIV-P07', titre: 'Mon kit d’emballage', entete: 'racine', onglet: 'aujourdhui', statut: 'repris', ecran: () => import('./Kit') },
  ],
} satisfies RoutesGroupe
