// Écrans « Commander par WhatsApp » (CL-15 ; EX-06 : wa, wa-proposition, wa-confirmer, wa-lien, wa-suite), forme
// d'origine du prototype rendue réelle (DP-54) : le décor de la conversation WhatsApp (barre du compte
// professionnel BelivaY avec son logo, fond, bulles, message vocal, barre de saisie) autour d'une seule
// conversation, lue dans les données, qui avance selon les réponses : accord pour le message vocal (OK),
// proposition d'après la dernière commande avec les prix calculés par BelivaY (« C'est bon »), récapitulatif (rien
// avant OUI), lien de paiement qui ouvre le paiement dans BelivaY, puis la commande payée ; le code n'est jamais
// écrit ici ; ce qui n'est pas compris passe à un conseiller. L'adresse suit l'étape de la conversation.
// Sous la conversation (DP-54) : le bon compte (nom, coche de compte vérifié, numéro officiel +237 689 002 812), ce que
// l'assistant fait et ne fait jamais (CWA-02 à CWA-10, WAP-01 à WAP-05), le paiement toujours dans BelivaY, les
// arnaques à reconnaître, et où signaler un faux compte.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { useCoordonnees } from '../../composants/contenus'
import { Portrait } from '../../composants/Profil'
import { Illustration } from '../../composants/socle'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source, type ConversationWa, type MessageWa } from '../../donnees/source'
import { jourConversation } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Bloc } from '../CL-14/Commun'

const ROUTE: Record<ConversationWa['etape'], string> = { accord: 'wa', proposition: 'wa-proposition', humain: 'wa-proposition', confirmer: 'wa-confirmer', lien: 'wa-lien', suite: 'wa-suite' }
const SUGGESTIONS: Record<ConversationWa['etape'], string[]> = { accord: ['OK'], proposition: ['C’est bon', 'Je veux parler à un conseiller'], confirmer: ['OUI'], lien: [], suite: ['Nouvelle commande'], humain: ['Nouvelle commande'] }
// Les hauteurs des barres de l'onde d'un message vocal (dessin fixe, comme WhatsApp).
const ONDE = [8, 14, 20, 12, 22, 16, 9, 18, 24, 14, 10, 20, 16, 8, 12, 22, 18, 10, 14, 8, 16, 12]
// Heure d'une bulle, comme WhatsApp : « 10:02 » (heure de Yaoundé).
const heure = (ms: number) => new Date(ms + 3600e3).toISOString().slice(11, 16)
// Les mots que la conversation met en gras : les réponses attendues et « jamais ici ».
function gras(s: string): ReactNode {
  return s.split(/(\bOK\b|\bOUI\b|jamais ici)/).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : <Fragment key={i}>{x}</Fragment>))
}

// Ce que l'assistant WhatsApp fait (✓) et ne fait jamais (✗).
const PEUT: [boolean, string][] = [
  [true, 'Comprendre ton message, écrit ou vocal (le vocal seulement avec ton accord)'],
  [true, 'Te proposer une commande au prix calculé par BelivaY, avec ton relais et l’heure'],
  [true, 'Passer la main à une personne du support, de 7 h à 21 h, 7 j/7'],
  [false, 'Commander sans ton OUI écrit'],
  [false, 'Payer à ta place ou te demander de l’argent sur WhatsApp'],
  [false, 'T’envoyer ton code de retrait : il arrive dans l’application et par SMS'],
  [false, 'Recevoir une photo de litige : elle se prend dans l’application'],
]
const ARNAQUES = [
  'On te demande d’envoyer l’argent par transfert Mobile Money à un numéro : BelivaY ne le fait jamais.',
  'On te demande ton code secret Mobile Money, ton code de retrait ou un code reçu par SMS.',
  'Un lien de paiement qui ne commence pas par belivay.com, ou un « prix spécial » à payer d’avance.',
  'Un compte sans la coche verte, ou un numéro différent de {n}.',
]

