// Routes du groupe ADM-11 (Messagerie, panne et support) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-11',
  routes: [
    { route: 'messagerie', ecran: 'ADM-P27', titre: 'Messagerie et notifications', statut: 'repris', composant: () => import('./Messagerie'), parent: 'menu' },
    { route: 'panne', ecran: 'ADM-P28', titre: 'Diffusion de panne et mode papier', statut: 'repris', composant: () => import('./Panne'), parent: 'menu' },
    { route: 'support', ecran: 'ADM-P29', titre: 'Support et centre d’aide', statut: 'repris', composant: () => import('./Support'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
