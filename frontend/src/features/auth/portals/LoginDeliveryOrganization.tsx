import { Headset, Route, ShieldCheck, Truck, Users, Wallet } from 'lucide-react';
import PortalLoginShell from '../portal/PortalLoginShell';
import type { PortalLoginContent } from '../portal/types';

/**
 * Portail de connexion entreprise de livraison.
 *
 * Reprend le visuel et l'accent vert du portail livreur : c'est le meme metier
 * vu d'un cran plus haut, et les deux portails partagent la meme photo. Seule
 * la copy change — on s'adresse ici a l'ENTREPRISE partenaire, qui pilote une
 * flotte de livreurs, pas au livreur qui roule.
 *
 * Comme le livreur, pas de lien d'inscription : le compte est ouvert par
 * BelivaY a la signature du contrat de partenariat.
 */
const deliveryOrganizationLogin: PortalLoginContent = {
  role: 'delivery_organization',
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
    alt: 'Livreur partenaire BelivaY en tournee',
  },
  nav: ['Accueil', 'Flotte', 'Tournées', 'Missions', 'Règlements', 'Aide'],
  kicker: 'Espace entreprise de livraison',
  title: ['Pilotez votre flotte,', 'livrez plus', 'chaque jour.'],
  accentFrom: 1,
  intro: [
    'Gérez vos livreurs, suivez vos tournées',
    'et recevez vos règlements en toute',
    'transparence, mission après mission.',
  ],
  introMobile: 'Gérez vos livreurs, suivez vos tournées et vos règlements.',
  features: [
    { icon: Users, label: 'Gestion des livreurs' },
    { icon: Route, label: 'Tournées et missions' },
    { icon: Wallet, label: 'Règlements suivis' },
    { icon: Headset, label: 'Support partenaire' },
  ],
  stats: [
    { icon: Truck, value: 'Flotte', label: 'pilotée' },
    { icon: Route, value: 'Missions', label: 'attribuées' },
    { icon: Wallet, value: 'Règlements', label: 'transparents' },
    { icon: ShieldCheck, value: 'Partenariat', label: 'contractuel' },
  ],
  signature: ['Votre flotte,', 'notre réseau.'],
  card: {
    title: 'Connexion Entreprise',
    subtitle: 'Accédez à votre espace entreprise de livraison',
    registerHint: 'Compte ouvert par BelivaY à la signature du contrat de partenariat.',
  },
};

export default function LoginDeliveryOrganization() {
  return <PortalLoginShell content={deliveryOrganizationLogin} />;
}
