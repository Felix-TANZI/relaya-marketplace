// Écran « Conversation » (CL-13 ; CMS-01 à CMS-12), balisage du prototype du 1er octobre, repris à la main et
// rendu logique (DP-53) :
// - la conversation (?id=…) vient des données : en-tête (dossier, vendeur ou support), messages groupés par jour,
//   lignes système ; l'ouvrir la marque lue ;
// - écrire et envoyer pour de vrai : numéros, e-mails et liens sont retirés avant l'envoi, la conversation le
//   dit ; une photo se prend ici (jamais par WhatsApp) et, dans un dossier, est versée au dossier ;
// - au support : la conversation rouverte annonce le délai de réponse (2 h, 7 h – 21 h, 7 j/7 ; DP-12), sans fausse
//   réponse ; « ?st=nouveau » : sujet (« ?sujet= »), commande (« ?commande= »), message, photo, puis la
//   conversation du support ; hors des heures, l'heure de la réponse ; les réponses fréquentes du sujet d'abord.
// - pièces jointes (DP-54) : dans un dossier, la photo se prend avec l'appareil (datée, versée au dossier) ; avec
//   le support ou un vendeur, une photo ou une capture d'écran de la galerie (ex. le SMS de l'opérateur).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Fragment, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import img_7ff506ffac36_svg from '../../assets/prototype/7ff506ffac36.svg'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { reduirePhoto } from '../../donnees/photo'
import { source, type Conversation, type Message } from '../../donnees/source'
import { datePhoto, heureSeule, jourConversation } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { EcranCompte, MaitreDetail, useMaitreDetail } from './Larges'
import { ListeConversations } from './Messagerie'

const MASQUE_TEXTE: Record<string, string> = { numero: 'numéro masqué', email: 'e-mail masqué', lien: 'lien masqué' }

// Texte d'un message : {{numero}} → « numéro masqué », [[Relais Mvog-Ada]] → nom insécable ; chaque morceau par t().
function Texte({ texte }: { texte: string }) {
  const { t } = usePreferences()
  const morceaux = texte.split(/(\{\{\w+\}\}|\[\[[^\]]+\]\])/).filter(Boolean)
  return (
    <>
      {morceaux.map((m, i) => {
        const masque = /^\{\{(\w+)\}\}$/.exec(m)
        if (masque) return <span key={i} className="cl13-mask">{t(MASQUE_TEXTE[masque[1]] ?? 'masqué')}</span>
        const nom = /^\[\[([^\]]+)\]\]$/.exec(m)
        if (nom) return <span key={i} className="nw">{t(nom[1])}</span>
        return <Fragment key={i}>{t(m)}</Fragment>
      })}
    </>
  )
}

function Bulle({ m }: { m: Message }) {
  const { t, langue } = usePreferences()
  if (m.de === 'systeme') {
    // « icône|heure|texte » : l'icône de la ligne, l'heure en tête si demandée.
    const [icone, heure, ...reste] = (m.texte ?? '').split('|')
    const texte = reste.join('|')
    return (
      <div className="cl13-sys">
        <Icone nom={icone || 'info'} taille={16} />
        <span>
          {heure ? (
            <Texte texte={`${heureSeule(m.le, 'fr')} · ` + texte} />
          ) : (
            <Texte texte={texte} />
          )}
        </span>
      </div>
    )
  }
  if (m.de === 'photo')
    return (
      <div className="cl13-ph">
        <div className="photo">
          {m.dessin ? (
            <Dessin id={m.dessin} />
          ) : (
            <img alt={t('Photo : la semelle fendue')} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} src={m.photo === 'exemple' ? img_7ff506ffac36_svg : m.photo} />
          )}
          <span className="ts" style={{ background: 'rgba(0,0,0,.72)' }}>
            {langue === 'en' ? datePhoto(m.le, 'en') : datePhoto(m.le, 'fr')}
          </span>
        </div>
      </div>
    )
  return (
    <div className={'cl13-b ' + (m.de === 'moi' ? 'me' : 'them')}>
      {m.de === 'eux' && <span className="who">{t(m.qui ?? '')}</span>}
      <Texte texte={m.texte ?? ''} />
      <span className={m.de === 'moi' ? 'w' : 'w c3'}>{heureSeule(m.le, langue)}</span>
    </div>
  )
}

