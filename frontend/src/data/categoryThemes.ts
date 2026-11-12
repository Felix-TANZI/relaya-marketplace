// frontend/src/data/categoryThemes.ts
// Source unique de la taxonomie client : la sidebar « Catégories », les frames du
// carrousel d'accueil et les pages /categorie/:slug lisent toutes cette liste, afin
// qu'un slug ne puisse jamais diverger d'un écran à l'autre.

import {
  Baby,
  Dumbbell,
  Footprints,
  Home,
  Laptop,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "i18next";
import { VISUELS_THEMES } from "@/config/visuels";

export interface CategoryTheme {
  slug: string;
  /** Libellé complet — sidebar PC, titre de page, fil d'ariane. */
  name: string;
  /** Libellé raccourci — pastilles mobiles. */
  shortName: string;
  icon: LucideIcon;
  count: string;
  /** Couleur signature du thème : pastille, dégradé du hero, accents de la page. */
  accent: string;
  /** Pastille affichée en haut du hero et de la frame carrousel. */
  label: string;
  title: string;
  subtitle: string;
  description: string;
  /** Photo plein cadre du hero de la page catégorie. */
  image: string;
  /** Même photo recadrée en carré, pour la pastille ronde des filtres rapides. */
  thumb: string;
  /** Sous-thèmes proposés en filtres rapides sur la page catégorie. */
  facets: string[];
  vendors: string;
  rating: string;
  delivery: string;
}

// Images des thèmes : config/visuels.ts (DEV-SRV-01 v1.8, C03 : visuels BelivaY, plus de photo Unsplash).

const THEME_SEEDS: Omit<CategoryTheme, "thumb">[] = [
  {
    slug: "all",
    name: "Tout voir",
    shortName: "Tout",
    icon: ShoppingBag,
    count: "",
    accent: "#F47920",
    label: "Marketplace BelivaY",
    title: "Tout le catalogue BelivaY",
    subtitle: "Tous les produits des boutiques BelivaY",
    description:
      "L'intégralité de l'offre BelivaY, tous thèmes confondus : mode, électronique, beauté, maison, supermarché et bien plus. Paiement Mobile Money sécurisé par escrow, vendeurs vérifiés et livraison à Yaoundé.",
    image: VISUELS_THEMES.all,
    facets: ["Nouveautés", "Promotions", "Made in Cameroon", "Livraison 24h", "Coup de cœur"],
    vendors: "",
    rating: "",
    delivery: "24–72h",
  },
  {
    slug: "femme",
    name: "Mode Femme",
    shortName: "Femme",
    icon: Shirt,
    count: "",
    accent: "#DB2777",
    label: "Mode Femme",
    title: "Robes · Pagnes · Wax Premium",
    subtitle: "Vendeurs certifiés BelivaY",
    description:
      "Le vestiaire féminin africain dans toute sa richesse : wax authentique, pagne hollandais Vlisco, robes de cérémonie, tenues casual, sacs en cuir artisanal et bijoux. Toutes les tailles, du S au XXL, chez des couturiers et boutiques vérifiés.",
    image: VISUELS_THEMES.femme,
    facets: ["Robes", "Pagne & Wax", "Sacs", "Bijoux", "Pyjamas", "Jeans"],
    vendors: "",
    rating: "",
    delivery: "24–48h",
  },
  {
    slug: "homme",
    name: "Mode Homme",
    shortName: "Homme",
    icon: Shirt,
    count: "",
    accent: "#1D4ED8",
    label: "Mode Homme",
    title: "Bazin · Costume · Chemise Brodée",
    subtitle: "Tenues de cérémonie et casual",
    description:
      "Du grand boubou en bazin riche brodé main au costume deux pièces taillé sur mesure, en passant par les chemises en lin, chinos et accessoires en cuir. Des tailleurs camerounais reconnus, du M au 4XL.",
    image: VISUELS_THEMES.homme,
    facets: ["Bazin & Boubou", "Costumes", "Chemises", "Pantalons", "Polos", "Maroquinerie"],
    vendors: "",
    rating: "",
    delivery: "24–48h",
  },
  {
    slug: "tech",
    name: "Électronique",
    shortName: "Électro",
    icon: Laptop,
    count: "",
    accent: "#2563EB",
    label: "Électronique",
    title: "Ordinateurs, TV & Accessoires",
    subtitle: "Livraison au relais offerte dès {{seuil_relais}} · Vendeurs certifiés Or",
    description:
      "Laptops, téléviseurs, audio, gaming, sécurité et petits accessoires. Produits neufs sous garantie constructeur, importés par des revendeurs certifiés Or dont l'identité et la licence commerciale ont été vérifiées par BelivaY.",
    image: VISUELS_THEMES.tech,
    facets: ["Ordinateurs", "Télévisions", "Audio", "Gaming", "Stockage", "Sécurité"],
    vendors: "",
    rating: "",
    delivery: "48–72h",
  },
  {
    slug: "phone",
    name: "Téléphones",
    shortName: "Phones",
    icon: Smartphone,
    count: "",
    accent: "#6366F1",
    label: "Téléphonie",
    title: "Smartphones & Tablettes",
    subtitle: "Garantie constructeur 12 mois",
    description:
      "Smartphones Android et iOS, tablettes, montres connectées, coques, chargeurs rapides et écouteurs. Chaque appareil est vendu avec sa garantie officielle et un IMEI vérifiable avant expédition.",
    image: VISUELS_THEMES.phone,
    facets: ["Smartphones", "Tablettes", "Montres connectées", "Chargeurs", "Écouteurs", "Coques"],
    vendors: "",
    rating: "",
    delivery: "24–48h",
  },
  {
    slug: "beaute",
    name: "Beauté & Santé",
    shortName: "Beauté",
    icon: Sparkles,
    count: "",
    accent: "#E11D48",
    label: "Beauté & Soins",
    title: "Cosmétiques & Soins Authentiques",
    subtitle: "Livraison express",
    description:
      "Karité pur, savon noir artisanal, huile d'argan pressée à froid, sérums, maquillage et parfums. Les cosmétiques naturels sont sourcés auprès de producteurs locaux et les références importées portent leur certification d'origine.",
    image: VISUELS_THEMES.beaute,
    facets: ["Soins visage", "Cheveux", "Maquillage", "Parfums", "Savons", "Bio & naturel"],
    vendors: "",
    rating: "",
    delivery: "24h",
  },
  {
    slug: "maison",
    name: "Maison & Déco",
    shortName: "Maison",
    icon: Home,
    count: "",
    accent: "#78716C",
    label: "Maison & Déco",
    title: "Aménagez votre intérieur",
    subtitle: "Meubles · Déco · Électroménager",
    description:
      "Mobilier, literie, art de la table, décoration murale et petit électroménager. Les meubles volumineux sont livrés et montés à domicile à Yaoundé et Douala par les équipes logistique BelivaY.",
    image: VISUELS_THEMES.maison,
    facets: ["Meubles", "Literie", "Cuisine", "Décoration", "Luminaires", "Électroménager"],
    vendors: "",
    rating: "",
    delivery: "48–72h",
  },
  {
    slug: "super",
    name: "Supermarché",
    shortName: "Marché",
    icon: ShoppingCart,
    count: "",
    accent: "#059669",
    label: "Supermarché",
    title: "Courses & Produits du terroir",
    subtitle: "Producteurs camerounais",
    description:
      "Épicerie sèche, huiles, épices, céréales, boissons et produits d'entretien. Une large part du rayon vient directement de coopératives et PME camerounaises, avec des dates de péremption contrôlées avant chaque expédition.",
    image: VISUELS_THEMES.super,
    facets: ["Épicerie", "Épices", "Boissons", "Céréales", "Entretien", "Made in Cameroon"],
    vendors: "",
    rating: "",
    delivery: "24h",
  },
  {
    slug: "shoes",
    name: "Chaussures",
    shortName: "Chauss.",
    icon: Footprints,
    count: "",
    accent: "#9333EA",
    label: "Chaussures",
    title: "Sneakers · Escarpins · Sandales",
    subtitle: "Toutes pointures disponibles",
    description:
      "Sneakers, mocassins, escarpins, sandales et chaussures de sécurité, du 36 au 47. Chaque fiche indique le guide des pointures du vendeur, et l'échange de taille est gratuit sous 7 jours.",
    image: VISUELS_THEMES.shoes,
    facets: ["Sneakers", "Escarpins", "Sandales", "Mocassins", "Sport", "Sécurité"],
    vendors: "",
    rating: "",
    delivery: "24–48h",
  },
  {
    slug: "sport",
    name: "Sport & Loisirs",
    shortName: "Sport",
    icon: Dumbbell,
    count: "",
    accent: "#0891B2",
    label: "Sport & Loisirs",
    title: "Équipez-vous et bougez",
    subtitle: "Fitness · Football · Plein air",
    description:
      "Matériel de fitness, tenues techniques, ballons, vélos et équipement de plein air. Les articles encombrants sont expédiés depuis les entrepôts partenaires de Douala avec suivi temps réel.",
    image: VISUELS_THEMES.sport,
    facets: ["Fitness", "Football", "Vélos", "Tenues", "Plein air", "Accessoires"],
    vendors: "",
    rating: "",
    delivery: "48–72h",
  },
  {
    slug: "bebe",
    name: "Bébé & Enfant",
    shortName: "Bébé",
    icon: Baby,
    count: "",
    accent: "#F59E0B",
    label: "Bébé & Enfant",
    title: "Tout pour les tout-petits",
    subtitle: "Puériculture & vêtements enfant",
    description:
      "Poussettes, lits, sièges auto, vêtements, jouets d'éveil et soins bébé. Les articles de puériculture référencés répondent aux normes de sécurité européennes, contrôlées à l'entrée du catalogue.",
    image: VISUELS_THEMES.bebe,
    facets: ["Puériculture", "Vêtements", "Jouets", "Soins bébé", "Repas", "Sécurité"],
    vendors: "",
    rating: "",
    delivery: "24–48h",
  },
];

/* La pastille reprend le visuel du thème : une seule image à maintenir par thème (C03, config/visuels.ts). */
export const CATEGORY_THEMES: CategoryTheme[] = THEME_SEEDS.map((seed) => ({
  ...seed,
  thumb: seed.image,
}));

/**
 * Hauteur commune au hero des pages catégorie et au carrousel de l'accueil.
 * Définie ici pour que les deux surfaces ne puissent pas diverger.
 */
export const HERO_MIN_HEIGHT = "min-h-[196px] sm:min-h-[300px]";

const THEMES_BY_SLUG = new Map(CATEGORY_THEMES.map((theme) => [theme.slug, theme]));

/**
 * Les champs texte de `THEME_SEEDS` sont la copie FR de référence (clé de repli
 * et source du contenu importé dans `i18n/domains/hm1.fr.ts` / `hm1.en.ts` sous
 * `category_theme.<slug>.*`). À l'affichage, on superpose toujours la traduction
 * de la langue active sur le thème structurel (icône, couleur, photo, volumes).
 */
function translateTheme(seed: CategoryTheme, t: TFunction): CategoryTheme {
  const base = `category_theme.${seed.slug}`;
  const facets = t(`${base}.facets`, { returnObjects: true, defaultValue: seed.facets }) as string[];
  return {
    ...seed,
    name: t(`${base}.name`, { defaultValue: seed.name }),
    shortName: t(`${base}.shortName`, { defaultValue: seed.shortName }),
    label: t(`${base}.label`, { defaultValue: seed.label }),
    title: t(`${base}.title`, { defaultValue: seed.title }),
    subtitle: t(`${base}.subtitle`, { defaultValue: seed.subtitle }),
    description: t(`${base}.description`, { defaultValue: seed.description }),
    facets: Array.isArray(facets) ? facets : seed.facets,
  };
}

/** Les 11 thèmes, texte traduit dans la langue active — repli complet hors ligne. */
export function getAllCategoryThemes(t: TFunction): CategoryTheme[] {
  return CATEGORY_THEMES.map((theme) => translateTheme(theme, t));
}

export function getCategoryTheme(slug: string | undefined, t: TFunction): CategoryTheme | undefined {
  const seed = slug ? THEMES_BY_SLUG.get(slug) : undefined;
  return seed ? translateTheme(seed, t) : undefined;
}

/**
 * Variantes acceptées pour rapprocher un slug de la sidebar (taxonomie front) des
 * catégories renvoyées par l'API, dont les libellés et slugs sont différents.
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  femme: ["femme"],
  homme: ["homme"],
  tech: ["tech", "electron", "électron", "informatique"],
  phone: ["phone", "mobile", "tablette"],
  beaute: ["beaute", "beauté", "cosmet", "cosmét", "sante", "santé"],
  maison: ["maison", "deco", "déco", "cuisine", "meuble"],
  super: ["super", "marche", "marché", "epicerie", "épicerie", "aliment"],
  shoes: ["shoes", "chauss"],
  sport: ["sport", "loisir"],
  bebe: ["bebe", "bébé", "enfant", "puericulture", "puériculture"],
};

/**
 * Thème visuel de secours pour une catégorie en base : même slug, sinon premier
 * thème dont un alias apparaît dans son slug ou son nom (« electronique » → tech).
 */
export function findThemeForCategory(
  category: { slug: string; name: string },
  t: TFunction,
): CategoryTheme | undefined {
  const exact = THEMES_BY_SLUG.get(category.slug);
  if (exact) return translateTheme(exact, t);

  const haystack = `${category.slug} ${category.name}`.toLowerCase();
  const slug = Object.keys(CATEGORY_ALIASES).find((key) =>
    CATEGORY_ALIASES[key].some((alias) => haystack.includes(alias)),
  );
  const seed = slug ? THEMES_BY_SLUG.get(slug) : undefined;
  return seed ? translateTheme(seed, t) : undefined;
}

interface CategoryLike {
  category?: { slug?: string; name?: string } | null;
}

/** Un produit appartient-il au thème `slug` ? `all` accepte tout le catalogue. */
export function matchesCategory(product: CategoryLike, slug: string): boolean {
  if (slug === "all") return true;

  const categorySlug = product.category?.slug?.toLowerCase() ?? "";
  const categoryName = product.category?.name?.toLowerCase() ?? "";
  const aliases = CATEGORY_ALIASES[slug] ?? [slug];

  return aliases.some((alias) => categorySlug.includes(alias) || categoryName.includes(alias));
}
