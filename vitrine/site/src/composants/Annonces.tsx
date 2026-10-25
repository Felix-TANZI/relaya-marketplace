// Annonces sponsorisées (DP-59) à l'écran : étiquette « Sponsorisé » toujours visible et sa feuille « Pourquoi je
// vois ceci ? » (avec « Signaler cette annonce »), annonces d'une recherche ou d'une catégorie mêlées aux résultats
// (donnees/annonces.ts : densité, 1 sur 6 au téléphone, Boost au tri « pertinence »), emplacements de l'accueil.
// Retour vers le vendeur : une impression quand l'annonce est à moitié visible (une par campagne, emplacement et
// visite), le clic enregistré sans retenir la navigation. Aucune annonce sur les pages de paiement, de commande,
// de retrait ni de litige (pubPermise). Une annonce signalée est aussitôt masquée pour ce client ; une même annonce
// au clic n'est pas répétée au-delà de REPETITION_MAX affichages par visite.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { classerAvecBoost, placerAnnonces, pubPermise, reglesEcran, REPETITION_MAX, type OffreClassee } from '../donnees/annonces'
import { source, type AnnonceSponsorisee, type AnnoncesListe, type EmplacementsAccueil, type EmplacementVu, type MotifSignalement, type Produit } from '../donnees/source'
import { usePreferences } from '../preferences'
import { useDes } from './ecran'
import { VISITE_MS } from '../donnees/parametresPub'
import { Feuille } from './Feuille'
import { Icone } from './Icone'

// ---------- Visite, affichages, annonces masquées ----------
function lire<T>(stock: () => Storage, cle: string, defaut: T): T {
  try {
    const v = stock().getItem(cle)
    return v ? (JSON.parse(v) as T) : defaut
  } catch {
    return defaut
  }
}
function ecrire(stock: () => Storage, cle: string, v: unknown) {
  try {
    stock().setItem(cle, JSON.stringify(v))
  } catch {
    /* stockage refusé : la visite seule */
  }
}
const SESSION = () => sessionStorage
const APPAREIL = () => localStorage

// Visite : tirée à la première annonce de l'onglet, envoyée avec chaque impression (le serveur en compte une par
// client, campagne, emplacement et visite).
let visiteCourante: string | null = null
const VISITE_ACTIVITE = 'blv_pub_visite_vue'
function visite(): string {
  const t = Date.now()
  visiteCourante ??= lire<string | null>(SESSION, 'blv_pub_visite', null)
  // Visite terminée (VD-PUB-VISITE : inactivité) : nouvelle visite, impressions et affichages recomptés.
  if (visiteCourante && t - lire<number>(SESSION, VISITE_ACTIVITE, t) > VISITE_MS) {
    visiteCourante = null
    ecrire(SESSION, VUES, [])
    ecrire(SESSION, AFFICHAGES, {})
  }
  if (!visiteCourante) {
    visiteCourante = t.toString(36) + Math.random().toString(36).slice(2, 8)
    ecrire(SESSION, 'blv_pub_visite', visiteCourante)
  }
  ecrire(SESSION, VISITE_ACTIVITE, t)
  return visiteCourante
}
const VUES = 'blv_pub_vues' // `${campagne}|${emplacement}` déjà comptés pendant la visite
const AFFICHAGES = 'blv_pub_affichages' // campagne → affichages pendant la visite (plafond de répétition)
const MASQUEES = 'blv_pub_masquees' // campagnes signalées par ce client : plus montrées

let versionMasquees = 0
const abonnes = new Set<() => void>()
function masquer(campagne: string) {
  ecrire(APPAREIL, MASQUEES, [...new Set([...lire<string[]>(APPAREIL, MASQUEES, []), campagne])])
  versionMasquees++
  abonnes.forEach((f) => f())
}
// Campagnes masquées (relu à chaque signalement).
const abonner = (f: () => void) => (abonnes.add(f), () => void abonnes.delete(f))
export function useMasquees(): Set<string> {
  const v = useSyncExternalStore(abonner, () => versionMasquees)
  return useMemo(() => new Set(v >= 0 ? lire<string[]>(APPAREIL, MASQUEES, []) : []), [v])
}
const repetee = (a: AnnonceSponsorisee) => (lire<Record<string, number>>(SESSION, AFFICHAGES, {})[a.campagne] ?? 0) >= REPETITION_MAX