function Entete({ c }: { c: Conversation }) {
  const { t } = usePreferences()
  const e = c.entete
  if (c.type === 'support')
    return (
      <div className="card">
        <div className="row">
          <span className="ic-sq or">
            <Icone nom="headset" taille={22} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t(e.titre)}
            </b>
            <span className="t13 c3">{t(e.sous)}</span>
          </span>
          {c.resolue && (
            <span className="pill green sm">
              <Icone nom="check" taille={13} />
              {t('Résolue')}
            </span>
          )}
        </div>
      </div>
    )
  const ligne = (
    <div className="row">
      <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
        {e.dessin && <Dessin id={e.dessin} />}
      </span>
      <span className="grow">
        <b className="t14 b8" style={{ display: 'block' }}>
          {t(e.titre)}
        </b>
        <span className="t12 c3">{t(e.sous)}</span>
      </span>
      {c.type === 'vendeur' && e.lien && (
        <Link to={e.lien.vers} className="btn secondary sm">
          <span>{t(e.lien.texte)}</span>
        </Link>
      )}
    </div>
  )
  return (
    <div className="card">
      {ligne}
      {c.type === 'vendeur' && (
        // DP-54 : un vendeur demande ton numéro, un paiement hors BelivaY, un code ? On le signale au support.
        <div className="links" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Arnaque' })} style={{ color: 'var(--red)' }}>
            <Icone nom="flag" taille={14} /> {t('Signaler cette conversation')}
          </Link>
        </div>
      )}
      {c.type === 'dossier' && (
        <>
          <div className="hr"></div>
          <div className="row">
            <span className="grow t13 c2">
              {t('Ton argent reste bloqué : ')}
              <b>{t(`${F(e.bloque ?? 0)} F`)}</b>
            </span>
            {e.lien && (
              <Link to={e.lien.vers} className="btn secondary sm">
                <span>{t(e.lien.texte)}</span>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Zone d'écriture : photo, message, envoi.
function Ecrire({ c, envoye }: { c: Conversation; envoye: () => void }) {
  const dossier = c.type === 'dossier'
  const { t, tf } = usePreferences()
  const [texte, setTexte] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const champ = useRef<HTMLSpanElement>(null)
  const envoyer = async (photo?: string) => {
    if (enCours) return
    // Rien d'écrit : « Envoyer » ramène au champ du message.
    if (!texte.trim() && !photo) return champ.current?.focus()
    setEnCours(true)
    await source.envoyerMessage(c.id, { texte: photo ? '' : texte, photo })
    if (!photo) {
      setTexte('')
      if (champ.current) champ.current.textContent = ''
    }
    setEnCours(false)
    envoye()
  }
  const choisir = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setErreur(null)
      await envoyer(await reduirePhoto(f))
    } catch {
      setErreur('Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de 10 Mo au plus.')
    }
  }
  return (
    <>
      <div className="cl13-comp">
        <button type="button" className="cl13-ib" aria-label={t(dossier ? 'Prendre une photo' : 'Joindre une photo ou une capture')} onClick={() => fichier.current?.click()}>
          <Icone nom="camera" taille={22} />
        </button>
        <div className={'inp' + (texte ? '' : ' ph')}>
          {/* Champ éditable posé comme le texte du prototype : il passe à la ligne comme lui (grand texte). */}
          <span
            ref={champ}
            className="grow"
            role="textbox"
            aria-label={t('Ton message')}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            data-ph={t(c.placeholder)}
            onInput={(e) => setTexte((e.currentTarget.textContent ?? '').slice(0, 1000))}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), envoyer())}
          />
        </div>
        <button type="button" className="cl13-ib go" aria-label={t('Envoyer')} onClick={() => envoyer()}>
          <Icone nom="send" taille={20} />
        </button>
        <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" capture={dossier ? 'environment' : undefined} hidden onChange={choisir} />
      </div>
      {erreur && (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreur)}
        </div>
      )}
      {texte.length > 800 && <div className="hint">{tf('{n} caractères sur 1 000', { n: texte.length })}</div>}
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t(c.pied)}</span>
      </div>
      {!dossier && (
        <div className="hint-l">
          <Icone nom="paperclip" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Joins une photo ou une capture d’écran : JPG, PNG ou WebP, 10 Mo au plus.')}</span>
        </div>
      )}
    </>
  )
}

