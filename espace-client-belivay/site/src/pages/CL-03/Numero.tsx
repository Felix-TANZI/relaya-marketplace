// Écran « Ton numéro » (CL-03, 3.3 à 3.5), balisage du prototype du 1er octobre (route numero), repris à la main
// et rendu logique (DP-53) :
// - pays (liste avec recherche ; diaspora : code par WhatsApp conseillé, paiement en euros ou en dollars),
//   numéro tapé et contrôlé (Cameroun : 9 chiffres, commence par 6, MTN ou Orange reconnu au préfixe),
//   canal du code (SMS ou WhatsApp) ;
// - code reçu (SaisieCode : essais, blocage, renvoi) ; un numéro vérifié va avec un seul compte (« utilise ») ;
// - issue selon l'entrée : panier (étape 1 sur 2, puis première commande), connexion (connecté, retour à la
//   page demandée), compte (retour au compte).
// Forme d'origine du prototype rendue réelle (DP-54) : chaque état (code, faux, bloqué, déjà utilisé, vérifié, pays)
// est atteint par une vraie action ; ?pays=…&canal=whatsapp préremplit le pays et le canal ; ?n= le numéro.
// Le canal choisi (SMS ou WhatsApp) part avec la demande de code ; « Pas reçu ? » renvoie par l'autre canal.
// ?from=rappel : vérifié, le client revient à sa demande de rappel (CL-13).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_7898e0e7e53e_jpg from '../../assets/prototype/7898e0e7e53e.jpg'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { SaisieCode, useEnvoiCode } from '../../composants/SaisieCode'
import { Styles } from '../../composants/Styles'
import { NAVIGATION, chemin } from '../../config/pages'
import { garderSuite, lireSuite, versApresConnexion } from '../../donnees/connexion'
import { chiffres, espacer, nomMoMo, operateur } from '../../donnees/numeros'
import { source, type EnvoiCode } from '../../donnees/source'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useMajSession, useSession } from '../../session'
import { Partage, PhotoArrivee } from './Arrivee'

const PAYS = [
  { cle: 'cm', nom: 'Cameroun', ind: '+237', exemple: '677583241' },
  { cle: 'fr', nom: 'France', ind: '+33', exemple: '612345678' },
  { cle: 'us', nom: 'États-Unis', ind: '+1', exemple: '2025550143' },
  { cle: 'be', nom: 'Belgique', ind: '+32', exemple: '470123456' },
  { cle: 'ca', nom: 'Canada', ind: '+1', exemple: '4165550143' },
  { cle: 'de', nom: 'Allemagne', ind: '+49', exemple: '15112345678' },
  { cle: 'gb', nom: 'Royaume-Uni', ind: '+44', exemple: '7700900123' },
  { cle: 'ch', nom: 'Suisse', ind: '+41', exemple: '781234567' },
  { cle: 'it', nom: 'Italie', ind: '+39', exemple: '3123456789' },
]
const norme = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// Numéro de l'étranger : chiffres groupés par deux (« 6 12 34 56 78 »).
const grouper = (v: string) => {
  const n = v.replace(/\D/g, '').slice(0, 12)
  return (n.length % 2 ? [n.slice(0, 1), ...(n.slice(1).match(/\d{1,2}/g) ?? [])] : (n.match(/\d{1,2}/g) ?? [])).join(' ')
}

function Bandeau() {
  const { t } = usePreferences()
  return (
    <div className="ph-ban" style={{ backgroundImage: `url(${img_7898e0e7e53e_jpg})` }} role="img" aria-label={t('Un code, une seule fois')}>
      <span className="tg3">
        <Icone nom="shield-check" taille={13} />
        {t('Numéro jamais montré aux vendeurs')}
      </span>
      <span className="tx">
        <b>{t('Un code, une seule fois')}</b>
        <span>{t('Ton numéro sert à payer, à recevoir ton code de retrait et au comptoir.')}</span>
      </span>
    </div>
  )
}

const Etapes = ({ fait }: { fait: boolean }) => (
  <div className="cl03-stepbar">
    <div className="steps">
      <i className={fait ? 'on' : 'cur'}></i>
      <i className=""></i>
    </div>
  </div>
)

