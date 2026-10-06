// Modifier une commande (CL-12 ; DP-54) : ce que partagent l'annulation, le changement de lieu et la diaspora.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ColisCommande, CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'

export const STATUT: Record<string, string> = {
  attente: 'Pas encore confirmée · annulation libre',
  preparation: 'Préparation en cours',
  pret: 'Prêt, en attente du livreur',
  recupere: 'Récupéré par le livreur',
}
export const MOTIFS = ['Changement d’avis', 'Trouvé moins cher ailleurs', 'Délai trop long', 'Erreur dans ma commande', 'Autre raison']

// Une boutique s'annule tant que son colis n'est pas récupéré par le livreur (emballé et scellé).
export const annulable = (c: CommandeClient, x: ColisCommande) => (c.etat === 'preparation' || c.etat === 'paiement') && !x.annule && x.statut !== 'recupere'
// Le lieu change gratuitement tant que rien n'est collecté ; au relais, un transfert coûte 400 F par colis.
export const enTournee = (c: CommandeClient) => c.etat === 'route' || c.colis.some((x) => x.statut === 'recupere' && !x.arrive)
export const TRANSFERT_PAR_COLIS = 400
// Couleur de la barre de chaque boutique (cl12-shop), dans l'ordre des colis.
export const COULEURS = ['var(--or)', 'var(--amber)', 'var(--ink-2)']

// En ligne ou non : une annulation ou un changement touche à l'argent et attend le réseau.
export function useEnLigne() {
  const [enLigne, setEnLigne] = useState(() => navigator.onLine)
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine)
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])
  return enLigne
}

// Les trois façons de modifier une commande (onglets partagés, balisage du prototype : nav.seg.cl12-seg).
export function Onglets({ c, actif }: { c: CommandeClient; actif: 'annuler' | 'lieu' | 'etranger' }) {
  const { t } = usePreferences()
  const lieu = c.mode === 'relais' ? 'changer-relais' : 'changer-adresse'
  const onglet = (k: typeof actif, vers: string, texte: string) => (
    <Link to={vers} className={actif === k ? 'on' : undefined} aria-current={actif === k ? 'page' : undefined}>
      {t(texte)}
    </Link>
  )
  return (
    <nav className="seg cl12-seg" aria-label={t('Modifier ma commande')}>
      {onglet('annuler', chemin('annuler', { ref: c.ref }), 'Annuler')}
      {onglet('lieu', chemin(lieu, { ref: c.ref }), c.mode === 'relais' ? 'Changer de relais' : 'Changer d’adresse')}
      {onglet('etranger', chemin('modifier', { ref: c.ref, onglet: 'etranger' }), 'Payer de l’étranger')}
    </nav>
  )
}

export function Retour({ c }: { c: CommandeClient }) {
  const { t } = usePreferences()
  return (
    <div className="links">
      <Link to={chemin('commande', { ref: c.ref })}>
        <Icone nom="arrow-left" taille={15} /> {t('Revenir à ma commande')}
      </Link>
    </div>
  )
}

const PAR: Record<NonNullable<ColisCommande['annule']>['par'], string> = { toi: 'Annulée par toi', vendeur: 'Annulée par le vendeur', belivay: 'Annulée par BelivaY' }

// Une boutique, telle que le prototype la montre (cl12-shop) : barre de couleur, article, état côté vendeur, prix ;
// dessous, ce que l'écran y ajoute (remboursement, bouton, détail payé).
export function Boutique({ x, i, children }: { x: ColisCommande; i: number; children?: ReactNode }) {
  const { t, tf, langue } = usePreferences()
  const statut = x.statut ?? 'preparation'
  const parti = statut === 'recupere'
  return (
    <div className="card cl12-shop">
      <div className="cl12-sh" style={{ '--c': COULEURS[i % COULEURS.length] } as CSSProperties}>
        <i className="cl12-bar"></i>
        <div className="tx">
          <div className="cl12-sk">{tf('{b} · Colis {n}', { b: t(x.boutique), n: x.n })}</div>
          <div className="cl12-sa">
            <span>{t(x.produit)}</span>
            <span className="v">{tf('× {q}', { q: x.qte })}</span>
          </div>
          {x.annule ? (
            <div className="cl12-ss mute">
              {t(PAR[x.annule.par])}
              <span>{tf(' · {d}', { d: jourSeul(x.annule.le, langue) })}</span>
            </div>
          ) : x.arrive ? (
            <div className="cl12-ss no">{t('Arrivé au relais')}</div>
          ) : statut === 'attente' ? (
            <div className="cl12-ss ok">
              {t('Pas encore confirmée')}
              <span>{t(' · annulation libre, en un tap')}</span>
            </div>
          ) : (
            <div className={'cl12-ss ' + (parti ? 'no' : 'ok')}>{t(parti ? 'Récupéré par le livreur' : STATUT[statut])}</div>
          )}
        </div>
        <span className="price">
          {F(x.prix * x.qte)}
          <small>{t(' F')}</small>
        </span>
      </div>
      {children}
    </div>
  )
}

// Le lieu prévu d'une commande à domicile (adresse, heure prévue) : carte du prototype « Livraison prévue ».
export function LivraisonPrevue({ nom, detail, quand, children }: { nom: string; detail?: string; quand?: string | null; children?: ReactNode }) {
  const { t } = usePreferences()
  return (
    <div className="card or">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="ic-sq or">
          <Icone nom="house" taille={22} />
        </span>
        <div className="grow">
          <div className="cl12-rk">{t('Livraison prévue')}</div>
          <div className="b8 t15 mt4">{t(nom)}</div>
          {detail && <div className="t13 c3">{t(detail)}</div>}
          {quand && <div className="t13 c2 mt4">{quand}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

// Détail payé d'une commande, sous ses boutiques : articles, livraison, total payé.
export function DetailPaye({ c }: { c: CommandeClient }) {
  const { t } = usePreferences()
  const articles = c.colis.filter((x) => !x.annule).reduce((s, x) => s + x.prix * x.qte, 0)
  return (
    <>
      <div className="hr"></div>
      <div className="kv">
        <span className="k">{t(c.colis.length > 1 ? 'Articles' : 'Article')}</span>
        <span className="v ">{F(articles)}&nbsp;F</span>
      </div>
      <div className="kv">
        <span className="k">{t(c.mode === 'relais' ? 'Livraison au relais' : 'Livraison à domicile')}</span>
        <span className="v ">{F(c.livraison)}&nbsp;F</span>
      </div>
      <div className="kv">
        <span className="k">{t('Payé')}</span>
        <span className="v ">{F(c.total)}&nbsp;F</span>
      </div>
    </>
  )
}
