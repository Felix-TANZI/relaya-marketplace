import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    setPasswordStrength(calculatePasswordStrength(value));
    if (errors.password) setErrors({ ...errors, password: '' });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.username.trim()) newErrors.username = 'Nom d\'utilisateur requis';
    if (!formData.email.includes('@')) newErrors.email = 'Email valide requis';
    if (formData.password.length < 8) newErrors.password = 'Minimum 8 caractères';
    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Les mots de passe ne correspondent pas';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register(formData);
      showToast(t('auth.register_success'), 'success');
      navigate('/');
    } catch (error) {
      console.error('Register error:', error);
      showToast(t('auth.register_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const securityFeatures = t('auth.security_features', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
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
              {t('auth.register')}
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-2">
              {t('auth.have_account')}{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-bg-dark-alt rounded-2xl shadow-soft p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                {t('auth.username')}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" size={20} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder={t('auth.username_placeholder')}
                  disabled={loading}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary ${
                    errors.username ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
              </div>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{t('auth.username_hint')}</p>
              {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('auth.email_placeholder')}
                  disabled={loading}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary ${
                    errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                  {t('auth.first_name')}
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder={t('auth.first_name_placeholder')}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                  {t('auth.last_name')}
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder={t('auth.last_name_placeholder')}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary"
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
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  disabled={loading}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary ${
                    errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
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

              {/* Password Strength */}
              {formData.password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < passwordStrength
                            ? i < 2
                              ? 'bg-red-500'
                              : i < 4
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {passwordStrength < 2 ? 'Faible' : passwordStrength < 4 ? 'Moyen' : 'Fort'}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-light dark:text-text-dark">
                {t('auth.password_confirm')}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password2"
                  value={formData.password2}
                  onChange={handleChange}
                  placeholder={t('auth.password_placeholder')}
                  disabled={loading}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border transition-all outline-none text-text-light dark:text-text-dark placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary ${
                    errors.password2 ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password2 && <p className="text-red-500 text-sm">{errors.password2}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mt-6"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {t('auth.register_button')}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Security Features */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {securityFeatures.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{feature}</span>
              </div>
            ))}
          </div>
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