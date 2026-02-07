// frontend/src/App.tsx
// Composant principal de l'application React
// Définit les routes principales et intègre les composants de mise en page et de routage

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./app/layout/AppLayout"; // Mise en page principale de l'application
import HomePage from "./features/home/HomePage"; // Page d'accueil
import CatalogPage from "./features/catalog/CatalogPage"; // Page du catalogue de produits
import ProductDetailPage from "./features/catalog/ProductDetailPage"; // Page de détail du produit
import CartPage from "./features/cart/CartPage"; // Page du panier
import CheckoutPage from "./features/checkout/CheckoutPage"; // Page de paiement
import LoginPage from "./features/auth/LoginPage"; // Page de connexion
import RegisterPage from "./features/auth/RegisterPage"; // Page d'inscription
import ProtectedRoute from "./components/auth/ProtectedRoute"; // Composant de route protégée
import PublicRoute from "./components/auth/PublicRoute"; // Composant de route publique
import OrdersHistoryPage from "./features/orders/OrdersHistoryPage"; // Page d'historique des commandes
import OrderDetailPage from "./features/orders/OrderDetailPage"; // Page de détail de la commande
import ProfilePage from "./features/profile/ProfilePage"; // Page de profil utilisateur
import BecomeSellerPage from "./features/vendors/BecomeSellerPage"; // Page pour devenir vendeur
import SellerDashboardPage from "./features/vendors/SellerDashboardPage"; // Tableau de bord du vendeur
import ProductFormPage from "./features/vendors/ProductFormPage"; // Page de formulaire de produit
import VendorOrdersPage from "./features/vendors/VendorOrdersPage"; // Page de gestion des commandes pour les vendeurs
import VendorOrderDetailPage from "./features/vendors/VendorOrderDetailPage"; // Page de détail d'une commande pour les vendeurs
import VendorsManagementPage from "./features/admin/VendorsManagementPage"; // Page d'administration des vendeurs
import AdminDashboardPage from './features/admin/AdminDashboardPage'; // Page du dashboard admin
import ProductsManagementPage from './features/admin/ProductsManagementPage'; // Page de gestion des produits pour les admins
import OrdersManagementPage from './features/admin/OrdersManagementPage'; // Page de gestion des commandes pour les admins
import AdminOrderDetailPage from './features/admin/OrderDetailPage'; // Page de détail d'une commande pour les admins

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />

          {/* Routes protégées */}
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          {/* Routes gestion produits vendeur */}
          <Route
            path="seller/products/new"
            element={
              <ProtectedRoute>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="seller/products/:id/edit"
            element={
              <ProtectedRoute>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />

          {/* Route commandes vendeur */}
          <Route
            path="seller/orders"
            element={
              <ProtectedRoute>
                <VendorOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Route détail commande vendeur */}
          <Route
            path="seller/orders/:id"
            element={
              <ProtectedRoute>
                <VendorOrderDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Routes vendeur */}
          <Route
            path="become-seller"
            element={
              <ProtectedRoute>
                <BecomeSellerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="seller/dashboard"
            element={
              <ProtectedRoute>
                <SellerDashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Route admin vendeurs */}
          <Route
            path="admin/vendors"
            element={
              <ProtectedRoute>
                <VendorsManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Route gestion produits admin */}
          <Route
            path="admin/products"
            element={
              <ProtectedRoute>
                <ProductsManagementPage />
              </ProtectedRoute>
            }
          />
          {/* Route dashboard admin */}
          <Route
            path="admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Routes gestion commandes admin */}
          <Route
            path="admin/orders"
            element={
              <ProtectedRoute>
                <OrdersManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/orders/:id"
            element={
              <ProtectedRoute>
                <AdminOrderDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Routes publiques (redirect si déjà connecté) */}
          <Route
            path="login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <OrdersHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
