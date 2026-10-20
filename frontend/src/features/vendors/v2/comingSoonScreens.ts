// frontend/src/features/vendors/v2/comingSoonScreens.ts
// Registre des écrans v2 pas encore construits (lots 2 à 10 du plan de
// construction). Une seule source pour le Menu (VD-11) et la route
// /seller/v2/:screen — évite de dupliquer les libellés entre les deux.

// horaires/emplacement/equipe construits le 04/10 (routes explicites dans
// router.tsx) — retirés d'ici. Les autres clés restantes ont elles aussi
// probablement déjà une route explicite (confirmé pour aide/avis/securite
// lors d'un audit visuel) ; non vérifié ici pour chacune, laissées en l'état.
export type ComingSoonScreen =
  | 'notifications' | 'messagerie' | 'aide'
  | 'saisie-assistee'
  | 'avis'
  | 'securite' | 'installer';

export const COMING_SOON_TITLE_KEYS: Record<ComingSoonScreen, string> = {
  notifications: 'sl5_fondations.screen_notifications',
  messagerie: 'sl5_fondations.screen_messaging',
  aide: 'sl5_fondations.screen_help',
  'saisie-assistee': 'sl5_fondations.screen_assisted_entry',
  avis: 'sl5_fondations.screen_reviews',
  securite: 'sl5_fondations.screen_security',
  installer: 'sl5_fondations.screen_install',
};
