// Connexion, en plus du formulaire : « Se souvenir de cet appareil » (au retour, l'e-mail seulement est gardé — jamais
// le mot de passe), « Bon retour » avec la photo et « Ce n'est pas vous ? », et le lien de connexion par e-mail (il
// vaut 15 minutes ; le second facteur reste demandé là où il l'est). Mêmes libellés dans les six applications.
import { useEffect, useState } from 'react'
import { env } from '@client/config/env'
import { appareilMemorise, envoyerLienConnexion, memoriserAppareil, synchroniserAppareil, type AppareilMemorise } from '../donnees/mon-compte'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function useMemoire() {
  const [memo, setMemo] = useState<AppareilMemorise | null>(() => appareilMemorise())
  const [souvenir, setSouvenir] = useState(!!memo)
  // Kit : l'appareil retenu est gardé au serveur ; la copie de l'appareil suit sa réponse.
  useEffect(() => {
    if (env.source !== 'api') return
    void synchroniserAppareil().then((a) => {
      setMemo(a)
      if (!a) setSouvenir(false)
    })
  }, [])
  return {
    memo,
    souvenir,
    setSouvenir,
    oublier: () => {
      memoriserAppareil(null)
      setMemo(null)
      setSouvenir(false)
    },
    /** Après une connexion réussie : garder l'e-mail (case cochée) ou tout oublier. */
    retenir: (a: AppareilMemorise) => memoriserAppareil(souvenir ? a : null),
  }
}

export function RetourMemorise({ memo, oublier }: { memo: AppareilMemorise; oublier: () => void }) {
  const { t, tf } = usePreferences()
  return (
    <div className="cx-retour" role="group" aria-label={t('Compte gardé sur cet appareil')}>
      <span className="avatar cx-av" aria-hidden="true">
        {memo.photo ? <img className="portrait" src={memo.photo} alt="" /> : memo.initiales}
      </span>
      <span className="grow">
        <b>{tf('Bon retour, {p}', { p: memo.prenom })}</b>
        <span className="cx-mail">{memo.email}</span>
        <button type="button" className="cx-pasmoi" onClick={oublier}>
          {t('Ce n’est pas vous ?')}
        </button>
      </span>
    </div>
  )
}

export function SeSouvenir({ valeur, changer }: { valeur: boolean; changer: (v: boolean) => void }) {
  const { t } = usePreferences()
  return (
    <label className="cx-souvenir">
      <input type="checkbox" checked={valeur} onChange={(e) => changer(e.target.checked)} />
      <span>
        <b>{t('Se souvenir de cet appareil')}</b>
      </span>
    </label>
  )
}

/** Lien de connexion par e-mail ; en démonstration, « Ouvrir le lien » fait ce que le lien ferait. */
export function LienParEmail({ email, ouvrirDemo }: { email: string; ouvrirDemo?: (email: string) => void }) {
  const { t, tf } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const [adresse, setAdresse] = useState(email)
  const [envoye, setEnvoye] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  if (!ouvert)
    return (
      <button type="button" className="btn ghost cx-lien" onClick={() => (setOuvert(true), setAdresse(email))}>
        <Icone nom="mail" taille={18} />
        <span>{t('Recevoir un lien de connexion par e-mail')}</span>
      </button>
    )
  return (
    <div className="cx-lien-b">
      {envoye ? (
        <>
          <p className="t13" role="status">
            <Icone nom="mail" taille={16} style={{ verticalAlign: -3 }} /> {tf('Si un accès existe, un lien est parti à {v}. Il vaut 15 minutes.', { v: envoye })}
          </p>
          {ouvrirDemo && (
            <button type="button" className="btn secondary sm" onClick={() => ouvrirDemo(adresse.trim())}>
              {t('Ouvrir le lien (démonstration)')}
            </button>
          )}
        </>
      ) : (
        <>
          <label className="champ">
            <span>{t('Votre e-mail')}</span>
            <input type="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} autoComplete="email" />
          </label>
          {erreur && (
            <p className="note red mt6" role="alert">
              {erreur}
            </p>
          )}
          <button
            type="button"
            className="btn secondary sm mt10"
            disabled={!adresse.trim()}
            onClick={async () => {
              const r = await envoyerLienConnexion(adresse)
              if (!r.ok) return setErreur(t('Saisie invalide : vérifiez le format.'))
              setErreur(null)
              setEnvoye(r.vers)
            }}
          >
            {t('Envoyer le lien')}
          </button>
        </>
      )}
    </div>
  )
}
