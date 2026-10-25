// Écran « Connexion » (CL-03), refait le 25 oct. 2026 au cadre d'accès commun (compte/acces.tsx, ACCES-REFERENCES.md) :
// les deux chemins visibles d'emblée, « Se connecter » et « Créer un compte » (?vue=inscription).
// - Se connecter : comptes déjà utilisés sur ce téléphone (un geste), numéro (code par SMS ou WhatsApp), Google (feuille
//   des comptes du téléphone, puis « Bon retour » si le compte existe), Apple, e-mail ; mot de passe oublié.
// - Créer un compte : « Où habites-tu ? » au Cameroun (numéro +237 et code) ou à l'étranger (inscription diaspora) ;
//   ou Google, Apple, e-mail ; conditions acceptées en créant le compte.
// Liens secondaires regroupés sous la carte (découvrir sans compte, aide, conditions, confidentialité) ; démonstration :
// le seul compte de Carine M. Au lancement (?lancement=1), l'étape 3 sur 3.
// Depuis le panier (?next=/panier) : la même connexion, en feuille posée sur le vrai panier (« Dernière étape
// avant de payer ») : numéro et code reçu dans la feuille, ou Google, Apple, e-mail ; le panier est gardé.
// Après la connexion : l'écran qui l'a demandée (« next »), sinon l'accueil ; un nouveau compte passe par Face ID
// ou l'empreinte.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../../assets/prototype/be926f70d2b8.png'
import { Ecran, FeuillePosee } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { MessageCode, useEnvoiCode, useSaisieCode } from '../../composants/SaisieCode'
import { Styles } from '../../composants/Styles'
import { adresseDuSite, chemin } from '../../config/pages'
import { garderSuite, lireSuite, versApresConnexion } from '../../donnees/connexion'
import { calculer } from '../../donnees/frais'
import { chiffres, espacer, operateur } from '../../donnees/numeros'
import { source, type DonneesPanier, type EnvoiCode, type Session } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { Panier } from '../CL-07/Panier'
import { env } from '../../config/env'
// Le personnage « Carine M. » de la démonstration : toujours son propre compte, quel que soit le compte ouvert.
import { EMAIL_PERSONNAGE_CLIENT } from '../../demo/valeurs-essai'
import { ListeComptes, useBasculer, useComptesAppareil } from '../../composants/ChangerCompte'
import type { CompteAppareil } from '../../donnees/source'
import { hybride } from '../../comptes-reels/hybride'
import { Acces, AccesCadre, AccesChemins, AccesDemo, AccesLegal, AccesLiens, AccesOu, AccesTitre, BoutonFournisseur, LogoApple, LogoGoogle } from '../../compte/acces'

// « Ton panier est gardé : 4 articles, 273 379 F. »
function PanierGarde({ p }: { p: DonneesPanier | null }) {
  const { tf } = usePreferences()
  if (!p || !p.lignes.length) return null
  const boutiques = [...new Set(p.lignes.map((l) => l.boutique))]
  const total = calculer(
    'relais',
    boutiques.map((b) => ({ boutique: b, zone: p.boutiques[b]?.zone ?? 'Mvog-Ada', articles: p.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })) })),
  ).total
  const n = p.lignes.reduce((s, l) => s + l.qte, 0)
  return (
    <p className="ax-legal" style={{ marginTop: '12px' }}>
      <Icone nom="shopping-cart" taille={13} style={{ verticalAlign: '-2px' }} />
      {tf(n > 1 ? ' Ton panier est gardé : {n} articles, {m} F.' : ' Ton panier est gardé : {n} article, {m} F.', { n, m: F(total) })}
    </p>
  )
}

