// frontend/src/features/vendors/v2/ouverture/OuvrirBoutiquePage.tsx
// Écran « Ouvrir ma boutique » — étape 1/3 (VD-03 §1.1, VD-D04.A07/A08/A09).
// Trois champs seulement (OUV-01) : nom de boutique interne (OUV-02), numéro
// vérifié par SMS, point sur la carte. Écran de code identique à celui de la
// Connexion (numéro masqué, minuteur, « Changer de numéro », rappel des deux
// comptes au plus par téléphone — OUV-03).

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Home, Smartphone, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { palette } from '../theme';
import { Collapsible, PrimaryButton } from '../commandes/ui';
import OnboardingSteps from './OnboardingSteps';
import OuvertureAppBar from './OuvertureAppBar';
import ShopLocationPicker from './ShopLocationPicker';
import { useSmsOtp } from './useSmsOtp';
import { saveShopDraft } from './api';

const PUBLISH_PATH = '/vendeur/publier-et-etre-paye';
const LOGIN_PATH = '/vendeur/connexion';

function CodeBoxesInline({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const { theme } = useTheme();
  const p = palette(theme);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);
  return (
    <div className="relative">
      <input
        type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="absolute inset-0 opacity-0" aria-label="Code"
      />
      <div className="flex gap-2 pointer-events-none">
        {digits.map((d, i) => (
          <div key={i} className="flex-1 flex items-center justify-center rounded-xl font-black"
            style={{ height: 48, fontSize: 18, background: p.cardAlt, border: `1px solid ${d.trim() ? p.orange : p.border}`, color: p.text }}>
            {d.trim() || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OuvrirBoutiquePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  const otp = useSmsOtp(phone);

  const canSubmit = businessName.trim().length >= 2 && phoneValid && lat !== null && lng !== null;

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !phoneValid) return;
    if (lat === null || lng === null) { setPinError(true); return; }
    setPinError(false);
    setShowOtp(true);
    await otp.send();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    await otp.verify();
  };

  useEffect(() => {
    if (otp.step !== 'verified') return;
    saveShopDraft({ businessName: businessName.trim(), phone, lat, lng, zoneLabel });
    navigate(PUBLISH_PATH, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp.step]);

  if (otp.step === 'verified') return null;

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: p.bg }}>
      <div className="w-full max-w-[440px] mx-auto">
        <OuvertureAppBar
          p={p}
          onBack={showOtp ? () => { setShowOtp(false); otp.reset(); } : () => navigate(LOGIN_PATH)}
        />
        <OnboardingSteps current="open" p={p} />

        {showOtp ? (
          <form onSubmit={handleVerify}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${p.orange}1F` }}>
                <Smartphone size={22} color={p.orange} />
              </div>
              <h1 className="font-black" style={{ fontSize: 18, color: p.text }}>{t('sl9_ouverture.otp_title')}</h1>
              <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
                {t('sl9_ouverture.otp_sent_to_phone', { phone })}
              </p>
            </div>
            <CodeBoxesInline value={otp.code} onChange={otp.setCode} disabled={otp.step === 'verifying'} />
            {otp.error ? <p className="mt-2 text-center" style={{ fontSize: 12, color: p.red }}>{t(otp.error)}</p> : null}
            <div className="mt-3 flex items-center justify-center gap-3">
              <span style={{ fontSize: 12, color: p.textMuted }}>
                {otp.cooldown > 0 ? `${t('sl9_ouverture.resend_code_in', { seconds: otp.cooldown })}` : (
                  <button type="button" onClick={() => void otp.send()} disabled={otp.sending} className="font-bold disabled:opacity-50" style={{ color: p.orange }}>
                    {t('sl9_ouverture.resend_code')}
                  </button>
                )}
              </span>
              <span style={{ color: p.border }}>·</span>
              <button type="button" onClick={() => { setShowOtp(false); otp.reset(); }} className="font-bold" style={{ fontSize: 12, color: p.orange }}>
                {t('sl9_ouverture.change_number')}
              </button>
            </div>
            <div className="mt-4">
              <PrimaryButton p={p} type="submit" disabled={otp.step === 'verifying' || otp.code.length < 6}>
                <span className="inline-flex items-center justify-center gap-2">
                  <ArrowRight size={16} />
                  {otp.step === 'verifying' ? t('sl9_ouverture.verifying') : t('sl9_ouverture.otp_verify')}
                </span>
              </PrimaryButton>
            </div>
            <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.two_accounts_per_phone')}</p>
          </form>
        ) : (
          <form onSubmit={handleContinue}>
            <h1 className="font-black" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.open_shop_title')}</h1>
            <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.open_shop_subtitle')}</p>

            <label className="block mb-3">
              <span className="mb-1.5 flex items-center gap-1 font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                <User size={12} /> {t('sl9_ouverture.business_name_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t('sl9_ouverture.business_name_placeholder')}
                className="w-full rounded-xl outline-none"
                style={{ padding: '13px 14px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text }}
              />
              <span className="mt-1 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.business_name_hint')}</span>
            </label>

            <div className="mb-3">
              <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl9_ouverture.phone_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                onValidityChange={setPhoneValid}
                placeholder={t('sl9_ouverture.phone_placeholder')}
              />
              <span className="mt-1 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.phone_hint')}</span>
            </div>

            <div className="mb-2">
              <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl9_ouverture.location_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <ShopLocationPicker
                lat={lat}
                lng={lng}
                zoneLabel={zoneLabel}
                onChange={(nLat, nLng, zone) => { setLat(nLat); setLng(nLng); setZoneLabel(zone); setPinError(false); }}
                p={p}
              />
              {pinError ? <p className="mt-1.5" style={{ fontSize: 11.5, color: p.red }}>{t('sl9_ouverture.pin_required_error')}</p> : null}
              <span className="mt-1.5 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.location_helper_note')}</span>
            </div>

            <div className="mt-4">
              <PrimaryButton p={p} type="submit" disabled={!canSubmit}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Home size={16} />
                  {t('sl9_ouverture.open_shop_submit')}
                </span>
              </PrimaryButton>
            </div>

            <div className="mt-4">
              <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
                {t('sl9_ouverture.open_shop_how_it_works_body')}
              </Collapsible>
            </div>

            <p className="mt-4 text-center" style={{ fontSize: 12, color: p.textMuted }}>
              {t('sl9_ouverture.already_seller')}{' '}
              <button type="button" onClick={() => navigate(LOGIN_PATH)} className="font-bold" style={{ color: p.orange }}>
                {t('sl9_ouverture.login_submit')}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
