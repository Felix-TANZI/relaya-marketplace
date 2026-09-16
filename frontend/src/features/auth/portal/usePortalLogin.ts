import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { portalHomePath } from '@/config/portals';

interface TwoFAState {
  userId: number;
  email: string;
}

interface LoginRouteState {
  from?: string;
  googleTwoFA?: TwoFAState;
}

/**
 * Logique partagee par les six portails de connexion.
 *
 * Reprend exactement le flux de l'ancien LoginPage : login → 2FA si le compte
 * l'exige → navigation vers la page demandee, sinon l'accueil du portail. La
 * bascule « Mot de passe / 2FA » a ete supprimee : elle ne changeait qu'un
 * paragraphe, le code arrivant de toute facon apres le mot de passe.
 */
export function usePortalLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, verify2FA } = useAuth();
  const { showToast } = useToast();

  const routeState = (location.state ?? null) as LoginRouteState | null;
  const afterLoginPath = routeState?.from && !routeState.from.startsWith('/login')
    ? routeState.from
    : portalHomePath;

  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [twoFA, setTwoFA] = useState<TwoFAState | null>(routeState?.googleTwoFA ?? null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const finishLogin = () => {
    showToast(t('auth.login_success') || 'Connexion réussie !', 'success');
    navigate(afterLoginPath, { replace: true });
  };

  const askForCode = (state: TwoFAState) => {
    setTwoFA(state);
    setCode('');
    showToast(t('cl6_portal_login.verification_code_sent', { email: state.email }), 'success');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await login(credentials.username, credentials.password);
      if (res.twoFactorRequired) askForCode({ userId: res.userId, email: res.email });
      else finishLogin();
    } catch (error) {
      console.error('Login error:', error);
      showToast(t('auth.login_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const res = await googleLogin(credential);
      if (res.twoFactorRequired) askForCode({ userId: res.userId, email: res.email });
      else finishLogin();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('cl6_portal_login.google_login_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFA || code.trim().length < 6) {
      showToast(t('cl6_portal_login.enter_six_digit_code'), 'error');
      return;
    }
    setVerifying(true);
    try {
      await verify2FA(twoFA.userId, code.trim());
      finishLogin();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('cl6_portal_login.invalid_code'), 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await login(credentials.username, credentials.password);
      showToast(t('cl6_portal_login.new_code_sent'), 'success');
    } catch {
      showToast(t('cl6_portal_login.resend_failed'), 'error');
    } finally {
      setResending(false);
    }
  };

  const cancelTwoFA = () => {
    setTwoFA(null);
    setCode('');
  };

  return {
    t,
    locale: String(i18n.language || 'fr').split('-')[0],
    credentials,
    handleChange,
    remember,
    setRemember,
    showPassword,
    setShowPassword,
    loading,
    handleSubmit,
    googleUnavailable,
    setGoogleUnavailable,
    handleGoogleCredential,
    twoFA,
    code,
    setCode,
    verifying,
    handleVerify,
    resending,
    handleResend,
    cancelTwoFA,
    showToast,
  };
}

export type PortalLoginController = ReturnType<typeof usePortalLogin>;
