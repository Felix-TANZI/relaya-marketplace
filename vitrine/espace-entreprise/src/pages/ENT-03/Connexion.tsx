// ENT-P01 · Connexion et accès (sans session), au cadre d'accès commun (compte/acces.tsx, ACCES-REFERENCES.md, refonte
// du 25 oct. 2026) : en-tête (logo, espace, thème, FR/EN), accroche et photo de marque, carte qui les chevauche ; en tête
// de la carte, les deux chemins « Se connecter » et « Devenir partenaire » (Candidature.tsx). Les étapes qui suivent
// l'identifiant (code, mot de passe oublié, invitation, choix de l'espace, état du compte, blocage) passent en mode
// compact au téléphone (formulaire d'abord). Sous la carte : aide, conditions, confidentialité et mentions (RCCM).
// Déroulé (ENT-03-R04) : numéro +237 ou e-mail et mot de passe (œil) ; échec : message sous le champ et essais
// restants, blocage après echecs_avant_blocage avec le temps restant (ENT-03-R07) ; code SMS à 6 chiffres pour la
// propriétaire et la comptable toujours, le répartiteur sur un appareil nouveau (ENT-P01R-03), renvoi après le délai
// du registre, support après les renvois permis, jamais de code par téléphone (ENT-03-R05) ; deux espaces : choix
// (ENT-PAR-06) ; compte non actif : ce qui manque (ENT-P27). Mot de passe oublié par code SMS ; première connexion
// sur invitation nominative à usage unique (ENT-P01R-01) ; accès retiré ; session expirée ; changement de numéro.
// Rappel : BelivaY ne demande jamais le code secret Mobile Money (ENT-ARG-08). Démonstration : le seul compte de la
// propriétaire de Yafé Express (AccesDemo), le code reçu affiché à l'étape du code.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : la connexion par e-mail passe par le serveur des comptes
// (session-hybride.ts) ; un compte « en attente de validation » voit AccesAttente au lieu d'entrer ; le mot de passe
// oublié d'une adresse e-mail envoie le lien du serveur, et ce lien (?reinitialiser=) ouvre ReinitialiserReel.
import { LienParEmail, RetourMemorise, SeSouvenir, useMemoire } from '../../composants/ConnexionPlus'
import { connecterParLien } from '../../demo/session'
import { ouvrirLienConnexion, retouchesDe } from '../../donnees/mon-compte'
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { env } from '@client/config/env'
import { comptesReels, type SessionReelle } from '@client/comptes-reels/client'
import { AVIS, hybride, sessionReelle } from '@client/comptes-reels/hybride'
import { AccesAttente, ReinitialiserReel, messageRefus } from '@client/compte/acces-reel'
import { COORDONNEES } from '@client/config/coordonnees'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { NOM_ETAT, NOM_ROLE } from '../../config/libelles'
import { ACCUEIL, chemin } from '../../config/pages'
import type { EnvoiCode, EspaceAcces, InvitationAcces } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { PARAMETRES_FLOTTE, motDePasseValide } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { PiedAcces, useDates } from './outils'
import logo from '../../assets/logo-belivay.png'
import { Ecran } from '../../composants/coque'
import { Hint, Note } from '../../composants/prototype'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesEtapes, AccesLiens, AccesMessage, AccesTitre } from '@client/compte/acces'

const A = PARAMETRES.acces
const URL_RELAIS = 'https://belivay.com/relais/'
type Etape = 'formulaire' | 'code' | 'espace' | 'etat' | 'oubli' | 'oubli-code' | 'invitation' | 'numero'
type Defi = EnvoiCode & { codeDemonstration?: string; but: 'connexion' | 'oubli' }

