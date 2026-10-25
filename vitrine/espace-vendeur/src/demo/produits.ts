// DONNÉES DE DÉMONSTRATION — domaine « produits » (GET /offers…) et le « serveur » des offres que partage le domaine
// « offres » (src/demo/offres.ts) : un seul magasin d'offres, brouillons compris (une offre publiée reste la même
// offre, elle change d'état). Départ : les trois offres du jeu d'essai (ITEL AC52 noir en stock bas, bleu en
// vérification, iPhone 15 Pro Max), sur les fiches du catalogue de démonstration ci-dessous.
// Montants : jamais écrits. « Vous gardez » par vente est calculé au palier et à l'offre de découverte du jour
// (src/calculs) ; « ce mois » additionne le gardé figé au paiement des ventes du mois non gelées (PRD-04).
// Les chiffres du marché (offres des autres vendeurs, prix pratiqués, livraisons par zone) sont des données de
// démonstration : le serveur les tient (GET /offers/{id}/price-advice) ; seules les règles de calcul comptent.
import { calculerCommission20 } from './commission20'
import type { Attention, Compteurs, DomaineProduits, EtatOffre, Evenement, ListeProduits, Manque, PhotoReelle, Produit } from '../donnees/domaines/produits'
import type { ClasseColis } from '../donnees/communs'
import type { Publication } from '../donnees/domaines/offres'
import { ReserveAuProprietaire } from '../donnees/communs'
import { decouverteActive, familleDe } from '../calculs/commission'
import { PARAMETRES, REGISTRE, type Palier } from '../calculs/registre'
import { HEURE, jourDe, yaounde } from '../calculs/temps'
import { OffreRefusee } from '../calculs/erreurs'
import { eligible, phaseNommee, prixConseille as prixConseilleV20, prixGagnant, reglage, selection, type Offre } from '@client/calculs'
import { maintenant } from './horloge'
import { ARTICLES, BOUTIQUE, COMMANDES, OFFRES } from './jeu-essai'
import { commandesComptees, gardeFige } from './commandes'
import { aLeDroit, avecDroit, estProprietaire, exigerDroit } from './session'
import { magasin, repondre } from './stockage'
import { promoEnCours } from './ventes-flash'
import { etatBoutique } from './boutique'

// ── Catalogue de démonstration (fiches rédigées par BelivaY) et marché ─────────────────────────────────────────

export interface MarcheFiche {
  offres: number[] // prix des offres en vente des autres vendeurs (médiane, nombre, fourchette)
  pratiques: number[] // prix pratiqués sur 30 jours (10e centile, plancher du conseil)
  meilleurLivre: number[] // par zone exploitée : meilleure offre concurrente livrée (prix + livraison)
  baisse: number | null // un vendeur vient de passer à ce prix (relance « Un vendeur est passé à … »)
  clientsSemaine: number
  commandesAuxMoinsChers: [number, number]
}
export interface FicheDemo {
  id: string
  titre: string
  marque: string
  categorie: string
  rayon: string
  dessin: string
  variantes: string[]
  colis: ClasseColis
  codeBarres: string | null
  marche: MarcheFiche
}

