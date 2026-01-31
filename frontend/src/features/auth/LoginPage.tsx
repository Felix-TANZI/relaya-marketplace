// frontend/src/features/auth/LoginPage.tsx
// Page de connexion pour les utilisateurs
// Permet aux utilisateurs de se connecter à leur compte

import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const extractBackendErrorMessage = (error: unknown, fallback: string): string => {
    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

    // Axios-like shape: error.response.data
    if (isRecord(error) && 'response' in error) {
      const response = (error as Record<string, unknown>).response;
      if (isRecord(response) && 'data' in response) {
        const data = (response as Record<string, unknown>).data;

        if (typeof data === 'string' && data.trim().length > 0) return data;

        if (isRecord(data)) {
          const firstValue = Object.values(data)[0];
          if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
          if (typeof firstValue === 'string' && firstValue.trim().length > 0) return firstValue;
        }
      }
    }

    // Native Error: error.message (sometimes embeds JSON)
    if (error instanceof Error) {
      const msg = (error.message ?? '').trim();
      if (!msg) return fallback;

      if (msg.includes('{')) {
        try {
          const match = msg.match(/\{.*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]) as unknown;
            if (isRecord(parsed)) {
              const firstValue = Object.values(parsed)[0];
              if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
              if (typeof firstValue === 'string' && firstValue.trim().length > 0) return firstValue;
            }
          }
        } catch {
          // ignore
        }
      }

      return msg;
    }

    return fallback;
  };

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      showToast(t('auth.login_success'), 'success');
      navigate('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const msg = extractBackendErrorMessage(error, t('auth.login_error'));
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-holographic flex items-center justify-center">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-text mb-2">
            {t('auth.login')}
          </h1>
          <p className="text-dark-text-secondary">
            {t('hero.description')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-2xl p-8 border border-white/10">
            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  {t('auth.username')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder={t('auth.username_placeholder')}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
                <p className="text-xs text-dark-text-tertiary mt-1">
                  Lettres, chiffres et @.+-_ seulement (pas d&apos;espaces)
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={t('auth.password_placeholder')}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              className="w-full mt-6"
              isLoading={loading}
            >
              {t('auth.login_button')}
            </Button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <span className="text-dark-text-secondary">{t('auth.no_account')} </span>
            <Link to="/register" className="text-holo-cyan hover:text-holo-purple transition-colors font-medium">
              {t('auth.register')}
            </Link>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link to="/" className="text-dark-text-tertiary hover:text-dark-text transition-colors text-sm">
              ← {t('product.back_to_catalog')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
