// Flux « Pour vous » en fin d'accueil (CL-04), après les rangées par catégorie : une simple liste de produits qui
// descend sans fin, sans pastilles, sans bande, sans bouton « Voir plus ».
// - Grille de 2 colonnes au téléphone, 3 en tablette, 5 sur ordinateur ; cartes allégées de la famille « À la une ».
// - Classement : donnees/pourVous.ts (vus, recherches, favoris, paniers, centres d'intérêt, disponibilité au relais ;
//   nouveau client : meilleures ventes de la zone) ; rien de ce qui est déjà montré plus haut sur l'accueil.
// - Chargement continu par 20 en approchant du bas (squelettes de même forme) tant qu'il y a des produits ; le
//   catalogue épuisé, un nouveau mélange recommence (démonstration), sans doublon dans une même page de 20.
// - Publicité (DP-59) : une carte « Sponsorisé » toutes les 6 au plus (placerAnnonces, 20 % au plus), même dessin,
//   petite étiquette dans un coin ; impression et clic comptés pour le vendeur.
// - « Pas intéressé » sur chaque carte ; position (produits chargés, défilement) gardée au retour d'une fiche.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cliquerAnnonce, Sponsorise, useAnnoncesRangee } from '../../composants/Annonces'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { placerAnnonces, reglesEcran } from '../../donnees/annonces'
import { classerPourVous, lireGouts, noterPanier, type Contexte } from '../../donnees/pourVous'
import { source, type AnnonceSponsorisee, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { BandeAtouts } from './AccueilContenus'
import { useMajSession } from '../../session'

const PAGE = 20
const POSITION = 'blv_pv_position'

interface Position {
  n: number
  haut: number
  le: number
}
function lirePosition(): Position | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(POSITION) ?? 'null') as Position | null
    return p && Date.now() - p.le < 30 * 60_000 ? p : null
  } catch {
    return null
  }
}
const mainDuSite = () => document.querySelector<HTMLElement>('#app main')

