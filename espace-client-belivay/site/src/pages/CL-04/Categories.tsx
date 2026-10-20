// Écran « Catégories » (CL-04), forme d'origine du prototype rendue réelle (DP-54) : les dix univers (?u=…, ceux
// choisis à l'arrivée d'abord), chacun avec sa bannière, ses sous-catégories et leurs produits (comptés dans le
// catalogue, avec le prix le plus bas) ; les raccourcis de l'univers (retirable aujourd'hui, en promotion, marques
// comptées) ; « À découvrir » (Flash Deals, promotions comptées avec leur plus forte remise, Sélection Premium,
// BelivaY Premium) ; une recherche dans l'univers ; le rappel du retrait offert (seuil et prix du retrait calculés
// par la formule du panier).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CarteProduit, retirableAujourdhui, UNIVERS, useCatalogue } from '../../composants/Catalogue'
import { PhotoBande } from './AccueilContenus'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../donnees/frais'
import { source } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

// Photo de l'univers déposée dans public/images/carrousel/ (la même que le carrousel de l'accueil ; Maison & cuisine :
// l'électroménager), posée en fondu sur l'illustration.
const PHOTO_UNIVERS: Record<string, string> = { maison: 'electromenager' }
// Bannières d'univers du prototype (illustrations) ; à défaut, la photo du premier produit de l'univers.
const BANNIERES: Record<string, string> = {
  tel: '6cb441816096',
  sport: '6fdb1708f6b7',
}
// Icône d'une sous-catégorie encore sans produit (« Vélos » : un vélo).
const ICONES_SUB: Record<string, string> = { Vélos: 'bike' }