// Une annonce montrée : compte un affichage (plafond de répétition) et, la première fois de la visite pour cette
// campagne à cet emplacement, une impression au serveur.
function montrer(jeton: string, campagne: string, ou: EmplacementVu) {
  const v = visite() // d'abord : une visite terminée remet les compteurs à zéro
  const aff = lire<Record<string, number>>(SESSION, AFFICHAGES, {})
  aff[campagne] = (aff[campagne] ?? 0) + 1
  ecrire(SESSION, AFFICHAGES, aff)
  const vues = lire<string[]>(SESSION, VUES, [])
  const cle = campagne + '|' + ou
  if (vues.includes(cle)) return
  ecrire(SESSION, VUES, [...vues, cle])
  source.voirAnnonce(jeton, ou, v).catch(() => undefined)
}

// Impression : l'élément (sa carte) à moitié visible au moins, une fois par montage.
export function useVu(ref: RefObject<HTMLElement | null>, jeton: string | null | undefined, campagne: string | null | undefined, ou: EmplacementVu) {
  useEffect(() => {
    const el = ref.current
    if (!el || !jeton || typeof IntersectionObserver === 'undefined') return
    const cible = el.closest<HTMLElement>('a, .h0-band, .pcard, .cl05-row') ?? el.parentElement ?? el
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          montrer(jeton, campagne || jeton, ou)
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(cible)
    return () => io.disconnect()
  }, [ref, jeton, campagne, ou])
}

// Repère invisible d'une annonce sans étiquette (produit en Boost, offre de la sélection flash) : impression comptée.
export function VuAnnonce({ jeton, campagne, ou }: { jeton: string | null | undefined; campagne?: string; ou: EmplacementVu }) {
  const ref = useRef<HTMLSpanElement>(null)
  useVu(ref, jeton, campagne ?? jeton, ou)
  return jeton ? <span ref={ref} className="spn-vu" aria-hidden="true" /> : null
}

// Toucher d'une annonce (ou d'un produit en Boost, d'une offre de la sélection) : le clic part au serveur (facturé
// une fois par client et par jour pour le clic, compté sinon), la navigation suit sans l'attendre.
export function cliquerAnnonce(a: AnnonceSponsorisee | string | null | undefined) {
  const id = typeof a === 'string' ? a : a?.id
  if (id) source.cliquerAnnonce(id).catch(() => undefined)
}

// Publicité permise sur l'écran ouvert (jamais sur les pages de paiement, commande, retrait, litige).
export const usePubPermise = () => pubPermise(useLocation().pathname)

// Annonces et Boost d'une recherche ou d'une catégorie ; null tant qu'elles ne sont pas là (ou si la route échoue).
// Lues à chaque ouverture : une campagne mise en pause ou au budget épuisé n'est plus renvoyée par le serveur.
export function useAnnoncesListe(ou: 'recherche' | 'categorie', q: string | null, cat: string | null): AnnoncesListe | null {
  const permise = usePubPermise()
  const [d, setD] = useState<{ cle: string; v: AnnoncesListe } | null>(null)
  const cle = `${ou}|${q ?? ''}|${cat ?? ''}`
  useEffect(() => {
    if (!permise) return
    let vivant = true
    source.annoncesListe(ou, q, cat).then(
      // Plafond de répétition : jugé à la lecture (la liste ne change pas sous les yeux du client).
      (v) => vivant && setD({ cle, v: { ...v, annonces: v.annonces.filter((a) => !repetee(a)) } }),
      () => vivant && setD(null),
    )
    return () => {
      vivant = false
    }
  }, [cle, ou, q, cat, permise])
  const masquees = useMasquees()
  if (!permise || d?.cle !== cle) return null
  return { ...d.v, annonces: d.v.annonces.filter((a) => !masquees.has(a.campagne)) }
}

export interface ElementListe {
  p: Produit
  annonce: AnnonceSponsorisee | null
  boost: string | null // jeton de la campagne Boost du produit (impression et clic comptés)
}

