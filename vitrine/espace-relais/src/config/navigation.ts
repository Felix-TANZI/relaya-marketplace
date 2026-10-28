// Navigation groupée de l'espace point relais : la page Menu (« ☰ » de l'en-tête) et la barre latérale de la tablette
// et de l'ordinateur de comptoir la lisent. Mêmes groupes que le Menu du prototype (Le guichet, Opérations, Argent et
// performance, Mon relais, Compte) ; le groupe « Écrans d'état et d'accès » du prototype (plan de démonstration) n'est
// pas une navigation : ses écrans s'ouvrent là où ils servent (statut du relais dans Mon relais, installer dans
// Compte, les autres sont des états). Une entrée dont la route est refusée au membre (config/droits.ts) n'est pas
// montrée : l'employé de comptoir ne voit ni l'argent ni la gestion du relais.
export interface EntreeNav {
  route: string
  titre: string
  icone: string
  /** Compteur de la session affiché à droite (badge). */
  badge?: 'reception' | 'stock' | 'departs' | 'notifications' | 'messages'
}
export interface GroupeNav {
  titre: string
  entrees: EntreeNav[]
}

export const NAVIGATION: GroupeNav[] = [
  {
    titre: 'Le guichet',
    entrees: [
      { route: 'accueil', titre: 'Aujourd’hui', icone: 'r-grille' },
      { route: 'reception', titre: 'Réception', icone: 'r-colis', badge: 'reception' },
      { route: 'retrait', titre: 'Retrait', icone: 'r-cle' },
      { route: 'file', titre: 'File du comptoir', icone: 'r-personne' },
      { route: 'stock', titre: 'Colis en stock', icone: 'r-pile', badge: 'stock' },
    ],
  },
  {
    titre: 'Opérations',
    entrees: [
      { route: 'departs', titre: 'À faire partir', icone: 'r-camion', badge: 'departs' },
      { route: 'litiges', titre: 'Constats et retours', icone: 'r-balance' },
      { route: 'historique', titre: 'Historique', icone: 'r-historique' },
      { route: 'notifications', titre: 'Notifications', icone: 'r-cloche', badge: 'notifications' },
      { route: 'messagerie', titre: 'Messagerie', icone: 'r-message', badge: 'messages' },
    ],
  },
  {
    titre: 'Argent et performance',
    entrees: [
      { route: 'versements', titre: 'Versements', icone: 'r-carte-paiement' },
      { route: 'rapports', titre: 'Rapports', icone: 'r-graphique' },
      { route: 'trust', titre: 'Trust Score', icone: 'r-bouclier' },
      { route: 'avis', titre: 'Avis des clients', icone: 'r-etoile' },
      { route: 'paliers', titre: 'Paliers', icone: 'r-couches' },
    ],
  },
  {
    titre: 'Mon relais',
    entrees: [
      { route: 'capacite', titre: 'Capacité et horaires', icone: 'r-horloge' },
      { route: 'fermeture', titre: 'Fermeture exceptionnelle', icone: 'r-fermeture' },
      { route: 'statut-relais', titre: 'Statut du relais', icone: 'r-boutique' },
      { route: 'documents', titre: 'Documents', icone: 'r-document' },
      { route: 'equipe', titre: 'Mon équipe', icone: 'r-personne' },
      { route: 'activation', titre: 'Activation et partenariat', icone: 'r-boutique' },
      { route: 'formation', titre: 'Formation', icone: 'r-formation' },
    ],
  },
  {
    titre: 'Compte',
    entrees: [
      { route: 'aide', titre: 'Aide', icone: 'r-aide' },
      { route: 'parametres', titre: 'Paramètres', icone: 'r-reglages' },
      { route: 'installer', titre: 'Installer l’application', icone: 'r-telecharger' },
    ],
  },
]
