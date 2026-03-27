import type { Product } from "@/services/api/products";

export interface CatalogAssistantSuggestion {
  productId: number;
  title: string;
  reason: string;
}

export interface CatalogAssistantResponse {
  answer: string;
  suggestions: CatalogAssistantSuggestion[];
  followUp: string[];
  source: "mock";
  providerReady: boolean;
}

export interface CatalogAssistantContext {
  message: string;
  products: Product[];
  selectedCategoryName: string;
  filters: {
    promoOnly: boolean;
    freeDeliveryOnly: boolean;
    inStockOnly: boolean;
    minRating: number;
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreProduct(product: Product, query: string) {
  const haystack = normalizeText(
    [
      product.title,
      product.description,
      product.short_description || "",
      product.category?.name || "",
    ].join(" "),
  );

  let score = 0;
  const words = normalizeText(query).split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (haystack.includes(word)) {
      score += 4;
    }
  }

  if (/(pas cher|abordable|budget|economique|moins cher)/.test(normalizeText(query))) {
    score += Math.max(0, 100000 - product.price_final) / 10000;
  }

  if (/(premium|haut de gamme|qualite|solide|durable)/.test(normalizeText(query))) {
    score += product.rating_average ? product.rating_average * 2 : 1;
    score += product.price_final / 50000;
  }

  if (/(promo|promotion|reduction)/.test(normalizeText(query)) && (product.discount ?? 0) > 0) {
    score += 6;
  }

  if (/(livraison gratuite|livraison offerte)/.test(normalizeText(query)) && product.price_final >= 30000) {
    score += 5;
  }

  if (product.stock_quantity && product.stock_quantity > 0) {
    score += 2;
  }

  score += (product.reviews_count ?? 0) / 10;
  score += product.rating_average ?? 0;

  return score;
}

export async function getCatalogAssistantResponse(
  context: CatalogAssistantContext,
): Promise<CatalogAssistantResponse> {
  const rankedProducts = [...context.products]
    .map((product) => ({
      product,
      score: scoreProduct(product, context.message),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ product }) => product);

  const suggestions = rankedProducts.map((product, index) => ({
    productId: product.id,
    title: product.title,
    reason:
      index === 0
        ? "C'est le choix le plus pertinent selon ta demande, son prix et ses retours clients."
        : index === 1
          ? "C'est une bonne alternative si tu veux comparer avant d'acheter."
          : "Je te le propose comme option supplementaire pour elargir ton choix.",
  }));

  const answer =
    suggestions.length > 0
      ? `J'ai analyse les produits visibles dans le catalogue ${context.selectedCategoryName !== "Toutes les catégories" ? `pour la categorie ${context.selectedCategoryName}` : ""}. Je te recommande surtout ${suggestions[0].title}, puis ${suggestions.slice(1).map((item) => item.title).join(" et ")}.`
      : "Je n'ai pas encore trouve de produit vraiment pertinent dans les resultats visibles. Essaie une recherche plus precise ou retire certains filtres.";

  return {
    answer,
    suggestions,
    followUp: [
      "Je cherche le meilleur rapport qualite prix",
      "Montre-moi les options les moins cheres",
      "Je veux un produit bien note et durable",
    ],
    source: "mock",
    providerReady: true,
  };
}