// Le code reçu, dans la feuille du panier (six cases du prototype, vrai champ posé dessus).
function CodeDansLaFeuille({ envoi, numero, modifier, reussi, panier }: { envoi: EnvoiCode; numero: string; modifier: () => void; reussi: () => void; panier: DonneesPanier | null }) {
  const { t } = usePreferences()
  const [utilise, setUtilise] = useState(false)
  const s = useSaisieCode({
    envoi,
    valider: async (code) => {
      const r = await source.verifierPremierNumero(numero, code)
      if ('raison' in r) {
        setUtilise(true)
        return { ok: false, essaisRestants: 5 }
      }
      return r
    },
    renvoyer: () => source.envoyerCode('numero-nouveau', numero),
    reussi,
  })
  return (
    <>
      <h1 style={{ fontSize: '22px' }}>{t('Entre le code')}</h1>
      <p className="lead" style={{ marginBottom: '12px' }}>
        {t('Envoyé par SMS au ')}
        <b style={{ color: 'var(--ink)' }}>{'+237 ' + envoi.destination}</b>
        {t('. ')}
        <a href="#" style={{ color: 'var(--or-txt)', fontWeight: '800' }} onClick={(e) => (e.preventDefault(), modifier())}>
          {t('Modifier')}
        </a>
      </p>
      <div className="otp-saisie">
        <div className={'ax-otp' + (s.erreur || utilise ? ' err' : '')} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < s.code.length ? 'f' : i === s.code.length && !s.estBloque ? 'c' : ''}>
              {s.code[i] ?? ''}
            </span>
          ))}
        </div>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          aria-label={t('Code à 6 chiffres')}
          disabled={s.estBloque}
          value={s.code}
          onChange={(e) => (setUtilise(false), s.saisir(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && s.valider()}
        />
      </div>
      {utilise ? (
        <div className="cl03-otpm err" role="alert">
          {t('Ce numéro est vérifié sur un autre compte BelivaY : continue avec Google, Apple ou l’e-mail de ce compte.')}
        </div>
      ) : (
        <MessageCode s={s} />
      )}
      <div className="ax-auto">
        <Icone nom="sparkles" taille={18} />
        <span>{t('Le code se remplit tout seul dès que le message arrive.')}</span>
      </div>
      {envoi.codeDemo && <p className="t12 c3 mt8">{t('Démonstration : le code est ') + envoi.codeDemo + '.'}</p>}
      <div className="btns mt12">
        <button type="button" className={'btn primary' + (s.pret ? '' : ' off')} onClick={s.valider}>
          <Icone nom="check" taille={18} />
          <span>{t('Valider mon numéro')}</span>
        </button>
      </div>
      <PanierGarde p={panier} />
    </>
  )
}

