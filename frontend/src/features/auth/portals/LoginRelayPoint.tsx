import { Boxes, Headset, MapPin, PackageCheck, Send, ShieldCheck, Users } from 'lucide-react';
import PortalLoginShell from '../portal/PortalLoginShell';
import type { PortalLoginContent } from '../portal/types';

/**
 * Portail de connexion point relais.
 *
 * `portalCopy.relay_point` porte le bleu marine #1E3A8A ; la maquette utilise
 * le bleu plus vif #2563EB, repris ici (le marine reste la couleur du portail
 * une fois connecte).
 *
 * `veilScale` densifie le voile de gauche : la photo du comptoir porte deja son
 * enseigne murale « BelivaY POINT RELAIS » et sa propre accroche, qui
 * concurrenceraient le titre de la page.
 */
const relayPointLogin: PortalLoginContent = {
  role: 'relay_point',
  theme: {
    accent: '#2563EB',
    accentDark: '#1D4ED8',
    soft: 'rgba(37,99,235,.22)',
    veil: '6, 13, 30',
    veilScale: 1.1,
  },
  hero: {
    day: '/images/auth/relay-point-hero-day.png',
    night: '/images/auth/relay-point-hero-night.png',
    dayPortrait: '/images/auth/relay-point-hero-day-portrait.png',
    nightPortrait: '/images/auth/relay-point-hero-night-portrait.png',
    portraitFocus: 'center 44%',
    alt: 'Point relais BelivaY scannant un colis au comptoir',
  },
  nav: ['Accueil', 'Réceptions', 'Expéditions', 'Colis', 'Support', 'Aide'],
  kicker: 'Espace point relais',
  title: ['Un point relais', 'plus proche', 'de vos clients.'],
  accentFrom: 1,
  intro: [
    'Réceptionnez, expédiez et facilitez',
    'la vie de vos clients. Ensemble,',
    'rendons la logistique plus simple.',
  ],
  introMobile: 'Réceptionnez, expédiez et facilitez la vie de vos clients.',
  features: [
    { icon: PackageCheck, label: 'Réception de colis' },
    { icon: Send, label: 'Expédition facile' },
    { icon: MapPin, label: 'Suivi en temps réel' },
    { icon: Headset, label: 'Support dédié' },
  ],
  stats: [
    { icon: MapPin, value: 'Réseau', label: 'de proximité' },
    { icon: Boxes, value: 'Gestion de', label: 'colis simplifiée' },
    { icon: ShieldCheck, value: 'Service', label: 'fiable' },
    { icon: Users, value: 'Satisfaction', label: 'clients' },
  ],
  signature: ['Au cœur', 'de votre quartier.'],
  signatureEnd: ['Plus proche de vous,', 'partout.'],
  card: {
    title: 'Connexion Point Relais',
    subtitle: 'Accédez à votre espace point relais',
    registerHint: 'Compte fourni par BelivaY après agrément du point.',
  },
};

export default function LoginRelayPoint() {
  return <PortalLoginShell content={relayPointLogin} />;
}
