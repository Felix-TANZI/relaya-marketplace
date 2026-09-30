// frontend/src/features/vendors/v2/ouverture/OuvrirBoutiquePage.tsx
// Écran « Ouvrir ma boutique » — étape 1/3 (VD-03 §1.1, VD-D04.A07/A08/A09).
// Trois champs seulement (OUV-01) : nom de boutique interne (OUV-02), numéro
// vérifié par SMS, point sur la carte. Écran de code identique à celui de la
// Connexion (numéro masqué, minuteur, « Changer de numéro », rappel des deux
// comptes au plus par téléphone — OUV-03).

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Store, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { palette } from '../theme';
import { Collapsible, PrimaryButton } from '../commandes/ui';
import OnboardingSteps from './OnboardingSteps';
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
        {!showOtp ? (
          <Link to={LOGIN_PATH} className="mb-4 inline-flex items-center gap-1 font-semibold" style={{ fontSize: 12.5, color: p.textMuted }}>
            <ChevronLeft size={14} /> {t('sl9_ouverture.back_to_login')}
          </Link>
        ) : null}

        <div className="rounded-2xl p-5" style={{ background: p.card, border: `1px solid ${p.border}`, boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
          <OnboardingSteps current="open" p={p} />

          {showOtp ? (
            <form onSubmit={handleVerify}>
              <h1 className="font-black" style={{ fontSize: 16, color: p.text }}>{t('sl9_ouverture.otp_title')}</h1>
              <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
                {t('sl9_ouverture.otp_sent_to_phone', { phone })}
              </p>
              <CodeBoxesInline value={otp.code} onChange={otp.setCode} disabled={otp.step === 'verifying'} />
              {otp.error ? <p className="mt-2" style={{ fontSize: 12, color: p.red }}>{t(otp.error)}</p> : null}
              <div className="mt-4">
                <PrimaryButton p={p} type="submit" disabled={otp.step === 'verifying' || otp.code.length < 6}>
                  {otp.step === 'verifying' ? t('sl9_ouverture.verifying') : t('sl9_ouverture.otp_verify')}
                </PrimaryButton>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={() => { setShowOtp(false); otp.reset(); }} className="font-semibold" style={{ fontSize: 12, color: p.textMuted }}>
                  {t('sl9_ouverture.change_number')}
                </button>
                <button
                  type="button"
                  onClick={() => void otp.send()}
                  disabled={!otp.canResend || otp.sending}
                  className="font-bold disabled:opacity-50"
                  style={{ fontSize: 12, color: p.orange }}
                >
                  {otp.cooldown > 0 ? `${t('sl9_ouverture.resend_code')} (${otp.cooldown}s)` : t('sl9_ouverture.resend_code')}
                </button>
              </div>
              <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.two_accounts_per_phone')}</p>
            </form>
          ) : (
            <form onSubmit={handleContinue}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.orange}1F` }}>
                  <Store size={20} color={p.orange} />
                </div>
                <div>
                  <h1 className="font-black" style={{ fontSize: 16, color: p.text }}>{t('sl9_ouverture.open_shop_title')}</h1>
                  <p style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.open_shop_subtitle')}</p>
                </div>
              </div>

              <label className="block mb-3">
                <span className="mb-1.5 flex items-center gap-1 font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                  <User size={12} /> {t('sl9_ouverture.business_name_label')}
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
                <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.phone_label')}</span>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  onValidityChange={setPhoneValid}
                  placeholder={t('sl9_ouverture.phone_placeholder')}
                />
              </div>

              <div className="mb-2">
                <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl9_ouverture.location_label')}</span>
                <ShopLocationPicker
                  lat={lat}
                  lng={lng}
                  zoneLabel={zoneLabel}
                  onChange={(nLat, nLng, zone) => { setLat(nLat); setLng(nLng); setZoneLabel(zone); setPinError(false); }}
                  p={p}
                />
                {pinError ? <p className="mt-1.5" style={{ fontSize: 11.5, color: p.red }}>{t('sl9_ouverture.pin_required_error')}</p> : null}
              </div>

              <div className="mt-4">
                <PrimaryButton p={p} type="submit" disabled={!canSubmit}>
                  {t('sl9_ouverture.open_shop_submit')}
                </PrimaryButton>
              </div>

              <div className="mt-4">
                <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
                  {t('sl9_ouverture.open_shop_how_it_works_body')}
                </Collapsible>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
