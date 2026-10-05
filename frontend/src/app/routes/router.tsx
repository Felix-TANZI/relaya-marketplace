// frontend/src/app/routes/router.tsx
// Routeur principal BelivaY.
// Architecture :
//   AppLayout    → pages publiques + auth + client
//   SellerLayout → /seller/*
//   AdminLayout  → /admin/* (AdminRoute = ProtectedRoute + is_staff check)

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { isDedicatedPortal, portalHomePath } from '@/config/portals';
import PageLoader from '@/components/PageLoader';

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUTS
// ─────────────────────────────────────────────────────────────────────────────
import AppLayout    from '@/app/layout/AppLayout';
import SellerLayout from '@/app/layout/SellerLayout';
import AdminLayout  from '@/features/admin/AdminLayout';

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS
// ─────────────────────────────────────────────────────────────────────────────
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicRoute    from '@/components/auth/PublicRoute';
import RoleRoute      from '@/components/auth/RoleRoute';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PAGES
// ─────────────────────────────────────────────────────────────────────────────
const HomePage = lazy(() => import('@/features/home/HomePage'));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'));
const CategoriesPage = lazy(() => import('@/features/categories/CategoriesPage'));
const CategoryThemePage = lazy(() => import('@/features/categories/CategoryThemePage'));
const PremiumPage = lazy(() => import('@/features/premium/PremiumPage'));
const SelectionPremiumPage = lazy(() => import('@/features/premium/SelectionPremiumPage'));
const CartPage = lazy(() => import('@/features/cart/CartPage'));
const CheckoutPage = lazy(() => import('@/features/checkout/CheckoutPage'));
const CheckoutConfirmPage = lazy(() => import('@/features/checkout/CheckoutConfirmPage'));
const OrdersHistoryPage = lazy(() => import('@/features/orders/OrdersHistoryPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'));
const WishlistPage = lazy(() => import('@/features/wishlist/WishlistPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const ContactPage = lazy(() => import('@/features/contact/ContactPage'));
const HelpPage = lazy(() => import('@/features/help/HelpPage'));
const AboutPage = lazy(() => import('@/features/about/AboutPage'));
const BecomeSellerPage = lazy(() => import('@/features/vendors/BecomeSellerPage'));
const NotFoundPage = lazy(() => import('@/features/system/NotFoundPage'));
const PromotionsPage = lazy(() => import('@/features/promotions/PromotionsPage'));
const FlashDealsPage = lazy(() => import('@/features/flash/FlashDealsPage'));
const DriverApp = lazy(() => import('@/features/driver/DriverApp'));
const FicheDetailPage = lazy(() => import('@/features/catalog/FicheDetailPage'));
const RelayPointPage = lazy(() => import('@/features/relay/RelayPointPage'));
const DeliveryOrganizationPage = lazy(() => import('@/features/delivery-organization/DeliveryOrganizationPage'));
// ─────────────────────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────────────────────
const LoginRoute = lazy(() => import('@/features/auth/LoginRoute'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
// ─────────────────────────────────────────────────────────────────────────────
// SELLER PAGES
// ─────────────────────────────────────────────────────────────────────────────
const SellerDashboardPage = lazy(() => import('@/features/vendors/SellerDashboardPage'));
const SellerProductsPage = lazy(() => import('@/features/vendors/SellerProductsPage'));
const ProductFormPage = lazy(() => import('@/features/vendors/ProductFormPage'));
const SellerOrdersPage = lazy(() => import('@/features/vendors/SellerOrdersPage'));
const SellerOrderDetailPage = lazy(() => import('@/features/vendors/SellerOrderDetailPage'));
const SellerDisputesPage = lazy(() => import('@/features/vendors/SellerDisputesPage'));
const SellerReturnsPage = lazy(() => import('@/features/vendors/SellerReturnsPage'));
const SellerShopPage = lazy(() => import('@/features/vendors/SellerShopPage'));
const SellerAnalyticsPage = lazy(() => import('@/features/vendors/SellerAnalyticsPage'));
const SellerBoostPage = lazy(() => import('@/features/vendors/SellerBoostPage'));
const SellerCertificationsPage = lazy(() => import('@/features/vendors/SellerCertificationsPage'));
const SellerPlansPage = lazy(() => import('@/features/vendors/SellerPlansPage'));
const SellerSettingsPage = lazy(() => import('@/features/vendors/SellerSettingsPage'));
const SellerMenuPage = lazy(() => import('@/features/vendors/v2/MenuPage'));
const SellerV2ComingSoonPage = lazy(() => import('@/features/vendors/v2/V2ComingSoonPage'));

// Espace vendeur v2 — onboarding public (avant que le compte ait le rôle seller)
const VendorConnexionPage = lazy(() => import('@/features/vendors/v2/ouverture/ConnexionPage'));
const VendorOuvrirBoutiquePage = lazy(() => import('@/features/vendors/v2/ouverture/OuvrirBoutiquePage'));
const VendorPublierEtEtrePayePage = lazy(() => import('@/features/vendors/v2/ouverture/PublierEtEtrePayePage'));

// Espace vendeur v2 — écrans protégés (lots 5/6/7/8/9/10)
const AccueilV2Page = lazy(() => import('@/features/vendors/v2/accueil/AccueilPage'));
const SaisieAssisteeV2Page = lazy(() => import('@/features/vendors/v2/ouverture/SaisieAssisteePage'));
const InstallerApplicationV2Page = lazy(() => import('@/features/vendors/v2/ouverture/InstallerApplicationPage'));

const CommandesListV2Page = lazy(() => import('@/features/vendors/v2/commandes/CommandesListPage'));
const CommandeDetailV2Page = lazy(() => import('@/features/vendors/v2/commandes/CommandeDetailPage'));
const RuptureV2Page = lazy(() => import('@/features/vendors/v2/commandes/RupturePage'));
const ExtendV2Page = lazy(() => import('@/features/vendors/v2/commandes/ExtendPage'));
const PreparationSlipV2Page = lazy(() => import('@/features/vendors/v2/commandes/PreparationSlipPage'));
const OrderJournalV2Page = lazy(() => import('@/features/vendors/v2/commandes/OrderJournalPage'));
const HandoverV2Page = lazy(() => import('@/features/vendors/v2/commandes/HandoverPage'));
const HandoverDoneV2Page = lazy(() => import('@/features/vendors/v2/commandes/HandoverDonePage'));
const ReceiptV2Page = lazy(() => import('@/features/vendors/v2/commandes/ReceiptPage'));

const DisputesListV2Page = lazy(() => import('@/features/vendors/v2/litiges/DisputesListPage'));
const DisputeReplyV2Page = lazy(() => import('@/features/vendors/v2/litiges/DisputeReplyPage'));
const DisputeDecisionV2Page = lazy(() => import('@/features/vendors/v2/litiges/DisputeDecisionPage'));
const ReturnsListV2Page = lazy(() => import('@/features/vendors/v2/litiges/ReturnsListPage'));
const ReturnInspectionV2Page = lazy(() => import('@/features/vendors/v2/litiges/ReturnInspectionPage'));
const ReturnReplacementV2Page = lazy(() => import('@/features/vendors/v2/litiges/ReturnReplacementPage'));

const MesProduitsV2Page = lazy(() => import('@/features/vendors/v2/catalogue/MesProduitsPage'));
const UneOffreV2Page = lazy(() => import('@/features/vendors/v2/catalogue/UneOffrePage'));
const NouvelleOffreV2Page = lazy(() => import('@/features/vendors/v2/catalogue/NouvelleOffreWizardPage'));
const DupliquerProduitV2Page = lazy(() => import('@/features/vendors/v2/catalogue/DupliquerProduitPage'));
const ModifierOffreV2Page = lazy(() => import('@/features/vendors/v2/catalogue/ModifierOffrePage'));

const MonPalierV2Page = lazy(() => import('@/features/vendors/v2/compte/trust-score/MonPalierPage'));
const MonScoreV2Page = lazy(() => import('@/features/vendors/v2/compte/trust-score/MonScorePage'));
const LesPaliersV2Page = lazy(() => import('@/features/vendors/v2/compte/trust-score/LesPaliersPage'));
const SanctionsControleV2Page = lazy(() => import('@/features/vendors/v2/compte/sanctions/SanctionsControlePage'));
const ContesterDecisionV2Page = lazy(() => import('@/features/vendors/v2/compte/sanctions/ContesterDecisionPage'));
const LesPlansV2Page = lazy(() => import('@/features/vendors/v2/compte/plans/LesPlansPage'));
const SimulateurV2Page = lazy(() => import('@/features/vendors/v2/compte/plans/SimulateurPage'));
const SeFaireVoirV2Page = lazy(() => import('@/features/vendors/v2/compte/visibilite/SeFaireVoirPage'));
const ParametresV2Page = lazy(() => import('@/features/vendors/v2/compte/parametres/ParametresPage'));
const SecuriteAppareilsV2Page = lazy(() => import('@/features/vendors/v2/compte/securite/SecuriteAppareilsPage'));
const NotificationsV2Page = lazy(() => import('@/features/vendors/v2/compte/notifications/NotificationsPage'));
const AvisDroitReponseV2Page = lazy(() => import('@/features/vendors/v2/compte/avis/AvisDroitReponsePage'));
const MessagerieV2Page = lazy(() => import('@/features/vendors/v2/compte/messagerie/MessageriePage'));
const AideV2Page = lazy(() => import('@/features/vendors/v2/compte/aide/AidePage'));

const MonArgentV2Page = lazy(() => import('@/features/vendors/v2/argent/MonArgentPage'));
const MesGainsV2Page = lazy(() => import('@/features/vendors/v2/argent/MesGainsPage'));
const SeLibereV2Page = lazy(() => import('@/features/vendors/v2/argent/SeLiberePage'));
const GeleV2Page = lazy(() => import('@/features/vendors/v2/argent/GelePage'));
const DocumentsV2Page = lazy(() => import('@/features/vendors/v2/argent/DocumentsPage'));
const ChangerNumeroV2Page = lazy(() => import('@/features/vendors/v2/argent/ChangerNumeroFlow'));
const VersementsV2Page = lazy(() => import('@/features/vendors/v2/argent/VersementsPage'));

const BoutiqueV2Page = lazy(() => import('@/features/vendors/v2/boutique/BoutiquePage'));
const HorairesV2Page = lazy(() => import('@/features/vendors/v2/boutique/HorairesPage'));
const EmplacementV2Page = lazy(() => import('@/features/vendors/v2/boutique/EmplacementPage'));
const EquipeV2Page = lazy(() => import('@/features/vendors/v2/boutique/EquipePage'));
const EquipeAjoutV2Page = lazy(() => import('@/features/vendors/v2/boutique/EquipeAjoutPage'));

const ServicesV2Page = lazy(() => import('@/features/vendors/v2/compte/croissance/ServicesPage'));
const ChiffresV2Page = lazy(() => import('@/features/vendors/v2/compte/croissance/ChiffresPage'));
const DemandeV2Page = lazy(() => import('@/features/vendors/v2/compte/croissance/DemandePage'));
const SellerPaymentsPage = lazy(() => import('@/features/vendors/SellerPaymentsPage'));
const SellerWalletPage = lazy(() => import('@/features/vendors/SellerWalletPage'));
const SellerSettlementsPage = lazy(() => import('@/features/vendors/SellerSettlementsPage'));
const SellerPendingFundsPage = lazy(() => import('@/features/vendors/SellerPendingFundsPage'));
const SellerAdjustmentsPage = lazy(() => import('@/features/vendors/SellerAdjustmentsPage'));
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES FINANCIÈRES PARTENAIRES
// ─────────────────────────────────────────────────────────────────────────────
import {
  buyerPaymentRoutes,
  sellerPaymentRoutes,
  deliveryPaymentRoutes,
  relayPaymentRoutes,
  adminFinanceRoutes,
} from './payments.routes';

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PARTAGÉ
// ─────────────────────────────────────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
import AdminStub               from '@/features/admin/_AdminStub';

// ── Finances ─────────────────────────────────────────────────────────────────
const FinancesPage = lazy(() => import('@/features/admin/finances/FinancesPage'));
const AccountPage = lazy(() => import('@/features/admin/finances/AccountPage'));
const PlansPage = lazy(() => import('@/features/admin/finances/PlansPage'));
const CommissionsPage = lazy(() => import('@/features/admin/finances/CommissionsPage'));
// ── Vendeurs ─────────────────────────────────────────────────────────────────
const VendorsListPage = lazy(() => import('@/features/admin/vendors/VendorsListPage'));
const VendorDetailPage = lazy(() => import('@/features/admin/vendors/VendorDetailPage'));
const KYCPage = lazy(() => import('@/features/admin/vendors/KYCPage'));
const WithdrawalsPage = lazy(() => import('@/features/admin/vendors/WithdrawalsPage'));
const ModificationsPage = lazy(() => import('@/features/admin/vendors/ModificationsPage'));
const CertificationsPage = lazy(() => import('@/features/admin/vendors/CertificationsPage'));
const SubscriptionsPage = lazy(() => import('@/features/admin/vendors/SubscriptionsPage'));
const VendorsOverviewPage = lazy(() => import('@/features/admin/vendors/VendorsOverviewPage'));
const OrdersMapPage = lazy(() => import('@/features/admin/operations/OrdersMapPage'));
const VendorsMapPage = lazy(() => import('@/features/admin/vendors/VendorsMapPage'));
// ── Clients ──────────────────────────────────────────────────────────────────
const CustomersListPage = lazy(() => import('@/features/admin/customers/CustomersListPage'));
const CustomerDetailPage = lazy(() => import('@/features/admin/customers/CustomerDetailPage'));
const CustomersOverviewPage = lazy(() => import('@/features/admin/customers/CustomersOverviewPage'));
const CustomersBroadcastPage = lazy(() => import('@/features/admin/customers/CustomersBroadcastPage'));
const CustomersLoyaltyPage = lazy(() => import('@/features/admin/customers/CustomersLoyaltyPage'));
// ── Opérations ───────────────────────────────────────────────────────────────
const OrdersListPage = lazy(() => import('@/features/admin/operations/OrdersListPage'));
const AdminOrderDetailPage = lazy(() => import('@/features/admin/operations/OrderDetailPage'));
const DisputesListPage = lazy(() => import('@/features/admin/operations/DisputesListPage'));
const ReturnsListPage = lazy(() => import('@/features/admin/operations/ReturnsListPage'));
const SupervisionPage = lazy(() => import('@/features/admin/operations/SupervisionPage'));
const AdminDisputeDetailPage = lazy(() => import('@/features/admin/operations/DisputeDetailPage'));
const DeliveriesListPage = lazy(() => import('@/features/admin/deliveries/DeliveriesListPage'));
const DeliveriesZonesPage = lazy(() => import('@/features/admin/deliveries/DeliveriesZonesPage'));
const DeliveriesPerformancePage = lazy(() => import('@/features/admin/deliveries/DeliveriesPerformancePage'));
const DeliveryOrganizationsMapPage = lazy(() => import('@/features/admin/deliveries/DeliveryOrganizationsMapPage'));
const RelayPointsMapPage = lazy(() => import('@/features/admin/deliveries/RelayPointsMapPage'));
const CataloguePage = lazy(() => import('@/features/admin/operations/CataloguePage'));
const ReviewsPage = lazy(() => import('@/features/admin/operations/ReviewsPage'));
const MasterProductsPage = lazy(() => import('@/features/admin/operations/MasterProductsPage'));
// ── Système ──────────────────────────────────────────────────────────────────
const AuditPage = lazy(() => import('@/features/admin/system/AuditPage'));
const NotificationsAdminPage = lazy(() => import('@/features/admin/system/NotificationsPage'));
const LogsPage = lazy(() => import('@/features/admin/system/LogsPage'));
const SettingsPage = lazy(() => import('@/features/admin/SettingsPage'));
const UserCreatePage = lazy(() => import('@/features/admin/customers/UserCreatePage'));
// ── Live ─────────────────────────────────────────────────────────────────────
const LiveUsersPage = lazy(() => import('@/features/admin/LiveUsersPage'));
const LiveMapPage = lazy(() => import('@/features/admin/LiveMapPage'));
// ── Utilisateurs ─────────────────────────────────────────────────────────────
const UsersManagementPage = lazy(() => import('@/features/admin/UsersManagementPage'));
const UserDetailPage = lazy(() => import('@/features/admin/UserDetailPage'));
// ── Catalogue ─────────────────────────────────────────────────────────────
const AdminVariantsPage = lazy(() => import('@/features/admin/catalog/AdminVariantsPage'));
const AdminBrandsPage = lazy(() => import('@/features/admin/catalog/AdminBrandsPage'));
const AdminAttributesPage = lazy(() => import('@/features/admin/catalog/AdminAttributesPage'));
const AdminColorsPage = lazy(() => import('@/features/admin/catalog/AdminColorsPage'));
const AdminCategPage = lazy(() => import('@/features/admin/catalog/AdminCategPage'));
// ─────────────────────────────────────────────────────────────────────────────
// STUBS — icônes pour les pages à venir
// ─────────────────────────────────────────────────────────────────────────────
import {
  Megaphone, Truck, TrendingUp,
  Zap, Bot, Shield, HeadphonesIcon,
} from 'lucide-react';

// Le portail dedie se decide au chargement du module — `isDedicatedPortal` et
// `portalHomePath` sont des constantes de `@/config/portals`. L'element est
// donc calcule ici plutot que dans un composant : un fichier de routes qui
// declare un composant casse le Fast Refresh (react-refresh/only-export-components).
const portalIndexElement = isDedicatedPortal
  ? <Navigate to={portalHomePath} replace />
  : <HomePage />;

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: portalIndexElement },

      // Public
      { path: 'catalog',         element: <CatalogPage /> },
      { path: 'categories',      element: <CategoriesPage /> },
      { path: 'categorie/:slug', element: <CategoryThemePage /> },
      { path: 'product/:slug', element: <FicheDetailPage /> },
      { path: 'cart',            element: <CartPage /> },
      { path: 'wishlist',        element: <WishlistPage /> },
      { path: 'search',          element: <SearchPage /> },
      { path: 'promotions',      element: <PromotionsPage /> },
      { path: 'flash-deals',     element: <FlashDealsPage /> },
      { path: 'premium',         element: <PremiumPage /> },
      { path: 'selection-premium', element: <SelectionPremiumPage /> },
      { path: 'contact',         element: <ContactPage /> },
      { path: 'help',            element: <HelpPage /> },
      { path: 'about',           element: <AboutPage /> },
      { path: 'become-seller',   element: <BecomeSellerPage /> },
      { path: 'vendeur/connexion',              element: <VendorConnexionPage /> },
      { path: 'vendeur/ouvrir-boutique',        element: <VendorOuvrirBoutiquePage /> },
      { path: 'vendeur/publier-et-etre-paye',   element: <ProtectedRoute><VendorPublierEtEtrePayePage /></ProtectedRoute> },

      // Auth
      { path: 'login',    element: <PublicRoute><LoginRoute /></PublicRoute> },
      { path: 'register', element: <PublicRoute><RegisterPage /></PublicRoute> },

      // Protected (client)
      { path: 'checkout',         element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      { path: 'checkout/confirm', element: <ProtectedRoute><CheckoutConfirmPage /></ProtectedRoute> },
      { path: 'orders',           element: <ProtectedRoute><OrdersHistoryPage /></ProtectedRoute> },
      { path: 'orders/:id',       element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute> },
      { path: 'notifications',    element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
      { path: 'profile',          element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      ...buyerPaymentRoutes,

      // Fallback
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SELLER AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/seller',
    element: <ProtectedRoute><RoleRoute role="seller"><SellerLayout /></RoleRoute></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/seller/v2/accueil" replace /> },
      { path: 'dashboard',         element: <SellerDashboardPage /> },
      { path: 'products',          element: <SellerProductsPage /> },
      { path: 'products/new',      element: <ProductFormPage /> },
      { path: 'products/:id/edit', element: <ProductFormPage /> },
      { path: 'orders',            element: <SellerOrdersPage /> },
      { path: 'orders/:id',        element: <SellerOrderDetailPage /> },
      { path: 'disputes',          element: <SellerDisputesPage /> },
      { path: 'returns',           element: <SellerReturnsPage /> },
      { path: 'shop',              element: <SellerShopPage /> },
      { path: 'analytics',         element: <SellerAnalyticsPage /> },
      { path: 'boost',             element: <SellerBoostPage /> },
      { path: 'certifications',    element: <SellerCertificationsPage /> },
      { path: 'plans',             element: <SellerPlansPage /> },
      { path: 'settings',          element: <SellerSettingsPage /> },
      { path: 'menu',              element: <SellerMenuPage /> },

      // Espace vendeur v2 — construits lots 5 à 10 (chemins explicites AVANT
      // le catch-all v2/:screen, sinon celui-ci intercepte tout).
      { path: 'v2/accueil',                    element: <AccueilV2Page /> },
      { path: 'v2/saisie-assistee',            element: <SaisieAssisteeV2Page /> },
      { path: 'v2/installer',                  element: <InstallerApplicationV2Page /> },

      { path: 'v2/commandes',                  element: <CommandesListV2Page /> },
      { path: 'v2/commandes/:id',              element: <CommandeDetailV2Page /> },
      { path: 'v2/commandes/:id/rupture',      element: <RuptureV2Page /> },
      { path: 'v2/commandes/:id/plus-de-temps',element: <ExtendV2Page /> },
      { path: 'v2/commandes/:id/bon-de-preparation', element: <PreparationSlipV2Page /> },
      { path: 'v2/commandes/:id/journal',      element: <OrderJournalV2Page /> },
      { path: 'v2/commandes/:id/remise',       element: <HandoverV2Page /> },
      { path: 'v2/commandes/:id/remis',        element: <HandoverDoneV2Page /> },
      { path: 'v2/commandes/:id/recu',         element: <ReceiptV2Page /> },

      { path: 'v2/litiges',                    element: <DisputesListV2Page /> },
      { path: 'v2/litiges/:id',                element: <DisputeReplyV2Page /> },
      { path: 'v2/litiges/:id/decision',       element: <DisputeDecisionV2Page /> },
      { path: 'v2/retours',                    element: <ReturnsListV2Page /> },
      { path: 'v2/retours/:id',                element: <ReturnInspectionV2Page /> },
      { path: 'v2/retours/:id/remplacement',   element: <ReturnReplacementV2Page /> },

      { path: 'v2/produits',                   element: <MesProduitsV2Page /> },
      { path: 'v2/produits/nouveau',           element: <NouvelleOffreV2Page /> },
      { path: 'v2/produits/dupliquer/:id',     element: <DupliquerProduitV2Page /> },
      { path: 'v2/produits/:id/modifier',      element: <ModifierOffreV2Page /> },
      { path: 'v2/produits/:id',               element: <UneOffreV2Page /> },

      { path: 'v2/palier',                     element: <MonPalierV2Page /> },
      { path: 'v2/score',                      element: <MonScoreV2Page /> },
      { path: 'v2/paliers',                    element: <LesPaliersV2Page /> },
      { path: 'v2/sanctions',                  element: <SanctionsControleV2Page /> },
      { path: 'v2/sanctions/contester/:id',    element: <ContesterDecisionV2Page /> },
      { path: 'v2/plans',                      element: <LesPlansV2Page /> },
      { path: 'v2/simulateur',                 element: <SimulateurV2Page /> },
      { path: 'v2/se-faire-voir',              element: <SeFaireVoirV2Page /> },
      { path: 'v2/parametres',                 element: <ParametresV2Page /> },
      { path: 'v2/securite',                   element: <SecuriteAppareilsV2Page /> },
      { path: 'v2/notifications',              element: <NotificationsV2Page /> },
      { path: 'v2/avis',                       element: <AvisDroitReponseV2Page /> },
      { path: 'v2/messagerie',                 element: <MessagerieV2Page /> },
      { path: 'v2/aide',                       element: <AideV2Page /> },

      // Argent / versements (lot construit le 04/10 — modele retrait a la
      // demande, decide par le proprietaire). v2/argent est un ecran racine
      // (header verre + dock, ajoute a V2_ROOT_PATHS dans SellerLayout.tsx) ;
      // les autres sont des ecrans enfants (fleche retour via ScreenHeader).
      { path: 'v2/argent',                     element: <MonArgentV2Page /> },
      { path: 'v2/argent/gains',               element: <MesGainsV2Page /> },
      { path: 'v2/argent/se-libere',           element: <SeLibereV2Page /> },
      { path: 'v2/argent/gele',                element: <GeleV2Page /> },
      { path: 'v2/argent/documents',           element: <DocumentsV2Page /> },
      { path: 'v2/argent/numero',              element: <ChangerNumeroV2Page /> },
      { path: 'v2/versements',                 element: <VersementsV2Page /> },

      // Boutique / equipe / emplacement (lot construit le 04/10).
      { path: 'v2/boutique',                   element: <BoutiqueV2Page /> },
      { path: 'v2/horaires',                   element: <HorairesV2Page /> },
      { path: 'v2/emplacement',                element: <EmplacementV2Page /> },
      { path: 'v2/equipe',                     element: <EquipeV2Page /> },
      { path: 'v2/equipe/ajouter',             element: <EquipeAjoutV2Page /> },

      // Croissance (lot construit le 04/10).
      { path: 'v2/services',                   element: <ServicesV2Page /> },
      { path: 'v2/chiffres',                   element: <ChiffresV2Page /> },
      { path: 'v2/demande',                    element: <DemandeV2Page /> },

      { path: 'v2/:screen',        element: <SellerV2ComingSoonPage /> },

      // Pages financières vendeur. Declarees AVANT `sellerPaymentRoutes` :
      // ce jeu generique expose aussi `wallet`, `payments` et `adjustments`,
      // et React Router retient la premiere correspondance.
      { path: 'wallet',        element: <SellerWalletPage /> },
      { path: 'payments',      element: <SellerPaymentsPage /> },
      { path: 'settlements',   element: <SellerSettlementsPage /> },
      { path: 'pending-funds', element: <SellerPendingFundsPage /> },
      { path: 'adjustments',   element: <SellerAdjustmentsPage /> },

      ...sellerPaymentRoutes,
    ],
  },

  // Espace livreur
  {
    path: '/courier',
    element: <ProtectedRoute><RoleRoute role="courier"><Suspense fallback={<PageLoader />}><DriverApp /></Suspense></RoleRoute></ProtectedRoute>,
  },
  {
    path: '/driver/*',
    element: <ProtectedRoute><RoleRoute role="courier"><Suspense fallback={<PageLoader />}><DriverApp /></Suspense></RoleRoute></ProtectedRoute>,
  },
  {
    path: '/relay-point',
    element: <ProtectedRoute><RoleRoute role="relay_point"><Suspense fallback={<PageLoader />}><RelayPointPage /></Suspense></RoleRoute></ProtectedRoute>,
    children: [
      ...relayPaymentRoutes,
    ],
  },
  {
    path: '/delivery-organization',
    element: <ProtectedRoute><RoleRoute role="delivery_organization"><Suspense fallback={<PageLoader />}><DeliveryOrganizationPage /></Suspense></RoleRoute></ProtectedRoute>,
    children: [
      ...deliveryPaymentRoutes,
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN AREA
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/admin',
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },

      // ── OVERVIEW ────────────────────────────────────────────────────────
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'live',      element: <LiveUsersPage /> },
      { path: 'live/map',  element: <LiveMapPage /> },

      // ── CLIENT MANAGEMENT ─────────────────────────────────────────────────
      { path: 'customers/overview', element: <CustomersOverviewPage /> },
      { path: 'customers',           element: <CustomersListPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'customers/loyalty', element: <CustomersLoyaltyPage /> },
      { path: 'customers/broadcast', element: <CustomersBroadcastPage /> },
      { path: 'customers/create', element: <UserCreatePage /> },

      // ── VENDOR MANAGEMENT ───────────────────────────────────────────────
      { path: 'vendors/overview',       element: <VendorsOverviewPage /> },
      { path: 'vendors',                element: <VendorsListPage /> },
      { path: 'vendors/map',            element: <VendorsMapPage /> },
      { path: 'vendors/kyc',            element: <KYCPage /> },
      { path: 'vendors/withdrawals',    element: <WithdrawalsPage /> },
      { path: 'vendors/subscriptions',  element: <SubscriptionsPage /> },
      { path: 'vendors/certifications', element: <CertificationsPage /> },
      { path: 'vendors/modifications',  element: <ModificationsPage /> },
      { path: 'vendors/:id',            element: <VendorDetailPage /> },

    
      // ── DELIVERY MANAGEMENT ───────────────────────────────────────────────
      {
        path: 'deliveries/overview',
        element: <AdminStub title="Vue d'ensemble — Livreurs" description="Dashboard livreurs en cours de développement. Bientôt disponible." icon={Truck} />,
      },
      {
        path: 'deliveries',
        element: <DeliveriesListPage />,
      },
      {
        path: 'deliveries/zones',
        element: <DeliveriesZonesPage />,
      },
      {
        path: 'deliveries/performance',
        element: <DeliveriesPerformancePage />,
      },
      {
        path: 'deliveries/organization',
        element: <DeliveryOrganizationsMapPage />,
      },
      {
        path: 'deliveries/relay-point',
        element: <RelayPointsMapPage />,
      },

      // ── OPERATIONS ────────────────────────────────────────────────────────
      { path: 'orders',               element: <OrdersListPage /> },
      { path: 'orders/:id',           element: <AdminOrderDetailPage /> },
      { path: 'orders/map',           element: <OrdersMapPage /> },
      { path: 'disputes',             element: <DisputesListPage /> },
      { path: 'disputes/:id',         element: <AdminDisputeDetailPage /> },
      { path: 'returns',              element: <ReturnsListPage /> },
      { path: 'supervision',          element: <SupervisionPage /> },
      { path: 'catalogue',            element: <CataloguePage /> },
      // Ancien écran de catégories (sans images) : remplacé par « Gestion des catégories ».
      { path: 'catalogue/categories', element: <Navigate to="/admin/catalog/categories" replace /> },
      { path: 'catalogue/reviews',    element: <ReviewsPage /> },
      { path: 'catalogue/masters', element: <MasterProductsPage /> },

      // ── FINANCES ────────────────────────────────────────────────────────
      { path: 'finances', element: <FinancesPage /> },
      { path: 'account',  element: <AccountPage /> },
      { path: 'plans',    element: <PlansPage /> },
      { path: 'commissions', element: <CommissionsPage /> },
      ...adminFinanceRoutes,

      // ── GROWTH (SOON) ───────────────────────────────────────────────────
      { path: 'analytics', element: <AdminStub title="Analytics & Tendances"    description="Bientôt disponible." icon={TrendingUp} /> },
      { path: 'boost',     element: <AdminStub title="Boost & Campagnes"        description="Bientôt disponible." icon={Zap}        /> },
      { path: 'marketing', element: <AdminStub title="Marketing & Communication" description="Bientôt disponible." icon={Megaphone}  /> },
      { path: 'ia',        element: <AdminStub title="IA Conseiller"            description="Bientôt disponible." icon={Bot}        /> },

      // ── SECURITY (SOON) ─────────────────────────────────────────────────
      { path: 'security', element: <AdminStub title="Sécurité & Fraude" description="Bientôt disponible." icon={Shield} /> },

      // ── SYSTEM ──────────────────────────────────────────────────────────
      { path: 'notifications', element: <NotificationsAdminPage /> },
      { path: 'support',       element: <AdminStub title="Support & Tickets" description="Bientôt disponible." icon={HeadphonesIcon} /> },
      { path: 'audit',         element: <AuditPage /> },
      { path: 'logs',          element: <LogsPage /> },
      { path: 'settings',      element: <SettingsPage /> },

      // ── Rétrocompatibilité ───────────────────────────────────────────────
      { path: 'users',     element: <UsersManagementPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'products',  element: <CataloguePage /> },

      // ── Catalogue ─────────────────────────────────────────────────────────────
      { path: 'catalog/variants', element: <AdminVariantsPage /> },
      { path: 'catalog/brands',   element: <AdminBrandsPage /> },
      { path: 'catalog/attributes', element: <AdminAttributesPage /> },
      { path: 'catalog/colors',     element: <AdminColorsPage /> },
      { path: 'catalog/categories', element: <AdminCategPage /> },
    ],
  },
]);
