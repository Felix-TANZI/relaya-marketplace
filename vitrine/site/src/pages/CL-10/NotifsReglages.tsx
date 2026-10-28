// Écran « Réglage des notifications » (CL-10), balisage et logique du prototype du 1er octobre (route
// notifs-reglages), repris à la main et rendu logique (DP-53) :
// - Messages, Suivi et Promotions s'allument et s'éteignent, enregistrés sur le compte (« Enregistré sur ton
//   compte : Suivi désactivé ») ; Commande, Retrait, Incident et Paiement ne se désactivent pas : les toucher
//   explique pourquoi (« ?st=verrou&k=… ») ;
// - canal de repli : SMS ou WhatsApp (disponible ; accord demandé, « ?st=whatsapp »), message d'essai ;
// - heures calmes (sans son, sauf alerte critique) et autorisation des notifications du téléphone ;
// - numéro de notification : celui du compte, masqué ; sans numéro vérifié, aucun SMS ne part (« ?st=nonverifie »
//   le montre en démonstration) ;
// - « ?from=notifications » : ouvert depuis les notifications, le retour y ramène (gardé par chaque lien) ;
// - DP-54 : « Ne garder que l'essentiel » éteint d'un coup Messages, Suivi et Promotions ; les heures calmes
//   affichées dans l'explication suivent celles choisies ; langue des messages réglable (Réglages) ; rappel :
//   un vrai message de BelivaY ne demande jamais un code, et le code de retrait ne passe jamais par WhatsApp.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { activerPush, etatPush } from '../../connecteurs/push'
import { chemin } from '../../config/pages'
import { source, type ChoixNotifications, type ReglagesNotifications } from '../../donnees/source'
import { usePreferences } from '../../preferences'

// Alertes critiques : elles protègent la commande et l'argent.
const CRITIQUES = [
  { k: 'commande', nom: 'Commande', sous: 'Validée, annulée, relais changé', pourquoi: 'Il te dit quand ta commande est validée ou annulée, et quand ton relais change.' },
  { k: 'retrait', nom: 'Retrait', sous: 'Arrivée, code, frais de garde', pourquoi: 'Il te dit que ton colis t’attend et combien tu dois, avant tout frais de garde.' },
  { k: 'incident', nom: 'Incident', sous: 'Retard, rupture, litige', pourquoi: 'Il te prévient d’un retard, d’une rupture ou d’un litige, à temps pour agir.' },
  { k: 'paiement', nom: 'Paiement', sous: 'Paiement protégé, remboursement', pourquoi: 'Il te confirme que ton argent est protégé, et quand un remboursement arrive.' },
]
// Celles qui se règlent ; « accord » : la fin du participe (« Messages désactivés »).
const REGLABLES: { k: keyof ChoixNotifications; nom: string; sous: string; accord: string }[] = [
  { k: 'messages', nom: 'Messages', sous: 'Support, vendeur, alertes « Préviens-moi »', accord: 's' },
  { k: 'suivi', nom: 'Suivi', sous: 'Préparation, colis en route', accord: '' },
  { k: 'promotions', nom: 'Promotions', sous: '3 par semaine, de 9 h à 20 h, jamais par SMS', accord: 'es' },
]

// Message montré après un enregistrement.
function Toast({ texte }: { texte: string }) {
  return (
    <div className="cl10-toast" role="status">
      <Icone nom="circle-check" taille={18} />
      <span>{texte}</span>
    </div>
  )
}

