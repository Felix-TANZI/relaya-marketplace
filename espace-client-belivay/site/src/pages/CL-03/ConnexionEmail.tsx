// Écran « Connexion par e-mail » (CL-03, 3.2), balisage et logique du prototype du 1er octobre (route
// connexion-email), repris à la main et rendu logique (DP-53) :
// - Se connecter : e-mail et mot de passe vérifiés par le serveur ; 5 essais faux, puis 15 minutes d'attente ;
//   « Se souvenir de moi » garde le compte sur l'appareil : ses champs arrivent remplis (e-mail masqué, mot de
//   passe enregistré) et il se rouvre sans mot de passe ; toucher un champ rempli le vide pour en taper un autre ;
// - Créer un compte : prénom et e-mail proposés par le compte du téléphone, mot de passe fort proposé par le
//   téléphone (ou tapé : 8 caractères au moins, dont un chiffre) ; une adresse = un compte (« Cette adresse a déjà
//   un compte BelivaY ») ;
// - après la connexion : l'écran qui l'a demandée (« next », gardé), ou le numéro à vérifier (« ?from=panier »).
// Les états du prototype (?st=inscription|erreur|existe, ?from=panier) restent des scénarios de démonstration.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_9de42ddd0501_jpg from '../../assets/prototype/9de42ddd0501.jpg'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import img_5560c2ab9827_jpg from '../../assets/prototype/5560c2ab9827.jpg'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { garderSuite, lireSuite, versApresConnexion } from '../../donnees/connexion'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { Partage } from './Arrivee'

const REMPLI = '••••••••••' // mot de passe enregistré ou proposé par le téléphone
const heure = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
}

function Hero({ inscription }: { inscription: boolean }) {
  const { t } = usePreferences()
  return (
    <section
      className="cx-hero ph"
      style={{ backgroundImage: `url(${inscription ? img_5560c2ab9827_jpg : img_9de42ddd0501_jpg})` }}
      role="img"
      aria-label={t(inscription ? 'Rejoins BelivaY' : 'Bon retour parmi nous')}
    >
      <span className="lg">
        <img src={img_be926f70d2b8_png} alt="" />
      </span>
      <span className="ch c1">
        <Icone nom="shield-check" taille={13} />
        {t(inscription ? 'Paiement bloqué jusqu’au retrait' : 'Relais Mvog-Ada · 350 m')}
      </span>
      <span className="tx">
        <b>{t(inscription ? 'Rejoins BelivaY' : 'Bon retour parmi nous')}</b>
        <span>{t(inscription ? 'Ton compte en 30 secondes. Tu commandes, tu retires au relais de ton quartier.' : 'Suis tes colis et paie en un geste, avec ton Wallet ou Mobile Money.')}</span>
      </span>
    </section>
  )
}

function Confiance() {
  const { t } = usePreferences()
  return (
    <div className="cx-trust">
      <div>
        <Icone nom="shield-check" taille={22} />
        {t('Argent bloqué jusqu’au retrait')}
      </div>
      <div>
        <Icone nom="map-pin" taille={22} />
        {t('Relais dans 12 quartiers')}
      </div>
      <div>
        <Icone nom="headset" taille={22} />
        {t('Aide de 7 h à 21 h')}
      </div>
    </div>
  )
}

// Un champ du formulaire (.fld, .inp, vrai <input>).
function Champ(p: { id: string; label: string; icone: string; err?: boolean; aide?: string; children: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="fld">
      <label htmlFor={p.id}>{t(p.label)}</label>
      <div className={'inp' + (p.err ? ' err' : '')}>
        <Icone nom={p.icone} taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        {p.children}
      </div>
      {p.aide && <div className="hint">{t(p.aide)}</div>}
    </div>
  )
}

