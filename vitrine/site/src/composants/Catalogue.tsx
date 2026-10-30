// Catalogue (DP-54) : ce que partagent les catégories, les listes, la recherche, les promotions et la sélection :
// les univers, le filtrage et le tri, les règles du retrait (prix du retrait par la formule du panier, colis trop
// volumineux pour un relais, retirable aujourd'hui), la correction d'une faute de frappe, la carte produit (cœur et
// « + » qui marchent vraiment), et le chargement commun (produits, favoris, relais, boutiques, panier, heure).
import { ErreurNonAuthentifie } from '../api/erreurs'
import { noterPanier } from '../donnees/pourVous'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { calculer, type Classe } from '../donnees/frais'
import { motsDe, score } from '../donnees/recherche'
import { ordonner } from '../donnees/recommandation'
import { source, type AnnonceSponsorisee, type DonneesPanier, type Produit, type Relais } from '../donnees/source'
import { F } from '../i18n/format'
import { usePreferences } from '../preferences'
import { useMajSession, useSession } from '../session'
import { cliquerAnnonce, Sponsorise, VuAnnonce } from './Annonces'
import { BoutonComparer } from './Comparer'
import { Dessin } from './Dessin'
import { Icone } from './Icone'

export const UNIVERS: { id: string; titre: string; icone: string; subs: string[] }[] = [
  { id: 'tel', titre: 'Téléphones & tablettes', icone: 'smartphone', subs: ['Smartphones', 'Tablettes', 'Accessoires'] },
  { id: 'elec', titre: 'Électronique', icone: 'headphones', subs: ['Informatique', 'TV & vidéo', 'Jeux vidéo', 'Audio', 'Photo & vidéo', 'Énergie & batteries'] },
  { id: 'femme', titre: 'Mode femme', icone: 'shirt', subs: ['Accessoires', 'Sacs', 'Pagnes & wax', 'Robes', 'Parfums'] },
  { id: 'homme', titre: 'Mode homme', icone: 'shirt', subs: ['Montres', 'Vestes', 'Chemises'] },
  { id: 'chauss', titre: 'Chaussures', icone: 'footprints', subs: ['Femme', 'Homme', 'Sport'] },
  { id: 'beaute', titre: 'Beauté & santé', icone: 'sparkles', subs: ['Cheveux', 'Hygiène', 'Soins visage', 'Maquillage'] },
  { id: 'maison', titre: 'Maison & cuisine', icone: 'sofa', subs: ['Cuisine', 'Petit électroménager', 'Gros électroménager', 'Linge de maison', 'Rangement', 'Luminaires'] },
  { id: 'marche', titre: 'Supermarché', icone: 'shopping-basket', subs: ['Épicerie', 'Boissons'] },
  { id: 'bebe', titre: 'Bébé & enfant', icone: 'baby', subs: ['Puériculture', 'Rentrée scolaire', 'Livres', 'Jouets'] },
  { id: 'sport', titre: 'Sport & loisirs', icone: 'dumbbell', subs: ['Vélos', 'Football', 'Basketball', 'Livres'] },
]

export type Tri = 'pertinence' | 'proche' | 'prix' | 'prix-desc' | 'note'
export interface Filtres {
  q?: string
  u?: string
  sub?: string
  tri?: Tri
  prixMin?: number
  prixMax?: number
  km?: number
  note?: number
  stock?: boolean
  offert?: boolean // retrait offert (dès 30 000 F)
  relais?: boolean // retirable à mon relais : sans les colis trop volumineux (XL, hors gabarit)
  auj?: boolean // retrait possible aujourd'hui (règle retirableAujourdhui)
  marque?: string
  promo?: boolean
}

// Lecture des filtres depuis l'adresse (?cat=, ?u=, ?sub=, ?tri=, ?min=, ?max=, ?km=, ?note=, ?stock=1, ?offert=1,
// ?rel=1 ou ?f=relais, ?auj=1 ou ?f=auj, ?marque=).
export function filtresDe(p: URLSearchParams): Filtres {
  const n = (k: string) => (p.get(k) ? Number(p.get(k)) : undefined)
  return {
    q: p.get('q') ?? undefined,
    u: p.get('cat') ?? p.get('u') ?? undefined,
    sub: p.get('sub') ?? undefined,
    tri: (p.get('tri') as Tri) ?? 'pertinence',
    prixMin: n('min'),
    prixMax: n('max'),
    km: n('km'),
    note: n('note'),
    stock: p.get('stock') === '1',
    offert: p.get('offert') === '1',
    relais: p.get('rel') === '1' || p.get('f') === 'relais',
    auj: p.get('auj') === '1' || p.get('f') === 'auj',
    marque: p.get('marque') ?? undefined,
  }
}

