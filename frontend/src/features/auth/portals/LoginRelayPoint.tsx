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
    altKey: 'cl6_login_relay.hero_alt',
  },
  navKeys: [
    'cl6_login_relay.nav_home',
    'cl6_login_relay.nav_receptions',
    'cl6_login_relay.nav_shipments',
    'cl6_login_relay.nav_parcels',
    'cl6_login_relay.nav_support',
    'cl6_login_relay.nav_help',
  ],
  kickerKey: 'cl6_login_relay.kicker',
  titleKeys: ['cl6_login_relay.title_1', 'cl6_login_relay.title_2', 'cl6_login_relay.title_3'],
  accentFrom: 1,
  introKeys: [
    'cl6_login_relay.intro_1',
    'cl6_login_relay.intro_2',
    'cl6_login_relay.intro_3',
  ],
  introMobileKey: 'cl6_login_relay.intro_mobile',
  features: [
    { icon: PackageCheck, labelKey: 'cl6_login_relay.feature_parcel_reception' },
    { icon: Send, labelKey: 'cl6_login_relay.feature_easy_shipping' },
    { icon: MapPin, labelKey: 'cl6_login_relay.feature_realtime_tracking' },
    { icon: Headset, labelKey: 'cl6_login_relay.feature_dedicated_support' },
  ],
  stats: [
    { icon: MapPin, valueKey: 'cl6_login_relay.stat_network_value', labelKey: 'cl6_login_relay.stat_network_label' },
    { icon: Boxes, valueKey: 'cl6_login_relay.stat_parcel_mgmt_value', labelKey: 'cl6_login_relay.stat_parcel_mgmt_label' },
    { icon: ShieldCheck, valueKey: 'cl6_login_relay.stat_service_value', labelKey: 'cl6_login_relay.stat_service_label' },
    { icon: Users, valueKey: 'cl6_login_relay.stat_satisfaction_value', labelKey: 'cl6_login_relay.stat_satisfaction_label' },
  ],
  signatureKeys: ['cl6_login_relay.signature_1', 'cl6_login_relay.signature_2'],
  signatureEndKeys: ['cl6_login_relay.signature_end_1', 'cl6_login_relay.signature_end_2'],
  card: {
    titleKey: 'cl6_login_relay.card_title',
    subtitleKey: 'cl6_login_relay.card_subtitle',
    registerHintKey: 'cl6_login_relay.card_register_hint',
  },
};

export default function LoginRelayPoint() {
  return <PortalLoginShell content={relayPointLogin} />;
}
