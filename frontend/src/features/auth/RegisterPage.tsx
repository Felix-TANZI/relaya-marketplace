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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(/images/auth/login.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-6">
          {/* Logo et Titre - SANS fond */}
          <div className="text-center space-y-4">
            {/* Logo */}
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
              {t('auth.register')}
            </h1>
            
            {/* Texte */}
            <p 
              className="text-gray-800"
              style={{ textShadow: '0 1px 5px rgba(255,255,255,0.8)' }}
            >
              {t('auth.have_account')}{' '}
              <Link 
                to="/login" 
                className="text-primary font-semibold hover:underline"
                style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
              >
                {t('auth.login')}
              </Link>
            </p>
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-2xl bg-white/40 rounded-3xl p-8 shadow-2xl border border-white/20">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="space-y-2">
                <label 
                  className="block text-sm font-semibold text-gray-900"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.username')}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder={t('auth.username_placeholder')}
                    disabled={loading}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600 ${
                      errors.username 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-800 font-medium" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}>
                  {t('auth.username_hint')}
                </p>
                {errors.username && <p className="text-red-600 text-sm font-semibold">{errors.username}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label 
                  className="block text-sm font-semibold text-gray-900"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('auth.email_placeholder')}
                    disabled={loading}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600 ${
                      errors.email 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-red-600 text-sm font-semibold">{errors.email}</p>}
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label 
                    className="block text-sm font-semibold text-gray-900"
                    style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                  >
                    {t('auth.first_name')}
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder={t('auth.first_name_placeholder')}
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40 transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <label 
                    className="block text-sm font-semibold text-gray-900"
                    style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                  >
                    {t('auth.last_name')}
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder={t('auth.last_name_placeholder')}
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40 transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600"
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
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    disabled={loading}
                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600 ${
                      errors.password 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40'
                    }`}
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
                              : 'bg-gray-300'
                          }`}
                        ></div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-800 font-semibold" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}>
                      {passwordStrength < 2 ? 'Faible' : passwordStrength < 4 ? 'Moyen' : 'Fort'}
                    </p>
                  </div>
                )}
                {errors.password && <p className="text-red-600 text-sm font-semibold">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label 
                  className="block text-sm font-semibold text-gray-900"
                  style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
                >
                  {t('auth.password_confirm')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={20} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="password2"
                    value={formData.password2}
                    onChange={handleChange}
                    placeholder={t('auth.password_placeholder')}
                    disabled={loading}
                    className={`w-full pl-12 pr-12 py-3.5 rounded-xl backdrop-blur-xl bg-white/30 border transition-all outline-none text-gray-900 font-medium placeholder:text-gray-600 ${
                      errors.password2 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' 
                        : 'border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-primary transition"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password2 && <p className="text-red-600 text-sm font-semibold">{errors.password2}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl mt-6"
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
            <div className="pt-6 mt-6 border-t border-white/30 space-y-3">
              {securityFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                  <span 
                    className="text-sm text-gray-900 font-medium"
                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center">
            <Link 
              to="/" 
              className="text-sm text-gray-800 hover:text-primary transition-colors inline-flex items-center gap-1 font-semibold"
              style={{ textShadow: '0 1px 3px rgba(255,255,255,0.7)' }}
            >
              <span>←</span> {t('checkout.back_home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
