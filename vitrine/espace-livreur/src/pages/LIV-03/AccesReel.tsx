// Comptes réels du livreur (source « hybride », site/COMPTES-REELS.md) — rien de ceci ne paraît en démonstration ni
// avec l'API :
// (La connexion elle-même, numéro puis PIN, passe par l'adaptateur session-hybride.ts sur l'écran habituel.)
// - InvitationReelle : le lien d'invitation de l'entreprise (?invitation=<jeton>) : qui invite, pour quelle entreprise,
//   puis un code de 6 chiffres ou un mot de passe, le consentement aux conditions, et l'accès est créé.
// Messages humains (messageRefus), un seul bouton plein par écran, un <form> par formulaire, refus annoncés et focalisés.
import { useEffect, useRef, useState } from 'react'
import { comptesReels, type SessionReelle } from '@client/comptes-reels/client'
import { fixerSession, lierAppareil } from '@client/comptes-reels/hybride'
import { AccesConsentement, ChampMotDePasse, messageRefus, motDePasseValide } from '@client/compte/acces-reel'
import { AccesEtapes, AccesMessage, AccesTitre } from '@client/compte/acces'
import { usePreferences } from '../../preferences'

const E = 'livreur' as const
type Message = { ton: 'err' | 'ok' | 'info'; texte: string }

/** Message focalisé (lecteurs d'écran et clavier y arrivent dès qu'il paraît). */
function MessageFocalise({ m }: { m: Message | null }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (m) ref.current?.focus()
  }, [m])
  if (!m) return null
  return (
    <div ref={ref} tabIndex={-1} style={{ outline: 'none' }}>
      <AccesMessage ton={m.ton}>{m.texte}</AccesMessage>
    </div>
  )
}

