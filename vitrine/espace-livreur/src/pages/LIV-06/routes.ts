// Routes du groupe LIV-06 (Ramassage chez le vendeur) : la seule liste que l'agent du groupe modifie pour brancher ses écrans
// (METHODE.md). Chaque route porte sa coque (titre, en-tête, parent du retour, onglet allumé).
// statut « provisoire » : page générée (outils/inventaire.mjs) ; « repris » : écran fini, logique et testé.
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'LIV-06',
  routes: [
    { route: 'arrivee', page: 'LIV-P10', titre: 'Arrivée chez le vendeur', entete: 'enfant', retour: 'tournee', statut: 'repris', ecran: () => import('./Arrivee') },
    { route: 'controle', page: 'LIV-P11', titre: 'Contrôle et photos', entete: 'enfant', retour: 'arrivee', statut: 'repris', ecran: () => import('./Controle') },
    { route: 'audit', page: 'LIV-P12', titre: 'Audit par échantillon', entete: 'enfant', retour: 'controle', statut: 'repris', ecran: () => import('./Audit') },
    { route: 'emballage', page: 'LIV-P13', titre: 'Emballage et scellé', entete: 'enfant', retour: 'controle', statut: 'repris', ecran: () => import('./Emballage') },
    { route: 'code-remise', page: 'LIV-P14', titre: 'Code de remise', entete: 'enfant', retour: 'arrivee', statut: 'repris', ecran: () => import('./CodeRemise') },
    { route: 'refus', page: 'LIV-P15', titre: 'Refus au ramassage', entete: 'enfant', retour: 'arrivee', statut: 'repris', ecran: () => import('./Refus') },
  ],
} satisfies RoutesGroupe