/** Six cases d'un code SMS : saisie chiffre par chiffre, collage d'un coup, retour arrière. */
function CasesCode({ valeur, changer, longueur }: { valeur: string; changer: (v: string) => void; longueur: number }) {
  const { tf } = usePreferences()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => refs.current[0]?.focus(), [])
  // Code SMS rempli tout seul (motif M20) : WebOTP sur Android (le SMS se termine par « @domaine #code »), et la
  // suggestion du clavier (autocomplete one-time-code) qui pose le code entier dans la première case.
  useEffect(() => {
    if (typeof window === 'undefined' || !(`OTPCredential` in window) || !navigator.credentials) return
    const arret = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: arret.signal } as CredentialRequestOptions)
      .then((c) => {
        const code = (c as (Credential & { code?: string }) | null)?.code?.replace(/\D/g, '').slice(0, longueur)
        if (code) changer(code)
      })
      .catch(() => undefined)
    return () => arret.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const poser = (i: number, c: string) => {
    const chiffres = valeur.padEnd(longueur, ' ').split('')
    chiffres[i] = c || ' '
    changer(chiffres.join('').replace(/\s+$/, ''))
  }
  return (
    <div className="otp" onPaste={(e: ClipboardEvent) => {
      const v = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, longueur)
      if (v) {
        e.preventDefault()
        changer(v)
        refs.current[Math.min(v.length, longueur - 1)]?.focus()
      }
    }}>
      {Array.from({ length: longueur }, (_, i) => (
        <input
          key={i}
          ref={(el) => void (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? longueur : 1}
          aria-label={tf('Chiffre {n} sur {t}', { n: i + 1, t: longueur })}
          value={valeur[i]?.trim() ?? ''}
          onChange={(e) => {
            const tous = e.target.value.replace(/\D/g, '')
            // Code entier posé d'un coup (suggestion du clavier, remplissage automatique) : réparti dans les cases.
            if (tous.length >= longueur) {
              changer(tous.slice(-longueur))
              refs.current[longueur - 1]?.focus()
              return
            }
            const c = tous.slice(-1)
            poser(i, c)
            if (c) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && !e.currentTarget.value) refs.current[i - 1]?.focus()
          }}
        />
      ))}
    </div>
  )
}

