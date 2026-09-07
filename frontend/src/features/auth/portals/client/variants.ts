import {
  BarChart3, Boxes, Building2, Headset, Package, ShieldCheck, ShoppingBag,
  ShoppingCart, Store, Truck, Users, UsersRound,
} from 'lucide-react';
import type { PortalLoginContent } from '../../portal/types';

/** Trois habillages de la page de connexion client, tires au sort (useLoginVariant). */
export type ClientVariantKey = 'quotidien' | 'opportunites' | 'ecosysteme';

const theme = {
  accent: '#F47C20',
  accentDark: '#EE6C15',
  soft: 'rgba(244,124,32,.22)',
  veil: '30, 16, 6',
};

const base = {
  role: 'client',
  theme,
  card: {
    title: 'Bienvenue !',
    subtitle: 'Connectez-vous à votre compte',
    registerPath: '/register',
    registerLabel: "S'inscrire",
  },
} as const;

export const clientVariants: Record<ClientVariantKey, PortalLoginContent> = {
  // Maquette 1 — polo orange et cartons
  quotidien: {
    ...base,
    hero: {
      day: '/images/auth/client-quotidien-day.png',
      night: '/images/auth/client-quotidien-night.png',
      dayPortrait: '/images/auth/client-quotidien-day-portrait.png',
      nightPortrait: '/images/auth/client-quotidien-night-portrait.png',
      portraitFocus: 'center 42%',
      alt: 'Colis et polo BelivaY',
    },
    nav: ['Accueil', 'Produits', 'Vendeurs', 'À propos', 'Aide'],
    kicker: 'Achetez · vendez · faites livrer',
    title: ['Tout ce dont', 'vous avez besoin,', 'plus proche de vous.'],
    accentFrom: 1,
    intro: [
      'Des milliers de produits.',
      'Des vendeurs locaux.',
      'Une livraison fiable partout',
      'au Cameroun et en Afrique.',
    ],
    introMobile: 'Des milliers de produits. Une expérience simple et sécurisée.',
    cta: 'Découvrir la marketplace',
    features: [
      { icon: Truck, label: 'Livraison partout', hint: 'À domicile ou en point relais' },
      { icon: ShieldCheck, label: 'Paiement sécurisé', hint: 'Vos transactions protégées' },
      { icon: Headset, label: 'Support 24/7', hint: 'Une équipe à votre écoute' },
    ],
    signature: ['Le Cameroun', 'plus connecté.'],
  },

  // Maquette 2 — salon, vue sur la ville
  opportunites: {
    ...base,
    hero: {
      day: '/images/auth/client-opportunites-day.png',
      night: '/images/auth/client-opportunites-night.png',
      dayPortrait: '/images/auth/client-opportunites-day-portrait.png',
      nightPortrait: '/images/auth/client-opportunites-night-portrait.png',
      portraitFocus: 'center 42%',
      alt: 'Cliente BelivaY et ses colis',
    },
    nav: ['Accueil', 'Catégories', 'Vendeurs', 'Entreprises', 'Aide'],
    navCta: "S'inscrire",
    kicker: "Une marketplace autrement, pour l'Afrique",
    title: ['Des produits', 'du quotidien,', 'aux grandes opportunités.'],
    accentFrom: 2,
    intro: [
      'Mode, Maison, High-Tech, Beauté, Santé,',
      'Sports, et bien plus encore.',
      'Tout sur une seule plateforme.',
    ],
    introMobile: 'Mode, maison, high-tech, beauté, santé, sports et bien plus encore.',
    cta: 'Explorer nos catégories',
    features: [
      { icon: Boxes, label: 'Large choix de produits', hint: 'Mode, maison, high-tech, beauté' },
      { icon: ShieldCheck, label: 'Transactions sécurisées', hint: 'Paiement protégé de bout en bout' },
      { icon: Truck, label: 'Livraison rapide et fiable', hint: 'Partout au Cameroun et en Afrique' },
      { icon: Headset, label: 'Soutien 24/7', hint: 'Une équipe à votre écoute' },
    ],
    signature: ["Tout ce qu'il vous faut,", 'livré chez vous.'],
    card: { ...base.card, title: 'Connexion', subtitle: 'Accédez à votre espace BelivaY' },
  },

  // Maquette 3 — les quatre acteurs devant Yaoundé
  ecosysteme: {
    ...base,
    hero: {
      day: '/images/auth/client-ecosysteme-day.png',
      night: '/images/auth/client-ecosysteme-night.png',
      dayPortrait: '/images/auth/client-ecosysteme-day-portrait.png',
      nightPortrait: '/images/auth/client-ecosysteme-night-portrait.png',
      portraitFocus: 'center 96%',
      alt: 'Client, vendeur, livreur et entreprise BelivaY',
    },
    nav: ['Accueil', 'Produits', 'Vendeurs', 'Livraisons', 'Entreprises', 'Aide'],
    kicker: 'Un écosystème, une même vision',
    title: ['Le e-commerce', 'au service du', 'Cameroun.'],
    accentFrom: 2,
    intro: ['Achetez. Vendez. Expédiez. Livrez.', 'Ensemble, plus loin.'],
    introMobile: 'Achetez. Vendez. Expédiez. Livrez. Ensemble, plus loin.',
    features: [
      { icon: ShoppingBag, label: 'Client', hint: "J'achète en toute simplicité" },
      { icon: Store, label: 'Vendeur', hint: 'Je développe mon activité' },
      { icon: Package, label: 'Livreur', hint: 'Je livre, je gagne' },
      { icon: Building2, label: 'Entreprise', hint: 'Je simplifie ma logistique' },
    ],
    stats: [
      { icon: ShoppingCart, value: '+ 50 000', label: 'produits' },
      { icon: Users, value: '+ 10 000', label: 'vendeurs' },
      { icon: UsersRound, value: '+ 100 000', label: 'clients satisfaits' },
      { icon: BarChart3, value: 'Partout au Cameroun', label: 'et en Afrique' },
    ],
    signature: ['Notre pays,', 'nos opportunités.'],
    card: { ...base.card, title: 'Connexion', subtitle: 'Accédez à votre compte' },
  },
};
