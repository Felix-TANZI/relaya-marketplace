import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Landmark,
  Lock,
  Mail,
  MapPinned,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { inferPortalRoleFromPath, isDedicatedPortal, portalHomePath, portalRole, type PortalRole } from '@/config/portals';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

const portalCopy: Record<PortalRole, {
  label: string;
  title: string;
  hint: string;
  accent: string;
  accentDark: string;
  soft: string;
  icon: typeof ShieldCheck;
  logo: string;
}> = {
  client: {
    label: 'BelivaY Marketplace',
    title: 'Connexion client',
    hint: 'Accédez à vos commandes, favoris, litiges et suivis colis.',
    accent: '#F47920',
    accentDark: '#C4510B',
    soft: 'rgba(244,121,32,.14)',
    icon: ShoppingBag,
    logo: '/belivay-logo.png',
  },
  seller: {
    label: 'Portail vendeur',
    title: 'Connexion vendeur',
    hint: 'Accès réservé aux boutiques validées par BelivaY.',
    accent: '#EA580C',
    accentDark: '#9A3412',
    soft: 'rgba(234,88,12,.14)',
    icon: Store,
    logo: '/belivay-logo.png',
  },
  courier: {
    label: 'Portail livreur',
    title: 'Connexion livreur',
    hint: 'Accès terrain pour missions, scans, preuves et litiges.',
    accent: '#16A34A',
    accentDark: '#166534',
    soft: 'rgba(22,163,74,.14)',
    icon: Truck,
    logo: '/belivay-logo-mark.png',
  },
  admin: {
    label: 'Console interne',
    title: 'Connexion administrateur',
    hint: 'Accès strictement réservé aux comptes staff BelivaY.',
    accent: '#DC2626',
    accentDark: '#991B1B',
    soft: 'rgba(220,38,38,.14)',
    icon: Landmark,
    logo: '/admin-belivay-logo-red.png',
  },
  delivery_organization: {
    label: 'Portail organisation',
    title: 'Connexion organisation de livraison',
    hint: 'Gérez missions, livreurs, véhicules, zones, contrat et KYC.',
    accent: '#0284C7',
    accentDark: '#075985',
    soft: 'rgba(2,132,199,.14)',
    icon: Building2,
    logo: '/belivay-logo-delivery-org.png',
  },
  relay_point: {
    label: 'Portail point relais',
    title: 'Connexion point relais',
    hint: 'Accès réception, stockage, retraits, preuves et incidents colis.',
    accent: '#1E3A8A',
    accentDark: '#172554',
    soft: 'rgba(30,58,138,.14)',
    icon: MapPinned,
    logo: '/belivay-logo-relay-point.png',
  },
};

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, verify2FA } = useAuth();
  const { showToast } = useToast();
  const loginState = location.state as {
    from?: string;
    googleTwoFA?: { userId: number; email: string };
  } | null;
  // Le site web sert tous les portails depuis un seul build (portalRole y
  // vaut toujours 'client') : on devine alors le portail vise depuis la
  // page qui a redirige ici. Les apps mobiles dediees gardent leur
  // portalRole fixe, deja correct.
  const effectivePortalRole = isDedicatedPortal ? portalRole : inferPortalRoleFromPath(loginState?.from);
  const copy = portalCopy[effectivePortalRole];
  const PortalIcon = copy.icon;
  const [showPassword, setShowPassword] = useState(false);
  const [secureMode, setSecureMode] = useState(isDedicatedPortal);
  const [loading, setLoading] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [twoFA, setTwoFA] = useState<{ userId: number; email: string } | null>(
    loginState?.googleTwoFA ?? null,
  );
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const afterLoginPath = loginState?.from && !loginState.from.startsWith('/login')
    ? loginState.from
    : portalHomePath;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(formData.username, formData.password);
      if (res.twoFactorRequired) {
        setTwoFA({ userId: res.userId, email: res.email });
        setCode('');
        showToast(`Un code de vérification a été envoyé à ${res.email}`, 'success');
      } else {
        showToast(t('auth.login_success') || 'Connexion réussie !', 'success');
        navigate(afterLoginPath, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast(t('auth.login_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFA || code.trim().length < 6) {
      showToast('Entrez le code à 6 chiffres.', 'error');
      return;
    }
    setVerifying(true);
    try {
      await verify2FA(twoFA.userId, code.trim());
      showToast(t('auth.login_success') || 'Connexion réussie !', 'success');
      navigate(afterLoginPath, { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Code invalide.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await login(formData.username, formData.password);
      showToast('Nouveau code envoyé.', 'success');
    } catch {
      showToast('Impossible de renvoyer le code.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleLogin = async (credential: string) => {
    setLoading(true);
    try {
      const res = await googleLogin(credential);
      if (res.twoFactorRequired) {
        setTwoFA({ userId: res.userId, email: res.email });
        setCode('');
        showToast(`Un code de verification a ete envoye a ${res.email}`, 'success');
      } else {
        showToast(t('auth.login_success') || 'Connexion reussie !', 'success');
        navigate(afterLoginPath, { replace: true });
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Connexion Google impossible.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/images/auth/login.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/5 to-black/25" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/25 bg-white/45 p-7 shadow-2xl backdrop-blur-2xl">
            <div className="mb-6">
              {isDedicatedPortal ? (
                <div className="mb-5 flex justify-center">
                  <img
                    src={copy.logo}
                    alt="BelivaY"
                    className="h-14 w-auto max-w-[220px] object-contain drop-shadow-[0_10px_24px_rgba(15,23,42,.22)]"
                  />
                </div>
              ) : (
                <div
                  className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[.12em]"
                  style={{ background: copy.soft, color: copy.accentDark }}
                >
                  <PortalIcon size={14} />
                  {copy.label}
                </div>
              )}
              <h1
                className="text-3xl font-black text-gray-950"
                style={{ textShadow: '0 2px 10px rgba(255,255,255,.85)' }}
              >
                {copy.title}
              </h1>
              <p
                className="mt-2 text-sm font-semibold leading-6 text-gray-800"
                style={{ textShadow: '0 1px 6px rgba(255,255,255,.72)' }}
              >
                {copy.hint}
              </p>
            </div>

            {!twoFA && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/40 bg-white/35 p-1.5">
                  <button
                    type="button"
                    onClick={() => setSecureMode(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-black transition"
                    style={{
                      background: !secureMode ? copy.accent : 'transparent',
                      color: !secureMode ? '#fff' : '#374151',
                    }}
                  >
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecureMode(true)}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-black transition"
                    style={{
                      background: secureMode ? copy.accent : 'transparent',
                      color: secureMode ? '#fff' : '#374151',
                    }}
                  >
                    <ShieldCheck size={16} />
                    2FA
                  </button>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/35 p-4">
                  <p className="text-xs font-semibold leading-5 text-gray-800">
                    {secureMode
                      ? "Si la double authentification est activée sur ce compte, le code sera demandé après le mot de passe."
                      : "Connexion classique. La double authentification reste disponible depuis les paramètres du profil."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    {t('auth.email')} / {t('auth.username')} / Téléphone
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder={t('auth.username_placeholder') || 'admin1, email ou +2376...'}
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-white/45 bg-white/35 py-3.5 pl-12 pr-4 font-medium text-gray-900 transition-all placeholder:text-gray-600 focus:bg-white/50 focus:outline-none focus:ring-4"
                      style={{ '--tw-ring-color': copy.soft } as React.CSSProperties}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-900">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      disabled={loading}
                      required
                      className="w-full rounded-xl border border-white/45 bg-white/35 py-3.5 pl-12 pr-12 font-medium text-gray-900 transition-all placeholder:text-gray-600 focus:bg-white/50 focus:outline-none focus:ring-4"
                      style={{ '--tw-ring-color': copy.soft } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 transition"
                      style={{ color: showPassword ? copy.accent : undefined }}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {!isDedicatedPortal ? (
                    <Link to="/register" className="text-sm font-bold hover:underline" style={{ color: copy.accent }}>
                      {t('auth.register')}
                    </Link>
                  ) : (
                    <span className="text-xs font-semibold leading-5 text-gray-700">
                      Compte fourni par BelivaY.
                    </span>
                  )}
                  <Link to="/forgot-password" className="text-sm font-semibold hover:underline" style={{ color: copy.accent }}>
                    {t('auth.forgot_password') || 'Mot de passe oublié ?'}
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${copy.accent}, ${copy.accentDark})` }}
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  ) : (
                    <>
                      {t('auth.login_button')}
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                {!googleUnavailable && (
                  <>
                    <div className="relative flex items-center py-1">
                      <div className="h-px flex-1 bg-white/45" />
                      <span className="px-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-700">
                        Ou
                      </span>
                      <div className="h-px flex-1 bg-white/45" />
                    </div>
                    <GoogleAuthButton
                      onCredential={handleGoogleLogin}
                      disabled={loading}
                      label="signin_with"
                      locale={String(i18n.language || 'fr').split('-')[0]}
                      onUnavailable={() => setGoogleUnavailable(true)}
                    />
                  </>
                )}
              </form>
            )}

            {twoFA && (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck size={20} style={{ color: copy.accent }} />
                  <h2 className="text-lg font-bold text-gray-900">Vérification en deux étapes</h2>
                </div>
                <p className="text-center text-sm text-gray-800">
                  Un code à 6 chiffres a été envoyé à <span className="font-semibold">{twoFA.email}</span>.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  disabled={verifying}
                  className="w-full rounded-xl border border-white/45 bg-white/40 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 transition-all placeholder:text-gray-500 focus:bg-white/55 focus:outline-none focus:ring-4"
                  style={{ '--tw-ring-color': copy.soft } as React.CSSProperties}
                />
                <button
                  type="submit"
                  disabled={verifying || code.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-lg transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${copy.accent}, ${copy.accentDark})` }}
                >
                  {verifying ? <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" /> : <>Vérifier <ArrowRight size={20} /></>}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setTwoFA(null); setCode(''); }}
                    className="font-semibold text-gray-800"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="font-semibold hover:underline disabled:opacity-50"
                    style={{ color: copy.accent }}
                  >
                    {resending ? 'Envoi...' : 'Renvoyer le code'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {!isDedicatedPortal && (
            <div className="mt-5 text-center">
              <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-800">
                <span>←</span> {t('checkout.back_home') || "Retour à l'accueil"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
