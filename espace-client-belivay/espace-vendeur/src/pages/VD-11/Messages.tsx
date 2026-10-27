// Messagerie (VD-11) : repris du prototype (route('messages'), conversation messages?fil=…), branché sur la source.
// Règles VD11-R59 à R61, MSG-01 à MSG-03, GEN-08, Q-49, Q-70, REFVD-R310 :
// - une conversation par commande, anonyme dans les deux sens (« Client de BLV-… ») ; à l'écran « fil » s'écrit
//   « conversation » ; fermée à la fin du délai de litige (litige : à la clôture du dossier), historique lisible ;
// - numéros, e-mails, liens et réseaux sociaux retirés avant l'envoi, des deux côtés ; bulle ambre « Un numéro de
//   téléphone a été retiré de ce message avant l'envoi » ; l'écran prévient AVANT l'envoi ;
// - carte de la commande en tête (article, référence, échéance) qui ouvre la commande ou le litige ;
// - réponses rapides ; bulles du vendeur en dégradé braise, signées du membre qui écrit (EQU-03) ;
// - conversation « Support BelivaY » hors commandes (Q-49), en plus du WhatsApp d'aide (aide seulement).
// Ajouts : recherche, conversation fermée signalée, écrire au support depuis la liste, séparateurs de jour.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Fil, Message } from '../../donnees/domaines/messages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { jourDe } from '../../calculs/temps'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Bouton, CHAMP, Chargement, ErreurLecture, jourDate } from './communs'

const ICONES = { commande: 'package', litige: 'scale', support: 'headset' } as const

function Bulle({ m, moi }: { m: Message; moi: string | null }) {
  const { t, tf, langue } = usePreferences()
  const h = heure(m.a, langue)
  if (m.de === 'vendeur')
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
        <div style={{ maxWidth: '78%', padding: '10px 13px', borderRadius: '18px', borderBottomRightRadius: '6px', background: m.filtre ? 'var(--amber-soft)' : 'linear-gradient(180deg,var(--braise-1),var(--braise-2))', border: m.filtre ? '1px dashed var(--amber-line)' : undefined, color: m.filtre ? 'var(--amber)' : '#fff', fontSize: '14px', lineHeight: '1.45' }}>
          {m.filtre && (
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <Icone nom="shield-alert" taille={14} style={{ verticalAlign: '-2px' }} />
              {t(' Un numéro de téléphone a été retiré de ce message avant l’envoi.')}
            </div>
          )}
          <span style={{ color: m.filtre ? 'var(--ink)' : undefined }}>{m.texte}</span>
          <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right', color: m.filtre ? 'var(--amber)' : 'rgba(255,255,255,.85)' }}>{m.auteur && m.auteur !== moi ? `${m.auteur} · ${h}` : h}</div>
        </div>
      </div>
    )
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
      <div style={{ maxWidth: '78%', padding: '10px 13px', borderRadius: '18px', borderBottomLeftRadius: '6px', background: 'var(--card)', boxShadow: 'var(--shadow-card)', fontSize: '14px', lineHeight: '1.45' }}>
        {m.de === 'support' && <div className="t12 b8 cor" style={{ marginBottom: '2px' }}>{t('Support BelivaY')}</div>}
        {m.texte}
        <div style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right', color: 'var(--ink-3)' }}>{m.filtre ? tf('{h} · filtré', { h }) : h}</div>
      </div>
    </div>
  )
}

