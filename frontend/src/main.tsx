// frontend/src/main.tsx
// Point d'entrée principal de l'application React

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/config'; // Importer la configuration i18n
import App from './App';
import { CartProvider } from './context/CartContext'; // Contexte du panier
import { ThemeProvider } from './context/ThemeContext'; // Contexte du thème
import { ToastProvider } from './context/ToastContext'; // Contexte des notifications Toast

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
       <CartProvider>
         <App />
       </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
);