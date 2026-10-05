// frontend/src/features/vendors/v2/ouverture/useVendorLogin.ts
// Logique de l'écran « Connexion » (VD-03) — réutilise l'API d'authentification
// existante (AuthContext.login/googleLogin/appleLogin/verify2FA, déjà branchée
// sur le backend réel) plutôt que d'en réinventer une (VD-D04.A01 : « Garder
// l'API d'authentification »).
//
// Écart assumé avec la maquette : le second facteur réel exposé par
// AuthContext.verify2FA est envoyé par e-mail (voir usePortalLogin.ts et
// authApi.login → {2fa_required, user_id, email}), alors que VD-D04.A05
// décrit un code SMS. Plutôt que d'afficher un texte trompeur ("code envoyé
// par SMS" sur un canal qui est en réalité l'e-mail), l'écran nomme le canal
// réel. Le passage à un canal SMS pour la 2FA de connexion est un changement
// backend hors périmètre de ce lot frontend.
//
// N'utilise pas usePortalLogin.ts (features/auth/portal) : ce hook redirige
// vers `portalHomePath`, une constante figée par VITE_PORTAL_ROLE au build —
// correcte pour un build de portail dédié, mais qui vaudrait '/' dans le build
// web générique où vivent ces écrans v2. On réutilise donc directement les
// fonctions d'AuthContext, avec une redirection fixe vers /seller/dashboard.

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const SELLER_HOME_PATH = '/seller/v2/accueil';

interface TwoFAState {
  userId: number;
  email: string;
}

interface VendorLoginRouteState {
  from?: string;
}

export function useVendorLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, appleLogin, verify2FA } = useAuth();

  const routeState = (location.state ?? null) as VendorLoginRouteState | null;
  const afterLoginPath = routeState?.from && !routeState.from.startsWith('/login') ? routeState.from : SELLER_HOME_PATH;

  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [twoFA, setTwoFA] = useState<TwoFAState | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [view, setView] = useState<'credentials' | 'otp' | 'forgot'>('credentials');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setErrorKey(null);
  };

  const finishLogin = () => {
    navigate(afterLoginPath, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorKey(null);
    try {
      const res = await login(credentials.username, credentials.password);
      if (res.twoFactorRequired) {
        setTwoFA({ userId: res.userId, email: res.email });
        setCode('');
        setView('otp');
      } else {
        finishLogin();
      }
    } catch {
      setErrorKey('sl9_ouverture.login_error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    setErrorKey(null);
    try {
      const res = await googleLogin(credential);
      if (res.twoFactorRequired) {
        setTwoFA({ userId: res.userId, email: res.email });
        setCode('');
        setView('otp');
      } else {
        finishLogin();
      }
    } catch {
      setErrorKey('sl9_ouverture.google_login_error');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleCredential = async (credential: {
    identityToken: string;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
  }) => {
    setLoading(true);
    setErrorKey(null);
    try {
      const res = await appleLogin(credential);
      if (res.twoFactorRequired) {
        setTwoFA({ userId: res.userId, email: res.email });
        setCode('');
        setView('otp');
      } else {
        finishLogin();
      }
    } catch {
      setErrorKey('sl9_ouverture.apple_login_error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA || code.trim().length < 6) return;
    setVerifying(true);
    setErrorKey(null);
    try {
      await verify2FA(twoFA.userId, code.trim());
      finishLogin();
    } catch {
      setErrorKey('sl9_ouverture.otp_error_invalid');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorKey(null);
    try {
      await login(credentials.username, credentials.password);
    } catch {
      setErrorKey('sl9_ouverture.otp_error_send');
    } finally {
      setResending(false);
    }
  };

  const cancelTwoFA = () => {
    setTwoFA(null);
    setCode('');
    setView('credentials');
  };

  return {
    view,
    setView,
    credentials,
    handleChange,
    showPassword,
    setShowPassword,
    loading,
    errorKey,
    handleSubmit,
    handleGoogleCredential,
    handleAppleCredential,
    twoFA,
    code,
    setCode,
    verifying,
    handleVerify,
    resending,
    handleResend,
    cancelTwoFA,
  };
}

export type VendorLoginController = ReturnType<typeof useVendorLogin>;
