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
    altKey: 'cl6_login_courier.hero_alt',
  },
  navKeys: [
    'cl6_login_courier.nav_home',
    'cl6_login_courier.nav_deliveries',
    'cl6_login_courier.nav_routes',
    'cl6_login_courier.nav_earnings',
    'cl6_login_courier.nav_support',
    'cl6_login_courier.nav_help',
  ],
  kickerKey: 'cl6_login_courier.kicker',
  titleKeys: ['cl6_login_courier.title_1', 'cl6_login_courier.title_2', 'cl6_login_courier.title_3'],
  accentFrom: 1,
  introKeys: [
    'cl6_login_courier.intro_1',
    'cl6_login_courier.intro_2',
    'cl6_login_courier.intro_3',
  ],
  introMobileKey: 'cl6_login_courier.intro_mobile',
  features: [
    { icon: Route, labelKey: 'cl6_login_courier.feature_optimized_routes' },
    { icon: MapPin, labelKey: 'cl6_login_courier.feature_realtime_tracking' },
    { icon: Wallet, labelKey: 'cl6_login_courier.feature_transparent_earnings' },
    { icon: Headset, labelKey: 'cl6_login_courier.feature_support_247' },
  ],
  stats: [
    { icon: Package, valueKey: 'cl6_login_courier.stat_deliveries_value', labelKey: 'cl6_login_courier.stat_deliveries_label' },
    { icon: Route, valueKey: 'cl6_login_courier.stat_routes_value', labelKey: 'cl6_login_courier.stat_routes_label' },
    { icon: Wallet, valueKey: 'cl6_login_courier.stat_earnings_value', labelKey: 'cl6_login_courier.stat_earnings_label' },
    { icon: ShieldCheck, valueKey: 'cl6_login_courier.stat_reliability_value', labelKey: 'cl6_login_courier.stat_reliability_label' },
  ],
  signatureKeys: ['cl6_login_courier.signature_1', 'cl6_login_courier.signature_2'],
  card: {
    titleKey: 'cl6_login_courier.card_title',
    subtitleKey: 'cl6_login_courier.card_subtitle',
    registerHintKey: 'cl6_login_courier.card_register_hint',
  },
};

export default function LoginCourier() {
  return <PortalLoginShell content={courierLogin} />;
}
