// frontend/src/features/auth/MotDePasseOubliePage.tsx
// « Mot de passe oublié » — /forgot-password, commun aux six portails (le lien de connexion y menait sans page).
// DEV-SRV-01 T07-5 : le vendeur inscrit par un agent n'a souvent pas d'e-mail ; il donne son numéro et reçoit le lien
// par SMS. Serveur : POST /api/auth/password/forgot (apps/otp/oubli.py), qui ne dit jamais si un compte existe.

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, MailCheck } from 'lucide-react';
import { http } from '@/services/api/http';
import CarteAuth from './CarteAuth';

interface Envoi { destination: string; canal: 'sms' | 'email'; valideMinutes: number }

export default function MotDePasseOubliePage() {
  const { t } = useTranslation();
  const [identifiant, setIdentifiant] = useState('');
  const [envoi, setEnvoi] = useState<Envoi | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      setEnvoi(await http<Envoi>('/api/auth/password/forgot', {
        method: 'POST', body: JSON.stringify({ identifiant: identifiant.trim() }),
      }));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <CarteAuth>
      {envoi ? (
        <div className="text-center">
          <MailCheck size={28} className="mx-auto mb-3 text-primary" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{t('mdp_oubli.sent_title')}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {t(envoi.canal === 'sms' ? 'mdp_oubli.sent_sms' : 'mdp_oubli.sent_email',
              { destination: envoi.destination, minutes: envoi.valideMinutes })}
          </p>
          <Link to="/login" className="mt-5 inline-block text-sm font-bold text-primary hover:underline">{t('mdp_oubli.back_to_login')}</Link>
        </div>
      ) : (
        <form onSubmit={(e) => void envoyer(e)}>
          <KeyRound size={26} className="mb-3 text-primary" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{t('mdp_oubli.title')}</h1>
          <p className="mt-1 mb-4 text-sm text-gray-600 dark:text-gray-300">{t('mdp_oubli.subtitle')}</p>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('mdp_oubli.field')}
            <input required autoComplete="username" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)}
              placeholder={t('mdp_oubli.placeholder')} maxLength={120}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </label>
          {error ? <p className="mt-2 text-sm text-red-600">{t('mdp_oubli.error')}</p> : null}
          <button type="submit" disabled={busy || !identifiant.trim()}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? t('mdp_oubli.sending') : t('mdp_oubli.submit')}
          </button>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">{t('mdp_oubli.security_tip')}</p>
          <Link to="/login" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">{t('mdp_oubli.back_to_login')}</Link>
        </form>
      )}
    </CarteAuth>
  );
}
