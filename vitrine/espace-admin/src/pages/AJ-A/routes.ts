// Pages ajoutées à la console (préfixe AJ-A, groupe « Console » de la navigation) : ce qui ne rentre dans aucun écran du
// prototype va dans une page à part, liée depuis le bon endroit. UNE ROUTE PAR LIGNE, précédée du groupe qui la tient :
// chaque agent ne change que la ligne de sa page (deux lignes séparées fusionnent sans conflit).
import type { RoutesGroupe } from '../../config/routes'

export default {
  groupe: 'AJ-A',
  routes: [
    // Décisions encadrées (logique-metier/DECISIONS-ENCADREES.md) : poste de travail des décisions hors litige
    { route: 'postes', ecran: 'AJ-A', titre: 'Postes de décision', statut: 'repris', composant: () => import('./Postes'), parent: 'menu' },
    // S1 (ADM-03)
    { route: 'quatreyeux', ecran: 'AJ-A', titre: 'Quatre yeux en attente', statut: 'repris', composant: () => import('./QuatreYeux'), parent: 'menu' },
    // S2 (ADM-05)
    { route: 'export', ecran: 'AJ-A', titre: 'Export comptable', statut: 'repris', composant: () => import('./Export'), parent: 'menu' },
    // S3 (ADM-06, ADM-07)
    { route: 'qualite', ecran: 'AJ-A', titre: 'Qualité des acteurs', statut: 'repris', composant: () => import('./Qualite'), parent: 'menu' },
    // S4 (ADM-08)
    { route: 'candidatures', ecran: 'AJ-A', titre: 'Candidatures des partenaires', statut: 'repris', composant: () => import('./Candidatures'), parent: 'menu' },
    // S5 (ADM-10, ADM-11)
    { route: 'interrupteurs', ecran: 'AJ-A', titre: 'Interrupteurs de fonctions', statut: 'repris', composant: () => import('./Interrupteurs'), parent: 'menu' },
    // S5 (ADM-10, ADM-11)
    { route: 'modeles', ecran: 'AJ-A', titre: 'Modèles de messages', statut: 'repris', composant: () => import('./Modeles'), parent: 'menu' },
    // S6 (ADM-12, ADM-13)
    { route: 'taches', ecran: 'AJ-A', titre: 'Tâches planifiées', statut: 'repris', composant: () => import('./Taches'), parent: 'menu' },
    // S6 (ADM-12, ADM-13)
    { route: 'conservation', ecran: 'AJ-A', titre: 'Conservation des données', statut: 'repris', composant: () => import('./Conservation'), parent: 'menu' },
    // Abonnements des clients (Phase 2 : lecture, geste du Support plafonné)
    { route: 'abonnements', ecran: 'AJ-A', titre: 'Abonnements des clients', statut: 'repris', composant: () => import('./Abonnements'), parent: 'menu' },
    // Voir comme le client (Phase 2 : Support, lecture seule, motivée, journalisée, limitée dans le temps)
    { route: 'vue-client', ecran: 'AJ-A', titre: 'Voir comme le client', statut: 'repris', composant: () => import('./VueClient'), parent: 'clients' },
    // Contenu du site client (Phase 2 : moments de l'accueil, catégories mises en avant)
    { route: 'contenu-site', ecran: 'AJ-A', titre: 'Contenu du site', statut: 'repris', composant: () => import('./ContenuSite'), parent: 'menu' },
    // S1 (ADM-03)
    { route: 'recherche', ecran: 'AJ-A', titre: 'Rechercher partout', statut: 'repris', composant: () => import('./Recherche'), parent: 'menu', onglet: 'menu', etroit: true },
  ],
} satisfies RoutesGroupe
