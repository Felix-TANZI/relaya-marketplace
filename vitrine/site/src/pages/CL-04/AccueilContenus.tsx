// Blocs éditoriaux de l'accueil (CL-04), rendus depuis les contenus remplaçables (donnees/contenus.ts,
// GET /api/content/home) : même balisage que le prototype (Accueil.tsx l'avait écrit en dur dans chaque état).
// Une photo du serveur remplace le dessin de chaque bandeau ou catégorie ; le dessin reste en repli.
// Carrousel : sans photo du serveur, la photo déposée dans public/images/carrousel/<photo>.webp (ou .jpg) se pose
// sur le dessin, en fondu, une fois chargée ; absente, rien ne change (public/images/carrousel/LISEZMOI.md).
import { Children, isValidElement, useEffect, useId, useState, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cliquerAnnonce, Sponsorise, useAnnoncesRangee, useEmplacementsAccueil, useTelephone, VuAnnonce } from '../../composants/Annonces'
import { useDes } from '../../composants/ecran'
import { placerAnnonces, reglesEcran } from '../../donnees/annonces'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { Dessin } from '../../composants/Dessin'
import { srcsetCarrousel } from '../../donnees/photosCarrousel'
import { Icone } from '../../composants/Icone'
import { useLieu } from '../../composants/PourQui'
import { useContenuAccueil } from '../../composants/contenus'
import { Retrait } from '../../composants/Catalogue'
import { ENCART_DEFAUT, ENCART_PERMIS } from '../../donnees/parametresPub'
import { recommander } from '../../donnees/recommandation'
import { source, type AnnonceSponsorisee, type OffreFlash, type Produit } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { jourSeul } from '../../i18n/dates'

