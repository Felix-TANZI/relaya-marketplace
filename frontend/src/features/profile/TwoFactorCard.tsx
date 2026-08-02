// frontend/src/features/profile/TwoFactorCard.tsx
// Bloc "Double authentification" côté client/acheteur — branché sur l'API réelle.

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, Mail, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { http } from '@/services/api/http';
import { useToast } from '@/context/ToastContext';

interface TwoFAStatus {
  two_factor_enabled: boolean;
  two_factor_method: string;
  two_factor_phone: string;
  email: string;
}

export default function TwoFactorCard() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'idle' | 'code'>('idle');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await http<TwoFAStatus>('/api/auth/2fa/status/');
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendCode = async () => {
    setSending(true);
    try {
      await http('/api/auth/2fa/send-code/', {
        method: 'POST',
        body: JSON.stringify({ purpose: '2FA_ENABLE' }),
      });
      setStep('code');
      setCode('');
      showToast(`Code envoyé à ${status?.email ?? 'votre email'}`, 'success');
    } catch {
      showToast("Impossible d'envoyer le code. Réessayez.", 'error');
    } finally {
      setSending(false);
    }
  };

  const enable = async () => {
    if (code.trim().length < 6) { showToast('Entrez le code à 6 chiffres.', 'error'); return; }
    setEnabling(true);
    try {
      await http('/api/auth/2fa/enable/', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim(), method: 'EMAIL', phone: '' }),
      });
      showToast('Double authentification activée', 'success');
      setStep('idle');
      setCode('');
      await load();
    } catch {
      showToast('Code incorrect ou expiré.', 'error');
    } finally {
      setEnabling(false);
    }
  };

  const disable = async () => {
    if (!disablePwd) { showToast('Entrez votre mot de passe pour confirmer.', 'error'); return; }
    setDisabling(true);
    try {
      await http('/api/auth/2fa/disable/', {
        method: 'POST',
        body: JSON.stringify({ password: disablePwd }),
      });
      showToast('Double authentification désactivée', 'success');
      setDisablePwd('');
      await load();
    } catch {
      showToast('Mot de passe incorrect.', 'error');
    } finally {
      setDisabling(false);
    }
  };

  const inputCls =
    'w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2.5 text-[13.5px] outline-none focus:border-[#f47920] dark:border-gray-700 dark:bg-gray-900';

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] border border-[#e5e7eb] p-[14px] text-[13px] text-[#9ca3af] dark:border-gray-800">
        <RefreshCw size={15} className="animate-spin" /> Chargement…
      </div>
    );
  }

  const enabled = !!status?.two_factor_enabled;

  return (
    <div className="rounded-[12px] border border-[#e5e7eb] p-[14px] dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-[11px]">
          {enabled
            ? <ShieldCheck size={21} className="text-green-600" />
            : <ShieldOff size={21} className="text-[#f47920]" />}
          <div>
            <div className="font-bold text-[#111827] dark:text-white">Double authentification</div>
            <div className="text-[12px] text-[#9ca3af]">
              {enabled
                ? `Activée · code envoyé à ${status?.email}`
                : 'Protégez votre compte avec un code à chaque connexion.'}
            </div>
          </div>
        </div>
        <span
          className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            enabled ? 'bg-green-50 text-green-700' : 'bg-[#f3f4f6] text-[#6b7280]'
          }`}
        >
          {enabled ? 'Activée' : 'Désactivée'}
        </span>
      </div>

      {/* ── Activation ─────────────────────────────────────────────── */}
      {!enabled && (
        <div className="mt-4">
          {step === 'idle' ? (
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#f47920] px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-[#c85e14] disabled:opacity-50"
            >
              <Mail size={14} />
              {sending ? 'Envoi…' : 'Recevoir un code par email'}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[12.5px] text-[#4b5563] dark:text-gray-300">
                Saisissez le code à 6 chiffres envoyé à <span className="font-semibold">{status?.email}</span>.
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className={`${inputCls} text-center text-[20px] font-bold tracking-[0.4em]`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={enable}
                  disabled={enabling || code.length < 6}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#f47920] px-4 py-2.5 text-[12.5px] font-bold text-white transition hover:bg-[#c85e14] disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  {enabling ? 'Activation…' : 'Activer'}
                </button>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={sending}
                  className="rounded-[10px] border border-[#e5e7eb] px-4 py-2.5 text-[12.5px] font-bold text-[#4b5563] transition hover:bg-[#f9fafb] disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                >
                  {sending ? 'Envoi…' : 'Renvoyer le code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('idle'); setCode(''); }}
                  className="rounded-[10px] px-3 py-2.5 text-[12.5px] font-bold text-[#9ca3af]"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Désactivation ──────────────────────────────────────────── */}
      {enabled && (
        <div className="mt-4 space-y-3">
          <p className="rounded-[10px] bg-[#fff4eb] px-3 py-2 text-[12px] text-[#c85e14] dark:bg-primary/10">
            Désactiver la double authentification réduit la sécurité de votre compte.
          </p>
          <div className="relative">
            <input
              value={disablePwd}
              onChange={(e) => setDisablePwd(e.target.value)}
              type={showPwd ? 'text' : 'password'}
              autoComplete="off"
              placeholder="Votre mot de passe actuel"
              className={`${inputCls} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button
            type="button"
            onClick={disable}
            disabled={disabling || !disablePwd}
            className="inline-flex items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            <ShieldOff size={14} />
            {disabling ? 'Désactivation…' : 'Désactiver la 2FA'}
          </button>
        </div>
      )}
    </div>
  );
}