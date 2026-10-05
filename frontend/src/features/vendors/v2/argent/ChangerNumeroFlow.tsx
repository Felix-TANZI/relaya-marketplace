// frontend/src/features/vendors/v2/argent/ChangerNumeroFlow.tsx
// VD-09 §Argent et versements — "Numéro de versement" en 3 étapes :
//   1. Numero.html      : opérateur + nouveau numéro
//   2. Numero_code.html : vérification SMS
//   3. Numero_ok.html   : confirmation / revue
// Un seul écran/route avec un état d'étape interne, même pattern que
// OuvrirBoutiquePage.tsx (showOtp) plutôt que 3 routes séparées.
//
// Logique et composants réutilisés tels quels (validation CAMEROON/
// detectOperator/isValidNationalNumber, carte opérateur MTN/Orange, champ
// téléphone avec détection d'opérateur) : même logique que OperatorCard /
// PhoneField / saveDefault() dans SellerWalletPage.tsx. Ces deux composants y
// sont des fonctions privées non exportées : on les recrée ici à l'identique
// (mêmes règles de validation, même rendu) plutôt que de modifier ce fichier
// partagé par un autre écran, en reprenant le design system v2 (palette(theme))
// au lieu des tokens ad hoc de vendorTheme.
//
// MANQUE BACKEND (vérification par SMS du nouveau numéro de versement) :
// aucun endpoint dédié n'existe (confirmé par ouverture/api.ts:148-152,
// verifyPayoutNumber() applique déjà le changement IMMÉDIATEMENT via
// vendorsApi.savePaymentPreferences, sans aucune étape de vérification). On
// réutilise donc le flux SMS générique déjà réel et déjà utilisé ailleurs
// (POST /api/auth/otp/ et /api/auth/verify/, via le hook useSmsOtp — voir
// ouverture/useSmsOtp.ts, conçu pour vérifier le numéro de la boutique à
// l'ouverture) : ce sont des endpoints "envoyer/vérifier un code SMS pour un
// numéro arbitraire", réutilisables ici sans rien inventer.
// Simplification assumée : la maquette Numero_code.html demande DEUX codes
// (nouveau numéro + "second facteur" envoyé au téléphone personnel déjà
// enregistré). Il n'existe qu'un seul vrai flux OTP ; on ne fabrique donc
// PAS un second code factice. Un seul code (celui du nouveau numéro) est
// demandé ici, et ce renoncement est documenté dans la note affichée à
// l'étape 2.
// Enfin, l'étape 3 (Numero_ok.html) promet une revue de 7 jours avant que le
// nouveau numéro soit actif, avec l'ancien numéro qui reste utilisable entre
// temps. Rien de tel n'existe côté serveur : l'appel réel
// (savePaymentPreferences) applique le changement tout de suite. L'écran de
// fin affiche donc le palier "en revue" pour rester fidèle à la maquette,
// MAIS avec une note honnête indiquant que le numéro est en réalité déjà actif
// — jamais un faux statut "vérifié" qui laisserait croire à une revue réelle.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Clock, Info, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type VendorProfile, type WithdrawalOperator } from '@/services/api/vendors';
import { CAMEROON, detectOperator, isValidNationalNumber } from '@/lib/phone';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import { useSmsOtp } from '@/features/vendors/v2/ouverture/useSmsOtp';
import { useToast } from '@/context/ToastContext';
import { palette } from '../theme';
import ScreenHeader from '../compte/shared/ScreenHeader';

type Operator = WithdrawalOperator;
type Step = 'form' | 'otp' | 'done';

const OP_LABEL: Record<Operator, string> = { MTN_MOMO: 'MTN Mobile Money', ORANGE_MONEY: 'Orange Money' };
const OP_PREFIX: Record<Operator, string> = { MTN_MOMO: '67X · 68X · 650-654', ORANGE_MONEY: '69X · 655-659' };
const OP_NAME: Record<Operator, string> = { MTN_MOMO: 'MTN', ORANGE_MONEY: 'Orange' };

function OperatorCard({ op, selected, onSelect, p }: {
  op: Operator; selected: boolean; onSelect: () => void; p: ReturnType<typeof palette>;
}) {
  return (
    <button
      type="button" onClick={onSelect}
      className="flex items-center gap-3 rounded-2xl text-left w-full"
      style={{
        padding: 13,
        background: selected ? `${p.orange}0F` : p.cardAlt,
        border: selected ? `2px solid ${p.orange}` : `1px solid ${p.border}`,
      }}
    >
      <OperatorLogo provider={op} size={38} />
      <span className="flex-1 min-w-0">
        <span className="block font-bold" style={{ fontSize: 13, color: p.text }}>{OP_LABEL[op]}</span>
        <span className="block mt-0.5" style={{ fontSize: 10.5, color: p.textMuted }}>{OP_PREFIX[op]}</span>
      </span>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: selected ? p.orange : p.border, color: selected ? '#fff' : 'transparent' }}
      >
        <Check size={11} strokeWidth={3.4} />
      </span>
    </button>
  );
}

