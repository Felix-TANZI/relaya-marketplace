// Vue d'une liste de produits (CL-04), forme d'origine du prototype rendue réelle (DP-54) : tri (pertinence, au
// plus proche, prix, note), filtres (feuille complète), marque (feuille : nombre réel par marque, « Voir les N
// produits »), sous-catégories comptées, filtre de livrabilité (« Retirable à mon relais », « Retrait possible
// aujourd'hui ») avec le total sans lui, colis trop volumineux masqués et « Les voir », autres filtres à retirer,
// « Retirable aujourd'hui » en un geste, « en promotion » (?promo=1), relais d'origine des distances, liste vide
// expliquée (sans tes filtres : N produits ; sous-catégorie encore vide : l'univers entier, la recherche), grille (le plus proche mis en avant) qui se charge en défilant, et, quand une
// sous-catégorie a peu de produits retirables aujourd'hui, les sous-catégories voisines avec le même filtre.
// La feuille des marques se pose par-dessus l'écran (portail dans #app, comme les éléments fixes d'Ecran).
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CarteProduit, filtrer, filtresDe, horsRelais, lePlusProche, marqueDe, retirableAujourdhui, UNIVERS, type Contexte, type Filtres } from '../../composants/Catalogue'
import { useDes } from '../../composants/ecran'
import { Feuille, useFeuille } from '../../composants/Feuille'
import { useLieu, useVersPourQui } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useChargement, VoirPlus } from './Chargement'

const PAGE = 8

// Les produits d'une liste avec ses filtres (aussi pour le sous-titre de l'en-tête).
export function listeDe(c: Contexte, params: URLSearchParams, fixe?: Partial<Filtres>) {
  const f: Filtres = { ...filtresDe(params), promo: params.get('promo') === '1', ...fixe }
  const auj = (p: Produit) => retirableAujourdhui(p, c)
  return { f, auj, liste: filtrer(c.tous, f, auj) }
}

