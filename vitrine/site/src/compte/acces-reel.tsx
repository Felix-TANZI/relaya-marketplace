// Pièces d'accès communes aux six applications pour les COMPTES RÉELS (source « hybride », site/COMPTES-REELS.md) :
// - AccesConsentement : la case « J'accepte les conditions et la politique de confidentialité » d'une inscription ;
// - AccesAttente : l'état « compte en attente de validation » (vendeur, entreprise, point relais), dit clairement ;
// - ReinitialiserReel : le lien « mot de passe oublié » reçu par e-mail (?reinitialiser=…) : nouveau mot de passe ;
// - messageRefus : un refus du serveur en phrase humaine (jamais un code technique).
// Textes en français et en anglais (langue de la page). Pièces posées dans la carte du cadre d'accès (acces.tsx).
import { useEffect, useState, type ReactNode } from 'react'
import { comptesReels, type Espace, type Refus } from '../comptes-reels/client'
import { Acces, AccesEtapes, AccesMessage, AccesNote, AccesTitre } from './acces'

const en = () => typeof document !== 'undefined' && document.documentElement.lang.startsWith('en')
const m = (fr: string, anglais: string) => (en() ? anglais : fr)

/** Un refus du serveur des comptes, en phrase humaine. */
export function messageRefus(r: Refus): string {
  switch (r.code) {
    case 'indisponible':
      return m('Le service des comptes ne répond pas pour le moment. Vos saisies sont gardées : réessayez dans un instant.', 'The account service is not responding right now. Your entries are kept: try again in a moment.')
    case 'existe':
      return m('Impossible de créer un compte avec cette adresse. Si c’est la vôtre, connectez-vous ou choisissez « Mot de passe oublié ».', 'An account cannot be created with this address. If it is yours, sign in or choose “Forgot password”.')
    case 'regle':
    case 'mot_de_passe':
      return m('Mot de passe trop faible : 8 caractères au moins, avec une lettre et un chiffre.', 'Password too weak: at least 8 characters, with a letter and a digit.')
    case 'bloque':
    case 'trop_de_tentatives':
      return m('Trop d’essais : par sécurité, attendez quelques minutes avant de recommencer.', 'Too many attempts: for your security, wait a few minutes before trying again.')
    case 'expire':
    case 'utilise':
      return m('Ce lien n’est plus valable (il sert une fois, pendant 30 minutes) : demandez-en un nouveau.', 'This link is no longer valid (single use, 30 minutes): ask for a new one.')
    case 'identifiants':
      return m('Identifiant ou mot de passe incorrect.', 'Incorrect identifier or password.')
    default:
      return r.message && !/[{}<>]|error|exception/i.test(r.message) ? r.message : m('La demande n’a pas abouti. Vérifiez vos saisies, puis réessayez.', 'The request did not go through. Check your entries, then try again.')
  }
}

const CSS = `
.acr-case{display:flex;gap:12px;align-items:flex-start;margin:16px 0 0;padding:12px 14px;border:1px solid var(--line-2,var(--line,rgba(0,0,0,.14)));border-radius:14px;cursor:pointer;font-size:14px;line-height:1.5;color:var(--ink-2,#44403C)}
.acr-case.err{border-color:var(--red,#B42318)}
.acr-case input{flex:none;width:22px;height:22px;margin:1px 0 0;accent-color:var(--acc,var(--or,#F07A2E))}
.acr-case a{color:var(--acc-txt,var(--or-txt,#C2530F));font-weight:700}
.acr-err{margin:6px 0 0;font-size:13px;font-weight:600;color:var(--red,#B42318)}
.acr-ic{display:grid;place-items:center;width:56px;height:56px;margin:0 0 14px;border-radius:18px;color:var(--acc-txt,var(--or-txt,#C2530F));background:color-mix(in srgb,var(--acc,var(--or,#F07A2E)) 12%,transparent)}
.acr-liste{margin:14px 0 0;padding:0;list-style:none;display:grid;gap:10px}
.acr-liste li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.45;color:var(--ink-2,#44403C)}
.acr-liste b{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;font-size:12.5px;color:var(--acc-txt,var(--or-txt,#C2530F));background:color-mix(in srgb,var(--acc,var(--or,#F07A2E)) 12%,transparent)}
.acr-pile{display:grid;gap:10px;margin:18px 0 0}
.acr-champ{display:grid;gap:6px;margin:14px 0 0}
.acr-champ label{font-size:14px;font-weight:700;color:var(--ink,#1C1917)}
.acr-champ .boite{display:flex;align-items:center;gap:8px;min-height:50px;padding:0 6px 0 14px;border:1px solid var(--line-2,var(--line,rgba(0,0,0,.14)));border-radius:14px;background:var(--card,#fff)}
.acr-champ .boite.err{border-color:var(--red,#B42318)}
.acr-champ input{flex:1;min-width:0;border:0;outline:0;background:none;font:inherit;font-size:16px;color:var(--ink,#1C1917);min-height:48px}
.acr-champ button{flex:none;min-width:44px;min-height:44px;border:0;background:none;color:var(--ink-3,#5F5853);font:inherit;font-size:13px;font-weight:700;cursor:pointer;border-radius:10px}
.acr-champ small{font-size:12.5px;color:var(--ink-3,#5F5853)}
`

