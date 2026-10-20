// Navigation groupée de l'espace vendeur, d'après l'interface vendeur réelle (seller.belivay.com,
// logique-metier/vendeur/INTERFACE-REELLE.md) : Ventes, Catalogue, Croissance, Boutique, Mon compte, puis « Retour au
// site » (l'espace client). Une seule liste, lue par le tiroir latéral de la tablette (composants/larges.tsx) et, plus
// tard, par la barre latérale de l'ordinateur. Les RÈGLES restent celles du paquet : visibilité au mérite (« Se faire voir »), plus la publicité payante de DP-59
// (« Publicité », sur solde prépayé), pas de retrait à la demande (versement du vendredi).
// proprietaire : entrée absente pour l'accès Préparation (aucun montant, rien à acheter : DP-55, Q-18).
export interface EntreeNav {
  route: string
  titre: string
  icone: string
  proprietaire?: boolean
}
export interface GroupeNav {
  titre: string
  entrees: EntreeNav[]
}

export const NAVIGATION: GroupeNav[] = [
  {
    titre: 'Ventes',
    entrees: [
      { route: 'accueil', titre: 'Tableau de bord', icone: 'layout-grid' },
      { route: 'commandes', titre: 'Commandes', icone: 'shopping-bag' },
      { route: 'litiges', titre: 'Litiges', icone: 'scale' },
      { route: 'retours', titre: 'Retours', icone: 'undo-2' },
      { route: 'ramassages', titre: 'Ramassages', icone: 'truck' },
      { route: 'messages', titre: 'Messagerie', icone: 'messages-square' },
      { route: 'questions', titre: 'Questions des clients', icone: 'message-circle' },
    ],
  },
  {
    titre: 'Catalogue',
    entrees: [
      { route: 'produits', titre: 'Mes produits', icone: 'package' },
      { route: 'stock', titre: 'Stock et inventaire', icone: 'boxes' },
      { route: 'offre1', titre: 'Ajouter un produit', icone: 'plus', proprietaire: true },
    ],
  },
  {
    titre: 'Croissance',
    entrees: [
      { route: 'chiffres', titre: 'Mes chiffres', icone: 'chart-column', proprietaire: true },
      { route: 'promotions', titre: 'Promotions', icone: 'tag', proprietaire: true },
      { route: 'publicite', titre: 'Publicité', icone: 'megaphone', proprietaire: true },
      { route: 'demande', titre: 'La demande', icone: 'search' },
      { route: 'visibilite', titre: 'Se faire voir', icone: 'sparkles', proprietaire: true },
    ],
  },
  {
    titre: 'Boutique',
    entrees: [
      { route: 'boutique', titre: 'Ma boutique', icone: 'store' },
      { route: 'palier', titre: 'Mon palier', icone: 'award' },
      { route: 'plans_liste', titre: 'Plans', icone: 'gem', proprietaire: true },
      { route: 'avis', titre: 'Avis', icone: 'star' },
      { route: 'horaires', titre: 'Horaires et fermetures', icone: 'clock' },
      { route: 'livraison', titre: 'Livraison et colis', icone: 'package-check' },
      { route: 'activite', titre: 'Activité de la boutique', icone: 'history' },
      { route: 'equipe', titre: 'Mon équipe', icone: 'users', proprietaire: true },
    ],
  },
  {
    titre: 'Mon compte',
    entrees: [
      { route: 'argent', titre: 'Mon argent', icone: 'wallet', proprietaire: true },
      { route: 'versements', titre: 'Versements', icone: 'banknote', proprietaire: true },
      { route: 'se_libere', titre: 'Fonds en attente', icone: 'hourglass', proprietaire: true },
      { route: 'documents', titre: 'Relevés et factures', icone: 'file-text', proprietaire: true },
      { route: 'parametres', titre: 'Paramètres', icone: 'settings' },
      { route: 'securite', titre: 'Sécurité et appareils', icone: 'shield-check' },
      { route: 'aide', titre: 'Aide', icone: 'circle-help' },
    ],
  },
]

/** Groupes visibles pour un rôle (l'accès Préparation n'a ni montant ni achat). */
export const navigationPour = (proprietaire: boolean): GroupeNav[] =>
  NAVIGATION.map((g) => ({ ...g, entrees: g.entrees.filter((e) => proprietaire || !e.proprietaire) })).filter((g) => g.entrees.length > 0)

/** Ordinateur (dès 1024 px) : pages de listes, de compteurs et de tableaux, servies plus larges (DISPOSITION-ECRANS.md). */
export const ROUTES_LARGES = new Set(['accueil', 'commandes', 'litiges', 'retours', 'produits', 'offre1', 'stock', 'promotions', 'publicite', 'publicite_solde', 'questions', 'argent', 'versements', 'documents', 'chiffres', 'demande', 'activite', 'ajustements', 'ramassages', 'recherche', 'avis', 'messages'])
