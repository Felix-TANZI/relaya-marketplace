// frontend/src/features/vendors/v2/ouverture/OuvrirBoutiquePage.tsx
// Écran « Ouvrir ma boutique » — DEV-SRV-01 T07-1 : « nom de la boutique, numéro de téléphone vérifié par code SMS,
// quartier ». Le point sur la carte reste facultatif (il précise l'emplacement dans le quartier).
//
// Branché sur le serveur réel (apps/vendors/views_inscription.py) :
//   1. POST /api/vendors/inscription/code — le code part au numéro (moteur de codes unique) ;
//   2. POST /api/vendors/inscription — code vérifié, compte et boutique créés EN ATTENTE, dans leur quartier.
// Sans compte, le vendeur choisit son mot de passe et l'écran le connecte aussitôt ; déjà client et connecté, la
// boutique s'ouvre sur son compte (D19). La pièce d'identité et le numéro Mobile Money sont demandés au premier
// produit (T07-2), le dossier complet avant le premier versement (T07-3) : rien de cela n'est demandé ici.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Home, KeyRound, MapPin, Smartphone, User } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { palette } from '../theme';
import { Collapsible, PrimaryButton } from '../commandes/ui';
import OnboardingSteps from './OnboardingSteps';
import OuvertureAppBar from './OuvertureAppBar';
import ShopLocationPicker from './ShopLocationPicker';
import { demanderCodeInscription, inscrireVendeur, listeQuartiers, type QuartierPublic } from './api';

const SELLER_HOME_PATH = '/seller/v2/accueil';
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

const messageDe = (erreur: unknown, repli: string) => (erreur instanceof Error && erreur.message ? erreur.message : repli);

