// PR-08 · Notifications (cloche de l'en-tête). Structure du prototype intacte (Notifications, Fig. 1) : titre et
// sous-titre, résumé du matin encadré d'or (colis à recevoir, retraits attendus, renvois, places libres), « À TRAITER »
// (point orange = non lue), « POUR INFORMATION », carte « Réglages » (push, livreur en approche, versements, heure du
// résumé, heures calmes, score et sanctions).
// Règles : NTF-01 (résumé jamais avant 7 h), NTF-02/NOT-01 (une notification par action), NTF-03 (approche
// PR-NTF-APPROCHE-MIN), NTF-04 (critique jamais coupé), NTF-05/NOT-02 (toucher = écran concerné, marquée lue), NTF-06/
// NOT-03 (ni code ni montant), NTF-07 (heures calmes sauf l'urgent), NTF-08 (sanction avec « Contester », score toujours
// actif), PR-RC-20 (modèles FR/EN), ARL-06 (l'employé ne reçoit rien d'argent ni de score).
// Enrichi : « Tout marquer comme lu », ce qu'il est advenu du push (différé, coupé), « Contester » sur une sanction
// proposée, ligne « Toujours » des actions critiques, autorisation des notifications du téléphone, états vide,
// chargement, erreur et hors connexion.
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { Notification, ReglageNotification, RubriqueNotification } from '../../donnees/domaines/notifications'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences, type Langue } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { Chargement, ErreurLecture, quand, useTexte } from './commun'
import './pr08.css'

/** Icône et teinte de la ligne selon la rubrique (classes du prototype). */
function apparence(n: Notification): { boite: string; trait: string; icone: string } {
  const R: Record<RubriqueNotification, [string, string, string]> = {
    reception: ['p-i7mkvp', 'p-672m16', 'r-camion'],
    retrait: ['p-i7mkvp', 'p-672m16', 'r-cle'],
    departs: ['p-8177t3', 'p-woejqv', 'r-annuler'],
    incidents: ['p-llm0b3', 'p-lhsznn', 'r-balance'],
    argent: ['p-me0s4z', 'p-q7qjlz', 'r-carte-paiement'],
    qualite: ['p-ldeopk', 'p-rd23br', 'r-bouclier'],
    compte: ['p-ldeopk', 'p-rd23br', 'r-document'],
    panne: ['p-8177t3', 'p-woejqv', 'r-reseau'],
    messages: ['p-i7mkvp', 'p-672m16', 'r-message'],
    capacite: ['p-llm0b3', 'p-lhsznn', 'r-pile'],
  }
  let [boite, trait, icone] = R[n.rubrique]
  if (n.modele === 'relais.seuil_proche') [boite, trait, icone] = ['p-llm0b3', 'p-lhsznn', 'r-alerte']
  if (n.modele === 'relais.sanction_proposee') [boite, trait] = ['p-8177t3', 'p-woejqv']
  return { boite, trait, icone }
}

/** « 7 h », « 7 h 30 » (fr) ; « 7 am » (en). */
const heureResume = (hhmm: string, l: Langue) => {
  if (l === 'en') return heure(hhmm, 'en')
  const [h, m] = hhmm.split(':').map(Number)
  return `${h} h${m ? ' ' + String(m).padStart(2, '0') : ''}`
}

