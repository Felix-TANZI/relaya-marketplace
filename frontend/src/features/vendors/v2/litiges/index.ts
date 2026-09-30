// frontend/src/features/vendors/v2/litiges/index.ts
// Barrel — écrans « Litiges et retours » (VD-07). Routes recommandées
// (à câbler dans app/routes/router.tsx, sous SellerLayout) :
//   v2/litiges                    → DisputesListPage
//   v2/litiges/:id                → DisputeReplyPage
//   v2/litiges/:id/decision       → DisputeDecisionPage
//   v2/retours                    → ReturnsListPage
//   v2/retours/:id                → ReturnInspectionPage
//   v2/retours/:id/remplacement   → ReturnReplacementPage

export { default as DisputesListPage } from './DisputesListPage';
export { default as DisputeReplyPage } from './DisputeReplyPage';
export { default as DisputeDecisionPage } from './DisputeDecisionPage';
export { default as ReturnsListPage } from './ReturnsListPage';
export { default as ReturnInspectionPage } from './ReturnInspectionPage';
export { default as ReturnReplacementPage } from './ReturnReplacementPage';
