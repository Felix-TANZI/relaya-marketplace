// LIV-P01 · Connexion et code PIN (écran plein, sans en-tête ni barre : LIV-01-R029). Le serveur dit où l'on en est
// (session.ecranConnexion) ; l'écran ne garde que la saisie en cours. Parcours :
// - session sur le téléphone → identité + PIN 6 cases + pavé (empreinte si activée) ; « PIN oublié ? » → code SMS →
//   nouveau PIN en 3 étapes ; 5 PIN faux → blocage 30 min (minuteur, « Appeler <entreprise> » reste possible) → code
//   SMS obligatoire ;
// - aucune session → numéro +237 → code SMS (première connexion) → nouveau PIN ; ou, si le compte est connecté sur un
//   autre téléphone, avertissement des trois conséquences avant la bascule (LIV-P01R-03) ;
// - après l'ouverture : état du compte (me/state) → chargement de la journée (4 lignes cochées, rien de cliquable) puis
//   Aujourd'hui (ou la page demandée), liste d'activation, ou état du compte (LIV-03-R04, R07).
// Hors connexion : le PIN ouvre une session valide ; le code SMS attend le réseau (LIV-03-R06). Aucun chiffre en clair.
// Présentation (refonte du 25 oct. 2026, ACCES-REFERENCES.md) : cadre d'accès commun (compte/acces.tsx) ; en tête de la
// carte, « Se connecter » et « Première connexion » (?premiere=1 : le compte est créé par l'entreprise qui invite, puis
// numéro → code SMS → PIN en étapes nommées). PIN, code, nouveau PIN, blocage : mode compact au téléphone. Dans la
// carte, le contenu « liva-login » du prototype (pictogramme ou visage, titre, cases, pavé, liens). Un compte suspendu
// est mené à l'écran d'état du compte (LIV-P32), qui porte le motif. Démonstration : le seul compte de Serge A.
// Comptes réels (source « hybride », site/COMPTES-REELS.md) : le même écran numéro → PIN, branché par l'adaptateur
// (session-hybride.ts : le numéro lie l'appareil, le PIN choisi à l'invitation ouvre la session, pas de SMS) ; le lien
// d'invitation de l'entreprise (?invitation=) crée l'accès (AccesReel.tsx : PIN ou mot de passe, consentement) ; le lien
// « mot de passe oublié » (?reinitialiser=) ouvre ReinitialiserReel. Le compte réel ouvre la démonstration sous son nom.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { COORDONNEES } from '@client/config/coordonnees'
import { env } from '@client/config/env'
import { ConnexionCompte } from '@client/compte/Connexion'
import { Kit } from '@client/compte/socle'
import logo from '../../assets/logo-belivay.png'
import { departSerge, ouvrirParCompte, suiteDe } from '../../demo/session'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Barre, Btn, Coche, Hint, HorsConnexion, Li, Note } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { EcranConnexion, MotifCode, Suite } from '../../donnees/domaines/session'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { FeuilleAppel, useAppel } from '../LIV-08/commun'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Cases, Chargement, ErreurLecture, Pave, Visage, mmss, useSecondes } from './commun'
import './liv03.css'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesEtapes, AccesLiens, AccesNote } from '@client/compte/acces'
import { hybride } from '@client/comptes-reels/hybride'
import { ReinitialiserReel } from '@client/compte/acces-reel'
import { InvitationReelle } from './AccesReel'

type Message = { ton: 'red' | 'amber' | 'green' | 'acc'; texte: string; titre?: string } | null
const ICONE_MSG = { red: 'circle-alert', amber: 'triangle-alert', green: 'circle-check', acc: 'info' } as const

/** Message en ligne (C.note du prototype), toujours une icône et un texte. */
function Msg({ m }: { m: Message }) {
  if (!m) return null
  return (
    <div className="liva-full">
      <Note ton={m.ton} icone={ICONE_MSG[m.ton]} role={m.ton === 'red' ? 'alert' : 'status'}>
        {m.titre && (
          <>
            <b>{m.titre}</b>
            <br />
          </>
        )}
        {m.texte}
      </Note>
    </div>
  )
}

/** Heure du serveur, qui avance (minuteurs) : décalage mesuré à l'ouverture de l'écran. */
function useMaintenantServeur(): () => number {
  const s = useSession()
  const d = useRef(s.maintenant - Date.now())
  return useCallback(() => Date.now() + d.current, [])
}