// Produits déjà montrés plus haut sur l'accueil (liens vers une fiche ou une offre flash avant le flux).
function produitsAuDessus(flux: HTMLElement | null): Set<string> {
  const vus = new Set<string>()
  if (!flux) return vus
  document.querySelectorAll<HTMLAnchorElement>('#app a[href]').forEach((a) => {
    // Avant le flux, ou dans la colonne droite (Ventes flash, À la une), posée après le contenu dans la page.
    if (flux.contains(a) || (!(a.compareDocumentPosition(flux) & Node.DOCUMENT_POSITION_FOLLOWING) && !a.closest('.gab-droite'))) return
    const m = /[?&](?:p|offre)=([^&#]+)/.exec(a.getAttribute('href') ?? '')
    if (m) vus.add(decodeURIComponent(m[1]))
  })
  return vus
}

type Element = { p: Produit; a: AnnonceSponsorisee | null; cle: string }

// Mélange fixe (graine = numéro du tour) : le même tour donne toujours le même ordre.
function melanger<T>(xs: T[], graine: number): T[] {
  const r = [...xs]
  let e = graine * 2654435761 + 12345
  for (let i = r.length - 1; i > 0; i--) {
    e = (Math.imul(e, 1103515245) + 12345) >>> 0
    const j = e % (i + 1)
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
// Les n premiers produits du flux : le classement, puis des tours mélangés. Un produit déjà montré n'est jamais
// remis à moins de PAGE places (placé au plus tôt à sa position précédente - (taille du tour - PAGE)) : une même page
// de 20 ne montre donc jamais deux fois le même produit.
function sequence(liste: Produit[], n: number): { p: Produit; tour: number }[] {
  const sortie: { p: Produit; tour: number }[] = []
  if (!liste.length) return sortie
  const L = liste.length
  let tour = 0
  let courant = liste
  while (sortie.length < n) {
    courant.forEach((p) => sortie.push({ p, tour }))
    tour++
    const avant = new Map(courant.map((p, q) => [p.p, q]))
    const reste = melanger(liste, tour)
    const suivant: Produit[] = []
    for (let j = 0; j < L; j++) {
      // Premier produit encore libre dont l'ancienne place q permet j + L - q >= PAGE ; à défaut, le premier libre.
      let k = reste.findIndex((p) => L + j - (avant.get(p.p) ?? 0) >= PAGE)
      if (k < 0) k = 0
      suivant.push(reste.splice(k, 1)[0])
    }
    courant = suivant
  }
  return sortie.slice(0, n)
}

export function FluxPourVous() {
  const { t, tf } = usePreferences()
  const racine = useRef<HTMLElement>(null)
  const [depart] = useState(lirePosition)
  const position = useRef(depart)
  const [produits, setProduits] = useState<Produit[] | null>(null)
  const [ctx, setCtx] = useState<Contexte | null>(null)
  const [exclus, setExclus] = useState<Set<string>>(new Set())
  const [n, setN] = useState(depart?.n ?? PAGE)
  const [version] = useState(0)
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
        setCtx({
          gouts: lireGouts(),
          favoris: fav.favoris.flatMap((f) => (parP.get(f.p) ? [parP.get(f.p)!] : [])),
          interets,
          personnalise: conf.personnalisation,
        })
      },
      () => vivant && setProduits([]),
    )
    return () => {
      vivant = false
    }
  }, [])
  // Ce qui est au-dessus est rendu avant le flux (emplacements achetés lus en parallèle) : relevé après chaque rendu
  // des produits, sans boucle (même ensemble = même état).
  useLayoutEffect(() => {
    const e = produitsAuDessus(racine.current)
    setExclus((x) => (x.size === e.size && [...e].every((p) => x.has(p)) ? x : e))
  }, [produits, version])

  // Relus après chaque « Pas intéressé » (version).
  const gouts = useMemo(() => (ctx && version >= 0 ? { ...ctx, gouts: lireGouts() } : null), [ctx, version])
  const liste = useMemo(() => (produits && gouts ? classerPourVous(produits, gouts, exclus, null) : []), [produits, gouts, exclus])

  // Une carte « Sponsorisé » toutes les 6 au plus : annonces au clic de la catégorie choisie (ou de toutes), jamais
  // un produit déjà montré plus haut.
  const r = useAnnoncesRangee(null)
  const elements: Element[] = useMemo(() => {
    const suite = sequence(liste, n)
    const visibles = suite.map((x) => x.p)
    const annonces = (r?.annonces ?? []).filter((a) => !exclus.has(a.p) && !gouts?.gouts.masques.includes(a.p))
    type O = {
      cle: string
      produit: string
      prix: number
      note: number
      p: Produit
      a: AnnonceSponsorisee | null
    }
    const offre = (p: Produit, a: AnnonceSponsorisee | null, i: number): O => ({
      cle: p.p + '#' + i,
      produit: a?.fiche ?? p.p,
      prix: p.prix,
      note: Number(String(p.note ?? '0').replace(',', '.')),
      p,
      a,
    })
    const places = r
      ? placerAnnonces(
          visibles.map((p, i) => offre(p, null, i)),
          annonces.map((a, i) => offre(r.produits[a.p], a, -1 - i)),
          reglesEcran(r.d.regles, true),
        )
      : visibles.map((p, i) => ({
          resultat: offre(p, null, i),
          sponsorise: false,
        }))
    return places.map((x, i) => ({
      p: x.resultat.p,
      a: x.sponsorise ? x.resultat.a : null,
      cle: (x.sponsorise ? 'spn-' : '') + x.resultat.p.p + '#' + i,
    }))
  }, [liste, n, r, exclus, gouts])
  const fini = !liste.length

  // Retour d'une fiche : même défilement, une fois le flux rendu.
  useEffect(() => {
    const p = position.current
    if (!p || !produits) return
    position.current = null
    try {
      sessionStorage.removeItem(POSITION)
    } catch {
      /* rien à oublier */
    }
    requestAnimationFrame(() => mainDuSite()?.scrollTo({ top: p.haut }))
  }, [produits])

  // Chargement par 20, tôt : la racine de l'observateur est le conteneur qui défile (main) quand c'est lui ; sinon la marge
  // large ne compterait pas (un conteneur intermédiaire rogne sans marge) et le lot ne partirait qu'en bas, visible.
  // Une rangée de squelettes de même forme reste en permanence sous le flux.
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
        setN((x) => x + PAGE)
      },
      { root: defile ? main : null, rootMargin: '0px 0px 1500px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [fini, n, elements.length])

  const retenir = () => {
    try {
      sessionStorage.setItem(
        POSITION,
        JSON.stringify({
          n,
          haut: mainDuSite()?.scrollTop ?? 0,
          le: Date.now(),
        } satisfies Position),
      )
    } catch {
      /* stockage refusé */
    }
  }
  const ajoute = (p: Produit) => setMessage(tf('« {p} » ajouté au panier.', { p: t(p.titre) }))

  if (!produits || !liste.length) return (
      <>
        <BandeAtouts />
        <section ref={racine} className="pv-vide" aria-busy={!produits} />
      </>
    )
  return (
    <>
    <BandeAtouts />
    <section ref={racine} className="h0-panel pv" aria-label={t('Pour vous')}>
      <div className="h0-hd">
        <span className="hi">
          <Icone nom="sparkles" taille={18} />
        </span>
        <h2>{t('Pour vous')}</h2>
        <span className="sp"></span>
      </div>
      {message && (
        <p className="pv-msg" role="status">
          {message}
        </p>
      )}
      <div className="pv-g">
        {elements.map((e) => (
          <CartePourVous key={e.cle} p={e.p} a={e.a} retenir={retenir} ajoute={ajoute} />
        ))}
        {!fini && Array.from({ length: 6 }, (_, i) => <span key={'sq' + i} className="pv-c pv-sq" aria-hidden="true" />)}
      </div>
      {!fini && <div ref={sentinelle} className="pv-sent" />}
    </section>
    </>
  )
}

