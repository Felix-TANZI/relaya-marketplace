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

requestGeolocation();

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