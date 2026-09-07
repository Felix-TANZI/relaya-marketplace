import { useLocation } from "react-router-dom";
import Seo from "./Seo";

/**
 * Metadonnees des pages statiques, decidees a partir du chemin.
 *
 * POURQUOI UN SEUL ENDROIT PLUTOT QU'UN <Seo> PAR PAGE
 *
 * Les pages statiques n'ont besoin que d'un titre et d'une description fixes.
 * Les inscrire ici evite de modifier neuf composants — et surtout d'y insirer
 * des fragments JSX dans des arborescences toutes differentes, ce qui est une
 * source d'erreurs pour un gain nul.
 *
 * Les pages dont les metadonnees dependent des DONNEES (fiche produit,
 * categorie) gardent leur propre <Seo> : elles seules connaissent le titre,
 * l'image et le JSON-LD a produire. Un chemin absent de cette table ne rend
 * rien ici, laissant la page maitresse de son referencement.
 */

interface Meta {
  title: string;
  description: string;
}

const PAGES: Record<string, Meta> = {
  "/": {
    title: "Marketplace camerounaise : le vendeur est payé quand vous êtes livré",
    description:
      "Marketplace multi-vendeurs à Yaoundé : le vendeur n'est réglé qu'une fois votre colis livré et la réception confirmée. Paiement MTN Mobile Money et Orange Money, livraison en 24-72 h à domicile ou en point relais, retour gratuit sous 7 jours.",
  },
  "/catalog": {
    title: "Catalogue : tous les produits",
    description:
      "Parcourez le catalogue BelivaY : mode, maison, high-tech, beaute, sante et bien plus, proposes par des vendeurs camerounais verifies.",
  },
  "/categories": {
    title: "Toutes les categories",
    description:
      "Explorez les categories de produits BelivaY : mode, maison, high-tech, beaute, sante, sports et plus encore.",
  },
  "/promotions": {
    title: "Promotions et bons plans",
    description:
      "Les meilleures promotions du moment sur BelivaY : reductions sur la mode, la maison, le high-tech et la beaute, chez des vendeurs verifies.",
  },
  "/flash-deals": {
    title: "Ventes flash",
    description:
      "Offres a duree limitee sur BelivaY : les meilleures reductions du moment, renouvelees chaque jour.",
  },
  "/premium": {
    title: "BelivaY+ : livraison gratuite et avantages membres",
    description:
      "Livraison gratuite illimitee, points fidelite triples, ventes flash en avant-premiere et support prioritaire avec l'abonnement BelivaY+.",
  },
  "/selection-premium": {
    title: "Selection premium",
    description:
      "Les boutiques certifiees Or et Platine de BelivaY, selectionnees pour la qualite de leurs produits et de leur service.",
  },
  "/become-seller": {
    title: "Devenir vendeur sur BelivaY",
    description:
      "Ouvrez votre boutique en ligne au Cameroun : des milliers d'acheteurs, paiement securise et versements suivis. Inscription gratuite.",
  },
  "/about": {
    title: "À propos : notre façon de rendre l'achat en ligne sûr",
    description:
      "BelivaY inverse la logique de l'achat en ligne au Cameroun : vous payez sur la plateforme, le colis est livré et contrôlé, et le vendeur n'est réglé qu'après votre confirmation de réception.",
  },
  "/help": {
    title: "Aide et questions frequentes",
    description:
      "Commandes, paiement Mobile Money, livraison, retours et litiges : toutes les reponses pour acheter et vendre sereinement sur BelivaY.",
  },
  "/contact": {
    title: "Contact et service client",
    description:
      "Une question ? L'equipe BelivaY est joignable 7j/7 par WhatsApp, telephone et courriel depuis Yaounde.",
  },
};

/**
 * Prefixes a ne JAMAIS indexer : espaces metier et parcours personnel.
 * robots.txt les interdit deja, mais une directive noindex dans la page est
 * la seule barriere qui tienne si une URL est atteinte par un lien externe —
 * robots.txt n'empeche pas l'indexation, seulement l'exploration.
 */
const PRIVES = [
  "/admin", "/seller", "/courier", "/driver", "/relay-point",
  "/delivery-organization", "/profile", "/orders", "/notifications",
  "/checkout", "/cart", "/wishlist", "/payments", "/wallet", "/refunds",
  "/escrow", "/finance", "/login", "/register", "/search",
];

export default function RouteSeo() {
  const { pathname } = useLocation();

  if (PRIVES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return <Seo title="BelivaY" path={pathname} noindex />;
  }

  const meta = PAGES[pathname];
  if (!meta) return null;

  return <Seo title={meta.title} description={meta.description} path={pathname} />;
}
