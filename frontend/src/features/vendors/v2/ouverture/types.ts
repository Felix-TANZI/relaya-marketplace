// frontend/src/features/vendors/v2/ouverture/types.ts
// Types partagés par les écrans VD-03 (Accès et ouverture de la boutique) :
// Connexion, Ouvrir ma boutique (1/3), Publier et être payé (2-3), Saisie
// assistée, Installer l'application. Voir
// espace_vendeur_synthese_detail/batch4_VD03-05.md §1.

/** Les trois étapes de l'onboarding (composant OnboardingSteps(cur), VD-D04.A07). */
export type OnboardingStepKey = 'open' | 'publish' | 'paid';

/** Brouillon de boutique saisi à l'étape 1/3 (OUV-01 : rien d'autre que ces 3 champs). */
export interface ShopDraft {
  /** Nom de boutique interne — jamais montré au client (OUV-02). */
  businessName: string;
  /** Numéro E.164, vérifié par code SMS avant de continuer. */
  phone: string;
  lat: number | null;
  lng: number | null;
  /**
   * Libellé de zone/quartier. La zone officielle est calculée côté serveur
   * (OUV-01, ex. "Z4 · Mvog-Mbi/Mvog-Ada") via un futur POST /shops — en son
   * absence, on affiche ici un repère de quartier obtenu par géocodage
   * inverse public (Nominatim), présenté comme un aperçu et non comme la
   * zone officielle (voir api.ts:previewZoneLabel).
   */
  zoneLabel: string | null;
}

/** Les quatre pièces attendues à l'étape 2 (KYC-01). */
export type KycItemKey = 'id_front' | 'id_back' | 'selfie' | 'payout';

export interface KycItemState {
  key: KycItemKey;
  done: boolean;
  /** Nom de fichier ou aperçu local (aucun envoi binaire réel — voir api.ts). */
  preview?: string;
}

export type ContractDiscoveryOffer = {
  extraPoints: number;
  months: number;
  orders: number;
};

/** Les trois groupes de l'écran Saisie assistée (SAI-02/04). */
export type AssistedEntryGroup = 'ready' | 'to_check' | 'duplicate';

export interface AssistedEntryProduct {
  id: number;
  title: string;
  imageUrl: string | null;
  priceXaf: number;
  stock: number;
  group: AssistedEntryGroup;
  /** Nombre de contrôles réussis sur 4 (photo, doublon, prix, description) — SAI-02. */
  checksPassed: number;
  /** Raison affichée dans l'encadré ambre pour "à vérifier" (ex. prix 38 % sous le marché). */
  reasonLabel?: string;
  /** Référence de la fiche existante pour un doublon. */
  existingProductRef?: string;
}

export interface AssistedEntryBatch {
  agentName: string;
  zoneLabel: string;
  visitedAt: string;
  products: AssistedEntryProduct[];
}

/** Plateforme cible de l'écran "Installer l'application" (INS-01). */
export type InstallPlatform = 'iphone' | 'android';