const marche = (offres: number[], pratiques: number[], meilleurLivre: number[], baisse: number | null, clientsSemaine: number): MarcheFiche => ({ offres, pratiques, meilleurLivre, baisse, clientsSemaine, commandesAuxMoinsChers: [9, 10] })
const TEL = 'Téléphones & accessoires'
export const CATALOGUE: FicheDemo[] = [
  { id: 'itel-ac52', titre: 'ITEL AC52', marque: 'itel', categorie: 'Électronique', rayon: TEL, dessin: 'itel', variantes: ['noir', 'bleu', 'vert'], colis: 'S', codeBarres: '6941812725203', marche: marche([19000, 19000, 20500], [18800, 18900, 19000, 19000, 19500, 20000, 20000, 20500, 21000, 21000], [20500, 21500, 19900, 21400], 19000, 340) },
  { id: 'itel-ac52-64', titre: 'ITEL AC52 · 64 Go', marque: 'itel', categorie: 'Électronique', rayon: TEL, dessin: 'itel', variantes: ['noir'], colis: 'S', codeBarres: '6941812725210', marche: marche([23000, 24500], [22500, 23000, 24000, 24500], [24000, 25500, 24200, 25900], null, 120) },
  { id: 'coque-itel-ac52', titre: 'Coque ITEL AC52 · silicone', marque: 'itel', categorie: 'Électronique', rayon: TEL, dessin: 'coque', variantes: ['noir', 'transparent'], colis: 'S', codeBarres: null, marche: marche([1500, 2000, 2500], [1500, 1500, 2000, 2000, 2500], [2700, 3000, 2600, 3200], null, 85) },
  { id: 'iphone-15-pro-max', titre: 'iPhone 15 Pro Max', marque: 'Apple', categorie: 'Électronique', rayon: TEL, dessin: 'flagship', variantes: ['128 Go', '256 Go', '512 Go'], colis: 'S', codeBarres: '0194253401155', marche: marche([330000, 345000, 365000], [325000, 330000, 340000, 345000, 360000], [331000, 346000, 352000, 351500], null, 60) },
  { id: 'chargeur-18w', titre: 'Chargeur rapide 18 W · USB-C', marque: 'Oraimo', categorie: 'Électronique', rayon: TEL, dessin: 'charger', variantes: ['blanc'], colis: 'S', codeBarres: '6976152940018', marche: marche([3500, 4000, 4500], [3500, 3500, 4000, 4500], [4500, 5000, 4300, 5200], null, 210) },
  { id: 'ecouteurs-filaires', titre: 'Écouteurs filaires · jack 3,5 mm', marque: 'Oraimo', categorie: 'Électronique', rayon: TEL, dessin: 'ecouteurs', variantes: ['noir', 'blanc'], colis: 'S', codeBarres: null, marche: marche([2000, 2500, 3000], [2000, 2000, 2500, 3000], [3000, 3500, 2800, 3600], null, 150) },
  { id: 'pagne-wax', titre: 'Pagne wax 6 yards', marque: 'Vlisco', categorie: 'Mode Femme', rayon: 'Mode Femme', dessin: 'pagne', variantes: ['bleu', 'rouge', 'jaune'], colis: 'S', codeBarres: null, marche: marche([12000, 14000, 15000], [11000, 12000, 13500, 14000, 15000], [13000, 15500, 14800, 15900], null, 95) },
]
export const ficheDe = (id: string | null) => CATALOGUE.find((f) => f.id === id) ?? null

/** Zones exploitées, lues dans le registre (DP-09, DP-44 : le nombre n'est jamais écrit dans le code). */
export const ZONES: string[] = (REGISTRE['ZONES-EXPLOITEES'] ?? '').split(',').map((z) => z.trim().replace(/^Z\d+\s+/, '')).filter(Boolean)
/** Livraison réelle depuis la boutique vers chaque zone exploitée (données de démonstration, M03). */
export const LIVRAISON_ZONE = [1000, 1000, 800, 1200]

// ── Magasin des offres ─────────────────────────────────────────────────────────────────────────────────────────

export interface OffreEtat {
  id: string
  ficheId: string | null
  /** Produit nouveau (sans fiche du catalogue, DP-58) : ce que le vendeur propose ; BelivaY écrit la fiche. */
  demande: { titre: string; marque: string; categorie: string; description?: string; prioritaire?: boolean; code?: string | null } | null
  variante: string
  etat: EtatOffre
  etatArticle: string
  prix: number | null
  stock: number
  seuilAlerte: number
  delaiPreparationH: number
  colis: ClasseColis
  poidsKg: number | null
  dimensionsCm: [number, number, number] | null
  paiementAuRetrait: boolean
  madeInCameroon: boolean
  prixAuto: boolean
  plancherPrive: number | null
  prixBarre?: number | null
  finPromo?: number | null
  noteVendeur?: string
  photos: PhotoReelle[]
  envoyeeA: number | null
  verificationAvant: number | null
  verifieeA: number | null
  motifRefus: string | null
  ficheDemandee: { reponseAvant: number; prioritaire: boolean } | null
  descriptionProposee: { texte: string; envoyeeA: number; reponseAvant: number } | null
  dupliqueDe: string | null
  resterJusqua: number | null // « Rester à X F » : aucun rappel avant cette date
  historique: Evenement[]
  creeA: number
  majA: number
  ouverture?: string | null // dossier d'ouverture en cours à la création (brouillons de l'ouverture, KYC-02)
  dessin?: string // illustration propre (fiche saisie par l'agent, sans fiche du catalogue)
}
interface Etat {
  forme: 3
  offres: OffreEtat[]
  corbeille: OffreEtat[]
  attente: Record<string, PhotoReelle[]> // photos d'un brouillon à venir (« copie:<offre> »)
  publications: Record<string, Publication>
  derniere: string | null
  manques: Record<string, number> // recherches sans résultat exact de cette boutique (« cherché N fois »)
  n: number
}

