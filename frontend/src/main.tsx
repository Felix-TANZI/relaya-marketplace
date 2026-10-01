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
import { Capacitor } from '@capacitor/core';
import { portalRole } from './config/portals';

requestGeolocation();

// `viewport-fit=cover` etend la page sous l'encoche et la barre gestuelle, ce
// qui est indispensable pour que les env(safe-area-inset-*) du portail point
// relais valent autre chose que 0. On ne l'active que pour ce portail : les
// autres ont des barres `fixed top-0` sans padding d'inset, et passeraient
// sous la barre de statut. A supprimer quand ils gereront leurs insets. ex
if (portalRole === 'relay_point') {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

// Depuis Android 15 (targetSdk >= 35) le plein ecran est IMPOSE : la WebView
// dessine sous la barre d'etat, qu'on le demande ou non. Les
// env(safe-area-inset-*) devraient alors valoir la hauteur de cette barre —
// mais certaines WebView renvoient 0, et l'en-tete vient se coller sous
// l'heure et la batterie, qui disparaissent sur fond clair.
//
// Ce marqueur permet au CSS de reserver une hauteur de barre d'etat par
// defaut dans ce cas precis, sans toucher au navigateur ou l'inset est juste.
if (Capacitor.isNativePlatform()) {
  document.documentElement.dataset.native = '1';
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