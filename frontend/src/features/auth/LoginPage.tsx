import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, verify2FA } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [twoFA, setTwoFA] = useState<{ userId: number; email: string } | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

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
        navigate('/');
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
    if (!twoFA || code.trim().length < 6) { showToast('Entrez le code à 6 chiffres.', 'error'); return; }
    setVerifying(true);
    try {
      await verify2FA(twoFA.userId, code.trim());
      showToast(t('auth.login_success') || 'Connexion réussie !', 'success');
      navigate('/');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Code invalide.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await login(formData.username, formData.password); // renvoie un nouveau code
      showToast('Nouveau code envoyé.', 'success');
    } catch {
      showToast('Impossible de renvoyer le code.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image - Couvre tout l'écran */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(/images/auth/login.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Overlay léger */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Logo et Titre - SANS fond, juste text-shadow pour lisibilité */}
          <div className="text-center space-y-4">
            {/* Logo Belivay */}
            <div className="inline-flex items-center justify-center">
              <img
                src="/belivay-logo.png"
                alt="BelivaY"
                className="h-14 w-auto object-contain drop-shadow-[0_2px_10px_rgba(255,255,255,0.9)]"
              />
            </div>
            
            {/* Titre */}
            <h1 
              className="text-3xl font-bold text-gray-900"
              style={{ textShadow: '0 2px 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.6)' }}
            >
              {t('auth.login')}
            </h1>
            
            {/* Texte d'inscription */}
            <p 
              className="text-gray-800"
              style={{ textShadow: '0 1px 5px rgba(255,255,255,0.8)' }}
            >
              {t('auth.no_account')}{' '}
              <Link 
                to="/register" 
                className="text-primary font-semibold hover:underline"
                style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
              >
                {t('auth.register')}
              </Link>
            </p>
          </div>

          {/* Form Card - Glassmorphism TRÈS transparent */}
          <div className="backdrop-blur-2xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
            {!twoFA && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email/Username */}
              <div className="space-y-2">
                <label 
                  className="block text-sm font-semibold text-gray-900"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.email')} / {t('auth.username')}
                </label>
                <div className="relative">
                  <Mail 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" 
                    size={20} 
                  />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder={t('auth.username_placeholder') || "FelixTANZI"}
                    disabled={loading}
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border border-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40 transition-all text-gray-900 font-medium placeholder:text-gray-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label 
                  className="block text-sm font-semibold text-gray-900"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" 
                    size={20} 
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••"
                    disabled={loading}
                    required
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border border-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40 transition-all text-gray-900 font-medium placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-primary transition"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline font-semibold"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.forgot_password') || 'Mot de passe oublié ?'}
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    {t('auth.login_button')}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
            )}

            {twoFA && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex items-center gap-2 justify-center">
                <ShieldCheck size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-gray-900" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}>
                  Vérification en deux étapes
                </h2>
              </div>
              <p className="text-center text-sm text-gray-800" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.6)' }}>
                Un code à 6 chiffres a été envoyé à <span className="font-semibold">{twoFA.email}</span>.
              </p>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                disabled={verifying}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border border-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40 transition-all text-gray-900 placeholder:text-gray-500"
              />
              <button type="submit" disabled={verifying || code.length < 6}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                {verifying
                  ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  : (<>Vérifier <ArrowRight size={20} /></>)}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setTwoFA(null); setCode(''); }}
                  className="text-gray-800 hover:text-primary font-semibold" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}>
                  ← Retour
                </button>
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-primary hover:underline font-semibold disabled:opacity-50" style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}>
                  {resending ? 'Envoi…' : 'Renvoyer le code'}
                </button>
              </div>
            </form>
            )}
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link 
              to="/" 
              className="text-sm text-gray-800 hover:text-primary transition-colors inline-flex items-center gap-1 font-semibold"
              style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
            >
              <span>←</span> {t('checkout.back_home') || "Retour à l'accueil"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
