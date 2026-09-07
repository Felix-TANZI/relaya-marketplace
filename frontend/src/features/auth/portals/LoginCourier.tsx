import { Headset, MapPin, Package, Route, ShieldCheck, Wallet } from 'lucide-react';
import PortalLoginShell from '../portal/PortalLoginShell';
import type { PortalLoginContent } from '../portal/types';

/**
 * Portail de connexion livreur.
 *
 * Accents verts de `portalCopy.courier` (#16A34A). Comme pour l'admin, pas de
 * lien d'inscription : le compte livreur est cree par son organisation de
 * livraison, d'ou `registerHint`.
 *
 * `portraitFocus` remonte le cadrage de la photo mobile : le livreur est dans
 * le tiers bas du visuel, un cadrage centre le masquerait derriere la carte.
 */
const courierLogin: PortalLoginContent = {
  role: 'courier',
  theme: {
    accent: '#16A34A',
    accentDark: '#15803D',
    soft: 'rgba(22,163,74,.22)',
    veil: '6, 16, 10',
  },
  hero: {
    day: '/images/auth/courier-hero-day.png',
    night: '/images/auth/courier-hero-night.png',
    dayPortrait: '/images/auth/courier-hero-day-portrait.png',
    nightPortrait: '/images/auth/courier-hero-night-portrait.png',
    portraitFocus: 'center 70%',
    alt: 'Livreur BelivaY consultant sa tournee',
  },
  nav: ['Accueil', 'Livraisons', 'Tournées', 'Gains', 'Support', 'Aide'],
  kicker: 'Espace livraison',
  title: ["Livrez aujourd'hui,", 'construisez', 'demain.'],
  accentFrom: 1,
  intro: [
    'Rejoignez notre réseau de livreurs',
    'et participez à une logistique plus rapide,',
    'plus fiable et plus proche des clients.',
  ],
  introMobile: 'Rejoignez notre réseau de livreurs et gagnez plus.',
  features: [
    { icon: Route, label: 'Tournées optimisées' },
    { icon: MapPin, label: 'Suivi en temps réel' },
    { icon: Wallet, label: 'Gains transparents' },
    { icon: Headset, label: 'Support 24/7' },
  ],
  stats: [
    { icon: Package, value: 'Livraisons', label: 'quotidiennes' },
    { icon: Route, value: 'Tournées', label: 'optimisées' },
    { icon: Wallet, value: 'Gains', label: 'attractifs' },
    { icon: ShieldCheck, value: 'Une logistique', label: 'plus fiable' },
  ],
  signature: ["Plus qu'une livraison,", 'une confiance.'],
  card: {
    title: 'Connexion Livreur',
    subtitle: 'Accédez à votre espace livraison',
    registerHint: 'Compte fourni par votre organisation de livraison.',
  },
};

export default function LoginCourier() {
  return <PortalLoginShell content={courierLogin} />;
}
