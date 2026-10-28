// Routes du groupe LIV-03 (Accès : connexion, activation, certification, états du compte) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// En-têtes alignés sur le prototype : activation = en-tête racine (avec la barre du bas), certification = en-tête
// secondaire sans barre (dockless), connexion et état du compte = écrans pleins.
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-03',
  routes: [
    { route: 'connexion', page: 'LIV-P01', titre: 'Connexion', entete: 'aucun', sansSession: true, statut: 'repris', ecran: () => import('./Connexion') },
    { route: 'activation', page: 'LIV-P02', titre: 'Activation du compte', entete: 'racine', onglet: 'aujourdhui', statut: 'repris', ecran: () => import('./Activation') },
    { route: 'certification', page: 'LIV-P03', titre: 'Certification', entete: 'enfant', retour: 'activation', statut: 'repris', ecran: () => import('./Certification') },
    { route: 'compte', page: 'LIV-P32', titre: 'État du compte', entete: 'aucun', statut: 'repris', ecran: () => import('./Compte') },
  ],
} satisfies RoutesGroupe