function PhoneField({ value, onChange, expected, p }: {
  value: string; onChange: (v: string) => void; expected: Operator; p: ReturnType<typeof palette>;
}) {
  const { t } = useTranslation();
  const valid = isValidNationalNumber(value, CAMEROON);
  const detected = detectOperator(value);
  const mismatch = valid && detected !== null && detected.name !== OP_NAME[expected];
  const bad = (value.length > 0 && !valid) || mismatch;

  return (
    <div>
      <label className="block font-semibold mb-1.5" style={{ fontSize: 11.5, color: p.textMuted }}>
        {t('sl12_argent.numero_new_number_label')}
      </label>
      <div
        className="flex items-stretch rounded-xl overflow-hidden"
        style={{
          background: p.card,
          border: bad ? `1.5px solid ${p.red}` : valid ? `1.5px solid ${p.orange}` : `1px solid ${p.border}`,
        }}
      >
        <span
          className="flex items-center gap-1.5 font-bold flex-shrink-0"
          style={{ padding: '0 12px', background: p.cardAlt, borderRight: `1px solid ${p.border}`, fontSize: 13, color: p.textMuted }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>{CAMEROON.flag}</span>+237
        </span>
        <input
          type="tel" maxLength={9} value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="6XX XXX XXX"
          className="flex-1 outline-none font-bold"
          style={{ padding: '13px 12px', fontSize: 16, letterSpacing: '.04em', color: p.text, background: 'transparent', minWidth: 0 }}
        />
      </div>
      {value.length > 0 && !valid ? (
        <p className="mt-1.5" style={{ fontSize: 11, color: p.red }}>{t('sl12_argent.numero_invalid_number')}</p>
      ) : mismatch ? (
        <p className="mt-1.5" style={{ fontSize: 11, color: p.red }}>
          {t('sl12_argent.numero_mismatch_number', { detected: detected?.name, expected: OP_LABEL[expected] })}
        </p>
      ) : valid ? (
        <p className="mt-1.5 flex items-center gap-1.5" style={{ fontSize: 11, color: p.green }}>
          <Check size={12} strokeWidth={2.6} />{t('sl12_argent.numero_prefix_match')}
        </p>
      ) : null}
    </div>
  );
}

function CodeBoxesInline({ value, onChange, disabled, p }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; p: ReturnType<typeof palette>;
}) {
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
          <div
            key={i} className="flex-1 flex items-center justify-center rounded-xl font-black"
            style={{ height: 46, fontSize: 18, background: p.cardAlt, border: `1px solid ${d.trim() ? p.orange : p.border}`, color: p.text }}
          >
            {d.trim() || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

const REVIEW_DAYS = 7;

export default function ChangerNumeroFlow() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [operator, setOperator] = useState<Operator>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [confirming, setConfirming] = useState(false);

  const otp = useSmsOtp(`+237${phone}`);

  useEffect(() => { vendorsApi.getProfile().then(setProfile).catch(() => {}); }, []);

  const valid = isValidNationalNumber(phone, CAMEROON);
  const detected = detectOperator(phone);
  const mismatch = valid && detected !== null && detected.name !== OP_NAME[operator];
  const canSendCode = valid && !mismatch;

  const handleSendCode = async () => {
    if (!canSendCode) return;
    setStep('otp');
    await otp.send();
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      // MANQUE BACKEND (voir en-tête) : pas d'endpoint "appliquer après revue" —
      // on retombe sur le vrai endpoint existant, qui applique tout de suite.
      await vendorsApi.savePaymentPreferences({
        default_withdrawal_operator: operator,
        default_withdrawal_phone: `+237${phone}`,
      });
      setStep('done');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('sl12_argent.numero_save_error'), 'error');
    } finally {
      setConfirming(false);
    }
  };

  const reviewUntil = new Date();
  reviewUntil.setDate(reviewUntil.getDate() + REVIEW_DAYS);

  if (step === 'done') {
    return (
      <div className="pb-24 pt-2">
        <ScreenHeader title={t('sl12_argent.numero_title')} />
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${p.amber}1A`, border: `1px solid ${p.amber}40` }}>
            <ShieldCheck size={30} color={p.amber} />
          </div>
          <h1 className="font-black mt-3" style={{ fontSize: 17, color: p.text }}>{t('sl12_argent.numero_done_title')}</h1>
          <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted }}>
            {OP_LABEL[operator]} · {phone}
          </p>
        </div>

        <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg,#1C1209 0%,#2B1A0C 52%,#3A230D 100%)', color: '#fff' }}>
          <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.14em', color: 'rgba(255,255,255,.5)' }}>
            {t('sl12_argent.numero_review_kicker', { days: REVIEW_DAYS })}
          </p>
          <p className="font-black mt-1.5" style={{ fontSize: 18 }}>
            {t('sl12_argent.numero_review_until', { date: reviewUntil.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) })}
          </p>
          <p className="mt-2" style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>
            {t('sl12_argent.numero_review_explain')}
          </p>
        </div>

        <div className="rounded-2xl p-3.5 mb-3 flex items-start gap-2.5" style={{ background: `${p.amber}12`, border: `1px solid ${p.amber}35` }}>
          <Info size={16} color={p.amber} className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.5 }}>
            {t('sl12_argent.numero_honest_note')}
          </p>
        </div>

        <button
          type="button" onClick={() => navigate('/v2/versements')}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white"
          style={{ padding: 14, fontSize: 13.5, background: p.orange }}
        >
          {t('sl12_argent.numero_back_to_versements')}
        </button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="pb-24 pt-2">
        <ScreenHeader
          title={t('sl12_argent.numero_code_title')}
          subtitle={t('sl12_argent.numero_code_subtitle')}
          onBack={() => setStep('form')}
        />
        <p className="mb-1.5" style={{ fontSize: 12, fontWeight: 700, color: p.textMuted }}>
          {t('sl12_argent.numero_step_2_of_3')}
        </p>
        <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold mb-3" style={{ fontSize: 12.5, color: p.text }}>
            {t('sl12_argent.numero_code_sent_to', { phone: `+237 ${phone}` })}
          </p>
          <CodeBoxesInline value={otp.code} onChange={otp.setCode} disabled={otp.step === 'verifying'} p={p} />
          {otp.error ? <p className="mt-2 text-center" style={{ fontSize: 12, color: p.red }}>{t(otp.error)}</p> : null}
          <div className="flex items-center justify-center mt-3" style={{ fontSize: 12, color: p.textMuted }}>
            {otp.cooldown > 0 ? (
              t('sl9_ouverture.resend_code_in', { seconds: otp.cooldown })
            ) : (
              <button type="button" onClick={() => void otp.send()} disabled={otp.sending} className="font-bold disabled:opacity-50" style={{ color: p.orange }}>
                {t('sl9_ouverture.resend_code')}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: p.cardAlt }}>
          <Info size={14} color={p.textMuted} className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: 11, color: p.textMuted, lineHeight: 1.45 }}>
            {t('sl12_argent.numero_single_code_note')}
          </p>
        </div>

        <button
          type="button"
          onClick={async () => { await otp.verify(); }}
          disabled={otp.code.length < 6 || otp.step === 'verifying'}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50"
          style={{ padding: 14, fontSize: 13.5, background: p.orange }}
        >
          {otp.step === 'verifying' ? t('sl9_ouverture.verifying') : t('sl12_argent.numero_verify_cta')}
        </button>

        {otp.step === 'verified' ? (
          <div className="mt-3">
            <button
              type="button" onClick={handleConfirm} disabled={confirming}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50"
              style={{ padding: 14, fontSize: 13.5, background: p.green }}
            >
              <ArrowRight size={15} />{confirming ? t('sl12_argent.numero_confirming') : t('sl12_argent.numero_confirm_cta')}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl12_argent.numero_title')} subtitle={t('sl12_argent.numero_subtitle')} />

      {profile?.default_withdrawal_phone ? (
        <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
          <OperatorLogo provider={(profile.default_withdrawal_operator || 'MTN_MOMO') as Operator} size={38} />
          <div className="flex-1 min-w-0">
            <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl12_argent.numero_current_number')}</p>
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{profile.default_withdrawal_phone}</p>
          </div>
          <span className="rounded-full font-bold flex items-center gap-1" style={{ fontSize: 10, padding: '4px 9px', background: `${p.green}1A`, color: p.green }}>
            <Check size={11} />{t('sl12_argent.numero_current_active')}
          </span>
        </div>
      ) : null}

      <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: `${p.amber}12`, border: `1px solid ${p.amber}35` }}>
        <Clock size={15} color={p.amber} className="flex-shrink-0 mt-0.5" />
        <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.5 }}>
          {t('sl12_argent.numero_warning', { days: REVIEW_DAYS })}
        </p>
      </div>

      <p className="font-bold mb-2" style={{ fontSize: 11.5, color: p.textMuted }}>{t('sl12_argent.numero_operator_label')}</p>
      <div className="space-y-2 mb-4">
        <OperatorCard op="MTN_MOMO" selected={operator === 'MTN_MOMO'} onSelect={() => setOperator('MTN_MOMO')} p={p} />
        <OperatorCard op="ORANGE_MONEY" selected={operator === 'ORANGE_MONEY'} onSelect={() => setOperator('ORANGE_MONEY')} p={p} />
      </div>

      <div className="mb-4">
        <PhoneField value={phone} onChange={setPhone} expected={operator} p={p} />
      </div>

      <button
        type="button" onClick={handleSendCode} disabled={!canSendCode}
        className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50"
        style={{ padding: 14, fontSize: 13.5, background: p.orange }}
      >
        {t('sl12_argent.numero_send_code_cta')}
      </button>
      <p className="mt-3 text-center" style={{ fontSize: 11, color: p.textMuted }}>
        {t('sl12_argent.numero_sms_hint')}
      </p>
    </div>
  );
}
