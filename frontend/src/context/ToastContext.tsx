// frontend/src/context/ToastContext.tsx
// Contexte global pour les toasts BelivaY.
//
// SIGNATURE RÉTRO-COMPATIBLE — aucun composant existant à modifier :
//   showToast('Message de succès', 'success')        ← ancienne syntaxe
//   showToast('Message', 'error')                    ← ancienne syntaxe
//
// NOUVELLE SYNTAXE (title + description) :
//   showToast('Commande créée', { description: 'Votre commande #1234 est confirmée.', type: 'success' })
//   showToast('Erreur réseau',  { description: 'Vérifiez votre connexion.', type: 'error', duration: 8000 })
//
// Max 4 toasts simultanés. Le plus ancien est retiré si la limite est dépassée.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Toast, { type ToastType, type ToastProps } from '@/components/ui/Toast';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type { ToastType };

/** Options étendues (nouvelle syntaxe) */
export interface ToastOptions {
  description?: string;
  type?:        ToastType;
  /** Durée en ms avant fermeture automatique. Défaut : 5000 */
  duration?:    number;
}

type ToastItem = Omit<ToastProps, 'onDismiss'>;

interface ToastContextType {
  /**
   * Affiche un toast.
   *
   * @example
   * // Ancienne syntaxe (toujours valide)
   * showToast('Produit ajouté au panier', 'success')
   * showToast('Connexion échouée', 'error')
   *
   * @example
   * // Nouvelle syntaxe avec titre + description
   * showToast('Commande confirmée', {
   *   description: 'Votre commande #BLV-00123 est en cours de traitement.',
   *   type: 'success',
   * })
   */
  showToast:  (title: string, typeOrOptions?: ToastType | ToastOptions) => void;
  dismiss:    (id: string) => void;
  dismissAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYFRAMES — injectés une seule fois dans <head>
// ─────────────────────────────────────────────────────────────────────────────

const KEYFRAMES_CSS = `
  @keyframes belivay-toast-in {
    from {
      opacity: 0;
      transform: translateX(calc(100% + 20px)) scale(0.94);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
  @keyframes belivay-toast-out {
    from {
      opacity: 1;
      transform: translateX(0) scale(1);
      max-height: 160px;
      margin-bottom: 0;
    }
    to {
      opacity: 0;
      transform: translateX(calc(100% + 20px)) scale(0.94);
      max-height: 0;
      margin-bottom: -10px;
    }
  }
  @keyframes belivay-toast-progress {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }
`;

let keyframesInjected = false;

function ensureKeyframes(): void {
  if (keyframesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id          = 'belivay-toast-keyframes';
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);
  keyframesInjected = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 4;

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  // Injecter les keyframes une fois au premier rendu
  const keyframesRef = useRef(false);
  if (!keyframesRef.current) {
    ensureKeyframes();
    keyframesRef.current = true;
  }

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // ── showToast ─────────────────────────────────────────────────────────────

  const showToast = useCallback((
    title:          string,
    typeOrOptions?: ToastType | ToastOptions,
  ) => {
    // Résolution des paramètres selon la syntaxe utilisée
    let type:        ToastType        = 'success';
    let description: string | undefined;
    let duration:    number           = 5000; //

    if (typeof typeOrOptions === 'string') {
      // Ancienne syntaxe : showToast('msg', 'error')
      type = typeOrOptions;
    } else if (typeOrOptions && typeof typeOrOptions === 'object') {
      // Nouvelle syntaxe : showToast('title', { description, type, duration })
      type        = typeOrOptions.type        ?? 'success';
      description = typeOrOptions.description;
      duration    = typeOrOptions.duration    ?? 5000;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setToasts(prev => {
      const next: ToastItem[] = [
        ...prev,
        { id, title, description, type, duration },
      ];
      // Limite : on garde les MAX_TOASTS plus récents
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  }, []);

  // ── dismiss ───────────────────────────────────────────────────────────────

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── dismissAll ────────────────────────────────────────────────────────────

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ToastContext.Provider value={{ showToast, dismiss, dismissAll }}>
      {children}

      {/*
        Conteneur fixe bottom-right.
        Sur mobile (< 640px) : centré en bas avec marges latérales.
        Sur desktop : ancré au coin inférieur droit.
      */}
      {toasts.length > 0 && (
        <>
          {/* Styles responsive du conteneur */}
          <style>{`
            #belivay-toast-container {
              position: fixed;
              bottom: 24px;
              right: 24px;
              z-index: 9999;
              display: flex;
              flex-direction: column;
              gap: 10px;
              align-items: flex-end;
              pointer-events: none;
            }
            @media (max-width: 480px) {
              #belivay-toast-container {
                bottom: 80px;
                right: 16px;
                left: 16px;
                align-items: stretch;
              }
              #belivay-toast-container > * {
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}</style>

          <div
            id="belivay-toast-container"
            role="region"
            aria-label="Notifications"
            aria-live="polite"
          >
            {toasts.map(toast => (
              <Toast
                key={toast.id}
                {...toast}
                onDismiss={dismiss}
              />
            ))}
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}