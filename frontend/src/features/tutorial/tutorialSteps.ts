export interface TutorialStep {
  id: string;
  route: string;
  selector: string;
  title: string;
  description: string;
}

export const CLIENT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "search",
    route: "/",
    selector: '[data-tutorial="header-search"]',
    title: "Recherche rapide",
    description:
      "Commence ici pour rechercher un produit, une marque ou un besoin precis depuis n'importe quelle page.",
  },
  {
    id: "categories",
    route: "/catalog",
    selector: '[data-tutorial="catalog-categories"]',
    title: "Explorer les categories",
    description:
      "Utilise ce panneau pour filtrer le catalogue par categorie, stock, promotions, prix et note minimale.",
  },
  {
    id: "catalog-products",
    route: "/catalog",
    selector: '[data-tutorial="catalog-products"]',
    title: "Comparer les produits",
    description:
      "Cette zone affiche les produits visibles. Tu peux comparer, ajouter aux favoris, mettre au panier ou ouvrir une fiche produit.",
  },
  {
    id: "cart-summary",
    route: "/cart",
    selector: '[data-tutorial="cart-summary"]',
    title: "Verifier le panier",
    description:
      "Avant de payer, controle ici les quantites, le total et les frais de livraison.",
  },
  {
    id: "profile-header",
    route: "/profile",
    selector: '[data-tutorial="profile-header"]',
    title: "Gerer son compte",
    description:
      "Depuis ton profil, tu peux mettre a jour tes informations, ton avatar, tes notifications et tes favoris.",
  },
  {
    id: "orders-header",
    route: "/orders",
    selector: '[data-tutorial="orders-header"]',
    title: "Suivre ses commandes",
    description:
      "Retrouve ici l'historique de tes commandes, leur statut et l'acces au suivi de livraison.",
  },
];
