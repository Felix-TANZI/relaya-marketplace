// Écran « Valide la demande sur ton téléphone » (CL-08), repris pour l'usage réel (DP-54) : la commande (?ref=…)
// attend la validation Mobile Money ; le délai se décompte (15 min) ; « J'ai validé » vérifie et confirme ;
// « Renvoyer la demande » relance le délai ; délai passé : échec « expire », rien n'est débité ; « Changer de
// moyen » revient au paiement. Au comptoir, seule la livraison est demandée maintenant.
// Pour le client (DP-54) : le délai vient de la demande (compte à rebours réel, minutes et secondes), le récapitulatif
// (commande, montant exact, opérateur, numéro, livraison), quoi faire si rien n'arrive (codes de l'opérateur, solde,
// réseau, numéro), renvoi qui relance vraiment la demande, annulation confirmée (rien n'est débité, panier gardé),
// rappel de sécurité sur le code secret, lien vers l'aide.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Bouton } from '../../composants/socle'
import { chemin } from '../../config/pages'
import { source, type CommandePassee } from '../../donnees/source'
import { F } from '../../i18n/format'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

export function PaiementAttente() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ref = params.get('ref')
  const [c, setCommande] = useState<CommandePassee | null | undefined>(undefined)
  const [ecart, setEcart] = useState(0) // horloge de la source moins celle de l'appareil

  const [maintenant, setMaintenant] = useState(Date.now())
  const [verif, setVerif] = useState(false)
  const [renvoi, setRenvoi] = useState(false)
  const [annuler, setAnnuler] = useState(false)
  useEffect(() => {
    if (ref) source.commandePassee(ref).then((x) => (setCommande(x), x?.lu && setEcart(x.lu - Date.now())))
    else setCommande(null)
  }, [ref])
  useEffect(() => {
    const i = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  // Le délai est celui de la demande envoyée à l'opérateur (PAY-TVAL), pas un minuteur de l'écran.
  const expire = c ? c.expire - ecart : null
  const fini = !!expire && maintenant >= expire
  useEffect(() => {
    if (c?.etat === 'payee') naviguer(chemin(c.comptoir ? 'validee' : 'confirmee', { ref: c.ref }), { replace: true })
  }, [c, naviguer])
  useEffect(() => {
    if (c && c.etat === 'attente' && fini) source.echouerPaiement(c.ref, 'expire').then(() => naviguer(chemin('paiement-echec', { ref: c.ref, cause: 'expire' }), { replace: true }))
  }, [c, fini, naviguer])
  if (c === undefined) return null
  if (!c)
    return (
      <Ecran route="paiement-attente" gabarit="centre">
        <div className="card">
          <div className="empty">
            <h3>{t('Aucun paiement en cours')}</h3>
            <div className="btns">
              <Link to={chemin('panier')} className="btn primary">
                <span>{t('Revenir au panier')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  if (c.etat === 'payee') return null
  const reste = Math.max(0, (expire ?? maintenant) - maintenant)
  const orange = c.moyen === 'orange' || (c.numero ?? '').startsWith('6 5') || (c.numero ?? '').startsWith('6 9')
  const sec = Math.ceil(reste / 1000)
  const compte = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const presque = sec <= 120
  const valider = async () => {
    setVerif(true)
    const r = await source.confirmerPaiement(c.ref)
    naviguer(chemin(r.comptoir ? 'validee' : 'confirmee', { ref: r.ref }), { replace: true })
  }
  const relancer = async () => {
    const x = await source.relancerPaiement(c.ref)
    setCommande(x)
    if (x.lu) setEcart(x.lu - Date.now())
    setRenvoi(true)
  }
  const abandonner = () => source.annulerPaiement(c.ref).then(() => naviguer(chemin('panier'), { replace: true }))
  const operateurNom = orange ? 'Orange Money' : 'MTN MoMo'
  const feuilleAnnuler = (
    <Feuille ouverte={annuler} fermer={() => setAnnuler(false)} titre={t('Annuler ce paiement')}>
      <h3 className="t17 b8" style={{ margin: '0' }}>
        {t('Annuler ce paiement ?')}
      </h3>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('La demande est retirée : rien n’est débité. Ton panier reste intact, tu pourras payer plus tard ou avec un autre moyen.')}
      </p>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Si la demande s’affiche quand même sur ton téléphone, refuse-la ou laisse-la expirer.')}
      </p>
      <div className="mt16">
        <Bouton genre="danger" icone="x" onClick={abandonner}>
          {t('Annuler le paiement')}
        </Bouton>
      </div>
      <div className="mt10">
        <Bouton genre="secondary" icone="credit-card" vers={chemin('paiement-moyen')}>
          {t('Payer avec un autre moyen')}
        </Bouton>
      </div>
      <div className="mt10">
        <Bouton genre="ghost" onClick={() => setAnnuler(false)}>
          {t('Continuer d’attendre')}
        </Bouton>
      </div>
    </Feuille>
  )

  return (
    <Ecran route="paiement-attente" gabarit="centre" fixes={feuilleAnnuler}>
      <div className="cl08-fill">
        <Link to={chemin('paiement-moyen')} className="cl08-tl" onClick={(e) => (e.preventDefault(), setAnnuler(true))}>
          {t('Annuler')}
        </Link>
        <div className="cl08-hero">
          <div className="cl08-ring ">
            <Icone nom="smartphone" taille={40} trait={1.8} />
          </div>
          <h1 className="cl08-h1">{t('Valide la demande sur ton téléphone')}</h1>
          <p className="cl08-lead">
            {t('Une demande de paiement de ')}
            <b>{F(c.montant)} F</b>
            {t(orange ? ' a été envoyée au numéro Orange Money ' : ' a été envoyée au numéro MTN MoMo ')}
            <b className="cl08-tel">{c.numero}</b>
            {t(orange ? '. Saisis ton code secret Orange Money pour confirmer.' : '. Saisis ton code secret MoMo pour confirmer.')}
          </p>
          {c.comptoir && <p className="t13 c3">{tf('Livraison seulement : {r} F se paient au retrait, au comptoir.', { r: F(c.dueAuRetrait) })}</p>}
        </div>
        <div className="card cl08-wait" role="timer" aria-live="off">
          <span className="cl08-spin"></span>
          <div className="grow">
            <b>{t(verif ? 'Vérification auprès de l’opérateur…' : 'En attente de ta validation')}</b>
            <span className="s">{tf('Expire dans {m} · à {h}', { m: compte, h: heureSeule(expire ?? maintenant, langue) })}</span>
          </div>
        </div>
        {presque && !verif && (
          <div className="note amber" role="status">
            <Icone nom="clock" taille={18} />
            <div>{t('Moins de 2 minutes : valide maintenant, ou renvoie la demande pour avoir de nouveau tout le temps.')}</div>
          </div>
        )}
        {renvoi && (
          <div className="note green" role="status">
            <Icone nom="check" taille={18} />
            <div>{t('Nouvelle demande envoyée : l’ancienne est annulée, jamais deux débits.')}</div>
          </div>
        )}
        <div className="card">
          <div className="kv">
            <span className="k">{t('Commande')}</span>
            <span className="v">{c.ref}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Montant demandé')}</span>
            <span className="v">{F(c.montant)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Opérateur')}</span>
            <span className="v">{t(operateurNom)}</span>
          </div>
          {c.numero && (
            <div className="kv">
              <span className="k">{t('Numéro débité')}</span>
              <span className="v nw">{c.numero}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">{t(c.mode === 'domicile' ? 'Livraison à' : 'Retrait au')}</span>
            <span className="v">{t(c.lieu)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Articles')}</span>
            <span className="v">{tf(c.colis > 1 ? '{a} · {n} colis' : '{a} · 1 colis', { a: c.articles, n: c.colis })}</span>
          </div>
        </div>
        <div className="card cl08-help">
          <div className="cl08-kl">{t('Si rien ne s’affiche sur ton écran')}</div>
          <p>
            {t('Compose ')}
            <b className="cl08-uc">{orange ? '#150*50#' : '*126#'}</b>
            {t(orange ? ' (Orange, ou #150# puis le menu Orange Money), puis valide la demande de BelivaY avec ton code secret.' : ' (MTN), puis valide la demande de BelivaY avec ton code secret.')}
          </p>
          <p>{tf('Vérifie aussi : ton solde couvre {m} F, ton téléphone capte le réseau, et le numéro {n} est bien celui de ton compte {o}.', { m: F(c.montant), n: c.numero ?? '', o: t(operateurNom) })}</p>
          <p>{t('Toujours rien après une minute ? Renvoie la demande : l’ancienne est annulée.')}</p>
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (verif ? ' off' : '')} onClick={valider}>
            <Icone nom="circle-check" taille={18} />
            <span>{t('J’ai validé sur mon téléphone')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn secondary cl08-ob cl08-out" onClick={relancer}>
            <Icone nom="refresh-cw" taille={18} />
            <span>{t('Rien reçu ? Renvoyer la demande')}</span>
          </button>
        </div>
        <div className="btns">
          <button
            type="button"
            className="btn secondary cl08-out mute"
            onClick={() => source.echouerPaiement(c.ref, 'solde').then(() => naviguer(chemin('paiement-echec', { ref: c.ref, cause: 'solde' }), { replace: true }))}
          >
            <span>{t('Mon solde est insuffisant')}</span>
          </button>
        </div>
        <div className="links">
          <Link to={chemin('paiement-moyen')}>{t('Changer de moyen de paiement')}</Link>
          <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
        </div>
        <div className="cl08-bot">
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>{t('Rien n’est débité tant que tu n’as pas validé. Ton panier reste intact si tu abandonnes.')}</div>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Ton code secret se tape seulement sur ton téléphone. BelivaY ne le demande jamais, ni par appel, ni par SMS, ni par WhatsApp.')}</span>
          </div>
        </div>
      </div>
    </Ecran>
  )
}