const SUJETS = ['Paiement', 'Retrait et code', 'Frais de garde', 'Livraison et relais', 'Retours', 'Facture', 'Compte', 'Diaspora', 'Arnaque', 'Autre']
// Le thème des questions fréquentes de chaque sujet (« Avant d'écrire »).
const THEME_DU_SUJET: Record<string, string> = {
  Paiement: 'paiement',
  'Retrait et code': 'retrait',
  'Frais de garde': 'garde',
  'Livraison et relais': 'livraison',
  Retours: 'retour',
  Facture: 'compte',
  Compte: 'compte',
  Diaspora: 'diaspora',
}

function NouveauSupport({ commandes: enCours }: { commandes: string[] }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  // « ?sujet= » (ex. Arnaque, depuis l'aide) choisit le sujet ; « ?commande= » (ex. depuis une facture) la commande.
  const recu = new URLSearchParams(location.search)
  const [sujet, setSujet] = useState(() => {
    const v = recu.get('sujet')
    return v && SUJETS.includes(v) ? v : 'Retrait et code'
  })
  const demandee = /^BLV-\d+$/.test(recu.get('commande') ?? '') ? recu.get('commande')! : null
  const commandes = demandee && !enCours.includes(demandee) ? [demandee, ...enCours] : enCours
  const [commande, setCommande] = useState<string | null>(demandee ?? commandes[0] ?? null)
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  // Hors des heures du support (7 h – 21 h), la réponse arrive le lendemain matin.
  const [ouvert, setOuvert] = useState(true)
  useEffect(() => {
    let vivant = true
    source.aide().then((a) => vivant && setOuvert(a.support.ouvert))
    return () => {
      vivant = false
    }
  }, [])
  const [texte, setTexte] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [vu, setVu] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const erreur = texte.trim().length < 10 ? 'Écris ta question en quelques mots (10 caractères au moins).' : null
  const envoyer = async () => {
    setVu(true)
    if (erreur) return
    await source.ecrireSupport({ sujet, commande, texte: texte.trim(), photo })
    naviguer(chemin('fil', { id: 'support' }), { replace: true })
  }
  const puce = (actif: boolean, texteP: string, choisir: () => void) => (
    <a key={texteP} href="#" className={'chip' + (actif ? ' on' : '')} onClick={(e) => (e.preventDefault(), choisir())}>
      {t(texteP)}
    </a>
  )
  return (
    <>
      <p className="cl13-intro">
        {t(ouvert ? 'Une personne te répond sous 2 h, de 7 h à 21 h, 7 jours sur 7. On te prévient par notification.' : 'Le support est fermé (7 h – 21 h) : ta demande part tout de suite, une personne te répond avant 9 h demain. On te prévient par notification.')}
      </p>
      <div className="fld">
        <label>{t('C’est à propos de…')}</label>
      </div>
      <div className="chips">{SUJETS.map((s) => puce(s === sujet, s, () => setSujet(s)))}</div>
      {THEME_DU_SUJET[sujet] && (
        <div className="links" style={{ justifyContent: 'flex-start' }}>
          <Link to={chemin('faq', { t: THEME_DU_SUJET[sujet] })}>
            {tf('Avant d’écrire : les réponses sur « {sujet} »', { sujet: t(sujet) })}
            <Icone nom="chevron-right" taille={15} />
          </Link>
        </div>
      )}
      <div className="note or">
        <Icone nom="package" taille={18} />
        <div>{t('Un problème sur un colis (abîmé, manquant, pas le bon) ? « Signaler un problème » depuis la commande va plus vite et garde ton argent bloqué.')}</div>
      </div>
      <div className="fld">
        <label>{t('Commande concernée — facultatif')}</label>
      </div>
      <div className="chips">
        {commandes.map((r) => puce(r === commande, r, () => setCommande(r)))}
        {puce(commande === null, 'Aucune', () => setCommande(null))}
      </div>
      <div className="fld">
        <label htmlFor="fil-message">{t('Ton message')}</label>
        <div className={'inp area' + (texte ? '' : ' ph') + (vu && erreur ? ' err' : '')}>
          <textarea id="fil-message" value={texte} maxLength={1000} rows={3} placeholder={t('Écris ta question…')} onChange={(e) => setTexte(e.target.value)} />
        </div>
        {vu && erreur ? (
          <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
            {t(erreur)}
          </div>
        ) : (
          <div className="hint">{tf('{n} caractères sur 1 000', { n: texte.length })}</div>
        )}
      </div>
      {photo && (
        <div className="cl13-phs">
          <div className="photo" role="button" tabIndex={0} aria-label={t('Retirer la photo')} onClick={() => setPhoto(null)} style={{ cursor: 'pointer' }}>
            <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
      )}
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => fichier.current?.click()}>
          <Icone nom="camera" taille={18} />
          <span>{t(photo ? 'Changer la photo' : 'Ajouter une photo')}</span>
        </button>
        <input
          ref={fichier}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            const p = await reduirePhoto(f).catch(() => null)
            setPhoto(p)
            setErreurPhoto(p ? null : 'Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de 10 Mo au plus.')
          }}
        />
      </div>
      {erreurPhoto ? (
        <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
          {t(erreurPhoto)}
        </div>
      ) : (
        <div className="hint">{t(photo ? 'Touche la photo pour la retirer.' : 'Une photo ou une capture d’écran (ex. le SMS de ton opérateur) : JPG, PNG ou WebP, 10 Mo au plus.')}</div>
      )}
      <div className="btns">
        <button type="button" className="btn primary" onClick={envoyer}>
          <Icone nom="send" taille={18} />
          <span>{t('Envoyer')}</span>
        </button>
      </div>
      <div className="hint-l">
        <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Gardé par écrit. Numéros, e-mails et réseaux sociaux sont masqués.')}</span>
      </div>
    </>
  )
}

