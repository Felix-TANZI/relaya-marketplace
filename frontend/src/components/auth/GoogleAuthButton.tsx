import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GOOGLE_SCRIPT_ID = 'belivay-google-identity';

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => Promise<void>;
  disabled?: boolean;
  label?: 'signin_with' | 'signup_with' | 'continue_with';
  locale?: string;
  onUnavailable?: (message: string) => void;
  /** Echec ponctuel et retentable (contrairement a onUnavailable, qui masque le bouton). */
  onError?: (message: string) => void;
}

const LABEL_TEXT: Record<NonNullable<GoogleAuthButtonProps['label']>, string> = {
  signin_with: 'Se connecter avec Google',
  signup_with: "S'inscrire avec Google",
  continue_with: 'Continuer avec Google',
};

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

function NativeGoogleButton({ onCredential, disabled, label, onError }: {
  onCredential: (credential: string) => Promise<void>;
  disabled: boolean;
  label: NonNullable<GoogleAuthButtonProps['label']>;
  onError?: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      const user = await GoogleAuth.signIn();
      const idToken = user?.authentication?.idToken;
      if (idToken) {
        await onCredential(idToken);
      } else {
        // signIn() a reussi (compte choisi) mais sans idToken exploitable :
        // typiquement un client OAuth Android mal configure (package name /
        // empreinte SHA-1 non enregistres cote Google Cloud Console).
        console.error('GoogleAuth.signIn() a reussi mais sans idToken', user);
        onError?.('Connexion Google impossible (configuration invalide). Reessayez ou utilisez un autre mode de connexion.');
      }
    } catch (error) {
      // Annulation utilisateur : ne pas afficher d'erreur, cas normal.
      const message = error instanceof Error ? error.message : String(error);
      const cancelled = /cancel/i.test(message);
      if (!cancelled) {
        console.error('GoogleAuth.signIn() a echoue', error);
        onError?.('Connexion Google indisponible pour le moment. Reessayez ou utilisez un autre mode de connexion.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || pending}
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleGlyph />
      {pending ? 'Connexion...' : LABEL_TEXT[label]}
    </button>
  );
}

export default function GoogleAuthButton({
  onCredential,
  disabled = false,
  label = 'continue_with',
  locale = 'fr',
  onUnavailable,
  onError,
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const unavailableRef = useRef(onUnavailable);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    callbackRef.current = onCredential;
    unavailableRef.current = onUnavailable;
  }, [onCredential, onUnavailable]);

  useEffect(() => {
    if (isNative) {
      // Sur mobile, GoogleAuth.initialize() lit sa config (serverClientId,
      // scopes) depuis capacitor.config.ts — rien a initialiser ici avec un
      // client_id web, qui ne fonctionnerait pas dans une WebView native.
      GoogleAuth.initialize();
      setReady(true);
      return;
    }
    if (!clientId) {
      unavailableRef.current?.('Connexion Google non configuree.');
      return;
    }

    const render = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) void callbackRef.current(response.credential);
        },
        cancel_on_tap_outside: true,
      });
      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: label,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(360, containerRef.current.clientWidth || 360),
        locale,
      });
      setReady(true);
    };

    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (window.google) {
      render();
      return;
    }
    if (existing) {
      existing.addEventListener('load', render, { once: true });
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => unavailableRef.current?.('Impossible de charger Google. Verifiez votre connexion.');
    document.head.appendChild(script);
  }, [isNative, clientId, label, locale]);

  if (isNative) {
    return <NativeGoogleButton onCredential={onCredential} disabled={disabled} label={label} onError={onError} />;
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : undefined} aria-busy={!ready}>
      <div ref={containerRef} className="flex min-h-11 w-full justify-center" />
    </div>
  );
}
