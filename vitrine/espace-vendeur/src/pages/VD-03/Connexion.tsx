// Connexion vendeur (VD-03), refaite le 25 oct. 2026 au cadre d'accès commun (CadreVendeur : accroche et photo de
// marque, carte qui les chevauche, autres espaces ; ACCES-REFERENCES.md). Chaque état est une adresse (?s=…), le retour
// du téléphone y revient ; après l'accueil, les étapes passent en cadre compact (formulaire d'abord au téléphone) :
// - accueil : deux onglets « Se connecter » / « Ouvrir ma boutique » ; numéro, Google, Apple (OAuth ; appareil
//   inconnu → code SMS), identifiant ou e-mail ; « Se souvenir de moi » (session gardée 30 jours sans ouverture, sinon
//   fermée avec le navigateur : téléphone partagé, DP-57 S-3) ; langue FR/EN en pastille avant toute saisie (CNX-05) ;
// - ?s=email : identifiant (@Penga12) ou e-mail et mot de passe ; « Identifiant ou mot de passe incorrect · encore n
//   essais », blocage 15 minutes et propriétaire prévenu (CNX-03) ; aucune erreur technique (VD03-R03) ;
// - ?s=numero (&canal=sms) : numéro +237, opérateur reconnu, code par WhatsApp ou SMS ; ?s=code : le code (CodeSMS) ;
// - ?s=2fa : second facteur d'un appareil inconnu, l'appareil qui demande et l'heure (CNX-01, VD03-R02) ;
// - ?s=oubli : lien par SMS et e-mail, valable 15 minutes (VD03-R04, DP-56 Q-22), sans dire si le compte existe ;
//   ?s=nouveau&jeton= : nouveau mot de passe (8 caractères dont un chiffre, CNX-02) confirmé par un code SMS ;
// - ?s=plusnum : plus accès à son numéro ; support BelivaY (WhatsApp, e-mail) même sans être connecté.
// Après la connexion : la page demandée (?next=), sinon l'accueil ; Face ID ou l'empreinte proposés une fois si le
// téléphone en a (DP-57 S-1 : ils n'ouvrent que l'application).
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { env } from '@client/config/env'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { CompteReconnu, LienMagique, compteDe } from '@client/compte/Connexion'
import { ecrireCompte, useCompteDemo } from '@client/compte/etat'
import { Kit, Ou } from '@client/compte/socle'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesEtapes, AccesLiens, AccesOu, AccesTitre, BoutonFournisseur } from '@client/compte/acces'
import { departProprietaire } from '../../demo/compte'
import { BOUTIQUE, MOT_DE_PASSE_ESSAI } from '../../demo/jeu-essai'
import { ouvrirParCompte } from '../../demo/session'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Canal, EnvoiCode, LienMotDePasse, NouveauMotDePasse, ResultatConnexion } from '../../donnees/domaines/session'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useRelireSession, useSession } from '../../session'
import { BoutonPlein, Chargement, CodeSMS, Comment, Demo, ErreurLecture, HorsLigne, chiffresDe, espacer, numeroValide, operateur, useEnLigne } from './commun'
import { hybride, sessionReelle } from '@client/comptes-reels/hybride'
import { AccesAttente } from '@client/compte/acces-reel'
import { CompteReconnuApi, LienParEmail, apresConnexion, compteRetenu, retenirCompte } from './compte-api'

// Mode API : le kit « compte » passe par le serveur (./compte-api.tsx) ; la démonstration garde le kit tel quel.
const API = env.source === 'api'

// Exemple du champ identifiant : celui du compte d'essai en démonstration, un modèle neutre avec l'API.
const exempleIdentifiant = (t: (x: string) => string) => (env.source === 'api' ? t('@identifiant') : BOUTIQUE.identifiant)

const SUPPORT_WHATSAPP = 'https://wa.me/237689002812'
const SUPPORT_EMAIL = 'mailto:contact@belivay.com'
const CLE_SOUVENIR = 'blv_v_souvenir'
const CLE_IDENTIFIANT = 'blv_v_identifiant'

const lire = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const garder = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* rien */
  }
}

/** Face ID ou empreinte disponibles sur ce téléphone (authentificateur de la plateforme). */
async function biometriePossible(): Promise<boolean> {
  try {
    const pk = (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential
    if (!pk?.isUserVerifyingPlatformAuthenticatorAvailable || navigator.webdriver) return false
    return await Promise.race([pk.isUserVerifyingPlatformAuthenticatorAvailable(), new Promise<boolean>((r) => setTimeout(() => r(false), 400))])
  } catch {
    return false
  }
}

function useSuite() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const relireSession = useRelireSession()
  const next = params.get('next')
  const destination = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/connexion') ? next : chemin('accueil')
  const vers = (s: string | null, extra?: Record<string, string>) => chemin('connexion', { s, next, ...extra })
  const entrer = async () => {
    jouer('valide')
    // Mode API : la session relue d'abord (la garde des routes la lit) ; le compte connecté est retenu sur ce téléphone
    // (« Se souvenir de moi »), ou oublié.
    if (API) await Promise.all([relireSession().catch(() => undefined), apresConnexion(lire(CLE_SOUVENIR) !== 'non')])
    const b = await source.session.biometrie().catch(() => null)
    if (b && !b.proposee && (await biometriePossible())) return naviguer(chemin('faceid', { next: destination }), { replace: true })
    naviguer(destination, { replace: true })
  }
  return { next, vers, entrer, naviguer }
}

function Retour({ vers }: { vers: string }) {
  const { t } = usePreferences()
  return (
    <Link to={vers} className="ibtn" style={{ marginLeft: '-8px' }} aria-label={t('Retour')}>
      <Icone nom="chevron-left" taille={26} />
    </Link>
  )
}

