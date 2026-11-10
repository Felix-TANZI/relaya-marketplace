// frontend/src/features/auth/NouveauMotDePassePage.tsx
// « Nouveau mot de passe » — /mdp-nouveau?jeton=…, la page que vise le lien envoyé par e-mail ou par SMS
// (apps/otp/oubli.py) ; elle n'existait pas dans le site réel. DEV-SRV-01 T07-5.
// Serveur : POST /api/auth/password/reset {jeton, mot_de_passe} ; la règle de longueur (MDP-LONG) y est vérifiée et
// son message est affiché tel quel ; toutes les autres sessions du compte sont fermées.

import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { http } from '@/services/api/http';
import CarteAuth from './CarteAuth';

const champ = 'mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none '
  + 'focus:border-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white';

export default function NouveauMotDePassePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const jeton = params.get('jeton') ?? '';
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    if (motDePasse !== confirmation) { setError(t('mdp_oubli.new_mismatch')); return; }
    setBusy(true);
    setError(null);
    try {
      await http('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ jeton, mot_de_passe: motDePasse }) });
      setFait(true);
    } catch (erreur) {
      setError(erreur instanceof Error && erreur.message ? erreur.message : t('mdp_oubli.new_error'));
    } finally {
      setBusy(false);
    }
  };

  if (!jeton) {
    return (
      <CarteAuth>
        <p className="text-sm text-gray-700 dark:text-gray-200">{t('mdp_oubli.new_missing_link')}</p>
        <Link to="/forgot-password" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">{t('mdp_oubli.new_ask_again')}</Link>
      </CarteAuth>
    );
  }

  return (
    <CarteAuth>
      {fait ? (
        <div className="text-center">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-green-600" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{t('mdp_oubli.new_done_title')}</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t('mdp_oubli.new_done_body')}</p>
          <Link to="/login" className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">{t('mdp_oubli.back_to_login')}</Link>
        </div>
      ) : (
        <form onSubmit={(e) => void enregistrer(e)}>
          <KeyRound size={26} className="mb-3 text-primary" />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{t('mdp_oubli.new_title')}</h1>
          <p className="mt-1 mb-4 text-sm text-gray-600 dark:text-gray-300">{t('mdp_oubli.new_subtitle')}</p>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('mdp_oubli.new_field')}
            <input required type="password" autoComplete="new-password" value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)} className={champ} />
          </label>
          <label className="mt-3 block text-xs font-bold text-gray-500 dark:text-gray-400">
            {t('mdp_oubli.new_confirm')}
            <input required type="password" autoComplete="new-password" value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)} className={champ} />
          </label>
          {error ? (
            <p className="mt-2 text-sm text-red-600">
              {error}{' '}
              <Link to="/forgot-password" className="font-bold underline">{t('mdp_oubli.new_ask_again')}</Link>
            </p>
          ) : null}
          <button type="submit" disabled={busy || !motDePasse}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {busy ? t('mdp_oubli.new_saving') : t('mdp_oubli.new_submit')}
          </button>
        </form>
      )}
    </CarteAuth>
  );
}
