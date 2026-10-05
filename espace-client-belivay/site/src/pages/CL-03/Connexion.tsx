// Écran « Connexion » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : la photo d'accueil (logo, relais
// habituel et sa distance), Google (feuille des comptes du téléphone, puis « Bon retour » si le compte existe, ou
// nouveau compte), Apple, e-mail, numéro de téléphone ; le compte retenu sur l'appareil se rouvre d'un geste ;
// découvrir sans compte ; les conditions et la confidentialité ; mot de passe oublié et aide ; au lancement
// (?lancement=1), l'étape 3 sur 3.
// Depuis le panier (?next=/panier) : la même connexion, en feuille posée sur le vrai panier (« Dernière étape
// avant de payer ») : numéro et code reçu dans la feuille, ou Google, Apple, e-mail ; le panier est gardé.
// Après la connexion : l'écran qui l'a demandée (« next »), sinon l'accueil ; un nouveau compte passe par Face ID
// ou l'empreinte.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import photo from '../../assets/prototype/9de42ddd0501.jpg'
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
import { source, type DonneesPanier, type EnvoiCode, type Relais, type Session } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { Panier } from '../CL-07/Panier'
import { distance } from '../CL-08/Confirmee'
import { Partage } from './Arrivee'

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
  const [connu, setConnu] = useState<{ prenom: string; nomComplet: string; emailMasque: string } | null>(null)
  const [retenu, setRetenu] = useState<{ emailMasque: string } | null>(null)
  const [relais, setRelais] = useState<Relais | null>(null)
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
    source.compteConnu().then(setConnu)
    source.compteRetenu().then(setRetenu)
    source.relaisListe().then((l) => setRelais(l.relais.find((r) => r.nom === l.habituel) ?? null))
    source.panier().then(setPanier)
    source.legal().then((l) => setVersion(l.version))
  }, [])
  // Après la connexion : l'écran qui l'a demandée (« next », adresse du prototype ou du site), sinon l'accueil.
  useEffect(() => {
    if (next) garderSuite(next.startsWith('#') ? adresseDuSite(next) : next)
  }, [next])
  const suite = () => (next ? (next.startsWith('#') ? adresseDuSite(next) : next) : lireSuite())
  const fini = (s: Session, nouveau = false) => {
    const vers = versApresConnexion(s, suite())
    garderSuite(null)
    majSession(s)
    naviguer(nouveau ? chemin('faceid', { nouveau: '1', next: vers }) : vers, { replace: true })
  }
  const ouvrir = async (m: 'google' | 'apple', nouveau = false) => {
    setAttente(m)
    fini(await source.connecter(m), nouveau)
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
  const fermerGoogle = () => (setFeuille(false), setExistant(false))

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
            <a href="#" className={'btn primary' + (attente ? ' off' : '')} onClick={(e) => (e.preventDefault(), !attente && ouvrir('google'))}>
              <Icone nom="arrow-right" taille={18} />
              <span>{t(attente ? 'Ouverture…' : 'Ouvrir mon compte')}</span>
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
          {connu && (
            <a href="#" className="cl03-acct" onClick={(e) => (e.preventDefault(), setExistant(true))}>
              <span className="portrait" style={{ width: '40px', height: '40px' }}>
                <Dessin id="84fd796ff40f" />
              </span>
              <span className="grow">
                <b className="t15 b8" style={{ display: 'block' }}>
                  {connu.nomComplet}
                </b>
                <span className="t13 c3">{connu.emailMasque}</span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)' }} />
            </a>
          )}
          <a href="#" className="cl03-acct" style={{ marginTop: '8px' }} onClick={(e) => (e.preventDefault(), !attente && ouvrir('google', true))}>
            <span className="ic-sq" style={{ borderRadius: '50%', width: '40px', height: '40px' }}>
              <Icone nom="user-plus" taille={19} />
            </span>
            <span className="grow b7 t14">{t('Utiliser un autre compte')}</span>
          </a>
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
                    <Icone nom="gpay-g" taille={18} />
                    {t('Google')}
                  </a>
                  <a href="#" className="ap" onClick={(e) => (e.preventDefault(), !attente && ouvrir('apple'))}>
                    <Icone nom="apple" taille={18} />
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

  return (
    <Ecran route="connexion" avant={<Styles id="e45eeaa1bc" />} fixes={feuilleGoogle} gabarit="arrivee">
      <Styles id="f16ded0d4c" />
      <Partage
        haut={
          <div className="cl03-top">
            <Link to={lancement ? chemin('interets') : chemin('accueil')} className="cl03-back" aria-label={t('Revenir')}>
              <span>
                <Icone nom="chevron-left" taille={22} />
              </span>
            </Link>
          </div>
        }
        visuel={
          <>
            <Styles id="0b0ccec1e3" />
            <Styles id="1c3d953197" />
            <section className="cx-hero ph" style={{ backgroundImage: `url(${photo})` }} role="img" aria-label={t('Bon retour parmi nous')}>
              <span className="lg">
                <img src={logo} alt="" />
              </span>
              {relais && (
                <span className="ch c1">
                  <Icone nom="shield-check" taille={13} />
                  {tf('{r} · {d}', { r: t(relais.nom), d: distance(relais.km) })}
                </span>
              )}
              <span className="tx">
                <b>{t(next ? 'Connecte-toi pour continuer' : 'Bon retour parmi nous')}</b>
                <span>{t('Suis tes colis et paie en un geste, avec ton Wallet ou Mobile Money.')}</span>
              </span>
            </section>
          </>
        }
      >
        <div className="cl03-brand" style={{ marginTop: '0' }}>
          <img className="cl03-logo" src={logo} alt="BelivaY" />
          <p className="cl03-tag">{t('Tout près de toi')}</p>
        </div>
        <h1 className="cl03-h">{t('Ton compte en un geste')}</h1>
        <p className="cl03-hs">{t('Il sert à payer et à suivre tes colis. Pour regarder, pas besoin de compte.')}</p>
        {retenu && (
          <div className="card vedette mt12">
            <div className="row" style={{ gap: 10 }}>
              <Icone nom="smartphone" taille={20} />
              <span className="grow">
                <b className="t14" style={{ display: 'block' }}>
                  {t('Compte retenu sur ce téléphone')}
                </b>
                <span className="t13 c3">{retenu.emailMasque}</span>
              </span>
            </div>
            <div className="btns">
              <button type="button" className="btn primary" onClick={reprendre}>
                <span>{t('Continuer avec ce compte')}</span>
              </button>
            </div>
          </div>
        )}
        <div className="mt16">
          <a href="#" className="btn apple cl03-g" onClick={(e) => (e.preventDefault(), setFeuille(true))}>
            <span className="gg">
              <Icone nom="gpay-g" taille={16} />
            </span>
            <span>{t('Continuer avec Google')}</span>
          </a>
          <Styles id="b472efbe3c" />
          <a
            href="#"
            className={'btn cx-apple' + (attente === 'apple' ? ' off' : '')}
            style={{ background: '#fff', color: '#000', boxShadow: 'inset 0 0 0 1.5px var(--line-2)' }}
            onClick={(e) => (e.preventDefault(), !attente && ouvrir('apple'))}
          >
            <Icone nom="apple" taille={19} />
            <span>{t(attente === 'apple' ? 'Ouverture…' : 'Continuer avec Apple')}</span>
          </a>
        </div>
        <div className="cx-duo">
          <Link to={chemin('connexion-email', next ? { next } : undefined)} className="btn secondary">
            <Icone nom="mail" taille={18} />
            <span>{t('E-mail')}</span>
          </Link>
          <Link to={chemin('numero', next ? { from: 'connexion', next } : { from: 'connexion' })} className="btn secondary">
            <Icone nom="smartphone" taille={18} />
            <span>{t('Numéro de téléphone')}</span>
          </Link>
        </div>
        <div className="card info cl03-info">
          <Icone nom="list-checks" taille={20} />
          <span>{t('Relais et moyen de paiement : demandés à ta première commande. Ton numéro aussi, si tu passes par Google, Apple ou l’e-mail.')}</span>
        </div>
        <div className="cl03-or">
          <i></i>
          <span>{t('ou')}</span>
          <i></i>
        </div>
        <Link to={chemin('accueil')} className="btn ghost">
          <Icone nom="store" taille={18} />
          <span>{t('Découvrir sans compte')}</span>
        </Link>
        <p className="cl03-grey" style={{ marginTop: '4px' }}>
          {t('On te demande de te connecter seulement pour payer.')}
        </p>
        <Link to={chemin('inscription-diaspora')} className="card row cl03-dia" style={{ marginTop: '14px', color: 'inherit' }}>
          <span className="cl03-dia-ic" aria-hidden="true">
            <Icone nom="globe" taille={17} />
          </span>
          <span className="grow">
            <b>{t('Tu vis à l’étranger ?')}</b>
            <small>{t('Compte diaspora : paie et fais livrer tes proches.')}</small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <p className="cl03-grey" style={{ marginTop: '6px', textAlign: 'center' }}>
          <Link to={chemin('diaspora-infos')} className="cl03-link">
            {t('Qui peut ouvrir un compte diaspora ?')}
          </Link>
          {' · '}
          <Link to={chemin('proches')} className="cl03-link">
            {t('Relier mon compte à un proche')}
          </Link>
        </p>
        <p className="cl03-grey" style={{ marginTop: '6px' }}>
          <Icone nom="life-buoy" taille={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
          {t('Un souci pour entrer ? ')}
          <Link to={chemin('mdp-oublie')} className="cl03-link">
            {t('Mot de passe oublié')}
          </Link>
          {' · '}
          <Link to={chemin('aide')} className="cl03-link">
            {t('Aide et contact')}
          </Link>
        </p>
        <p className="cl03-legal">
          {version ? tf('En créant ton compte, tu acceptes nos conditions (version {v}).', { v: version }) : t('En créant ton compte, tu acceptes nos conditions.')}
          <br />
          <Link to={chemin('cgu', { retour: lancement ? chemin('connexion', { lancement: '1' }) : chemin('connexion') })} className="cl03-link">
            {t('Les lire en bref')}
          </Link>
          {' · '}
          <Link to={chemin('legal-doc', { d: 'confidentialite' })} className="cl03-link">
            {t('Confidentialité')}
          </Link>
        </p>
        {lancement && (
          <div className="row" style={{ gap: '10px', marginTop: '10px' }}>
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
      </Partage>
    </Ecran>
  )
}