export const km = (p: Produit) => Number(String(p.distance ?? '9').split(' ')[0].replace(',', '.'))
export const noteDe = (p: Produit) => Number(String(p.note ?? '0').replace(',', '.'))
// Marque du produit (champ du catalogue) ; « Sans marque » pour le fait main et le vrac.
export const marqueDe = (p: Produit) => p.marque ?? 'Sans marque'

// Recherche tolérante, équivalents et fautes corrigées : règles pures de donnees/recherche.ts (VAGUE n° 4).
export { corriger, correspond, norme, score } from '../donnees/recherche'

// Règles du retrait (DP-54) : le prix du retrait d'un article seul vient de la formule du panier (frais.ts :
// ramassage + remise au relais − retrait offert dès le seuil) ; un colis XL ou hors gabarit ne va jamais en relais.
export const horsRelais = (p: Produit) => p.classe === 'XL' || p.classe === 'HG'
export function fraisRetrait(p: Produit): number | null {
  if (horsRelais(p)) return null
  const f = calculer('relais', [{ boutique: p.vendeur.boutique, zone: p.vendeur.zone, articles: [{ prix: p.prix, quantite: 1, classe: p.classe as Classe }] }])
  return f.total - f.sousTotal
}

// Heure de Yaoundé (UTC+1) : minutes depuis minuit et jour de la semaine.
const H = 3600e3
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const minutesDuJour = (t: number) => {
  const d = new Date(t + H)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}