export function Categories() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const [c] = useCatalogue()
  const produits = c?.tous ?? []
  const [interets, setInterets] = useState<string[]>([])
  useEffect(() => {
    source.interets().then(setInterets)
  }, [])
  // Les univers choisis à l'arrivée passent en premier.
  const univers = [...UNIVERS].sort((a, b) => Number(interets.includes(b.id)) - Number(interets.includes(a.id)))
  const u = univers.find((x) => x.id === params.get('u')) ?? univers[0]
  const dans = produits.filter((p) => p.univers === u.id)
  const promos = produits.filter((p) => (p.prixBarre ?? 0) > p.prix)
  const remiseMax = promos.length ? Math.max(...promos.map((p) => Math.round((1 - p.prix / p.prixBarre!) * 100))) : 0
  const banniere = BANNIERES[u.id] ?? dans[0]?.dessins[0]
  const banniereImage = dans[0]?.images?.[0] // photo servie du premier produit (le dessin de l’univers en repli)
  const retrait = PARAMETRES.ramassage + PARAMETRES.remiseRelais.S
  // Raccourcis de l'univers : retirable aujourd'hui au relais habituel, en promotion, et ses marques comptées.
  const aujN = c ? dans.filter((p) => retirableAujourdhui(p, c)).length : 0
  const promoN = dans.filter((p) => (p.prixBarre ?? 0) > p.prix).length
  const large = useDes('tab-l')
  const marques = Object.entries(dans.reduce<Record<string, number>>((m, p) => (p.marque ? { ...m, [p.marque]: (m[p.marque] ?? 0) + 1 } : m), {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  // Blocs de la page, rangés dans l'ordre du téléphone, ou dès 1024 px dans le gabarit catalogue (§ 5.2) : la liste
  // des univers devient la colonne gauche ; au centre le titre, la bannière, la recherche dans l'univers, les
  // raccourcis, les sous-catégories, « À découvrir », puis le rappel du retrait offert.
  const recherche = (
    <Link to={chemin('recherche-saisie', { cat: u.id })} className="cl04-srch">
      <Icone nom="search" taille={18} />
      <span className="grow">
        {t('Chercher dans')} <b>{t(u.titre)}</b>
      </span>
    </Link>
  )
  const decouvrir = (
    <div className="dx-cat">
      <div className="dx-h">
        <b>{t('À découvrir')}</b>
      </div>
      <div className="dx-tiles">
        <Module ff="FF-FLASH">
          <Link to={chemin('ventes-flash')} className="dx-t flash">
            <span className="i">
              <Icone nom="zap" taille={17} style={{ fill: 'currentColor' }} />
            </span>
            <span>
              <b>{t('Flash Deals')}</b>
              <small>{t('Vraie fin · vrai stock')}</small>
            </span>
          </Link>
        </Module>
        <Link to={chemin('promotions')} className="dx-t promo">
          <span className="i">
            <Icone nom="flame" taille={17} />
          </span>
          <span>
            <b>{t('Promotions')}</b>
            <small>{promos.length ? tf(promos.length > 1 ? '{n} promos jusqu’à −{r}\u00A0%' : '{n} promo à −{r}\u00A0%', { n: promos.length, r: remiseMax }) : t('Aucune promo en ce moment')}</small>
          </span>
        </Link>
        <Link to={chemin('selection')} className="dx-t sel">
          <span className="i">
            <Icone nom="star" taille={17} style={{ fill: 'currentColor' }} />
          </span>
          <span>
            <b>{t('Sélection Premium')}</b>
            <small>{t('Triés sur le volet')}</small>
          </span>
        </Link>
        <Module ff="FF-ABONNEMENT">
          <Link to={chemin('abonnements')} className="dx-t prem">
            <span className="i">
              <Icone nom="gem" taille={17} />
            </span>
            <span>
              <b>{t('BelivaY Premium')}</b>
              <small>{t('Retrait offert dès 10 000 F')}</small>
            </span>
          </Link>
        </Module>
      </div>
    </div>
  )
  const titre = (
    <div className="cl04-cath">
      <h1>{t('Toutes les catégories')}</h1>
      <span>
        <span className="nw">
          <span>{UNIVERS.length}</span>
          {t(' univers')}
        </span>
      </span>
    </div>
  )
  const rail = (
    <nav className="cl04-rail2" aria-label={t('Univers')}>
      {univers.map((x) => (
        <Link key={x.id} to={chemin('categories', { u: x.id })} replace className={x.id === u.id ? 'on' : ''} aria-current={x.id === u.id || undefined}>
          <Icone nom={x.icone} taille={18} />
          <span>{t(x.titre)}</span>
        </Link>
      ))}
    </nav>
  )
  const banniereU = (
    <Link to={chemin('liste', { cat: u.id })} className="card or cl04-ban2">
      <span className="im">{(banniere || banniereImage) && <Dessin id={banniere ?? ''} image={banniereImage} alt={u.titre} tailles="100vw" />}<PhotoBande nom={PHOTO_UNIVERS[u.id] ?? u.id} alt={t(u.titre)} premiere /></span>
      <span className="bt">
        <h2>{t(u.titre)}</h2>
        <p>
          <span className="nw">
            <span>{u.subs.length}</span>
            {t(' sous-catégories')}
          </span>
          {t(' · ')}
          <span className="nw">
            <span>{dans.length}</span>
            {t(dans.length > 1 ? ' produits' : ' produit')}
          </span>
        </p>
        <span className="voir">
          <span>{t('Tout voir')}</span>
          <Icone nom="chevron-right" taille={16} />
        </span>
      </span>
    </Link>
  )
  const sousCategories = (
    <div className="cl04-subs3">
      {u.subs.map((s) => {
        const ps = dans.filter((p) => p.sousCategorie === s)
        return (
          <Link key={s} to={chemin('liste', { cat: u.id, sub: s })} className="cl04-sub3">
            {ps[0]?.dessins[0] || ps[0]?.images?.[0] ? (
              <span className="im">
                <Dessin id={ps[0].dessins[0] ?? ''} image={ps[0].images?.[0]} alt={s} tailles="96px" />
              </span>
            ) : (
              <span className="im cl04-ico">
                <Icone nom={ICONES_SUB[s] ?? u.icone} taille={24} trait={1.6} />
              </span>
            )}
            <b>{t(s)}</b>
            <span className="n">
              <span className="nw">
                <span>{ps.length}</span>
                {t(ps.length > 1 ? ' produits' : ' produit')}
              </span>
              {ps.length > 0 && (
                <span className="nw" style={{ display: 'block' }}>
                  {tf('dès {m} F', {
                    m: F(Math.min(...ps.map((p) => p.depuis ?? p.prix))),
                  })}
                </span>
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )
  const raccourcis = (aujN > 0 || promoN > 0 || marques.length > 0) && (
    <div className="chips mt12">
      {aujN > 0 && (
        <Link to={chemin('liste', { cat: u.id, auj: '1' })} className="chip">
          <Icone nom="clock" taille={15} />
          {t('Retirable aujourd’hui ')}
          <span className="n">{aujN}</span>
        </Link>
      )}
      {promoN > 0 && (
        <Link to={chemin('liste', { cat: u.id, promo: '1' })} className="chip">
          <Icone nom="flame" taille={15} />
          {t('En promotion ')}
          <span className="n">{promoN}</span>
        </Link>
      )}
      {marques.slice(0, 6).map(([m, n]) => (
        <Link key={m} to={chemin('liste', { cat: u.id, marque: m })} className="chip">
          {m + ' '}
          <span className="n">{n}</span>
        </Link>
      ))}
    </div>
  )
  const offert = (
    <div className="cl04-promo">
      <Icone nom="gift" taille={20} style={{ flexShrink: '0' }} />
      <div>
        <b>
          {tf('Retrait offert au relais dès {s}\u00A0F d’achat', {
            s: F(PARAMETRES.seuilRelais),
          })}
        </b>
        {tf('En dessous, la livraison au relais coûte {m}\u00A0F par colis.', {
          m: F(retrait),
        })}
      </div>
    </div>
  )
  // Dès 1024 px (§ 5.2, point 5) : les produits de l'univers en rail sous les sous-catégories, « Tout voir » vers la
  // liste ; le rail ne laisse jamais de rangée à moitié vide.
  const produitsU = dans.length > 0 && (
    <section className="cl04-cat-pr" aria-label={t('Produits de l’univers')}>
      <div className="dx-h">
        <b>{t('Produits de l’univers')}</b>
        <Link to={chemin('liste', { cat: u.id })}>{t('Tout voir')}</Link>
      </div>
      <div className="cl04-cat-rail">
        {dans.map((x) => (
          <CarteProduit key={x.p} p={x} favori={c?.favoris.includes(x.p)} />
        ))}
      </div>
    </section>
  )
  const styles = (
    <>
      <Styles id="57f763a2e1" />
      <Styles id="1c3d953197" />
    </>
  )
  if (large)
    return (
      <Ecran route="categories" avant={styles} gabarit="catalogue" gauche={rail}>
        <Styles id="118b6d36f2" />
        <div className="cl04-cat-l">
          {titre}
          {banniereU}
          {recherche}
          {raccourcis}
          {sousCategories}
          {produitsU}
          {decouvrir}
          {offert}
        </div>
      </Ecran>
    )
  return (
    <Ecran route="categories" avant={styles} gabarit="catalogue">
      <Styles id="118b6d36f2" />
      {recherche}
      {decouvrir}
      {titre}
      <div className="cl04-hub2">
        {rail}
        <div style={{ minWidth: '0' }}>
          {banniereU}
          {sousCategories}
          {raccourcis}
          {offert}
        </div>
      </div>
    </Ecran>
  )
}
