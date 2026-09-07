import { BarChart3, Headset, PackagePlus, ShieldCheck, ShoppingCart, Store, Users } from 'lucide-react';
import PortalLoginShell from '../portal/PortalLoginShell';
import type { PortalLoginContent } from '../portal/types';

/**
 * Portail de connexion vendeur.
 *
 * Ce fichier ne porte que le contenu : couleurs, copy, icones, photos. La mise
 * en page et le flux d'authentification vivent dans portal/PortalLoginShell et
 * portal/usePortalLogin, partages avec les cinq autres portails.
 *
 * Accents alignes sur `portalCopy.seller` de config/portals (#EA580C / #9A3412),
 * ici dans la version orange de la maquette (#F47C20).
 */
const sellerLogin: PortalLoginContent = {
  role: 'seller',
  theme: {
    accent: '#F47C20',
    accentDark: '#EE6C15',
    soft: 'rgba(244,124,32,.22)',
    veil: '36, 15, 4',
  },
  hero: {
    day: '/images/auth/seller-hero-day.png',
    night: '/images/auth/seller-hero-night.png',
    dayPortrait: '/images/auth/seller-hero-day-portrait.png',
    nightPortrait: '/images/auth/seller-hero-night-portrait.png',
    alt: 'Vendeuse BelivaY préparant ses commandes',
  },
  nav: ['Accueil', 'Produits', 'Commandes', 'Paiements', 'Boutique', 'Aide'],
  kicker: 'Espace vendeur',
  title: ['Vendez plus,', 'développez', 'votre activité.'],
  accentFrom: 2,
  intro: [
    'Rejoignez une communauté de vendeurs',
    'et touchez des milliers de clients',
    'au Cameroun et en Afrique.',
  ],
  introMobile: "Rejoignez une communauté d'acheteurs et développez votre activité.",
  features: [
    { icon: Store, label: 'Gestion de boutique' },
    { icon: PackagePlus, label: 'Ajout de produits' },
    { icon: BarChart3, label: 'Suivi des ventes' },
    { icon: ShieldCheck, label: 'Paiements sécurisés' },
  ],
  stats: [
    { icon: ShoppingCart, value: '+ 10 000', label: 'vendeurs actifs' },
    { icon: Users, value: '+ 50 000', label: 'produits en ligne' },
    { icon: ShieldCheck, value: 'Transactions', label: 'sécurisées' },
    { icon: Headset, value: 'Support', label: 'dédié' },
  ],
  signature: ['Votre talent,', 'notre plateforme.'],
  signatureEnd: ["Vendez aujourd'hui,", 'grandissez demain.'],
  card: {
    title: 'Connexion Vendeur',
    subtitle: 'Accédez à votre espace vendeur',
    registerPath: '/register',
    registerLabel: "S'inscrire",
  },
};

export default function LoginSeller() {
  return <PortalLoginShell content={sellerLogin} />;
}