const FICHE_DE_L_ARTICLE: Record<string, string> = { 'itel-noir': 'itel-ac52', 'itel-bleu': 'itel-ac52', iphone: 'iphone-15-pro-max', chargeur: 'chargeur-18w', coque: 'coque-itel-ac52', ecouteurs: 'ecouteurs-filaires', 'pagne-bleu': 'pagne-wax', 'pagne-rouge': 'pagne-wax', 'itel-64': 'itel-ac52-64', 'iphone-128': 'iphone-15-pro-max' }
// Dates de mise en ligne des offres ajoutées à la démonstration (vérifiées, brouillon, refusée).
const MISE_EN_LIGNE: Record<string, number> = { chargeur: yaounde(2025, 10, 24, 10, 0), coque: yaounde(2025, 12, 6, 9, 30), ecouteurs: yaounde(2026, 2, 11, 15, 0), 'pagne-bleu': yaounde(2025, 10, 27, 11, 0), 'pagne-rouge': yaounde(2026, 10, 10, 17, 40), 'itel-64': yaounde(2026, 3, 31, 10, 15), 'iphone-128': yaounde(2026, 10, 7, 14, 20) }
const MOTIF_REFUS: Record<string, string> = { 'iphone-128': 'Les photos montrent un écran rayé : l’état « Reconditionné » demande un écran sans défaut. Reprenez les photos ou choisissez l’état « Occasion ».' }
const photosDe = (dessin: string, prise: number, n: number): PhotoReelle[] =>
  Array.from({ length: n }, (_, i) => ({ id: `ph-${dessin}-${prise}-${i}`, image: dessin, prise: prise + i * 60_000, lieu: 'Mvog-Ada', largeur: 1600, hauteur: 1600, octetsAvant: null, octetsApres: null }))

function initial(): Etat {
  const verifiee = yaounde(2026, 6, 3, 11, 20)
  const offres: OffreEtat[] = OFFRES.map((o) => {
    const a = ARTICLES[o.id]
    const bleu = o.id === 'itel-bleu'
    const envoyee = o.verificationAvant ? o.verificationAvant - 48 * HEURE : null
    const ajoutee = MISE_EN_LIGNE[o.id]
    const priseLe = ajoutee ? ajoutee - 3_600_000 : bleu ? yaounde(2026, 10, 12, 15, 52) : o.id === 'iphone' ? yaounde(2026, 6, 25, 10, 5) : yaounde(2026, 6, 3, 9, 41)
    if (ajoutee) {
      const brouillon = o.etat === 'brouillon'
      return {
        id: o.id, ficheId: FICHE_DE_L_ARTICLE[o.id], demande: null, variante: a.variante, etat: o.etat, etatArticle: a.etat, prix: a.prix, stock: o.stock, seuilAlerte: o.seuilAlerte,
        delaiPreparationH: 4, colis: 'S', poidsKg: null, dimensionsCm: null, paiementAuRetrait: o.paiementAuRetrait, madeInCameroon: a.madeInCameroon, prixAuto: false, plancherPrive: null,
        photos: photosDe(a.dessin, priseLe, brouillon ? 1 : 3),
        envoyeeA: brouillon ? null : ajoutee,
        verificationAvant: null,
        verifieeA: o.etat === 'en_vente' || o.etat === 'en_pause' ? ajoutee + 20 * HEURE : null,
        motifRefus: MOTIF_REFUS[o.id] ?? null,
        ficheDemandee: null, descriptionProposee: null, dupliqueDe: o.id === 'pagne-rouge' ? 'bleu' : null, resterJusqua: null,
        historique: brouillon
          ? [{ a: ajoutee, quoi: 'Brouillon enregistré' }]
          : [...(o.etat === 'refusee' ? [{ a: ajoutee + 20 * HEURE, quoi: 'Offre refusée par BelivaY' }] : o.etat === 'en_pause' ? [{ a: yaounde(2026, 9, 23, 8, 30), quoi: 'Offre mise en pause' }] : []), { a: ajoutee, quoi: 'Offre envoyée en vérification' }],
        creeA: ajoutee,
        majA: ajoutee + 20 * HEURE,
      }
    }
    return {
      id: o.id,
      ficheId: FICHE_DE_L_ARTICLE[o.id],
      demande: null,
      variante: a.variante,
      etat: o.etat,
      etatArticle: a.etat,
      prix: a.prix,
      stock: o.stock,
      seuilAlerte: o.seuilAlerte,
      delaiPreparationH: 4,
      colis: 'S',
      poidsKg: null,
      dimensionsCm: null,
      paiementAuRetrait: o.paiementAuRetrait,
      madeInCameroon: a.madeInCameroon,
      prixAuto: false,
      plancherPrive: null,
      photos: photosDe(a.dessin, priseLe, 3),
      envoyeeA: envoyee ?? (o.id === 'iphone' ? yaounde(2026, 6, 25, 10, 30) : yaounde(2026, 6, 2, 9, 50)),
      verificationAvant: o.verificationAvant,
      verifieeA: o.etat === 'en_vente' ? (o.id === 'iphone' ? yaounde(2026, 6, 26, 9, 0) : verifiee) : null,
      motifRefus: null,
      ficheDemandee: null,
      descriptionProposee: null,
      dupliqueDe: bleu ? 'noir' : null,
      resterJusqua: null,
      historique: [{ a: envoyee ?? yaounde(2026, 6, 2, 9, 50), quoi: 'Offre envoyée en vérification' }],
      creeA: envoyee ?? yaounde(2026, 6, 2, 9, 40),
      majA: envoyee ?? verifiee,
    }
  })
  return { forme: 3, offres, corbeille: [], attente: {}, publications: {}, derniere: null, manques: {}, n: 0 }
}

