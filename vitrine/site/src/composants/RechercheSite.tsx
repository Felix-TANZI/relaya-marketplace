// Recherche de l'en-tête de site (dès 768 px, DISPOSITION-ECRANS.md § 3.2 et § 5.3) : un vrai champ (sur téléphone,
// c'est un lien vers /recherche). Au focus (clic, ou « / » au clavier), un panneau s'ouvre sous le champ avec
// l'accueil de la recherche (tes recherches, recherches populaires comptées, marques, univers) ; dès deux
// lettres, les suggestions (recherches complétées et leur nombre, sous-catégories, produits et leur prix).
// Flèches haut et bas pour parcourir, Entrée pour choisir, Échap pour fermer. « Rechercher » ou Entrée ouvre les
// résultats. Le micro (si le navigateur le permet) ouvre « Je t'écoute… » en modale. Pas d'entonnoir (CRE-37).
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { chemin } from '../config/pages'
import { retenirRecherche } from '../donnees/recherches'
import { AccueilRecherche, Suggestions, suggestionsDe, useRechercheVocale, vocaleDisponible } from '../pages/CL-05/Commun'
import { usePreferences } from '../preferences'
import { useCatalogue } from './Catalogue'
import { Icone } from './Icone'
import { useDes } from './ecran'

const RECHERCHES = ['recherche', 'recherche-saisie', 'recherche-resultats', 'recherche-zero', 'recherche-filtres']

function Panneau({ id, q, chercher }: { id: string; q: string; chercher: (v: string) => void }) {
  const { t, tf } = usePreferences()
  const [c] = useCatalogue()
  const s = c && q.trim().length >= 2 ? suggestionsDe(c, q) : null
  return (
    <div id={id} className="hs-pan" aria-label={t('Suggestions de recherche')}>
      {!s ? (
        <AccueilRecherche c={c} />
      ) : (
        <>
          <Suggestions s={s} q={q} chercher={chercher} />
          <div className="btns">
            <button type="button" className="btn primary" onClick={() => chercher(q)}>
              <Icone nom="search" taille={18} />
              <span>{tf('Voir tous les résultats pour « {q} »', { q: q.trim() })}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function RechercheSite() {
  const { t } = usePreferences()
  // Tablette portrait : le champ est court, le texte indicatif aussi (il était coupé).
  const court = !useDes('tab-l')
  const naviguer = useNavigate()
  const lieu = useLocation()
  const id = useId().replace(/:/g, '')
  const route = lieu.pathname.slice(1)
  // Sur les pages de recherche, le champ reprend la recherche de l'adresse.
  const [q, setQ] = useState(() => (RECHERCHES.includes(route) ? (new URLSearchParams(lieu.search).get('q') ?? '') : ''))
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(-1)
  // Nouvelle recherche sur la même page (résultats → résultats) : le champ suit l'adresse.
  const qAdresse = RECHERCHES.includes(route) ? (new URLSearchParams(lieu.search).get('q') ?? '') : ''
  const [qVu, setQVu] = useState(qAdresse)
  if (qVu !== qAdresse) {
    setQVu(qAdresse)
    setQ(qAdresse)
  }
  const zone = useRef<HTMLDivElement>(null)
  const champ = useRef<HTMLInputElement>(null)
  const chercher = (v: string) => {
    if (!v.trim()) return
    retenirRecherche(v.trim())
    setOuvert(false)
    champ.current?.blur()
    naviguer(chemin('recherche-resultats', { q: v.trim() }))
  }
  const voix = useRechercheVocale(chercher)
  const soumettre = (e: FormEvent) => {
    e.preventDefault()
    // Champ vide : « Rechercher » ouvre le panneau (tes recherches, populaires, univers) dans le champ.
    if (!q.trim()) {
      champ.current?.focus()
      setOuvert(true)
      return
    }
    chercher(q)
  }
  // Options du panneau : ses liens et boutons, dans l'ordre de lecture.
  const options = () => [...(zone.current?.querySelectorAll<HTMLElement>('.hs-pan a[href], .hs-pan button') ?? [])]
  const clavier = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOuvert(false)
      setActif(-1)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
    if (!ouvert) {
      if (e.key !== 'Enter') setOuvert(true)
      return
    }
    const o = options()
    if (e.key === 'Enter') {
      if (actif >= 0 && o[actif]) {
        e.preventDefault()
        o[actif].click()
        setOuvert(false)
      }
      return
    }
    e.preventDefault()
    if (!o.length) return
    const i = e.key === 'ArrowDown' ? (actif + 1) % o.length : (actif - 1 + o.length) % o.length
    setActif(i)
  }
  // L'option active porte un identifiant (aria-activedescendant) et la classe .actif ; elle reste visible.
  useEffect(() => {
    const o = options()
    o.forEach((x, i) => {
      x.id = x.id || `${id}-o${i}`
      x.classList.toggle('actif', i === actif)
    })
    o[actif]?.scrollIntoView({ block: 'nearest' })
  })
  useEffect(() => setActif(-1), [q])
  // Clic dehors : le panneau se ferme.
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!zone.current?.contains(e.target as Node)) setOuvert(false)
    }
    window.addEventListener('pointerdown', dehors)
    return () => window.removeEventListener('pointerdown', dehors)
  }, [ouvert])
  // Changement de page : le panneau se ferme.
  useEffect(() => setOuvert(false), [lieu.pathname])
  // « / » met le focus dans la recherche (sauf dans un champ).
  useEffect(() => {
    const raccourci = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const cible = e.target as HTMLElement
      if (cible.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return
      e.preventDefault()
      champ.current?.focus()
    }
    window.addEventListener('keydown', raccourci)
    return () => window.removeEventListener('keydown', raccourci)
  }, [])
  const activeId = actif >= 0 ? options()[actif]?.id : undefined
  return (
    <div className="hs-rech" ref={zone}>
      <form className="srch glass hs-srch" role="search" onSubmit={soumettre}>
        <label className="srch-a">
          <Icone nom="search" taille={19} />
          <input
            ref={champ}
            type="text"
            role="combobox"
            aria-expanded={ouvert}
            aria-controls={id + '-pan'}
            aria-autocomplete="list"
            aria-activedescendant={ouvert ? activeId : undefined}
            aria-label={t('Chercher un produit')}
            placeholder={t(court ? 'Rechercher…' : 'Rechercher un produit, une marque…')}
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => (setQ(e.target.value), setOuvert(true))}
            onFocus={() => setOuvert(true)}
            onClick={() => setOuvert(true)}
            onKeyDown={clavier}
          />
        </label>
        {q && (
          <button type="button" className="hs-eff" aria-label={t('Effacer le texte')} onClick={() => (setQ(''), champ.current?.focus())}>
            <Icone nom="circle-x" taille={18} />
          </button>
        )}
        {vocaleDisponible() && (
          <button type="button" className="srch-mic" aria-label={t('Recherche vocale')} onClick={voix.ecouter}>
            <Icone nom="mic" taille={19} />
          </button>
        )}
        <button type="submit" className="srch-go" aria-label={t('Rechercher')}>
          <Icone nom="search" taille={20} trait={2.4} />
          <span className="hs-go-t">{t('Rechercher')}</span>
        </button>
      </form>
      {ouvert && <Panneau id={id + '-pan'} q={q} chercher={chercher} />}
      {/* Hors de l'en-tête (son verre ferait de lui le repère de la feuille) : dans #app, comme toute feuille. */}
      {voix.feuille && document.getElementById('app') && createPortal(voix.feuille, document.getElementById('app')!)}
    </div>
  )
}
