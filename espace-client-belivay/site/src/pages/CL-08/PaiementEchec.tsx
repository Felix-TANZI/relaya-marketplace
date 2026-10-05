// Écran « Paiement non abouti » (CL-08), forme d'origine du prototype rendue réelle (DP-54) : la commande
// (?ref=…) et la cause (?cause=expire|solde|carte) ; rien n'a été débité, le panier est intact ; ce que tu peux
// faire, dans l'ordre de la cause ; réessayer (nouvelle demande, même moyen) ou changer de moyen ; le support.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandePassee } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { NOMS } from './Confirmee'

const QUOI: Record<'expire' | 'solde' | 'carte', string[]> = {
  expire: ['Réessayer — ton panier est intact', 'Vérifier ton solde MoMo (*126#), puis relancer', 'Payer avec un autre numéro ou une carte'],
  solde: ['Vérifier ton solde MoMo (*126#), puis relancer', 'Réessayer — ton panier est intact', 'Payer avec un autre numéro ou une carte'],
  carte: ['Réessayer — ta banque te demandera de confirmer', 'Payer en Mobile Money, sans frais de service', 'Essayer une autre carte Visa ou Mastercard'],
}

export function PaiementEchec() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ref = params.get('ref')
  const lue = params.get('cause')
  const cause = lue === 'solde' || lue === 'carte' ? lue : 'expire'
  const [c, setC] = useState<CommandePassee | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    if (ref) source.commandePassee(ref).then(setC)
  }, [ref])
  const raison =
    cause === 'solde'
      ? c
        ? tf('Ton solde {mo} était insuffisant pour payer {m} F. Aucun montant n’a été débité.', { mo: t(NOMS[c.moyen] ?? 'Mobile Money'), m: F(c.montant) })
        : t('Ton solde Mobile Money était insuffisant. Aucun montant n’a été débité.')
      : cause === 'carte'
        ? t('Ta banque a refusé la carte : la confirmation 3-D Secure n’a pas abouti. Aucun montant n’a été débité.')
        : t('La demande a expiré : le code secret n’a pas été saisi à temps. Aucun montant n’a été débité.')
  // Réessayer : une nouvelle commande en attente, avec le même moyen.
  const reessayer = async () => {
    // Sans la commande (adresse sans référence) : on repart du choix du moyen de paiement, panier gardé.
    if (!c) return naviguer(chemin('paiement-moyen'))
    if (envoi) return
    setEnvoi(true)
    const n = await source.passerCommande({ mode: c.mode, moyen: c.moyen, comptoir: c.comptoir, numero: c.numero, livraison: c.livraison, frais: c.frais, prime: c.prime })
    naviguer(n.etat === 'payee' ? chemin('confirmee', { ref: n.ref }) : chemin('paiement-attente', { ref: n.ref }), { replace: true })
  }
  const n = c?.articles ?? 0
  // Le code USSD de l'opérateur qui a été sollicité (les deux si l'opérateur n'est pas connu).
  const ussd = c?.moyen === 'mtn' ? '*126# (MTN)' : c?.moyen === 'orange' ? '#150*50# (Orange)' : '*126# (MTN) · #150*50# (Orange)'
  return (
    <Ecran route="paiement-echec" gabarit="centre">
      <div className="cl08-fill">
        <Link to={chemin('panier')} className="cl08-tl">
          {t('Retour au panier')}
        </Link>
        <div className="cl08-hero">
          <div className="cl08-ring red">
            <Icone nom="circle-x" taille={40} trait={1.8} />
          </div>
          <h1 className="cl08-h1">{t('Paiement non abouti')}</h1>
          <p className="cl08-lead">{raison}</p>
          {c && (
            <div className="cl08-meta">
              {tf('Commande {ref} · {m} F · {mo}', { ref: c.ref, m: F(c.montant), mo: t(NOMS[c.moyen] ?? 'Mobile Money') })}
              {c.numero ? ' · ' + c.numero : ''}
            </div>
          )}
        </div>
        <div className="card cl08-todo">
          <div className="cl08-kl">{t('Ce que tu peux faire')}</div>
          <ul className="cl08-dots">
            {QUOI[cause].map((x) => (
              <li key={x}>{t(x)}</li>
            ))}
          </ul>
        </div>
        <div className="card cl08-help mt12">
          <div className="cl08-kl">{t(cause === 'carte' ? 'Pourquoi une carte est refusée' : cause === 'solde' ? 'Recharger, puis réessayer' : 'Pour que la demande aboutisse')}</div>
          {cause === 'carte' ? (
            <>
              <p>{t('Le plus souvent : code 3-D Secure non saisi ou faux, carte non activée pour les paiements en ligne ou à l’étranger, ou plafond de la carte atteint.')}</p>
              <p>{t('Si le refus se répète, appelle ta banque. Les 2 % de frais de service n’ont pas été prélevés.')}</p>
            </>
          ) : cause === 'solde' ? (
            <>
              <p>
                {t('Pour voir ton solde, compose ')}
                <b className="cl08-uc">{ussd}</b>
                {t('.')}
              </p>
              <p>{c ? tf('Recharge chez un agent Mobile Money, puis réessaie : la même somme de {m} F sera demandée.', { m: F(c.montant) }) : t('Recharge chez un agent Mobile Money, puis réessaie.')}</p>
            </>
          ) : (
            <>
              <p>{t('Une demande Mobile Money se valide en 15 minutes avec ton code secret. Garde ton téléphone allumé, avec du réseau, et ouvre la demande dès qu’elle arrive.')}</p>
              <p>
                {t('Rien ne s’affiche ? Compose ')}
                <b className="cl08-uc">{ussd}</b>
                {t(' pour retrouver la demande en attente.')}
              </p>
            </>
          )}
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={reessayer}>
            <span>{t(envoi ? 'Nouvelle demande…' : 'Réessayer le paiement')}</span>
          </button>
        </div>
        <div className="btns">
          <Link to={chemin('paiement-moyen', { cause })} className="btn secondary cl08-out">
            <span>{t('Changer de moyen de paiement')}</span>
          </Link>
        </div>
        <div className="cl08-bot">
          <div className="note ink">
            <Icone nom="shopping-cart" taille={18} />
            <div>
              {n === 1
                ? t('Ton article est toujours dans ton panier. Aucun vendeur n’a été notifié.')
                : n > 1
                  ? tf('Tes {n} articles sont toujours dans ton panier. Aucun vendeur n’a été notifié.', { n })
                  : t('Tes articles sont toujours dans ton panier. Aucun vendeur n’a été notifié.')}
            </div>
          </div>
          <div className="card cl08-help mt12">
            <div className="cl08-kl">{t('Débité quand même ?')}</div>
            <p>{t('Ne paie pas une deuxième fois. La confirmation de l’opérateur peut prendre quelques minutes. Si rien n’apparaît dans Mes commandes, écris au support avec une capture du SMS de ton opérateur : le paiement est vérifié et l’argent rendu s’il n’a servi à rien.')}</p>
          </div>
          <div className="links">
            <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Paiement', ...(c ? { commande: c.ref } : {}) })}>{t('Écrire au support')}</Link>
            <Link to={chemin('faq', { t: 'paiement' })}>{t('Questions sur le paiement')}</Link>
          </div>
        </div>
      </div>
    </Ecran>
  )
}