const brut = magasin<Etat>('produits', initial)
/** Magasin partagé avec src/demo/offres.ts. Un état gardé d'une forme ancienne (vagues 1 et 2) est oublié. */
export const etatOffres = {
  lire(): Etat {
    const e = brut.lire()
    if (e?.forme !== 3) {
      brut.reinitialiser()
      return brut.lire()
    }
    return e
  },
  ecrire(f: (e: Etat) => void): Etat {
    etatOffres.lire()
    return brut.ecrire(f)
  },
}

export function nouvelId(e: Etat): string {
  e.n++
  return 'o' + Date.now().toString(36) + e.n
}
export function journal(o: OffreEtat, quoi: string, valeurs?: Record<string, string | number>) {
  o.historique.unshift({ a: maintenant(), quoi, valeurs })
  o.historique = o.historique.slice(0, 30)
  o.majA = maintenant()
}
export function reserve(quoi: string) {
  if (!estProprietaire()) throw new ReserveAuProprietaire(quoi)
}

// ── Calculs du serveur (démonstration : src/calculs) ──────────────────────────────────────────────────────────

/** Montant gardé par vente au palier et à l'offre de découverte du jour ; null si la vente serait refusée (DP-55). */
export function gardeParVente(prix: number, categorie: string, mic: boolean, palier: Palier = BOUTIQUE.palier): number {
  const p = PARAMETRES.commission
  const dec = decouverteActive(BOUTIQUE.premiereCommandePayee, jourDe(maintenant()), commandesComptees(), p)
  return calculerCommission20([{ famille: familleDe(categorie, p), prixUnitaire: prix, madeInCameroon: mic }], palier, dec, p).garde
}
export function gardeOuNull(prix: number, categorie: string, mic: boolean): number | null {
  try {
    return gardeParVente(prix, categorie, mic)
  } catch (e) {
    if (e instanceof OffreRefusee) return null
    throw e
  }
}
/** Part gardée à une décimale (PRX-08 : « soit 89,5 % »). */
export const partDe = (garde: number, prix: number) => Math.round((garde / prix) * 1000) / 10

/** Premier dans une zone ⇔ prix + livraison réelle depuis la boutique < meilleure offre concurrente livrée (VD08-R04). */
export const premierDans = (f: FicheDemo, prix: number) => ZONES.map((_, i) => prix + LIVRAISON_ZONE[i % LIVRAISON_ZONE.length] < f.marche.meilleurLivre[i % f.marche.meilleurLivre.length])

/** Prix conseillé (R34, BV-DEV-02 § 8 ; calcul du client : site/src/calculs/meilleureOffre.ts) : min(prix saisi ;
 *  max(médiane des prix gagnants des zones ; 10e centile du marché ; 1 000 F ; plancher)) ; prix gagnant d'une zone =
 *  meilleur prix livré concurrent − livraison de l'offre vers la zone − 100 F, à la centaine inférieure. */
export function prixConseille(f: FicheDemo, prixSaisi: number, plancherPrive: number | null): number {
  const gagnants = ZONES.map((_, i) => prixGagnant(f.marche.meilleurLivre[i % f.marche.meilleurLivre.length], LIVRAISON_ZONE[i % LIVRAISON_ZONE.length]))
  return prixConseilleV20(prixSaisi, gagnants, f.marche.pratiques, plancherPrive ?? 0)
}
/** Badge « Meilleur prix » (R34) : l'offre la moins chère du produit. */
export const meilleurPrixDe = (f: FicheDemo, prix: number | null) => prix !== null && f.marche.offres.every((x) => prix <= x)

/** Dans la course (BV-DEV-02 ; R29 à R33) : le moteur de la meilleure offre (site/src/calculs/meilleureOffre.ts) sur
 *  les offres en vente du produit, vers le quartier de la boutique. Démonstration : les autres offres sont dans la même
 *  zone (l'écart de coût livré = l'écart de prix), Trust Score 70 ; phase « Démarrage » (REPRISES-FIN : la phase suit
 *  le mois depuis l'ouverture des achats, donnée du serveur). */
