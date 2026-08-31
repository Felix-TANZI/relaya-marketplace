import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import './i18n/index';
import { router } from './app/routes/router';
import { CartProvider }    from './context/CartContext';
import { ThemeProvider }   from './context/ThemeContext';
import { ToastProvider }   from './context/ToastContext';
import { AuthProvider }    from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { requestGeolocation } from './services/geolocation';
import { portalRole } from './config/portals';

requestGeolocation();

// `viewport-fit=cover` etend la page sous l'encoche et la barre gestuelle, ce
// qui est indispensable pour que les env(safe-area-inset-*) du portail point
// relais valent autre chose que 0. On ne l'active que pour ce portail : les
// autres ont des barres `fixed top-0` sans padding d'inset, et passeraient
// sous la barre de statut. A supprimer quand ils gereront leurs insets.
if (portalRole === 'relay_point') {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ConfirmProvider>
            <CartProvider>
              <RouterProvider router={router} />
            </CartProvider>
          </ConfirmProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);