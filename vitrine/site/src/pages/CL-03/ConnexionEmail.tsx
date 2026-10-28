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
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { CompteReconnu, LienMagique, LienServeur } from '../../compte/Connexion'
import { Kit, Note, Ou, useTk } from '../../compte/socle'
import { departClient } from '../../demo/compte-client'
import { AIDE_CONNEXION_CLIENT } from '../../demo/valeurs-essai'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { env } from '../../config/env'
import { chemin } from '../../config/pages'
import { garderSuite, lireSuite, versApresConnexion } from '../../donnees/connexion'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { hybride } from '../../comptes-reels/hybride'
import { AccesConsentement } from '../../compte/acces-reel'
import { Acces, AccesCadre, AccesChemins, AccesLegal, AccesLiens, AccesTitre } from '../../compte/acces'

// Un lien ne s'ouvre qu'une fois : la même demande sert si l'écran se monte deux fois (mode strict, retour).
const liensOuverts = new Map<string, ReturnType<typeof source.ouvrirLienConnexion>>()
const ouvrirLien = (jeton: string) => {
  if (!liensOuverts.has(jeton)) liensOuverts.set(jeton, source.ouvrirLienConnexion(jeton))
  return liensOuverts.get(jeton)!
}

const REMPLI = '••••••••••' // mot de passe enregistré ou proposé par le téléphone
const heure = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
}

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
  const prefs = usePreferences()
  const { t, tf } = prefs
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const majSession = useMajSession()
  const st = params.get('st')
  const panier = params.get('from') === 'panier'
  const inscription = st === 'inscription' || st === 'existe'
  // « Ajouter un compte » (ajout=1) : champs vides, pas l'adresse d'un compte déjà sur le téléphone ; un compte de
  // l'appareil qui demande son mot de passe arrive avec son adresse (email=…).
  const ajout = params.get('ajout') === '1'
  const emailDonne = params.get('email')
  const fq = { ...(panier ? { from: 'panier' } : {}), ...(ajout ? { ajout: '1' } : {}) }
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
  // Lien de connexion reçu par e-mail (/connexion-email?lien=…, mode api) : ouvert une seule fois, puis la suite.
  const { tk } = useTk()
  const lien = params.get('lien')
  const [lienRefuse, setLienRefuse] = useState<'expire' | 'invalide' | null>(null)
  useEffect(() => {
    if (!lien || env.source !== 'api') return
    let vivant = true
    ouvrirLien(lien).then((r) => {
      if (!vivant) return
      if (!r.ok) return setLienRefuse(r.raison)
      garderSuite(null)
      naviguer(versApresConnexion(r.session, lireSuite()), { replace: true })
      majSession(r.session)
    })
    return () => {
      vivant = false
    }
  }, [lien, naviguer, majSession])

  const [prenom, setPrenom] = useState<string | null>(ajout ? '' : null) // null : celui du téléphone
  const [email, setEmail] = useState<string | null>(emailDonne ?? (ajout ? '' : null)) // null : celui de l'appareil (masqué)
  const [mdp, setMdp] = useState<string | null>(null) // null : enregistré, ou proposé à l'inscription
  const [souvenir, setSouvenir] = useState(true)
  const [erreur, setErreur] = useState<{ type: 'incorrect' | 'bloque' | 'existe' | 'prenom' | 'email' | 'mdp' | 'vide'; jusqua?: number } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  // Changer d'onglet (se connecter, créer un compte) efface l'erreur affichée.
  useEffect(() => setErreur(null), [inscription])
  // (Avant tout retour anticipé : mêmes hooks à chaque rendu.) Comptes réels (source hybride) : consentement explicite aux conditions et à la confidentialité avant de créer.
  const [accepte, setAccepte] = useState(false)
  const [vuConsentement, setVuConsentement] = useState(false)
  if (retenu === undefined) return null

  // Kit « compte » : appareil retenu, champs laissés tels quels → le compte est reconnu, sa photo affichée.
  const reconnu = !!retenu && email === null && mdp === null && !inscription
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
    if (hybride && !accepte) return setVuConsentement(true)
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
    <AccesChemins
      actif={inscription ? 'inscription' : 'connexion'}
      label={t('Se connecter ou créer un compte')}
      connexion={
        <Link to={onglet(false)} replace>
          {t('Se connecter')}
        </Link>
      }
      inscription={
        <Link to={onglet(true)} replace>
          {t('Créer un compte')}
        </Link>
      }
    />
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
          <div className="note red mt8" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>
            {t(
              erreur.type === 'prenom'
                ? 'Écris ton prénom (40 caractères au plus).'
                : erreur.type === 'email'
                  ? 'Cette adresse e-mail ne semble pas complète : vérifie-la.'
                  : 'Ton mot de passe : 8 caractères au moins, dont un chiffre.',
            )}
            </div>
          </div>
        )}
        {hybride ? (
          <AccesConsentement coche={accepte} changer={(v) => (setAccepte(v), setVuConsentement(false))} conditions={chemin('cgu')} confidentialite={chemin('legal-doc', { d: 'confidentialite' })} erreur={vuConsentement && !accepte} />
        ) : (
          <AccesLegal>
            {t('En créant ton compte, tu acceptes nos conditions (version 1.0).')}{' '}
            <Link to={chemin('cgu', { st: 'inscription' })}>{t('Les lire en bref')}</Link>
            {' · '}
            <Link to={chemin('legal-doc', { d: 'confidentialite' })}>{t('Confidentialité')}</Link>
          </AccesLegal>
        )}
        <div className="mt16">
          <a href={chemin('connexion-email', { st: 'existe', ...fq })} className="btn primary" aria-disabled={envoi || undefined} aria-busy={envoi || undefined} onClick={(e) => (e.preventDefault(), creer())}>
            <Icone nom="arrow-right" taille={18} />
            <span>{t('Créer mon compte')}</span>
          </a>
        </div>
        <Link to={chemin('inscription-diaspora')} className="card row" style={{ gap: 10, color: 'inherit', marginTop: 20 }}>
          <Icone nom="globe" taille={20} />
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {t('Tu vis à l’étranger ? S’inscrire en tant que diaspora')}
            </b>
            <span className="t12 c3">{t('Commande pour tes proches au Cameroun, payé par carte.')}</span>
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
        <AccesLiens label={t('Autres liens')}>
          <Link to={chemin('diaspora-infos')}>{t('Qui peut ouvrir un compte diaspora ?')}</Link>
          <Link to={onglet(false)} replace>
            {t('Déjà un compte ? Se connecter')}
          </Link>
        </AccesLiens>
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
        {reconnu && (
          <Kit couleur="#B0430A" texte="var(--or-txt)">
            <CompteReconnu app="client" depart={departClient()} continuer={() => void seConnecter()} />
          </Kit>
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
        <Kit couleur="#B0430A" texte="var(--or-txt)">
          <Ou />
          {env.source === 'api' ? (
            <LienServeur email={email ?? ''} demander={(e) => source.demanderLienConnexion(e)} />
          ) : (
            <LienMagique app="client" depart={departClient()} email={email ?? departClient().email ?? ''} ouvrir={() => void source.reprendreCompte().then(fini)} />
          )}
          {lienRefuse && (
            <Note ton="err">{tk(lienRefuse === 'expire' ? 'Ce lien n’est plus valable : demandez un nouveau lien.' : 'Ce lien n’est pas valable : demandez un nouveau lien.')}</Note>
          )}
        </Kit>
        {enErreur && (
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Après 5 essais, attends 15 minutes ou choisis un nouveau mot de passe.')}</span>
          </div>
        )}
        {/* Aide de la démonstration seulement : le mot de passe d'essai (src/demo/valeurs-essai.ts). */}
        {erreur?.type === 'incorrect' && env.source !== 'api' && (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t(AIDE_CONNEXION_CLIENT)}</span>
          </div>
        )}
      </>
    )

  return (
    <Ecran route="connexion-email" parEtat etat={etat}>
      <Styles id="f16ded0d4c" />
      <Styles id="0b0ccec1e3" />
      <Styles id="1c3d953197" />
      <AccesCadre
        acteur="client"
        compact
        sansTete
        logo={img_be926f70d2b8_png}
        espace={t('Espace client')}
        phrase={t(inscription ? 'Ton compte en 30 secondes : tu commandes, tu retires au relais de ton quartier.' : 'Suis tes colis et paie en un geste, avec ton Wallet ou Mobile Money.')}
        reglages={prefs}
        pied={
          <AccesLiens label={t('Liens utiles')}>
            <Link to={chemin('aide')}>{t('Aide et contact')}</Link>
            <Link to={chemin('cgu')}>{t('Conditions')}</Link>
            <Link to={chemin('legal-doc', { d: 'confidentialite' })}>{t('Confidentialité')}</Link>
          </AccesLiens>
        }
      >
        <Acces>
          {seg}
          <AccesTitre
            niveau={2}
            titre={t(inscription || existe ? 'Créer ton compte' : 'Connexion par e-mail')}
            phrase={t(inscription || existe ? 'Ton prénom, ton e-mail et un mot de passe : tu achètes près de chez toi et tu retires au relais de ton quartier.' : 'Ton e-mail et ton mot de passe, ou un lien de connexion reçu par e-mail.')}
          />
          {corps}
        </Acces>
      </AccesCadre>
    </Ecran>
  )
}