// Les résultats affichés : au tri « pertinence » seulement, Boost puis annonces mêlées (au plus 20 % des positions,
// 2 sur 10, 1 sur 6 au téléphone, jamais au-dessus d'une offre moins chère et mieux notée du même produit). Une
// annonce n'est montrée que si son produit est déjà dans les résultats filtrés (même recherche, même catégorie, mêmes
// filtres) : elle y remonte, sans ajouter de ligne, et le nombre de produits ne change pas. La fiche commune d'un
// résultat n'est connue que pour les produits annoncés ; les autres sont leur propre fiche.
export function melerAnnonces(liste: Produit[], d: AnnoncesListe | null, tri: string, telephone: boolean): ElementListe[] {
  const boost = (p: Produit) => d?.jetonsBoost?.[p.p] ?? null
  if (!d || tri !== 'pertinence') return liste.map((p) => ({ p, annonce: null, boost: d && d.boosts.includes(p.p) ? boost(p) : null }))
  const classee = classerAvecBoost(liste, (p) => p.p, d.boosts, d.regles)
  const presents = new Map(classee.map((p) => [p.p, p]))
  const annonces = d.annonces.filter((a, i) => presents.has(a.p) && d.annonces.findIndex((x) => x.p === a.p) === i)
  const fiche = new Map(annonces.map((a) => [a.p, a.fiche]))
  type Offre = OffreClassee & { p: Produit; annonce: AnnonceSponsorisee | null }
  const offre = (p: Produit, annonce: AnnonceSponsorisee | null): Offre => ({ cle: p.p, produit: fiche.get(p.p) ?? p.p, prix: p.depuis ?? p.prix, note: Number(String(p.note ?? '0').replace(',', '.')), p, annonce })
  const positions = placerAnnonces(
    classee.map((p) => offre(p, null)),
    annonces.map((a) => offre(presents.get(a.p)!, a)),
    reglesEcran(d.regles, telephone),
  )
  return positions.map((x) => ({ p: x.resultat.p, annonce: x.sponsorise ? x.resultat.annonce : null, boost: !x.sponsorise && d.boosts.includes(x.resultat.p.p) ? boost(x.resultat.p) : null }))
}
// Téléphone (sous 768 px) : la règle « 1 sur 6 ».
export const useTelephone = () => !useDes('tab')