export default function OuvrirBoutiquePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { isAuthenticated, login, refreshUser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [quartier, setQuartier] = useState('');
  const [quartiers, setQuartiers] = useState<QuartierPublic[]>([]);
  const [password, setPassword] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);

  const [step, setStep] = useState<'form' | 'code'>('form');
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listeQuartiers().then(setQuartiers).catch(() => setQuartiers([]));
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const quartierConnu = quartiers.length === 0 || quartiers.some((q) => q.quartier === quartier);
  const canSubmit = businessName.trim().length >= 2 && phoneValid && quartier.trim() !== '' && quartierConnu
    && (isAuthenticated || password.length >= 8);

  const envoyerCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const envoi = await demanderCodeInscription(phone);
      setDestination(envoi.destination);
      setCooldown(envoi.renvoiSecondes);
      setStep('code');
    } catch (erreur) {
      setError(messageDe(erreur, t('sl9_ouverture.otp_error_send')));
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) await envoyerCode();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await inscrireVendeur({
        telephone: phone, code, nom: businessName.trim(), quartier,
        mot_de_passe: isAuthenticated ? undefined : password,
        latitude: lat, longitude: lng,
      });
      if (isAuthenticated) {
        await refreshUser();
      } else {
        // Le numéro sert d'identifiant de connexion.
        await login(phone.replace(/\D/g, '').slice(-9), password);
      }
      navigate(SELLER_HOME_PATH, { replace: true });
    } catch (erreur) {
      setError(messageDe(erreur, t('sl9_ouverture.otp_error_invalid')));
      setBusy(false);
    }
  };

  const champ = { padding: '13px 14px', fontSize: 13.5, background: p.cardAlt, border: `1px solid ${p.border}`, color: p.text };

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: p.bg }}>
      <div className="w-full max-w-[440px] mx-auto">
        <OuvertureAppBar
          p={p}
          onBack={step === 'code' ? () => { setStep('form'); setCode(''); setError(null); } : () => navigate(LOGIN_PATH)}
        />
        <OnboardingSteps current="open" p={p} />

        {step === 'code' ? (
          <form onSubmit={handleVerify}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${p.orange}1F` }}>
                <Smartphone size={22} color={p.orange} />
              </div>
              <h1 className="font-black" style={{ fontSize: 18, color: p.text }}>{t('sl9_ouverture.otp_title')}</h1>
              <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted, lineHeight: 1.5 }}>
                {t('sl9_ouverture.otp_sent_to_phone', { phone: destination })}
              </p>
            </div>
            <CodeBoxesInline value={code} onChange={setCode} disabled={busy} />
            {error ? <p className="mt-2 text-center" style={{ fontSize: 12, color: p.red }}>{error}</p> : null}
            <div className="mt-3 flex items-center justify-center gap-3">
              <span style={{ fontSize: 12, color: p.textMuted }}>
                {cooldown > 0 ? t('sl9_ouverture.resend_code_in', { seconds: cooldown }) : (
                  <button type="button" onClick={() => void envoyerCode()} disabled={busy} className="font-bold disabled:opacity-50" style={{ color: p.orange }}>
                    {t('sl9_ouverture.resend_code')}
                  </button>
                )}
              </span>
              <span style={{ color: p.border }}>·</span>
              <button type="button" onClick={() => { setStep('form'); setCode(''); setError(null); }} className="font-bold" style={{ fontSize: 12, color: p.orange }}>
                {t('sl9_ouverture.change_number')}
              </button>
            </div>
            <div className="mt-4">
              <PrimaryButton p={p} type="submit" disabled={busy || code.length < 6}>
                <span className="inline-flex items-center justify-center gap-2">
                  <ArrowRight size={16} />
                  {busy ? t('sl9_ouverture.verifying') : t('sl9_ouverture.otp_verify')}
                </span>
              </PrimaryButton>
            </div>
            <p className="mt-4 text-center" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.one_account_per_phone')}</p>
          </form>
        ) : (
          <form onSubmit={handleContinue}>
            <h1 className="font-black" style={{ fontSize: 20, color: p.text }}>{t('sl9_ouverture.open_shop_title')}</h1>
            <p className="mt-1 mb-4" style={{ fontSize: 12.5, color: p.textMuted }}>{t('sl9_ouverture.open_shop_subtitle')}</p>

            <label className="block mb-3">
              <span className="mb-1.5 flex items-center gap-1 font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                <User size={12} /> {t('sl9_ouverture.business_name_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={255}
                placeholder={t('sl9_ouverture.business_name_placeholder')} className="w-full rounded-xl outline-none" style={champ} />
              <span className="mt-1 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.business_name_hint')}</span>
            </label>

            <div className="mb-3">
              <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl9_ouverture.phone_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <PhoneInput value={phone} onChange={setPhone} onValidityChange={setPhoneValid} placeholder={t('sl9_ouverture.phone_placeholder')} />
              <span className="mt-1 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.phone_hint')}</span>
            </div>

            <label className="block mb-3">
              <span className="mb-1.5 flex items-center gap-1 font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                <MapPin size={12} /> {t('sl9_ouverture.quartier_label')} <span style={{ color: p.red }}>*</span>
              </span>
              <input list="quartiers-yaounde" value={quartier} onChange={(e) => setQuartier(e.target.value)}
                placeholder={t('sl9_ouverture.quartier_placeholder')} className="w-full rounded-xl outline-none" style={champ} />
              <datalist id="quartiers-yaounde">
                {quartiers.map((q) => <option key={q.quartier} value={q.quartier}>{q.commune}</option>)}
              </datalist>
              {quartier && !quartierConnu ? (
                <span className="mt-1 block" style={{ fontSize: 11.5, color: p.red }}>{t('sl9_ouverture.quartier_unknown')}</span>
              ) : null}
            </label>

            {!isAuthenticated ? (
              <label className="block mb-3">
                <span className="mb-1.5 flex items-center gap-1 font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                  <KeyRound size={12} /> {t('sl9_ouverture.password_label')} <span style={{ color: p.red }}>*</span>
                </span>
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl outline-none" style={champ} />
                <span className="mt-1 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.password_hint')}</span>
              </label>
            ) : null}

            <div className="mb-2">
              <span className="mb-1.5 block font-bold" style={{ fontSize: 11.5, color: p.textMuted }}>
                {t('sl9_ouverture.location_label')} · {t('sl9_ouverture.optional')}
              </span>
              <ShopLocationPicker lat={lat} lng={lng} zoneLabel={zoneLabel} p={p}
                onChange={(nLat, nLng, zone) => { setLat(nLat); setLng(nLng); setZoneLabel(zone); }} />
              <span className="mt-1.5 block" style={{ fontSize: 11, color: p.textMuted }}>{t('sl9_ouverture.location_helper_note')}</span>
            </div>

            {error ? <p className="mt-2" style={{ fontSize: 12, color: p.red }}>{error}</p> : null}

            <div className="mt-4">
              <PrimaryButton p={p} type="submit" disabled={!canSubmit || busy}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Home size={16} />
                  {busy ? t('sl9_ouverture.sending') : t('sl9_ouverture.open_shop_submit')}
                </span>
              </PrimaryButton>
            </div>

            <div className="mt-4">
              <Collapsible title={t('sl9_ouverture.how_it_works')} p={p}>
                {t('sl9_ouverture.open_shop_how_it_works_body')}
              </Collapsible>
            </div>

            {!isAuthenticated ? (
              <p className="mt-4 text-center" style={{ fontSize: 12, color: p.textMuted }}>
                {t('sl9_ouverture.already_seller')}{' '}
                <button type="button" onClick={() => navigate(LOGIN_PATH)} className="font-bold" style={{ color: p.orange }}>
                  {t('sl9_ouverture.login_submit')}
                </button>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
