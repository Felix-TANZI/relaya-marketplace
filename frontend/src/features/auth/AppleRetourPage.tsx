// frontend/src/features/auth/AppleRetourPage.tsx
// Retour de « Se connecter avec Apple » sur Android — feuille de route D33.
// Le serveur a reçu la réponse d'Apple et renvoie ici avec un ticket à usage unique (jamais les jetons eux-mêmes) ;
// on vérifie que le « state » est celui de notre demande, puis on échange le ticket contre la session BelivaY.

import { useEffect, useRef, useState } from 'react';
import i18n from "@/i18n";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APPLE_STATE_KEY } from '@/components/auth/AppleAuthButton';
import { useAuth } from '@/context/AuthContext';

export default function AppleRetourPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { appleTicketLogin, verify2FA } = useAuth();
  const [erreur, setErreur] = useState('');
  const [deuxFacteurs, setDeuxFacteurs] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const fait = useRef(false);

  useEffect(() => {
    if (fait.current) return;
    fait.current = true;
    const attendu = sessionStorage.getItem(APPLE_STATE_KEY);
    sessionStorage.removeItem(APPLE_STATE_KEY);
    const ticket = params.get('ticket');
    const connexion = () => {
      if (params.get('erreur') || !ticket) {
        return Promise.reject(new Error(i18n.t("t03.apple_annulee")));
      }
      if (!attendu || attendu !== params.get('state')) {
        return Promise.reject(new Error(i18n.t("t03.apple_mauvaise_reponse")));
      }
      return appleTicketLogin(ticket);
    };
    connexion()
      .then((resultat) => {
        if (resultat.twoFactorRequired && resultat.userId) setDeuxFacteurs(resultat.userId);
        else navigate('/', { replace: true });
      })
      .catch((e: unknown) => setErreur(e instanceof Error ? e.message : 'Connexion Apple impossible.'));
  }, [appleTicketLogin, navigate, params]);

  const valider = async () => {
    if (!deuxFacteurs) return;
    try {
      await verify2FA(deuxFacteurs, code.trim());
      navigate('/', { replace: true });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Code incorrect.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {erreur ? (
        <>
          <p role="alert" className="font-semibold text-red-600">{erreur}</p>
          <button type="button" className="mt-6 rounded-full border px-5 py-2 font-bold" onClick={() => navigate('/login')}>
            Retour à la connexion
          </button>
        </>
      ) : deuxFacteurs ? (
        <>
          <p className="font-semibold">{i18n.t("t03.apple_code")}</p>
          <input className="mt-4 w-full rounded-lg border px-3 py-2 text-center tracking-widest" inputMode="numeric"
            value={code} onChange={(e) => setCode(e.target.value)} />
          <button type="button" className="mt-4 rounded-full bg-black px-6 py-2 font-bold text-white" onClick={() => void valider()}>
            {i18n.t("t03.valider")}
          </button>
        </>
      ) : (
        <p className="font-semibold">{i18n.t("t03.apple_connexion")}</p>
      )}
    </div>
  );
}
