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
    altKey: 'cl6_login_admin.hero_alt',
  },
  navKeys: [
    'cl6_login_admin.nav_dashboard',
    'cl6_login_admin.nav_users',
    'cl6_login_admin.nav_products',
    'cl6_login_admin.nav_orders',
    'cl6_login_admin.nav_stats',
    'cl6_login_admin.nav_help',
  ],
  kickerKey: 'cl6_login_admin.kicker',
  titleKeys: ['cl6_login_admin.title_1', 'cl6_login_admin.title_2', 'cl6_login_admin.title_3'],
  accentFrom: 2,
  introKeys: [
    'cl6_login_admin.intro_1',
    'cl6_login_admin.intro_2',
    'cl6_login_admin.intro_3',
    'cl6_login_admin.intro_4',
  ],
  introMobileKey: 'cl6_login_admin.intro_mobile',
  features: [
    { icon: UserCog, labelKey: 'cl6_login_admin.feature_user_management' },
    { icon: ShieldCheck, labelKey: 'cl6_login_admin.feature_order_tracking' },
    { icon: BarChart3, labelKey: 'cl6_login_admin.feature_advanced_stats' },
    { icon: ShieldAlert, labelKey: 'cl6_login_admin.feature_security_control' },
  ],
  stats: [
    { icon: ShoppingCart, valueKey: 'cl6_login_admin.stat_products_value', labelKey: 'cl6_login_admin.stat_products_label' },
    { icon: Users, valueKey: 'cl6_login_admin.stat_sellers_value', labelKey: 'cl6_login_admin.stat_sellers_label' },
    { icon: UsersRound, valueKey: 'cl6_login_admin.stat_active_clients_value', labelKey: 'cl6_login_admin.stat_active_clients_label' },
    { icon: TrendingUp, valueKey: 'cl6_login_admin.stat_growth_value', labelKey: 'cl6_login_admin.stat_growth_label' },
  ],
  signatureKeys: ['cl6_login_admin.signature_1', 'cl6_login_admin.signature_2'],
  card: {
    titleKey: 'cl6_login_admin.card_title',
    subtitleKey: 'cl6_login_admin.card_subtitle',
    registerHintKey: 'cl6_login_admin.card_register_hint',
  },
};

export default function LoginAdmin() {
  return <PortalLoginShell content={adminLogin} />;
}
