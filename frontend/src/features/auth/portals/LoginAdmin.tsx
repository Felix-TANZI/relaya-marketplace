import { BarChart3, ShieldAlert, ShieldCheck, ShoppingCart, TrendingUp, UserCog, Users, UsersRound } from 'lucide-react';
import PortalLoginShell from '../portal/PortalLoginShell';
import type { PortalLoginContent } from '../portal/types';

/**
 * Portail de connexion administrateur (console interne).
 *
 * Meme gabarit que les autres portails ; deux differences voulues :
 * - aucun lien d'inscription (les comptes staff sont crees en interne), d'ou
 *   `registerHint` au lieu de `registerPath` ;
 * - accents rouges de `portalCopy.admin` (#DC2626 / #991B1B).
 */
const adminLogin: PortalLoginContent = {
  role: 'admin',
  theme: {
    accent: '#DC2626',
    accentDark: '#991B1B',
    soft: 'rgba(220,38,38,.22)',
    veil: '20, 8, 8',
  },
  hero: {
    day: '/images/auth/admin-hero-day.png',
    night: '/images/auth/admin-hero-night.png',
    dayPortrait: '/images/auth/admin-hero-day-portrait.png',
    nightPortrait: '/images/auth/admin-hero-night-portrait.png',
    alt: 'Administrateur BelivaY devant son tableau de bord',
  },
  nav: ['Tableau de bord', 'Utilisateurs', 'Produits', 'Commandes', 'Statistiques', 'Aide'],
  kicker: 'Espace admin',
  title: ["Pilotez aujourd'hui", 'la croissance', 'de BelivaY.'],
  accentFrom: 2,
  intro: [
    'Gérez les utilisateurs, suivez les',
    'commandes, analysez les performances.',
    'Construisons ensemble un e-commerce',
    "plus fort pour l'Afrique.",
  ],
  introMobile: 'Gérez les utilisateurs, suivez les commandes et analysez les performances.',
  features: [
    { icon: UserCog, label: 'Gestion utilisateurs' },
    { icon: ShieldCheck, label: 'Suivi des commandes' },
    { icon: BarChart3, label: 'Statistiques avancées' },
    { icon: ShieldAlert, label: 'Sécurité & contrôle' },
  ],
  stats: [
    { icon: ShoppingCart, value: '+ 50 000', label: 'produits' },
    { icon: Users, value: '+ 10 000', label: 'vendeurs' },
    { icon: UsersRound, value: '+ 100 000', label: 'clients actifs' },
    { icon: TrendingUp, value: 'Croissance', label: 'continue' },
  ],
  signature: ['Une plateforme,', 'des opportunités infinies.'],
  card: {
    title: 'Connexion Admin',
    subtitle: 'Accédez à votre espace administrateur',
    registerHint: 'Accès staff uniquement — toute tentative est journalisée.',
  },
};

export default function LoginAdmin() {
  return <PortalLoginShell content={adminLogin} />;
}
