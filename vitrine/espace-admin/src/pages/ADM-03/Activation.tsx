// Activation d'un compte d'employé (page ajoutée, sans session) : l'employé invité par les Ressources humaines ou la
// Direction (Rôles et accès) ouvre son lien (« /admin/activation?jeton=… », valable ADM-INVITATION-H heures), voit son
// rôle et son périmètre, choisit son mot de passe (MDP-LONG), enrôle son second facteur (clé à saisir dans son
// application d'authentification, puis le code à 6 chiffres) et accepte la charte de la console. Le compte passe
// « actif » (journalisé) ; il se connecte ensuite comme tout agent, avec le second facteur à chaque connexion.
// Même présentation que la connexion (panneau d'identité à gauche sur ordinateur et tablette, carte seule au téléphone).
import { useState, type FormEvent } from 'react'
import { Acces, AccesEtapes, AccesLiens, AccesMessage } from '@client/compte/acces'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Heure } from '../../composants/LigneJournal'
import { Note, Pill } from '../../composants/prototype'
import { ICONE_ROLE, NOM_ROLE, PERIMETRE_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { ResultatActivation } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { usePreferences } from '../../preferences'
import { CadreConsole } from './Connexion'
import { hybride } from '@client/comptes-reels/hybride'
import { AccesConsentement, motDePasseValide } from '@client/compte/acces-reel'
import { codesSecoursAMontrer, enrolementEnCours } from '../../donnees/session-hybride'
import './s1.css'

type Etape = 1 | 2 | 3
const P = PARAMETRES.console

const RAISONS: Record<Exclude<ResultatActivation, { ok: true }>['raison'], string> = {
  inconnue: 'Ce lien d’activation n’existe pas ou a déjà servi.',
  expiree: 'Ce lien d’activation a expiré : demandez une nouvelle invitation.',
  deja_active: 'Ce compte est déjà activé : connectez-vous.',
  mot_de_passe_court: 'Mot de passe trop court ou sans chiffre.',
  mots_de_passe_differents: 'Les deux mots de passe ne sont pas identiques.',
  code_faux: 'Code incorrect : saisissez le code affiché par votre application.',
  charte: 'Acceptez la charte pour activer le compte.',
}

function Etapes({ n }: { n: Etape }) {
  const { t, tf } = usePreferences()
  // Gabarit d'accès commun : « Étape n sur 3 · libellé » puis la barre en segments.
  return <AccesEtapes etapes={[t('Mot de passe'), t('Second facteur'), t('Charte')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
}

export default function Activation() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const jeton = params.get('jeton') ?? ''
  const inv = useLecture(() => source.session.invitation(jeton), [jeton])
  const [etape, setEtape] = useState<Etape>(1)
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [voir, setVoir] = useState(false)
  const [code, setCode] = useState('')
  const [charte, setCharte] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [active, setActive] = useState(false)
  const mdpOk = mdp.length >= P.motDePasseMin && /\d/.test(mdp)
  const r = inv.donnees
  // Comptes réels (source hybride) : une invitation du serveur n'a pas de clé de démonstration. Ordre réel : mot de
  // passe, charte et conditions (le compte se crée), puis l'enrôlement de l'application (QR, secret, code), puis les
  // codes de secours à noter.
  const reel = hybride && !!r?.ok && r.invitation.cleSecondFacteur === ''
  const [accepte, setAccepte] = useState(false)
  const [enrol, setEnrol] = useState<{ qr: string; secret: string } | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const creerReel = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!motDePasseValide(mdp)) return setMessage(t('Mot de passe trop faible : 8 caractères au moins, avec une lettre et un chiffre.'))
    if (mdp !== confirmation) return setMessage(t(RAISONS.mots_de_passe_differents))
    if (!charte || !accepte) return setMessage(t('Acceptez la charte, les conditions d’utilisation et la politique de confidentialité pour continuer.'))
    setEnvoi(true)
    // Premier envoi : l'accès se crée (mot de passe, charte, conditions) ; le serveur rend l'enrôlement réel.
    const x = await source.session.activer(jeton, { motDePasse: mdp, confirmation, code: '', charte: true })
    setEnvoi(false)
    const en = enrolementEnCours()
    if (x.ok || !en) return setMessage(x.ok ? null : t(RAISONS[x.raison]))
    setEnrol({ qr: en.qr, secret: en.secret })
    setEtape(2)
  }
  const verifierReel = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setEnvoi(true)
    const x = await source.session.activer(jeton, { motDePasse: mdp, confirmation, code, charte: true })
    setEnvoi(false)
    if (x.ok) {
      setCodes(codesSecoursAMontrer())
      return setActive(true)
    }
    setCode('')
    setMessage(x.raison === 'code_faux' ? t('Code incorrect : vérifiez l’heure du téléphone, puis saisissez le code affiché maintenant.') : t('Le délai est passé : rouvrez le lien d’activation reçu par e-mail.'))
  }

  const suivant = (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (etape === 1) {
      if (!mdpOk) return setMessage(t(RAISONS.mot_de_passe_court))
      if (mdp !== confirmation) return setMessage(t(RAISONS.mots_de_passe_differents))
      setEtape(2)
    } else if (etape === 2) {
      if (code.length !== 6) return
      setEtape(3)
    }
  }
  const activer = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    setMessage(null)
    try {
      const x = await source.session.activer(jeton, { motDePasse: mdp, confirmation, code, charte })
      if (x.ok) setActive(true)
      else {
        setMessage(t(RAISONS[x.raison]))
        if (x.raison === 'code_faux') {
          setCode('')
          setEtape(2)
        } else if (x.raison === 'mot_de_passe_court' || x.raison === 'mots_de_passe_differents') setEtape(1)
      }
    } catch {
      setMessage(t('Activation impossible pour le moment : réessayez.'))
    } finally {
      setEnvoi(false)
    }
  }

  const boite = (() => {
    // Ouvert depuis l'onglet « Activer mon accès », sans lien : ce qu'il faut faire, sans parler d'erreur.
    if (!jeton)
      return (
        <div>
          <h1 className="admA-h">{t('Activer mon accès')}</h1>
          <div className="s">{t('Votre accès à la console est créé par un compte Direction. Ouvrez le lien d’activation reçu sur votre e-mail nominatif : mot de passe, second facteur, puis la charte.')}</div>
          <Etapes n={1} />
          <Note ton="acc" icone="mail" className="mt10">
            {t('Pas de lien, ou lien expiré ? Demandez à la Direction de vous renvoyer une invitation. Aucune inscription libre.')}
          </Note>
          <Link className="btn secondary mt14" to={chemin('connexion')}>
            <Icone nom="log-in" taille={18} />
            <span>{t('J’ai déjà un accès : me connecter')}</span>
          </Link>
        </div>
      )
    if (r === null) return <p className="t13 c3" aria-busy="true">{t('Lecture de l’invitation…')}</p>
    if (!r.ok)
      return (
        <div className="center" role="alert">
          <span className="ic red" style={{ width: 56, height: 56, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icone nom={r.raison === 'deja_active' ? 'circle-check' : 'circle-x'} taille={28} />
          </span>
          <h2>{r.raison === 'deja_active' ? t('Compte déjà activé') : t('Lien d’activation invalide')}</h2>
          <div className="s">{t(RAISONS[r.raison])}</div>
          <Link className="btn primary mt14" to={chemin('connexion')}>
            <Icone nom="log-in" taille={18} />
            <span>{t('Aller à la connexion')}</span>
          </Link>
        </div>
      )
    const i = r.invitation
    if (active)
      return (
        <div className="center" role="status">
          <span className="ic green" style={{ width: 56, height: 56, borderRadius: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icone nom="circle-check" taille={28} />
          </span>
          <h2>{t('Compte activé')}</h2>
          <div className="s">{tf('{email} · second facteur à chaque connexion', { email: i.email })}</div>
          {codes && (
            <>
              <div className="s mt10">{t('Vos codes de secours : chacun ouvre la console une seule fois si vous perdez votre téléphone. Notez-les maintenant, ils ne seront plus montrés.')}</div>
              <ul className="s1-secours mt10" aria-label={t('Codes de secours')}>
                {codes.map((c) => (
                  <li key={c}>
                    <code>{c}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link className="btn primary mt14" to={chemin('connexion')}>
            <Icone nom="log-in" taille={18} />
            <span>{t('Se connecter')}</span>
          </Link>
        </div>
      )
    const identite = (
      <div className="admA-idchip">
        <span className="avatar" style={{ width: 36, height: 36, marginLeft: 0 }} aria-hidden="true">
          {(i.prenom[0] + i.nom[0]).toUpperCase()}
        </span>
        <span className="grow">
          <b>{`${i.prenom} ${i.nom}`}</b>
          <span className="c3 t12">{i.email}</span>
        </span>
        <span className="row wrap" style={{ gap: 4, justifyContent: 'flex-end' }}>
          {i.roles.map((x) => (
            <Pill key={x} ton="acc" sm icone={ICONE_ROLE[x]}>
              {t(NOM_ROLE[x])}
            </Pill>
          ))}
        </span>
      </div>
    )
    const erreur = message && <AccesMessage>{message}</AccesMessage>
    if (etape === 1)
      return (
        <form onSubmit={reel ? (e) => void creerReel(e) : suivant}>
          <Etapes n={1} />
          {identite}
          <h1 className="admA-h">{t('Choisir mon mot de passe')}</h1>
          <div className="s">
            {tf('{perimetre} · lien valable jusqu’à', { perimetre: i.zones ? i.zones.join(', ') : t(PERIMETRE_ROLE[i.roles[0]]) })} <Heure le={i.expireLe} />
          </div>
          <label className="fld fld-l mt14">
            <span className="fld-t">{tf('Mot de passe · {n} caractères au moins, dont un chiffre', { n: P.motDePasseMin })}</span>
            <span className="inp">
              <Icone nom="lock-keyhole" taille={18} />
              <input type={voir ? 'text' : 'password'} value={mdp} onChange={(e) => setMdp(e.target.value)} autoComplete="new-password" required />
              <button type="button" className="btn ghost sm s1-oeil" aria-label={voir ? t('Masquer le mot de passe') : t('Afficher le mot de passe')} aria-pressed={voir} onClick={() => setVoir(!voir)}>
                <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
              </button>
            </span>
          </label>
          <label className="fld fld-l mt10">
            <span className="fld-t">{t('Confirmer le mot de passe')}</span>
            <span className="inp">
              <Icone nom="lock-keyhole" taille={18} />
              <input type={voir ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required />
            </span>
          </label>
          {reel && (
            <>
              <label className="s1-accepte mt10">
                <input type="checkbox" checked={charte} onChange={(e) => setCharte(e.target.checked)} />
                <span>{t('J’accepte la charte de la console BelivaY : compte nominatif, gestes journalisés, décisions sensibles à quatre yeux.')}</span>
              </label>
              <AccesConsentement coche={accepte} changer={setAccepte} conditions="/cgu" confidentialite="/legal-doc?d=confidentialite" />
            </>
          )}
          {erreur}
          <button type="submit" className="btn primary" disabled={!mdp || !confirmation || envoi}>
            <Icone nom="arrow-right" taille={18} />
            <span>{envoi ? t('Création…') : t('Continuer')}</span>
          </button>
        </form>
      )
    if (etape === 2)
      return (
        <form onSubmit={reel ? (e) => void verifierReel(e) : suivant}>
          <Etapes n={2} />
          {identite}
          <h1 className="admA-h">{t('Enrôler le second facteur')}</h1>
          {reel && enrol ? (
            <div className="s1-enrol mt10">
              <img src={enrol.qr} alt={t('QR code à scanner avec votre application d’authentification')} width={176} height={176} />
              <div>
                <div className="t13 c2">{t('Scannez ce QR code avec votre application d’authentification, ou saisissez cette clé :')}</div>
                <div className="s1-cle mt6" aria-label={t('Clé du second facteur')}>
                  <code>{enrol.secret}</code>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="s">{t('Clé à saisir dans votre application d’authentification :')}</div>
              <div className="s1-cle mt10" aria-label={t('Clé du second facteur')}>
                <code>{i.cleSecondFacteur}</code>
              </div>
            </>
          )}
          <label className="fld fld-l mt14">
            <span className="fld-t">{t('Code à 6 chiffres affiché par l’application')}</span>
            <span className="s1-code">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label={t('Code à 6 chiffres')} maxLength={6} autoFocus />
            </span>
          </label>
          {erreur}
          <button type="submit" className="btn primary" disabled={code.length !== 6 || envoi}>
            <Icone nom="shield-check" taille={18} />
            <span>{t('Vérifier le code')}</span>
          </button>
          {!reel && (
            <AccesLiens label={t('Autres liens')}>
              <button type="button" onClick={() => setEtape(1)}>
                {t('Revenir au mot de passe')}
              </button>
            </AccesLiens>
          )}
          {!reel && <p className="t12 c3 mt6">{t('Démonstration : le code de l’application est 246810.')}</p>}
        </form>
      )
    return (
      <form onSubmit={(e) => void activer(e)}>
        <Etapes n={3} />
        {identite}
        <h1 className="admA-h">{t('Accepter la charte')}</h1>
        <ul className="s1-charte mt10">
          <li>
            <Icone nom="user-check" taille={16} /> {t('Compte nominatif, jamais partagé, jamais depuis un appareil public.')}
          </li>
          <li>
            <Icone nom="eye-off" taille={16} /> {t('Données personnelles vues seulement pour traiter un dossier (loi n° 2024/017).')}
          </li>
          <li>
            <Icone nom="scroll-text" taille={16} /> {t('Chaque geste est journalisé : auteur, rôle, heure, motif.')}
          </li>
          <li>
            <Icone nom="users-round" taille={16} /> {t('Décisions sensibles à quatre yeux : jamais seul.')}
          </li>
        </ul>
        <label className="s1-accepte mt10">
          <input type="checkbox" checked={charte} onChange={(e) => setCharte(e.target.checked)} />
          <span>{t('J’accepte la charte de la console BelivaY')}</span>
        </label>
        {erreur}
        <button type="submit" className="btn primary" disabled={!charte || envoi}>
          <Icone nom="badge-check" taille={18} />
          <span>{t('Activer mon compte')}</span>
        </button>
        <AccesLiens label={t('Autres liens')}>
          <button type="button" onClick={() => setEtape(2)}>
            {t('Revenir au second facteur')}
          </button>
        </AccesLiens>
        <Note ton="acc" icone="shield-check" className="mt10">
          {tf('Session de {h} h au plus, second facteur à chaque connexion.', { h: P.sessionHeures })}
        </Note>
      </form>
    )
  })()

  return (
    <Ecran route="activation" plein>
      <CadreConsole actif="inscription">
        {(!r?.ok || active) && <h1 className="vh">{t('Activation du compte')}</h1>}
        <Acces>{boite}</Acces>
      </CadreConsole>
    </Ecran>
  )
}