function SeSouvenir({ on, changer }: { on: boolean; changer: (v: boolean) => void }) {
  const { t } = usePreferences()
  const basculer = () => (changer(!on), navigator.vibrate?.(8))
  return (
    <span
      className={'rmb' + (on ? ' on' : '')}
      role="checkbox"
      aria-checked={on}
      tabIndex={0}
      title={t(on ? 'Session gardée sur ce téléphone' : 'Session fermée avec le navigateur')}
      onClick={basculer}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), basculer())}
    >
      <span className="bx">
        <Icone nom="check" taille={14} trait={3} />
      </span>
      {t('Se souvenir de moi')}
    </span>
  )
}

/** Message d'un refus de connexion (VD03-R03 : jamais d'erreur technique). */
function MessageRefus({ r }: { r: Extract<ResultatConnexion, { ok: false }> | null }) {
  const { t, tf, langue } = usePreferences()
  if (!r || r.raison === 'deuxieme_facteur') return null
  return (
    <div className="note red" role="alert">
      <Icone nom={r.raison === 'bloque' ? 'lock' : 'circle-alert'} taille={18} />
      <div>
        {r.raison === 'indisponible' ? (
          t('Connexion par ce compte indisponible pour le moment : utilisez votre numéro ou votre mot de passe.')
        ) : r.raison === 'refuse' ? (
          t('Ce compte n’a pas pu être vérifié. Réessayez, ou utilisez votre numéro ou votre mot de passe.')
        ) : r.raison === 'inconnu' ? (
          t('Aucune boutique n’est liée à ce compte. Connectez-vous avec votre numéro ou ouvrez votre boutique.')
        ) : r.raison === 'bloque' ? (
          <>
            <b>{t('Connexion bloquée 15 min. Un message a été envoyé au propriétaire.')}</b>
            <div className="mt4">{tf('Réessayez à {h}, ou choisissez un nouveau mot de passe.', { h: heure(r.jusqua, langue) })}</div>
          </>
        ) : r.essaisRestants > 1 ? (
          tf('Identifiant ou mot de passe incorrect · encore {n} essais', { n: r.essaisRestants })
        ) : (
          t('Identifiant ou mot de passe incorrect · dernier essai avant 15 minutes d’attente')
        )}
      </div>
    </div>
  )
}

/** Mot de passe oublié en deux étapes (gabarit d'accès commun). */
function EtapesOubli({ n }: { n: 1 | 2 }) {
  const { t, tf } = usePreferences()
  return (
    <div style={{ marginTop: 8 }}>
      <AccesEtapes etapes={[t('Recevoir le lien'), t('Nouveau mot de passe')]} actuelle={n} libelle={(x, total) => tf('Étape {n} sur {total}', { n: x, total })} />
    </div>
  )
}

// ── Accueil de la connexion ────────────────────────────────────────────────────────────────────────────────────────

function Accueil({ souvenir, setSouvenir }: { souvenir: boolean; setSouvenir: (v: boolean) => void }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const { vers, entrer, naviguer } = useSuite()
  const enLigne = useEnLigne()
  const [attente, setAttente] = useState<'google' | 'apple' | null>(null)
  const [refus, setRefus] = useState<Extract<ResultatConnexion, { ok: false }> | null>(null)
  const avec = async (f: 'google' | 'apple') => {
    if (attente || !enLigne) return
    setAttente(f)
    const r = await source.session.connecterAvec(f, { seSouvenir: souvenir })
    setAttente(null)
    if (r.ok) return entrer()
    if (r.raison === 'deuxieme_facteur') return naviguer(vers('2fa'))
    setRefus(r)
  }
  return (
    <Acces>
      <Chemins actif="connexion" />
      <AccesTitre titre={t('Connexion vendeur')} phrase={t('Retrouvez vos commandes, vos produits et vos versements du vendredi.')} />
      {s.connecte && s.membre && (
        <Link to={chemin('accueil')} className="note green" style={{ textDecoration: 'none', marginBottom: 16 }}>
          <Icone nom="circle-check" taille={18} />
          <div>
            {tf('Vous êtes connecté : {nom}.', { nom: `${s.membre.prenom} ${s.membre.nom}` })} <b>{t('Aller à l’accueil')}</b>
          </div>
        </Link>
      )}
      {!enLigne && <HorsLigne texte="La connexion reprend dès le retour du réseau." />}
      <MessageRefus r={refus} />
      <div className="acc-pile">
        {/* Comptes réels (source hybride) : l'e-mail et le mot de passe d'abord ; le numéro (code SMS) reste à la démonstration. */}
        {hybride ? (
          <Link to={vers('email')} className="btn primary">
            <Icone nom="mail" taille={18} />
            <span>{t('Se connecter avec mon e-mail')}</span>
          </Link>
        ) : (
          <Link to={vers('numero')} className="btn primary">
            <Icone nom="smartphone" taille={18} />
            <span>{t('Continuer avec mon numéro')}</span>
          </Link>
        )}
      </div>
      <div className="cx-row" style={{ marginTop: 8 }}>
        <SeSouvenir on={souvenir} changer={setSouvenir} />
      </div>
      <AccesOu texte={t('ou')} />
      <div className="acc-pile">
        <BoutonFournisseur fournisseur="google" texte={t(attente === 'google' ? 'Connexion…' : 'Continuer avec Google')} occupe={attente === 'google'} desactive={!enLigne} onClick={() => void avec('google')} />
        <BoutonFournisseur fournisseur="apple" texte={t(attente === 'apple' ? 'Connexion…' : 'Continuer avec Apple')} occupe={attente === 'apple'} desactive={!enLigne} onClick={() => void avec('apple')} />
        {hybride ? (
          <Link to={vers('numero')} className="btn secondary">
            <Icone nom="smartphone" taille={18} />
            <span>{t('Continuer avec mon numéro')}</span>
          </Link>
        ) : (
          <Link to={vers('email')} className="btn secondary">
            <Icone nom="mail" taille={18} />
            <span>{t('Identifiant ou e-mail')}</span>
          </Link>
        )}
      </div>
      <AccesLiens label={t('Accès au compte')}>
        <Link to={vers('oubli')}>{t('Mot de passe oublié ?')}</Link>
        <Link to={vers('plusnum')}>{t('Plus accès à mon numéro')}</Link>
      </AccesLiens>
      {env.source !== 'api' && (
        <AccesDemo
          qui={t('Boutique B · propriétaire')}
          connecter={async () => {
            // Le propriétaire de Boutique B, par le parcours réel : identifiant et mot de passe d'essai, puis le code de
            // démonstration si l'appareil est inconnu.
            const r = await source.session.connecter(BOUTIQUE.identifiant, MOT_DE_PASSE_ESSAI, { seSouvenir: souvenir })
            if (!r.ok && r.raison === 'deuxieme_facteur') {
              const v = await source.session.validerDeuxiemeFacteur(r.defi.codeDemo ?? '')
              if (!v.ok) return t('Le code de démonstration n’a pas été accepté : réessayez.')
            } else if (!r.ok) return r.raison === 'bloque' ? t('Connexion bloquée 15 min. Un message a été envoyé au propriétaire.') : t('Identifiant ou mot de passe incorrect.')
            await entrer()
            return null
          }}
        />
      )}
    </Acces>
  )
}

