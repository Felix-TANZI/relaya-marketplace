// Routes du groupe ENT-04 (zones, flotte, livreurs et véhicules : ENT-P04 à P08) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// statut « provisoire » : page générique du socle (../Provisoire.tsx : ce que l'extraction attend de l'écran) ;
// « repris » : écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ENT-04',
  routes: [
    { route: 'zones', ecran: 'ENT-P04', titre: 'Zones et capacité', statut: 'repris', composant: () => import('./Zones'), parent: 'menu' },
    { route: 'flotte', ecran: 'ENT-P05', titre: 'Livreurs', statut: 'repris', composant: () => import('./Flotte'), onglet: 'flotte' },
    { route: 'livreur', ecran: 'ENT-P06', titre: 'Fiche du livreur', statut: 'repris', composant: () => import('./Livreur'), parent: 'flotte' },
    { route: 'ajout', ecran: 'ENT-P07', titre: 'Ajouter un livreur', statut: 'repris', composant: () => import('./Ajout'), parent: 'flotte', roles: ['proprietaire', 'repartiteur'], etroit: true },
    // Page ajoutée (consigne du porteur, 12 oct.) : contrôle des pièces de la flotte, ou d'un livreur (?id=).
    { route: 'pieces', ecran: 'ENT-P06', titre: 'Contrôle des pièces', statut: 'repris', composant: () => import('./Pieces'), parent: 'flotte', roles: ['proprietaire', 'repartiteur'] },
    { route: 'vehicules', ecran: 'ENT-P08', titre: 'Véhicules', statut: 'repris', composant: () => import('./Vehicules'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
