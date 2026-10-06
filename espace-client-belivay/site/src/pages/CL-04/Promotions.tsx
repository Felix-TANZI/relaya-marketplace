// Écran « Promotions » (CL-04), forme d'origine du prototype rendue réelle (DP-54) : l'en-tête (nombre de promos et
// plus forte remise, calculés), l'accès aux Flash Deals en cours, le tri (plus forte remise, prix le plus bas, au
// plus proche), le filtre par univers (?cat=), la grille (économie, distance, note, stock bas ; épuisé : pas
// d'ajout) : produits au prix baissé (prix barré vraiment pratiqué avant) et
// offres flash en cours avec leur fin ; le cœur met en favori, « Ajouter » met au panier (au prix de l'offre pour
// un Flash Deal) ; promotions ou Flash Deals : la différence.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { km, UNIVERS } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type OffreFlash, type PhotoServeur, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'

interface Promo {
  p: string
  titre: string
  dessin: string
  image?: PhotoServeur | null
  univers: string
  prix: number
  avant: number
  km: number
  distance: string | null
  note: string | null
  avis: number
  stock: number // au prix affiché : stock de l'offre pour un Flash Deal
  flash: OffreFlash | null
}
const H = 3600e3

export function Promotions() {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const [params, setParams] = useSearchParams()
  const [produits, setProduits] = useState<Produit[] | null>(null)
  const [flash, setFlash] = useState<{ offres: OffreFlash[]; maintenant: number } | null>(null)
  const [favoris, setFavoris] = useState<string[]>([])
  const u = params.get('cat') ?? ''
  const setU = (x: string) => {
    const n = new URLSearchParams(params)
    if (x) n.set('cat', x)
    else n.delete('cat')
    setParams(n, { replace: true })
  }
  const [message, setMessage] = useState<string | null>(null)
  const charger = () => source.ventesFlash().then(setFlash)
  useEffect(() => {
    source.produits().then(setProduits)
    source.favoris().then((f) => setFavoris(f.favoris.map((x) => x.p)))
    charger()
  }, [])
  if (!produits || !flash) return null
  const now = flash.maintenant
  const offres = flash.offres.filter((o) => o.debut <= now && o.fin > now)
  const tri = (['remise', 'prix', 'proche'] as const).find((x) => x === params.get('tri')) ?? 'remise'
  const liste: Promo[] = [
    ...offres.map((o) => {
      const pr = produits.find((x) => x.p === o.p)
      return { p: o.p, titre: o.titre, dessin: o.dessin, image: o.image ?? pr?.images?.[0], univers: o.univers, prix: o.prix, avant: o.avant, km: km(pr ?? ({} as Produit)), distance: pr?.distance ?? null, note: pr?.note ?? null, avis: pr?.avis ?? 0, stock: o.stock, flash: o }
    }),
    ...produits.filter((p) => (p.prixBarre ?? 0) > p.prix && !offres.some((o) => o.p === p.p)).map((p) => ({ p: p.p, titre: p.titre, dessin: p.dessins[0] ?? '', image: p.images?.[0], univers: p.univers, prix: p.prix, avant: p.prixBarre!, km: km(p), distance: p.distance ?? null, note: p.note ?? null, avis: p.avis, stock: p.stock, flash: null })),
  ]
  const remise = (x: Promo) => Math.round((1 - x.prix / x.avant) * 100)
  const tries = [...liste].sort((a, b) => (tri === 'prix' ? a.prix - b.prix : tri === 'proche' ? a.km - b.km : remise(b) - remise(a)))
  const univers = [...new Set(liste.map((x) => x.univers))]
  const max = liste.length ? Math.max(...liste.map(remise)) : 0
  const finEn = (fin: number) => {
    const j = (ms: number) => Math.floor((ms + H) / 864e5)
    const h = `${new Date(fin + H).getUTCHours()} h`
    return j(fin) - j(now) <= 0 ? tf('Fin aujourd’hui à {h}', { h }) : tf('Fin demain à {h}', { h })
  }
  const coeur = async (p: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const f = await source.basculerFavori(p)
    setFavoris(f ? [...favoris, p] : favoris.filter((x) => x !== p))
    majSession(await source.session())
  }
  const ajouter = async (x: Promo, e: MouseEvent) => {
    e.preventDefault()
    if (x.flash) {
      const r = await source.ajouterFlash(x.p)
      setMessage(r.ok ? tf('« {p} » ajouté au panier à {m} F.', { p: t(x.titre), m: F(x.prix) }) : t('Offre terminée ou épuisée : rien n’a été ajouté.'))
      charger()
    } else {
      await source.ajouterProduit(x.p, {}, 1)
      setMessage(tf('« {p} » ajouté au panier.', { p: t(x.titre) }))
    }
    majSession(await source.session())
  }
  const carte = (x: Promo) => (
    <div className="fd-g">
      <Link to={x.flash ? chemin('ventes-flash', { offre: x.p }) : chemin('fiche', { p: x.p })}>
        <span className="im">
          <Dessin id={x.dessin} image={x.image} alt={x.titre} />
          <i className="fd-b">−{remise(x)}&nbsp;%</i>
          <span className="fd-h" role="button" tabIndex={0} aria-pressed={favoris.includes(x.p)} aria-label={t(favoris.includes(x.p) ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={(e) => coeur(x.p, e)}>
            <Icone nom="heart" taille={15} style={favoris.includes(x.p) ? { fill: 'currentColor', color: 'var(--or)' } : undefined} />
          </span>
          <span className="ov">
            <Icone nom={x.flash ? 'timer' : 'trending-down'} taille={12} />
            {x.flash ? finEn(x.flash.fin) : t('Prix baissé · vérifié')}
          </span>
        </span>
        <span className="tx">
          <span className="n">{t(x.titre)}</span>
          <span className="fd-pr">
            <b>{F(x.prix)}&nbsp;F</b>
            <s>{F(x.avant)}&nbsp;F</s>
          </span>
          <span className="t12 c3" style={{ display: 'block', marginTop: '3px' }}>
            {tf('Tu économises {m} F', { m: F(x.avant - x.prix) })}
          </span>
          <span className="t12 c3" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 6px', marginTop: '2px' }}>
            {x.distance && (
              <span className="nw">
                <Icone nom="map-pin" taille={12} /> {x.distance}
              </span>
            )}
            {x.note && (
              <span className="nw">
                <Icone nom="star" taille={12} style={{ fill: 'currentColor', color: 'var(--or)' }} /> {x.note} ({x.avis})
              </span>
            )}
          </span>
          {x.stock > 0 && x.stock <= 5 && (
            <span className="t12 b7" style={{ display: 'block', marginTop: '2px', color: 'var(--red)' }}>
              {tf(x.flash ? 'Plus que {n} à ce prix' : 'Plus que {n} en stock', { n: x.stock })}
            </span>
          )}
        </span>
      </Link>
      {x.stock > 0 ? (
        <a href="#" className="ad" aria-label={tf('Ajouter au panier : {p}', { p: t(x.titre) })} onClick={(e) => ajouter(x, e)}>
          <Icone nom="shopping-cart" taille={15} />
          {t('Ajouter')}
        </a>
      ) : (
        <span className="ad" aria-disabled="true" style={{ opacity: 0.55 }}>
          {t('Épuisé')}
        </span>
      )}
    </div>
  )
  return (
    // Grand écran : conteneur large, sans colonnes latérales, comme sur la capture d'inspiration (11.31.12).
    <Ecran route="promotions" largeur="large" avant={<Styles id="1c3d953197" />}>
      <Styles id="0b0ccec1e3" />
      <Styles id="a623237236" />
      <section className="pm-hero">
        <span className="wm" aria-hidden="true">
          {t('PROMO')}
        </span>
        <span className="k">{t('PROMOTIONS')}</span>
        <h1>{tf('{n} promos jusqu’à −{m} %', { n: liste.length, m: max })}</h1>
        <p>{t('Prix barrés vérifiés : le prix barré est celui vraiment pratiqué avant la remise.')}</p>
      </section>
      {offres.length > 0 && (
        <Module ff="FF-FLASH">
          <Link to={chemin('ventes-flash')} className="pm-flash">
            <Icone nom="zap" taille={18} style={{ color: 'var(--or-txt)', fill: 'currentColor' }} />
            <span className="grow">
              <b>{t('Flash Deals en cours')}</b>
              {tf(' · {n} offres limitées dans le temps', { n: offres.length })}
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </Module>
      )}
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      <div className="pm-sort">
        {(
          [
            ['remise', 'Plus forte remise'],
            ['prix', 'Prix le plus bas'],
            ['proche', 'Au plus proche'],
          ] as const
        ).map(([k, x]) => (
          <a key={k} href="#" className={tri === k ? 'on' : ''} aria-pressed={tri === k} onClick={(e) => (e.preventDefault(), setParams({ ...(u ? { cat: u } : {}), ...(k === 'remise' ? {} : { tri: k }) }, { replace: true }))}>
            {t(x)}
          </a>
        ))}
      </div>
      <div className="chips mt12 dx-filt">
        <a href="#" className={'chip' + (!u ? ' on' : '')} aria-pressed={!u} onClick={(e) => (e.preventDefault(), setU(''))}>
          {t('Tout voir')}
        </a>
        {univers.map((x) => (
          <a key={x} href="#" className={'chip' + (u === x ? ' on' : '')} aria-pressed={u === x} onClick={(e) => (e.preventDefault(), setU(x))}>
            {t(UNIVERS.find((y) => y.id === x)?.titre ?? x)}
          </a>
        ))}
      </div>
      <div className="fd-grid mt12">
        {tries
          .filter((x) => !u || x.univers === u)
          .map((x) =>
            x.flash ? (
              <Module key={x.p} ff="FF-FLASH">
                {carte(x)}
              </Module>
            ) : (
              <div key={x.p} style={{ display: 'contents' }}>
                {carte(x)}
              </div>
            ),
          )}
      </div>
      {!liste.length && (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="flame" taille={26} />
            </div>
            <h3>{t('Aucune promotion en ce moment.')}</h3>
            <p>{t('Les baisses de prix arrivent sans prévenir : repasse bientôt, ou parcours les catégories.')}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Parcourir les catégories')}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Promotions ou Flash Deals ?')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p className="t13 c2" style={{ margin: '0' }}>
            {t('Une promotion est une baisse de prix sans limite de temps annoncée. Un Flash Deal a une vraie heure de fin et un stock réservé, affichés sur l’offre.')}
          </p>
        </div>
      </details>
    </Ecran>
  )
}
