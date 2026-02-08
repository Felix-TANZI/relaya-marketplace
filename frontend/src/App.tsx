// frontend/src/App.tsx
// Composant principal de l'application React
// Définit les routes principales et intègre les composants de mise en page et de routage

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./app/layout/AppLayout";
import HomePage from "./features/home/HomePage";
import CatalogPage from "./features/catalog/CatalogPage";
import ProductDetailPage from "./features/catalog/ProductDetailPage";
import CartPage from "./features/cart/CartPage";
import CheckoutPage from "./features/checkout/CheckoutPage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import OrdersHistoryPage from "./features/orders/OrdersHistoryPage";
import OrderDetailPage from "./features/orders/OrderDetailPage";
import ProfilePage from "./features/profile/ProfilePage";
import BecomeSellerPage from "./features/vendors/BecomeSellerPage";
import SellerDashboardPage from "./features/vendors/SellerDashboardPage";
import ProductFormPage from "./features/vendors/ProductFormPage";
import VendorOrdersPage from "./features/vendors/VendorOrdersPage";
import VendorOrderDetailPage from "./features/vendors/VendorOrderDetailPage";

// Admin imports
import AdminLayout from './features/admin/AdminLayout';
import AdminDashboardPage from "./features/admin/AdminDashboardPage";
import ProductsManagementPage from "./features/admin/ProductsManagementPage";
import OrdersManagementPage from "./features/admin/OrdersManagementPage";
import AdminOrderDetailPage from "./features/admin/OrderDetailPage";
import UsersManagementPage from "./features/admin/UsersManagementPage";
import UserDetailPage from "./features/admin/UserDetailPage";
import VendorsManagementPage from "./features/admin/VendorsManagementPage";
import DisputesManagementPage from "./features/admin/DisputesManagementPage";
import DisputeDetailPage from "./features/admin/DisputeDetailPage";
import SettingsPage from './features/admin/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes principales avec AppLayout */}
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

        {/* Routes admin avec AdminLayout (sidebar permanente) */}
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirection par défaut vers dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Pages admin */}
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="products" element={<ProductsManagementPage />} />
          <Route path="orders" element={<OrdersManagementPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="vendors" element={<VendorsManagementPage />} />
          <Route path="disputes" element={<DisputesManagementPage />} />
          <Route path="disputes/:id" element={<DisputeDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;