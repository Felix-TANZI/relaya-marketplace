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
// DEV-SRV-01 T07-3 : branché sur les vrais numéros de versement du serveur (POST /api/auth/payout-accounts/,
// puis /api/auth/payout-accounts/<id>/verify/ avec le code reçu au numéro). L'ancienne version appelait
// /api/auth/otp/ et /api/auth/verify/, qui n'existent pas : aucun vendeur ne pouvait vérifier son numéro, donc
// aucun ne pouvait être payé. Un seul code (celui du nouveau numéro), comme le serveur le prévoit.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Clock, Info, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { vendorsApi, type WithdrawalOperator } from '@/services/api/vendors';
import { CAMEROON, detectOperator, isValidNationalNumber } from '@/lib/phone';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import { http } from '@/services/api/http';
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

// DEV-SRV-01 T07-3 « Être payé » : le numéro est un vrai numéro de versement (accounts.PayoutAccount, rôle VENDOR),
// vérifié par le code que le serveur envoie au numéro lui-même ; une fois vérifié, il est reporté au module financier
// (payments.bridge.payout_accounts) et c'est lui que le versement du vendredi utilise. Par sécurité, le serveur
// n'y verse rien pendant un délai après un changement de numéro (refroidissement de PayeeAccount).
interface CompteVersement {
  id: number;
  owner_role: string;
  phone_e164: string;
  masked_phone: string;
  operator: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISABLED';
  is_primary: boolean;
}

const RENVOI_SECONDES = 60;

export default function ChangerNumeroFlow() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const p = palette(theme);
  const navigate = useNavigate();

  const [actuel, setActuel] = useState<CompteVersement | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [operator, setOperator] = useState<Operator>('MTN_MOMO');
  const [phone, setPhone] = useState('');
  const [compteId, setCompteId] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    http<CompteVersement[]>('/api/auth/payout-accounts/')
      .then((comptes) => setActuel(comptes.find((c) => c.owner_role === 'VENDOR' && c.is_primary && c.status !== 'DISABLED') ?? null))
      .catch(() => setActuel(null));
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const valid = isValidNationalNumber(phone, CAMEROON);
  const detected = detectOperator(phone);
  const mismatch = valid && detected !== null && detected.name !== OP_NAME[operator];
  const canSendCode = valid && !mismatch;

  // Étape 1 → 2 : le numéro est enregistré EN ATTENTE et le serveur envoie le code au numéro lui-même.
  const envoyerCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const compte = await http<CompteVersement>('/api/auth/payout-accounts/', {
        method: 'POST', body: JSON.stringify({ owner_role: 'VENDOR', phone: `+237${phone}`, is_primary: true }),
      });
      setCompteId(compte.id);
      setCode('');
      setCooldown(RENVOI_SECONDES);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sl12_argent.numero_save_error'));
    } finally {
      setBusy(false);
    }
  };

  // Étape 2 → 3 : le code vérifié rend le numéro payable ; le profil garde le même numéro par défaut qu'avant.
  const verifier = async () => {
    if (compteId === null || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await http<CompteVersement>(`/api/auth/payout-accounts/${compteId}/verify/`, {
        method: 'POST', body: JSON.stringify({ code }),
      });
      await vendorsApi.savePaymentPreferences({ default_withdrawal_operator: operator, default_withdrawal_phone: `+237${phone}` })
        .catch(() => undefined);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sl9_ouverture.otp_error_invalid'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="pb-24 pt-2">
        <ScreenHeader title={t('sl12_argent.numero_title')} />
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${p.green}1A`, border: `1px solid ${p.green}40` }}>
            <ShieldCheck size={30} color={p.green} />
          </div>
          <h1 className="font-black mt-3" style={{ fontSize: 17, color: p.text }}>{t('sl12_argent.numero_done_title')}</h1>
          <p className="mt-1" style={{ fontSize: 12.5, color: p.textMuted }}>
            {OP_LABEL[operator]} · {phone}
          </p>
        </div>

        <div className="rounded-2xl p-3.5 mb-3 flex items-start gap-2.5" style={{ background: `${p.amber}12`, border: `1px solid ${p.amber}35` }}>
          <Info size={16} color={p.amber} className="flex-shrink-0 mt-0.5" />
          <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.5 }}>
            {t('sl12_argent.numero_review_explain')}
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
          onBack={() => { setStep('form'); setError(null); }}
        />
        <p className="mb-1.5" style={{ fontSize: 12, fontWeight: 700, color: p.textMuted }}>
          {t('sl12_argent.numero_step_2_of_3')}
        </p>
        <div className="rounded-2xl p-4 mb-3" style={{ background: p.card, border: `1px solid ${p.border}` }}>
          <p className="font-bold mb-3" style={{ fontSize: 12.5, color: p.text }}>
            {t('sl12_argent.numero_code_sent_to', { phone: `+237 ${phone}` })}
          </p>
          <CodeBoxesInline value={code} onChange={setCode} disabled={busy} p={p} />
          {error ? <p className="mt-2 text-center" style={{ fontSize: 12, color: p.red }}>{error}</p> : null}
          <div className="flex items-center justify-center mt-3" style={{ fontSize: 12, color: p.textMuted }}>
            {cooldown > 0 ? (
              t('sl9_ouverture.resend_code_in', { seconds: cooldown })
            ) : (
              <button type="button" onClick={() => void envoyerCode()} disabled={busy} className="font-bold disabled:opacity-50" style={{ color: p.orange }}>
                {t('sl9_ouverture.resend_code')}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void verifier()}
          disabled={code.length < 6 || busy}
          className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white disabled:opacity-50"
          style={{ padding: 14, fontSize: 13.5, background: p.orange }}
        >
          <ArrowRight size={15} />{busy ? t('sl9_ouverture.verifying') : t('sl12_argent.numero_verify_cta')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-2">
      <ScreenHeader title={t('sl12_argent.numero_title')} subtitle={t('sl12_argent.numero_subtitle')} />

      {actuel ? (
        <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-3" style={{ background: p.cardAlt, border: `1px solid ${p.border}` }}>
          <OperatorLogo provider={(actuel.operator.startsWith('ORANGE') ? 'ORANGE_MONEY' : 'MTN_MOMO') as Operator} size={38} />
          <div className="flex-1 min-w-0">
            <p className="font-bold" style={{ fontSize: 12.5, color: p.text }}>{t('sl12_argent.numero_current_number')}</p>
            <p style={{ fontSize: 11.5, color: p.textMuted }}>{actuel.masked_phone}</p>
          </div>
          <span className="rounded-full font-bold flex items-center gap-1" style={{ fontSize: 10, padding: '4px 9px',
            background: `${actuel.status === 'VERIFIED' ? p.green : p.amber}1A`, color: actuel.status === 'VERIFIED' ? p.green : p.amber }}>
            {actuel.status === 'VERIFIED' ? <><Check size={11} />{t('sl12_argent.numero_current_active')}</> : t('sl12_argent.numero_current_pending')}
          </span>
        </div>
      ) : null}

      <div className="rounded-xl p-3 mb-4 flex items-start gap-2" style={{ background: `${p.amber}12`, border: `1px solid ${p.amber}35` }}>
        <Clock size={15} color={p.amber} className="flex-shrink-0 mt-0.5" />
        <p style={{ fontSize: 11.5, color: p.text, lineHeight: 1.5 }}>
          {t('sl12_argent.numero_warning')}
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

      {error ? <p className="mb-3 text-center" style={{ fontSize: 12, color: p.red }}>{error}</p> : null}

      <button
        type="button" onClick={() => void envoyerCode()} disabled={!canSendCode || busy}
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
