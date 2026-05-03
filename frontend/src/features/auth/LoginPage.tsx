import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      showToast(t('auth.login_success') || 'Connexion réussie !', 'success');
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      showToast(t('auth.login_error'), 'error');
    } finally {
      setLoading(false);
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
