// frontend/src/App.tsx
// Composant principal de l'application React
// Définit les routes principales et intègre les composants de mise en page et de routage

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './app/layout/AppLayout'; // Mise en page principale de l'application
import HomePage from './features/home/HomePage'; // Page d'accueil
import CatalogPage from './features/catalog/CatalogPage'; // Page du catalogue de produits
import ProductDetailPage from './features/catalog/ProductDetailPage'; // Page de détail du produit
import CartPage from './features/cart/CartPage'; // Page du panier
import CheckoutPage from './features/checkout/CheckoutPage'; // Page de paiement
import LoginPage from './features/auth/LoginPage'; // Page de connexion
import RegisterPage from './features/auth/RegisterPage'; // Page d'inscription
import ProtectedRoute from './components/auth/ProtectedRoute'; // Composant de route protégée
import PublicRoute from './components/auth/PublicRoute'; // Composant de route publique

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