// Mot de passe : rempli (enregistré ou proposé), il s'affiche en points ; le toucher le vide pour en taper un.
function MotDePasse(p: { valeur: string | null; changer: (v: string | null) => void; err?: boolean; aide?: string; nouveau?: boolean }) {
  const { t } = usePreferences()
  const [voir, setVoir] = useState(false)
  const champ = useRef<HTMLInputElement>(null)
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (focus && p.valeur !== null) champ.current?.focus()
  }, [focus, p.valeur])
  return (
    <Champ id="cx-mdp" label="Mot de passe" icone="lock" err={p.err} aide={p.aide}>
      {p.valeur === null ? (
        <span
          className="grow"
          role="button"
          tabIndex={0}
          aria-label={t(p.nouveau ? 'Mot de passe proposé par le téléphone : toucher pour en taper un' : 'Mot de passe enregistré : toucher pour en taper un autre')}
          onClick={() => (p.changer(''), setFocus(true))}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), p.changer(''), setFocus(true))}
        >
          {REMPLI}
        </span>
      ) : (
        <input
          ref={champ}
          id="cx-mdp"
          type={voir ? 'text' : 'password'}
          value={p.valeur}
          autoComplete={p.nouveau ? 'new-password' : 'current-password'}
          onChange={(e) => p.changer(e.target.value)}
        />
      )}
      <span className="suf">
        <span
          role="button"
          tabIndex={0}
          aria-label={t(voir ? 'Cacher le mot de passe' : 'Afficher le mot de passe')}
          aria-pressed={voir}
          onClick={() => setVoir(!voir)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setVoir(!voir))}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', marginRight: '-10px' }}
        >
          <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
        </span>
      </span>
    </Champ>
  )
}

