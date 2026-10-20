// Adaptateurs : formats de relaya-marketplace (sérialiseurs DRF, commit 9546ffe) → types de la source
// (src/donnees/source.ts). Fonctions pures, sans appel réseau : testables seules.
//
// Règle : un champ que le serveur ne donne pas encore reçoit une valeur neutre (0, null, false, liste vide)
// qui n'affiche rien de faux (CNV-07 : un compteur à 0 ne s'affiche pas) ; chaque manque est listé dans
// src/api/routes.ts et CONNECTEURS.md. Aucun montant n'est calculé ici : ils viennent tels quels du serveur.
import { masquer, operateur } from '../donnees/numeros'
import type { Appareil, Client, CommandeClient, EtatCommande, Favori, NotificationClient, PhotoServeur, Produit, Relais, AvisProduit } from '../donnees/source'

// ——— Formats relaya (champs lus seulement) ———

export interface RUtilisateur {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  has_usable_password?: boolean
  loyalty_points?: number
}
export interface RJetons {
  access: string
  refresh: string
}
export interface RDeuxFacteurs {
  '2fa_required': true
  user_id: number
  email: string
}
export interface RNotification {
  id: number
  title: string
  message: string
  notification_type: 'ORDER' | 'PROMOTION' | 'PAYMENT' | 'SUPPORT' | 'SYSTEM'
  action_url: string | null
  is_read: boolean
  created_at: string
}
export interface RPanier {
  items: { id: number; quantity: number }[]
}
export interface RImage {
  image_url?: string | null
  url?: string | null
  is_primary?: boolean
  alt_text?: string | null
  srcset?: string | null // si relaya sert des variantes de largeur (sinon une seule adresse)
}
export interface RProduit {
  id: number
  title: string
  slug: string
  description: string | null
  short_description?: string | null
  price_xaf: number
  price_final?: number | null
  compare_at_price?: number | null
  stock_quantity?: number | null
  rating_average?: number | null
  reviews_count?: number | null
  category?: number | { id: number; name?: string; slug?: string } | null
  images?: RImage[]
  media?: RImage[]
}
export interface RPage<T> {
  count?: number
  next?: string | null
  results: T[]
}
export interface RFavori {
  id: number
  product: RProduit
  created_at: string
}
export interface RAvis {
  id: number
  rating: number
  title?: string | null
  comment: string | null
  created_at: string
  order_item_title?: string | null
}
export interface RRelais {
  id: number
  name: string
  address: string | null
  city: string | null
  opening_hours: string | Record<string, unknown> | null
  has_space: boolean
  distance_km: number | null
  photo_url?: string | null // photo de la devanture, si relaya la sert (RelayPointProfile)
  image_url?: string | null
}
export interface RArticleCommande {
  id: number
  product: number | null
  title_snapshot: string
  price_xaf_snapshot: number
  qty: number
  line_total_xaf: number
}
export interface RCommande {
  id: number
  payment_status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  fulfillment_status: string
  delivery_mode: 'DELIVERY' | 'PICKUP'
  relay_point_name: string | null
  district: string | null
  address: string | null
  authorized_pickup_name: string | null
  authorized_pickup_phone: string | null
  subtotal_xaf: number
  delivery_fee_xaf: number
  total_xaf: number
  items: RArticleCommande[]
  created_at: string
  updated_at: string
  /** La CommandeClient complète du kit (pickup.services.vue_commande_client : colis par boutique, code de retrait,
   * garde, comptoir, fenêtre de retour), si relaya la sert dans OrderDetailSerializer (décision D14). */
  espace_client?: CommandeClient | null
}
export interface RSessionAppareil {
  jti: string
  device_name: string | null
  browser: string | null
  os_name: string | null
  created_at: string
  last_activity: string | null
  is_current: boolean
}

// ——— Outils ———

export const temps = (iso: string | null | undefined): number => (iso ? Date.parse(iso) || 0 : 0)

/** « c•••••@gmail.com » */
export function masquerEmail(email: string): string {
  const [n, d] = email.split('@')
  if (!d) return email
  return `${n.slice(0, 1)}${'•'.repeat(Math.max(3, Math.min(6, n.length - 1)))}@${d}`
}