export default function Connexion() {
  const prefs = usePreferences()
  const { t } = prefs
  const lecture = useLecture(() => source.session.ecranConnexion(), [])
  const session = useSession()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const parEmail = params.get('par') === 'email'
  const premiere = params.get('premiere') === '1'
  // Comptes réels (hybride seulement) : lien de réinitialisation, lien d'invitation de l'entreprise.
  const jetonReinit = hybride ? params.get('reinitialiser') : null
  const jetonInvitation = hybride ? params.get('invitation') : null
  const [cible, setCible] = useState<string | null>(null)
  const [etapes, setEtapes] = useState<number | null>(null)

  // La page demandée avant la connexion (App.tsx) ; jamais une adresse hors de l'application.
  const next = params.get('next')
  const suiteVers = (s: Suite) => (s === 'aujourdhui' ? (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/connexion') ? next : chemin('aujourdhui')) : chemin(s))

  useEffect(() => {
    if (cible && session.connecte) naviguer(cible, { replace: true })
  }, [cible, session.connecte, naviguer])

  const ouvrir = async (s: Suite) => {
    signal('succes')
    if (s !== 'aujourdhui') return setCible(suiteVers(s))
    // Chargement de la journée : quatre lignes cochées au fur et à mesure, rien de cliquable (LIV-03-R07).
    const pas: (() => Promise<unknown>)[] = [() => source.session.session(), () => source.aide.aide(), () => source.tournee.courante(), () => source.aujourdhui.journee()]
    setEtapes(0)
    for (let i = 0; i < pas.length; i++) {
      await Promise.all([Promise.resolve().then(pas[i]).catch(() => undefined), new Promise((r) => setTimeout(r, navigator.webdriver ? 0 : 280))])
      setEtapes(i + 1)
    }
    setCible(suiteVers(s))
  }

  // Écran d'entrée (les deux chemins, l'accroche et la photo) : numéro, « Première connexion », e-mail, et le PIN du
  // téléphone lié tant qu'il n'est pas bloqué. Le reste (code SMS, nouveau PIN, bascule, blocage) : compact.
  const e = lecture.donnees
  const enCours = !!e && (!!e.code || !!e.bascule)
  const versEmail = parEmail && env.source !== 'api' && !!e && !enCours
  const lienReel = !!jetonReinit || !!jetonInvitation
  const entree = !lienReel && etapes === null && !!e && !enCours && (versEmail || premiere || !e.appareilLie || (!e.bloqueJusqua && !e.smsObligatoire))
  const vitrine = entree && (versEmail || premiere || !e!.appareilLie)
  const entrerReel = () => {
    // Le compte réel ouvre la démonstration (Serge A.) sous son nom, comme session-hybride.ts.
    ouvrirParCompte()
    void ouvrir(suiteDe('serge'))
  }
  return (
    <Ecran route="connexion" proto>
      <AccesCadre
        acteur="livreur"
        logo={logo}
        espace={t('Espace livreur')}
        reglages={prefs}
        compact={!vitrine}
        pied={
          <AccesLiens label={t('Liens utiles')}>
            <a href={COORDONNEES.whatsapp} target="_blank" rel="noreferrer">
              {t('Aide et contact')}
            </a>
            <a href="/cgu">{t('Conditions')}</a>
            <a href="/legal-doc?d=confidentialite">{t('Confidentialité')}</a>
          </AccesLiens>
        }
      >
        <Acces>
          <div className="liva-login">
            {entree && (
              <AccesChemins
                actif={premiere ? 'inscription' : 'connexion'}
                label={t('Se connecter ou première connexion')}
                connexion={
                  <Link to={chemin('connexion')} replace>
                    {t('Se connecter')}
                  </Link>
                }
                inscription={
                  <Link to={chemin('connexion', { premiere: '1' })} replace>
                    {t('Première connexion')}
                  </Link>
                }
              />
            )}
            {jetonReinit ? (
              <div className="liva-full" style={{ textAlign: 'left' }}>
                <ReinitialiserReel espace="livreur" jeton={jetonReinit} codeAccepte versConnexion={() => setParams({}, { replace: true })} />
              </div>
            ) : jetonInvitation ? (
              <InvitationReelle jeton={jetonInvitation} entrer={entrerReel} versConnexion={() => setParams({}, { replace: true })} />
            ) : etapes !== null ? (
              <ChargementJournee etapes={etapes} e={e} />
            ) : lecture.erreur ? (
              <div className="liva-full">
                <ErreurLecture relire={lecture.relire} />
              </div>
            ) : !e ? (
              <div className="liva-full mt20">
                <Chargement />
              </div>
            ) : versEmail ? (
              <>
                <h1>{t('Connexion')}</h1>
                <div className="liva-full">
                  <Kit couleur="#15803D" texte="var(--acc-txt)">
                    <ConnexionCompte
                      app="livreur"
                      depart={departSerge()}
                      ouvrir={() => {
                        ouvrirParCompte()
                        void ouvrir(suiteDe('serge'))
                      }}
                    />
                  </Kit>
                  <AccesLiens label={t('Autres façons d’entrer')}>
                    <button type="button" onClick={() => setParams({}, { replace: true })}>
                      {t('Revenir au numéro')}
                    </button>
                  </AccesLiens>
                </div>
              </>
            ) : (
              <>
                <Parcours e={e} ouvrir={ouvrir} premiere={premiere} />
                {/* Mode API : le numéro (code SMS puis PIN) est la seule clé du livreur au serveur ; la connexion par e-mail du
                    kit « compte » partagé reste à la démonstration tant que son adaptateur n'existe pas (CONNECTEURS-LIVREUR.md). */}
                {hybride && premiere && !enCours && (
                  <div className="liva-full">
                    <AccesNote>{t('Vous avez reçu un lien d’invitation par e-mail ? Ouvrez-le : il crée votre accès en une étape.')}</AccesNote>
                  </div>
                )}
                {env.source !== 'api' && !enCours && (
                  <div className="liva-full">
                    <AccesLiens label={t('Autres façons d’entrer')}>
                      <button type="button" data-ck="par-email" onClick={() => setParams({ par: 'email' }, { replace: true })}>
                        {t('Se connecter avec un e-mail')}
                      </button>
                    </AccesLiens>
                  </div>
                )}
              </>
            )}
            {env.source !== 'api' && etapes === null && e && !lienReel && (
              <div className="liva-full">
                <AccesDemo
                  qui={t('Serge A. · livreur · Yafé Express')}
                  connecter={async () => {
                    // Démonstration seulement : le PIN d'essai de Serge A., vérifié comme une saisie (src/demo/personnage.ts).
                    const { connecterPersonnage, REFUS_PERSONNAGE } = await import('../../demo/personnage')
                    const r = await connecterPersonnage()
                    if (r.ok) {
                      void ouvrir(r.suite)
                      return null
                    }
                    return t(REFUS_PERSONNAGE)
                  }}
                />
              </div>
            )}
          </div>
        </Acces>
      </AccesCadre>
    </Ecran>
  )
}

/** Première connexion sur ce téléphone (invitation de l'entreprise) : numéro, code SMS, code PIN (gabarit d'accès commun). */
function PremiereEtape({ n }: { n: number }) {
  const { t, tf } = usePreferences()
  return (
    <div className="liva-full" style={{ marginTop: 18 }}>
      <AccesEtapes etapes={[t('Numéro'), t('Code SMS'), t('Code PIN')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
    </div>
  )
}

/** Pictogramme rond du haut (liva-ico du prototype). */
const Pictogramme = ({ icone, ton }: { icone: string; ton?: 'red' | 'amber' | 'or' }) => (
  <div className={'liva-ico' + (ton ? ' ' + ton : '')}>
    <Icone nom={icone} taille={30} />
  </div>
)

function ChargementJournee({ etapes, e }: { etapes: number; e: EcranConnexion | null }) {
  const { t, tf } = usePreferences()
  const ent = e?.identite?.entreprise
  const lignes: [string, string][] = [
    [t('Session vérifiée'), t('ce téléphone est celui de votre compte')],
    [t('Consignes et fiches d’aide'), t('lisibles sans réseau')],
    [t('Cartes de vos zones'), e?.identite ? tf('zone {zone}', { zone: e.identite.zone }) : t('zones déclarées par votre entreprise')],
    [ent ? tf('Paquets affectés par {entreprise}', { entreprise: ent }) : t('Paquets affectés par l’entreprise'), t('tournée du jour')],
  ]
  const pct = Math.round((etapes / lignes.length) * 100)
  return (
    <>
      <Pictogramme icone="cloud-download" />
      <h1>{t('Préparation de votre journée')}</h1>
      <p className="s">{t('Téléchargement pour travailler hors connexion.')}</p>
      <div className="liva-load" role="status" aria-live="polite" aria-busy={etapes < lignes.length}>
        <Barre pct={pct} ton="acc" label={t('Préparation de votre journée')} />
        <div className="row mt8 t12 c3" style={{ justifyContent: 'space-between' }}>
          <span>{pct} %</span>
          <span>{tf('{x} sur {n}', { x: etapes, n: lignes.length })}</span>
        </div>
      </div>
      <div className="card liva-full mt20">
        {lignes.map(([a, b], i) => (
          <Coche key={a} on={i < etapes}>
            <b>{a}</b> · {b}
          </Coche>
        ))}
      </div>
    </>
  )
}

function Parcours({ e, ouvrir, premiere }: { e: EcranConnexion; ouvrir: (s: Suite) => void; premiere: boolean }) {
  if (e.code && !e.code.verifie) return <CodeSms e={e} />
  if (e.bascule) return <Bascule e={e} />
  if (e.code?.verifie) return <NouveauPin e={e} ouvrir={ouvrir} />
  // « Première connexion » : le numéro que l'entreprise a enregistré, même si ce téléphone porte déjà un compte (le
  // serveur répond alors « un téléphone, un compte » ou propose la bascule).
  if (!e.appareilLie || premiere) return <Numero premiere={premiere} />
  return <Pin e={e} ouvrir={ouvrir} />
}

function useSaisie(n: number, valider: (v: string) => void, actif: boolean) {
  // La saisie vit dans une référence (une seule validation par code, même si React rejoue un rendu) ; l'état sert à
  // l'affichage.
  const [v, setAffiche] = useState('')
  const saisie = useRef('')
  const setV = (x: string) => {
    saisie.current = x
    setAffiche(x)
  }
  const [erreur, setErreur] = useState(false)
  const ajouter = useCallback(
    (c: string) => {
      if (!actif || saisie.current.length >= n) return
      setErreur(false)
      const y = saisie.current + c
      setV(y)
      signal('toucher')
      if (y.length === n) setTimeout(() => valider(y), 0)
    },
    [n, valider, actif],
  )
  const effacer = useCallback(() => {
    setErreur(false)
    setV(saisie.current.slice(0, -1))
  }, [])
  const echec = useCallback(() => {
    setErreur(true)
    setV('') // le code s'efface de l'écran après la saisie (LIV-03-R05)
    signal('erreur')
  }, [])
  const vider = useCallback(() => {
    setErreur(false)
    setV('')
  }, [])
  // Clavier physique (ordinateur, clavier relié au téléphone) : chiffres et retour arrière, comme le pavé à l'écran.
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target as HTMLElement | null)?.closest?.('input, textarea')) return
      if (/^[0-9]$/.test(ev.key)) (ev.preventDefault(), ajouter(ev.key))
      else if (ev.key === 'Backspace') (ev.preventDefault(), effacer())
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [ajouter, effacer])
  return { v, erreur, ajouter, effacer, echec, vider }
}

// ---------- PIN (session présente sur le téléphone) ----------

function Pin({ e, ouvrir }: { e: EcranConnexion; ouvrir: (s: Suite) => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenantServeur()
  const bloque = useSecondes(e.bloqueJusqua, maintenant)
  const [msg, setMsg] = useState<Message>(null)
  const [occupe, setOccupe] = useState(false)
  const actif = !occupe && bloque === 0 && !e.smsObligatoire
  const valider = useCallback(
    async (pin: string) => {
      setOccupe(true)
      const r = await source.session.verifierPin(pin, origine(maintenant()))
      setOccupe(false)
      if (r.ok) return ouvrir(r.suite)
      saisie.echec()
      if (r.raison === 'pin_faux') setMsg({ ton: 'red', texte: r.essaisRestants === 1 ? t('PIN incorrect · 1 essai restant avant blocage') : tf('PIN incorrect · {n} essais restants', { n: r.essaisRestants ?? 0 }) })
      else setMsg(null)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ouvrir, maintenant],
  )
  const saisie = useSaisie(e.regles.pinLongueur, valider, actif)
  const empreinte = async () => {
    const r = await source.session.deverrouillerBiometrie(origine(maintenant()))
    if (r.ok) ouvrir(r.suite)
    else setMsg({ ton: 'red', texte: t('Empreinte non disponible : saisissez votre PIN.') })
  }
  if (bloque > 0) return <Bloque e={e} reste={bloque} />
  if (e.smsObligatoire) return <SmsObligatoire e={e} />
  const i = e.identite
  return (
    <>
      {!enLigne && (
        <div className="liva-full">
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {t('ouverture par code PIN possible : une session valide existe sur ce téléphone.')}
          </HorsConnexion>
        </div>
      )}
      <div className="liva-av">
        <Visage photo={i?.photo} initiales={i?.initiales} />
      </div>
      <h1>{i ? tf('Bonjour {prenom}', { prenom: i.prenom }) : t('Bonjour')}</h1>
      {i && (
        <p className="s">
          {i.entreprise} · {t(i.vehicule).toLowerCase()}
          {i.immatriculation ? ' ' + i.immatriculation : ''} · {tf('zone {zone}', { zone: i.zone })}
        </p>
      )}
      {e.sessionExpiree && <Msg m={{ ton: 'acc', texte: tf('Session de {h} heures terminée : saisissez votre PIN pour continuer.', { h: e.regles.sessionHeures }) }} />}
      <div className="t14 b7 mt20" id="l3-pin-l">
        {t('Entrez votre code PIN')}
      </div>
      <Cases n={e.regles.pinLongueur} valeur={saisie.v} erreur={saisie.erreur} libelle={tf('Code PIN, {n} chiffres sur {t} saisis', { n: saisie.v.length, t: e.regles.pinLongueur })} />
      <Msg m={msg} />
      <div className="liva-full">
        <Pave vide={!saisie.v} ajouter={saisie.ajouter} effacer={saisie.effacer} actif={actif} />
      </div>
      {e.biometrie && (
        <div className="btns liva-col liva-full mt12">
          <Btn kind="secondary" icone="fingerprint" onClick={() => void empreinte()}>
            {t('Ouvrir avec l’empreinte')}
          </Btn>
        </div>
      )}
      <DemandeCode motif="pin_oublie" />
    </>
  )
}

/** 5 PIN faux : application verrouillée, minuteur ; l'entreprise reste joignable (LIV-P01R-02). */
function Bloque({ e, reste }: { e: EcranConnexion; reste: number }) {
  const { t, tf, langue } = usePreferences()
  const total = e.regles.pinBlocageMin * 60
  const a = e.bloqueJusqua ? heure(e.bloqueJusqua, langue) : ''
  return (
    <>
      <Pictogramme icone="lock-keyhole" ton="red" />
      <h1>{t('Application verrouillée')}</h1>
      <p className="s">{tf('{n} codes PIN faux de suite. Pour protéger votre compte, l’ouverture est bloquée {m} minutes.', { n: e.regles.pinEssais, m: e.regles.pinBlocageMin })}</p>
      <div className="card liva-full mt20" style={{ textAlign: 'center' }} role="timer" aria-label={t('Déverrouillage')}>
        <div className="kick">{t('Déverrouillage')}</div>
        <div className="b8 mt6 l3-minuteur">{mmss(reste)}</div>
        <div className="t13 c3 mt4">{tf('À {h}, avec un code reçu par SMS : le PIN seul ne suffit plus.', { h: a })}</div>
        <div className="mt12">
          <Barre pct={((total - reste) / total) * 100} ton="red" label={t('Temps écoulé du blocage')} />
        </div>
      </div>
      <div className="btns liva-col liva-full mt12">
        <Btn kind="primary" icone="message-square-text" off>
          {tf('Recevoir un code par SMS · à {h}', { h: a })}
        </Btn>
        <AppelEntreprise e={e} />
      </div>
    </>
  )
}

/** Après un blocage : le code SMS d'abord, puis le PIN. */
function SmsObligatoire({ e }: { e: EcranConnexion }) {
  const { t, tf } = usePreferences()
  return (
    <>
      <Pictogramme icone="message-square-text" ton="or" />
      <h1>{t('Code SMS obligatoire')}</h1>
      <p className="s">{tf('Pour votre sécurité, après un blocage, un code est envoyé au {n} avant de saisir votre PIN.', { n: e.numeroMasque ?? '' })}</p>
      <DemandeCode motif="apres_blocage" bouton />
      <div className="btns liva-col liva-full mt12">
        <AppelEntreprise e={e} />
      </div>
    </>
  )
}

/** « Appeler <entreprise> » : ligne masquée BelivaY, possible même PIN bloqué (LIV-P01R-02). */
function AppelEntreprise({ e }: { e: EcranConnexion }) {
  const { tf } = usePreferences()
  const enLigne = useEnLigne()
  const appel = useAppel()
  if (!e.identite) return null
  return (
    <>
      <Btn kind="secondary" icone="phone" onClick={() => void appel.appeler('entreprise')} off={!enLigne}>
        {tf('Appeler {entreprise}', { entreprise: e.identite.entreprise })}
      </Btn>
      <FeuilleAppel a={appel} />
    </>
  )
}

// ---------- Demande d'un code SMS ----------

function DemandeCode({ motif, bouton }: { motif: MotifCode; bouton?: boolean }) {
  const { t } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenantServeur()
  const [msg, setMsg] = useState<Message>(null)
  const demander = async () => {
    const r = await source.session.demanderCode(motif, origine(maintenant()))
    if (!r.ok) setMsg({ ton: 'red', texte: r.raison === 'trop_d_envois' ? t('Trop de codes envoyés. Appelez le support livreur.') : t('Un code vient d’être envoyé : patientez avant d’en demander un autre.') })
  }
  return (
    <>
      {bouton ? (
        <div className="btns liva-col liva-full mt20">
          <Btn kind="primary" icone="send" cls="xl" onClick={() => void demander()} off={!enLigne}>
            {t('Recevoir le code')}
          </Btn>
        </div>
      ) : (
        <button type="button" className="liva-link l3-lien" onClick={() => void demander()} disabled={!enLigne}>
          <Icone nom="key-round" taille={18} />
          {t('PIN oublié ? Recevoir un code par SMS')}
        </button>
      )}
      {!enLigne && bouton && <Hint icone="wifi-off">{t('Le code SMS attend le réseau.')}</Hint>}
      <Msg m={msg} />
    </>
  )
}

// ---------- Numéro (aucune session sur le téléphone) ----------

function Numero({ premiere }: { premiere: boolean }) {
  const { t } = usePreferences()
  const maintenant = useMaintenantServeur()
  const enLigne = useEnLigne()
  const [numero, setNumero] = useState('')
  const [msg, setMsg] = useState<Message>(null)
  const [occupe, setOccupe] = useState(false)
  const chiffres = numero.replace(/\D/g, '')
  const valide = /^6\d{8}$/.test(chiffres)
  const envoyer = async () => {
    if (!valide) return setMsg({ ton: 'red', texte: t('Numéro camerounais à 9 chiffres, commençant par 6.') })
    setOccupe(true)
    const r = await source.session.saisirNumero(chiffres, origine(maintenant()))
    setOccupe(false)
    if (r.ok) return signal('succes')
    signal('erreur')
    setMsg({
      ton: 'red',
      texte: {
        numero_invalide: t('Numéro camerounais à 9 chiffres, commençant par 6.'),
        sans_invitation: t('Aucune invitation pour ce numéro. Demandez à votre entreprise de vous inviter depuis son portail.'),
        autre_compte_sur_appareil: t('Ce téléphone porte déjà le compte d’un autre livreur : un téléphone, un compte.'),
        refuse: t('Ce numéro ne peut pas être connecté. Contactez le support livreur.'),
      }[r.raison],
    })
  }
  // Groupé comme on le dit : « 6 77 51 08 27 ».
  const affiche = chiffres.slice(0, 9).replace(/^(\d)(\d{0,2})(\d{0,2})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, d, f) => [a, b, c, d, f].filter(Boolean).join(' '))
  return (
    <>
      {!enLigne && (
        <div className="liva-full">
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {t('La première connexion demande le réseau : le code SMS l’attend.')}
          </HorsConnexion>
        </div>
      )}
      <h1>{premiere ? t('Première connexion') : t('Votre numéro')}</h1>
      <p className="s">
        {premiere
          ? t('Votre compte est créé par l’entreprise de livraison qui vous invite : entrez le numéro qu’elle a enregistré, puis le code reçu par SMS et votre code PIN.')
          : t('Saisissez le numéro que votre entreprise a enregistré en vous invitant. Un code à 6 chiffres vous sera envoyé par SMS.')}
      </p>
      {premiere && <PremiereEtape n={1} />}
      <form
        className="liva-full"
        onSubmit={(ev) => {
          ev.preventDefault()
          void envoyer()
        }}
      >
        <div className="fld">
          <label htmlFor="l3-num">{t('Numéro de téléphone')}</label>
          <div className={'inp l3-inp' + (msg?.ton === 'red' ? ' err' : '')}>
            <Icone nom="smartphone" taille={18} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            <b className="c3">+237</b>
            <input
              id="l3-num"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={affiche}
              aria-invalid={msg?.ton === 'red' || undefined}
              onChange={(ev) => {
                setMsg(null)
                setNumero(ev.target.value.replace(/\D/g, '').replace(/^237(?=\d{9})/, '').slice(0, 9))
              }}
              placeholder="6 •• •• •• ••"
            />
          </div>
        </div>
        <Msg m={msg} />
        <div className="btns liva-col mt16">
          <Btn kind="primary" type="submit" icone="send" cls="xl" off={!enLigne || occupe || chiffres.length < 9}>
            {t('Recevoir le code')}
          </Btn>
        </div>
      </form>
    </>
  )
}

// ---------- Nouveau téléphone : trois conséquences avant la bascule ----------

function Bascule({ e }: { e: EcranConnexion }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const [aide, setAide] = useState(false)
  const maintenant = useMaintenantServeur()
  const b = e.bascule!
  return (
    <>
      <Pictogramme icone="smartphone-nfc" ton="amber" />
      <h1>{t('Nouveau téléphone détecté')}</h1>
      <p className="s">{tf('Votre compte ne s’ouvre que sur un seul téléphone ; il est connecté sur un autre ({appareil}).', { appareil: b.ancienAppareil })}</p>
      <div className="card tight liva-full mt16 l3-csq">
        <Li icone="log-out" ton="amber" t={t('L’ancien téléphone sera déconnecté')} s={t('Toutes ses sessions sont fermées dès la bascule.')} />
        <Li
          icone="cloud-off"
          ton="red"
          t={t('Preuves non envoyées : perdues')}
          s={
            <>
              {t('Si l’ancien téléphone a encore des preuves en file, synchronisez-le d’abord.')}{' '}
              {b.ancienneSynchronisation ? tf('Dernière synchronisation : {h}.', { h: heure(b.ancienneSynchronisation, langue) }) : t('L’ancien téléphone ne s’est jamais synchronisé.')}
            </>
          }
        />
        <Li icone="building-2" ton="acc" t={t('Votre entreprise est prévenue')} s={t('Le changement apparaît dans son portail.')} />
      </div>
      {!enLigne && (
        <div className="liva-full">
          <HorsConnexion>{t('Le code SMS attend le réseau.')}</HorsConnexion>
        </div>
      )}
      <div className="btns liva-col liva-full mt16">
        <Btn kind="primary" icone="arrow-right" off={!enLigne} onClick={() => void source.session.confirmerBascule(origine(maintenant()))}>
          {t('Continuer avec ce téléphone')}
        </Btn>
        <Btn kind="secondary" icone="refresh-cw" onClick={() => setAide((x) => !x)}>
          {t('Synchroniser d’abord l’ancien')}
        </Btn>
      </div>
      {aide && <Msg m={{ ton: 'acc', texte: t('Ouvrez BelivaY sur l’ancien téléphone, avec du réseau : ses preuves partent toutes seules. Revenez ensuite ici et continuez.') }} />}
      <button type="button" className="liva-link l3-lien l3-lien-gris" onClick={() => void source.session.annulerCode()}>
        {t('Annuler')}
      </button>
    </>
  )
}

// ---------- Code SMS ----------

function CodeSms({ e }: { e: EcranConnexion }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const maintenant = useMaintenantServeur()
  const c = e.code!
  const renvoi = useSecondes(c.renvoiPossibleA, maintenant)
  const [msg, setMsg] = useState<Message>(null)
  const [occupe, setOccupe] = useState(false)
  const valider = useCallback(
    async (code: string) => {
      setOccupe(true)
      const r = await source.session.verifierCode(code, origine(maintenant()))
      setOccupe(false)
      if (r.ok) return signal('succes')
      saisie.echec()
      if (r.raison === 'code_faux')
        setMsg({ ton: 'red', titre: r.essaisRestants === 1 ? t('Code incorrect · 1 essai restant') : tf('Code incorrect · {n} essais restants', { n: r.essaisRestants ?? 0 }), texte: t('Vérifiez le dernier SMS reçu, ou demandez un nouveau code.') })
      else setMsg({ ton: 'red', titre: t('Code annulé'), texte: t('Code annulé après trop d’essais. Demandez un nouveau code.') })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maintenant],
  )
  const actif = !occupe && enLigne && c.essaisRestants > 0
  const saisie = useSaisie(e.regles.codeLongueur, valider, actif)
  // Code rempli depuis le SMS (WebOTP, motif M20) : le téléphone lit le SMS de BelivaY avec l'accord du livreur et
  // tape le code à sa place ; la vérification reste celle du serveur. Sans WebOTP (iPhone, ordinateur) : le pavé.
  const { ajouter } = saisie
  useEffect(() => {
    if (!actif || typeof window === 'undefined' || !('OTPCredential' in window)) return
    const arret = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: arret.signal } as CredentialRequestOptions)
      .then((x) => {
        const code = (x as unknown as { code?: string } | null)?.code ?? ''
        if (/^\d+$/.test(code)) for (const ch of code.slice(0, e.regles.codeLongueur)) ajouter(ch)
      })
      .catch(() => undefined)
    return () => arret.abort()
  }, [actif, ajouter, e.regles.codeLongueur])
  const renvoyer = async () => {
    const r = await source.session.demanderCode(c.motif, origine(maintenant()))
    if (r.ok) {
      saisie.vider()
      setMsg({ ton: 'green', texte: t('Nouveau code envoyé.') })
    } else setMsg({ ton: 'red', texte: r.raison === 'trop_d_envois' ? t('Trop de codes envoyés. Appelez le support livreur.') : t('Un code vient d’être envoyé : patientez avant d’en demander un autre.') })
  }
  const titres: Record<MotifCode, [string, string]> = {
    premiere_connexion: ['Première connexion', 'Saisissez le code reçu par SMS, puis créez votre code PIN.'],
    nouvel_appareil: ['Nouveau téléphone', 'Saisissez le code reçu par SMS : l’ancien téléphone sera déconnecté.'],
    pin_oublie: ['Recevoir un code par SMS', 'PIN oublié : confirmez votre numéro, puis créez un nouveau code PIN.'],
    apres_blocage: ['Code SMS obligatoire', 'Après un blocage, le code SMS d’abord ; votre PIN ensuite.'],
  }
  const erreur = saisie.erreur && msg?.ton === 'red'
  const lienRenvoi =
    c.envoisRestants <= 0 ? null : renvoi > 0 ? (
      <div className="liva-link" style={{ color: 'var(--ink-3)' }} role="timer">
        <Icone nom="timer" taille={18} />
        {tf('Renvoyer le code dans {s} s', { s: renvoi })}
      </div>
    ) : (
      <button type="button" className="liva-link l3-lien" disabled={!enLigne} onClick={() => void renvoyer()}>
        <Icone nom="send" taille={18} />
        {t('Renvoyer le code')}
      </button>
    )
  return (
    <>
      {!enLigne && (
        <div className="liva-full">
          <HorsConnexion>
            <b>{t('Hors connexion')}</b> · {t('Le code SMS attend le réseau.')}
          </HorsConnexion>
        </div>
      )}
      {(c.motif === 'premiere_connexion' || c.motif === 'nouvel_appareil') && <PremiereEtape n={2} />}
      <Pictogramme icone="message-square-text" ton="or" />
      <h1>{t(titres[c.motif][0])}</h1>
      <p className="s">{t(titres[c.motif][1])}</p>
      <div className="liva-full">
        <div className="fld">
          <label>{tf('Code envoyé au {numero}', { numero: c.numeroMasque })}</label>
        </div>
        <Cases n={e.regles.codeLongueur} valeur={saisie.v} erreur={erreur} libelle={tf('Code SMS, {n} chiffres sur {t} saisis', { n: saisie.v.length, t: e.regles.codeLongueur })} />
      </div>
      <Msg m={msg} />
      {erreur ? (
        <div className="btns liva-col liva-full mt12">
          {c.essaisRestants > 0 && (
            <Btn kind="primary" icone="rotate-cw" onClick={() => (saisie.vider(), setMsg(null))}>
              {t('Réessayer')}
            </Btn>
          )}
          {c.envoisRestants > 0 && (
            <Btn kind="secondary" icone="send" off={renvoi > 0 || !enLigne} onClick={() => void renvoyer()}>
              {renvoi > 0 ? tf('Renvoyer le code · dans {s} s', { s: renvoi }) : t('Renvoyer le code')}
            </Btn>
          )}
        </div>
      ) : (
        <>
          <div className="liva-full">
            <Pave vide={!saisie.v} ajouter={saisie.ajouter} effacer={saisie.effacer} actif={actif} />
          </div>
          {lienRenvoi}
        </>
      )}
      {c.envoisRestants <= 0 && <Msg m={{ ton: 'amber', texte: tf('{n} codes envoyés dans l’heure : appelez le support livreur, il vous aidera sans jamais vous demander le code.', { n: e.regles.envoisMax }) }} />}
      <button type="button" className="liva-link l3-lien l3-lien-gris" onClick={() => void source.session.annulerCode()}>
        {c.motif === 'premiere_connexion' || c.motif === 'nouvel_appareil' ? t('Changer de numéro') : t('Retour au PIN')}
      </button>
    </>
  )
}

