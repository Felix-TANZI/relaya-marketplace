// Écran « Notifications » (CL-03), forme d'origine du prototype rendue réelle (DP-54) : après la commande, sa carte
// (retrait possible dès…, colis, lieu, avancement) et, posée dessus, la feuille « On te prévient quand tes colis
// arrivent ? » : ce qu'on reçoit (commande, retrait, incident, paiement : non désactivables ; messages, suivi,
// promotions — 3 par semaine au plus, jamais par SMS — réglés pour de vrai) ; « Activer » demande l'autorisation
// du téléphone ; refusée, impossible ou « Plus tard » : la feuille « On te prévient par SMS » (numéro vérifié) ;
// « Régler en détail » ouvre les réglages. La feuille SMS dit aussi la règle des petits paniers (sous 10 000 F :
// code de retrait et incident seulement).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { activerPush } from '../../connecteurs/push'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type ChoixNotifications, type CommandeClient } from '../../donnees/source'
import { quand } from '../../i18n/dates'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

const CHOIX: [keyof ChoixNotifications, string, string][] = [
  ['messages', 'Messages', 'Réponses du support et du vendeur'],
  ['suivi', 'Suivi', 'Préparation, prêt, récupéré par le livreur'],
  ['promotions', 'Promotions', '3 par semaine au plus. Jamais par SMS.'],
]
// SMS économes (DP, CSM-14) : sous ce sous-total, seuls les SMS essentiels partent (code de retrait, incident).
const SMS_ECO = 10000
const ETAPE: Record<string, number> = { paiement: 0, preparation: 0, route: 1, retirable: 2, comptoir: 2, retiree: 3 }