function ChampMdp({ valeur, changer, libelle, auto }: { valeur: string; changer: (v: string) => void; libelle: string; auto: string }) {
  const { t } = usePreferences()
  const [voir, setVoir] = useState(false)
  return (
    <div className="fld">
      <label>
        {libelle}
        <span className="inp">
          <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input type={voir ? 'text' : 'password'} value={valeur} onChange={(e) => changer(e.target.value)} autoComplete={auto} />
          <button type="button" className="ibtn" onClick={() => setVoir(!voir)} aria-label={t(voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} aria-pressed={voir}>
            <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
          </button>
        </span>
      </label>
    </div>
  )
}

/** Champ du prototype (C.fld) : libellé, boîte avec icône, vrai champ de saisie. */
function Champ({ libelle, icone, valeur, changer, auto, mode, invalide }: { libelle: string; icone: string; valeur: string; changer: (v: string) => void; auto?: string; mode?: 'email' | 'tel'; invalide?: boolean }) {
  return (
    <div className="fld">
      <label>
        {libelle}
        <span className={'inp' + (invalide ? ' err' : '')}>
          <Icone nom={icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input value={valeur} onChange={(e) => changer(e.target.value)} autoComplete={auto} inputMode={mode} aria-invalid={invalide || undefined} />
        </span>
      </label>
    </div>
  )
}

/** Mot de passe oublié en deux étapes (gabarit d'accès commun). */
function EtapesOubli({ n }: { n: 1 | 2 }) {
  const { t, tf } = usePreferences()
  return <AccesEtapes etapes={[t('Votre accès'), t('Code et nouveau mot de passe')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
}

export default function Connexion() {
  const prefs = usePreferences()
  const { t, tf } = prefs
  const { heure } = useDates()
  const s = useSession()
  const maintenant = useHorloge(1000)
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const jeton = params.get('invitation')
  // Comptes réels : lien « mot de passe oublié » reçu par e-mail ; compte en attente de validation ; oubli par e-mail.
  const jetonReinit = hybride ? params.get('reinitialiser') : null
  const [attente, setAttente] = useState<SessionReelle | null>(null)
  const [oubliReel, setOubliReel] = useState<{ ton: 'ok' | 'err' | 'info'; texte: string } | null>(null)
  const suite = params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : chemin(ACCUEIL)
  const [etape, setEtape] = useState<Etape>(jeton ? 'invitation' : 'formulaire')
  const memoire = useMemoire()
  const [identifiant, setIdentifiant] = useState(() => memoire.memo?.email ?? '')
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [bloqueJusqua, setBloque] = useState<number | null>(null)
  const [defi, setDefi] = useState<Defi | null>(null)
  const [renvoiA, setRenvoiA] = useState(0)
  const [espaces, setEspaces] = useState<EspaceAcces[]>([])
  const [fini, setFini] = useState(false)
  const [encours, setEncours] = useState(false)
  const invitation = useLecture(() => (jeton ? source.session.invitation(jeton) : Promise.resolve(null)), [jeton])
  const compte = useLecture(() => (s.connecte ? source.compte.etat() : Promise.resolve(null)), [s.connecte])

  // La session ouverte (relue par la coque) : on part vers l'espace, ou on dit ce qui manque au compte.
  useEffect(() => {
    if (!fini || !s.connecte || !compte.donnees) return
    // « Se souvenir de cet appareil » : l'e-mail (ou le numéro) seulement, avec le prénom et la photo du « Bon retour ».
    if (s.utilisateur) memoire.retenir({ email: identifiant.trim(), prenom: s.utilisateur.prenom, initiales: s.utilisateur.initiales, photo: retouchesDe(s.utilisateur.id).photo ?? null })
    if (espaces.length > 1) return setEtape('espace')
    if (['configuration', 'suspendu', 'resilie'].includes(compte.donnees.etat)) return setEtape('etat')
    naviguer(suite, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fini, s.connecte, compte.donnees, espaces, suite, naviguer])

  const reste = bloqueJusqua ? bloqueJusqua - maintenant : 0
  const bloque = reste > 0
  const attenteRenvoi = Math.max(0, Math.ceil((renvoiA - maintenant) / 1000))

  const recevoirCode = (r: EnvoiCode & { codeDemonstration?: string }, but: Defi['but']) => {
    setDefi({ ...r, but })
    setCode('')
    setRenvoiA(Date.now() + r.renvoiDans * 1000 - (Date.now() - maintenant))
    setEtape(but === 'oubli' ? 'oubli-code' : 'code')
    jouer('code')
  }

  // Kit (mode API) : le lien de connexion reçu par e-mail (« ?lien= ») remplace le mot de passe, une seule fois.
  const lienRecu = env.source === 'api' ? params.get('lien') : null
  const lienOuvert = useRef(false)
  useEffect(() => {
    if (!lienRecu || lienOuvert.current) return
    lienOuvert.current = true
    void connecter(undefined, lienRecu)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lienRecu])

  const connecter = async (lien?: string, jetonLien?: string) => {
    setEncours(true)
    setErreur(null)
    try {
      if (lien) setIdentifiant(lien)
      const r = jetonLien ? await ouvrirLienConnexion(jetonLien) : lien ? await connecterParLien(lien) : await source.session.connecter(identifiant, mdp)
      if (!r.ok) {
        jouer('erreur')
        if (r.raison === 'lien_expire') setErreur(t('Ce lien de connexion n’est plus valable : demandez-en un nouveau, ou connectez-vous avec votre mot de passe.'))
        else if (r.raison === 'bloque') setBloque(r.jusqua)
        else if (r.raison === 'retire') setErreur(t('Accès retiré par votre entreprise. Demandez au propriétaire de vous inviter de nouveau si c’est une erreur.'))
        else setErreur(r.essaisRestants > 0 ? tf('Numéro, e-mail ou mot de passe incorrect. Encore {n} essai(s) avant un blocage de {m} minutes.', { n: r.essaisRestants, m: A.blocageMinutes }) : t('Numéro, e-mail ou mot de passe incorrect.'))
        return
      }
      if (r.code) return recevoirCode(r as typeof r & { codeDemonstration?: string }, 'connexion')
      // Compte réel en attente de validation : on le dit, au lieu d'entrer dans l'espace.
      if (hybride && !lien && !jetonLien) {
        const reel = await sessionReelle('entreprise')
        if (reel?.user.statut === 'en_attente') return setAttente(reel)
      }
      setEspaces(r.espaces ?? [])
      setFini(true)
    } catch {
      setErreur(t('La connexion n’a pas pu se faire : vérifiez le réseau, vos saisies sont gardées. Réessayez.'))
    } finally {
      setEncours(false)
    }
  }

  const valider = async () => {
    if (!defi) return
    setEncours(true)
    setErreur(null)
    try {
      const r = await source.session.verifierCode(defi.defi, code)
      if (!r.ok) {
        jouer('erreur')
        if (r.raison === 'expire' || r.essaisRestants <= 0) {
          setBloque(Date.now() + A.blocageMinutes * 60_000 - (Date.now() - maintenant))
          setEtape('formulaire')
          setErreur(t('Trop d’essais : la connexion est bloquée un moment.'))
        } else setErreur(tf('Code incorrect. Encore {n} essai(s).', { n: r.essaisRestants }))
        setCode('')
        return
      }
      setEspaces(r.espaces ?? [])
      setFini(true)
    } finally {
      setEncours(false)
    }
  }

  const renvoyer = async () => {
    if (!defi) return
    const r = await source.session.renvoyerCode(defi.defi)
    if (r.ok) {
      setRenvoiA(Date.now() + r.renvoiDans * 1000 - (Date.now() - maintenant))
      setDefi({ ...defi, codeDemonstration: (r as typeof r & { codeDemonstration?: string }).codeDemonstration ?? defi.codeDemonstration })
      setInfo(t('Nouveau code envoyé par SMS.'))
      jouer('code')
    } else if (r.raison === 'trop_tot') setRenvoiA(Date.now() + r.renvoiDans * 1000)
    else setInfo(t('Plusieurs codes sont déjà partis : contactez le support BelivaY. Personne ne vous donnera de code par téléphone.'))
  }

  const reinitialiser = async () => {
    if (!defi) return
    if (mdp !== mdp2) return setErreur(t('Les deux mots de passe ne sont pas identiques.'))
    const r = await source.session.reinitialiser(defi.defi, code, mdp)
    if (!r.ok) {
      jouer('erreur')
      setErreur(r.raison === 'mot_de_passe' ? tf('Mot de passe : {n} caractères au moins, dont un chiffre.', { n: PARAMETRES_FLOTTE.motDePasseMin }) : r.raison === 'expire' ? t('Ce code n’est plus valable : recommencez.') : tf('Code incorrect. Encore {n} essai(s).', { n: r.essaisRestants }))
      if (r.raison === 'expire') setEtape('oubli')
      return
    }
    jouer('valide')
    setMdp('')
    setMdp2('')
    setDefi(null)
    setEtape('formulaire')
    setInfo(t('Mot de passe changé : connectez-vous avec le nouveau.'))
  }

  const creerAcces = async (inv: InvitationAcces) => {
    if (mdp !== mdp2) return setErreur(t('Les deux mots de passe ne sont pas identiques.'))
    const r = await source.session.creerAcces(inv.jeton, mdp)
    if (!r.ok) {
      jouer('erreur')
      setErreur(r.raison === 'mot_de_passe' ? tf('Mot de passe : {n} caractères au moins, dont un chiffre.', { n: PARAMETRES_FLOTTE.motDePasseMin }) : r.raison === 'utilisee' ? t('Cette invitation a déjà servi : connectez-vous.') : t('Cette invitation a expiré : demandez au propriétaire de vous en renvoyer une.'))
      return
    }
    recevoirCode(r, 'connexion')
  }

  const etatCompte = compte.donnees?.etat
  const erreurTexte = erreur && <AccesMessage>{erreur}</AccesMessage>
  const demo = defi?.codeDemonstration && env.source !== 'api' && (
    <Note ton="ink" icone="info">
      {tf('Démonstration : le code reçu est {c}.', { c: defi.codeDemonstration })}
    </Note>
  )
  // Titre de l'étape (gabarit commun) : surtitre, titre (h1 : la carte est le contenu de la page), une phrase.
  const entete = (kick: string, titre: string, sous?: string, rouge?: boolean) => <AccesTitre surtitre={kick ? rouge ? <span style={{ color: 'var(--red)' }}>{kick}</span> : kick : undefined} titre={titre} phrase={sous} />
  const carte = (() => {
    if (s.connecte && !fini && etape !== 'espace' && etape !== 'etat')
      return (
        <>
          {entete(s.entreprise?.nom ?? '', tf('Vous êtes connecté · {role}', { role: t(NOM_ROLE[s.utilisateur!.role]) }))}
          <Link className="btn primary xl" to={chemin(ACCUEIL)}>
            <Icone nom="arrow-right" taille={18} />
            <span>{t('Aller au tableau de bord')}</span>
          </Link>
        </>
      )
    switch (etape) {
      case 'code':
        return (
          <form onSubmit={(e) => (e.preventDefault(), code.length === A.longueurCode && !encours && void valider())}>
            {entete(t('Second facteur'), t('Code de vérification'), tf('Saisissez le code à {n} chiffres envoyé par SMS au {dest}.', { n: A.longueurCode, dest: defi?.destination ?? '' }))}
            <CasesCode valeur={code} changer={setCode} longueur={A.longueurCode} />
            {erreurTexte}
            {info && (
              <div className="hint mt8" role="status">
                {info}
              </div>
            )}
            <button type="submit" className="btn primary xl" disabled={code.length !== A.longueurCode || encours}>
              <Icone nom="shield-check" taille={18} />
              <span>{t('Valider le code')}</span>
            </button>
            <div className="links">
              <button type="button" className="lien-b" disabled={attenteRenvoi > 0} onClick={() => void renvoyer()}>
                {attenteRenvoi > 0 ? tf('Renvoyer dans {s} s', { s: attenteRenvoi }) : t('Renvoyer le code')}
              </button>
              <button type="button" className="lien-b" onClick={() => setEtape('numero')}>
                {t('Je n’ai plus ce numéro')}
              </button>
            </div>
            {demo}
          </form>
        )
      case 'numero':
        return (
          <>
            {entete(t('Second facteur'), t('Changer de numéro'), t('Votre numéro de connexion se change par le propriétaire de l’entreprise, dans Paramètres. Un changement du propriétaire se fait auprès de BelivaY avec une preuve écrite, jamais sur simple appel.'))}
            <a className="btn primary xl" href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
              <Icone nom="headset" taille={18} />
              <span>{t('Contacter le support')}</span>
            </a>
            <div className="links">
              <a href={COORDONNEES.telephoneLien}>{COORDONNEES.telephone}</a>
              <button type="button" className="lien-b" onClick={() => setEtape('formulaire')}>
                {t('Revenir à la connexion')}
              </button>
            </div>
          </>
        )
      case 'espace':
        return (
          <>
            {entete(s.utilisateur ? `${s.utilisateur.prenom} ${s.utilisateur.nom}` : '', t('Choisissez un espace'), t('Votre numéro est rattaché à deux rôles. Chacun a son propre accès, ses propres données et son propre Trust Score.'))}
            {espaces.map((x) =>
              x.espace === 'entreprise' ? (
                <button key={x.espace} type="button" className="radio on" style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }} onClick={() => (etatCompte && ['configuration', 'suspendu', 'resilie'].includes(etatCompte) ? setEtape('etat') : naviguer(suite, { replace: true }))}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>{`${x.nom} · ${t('entreprise de livraison')}`}</span>
                    <span className="rs" style={{ display: 'block' }}>{s.utilisateur ? t(NOM_ROLE[s.utilisateur.role]) : ''}</span>
                  </span>
                </button>
              ) : (
                <a key={x.espace} className="radio" href={URL_RELAIS}>
                  <span className="rd"></span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>{`${x.nom} · ${t('point relais')}`}</span>
                    <span className="rs" style={{ display: 'block' }}>{t('Accord relais distinct · s’ouvre dans l’application point relais')}</span>
                  </span>
                </a>
              ),
            )}
            <Hint>{t('Deux rôles, deux accords, deux comptes : le rôle de relais suit entièrement les règles du point relais.')}</Hint>
          </>
        )
      case 'etat':
        return (
          <>
            {entete(s.entreprise?.nom ?? '', etatCompte ? t(NOM_ETAT[etatCompte]) : '', compte.donnees?.motif ?? undefined)}
            {etatCompte === 'configuration' ? (
              <Link className="btn primary xl" to={chemin(ACCUEIL)}>
                <Icone nom="arrow-right" taille={18} />
                <span>{t('Continuer la configuration')}</span>
              </Link>
            ) : (
              <Link className="btn primary xl" to={chemin('etat')}>
                <Icone nom="shield-check" taille={18} />
                <span>{t('Comprendre l’état du compte')}</span>
              </Link>
            )}
            {etatCompte === 'configuration' && (
              <div className="links">
                <Link to={chemin('etat')}>{t('Comprendre l’état du compte')}</Link>
              </div>
            )}
          </>
        )
      case 'oubli':
        return (
          // Clé propre : le bouton « Réinitialiser le mot de passe » de l'écran bloqué ne doit pas devenir, sous le doigt,
          // le bouton d'envoi de ce formulaire (React réutiliserait l'élément et le clic l'enverrait).
          <form
            key="oubli"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!identifiant.trim()) return
              // Compte réel (adresse e-mail) : le lien du serveur, réponse neutre ; sinon le code SMS de la démonstration.
              if (hybride && identifiant.includes('@')) {
                setOubliReel(null)
                const r = await comptesReels.oubli('entreprise', identifiant.trim())
                if (!r.ok) return setOubliReel({ ton: 'err', texte: r.code === 'indisponible' ? AVIS.base() : messageRefus(r) })
                return setOubliReel(
                  r.envoi === 'email'
                    ? { ton: 'ok', texte: tf('Si un compte existe pour cette adresse, un lien part à {d}. Il vaut {m} minutes et sert une fois.', { d: r.destination, m: r.valide_minutes }) }
                    : { ton: 'info', texte: AVIS.email() },
                )
              }
              recevoirCode(await source.session.oublie(identifiant), 'oubli')
            }}
          >
            <EtapesOubli n={1} />
            {entete(t('Accès'), t('Mot de passe oublié'), t(hybride ? 'Avec votre e-mail, un lien de réinitialisation ; avec votre numéro, un code par SMS.' : 'Un code part par SMS vers le numéro de votre accès, s’il existe.'))}
            <Champ libelle={t('Numéro +237 ou e-mail')} icone="phone" valeur={identifiant} changer={(x) => (setIdentifiant(x), setOubliReel(null))} auto="username" mode="email" />
            {oubliReel && <AccesMessage ton={oubliReel.ton}>{oubliReel.texte}</AccesMessage>}
            <button type="submit" className="btn primary xl" disabled={!identifiant.trim()}>
              <Icone nom="key-round" taille={18} />
              <span>{t('Recevoir un code')}</span>
            </button>
            <AccesLiens label={t('Autres liens')}>
              <button type="button" onClick={() => setEtape('formulaire')}>
                {t('Revenir à la connexion')}
              </button>
            </AccesLiens>
          </form>
        )
      case 'oubli-code':
        return (
          <form key="oubli-code" onSubmit={(e) => (e.preventDefault(), void reinitialiser())}>
            <EtapesOubli n={2} />
            {entete(t('Accès'), t('Nouveau mot de passe'), tf('Code envoyé vers {dest}.', { dest: defi?.destination ?? '' }))}
            <CasesCode valeur={code} changer={setCode} longueur={A.longueurCode} />
            <ChampMdp valeur={mdp} changer={setMdp} libelle={t('Nouveau mot de passe')} auto="new-password" />
            <ChampMdp valeur={mdp2} changer={setMdp2} libelle={t('Confirmer le mot de passe')} auto="new-password" />
            <div className="hint">{tf('{n} caractères au moins, dont un chiffre.', { n: PARAMETRES_FLOTTE.motDePasseMin })}</div>
            {erreurTexte}
            <button type="submit" className="btn primary xl" disabled={code.length !== A.longueurCode || !motDePasseValide(mdp) || !mdp2}>
              <Icone nom="key-round" taille={18} />
              <span>{t('Changer le mot de passe')}</span>
            </button>
            <AccesLiens label={t('Autres liens')}>
              <button type="button" disabled={attenteRenvoi > 0} onClick={() => void renvoyer()}>
                {attenteRenvoi > 0 ? tf('Renvoyer dans {s} s', { s: attenteRenvoi }) : t('Renvoyer le code')}
              </button>
              <button type="button" onClick={() => setEtape('formulaire')}>
                {t('Revenir à la connexion')}
              </button>
            </AccesLiens>
            {demo}
          </form>
        )
      case 'invitation': {
        const inv = invitation.donnees
        if (!inv)
          return (
            <>
              {entete(t('Invitation'), invitation.erreur ? t('Invitation illisible') : t('Lien d’invitation inconnu'), t('Aucun accès sans invitation : demandez au propriétaire de votre entreprise de vous inviter depuis Paramètres.'))}
              <button type="button" className="btn primary xl" onClick={() => setEtape('formulaire')}>
                {t('Revenir à la connexion')}
              </button>
            </>
          )
        if (inv.statut !== 'valide')
          return (
            <>
              {entete(tf('Invitation de {e}', { e: inv.entreprise }), t(inv.statut === 'expiree' ? 'Invitation expirée' : 'Invitation déjà utilisée'), inv.statut === 'expiree' ? t('Demandez au propriétaire de vous renvoyer une invitation depuis Paramètres.') : t('Ce lien a déjà servi : connectez-vous avec votre numéro et votre mot de passe.'))}
              <button type="button" className="btn primary xl" onClick={() => setEtape('formulaire')}>
                {t('Revenir à la connexion')}
              </button>
            </>
          )
        return (
          <form onSubmit={(e) => (e.preventDefault(), void creerAcces(inv))}>
            {entete(tf('Invitation de {e}', { e: inv.entreprise }), tf('Bienvenue {prenom}', { prenom: inv.prenom }), tf('{entreprise} vous invite comme {role}. Créez votre mot de passe ; un code SMS vers {tel} confirmera votre numéro.', { entreprise: inv.entreprise, role: t(NOM_ROLE[inv.role]), tel: inv.telephone }))}
            <ChampMdp valeur={mdp} changer={setMdp} libelle={t('Nouveau mot de passe')} auto="new-password" />
            <ChampMdp valeur={mdp2} changer={setMdp2} libelle={t('Confirmer le mot de passe')} auto="new-password" />
            <div className="hint">{tf('{n} caractères au moins, dont un chiffre. Votre accès est nominatif : ne le partagez avec personne.', { n: PARAMETRES_FLOTTE.motDePasseMin })}</div>
            {erreurTexte}
            <button type="submit" className="btn primary xl" disabled={!motDePasseValide(mdp) || !mdp2}>
              <Icone nom="user-round-check" taille={18} />
              <span>{t('Créer mon accès')}</span>
            </button>
          </form>
        )
      }
      default:
        return (
          <form key="formulaire" onSubmit={(e) => (e.preventDefault(), !bloque && !encours && identifiant.trim() && mdp && void connecter())}>
            {bloque ? (
              <>
                {entete(t('Accès bloqué'), t('Trop d’essais : réessayez dans'), undefined, true)}
                <div className="row mt12" style={{ alignItems: 'flex-end', gap: 10 }} role="timer" aria-live="off">
                  <span className="entA-big">{Math.ceil(reste / 60_000)}</span>
                  <span className="b8 t17 c3" style={{ paddingBottom: 6 }}>
                    {t('min')}
                  </span>
                </div>
                <p className="sub">{tf('Connexion bloquée jusqu’à {h}. Vous pouvez aussi réinitialiser votre mot de passe par code SMS.', { h: heure(bloqueJusqua!) })}</p>
                <button type="button" className="btn primary xl" onClick={() => (setErreur(null), setEtape('oubli'))}>
                  <Icone nom="key-round" taille={18} />
                  <span>{t('Réinitialiser le mot de passe')}</span>
                </button>
                <AccesLiens label={t('Autres liens')}>
                  <a href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
                    {t('Contacter le support')}
                  </a>
                </AccesLiens>
              </>
            ) : (
              <>
                {entete('', t('Accédez à votre espace'), t('Votre accès est nominatif : il n’est jamais partagé.'))}
                {s.expiree && (
                  <Note ton="amber" icone="clock">
                    {tf('Votre session de {h} heures s’est terminée : reconnectez-vous.', { h: A.sessionHeures })}
                  </Note>
                )}
                {info && <AccesMessage ton="ok">{info}</AccesMessage>}
                {memoire.memo && identifiant === memoire.memo.email ? (
                  <RetourMemorise memo={memoire.memo} oublier={() => (memoire.oublier(), setIdentifiant(''))} />
                ) : (
                  <Champ libelle={t('Numéro +237 ou e-mail')} icone="phone" valeur={identifiant} changer={setIdentifiant} auto="username" mode="email" invalide={!!erreur} />
                )}
                <ChampMdp valeur={mdp} changer={setMdp} libelle={t('Mot de passe')} auto="current-password" />
                <SeSouvenir valeur={memoire.souvenir} changer={memoire.setSouvenir} />
                {erreurTexte}
                <button type="submit" className="btn primary xl" disabled={encours || !identifiant.trim() || !mdp} aria-busy={encours || undefined}>
                  <Icone nom="log-in" taille={18} />
                  <span>{t(encours ? 'Connexion…' : 'Se connecter')}</span>
                </button>
                {/* Deux liens discrets : le mot de passe oublié, et le lien de connexion par e-mail (sans mot de passe). */}
                <AccesLiens label={t('Autres liens')}>
                  <button type="button" onClick={() => (setErreur(null), setEtape('oubli'))}>
                    {t('Mot de passe oublié ?')}
                  </button>
                </AccesLiens>
                <div className="ent-lien-mail">
                  <LienParEmail email={identifiant.includes('@') ? identifiant : ''} ouvrirDemo={env.source !== 'api' ? (e) => void connecter(e) : undefined} />
                </div>
              </>
            )}
          </form>
        )
    }
  })()

  // Démonstration : le seul compte de la propriétaire de Yafé Express, ouvert comme « entrer avec un rôle » (le même
  // geste que l'ancien personnage ; « ?personnage=1 » l'ouvre seul). Jamais avec l'API.
  const demonstration = env.source !== 'api' && etape === 'formulaire' && (
    <AccesDemo
      qui={t('Gaëlle Wankeu · propriétaire · Yafé Express')}
      connecter={async () => {
        await source.session.changerRole('proprietaire')
        setEspaces([])
        setFini(true)
        return null
      }}
    />
  )

  // Écran d'entrée (identifiant et mot de passe) : les deux chemins et l'accroche ; les étapes suivantes, compactes.
  const entree = etape === 'formulaire' && !s.connecte && !bloque && !attente && !jetonReinit
  // Compte réel déjà ouvert sur l'appareil et toujours en attente : on le dit aussi en revenant ici.
  useEffect(() => {
    if (!hybride || !s.connecte || fini) return
    let vivant = true
    void sessionReelle('entreprise').then((r) => vivant && r?.user.statut === 'en_attente' && setAttente(r))
    return () => {
      vivant = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.connecte])
  const contenuReel = jetonReinit ? (
    <ReinitialiserReel espace="entreprise" jeton={jetonReinit} versConnexion={() => naviguer(chemin('connexion'), { replace: true })} />
  ) : attente ? (
    <AccesAttente
      qui={attente.user.organisation || t('votre entreprise')}
      email={attente.user.email}
      continuer={() => (setAttente(null), setEspaces([]), setFini(true))}
      deconnecter={async () => {
        await source.session.deconnecter()
        setAttente(null)
        setMdp('')
        setEtape('formulaire')
      }}
    />
  ) : null
  return (
    <Ecran route="connexion" plein>
      <AccesCadre acteur="entreprise" logo={logo} espace={t('Espace entreprise')} reglages={prefs} compact={!entree} pied={<PiedAcces />}>
        {contenuReel ?? (
          <Acces>
            {entree && (
              <AccesChemins
                actif="connexion"
                label={t('Se connecter ou devenir partenaire')}
                connexion={<Link to={chemin('connexion')}>{t('Se connecter')}</Link>}
                inscription={<Link to={chemin('candidature')}>{t('Devenir partenaire')}</Link>}
              />
            )}
            {carte}
            {demonstration}
          </Acces>
        )}
      </AccesCadre>
    </Ecran>
  )
}