/** Les deux chemins du vendeur : se connecter, ou ouvrir sa boutique. */
export function Chemins({ actif }: { actif: 'connexion' | 'inscription' }) {
  const { t } = usePreferences()
  return (
    <AccesChemins
      actif={actif}
      label={t('Se connecter ou ouvrir une boutique')}
      connexion={<Link to={chemin('connexion')}>{t('Se connecter')}</Link>}
      inscription={<Link to={chemin('ouvrir')}>{t('Ouvrir ma boutique')}</Link>}
    />
  )
}

/** Cadre d'accès du vendeur (connexion et ouverture de boutique). `compact` : étapes après l'accueil. */
export function CadreVendeur({ compact, children }: { compact?: boolean; children: ReactNode }) {
  const prefs = usePreferences()
  const { t } = prefs
  const s = useSession()
  return (
    <AccesCadre
      acteur="vendeur"
      compact={compact}
      logo={logo}
      espace={t('Espace vendeur')}
      phrase={t('Vous vendez près de chez vous. BelivaY encaisse pour vous et vous verse chaque vendredi.')}
      reglages={prefs}
      pied={
        <AccesLiens label={t('Liens utiles')}>
          <Link to={chemin('installer')}>{t('Installer l’app')}</Link>
          <SupportLien connecte={s.connecte} />
        </AccesLiens>
      }
    >
      {children}
    </AccesCadre>
  )
}