export function courseDe(f: FicheDemo, prix: number, stock: number, fermee: boolean): NonNullable<Produit['course']> {
  const commun = { zone: BOUTIQUE.zone, niveau: 'centre' as const, km: 3, format: 'P' as const, delaiH: 4, note: 4, couverte: true }
  const moi: Offre = { ...commun, id: 'moi', prix, trust: BOUTIQUE.trustScore, stock, fermee, note: null }
  const autres: Offre[] = f.marche.offres.map((p, i) => ({ ...commun, id: 'o' + i, prix: p, trust: 70, stock: 5 }))
  const sel = selection(phaseNommee('Démarrage'), 'domicile', { zone: BOUTIQUE.zone, niveau: 'centre' }, [moi, ...autres])
  const offres = autres.length + 1
  if (!eligible(moi)) return { dans: false, motif: moi.trust < reglage('trust_min') ? 'trust' : stock <= 0 ? 'stock' : 'fermee', baisse: null, offres }
  if (sel.enControle.includes('moi')) return { dans: false, motif: 'controle', baisse: null, offres }
  if (sel.enCourse.some((x) => x.id === 'moi')) return { dans: true, motif: null, baisse: null, offres }
  const baisse = sel.meilleurCtl !== null && sel.tolerance !== null ? sel.ctl.moi - (sel.meilleurCtl + sel.tolerance) : null
  return { dans: false, motif: 'prix', baisse, offres }
}

// ── Vue « Produit » (ce que renvoie GET /offers) ──────────────────────────────────────────────────────────────

const mois = (t: number) => jourDe(t).slice(0, 7)
const VENDUES = ['versee', 'a_verser', 'se_libere']

export const NOM_MIN = 3

/** Ce qui manque à un brouillon pour être publié (DP-58 : une seule page « Nouveau produit »). */
export function manquesDe(o: OffreEtat): Manque[] {
  if (o.etat !== 'brouillon') return []
  const m: Manque[] = []
  if (!o.ficheId && (!o.demande || o.demande.titre.trim().length < NOM_MIN || !o.demande.categorie)) m.push('produit')
  if (o.prix === null) m.push('prix')
  if (o.stock < 1) m.push('stock')
  if (!o.etatArticle) m.push('etat')
  if (o.photos.length < PARAMETRES.console.photos.min) m.push('photos')
  return m
}

export function vue(o: OffreEtat): Produit {
  const proprio = estProprietaire()
  // Une vente flash en cours (Promotions ou offerte au mérite : une seule notion, demo/ventes-flash.ts) change le prix
  // payé : prix remisé, prix barré = prix de référence, fin = fin de la vente ; ce que le vendeur garde suit (F9).
  const flash = promoEnCours(o.id)
  const prix = flash ? flash.prixPromo : o.prix
  const f = ficheDe(o.ficheId)
  const titre = f?.titre ?? o.demande?.titre ?? ''
  const categorie = f?.categorie ?? o.demande?.categorie ?? 'Électronique'
  const ceMois = mois(maintenant())
  const ventes = COMMANDES.filter((c) => c.article === o.id && mois(c.payeeA) === ceMois)
  const gardees = ventes.filter((c) => VENDUES.includes(c.etape))
  const litiges = ventes.filter((c) => c.etape === 'litige')
  const concurrent =
    o.etat === 'en_vente' && f?.marche.baisse && o.prix !== null && f.marche.baisse < o.prix && !(o.resterJusqua && o.resterJusqua > maintenant())
      ? { prix: f.marche.baisse, conseille: prixConseille(f, o.prix, o.plancherPrive) }
      : null
  const attention: Attention[] = [
    ...(o.etat === 'en_vente' && o.stock <= o.seuilAlerte ? (['stock_bas'] as const) : []),
    ...(concurrent ? (['concurrent_moins_cher'] as const) : []),
    ...(litiges.length ? (['litiges'] as const) : []),
  ]
  return {
    id: o.id,
    ficheId: o.ficheId,
    titre,
    marque: f?.marque ?? o.demande?.marque ?? '',
    variante: o.variante,
    categorie,
    rayon: f?.rayon ?? categorie,
    dessin: f?.dessin ?? o.dessin ?? 'itel',
    etat: o.etat,
    etatArticle: o.etatArticle,
    prix: proprio ? prix : null,
    garde: proprio && prix !== null ? gardeOuNull(prix, categorie, o.madeInCameroon) : null,
    stock: o.stock,
    seuilAlerte: o.seuilAlerte,
    delaiPreparationH: o.delaiPreparationH,
    colis: o.colis,
    poidsKg: o.poidsKg,
    dimensionsCm: o.dimensionsCm,
    paiementAuRetrait: o.paiementAuRetrait,
    madeInCameroon: o.madeInCameroon,
    prixAuto: o.prixAuto,
    plancherPrive: proprio ? o.plancherPrive : null,
    photos: o.photos,
    envoyeeA: o.envoyeeA,
    verificationAvant: o.verificationAvant,
    verifieeA: o.verifieeA,
    motifRefus: o.motifRefus,
    ficheDemandee: o.ficheDemandee,
    descriptionProposee: o.descriptionProposee,
    dupliqueDe: o.dupliqueDe,
    ventesCeMois: gardees.length,
    gardeCeMois: proprio ? gardees.reduce((s, c) => s + gardeFige(c), 0) : null,
    litigesCeMois: litiges.length,
    geleCeMois: proprio ? litiges.reduce((s, c) => s + gardeFige(c), 0) : null,
    attention,
    concurrent: proprio ? concurrent : null,
    course: proprio && o.etat === 'en_vente' && f && prix !== null ? courseDe(f, prix, o.stock, etatBoutique().fermeeAujourdhui) : null,
    prixConseille: proprio && o.etat === 'en_vente' && f && o.prix !== null ? prixConseille(f, o.prix, o.plancherPrive) : null,
    meilleurPrix: o.etat === 'en_vente' && !!f && meilleurPrixDe(f, prix),
    manques: manquesDe(o),
    prixBarre: proprio ? (flash ? flash.prixReference : (o.prixBarre ?? null)) : null,
    finPromo: flash ? flash.fin : (o.finPromo ?? null),
    noteVendeur: o.noteVendeur ?? '',
    nouveau: !o.ficheId && o.demande ? { description: o.demande.description ?? '', prioritaire: !!o.demande.prioritaire } : null,
    historique: o.historique,
    majA: o.majA,
  }
}

