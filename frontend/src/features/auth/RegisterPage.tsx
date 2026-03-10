import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
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

 const extractBackendErrorMessage = (error: unknown, fallback: string): string => {
 const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

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

 if (error instanceof Error) {
 const msg = (error.message ?? '').trim();
 if (!msg) return fallback;

 if (msg.includes('{')) {
 try {
 const match = msg.match(/\{.*\}/);
 if (match) {
 const parsed = JSON.parse(match[0]) as Record<string, unknown>;
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
 email: '',
 password: '',
 password2: '',
 first_name: '',
 last_name: '',
 });
 const [loading, setLoading] = useState(false);
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

 if (!formData.username.trim()) newErrors.username = 'Username is required';
 if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
 if (formData.password.length < 8) newErrors.password = 'Minimum 8 characters';
 if (formData.password !== formData.password2) {
 newErrors.password2 = 'Passwords do not match';
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
 } catch (error: unknown) {
 console.error('Register error:', error);
 const msg = extractBackendErrorMessage(error, t('auth.register_error'));
 showToast(msg, 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const { name, value } = e.target;
 setFormData({ ...formData, [name]: value });
 if (errors[name]) setErrors({ ...errors, [name]: '' });
 };

 return (
 <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
 {/* Animated background */}
 <div className="absolute inset-0 overflow-hidden">
 <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
 <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
 </div>

 <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
 <div className="w-full max-w-md space-y-8">
 {/* Header */}
 <div className="text-center space-y-3">
 <Link to="/" className="inline-block">
 <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
 Relaya
 </h1>
 </Link>
 <h2 className="text-3xl font-bold text-white">
 {t('auth.register')}
 </h2>
 <p className="text-slate-400">
 {t('auth.have_account')}{' '}
 <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">
 {t('auth.login')}
 </Link>
 </p>
 </div>

 {/* Form Card */}
 <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl p-8 shadow-xl space-y-6">
 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Username */}
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.username')}
 </label>
 <div className="relative">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type="text"
 name="username"
 value={formData.username}
 onChange={handleChange}
 placeholder={t('auth.username_placeholder')}
 disabled={loading}
 className={`w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 ${
 errors.username ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20'
 }`}
 />
 </div>
 <p className="text-xs text-slate-400">{t('auth.username_hint')}</p>
 {errors.username && <p className="text-red-400 text-sm">{errors.username}</p>}
 </div>

 {/* Email */}
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.email')}
 </label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type="email"
 name="email"
 value={formData.email}
 onChange={handleChange}
 placeholder={t('auth.email_placeholder')}
 disabled={loading}
 className={`w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 ${
 errors.email ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20'
 }`}
 />
 </div>
 {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
 </div>

 {/* First & Last Name */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.first_name')}
 </label>
 <input
 type="text"
 name="first_name"
 value={formData.first_name}
 onChange={handleChange}
 placeholder={t('auth.first_name_placeholder')}
 disabled={loading}
 className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
 />
 </div>
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.last_name')}
 </label>
 <input
 type="text"
 name="last_name"
 value={formData.last_name}
 onChange={handleChange}
 placeholder={t('auth.last_name_placeholder')}
 disabled={loading}
 className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
 />
 </div>
 </div>

 {/* Password */}
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.password')}
 </label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type={showPassword ? 'text' : 'password'}
 name="password"
 value={formData.password}
 onChange={(e) => handlePasswordChange(e.target.value)}
 placeholder={t('auth.password_placeholder')}
 disabled={loading}
 className={`w-full pl-12 pr-12 py-3 rounded-lg bg-white/5 border transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 ${
 errors.password ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20'
 }`}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition"
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
 : 'bg-slate-600'
 }`}
 ></div>
 ))}
 </div>
 <p className="text-xs text-slate-400">
 {passwordStrength < 2 ? 'Weak' : passwordStrength < 4 ? 'Medium' : 'Strong'} password
 </p>
 </div>
 )}

 {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
 </div>

 {/* Confirm Password */}
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.password_confirm')}
 </label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type={showConfirmPassword ? 'text' : 'password'}
 name="password2"
 value={formData.password2}
 onChange={handleChange}
 placeholder={t('auth.password_placeholder')}
 disabled={loading}
 className={`w-full pl-12 pr-12 py-3 rounded-lg bg-white/5 border transition-all outline-none text-white placeholder:text-slate-500 focus:bg-white/10 ${
 errors.password2 ? 'border-red-500 focus:ring-2 focus:ring-red-500/50' : 'border-white/10 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20'
 }`}
 />
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition"
 disabled={loading}
 >
 {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
 </button>
 </div>
 {errors.password2 && <p className="text-red-400 text-sm">{errors.password2}</p>}
 </div>

 {/* Submit Button */}
 <Button
 type="submit"
 disabled={loading}
 className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
 >
 {loading ? t('common.loading') : (
 <>
 {t('auth.register_button')}
 <ArrowRight size={20} />
 </>
 )}
 </Button>
 </form>

 {/* Security Features */}
 <div className="pt-6 border-t border-white/10 space-y-3">
 {(t('auth.security_features', { returnObjects: true }) as string[]).map((feature, idx) => (
 <div key={idx} className="flex items-center gap-2">
 <CheckCircle size={18} className="text-green-400" />
 <span className="text-sm text-slate-400">{feature}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Footer Link */}
 <div className="text-center">
 <Link to="/" className="text-sm text-slate-400 hover:text-slate-300 transition">
 ← {t('checkout.back_home')}
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}