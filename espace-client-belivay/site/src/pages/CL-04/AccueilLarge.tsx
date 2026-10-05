// Accueil sur grand écran (DISPOSITION-ECRANS.md § 5.1, lot 5) : ce qui range les blocs de l'écran généré
// (Accueil.tsx) dans le gabarit catalogue, sans les réécrire.
// - Deplace / Cible : un bloc est DÉPLACÉ, jamais dupliqué. Sous son palier, il reste à sa place du téléphone ;
//   dès son palier, il est rendu (portail) dans la cible nommée, et plus du tout à sa place d'origine :
//   Flash Deals (.h0-flash) dans la colonne droite dès 1200 ; la carte « colis au relais » (.h0-float) en tête du
//   centre en 1024–1199, en tête de la colonne droite dès 1200 (comme sur les captures d'inspiration).
// - ColonneDroiteAccueil : colonne droite collante (dès 1200) : colis au relais, Flash Deals, garanties en 2 × 2
//   (textes vrais : argent bloqué, retour gratuit si problème validé, heures du support lues dans la source,
//   seuil du retrait offert calculé par la formule du panier).
// - TeteAccueil : cible « tête du centre » et carrousels du grand écran : flèches aux bords du carrousel (dès 768)
//   et des rails (dès 1024), points qui suivent la bande affichée, défilement automatique toutes les 6 s dès
//   1200, arrêté au survol, au focus et quand les animations sont réduites.
// Rien de tout cela n'est monté sur téléphone : le rendu à 375 px reste au pixel.
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../donnees/frais'
import { useMenuCoque } from '../../composants/donneesCoque'
import { auMoins, PALIERS, useEcran, type Palier } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'

// ---------- Cibles nommées ----------
const cibles = new Map<string, HTMLElement>()
const abonnes = new Set<() => void>()
let version = 0
const signaler = () => {
  version++
  abonnes.forEach((f) => f())
}
const abonner = (f: () => void) => (abonnes.add(f), () => abonnes.delete(f))

function useCible(nom: string | null) {
  useSyncExternalStore(abonner, () => version)
  return nom ? (cibles.get(nom) ?? null) : null
}

export function Cible({ nom, classe }: { nom: string; classe?: string }) {
  const poser = (el: HTMLDivElement | null) => {
    if (el) {
      if (cibles.get(nom) === el) return
      cibles.set(nom, el)
    } else if (cibles.has(nom)) cibles.delete(nom)
    else return
    queueMicrotask(signaler)
  }
  return <div ref={poser} className={classe} />
}

// Cible posée seulement dès un palier : rien sous ce palier, le rendu du téléphone reste au pixel. Sert au tri de
// l'accueil (« Trier : Pertinence »), rangé à droite du titre « Produits populaires » dès la tablette (§ 5.1).
export function CibleDes({ des, nom, classe }: { des: Palier; nom: string; classe?: string }) {
  return auMoins(useEcran(), des) ? <Cible nom={nom} classe={classe} /> : null
}

// vers : le nom de la cible selon le palier (le plus haut palier atteint l'emporte).
export function Deplace({ vers, children }: { vers: Partial<Record<Palier, string>>; children: ReactNode }) {
  const ecran = useEcran()
  const palier = PALIERS.filter((p) => vers[p] && auMoins(ecran, p)).pop()
  const nom = palier ? vers[palier]! : null
  const cible = useCible(nom)
  if (!nom) return <>{children}</>
  // Palier atteint : le bloc n'est plus à sa place d'origine ; il attend sa cible (posée au même rendu).
  return cible ? createPortal(children, cible) : null
}

