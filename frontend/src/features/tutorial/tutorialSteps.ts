export interface TutorialStep {
  id: string;
  route: string;
  selector?: string;
  titleKey: string;
  descriptionKey: string;
  helperKey?: string;
  routeLabelKey?: string;
  scrollBlock?: ScrollLogicalPosition;
}

export const CLIENT_TOUR_STORAGE_KEY = "belivay_client_tour_completed";

export const CLIENT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    route: "/",
    titleKey: "misc1_tutorial.welcome_title",
    descriptionKey: "misc1_tutorial.welcome_description",
    helperKey: "misc1_tutorial.welcome_helper",
    routeLabelKey: "misc1_tutorial.route_home",
  },
  {
    id: "search",
    route: "/",
    selector: "#search, #search-mobile",
    titleKey: "misc1_tutorial.search_title",
    descriptionKey: "misc1_tutorial.search_description",
    helperKey: "misc1_tutorial.search_helper",
    routeLabelKey: "misc1_tutorial.route_home",
  },
  {
    id: "categories",
    route: "/",
    selector: "#categories",
    titleKey: "misc1_tutorial.categories_title",
    descriptionKey: "misc1_tutorial.categories_description",
    helperKey: "misc1_tutorial.categories_helper",
    routeLabelKey: "misc1_tutorial.route_home",
  },
  {
    id: "product-card",
    route: "/",
    selector: ".product-card",
    titleKey: "misc1_tutorial.product_card_title",
    descriptionKey: "misc1_tutorial.product_card_description",
    helperKey: "misc1_tutorial.product_card_helper",
    routeLabelKey: "misc1_tutorial.route_home",
  },
  {
    id: "add-to-cart",
    route: "/",
    selector: ".add-to-cart",
    titleKey: "misc1_tutorial.add_to_cart_title",
    descriptionKey: "misc1_tutorial.add_to_cart_description",
    helperKey: "misc1_tutorial.add_to_cart_helper",
    routeLabelKey: "misc1_tutorial.route_home",
    scrollBlock: "center",
  },
  {
    id: "cart-summary",
    route: "/cart",
    selector: "#cart",
    titleKey: "misc1_tutorial.cart_summary_title",
    descriptionKey: "misc1_tutorial.cart_summary_description",
    helperKey: "misc1_tutorial.cart_summary_helper",
    routeLabelKey: "misc1_tutorial.route_cart",
  },
  {
    id: "chatbot",
    route: "/",
    selector: "#chatbot-fab, .chatbot-fab, [data-tutorial='chatbot']",
    titleKey: "misc1_tutorial.chatbot_title",
    descriptionKey: "misc1_tutorial.chatbot_description",
    helperKey: "misc1_tutorial.chatbot_helper",
    routeLabelKey: "misc1_tutorial.route_home",
  },
];