export function Fil() {
  const { langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'LIT-3042'
  const st = params.get('st')
  const [d, setD] = useState<{ conversation: Conversation; maintenant: number } | null>(null)
  const [commandes, setCommandes] = useState<string[]>([])
  const [version, setVersion] = useState(0)
  const bas = useRef<HTMLDivElement>(null)
  // Dès 1024 px : maître-détail, les conversations à gauche (Messagerie.tsx), ce fil à droite.
  const md = useMaitreDetail('tab-l')
  useEffect(() => {
    let vivant = true
    source.conversation(id).then((x) => vivant && setD(x))
    source.conversations().then((x) => vivant && setCommandes(x.commandesEnCours))
    return () => {
      vivant = false
    }
  }, [id, st, version])
  useEffect(() => {
    if (version) bas.current?.scrollIntoView({ block: 'end' })
  }, [d, version])

  if (st === 'nouveau')
    return (
      <EcranCompte route="fil" parEtat etat="fil?id=support&st=nouveau">
        {md ? (
          <MaitreDetail des="tab-l" etiquette="Nouvelle demande" liste={<ListeConversations actif="" />} detail={<NouveauSupport commandes={commandes.length ? commandes : ['BLV-52018', 'BLV-52107', 'BLV-51940']} />} />
        ) : (
          <NouveauSupport commandes={commandes.length ? commandes : ['BLV-52018', 'BLV-52107', 'BLV-51940']} />
        )}
      </EcranCompte>
    )
  if (!d) return null
  const c = d.conversation
  // « ?st=photo » (prototype) : la photo prise dans l'application, versée au dossier.
  const messages: Message[] =
    st === 'photo'
      ? [
          ...c.messages,
          { de: 'photo', le: Date.UTC(2026, 8, 24, 9, 12), photo: 'exemple' },
          { de: 'systeme', le: Date.UTC(2026, 8, 24, 9, 12), texte: `check||Photo prise dans l’application et versée au dossier ${c.id}.` },
        ]
      : c.messages
  const corps: ReactNode[] = []
  let jour = ''
  for (const [i, m] of messages.entries()) {
    const j = jourConversation(m.le, d.maintenant, langue)
    if (j !== jour) {
      jour = j
      corps.push(
        <div key={'j' + i} className="cl13-day">
          {j}
        </div>,
      )
    }
    corps.push(<Bulle key={i} m={m} />)
  }
  const etat = ['LIT-3042', 'LIT-3044', 'question', 'support'].includes(c.id) ? `fil?id=${c.id}${st === 'photo' ? '&st=photo' : ''}` : 'fil?id=support'
  return (
    <EcranCompte route="fil" parEtat etat={etat}>
      {md ? (
        <MaitreDetail
          des="tab-l"
          etiquette="Conversation"
          liste={<ListeConversations key={version} actif={c.id} />}
          detail={
            <>
              <Entete c={c} />
              <div className="md13-fil">{corps}</div>
              <div className="md13-ecr">
                <Ecrire c={c} envoye={() => setVersion((v) => v + 1)} />
              </div>
              <div ref={bas}></div>
            </>
          }
        />
      ) : (
        <>
          <Entete c={c} />
          {corps}
          <Ecrire c={c} envoye={() => setVersion((v) => v + 1)} />
          <div ref={bas}></div>
        </>
      )}
    </EcranCompte>
  )
}