// ── E-mail ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function Email({ souvenir, setSouvenir }: { souvenir: boolean; setSouvenir: (v: boolean) => void }) {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const { vers, entrer, naviguer } = useSuite()
  const enLigne = useEnLigne()
  const [id, setId] = useState(() => params.get('id') ?? lire(CLE_IDENTIFIANT) ?? '')
  const [mdp, setMdp] = useState('')
  const [voir, setVoir] = useState(false)
  const [majuscules, setMaj] = useState(false)
  const [vu, setVu] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [refus, setRefus] = useState<Extract<ResultatConnexion, { ok: false }> | null>(null)
  const [attente, setAttente] = useState<{ qui: string; email: string } | null>(null)
  const pret = !!id.trim() && !!mdp && !enCours && enLigne
  const envoyer = async () => {
    setVu(true)
    if (!pret) return
    setEnCours(true)
    const r = await source.session.connecter(id, mdp, { seSouvenir: souvenir })
    setEnCours(false)
    if (r.ok || r.raison === 'deuxieme_facteur') garder(CLE_IDENTIFIANT, souvenir ? id.trim() : '')
    if (r.ok || r.raison === 'deuxieme_facteur') ecrireCompte('vendeur', () => ({ retenu: souvenir }))
    // Compte réel en attente de validation (source hybride) : on le dit avant d'ouvrir quoi que ce soit.
    const reelle = r.ok && hybride ? await sessionReelle('vendeur') : null
    if (reelle?.user.statut === 'en_attente') return setAttente({ qui: reelle.user.organisation ?? '', email: reelle.user.email })
    if (r.ok) return entrer()
    if (r.raison === 'deuxieme_facteur') return naviguer(vers('2fa'))
    jouer('erreur')
    setMdp('')
    setRefus(r)
  }
  const bloque = refus?.raison === 'bloque'
  // Kit « compte » : appareil retenu → l'e-mail suffit (compte reconnu, photo) ; lien de connexion par e-mail.
  const compte = useCompteDemo('vendeur')
  const depart = departProprietaire()
  const [pasMoi, setPasMoi] = useState(false)
  const [retenu] = useState(compteRetenu)
  const reconnu = API
    ? !!retenu && !pasMoi && id.trim().toLowerCase() === (retenu.email ?? '').toLowerCase()
    : compte.retenu && !pasMoi && id.includes('@') && !id.trim().startsWith('@') && compteDe('vendeur', depart, id)
  const parLien = () => (ouvrirParCompte(souvenir), entrer())
  if (attente)
    return (
      <AccesAttente
        qui={attente.qui || t('votre boutique')}
        email={attente.email}
        delai={t('2 jours ouvrés au plus')}
        continuer={() => void entrer()}
        deconnecter={() => void source.session.deconnecter().then(() => (setAttente(null), setMdp('')))}
      />
    )
  return (
    <>
      <Retour vers={vers(null)} />
      <h1 className="pg-t" style={{ marginTop: '8px' }}>
        {t('Connexion par e-mail')}
      </h1>
      <p className="pg-s">{t('Votre identifiant ou votre e-mail, puis votre mot de passe.')}</p>
      {!enLigne && <HorsLigne texte="La connexion reprend dès le retour du réseau." />}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void envoyer()
        }}
      >
        <div className="fld">
          <label htmlFor="cx-id">{t('Identifiant ou e-mail')}</label>
          <div className={'inp' + (vu && !id.trim() ? ' err' : '')}>
            <Icone nom="user" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="cx-id" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={exempleIdentifiant(t)} value={id} onChange={(e) => (setId(e.target.value), setRefus(null))} />
          </div>
          {vu && !id.trim() && <div className="hint err" role="alert">{t('Écrivez votre identifiant ou votre e-mail.')}</div>}
        </div>
        {reconnu && (
          <Kit couleur="#B0430A" texte="var(--or-txt)">
            {API && retenu ? (
              <CompteReconnuApi compte={retenu} souvenir={souvenir} autre={() => (setPasMoi(true), retenirCompte(null))} />
            ) : (
              <CompteReconnu app="vendeur" depart={depart} continuer={parLien} autre={() => (setPasMoi(true), ecrireCompte('vendeur', () => ({ retenu: false })))} />
            )}
          </Kit>
        )}
        {!reconnu && (
        <>
        <div className="fld">
          <label htmlFor="cx-mdp">{t('Mot de passe')}</label>
          <div className={'inp' + (vu && !mdp && !refus ? ' err' : '')}>
            <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input
              id="cx-mdp"
              type={voir ? 'text' : 'password'}
              autoComplete="current-password"
              value={mdp}
              disabled={bloque}
              onChange={(e) => (setMdp(e.target.value), setRefus((r) => (r?.raison === 'bloque' ? r : null)))}
              onKeyUp={(e) => setMaj(e.getModifierState?.('CapsLock') ?? false)}
            />
            <span className="suf">
              <button type="button" className="vd03-oeil" aria-label={t(voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} aria-pressed={voir} onClick={() => setVoir((v) => !v)}>
                <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
              </button>
            </span>
          </div>
          {majuscules && <div className="hint">{t('Majuscules activées.')}</div>}
        </div>
        <div className="cx-row">
          <SeSouvenir on={souvenir} changer={setSouvenir} />
          <Link to={vers('oubli', id.trim() ? { id: id.trim() } : undefined)} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            {t('Mot de passe oublié ?')}
          </Link>
        </div>
        <MessageRefus r={refus} />
        <div className="mt8">
          <button type="submit" className={'btn primary' + (pret && !bloque ? '' : ' off')} aria-disabled={pret && !bloque ? undefined : 'true'} title={pret ? undefined : t('Écrivez votre identifiant et votre mot de passe.')}>
            <Icone nom="arrow-right" taille={18} />
            <span>{t(enCours ? 'Connexion…' : 'Se connecter')}</span>
          </button>
        </div>
        </>
        )}
      </form>
      {!reconnu && (
        <Kit couleur="#B0430A" texte="var(--or-txt)">
          <Ou />
          {API ? <LienParEmail email={id} souvenir={souvenir} /> : <LienMagique app="vendeur" depart={depart} email={id} ouvrir={parLien} />}
        </Kit>
      )}
    </>
  )
}

// ── Numéro ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function Numero({ souvenir, setSouvenir }: { souvenir: boolean; setSouvenir: (v: boolean) => void }) {
  const { t, langue, tf } = usePreferences()
  const [params] = useSearchParams()
  const { vers, naviguer } = useSuite()
  const enLigne = useEnLigne()
  const canal: Canal = params.get('canal') === 'sms' ? 'sms' : 'whatsapp'
  const [n, setN] = useState(() => chiffresDe(params.get('n') ?? ''))
  const [vu, setVu] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const op = operateur(n)
  const valide = numeroValide(n)
  const recevoir = async () => {
    setVu(true)
    if (!valide || !enLigne) return
    const r = await source.session.demanderCodeNumero(n, canal, { seSouvenir: souvenir })
    if (r.ok) return naviguer(vers('code', canal === 'sms' ? { canal } : undefined))
    jouer('erreur')
    setRefus(
      r.raison === 'inconnu'
        ? t('Ce numéro n’a pas de compte vendeur. Ouvrez votre boutique, ou connectez-vous par e-mail.')
        : r.raison === 'limite'
          ? tf('Trois codes envoyés en une heure. Nouveau code possible à {h}.', { h: heure(r.jusqua, langue) })
          : t('Un numéro du Cameroun a 9 chiffres et commence par 6.'),
    )
  }
  return (
    <>
      <Retour vers={vers(null)} />
      <h1 className="pg-t" style={{ marginTop: '8px' }}>
        {t('Votre numéro')}
      </h1>
      <p className="pg-s">{t('Le numéro de votre compte vendeur. Un code, et vous êtes connecté. Pas de mot de passe.')}</p>
      <label className="vd03-sr" htmlFor="cx-num" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {t('Numéro de téléphone')}
      </label>
      <div className={'vx-ph' + (vu && !valide ? ' err' : '')}>
        <span className="vx-cc">
          <Dessin id="81b1dee44510" />
          {t('+237')}
        </span>
        <span className="vx-num">
          <input id="cx-num" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="677 42 18 90" value={espacer(n)} onChange={(e) => (setN(chiffresDe(e.target.value)), setRefus(null))} onKeyDown={(e) => e.key === 'Enter' && void recevoir()} />
        </span>
        {op && (
          <span className="vx-op">
            <Icone nom="circle-check" taille={13} />
            {t(op)}
          </span>
        )}
      </div>
      {vu && !valide && <div className="hint err" role="alert">{t('Un numéro du Cameroun a 9 chiffres et commence par 6.')}</div>}
      <div className="vx-ch" role="radiogroup" aria-label={t('Recevoir le code par')}>
        {(
          [
            ['whatsapp', 'message-circle', 'WhatsApp', 'Arrive même avec peu de réseau'],
            ['sms', 'message-square', 'SMS', 'Sans Internet'],
          ] as const
        ).map(([c, ic, nom, sous]) => (
          <Link key={c} to={vers('numero', { ...(c === 'sms' ? { canal: 'sms' } : {}), ...(n ? { n } : {}) })} replace className={canal === c ? 'on' : ''} role="radio" aria-checked={canal === c}>
            <span className="i">
              <Icone nom={ic} taille={18} />
            </span>
            <span>
              <b>{t(nom)}</b>
              <span>{t(sous)}</span>
            </span>
          </Link>
        ))}
      </div>
      {!enLigne && <HorsLigne texte="Le code partira dès le retour du réseau." />}
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{refus}</div>
        </div>
      )}
      <div className="mt12">
        <BoutonPlein icone="arrow-right" actif={enLigne} raison={t('Pas de connexion.')} onClick={() => void recevoir()}>
          {t('Recevoir le code')}
        </BoutonPlein>
      </div>
      <div className="cx-row">
        <SeSouvenir on={souvenir} changer={setSouvenir} />
      </div>
      <div className="vx-links">
        <Link to={vers('plusnum')}>
          <Icone nom="smartphone" taille={18} />
          <span className="g">{t('Ce n’est plus mon numéro')}</span>
          <Icone nom="chevron-right" taille={16} />
        </Link>
        <Link to={vers('email')}>
          <Icone nom="mail" taille={18} />
          <span className="g">{t('Me connecter par e-mail')}</span>
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
    </>
  )
}

