// Comptes réels du point relais (source « hybride », site/COMPTES-REELS.md) — rien de ceci ne paraît en démonstration
// ni avec l'API. La connexion (numéro puis PIN) et l'invitation d'un membre passent par l'adaptateur
// (session-hybride.ts) sur les écrans habituels ; ici, ce que la candidature demande en plus pour créer le compte :
// - SecretReel : e-mail du gérant, mot de passe ou code de 6 chiffres, consentement (Inscription, étape « Convention »).
import { AccesConsentement, ChampMotDePasse, motDePasseValide } from '@client/compte/acces-reel'
import { usePreferences } from '../../preferences'

/** Candidature réelle (étape « Convention ») : l'e-mail du gérant, un mot de passe ou un code, le consentement. */
export function SecretReel({ email, setEmail, secret, setSecret, accepte, setAccepte, vu }: { email: string; setEmail: (v: string) => void; secret: string; setSecret: (v: string) => void; accepte: boolean; setAccepte: (v: boolean) => void; vu: boolean }) {
  const { t } = usePreferences()
  const emailOk = emailValide(email)
  const secretOk = motDePasseValide(secret, true)
  return (
    <fieldset className="pr3-reel" aria-describedby="pr3-reel-t">
      <legend id="pr3-reel-t" className="p-9j1bbu">
        {t('Votre accès')}
      </legend>
      <div className="acr-champ">
        <label htmlFor="pr3-reel-email">{t('E-mail du gérant')}</label>
        <div className={'boite' + (vu && !emailOk ? ' err' : '')}>
          <input id="pr3-reel-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={(vu && !emailOk) || undefined} aria-describedby="pr3-reel-email-aide" />
        </div>
        <small id="pr3-reel-email-aide">{vu && !emailOk ? t('Indiquez une adresse e-mail valable.') : t('Votre identifiant de connexion ; la réponse de BelivaY y arrive.')}</small>
      </div>
      <ChampMotDePasse id="pr3-reel-secret" libelle={t('Mot de passe ou code de 6 chiffres')} valeur={secret} changer={setSecret} erreur={vu && !secretOk} aide={t('8 caractères au moins, avec une lettre et un chiffre ; ou un code de 6 chiffres qui ne soit pas une suite.')} />
      <AccesConsentement coche={accepte} changer={setAccepte} conditions="/cgu" confidentialite="/legal-doc?d=confidentialite" erreur={vu && !accepte} />
    </fieldset>
  )
}

export const emailValide = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
