// frontend/src/features/vendors/v2/compte/index.ts
// Barrel d'export — écrans "Vendre plus" (Trust Score/plans/visibilité) et
// "Mon compte" (paramètres/sécurité/notifications/avis/messagerie/aide) de
// l'espace vendeur v2. Voir chaque fichier pour le détail des règles VD-10/
// VD-11 appliquées.
//
// Routes recommandées (non câblées ici — voir rapport de livraison) :
//   /seller/v2/palier            → MonPalierPage
//   /seller/v2/score             → MonScorePage
//   /seller/v2/paliers           → LesPaliersPage
//   /seller/v2/sanctions         → SanctionsControlePage
//   /seller/v2/sanctions/contester/:id → ContesterDecisionPage
//   /seller/v2/plans             → LesPlansPage
//   /seller/v2/simulateur        → SimulateurPage
//   /seller/v2/se-faire-voir     → SeFaireVoirPage
//   /seller/v2/parametres        → ParametresPage
//   /seller/v2/securite          → SecuriteAppareilsPage
//   /seller/v2/notifications     → NotificationsPage
//   /seller/v2/avis              → AvisDroitReponsePage
//   /seller/v2/messagerie        → MessageriePage
//   /seller/v2/aide              → AidePage

export { default as MonPalierPage } from './trust-score/MonPalierPage';
export { default as MonScorePage } from './trust-score/MonScorePage';
export { default as LesPaliersPage } from './trust-score/LesPaliersPage';

export { default as SanctionsControlePage } from './sanctions/SanctionsControlePage';
export { default as ContesterDecisionPage } from './sanctions/ContesterDecisionPage';

export { default as LesPlansPage } from './plans/LesPlansPage';
export { default as SimulateurPage } from './plans/SimulateurPage';

export { default as SeFaireVoirPage } from './visibilite/SeFaireVoirPage';

export { default as ParametresPage } from './parametres/ParametresPage';
export { default as SecuriteAppareilsPage } from './securite/SecuriteAppareilsPage';
export { default as NotificationsPage } from './notifications/NotificationsPage';
export { default as AvisDroitReponsePage } from './avis/AvisDroitReponsePage';
export { default as MessageriePage } from './messagerie/MessageriePage';
export { default as AidePage } from './aide/AidePage';