export function VueListe(p: { route: string; c: Contexte; avant?: ReactNode }) {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const versPq = useVersPourQui()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const marques = useFeuille('marque')
  const [sel, setSel] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { c } = p
  const { f, auj, liste } = listeDe(c, params)
  // Chargement en défilant ; dès 768 px, « Voir plus » après 3 chargements (Chargement.tsx).
  const { vus, suite, reste, enAttente, plus } = useChargement(liste.length, PAGE, params.toString())
  // Dès 1024 px, le panneau des filtres est en place (colonne gauche) : il remplace les feuilles Filtres et Marque,
  // et le tri devient un menu déroulant.
  const enPlace = useDes('tab-l')
  const base = filtrer(c.tous, { ...f, sub: undefined, marque: undefined }, auj)
  const u = UNIVERS.find((x) => x.id === f.u)
  const aller = (maj: Record<string, string | null>) => {
    const n = new URLSearchParams(params)
    Object.entries(maj).forEach(([k, v]) => (v === null ? n.delete(k) : n.set(k, v)))
    naviguer({ search: n.toString() }, { replace: true })
  }
  // Filtre de livrabilité (bandeau d'origine) : retirable à mon relais, ou retrait possible aujourd'hui.
  const livrabilite = f.auj ? { cle: 'auj', titre: 'Retrait possible aujourd’hui' } : f.relais ? { cle: 'rel', titre: 'Retirable à mon relais' } : null
  const sansLivrabilite = livrabilite ? filtrer(c.tous, { ...f, auj: false, relais: false }) : []
  const masques = f.relais && !f.auj ? sansLivrabilite.filter(horsRelais).length : 0
  const retirerLivrabilite = () => aller({ auj: null, rel: null, f: null })
  // Autres filtres choisis par le client, retirables un à un.
  const actifs: [string, string][] = [
    ...(f.prixMin !== undefined ? ([['min', tf('dès {m} F', { m: F(f.prixMin) })]] as [string, string][]) : []),
    ...(f.prixMax !== undefined ? ([['max', tf('jusqu’à {m} F', { m: F(f.prixMax!) })]] as [string, string][]) : []),
    ...(f.km !== undefined ? ([['km', tf('à {k} km au plus', { k: f.km! })]] as [string, string][]) : []),
    ...(f.note !== undefined ? ([['note', tf('{n} ★ et plus', { n: f.note! })]] as [string, string][]) : []),
    ...(f.stock ? ([['stock', t('en stock')]] as [string, string][]) : []),
    ...(f.offert ? ([['offert', t('retrait offert')]] as [string, string][]) : []),
    ...(f.promo ? ([['promo', t('en promotion')]] as [string, string][]) : []),
    ...(f.marque ? ([['marque', f.marque]] as [string, string][]) : []),
  ]
  const nbFiltres = actifs.length + (livrabilite ? 1 : 0)
  const sansFiltres = filtrer(c.tous, { u: f.u, sub: f.sub }).length
  const dansSub = filtrer(c.tous, { ...f, marque: undefined }, auj)
  const lesMarques = [...new Set(dansSub.map(marqueDe))].sort()
  const choisie = sel ?? f.marque ?? null
  const nChoisie = choisie ? dansSub.filter((x) => marqueDe(x) === choisie).length : dansSub.length
  const proche = lePlusProche(liste)
  // Peu de produits retirables aujourd'hui dans une sous-catégorie : les sous-catégories voisines, même filtre.
  const voisines =
    f.auj && f.sub && u && liste.length < 4
      ? u.subs
          .filter((s) => s !== f.sub)
          .map((s) => ({ s, l: filtrer(c.tous, { ...f, sub: s }, auj), n: c.tous.filter((x) => x.univers === u.id && x.sousCategorie === s).length }))
          .filter((x) => x.l.length)
      : []
  const triChip = (k: string, x: string, icone: string) => (
    <a key={k} href="#" className={'chip' + ((f.tri ?? 'pertinence') === k ? ' on' : '')} aria-pressed={(f.tri ?? 'pertinence') === k} onClick={(e) => (e.preventDefault(), aller({ tri: k === 'pertinence' ? null : k }))}>
      {(f.tri ?? 'pertinence') === k ? <Icone nom="check" taille={15} trait={2.6} /> : <Icone nom={icone} taille={15} />}
      {t(x)}
    </a>
  )
  const carte = (x: Produit) => <CarteProduit key={x.p} p={x} favori={c.favoris.includes(x.p)} proche={x.p === proche} auChange={setMessage} />
  return (
    <>
      {p.avant}
      <div className="cl04-lchips scroll-x" aria-label={t('Tri et filtres')}>
        {enPlace && <TriListe tri={f.tri ?? 'pertinence'} choisir={(k) => aller({ tri: k === 'pertinence' ? null : k })} />}
        {!enPlace && (
          <>
            <Link to={chemin('recherche-filtres', Object.fromEntries([...params.entries(), ['retour', p.route]]))} className={'chip' + (nbFiltres ? ' on' : '')}>
              <Icone nom="sliders-horizontal" taille={15} />
              {nbFiltres ? tf('Filtres ({n})', { n: nbFiltres }) : t('Filtres')}
            </Link>
            <i className="sep"></i>
            {triChip('pertinence', 'Pertinence', 'check')}
            {triChip('proche', 'Au plus proche', 'map-pin')}
            {triChip(f.tri === 'prix' ? 'prix-desc' : 'prix', f.tri === 'prix' ? 'Prix décroissant' : 'Prix croissant', 'arrow-down-up')}
            {triChip('note', 'Mieux notés', 'star')}
          </>
        )}
        <a href="#" className={'chip' + (f.auj ? ' on' : '')} aria-pressed={!!f.auj} onClick={(e) => (e.preventDefault(), aller({ auj: f.auj ? null : '1', rel: null, f: null }))}>
          <Icone nom="clock" taille={15} />
          {t('Retirable aujourd’hui')}
        </a>
        {!enPlace && (
          <a href="#" className={'chip' + (f.marque ? ' on' : '')} onClick={(e) => (e.preventDefault(), setSel(null), marques.ouvrir())}>
            {t(f.marque ?? 'Marque')}
            <Icone nom="chevron-down" taille={15} />
          </a>
        )}
      </div>
      {u && (
        <nav className="cl04-subpills scroll-x" aria-label={t('Sous-catégories')}>
          <a href="#" className={!f.sub ? 'on' : ''} aria-current={!f.sub || undefined} onClick={(e) => (e.preventDefault(), aller({ sub: null }))}>
            {t('Tout ')}
            <span className="n">{base.length}</span>
          </a>
          {u.subs.map((s) => (
            <a key={s} href="#" className={f.sub === s ? 'on' : ''} aria-current={f.sub === s || undefined} onClick={(e) => (e.preventDefault(), aller({ sub: s }))}>
              {t(s + ' ')}
              <span className="n">{base.filter((x) => x.sousCategorie === s).length}</span>
            </a>
          ))}
        </nav>
      )}
      <div className="cl04-org">
        <Icone nom="map-pin" taille={15} />
        <span className="grow">
          {lieuR.diaspora ? t('Prix livrés et distances depuis le relais de ') : t('Prix livrés et distances depuis le ')}
          <b className="nw">{lieuR.diaspora ? lieuR.pq : t(c.relais?.nom ?? 'Relais Mvog-Ada')}</b>
        </span>
        {lieuR.diaspora ? (
          <Link to={lieuR.proche ? versPq.to : chemin('proches')} state={lieuR.proche ? versPq.state : undefined}>{t(lieuR.proche ? 'Changer' : 'Relier un proche')}</Link>
        ) : (
          <Link to={chemin('relais-selecteur', { retour: p.route + (params.toString() ? '?' + params.toString() : '') })}>{t('Changer')}</Link>
        )}
      </div>
      {livrabilite && (
        <div className="cl04-fl">
          <a href="#" aria-label={t('Retirer le filtre')} onClick={(e) => (e.preventDefault(), retirerLivrabilite())}>
            {t(livrabilite.titre)}
            <Icone nom="x" taille={15} trait={2.4} />
          </a>
          <span className="cl04-fn">
            {t('avec ton filtre · ')}
            <span>{sansLivrabilite.length}</span>
            {t(' en tout')}
          </span>
        </div>
      )}
      {masques > 0 && (
        <div className="hint-l">
          <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {tf(masques > 1 ? '{n} produits trop volumineux pour un relais sont masqués : ils se livrent à domicile. ' : '{n} produit trop volumineux pour un relais est masqué : il se livre à domicile. ', { n: masques })}
            <a href="#" className="cor cl04-il" onClick={(e) => (e.preventDefault(), retirerLivrabilite())}>
              {t('Les voir')}
            </a>
          </span>
        </div>
      )}
      {actifs.length > 0 && (
        <div className="chips">
          {actifs.map(([k, x]) => (
            <a key={k} href="#" className="chip on" aria-label={tf('Retirer le filtre {f}', { f: x })} onClick={(e) => (e.preventDefault(), aller({ [k]: null }))}>
              {x} <Icone nom="x" taille={14} />
            </a>
          ))}
          <a href="#" className="chip" onClick={(e) => (e.preventDefault(), aller({ min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, marque: null, rel: null, auj: null, f: null }))}>
            {t('Tout effacer')}
          </a>
        </div>
      )}
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      {liste.length ? (
        <div className="pgrid cl04-k">{liste.slice(0, vus).map(carte)}</div>
      ) : (
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="search" taille={26} />
            </div>
            {nbFiltres && sansFiltres ? (
              <>
                <h3>{t('Aucun produit avec ces filtres')}</h3>
                <p>{tf(sansFiltres > 1 ? 'Sans tes filtres, {n} produits t’attendent ici.' : 'Sans tes filtres, {n} produit t’attend ici.', { n: sansFiltres })}</p>
                <div className="btns">
                  <button type="button" className="btn primary" onClick={() => aller({ min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, marque: null, rel: null, auj: null, sub: null, f: null })}>
                    <span>{t('Effacer les filtres')}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>{f.sub ? tf('Pas encore de produit dans {s}', { s: t(f.sub) }) : t('Pas encore de produit ici')}</h3>
                <p>{lieuR.r('On démarche des vendeurs près de ton relais. En attendant, regarde l’univers entier ou cherche un produit précis.')}</p>
                <div className="btns">
                  {f.sub && u ? (
                    <button type="button" className="btn primary" onClick={() => aller({ sub: null, min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, marque: null, rel: null, auj: null, f: null })}>
                      <span>{tf('Voir tout {u}', { u: t(u.titre) })}</span>
                    </button>
                  ) : (
                    <Link to={chemin('categories')} className="btn primary">
                      <span>{t('Parcourir les catégories')}</span>
                    </Link>
                  )}
                </div>
                <div className="btns">
                  <Link to={chemin('recherche-saisie')} className="btn secondary">
                    <span>{t('Chercher un produit')}</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {reste && enAttente && <VoirPlus vus={vus} total={liste.length} plus={plus} />}
      {reste && !enAttente && (
        <>
          <div className="pgrid" ref={suite}>
            {[0, 1].map((i) => (
              <span key={i} className="cl04-sk">
                <i className="im"></i>
                <i style={{ height: '12px', margin: '12px 11px 0', width: '80%' }}></i>
                <i style={{ height: '12px', margin: '8px 11px 0', width: '50%' }}></i>
                <i style={{ height: '16px', margin: '10px 11px 16px', width: '40%' }}></i>
              </span>
            ))}
          </div>
          <div className="cl04-ld">
            <Icone nom="loader-circle" taille={18} />
            <span>{t('Chargement des produits suivants…')}</span>
          </div>
        </>
      )}
      {voisines.length > 0 && (
        <>
          <div className="hint-l">
            <Icone nom="layout-grid" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('{s} compte peu de produits retirables aujourd’hui : voici les sous-catégories voisines, avec le même filtre.', { s: t(f.sub!) })}</span>
          </div>
          {voisines.map((v) => (
            <div key={v.s}>
              <div className="cl04-div">
                <span>
                  {t('Aussi dans ')}
                  <span>{t(v.s)}</span>
                </span>
              </div>
              <div className="cl04-divl">
                <Link to={chemin('liste', { cat: u!.id, sub: v.s })}>
                  {t('Voir les ')}
                  <span className="nw">
                    <span>{v.n}</span>
                    {t(' produits')}
                  </span>
                  <Icone nom="chevron-right" taille={15} />
                </Link>
              </div>
              <div className="pgrid cl04-k">{v.l.slice(0, 2).map(carte)}</div>
            </div>
          ))}
        </>
      )}
      {marques.ouverte &&
        document.getElementById('app') &&
        createPortal(
          <Feuille ouverte={marques.ouverte} fermer={marques.fermer} titre={t('Marque')} forme="tiroir">
            <div className="cl04-sheet">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{t('Marque')}</h3>
                <a href="#" className={'cor b8 t14'} style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }} onClick={(e) => (e.preventDefault(), setSel(null), aller({ marque: null, sheet: null }))}>
                  {t('Tout effacer')}
                </a>
              </div>
              <p className="t13 c3" style={{ margin: '2px 0 0' }}>
                <span>{t(f.sub ?? (u ? u.titre : 'Tout le catalogue'))}</span>
                {t(' · ')}
                <span className="nw">
                  <span>{dansSub.length}</span>
                  {t(dansSub.length > 1 ? ' produits' : ' produit')}
                </span>
                <br />
                {t('Le nombre de chaque marque est réel.')}
              </p>
              <div className="chips">
                {lesMarques.map((m) => (
                  <a key={m} href="#" className={'chip' + (choisie === m ? ' on' : '')} aria-pressed={choisie === m} onClick={(e) => (e.preventDefault(), setSel(choisie === m ? null : m))}>
                    {choisie === m && <Icone nom="check" taille={15} trait={2.6} />}
                    {m + ' '}
                    <span className="n">{dansSub.filter((x) => marqueDe(x) === m).length}</span>
                  </a>
                ))}
              </div>
              <div className="btns mt20">
                <button type="button" className="btn primary" onClick={() => (aller({ marque: choisie, sheet: null }), setSel(null))}>
                  <span>
                    {t('Voir les ')}
                    <span className="nw">
                      <span>{nChoisie}</span>
                      {t(nChoisie > 1 ? ' produits' : ' produit')}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </Feuille>,
          document.getElementById('app')!,
        )}
    </>
  )
}

// Tri des listes en menu déroulant (dès 1024 px, § 6.4) : mêmes choix que les pastilles du téléphone.
export const TRIS: [string, string][] = [
  ['pertinence', 'Pertinence'],
  ['proche', 'Au plus proche'],
  ['prix', 'Prix croissant'],
  ['prix-desc', 'Prix décroissant'],
  ['note', 'Mieux notés'],
]
export function TriListe({ tri, choisir, choix = TRIS }: { tri: string; choisir: (k: string) => void; choix?: [string, string][] }) {
  const { t } = usePreferences()
  return (
    <label className="l-tri">
      <Icone nom="arrow-down-up" taille={15} />
      <span>{t('Trier')}</span>
      <select value={tri} onChange={(e) => choisir(e.target.value)} aria-label={t('Trier les produits')}>
        {choix.map(([k, x]) => (
          <option key={k} value={k}>
            {t(x)}
          </option>
        ))}
      </select>
      <Icone nom="chevron-down" taille={15} />
    </label>
  )
}
