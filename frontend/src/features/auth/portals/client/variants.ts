import {
  BarChart3, Boxes, Building2, Headset, Package, ShieldCheck, ShoppingBag,
  ShoppingCart, Store, Truck, Users, UsersRound,
} from 'lucide-react';
import type { PortalLoginContent } from '../../portal/types';

/** Trois habillages de la page de connexion client, tires au sort (useLoginVariant). */
export type ClientVariantKey = 'quotidien' | 'opportunites' | 'ecosysteme';

const theme = {
  accent: '#F47C20',
  accentDark: '#EE6C15',
  soft: 'rgba(244,124,32,.22)',
  veil: '30, 16, 6',
};

const base = {
  role: 'client',
  theme,
  card: {
    titleKey: 'cl6_login_client.base_card_title',
    subtitleKey: 'cl6_login_client.base_card_subtitle',
    registerPath: '/register',
    registerLabelKey: 'cl6_login_client.base_card_register_label',
  },
} as const;

export const clientVariants: Record<ClientVariantKey, PortalLoginContent> = {
  // Maquette 1 — polo orange et cartons
  quotidien: {
    ...base,
    hero: {
      day: '/images/auth/client-quotidien-day.png',
      night: '/images/auth/client-quotidien-night.png',
      dayPortrait: '/images/auth/client-quotidien-day-portrait.png',
      nightPortrait: '/images/auth/client-quotidien-night-portrait.png',
      portraitFocus: 'center 42%',
      altKey: 'cl6_login_client.quotidien_hero_alt',
    },
    navKeys: [
      'cl6_login_client.quotidien_nav_home',
      'cl6_login_client.quotidien_nav_products',
      'cl6_login_client.quotidien_nav_sellers',
      'cl6_login_client.quotidien_nav_about',
      'cl6_login_client.quotidien_nav_help',
    ],
    kickerKey: 'cl6_login_client.quotidien_kicker',
    titleKeys: ['cl6_login_client.quotidien_title_1', 'cl6_login_client.quotidien_title_2', 'cl6_login_client.quotidien_title_3'],
    accentFrom: 1,
    introKeys: [
      'cl6_login_client.quotidien_intro_1',
      'cl6_login_client.quotidien_intro_2',
      'cl6_login_client.quotidien_intro_3',
      'cl6_login_client.quotidien_intro_4',
    ],
    introMobileKey: 'cl6_login_client.quotidien_intro_mobile',
    ctaKey: 'cl6_login_client.quotidien_cta',
    features: [
      { icon: Truck, labelKey: 'cl6_login_client.quotidien_feature_delivery_everywhere', hintKey: 'cl6_login_client.quotidien_feature_delivery_everywhere_hint' },
      { icon: ShieldCheck, labelKey: 'cl6_login_client.quotidien_feature_secure_payment', hintKey: 'cl6_login_client.quotidien_feature_secure_payment_hint' },
      { icon: Headset, labelKey: 'cl6_login_client.quotidien_feature_support_247', hintKey: 'cl6_login_client.quotidien_feature_support_247_hint' },
    ],
    signatureKeys: ['cl6_login_client.quotidien_signature_1', 'cl6_login_client.quotidien_signature_2'],
  },

  // Maquette 2 — salon, vue sur la ville
  opportunites: {
    ...base,
    hero: {
      day: '/images/auth/client-opportunites-day.png',
      night: '/images/auth/client-opportunites-night.png',
      dayPortrait: '/images/auth/client-opportunites-day-portrait.png',
      nightPortrait: '/images/auth/client-opportunites-night-portrait.png',
      portraitFocus: 'center 42%',
      altKey: 'cl6_login_client.opportunites_hero_alt',
    },
    navKeys: [
      'cl6_login_client.opportunites_nav_home',
      'cl6_login_client.opportunites_nav_categories',
      'cl6_login_client.opportunites_nav_sellers',
      'cl6_login_client.opportunites_nav_companies',
      'cl6_login_client.opportunites_nav_help',
    ],
    navCtaKey: 'cl6_login_client.opportunites_nav_cta',
    kickerKey: 'cl6_login_client.opportunites_kicker',
    titleKeys: ['cl6_login_client.opportunites_title_1', 'cl6_login_client.opportunites_title_2', 'cl6_login_client.opportunites_title_3'],
    accentFrom: 2,
    introKeys: [
      'cl6_login_client.opportunites_intro_1',
      'cl6_login_client.opportunites_intro_2',
      'cl6_login_client.opportunites_intro_3',
    ],
    introMobileKey: 'cl6_login_client.opportunites_intro_mobile',
    ctaKey: 'cl6_login_client.opportunites_cta',
    features: [
      { icon: Boxes, labelKey: 'cl6_login_client.opportunites_feature_wide_choice', hintKey: 'cl6_login_client.opportunites_feature_wide_choice_hint' },
      { icon: ShieldCheck, labelKey: 'cl6_login_client.opportunites_feature_secure_transactions', hintKey: 'cl6_login_client.opportunites_feature_secure_transactions_hint' },
      { icon: Truck, labelKey: 'cl6_login_client.opportunites_feature_fast_delivery', hintKey: 'cl6_login_client.opportunites_feature_fast_delivery_hint' },
      { icon: Headset, labelKey: 'cl6_login_client.opportunites_feature_support', hintKey: 'cl6_login_client.opportunites_feature_support_hint' },
    ],
    signatureKeys: ['cl6_login_client.opportunites_signature_1', 'cl6_login_client.opportunites_signature_2'],
    card: { ...base.card, titleKey: 'cl6_login_client.opportunites_card_title', subtitleKey: 'cl6_login_client.opportunites_card_subtitle' },
  },

  // Maquette 3 — les quatre acteurs devant Yaoundé
  ecosysteme: {
    ...base,
    hero: {
      day: '/images/auth/client-ecosysteme-day.png',
      night: '/images/auth/client-ecosysteme-night.png',
      dayPortrait: '/images/auth/client-ecosysteme-day-portrait.png',
      nightPortrait: '/images/auth/client-ecosysteme-night-portrait.png',
      portraitFocus: 'center 96%',
      altKey: 'cl6_login_client.ecosysteme_hero_alt',
    },
    navKeys: [
      'cl6_login_client.ecosysteme_nav_home',
      'cl6_login_client.ecosysteme_nav_products',
      'cl6_login_client.ecosysteme_nav_sellers',
      'cl6_login_client.ecosysteme_nav_deliveries',
      'cl6_login_client.ecosysteme_nav_companies',
      'cl6_login_client.ecosysteme_nav_help',
    ],
    kickerKey: 'cl6_login_client.ecosysteme_kicker',
    titleKeys: ['cl6_login_client.ecosysteme_title_1', 'cl6_login_client.ecosysteme_title_2', 'cl6_login_client.ecosysteme_title_3'],
    accentFrom: 2,
    introKeys: ['cl6_login_client.ecosysteme_intro_1', 'cl6_login_client.ecosysteme_intro_2'],
    introMobileKey: 'cl6_login_client.ecosysteme_intro_mobile',
    features: [
      { icon: ShoppingBag, labelKey: 'cl6_login_client.ecosysteme_feature_client', hintKey: 'cl6_login_client.ecosysteme_feature_client_hint' },
      { icon: Store, labelKey: 'cl6_login_client.ecosysteme_feature_seller', hintKey: 'cl6_login_client.ecosysteme_feature_seller_hint' },
      { icon: Package, labelKey: 'cl6_login_client.ecosysteme_feature_courier', hintKey: 'cl6_login_client.ecosysteme_feature_courier_hint' },
      { icon: Building2, labelKey: 'cl6_login_client.ecosysteme_feature_company', hintKey: 'cl6_login_client.ecosysteme_feature_company_hint' },
    ],
    stats: [
      { icon: ShoppingCart, valueKey: 'cl6_login_client.ecosysteme_stat_products_value', labelKey: 'cl6_login_client.ecosysteme_stat_products_label' },
      { icon: Users, valueKey: 'cl6_login_client.ecosysteme_stat_sellers_value', labelKey: 'cl6_login_client.ecosysteme_stat_sellers_label' },
      { icon: UsersRound, valueKey: 'cl6_login_client.ecosysteme_stat_clients_value', labelKey: 'cl6_login_client.ecosysteme_stat_clients_label' },
      { icon: BarChart3, valueKey: 'cl6_login_client.ecosysteme_stat_everywhere_value', labelKey: 'cl6_login_client.ecosysteme_stat_everywhere_label' },
    ],
    signatureKeys: ['cl6_login_client.ecosysteme_signature_1', 'cl6_login_client.ecosysteme_signature_2'],
    card: { ...base.card, titleKey: 'cl6_login_client.ecosysteme_card_title', subtitleKey: 'cl6_login_client.ecosysteme_card_subtitle' },
  },
};
