// Prochain versement (chantier F, point 5) : le montant net qui arrive vendredi sur le numéro, et son détail replié —
// ventes libérées, commission (planchers R14) et TVA figées au paiement, 1 % Mobile Money retenu sur le versement (R22).
// Tout vient de la source (moteur v2.0) : l'écran n'additionne rien. Utilisé par Mon argent (carte de nuit) et l'accueil.
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ResumeArgent } from '../../donnees/domaines/argent'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { jourLongMois, numeroLisible, useMontant } from './commun'
import './versement.css'

/** Détail replié du versement (« nuit » : sur la carte sombre de Mon argent). */
export function DetailVersement({ d, nuit = false }: { d: ResumeArgent['detailVersement']; nuit?: boolean }) {
  const { t, tf } = usePreferences()
  const m = useMontant()
  const ligne = (libelle: string, v: string, fort = false) => (
    <div className={'vf-l' + (fort ? ' fort' : '')}>
      <span>{libelle}</span>
      <b>{v}</b>
    </div>
  )
  return (
    <details className={'vf-detail' + (nuit ? ' nuit' : '')}>
      <summary>
        <span className="grow">{t('Détail du calcul')}</span>
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="vf-b">
        {ligne(tf(d.ventes > 1 ? '{n} ventes libérées' : '{n} vente libérée', { n: d.ventes }), m.f(d.sousTotal))}
        {ligne(t('Commission BelivaY'), '− ' + m.f(d.commission))}
        {d.tva > 0 && ligne(t('TVA sur la commission'), '− ' + m.f(d.tva))}
        {ligne(t('Frais Mobile Money (1 %)'), '− ' + m.f(d.frais))}
        {ligne(t('Vous recevez'), m.f(d.net), true)}
      </div>
    </details>
  )
}

/** Carte de l'accueil : vendredi, montant net, numéro ; détail replié ; un seul lien, vers Mon argent. */
export function CarteVersement({ r }: { r: ResumeArgent }) {
  const { t, tf, langue } = usePreferences()
  const m = useMontant()
  const pv = r.prochainVersement
  return (
    <section className="card vf-carte" aria-label={t('Prochain versement')} data-carte="versement">
      <div className="vf-k">{pv ? tf('Prochain versement · {jour}', { jour: jourLongMois(pv.vendredi, langue) }) : t('Prochain versement')}</div>
      <div className="vf-big">{m.f(r.detailVersement.net)}</div>
      <div className="vf-s">
        <Icone nom="smartphone" taille={15} />
        <span>{tf('Sur {numero}, avant {h} · automatique', { numero: `${r.numero.operateur} ${numeroLisible(r.numero.masque)}`, h: heure(pv?.heureLimite ?? '12:00', langue) })}</span>
      </div>
      {r.detailVersement.ventes > 0 && <DetailVersement d={r.detailVersement} />}
      <Link to={chemin('argent')} className="btn secondary vf-btn">
        <Icone nom="wallet" taille={18} />
        <span>{t('Mon argent')}</span>
      </Link>
    </section>
  )
}
