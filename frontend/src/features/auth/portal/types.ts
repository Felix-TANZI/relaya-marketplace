import type { LucideIcon } from 'lucide-react';
import type { PortalRole } from '@/config/portals';

/**
 * Contenu d'un portail de connexion.
 *
 * Un fichier par portail (features/auth/portals/LoginSeller.tsx, ...) decrit
 * uniquement ce qui change : couleurs, copy, icones, photos. Toute la mise en
 * page vit dans PortalLoginShell + PortalLoginCard, partages par les six
 * portails, pour qu'un changement de gabarit n'ait a se faire qu'une fois.
 */
export interface PortalLoginTheme {
  /** Accent plein (bouton, pastilles, liens). */
  accent: string;
  /** Accent fonce : fin du degrade du bouton principal. */
  accentDark: string;
  /** Accent teinte, utilise pour l'anneau de focus des champs. */
  soft: string;
  /** Teinte des voiles poses sur la photo, en RGB brut (« 40, 18, 6 »). */
  veil: string;
  /**
   * Multiplie l'opacite du voile horizontal (defaut 1). A monter quand la
   * photo porte deja du texte (mur, enseigne) sous la colonne de titre.
   */
  veilScale?: number;
}

export interface PortalLoginFeature {
  icon: LucideIcon;
  /** Cle i18n du libelle. */
  labelKey: string;
  /** Cle i18n du sous-titre sous le libelle (maquettes client). */
  hintKey?: string;
}

export interface PortalLoginStat {
  icon: LucideIcon;
  /** Cle i18n de la valeur. */
  valueKey: string;
  /** Cle i18n du libelle. */
  labelKey: string;
}

export interface PortalLoginHero {
  /** Paysage 3:2 — desktop, theme clair puis sombre. */
  day: string;
  night: string;
  /** Portrait 2:3 — mobile, theme clair puis sombre. */
  dayPortrait: string;
  nightPortrait: string;
  /** Cadrage CSS de la photo portrait (object-position), defaut « center 40% ». */
  portraitFocus?: string;
  /** Cle i18n du texte alternatif de la photo. */
  altKey: string;
}

export interface PortalLoginContent {
  role: PortalRole;
  theme: PortalLoginTheme;
  hero: PortalLoginHero;
  /** Cles i18n des liens de la barre superieure (decoratifs : le portail n'est pas encore ouvert). */
  navKeys: string[];
  /** Cle i18n du sur-titre : « Espace vendeur ». */
  kickerKey: string;
  /**
   * Cles i18n du titre en trois lignes. Les `accentFrom` dernieres lignes passent
   * en accent (sur fond sombre) ; en theme clair la derniere ligne seule est
   * accentuee.
   */
  titleKeys: [string, string, string];
  accentFrom: number;
  /** Cles i18n du paragraphe desktop, une entree par ligne (les retours sont voulus). */
  introKeys: string[];
  /** Cle i18n du paragraphe mobile, plus court. */
  introMobileKey: string;
  features: PortalLoginFeature[];
  /** Barre de statistiques en pied de page ; absente sur certaines maquettes. */
  stats?: PortalLoginStat[];
  /** Cle i18n du bouton d'appel a l'action sous le paragraphe (desktop). */
  ctaKey?: string;
  /** Cle i18n de la pastille « S'inscrire » a droite de la barre de navigation. */
  navCtaKey?: string;
  /** Cles i18n de la mention manuscrite en bas a gauche, deux lignes. */
  signatureKeys: [string, string];
  /** Cles i18n de la mention manuscrite a droite de la barre de statistiques (desktop). */
  signatureEndKeys?: [string, string];
  card: {
    titleKey: string;
    subtitleKey: string;
    /** Pied de carte : propose l'inscription, ou rappelle que le compte est fourni. */
    registerPath?: string;
    registerLabelKey?: string;
    registerHintKey?: string;
  };
}
