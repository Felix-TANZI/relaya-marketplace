// frontend/src/features/vendors/v2/comingSoonScreens.ts
// Registre des écrans v2 pas encore construits (lots 2 à 10 du plan de
// construction). Une seule source pour le Menu (VD-11) et la route
// /seller/v2/:screen — évite de dupliquer les libellés entre les deux.

export type ComingSoonScreen =
  | 'notifications' | 'messagerie' | 'aide'
  | 'saisie-assistee'
  | 'horaires' | 'emplacement' | 'equipe' | 'avis'
  | 'securite' | 'installer';

export const COMING_SOON_TITLE_KEYS: Record<ComingSoonScreen, string> = {
  notifications: 'sl5_fondations.screen_notifications',
  messagerie: 'sl5_fondations.screen_messaging',
  aide: 'sl5_fondations.screen_help',
  'saisie-assistee': 'sl5_fondations.screen_assisted_entry',
  horaires: 'sl5_fondations.screen_hours',
  emplacement: 'sl5_fondations.screen_location',
  equipe: 'sl5_fondations.screen_team',
  avis: 'sl5_fondations.screen_reviews',
  securite: 'sl5_fondations.screen_security',
  installer: 'sl5_fondations.screen_install',
};