// Autorisation des notifications du téléphone (navigateur ou application) : sans elle, rien n'arrive quand
// l'application est fermée, sauf par SMS ou WhatsApp.
function PermissionTelephone() {
  const { t } = usePreferences()
  const lire = etatPush
  const [etat, setEtat] = useState<string>(lire)
  if (etat === 'granted') return null
  return (
    <div className="note amber">
      <Icone nom="bell-off" taille={18} />
      <div>
        <b>{t(etat === 'denied' ? 'Notifications bloquées sur ce téléphone.' : 'Notifications pas encore autorisées sur ce téléphone.')}</b>
        {t(etat === 'denied' ? ' Débloque-les dans les réglages du téléphone ; en attendant, le SMS ou WhatsApp te préviennent.' : ' Autorise-les pour être prévenu tout de suite, gratuitement.')}
        {etat === 'default' && (
          <div className="mt8">
            <button type="button" className="btn secondary sm" style={{ width: 'auto' }} onClick={() => activerPush({ titre: t('Notifications activées'), corps: t('BelivaY te préviendra ici de tes commandes et de tes retraits.'), lien: chemin('notifs-reglages') }).then(setEtat)}>
              <Icone nom="bell" taille={16} />
              <span>{t('Autoriser les notifications')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function NotifsReglages() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const colonnes = useDes('tab-l')
  const st = params.get('st')
  const from = params.get('from')
  const [d, setD] = useState<ReglagesNotifications | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    source.notifications().then(setD)
  }, [])
  useEffect(() => {
    if (!toast) return
    const fin = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(fin)
  }, [toast])
  if (!d) return null
  // Adresse de l'écran avec ses paramètres (« from » gardé).
  const ici = (p: Record<string, string> = {}) => chemin('notifs-reglages', { ...p, ...(from ? { from } : {}) })
  const fermer = () => naviguer(ici(), { replace: true })
  // « ?st=enregistre » : l'état du prototype (Suivi vient d'être désactivé) ; « ?st=nonverifie » : sans numéro vérifié.
  const choix: ChoixNotifications = st === 'enregistre' ? { ...d.choix, suivi: false } : d.choix
  const verifie = d.verifie && st !== 'nonverifie'
  const basculer = async (e: MouseEvent, r: (typeof REGLABLES)[number]) => {
    e.preventDefault()
    const actif = !choix[r.k]
    const nouveau = await source.reglerNotification(r.k, actif)
    setD({ ...d, choix: nouveau })
    setToast(tf('Enregistré sur ton compte\u00A0: {nom} ' + (actif ? 'activé' : 'désactivé') + r.accord, { nom: t(r.nom) }))
    if (st === 'enregistre') naviguer(ici(), { replace: true })
  }
  // Tout ce qui se règle s'éteint d'un coup ; les alertes critiques restent.
  const essentiel = async (e: MouseEvent) => {
    e.preventDefault()
    let nouveau = d.choix
    for (const r of REGLABLES) if (d.choix[r.k]) nouveau = await source.reglerNotification(r.k, false)
    setD({ ...d, choix: nouveau })
    setToast(t('Enregistré sur ton compte : seulement l’essentiel'))
    if (st === 'enregistre') naviguer(ici(), { replace: true })
  }
  const critique = CRITIQUES.find((c) => c.k === params.get('k')) ?? CRITIQUES[1]
  const etat = from ? 'notifs-reglages?from=notifications' : st && ['verrou', 'whatsapp', 'enregistre', 'nonverifie'].includes(st) ? `notifs-reglages?st=${st}` : 'notifs-reglages'
  const fixes =
    st === 'verrou' ? (
      <Feuille ouverte fermer={fermer} titre={tf('« {nom} » reste activé', { nom: t(critique.nom) })}>
        <div className="ic-sq or" style={{ margin: '0 auto' }}>
          <Icone nom="lock" taille={22} />
        </div>
        <h3 className="center t17 b8 mt12" style={{ marginBottom: '0' }}>
          {critique.k === 'retrait' ? t('« Retrait » reste activé') : tf('« {nom} » reste activé', { nom: t(critique.nom) })}
        </h3>
        <p className="t14 c2 center mt8" style={{ lineHeight: '1.5' }}>
          {t(critique.pourquoi)}
        </p>
        <p className="t13 c3 center" style={{ lineHeight: '1.5' }}>
          {t('Commande, Retrait, Incident et Paiement ne se désactivent pas.')}
        </p>
        <div className="btns">
          <Link to={ici()} className="btn primary" replace>
            <span>{t('Compris')}</span>
          </Link>
        </div>
      </Feuille>
    ) : st === 'whatsapp' ? (
      // WhatsApp (disponible) : avec l'accord du client, sur le numéro du compte ; le code de retrait n'y passe jamais.
      <Feuille ouverte fermer={fermer} titre={t('Recevoir les messages sur WhatsApp')}>
        <div className="ic-sq green" style={{ margin: '0 auto' }}>
          <Icone nom="message-circle" taille={22} />
        </div>
        <h3 className="center t17 b8 mt12" style={{ marginBottom: '0' }}>
          {t('Recevoir les messages sur WhatsApp\u00A0?')}
        </h3>
        <p className="t14 c2 center mt8" style={{ lineHeight: '1.5' }}>
          {d.numero ? tf('Sur le {n}, quand l’application est fermée. Gratuit, et ça arrive même avec peu de réseau.', { n: d.numero }) : t('Vérifie d’abord ton numéro : WhatsApp utilise le numéro du compte.')}
        </p>
        <div className="mt12">
          {[
            [true, 'Arrivée de ton colis, suivi, rappels de garde'],
            [true, 'Réponses du support et de tes dossiers'],
            [false, 'Jamais ton code de retrait : il reste dans l’application et par SMS'],
            [false, 'Jamais de commande, de paiement ni de photo de litige'],
          ].map(([ok, x]) => (
            <div key={String(x)} className="check">
              <span className="cb" style={{ borderColor: ok ? 'var(--green-line)' : 'var(--red-line)', color: ok ? 'var(--green)' : 'var(--red)' }}>
                <Icone nom={ok ? 'check' : 'x'} taille={14} trait={3} />
              </span>
              <span className="grow">{t(String(x))}</span>
            </div>
          ))}
        </div>
        <div className="btns">
          <button
            type="button"
            className={'btn primary' + (d.numero ? '' : ' off')}
            onClick={async () => {
              if (!d.numero) return
              await source.reglerCanal('whatsapp')
              setD({ ...d, canal: 'whatsapp' })
              setToast(t('Enregistré sur ton compte : WhatsApp quand l’application est fermée'))
              fermer()
            }}
          >
            <Icone nom="check" taille={18} />
            <span>{t('J’accepte : utiliser WhatsApp')}</span>
          </button>
        </div>
        <div className="links">
          <Link to={ici()} replace>
            {t('Garder le SMS')}
          </Link>
        </div>
        <p className="t12 c3 center">{t('Tu peux revenir au SMS à tout moment, ici.')}</p>
      </Feuille>
    ) : toast ? (
      <Toast texte={toast} />
    ) : st === 'enregistre' ? (
      <Toast texte={t('Enregistré sur ton compte : Suivi désactivé')} />
    ) : null
  const bNonVerifie = (
    <>
      {!verifie && (
        <div className="note amber">
          <Icone nom="circle-alert" taille={18} />
          <div>
            <b>{t('Numéro non vérifié.')}</b>
            {t(' Aucun SMS ne part tant qu’il n’est pas vérifié. Les notifications de l’application arrivent.')}
          </div>
        </div>
      )}
    </>
  )
  const bCanal = (
    <>
      <div className="card ">
        <div className="cl10-ct">{t('Si l’application est fermée')}</div>
        <div className="cl10-cs">{t('On t’écrit par ce canal. Les notifications de l’application restent gratuites et prioritaires.')}</div>
        <div className="cl10-seg2" role="radiogroup" aria-label={t('Canal de repli')}>
          <a
            href={ici()}
            className={d.canal === 'sms' ? 'on' : ''}
            role="radio"
            aria-checked={d.canal === 'sms'}
            onClick={async (e) => {
              e.preventDefault()
              if (d.canal === 'sms') return
              await source.reglerCanal('sms')
              setD({ ...d, canal: 'sms' })
              setToast(t('Enregistré sur ton compte : SMS quand l’application est fermée'))
            }}
          >
            <Icone nom="message-square-text" taille={18} />
            <span>{t('SMS')}</span>
          </a>
          <Link to={ici({ st: 'whatsapp' })} className={d.canal === 'whatsapp' ? 'on' : ''} role="radio" aria-checked={d.canal === 'whatsapp'}>
            <Icone nom="message-circle" taille={18} />
            <span>{t('WhatsApp')}</span>
          </Link>
        </div>
        <div className="cl10-fn">
          {t(
            d.canal === 'whatsapp'
              ? 'WhatsApp arrive même avec peu de réseau. Ton code de retrait, lui, arrive toujours par SMS, avec un lien court vers le QR.'
              : 'Le SMS marche sans internet. Ton code de retrait y arrive, avec un lien court vers le QR.',
          )}
        </div>
        {d.numero && (
          <button
            type="button"
            className="btn ghost sm"
            style={{ width: 'auto', marginTop: 8 }}
            onClick={() => setToast(tf(d.canal === 'whatsapp' ? 'Message d’essai envoyé sur WhatsApp au {n}' : 'SMS d’essai envoyé au {n}', { n: d.numero! }))}
          >
            <Icone nom="send" taille={16} />
            <span>{t('M’envoyer un message d’essai')}</span>
          </button>
        )}
        <Link to={chemin('sms')} className="cl10-see">
          <Icone nom="eye" taille={15} />
          <span>{t('Voir un exemple de SMS')}</span>
        </Link>
      </div>
    </>
  )
  const bNumero = (
    <>
      <div className="card ">
        <div className="cl10-num">
          <span className="grow">
            <span className="l">{t('Numéro de notification')}</span>
            <span className="v">{verifie && d.numero ? t(d.numero) : t('Aucun numéro vérifié')}</span>
          </span>
          {verifie ? (
            <span className="pill green sm">
              <Icone nom="check" taille={13} />
              {t('Vérifié')}
            </span>
          ) : (
            <span className="pill amber sm">{t('Non vérifié')}</span>
          )}
        </div>
        {verifie ? (
          <Link to={chemin('numero-changer')} className="cl10-nl">
            <Icone nom="pencil" taille={18} />
            <span className="grow">{t('Changer de numéro')}</span>
            <Icone nom="chevron-right" taille={18} />
          </Link>
        ) : (
          <div className="btns" style={{ marginTop: '12px' }}>
            <Link to={chemin('numero')} className="btn primary">
              <Icone nom="shield-check" taille={18} />
              <span>{t('Vérifier mon numéro')}</span>
            </Link>
          </div>
        )}
      </div>
    </>
  )
  const bRecois = (
    <>
      <div className="card ">
        <div className="cl10-k">{t('Ce que tu reçois')}</div>
        {CRITIQUES.map((c) => (
          <div key={c.k} className="cl10-rx">
            <span className="grow">
              <span className="rt">{t(c.nom)}</span>
              <span className="rs">
                {t(c.sous)}
                <span className="cl10-nd">
                  <Icone nom="lock" taille={12} />
                  <span>{t('non désactivable')}</span>
                </span>
              </span>
            </span>
            <Link to={ici({ st: 'verrou', k: c.k })} aria-label={`${t(c.nom)} : ${t('toujours activé')}`}>
              <button type="button" className="tg on lock" role="switch" aria-checked="true" aria-label={`${t(c.nom)} : ${t('toujours activé')}`}></button>
            </Link>
          </div>
        ))}
        {REGLABLES.map((r) => (
          <div key={r.k} className="cl10-rx">
            <span className="grow">
              <span className="rt">{t(r.nom)}</span>
              <span className="rs">{t(r.sous)}</span>
            </span>
            <Link to={ici()} aria-label={t(r.nom)} onClick={(e) => basculer(e, r)}>
              <button type="button" className={'tg' + (choix[r.k] ? ' on' : '')} role="switch" aria-checked={choix[r.k]} aria-label={t(r.nom)}></button>
            </Link>
          </div>
        ))}
        {REGLABLES.some((r) => choix[r.k]) ? (
          <div className="links" style={{ justifyContent: 'flex-start' }}>
            <a href={ici()} onClick={essentiel}>
              {t('Ne garder que l’essentiel')}
            </a>
          </div>
        ) : (
          <p className="t12 c3" style={{ margin: '8px 0 0', lineHeight: 1.45 }}>
            {t('Tu ne reçois que l’essentiel : ta commande, ton retrait, les incidents et les paiements.')}
          </p>
        )}
      </div>
    </>
  )
  const bCalme = (
    <>
      <div className="card vedette">
        <div className="cl10-k">{t('Heures calmes')}</div>
        <div className="cl10-rx">
          <span className="grow">
            <span className="rt">{t('Sans son la nuit')}</span>
            <span className="rs">{tf('De {d} h à {f} h, sauf une alerte critique (retrait, incident, paiement).', { d: d.calme.debut, f: d.calme.fin })}</span>
          </span>
          <button
            type="button"
            className={'tg' + (d.calme.actif ? ' on' : '')}
            role="switch"
            aria-checked={d.calme.actif}
            aria-label={t('Sans son la nuit')}
            onClick={(e) => {
              e.preventDefault()
              const calme = { ...d.calme, actif: !d.calme.actif }
              source.reglerCalme(calme).then(() => setD({ ...d, calme }))
            }}
          ></button>
        </div>
        {d.calme.actif && (
          <div className="chips">
            {[
              [21, 7],
              [22, 6],
              [20, 8],
            ].map(([a, b]) => (
              <a
                key={a}
                href="#"
                className={'chip' + (d.calme.debut === a ? ' on' : '')}
                aria-pressed={d.calme.debut === a}
                onClick={(e) => {
                  e.preventDefault()
                  const calme = { actif: true, debut: a, fin: b }
                  source.reglerCalme(calme).then(() => (setD({ ...d, calme }), setToast(tf('Enregistré sur ton compte : heures calmes de {d} h à {f} h', { d: a, f: b }))))
                }}
              >
                {a} h – {b} h
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  )
  const bPermission = (
    <>
      <PermissionTelephone />
    </>
  )
  const bNoteCritique = (
    <>
      <div className="note ink">
        <Icone nom="circle-alert" taille={18} />
        <div>
          {t('Les alertes critiques ne se désactivent pas, et ton code n’apparaît jamais sur l’écran verrouillé.')}
          <Link to={chemin('push')} className="cl10-see">
            <Icone nom="eye" taille={15} />
            <span>{t('Voir l’écran verrouillé')}</span>
          </Link>
        </div>
      </div>
    </>
  )
  const bNoteCode = (
    <>
      <div className="note red">
        <Icone nom="shield-alert" taille={18} />
        <div>
          <b>{t('Un vrai message de BelivaY ne te demande jamais un code.')}</b>
          {t(' Ni ton code secret Mobile Money, ni ton code de retrait, ni un code reçu par SMS. Ton code de retrait ne passe jamais par WhatsApp.')}
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Arnaque' })} className="cl10-see">
            <Icone nom="flag" taille={15} />
            <span>{t('Signaler un faux message')}</span>
          </Link>
        </div>
      </div>
    </>
  )
  const bLiens = (
    <>
      {!from && (
        <div className="links">
          <Link to={chemin('notifications')}>{t('Voir mes notifications')}</Link>
        </div>
      )}
    </>
  )
  const bComment = (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Quand et comment tu es prévenu')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Ce réglage suit ton compte, sur chaque téléphone.')}</p>
          <p>
            {t('D’abord une notification de l’application, gratuite. Un SMS seulement quand c’est vital : ')}
            <b>{t('6 au plus par commande')}</b>
            {t(', jamais de publicité.')}
          </p>
          <p>{t('Une alerte critique non ouverte après 10 minutes repart par SMS.')}</p>
          <p>
            {t('Deux nouvelles d’une même commande à moins de 10 minutes n’en font qu’une. Au plus 5 notifications non critiques par 24 h.')}
            <Link to={chemin('push', { st: 'groupe' })} className="cl10-see">
              <Icone nom="eye" taille={15} />
              <span>{t('Voir l’aperçu')}</span>
            </Link>
          </p>
          <p>
            {t('De 21 h à 7 h, elles arrivent sans son, sauf une alerte critique.')}
            <Link to={chemin('push', { st: 'nuit' })} className="cl10-see">
              <Icone nom="eye" taille={15} />
              <span>{t('Voir l’aperçu')}</span>
            </Link>
          </p>
          <p>
            {t('Messages en français ou en anglais, selon la langue de ton compte.')}
            <Link to={chemin('reglages')} className="cl10-see">
              <Icone nom="languages" taille={15} />
              <span>{t('Changer la langue')}</span>
            </Link>
          </p>
        </div>
      </details>
    </>
  )
  return (
    <Ecran route="notifs-reglages" parEtat etat={etat} fixes={fixes} gabarit="compte">
      {colonnes ? (
        // Grands écrans (§ 5.9) : gabarit du compte ; les interrupteurs à gauche, le canal de repli, le numéro et le
        // message d'essai à droite.
        <div className="cl10-2c">
          <div>
            {bRecois}
            {bCalme}
            {bPermission}
            {bComment}
          </div>
          <div>
            {bNonVerifie}
            {bCanal}
            {bNumero}
            {bNoteCritique}
            {bNoteCode}
            {bLiens}
          </div>
        </div>
      ) : (
        <>
          {bNonVerifie}
          {bCanal}
          {bNumero}
          {bRecois}
          {bCalme}
          {bPermission}
          {bNoteCritique}
          {bNoteCode}
          {bLiens}
          {bComment}
        </>
      )}
    </Ecran>
  )
}