// ---------- Nouveau PIN (3 étapes) ----------

function NouveauPin({ e, ouvrir }: { e: EcranConnexion; ouvrir: (s: Suite) => void }) {
  const { t, tf } = usePreferences()
  const maintenant = useMaintenantServeur()
  const [premier, setPremier] = useState<string | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const [occupe, setOccupe] = useState(false)
  const valider = useCallback(
    async (pin: string) => {
      if (premier === null) {
        setPremier(pin)
        setMsg(null)
        saisie.vider()
        return
      }
      if (pin !== premier) {
        setPremier(null)
        saisie.echec()
        return setMsg({ ton: 'red', texte: t('Les deux saisies ne correspondent pas. Choisissez à nouveau votre PIN.') })
      }
      setOccupe(true)
      const r = await source.session.creerPin(pin, origine(maintenant()))
      setOccupe(false)
      if (r.ok) return ouvrir(r.suite)
      setPremier(null)
      saisie.echec()
      setMsg({ ton: 'red', texte: r.raison === 'pin_trop_simple' ? t('PIN trop simple (chiffres identiques ou qui se suivent). Choisissez-en un autre.') : t('Le code SMS doit être validé d’abord.') })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [premier, ouvrir, maintenant],
  )
  const saisie = useSaisie(e.regles.pinLongueur, valider, !occupe)
  const confirmer = premier !== null
  const ent = e.identite?.entreprise
  return (
    <>
      {e.code?.motif !== 'pin_oublie' && <PremiereEtape n={3} />}
      <Pictogramme icone="key-round" />
      <h1>{e.code?.motif === 'pin_oublie' ? t('Créez votre nouveau code PIN') : t('Créez votre code PIN')}</h1>
      <p className="s">{ent ? tf('{n} chiffres pour ouvrir l’application chaque jour. Ne le donnez à personne, pas même à {entreprise}.', { n: e.regles.pinLongueur, entreprise: ent }) : tf('{n} chiffres pour ouvrir l’application chaque jour. Ne le donnez à personne, pas même à votre entreprise.', { n: e.regles.pinLongueur })}</p>
      <div className="t14 b7 mt20">{confirmer ? t('Confirmez votre code PIN') : t('Choisissez votre code PIN')}</div>
      <Cases n={e.regles.pinLongueur} valeur={saisie.v} erreur={saisie.erreur} libelle={tf('Nouveau PIN, {n} chiffres sur {t} saisis', { n: saisie.v.length, t: e.regles.pinLongueur })} />
      <Msg m={msg} />
      <div className="liva-full">
        <Pave vide={!saisie.v} ajouter={saisie.ajouter} effacer={saisie.effacer} actif={!occupe} />
      </div>
      {e.code?.motif === 'pin_oublie' && (
        <button type="button" className="liva-link l3-lien l3-lien-gris" onClick={() => void source.session.annulerCode()}>
          {t('Retour au PIN')}
        </button>
      )}
    </>
  )
}
