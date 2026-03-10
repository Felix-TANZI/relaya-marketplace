import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function LoginPage() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { login } = useAuth();
 const { showToast } = useToast();
 const [showPassword, setShowPassword] = useState(false);
 const [rememberMe, setRememberMe] = useState(false);

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
 const [errors, setErrors] = useState<Record<string, string>>({});

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 // Validation
 const newErrors: Record<string, string> = {};
 if (!formData.username.trim()) newErrors.username = 'Username is required';
 if (!formData.password.trim()) newErrors.password = 'Password is required';
 
 if (Object.keys(newErrors).length > 0) {
 setErrors(newErrors);
 return;
 }

 setLoading(true);
 setErrors({});

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
 {t('auth.login')}
 </h2>
 <p className="text-slate-400">
 {t('auth.no_account')}{' '}
 <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition">
 {t('auth.register')}
 </Link>
 </p>
 </div>

 {/* Form Card */}
 <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl p-8 shadow-xl space-y-6">
 <form onSubmit={handleSubmit} className="space-y-5">
 {/* Username Field */}
 <div className="space-y-2">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.username')}
 </label>
 <div className="relative">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type="text"
 value={formData.username}
 onChange={(e) => {
 setFormData({ ...formData, username: e.target.value });
 if (errors.username) setErrors({ ...errors, username: '' });
 }}
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

 {/* Password Field */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <label className="block text-sm font-medium text-slate-200">
 {t('auth.password')}
 </label>
 <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 transition">
 {t('auth.forgot_password')}?
 </Link>
 </div>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
 <input
 type={showPassword ? 'text' : 'password'}
 value={formData.password}
 onChange={(e) => {
 setFormData({ ...formData, password: e.target.value });
 if (errors.password) setErrors({ ...errors, password: '' });
 }}
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
 {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
 </div>

 {/* Remember Me */}
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="remember"
 checked={rememberMe}
 onChange={(e) => setRememberMe(e.target.checked)}
 disabled={loading}
 className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 cursor-pointer"
 />
 <label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
 {t('auth.remember_me')}
 </label>
 </div>

 {/* Submit Button */}
 <Button
 type="submit"
 disabled={loading}
 className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {loading ? t('common.loading') : (
 <>
 {t('auth.login_button')}
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
 ← {t('product.back_to_catalog')}
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}