/**
 * Consentement d'une inscription : une case, les conditions d'utilisation et la politique de confidentialité en liens
 * (chacun s'ouvre sans perdre la saisie : nouvel onglet). `erreur` : on a voulu envoyer sans cocher.
 */
export function AccesConsentement({ coche, changer, conditions, confidentialite, erreur }: { coche: boolean; changer: (v: boolean) => void; conditions: string; confidentialite: string; erreur?: boolean }) {
  return (
    <>
      <style>{CSS}</style>
      <label className={'acr-case' + (erreur ? ' err' : '')}>
        <input type="checkbox" checked={coche} onChange={(e) => changer(e.target.checked)} aria-invalid={erreur || undefined} aria-describedby={erreur ? 'acr-consent-err' : undefined} />
        <span>
          {m('J’accepte les ', 'I accept the ')}
          <a href={conditions} target="_blank" rel="noopener noreferrer">
            {m('conditions d’utilisation', 'terms of use')}
          </a>
          {m(' et la ', ' and the ')}
          <a href={confidentialite} target="_blank" rel="noopener noreferrer">
            {m('politique de confidentialité', 'privacy policy')}
          </a>
          {m(' de BelivaY.', ' of BelivaY.')}
        </span>
      </label>
      {erreur && (
        <p className="acr-err" id="acr-consent-err" role="alert">
          {m('Cochez la case pour accepter les conditions avant d’envoyer.', 'Tick the box to accept the terms before sending.')}
        </p>
      )}
    </>
  )
}

/**
 * Compte en attente de validation (vendeur, entreprise, point relais) : ce qui a été reçu, ce qui se passe ensuite, et
 * deux actions (découvrir l'espace en démonstration en attendant, se déconnecter).
 */
export function AccesAttente({ qui, email, delai, continuer, deconnecter }: { qui: string; email: string; delai?: string; continuer?: () => void; deconnecter: () => void }) {
  return (
    <Acces>
      <style>{CSS}</style>
      <span className="acr-ic" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </span>
      <AccesTitre titre={m('Compte en attente de validation', 'Account awaiting validation')} phrase={m(`Merci : la demande de ${qui} est bien reçue.`, `Thank you: the request for ${qui} has been received.`)} />
      <ol className="acr-liste">
        <li>
          <b>1</b>
          <span>{m('L’équipe BelivaY vérifie votre dossier' + (delai ? ` (${delai})` : '') + '.', 'The BelivaY team checks your file' + (delai ? ` (${delai})` : '') + '.')}</span>
        </li>
        <li>
          <b>2</b>
          <span>{m(`La réponse arrive à ${email}. S’il manque une pièce, on vous dit laquelle.`, `The answer is sent to ${email}. If a document is missing, we tell you which one.`)}</span>
        </li>
        <li>
          <b>3</b>
          <span>{m('Une fois validé, reconnectez-vous : votre espace s’ouvre avec vos vraies données.', 'Once validated, sign in again: your space opens with your real data.')}</span>
        </li>
      </ol>
      <div className="acr-pile">
        {continuer && (
          <button type="button" className="btn primary" onClick={continuer}>
            <span>{m('Découvrir l’espace en attendant', 'Explore the space meanwhile')}</span>
          </button>
        )}
        <button type="button" className="btn secondary" onClick={deconnecter}>
          <span>{m('Se déconnecter', 'Sign out')}</span>
        </button>
      </div>
      {continuer && <AccesNote>{m('En attendant la validation, l’espace montre des données de démonstration : rien n’y est réel.', 'Until validation, the space shows demo data: nothing there is real.')}</AccesNote>}
    </Acces>
  )
}

/** Champ de mot de passe (étiquette visible, œil, aide sous le champ). */
export function ChampMotDePasse({ id, libelle, valeur, changer, aide, erreur, auto = 'new-password', mode }: { id: string; libelle: string; valeur: string; changer: (v: string) => void; aide?: ReactNode; erreur?: boolean; auto?: string; mode?: 'numeric' }) {
  const [voir, setVoir] = useState(false)
  return (
    <div className="acr-champ">
      <style>{CSS}</style>
      <label htmlFor={id}>{libelle}</label>
      <div className={'boite' + (erreur ? ' err' : '')}>
        <input id={id} type={voir ? 'text' : 'password'} autoComplete={auto} inputMode={mode} value={valeur} onChange={(e) => changer(e.target.value)} aria-invalid={erreur || undefined} aria-describedby={aide ? id + '-aide' : undefined} />
        <button type="button" aria-pressed={voir} aria-label={voir ? m('Masquer', 'Hide') : m('Afficher', 'Show')} onClick={() => setVoir((v) => !v)}>
          {voir ? m('Masquer', 'Hide') : m('Afficher', 'Show')}
        </button>
      </div>
      {aide && <small id={id + '-aide'}>{aide}</small>}
    </div>
  )
}

