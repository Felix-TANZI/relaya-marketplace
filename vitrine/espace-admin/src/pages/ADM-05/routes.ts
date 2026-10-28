// Routes du groupe ADM-05 (Argent : escrow, remboursements, versements, rapprochement) : la seule liste que l'agent du groupe modifie pour brancher ses écrans (METHODE.md).
// « provisoire » : page générique du socle (../Provisoire.tsx : ce que le prototype montre de l'écran) ; « repris » :
// écran repris, logique et testé. Reprendre un écran : écrire ./<Écran>.tsx, pointer composant dessus, statut « repris ».
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'ADM-05',
  routes: [
    { route: 'escrow', ecran: 'ADM-P05', titre: 'Escrow et registre', statut: 'repris', composant: () => import('./Escrow'), parent: 'menu' },
    { route: 'remboursements', ecran: 'ADM-P06', titre: 'Remboursements', statut: 'repris', composant: () => import('./Remboursements'), parent: 'menu' },
    { route: 'versements', ecran: 'ADM-P07', titre: 'Versements du vendredi', statut: 'repris', composant: () => import('./Versements'), parent: 'menu' },
    { route: 'wallet', ecran: 'AJ-A', titre: 'Suivi du Wallet', statut: 'repris', composant: () => import('./Wallet'), parent: 'escrow' },
    { route: 'remb-auto', ecran: 'AJ-A', titre: 'Remboursements automatiques', statut: 'repris', composant: () => import('./RemboursementsAuto'), parent: 'remboursements' },
    { route: 'frais-paiement', ecran: 'AJ-A', titre: 'Frais de paiement du mois', statut: 'repris', composant: () => import('./FraisCampay'), parent: 'rapprochement' },
    { route: 'rapprochement', ecran: 'ADM-P08', titre: 'Rapprochement, revenus et obligations', statut: 'repris', composant: () => import('./Rapprochement'), parent: 'menu' },
  ],
} satisfies RoutesGroupe
