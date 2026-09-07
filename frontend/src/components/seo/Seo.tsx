import { useEffect } from "react";

/**
 * Metadonnees par page, sans dependance.
 *
 * POURQUOI PAS react-helmet-async
 *
 * Le projet est sur React 19, qui remonte nativement <title>, <meta> et
 * <link> declares dans un composant. Mais cette remontee AJOUTE des balises
 * sans supprimer celles d'index.html : on se retrouverait avec deux <title>
 * et deux meta description. Le premier <title> gagne selon la specification
 * HTML, donc le titre de page ne s'appliquerait jamais.
 *
 * On met donc a jour EN PLACE les balises existantes, et on ne cree que
 * celles qui manquent. Un seul exemplaire de chaque, toujours.
 *
 * react-helmet-async aurait ete le choix d'hier : il n'est plus maintenu et
 * declare une dependance de pair sur React <= 18. L'installer aurait ajoute
 * un second conflit npm par-dessus celui de Capacitor.
 */

const SITE = "https://belivay.com";
const NOM = "BelivaY";

/** Repere les balises que nous avons creees, pour les retirer au demontage. */
const MARQUEUR = "data-seo-page";

export interface SeoProps {
  /** Titre de la page, sans le nom du site : il est ajoute automatiquement. */
  title: string;
  description?: string;
  /** Chemin absolu depuis la racine, ex. "/product/tv-samsung". */
  path?: string;
  /** URL d'image absolue ou chemin racine ; convertie en URL absolue. */
  image?: string;
  type?: "website" | "article" | "product";
  /**
   * Empeche l'indexation. A poser sur les pages sans valeur de recherche
   * (resultats filtres, pages de compte) — la ceinture et les bretelles avec
   * robots.txt, qui n'est qu'une demande polie.
   */
  noindex?: boolean;
  /** Donnees structurees JSON-LD, serialisees telles quelles. */
  jsonLd?: Record<string, unknown> | null;
}

function upsertMeta(cle: "name" | "property", valeur: string, contenu: string) {
  let balise = document.head.querySelector<HTMLMetaElement>(
    `meta[${cle}="${valeur}"]`,
  );
  if (!balise) {
    balise = document.createElement("meta");
    balise.setAttribute(cle, valeur);
    balise.setAttribute(MARQUEUR, "");
    document.head.appendChild(balise);
  }
  balise.setAttribute("content", contenu);
}

function upsertLink(rel: string, href: string) {
  let balise = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!balise) {
    balise = document.createElement("link");
    balise.setAttribute("rel", rel);
    balise.setAttribute(MARQUEUR, "");
    document.head.appendChild(balise);
  }
  balise.setAttribute("href", href);
}

function absolu(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return SITE + (url.startsWith("/") ? url : `/${url}`);
}

export default function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd = null,
}: SeoProps) {
  // Serialise pour que l'effet ne se rejoue pas a chaque rendu sur un objet
  // recree a l'identique.
  const jsonLdTexte = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const titreComplet = title.includes(NOM) ? title : `${title} | ${NOM}`;
    const url = absolu(path ?? window.location.pathname);
    const visuel = absolu(image ?? "/belivay-logo.png");

    const titrePrecedent = document.title;
    document.title = titreComplet;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }

    upsertMeta("property", "og:title", titreComplet);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", visuel);
    upsertMeta("name", "twitter:title", titreComplet);
    upsertMeta("name", "twitter:url", url);
    upsertMeta("name", "twitter:image", visuel);
    upsertLink("canonical", url);

    upsertMeta(
      "name",
      "robots",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1",
    );

    // ── JSON-LD ───────────────────────────────────────────────────────────
    // Un identifiant fixe evite d'empiler un bloc par navigation : les deux
    // blocs d'index.html (Organization, WebSite) restent intacts, seul
    // celui-ci est remplace.
    let script: HTMLScriptElement | null = null;
    if (jsonLdTexte) {
      script = document.getElementById("seo-page-jsonld") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "seo-page-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = jsonLdTexte;
    }

    return () => {
      document.title = titrePrecedent;
      document.getElementById("seo-page-jsonld")?.remove();
    };
  }, [title, description, path, image, type, noindex, jsonLdTexte]);

  return null;
}