function Code() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const { vers, entrer, naviguer } = useSuite()
  const enLigne = useEnLigne()
  const canal: Canal = params.get('canal') === 'sms' ? 'sms' : 'whatsapp'
  const lecture = useLecture(async () => ({ envoi: await source.session.envoiNumero() }), [])
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const autre: Canal = canal === 'sms' ? 'whatsapp' : 'sms'
  const changerCanal = async () => {
    const r = await source.session.renvoyerCodeNumero(autre)
    if (r.ok) {
      setEnvoi(r.envoi)
      naviguer(vers('code', autre === 'sms' ? { canal: 'sms' } : undefined), { replace: true })
    }
  }
  const e = envoi ?? lecture.donnees?.envoi ?? null
  return (
    <>
      <Retour vers={vers('numero', canal === 'sms' ? { canal } : undefined)} />
      <div className="center">
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', margin: '0 auto', background: 'var(--or-soft)', color: 'var(--or-txt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom={canal === 'sms' ? 'message-square' : 'message-circle'} taille={28} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '12px' }}>
          {t('Entrez le code')}
        </h1>
        {e && <p className="pg-s">{tf(canal === 'sms' ? 'Envoyé par SMS au {n}.' : 'Envoyé par WhatsApp au {n}.', { n: e.destination })}</p>}
      </div>
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !lecture.donnees ? (
        <Chargement />
      ) : !e ? (
        <AucunCode vers={vers('numero')} />
      ) : (
        <CodeSMS
          envoi={e}
          enLigne={enLigne}
          sousLesCases="Le code se remplit tout seul quand le message arrive."
          valider={(c) => source.session.validerCodeNumero(c)}
          renvoyer={() => source.session.renvoyerCodeNumero(canal)}
          reussi={() => void entrer()}
          aCoteDuRenvoi={
            <button type="button" className="vd03-lien" onClick={() => void changerCanal()}>
              {t(autre === 'sms' ? 'Recevoir par SMS' : 'Recevoir par WhatsApp')}
            </button>
          }
        />
      )}
      <div className="vx-links">
        <Link to={vers('plusnum')}>
          <Icone nom="smartphone" taille={18} />
          <span className="g">{t('Ce n’est plus mon numéro')}</span>
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>{t('BelivaY ne vous demande jamais ce code, ni votre code secret Mobile Money.')}</div>
      </div>
    </>
  )
}

function AucunCode({ vers }: { vers: string }) {
  const { t } = usePreferences()
  return (
    <>
      <div className="note ink" role="status">
        <Icone nom="info" taille={18} />
        <div>{t('Aucun code en cours : demandez-en un nouveau.')}</div>
      </div>
      <div className="mt12">
        <Link to={vers} className="btn secondary">
          <Icone nom="rotate-cw" taille={18} />
          <span>{t('Recevoir un code')}</span>
        </Link>
      </div>
    </>
  )
}

// ── Second facteur ─────────────────────────────────────────────────────────────────────────────────────────────────

