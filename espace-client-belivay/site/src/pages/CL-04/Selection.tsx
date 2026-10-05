// Écran « Sélection Premium » (CL-04), forme d'origine du prototype rendue réelle (DP-54) : le bandeau (critères :
// vendeurs Argent ou Or, note 4,5 et plus, retrait au relais habituel), les univers présents à filtrer, le tri
// (avis vérifiés, au plus proche, prix, note) et les filtres de la liste (comptés, retirables un à un), la
// sélection vide expliquée, la grille (cœur : favori ; « Panier » :
// ajout), « Comment on choisit ».
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CarteProduit, filtrer, filtresDe, horsRelais, lePlusProche, retirableAujourdhui, UNIVERS, useCatalogue, type Tri } from '../../composants/Catalogue'
import { Ecran } from '../../composants/coque'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import type { Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

// Univers courts des filtres de la sélection.
const COURT: Record<string, string> = { tel: 'Téléphones', elec: 'Électronique', femme: 'Mode', homme: 'Mode homme', chauss: 'Chaussures', beaute: 'Beauté', maison: 'Maison', marche: 'Supermarché', bebe: 'Bébé', sport: 'Sport' }

export function Selection() {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [c] = useCatalogue()
  const [message, setMessage] = useState<string | null>(null)
  if (!c) return <Ecran route="selection" />
  const aller = (maj: Record<string, string | null>) => {
    const n = new URLSearchParams(params)
    Object.entries(maj).forEach(([k, v]) => (v === null ? n.delete(k) : n.set(k, v)))
    naviguer({ search: n.toString() }, { replace: true })
  }
  // Critères : note 4,5 et plus, vendeur Argent ou Or, retirable au relais ; classés par nombre d'avis vérifiés.
  const f = { ...filtresDe(params), promo: params.get('promo') === '1' }
  const tri = (params.get('tri') as Tri | null) ?? null
  const choisis = (u?: string) =>
    filtrer(c.tous, { ...f, u, tri: tri ?? 'pertinence', note: Math.max(4.5, f.note ?? 0) }, (p: Produit) => retirableAujourdhui(p, c))
      .filter((p) => ['Argent', 'Or'].includes(p.vendeur.palier) && p.avis >= 20 && !horsRelais(p))
      .sort((a, b) => (tri ? 0 : b.avis - a.avis))
  const tous = choisis()
  const liste = choisis(f.u)
  const univers = UNIVERS.filter((u) => tous.some((p) => p.univers === u.id))
  const proche = lePlusProche(liste)
  // Filtres choisis dans le panneau des filtres (retour ici), retirables un à un.
  const actifs: [string, string][] = [
    ...(f.prixMin !== undefined ? ([['min', tf('dès {m} F', { m: F(f.prixMin) })]] as [string, string][]) : []),
    ...(f.prixMax !== undefined ? ([['max', tf('jusqu’à {m} F', { m: F(f.prixMax) })]] as [string, string][]) : []),
    ...(f.km !== undefined ? ([['km', tf('à {k} km au plus', { k: f.km })]] as [string, string][]) : []),
    ...(f.stock ? ([['stock', t('en stock')]] as [string, string][]) : []),
    ...(f.offert ? ([['offert', t('retrait offert')]] as [string, string][]) : []),
    ...(f.promo ? ([['promo', t('en promotion')]] as [string, string][]) : []),
    ...(f.auj ? ([['auj', t('retirable aujourd’hui')]] as [string, string][]) : []),
    ...(f.marque ? ([['marque', f.marque === 'Sans marque' ? t('Sans marque') : f.marque]] as [string, string][]) : []),
  ]
  const effacer = { min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, auj: null, rel: null, dom: null, f: null, marque: null, sub: null }
  const triChip = (k: Tri | null, x: string) => (
    <a key={x} href="#" className={'chip' + (tri === k ? ' on' : '')} aria-pressed={tri === k} onClick={(e) => (e.preventDefault(), aller({ tri: k }))}>
      {t(x)}
    </a>
  )
  return (
    <Ecran
      route="selection"
      gabarit="catalogue"
      avant={
        <>
          <Styles id="1c3d953197" />
        </>
      }
    >
      <Styles id="118b6d36f2" />
      <section className="dx-hero sel">
        <span className="wm" aria-hidden="true">
          {t('CURATED')}
        </span>
        <span className="k">{t('CURATED')}</span>
        <h1>{t('Sélection Premium')}</h1>
        <p>{lieuR.r('Produits triés sur le volet par l’équipe BelivaY, retirables à ton relais.')}</p>
        <div className="dx-crit">
          <span>
            <Icone nom="badge-check" taille={14} />
            {t('Vendeurs Argent ou Or')}
          </span>
          <span>
            <Icone nom="star" taille={14} style={{ fill: 'currentColor' }} />
            {t('Note 4,5 et plus')}
          </span>
          <span>
            <Icone nom="map-pin" taille={14} />
            {tf('Retrait au {r}', { r: t(c.relais?.nom ?? 'Relais Mvog-Ada') })}
          </span>
        </div>
      </section>
      <div className="chips mt14 dx-filt">
        <a href="#" className={'chip' + (!f.u ? ' on' : '')} aria-pressed={!f.u} onClick={(e) => (e.preventDefault(), aller({ cat: null }))}>
          {t('Tout')}
        </a>
        {univers.map((u) => (
          <a key={u.id} href="#" className={'chip' + (f.u === u.id ? ' on' : '')} aria-pressed={f.u === u.id} onClick={(e) => (e.preventDefault(), aller({ cat: u.id }))}>
            {t(COURT[u.id] ?? u.titre)}
          </a>
        ))}
      </div>
      <div className="chips mt8" aria-label={t('Tri et filtres')}>
        <Link to={chemin('recherche-filtres', Object.fromEntries([...params.entries(), ['retour', 'selection']]))} className={'chip' + (actifs.length ? ' on' : '')}>
          <Icone nom="sliders-horizontal" taille={15} />
          {actifs.length ? tf('Filtres ({n})', { n: actifs.length }) : t('Filtres')}
        </Link>
        {triChip(null, 'Avis vérifiés')}
        {triChip('proche', 'Au plus proche')}
        {triChip('prix', 'Prix croissant')}
        {triChip('note', 'Mieux notés')}
      </div>
      <p className="dx-note">{tf(tri ? (liste.length > 1 ? '{n} produits' : '{n} produit') : liste.length > 1 ? '{n} produits · classés par nombre d’avis vérifiés' : '{n} produit · classé par nombre d’avis vérifiés', { n: liste.length })}</p>
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      {actifs.length > 0 && (
        <div className="chips">
          {actifs.map(([k, x]) => (
            <a key={k} href="#" className="chip on" aria-label={tf('Retirer le filtre {f}', { f: x })} onClick={(e) => (e.preventDefault(), aller({ [k]: null, ...(k === 'auj' ? { f: null } : {}) }))}>
              {x} <Icone nom="x" taille={14} />
            </a>
          ))}
          <a href="#" className="chip" onClick={(e) => (e.preventDefault(), aller(effacer))}>
            {t('Tout effacer')}
          </a>
        </div>
      )}
      {!liste.length && (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="star" taille={26} />
            </div>
            <h3>{t(actifs.length ? 'Aucun produit de la sélection avec ces filtres' : 'Aucun produit ne remplit encore les critères ici')}</h3>
            <p>{t('La sélection est revue chaque semaine : seuls les produits qui tiennent leurs promesses y entrent.')}</p>
            <div className="btns">
              {actifs.length ? (
                <button type="button" className="btn primary" onClick={() => aller(effacer)}>
                  <span>{t('Effacer les filtres')}</span>
                </button>
              ) : (
                <Link to={chemin('categories')} className="btn primary">
                  <span>{t('Parcourir les catégories')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="pgrid">
        {liste.map((p) => (
          <CarteProduit key={p.p} p={p} selection favori={c.favoris.includes(p.p)} proche={p.p === proche} auChange={setMessage} />
        ))}
      </div>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment on choisit')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p className="t13 c2" style={{ margin: '0' }}>
            {t('Chaque semaine : note moyenne d’au moins 4,5 sur 20 avis vérifiés, vendeur Argent ou Or, moins de 2 % de retours validés, livrable au relais. Aucun vendeur ne paie pour être ici.')}
          </p>
        </div>
      </details>
    </Ecran>
  )
}