/** Règle commune des mots de passe des comptes réels ; livreur et point relais : un code de 6 chiffres non trivial aussi. */
export function motDePasseValide(v: string, codeAccepte = false): boolean {
  if (codeAccepte && /^\d{6}$/.test(v)) return !/^(\d)\1{5}$/.test(v) && !['123456', '654321', '012345', '123123'].includes(v)
  return v.length >= 8 && /[A-Za-zÀ-ÿ]/.test(v) && /\d/.test(v)
}

/**
 * Lien « mot de passe oublié » d'un compte réel reçu par e-mail (?reinitialiser=<jeton>) : lecture du lien, nouveau
 * mot de passe (deux étapes), puis retour à la connexion. `codeAccepte` : livreur et point relais.
 */
export function ReinitialiserReel({ espace, jeton, versConnexion, codeAccepte }: { espace: Espace; jeton: string; versConnexion: () => void; codeAccepte?: boolean }) {
  const [lien, setLien] = useState<{ email: string } | Refus | null>(null)
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const [vu, setVu] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [fait, setFait] = useState(false)
  useEffect(() => {
    let vivant = true
    void comptesReels.lireReinitialisation(espace, jeton).then((r) => vivant && setLien(r.ok ? { email: r.email } : r))
    return () => {
      vivant = false
    }
  }, [espace, jeton])
  const etapes = <AccesEtapes etapes={[m('Recevoir le lien', 'Receive the link'), m('Nouveau mot de passe', 'New password')]} actuelle={2} libelle={(n, total) => m(`Étape ${n} sur ${total}`, `Step ${n} of ${total}`)} />
  if (!lien)
    return (
      <Acces>
        <p role="status" aria-busy="true">
          {m('Lecture du lien…', 'Reading the link…')}
        </p>
      </Acces>
    )
  if ('code' in lien)
    return (
      <Acces>
        {etapes}
        <AccesTitre titre={m('Lien plus valable', 'Link no longer valid')} />
        <AccesMessage>{messageRefus({ ...lien, code: lien.code === 'erreur' ? 'expire' : lien.code })}</AccesMessage>
        <div className="acr-pile">
          <button type="button" className="btn primary" onClick={versConnexion}>
            <span>{m('Revenir à la connexion', 'Back to sign-in')}</span>
          </button>
        </div>
      </Acces>
    )
  if (fait)
    return (
      <Acces>
        <AccesTitre titre={m('Mot de passe changé', 'Password changed')} phrase={m(`Connectez-vous avec ${lien.email} et votre nouveau mot de passe. Vos autres appareils ont été déconnectés.`, `Sign in with ${lien.email} and your new password. Your other devices have been signed out.`)} />
        <div className="acr-pile">
          <button type="button" className="btn primary" onClick={versConnexion}>
            <span>{m('Me connecter', 'Sign in')}</span>
          </button>
        </div>
      </Acces>
    )
  const valide = motDePasseValide(mdp, codeAccepte)
  const identiques = mdp === mdp2
  const envoyer = async () => {
    setVu(true)
    setRefus(null)
    if (!valide || !identiques || envoi) return
    setEnvoi(true)
    const r = await comptesReels.reinitialiser(espace, jeton, mdp)
    setEnvoi(false)
    if (r.ok) return setFait(true)
    setRefus(messageRefus(r))
  }
  const regle = codeAccepte ? m('8 caractères au moins, avec une lettre et un chiffre ; ou un code de 6 chiffres non trivial.', 'At least 8 characters, with a letter and a digit; or a non-trivial 6-digit code.') : m('8 caractères au moins, avec une lettre et un chiffre.', 'At least 8 characters, with a letter and a digit.')
  return (
    <Acces>
      {etapes}
      <AccesTitre titre={m('Nouveau mot de passe', 'New password')} phrase={m(`Pour le compte ${lien.email}.`, `For the account ${lien.email}.`)} />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void envoyer()
        }}
        noValidate
      >
        <ChampMotDePasse id="acr-mdp" libelle={m('Nouveau mot de passe', 'New password')} valeur={mdp} changer={setMdp} aide={regle} erreur={vu && !valide} />
        <ChampMotDePasse id="acr-mdp2" libelle={m('Encore une fois', 'Once more')} valeur={mdp2} changer={setMdp2} erreur={vu && !identiques} aide={vu && !identiques ? m('Les deux saisies ne sont pas identiques.', 'The two entries do not match.') : undefined} />
        {vu && !valide && <AccesMessage>{regle}</AccesMessage>}
        {refus && <AccesMessage>{refus}</AccesMessage>}
        <div className="acr-pile">
          <button type="submit" className="btn primary" aria-busy={envoi || undefined}>
            <span>{envoi ? m('Enregistrement…', 'Saving…') : m('Enregistrer mon mot de passe', 'Save my password')}</span>
          </button>
        </div>
      </form>
      <AccesNote>{m('BelivaY ne vous demande jamais votre mot de passe, par message ni par téléphone.', 'BelivaY never asks for your password, by message or by phone.')}</AccesNote>
    </Acces>
  )
}
