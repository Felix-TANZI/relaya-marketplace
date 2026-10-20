// Contenus éditoriaux de l'accueil (CL-04) : carrousel, catégories mises en avant, textes des ventes flash, bandeau
// « Pourquoi choisir BelivaY ? », fond de l'écran d'arrivée. Servis par GET /api/content/home (backend-kit/apps/
// contenus, éditables dans l'admin Django) ; CONTENU_ACCUEIL est le contenu du prototype : la démonstration le
// rend tel quel, et le site y revient si la route échoue (mode api). Les textes passent par t() à l'affichage ;
// une photo (`image`) remplace le dessin quand le serveur en sert une (le dessin reste en repli).
import { COORDONNEES, type Coordonnees } from '../config/coordonnees'
import type { PhotoServeur } from './source'

export interface BandeauAccueil {
  lien: string // chemin du site (« /liste?cat=femme&from=accueil »)
  titre: string // « Mode femme »
  sous: string[] // sous-catégories, jointes par « · »
  produits: string // nombre affiché (« 283 ») ; à terme compté par le serveur
  dessin: string // dessin du prototype (repli)
  image?: PhotoServeur | null // photo servie par le serveur (prioritaire)
  // Photo déposée dans public/images/carrousel/<photo>.webp (ou .jpg) ; absente : le dessin reste (LISEZMOI.md).
  photo?: string
}
export interface CategorieAccueil {
  lien: string
  titre: string
  dessin: string
  image?: PhotoServeur | null
}
export interface CarteConfiance {
  lien: string
  icone: string // nom d'icône (composants/Icone.tsx)
  ton: '' | 'o' // pastille de couleur de l'icône
  titre: string
  texte: string
  action: string // « En savoir plus »
}
export interface ContenuAccueil {
  carrousel: BandeauAccueil[]
  categories: CategorieAccueil[] // la première est la catégorie active (« Tout voir »)
  flash: { titre: string; sousTitre: string }
  confiance: { question: string; marque: string; cartes: CarteConfiance[] }
  fondArrivee?: PhotoServeur | null // photo de l'écran d'arrivée (grand écran) ; sinon la photo du prototype
  coordonnees?: Coordonnees // coordonnées officielles et réseaux (config/coordonnees.ts par défaut)
}

const accueil = (cat: string) => `/liste?cat=${cat}&from=accueil`

export const CONTENU_ACCUEIL: ContenuAccueil = {
  carrousel: [
    { lien: accueil('femme'), titre: 'Mode femme', sous: ['Robes', 'Pagnes & wax'], produits: '283', dessin: '30a65dd8f0c3', photo: 'femme' },
    { lien: accueil('tel'), titre: 'Téléphones & tablettes', sous: ['Smartphones', 'Téléphones simples'], produits: '132', dessin: '6cb441816096', photo: 'tel' },
    { lien: accueil('maison'), titre: 'Maison & cuisine', sous: ['Cuisine', 'Petit électroménager'], produits: '138', dessin: 'a00d64f30e5f', photo: 'maison' },
    { lien: accueil('beaute'), titre: 'Beauté & santé', sous: ['Soins visage', 'Cheveux'], produits: '168', dessin: 'aae8368e5385', photo: 'beaute' },
    { lien: accueil('elec'), titre: 'Électronique', sous: ['Audio', 'TV & vidéo'], produits: '98', dessin: 'dba0f8ad24f9', photo: 'elec' },
    { lien: accueil('marche'), titre: 'Supermarché', sous: ['Épicerie', 'Boissons'], produits: '129', dessin: '6051650401c1', photo: 'marche' },
    // Carrousel à 10 catégories (consigne du porteur) : nombres du catalogue de la démonstration (source-demo, UNIVERS).
    { lien: accueil('homme'), titre: 'Mode homme', sous: ['Chemises', 'Costumes & tenues africaines'], produits: '165', dessin: 'd526d9d3fe62', photo: 'homme' },
    { lien: accueil('chauss'), titre: 'Chaussures', sous: ['Baskets', 'Chaussures de ville'], produits: '145', dessin: 'd904fc29309b', photo: 'chauss' },
    { lien: accueil('bebe'), titre: 'Bébé & enfant', sous: ['Puériculture', 'Jouets'], produits: '90', dessin: 'ada19db4961b', photo: 'bebe' },
    { lien: accueil('sport'), titre: 'Sport & loisirs', sous: ['Fitness', 'Football'], produits: '39', dessin: 'c84f1e9045b6', photo: 'sport' },
  ],
  categories: [
    { lien: '/liste?from=accueil', titre: 'Tout voir', dessin: 'bf4e892644c3' },
    { lien: accueil('tel'), titre: 'Téléphones & tablettes', dessin: 'c8ed74acd931' },
    { lien: accueil('elec'), titre: 'Électronique', dessin: '2b5bcef070f6' },
    { lien: accueil('femme'), titre: 'Mode femme', dessin: 'bf4e892644c3' },
    { lien: accueil('homme'), titre: 'Mode homme', dessin: 'd526d9d3fe62' },
    { lien: accueil('chauss'), titre: 'Chaussures', dessin: 'd904fc29309b' },
    { lien: accueil('beaute'), titre: 'Beauté & santé', dessin: '603cb36e1d48' },
    { lien: accueil('maison'), titre: 'Maison & cuisine', dessin: '6aeead69d8da' },
    { lien: accueil('marche'), titre: 'Supermarché', dessin: '3499c5c0a9f4' },
    { lien: accueil('bebe'), titre: 'Bébé & enfant', dessin: 'ada19db4961b' },
    { lien: accueil('sport'), titre: 'Sport & loisirs', dessin: 'c84f1e9045b6' },
  ],
  flash: { titre: 'Flash Deals', sousTitre: 'Vraie fin · vrai stock' },
  confiance: {
    question: 'Pourquoi choisir',
    marque: 'BelivaY',
    cartes: [
      {
        lien: '/faq?t=paiement&a=1',
        icone: 'shield-check',
        ton: '',
        titre: 'Paiement sécurisé',
        texte: 'Ton argent reste bloqué chez BelivaY jusqu’à ton retrait. MTN MoMo et Orange Money.',
        action: 'En savoir plus',
      },
      {
        lien: '/faq?t=retrait&a=1',
        icone: 'map-pin',
        ton: 'o',
        titre: 'Retrait au relais',
        texte: 'Un relais près de chez toi dans 12 quartiers de Yaoundé. Le tien : Relais Mvog-Ada, à 350 m.',
        action: 'Découvrir',
      },
      {
        lien: '/legal-doc?d=retours',
        icone: 'rotate-ccw',
        ton: '',
        titre: 'Retour gratuit si problème validé',
        texte: 'Article abîmé, faux ou incomplet : tu signales au comptoir ou depuis ta commande, BelivaY tranche.',
        action: 'Notre engagement',
      },
    ],
  },
  fondArrivee: null,
  coordonnees: COORDONNEES,
}