/** Ordre de la liste (PRD-02, Q-90) : attention (vendeur moins cher, litige, refus) → stock sous le seuil →
 *  vérification → brouillon → le reste ; à rang égal, la carte qui cumule le plus de sujets, puis la plus récente. */
function rang(p: Produit): number {
  if (p.etat === 'refusee' || p.attention.includes('concurrent_moins_cher') || p.attention.includes('litiges')) return 0
  if (p.attention.includes('stock_bas')) return 1
  if (p.etat === 'en_verification') return 2
  if (p.etat === 'brouillon') return 3
  return 4
}
export function listeTriee(): Produit[] {
  return etatOffres
    .lire()
    .offres.map(vue)
    .sort((a, b) => rang(a) - rang(b) || b.attention.length - a.attention.length || b.majA - a.majA)
}
function compter(ps: Produit[]): Compteurs {
  const c = { total: ps.length, en_vente: 0, en_verification: 0, en_pause: 0, refusee: 0, brouillon: 0 }
  for (const p of ps) c[p.etat]++
  return c
}

// ── Ouverture de la boutique (VD-03) ─────────────────────────────────────────────────────────────────────────────
/** Brouillons créés pendant une ouverture (Nouvelle offre, fiches de la saisie assistée) : en ligne dès l'accord. */
export const brouillonsDeLOuverture = (ref: string) => etatOffres.lire().offres.filter((o) => o.ouverture === ref && o.etat === 'brouillon').length

/** Accord des pièces (P-1, DP-57) : les brouillons de l'ouverture sur une fiche existante passent en vente ; ceux sans
 * fiche du catalogue passent en vérification. Rend le nombre d'offres en ligne. */
export function publierBrouillonsDeLOuverture(ref: string): number {
  let n = 0
  etatOffres.ecrire((e) => {
    for (const o of e.offres)
      if (o.ouverture === ref && o.etat === 'brouillon') {
        o.etat = o.ficheId ? 'en_vente' : 'en_verification'
        o.majA = maintenant()
        if (o.etat === 'en_vente') n++
        journal(o, o.etat === 'en_vente' ? 'Pièces vérifiées : offre en ligne' : 'Pièces vérifiées : offre envoyée en vérification')
      }
  })
  return n
}

/** Fiches validées dans la saisie assistée (VD-03, SAI-01) : elles rejoignent Mes produits, « en vérification » quand
 * le prix anormal est relu par une personne (DP-56 Q-40), sinon en brouillon pendant une ouverture, en vérification
 * après (nouvelle fiche à relire). */