function Conversation({ id, prerempli = '' }: { id: string; prerempli?: string }) {
  const { t, tf, langue } = usePreferences()
  const peutRepondre = useDroit('messages.repondre') // droits de l'accès employé
  const s = useSession()
  const maintenant = useHorloge()
  const lecture = useLecture(() => source.messages.fil(id).then((x) => x ?? ('absente' as const)), [id])
  const d = lecture.donnees === 'absente' ? null : lecture.donnees
  const type = d?.fil.type ?? 'commande'
  const rapides = useLecture(() => source.messages.reponsesRapides(type), [type])
  const [texte, setTexte] = useState(prerempli)
  const [erreur, setErreur] = useState<string | null>(null)
  const bas = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (d?.fil.nonLus) void source.messages.lire(id)
  }, [d?.fil.nonLus, id])
  useEffect(() => {
    bas.current?.scrollIntoView({ block: 'end' })
  }, [d?.messages.length])
  if (!d)
    return (
      <Ecran route="messages" titre={t('Messagerie')} retour={chemin('messages')}>
        {lecture.erreur ? (
          <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        ) : lecture.donnees === 'absente' ? (
          <div className="card" style={{ marginTop: '18px' }}>
            <div className="b8 t15">{t('Conversation introuvable')}</div>
            <div className="mt12">
              <Bouton classe="secondary" icone="messages-square" vers={chemin('messages')}>
                {t('Voir mes conversations')}
              </Bouton>
            </div>
          </div>
        ) : (
          <Chargement />
        )}
      </Ecran>
    )
  const { fil, messages } = d
  const filtre = source.messages.filtrer(texte)
  const envoyer = async () => {
    if (!texte.trim()) return
    try {
      await source.messages.envoyer(id, texte)
      jouer('message')
      setTexte('')
      setErreur(null)
    } catch (e) {
      setErreur(t(e instanceof Error && e.message === 'ferme' ? 'Conversation fermée : le message n’est pas parti.' : 'Le message n’est pas parti : réessayez.'))
    }
  }
  const c = fil.commande
  const lienCommande = fil.type === 'litige' && fil.ref ? chemin('litige', { ref: fil.ref }) : fil.ref ? chemin('commande', { ref: fil.ref }) : null
  let jourPrecedent = ''
  return (
    <Ecran route="messages" titre={fil.ref ? tf('Client de {ref}', { ref: fil.ref }) : t('Support BelivaY')} retour={chemin('messages')}>
      {c && lienCommande && (
        <Link to={lienCommande} className="card" style={{ display: 'block', marginTop: '14px', padding: '12px 14px' }}>
          <div className="row">
            <Vignette nom={c.dessin} taille={40} />
            <div className="grow">
              <div className="b8 t14">{`${c.titre} ${t(c.variante)}`}</div>
              <div className="t12 c3">{c.echeance ? `${fil.ref} · ${t(c.etape)} ${t('avant')} ${echeance(c.echeance, maintenant, langue)}` : `${fil.ref} · ${t(c.etape)}`}</div>
            </div>
            <span className="chev c3">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </div>
        </Link>
      )}
      {fil.type === 'support' && (
        <div className="card" style={{ marginTop: '14px', padding: '12px 14px' }}>
          <div className="row" style={{ gap: '10px' }}>
            <Icone nom="headset" taille={20} style={{ color: 'var(--or-txt)', flexShrink: 0 }} />
            <div className="grow t13 c2" style={{ lineHeight: '1.45' }}>
              {t('Une personne vous répond en 2 h au plus, de 7 h à 21 h, tous les jours. Cette conversation garde la trace de vos demandes.')}
            </div>
          </div>
          <Link to={chemin('aide')} className="t13 b8 cor" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '44px' }}>
            {t('Questions fréquentes et WhatsApp d’aide')}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </div>
      )}
      <div role="log" aria-live="polite" aria-label={t('Messages de la conversation')}>
        {messages.map((m) => {
          const j = jourDe(m.a)
          const sep = j !== jourPrecedent
          jourPrecedent = j
          return (
            <div key={m.id}>
              {sep && <div className="center t12 c3 mt14">{j === jourDe(maintenant) ? t('Aujourd’hui') : j === jourDe(maintenant - 86400000) ? t('Hier') : jourDate(m.a, langue)}</div>}
              <Bulle m={m} moi={s.membre?.prenom ?? null} />
            </div>
          )
        })}
      </div>
      {fil.ferme ? (
        <div className="card flat" style={{ marginTop: '16px', background: 'var(--sand-2)' }}>
          <div className="row t14 c2" style={{ gap: '8px' }}>
            <Icone nom="lock" taille={16} />
            <span>{t(fil.type === 'litige' ? 'Conversation fermée à la clôture du dossier' : 'Conversation fermée à la fin du délai de litige')}</span>
          </div>
        </div>
      ) : !peutRepondre ? (
        <div className="card flat" style={{ marginTop: '16px', background: 'var(--sand-2)' }}>
          <div className="row t14 c2" style={{ gap: '8px' }}>
            <Icone nom="lock" taille={16} />
            <span>{t('Réservé : votre accès permet de lire les messages, pas d’y répondre.')}</span>
          </div>
        </div>
      ) : (
        <>
          {rapides.donnees && rapides.donnees.length > 0 && (
            <>
              <div className="kick" style={{ marginTop: '18px' }}>
                {t('Réponses rapides')}
              </div>
              <div className="chips" style={{ marginTop: '8px' }}>
                {rapides.donnees.map((r) => (
                  <button key={r} type="button" className="chip" onClick={() => setTexte((x) => (x.trim() ? x.trim() + ' ' : '') + t(r))}>
                    {t(r)}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="row mt12" style={{ padding: '6px 6px 6px 14px', borderRadius: '24px', background: 'var(--card)', boxShadow: 'var(--shadow-card)', alignItems: 'flex-end' }}>
            <textarea
              rows={1}
              value={texte}
              maxLength={1000}
              onChange={(e) => (setTexte(e.target.value), setErreur(null))}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void envoyer())}
              placeholder={t('Votre message…')}
              aria-label={t('Votre message…')}
              style={{ ...CHAMP, resize: 'none', minHeight: '44px', padding: '11px 0', lineHeight: '1.4', fontSize: '16px' }}
            />
            <button type="button" aria-label={t('Envoyer')} onClick={() => void envoyer()} disabled={!texte.trim()} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 0, background: 'linear-gradient(180deg,var(--braise-1),var(--braise-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: texte.trim() ? 1 : 0.5, cursor: texte.trim() ? 'pointer' : 'default' }}>
              <Icone nom="send" taille={18} />
            </button>
          </div>
          {filtre.filtre && (
            <div className="hint" style={{ color: 'var(--amber)' }}>
              {t('Un numéro, un e-mail, un lien ou un réseau social sera retiré avant l’envoi.')}
            </div>
          )}
          {erreur && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {erreur}
            </div>
          )}
        </>
      )}
      <p className="scrim-note" ref={bas}>
        {t(fil.type === 'support' ? 'Cette conversation garde la trace de vos demandes au support. Numéros, e-mails et réseaux sociaux sont retirés avant l’envoi.' : 'Cette conversation sert de preuve. Numéros, e-mails et réseaux sociaux sont retirés avant l’envoi. Elle se ferme à la fin du délai de litige.')}
      </p>
    </Ecran>
  )
}