export const jourDe = (t: number) => JOURS[new Date(t + H).getUTCDay()]
// « 8 h – 19 h » → 19 h, « 8 h – 18 h 30 » → 18 h 30 (minutes depuis minuit).
export function fermeture(horaires: string): number {
  const fin = horaires.split(/[–-]/).pop() ?? ''
  const [h, m] = fin.replace(/[^\d ]/g, ' ').trim().split(/\s+/).map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const heureDe = (min: number) => `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`
export const relaisFermeAujourdhui = (r: Relais, maintenant: number) => r.ferme === jourDe(maintenant) || minutesDuJour(maintenant) >= fermeture(r.horaires)

export interface Contexte {
  tous: Produit[]
  favoris: string[]
  relais: Relais | null // relais habituel (ou le premier de la liste)
  liste: Relais[]
  boutiques: DonneesPanier['boutiques']
  dansLePanier: string[] // boutiques déjà dans le panier : leur ramassage est déjà compté
  adresse: string | null // adresse de livraison à domicile principale
  maintenant: number
}
// Retrait possible aujourd'hui : en stock, pas trop volumineux pour un relais, et prêt (délai de préparation de la
// boutique) avant la fermeture du relais choisi, qui n'est pas fermé ce jour-là.
export function retirableAujourdhui(p: Produit, c: Pick<Contexte, 'relais' | 'boutiques' | 'maintenant'>): boolean {
  if (p.stock <= 0 || horsRelais(p) || !c.relais || relaisFermeAujourdhui(c.relais, c.maintenant)) return false
  const delai = Number(String(c.boutiques[p.vendeur.boutique]?.delai ?? '').replace(/[^\d]/g, ''))
  if (!delai) return false
  return minutesDuJour(c.maintenant) + delai * 60 <= fermeture(c.relais.horaires)
}

// Visiteur sans compte face au vrai serveur : favoris, relais et panier y sont des routes authentifiées (401). Le
// catalogue s'affiche quand même (aucun favori, aucun relais choisi, panier vide), au lieu d'un écran vide ; toute autre
// erreur remonte comme avant.
function sansCompte<T, V>(p: Promise<T>, vide: V): Promise<T | V> {
  return p.catch((e: unknown) => {
    if (e instanceof ErreurNonAuthentifie) return vide
    throw e
  })
}

export function useCatalogue(): [Contexte | null, (c: Contexte) => void] {
  const [c, setC] = useState<Contexte | null>(null)
  // Compte diaspora : un autre proche actif (« Pour qui ? ») recharge distances et « retirable aujourd'hui ».
  const procheId = useSession().proche?.id
  useEffect(() => {
    Promise.all([
      source.produits(),
      sansCompte(source.favoris(), { favoris: [], verifieLe: 0 }),
      sansCompte(source.relaisListe(), { relais: [], habituel: null }),
      sansCompte(source.panier(), { lignes: [], boutiques: {}, adresse: null }),
      source.ventesFlash(),
    ]).then(([tous, fav, rl, panier, vf]) =>
      setC({
        tous,
        favoris: fav.favoris.map((x) => x.p),
        relais: rl.relais.find((r) => r.nom === rl.habituel) ?? rl.relais[0] ?? null,
        liste: rl.relais,
        boutiques: panier.boutiques,
        dansLePanier: [...new Set(panier.lignes.map((l) => l.boutique))],
        adresse: panier.adresse,
        maintenant: vf.maintenant,
      }),
    )
  }, [procheId])
  return [c, setC]
}

export function filtrer(produits: Produit[], f: Filtres, auj?: (p: Produit) => boolean): Produit[] {
  // Recherche : tous les mots d'abord ; sinon, les produits qui en ont le plus (« chargeur tekno » → chargeurs).
  let base = produits
  if (f.q && motsDe(f.q).length) {
    const meilleur = Math.max(0, ...produits.map((p) => score(p, f.q!)))
    base = meilleur ? produits.filter((p) => score(p, f.q!) === meilleur) : []
    // Un mot trouvé tel quel passe devant un mot deviné par son début (« micro-ondes » : le four, pas « Microsoft »).
    const exacts = Math.max(0, ...base.map((p) => score(p, f.q!, true)))
    if (exacts) base = base.filter((p) => score(p, f.q!, true) === exacts)
  }
  const r = base.filter(
    (p) =>
      (!f.u || p.univers === f.u) &&
      (!f.sub || p.sousCategorie === f.sub) &&
      (f.prixMin === undefined || p.prix >= f.prixMin) &&
      (f.prixMax === undefined || p.prix <= f.prixMax) &&
      (f.km === undefined || km(p) <= f.km) &&
      (f.note === undefined || noteDe(p) >= f.note) &&
      (!f.stock || p.stock > 0) &&
      (!f.offert || p.prix >= 30000) &&
      (!f.relais || !horsRelais(p)) &&
      (!f.auj || !!auj?.(p)) &&
      (!f.marque || marqueDe(p) === f.marque) &&
      (!f.promo || (p.prixBarre ?? 0) > p.prix),
  )
  const t = f.tri ?? 'pertinence'
  // Pertinence : dans une catégorie, l'ordre de la meilleure offre (donnees/recommandation.ts, BV-DEV-02) ; dans une
  // recherche, la correspondance du texte décide et l'ordre servi par le catalogue reste (tri stable) ; sans offre
  // servie, l'ordre du catalogue. Les autres tris partent de cet ordre.
  return (f.q ? r : ordonner(r)).sort((a, b) => (t === 'proche' ? km(a) - km(b) : t === 'prix' ? a.prix - b.prix : t === 'prix-desc' ? b.prix - a.prix : t === 'note' ? noteDe(b) - noteDe(a) : 0))
}

// Le plus proche d'une liste (carte mise en avant « Le plus proche »).
export const lePlusProche = (liste: Produit[]) => (liste.length > 1 ? [...liste].sort((a, b) => km(a) - km(b))[0].p : null)

// Ligne « retrait » d'une carte : offert, prix du retrait, ou livraison à domicile pour un colis trop volumineux.
export function Retrait({ p }: { p: Produit }) {
  const { t, tf } = usePreferences()
  const frais = fraisRetrait(p)
  return frais === null ? (
    <span className="dl home">
      <Icone nom="truck" taille={13} />
      {t('Livraison à domicile')}
    </span>
  ) : frais === 0 ? (
    <span className="dl free">
      <Icone nom="check" taille={13} trait={2.6} />
      {t('Retrait offert')}
    </span>
  ) : (
    <span className="dl">{tf('+ {m} F de retrait', { m: F(frais) })}</span>
  )
}

// comparer : les produits de la liste ou des résultats (VAGUE n° 5) ; la carte porte alors son bouton « Comparer ».
export function CarteProduit({ p, favori, tag, proche, selection, annonce, boost, ou = 'recherche', auChange, comparer }: { p: Produit; favori?: boolean; tag?: string; proche?: boolean; selection?: boolean; annonce?: AnnonceSponsorisee | null; boost?: string | null; ou?: 'recherche' | 'categorie' | 'accueil'; auChange?: (texte: string) => void; comparer?: Produit[] }) {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const [fav, setFav] = useState(!!favori)
  const coeur = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const f = await source.basculerFavori(p.p)
    setFav(f)
    auChange?.(tf(f ? '« {p} » ajouté aux favoris.' : '« {p} » retiré des favoris.', { p: t(p.titre) }))
    majSession(await source.session())
  }
  const ajouter = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await source.ajouterProduit(p.p, {}, 1)
    noterPanier(p.univers)
    auChange?.(tf('« {p} » ajouté au panier.', { p: t(p.titre) }))
    majSession(await source.session())
  }
  const etiquette = proche ? 'Le plus proche' : (tag ?? p.tags[0])
  const remise = p.prixBarre && p.prixBarre > p.prix ? Math.round((1 - p.prix / p.prixBarre) * 100) : 0
  return (
    <Link to={chemin('fiche', { p: p.p })} className={'pcard' + (proche ? ' cl04-near' : '')} onClick={() => cliquerAnnonce(annonce ?? boost)}>
      <span className="pc-img">
        {(p.dessins[0] || p.images?.[0]) && <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} />}
        {annonce && <Sponsorise classe="sur" annonce={annonce} ou={ou} />}
        {boost && <VuAnnonce jeton={boost} campagne={'boost:' + p.p} ou="boost" />}
        {etiquette &&
          (selection ? (
            <span className="pc-tag">{t(etiquette)}</span>
          ) : (
            <span className="cl04-tags">
              <span className="pc-tag">{t(etiquette)}</span>
            </span>
          ))}
        <span className={'pc-heart' + (fav ? ' on' : '')} role="button" tabIndex={0} aria-pressed={fav} aria-label={t(fav ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={coeur}>
          <Icone nom="heart" taille={17} style={fav ? { fill: 'currentColor', color: 'var(--or)' } : undefined} />
        </span>
        {!selection && p.stock > 0 && (
          <span className="pc-add" role="button" tabIndex={0} aria-label={tf('Ajouter au panier : {p}', { p: t(p.titre) })} onClick={ajouter}>
            <Icone nom="plus" taille={18} trait={2.4} />
          </span>
        )}
      </span>
      <span className="pc-b">
        <span className="pc-t">{t(p.titre)}</span>
        {p.variante && <span className="pc-s">{t(p.variante)}</span>}
        <span className="pc-p">
          <span className="price">
            {p.depuis && <small className="fr">{t('à partir de ')}</small>}
            {F(p.depuis ?? p.prix)}
            <small>{t(' F')}</small>
          </span>
          {remise > 0 && (
            <>
              {' '}
              <s className="was">{F(p.prixBarre!)}&nbsp;F</s> <span className="off">−{remise}&nbsp;%</span>
            </>
          )}
        </span>
        <span className={'pc-d' + (selection ? '' : ' cl04-d')}>
          <Retrait p={p} />
        </span>
        <span className="pc-m">
          <span>
            <Icone nom="map-pin" taille={13} />
            {t(p.distance ?? '')}
          </span>
          <span className="stars">
            <Icone nom="star" taille={14} style={{ fill: 'currentColor' }} />
            <b>{p.note}</b>
            <span>({p.avis})</span>
          </span>
        </span>
        {!selection && (
          <span className={'cl04-et' + (horsRelais(p) ? ' xl' : '')}>
            <i></i>
            {t(horsRelais(p) ? 'Trop volumineux pour un relais' : p.stock > 0 ? 'En stock' : 'Épuisé')}
          </span>
        )}
        {comparer && <BoutonComparer p={p} tous={comparer} auChange={auChange} classe="cmp-b pc-cmp" />}
      </span>
      {selection && p.stock > 0 && (
        <span className="pc-cta" role="button" tabIndex={0} aria-label={tf('Ajouter au panier : {p}', { p: t(p.titre) })} onClick={ajouter}>
          <Icone nom="plus" taille={15} trait={2.6} />
          {t('Panier')}
        </span>
      )}
    </Link>
  )
}
