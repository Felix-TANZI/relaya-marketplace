import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { useTranslation } from 'react-i18next';

export interface AppleCredential {
  identityToken: string;
  authorizationCode: string | null;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
}

interface AppleAuthButtonProps {
  onCredential: (credential: AppleCredential) => Promise<void>;
  disabled?: boolean;
  onError?: (message: string) => void;
}

function AppleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="fill-white">
      <path d="M16.36 12.9c.02 2.6 2.28 3.46 2.3 3.47-.02.05-.36 1.24-1.2 2.46-.72 1.05-1.47 2.1-2.65 2.12-1.16.02-1.53-.69-2.86-.69-1.32 0-1.74.67-2.83.71-1.14.04-2.01-1.11-2.74-2.16-1.6-2.3-2.82-6.5-1.18-9.35.82-1.41 2.28-2.3 3.87-2.33 1.12-.02 2.18.75 2.86.75.68 0 1.97-.93 3.32-.79.57.02 2.16.21 3.18 1.71-.08.05-1.9 1.11-1.87 3.3M14.2 4.42c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22" />
    </svg>
  );
}

/**
 * Bouton "Sign in with Apple" — rendu sur TOUTES les plateformes (iOS, Android,
 * web), par choix produit : les deux fournisseurs tiers doivent apparaitre
 * partout, au meme titre que Google.
 *
 * Etat reel du flux selon la plateforme :
 *  - iOS natif : fonctionnel (ASAuthorizationController via le plugin Capacitor).
 *    C'est la seule plateforme ou Apple l'impose (App Review Guideline 4.8, des
 *    lors qu'un fournisseur tiers comme Google est propose).
 *  - web : fonctionne UNIQUEMENT si un « Services ID » Apple est configure.
 *    C'est un identifiant distinct du bundle ID de l'app, a creer dans le compte
 *    Apple Developer avec son URL de redirection, puis a fournir au build via
 *    VITE_APPLE_SERVICES_ID et a ajouter a APPLE_CLIENT_IDS cote backend (sans
 *    quoi le backend rejette le jeton, son audience ne correspondant pas).
 *  - Android : le plugin n'implemente pas cette plateforme.
 *
 * Hors cas fonctionnel, le clic n'echoue pas en silence : l'erreur est remontee
 * a `onError` et affichee en toast (voir handleClick).
 */
export default function AppleAuthButton({ onCredential, disabled = false, onError }: AppleAuthButtonProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);

  // iOS s'authentifie avec le bundle ID de l'app ; les autres plateformes
  // exigent le Services ID. Sans celui-ci, on retombe sur le bundle ID : le
  // flux echouera, mais proprement et avec un message.
  const servicesId = import.meta.env.VITE_APPLE_SERVICES_ID?.trim();
  const clientId = Capacitor.getPlatform() === 'ios' ? 'com.belivay.client' : servicesId || 'com.belivay.client';

  const handleClick = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      const { response } = await SignInWithApple.authorize({
        clientId,
        redirectURI: 'https://belivay.com/auth/apple/callback',
        scopes: 'email name',
      });
      await onCredential({
        identityToken: response.identityToken,
        authorizationCode: response.authorizationCode,
        email: response.email,
        givenName: response.givenName,
        familyName: response.familyName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cancelled = /cancel/i.test(message) || /1001/.test(message);
      if (!cancelled) {
        console.error('SignInWithApple.authorize() a echoue', error);
        onError?.(t('cl6_social_auth.apple_login_failed'));
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
      className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-black bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <AppleGlyph />
      {pending ? t('cl6_social_auth.apple_connecting') : t('cl6_social_auth.continue_with_apple')}
    </button>
  );
}