// Sous la conversation : ce qu'il faut savoir avant d'écrire à BelivaY sur WhatsApp.
function AvantDEcrire() {
  const { t, tf } = usePreferences()
  const coord = useCoordonnees()
  return (
    <>
      <div className="sec">
        <h2>{t('Le bon compte BelivaY')}</h2>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic green">
            <Icone nom="badge-check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('« BelivaY », compte professionnel vérifié')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('La coche verte s’affiche à côté du nom. Le seul numéro officiel est le {n}.', { n: coord.telephone })}
            </span>
          </span>
        </div>
        <a href={coord.whatsapp} target="_blank" rel="noopener noreferrer" className="li">
          <span className="ic ">
            <Icone nom="message-circle" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Numéro officiel BelivaY')}
            </span>
            <span className="ls nw" style={{ display: 'block' }}>
              {coord.telephone}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </a>
      </div>
      <div className="sec">
        <h2>{t('Ce que l’assistant fait, et jamais')}</h2>
      </div>
      <div className="card">
        {PEUT.map(([ok, x]) => (
          <div key={x} className="check">
            <span className="cb" style={{ borderColor: ok ? 'var(--green-line)' : 'var(--red-line)', color: ok ? 'var(--green)' : 'var(--red)' }}>
              <Icone nom={ok ? 'check' : 'x'} taille={14} trait={3} />
            </span>
            <span className="grow">{tf(x, { n: coord.telephone })}</span>
          </div>
        ))}
      </div>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>
          <b>{t('Tu paies toujours dans BelivaY.')}</b>
          {t(' Le lien de paiement ouvre l’application ; tu valides Mobile Money sur ton téléphone. Ton argent reste bloqué jusqu’à ton retrait, comme pour toute commande.')}
        </div>
      </div>
      <div className="sec">
        <h2>{t('Arnaques à reconnaître')}</h2>
      </div>
      <div className="card">
        {ARNAQUES.map((x) => (
          <div key={x} className="check">
            <span className="cb" style={{ borderColor: 'var(--red-line)', color: 'var(--red)' }}>
              <Icone nom="triangle-alert" taille={14} trait={2.4} />
            </span>
            <span className="grow">{t(x)}</span>
          </div>
        ))}
        <div className="btns">
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Arnaque' })} className="btn secondary">
            <Icone nom="flag" taille={18} />
            <span>{t('Signaler un faux compte BelivaY')}</span>
          </Link>
        </div>
      </div>
      <div className="links">
        <Link to={chemin('commandes')}>{t('Mes commandes')}</Link>
        <Link to={chemin('notifs-reglages')}>{t('Mes notifications')}</Link>
      </div>
    </>
  )
}

