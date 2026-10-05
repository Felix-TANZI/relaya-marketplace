// Colonne Catégories du gabarit catalogue (dès 1024 px, DISPOSITION-ECRANS.md § 3.5) : accueil, catégories, liste
// d'un univers, résultats, promotions, sélection, ventes flash.
// - 1024–1199 : rail de 72 px (icônes, info-bulle au survol et au focus) ; « » » la déplie en panneau par-dessus le
//   contenu, fermé par Échap ou un clic dehors ;
// - dès 1200 : dépliée par défaut en 264 px, repliable en rail, comme sur les captures d'inspiration (le porteur,
//   5 oct. : l'ordre des captures prime sur le document).
// Si le contenu passait sous 560 px, la colonne reste en rail ; dépliée à la main, elle se pose alors par-dessus. Le choix est gardé
// (localStorage « blv-colonne-cat », par confort). Contenu : « Catégories » et le bouton plier/déplier, « Tout
// voir », les dix univers (ceux choisis à l'arrivée d'abord) avec leur nombre réel de produits (masqué à 0) et, au
// survol, leurs sous-catégories ; puis « Mon relais » et le rappel du retrait offert (seuil et prix du retrait
// calculés par la formule du panier).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { chemin } from '../config/pages'
import { PARAMETRES } from '../donnees/frais'
import { source } from '../donnees/source'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { useSession } from '../session'
import { UNIVERS } from './Catalogue'
import { useGarde, useMenuCoque, useProduitsCoque } from './donneesCoque'
import { auMoins, useEcran } from './ecran'
import { useFeuille } from './Feuille'
import { useLieu } from './PourQui'
import { Icone } from './Icone'

export type EtatColonne = 'rail' | 'deplie' | 'survol' // survol : dépliée par-dessus le contenu
const CLE = 'blv-colonne-cat'

function lu(): 'rail' | 'deplie' | null {
  try {
    const v = localStorage.getItem(CLE)
    return v === 'rail' || v === 'deplie' ? v : null
  } catch {
    return null
  }
}
function garder(v: 'rail' | 'deplie') {
  try {
    localStorage.setItem(CLE, v)
  } catch {
    /* stockage indisponible : le choix vaut pour la visite */
  }
}

// État de la colonne pour le gabarit (posé sur la grille en data-cat) : le choix gardé, sinon celui du palier.
export function useEtatColonne(): [EtatColonne, (v: 'rail' | 'deplie') => void, boolean] {
  const ecran = useEcran()
  const [choix, setChoix] = useState(lu)
  // Choisi à la main pendant la visite (sinon : l'état par défaut du palier, ou le choix gardé).
  const [main, setMain] = useState(false)
  const voulu = choix ?? (auMoins(ecran, 'pc') ? 'deplie' : 'rail')
  // En tablette paysage, la colonne dépliée se pose toujours par-dessus le contenu.
  const etat: EtatColonne = voulu === 'deplie' && !auMoins(ecran, 'pc') ? 'survol' : voulu
  const changer = (v: 'rail' | 'deplie') => {
    setChoix(v)
    setMain(true)
    if (auMoins(ecran, 'pc')) garder(v)
  }
  return [etat, changer, main]
}

