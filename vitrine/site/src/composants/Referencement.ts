// Référencement de chaque page (site public, mise en ligne du 25 oct. 2026) : titre de l'onglet, description, adresse
// canonique et consigne aux moteurs de recherche. Appelé par l'écran (coque.tsx, Ecran) à chaque page.
// - Ouvertes aux moteurs : l'accueil, les catégories, l'aide, les questions fréquentes, les pages légales et les pages
//   d'information (liste ci-dessous, la même que outils/publication.mjs met dans sitemap.xml).
// - Les autres (compte, panier, commande, fiche d'un produit de démonstration, page introuvable…) : « noindex ». Les
//   produits sont des exemples : ils ne doivent pas apparaître dans les résultats de recherche comme de vraies offres.
// Les balises de partage (Open Graph, Twitter) sont dans index.html : les robots des réseaux ne lisent pas le script.

const DESCRIPTION =
  'BelivaY, la marketplace de confiance au Cameroun : achète auprès des boutiques de Yaoundé, paie protégé par Mobile Money et retire au point relais ou fais-toi livrer.'

// Route → description (français ; la langue de l'application traduit par t()).
export const PAGES_OUVERTES: Record<string, string> = {
  accueil: DESCRIPTION,
  categories: 'Toutes les catégories de BelivaY : mode, téléphones, maison, beauté, électronique, supermarché, bébé, sport.',
  aide: 'Aide et contact BelivaY : questions fréquentes, support par message, rappel, téléphone et WhatsApp.',
  faq: 'Questions fréquentes sur BelivaY : commander, payer, retirer au point relais, se faire livrer, retourner un article.',
  legal: 'Pages légales de BelivaY : conditions d’utilisation, confidentialité, conditions de vente, retours, garde au relais, mentions légales.',
  'legal-doc': 'Les textes légaux de BelivaY, en langage simple, en français et en anglais.',
  cgu: 'Les conditions d’utilisation de BelivaY, en bref.',
  'diaspora-infos': 'Comptes diaspora BelivaY : faire livrer un proche au Cameroun depuis l’étranger, payer par carte, suivre le retrait.',
}

// Titre de l'accueil : la promesse plutôt que « Accueil ».
const TITRE_ACCUEIL = 'BelivaY — Votre marketplace de confiance au Cameroun'

function meta(nom: string, contenu: string | null) {
  let m = document.head.querySelector<HTMLMetaElement>(`meta[name="${nom}"]`)
  if (contenu === null) return void m?.remove()
  if (!m) {
    m = document.createElement('meta')
    m.name = nom
    document.head.appendChild(m)
  }
  m.content = contenu
}

// Origine de l'adresse canonique : celle que la publication a écrite dans index.html (l'adresse de production, même
// sur un déploiement d'essai ou sur l'ancienne adresse *.vercel.app) ; à défaut (développement), celle de la page.
let origine: string | null = null
function origineDuSite(): string {
  if (origine) return origine
  const h = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? ''
  origine = /^https:\/\//.test(h) ? new URL(h).origin : location.origin
  return origine
}

// Adresse canonique : l'origine du site et le chemin, sans paramètres (sauf le document légal choisi).
export function adresseCanonique(route: string, adresse: Location = location): string {
  const q = new URLSearchParams(adresse.search)
  const d = route === 'legal-doc' ? q.get('d') : null
  return origineDuSite() + adresse.pathname + (d ? '?d=' + encodeURIComponent(d) : '')
}

export function referencer(route: string, titre: string, t: (s: string) => string) {
  const ouverte = route in PAGES_OUVERTES
  document.title = route === 'accueil' ? t(TITRE_ACCUEIL) : t(titre) + ' · BelivaY'
  meta('description', t(PAGES_OUVERTES[route] ?? DESCRIPTION))
  meta('robots', ouverte ? null : 'noindex')
  let lien = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!lien) {
    lien = document.createElement('link')
    lien.rel = 'canonical'
    document.head.appendChild(lien)
  }
  lien.href = adresseCanonique(route)
}