// Emplacements achetés de l'accueil et leurs produits : relus à chaque ouverture de l'accueil (ordre de la rotation
// tiré par le serveur, campagne arrêtée retirée) ; la dernière lecture s'affiche en attendant.
export interface DonneesEmplacements {
  e: EmplacementsAccueil
  produits: Record<string, Produit>
}
let derniersEmplacements: DonneesEmplacements | null = null
const produitsLus = new Map<string, Promise<Produit | null>>()
const produitDe = (p: string) => {
  if (!produitsLus.has(p)) produitsLus.set(p, source.produit(p).catch(() => null))
  return produitsLus.get(p)!
}
export function useEmplacementsAccueil(): DonneesEmplacements | null {
  const permise = usePubPermise()
  const [d, setD] = useState(derniersEmplacements)
  useEffect(() => {
    if (!permise) return
    let vivant = true
    source
      .emplacementsAccueil()
      .then(async (e) => {
        const ids = [...new Set([...e.aLaUne, ...e.carrousel].map((a) => a.p))]
        const lus = await Promise.all(ids.map(produitDe))
        const produits = Object.fromEntries(lus.filter((p): p is Produit => !!p).map((p) => [p.p, p]))
        derniersEmplacements = { e, produits }
        if (vivant) setD(derniersEmplacements)
      })
      .catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [permise])
  const masquees = useMasquees()
  if (!permise || !d) return null
  return { ...d, e: { ...d.e, aLaUne: d.e.aLaUne.filter((a) => !masquees.has(a.campagne)), carrousel: d.e.carrousel.filter((a) => !masquees.has(a.campagne)) } }
}

// Annonces au clic d'une rangée de l'accueil (catégorie, ou toutes) et leurs produits, sans celles déjà montrées
// ailleurs sur l'écran (exclus : produits déjà présents au-dessus).
export function useAnnoncesRangee(cat: string | null): { annonces: AnnonceSponsorisee[]; produits: Record<string, Produit>; d: AnnoncesListe } | null {
  const d = useAnnoncesListe('categorie', null, cat)
  const [produits, setProduits] = useState<Record<string, Produit>>({})
  const ids = (d?.annonces ?? []).map((a) => a.p).join(',')
  useEffect(() => {
    if (!ids) return
    let vivant = true
    Promise.all(ids.split(',').map(produitDe)).then((l) => vivant && setProduits(Object.fromEntries(l.filter((p): p is Produit => !!p).map((p) => [p.p, p]))))
    return () => {
      vivant = false
    }
  }, [ids])
  if (!d) return null
  return { annonces: d.annonces.filter((a) => produits[a.p]), produits, d }
}

// ---------- Étiquette « Sponsorisé » et sa feuille ----------
const MOTIFS: [MotifSignalement, string][] = [
  ['trompeuse', 'Trompeuse ou prix faux'],
  ['inappropriee', 'Choquante ou inappropriée'],
  ['interdit', 'Produit interdit ou contrefait'],
  ['repetitive', 'Je la vois trop souvent'],
  ['autre', 'Autre raison'],
]

// Étiquette « Sponsorisé » (pastille posée sur la carte ou dans la ligne) : un seul bouton, qui ouvre la feuille
// « Pourquoi je vois ceci ? ». Posée dans un lien : elle n'ouvre jamais le produit ni ne compte un clic. Avec son
// annonce, elle compte l'impression de la carte (ou : l'emplacement).
export function Sponsorise({ classe, annonce, ou }: { classe?: string; annonce?: AnnonceSponsorisee | null; ou?: EmplacementVu }) {
  const { t } = usePreferences()
  const [ouverte, setOuverte] = useState(false)
  const [etape, setEtape] = useState<'pourquoi' | 'signaler' | 'merci'>('pourquoi')
  const ref = useRef<HTMLSpanElement>(null)
  useVu(ref, annonce?.id, annonce?.campagne, ou ?? 'recherche')
  const ouvrir = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEtape('pourquoi')
    setOuverte(true)
  }
  const signaler = (m: MotifSignalement) => {
    if (!annonce) return
    source.signalerAnnonce(annonce.id, m).catch(() => undefined)
    setEtape('merci')
  }
  const fermer = () => {
    setOuverte(false)
    // L'annonce signalée disparaît à la fermeture de la feuille (pas sous les yeux, pendant la lecture du merci).
    if (etape === 'merci' && annonce) masquer(annonce.campagne)
  }
  const app = typeof document === 'undefined' ? null : document.getElementById('app')
  return (
    <>
      <span
        ref={ref}
        className={'spn' + (classe ? ' ' + classe : '')}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={ouverte}
        aria-label={t('Sponsorisé · Pourquoi je vois ceci ?')}
        title={t('Pourquoi je vois ceci ?')}
        onClick={ouvrir}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ouvrir(e)}
      >
        {t('Sponsorisé')}
        <Icone nom="info" taille={12} trait={2.2} />
      </span>
      {app &&
        ouverte &&
        createPortal(
          // Les événements d'un portail remontent l'arbre React : arrêtés ici, ils n'ouvrent pas le produit.
          <div style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
            <Feuille ouverte={ouverte} fermer={fermer} titre={t(etape === 'signaler' ? 'Signaler cette annonce' : 'Pourquoi je vois ceci ?')}>
              <div className="spn-f">
                {etape === 'pourquoi' && (
                  <>
                    <h2>{t('Pourquoi je vois ceci ?')}</h2>
                    <p>{t('Ce vendeur a payé pour montrer ce produit ici. Il remplit nos critères de qualité : en stock, bon Trust Score, aucun litige en cours.')}</p>
                    <p>{t('Une annonce n’est jamais placée au-dessus d’une offre moins chère et mieux notée du même produit.')}</p>
                    <button type="button" className="btn primary" onClick={fermer}>
                      <span>{t('J’ai compris')}</span>
                    </button>
                    {annonce && (
                      <button type="button" className="spn-sg" onClick={() => setEtape('signaler')}>
                        <Icone nom="flag" taille={15} />
                        {t('Signaler cette annonce')}
                      </button>
                    )}
                  </>
                )}
                {etape === 'signaler' && (
                  <>
                    <h2>{t('Signaler cette annonce')}</h2>
                    <p>{t('Notre équipe la relit. Elle ne te sera plus montrée.')}</p>
                    <div className="spn-m">
                      {MOTIFS.map(([m, l]) => (
                        <button key={m} type="button" onClick={() => signaler(m)}>
                          <span>{t(l)}</span>
                          <Icone nom="chevron-right" taille={16} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {etape === 'merci' && (
                  <>
                    <h2>{t('Merci, c’est noté')}</h2>
                    <p>{t('Cette annonce ne te sera plus montrée. Notre équipe la relit.')}</p>
                    <button type="button" className="btn primary" onClick={fermer}>
                      <span>{t('Fermer')}</span>
                    </button>
                  </>
                )}
              </div>
            </Feuille>
          </div>,
          app,
        )}
    </>
  )
}