export function ColonneCategories({ etat, changer, avecDroite, aLaMain }: { etat: EtatColonne; changer: (v: 'rail' | 'deplie') => void; avecDroite?: boolean; aLaMain?: boolean }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  const lieu = useLocation()
  const menu = useMenuCoque()
  const produits = useProduitsCoque() ?? []
  const interets = useGarde('interets', () => source.interets()) ?? []
  const [survole, setSurvole] = useState<string | null>(null)
  const boite = useRef<HTMLDivElement>(null)
  // Contenu trop étroit (sous 560 px) si la colonne se dépliait sur place : elle se déplie par-dessus.
  const [serre, setSerre] = useState(false)
  useLayoutEffect(() => {
    const gab = boite.current?.closest('.gab') as HTMLElement | null
    if (!gab) return
    const mesurer = () => setSerre(gab.clientWidth - 264 - (avecDroite ? 320 : 0) - 64 < 560)
    mesurer()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(mesurer) : null
    ro?.observe(gab)
    return () => ro?.disconnect()
  }, [avecDroite])
  const effectif: EtatColonne = etat === 'deplie' && serre ? (aLaMain ? 'survol' : 'rail') : etat
  useLayoutEffect(() => {
    const gab = boite.current?.closest('.gab') as HTMLElement | null
    if (gab) gab.dataset.cat = effectif
  }, [effectif])
  // Dépliée par-dessus : Échap ou un clic dehors la replie.
  useEffect(() => {
    if (effectif !== 'survol') return
    const fermer = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !boite.current?.contains(e.target as Node)) changer('rail')
    }
    window.addEventListener('keydown', fermer)
    window.addEventListener('pointerdown', fermer)
    return () => (window.removeEventListener('keydown', fermer), window.removeEventListener('pointerdown', fermer))
  }, [effectif, changer])

  const params = new URLSearchParams(lieu.search)
  const route = lieu.pathname.slice(1)
  const depuisListe = route === 'liste'
  const choisi = depuisListe ? params.get('cat') : route === 'categories' ? params.get('u') : null
  const lien = (id: string) => (depuisListe ? chemin('liste', { cat: id }) : chemin('categories', { u: id }))
  const univers = [...UNIVERS].sort((a, b) => Number(interets.includes(b.id)) - Number(interets.includes(a.id)))
  const nombre = (id: string) => menu?.univers.find((m) => m.id === id)?.produits ?? 0
  const total = menu ? menu.univers.reduce((a, u) => a + u.produits, 0) : 0
  const ouvert = effectif !== 'rail'
  const quartier = (s.relais?.nom ?? '').replace(/^Relais\s+/, '')
  const pq = useLieu()
  const choixProche = useFeuille('pour-qui')
  const retrait = PARAMETRES.ramassage + PARAMETRES.remiseRelais.S
  const sous = survole ? UNIVERS.find((u) => u.id === survole) : null
  return (
    <div className={'cc' + (ouvert ? ' ouvert' : '')} ref={boite} onMouseLeave={() => setSurvole(null)}>
      <div className="cc-hd">
        <span className="kick">{t('Catégories')}</span>
        <button
          type="button"
          className="cc-pli"
          aria-expanded={ouvert}
          aria-label={t(ouvert ? 'Replier les catégories' : 'Déplier les catégories')}
          onClick={() => changer(ouvert ? 'rail' : 'deplie')}
        >
          <Icone nom={ouvert ? 'chevron-left' : 'chevron-right'} taille={18} />
        </button>
      </div>
      <ul className="cc-ls">
        <li>
          <Link to={depuisListe ? chemin('liste') : chemin('categories')} className={'cc-u' + (route === '' && !choisi ? ' on' : '')} aria-current={route === '' ? 'page' : undefined} aria-describedby="cc-tip-tout">
            <Icone nom="layout-grid" taille={20} />
            <span className="cc-t">{t('Tout voir')}</span>
            {total > 0 && <span className="cc-n">{total}</span>}
            <span className="cc-tip" role="tooltip" id="cc-tip-tout">
              {t('Tout voir')}
            </span>
          </Link>
        </li>
        {univers.map((u) => {
          const n = nombre(u.id)
          return (
            <li key={u.id} onMouseEnter={() => setSurvole(u.id)}>
              <Link to={lien(u.id)} className={'cc-u' + (choisi === u.id ? ' on' : '')} aria-current={choisi === u.id ? 'page' : undefined} aria-describedby={'cc-tip-' + u.id} onFocus={() => setSurvole(u.id)}>
                <Icone nom={u.icone} taille={20} />
                <span className="cc-t">{t(u.titre)}</span>
                {n > 0 && <span className="cc-n">{n}</span>}
                <span className="cc-tip" role="tooltip" id={'cc-tip-' + u.id}>
                  {t(u.titre)}
                  {n > 0 && ' · ' + n}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {ouvert && sous && (
        <div className="cc-sous" aria-label={t(sous.titre)}>
          <div className="kick">{t(sous.titre)}</div>
          {sous.subs.map((x) => {
            const n = produits.filter((p) => p.univers === sous.id && p.sousCategorie === x).length
            return (
              <Link key={x} to={chemin('liste', { cat: sous.id, sub: x })}>
                <span className="grow">{t(x)}</span>
                {n > 0 && <span className="cc-n">{n}</span>}
              </Link>
            )
          })}
        </div>
      )}
      {s.relais && (
        <div className="cc-relais">
          <Icone nom="map-pin" taille={20} />
          <div className="cc-t">
            <b>{t('Mon relais')}</b>
            <span>{t(quartier)}</span>
            <small>{t(s.relais.horaireDuJour)}</small>
            <Link to={chemin('relais-selecteur', { retour: route + lieu.search })}>{t('Changer')}</Link>
          </div>
        </div>
      )}
      {pq.diaspora && (
        <div className="cc-relais">
          <Icone nom="users" taille={20} />
          <div className="cc-t">
            <b>{t('Pour qui ?')}</b>
            <span>{pq.proche ? (pq.proche.quartier ? tf('{p} · {q}', { p: pq.proche.prenom, q: t(pq.proche.quartier) }) : pq.proche.prenom) : t('Aucun proche relié')}</span>
            <small>{t('Les distances partent de son relais')}</small>
            {pq.proche ? (
              <button type="button" className="lien-pq" onClick={choixProche.ouvrir}>
                {t('Changer')}
              </button>
            ) : (
              <Link to={chemin('proches')}>{t('Relier un proche')}</Link>
            )}
          </div>
        </div>
      )}
      <div className="cc-offert">
        <Icone nom="gift" taille={20} />
        <div className="cc-t">
          <b>{tf('Retrait offert au relais dès {s} F d’achat', { s: F(PARAMETRES.seuilRelais) })}</b>
          <small>{tf('En dessous, la livraison au relais coûte {m} F par colis.', { m: F(retrait) })}</small>
        </div>
      </div>
    </div>
  )
}
