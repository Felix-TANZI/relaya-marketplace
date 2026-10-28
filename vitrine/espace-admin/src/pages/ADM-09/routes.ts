// Routes du groupe ADM-09 (Zones, carte et emballages) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-09',
  routes: [
    { route: 'zones', ecran: 'ADM-P21', titre: 'Pilotage des zones', statut: 'repris', composant: () => import('./Zones'), parent: 'menu' },
    { route: 'carte', ecran: 'ADM-P22', titre: 'Carte opérationnelle', statut: 'repris', composant: () => import('./Carte'), parent: 'menu' },
    { route: 'emballages', ecran: 'ADM-P23', titre: 'Emballages et étiquettes', statut: 'repris', composant: () => import('./Emballages'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
