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
    altKey: 'cl6_login_delivery_org.hero_alt',
  },
  navKeys: [
    'cl6_login_delivery_org.nav_home',
    'cl6_login_delivery_org.nav_fleet',
    'cl6_login_delivery_org.nav_routes',
    'cl6_login_delivery_org.nav_missions',
    'cl6_login_delivery_org.nav_settlements',
    'cl6_login_delivery_org.nav_help',
  ],
  kickerKey: 'cl6_login_delivery_org.kicker',
  titleKeys: ['cl6_login_delivery_org.title_1', 'cl6_login_delivery_org.title_2', 'cl6_login_delivery_org.title_3'],
  accentFrom: 1,
  introKeys: [
    'cl6_login_delivery_org.intro_1',
    'cl6_login_delivery_org.intro_2',
    'cl6_login_delivery_org.intro_3',
  ],
  introMobileKey: 'cl6_login_delivery_org.intro_mobile',
  features: [
    { icon: Users, labelKey: 'cl6_login_delivery_org.feature_courier_management' },
    { icon: Route, labelKey: 'cl6_login_delivery_org.feature_routes_missions' },
    { icon: Wallet, labelKey: 'cl6_login_delivery_org.feature_settlements_tracked' },
    { icon: Headset, labelKey: 'cl6_login_delivery_org.feature_partner_support' },
  ],
  stats: [
    { icon: Truck, valueKey: 'cl6_login_delivery_org.stat_fleet_value', labelKey: 'cl6_login_delivery_org.stat_fleet_label' },
    { icon: Route, valueKey: 'cl6_login_delivery_org.stat_missions_value', labelKey: 'cl6_login_delivery_org.stat_missions_label' },
    { icon: Wallet, valueKey: 'cl6_login_delivery_org.stat_settlements_value', labelKey: 'cl6_login_delivery_org.stat_settlements_label' },
    { icon: ShieldCheck, valueKey: 'cl6_login_delivery_org.stat_partnership_value', labelKey: 'cl6_login_delivery_org.stat_partnership_label' },
  ],
  signatureKeys: ['cl6_login_delivery_org.signature_1', 'cl6_login_delivery_org.signature_2'],
  card: {
    titleKey: 'cl6_login_delivery_org.card_title',
    subtitleKey: 'cl6_login_delivery_org.card_subtitle',
    registerHintKey: 'cl6_login_delivery_org.card_register_hint',
  },
};

export default function LoginDeliveryOrganization() {
  return <PortalLoginShell content={deliveryOrganizationLogin} />;
}