export function Numero() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const majSession = useMajSession()
  const from = params.get('from')
  const panier = from === 'panier'
  const connexion = from === 'connexion'
  const session = useSession()
  const rappel = from === 'rappel'
  const [pays, setPays] = useState(PAYS.find((p) => p.cle === params.get('pays')) ?? PAYS[0])
  const cm = pays.cle === 'cm'
  const [canal, setCanal] = useState<'sms' | 'whatsapp'>(params.get('canal') === 'whatsapp' || !cm ? 'whatsapp' : 'sms')
  const [numero, setNumero] = useState(params.get('n') ?? '') // tapé par le client (ou repris d'un autre écran)
  const [vu, setVu] = useState(false)
  const [feuille, setFeuille] = useState(false)
  const [cherche, setCherche] = useState('')
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const envoyerCode = useEnvoiCode()
  const [tropTot, setTropTot] = useState(false) // autre canal demandé avant la fin du délai de renvoi
  const [issue, setIssue] = useState<'ok' | 'utilise' | 'bloque' | null>(null)
  const [reprise, setReprise] = useState(0) // heure de reprise après trop d'essais (ms)
  // Dès 1200 px (écran partagé, § 5.15) : la photo du bandeau passe à gauche ; sans bandeau, celle de la connexion.
  const partage = useDes('pc')
  const champ = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const n = params.get('next')
    if (n) garderSuite(n)
  }, [params])

  // Le champ éditable n'est pas rendu par React : son texte suit le numéro (proposé, pays changé).
  useEffect(() => {
    const el = champ.current
    const f = pays.cle === 'cm' ? espacer(numero) : grouper(numero)
    if (el && el.textContent !== f) el.textContent = f
  })
  const n = chiffres(numero)
  const op = cm ? operateur(n) : null
  const erreur = cm
    ? !n
      ? 'Écris ton numéro : 9 chiffres, il commence par 6.'
      : !/^6\d{8}$/.test(n)
        ? 'Un numéro mobile du Cameroun a 9 chiffres et commence par 6.'
        : null
    : numero.replace(/\D/g, '').length < 8
      ? 'Ce numéro semble trop court : vérifie-le.'
      : null
  const affiche = cm ? espacer(numero) : grouper(numero)

  const destination = cm ? n : pays.ind + numero.replace(/\D/g, '')
  const recevoir = async () => {
    setVu(true)
    if (erreur) return champ.current?.focus()
    const e = await envoyerCode(destination + '|' + canal, () => source.envoyerCode('numero-nouveau', destination, canal))
    if (e) (setEnvoi(e), setTropTot(false))
  }
  // « Pas reçu ? » : le code repart par l'autre canal (un renvoi compté comme les autres par le serveur : il attend
  // la fin du délai affiché).
  const autreCanal = canal === 'sms' ? 'whatsapp' : 'sms'
  const changerCanal = async () => {
    const e = await envoyerCode(destination + '|' + autreCanal, () => source.envoyerCode('numero-nouveau', destination, autreCanal), { renvoi: true })
    if (!e) return setTropTot(true)
    setCanal(autreCanal)
    setTropTot(false)
    setEnvoi(e)
  }
  const choisirPays = (p: (typeof PAYS)[number]) => {
    setPays(p)
    setNumero('')
    setCanal(p.cle === 'cm' ? 'sms' : 'whatsapp')
    setFeuille(false)
    setCherche('')
    setVu(false)
    requestAnimationFrame(() => champ.current?.focus())
  }

  // Issues : vérifié, déjà pris, bloqué.
  const fin = issue
  const masque = cm ? `${n.slice(0, 1)} ${n.slice(1, 3)} ·· ·· ${n.slice(7, 9)}` : pays.ind + ' ' + affiche
  let corps: ReactNode
  if (fin === 'ok') {
    corps = (
      <>
        {panier && <Etapes fait />}
        <div className="card green cl03-done">
          <div className="cl03-bigic green">
            <Icone nom="check" taille={30} trait={2.6} />
          </div>
          <b>{t('Numéro vérifié')}</b>
          <span>
            <b>{masque}</b>
            {op && t(' · ' + nomMoMo(op))}
          </span>
          <span>{t('Tu peux commander.')}</span>
        </div>
        <div className="mt16">
          <Link to={panier ? chemin('premiere-commande') : connexion ? versApresConnexion(session, lireSuite()) : rappel ? chemin('rappel') : chemin('compte')} className="btn primary" replace>
            <Icone nom={panier ? 'arrow-right' : rappel ? 'phone-call' : 'user-round'} taille={18} />
            <span>{t(panier ? 'Continuer' : connexion ? 'Continuer' : rappel ? 'Revenir à ma demande de rappel' : 'Revenir à mon compte')}</span>
          </Link>
        </div>
        {panier && (
          <div className="hint-l">
            <Icone nom="list-checks" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Il reste une étape : ton relais et ton moyen de paiement.')}</span>
          </div>
        )}
      </>
    )
  } else if (fin === 'utilise') {
    corps = (
      <>
        <div className="cl03-center">
          <div className="cl03-bigic ink">
            <Icone nom="user-round" taille={34} />
          </div>
          <h1 className="pg-t" style={{ marginTop: '14px' }}>
            {t('Ce numéro a déjà un compte')}
          </h1>
          <p className="pg-s">{tf('{n} est vérifié sur un autre compte BelivaY. Connecte-toi à ce compte : ton panier te suivra.', { n: issue ? masque : '6 77 ·· ·· 41' })}</p>
        </div>
        <div className="mt16">
          <Link to={chemin('connexion', panier ? { next: chemin('panier') } : undefined)} className="btn primary">
            <Icone nom="log-in" taille={18} />
            <span>{t('Me connecter à ce compte')}</span>
          </Link>
        </div>
        <div className="mt10">
          <a href="#" className="btn secondary" onClick={(e) => (e.preventDefault(), setIssue(null), setEnvoi(null), setNumero(''))}>
            <span>{t('Utiliser un autre numéro')}</span>
          </a>
        </div>
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Un numéro vérifié va avec un seul compte. Ce n’est pas toi ? Écris au support.')}</span>
        </div>
      </>
    )
  } else if (fin === 'bloque') {
    corps = (
      <>
        <div className="cl03-center">
          <div className="cl03-bigic red">
            <Icone nom="lock" taille={34} />
          </div>
          <h1 className="pg-t" style={{ marginTop: '14px' }}>
            {t('Trop d’essais')}
          </h1>
          <p className="pg-s">{tf('Pour protéger ce numéro, attends {h} pour recevoir un nouveau code.', { h: heureSeule(reprise, langue) })}</p>
        </div>
        {panier && (
          <div className="note green">
            <Icone nom="shopping-cart" taille={18} />
            <div>{t('Ton panier est gardé : rien n’est perdu.')}</div>
          </div>
        )}
        <div className="mt16">
          <Link to={panier ? chemin('panier') : connexion ? chemin('connexion') : chemin('compte')} className="btn primary">
            <Icone nom={panier ? 'shopping-cart' : connexion ? 'log-in' : 'user-round'} taille={18} />
            <span>{t(panier ? 'Revenir au panier' : connexion ? 'Autre moyen de connexion' : 'Revenir à mon compte')}</span>
          </Link>
        </div>
        <div className="cl03-center">
          <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="cl03-link">
            {t('Écrire au support')}
          </Link>
        </div>
      </>
    )
  } else if (envoi) {
    const e = envoi
    corps = (
      <>
        {panier && <Etapes fait={false} />}
        <div style={{ height: '10px' }}></div>
        <Styles id="1c3d953197" />
        {!partage && <Bandeau />}
        <SaisieCode
          key={canal}
          titre={canal === 'whatsapp' ? 'Entre le code reçu par WhatsApp' : 'Entre le code reçu par SMS'}
          envoi={e}
          modifier={
            <a href="#" className="cl03-link" onClick={(x) => (x.preventDefault(), setEnvoi(null))}>
              {t('Modifier')}
            </a>
          }
          bouton="Valider mon numéro"
          valider={async (code) => {
            const r = await source.verifierPremierNumero(cm ? n : numero, code)
            if ('raison' in r) {
              setIssue('utilise')
              return { ok: false, essaisRestants: 5 }
            }
            // Trop d'essais : l'écran « Trop d'essais » du prototype, avec la vraie heure de reprise.
            if (!r.ok && 'bloqueJusqua' in r) (setReprise(r.bloqueJusqua), setIssue('bloque'))
            return r
          }}
          renvoyer={() => source.envoyerCode('numero-nouveau', destination, canal)}
          reussi={async () => {
            if (connexion) majSession(await source.reprendreCompte())
            setIssue('ok')
          }}
        />
        <div className="hint-l">
          <Icone nom={autreCanal === 'sms' ? 'message-square-text' : 'message-circle'} taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {t(canal === 'sms' ? 'Pas reçu ? Le réseau est peut-être lent. ' : 'Pas reçu ? WhatsApp n’est peut-être pas installé sur ce numéro. ')}
            <a href="#" className="cl03-link" onClick={(x) => (x.preventDefault(), changerCanal())}>
              {t(autreCanal === 'sms' ? 'Recevoir le code par SMS' : 'Recevoir le code par WhatsApp')}
            </a>
            {tropTot && <> {t('Possible dès la fin du délai affiché.')}</>}
          </span>
        </div>
      </>
    )
  } else
    corps = (
      <>
        {panier && <Etapes fait={false} />}
        <div style={{ height: '10px' }}></div>
        <Styles id="1c3d953197" />
        {!partage && <Bandeau />}
        <h1 className="pg-t">{t('Vérifie ton numéro')}</h1>
        <p className="pg-s">
          {t(connexion ? 'Un code, et tu es connecté. Pas de mot de passe. Si ce numéro n’a pas encore de compte, on le crée.' : 'Un code par SMS, une seule fois. Il te faut un numéro vérifié pour commander.')}
        </p>
        <div className="fld">
          <label htmlFor="nm-numero">{t('Ton numéro de téléphone')}</label>
          <div className={'inp ' + (vu && erreur ? 'err' : 'focus')}>
            <a
              href="#"
              className="cl03-cc nm-cc"
              aria-label={tf('Pays du numéro : {p}', { p: t(pays.nom) })}
              onClick={(e) => (e.preventDefault(), setFeuille(true))}
            >
              <i className={'fl ' + pays.cle}></i>
              {pays.ind}
              <Icone nom="chevron-down" taille={15} />
            </a>
            {/* Champ éditable sur place (comme le texte du prototype, il passe à la ligne en grand texte). */}
            <span
              ref={champ}
              id="nm-numero"
              className="grow"
              role="textbox"
              aria-label={t('Ton numéro de téléphone')}
              inputMode="tel"
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              onInput={(e) => {
                const el = e.currentTarget
                const v = el.textContent ?? ''
                setNumero(v)
                const f = cm ? espacer(v) : grouper(v)
                if (el.textContent !== f) {
                  el.textContent = f
                  const r = document.createRange()
                  r.selectNodeContents(el)
                  r.collapse(false)
                  const sel = getSelection()
                  sel?.removeAllRanges()
                  sel?.addRange(r)
                }
              }}
              onBlur={() => n && setVu(true)}
            />
            {op && (op === 'MTN' || op === 'Orange') && (
              <span className="suf">
                <span className="cl03-op">
                  <Icone nom="circle-check" taille={14} trait={2.2} />
                  {t(nomMoMo(op))}
                </span>
              </span>
            )}
          </div>
          {vu && erreur && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t(erreur)}
            </div>
          )}
        </div>
        {!cm && (
          <p className="t13 c3" style={{ margin: '8px 2px 0' }}>
            <Icone nom="globe" taille={14} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            {t('Numéro de l’étranger : le code par WhatsApp arrive le plus sûrement. Tu paieras en euros ou en dollars.')}
          </p>
        )}
        <div className="t13 b7 mt14" style={{ color: 'var(--ink-2)' }}>
          {t('Recevoir le code par')}
        </div>
        <div className="ax-ch" role="radiogroup" aria-label={t('Recevoir le code par')}>
          {(['whatsapp', 'sms'] as const).map((c) => (
            <a
              key={c}
              href="#"
              className={canal === c ? 'on' : ''}
              role="radio"
              aria-checked={canal === c}
              onClick={(e) => (e.preventDefault(), setCanal(c))}
            >
              <span className="i">
                <Icone nom={c === 'sms' ? 'message-square-text' : 'message-circle'} taille={18} />
              </span>
              <span>
                <b>{t(c === 'sms' ? 'SMS' : 'WhatsApp')}</b>
                <span>{t(c === 'sms' ? 'Sans Internet' : 'Arrive même avec peu de réseau')}</span>
              </span>
            </a>
          ))}
        </div>
        <div className="mt14">
          <a href="#" className="btn primary" onClick={(e) => (e.preventDefault(), recevoir())}>
            <Icone nom="send" taille={18} />
            <span>{t(canal === 'sms' ? 'Recevoir le code par SMS' : 'Recevoir le code par WhatsApp')}</span>
          </a>
        </div>
        <div className="nm-alt">
          <a href="#" onClick={(e) => (e.preventDefault(), setFeuille(true))}>
            <Icone nom="globe" taille={14} />
            {t('Numéro d’un autre pays')}
          </a>
          {connexion ? (
            <Link to={chemin('connexion')}>
              <Icone nom="log-in" taille={14} />
              {t('Autre moyen de connexion')}
            </Link>
          ) : (
            <Link to={chemin('numero-changer')}>
              <Icone nom="repeat" taille={14} />
              {t('Ce n’est plus mon numéro')}
            </Link>
          )}
        </div>
        <div className="hint-l">
          <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Avant la vérification, ce numéro ne reçoit rien d’autre que ce code.')}</span>
        </div>
        <div className="sec">
          <h2>{t('Il sert à')}</h2>
        </div>
        <div className="card tight">
          {[
            ['wallet', 'Payer en Mobile Money'],
            ['qr-code', 'Recevoir ton code de retrait'],
            ['store', 'Te reconnaître au comptoir du relais'],
          ].map(([i, x]) => (
            <div key={x} className="cl03-use">
              <span className="ui">
                <Icone nom={i} taille={18} />
              </span>
              <span className="grow">{t(x)}</span>
            </div>
          ))}
        </div>
      </>
    )

  const liste = PAYS.filter((p) => !cherche || norme(t(p.nom)).includes(norme(cherche)) || p.ind.includes(cherche))
  const lignePays = (p: (typeof PAYS)[number]) => (
    <a key={p.cle} href="#" className={p.cle === pays.cle ? 'on' : ''} onClick={(e) => (e.preventDefault(), choisirPays(p))}>
      <i className={'fl ' + p.cle}></i>
      {t(p.nom)}
      <b>{p.ind}</b>
      {p.cle === pays.cle && <Icone nom="check" taille={18} style={{ color: 'var(--or-txt)' }} />}
    </a>
  )
  return (
    <Ecran
      route="numero"
      gabarit="arrivee"
      navigation={{ ...NAVIGATION.numero, sousTitre: panier ? 'Première commande · étape 1 sur 2' : connexion ? 'Connexion par numéro' : null, retour: panier ? 'panier' : connexion ? 'connexion' : rappel ? 'rappel' : 'compte' }}
      avant={
        <>
          <Styles id="bf169d62ab" />
          <Styles id="e45eeaa1bc" />
        </>
      }
      fixes={
        <Feuille ouverte={feuille} fermer={() => (setFeuille(false), setCherche(''))} titre={t('Pays de ton numéro')}>
          <div style={{ fontWeight: '800', fontSize: '17px', margin: '2px 0 6px' }}>{t('Pays de ton numéro')}</div>
          <div className="ax-srch">
            <Icone nom="search" taille={17} />
            <span
              className="grow"
              role="searchbox"
              aria-label={t('Rechercher un pays')}
              contentEditable="plaintext-only"
              suppressContentEditableWarning
              data-ph={t('Rechercher un pays')}
              onInput={(e) => setCherche(e.currentTarget.textContent ?? '')}
            />
          </div>
          <div className="ax-cl">
            {liste.filter((p) => p.cle === 'cm').map(lignePays)}
            {liste.some((p) => p.cle !== 'cm') && <div className="gh">{t('Diaspora')}</div>}
            {liste.filter((p) => p.cle !== 'cm').map(lignePays)}
            {!liste.length && <div className="gh">{t('Aucun pays trouvé')}</div>}
          </div>
        </Feuille>
      }
    >
      <Styles id="f16ded0d4c" />
      <Partage visuel={fin ? <PhotoArrivee /> : partage && <Bandeau />}>{corps}</Partage>
    </Ecran>
  )
}