export function ajouterFichesSaisie(fiches: { id: string; titre: string; dessin: string; prix: number; stock: number; enVerification: boolean }[], ouverture: string | null) {
  const t = maintenant()
  etatOffres.ecrire((e) => {
    for (const f of fiches) {
      const id = 'sa-' + f.id.replace(/^sa-/, '') + '-' + t.toString(36)
      const o: OffreEtat = {
        id, ficheId: null, demande: { titre: f.titre, marque: '', categorie: 'Électronique' }, variante: '', etat: f.enVerification || !ouverture ? 'en_verification' : 'brouillon', etatArticle: 'Neuf',
        prix: f.prix, stock: f.stock, seuilAlerte: 2, delaiPreparationH: 4, colis: 'S', poidsKg: null, dimensionsCm: null, paiementAuRetrait: true, madeInCameroon: false, prixAuto: false, plancherPrive: null,
        photos: [], envoyeeA: t, verificationAvant: t + 48 * HEURE, verifieeA: null, motifRefus: null, ficheDemandee: null, descriptionProposee: null, dupliqueDe: null, resterJusqua: null,
        historique: [], creeA: t, majA: t, ouverture, dessin: f.dessin,
      }
      journal(o, 'Fiche saisie par l’agent de zone, validée par vous')
      e.offres.push(o)
    }
  })
}

/** Produits en vente dont le stock est au seuil d'alerte ou dessous (accueil). */
export const stocksBas = () => listeTriee().filter((p) => p.attention.includes('stock_bas'))
export const produitsActifs = () => etatOffres.lire().offres.filter((o) => o.etat === 'en_vente' && o.stock > 0).length

const trouver = (e: Etat, id: string) => e.offres.find((x) => x.id === id)
const champ = (v: string | number | null) => (v === null ? '' : String(v).includes(';') ? `"${String(v)}"` : String(v))