function DeuxiemeFacteur() {
  const { t, tf, langue } = usePreferences()
  const { vers, entrer } = useSuite()
  const enLigne = useEnLigne()
  const lecture = useLecture(async () => ({ defi: await source.session.defiEnCours() }), [])
  const defi = lecture.donnees?.defi ?? null
  return (
    <>
      <Retour vers={vers(null)} />
      <div className="center">
        <div style={{ width: '56px', height: '56px', borderRadius: '18px', margin: '0 auto', background: 'var(--or-soft)', color: 'var(--or-txt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icone nom="shield-check" taille={28} />
        </div>
        <h1 className="pg-t" style={{ marginTop: '12px' }}>
          {t('Entrez le code reçu par SMS')}
        </h1>
        {defi && <p className="pg-s">{tf('Nouvel appareil : par sécurité, un code est envoyé au {n}.', { n: defi.destination })}</p>}
      </div>
      {lecture.erreur ? (
        <ErreurLecture relire={lecture.relire} />
      ) : !lecture.donnees ? (
        <Chargement />
      ) : !defi ? (
        <AucunCode vers={vers('email')} />
      ) : (
        <>
          <CodeSMS envoi={defi} enLigne={enLigne} valider={(c) => source.session.validerDeuxiemeFacteur(c)} renvoyer={() => source.session.renvoyerDeuxiemeFacteur()} reussi={() => void entrer()} />
          <div className="card flat" style={{ marginTop: '16px', padding: '2px 14px 6px' }}>
            <div className="li">
              <span className="ic ">
                <Icone nom="smartphone" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(`${defi.appareil.nom} · ${defi.appareil.lieu}`)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {tf('Connexion demandée aujourd’hui à {h}', { h: heure(defi.demandeA, langue) })}
                </span>
              </span>
            </div>
            <div className="row" style={{ gap: '6px', borderTop: '1px solid var(--line)' }}>
              <span className="t13 c2">{t('Ce n’est pas vous ?')}</span>
              <Link to={vers('oubli')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
                {t('Changez votre mot de passe')}
              </Link>
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Une fois le code validé, ce téléphone est reconnu : il apparaît dans Sécurité.')}</span>
          </div>
        </>
      )}
    </>
  )
}

// ── Mot de passe oublié ────────────────────────────────────────────────────────────────────────────────────────────

function Oubli() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const s = useSession()
  const { vers } = useSuite()
  const enLigne = useEnLigne()
  const [id, setId] = useState(() => params.get('id') ?? lire(CLE_IDENTIFIANT) ?? '')
  const [vu, setVu] = useState(false)
  const [lien, setLien] = useState<LienMotDePasse | null>(null)
  const [reste, setReste] = useState(0)
  const [validite, setValidite] = useState(0)
  useEffect(() => {
    if (reste <= 0) return
    const x = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(x)
  }, [reste])
  useEffect(() => {
    if (validite <= 0) return
    const x = setTimeout(() => setValidite((r) => r - 1), 1000)
    return () => clearTimeout(x)
  }, [validite])
  const envoyer = async () => {
    setVu(true)
    if (!id.trim() || !enLigne || reste > 0) return
    const r = await source.session.demanderLienMotDePasse(id)
    if (!r.ok) return
    jouer('notification')
    setLien(r.lien)
    setReste(r.lien.renvoiSecondes)
    setValidite(r.lien.valideMinutes * 60)
  }
  const mmss = (x: number) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
  return (
    <>
      <Retour vers={vers('email')} />
      <EtapesOubli n={1} />
      <div className="pg">
        <h1 className="pg-t">{t('Mot de passe oublié')}</h1>
        <p className="pg-s">{t('Recevez un lien pour en choisir un nouveau.')}</p>
      </div>
      <div className="fld">
        <label htmlFor="cx-oubli">{t('Identifiant, e-mail ou téléphone')}</label>
        <div className={'inp' + (vu && !id.trim() ? ' err' : '')}>
          <Icone nom="user" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input id="cx-oubli" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={exempleIdentifiant(t)} value={id} onChange={(e) => setId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void envoyer()} />
        </div>
        {vu && !id.trim() && <div className="hint err" role="alert">{t('Écrivez votre identifiant, votre e-mail ou votre téléphone.')}</div>}
      </div>
      {!enLigne && <HorsLigne texte="Le lien partira dès le retour du réseau." />}
      {lien && (
        <div className="note green" role="status">
          <Icone nom="send" taille={18} />
          <div>
            <b>{t('Lien envoyé.')}</b> {t('Si un compte correspond, le lien arrive par SMS et par e-mail.')}
            <div className="mt4 vd03-cd">{validite > 0 ? tf('Il vaut encore {d}.', { d: mmss(validite) }) : t('Ce lien a expiré : demandez-en un nouveau.')}</div>
          </div>
        </div>
      )}
      <div className="mt16">
        <BoutonPlein icone="send" actif={enLigne && reste <= 0} raison={t(reste > 0 ? 'Un lien vient de partir.' : 'Pas de connexion.')} onClick={() => void envoyer()}>
          {lien ? (reste > 0 ? tf('Renvoyer le lien dans {d}', { d: mmss(reste) }) : t('Renvoyer le lien')) : t('Recevoir le lien')}
        </BoutonPlein>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Le lien arrive par SMS et par e-mail. Il vaut 15 minutes.')}</span>
      </div>
      <Comment>
        <ol style={{ margin: '0', paddingLeft: '20px' }}>
          <li>{t('Ouvrez le lien reçu par SMS sur votre téléphone personnel, ou par e-mail.')}</li>
          <li>{t('Entrez le code reçu par SMS : il confirme que c’est vous.')}</li>
          <li>{t('Choisissez un nouveau mot de passe : 8 caractères au moins, dont un chiffre.')}</li>
        </ol>
      </Comment>
      <AccesLiens label={t('Autres liens')}>
        <Link to={vers('plusnum')}>{t('Plus accès à mon numéro')}</Link>
        <SupportLien connecte={s.connecte} />
        <Link to={vers('email')}>{t('Revenir à la connexion')}</Link>
      </AccesLiens>
      {lien?.jetonDemo && (
        <Demo>
          {t('le lien reçu par SMS ouvre ceci :')}{' '}
          <Link to={vers('nouveau', { jeton: lien.jetonDemo })} className="vd03-lien" style={{ minHeight: '32px' }}>
            {t('Ouvrir le lien')}
          </Link>
        </Demo>
      )}
    </>
  )
}

function SupportLien({ connecte }: { connecte: boolean }) {
  const { t } = usePreferences()
  const style = { display: 'inline-flex', alignItems: 'center', minHeight: '44px' } as const
  return connecte ? (
    <Link to={chemin('aide')} className="t13 b8 cor" style={style}>
      {t('Contacter le support')}
    </Link>
  ) : (
    <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="t13 b8 cor" style={style}>
      {t('Contacter le support')}
    </a>
  )
}

function NouveauMdp() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const { vers } = useSuite()
  const enLigne = useEnLigne()
  const jeton = params.get('jeton') ?? ''
  const lecture = useLecture(() => source.session.ouvrirLienMotDePasse(jeton), [jeton])
  const [mdp, setMdp] = useState('')
  const [mdp2, setMdp2] = useState('')
  const [voir, setVoir] = useState(false)
  const [etape, setEtape] = useState<'choisir' | 'code' | 'fait'>('choisir')
  const [nouveau, setNouveau] = useState<NouveauMotDePasse | null>(null)
  useEffect(() => {
    if (lecture.donnees?.ok) setNouveau(lecture.donnees.nouveau)
  }, [lecture.donnees])
  const regles = [
    [mdp.length >= 8, '8 caractères au moins'],
    [/\d/.test(mdp), 'Un chiffre au moins'],
    [!!mdp && mdp === mdp2, 'Les deux mots de passe sont identiques'],
  ] as const
  const pret = regles.every(([ok]) => ok)
  let corps: ReactNode
  if (lecture.erreur) corps = <ErreurLecture relire={lecture.relire} />
  else if (!lecture.donnees) corps = <Chargement />
  else if ((!lecture.donnees.ok && etape !== 'fait') || !nouveau)
    corps = (
      <>
        <div className="note red" role="alert">
          <Icone nom="clock" taille={18} />
          <div>{t('Ce lien a expiré ou a déjà servi : demandez-en un nouveau.')}</div>
        </div>
        <div className="mt12">
          <Link to={vers('oubli')} className="btn primary">
            <Icone nom="send" taille={18} />
            <span>{t('Recevoir un nouveau lien')}</span>
          </Link>
        </div>
      </>
    )
  else if (etape === 'fait')
    corps = (
      <>
        <div className="card green center blv-succes" style={{ padding: '18px' }}>
          <Icone nom="circle-check" taille={34} />
          <div className="b8 t17 mt8">{t('Mot de passe changé')}</div>
          <div className="t13 c2 mt4">{t('Reconnectez-vous avec votre nouveau mot de passe.')}</div>
        </div>
        <div className="mt16">
          <Link to={vers('email', { id: nouveau.identifiant })} className="btn primary" replace>
            <Icone nom="log-in" taille={18} />
            <span>{t('Me connecter')}</span>
          </Link>
        </div>
      </>
    )
  else if (etape === 'code')
    corps = (
      <>
        <p className="pg-s">{tf('Pour confirmer que c’est vous, un code est envoyé par SMS au {n}.', { n: nouveau.envoi.destination })}</p>
        <CodeSMS
          envoi={nouveau.envoi}
          enLigne={enLigne}
          bouton="Changer mon mot de passe"
          valider={async (c) => {
            const r = await source.session.choisirMotDePasse(jeton, c, mdp)
            return 'raison' in r && r.raison === 'faible' ? { ok: false, raison: 'code', essaisRestants: 0 } : (r as Exclude<typeof r, { raison: 'faible' }>)
          }}
          reussi={() => setEtape('fait')}
        />
        <div className="mt8">
          <button type="button" className="btn ghost" onClick={() => setEtape('choisir')}>
            <span>{t('Modifier le mot de passe')}</span>
          </button>
        </div>
      </>
    )
  else
    corps = (
      <>
        <div className="fld">
          <label htmlFor="cx-n1">{t('Nouveau mot de passe')}</label>
          <div className="inp">
            <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="cx-n1" type={voir ? 'text' : 'password'} autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} />
            <span className="suf">
              <button type="button" className="vd03-oeil" aria-label={t(voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe')} aria-pressed={voir} onClick={() => setVoir((v) => !v)}>
                <Icone nom={voir ? 'eye-off' : 'eye'} taille={18} />
              </button>
            </span>
          </div>
        </div>
        <div className="fld">
          <label htmlFor="cx-n2">{t('Encore une fois')}</label>
          <div className="inp">
            <Icone nom="lock" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
            <input id="cx-n2" type={voir ? 'text' : 'password'} autoComplete="new-password" value={mdp2} onChange={(e) => setMdp2(e.target.value)} />
          </div>
        </div>
        <div className="mt8">
          {regles.map(([ok, texte]) => (
            <div key={texte} className="row t13" style={{ gap: '8px', minHeight: '26px', color: ok ? 'var(--green)' : 'var(--ink-3)' }}>
              <Icone nom={ok ? 'circle-check' : 'circle-alert'} taille={16} />
              <span>{t(texte)}</span>
            </div>
          ))}
        </div>
        <div className="mt16">
          <BoutonPlein icone="arrow-right" actif={pret} raison={t('Le mot de passe ne suit pas encore les règles.')} onClick={() => setEtape('code')}>
            {t('Continuer')}
          </BoutonPlein>
        </div>
      </>
    )
  return (
    <>
      <Retour vers={vers('oubli')} />
      <EtapesOubli n={2} />
      <div className="pg">
        <h1 className="pg-t">{t('Nouveau mot de passe')}</h1>
        <p className="pg-s">{t('8 caractères au moins, dont un chiffre.')}</p>
      </div>
      {corps}
    </>
  )
}

// ── Plus mon numéro ────────────────────────────────────────────────────────────────────────────────────────────────

function PlusMonNumero() {
  const { t } = usePreferences()
  const s = useSession()
  const { vers } = useSuite()
  const etapes = [
    ['Connectez-vous par e-mail', 'Avec votre identifiant ou votre e-mail et votre mot de passe.'],
    ['Changez de numéro dans Sécurité', 'Le nouveau numéro est confirmé par un code envoyé par SMS à l’ancien, puis au nouveau.'],
    ['Plus accès à l’e-mail non plus ?', 'Le support vérifie votre identité avec votre pièce, puis vous rend l’accès.'],
  ]
  return (
    <>
      <Retour vers={vers('numero')} />
      <h1 className="pg-t" style={{ marginTop: '8px' }}>
        {t('Ce n’est plus votre numéro ?')}
      </h1>
      <p className="pg-s">{t('Votre boutique, vos commandes et votre argent restent à vous.')}</p>
      <div className="card">
        {etapes.map(([titre, texte], i) => (
          <div key={titre} className="row" style={{ alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
            <span className="badge-num">{t(String(i + 1))}</span>
            <div className="grow">
              <div className="b8 t15">{t(titre)}</div>
              <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
                {t(texte)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt12">
        <Link to={vers('email')} className="btn primary">
          <Icone nom="mail" taille={18} />
          <span>{t('Me connecter par e-mail')}</span>
        </Link>
      </div>
      <div className="btns">
        {s.connecte ? (
          <Link to={chemin('aide')} className="btn secondary">
            <Icone nom="message-circle" taille={18} />
            <span>{t('Écrire au support')}</span>
          </Link>
        ) : (
          <>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="btn secondary">
              <Icone nom="message-circle" taille={18} />
              <span>{t('WhatsApp')}</span>
            </a>
            <a href={SUPPORT_EMAIL} className="btn secondary">
              <Icone nom="mail" taille={18} />
              <span>{t('E-mail')}</span>
            </a>
          </>
        )}
      </div>
      <div className="hint-l">
        <Icone nom="headset" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Support BelivaY : +237 689 002 812, de 7 h à 21 h. Réponse en 2 h au plus.')}</span>
      </div>
    </>
  )
}

// ── Écran ──────────────────────────────────────────────────────────────────────────────────────────────────────────

// Un lien ne sert qu'une fois : une seule demande par jeton, même si l'écran se monte deux fois (mode strict de React,
// retour arrière) ; la seconde lecture reprend la réponse de la première.
const LIENS_OUVERTS = new Map<string, ReturnType<typeof source.session.ouvrirLienConnexion>>()

/** Le lien de connexion reçu par e-mail (?lien=…, mode API) : ouvert une fois, puis comme une connexion. */
function LienRecu({ jeton }: { jeton: string }) {
  const { t } = usePreferences()
  const { vers, entrer, naviguer } = useSuite()
  const [refus, setRefus] = useState<string | null>(null)
  useEffect(() => {
    let vivant = true
    let ouverture = LIENS_OUVERTS.get(jeton)
    if (!ouverture) LIENS_OUVERTS.set(jeton, (ouverture = source.session.ouvrirLienConnexion(jeton, { seSouvenir: lire(CLE_SOUVENIR) !== 'non' })))
    ouverture
      .then((r) => {
        if (!vivant) return
        if (r.ok) return void entrer()
        if (r.raison === 'deuxieme_facteur') return naviguer(vers('2fa'), { replace: true })
        setRefus(t(r.raison === 'expire' ? 'Ce lien n’est plus valable : demandez un nouveau lien.' : 'Ce lien n’est pas valable : demandez un nouveau lien.'))
      })
      .catch(() => vivant && setRefus(t('Le lien n’a pas pu être ouvert : vérifiez votre connexion, puis réessayez.')))
    return () => {
      vivant = false
    }
    // Une seule ouverture par lien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jeton])
  return (
    <>
      <Retour vers={vers(null)} />
      <h1 className="pg-t" style={{ marginTop: '8px' }}>
        {t('Connexion par lien')}
      </h1>
      {refus ? (
        <>
          <div className="note red" role="alert">
            <Icone nom="circle-alert" taille={18} />
            <div>{refus}</div>
          </div>
          <div className="mt8">
            <Link to={vers('email')} className="btn primary">
              <Icone nom="mail" taille={18} />
              <span>{t('Recevoir un nouveau lien')}</span>
            </Link>
          </div>
        </>
      ) : (
        <Chargement />
      )}
    </>
  )
}

export default function Connexion() {
  const [params] = useSearchParams()
  const lien = API ? params.get('lien') : null
  const s = lien ? 'lien' : params.get('s')
  const [souvenir, setS] = useState(() => lire(CLE_SOUVENIR) !== 'non')
  const setSouvenir = (v: boolean) => (setS(v), garder(CLE_SOUVENIR, v ? 'oui' : 'non'))
  const corps = useMemo(() => {
    switch (s) {
      case 'email':
        return <Email souvenir={souvenir} setSouvenir={setSouvenir} />
      case 'numero':
        return <Numero souvenir={souvenir} setSouvenir={setSouvenir} />
      case 'code':
        return <Code />
      case '2fa':
        return <DeuxiemeFacteur />
      case 'oubli':
        return <Oubli />
      case 'nouveau':
        return <NouveauMdp />
      case 'plusnum':
        return <PlusMonNumero />
      case 'lien':
        return <LienRecu jeton={lien ?? ''} />
      default:
        return <Accueil souvenir={souvenir} setSouvenir={setSouvenir} />
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, souvenir])
  return (
    <Ecran route="connexion" key={s ?? ''}>
      <CadreVendeur compact={!!s}>{corps}</CadreVendeur>
    </Ecran>
  )
}
