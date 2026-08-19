import { useEffect, useRef, useState } from 'react';

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
}

export default function GoogleAuthButton({
  onCredential,
  disabled = false,
  label = 'continue_with',
  locale = 'fr',
  onUnavailable,
}: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const unavailableRef = useRef(onUnavailable);
  const [ready, setReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    callbackRef.current = onCredential;
    unavailableRef.current = onUnavailable;
  }, [onCredential, onUnavailable]);

  useEffect(() => {
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
  }, [clientId, label, locale]);

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : undefined} aria-busy={!ready}>
      <div ref={containerRef} className="flex min-h-11 w-full justify-center" />
    </div>
  );
}
