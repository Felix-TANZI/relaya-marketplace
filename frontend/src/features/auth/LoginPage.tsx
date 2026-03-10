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
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <span className="text-white font-bold text-2xl">B</span>
            </div>
            <span className="text-3xl font-display font-bold text-text-light dark:text-text-dark">
              BelivaY
            </span>
          </Link>
          <div>
            <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark">
              {t('auth.login')}
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-2">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                {t('auth.register')}
              </Link>
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-bg-dark-alt rounded-2xl shadow-soft p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/Username */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                {t('auth.email')} / {t('auth.username')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" size={20} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={t('auth.email_placeholder')}
                  disabled={loading}
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.password_placeholder')}
                  disabled={loading}
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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

        {/* Footer */}
        <div className="text-center">
          <Link to="/" className="text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors">
            ← {t('checkout.back_home')}
          </Link>
        </div>
      </div>
    </div>
  );
}