function Liste() {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const naviguer = useNavigate()
  const lecture = useLecture(() => source.messages.fils(), [])
  const [q, setQ] = useState('')
  const fils = useMemo(() => (lecture.donnees ?? []).filter((f) => !q.trim() || (f.sujet + ' ' + (f.dernier?.texte ?? '')).toLowerCase().includes(q.trim().toLowerCase())), [lecture.donnees, q])
  const quand = (a: number) => (jourDe(a) === jourDe(maintenant) ? heure(a, langue) : jourDate(a, langue).split(' ')[0])
  const ligne = (f: Fil) => (
    <Link key={f.id} to={chemin('messages', { fil: f.id })} className="li" style={{ alignItems: 'flex-start', padding: '12px 0' }}>
      {/* Conversation fermée : son icône s'estompe, ses textes gardent leur contraste (4,5 : 1, accessibilité). */}
      <span className={'ic' + (f.type === 'litige' ? ' red' : f.type === 'support' ? ' green' : ' or')} style={f.ferme ? { opacity: 0.6 } : undefined}>
        <Icone nom={ICONES[f.type]} taille={19} />
      </span>
      <span className="grow">
        <span className="row" style={{ gap: '6px' }}>
          <span className="lt grow">{f.ref ? tf(f.type === 'litige' ? 'Client de {ref} · litige' : 'Client de {ref}', { ref: f.ref }) : t('Support BelivaY')}</span>
          {f.dernier && <span className="t12 c3 b7 nw">{quand(f.dernier.a)}</span>}
        </span>
        <span className="ls" style={{ display: 'block', fontWeight: f.nonLus ? 700 : undefined, color: f.nonLus ? 'var(--ink)' : undefined }}>
          {f.ferme ? t(f.type === 'litige' ? 'Conversation du litige · fermée à la fin du dossier' : 'Conversation fermée à la fin du délai de litige') : f.dernier ? `« ${f.dernier.texte} »` : t('Pas encore de message')}
        </span>
      </span>
      {f.nonLus > 0 && <span className="badge-num">{f.nonLus}</span>}
    </Link>
  )
  return (
    <Ecran route="messages">
      <div className="pg">
        <h1 className="pg-t">{t('Messagerie')}</h1>
        <p className="pg-s">{t('Une conversation par commande, sans nom ni numéro.')}</p>
      </div>
      <BandeauHorsLigne />
      <div className="inp" style={{ marginTop: '14px' }}>
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher une commande (BLV-…)')} aria-label={t('Chercher une conversation')} style={CHAMP} />
      </div>
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />}
      {!lecture.donnees && !lecture.erreur && <Chargement />}
      {lecture.donnees && (
        <div className="card tight">
          {fils.length ? fils.map(ligne) : <p className="t14 c2" style={{ margin: '12px 0' }}>{t(q ? 'Aucune conversation ne correspond.' : 'Pas encore de conversation : elles s’ouvrent avec une commande.')}</p>}
        </div>
      )}
      <div className="mt12">
        <Bouton classe="secondary" icone="headset" onClick={() => naviguer(chemin('messages', { fil: 'f-support' }))}>
          {t('Écrire au support BelivaY')}
        </Bouton>
      </div>
      <details className="more">
        <summary>
          <Icone nom="shield-check" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            <b>{t('Rattachée à une commande :')}</b>
            {t(' pas de conversation libre. Elle se ferme à la fin du délai de litige.')}
          </p>
          <p>
            <b>{t('Anonyme dans les deux sens :')}</b>
            {t(' vous lisez « Client de BLV-… ». Le client lit « le vendeur » et voit « Vendeur certifié Bronze · Trust Score 63 ».')}
          </p>
          <p>
            <b>{t('Filtrée avant l’envoi :')}</b>
            {t(' numéros, e-mails et réseaux sociaux sont retirés.')}
          </p>
          <p>
            <b>{t('La conversation est une preuve.')}</b>
            {t(' Une capture WhatsApp n’en est pas une.')}
          </p>
          <p>
            <b>{t('Le WhatsApp du support sert à l’aide :')}</b>
            {t(' jamais pour une commande, jamais comme preuve.')}
          </p>
        </div>
      </details>
    </Ecran>
  )
}

// Liens entrants des autres écrans :
// - messages?fil=<id> (commande : fil=f-00008 ; « ?fil=1 » : état du prototype, BLV-00008) ;
// - messages?fil=support[&ref=BLV-…|&sujet=<référence>] : conversation « Support BelivaY », sujet prérempli
//   (VD06-R07, VER-03, NUM-05, Q-49) ;
// - messages?ref=BLV-… : la conversation de cette commande, ouverte ou créée (REP-03).
export default function Messages() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const fil = params.get('fil')
  const ref = params.get('ref')
  const sujet = params.get('sujet') ?? ref
  useEffect(() => {
    if (fil || !ref) return
    void source.messages.ouvrirFil(ref).then((r) => naviguer(r ? chemin('messages', { fil: r.fil }) : chemin('messages'), { replace: true }))
  }, [fil, ref, naviguer])
  if (fil) return <Conversation id={fil === '1' ? 'f-00008' : fil === 'support' ? 'f-support' : fil} prerempli={fil === 'support' && sujet ? sujet + ' · ' : ''} />
  if (ref) return <Ecran route="messages"><Chargement /></Ecran>
  return <Liste />
}
