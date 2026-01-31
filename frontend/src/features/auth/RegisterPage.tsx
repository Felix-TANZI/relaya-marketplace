// frontend/src/features/auth/RegisterPage.tsx
// Page d'inscription des utilisateurs
// Permet aux nouveaux utilisateurs de créer un compte

import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { RegisterData } from '@/services/api/auth';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
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

  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.password2) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      showToast(t('auth.register_success'), 'success');
      navigate('/');
    } catch (error: unknown) {
      console.error('Register error:', error);
      const msg = extractBackendErrorMessage(error, t('auth.register_error'));
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
            <UserPlus className="text-white" size={32} />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-text mb-2">
            {t('auth.register')}
          </h1>
          <p className="text-dark-text-secondary">
            {t('home.cta_description')}
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

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('auth.email_placeholder')}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('auth.first_name')}
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder={t('auth.first_name_placeholder')}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                    {t('auth.last_name')}
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder={t('auth.last_name_placeholder')}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-holo-cyan focus:ring-2 focus:ring-holo-cyan/20 transition-all outline-none text-dark-text placeholder:text-dark-text-tertiary"
                  />
                </div>
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-dark-text-secondary mb-2">
                  {t('auth.password_confirm')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-text-tertiary" size={20} />
                  <input
                    type="password"
                    value={formData.password2}
                    onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
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
              {t('auth.register_button')}
            </Button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <span className="text-dark-text-secondary">{t('auth.have_account')} </span>
            <Link to="/login" className="text-holo-cyan hover:text-holo-purple transition-colors font-medium">
              {t('auth.login')}
            </Link>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link to="/" className="text-dark-text-tertiary hover:text-dark-text transition-colors text-sm">
              ← {t('checkout.back_home')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