// Photo déposée d'une bande : .webp, puis .jpg ; ce qui a été trouvé (ou non) est gardé le temps de la visite,
// pour ne pas redemander un fichier absent. Recadrée par le navigateur (object-fit: cover, sujet à droite), voile
// sombre en bas à gauche pour le texte ; chargement paresseux sauf la première bande.
const FORMATS = ['webp', 'jpg'] as const
const TROUVEES = new Map<string, string | null>()
export function PhotoBande({ nom, alt, premiere }: { nom: string; alt: string; premiere: boolean }) {
  const connue = TROUVEES.get(nom)
  const [essai, setEssai] = useState(0)
  const [chargee, setChargee] = useState(false)
  if (connue === null) return null
  const src = connue ?? `/images/carrousel/${nom}.${FORMATS[essai]}`
  // Variante « téléphone » de la photo .webp (donnees/photosCarrousel.ts) : le navigateur choisit selon l'écran.
  const srcset = src.endsWith('.webp') ? srcsetCarrousel(nom) : undefined
  return (
    <span className={'h0-ph' + (chargee ? ' on' : '')}>
      <img
        src={src}
        srcSet={srcset}
        sizes={srcset ? '100vw' : undefined}
        alt={alt}
        loading={premiere ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={premiere ? 'high' : 'low'}
        onLoad={() => (TROUVEES.set(nom, src), setChargee(true))}
        onError={() => (essai + 1 < FORMATS.length && connue === undefined ? setEssai(essai + 1) : (TROUVEES.set(nom, null), setChargee(false), setEssai(FORMATS.length)))}
      />
    </span>
  )
}

// Carrousel (h0-hero) et ses points. Les diapos achetées (DP-59, VD-PUB-CARROUSEL) passent devant les bandes
// éditoriales, étiquetées « Sponsorisé » ; sans emplacement acheté, rien ne change.
export function CarrouselAccueil() {
  const { t } = usePreferences()
  const lieu = useLieu()
  const { carrousel } = useContenuAccueil()
  const emplacements = useEmplacementsAccueil()
  const diapos = (emplacements?.e.carrousel ?? []).flatMap((d) => {
    const p = emplacements?.produits[d.p]
    return p ? [{ d, p }] : []
  })
  return (
    <>
      <div className="h0-hero">
        {diapos.map(({ d, p }) => (
          <Link key={'spn-' + d.id} to={chemin('fiche', { p: p.p })} className="h0-band spn-band" onClick={() => cliquerAnnonce(d)}>
            <span className="im">
              <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="100vw" />
            </span>
            <span className="sh"></span>
            <Sponsorise classe="sur" annonce={d} ou="carrousel" />
            <span className="bt">
              <span className="lb">{t(p.universTitre)}</span>
              <b>{t(d.titre)}</b>
              <small>
                <span>{t(d.sousTitre)}</span>
                {t(' · ')}
                <span className="nw">
                  {F(p.prix)}
                  {t(' F')}
                </span>
              </small>
            </span>
          </Link>
        ))}
        {carrousel.map((b, i) => (
          <Link key={b.lien + i} to={b.lien} className="h0-band">
            <span className="im">
              <Dessin id={b.dessin} image={b.image} alt={b.titre} tailles="100vw" prioritaire={i === 0} />
              {!b.image && b.photo && <PhotoBande nom={b.photo} alt={t(b.titre)} premiere={i === 0} />}
            </span>
            <span className="sh"></span>
            <span className="bt">
              <span className="lb">{t(b.titre)}</span>
              <b>
                {b.sous.map((x, j) => [j > 0 && t(' · '), <span key={j}>{t(x)}</span>])}
              </b>
              <small>
                <span className="nw">
                  <span>{t(b.produits)}</span>
                  {t(' produits')}
                </span>
                {t(' · ')}
                <span>{lieu.r('retrait au Relais Mvog-Ada')}</span>
              </small>
            </span>
          </Link>
        ))}
      </div>
      <div className="h0-dots">
        {[...diapos.map(({ d }) => 'spn-' + d.id), ...carrousel.map((b, i) => b.lien + i)].map((k, i) => (
          <i key={k} className={i === 0 ? 'on' : undefined}></i>
        ))}
      </div>
    </>
  )
}

// Catégories mises en avant (h0-pills) : « Explorer », puis les catégories (la première est active).
export function CategoriesAccueil() {
  const { t } = usePreferences()
  const { categories } = useContenuAccueil()
  return (
    <nav className="h0-pills" aria-label="Catégories">
      <Link to="/categories" className="ico">
        <Icone nom="layout-grid" taille={17} />
        {t('Explorer')}
      </Link>
      {categories.map((c, i) => (
        <Link key={c.lien + i} to={c.lien} className={i === 0 ? 'on' : undefined}>
          <span className="th">
            {/* Image décorative : le nom de la catégorie suit, en texte. */}
            <Dessin id={c.dessin} image={c.image} alt="" tailles="40px" />
          </span>
          {t(c.titre)}
        </Link>
      ))}
    </nav>
  )
}

// Bandeau de confiance (h0-why) : « Pourquoi choisir BelivaY ? » et ses cartes.
export function ConfianceAccueil() {
  const { t } = usePreferences()
  const lieu = useLieu()
  const { confiance } = useContenuAccueil()
  return (
    <section className="h0-why nuit">
      <h2>
        <span className="q">{t(confiance.question)}</span>{' '}
        <span>{t(confiance.marque)}</span>
        {t(' ?')}
      </h2>
      {confiance.cartes.map((c, i) => (
        <Link key={c.lien + i} to={c.lien}>
          <span className={'wi ' + c.ton}>
            <Icone nom={c.icone} taille={22} />
          </span>
          <b>{t(c.titre)}</b>
          <p>{lieu.r(c.texte)}</p>
          <em>
            {t(c.action)}
            <Icone nom="arrow-right" taille={14} />
          </em>
        </Link>
      ))}
    </section>
  )
}

// Lien d'une vignette de l'accueil vers le produit p (« /fiche?p=… » ou « /ventes-flash?offre=… », ou carte de la vitrine).
const versProduit = (el: ReactElement, p: string) => (el.props as { p?: Produit }).p?.p === p || new RegExp(`[?&](p|offre)=${p}(&|$)`).test(String((el.props as { to?: unknown }).to ?? ''))

// ---------- Vitrine de l'accueil : les produits phares dans les rangées ----------

// Rangées de l'accueil, de haut en bas : chacune prend, dans l'ordre de la recommandation BelivaY (meilleure offre,
// donnees/recommandation.ts : seuls les produits qui ont une offre retenue vers le relais du client), les premiers produits de sa catégorie (null : toutes) qu'aucune rangée plus haute ne montre ;
// « Nouveaux arrivages » ne prend que les produits étiquetés « Nouveauté ». Huit au plus par rangée (la longueur écrite de la rangée).
type RangeeVitrine = 'une' | 'populaires' | 'nouveautes' | 'femme' | 'elec' | 'tel' | 'beaute' | 'maison' | 'marche'
const ORDRE_VITRINE: [RangeeVitrine, (p: Produit) => boolean][] = [
  ['une', () => true],
  ['populaires', () => true],
  ['nouveautes', (p) => p.tags.includes('Nouveauté')],
  ...(['femme', 'elec', 'tel', 'beaute', 'maison', 'marche'] as const).map((u): [RangeeVitrine, (p: Produit) => boolean] => [u, (p) => p.univers === u]),
]
function vitrine(produits: Produit[], parRangee = 8): Record<RangeeVitrine, Produit[]> {
  const pris = new Set<string>()
  const sortie = {} as Record<RangeeVitrine, Produit[]>
  for (const [r, garde] of ORDRE_VITRINE) {
    sortie[r] = produits.filter((p) => !pris.has(p.p) && p.stock > 0 && garde(p)).slice(0, parRangee)
    sortie[r].forEach((p) => pris.add(p.p))
  }
  return sortie
}
let produitsVitrine: Promise<Produit[]> | null = null
function useVitrine(r: RangeeVitrine): Produit[] | null {
  const [liste, setListe] = useState<Produit[] | null>(null)
  useEffect(() => {
    let vivant = true
    produitsVitrine ??= source.produits().catch(() => ((produitsVitrine = null), []))
    produitsVitrine.then((ps) => vivant && setListe(vitrine(recommander(ps))[r])).catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [r])
  return liste
}
// Les vignettes écrites dans l'accueil, remplacées une à une par les produits de la rangée (même nombre, même classe).
function avecVitrine(children: ReactNode, liste: Produit[] | null): ReactNode {
  if (!liste?.length) return children
  return Children.toArray(children)
    .filter(isValidElement)
    .map((el, i) => (liste[i] ? <CarteAccueilAnnonce key={'vt-' + liste[i].p} p={liste[i]} a={null} classe={String((el.props as { className?: string }).className ?? 'h0-c')} /> : el))
}
export function VitrineAccueil({ rangee, children }: { rangee: RangeeVitrine; children: ReactNode }) {
  return <>{avecVitrine(children, useVitrine(rangee))}</>
}

// Ce qui garde la rangée à sa longueur : les vignettes achetées d'abord, puis celles de l'accueil (sans doublon),
// autant qu'il y en avait.
function avantLesAutres(achetees: ReactNode[], ps: string[], children: ReactNode) {
  const existantes = Children.toArray(children).filter(isValidElement)
  const restantes = existantes.filter((el) => !ps.some((p) => versProduit(el, p)))
  return (
    <>
      {achetees}
      {restantes.slice(0, Math.max(0, existantes.length - achetees.length))}
    </>
  )
}

// Bande des ventes flash (h0-flash) : les offres de la sélection BelivaY en cours (DP-59) passent devant ; sans
// sélection, la bande garde ses vignettes.
export function FlashAccueil({ children }: { children: ReactNode }) {
  const { t, tf } = usePreferences()
  const offres = useEmplacementsAccueil()?.e.flash ?? []
  // Ordinateur (colonne droite, qui a son propre défilement) : TOUTES les ventes flash actives, la sélection devant.
  const pc = useDes('pc')
  const [toutes, setToutes] = useState<OffreFlash[]>([])
  useEffect(() => {
    if (!pc) return
    let vivant = true
    source
      .ventesFlash()
      .then((r) => vivant && setToutes(r.offres.filter((o) => o.debut <= r.maintenant && r.maintenant < o.fin && o.stock > 0)))
      .catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [pc])
  const liste = pc && toutes.length ? [...offres, ...toutes.filter((o) => !offres.some((x) => x.p === o.p))] : offres
  if (!liste.length) return <>{children}</>
  const vignettes = liste.map((o) => (
    <Link key={(o.annonce ? 'sel-' : 'fl-') + o.p} to={chemin('ventes-flash', { offre: o.p })} onClick={() => cliquerAnnonce(o.annonce)}>
      {o.annonce && <VuAnnonce jeton={o.annonce} campagne={'flash:' + o.p} ou="flash" />}
      <span className="ph">
        <span>
          <Dessin id={o.dessin} image={o.image} alt={o.titre} tailles="62px" />
        </span>
        {o.avant > o.prix && <i>{tf('−{n} %', { n: Math.round((1 - o.prix / o.avant) * 100) })}</i>}
      </span>
      <b>{t(o.titre)}</b>
      <em>
        {F(o.prix)}
        {t(' F')}
      </em>
    </Link>
  ))
  if (pc && toutes.length) return <>{vignettes}</>
  return avantLesAutres(
    vignettes,
    liste.map((o) => o.p),
    children,
  )
}

// Rangée « À la une » (h0-row) : les emplacements achetés de la semaine (DP-59, VD-PUB-A-LA-UNE) passent devant,
// étiquetés « Sponsorisé » ; sans emplacement acheté, la rangée garde ses vignettes.
export function ALaUneAccueil({ children: ecrites }: { children: ReactNode }) {
  const { t } = usePreferences()
  const children = avecVitrine(ecrites, useVitrine('une'))
  const d = useEmplacementsAccueil()
  // Dès 1200 px, les emplacements achetés sont dans l'encart de droite, juste sous les Ventes flash : montrés une fois.
  const pc = useDes('pc')
  const achetees = (pc ? [] : (d?.e.aLaUne ?? [])).flatMap((a) => {
    const p = d?.produits[a.p]
    return p ? [{ a, p }] : []
  })
  if (!achetees.length) return <>{children}</>
  return avantLesAutres(
    achetees.map(({ a, p }) => (
      <Link key={'spn-' + a.id} to={chemin('fiche', { p: p.p })} className="h0-c plain" onClick={() => cliquerAnnonce(a)}>
        <span className="im">
          <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="160px" />
          <Sponsorise classe="sur" annonce={a} ou="une" />
          <span className="hr" aria-label={t('Favori')}>
            <Icone nom="heart" taille={15} />
          </span>
        </span>
        <span className="bd">
          <span className="t">{t(p.titre)}</span>
          {p.distance && (
            <span className="m">
              <Icone nom="map-pin" taille={12} />
              {t(p.distance)}
            </span>
          )}
          <span className="p">
            {F(p.prix)}
            <small>{t(' F')}</small>
          </span>
        </span>
        <span className="add">
          <Icone nom="plus" taille={14} trait={2.8} />
          {t('Panier')}
        </span>
      </Link>
    )),
    achetees.map(({ p }) => p.p),
    children,
  )
}

// ---------- Rangées de l'accueil avec annonces au clic (DP-59) ----------

// Annonces déjà placées sur l'accueil ouvert : une campagne n'est montrée que dans une rangée (la première qui la
// prend, de haut en bas).
const prises = new Map<string, string>()

// Carte d'un produit annoncé dans une rangée de l'accueil : même dessin que ses voisines (h0-c), étiquette « Sponsorisé ».
export function CarteAccueilAnnonce({ p, a, classe = 'h0-c', ou = 'accueil' }: { p: Produit; a: AnnonceSponsorisee | null; classe?: string; ou?: 'accueil' | 'une' }) {
  const { t } = usePreferences()
  const note = p.note ? String(p.note) : null
  return (
    <Link to={chemin('fiche', { p: p.p })} className={classe} onClick={() => cliquerAnnonce(a)}>
      <span className="im">
        <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="180px" />
        {a ? (
          <Sponsorise classe="sur" annonce={a} ou={ou} />
        ) : (
          <span className="ck" aria-label={t('Vendeur vérifié')}>
            <Icone nom="check" taille={12} trait={3.2} />
          </span>
        )}
        <span className="hr" aria-label={t('Favori')}>
          <Icone nom="heart" taille={15} />
        </span>
      </span>
      <span className="bd">
        <span className="t">{t(p.titre)}</span>
        {p.distance && (
          <span className="m">
            <Icone nom="map-pin" taille={12} />
            {t(p.distance)}
          </span>
        )}
        <span className="p">
          {F(p.prix)}
          <small>{t(' F')}</small>
        </span>
        {note && (
          <span className="r">
            <Icone nom="star" taille={12} style={{ fill: 'currentColor' }} />
            <b>{note}</b>
            {` (${p.avis})`}
          </span>
        )}
        {!classe.includes('plain') && <Retrait p={p} />}
      </span>
      <span className="add">
        <Icone nom="plus" taille={14} trait={2.8} />
        {t('Panier')}
      </span>
    </Link>
  )
}

const produitDuLien = (el: ReactElement) => (el.props as { p?: Produit }).p?.p ?? /[?&](?:p|offre)=([^&]+)/.exec(String((el.props as { to?: unknown }).to ?? ''))?.[1] ?? null

// Rangée (ou grille) de l'accueil : les annonces au clic de sa catégorie (cat), ou de toutes (null), y prennent leur
// place par la règle de densité (20 % au plus ; 1 sur 6 au téléphone), sans changer la longueur de la rangée ; jamais
// un produit déjà montré dans un emplacement acheté (carrousel, À la une) ni une campagne déjà placée plus haut.
export function RangeeSponsorisee({ cat, children: ecrites }: { cat: string | null; children: ReactNode }) {
  const children = avecVitrine(ecrites, useVitrine((cat ?? 'populaires') as RangeeVitrine))
  const id = useId()
  const telephone = useTelephone()
  const r = useAnnoncesRangee(cat)
  const emplacements = useEmplacementsAccueil()
  useEffect(
    () => () => {
      for (const [c, x] of prises) if (x === id) prises.delete(c)
    },
    [id],
  )
  const existantes = Children.toArray(children).filter(isValidElement)
  if (!r || !r.annonces.length) return <>{children}</>
  const dejaVus = new Set([...(emplacements?.e.carrousel ?? []), ...(emplacements?.e.aLaUne ?? [])].map((a) => a.p))
  const libres = r.annonces.filter((a) => !dejaVus.has(a.p) && (!prises.has(a.campagne) || prises.get(a.campagne) === id))
  type O = { cle: string; produit: string; prix: number; note: number; el: ReactElement | null; a: AnnonceSponsorisee | null }
  const offres: O[] = existantes.map((el, i) => ({ cle: produitDuLien(el) ?? 'x' + i, produit: produitDuLien(el) ?? 'x' + i, prix: 0, note: 0, el, a: null }))
  const positions = placerAnnonces(
    offres,
    libres.map((a) => ({ cle: a.p, produit: a.fiche, prix: 0, note: 0, el: null, a })),
    reglesEcran(r.d.regles, telephone),
  )
  const classe = String((existantes[0]?.props as { className?: string } | undefined)?.className ?? 'h0-c')
  const rendus = positions.slice(0, existantes.length).map(({ resultat: x, sponsorise }) => {
    if (!sponsorise || !x.a) return x.el
    prises.set(x.a.campagne, id)
    return <CarteAccueilAnnonce key={'spn-' + x.a.id} p={r.produits[x.a.p]} a={x.a} classe={classe} />
  })
  return <>{rendus}</>
}

// ---------- Encart de droite (dès 1200) : À la une et promotions des vendeurs ----------

// Sous les Ventes flash, au-dessus des garanties, alimenté seulement par les vendeurs : les emplacements « À la une »
// payés et actifs (rotation pondérée par le montant payé, étiquette « Sponsorisé », impression et clic comptés), sinon
// des produits en promotion active (prix barré posé par le vendeur, étiquette « Promotion »). Nombre : paramètre de
// console (2, 4 ou 6 ; défaut 4) ; moins de produits : ce qu'il y a ; aucun : pas d'encart.
export function EncartDroite() {
  const { t } = usePreferences()
  const d = useEmplacementsAccueil()
  const [promos, setPromos] = useState<Produit[]>([])
  useEffect(() => {
    let vivant = true
    source
      .produits()
      .then((l) => vivant && setPromos(l.filter((p) => p.prixBarre && p.prixBarre > p.prix && p.stock > 0).sort((a, b) => b.prixBarre! / b.prix - a.prixBarre! / a.prix)))
      .catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [])
  const achetees = (d?.e.aLaUne ?? []).flatMap((a) => (d?.produits[a.p] ? [{ a, p: d.produits[a.p] }] : []))
  const nombre = ENCART_PERMIS.includes(d?.e.encart ?? 0) ? d!.e.encart! : ENCART_DEFAUT
  const elements = [...achetees, ...promos.filter((p) => !achetees.some((x) => x.p.p === p.p)).map((p) => ({ a: null, p }))].slice(0, nombre)
  if (!elements.length) return null
  return (
    <section className="acc-une" aria-label={t('À la une et promos des vendeurs')}>
      <div className="acc-une-h">
        <Icone nom="star" taille={16} />
        <b>{t('À la une · Promos')}</b>
        <Link to="/liste?tri=proche&from=accueil">
          {t('Tout voir')}
          <Icone nom="arrow-right" taille={13} />
        </Link>
      </div>
      <div className="acc-une-g">
        {elements.map(({ a, p }) => (
          <Link key={(a?.id ?? '') + p.p} to={chemin('fiche', { p: p.p })} onClick={() => cliquerAnnonce(a)}>
            <span className="im">
              <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="120px" />
              {a ? <Sponsorise classe="sur" annonce={a} ou="une" /> : <span className="acc-promo">{t('Promotion')}</span>}
              {!a && p.prixBarre && <i className="acc-rm">{`−${Math.round((1 - p.prix / p.prixBarre) * 100)} %`}</i>}
            </span>
            <span className="t">{t(p.titre)}</span>
            <span className="p">
              {F(p.prix)}
              <small>{t(' F')}</small>
              {!a && p.prixBarre && <s>{F(p.prixBarre)}</s>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// Bande des atouts (remonte « Pourquoi choisir BelivaY ? » juste avant le flux « Pour vous ») : les mêmes atouts, en
// une rangée horizontale compacte, style nuit ; défile sur téléphone, 3 cartes côte à côte sur grand écran.
export function BandeAtouts() {
  const { t } = usePreferences()
  const lieu = useLieu()
  const { confiance } = useContenuAccueil()
  return (
    <section className="h0-why nuit h0-atouts" aria-label={t(confiance.question) + ' ' + t(confiance.marque) + ' ?'}>
      <h2>
        <span className="q">{t(confiance.question)}</span> <span>{t(confiance.marque)}</span>
        {t(' ?')}
      </h2>
      <div className="at-rang">
        {confiance.cartes.map((c, i) => (
          <Link key={c.lien + i} to={c.lien}>
            <span className={'wi ' + c.ton}>
              <Icone nom={c.icone} taille={18} />
            </span>
            <span className="at-tx">
              <b>{t(c.titre)}</b>
              <p>{lieu.r(c.texte)}</p>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

// Accueil par moments (VAGUE n° 10 ; règle : donnees/moments.ts) : le moment du jour choisi par le serveur (Rentrée,
// Fêtes…), activé par l'administrateur ; en tête de l'accueil, son titre, son accroche, son lien et quelques produits.
// « ?moment=<id> » : aperçu de la console (même hors période) ; « ?moment=aucun » : aucun.
export function MomentAccueil() {
  const { t } = usePreferences()
  const contenu = useContenuAccueil()
  const apercu = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('moment') : null
  const id = apercu ?? contenu.momentDuJour ?? null
  const m = id && id !== 'aucun' ? (contenu.moments ?? []).find((x) => x.id === id) : null
  const [produits, setProduits] = useState<Produit[]>([])
  useEffect(() => {
    if (!m) return
    let vivant = true
    produitsVitrine ??= source.produits().catch(() => ((produitsVitrine = null), []))
    produitsVitrine
      .then((ps) => vivant && setProduits(ps.filter((p) => m.sousCategories.includes(p.sousCategorie ?? '') && p.stock > 0).sort((a, b) => b.ventes - a.ventes).slice(0, 4)))
      .catch(() => undefined)
    return () => {
      vivant = false
    }
  }, [m])
  const promos = <PromotionsBelivay />
  if (!m) return promos
  return (
    <>
    {promos}
    <section className={'acc-moment ' + m.ton} data-moment={m.id} aria-label={t(m.titre)}>
      {m.image?.url && (
        <span className="acc-moment-ph">
          <img src={m.image.url} alt={m.image.alt ?? ''} loading="lazy" decoding="async" />
        </span>
      )}
      <div className="acc-moment-t">
        <span className="k">{t('Moment')}</span>
        <h2>{t(m.titre)}</h2>
        <p>{t(m.accroche)}</p>
        <Link to={m.lien} className="btn primary sm">
          <span>{t('Voir la sélection')}</span>
          <Icone nom="arrow-right" taille={16} />
        </Link>
      </div>
      {produits.length > 0 && (
        <div className="acc-moment-p">
          {produits.map((p) => (
            <Link key={p.p} to={chemin('fiche', { p: p.p })} className="acc-moment-i" aria-label={t(p.titre)}>
              <span className="ph">
                <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="96px" />
              </span>
              <span className="tt">{t(p.titre)}</span>
              <b>{F(p.prix)}&nbsp;F</b>
            </Link>
          ))}
        </div>
      )}
    </section>
    </>
  )
}

// Promotions de la plateforme décidées par la console d'administration (contenus de l'accueil : promotions en cours) :
// une ligne sobre par promotion, titre, remise, cible et fin ; vers la catégorie visée, sinon les promotions.
function PromotionsBelivay() {
  const { t, tf, langue } = usePreferences()
  const contenu = useContenuAccueil()
  const l = contenu.promotions ?? []
  if (!l.length) return null
  const lien = (cible: string) => contenu.carrousel.find((b) => cible.includes(b.titre))?.lien ?? '/promotions'
  return (
    <div className="acc-promo-bv-l">
      {l.map((p) => (
        <Link key={p.id} to={lien(p.cible)} className="acc-promo-bv" data-promotion={p.id}>
          <Icone nom="tag" taille={18} />
          <span className="tx">
            <span className="k">{t('Promotion BelivaY')}</span>
            <b>{p.titre}</b>
            <span className="s">{[p.cible.startsWith('Vitrines') ? t('Dans les vitrines participantes') : t(p.cible), tf('jusqu’au {d}', { d: jourSeul(p.fin, langue) })].join(' · ')}</span>
          </span>
          {p.remise && <span className="rm">{t(p.remise)}</span>}
        </Link>
      ))}
    </div>
  )
}
