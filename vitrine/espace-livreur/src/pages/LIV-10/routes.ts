// Routes du groupe LIV-10 (Messages, notifications, Moi, aide et SOS, réglages) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-10',
  routes: [
    { route: 'messages', page: 'LIV-P27', titre: 'Messages', entete: 'racine', onglet: 'messages', statut: 'repris', ecran: () => import('./Messages') },
    { route: 'notifications', page: 'LIV-P28', titre: 'Notifications', entete: 'enfant', retour: 'aujourdhui', statut: 'repris', ecran: () => import('./Notifications') },
    { route: 'menu', page: 'LIV-P29', titre: 'Menu', entete: 'enfant', retour: 'aujourdhui', onglet: '', statut: 'repris', ecran: () => import('./Menu') },
    { route: 'moi', page: 'LIV-P29', titre: 'Moi', entete: 'racine', onglet: 'moi', statut: 'repris', ecran: () => import('./Moi') },
    { route: 'aide', page: 'LIV-P30', titre: 'Aide et SOS', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Aide') },
    { route: 'mon-compte', page: 'LIV-P29', titre: 'Mon compte', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./MonCompte') },
    { route: 'reglages', page: 'LIV-P31', titre: 'Réglages', entete: 'enfant', retour: 'moi', onglet: 'moi', statut: 'repris', ecran: () => import('./Reglages') },
  ],
} satisfies RoutesGroupe