function Conversation() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const session = useSession()
  // Dès 1200 px : « Le bon compte BelivaY » dans une colonne d’explication à gauche ; la conversation garde sa forme
  // de téléphone (colonne de 480 centrée dès 1024, § 5.13).
  const pc = useDes('pc')
  const [wa, setWa] = useState<ConversationWa | null>(null)
  const [q, setQ] = useState('')
  const bas = useRef<HTMLDivElement>(null)
  useEffect(() => {
    source.whatsapp().then(setWa)
  }, [])
  useEffect(() => {
    if (!wa) return
    const r = '/' + ROUTE[wa.etape]
    if (lieu.pathname !== r) naviguer(r, { replace: true })
    bas.current?.scrollIntoView({ block: 'end' })
  }, [wa, lieu.pathname, naviguer])
  if (!wa) return null
  const envoyer = async (x: string) => {
    if (!x.trim()) return
    setQ('')
    setWa(await source.repondreWhatsapp(x))
  }
  // Le jour d'une bulle se compte depuis la dernière : la conversation est vivante.
  const dernier = wa.messages.length ? wa.messages[wa.messages.length - 1].le : 0
  const jour = (ms: number) => jourConversation(ms, dernier, langue)
  const derniereBelivay = wa.messages.map((m) => m.de).lastIndexOf('belivay')
  const portrait = session.client ? (
    <Portrait taille={30}>
      <Illustration image={session.client.portrait[36]} classe="portrait" style={{ width: '30px', height: '30px' }} />
    </Portrait>
  ) : null
  const vu = <Icone nom="check-check" taille={15} style={{ color: 'var(--ink-3)' }} />
  const bulle = (m: MessageWa, i: number) => {
    if (m.de === 'systeme')
      return (
        <span key={i} className="cl15-sys">
          {t(m.texte)} · {heure(m.le)}
        </span>
      )
    const vocal = m.de === 'client' && m.texte.startsWith('🎤') ? (m.texte.split(' · ')[1] ?? '') : null
    if (vocal !== null)
      return (
        <div key={i} className="cl15-b out">
          <div className="cl15-voice">
            <span className="pl">
              <Icone nom="play" taille={20} />
            </span>
            <span className="cl15-wave">
              {ONDE.map((h, k) => (
                <i key={k} style={{ height: h + 'px' }}></i>
              ))}
            </span>
            {portrait}
          </div>
          <div className="cl15-bt">
            <span style={{ marginRight: 'auto' }}>{vocal}</span>
            {heure(m.le)}
            {vu}
          </div>
        </div>
      )
    if (m.de === 'client')
      return (
        <div key={i} className="cl15-b out">
          {/^(OUI|OK)$/i.test(m.texte) ? <b>{m.texte}</b> : m.texte}
          <div className="cl15-bt">
            {heure(m.le)}
            {vu}
          </div>
        </div>
      )
    const temps = <div className="cl15-bt">{heure(m.le)}</div>
    // Une proposition : le message, puis la carte de la proposition dans sa propre bulle.
    if (m.carte && !m.carte.lien)
      return (
        <Fragment key={i}>
          <div className="cl15-b in">
            {gras(m.texte)}
            {temps}
          </div>
          <div className="cl15-b in">
            <p>
              <b>{m.carte.titre}</b>
            </p>
            <ul>
              {m.carte.lignes.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            {m.carte.total && (
              <p>
                <b>{m.carte.total}</b>
              </p>
            )}
            {temps}
          </div>
        </Fragment>
      )
    return (
      <div key={i} className="cl15-b in">
        {m.carte?.lien && (
          <Link to={chemin('paiement-attente', { ref: m.carte.lien })} className="cl15-link">
            <b>{m.carte.titre}</b>
            {m.carte.lignes.map((l) => (
              <span key={l}>{l}</span>
            ))}
            <u>{t('Ouvrir le paiement dans BelivaY')}</u>
          </Link>
        )}
        {i === derniereBelivay && wa.etape === 'suite' && wa.ref && (
          <Link to={chemin('commande', { ref: wa.ref })} className="cl15-link">
            <b>{tf('Commande {ref} · payée', { ref: wa.ref })}</b>
            {session.relais && <span>{tf('Retrait au {r}', { r: t(session.relais.nom) })}</span>}
            <u>{t('Suivre dans l’application')}</u>
          </Link>
        )}
        {i === derniereBelivay && wa.etape === 'humain' && (
          <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="cl15-link">
            <b>{t('Support BelivaY')}</b>
            <u>{t('Continuer avec le support dans l’application')}</u>
          </Link>
        )}
        {m.carte?.lien
          ? m.texte.split(/(?<=\.) (?=Je ne paie)/).map((x) => <p key={x}>{gras(x)}</p>)
          : m.texte.split(/(?<=\.) (?=Réponds|Ton code)/).map((x) => <p key={x}>{gras(x)}</p>)}
        {temps}
      </div>
    )
  }
  return (
    <Ecran route={ROUTE[wa.etape]} enteteSite>
      <Styles id="ddcb0e469a" />
      {!INTERRUPTEURS_DU_LANCEMENT['FF-EX06'] && (
        <div className="cl15-ff">
          <span className="cl15-pill">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl15-ex">{t('EX-06')}</span>
        </div>
      )}
      <Bloc classe="g5-wa" des="pc">
      {pc && (
        <aside className="g5-wa-g" aria-label={t('Le bon compte BelivaY')}>
          <AvantDEcrire />
        </aside>
      )}
      <Bloc classe="g5-wa-c" des="pc">
      <div className="cl15-wa">
        <div className="cl15-wa-top">
          <Link to={chemin('aide')} className="ibtn" aria-label={t('Revenir')} style={{ width: '32px' }}>
            <Icone nom="chevron-left" taille={24} />
          </Link>
          <span className="cl15-wa-av">
            <img src={logo} alt="" />
          </span>
          <div className="grow">
            <div className="cl15-wa-n">
              {t('BelivaY')}
              <Icone nom="badge-check" taille={16} />
            </div>
            <div className="cl15-wa-s">{t('Compte professionnel')}</div>
          </div>
          <span className="ibtn">
            <Icone nom="phone" taille={20} />
          </span>
        </div>
        <div className="cl15-wa-b">
          {wa.messages.map((m, i) => (
            <Fragment key={i}>
              {(i === 0 || jour(wa.messages[i - 1].le) !== jour(m.le)) && <span className="cl15-day">{jour(m.le)}</span>}
              {bulle(m, i)}
            </Fragment>
          ))}
          <div ref={bas} />
        </div>
        {SUGGESTIONS[wa.etape].length > 0 && (
          <div className="chips" style={{ padding: '0 10px 8px', margin: 0 }}>
            {SUGGESTIONS[wa.etape].map((s) => (
              <a key={s} href="#" className="chip" onClick={(e) => (e.preventDefault(), envoyer(s))}>
                {t(s)}
              </a>
            ))}
          </div>
        )}
        <form className="cl15-wa-in" onSubmit={(e) => (e.preventDefault(), envoyer(q))}>
          <span className="p">
            <Icone nom="plus" taille={22} />
          </span>
          <input
            className={'f' + (q ? ' typed' : '')}
            aria-label={t('Message')}
            placeholder={t('Message')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: 0, outline: 'none', font: 'inherit', minWidth: 0, color: 'var(--ink)' }}
          />
          {q.trim() ? (
            <button type="submit" className="m" aria-label={t('Envoyer')} style={{ border: 0, background: 'transparent', cursor: 'pointer' }}>
              <Icone nom="send" taille={20} />
            </button>
          ) : (
            <span className="m">
              <Icone nom="mic" taille={22} />
            </span>
          )}
        </form>
      </div>
      <div className="cl15-fine">{t('Rien n’est commandé ni payé avant ton OUI. Le paiement se fait dans BelivaY ; ton code n’est jamais écrit ici.')}</div>
      </Bloc>
      </Bloc>
      {!pc && <AvantDEcrire />}
    </Ecran>
  )
}

export const Wa = Conversation
