export interface TutorialStep {
  id: string;
  route: string;
  selector?: string;
  title: string;
  description: string;
  helper?: string;
  routeLabel?: string;
  scrollBlock?: ScrollLogicalPosition;
}

export const CLIENT_TOUR_STORAGE_KEY = "belivay_client_tour_completed";

export const CLIENT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "Bienvenue sur BelivaY",
    description:
      "Cette visite rapide te montre comment rechercher, explorer, ajouter au panier et finaliser une commande sans te perdre dans l'application.",
    helper:
      "Tu peux utiliser Suivant, Précédent, Ignorer ou la touche Echap. La visite ne se ferme pas quand tu cliques à côté.",
    routeLabel: "Accueil",
  },
  {
    id: "search",
    route: "/",
    selector: "#search, #search-mobile",
    title: "Rechercher des produits ici",
    description:
      "La recherche est disponible dès l'en-tête. Elle lance les résultats automatiquement pendant que tu écris, sans attendre la validation.",
    helper: "Essaie par exemple « chaussures », « iPhone » ou « karité ».",
    routeLabel: "Accueil",
  },
  {
    id: "categories",
    route: "/",
    selector: "#categories",
    title: "Parcourir par catégorie",
    description:
      "Tu peux partir d'une catégorie populaire pour aller plus vite vers la bonne famille de produits.",
    helper: "Chaque carte t'envoie directement vers une vue ciblée du catalogue.",
    routeLabel: "Accueil",
  },
  {
    id: "product-card",
    route: "/",
    selector: ".product-card",
    title: "Découvrir une fiche produit",
    description:
      "Chaque fiche permet d'ouvrir le détail du produit, de consulter le prix, la note et les informations essentielles avant achat.",
    helper: "Le cœur sert aux favoris, et le bouton principal ajoute au panier.",
    routeLabel: "Accueil",
  },
  {
    id: "add-to-cart",
    route: "/",
    selector: ".add-to-cart",
    title: "Ajouter des articles à votre panier",
    description:
      "Depuis la carte produit, tu peux ajouter immédiatement un article au panier sans quitter la page.",
    helper: "Le compteur du panier se met à jour en direct dans l'en-tête.",
    routeLabel: "Accueil",
    scrollBlock: "center",
  },
  {
    id: "cart-summary",
    route: "/cart",
    selector: "#cart",
    title: "Voir votre panier",
    description:
      "Depuis l'icône panier, tu retrouves les articles ajoutés, les quantités et le total avant validation.",
    helper: "Tu peux modifier les quantités ou retirer un article avant de passer à l'étape suivante.",
    routeLabel: "Panier",
  },
  {
    id: "chatbot",
    route: "/",
    selector: "#chatbot-fab, .chatbot-fab, [data-tutorial='chatbot']",
    title: "Votre assistant BelivaY",
    description:
      "Le chatbot est disponible sur toutes les pages. Posez-lui vos questions sur les produits, la livraison, le paiement ou les retours.",
    helper: "Cliquez sur la bulle en bas à droite pour démarrer une conversation. Il peut aussi vous guider vers les pages de l'application.",
    routeLabel: "Accueil",
  },
  {
    id: "checkout",
    route: "/checkout",
    selector: "#checkout",
    title: "Finaliser votre achat",
    description:
      "La page de paiement te permet de confirmer ton adresse, choisir ton mode de règlement et valider la commande.",
    helper:
      "Une fois la visite terminée, tu peux la relancer à tout moment depuis le bouton Guide de l'en-tête.",
    routeLabel: "Paiement",
    scrollBlock: "center",
  },
];
