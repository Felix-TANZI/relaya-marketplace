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
    altKey: 'cl6_login_seller.hero_alt',
  },
  navKeys: [
    'cl6_login_seller.nav_home',
    'cl6_login_seller.nav_products',
    'cl6_login_seller.nav_orders',
    'cl6_login_seller.nav_payments',
    'cl6_login_seller.nav_shop',
    'cl6_login_seller.nav_help',
  ],
  kickerKey: 'cl6_login_seller.kicker',
  titleKeys: ['cl6_login_seller.title_1', 'cl6_login_seller.title_2', 'cl6_login_seller.title_3'],
  accentFrom: 2,
  introKeys: [
    'cl6_login_seller.intro_1',
    'cl6_login_seller.intro_2',
    'cl6_login_seller.intro_3',
  ],
  introMobileKey: 'cl6_login_seller.intro_mobile',
  features: [
    { icon: Store, labelKey: 'cl6_login_seller.feature_shop_management' },
    { icon: PackagePlus, labelKey: 'cl6_login_seller.feature_add_products' },
    { icon: BarChart3, labelKey: 'cl6_login_seller.feature_sales_tracking' },
    { icon: ShieldCheck, labelKey: 'cl6_login_seller.feature_secure_payments' },
  ],
  stats: [
    { icon: ShoppingCart, valueKey: 'cl6_login_seller.stat_active_sellers_value', labelKey: 'cl6_login_seller.stat_active_sellers_label' },
    { icon: Users, valueKey: 'cl6_login_seller.stat_products_online_value', labelKey: 'cl6_login_seller.stat_products_online_label' },
    { icon: ShieldCheck, valueKey: 'cl6_login_seller.stat_transactions_value', labelKey: 'cl6_login_seller.stat_transactions_label' },
    { icon: Headset, valueKey: 'cl6_login_seller.stat_support_value', labelKey: 'cl6_login_seller.stat_support_label' },
  ],
  signatureKeys: ['cl6_login_seller.signature_1', 'cl6_login_seller.signature_2'],
  signatureEndKeys: ['cl6_login_seller.signature_end_1', 'cl6_login_seller.signature_end_2'],
  card: {
    titleKey: 'cl6_login_seller.card_title',
    subtitleKey: 'cl6_login_seller.card_subtitle',
    registerPath: '/register',
    registerLabelKey: 'cl6_login_seller.register_label',
  },
};

export default function LoginSeller() {
  return <PortalLoginShell content={sellerLogin} />;
}