export function Connexion() {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const lancement = params.get('lancement') === '1'
  // Les deux chemins sur la même page : « Se connecter » (par défaut) et « Créer un compte » (?vue=inscription).
  const inscription = params.get('vue') === 'inscription'
  // Comptes déjà utilisés sur ce téléphone (« Changer de compte ») ; celui choisi dans la feuille Google.
  const comptes = useComptesAppareil()
  const [connu, setConnu] = useState<CompteAppareil | null>(null)
  const [retenu, setRetenu] = useState<{ emailMasque: string } | null>(null)
  const [panier, setPanier] = useState<DonneesPanier | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  // « Continuer avec Google » depuis une autre page (?st=existant) : la feuille des comptes Google s'ouvre d'emblée.
  const [feuille, setFeuille] = useState(() => params.get('st') === 'existant')
  const [existant, setExistant] = useState(false)
  const [attente, setAttente] = useState<string | null>(null)
  // Depuis le panier : numéro tapé dans la feuille, puis le code.
  const [numero, setNumero] = useState('')
  const [vu, setVu] = useState(false)
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const envoyerCode = useEnvoiCode()
  const next = params.get('next')
  const depuisPanier = !!next && next.split('?')[0] === chemin('panier')
  useEffect(() => {
    source.compteRetenu().then(setRetenu)
    source.panier().then(setPanier)
    source.legal().then((l) => setVersion(l.version))
  }, [])
  // Après la connexion : l'écran qui l'a demandée (« next », adresse du prototype ou du site), sinon l'accueil.
  useEffect(() => {
    if (next) garderSuite(next.startsWith('#') ? adresseDuSite(next) : next)
  }, [next])
  const suite = () => (next ? (next.startsWith('#') ? adresseDuSite(next) : next) : lireSuite())
  const { basculer, enCours } = useBasculer(next ? suite() : undefined)
  // Ajouter un compte : la création par e-mail, champs vides (pas l'adresse d'un compte déjà sur le téléphone).
  const ajouter = chemin('connexion-email', next ? { st: 'inscription', ajout: '1', next } : { st: 'inscription', ajout: '1' })
  const fini = (s: Session, nouveau = false) => {
    const vers = versApresConnexion(s, suite())
    garderSuite(null)
    majSession(s)
    naviguer(nouveau ? chemin('faceid', { nouveau: '1', next: vers }) : vers, { replace: true })
  }
  const ouvrir = async (m: 'google' | 'apple', nouveau = false) => {
    setAttente(m)
    try {
      fini(await source.connecter(m), nouveau)
    } catch (e) {
      setAttente(null) // fournisseur indisponible ou fenêtre fermée : le message commun le dit, le bouton se libère
      throw e
    }
  }
  const reprendre = async () => fini(await source.reprendreCompte())
  const n = chiffres(numero)
  const op = operateur(n)
  const erreurNumero = !n ? 'Écris ton numéro : 9 chiffres, il commence par 6.' : !/^6\d{8}$/.test(n) ? 'Un numéro mobile du Cameroun a 9 chiffres et commence par 6.' : null
  const recevoir = async () => {
    setVu(true)
    if (erreurNumero) return
    const e = await envoyerCode(n, () => source.envoyerCode('numero-nouveau', n))
    if (e) setEnvoi(e)
  }
  const fermerGoogle = () => (setFeuille(false), setExistant(false), setConnu(null))

  const feuilleGoogle = (
    <Feuille ouverte={feuille} fermer={fermerGoogle} titre={t('Compte Google du téléphone')}>
      {existant && connu ? (
        <>
          <div className="cl03-bigic green">
            <Icone nom="user-check" taille={34} />
          </div>
          <h2 className="cl03-sheet-t cl03-center mt12">{tf('Bon retour, {p}', { p: connu.prenom })}</h2>
          <p className="cl03-sheet-s cl03-center">
            <span>{connu.emailMasque}</span> <span>{t('a déjà un compte BelivaY. Google confirme qu’elle est à toi : on l’ouvre, avec tes commandes.')}</span>
          </p>
          <div className="mt16">
            <a href="#" className={'btn primary' + (enCours ? ' off' : '')} onClick={(e) => (e.preventDefault(), void basculer(connu.cle))}>
              <Icone nom="arrow-right" taille={18} />
              <span>{t(enCours ? 'Ouverture…' : 'Ouvrir mon compte')}</span>
            </a>
          </div>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Une adresse, un seul compte : ton mot de passe marche toujours.')}</span>
          </div>
        </>
      ) : (
        <>
          <p className="t12 b8 c3" style={{ textTransform: 'uppercase', letterSpacing: '.08em', margin: '0' }}>
            <Icone nom="cl03-google" taille={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            {t('Compte Google du téléphone')}
          </p>
          <h2 className="cl03-sheet-t mt8">{t('Choisis un compte')}</h2>
          <p className="cl03-sheet-s">{t('pour continuer vers BelivaY')}</p>
          {(comptes ?? []).map((c, i) => (
            <a key={c.cle} href="#" className="cl03-acct" style={i ? { marginTop: '8px' } : undefined} onClick={(e) => (e.preventDefault(), setConnu(c), setExistant(true))}>
              <span className="portrait" style={{ width: '40px', height: '40px' }}>
                {c.photo ? <img src={c.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dessin id="84fd796ff40f" />}
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {c.nomComplet}
                </b>
                <span className="t13 c3">{c.emailMasque}</span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </a>
          ))}
          <Link to={ajouter} className="cl03-acct" style={{ marginTop: '8px' }}>
            <span className="ic-sq" style={{ borderRadius: '50%', width: '40px', height: '40px' }}>
              <Icone nom="user-plus" taille={19} />
            </span>
            <span className="grow b7 t14">{t('Utiliser un autre compte')}</span>
          </Link>
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Google partage seulement ton nom, ton e-mail et ta photo.')}</span>
          </div>
        </>
      )}
    </Feuille>
  )

  // Depuis le panier : la même connexion, en feuille sur le vrai panier.
  if (depuisPanier) {
    const feuillePanier = !feuille && (
      <>
        <div className="veil" onClick={() => naviguer(chemin('panier'))}></div>
        <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Dernière étape avant de payer')}>
          <div className="grab"></div>
          <Styles id="bf169d62ab" />
          <div className="ax" style={{ minHeight: '0' }}>
            {envoi ? (
              <CodeDansLaFeuille envoi={envoi} numero={n} panier={panier} modifier={() => setEnvoi(null)} reussi={async () => fini(await source.reprendreCompte())} />
            ) : (
              <>
                <h1 style={{ fontSize: '22px' }}>{t('Dernière étape avant de payer')}</h1>
                <p className="lead" style={{ marginBottom: '12px' }}>
                  {t('Confirme ton numéro : il sert à payer en Mobile Money et à recevoir ton code de retrait.')}
                </p>
                <div className={'ax-ph' + (vu && erreurNumero ? ' err' : '')}>
                  <Link to={chemin('numero', { from: 'connexion', next: next! })} className="ax-cc" aria-label={t('Pays : Cameroun')}>
                    <i className="fl cm"></i>
                    {t('+237')}
                    <Icone nom="chevron-down" taille={16} />
                  </Link>
                  <input
                    className="ax-num"
                    style={{ border: 0, background: 'none', outline: 'none', height: '100%' }}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    aria-label={t('Ton numéro de téléphone')}
                    placeholder="6XX XX XX XX"
                    value={numero}
                    onChange={(e) => (setNumero(espacer(e.target.value)), setVu(false))}
                    onKeyDown={(e) => e.key === 'Enter' && recevoir()}
                  />
                  {(op === 'MTN' || op === 'Orange') && (
                    <span className={'ax-op' + (op === 'Orange' ? ' or' : '')}>
                      <Icone nom="circle-check" taille={13} />
                      {t(op === 'MTN' ? 'MTN' : 'Orange')}
                    </span>
                  )}
                </div>
                {vu && erreurNumero && (
                  <div className="hint" role="alert" style={{ color: 'var(--red)', marginTop: '6px' }}>
                    {t(erreurNumero)}
                  </div>
                )}
                <div className="btns mt12">
                  <button type="button" className="btn primary" onClick={recevoir}>
                    <Icone nom="arrow-right" taille={18} />
                    <span>{t('Recevoir mon code')}</span>
                  </button>
                </div>
                <div className="ax-or">{t('ou continuer avec')}</div>
                <div className="ax-alt">
                  <a href="#" onClick={(e) => (e.preventDefault(), setFeuille(true))}>
                    <LogoGoogle />
                    {t('Google')}
                  </a>
                  <a href="#" className="ap" onClick={(e) => (e.preventDefault(), !attente && ouvrir('apple'))}>
                    <LogoApple />
                    {t('Apple')}
                  </a>
                  <Link to={chemin('connexion-email', { next: next! })}>
                    <Icone nom="mail" taille={18} />
                    {t('E-mail')}
                  </Link>
                </div>
                {retenu && (
                  <p className="ax-legal" style={{ marginTop: '12px' }}>
                    {tf('Compte retenu sur ce téléphone : {e}. ', { e: retenu.emailMasque })}
                    <a href="#" onClick={(e) => (e.preventDefault(), reprendre())}>
                      {t('Continuer avec ce compte')}
                    </a>
                  </p>
                )}
                <PanierGarde p={panier} />
              </>
            )}
          </div>
        </div>
      </>
    )
    return (
      <FeuillePosee.Provider value={{ fixes: <>{feuillePanier}{feuilleGoogle}</>, classes: ['fixed'] }}>
        <Panier />
      </FeuillePosee.Provider>
    )
  }

  const prefs = usePreferences()
  const garderNext = (x: Record<string, string> = {}) => (next ? { ...x, next } : x)
  const versNumero = chemin('numero', garderNext({ from: 'connexion' }))
  const lienGoogle = (texte: string) => <BoutonFournisseur fournisseur="google" texte={t(texte)} onClick={() => setFeuille(true)} />
  const lienApple = (texte: string) => <BoutonFournisseur fournisseur="apple" texte={t(attente === 'apple' ? 'Ouverture…' : texte)} occupe={attente === 'apple'} onClick={() => void ouvrir('apple', inscription)} />
  return (
    <Ecran route="connexion" avant={<Styles id="e45eeaa1bc" />} fixes={feuilleGoogle}>
      <Styles id="f16ded0d4c" />
      <AccesCadre
        acteur="client"
        logo={logo}
        espace={t('Espace client')}
        phrase={t(inscription ? 'Achète près de chez toi, paie en un geste et suis tes colis jusqu’au relais.' : 'Suis tes colis et paie en un geste, avec ton Wallet ou Mobile Money.')}
        reglages={prefs}
        debut={
          <Link to={lancement ? chemin('interets') : chemin('accueil')} className="axc-retour" aria-label={t('Revenir')}>
            <Icone nom="chevron-left" taille={24} />
          </Link>
        }
        pied={
          <AccesLiens label={t('Liens utiles')}>
            <Link to={chemin('accueil')}>{t('Découvrir sans compte')}</Link>
            <Link to={chemin('aide')}>{t('Aide et contact')}</Link>
            <Link to={chemin('cgu', { retour: chemin('connexion', inscription ? { vue: 'inscription' } : undefined) })}>{t('Conditions')}</Link>
            <Link to={chemin('legal-doc', { d: 'confidentialite' })}>{t('Confidentialité')}</Link>
          </AccesLiens>
        }
      >
        <Acces>
          <AccesChemins
            actif={inscription ? 'inscription' : 'connexion'}
            label={t('Se connecter ou créer un compte')}
            connexion={
              <Link to={chemin('connexion', garderNext(lancement ? { lancement: '1' } : {}))} replace>
                {t('Se connecter')}
              </Link>
            }
            inscription={
              <Link to={chemin('connexion', garderNext({ vue: 'inscription', ...(lancement ? { lancement: '1' } : {}) }))} replace>
                {t('Créer un compte')}
              </Link>
            }
          />
          {inscription ? (
            <>
              <AccesTitre titre={t('Créer mon compte')} phrase={t('Gratuit, sans papier. Pour regarder et comparer, pas besoin de compte.')} />
              <fieldset className="acc-choix">
                <legend className="acc-choix-t">{t('Où habites-tu ?')}</legend>
                <Link to={hybride ? chemin('connexion-email', garderNext({ st: 'inscription' })) : chemin('numero', garderNext({ from: 'connexion' }))} className="acc-choix-l">
                  <span className="acc-choix-ic" aria-hidden="true">
                    <Icone nom="map-pin" taille={20} />
                  </span>
                  <span className="grow">
                    <b>{t('Au Cameroun')}</b>
                    <small>{t(hybride ? 'Ton e-mail et un mot de passe ; ton numéro +237 ensuite, pour payer en Mobile Money.' : 'Ton numéro +237 et un code par SMS ou WhatsApp. Paiement Mobile Money.')}</small>
                  </span>
                  <Icone nom="chevron-right" taille={20} />
                </Link>
                <Link to={chemin('inscription-diaspora')} className="acc-choix-l">
                  <span className="acc-choix-ic" aria-hidden="true">
                    <Icone nom="globe" taille={20} />
                  </span>
                  <span className="grow">
                    <b>{t('À l’étranger (diaspora)')}</b>
                    <small>{t('Paie en euros ou en dollars et fais livrer tes proches au Cameroun.')}</small>
                  </span>
                  <Icone nom="chevron-right" taille={20} />
                </Link>
              </fieldset>
              <AccesOu texte={t('ou crée-le avec')} />
              <div className="acc-pile">
                {lienGoogle('S’inscrire avec Google')}
                {lienApple('S’inscrire avec Apple')}
                <Link to={chemin('connexion-email', garderNext({ st: 'inscription' }))} className="btn secondary">
                  <Icone nom="mail" taille={18} />
                  <span>{t('S’inscrire avec l’e-mail')}</span>
                </Link>
              </div>
              <AccesLegal>
                {version ? tf('En créant ton compte, tu acceptes nos conditions (version {v}).', { v: version }) : t('En créant ton compte, tu acceptes nos conditions.')}{' '}
                <Link to={chemin('cgu', { retour: chemin('connexion', { vue: 'inscription' }) })}>{t('Les lire en bref')}</Link>
              </AccesLegal>
            </>
          ) : (
            <>
              <AccesTitre titre={t(next ? 'Connecte-toi pour continuer' : 'Bon retour parmi nous')} phrase={t('Ton numéro suffit : un code arrive par SMS ou WhatsApp.')} />
              {comptes && comptes.length > 0 && (
                <section className="cx-comptes" aria-labelledby="cx-comptes" style={{ marginBottom: 16 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="kick" id="cx-comptes" style={{ margin: 0 }}>
                      {t('Sur ce téléphone')}
                    </h2>
                    <Link to={ajouter} className="cl03-link t13 cx-ajout">
                      {t('Ajouter un compte')}
                    </Link>
                  </div>
                  <div className="card tight mt8">
                    <ListeComptes comptes={comptes} enCours={enCours} choisir={(c) => void basculer(c.cle)} />
                  </div>
                </section>
              )}
              {/* Comptes réels (source hybride) : l'e-mail et le mot de passe sont le chemin réel, en premier ; le numéro
                  (code SMS) reste à la démonstration tant qu'aucun SMS ne part. */}
              <div className="acc-pile">
                {hybride ? (
                  <Link to={chemin('connexion-email', next ? { next } : undefined)} className="btn primary">
                    <Icone nom="mail" taille={18} />
                    <span>{t('Continuer avec l’e-mail')}</span>
                  </Link>
                ) : (
                  <Link to={versNumero} className="btn primary">
                    <Icone nom="smartphone" taille={18} />
                    <span>{t('Continuer avec mon numéro')}</span>
                  </Link>
                )}
              </div>
              <AccesOu texte={t('ou')} />
              <div className="acc-pile">
                {lienGoogle('Continuer avec Google')}
                {lienApple('Continuer avec Apple')}
                {hybride ? (
                  <Link to={versNumero} className="btn secondary">
                    <Icone nom="smartphone" taille={18} />
                    <span>{t('Continuer avec mon numéro')}</span>
                  </Link>
                ) : (
                  <Link to={chemin('connexion-email', next ? { next } : undefined)} className="btn secondary">
                    <Icone nom="mail" taille={18} />
                    <span>{t('Continuer avec l’e-mail')}</span>
                  </Link>
                )}
              </div>
              <AccesLiens label={t('Accès au compte')}>
                <Link to={chemin('mdp-oublie')}>{t('Mot de passe oublié ?')}</Link>
              </AccesLiens>
            </>
          )}
          {env.source !== 'api' && !lancement && <AccesDemo qui={t('Carine M. · cliente')} connecter={async () => (await basculer(EMAIL_PERSONNAGE_CLIENT), null)} />}
          {lancement && (
            <div className="row" style={{ gap: '10px', marginTop: '16px' }}>
              <div className="grow">
                <div className="steps" style={{ marginTop: '0' }}>
                  <i className="on"></i>
                  <i className="on"></i>
                  <i className="cur"></i>
                </div>
              </div>
              <span className="t12 b8 c3 nw">{t('3 / 3')}</span>
            </div>
          )}
        </Acces>
      </AccesCadre>
    </Ecran>
  )
}