function Ligne({ n, maintenant }: { n: Notification; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const tx = useTexte()
  const naviguer = useNavigate()
  const a = apparence(n)
  const ouvrir = async () => {
    signal('toucher')
    if (!n.lue) await source.notifications.lire(n.id)
    naviguer(chemin(n.route, n.params))
  }
  const q = quand(n.quand, maintenant, langue)
  const push =
    n.push.etat === 'differe' && n.push.a !== null && n.push.a > maintenant
      ? tf('Push différé à {h} (heures calmes)', { h: heure(n.push.a, langue) })
      : n.push.etat === 'coupe'
        ? t('Sans push : réglage coupé')
        : null
  return (
    <div>
      <button type="button" className={'p-ek1p8z pr08-ligne' + (n.lue ? ' pr08-lue' : '')} onClick={() => void ouvrir()} aria-label={`${tx(n.titre)}. ${tx(n.texte)}. ${q}${n.lue ? '' : ', ' + t('non lue')}`}>
        <div className={a.boite} aria-hidden="true">
          <Icone nom={a.icone} taille={19} className={a.trait} />
        </div>
        <div className="p-lmo74g">
          <div className="p-bxuikp">
            <div className="p-dfc4i3">{tx(n.titre)}</div>
            <div className="p-07ygos">{q}</div>
          </div>
          <div className="p-ke2wzq">{tx(n.texte)}</div>
          {push && (
            <div className="pr08-push">
              <Icone nom={n.push.etat === 'coupe' ? 'bell-off' : 'r-lune'} taille={14} />
              {push}
            </div>
          )}
        </div>
        {!n.lue && <span className="p-byvapn" aria-hidden="true" />}
      </button>
      {n.action && (
        <div className="pr08-action">
          <Link className="pr08-btn pr08-accent" to={chemin(n.action.route, n.action.params)} onClick={() => void source.notifications.lire(n.id)}>
            <Icone nom="r-balance" taille={16} />
            {tx(n.action.libelle)}
          </Link>
        </div>
      )}
    </div>
  )
}

function Carte({ liste, maintenant, vide }: { liste: Notification[]; maintenant: number; vide: string }) {
  return (
    <div className="p-yi6rkz">
      {liste.length === 0 ? (
        <div className="p-ek1p8z">
          <div className="p-me0s4z" aria-hidden="true">
            <Icone nom="check" taille={19} className="p-q7qjlz" />
          </div>
          <div className="p-lmo74g">
            <div className="p-ke2wzq">{vide}</div>
          </div>
        </div>
      ) : (
        liste.map((n, i) => (
          <div key={n.id}>
            {i > 0 && <div className="p-92xvtp" style={{ marginBottom: 12 }} />}
            <Ligne n={n} maintenant={maintenant} />
          </div>
        ))
      )}
    </div>
  )
}

/** Interrupteur du prototype (p-tm3tpi), rôle « switch ». */
function Interrupteur(p: { on: boolean; libelle: string; changer: (v: boolean) => void; occupe: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={p.on} aria-label={p.libelle} className="p-tm3tpi pr08-inter pr08-cible" disabled={p.occupe} onClick={() => p.changer(!p.on)}>
      <span className="p-u2ffel" />
    </button>
  )
}

/** Autorisation des notifications de ce téléphone (sans elle, aucun push n'arrive, même réglé). */
function Autorisation() {
  const { t } = usePreferences()
  const dispo = typeof Notification !== 'undefined'
  const [etat, setEtat] = useState<NotificationPermission | 'absent'>(() => (dispo ? Notification.permission : 'absent'))
  if (etat === 'granted') return null
  if (etat === 'absent') return <div className="pr08-note">{t('Ce navigateur ne reçoit pas les notifications : installez l’application pour les recevoir.')}</div>
  if (etat === 'denied') return <div className="pr08-note">{t('Notifications bloquées sur ce téléphone : autorisez-les dans les réglages du téléphone.')}</div>
  return (
    <button
      type="button"
      className="pr08-btn pr08-accent"
      onClick={async () => {
        const r = await Notification.requestPermission()
        setEtat(r)
        signal(r === 'granted' ? 'succes' : 'toucher')
      }}
    >
      <Icone nom="bell-ring" taille={16} />
      {t('Autoriser les notifications sur ce téléphone')}
    </button>
  )
}

export default function Notifications() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const en = useEnLigne()
  const maintenant = useHorloge()
  const l = useLecture(() => source.notifications.centre(), [])
  const [occupe, setOccupe] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const idHeure = useId()
  if (l.erreur && !l.donnees)
    return (
      <Ecran route="notifications">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="notifications">
        <Chargement lignes={4} />
      </Ecran>
    )
  const { notifications: liste, resume: r, reglages: g } = l.donnees
  const aTraiter = liste.filter((n) => n.aTraiter)
  const info = liste.filter((n) => !n.aTraiter)
  const nonLues = liste.filter((n) => !n.lue).length
  const gerant = s.membre?.role === 'proprietaire'

  const regler = async (x: ReglageNotification) => {
    setOccupe(true)
    setRefus(null)
    try {
      const res = await geste(en, 'reglage', 'notifications', origine(maintenant), (src) => src.notifications.regler(x, origine(maintenant)), { local: true })
      if (res.etat === 'fait' && !res.r.ok) {
        setRefus(t(res.r.raison === 'trop_tot' ? 'Le résumé ne part jamais avant 7 h.' : res.r.raison === 'trop_tard' ? 'Le résumé arrive avant l’ouverture du relais.' : 'Réglage réservé au gérant.'))
        signal('erreur')
      } else signal('succes')
      l.relire()
    } finally {
      setOccupe(false)
    }
  }
  const toutLire = async () => {
    await source.notifications.toutLire()
    signal('succes')
    l.relire()
  }
  // Heures possibles du résumé : de PR-NTF-RESUME-H à l'ouverture du relais, par demi-heure.
  const heures: string[] = []
  for (let m = toMin(g.heureResumeMin); m <= toMin(g.heureResumeMax); m += 30) heures.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  if (!heures.includes(g.heureResume)) heures.push(g.heureResume)

  return (
    <Ecran route="notifications">
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t('Notifications')}</h1>
          <div className="p-t2u0o2">{t('Un résumé le matin, puis un message seulement quand il faut agir.')}</div>
          <div className="p-bxuikp" style={{ alignItems: 'center', marginTop: 8 }}>
            <span className="p-5g7m7p" role="status">
              {nonLues === 0 ? t('Tout est lu') : nonLues > 1 ? tf('{n} non lues', { n: nonLues }) : t('1 non lue')}
            </span>
            {nonLues > 0 && (
              <button type="button" className="pr08-lien-bloc pr08-ligne" style={{ width: 'auto' }} onClick={() => void toutLire()}>
                <Icone nom="check-check" taille={16} />
                {t('Tout marquer comme lu')}
              </button>
            )}
          </div>
          {!en && (
            <div className="pr08-ambre" data-hors-ligne="" role="status" style={{ marginTop: 10 }}>
              <Icone nom="r-reseau" taille={18} />
              <span>{t('Hors ligne : les notifications reçues avant la coupure restent ici ; les nouvelles arriveront au retour du réseau.')}</span>
            </div>
          )}
        </div>

        {r && (
          <div className="p-018ssc">
            <div className="p-9rmh6y">
              <div className="p-2ma8mc">{tf('RÉSUMÉ DU MATIN · {h}', { h: heureResume(g.heureResume, langue).toUpperCase() })}</div>
              <Icone nom="r-cloche" taille={19} className="p-l3w6sx" />
            </div>
            <div className="p-tkbi2p">
              <div className="p-x46ihd">
                <div className="p-wzc6ur">{(r.approximatif ? '≈ ' : '') + r.aRecevoir}</div>
                <div className="p-w6rvyz">{t('colis à recevoir')}</div>
              </div>
              <div className="p-x46ihd">
                <div className="p-wzc6ur">{r.retraitsAttendus}</div>
                <div className="p-w6rvyz">{t('retraits attendus')}</div>
              </div>
              <div className="p-x46ihd">
                <div className="p-wzc6ur">{r.renvois}</div>
                <div className="p-w6rvyz">{r.renvois > 1 ? t('renvois') : t('renvoi')}</div>
              </div>
            </div>
            <div className="p-5g7m7p">{r.placesLibres > 0 ? tf('{n} places libres ce matin. Bonne journée au guichet.', { n: r.placesLibres }) : t('Aucune place libre ce matin : faites partir les départs d’abord.')}</div>
          </div>
        )}

        <div className="p-yscrc8">{t('À TRAITER')}</div>
        <Carte liste={aTraiter} maintenant={maintenant} vide={t('Rien à traiter pour l’instant : vous serez prévenu dès qu’un geste est attendu.')} />

        <div className="p-yscrc8">{t('POUR INFORMATION')}</div>
        <Carte liste={info} maintenant={maintenant} vide={t('Aucune information récente.')} />

        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Réglages')}</h2>
          </div>
          {refus && (
            <div className="pr08-alerte" role="alert">
              <Icone nom="r-alerte" taille={18} />
              <span>{refus}</span>
            </div>
          )}
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-cloche" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Notifications push')}</div>
              <div className="p-dfa05r">{t('Gratuites, pour tout ce qui est à faire')}</div>
            </div>
            <Interrupteur on={g.push} libelle={t('Notifications push')} occupe={occupe} changer={(v) => void regler({ push: v })} />
          </div>
          <Autorisation />
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-camion" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Livreur en approche')}</div>
              <div className="p-dfa05r">{tf('{n} min avant son arrivée', { n: g.approcheMin })}</div>
            </div>
            <Interrupteur on={g.approche} libelle={t('Livreur en approche')} occupe={occupe} changer={(v) => void regler({ approche: v })} />
          </div>
          {g.versements !== null && (
            <>
              <div className="p-92xvtp" />
              <div className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-carte-paiement" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Versements')}</div>
                  <div className="p-dfa05r">{t('Envoi ou refus, sans montant : le détail est dans l’app')}</div>
                </div>
                <Interrupteur on={g.versements} libelle={t('Versements')} occupe={occupe} changer={(v) => void regler({ versements: v })} />
              </div>
            </>
          )}
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-annuler" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Colis à renvoyer, photo demandée, panne')}</div>
              <div className="p-dfa05r">{t('Une action qui ne peut pas attendre : jamais coupé')}</div>
            </div>
            <span className="p-rpzy79">{t('Toujours')}</span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-horloge" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <label className="p-ife3a2" htmlFor={idHeure}>
                {t('Heure du résumé')}
              </label>
              <div className="p-dfa05r">{tf('Réglable, jamais avant {h}, avant l’ouverture', { h: heureResume(g.heureResumeMin, langue) })}</div>
            </div>
            <select id={idHeure} className="p-rpzy79 pr08-select pr08-cible" value={g.heureResume} disabled={occupe} onChange={(e) => void regler({ heureResume: e.target.value })}>
              {heures.map((x) => (
                <option key={x} value={x}>
                  {heureResume(x, langue)}
                </option>
              ))}
            </select>
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-lune" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{t('Heures calmes')}</div>
              <div className="p-dfa05r">{tf('Rien entre {de} et {a}, sauf l’urgent', { de: heureResume(g.heuresCalmes.de, langue), a: heureResume(g.heuresCalmes.a, langue) })}</div>
            </div>
            <span className="p-rpzy79">{`${heureResume(g.heuresCalmes.de, langue)} – ${heureResume(g.heuresCalmes.a, langue)}`}</span>
          </div>
          {gerant && (
            <>
              <div className="p-92xvtp" />
              <div className="p-o24hsm">
                <div className="p-toppw8">
                  <Icone nom="r-bouclier" taille={20} className="p-672m16" />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t('Score et sanctions')}</div>
                  <div className="p-dfa05r">{t('Alerte avant un seuil, sanction ou descente proposée, avec « Contester »')}</div>
                </div>
                <span className="p-rpzy79">{t('Toujours')}</span>
              </div>
            </>
          )}
          <div className="pr08-note">{t('Aucune notification ne contient de code ni de montant : le détail s’ouvre dans l’application.')}</div>
        </div>
      </div>
    </Ecran>
  )
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