/** Référence affichée d'une commande relaya (identifiant entier) : « BLV-52018 » ; et l'inverse. */
export const refCommande = (id: number) => `BLV-${id}`
export function idCommande(ref: string): number {
  const n = Number(ref.replace(/^BLV-/i, ''))
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Référence de commande inconnue : ${ref}`)
  return n
}

// Portrait par défaut (initiales), tant que le client n'a pas de photo.
function initiales(prenom: string, nom: string, taille: 36 | 48): { svg: string } {
  const i = `${prenom.slice(0, 1)}${nom.slice(0, 1)}`.toUpperCase() || '·'
  const r = taille / 2
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" aria-hidden="true"><circle cx="${r}" cy="${r}" r="${r}" fill="#E8EEF7"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.round(taille * 0.4)}" font-weight="600" fill="#1F3A5F">${i.replace(/[<&>]/g, '')}</text></svg>`,
  }
}

// ——— Client ———

export function versClient(u: RUtilisateur): Client {
  const prenom = u.first_name || u.username
  const nom = u.last_name || ''
  const op = u.phone ? operateur(u.phone) : null
  return {
    prenom,
    nom,
    nomComplet: [prenom, nom].filter(Boolean).join(' '),
    numeroMasque: u.phone ? masquer(u.phone) : '',
    operateur: op ?? '',
    email: u.email,
    emailMasque: masquerEmail(u.email),
    // relaya ne dit pas quelle méthode a ouvert la session ; sans mot de passe utilisable, c'est Google ou Apple.
    connexion: u.has_usable_password === false ? 'google' : 'email',
    portrait: u.avatar_url ? { 36: { url: u.avatar_url }, 48: { url: u.avatar_url } } : { 36: initiales(prenom, nom, 36), 48: initiales(prenom, nom, 48) },
    photo: u.avatar_url,
  }
}

// ——— Notifications ———

const TYPE_NOTIFICATION: Record<RNotification['notification_type'], NotificationClient['type']> = {
  ORDER: 'Suivi',
  PAYMENT: 'Paiement',
  SUPPORT: 'Messages',
  PROMOTION: 'Promotions',
  SYSTEM: 'Incident',
}
export function versNotification(n: RNotification): NotificationClient {
  return {
    id: String(n.id),
    type: TYPE_NOTIFICATION[n.notification_type] ?? 'Suivi',
    titre: n.title,
    texte: n.message,
    le: temps(n.created_at),
    lu: n.is_read,
    lien: n.action_url ?? '',
    sms: false,
  }
}

// ——— Catalogue ———

export function imageProduit(p: RProduit): string | null {
  return photosProduit(p)[0]?.url ?? null
}
// Photos d'un produit relaya (ProductImage, ProductMedia ; la principale d'abord) → `images` du site (le site garde le
// dessin en repli : `dessins` reste vide). Champs lus : image_url | url, alt_text, srcset.
export function photosProduit(p: RProduit): PhotoServeur[] {
  const imgs = [...(p.images ?? []), ...(p.media ?? [])].sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))
  return imgs.flatMap((i) => {
    const url = i.image_url ?? i.url
    return url ? [{ url, ...(i.srcset ? { srcset: i.srcset } : {}), alt: i.alt_text || p.title }] : []
  })
}
const categorie = (p: RProduit) => (typeof p.category === 'object' && p.category ? { id: String(p.category.id), nom: p.category.name ?? '' } : { id: p.category == null ? '' : String(p.category), nom: '' })

export function versProduit(p: RProduit): Produit {
  const prix = p.price_final ?? p.price_xaf
  const cat = categorie(p)
  return {
    p: String(p.id),
    titre: p.title,
    prix,
    prixBarre: p.compare_at_price && p.compare_at_price > prix ? p.compare_at_price : null,
    classe: 'M', // classe de colis : pas encore servie (CONNECTEURS.md)
    marque: null,
    note: p.rating_average ? p.rating_average.toFixed(1).replace('.', ',') : null,
    avis: p.reviews_count ?? 0,
    ventes: 0,
    stock: p.stock_quantity ?? 0,
    univers: cat.id,
    universTitre: cat.nom,
    tags: [],
    dessins: [], // dessins de la démonstration : aucun ; les photos du serveur dans `images`
    images: photosProduit(p),
    options: [],
    vendeur: { boutique: '', zone: '', score: 0, palier: '', km: 0 },
    autres: [],
    description: p.description ?? p.short_description ?? '',
    specs: [],
  }
}

export function versAvisProduit(a: RAvis): AvisProduit {
  return {
    id: String(a.id),
    note: a.rating,
    le: temps(a.created_at),
    variante: null,
    texte: [a.title, a.comment].filter(Boolean).join(' — '),
    photo: null,
    utiles: 0,
    monVote: false,
    signale: false,
    reponse: null,
  }
}
/** Répartition des notes 5 → 1 (même ordre que la démonstration), comptée sur les avis reçus. */
export function repartition(avis: RAvis[]): number[] {
  return [5, 4, 3, 2, 1].map((n) => avis.filter((a) => Math.round(a.rating) === n).length)
}

