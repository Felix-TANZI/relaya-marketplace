// frontend/src/features/vendors/v2/catalogue/index.ts
// Barrel — écrans "Mes produits" / "Une offre" / "Nouvelle offre" (VD-08).
// Routes recommandées (non câblées dans router.tsx, hors périmètre de ce lot) :
//   /seller/v2/produits                    → MesProduitsPage
//   /seller/v2/produits/:id                → UneOffrePage
//   /seller/v2/produits/nouveau            → NouvelleOffreWizardPage (4 étapes
//                                             + "Demander une fiche" + "Offre
//                                             envoyée" gérées en interne)
//   /seller/v2/produits/dupliquer/:id      → DupliquerProduitPage

export { default as MesProduitsPage } from './MesProduitsPage';
export { default as UneOffrePage } from './UneOffrePage';
export { default as NouvelleOffreWizardPage } from './NouvelleOffreWizardPage';
export { default as DupliquerProduitPage } from './DupliquerProduitPage';
export { default as DemanderFicheScreen } from './DemanderFicheScreen';
export { default as OffreEnvoyeeScreen } from './OffreEnvoyeeScreen';
