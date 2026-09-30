// frontend/src/features/vendors/v2/ouverture/ConnexionPage.tsx
// Écran « Connexion » — VD-03 §1.1 (VD-D04.A01 à A06).
// Carte nuit compacte, SellerPromise, Google/Apple, identifiant + mot de
// passe, code de vérification (nouvel appareil), mot de passe oublié.
// Logique réelle dans useVendorLogin.ts (réutilise AuthContext).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Store } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import AppleAuthButton from '@/components/auth/AppleAuthButton';
import { palette } from '../theme';
import { Card, Collapsible, PrimaryButton } from '../commandes/ui';
import SellerPromise from './SellerPromise';
import { useVendorLogin } from './useVendorLogin';
import { requestPasswordResetLink } from './api';

const OUVRIR_BOUTIQUE_PATH = '/vendeur/ouvrir-boutique';

function CodeBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const p = palette(theme);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="absolute inset-0 opacity-0"
        aria-label="Code"
      />
      <div className="flex gap-2 pointer-events-none">
        {digits.map((d, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center rounded-xl font-black"
            style={{
              height: 52,
              fontSize: 20,
              background: p.cardAlt,
              border: `1px solid ${d.trim() ? p.orange : p.border}`,
              color: p.text,
            }}
          >
            {d.trim() || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForgotPasswordView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setSending(true);
    await requestPasswordResetLink(identifier.trim());
    setSending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${p.green}1F` }}>
          <Mail size={20} color={p.green} />
        </div>
        <p className="font-bold" style={{ fontSize: 14, color: p.text }}>{t('sl9_ouverture.forgot_sent_title')}</p>
        <p className="mt-1.5" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>{t('sl9_ouverture.forgot_sent_desc')}</p>
        <button type="button" onClick={onBack} className="mt-4 font-bold" style={{ fontSize: 12.5, color: p.orange }}>
          {t('sl9_ouverture.back_to_login')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <h1 className="font-black" style={{ fontSize: 17, color: p.text }}>{t('sl9_ouverture.forgot_title')}</h1>
      <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.forgot_subtitle')}</p>
      <input
        type="text"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder={t('sl9_ouverture.forgot_placeholder')}
        className="w-full rounded-xl mt-4 outline-none"
        style={{ padding: '13px 14px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
      />
      <div className="mt-4">
        <PrimaryButton p={p} type="submit" disabled={sending || !identifier.trim()}>
          {sending ? t('sl9_ouverture.sending') : t('sl9_ouverture.forgot_submit')}
        </PrimaryButton>
      </div>
      <div className="mt-4">
        <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
          {t('sl9_ouverture.forgot_how_it_works_body')}
        </Collapsible>
      </div>
      <div className="mt-4 flex items-center justify-between text-center">
        <button type="button" onClick={onBack} className="font-semibold" style={{ fontSize: 12, color: p.textMuted }}>
          {t('sl9_ouverture.back_to_login')}
        </button>
        <a href="mailto:support@belivay.com" className="font-bold" style={{ fontSize: 12, color: p.orange }}>
          {t('sl9_ouverture.contact_support')}
        </a>
      </div>
    </form>
  );
}

export default function ConnexionPage() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const ctl = useVendorLogin();

  const field = 'w-full rounded-xl outline-none';
  const fieldStyle = { padding: '13px 14px 13px 40px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: p.bg }}>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: p.orange }}>
            <Store size={26} color="#fff" />
          </div>
          <h1 className="font-black text-center" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.app_name')}</h1>
        </div>

        {ctl.view === 'credentials' ? <SellerPromise p={p} /> : null}

        <div className="rounded-2xl p-5" style={{ background: p.card, border: `1px solid ${p.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }}>
          {ctl.view === 'forgot' ? (
            <ForgotPasswordView onBack={() => ctl.setView('credentials')} />
          ) : ctl.view === 'otp' && ctl.twoFA ? (
            <form onSubmit={ctl.handleVerify}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1F` }}>
                  <ShieldCheck size={20} color={p.orange} />
                </div>
                <div>
                  <h1 className="font-black" style={{ fontSize: 15, color: p.text }}>{t('sl9_ouverture.otp_title')}</h1>
                  <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.otp_subtitle_new_device')}</p>
                </div>
              </div>
              <p className="mb-3" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
                {t('sl9_ouverture.otp_sent_to')} <span className="font-bold" style={{ color: p.text }}>{ctl.twoFA.email}</span>
              </p>
              <CodeBoxes value={ctl.code} onChange={ctl.setCode} disabled={ctl.verifying} />
              {ctl.errorKey ? <p className="mt-2" style={{ fontSize: 12, color: p.red }}>{t(ctl.errorKey)}</p> : null}
              <div className="mt-4">
                <PrimaryButton p={p} type="submit" disabled={ctl.verifying || ctl.code.length < 6}>
                  {ctl.verifying ? t('sl9_ouverture.verifying') : t('sl9_ouverture.otp_verify')}
                </PrimaryButton>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={ctl.cancelTwoFA} className="font-semibold" style={{ fontSize: 12, color: p.textMuted }}>
                  {t('sl9_ouverture.change_number')}
                </button>
                <button
                  type="button"
                  onClick={ctl.handleResend}
                  disabled={ctl.resending}
                  className="font-bold disabled:opacity-50"
                  style={{ fontSize: 12, color: p.orange }}
                >
                  {ctl.resending ? t('sl9_ouverture.sending') : t('sl9_ouverture.resend_code')}
                </button>
              </div>
              <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>
                {t('sl9_ouverture.contact_support_hint')}{' '}
                <a href="mailto:support@belivay.com" className="font-bold" style={{ color: p.orange }}>
                  {t('sl9_ouverture.contact_support')}
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={ctl.handleSubmit} noValidate>
              <h1 className="font-black" style={{ fontSize: 17, color: p.text }}>{t('sl9_ouverture.login_title')}</h1>
              <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.login_subtitle')}</p>

              <div className="space-y-3">
                <label className="relative block">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={p.textMuted} />
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={ctl.credentials.username}
                    onChange={ctl.handleChange}
                    placeholder={t('sl9_ouverture.username_placeholder')}
                    disabled={ctl.loading}
                    required
                    className={field}
                    style={fieldStyle}
                  />
                </label>
                <label className="relative block">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={p.textMuted} />
                  <input
                    type={ctl.showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={ctl.credentials.password}
                    onChange={ctl.handleChange}
                    placeholder={t('sl9_ouverture.password_placeholder')}
                    disabled={ctl.loading}
                    required
                    className={field}
                    style={{ ...fieldStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => ctl.setShowPassword(!ctl.showPassword)}
                    className="absolute right-0 top-0 flex items-center justify-center"
                    style={{ width: 40, height: '100%' }}
                    aria-label={ctl.showPassword ? t('sl9_ouverture.hide_password') : t('sl9_ouverture.show_password')}
                  >
                    {ctl.showPassword ? <EyeOff size={16} color={p.textMuted} /> : <Eye size={16} color={p.textMuted} />}
                  </button>
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <button type="button" onClick={() => ctl.setView('forgot')} className="font-semibold underline" style={{ fontSize: 12, color: p.orange }}>
                  {t('sl9_ouverture.forgot_password_link')}
                </button>
              </div>

              {ctl.errorKey ? <p className="mt-2" style={{ fontSize: 12, color: p.red }}>{t(ctl.errorKey)}</p> : null}

              <div className="mt-4">
                <PrimaryButton p={p} type="submit" disabled={ctl.loading}>
                  {ctl.loading ? t('sl9_ouverture.connecting') : t('sl9_ouverture.login_submit')}
                </PrimaryButton>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="h-px flex-1" style={{ background: p.border }} />
                <span className="flex-shrink-0" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.or_continue_with')}</span>
                <span className="h-px flex-1" style={{ background: p.border }} />
              </div>

              <div className="mt-3 space-y-2.5">
                <GoogleAuthButton
                  onCredential={ctl.handleGoogleCredential}
                  disabled={ctl.loading}
                  label="signin_with"
                  locale={String(i18n.language || 'fr').split('-')[0]}
                />
                <AppleAuthButton onCredential={ctl.handleAppleCredential} disabled={ctl.loading} />
              </div>

              <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>
                {t('sl9_ouverture.new_device_hint')}
              </p>
            </form>
          )}
        </div>

        {ctl.view === 'credentials' ? (
          <div className="mt-4">
            <Card p={p} accent={p.orange}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold" style={{ fontSize: 13, color: p.text }}>{t('sl9_ouverture.not_seller_yet')}</p>
                  <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.open_shop_two_minutes')}</p>
                </div>
                <Link
                  to={OUVRIR_BOUTIQUE_PATH}
                  className="flex-shrink-0 rounded-xl font-bold text-white"
                  style={{ padding: '10px 14px', fontSize: 12.5, background: p.orange }}
                >
                  {t('sl9_ouverture.open_shop_cta')}
                </Link>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