/** Connexion d'un livreur réel : numéro ou e-mail, mot de passe ou code personnel. */
/** Le lien d'invitation de l'entreprise : créer son accès (code de 6 chiffres ou mot de passe), puis entrer. */
export function InvitationReelle({ jeton, entrer, versConnexion }: { jeton: string; entrer: (r: SessionReelle) => void; versConnexion: () => void }) {
  const { t, tf } = usePreferences()
  type Lecture = Awaited<ReturnType<typeof comptesReels.lireInvitation>>
  const [lien, setLien] = useState<Lecture | null>(null)
  const [genre, setGenre] = useState<'code' | 'mdp'>('code')
  const [secret, setSecret] = useState('')
  const [secret2, setSecret2] = useState('')
  const [accepte, setAccepte] = useState(false)
  const [vu, setVu] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [msg, setMsg] = useState<Message | null>(null)
  useEffect(() => {
    let vivant = true
    void comptesReels.lireInvitation(E, jeton).then((r) => vivant && setLien(r))
    return () => {
      vivant = false
    }
  }, [jeton])
  const etapes = (n: number) => <AccesEtapes etapes={[t('Invitation'), t('Votre code'), t('Votre journée')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
  if (!lien)
    return (
      <p role="status" aria-busy="true" className="liva-full">
        {t('Lecture de l’invitation…')}
      </p>
    )
  if (!lien.ok) {
    return (
      <div className="liva-full" style={{ textAlign: 'left' }}>
        <AccesTitre
          titre={lien.code === 'utilise' ? t('Invitation déjà utilisée') : lien.code === 'expire' ? t('Invitation expirée') : lien.code === 'indisponible' ? t('Service momentanément indisponible') : t('Lien d’invitation inconnu')}
          phrase={lien.code === 'utilise' ? t('Votre accès existe déjà : connectez-vous avec votre numéro ou votre e-mail.') : lien.code === 'indisponible' ? t('Le service des comptes ne répond pas pour le moment : réessayez dans un instant.') : t('Demandez à votre entreprise un nouveau lien : il vaut 72 heures et sert une fois.')}
        />
        <div className="btns liva-col mt16">
          <button type="button" className="btn primary xl" style={{ width: '100%' }} onClick={versConnexion}>
            <span>{lien.code === 'utilise' ? t('Me connecter') : t('Revenir à la connexion')}</span>
          </button>
        </div>
      </div>
    )
  }
  const valide = genre === 'code' ? /^\d{6}$/.test(secret) && motDePasseValide(secret, true) : motDePasseValide(secret)
  const identiques = secret === secret2
  const creer = async () => {
    setVu(true)
    setMsg(null)
    if (!valide || !identiques || !accepte) {
      // Le premier champ à reprendre reçoit le focus (clavier, lecteur d'écran).
      const cible = !valide ? '#l3-inv-1' : !identiques ? '#l3-inv-2' : '.acr-case input'
      return void setTimeout(() => document.querySelector<HTMLElement>(cible)?.focus(), 0)
    }
    if (envoi) return
    setEnvoi(true)
    const r = await comptesReels.inscrire(E, { jeton, motDePasse: secret, conditions: { acceptees: true, version: '1.0' } })
    setEnvoi(false)
    if (!r.ok) {
      setSecret('')
      setSecret2('')
      setVu(false)
      return setMsg({
        ton: 'err',
        texte:
          r.code === 'pin_trop_simple'
            ? t('Ce code est trop simple : évitez 123456, 000000 et les suites.')
            : r.code === 'mot_de_passe_demo'
              ? t('Ce mot de passe est réservé à la démonstration : choisissez-en un autre.')
              : r.code === 'expire' || r.code === 'utilise' || r.code === 'invalide'
                ? t('Ce lien d’invitation n’est plus valable : demandez à votre entreprise un nouveau lien.')
                : messageRefus(r),
      })
    }
    fixerSession(E, r)
    // L'appareil est lié au compte : la prochaine connexion passe par le PIN (session-hybride.ts).
    lierAppareil(E, { identifiant: r.user.phone ?? r.user.email, prenom: r.user.first_name, nom: r.user.last_name, essaisRestants: 5, bloqueJusqua: null })
    entrer(r)
  }
  const aide = genre === 'code' ? t('6 chiffres, pas une suite (123456) ni un même chiffre répété.') : t('8 caractères au moins, avec une lettre et un chiffre.')
  return (
    <div className="liva-full" style={{ textAlign: 'left' }}>
      {etapes(2)}
      <AccesTitre
        titre={lien.prenom ? tf('Bienvenue {prenom}', { prenom: lien.prenom }) : t('Bienvenue')}
        phrase={
          lien.organisation
            ? tf('{qui} vous invite à livrer pour {entreprise}. Votre accès : {email}.', { qui: lien.invitant ?? t('Votre entreprise'), entreprise: lien.organisation, email: lien.email })
            : tf('Votre entreprise de livraison vous invite. Votre accès : {email}.', { email: lien.email })
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void creer()
        }}
        noValidate
      >
        <fieldset className="acc-choix" style={{ marginTop: 4 }}>
          <legend className="acc-choix-t">{t('Pour ouvrir l’application')}</legend>
          <div className="l3-genre">
            {(
              [
                ['code', t('Un code de 6 chiffres')],
                ['mdp', t('Un mot de passe')],
              ] as const
            ).map(([g, nom]) => (
              <label key={g} className={'l3-genre-l' + (genre === g ? ' on' : '')}>
                <input type="radio" name="l3-genre" checked={genre === g} onChange={() => (setGenre(g), setSecret(''), setSecret2(''), setVu(false))} />
                <span>{nom}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <ChampMotDePasse id="l3-inv-1" libelle={genre === 'code' ? t('Votre code') : t('Votre mot de passe')} valeur={secret} changer={setSecret} mode={genre === 'code' ? 'numeric' : undefined} aide={aide} erreur={vu && !valide} />
        <ChampMotDePasse id="l3-inv-2" libelle={t('Encore une fois')} valeur={secret2} changer={setSecret2} mode={genre === 'code' ? 'numeric' : undefined} erreur={vu && !identiques} aide={vu && !identiques ? t('Les deux saisies ne sont pas identiques.') : undefined} />
        <AccesConsentement coche={accepte} changer={setAccepte} conditions="/cgu" confidentialite="/legal-doc?d=confidentialite" erreur={vu && !accepte} />
        {vu && !valide && <AccesMessage>{aide}</AccesMessage>}
        <MessageFocalise m={msg} />
        <div className="btns liva-col mt16">
          <button type="submit" className="btn primary xl" aria-busy={envoi || undefined} style={{ width: '100%' }}>
            <span>{envoi ? t('Création…') : t('Créer mon accès')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