export function ConnexionEmail() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const st = params.get('st')
  const panier = params.get('from') === 'panier'
  const inscription = st === 'inscription' || st === 'existe'
  const fq = panier ? { from: 'panier' } : undefined
  // Comptes connus de l'appareil : celui retenu (« Se souvenir de moi ») et celui du téléphone (Google).
  const [retenu, setRetenu] = useState<{ emailMasque: string } | null | undefined>(undefined)
  const [connu, setConnu] = useState<{ prenom: string; emailMasque: string } | null>(null)
  useEffect(() => {
    source.compteRetenu().then(setRetenu)
    source.compteConnu().then(setConnu)
  }, [])
  const next = params.get('next')
  useEffect(() => {
    if (next) garderSuite(next)
  }, [next])

  const [prenom, setPrenom] = useState<string | null>(null) // null : celui du téléphone
  const [email, setEmail] = useState<string | null>(null) // null : celui de l'appareil (masqué)
  const [mdp, setMdp] = useState<string | null>(null) // null : enregistré, ou proposé à l'inscription
  const [souvenir, setSouvenir] = useState(true)
  const [erreur, setErreur] = useState<{ type: 'incorrect' | 'bloque' | 'existe' | 'prenom' | 'email' | 'mdp' | 'vide'; jusqua?: number } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  // Changer d'onglet (se connecter, créer un compte) efface l'erreur affichée.
  useEffect(() => setErreur(null), [inscription])
  if (retenu === undefined) return null

  const emailAffiche = email ?? (inscription ? (connu?.emailMasque ?? '') : (retenu?.emailMasque ?? connu?.emailMasque ?? ''))
  const prenomAffiche = prenom ?? connu?.prenom ?? ''
  const suite = panier ? chemin('numero', { from: 'panier' }) : lireSuite()
  const fini = (s: Parameters<typeof majSession>[0]) => {
    garderSuite(null)
    naviguer(versApresConnexion(s, suite), { replace: true })
    majSession(s)
  }

  const seConnecter = async () => {
    if (envoi) return
    // Compte retenu, champs remplis : il se rouvre sans mot de passe.
    if (email === null && mdp === null && retenu) {
      setEnvoi(true)
      return fini(await source.reprendreCompte())
    }
    // Champ rempli par l'appareil : l'adresse masquée désigne le compte retenu (le serveur la connaît).
    const adresse = email === null ? (retenu || connu ? null : '') : email.trim()
    if (adresse === '' || !mdp) return setErreur({ type: 'vide' })
    setEnvoi(true)
    const r = await source.connecterEmail(adresse, mdp, souvenir)
    setEnvoi(false)
    if (r.ok) return fini(r.session)
    setErreur(r.raison === 'bloque' ? { type: 'bloque', jusqua: r.jusqua } : { type: 'incorrect' })
  }

  const creer = async () => {
    if (envoi) return
    setEnvoi(true)
    // Mot de passe proposé par le téléphone : un mot de passe fort, gardé par le gestionnaire du téléphone.
    const motDePasse = mdp ?? 'Bv' + Math.random().toString(36).slice(2, 10) + '7'
    // Adresse proposée par le téléphone (null) : celle de son compte ; dans le jeu d'essai, Carine est déjà inscrite.
    const adresse = email === null ? (connu ? null : '') : email.trim()
    const r = await source.inscrire({ prenom: prenomAffiche, email: adresse, motDePasse }, souvenir)
    setEnvoi(false)
    if (r.ok) return fini(r.session)
    setErreur({ type: r.raison })
  }

  // États du prototype (démonstration).
  const demoErreur = st === 'erreur'
  const demoExiste = st === 'existe'
  const enErreur = demoErreur || erreur?.type === 'incorrect' || erreur?.type === 'bloque' || erreur?.type === 'vide'
  const existe = demoExiste || erreur?.type === 'existe'
  const etat = existe ? 'connexion-email?st=existe' : inscription ? 'connexion-email?st=inscription' : enErreur ? 'connexion-email?st=erreur' : panier ? 'connexion-email?from=panier' : 'connexion-email'
  const onglet = (insc: boolean) => chemin('connexion-email', insc ? { st: 'inscription', ...fq } : fq)

  const seg = (
    <div className="seg">
      <Link to={onglet(false)} className={!inscription ? 'on' : ''} replace>
        {t('Se connecter')}
      </Link>
      <Link to={onglet(true)} className={inscription ? 'on' : ''} replace>
        {t('Créer un compte')}
      </Link>
    </div>
  )
  const champEmail = (err: boolean) => (
    <Champ id="cx-email" label="E-mail" icone="mail" err={err}>
      <input
        id="cx-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={emailAffiche}
        onFocus={() => email === null && emailAffiche.includes('•') && setEmail('')}
        onChange={(e) => (setEmail(e.target.value), setErreur(null))}
      />
    </Champ>
  )

  let corps: ReactNode
  if (existe)
    corps = (
      <>
        <Champ id="cx-prenom" label="Prénom" icone="user-round">
          <input id="cx-prenom" autoComplete="given-name" value={prenomAffiche} onChange={(e) => setPrenom(e.target.value)} />
        </Champ>
        {champEmail(true)}
        <div className="note or">
          <Icone nom="circle-alert" taille={18} />
          <div>
            <b>{t('Cette adresse a déjà un compte BelivaY.')}</b>
            {t(' Une adresse, un seul compte : connecte-toi avec elle.')}
          </div>
        </div>
        <div className="mt16">
          <Link to={onglet(false)} className="btn primary" replace>
            <Icone nom="log-in" taille={18} />
            <span>{t('Me connecter avec cette adresse')}</span>
          </Link>
        </div>
        <p className="cl03-legal">
          {t('Tu l’as créé avec Google ? ')}
          <Link to={chemin('connexion', { st: 'existant' })} className="cl03-link">
            {t('Continuer avec Google')}
          </Link>
        </p>
        <p className="cx-alt">
          {t('Déjà un compte ? ')}
          <Link to={onglet(false)} replace>
            {t('Se connecter')}
          </Link>
        </p>
      </>
    )
  else if (inscription)
    corps = (
      <>
        <Champ id="cx-prenom" label="Prénom" icone="user-round" err={erreur?.type === 'prenom'} aide="Pour te saluer et pour le livreur à domicile. Rien d’autre.">
          <input id="cx-prenom" autoComplete="given-name" maxLength={40} value={prenomAffiche} onChange={(e) => (setPrenom(e.target.value), setErreur(null))} />
        </Champ>
        {champEmail(erreur?.type === 'email')}
        <MotDePasse valeur={mdp} changer={(v) => (setMdp(v), setErreur(null))} err={erreur?.type === 'mdp'} aide="8 caractères au moins, dont un chiffre." nouveau />
        {erreur && ['prenom', 'email', 'mdp'].includes(erreur.type) && (
          <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
            {t(
              erreur.type === 'prenom'
                ? 'Écris ton prénom (40 caractères au plus).'
                : erreur.type === 'email'
                  ? 'Cette adresse e-mail ne semble pas complète : vérifie-la.'
                  : 'Ton mot de passe : 8 caractères au moins, dont un chiffre.',
            )}
          </div>
        )}
        <div className="mt16">
          <a href={chemin('connexion-email', { st: 'existe', ...fq })} className="btn primary" aria-disabled={envoi || undefined} onClick={(e) => (e.preventDefault(), creer())}>
            <Icone nom="arrow-right" taille={18} />
            <span>{t('Créer mon compte')}</span>
          </a>
        </div>
        <p className="cl03-legal">
          {t('En créant ton compte, tu acceptes nos conditions (version 1.0).')}
          <br />
          <Link to={chemin('cgu', { st: 'inscription' })} className="cl03-link">
            {t('Les lire en bref')}
          </Link>
        </p>
        <Link to={chemin('inscription-diaspora')} className="card row mt12" style={{ gap: 10, color: 'inherit' }}>
          <Icone nom="globe" taille={20} />
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {t('Tu vis à l’étranger ? S’inscrire en tant que diaspora')}
            </b>
            <span className="t12 c3">{t('Commande pour tes proches au Cameroun, payé par carte.')}</span>
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
        <p className="cx-alt">
          <Link to={chemin('diaspora-infos')}>{t('Qui peut ouvrir un compte diaspora ?')}</Link>
        </p>
        <p className="cx-alt">
          {t('Déjà un compte ? ')}
          <Link to={onglet(false)} replace>
            {t('Se connecter')}
          </Link>
        </p>
      </>
    )
  else
    corps = (
      <>
        {enErreur && (
          <div className="note red">
            <Icone nom="circle-alert" taille={18} />
            <div>
              {erreur?.type === 'bloque' && erreur.jusqua ? (
                <>
                  <b>{t('Trop d’essais.')}</b>
                  {tf(' Réessaie à {h}, ou choisis un nouveau mot de passe.', { h: heure(erreur.jusqua) })}
                </>
              ) : erreur?.type === 'vide' ? (
                <>
                  <b>{t('E-mail et mot de passe demandés.')}</b>
                  {t(' Écris les deux pour te connecter.')}
                </>
              ) : (
                <>
                  <b>{t('E-mail ou mot de passe incorrect.')}</b>
                  {t(' Vérifie l’adresse, ou choisis un nouveau mot de passe.')}
                </>
              )}
            </div>
          </div>
        )}
        {champEmail(enErreur)}
        <MotDePasse valeur={mdp} changer={(v) => (setMdp(v), setErreur(null))} err={enErreur} />
        <div className="cx-row">
          <span
            className={'rmb' + (souvenir ? ' on' : '')}
            role="checkbox"
            aria-checked={souvenir}
            tabIndex={0}
            onClick={() => setSouvenir(!souvenir)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSouvenir(!souvenir))}
          >
            <span className="bx">
              <Icone nom="check" taille={14} trait={3} />
            </span>
            {t('Se souvenir de moi')}
          </span>
          <Link to={chemin('mdp-oublie')} className="cl03-link">
            {t('Mot de passe oublié ?')}
          </Link>
        </div>
        <div className="mt8">
          <a href={suite} className="btn primary" aria-disabled={envoi || undefined} onClick={(e) => (e.preventDefault(), seConnecter())}>
            <Icone nom="log-in" taille={18} />
            <span>{t('Se connecter')}</span>
          </a>
        </div>
        {enErreur && (
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Après 5 essais, attends 15 minutes ou choisis un nouveau mot de passe.')}</span>
          </div>
        )}
        {erreur?.type === 'incorrect' && (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Démonstration : le mot de passe du compte d’essai est Belivay2026.')}</span>
          </div>
        )}
        <p className="cx-alt">
          {t('Pas encore de compte ? ')}
          <Link to={onglet(true)} replace>
            {t('Créer un compte')}
          </Link>
        </p>
      </>
    )

  return (
    <Ecran route="connexion-email" parEtat etat={etat} gabarit="arrivee">
      <Styles id="f16ded0d4c" />
      <Styles id="0b0ccec1e3" />
      <Styles id="1c3d953197" />
      <Partage visuel={<Hero inscription={inscription} />}>
        {seg}
        {corps}
        <Confiance />
      </Partage>
    </Ecran>
  )
}
