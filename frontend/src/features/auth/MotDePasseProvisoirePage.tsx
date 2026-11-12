// frontend/src/features/auth/MotDePasseProvisoirePage.tsx
// DEV-SRV-01, T07-5 — « Le vendeur reçoit ensuite son accès » : un compte ouvert par un agent de terrain arrive ici
// à sa première connexion (ProtectedRoute l'y renvoie tant que /me dit doit_changer_mot_de_passe). Le vendeur
// retape le mot de passe provisoire remis par l'agent et choisit le sien ; le serveur efface alors l'accès
// provisoire (apps.accounts.acces_provisoire). Même écran serveur que « Changer mon mot de passe » du profil.

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { portalHomePath } from '@/config/portals';
import { http } from '@/services/api/http';

export default function MotDePasseProvisoirePage() {
  const { t } = useTranslation();
  const k = (cle: string) => t(`sl9_acces_provisoire.${cle}`);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const [champs, setChamps] = useState({ provisoire: '', nouveau: '', confirmation: '' });
  const [envoi, setEnvoi] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from || portalHomePath;

  const changer = (cle: keyof typeof champs) => (e: { target: { value: string } }) =>
    setChamps((c) => ({ ...c, [cle]: e.target.value }));

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (champs.nouveau !== champs.confirmation) {
      showToast(k('mismatch'), 'error');
      return;
    }
    setEnvoi(true);
    try {
      await http('/api/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ old_password: champs.provisoire, new_password: champs.nouveau, new_password2: champs.confirmation }),
      });
      await refreshUser();
      showToast(k('success'), 'success');
      navigate(destination, { replace: true });
    } catch (erreur) {
      showToast(erreur instanceof Error ? erreur.message : k('error'), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const champ = 'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-gray-900">
      <form onSubmit={(e) => void envoyer(e)} className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-orange-100 text-orange-600"><KeyRound size={20} /></div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">{k('title')}</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{k('subtitle')}</p>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">{k('provisional')}
          <input required type="password" autoComplete="current-password" className={`${champ} mt-1`}
            value={champs.provisoire} onChange={changer('provisoire')} />
        </label>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">{k('new_password')}
          <input required type="password" minLength={8} autoComplete="new-password" className={`${champ} mt-1`}
            value={champs.nouveau} onChange={changer('nouveau')} />
        </label>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">{k('confirm')}
          <input required type="password" minLength={8} autoComplete="new-password" className={`${champ} mt-1`}
            value={champs.confirmation} onChange={changer('confirmation')} />
        </label>
        <p className="text-xs text-gray-500">{k('hint')}</p>
        <button type="submit" disabled={envoi} className="w-full py-3 rounded-xl font-bold text-white bg-orange-600 disabled:opacity-60">
          {envoi ? '…' : k('submit')}
        </button>
        <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="w-full text-sm text-gray-500 underline">
          {k('logout')}
        </button>
      </form>
    </div>
  );
}
