// Routes du groupe ENT-08 (emballages, messages, notifications, paramètres, rapports, intégrations : ENT-P21 à P26) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générique du socle (../Provisoire.tsx : ce que l'extraction attend de l'écran) ;
// « repris » : écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-08',
  routes: [
    { route: 'emballages', ecran: 'ENT-P21', titre: 'Emballages', statut: 'repris', composant: () => import('./Emballages'), parent: 'menu' },
    { route: 'messages', ecran: 'ENT-P22', titre: 'Messages', statut: 'repris', composant: () => import('./Messages'), parent: 'menu' },
    { route: 'notifications', ecran: 'ENT-P23', titre: 'Notifications', statut: 'repris', composant: () => import('./Notifications'), parent: 'tableau' },
    { route: 'parametres', ecran: 'ENT-P24', titre: 'Paramètres', statut: 'repris', composant: () => import('./Parametres'), parent: 'menu' },
    // Pages ajoutées à Paramètres (contenu absent du prototype, lié depuis ses blocs).
    { route: 'parametres-journal', ecran: 'ENT-P24', titre: 'Journal des modifications', statut: 'repris', composant: () => import('./JournalParametres'), parent: 'parametres', nav: 'parametres' },
    { route: 'mes-donnees', ecran: 'ENT-P24', titre: 'Mes données', statut: 'repris', composant: () => import('./MesDonnees'), parent: 'parametres', nav: 'parametres', etroit: true },
    { route: 'rapports', ecran: 'ENT-P25', titre: 'Rapports', statut: 'repris', composant: () => import('./Rapports'), parent: 'menu' },
    { route: 'integrations', ecran: 'ENT-P26', titre: 'Intégrations', statut: 'repris', composant: () => import('./Integrations'), parent: 'menu', roles: ['proprietaire'] },
    // Page ajoutée à Intégrations : clés (test ouvert, production après le lancement), rappels, journal des appels.
    { route: 'integrations-cles', ecran: 'ENT-P26', titre: 'Clés, rappels et journal', statut: 'repris', composant: () => import('./IntegrationsCles'), parent: 'integrations', nav: 'integrations', roles: ['proprietaire'] },
  ],
} satisfies RoutesGroupe
