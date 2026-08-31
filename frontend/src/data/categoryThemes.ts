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

// Rendu net sur écrans HiDPI : le hero occupe ~1500 px CSS, soit 3000 px réels en dpr 2.
// `auto=format` laisse Unsplash servir du WebP/AVIF, plus fin à poids égal.
const IMG = "w=2400&h=900&fit=crop&q=90&auto=format";

// Recadrage carré de la même photo pour la pastille ronde de 32 px : 128 px de source
// la gardent nette jusqu'en dpr 4.
const THUMB = "w=128&h=128&fit=crop&q=90&auto=format";

const THEME_SEEDS: Omit<CategoryTheme, "thumb">[] = [
  {
    slug: "all",
    name: "Tout voir",
    shortName: "Tout",
    icon: ShoppingBag,
    count: "15 240",
    accent: "#F47920",
    label: "Marketplace BelivaY",
    title: "Tout le catalogue BelivaY",
    subtitle: "15 240 produits · 3 200 vendeurs certifiés",
    description:
      "L'intégralité de l'offre BelivaY, tous thèmes confondus : mode, électronique, beauté, maison, supermarché et bien plus. Paiement Mobile Money sécurisé par escrow, vendeurs vérifiés et livraison partout au Cameroun et en Afrique centrale.",
    image: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?${IMG}`,
    facets: ["Nouveautés", "Promotions", "Made in Cameroon", "Livraison 24h", "Coup de cœur"],
    vendors: "3 200",
    rating: "4.8 / 5",
    delivery: "24–72h",
  },
  {
    slug: "femme",
    name: "Mode Femme",
    shortName: "Femme",
    icon: Shirt,
    count: "3 400",
    accent: "#DB2777",
    label: "Mode Femme",
    title: "Robes · Pagnes · Wax Premium",
    subtitle: "3 400 produits · Vendeurs certifiés BelivaY",
    description:
      "Le vestiaire féminin africain dans toute sa richesse : wax authentique, pagne hollandais Vlisco, robes de cérémonie, tenues casual, sacs en cuir artisanal et bijoux. Toutes les tailles, du S au XXL, chez des couturiers et boutiques vérifiés.",
    image: `https://images.unsplash.com/photo-1617019114583-affb34d1b3cd?${IMG}`,
    facets: ["Robes", "Pagne & Wax", "Sacs", "Bijoux", "Pyjamas", "Jeans"],
    vendors: "740",
    rating: "4.9 / 5",
    delivery: "24–48h",
  },
  {
    slug: "homme",
    name: "Mode Homme",
    shortName: "Homme",
    icon: Shirt,
    count: "2 100",
    accent: "#1D4ED8",
    label: "Mode Homme",
    title: "Bazin · Costume · Chemise Brodée",
    subtitle: "2 100 produits · Tenues de cérémonie et casual",
    description:
      "Du grand boubou en bazin riche brodé main au costume deux pièces taillé sur mesure, en passant par les chemises en lin, chinos et accessoires en cuir. Des tailleurs camerounais reconnus, du M au 4XL.",
    image: `https://images.unsplash.com/photo-1617137968427-85924c800a22?${IMG}`,
    facets: ["Bazin & Boubou", "Costumes", "Chemises", "Pantalons", "Polos", "Maroquinerie"],
    vendors: "480",
    rating: "4.7 / 5",
    delivery: "24–48h",
  },
  {
    slug: "tech",
    name: "Électronique",
    shortName: "Électro",
    icon: Laptop,
    count: "1 850",
    accent: "#2563EB",
    label: "Électronique",
    title: "Ordinateurs, TV & Accessoires",
    subtitle: "Livraison gratuite dès 30 000 FCFA · Vendeurs certifiés Or",
    description:
      "Laptops, téléviseurs, audio, gaming, sécurité et petits accessoires. Produits neufs sous garantie constructeur, importés par des revendeurs certifiés Or dont l'identité et la licence commerciale ont été vérifiées par BelivaY.",
    image: `https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?${IMG}`,
    facets: ["Ordinateurs", "Télévisions", "Audio", "Gaming", "Stockage", "Sécurité"],
    vendors: "310",
    rating: "4.6 / 5",
    delivery: "48–72h",
  },
  {
    slug: "phone",
    name: "Téléphones",
    shortName: "Phones",
    icon: Smartphone,
    count: "980",
    accent: "#6366F1",
    label: "Téléphonie",
    title: "Smartphones & Tablettes",
    subtitle: "980 références · Garantie constructeur 12 mois",
    description:
      "Smartphones Android et iOS, tablettes, montres connectées, coques, chargeurs rapides et écouteurs. Chaque appareil est vendu avec sa garantie officielle et un IMEI vérifiable avant expédition.",
    image: `https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?${IMG}`,
    facets: ["Smartphones", "Tablettes", "Montres connectées", "Chargeurs", "Écouteurs", "Coques"],
    vendors: "260",
    rating: "4.7 / 5",
    delivery: "24–48h",
  },
  {
    slug: "beaute",
    name: "Beauté & Santé",
    shortName: "Beauté",
    icon: Sparkles,
    count: "2 600",
    accent: "#E11D48",
    label: "Beauté & Soins",
    title: "Cosmétiques & Soins Authentiques",
    subtitle: "2 600 produits vérifiés · Livraison express",
    description:
      "Karité pur, savon noir artisanal, huile d'argan pressée à froid, sérums, maquillage et parfums. Les cosmétiques naturels sont sourcés auprès de producteurs locaux et les références importées portent leur certification d'origine.",
    image: `https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?${IMG}`,
    facets: ["Soins visage", "Cheveux", "Maquillage", "Parfums", "Savons", "Bio & naturel"],
    vendors: "520",
    rating: "4.9 / 5",
    delivery: "24h",
  },
  {
    slug: "maison",
    name: "Maison & Déco",
    shortName: "Maison",
    icon: Home,
    count: "1 720",
    accent: "#78716C",
    label: "Maison & Déco",
    title: "Aménagez votre intérieur",
    subtitle: "1 720 produits · Meubles · Déco · Électroménager",
    description:
      "Mobilier, literie, art de la table, décoration murale et petit électroménager. Les meubles volumineux sont livrés et montés à domicile à Yaoundé et Douala par les équipes logistique BelivaY.",
    image: `https://images.unsplash.com/photo-1616046229478-9901c5536a45?${IMG}`,
    facets: ["Meubles", "Literie", "Cuisine", "Décoration", "Luminaires", "Électroménager"],
    vendors: "390",
    rating: "4.6 / 5",
    delivery: "48–72h",
  },
  {
    slug: "super",
    name: "Supermarché",
    shortName: "Marché",
    icon: ShoppingCart,
    count: "890",
    accent: "#059669",
    label: "Supermarché",
    title: "Courses & Produits du terroir",
    subtitle: "890 références · Producteurs camerounais",
    description:
      "Épicerie sèche, huiles, épices, céréales, boissons et produits d'entretien. Une large part du rayon vient directement de coopératives et PME camerounaises, avec des dates de péremption contrôlées avant chaque expédition.",
    image: `https://images.unsplash.com/photo-1542838132-92c53300491e?${IMG}`,
    facets: ["Épicerie", "Épices", "Boissons", "Céréales", "Entretien", "Made in Cameroon"],
    vendors: "210",
    rating: "4.8 / 5",
    delivery: "24h",
  },
  {
    slug: "shoes",
    name: "Chaussures",
    shortName: "Chauss.",
    icon: Footprints,
    count: "1 100",
    accent: "#9333EA",
    label: "Chaussures",
    title: "Sneakers · Escarpins · Sandales",
    subtitle: "1 100 produits · Toutes pointures disponibles",
    description:
      "Sneakers, mocassins, escarpins, sandales et chaussures de sécurité, du 36 au 47. Chaque fiche indique le guide des pointures du vendeur, et l'échange de taille est gratuit sous 7 jours.",
    image: `https://images.unsplash.com/photo-1549298916-b41d501d3772?${IMG}`,
    facets: ["Sneakers", "Escarpins", "Sandales", "Mocassins", "Sport", "Sécurité"],
    vendors: "290",
    rating: "4.7 / 5",
    delivery: "24–48h",
  },
  {
    slug: "sport",
    name: "Sport & Loisirs",
    shortName: "Sport",
    icon: Dumbbell,
    count: "640",
    accent: "#0891B2",
    label: "Sport & Loisirs",
    title: "Équipez-vous et bougez",
    subtitle: "640 produits · Fitness · Football · Plein air",
    description:
      "Matériel de fitness, tenues techniques, ballons, vélos et équipement de plein air. Les articles encombrants sont expédiés depuis les entrepôts partenaires de Douala avec suivi temps réel.",
    image: `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?${IMG}`,
    facets: ["Fitness", "Football", "Vélos", "Tenues", "Plein air", "Accessoires"],
    vendors: "150",
    rating: "4.6 / 5",
    delivery: "48–72h",
  },
  {
    slug: "bebe",
    name: "Bébé & Enfant",
    shortName: "Bébé",
    icon: Baby,
    count: "520",
    accent: "#F59E0B",
    label: "Bébé & Enfant",
    title: "Tout pour les tout-petits",
    subtitle: "520 produits · Puériculture & vêtements enfant",
    description:
      "Poussettes, lits, sièges auto, vêtements, jouets d'éveil et soins bébé. Les articles de puériculture référencés répondent aux normes de sécurité européennes, contrôlées à l'entrée du catalogue.",
    image: `https://images.unsplash.com/photo-1522771930-78848d9293e8?${IMG}`,
    facets: ["Puériculture", "Vêtements", "Jouets", "Soins bébé", "Repas", "Sécurité"],
    vendors: "130",
    rating: "4.8 / 5",
    delivery: "24–48h",
  },
];

/* La pastille dérive du hero : une seule photo à maintenir par thème. */
export const CATEGORY_THEMES: CategoryTheme[] = THEME_SEEDS.map((seed) => ({
  ...seed,
  thumb: seed.image.replace(IMG, THUMB),
}));

/**
 * Hauteur commune au hero des pages catégorie et au carrousel de l'accueil.
 * Définie ici pour que les deux surfaces ne puissent pas diverger.
 */
export const HERO_MIN_HEIGHT = "min-h-[300px] sm:min-h-[360px]";

const THEMES_BY_SLUG = new Map(CATEGORY_THEMES.map((theme) => [theme.slug, theme]));

export function getCategoryTheme(slug: string | undefined): CategoryTheme | undefined {
  return slug ? THEMES_BY_SLUG.get(slug) : undefined;
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