export function NotifsProposition() {
  const { t, tf, langue } = usePreferences()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const [d, setD] = useState<{ c: CommandeClient | null; premiere: boolean; maintenant: number } | null>(null)
  const [numero, setNumero] = useState<string | null>(null)
  const [choix, setChoix] = useState<ChoixNotifications | null>(null)
  const [sms, setSms] = useState(false)
  useEffect(() => {
    source.commandes().then((x) => {
      const ref = params.get('ref')
      const c = x.commandes.find((y) => (ref ? y.ref === ref : y.etat === 'preparation')) ?? null
      setD({ c, premiere: x.commandes.length === 1, maintenant: x.maintenant })
    })
    source.notifications().then((r) => (setNumero(r.verifie ? r.numero : null), setChoix(r.choix)))
  }, [params])
  const activer = async () => {
    // Autorisation du téléphone, puis abonnement push de l'appareil envoyé au serveur (src/connecteurs/push.ts).
    const etat = await activerPush({ titre: t('Notifications activées'), corps: t('BelivaY te préviendra ici de tes commandes et de tes retraits.'), lien: chemin('commandes') })
    if (etat === 'granted') naviguer(chemin('commandes'))
    else setSms(true)
  }
  const basculer = async (cle: keyof ChoixNotifications) => {
    if (!choix) return
    setChoix(await source.reglerNotification(cle, !choix[cle]))
  }
  const c = d?.c ?? null
  const feuille = sms ? (
    <>
      <div className="veil" onClick={() => naviguer(chemin('commandes'))}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('On te prévient par SMS')}>
        <div className="grab"></div>
        <Styles id="f16ded0d4c" />
        <div className="cl03-bigic ink">
          <Icone nom="message-square" taille={34} />
        </div>
        <h2 className="cl03-sheet-t cl03-center mt12">{t('On te prévient par SMS')}</h2>
        <p className="cl03-sheet-s cl03-center">{t('Paiement protégé, colis arrivé, rappels de garde, incident : l’essentiel de chaque commande arrive par SMS.')}</p>
        <div className="card tight">
          <div className="cl03-use">
            <span className="ui">
              <Icone nom="smartphone" taille={18} />
            </span>
            <span className="grow">{numero ? tf('SMS au {n} · vérifié', { n: numero }) : t('SMS à ton numéro, une fois vérifié')}</span>
          </div>
          <div className="cl03-use">
            <span className="ui">
              <Icone nom="lock" taille={18} />
            </span>
            <span className="grow">{t('Jamais de promotion par SMS')}</span>
          </div>
          <div className="cl03-use">
            <span className="ui">
              <Icone nom="info" taille={18} />
            </span>
            <span className="grow">{tf('Commande sous {s} F : seuls le code de retrait et un incident partent par SMS ; le reste arrive dans l’application.', { s: F(SMS_ECO) })}</span>
          </div>
        </div>
        <div className="mt14">
          <Link to={chemin('commandes')} className="btn primary">
            <Icone nom="check" taille={18} />
            <span>{t('Compris')}</span>
          </Link>
        </div>
        <div className="cl03-links">
          {!numero && (
            <Link to={chemin('numero', { from: 'notifs' })} className="cl03-link">
              {t('Vérifier mon numéro')}
            </Link>
          )}
          <a href="#" className="cl03-link" onClick={(e) => (e.preventDefault(), activer())}>
            {t('Activer les notifications')}
          </a>
        </div>
      </div>
    </>
  ) : (
    <>
      <div className="veil" onClick={() => setSms(true)}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('On te prévient quand tes colis arrivent ?')}>
        <div className="grab"></div>
        <Styles id="f16ded0d4c" />
        <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
          <span className="ic-sq or">
            <Icone nom="bell-ring" taille={22} />
          </span>
          <div className="grow">
            <h2 className="cl03-sheet-t">{t('On te prévient quand tes colis arrivent ?')}</h2>
            <p className="cl03-sheet-s">
              <span>{t(numero ? 'Gratuit. Si l’application est fermée, on t’écrit par SMS au' : 'Gratuit. Si l’application est fermée, on t’écrit par SMS.')}</span>
              {numero && (
                <>
                  {' '}
                  <span className="nw">{numero}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="card" style={{ marginTop: '14px', padding: '6px 14px' }}>
          <div className="cl03-k" style={{ padding: '8px 0 2px' }}>
            {t('Ce que tu reçois')}
          </div>
          <div className="cl03-sw">
            <span className="grow">
              <b>{t('Commande, retrait, incident, paiement')}</b>
              <small>
                <Icone nom="lock" taille={12} />
                {t(' non désactivables')}
              </small>
            </span>
            <button type="button" className="tg on lock green" role="switch" aria-checked="true" aria-disabled="true" aria-label={t('Commande, retrait, incident, paiement non désactivables')}></button>
          </div>
          {CHOIX.map(([cle, titre, sous]) => {
            const on = !!choix?.[cle]
            return (
              <div key={cle} className="cl03-sw">
                <span className="grow">
                  <b>{t(titre)}</b>
                  <small>{t(sous)}</small>
                </span>
                <button type="button" className={'tg' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={t(titre)} onClick={() => basculer(cle)}></button>
              </div>
            )
          })}
        </div>
        <div className="mt14">
          <button type="button" className="btn primary" onClick={activer}>
            <Icone nom="bell" taille={18} />
            <span>{t('Activer les notifications')}</span>
          </button>
        </div>
        <div className="cl03-links">
          <Link to={chemin('notifs-reglages', { from: 'notifications' })} className="cl03-link">
            {t('Régler en détail')}
          </Link>
          <a href="#" className="cl03-link" onClick={(e) => (e.preventDefault(), setSms(true))}>
            {t('Plus tard')}
          </a>
        </div>
      </div>
    </>
  )
  return (
    <Ecran route="notifs-proposition" sousTitre={c?.ref ?? null} fixes={feuille}>
      <Styles id="f16ded0d4c" />
      {c && (
        <Link to={chemin('suivi', { ref: c.ref })} className="card" style={{ marginTop: '14px', display: 'block', color: 'inherit' }}>
          <div className="t12 b8 c3" style={{ letterSpacing: '.07em', textTransform: 'uppercase' }}>
            {d?.premiere ? t('Ta première commande') : tf('Ta commande {ref}', { ref: c.ref })}
          </div>
          <div className="b8 mt6" style={{ fontSize: '20px', letterSpacing: '-.02em' }}>
            {c.pretLe ? tf(c.mode === 'relais' ? 'Retrait possible {q}' : 'Livraison prévue {q}', { q: quand(c.pretLe, d!.maintenant, langue).replace(/ (à|at) /, langue === 'en' ? ' from ' : ' dès ') }) : t(c.mode === 'relais' ? 'En route vers ton relais' : 'En route vers chez toi')}
          </div>
          <div className="t13 c3 mt6">{tf('{n} colis · {l}', { n: c.colis.length, l: t(c.lieu) })}</div>
          <div className="gauge">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < (ETAPE[c.etat] ?? 0) ? 'on' : i === (ETAPE[c.etat] ?? 0) ? 'on cur' : ''}></i>
            ))}
          </div>
        </Link>
      )}
    </Ecran>
  )
}