export const demoProduits: DomaineProduits = {
  liste() {
    if (!aLeDroit('produits.voir')) return Promise.reject(new ReserveAuProprietaire('produits'))
    const produits = listeTriee()
    const l: ListeProduits = { compteurs: compter(produits), produits, luA: maintenant() }
    return repondre(l)
  },
  detail: (id) => avecDroit('produits.voir', 'produit', () => repondre(etatOffres.lire().offres.some((o) => o.id === id) ? vue(trouver(etatOffres.lire(), id)!) : null)),
  async changerStock(id, stock) {
    exigerDroit('produits.stock', 'stock')
    if (!Number.isInteger(stock) || stock < 0 || stock > 99999) return { ok: false, raison: 'stock' }
    const e = etatOffres.ecrire((x) => {
      const o = trouver(x, id)
      if (!o || o.stock === stock) return
      journal(o, 'Stock changé : {de} → {a}', { de: o.stock, a: stock })
      o.stock = stock
    })
    const o = trouver(e, id)
    return o ? { ok: true, produit: vue(o) } : { ok: false, raison: 'stock' }
  },
  async pause(id, enPause) {
    reserve('produits.pause')
    const e = etatOffres.ecrire((x) => {
      const o = trouver(x, id)
      if (!o || !(o.etat === 'en_vente' || o.etat === 'en_pause')) return
      o.etat = enPause ? 'en_pause' : 'en_vente'
      journal(o, enPause ? 'Mise en pause' : 'Remise en vente')
    })
    const o = trouver(e, id)
    return o ? vue(o) : null
  },
  async regler(id, champs) {
    if (!estProprietaire()) return { ok: false, raison: 'reserve' }
    const o0 = trouver(etatOffres.lire(), id)
    if (!o0) return { ok: false, raison: 'seuil' }
    if (champs.seuilAlerte !== undefined && (!Number.isInteger(champs.seuilAlerte) || champs.seuilAlerte < 0 || champs.seuilAlerte > 9999)) return { ok: false, raison: 'seuil' }
    const prixAuto = champs.prixAuto ?? o0.prixAuto
    const plancher = champs.plancherPrive !== undefined ? champs.plancherPrive : o0.plancherPrive
    if (prixAuto && (plancher === null || !Number.isInteger(plancher) || plancher < PARAMETRES.commission.prixMin || (o0.prix !== null && plancher > o0.prix)))
      return { ok: false, raison: 'plancher', detail: String(o0.prix ?? '') }
    const e = etatOffres.ecrire((x) => {
      const o = trouver(x, id)!
      if (champs.paiementAuRetrait !== undefined && champs.paiementAuRetrait !== o.paiementAuRetrait) {
        o.paiementAuRetrait = champs.paiementAuRetrait
        journal(o, champs.paiementAuRetrait ? 'Paiement au retrait accepté' : 'Paiement au retrait coupé')
      }
      if (champs.prixAuto !== undefined && champs.prixAuto !== o.prixAuto) {
        o.prixAuto = champs.prixAuto
        journal(o, champs.prixAuto ? 'Prix automatique activé, jamais sous {p} F' : 'Prix automatique coupé', { p: plancher ?? 0 })
      }
      if (champs.plancherPrive !== undefined) o.plancherPrive = champs.plancherPrive
      if (champs.seuilAlerte !== undefined && champs.seuilAlerte !== o.seuilAlerte) {
        journal(o, 'Seuil d’alerte : {de} → {a}', { de: o.seuilAlerte, a: champs.seuilAlerte })
        o.seuilAlerte = champs.seuilAlerte
      }
    })
    return { ok: true, produit: vue(trouver(e, id)!) }
  },
  async dupliquer(id, variante) {
    reserve('produits.dupliquer')
    const v = variante.trim()
    const s = trouver(etatOffres.lire(), id)
    if (!s || !v) return { ok: false, raison: 'variante' }
    const f = ficheDe(s.ficheId)
    const norme = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (etatOffres.lire().offres.some((o) => o.ficheId === s.ficheId && norme(o.variante) === norme(v))) return { ok: false, raison: 'existe' }
    const connue = f?.variantes.find((x) => norme(x) === norme(v))
    if (!connue) return { ok: false, raison: 'fiche' }
    let nouveau = ''
    etatOffres.ecrire((x) => {
      nouveau = nouvelId(x)
      const cle = 'copie:' + id
      const o: OffreEtat = {
        ...structuredClone(s),
        id: nouveau,
        variante: connue,
        etat: 'brouillon',
        prixBarre: null,
        finPromo: null,
        prix: null,
        stock: 0,
        prixAuto: false,
        plancherPrive: null,
        photos: x.attente[cle] ?? [],
        envoyeeA: null,
        verificationAvant: null,
        verifieeA: null,
        motifRefus: null,
        descriptionProposee: null,
        dupliqueDe: s.variante,
        resterJusqua: null,
        historique: [],
        creeA: maintenant(),
        majA: maintenant(),
      }
      journal(o, 'Brouillon créé depuis la variante {v}', { v: s.variante })
      delete x.attente[cle]
      x.offres.push(o)
    })
    return { ok: true, brouillonId: nouveau, rattache: true }
  },
  async supprimer(id) {
    const o = trouver(etatOffres.lire(), id)
    if (!o || o.etat !== 'brouillon') return { ok: false, raison: 'etat' }
    etatOffres.ecrire((x) => {
      x.corbeille = [o, ...x.corbeille].slice(0, 5)
      x.offres = x.offres.filter((y) => y.id !== id)
    })
    return { ok: true }
  },
  async restaurer(id) {
    etatOffres.ecrire((x) => {
      const o = x.corbeille.find((y) => y.id === id)
      if (!o) return
      x.corbeille = x.corbeille.filter((y) => y.id !== id)
      x.offres.push(o)
    })
  },
  async variantes(ficheId) {
    const f = ficheDe(ficheId)
    const offres = etatOffres.lire().offres.filter((o) => o.ficheId === ficheId)
    return (f?.variantes ?? []).map((v) => {
      const o = offres.find((x) => x.variante === v)
      return { variante: v, offreId: o?.id ?? null, etat: o?.etat ?? null }
    })
  },
  async exporter() {
    const proprio = estProprietaire()
    const lignes = listeTriee().map((p) => [p.id, p.titre, p.variante, p.etat, proprio ? p.prix : null, p.stock, p.seuilAlerte].map(champ).join(';'))
    return ['identifiant;produit;variante;etat;prix;stock;seuil', ...lignes].join('\n')
  },
  async importer(csv) {
    const lignes = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lignes.length) return { ok: false, raison: 'vide' }
    const tete = lignes[0].split(';').map((x) => x.trim().toLowerCase())
    const [iId, iStock, iSeuil] = ['identifiant', 'stock', 'seuil'].map((c) => tete.indexOf(c))
    if (iId < 0 || iStock < 0) return { ok: false, raison: 'format' }
    let faites = 0
    let ignorees = 0
    etatOffres.ecrire((x) => {
      for (const l of lignes.slice(1)) {
        const c = l.split(';').map((v) => v.trim().replace(/^"|"$/g, ''))
        const o = trouver(x, c[iId])
        const stock = Number(c[iStock])
        const seuil = iSeuil >= 0 && c[iSeuil] !== '' ? Number(c[iSeuil]) : null
        if (!o || !Number.isInteger(stock) || stock < 0 || (seuil !== null && (!Number.isInteger(seuil) || seuil < 0))) {
          ignorees++
          continue
        }
        if (o.stock !== stock) journal(o, 'Stock changé : {de} → {a}', { de: o.stock, a: stock })
        o.stock = stock
        if (seuil !== null) o.seuilAlerte = seuil
        faites++
      }
    })
    return { ok: true, lignes: faites, ignorees }
  },
}