// ---------- Colonne droite (dès 1200) ----------
export function ColonneDroiteAccueil() {
  const { t, tf } = usePreferences()
  const menu = useMenuCoque()
  const support = menu?.support
  const garanties: [string, string, string, string][] = [
    ['shield-check', 'Escrow', 'Argent bloqué jusqu’au retrait', chemin('faq', { t: 'paiement', a: '1' })],
    ['rotate-ccw', 'Retours', 'Retour gratuit si problème validé', chemin('legal-doc', { d: 'retours' })],
    ['headset', 'Support', support ? tf('Support {o} h – {f} h', { o: support.ouverture, f: support.fermeture }) : 'Aide 7 j/7', chemin('aide')],
    ['gift', 'Retrait', tf('Retrait offert dès {s} F', { s: F(PARAMETRES.seuilRelais) }), chemin('faq', { t: 'retrait' })],
  ]
  return (
    <div className="acc-droite">
      <Cible nom="acc-colis" />
      <Cible nom="acc-flash" />
      <section className="acc-gar" aria-label={t('Nos garanties')}>
        {garanties.map(([i, k, x, l]) => (
          <Link key={k} to={l}>
            <Icone nom={i} taille={18} />
            <span className="k">{t(k)}</span>
            <b>{t(x)}</b>
          </Link>
        ))}
      </section>
    </div>
  )
}

// ---------- Tête du centre et carrousels ----------
const reduites = () => document.documentElement.dataset.anim === 'reduites' || matchMedia('(prefers-reduced-motion: reduce)').matches

function Fleches({ rail, hero }: { rail: HTMLElement; hero: boolean }) {
  const { t } = usePreferences()
  const parent = rail.parentElement
  const [haut, setHaut] = useState(0)
  const [bords, setBords] = useState<[boolean, boolean]>([true, false])
  useLayoutEffect(() => {
    const mesurer = () => {
      setHaut(rail.offsetTop + rail.offsetHeight / 2)
      const max = rail.scrollWidth - rail.clientWidth
      setBords([rail.scrollLeft <= 2, rail.scrollLeft >= max - 2])
    }
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(rail)
    if (parent) ro.observe(parent)
    rail.addEventListener('scroll', mesurer, { passive: true })
    return () => (ro.disconnect(), rail.removeEventListener('scroll', mesurer))
  }, [rail, parent])
  if (!parent || (bords[0] && bords[1])) return null
  const aller = (s: 1 | -1) => {
    const pas = hero ? rail.clientWidth : rail.clientWidth * 0.8
    rail.scrollBy({ left: s * pas, behavior: reduites() ? 'auto' : 'smooth' })
  }
  return createPortal(
    <>
      <button type="button" className="rail-fl g" style={{ top: haut }} aria-label={t('Précédent')} disabled={bords[0]} onClick={() => aller(-1)}>
        <Icone nom="chevron-left" taille={20} trait={2.4} />
      </button>
      <button type="button" className="rail-fl d" style={{ top: haut }} aria-label={t('Suivant')} disabled={bords[1]} onClick={() => aller(1)}>
        <Icone nom="chevron-right" taille={20} trait={2.4} />
      </button>
    </>,
    parent,
  )
}

export function TeteAccueil() {
  const ecran = useEcran()
  const lieu = useLocation()
  const [rails, setRails] = useState<HTMLElement[]>([])
  const tabL = auMoins(ecran, 'tab-l')
  useLayoutEffect(() => {
    const main = document.querySelector('#app main')
    if (!main) return
    setRails([...main.querySelectorAll<HTMLElement>(tabL ? '.h0-hero, .gab-contenu .h0-row' : '.h0-hero')])
  }, [tabL, lieu.search])
  // Carrousel : points qui suivent la bande ; défilement automatique dès 1200.
  const hero = rails.find((r) => r.classList.contains('h0-hero'))
  const pc = auMoins(ecran, 'pc')
  useEffect(() => {
    if (!hero) return
    const points = hero.nextElementSibling?.classList.contains('h0-dots') ? [...hero.nextElementSibling.children] : []
    const indice = () => Math.round(hero.scrollLeft / Math.max(1, hero.clientWidth))
    const suivre = () => points.forEach((p, i) => p.classList.toggle('on', i === indice() % Math.max(1, points.length)))
    hero.addEventListener('scroll', suivre, { passive: true })
    // Défilement automatique : à toutes les tailles, dans composants/Animations.tsx (defilementAuto).
    return () => {
      hero.removeEventListener('scroll', suivre)
    }
  }, [hero])
  if (!auMoins(ecran, 'tab')) return null
  return (
    <>
      {!pc && <Cible nom="acc-tete" classe="acc-tete" />}
      {rails.map((r, i) => (
        <Fleches key={i + r.className} rail={r} hero={r === hero} />
      ))}
    </>
  )
}