// Carte allégée : photo carrée sans bordure, titre sur 2 lignes, prix, note ; cœur favori (CoeursFavoris) ; étiquette
// « Sponsorisé » dans un coin pour une annonce.
function CartePourVous({ p, a, retenir, ajoute }: { p: Produit; a: AnnonceSponsorisee | null; retenir: () => void; ajoute: (p: Produit) => void }) {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const [choix, setChoix] = useState<Record<string, string> | null>(null) // feuille de choix rapide ouverte
  // Ajout direct au panier, sans ouvrir la fiche (le bouton n'existe que sur une carte « grande », voir site.css).
  const ajouter = async (c: Record<string, string>) => {
    await source.ajouterProduit(p.p, c, 1)
    noterPanier(p.univers)
    ajoute(p)
    majSession(await source.session())
  }
  const toucher = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault()
    e.stopPropagation()
    if (p.stock <= 0) return
    // Variantes obligatoires : petite feuille de choix, puis ajout.
    if (p.options.length)
      setChoix(Object.fromEntries(p.options.map((o) => [o.nom, o.choisi && !o.indispo?.includes(o.choisi) ? o.choisi : (o.valeurs.find((v) => !o.indispo?.includes(v)) ?? o.choisi)])))
    else void ajouter({})
  }
  const note = p.note ? String(p.note) : null
  return (
    <>
      <Link to={chemin('fiche', { p: p.p })} className="pv-c" onClick={() => (retenir(), cliquerAnnonce(a))}>
        <span className="im">
          <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="(min-width:1024px) 200px, 50vw" />
          {a && <Sponsorise classe="sur" annonce={a} ou="accueil" />}
          <span className="hr pv-hr">
            <Icone nom="heart" taille={15} />
          </span>
          <span
            className={'pv-add' + (p.stock > 0 ? '' : ' off')}
            role="button"
            tabIndex={p.stock > 0 ? 0 : -1}
            aria-disabled={p.stock <= 0}
            aria-label={tf('Ajouter au panier : {p}', { p: t(p.titre) })}
            onClick={toucher}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toucher(e)}
          >
            <Icone nom="plus" taille={18} trait={2.4} />
          </span>
          {p.prixBarre && p.prixBarre > p.prix && <i className="pv-rm">{`−${Math.round((1 - p.prix / p.prixBarre) * 100)} %`}</i>}
        </span>
        <span className="t">{t(p.titre)}</span>
        <span className="p">
          {F(p.prix)}
          <small>{t(' F')}</small>
          {p.prixBarre && p.prixBarre > p.prix && <s>{F(p.prixBarre)}</s>}
        </span>
        {note && (
          <span className="r">
            <Icone nom="star" taille={12} style={{ fill: 'currentColor' }} />
            <b>{note}</b>
            {` (${p.avis})`}
          </span>
        )}
      </Link>
      {choix &&
        createPortal(
          <div className="pv-voile" onClick={() => setChoix(null)}>
            <div className="pv-feuille" role="dialog" aria-label={t('Choisir avant d’ajouter')} onClick={(e) => e.stopPropagation()}>
              <b>{t(p.titre)}</b>
              {p.options.map((o) => (
                <div key={o.nom} className="pv-opt">
                  <span>{t(o.nom)}</span>
                  <div>
                    {o.valeurs.map((v) => (
                      <button key={v} type="button" className={choix[o.nom] === v ? 'on' : ''} disabled={o.indispo?.includes(v)} onClick={() => setChoix({ ...choix, [o.nom]: v })}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="btn primary" onClick={() => (void ajouter(choix), setChoix(null))}>
                {t('Ajouter au panier')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
