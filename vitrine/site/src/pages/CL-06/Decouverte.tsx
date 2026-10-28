// Découverte sous la fiche produit (CL-06), après la description, les caractéristiques et les avis : on continue à
// découvrir des produits sans quitter la fiche, comme le flux « Pour vous » de l'accueil (même carte, même chargement).
// - Lot 1 « Produits similaires » : même univers, la même sous-catégorie d'abord (8 au plus).
// - Lot 2 « Du même vendeur » : la boutique de l'offre attribuée (8 au plus), s'il en reste.
// - Lots suivants « Vous aimerez aussi » : le classement de l'accueil (donnees/pourVous.ts) par 20, sans fin ; le
//   catalogue épuisé, un nouveau mélange recommence (sequence, comme l'accueil : jamais deux fois le même produit
//   dans une même page de 20).
// Aucun doublon entre les trois parties ni avec le produit de la fiche ; photo 1 de chaque produit, cœur favori
// (useCoeursFavoris), prix. Chaque lot part en approchant du bas (IntersectionObserver sur le conteneur qui défile).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCoeursFavoris } from '../../composants/CoeursFavoris'
import { Icone } from '../../composants/Icone'
import { classerPourVous, lireGouts, type Contexte } from '../../donnees/pourVous'
import { source, type Produit } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { CartePourVous, PAGE, sequence } from '../CL-04/PourVous'

const PAR_PARTIE = 8
const note = (p: Produit) => Number(String(p.note ?? '0').replace(',', '.')) || 0
const mainDuSite = () => document.querySelector<HTMLElement>('#app main')

export function DecouverteFiche({ pr }: { pr: Produit }) {
  const { t, tf } = usePreferences()
  useCoeursFavoris()
  const [produits, setProduits] = useState<Produit[] | null>(null)
  const [ctx, setCtx] = useState<Contexte | null>(null)
  const [lots, setLots] = useState(1)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    Promise.all([
      source.produits(),
      source.favoris().catch(() => ({ favoris: [] })),
      source.interets().catch(() => [] as string[]),
      source.confidentialite().catch(() => ({ personnalisation: true })),
    ]).then(
      ([l, fav, interets, conf]) => {
        if (!vivant) return
        const parP = new Map(l.map((p) => [p.p, p]))
        setProduits(l)
        setCtx({ gouts: lireGouts(), favoris: fav.favoris.flatMap((f) => (parP.get(f.p) ? [parP.get(f.p)!] : [])), interets, personnalise: conf.personnalisation })
      },
      () => vivant && setProduits([]),
    )
    return () => {
      vivant = false
    }
  }, [])

  // Les trois parties, sans doublon : le produit de la fiche, puis chaque partie, sont exclus des suivantes.
  const parties = useMemo(() => {
    if (!produits || !ctx) return null
    const pris = new Set([pr.p])
    const garder = (l: Produit[]) => l.slice(0, PAR_PARTIE).filter((x) => (pris.has(x.p) ? false : (pris.add(x.p), true)))
    const disponible = (x: Produit) => x.p !== pr.p && x.stock > 0
    const similaires = garder(
      produits
        .filter((x) => disponible(x) && x.univers === pr.univers)
        .sort((a, b) => Number(b.sousCategorie === pr.sousCategorie && !!pr.sousCategorie) - Number(a.sousCategorie === pr.sousCategorie && !!pr.sousCategorie) || note(b) - note(a) || b.ventes - a.ventes),
    )
    const memeVendeur = garder(produits.filter((x) => disponible(x) && !pris.has(x.p) && x.vendeur.boutique === pr.vendeur.boutique).sort((a, b) => b.ventes - a.ventes))
    const aimer = classerPourVous(produits, ctx, pris, null)
    return { similaires, memeVendeur, aimer }
  }, [produits, ctx, pr])

  // Lot 1 : similaires ; lot 2 : même vendeur ; lot 3 et suivants : 20 de plus dans « Vous aimerez aussi ».
  const nAimer = Math.max(0, lots - 2) * PAGE
  const aimer = useMemo(() => (parties ? sequence(parties.aimer, nAimer) : []), [parties, nAimer])
  const fini = !parties || (lots >= 3 && !parties.aimer.length)

  const sentinelle = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelle.current
    if (!el || fini || typeof IntersectionObserver === 'undefined') return
    const main = mainDuSite()
    const defile = !!main && /auto|scroll/.test(getComputedStyle(main).overflowY)
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return
        io.disconnect()
        setLots((x) => x + 1)
      },
      { root: defile ? main : null, rootMargin: '0px 0px 700px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [fini, lots, parties])

  if (!parties) return <section className="fp-dec" aria-busy="true" />
  const ajoute = (p: Produit) => setMessage(tf('« {p} » ajouté au panier.', { p: t(p.titre) }))
  const rien = () => {}
  const partie = (cle: string, icone: string, titre: string, liste: { p: Produit; k: string }[]) =>
    liste.length > 0 && (
      <div className="fp-dec-p" data-partie={cle}>
        <div className="fp-dec-h">
          <span className="hi">
            <Icone nom={icone} taille={17} />
          </span>
          <h2>{titre}</h2>
        </div>
        <div className="pv-g">
          {liste.map((x) => (
            <CartePourVous key={x.k} p={x.p} a={null} retenir={rien} ajoute={ajoute} />
          ))}
        </div>
      </div>
    )
  return (
    <section className="fp-dec pv" aria-label={t('Continuer à découvrir')}>
      {message && (
        <p className="pv-msg" role="status">
          {message}
        </p>
      )}
      {partie('similaires', 'layout-grid', t('Produits similaires'), parties.similaires.map((p) => ({ p, k: 's-' + p.p })))}
      {lots >= 2 && partie('vendeur', 'store', t('Du même vendeur'), parties.memeVendeur.map((p) => ({ p, k: 'v-' + p.p })))}
      {lots >= 3 && partie('aimer', 'sparkles', t('Vous aimerez aussi'), aimer.map((x, i) => ({ p: x.p, k: 'a-' + x.p.p + '#' + i })))}
      {!fini && (
        <div className="pv-g" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="pv-c pv-sq" />
          ))}
        </div>
      )}
      {!fini && <div ref={sentinelle} className="pv-sent" />}
    </section>
  )
}
