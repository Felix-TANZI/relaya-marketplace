// Écran « Ma cagnotte » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : le bandeau de nuit (en
// attente, disponible aujourd'hui), puis, commande par commande, chaque colis avec son dessin et sa part (2 % du
// sous-total produits, jamais la livraison ; un colis annulé perd sa part, barrée) ; ce qui est déjà versé au
// Portefeuille ; « Comment ça marche » replié. Règles : la cagnotte des commandes passées avec Prime, Prime Duo ou
// Business reste en attente tant que la commande n'est pas retirée, puis elle est versée au Portefeuille quand
// le vendeur est payé (donnees/prime.ts, source.prime()). Chaque article a son vrai dessin (celui de la commande,
// sinon celui du catalogue) ; sans dessin connu, une icône de colis.
// Échanges (DP-54) : liens vers les listes des proches et la cotisation.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { palier } from '../../donnees/prime'
import { source, type CommandeClient, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { Bloc, usePrime } from './Commun'

export function Cagnotte() {
  const { t, tf } = usePreferences()
  const [d] = usePrime()
  // Les commandes donnent le détail par colis (produit, dessin, colis annulés) des parts en attente.
  const [commandes, setCommandes] = useState<CommandeClient[]>([])
  const [produits, setProduits] = useState<Record<string, Produit>>({})
  useEffect(() => {
    source.commandes().then((r) => setCommandes(r.commandes))
    source.produits().then((x) => setProduits(Object.fromEntries(x.map((y) => [y.p, y]))))
  }, [])
  if (!d) return null
  const a = d.actif ? d.abonnement : null
  const taux = a && a.palier !== 'pass' ? (palier(a.palier)?.cagnotte ?? 0) : 0
  const pct = Math.round((palier('prime')?.cagnotte ?? 0.02) * 100)
  const attente = d.cagnotte.attente.reduce((n, x) => n + x.montant, 0)
  const disponible = d.cagnotte.disponible
  const annulee = d.cagnotte.attente.some((x) => commandes.find((y) => y.ref === x.ref)?.colis.some((y) => y.annule))
  const plus = (m: number) => '+' + F(m) + ' F'
  // Le dessin réel de l'article : celui de la commande, sinon celui du catalogue ; à défaut, l'icône de colis.
  const vignette = (dessin: string, p: string) => {
    const id = dessin || produits[p]?.dessins[0] || ''
    return id ? (
      <span className="thumb" style={{ width: '44px', height: '44px', borderRadius: '11px' }}>
        <Dessin id={id} />
      </span>
    ) : (
      <span className="ic-sq or">
        <Icone nom="package" taille={20} />
      </span>
    )
  }
  const comment = (
    <details className="more">
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t('Comment ça marche')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        <p>
          <b>{tf('{n} % du sous-total produits', { n: pct })}</b>
          {t(', jamais sur la livraison. Réservée à Prime, Prime Duo et Business.')}
        </p>
        <p>
          {t('Versée à ton Portefeuille quand le vendeur est payé, après ton retrait. ')}
          <b>{t('Annulée')}</b>
          {t(' si la commande est remboursée. ')}
        </p>
        <p>{t('Une fois versée, la cagnotte est à toi : elle paie tes commandes ou se retire comme le reste du Portefeuille.')}</p>
      </div>
    </details>
  )
  return (
    <Ecran route="cagnotte" gabarit="compte">
      <Styles id="02f3dac5cd" />
      {!INTERRUPTEURS_DU_LANCEMENT['FF-ABONNEMENT'] && (
        <div className="cl14-top">
          <span className="cl14-ff">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl14-ffc">{t('FF-ABONNEMENT')}</span>
        </div>
      )}
      <div className="hero night">
        <div className="hk">{t('Ma cagnotte · en attente')}</div>
        <div className="big">
          {F(attente)}
          <small>{t('F')}</small>
        </div>
        <div className="hs">{t('Versés à ton Portefeuille quand le vendeur est payé, après ton retrait.')}</div>
        <div className="hline"></div>
        <div className="hs">
          {t('Disponible aujourd’hui : ')}
          <b>{F(disponible) + ' F'}</b>
        </div>
      </div>
      <Bloc classe="g5-duo">
      <Bloc classe="g5-g">
      {!taux && (
        <div className="note ink">
          <Icone nom="info" taille={18} />
          <div>
            {t('La cagnotte est réservée à Prime, Prime Duo et Business.')} <Link to={chemin('abonnements')}>{t('Voir les abonnements')}</Link>
          </div>
        </div>
      )}
      <Bloc classe="g5-cmd" des="pc">
      {d.cagnotte.attente.map((x) => {
        const c = commandes.find((y) => y.ref === x.ref)
        const tx = x.base ? x.montant / x.base : taux
        // Part de chaque colis : arrondie, le dernier colis actif prend le reste pour que la somme soit celle de la commande.
        const actifs = c ? c.colis.filter((y) => !y.annule) : []
        let reste = x.montant
        const parts = new Map<number, number>()
        actifs.forEach((y, i) => {
          const m = i === actifs.length - 1 ? reste : Math.round(y.prix * y.qte * tx)
          parts.set(y.n, m)
          reste -= m
        })
        return (
          <div key={x.ref}>
            <div className="sec">
              <h2>{tf('En attente · {ref}', { ref: x.ref })}</h2>
            </div>
            <div className="card ">
              {c ? (
                c.colis.map((y) => (
                  <div key={y.n} className="cl14-mv">
                    {vignette(y.dessin, y.p)}
                    <div className="grow">
                      <div className="t">{tf('Colis {n} · {p}', { n: y.n, p: t(y.produit) }) + (y.qte > 1 ? ' × ' + y.qte : '')}</div>
                      <div className="s">
                        {y.annule
                          ? tf('Annulé : colis remboursé {m} F. Sa cagnotte est annulée.', { m: F(y.annule.rembourse) })
                          : tf('{p} % de {m} F · en attente, versée au retrait', { p: Math.round(tx * 1000) / 10, m: F(y.prix * y.qte) })}
                      </div>
                    </div>
                    <span className={'cl14-amt ' + (y.annule ? 'x' : '')}>{y.annule ? F(Math.round(y.prix * y.qte * tx)) + ' F' : plus(parts.get(y.n) ?? 0)}</span>
                  </div>
                ))
              ) : (
                <div className="cl14-mv">
                  {vignette(x.dessin, '')}
                  <div className="grow">
                    <div className="t">{t(x.produit)}</div>
                    <div className="s">{tf('{p} % de {m} F · en attente, versée au retrait', { p: Math.round(tx * 1000) / 10, m: F(x.base) })}</div>
                  </div>
                  <span className="cl14-amt ">{plus(x.montant)}</span>
                </div>
              )}
              <div className="links">
                <Link to={chemin('commande', { ref: x.ref })}>{tf('Voir la commande {ref}', { ref: x.ref })}</Link>
              </div>
            </div>
          </div>
        )
      })}
      </Bloc>
      {d.cagnotte.attente.length > 0 && !disponible && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Rien n’est encore disponible : la cagnotte n’existe qu’une fois le vendeur payé.')}</span>
        </div>
      )}
      {annulee && (
        <div className="note ink">
          <Icone nom="info" taille={18} />
          <div>{t('Une commande remboursée annule sa part de cagnotte : le reste ne bouge pas.')}</div>
        </div>
      )}
      </Bloc>
      <Bloc classe="g5-d" etiquette={t('Déjà versé')}>
      {d.cagnotte.versee > 0 && (
        <>
          <div className="sec">
            <h2>{t('Crédits')}</h2>
          </div>
          <div className="card ">
            <div className="cl14-mv">
              <span className="ic-sq green">
                <Icone nom="plus" taille={20} />
              </span>
              <div className="grow">
                <div className="t">{t('Déjà versé au Portefeuille')}</div>
                <div className="s">{t('Une fois versée, la cagnotte est à toi : elle paie tes commandes ou se retire comme le reste du Portefeuille.')}</div>
              </div>
              <span className="cl14-amt plus">{plus(d.cagnotte.versee)}</span>
            </div>
          </div>
        </>
      )}
      {comment}
      <div className="btns mt16">
        {disponible > 0 ? (
          <Link to={chemin('panier')} className="btn primary">
            <Icone nom="shopping-cart" taille={18} />
            <span>{t('Utiliser au panier')}</span>
          </Link>
        ) : (
          <Link to={chemin('wallet')} className="btn secondary">
            <Icone nom="wallet" taille={18} />
            <span>{t('Voir mon Portefeuille')}</span>
          </Link>
        )}
      </div>
      <div className="hint-l">
        <Icone nom="gift" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Pour faire plaisir à un proche : choisis un cadeau sur sa liste, ou offrez-le à plusieurs.')}</span>
      </div>
      <div className="links">
        <Link to={chemin('listes')}>{t('Les listes de mes proches')}</Link>
        <Link to={chemin('cotisation')}>{t('Offrir à plusieurs')}</Link>
      </div>
      </Bloc>
      </Bloc>
    </Ecran>
  )
}
