// frontend/src/features/vendors/v2/ouverture/index.ts
// Barrel — VD-03 (Accès et ouverture de la boutique). Chemins de route
// recommandés (non câblés ici, voir router.tsx) :
//   /vendeur/connexion              → ConnexionPage            (public)
//   /vendeur/ouvrir-boutique        → OuvrirBoutiquePage       (public, étape 1/3)
//   /vendeur/publier-et-etre-paye   → PublierEtEtrePayePage    (ProtectedRoute, étapes 2-3)
//   /seller/v2/saisie-assistee      → SaisieAssisteePage       (déjà lié depuis MenuPage.tsx)
//   /seller/v2/installer            → InstallerApplicationPage (déjà lié depuis MenuPage.tsx)

export { default as ConnexionPage } from './ConnexionPage';
export { default as OuvrirBoutiquePage } from './OuvrirBoutiquePage';
export { default as PublierEtEtrePayePage } from './PublierEtEtrePayePage';
export { default as SaisieAssisteePage } from './SaisieAssisteePage';
export { default as InstallerApplicationPage } from './InstallerApplicationPage';

export { default as SellerPromise } from './SellerPromise';
export { default as OnboardingSteps } from './OnboardingSteps';