export function versFavori(f: RFavori): Favori {
  const image = photosProduit(f.product)[0] ?? null
  const prix = f.product.price_final ?? f.product.price_xaf
  return {
    id: String(f.id),
    p: String(f.product.id),
    titre: f.product.title,
    variante: null,
    dessin: '',
    image,
    prix,
    prixAvant: null,
    retrait: prix, // prix livré au relais : pas encore servi ; le prix de l'article en attendant
    stock: (f.product.stock_quantity ?? 1) > 0 ? 'ok' : 'rupture',
    alertes: { prix: false, stock: false },
    ajouteLe: temps(f.created_at),
  }
}

// ——— Relais ———

function horaires(h: RRelais['opening_hours']): string {
  if (!h) return ''
  if (typeof h === 'string') return h
  return Object.entries(h)
    .map(([j, v]) => `${j} ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' · ')
}
export function versRelais(r: RRelais): Relais {
  return {
    nom: r.name,
    quartier: [r.address, r.city].filter(Boolean).join(', '),
    gerant: '',
    km: r.distance_km ?? 0,
    horaires: horaires(r.opening_hours),
    ferme: '',
    plein: !r.has_space,
    image: r.photo_url || r.image_url ? { url: (r.photo_url || r.image_url)!, alt: r.name } : null,
  }
}

// ——— Commandes ———

export function etatCommande(c: Pick<RCommande, 'payment_status' | 'fulfillment_status'>): EtatCommande {
  const f = c.fulfillment_status
  if (f === 'CANCELLED' || f === 'REFUNDED' || c.payment_status === 'REFUNDED') return 'annulee'
  if (f === 'DISPUTED') return 'litige'
  if (c.payment_status === 'PENDING' || c.payment_status === 'FAILED') return 'paiement'
  if (['BUYER_CONFIRMED', 'AUTO_CONFIRMED', 'RELEASED_TO_VENDOR'].includes(f)) return 'retiree'
  if (f === 'DELIVERED') return 'retirable'
  if (['DRIVER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(f)) return 'route'
  return 'preparation' // CREATED, PAID_IN_ESCROW, VENDOR_ACKNOWLEDGED, PREPARING, READY_FOR_PICKUP
}

export function versCommande(c: RCommande): CommandeClient {
  // Le kit rend déjà la commande au format du site : elle fait foi ; la délégation reste lue chez relaya.
  if (c.espace_client)
    return {
      ...c.espace_client,
      delegue: c.espace_client.delegue ?? (c.authorized_pickup_name ? { prenom: c.authorized_pickup_name, numero: c.authorized_pickup_phone ?? '' } : null),
    }
  const etat = etatCommande(c)
  const cree = temps(c.created_at)
  const maj = temps(c.updated_at)
  return {
    ref: refCommande(c.id),
    etat,
    payeeLe: cree,
    mode: c.delivery_mode === 'PICKUP' ? 'relais' : 'domicile',
    lieu: c.delivery_mode === 'PICKUP' ? (c.relay_point_name ?? '') : [c.district, c.address].filter(Boolean).join(' · '),
    // relaya n'a pas de colis par boutique : un « colis » par article, sans boutique (CONNECTEURS.md).
    colis: c.items.map((a, i) => ({
      n: i + 1,
      p: a.product == null ? '' : String(a.product),
      produit: a.title_snapshot,
      dessin: '',
      prix: a.price_xaf_snapshot,
      qte: a.qty,
      boutique: '',
      etagere: null,
      arrive: etat === 'retirable' || etat === 'retiree',
    })),
    total: c.total_xaf,
    livraison: c.delivery_fee_xaf,
    code: null,
    codeBio: false,
    arriveeLe: etat === 'retirable' ? maj : null,
    pretLe: etat === 'retirable' ? maj : null,
    garde: null,
    comptoir: null,
    litige: null,
    retireeLe: etat === 'retiree' ? maj : null,
    retourJusqua: null,
    annulee: etat === 'annulee' ? { le: maj, rembourse: 0 } : null,
    delegue: c.authorized_pickup_name ? { prenom: c.authorized_pickup_name, numero: c.authorized_pickup_phone ?? '' } : null,
    etapes: [],
  }
}

// ——— Appareils ———

export function versAppareil(s: RSessionAppareil): Appareil {
  return {
    id: s.jti,
    nom: [s.device_name, s.browser, s.os_name].filter(Boolean).join(' · ') || 'Appareil',
    lieu: '',
    derniere: temps(s.last_activity ?? s.created_at),
    actuel: s.is_current,
  }
}
