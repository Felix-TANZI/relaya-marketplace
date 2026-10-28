// Routes du groupe ADM-07 (Catalogue, modération, avis et clients) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-07',
  routes: [
    { route: 'catalogue', ecran: 'ADM-P13', titre: 'Catalogue : fiches maîtres et demandes de création', statut: 'repris', composant: () => import('./Catalogue'), parent: 'menu' },
    { route: 'moderation', ecran: 'ADM-P14', titre: 'Modération des offres et des prix', statut: 'repris', composant: () => import('./Moderation'), parent: 'menu' },
    { route: 'avis', ecran: 'ADM-P15', titre: 'Avis et droit de réponse', statut: 'repris', composant: () => import('./Avis'), parent: 'menu' },
    { route: 'clients', ecran: 'ADM-P16', titre: 'Clients et IFA', statut: 'repris', composant: () => import('./Clients'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
