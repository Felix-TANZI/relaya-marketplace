// Domaines « Catalogue, fiche et avis produit » et « Favoris » (CL-05, CL-06, CL-11).
// Produits, avis et favoris : routes de relaya (ProductSerializer, reviews, favorites), converties par
// src/api/adaptateurs.ts ; votes sur un avis, alertes d'un favori et ajout au panier depuis la fiche : routes du kit
// (backend-kit/apps/aftersales, client_accounts, cart).
import type { OffreRetenue } from '../../donnees/recommandation'
import type { AvisProduit, Favori } from '../../donnees/source'
import { repartition, versAvisProduit, versFavori, versProduit, type RAvis, type RFavori, type RPage, type RProduit } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurIntrouvable } from '../erreurs'
import { liste } from './session'
import { seg } from './refus'

async function ouNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof ErreurIntrouvable) return null
    throw e
  }
}

// Cartes du kit (client_core.catalogue) : l'offre retenue de chaque produit maître vers le relais du client
// (BV-DEV-02 : score R30, coût total livré, meilleur CTL R29), dans l'ordre du serveur.
interface CarteKit {
  id: string
  offre?: OffreRetenue | null
}
interface PageCartes {
  produits: CarteKit[]
  next_cursor: string | null
}
const PAGES_MAX = 50

// Avis du kit (aftersales) : résumé et avis paginés.
interface ResumeAvisKit {
  nombre: number
  moyenne: number | null
  repartition: Record<string, number>
}
interface AvisKit {
  id: string
  note: number
  titre: string
  texte: string
  auteur: string
  le: number | null
  variante: string | null
  photo: string | null
  utiles: number
  monVote: { utile: boolean; signale: boolean } | null
  reponseVendeur: string | null
}
function versAvisKit(a: AvisKit): AvisProduit {
  return {
    id: a.id,
    note: a.note,
    le: a.le ?? 0,
    variante: a.variante,
    texte: [a.titre, a.texte].filter(Boolean).join(' — '),
    photo: a.photo,
    utiles: a.utiles,
    monVote: !!a.monVote?.utile,
    signale: !!a.monVote?.signale,
    reponse: a.reponseVendeur,
    auteur: a.auteur ? { prenom: a.auteur, quartier: '' } : null,
  }
}

// Favori du kit (GET /api/me/favorites) : carte du produit, plus le favori, la disponibilité et les alertes.
interface FavoriKit {
  id: string
  titre: string
  prix: number
  prixFlash: number | null
  image: { url: string } | null
  favori: string
  disponible: boolean
  ajouteLe: number | null
  alertes: { prix: boolean; stock: boolean }
  prixAjout: number | null
  baisse: number | null
}
function versFavoriKit(f: FavoriKit): Favori {
  const prix = f.prixFlash ?? f.prix
  return {
    id: f.favori,
    p: f.id,
    titre: f.titre,
    variante: null,
    dessin: '',
    image: f.image ? { url: f.image.url, alt: f.titre } : null,
    prix,
    prixAvant: f.baisse && f.prixAjout ? f.prixAjout : null,
    retrait: prix, // prix livré au relais : non servi par la liste (le panier le calcule) ; le prix du jour en attendant
    stock: f.disponible ? 'ok' : 'rupture',
    alertes: f.alertes,
    ajouteLe: f.ajouteLe ?? 0,
  }
}

export function domaineCatalogue(api: ClientApi) {
  /** Toutes les pages d'une liste de cartes du kit (curseur), dans l'ordre servi. */
  const cartes = async (chemin: string, anonyme: boolean): Promise<CarteKit[]> => {
    const sortie: CarteKit[] = []
    let curseur: string | null = null
    for (let i = 0; i < PAGES_MAX; i++) {
      const page: PageCartes = await api.get<PageCartes>(chemin, { query: { limit: 50, ...(curseur ? { cursor: curseur } : {}) }, ...(anonyme ? { anonyme: true } : {}) })
      sortie.push(...page.produits)
      curseur = page.next_cursor
      if (!curseur) break
    }
    return sortie
  }
  const avisKit = async (p: string): Promise<AvisKit[]> => {
    const sortie: AvisKit[] = []
    let curseur: string | null = null
    for (let i = 0; i < PAGES_MAX; i++) {
      const page: { avis: AvisKit[]; next_cursor: string | null } = await api.get(`/products/${seg(p)}/reviews`, { query: curseur ? { cursor: curseur } : {} })
      sortie.push(...page.avis)
      curseur = page.next_cursor
      if (!curseur) break
    }
    return sortie
  }
  const favorisBruts = async () => liste(await api.get<RFavori[] | RPage<RFavori>>('/auth/favorites/'))

  return {
    // ——— Catalogue ———
    // Produits de relaya ; meilleure offre (offre retenue vers le relais du client) décidée par le kit :
    // GET /api/catalog/selection. Un produit hors de la sélection n'a pas d'offre retenue (offre: null : non
    // éligible, en contrôle, ou autre offre retenue du même produit maître). Sélection indisponible : ordre du
    // catalogue (offre absente), comme avant.
    produits: async () => {
      const [brut, selection] = await Promise.all([
        api.get<RProduit[] | RPage<RProduit>>('/catalog/products/', { query: { page_size: 100 } }),
        cartes('/catalog/selection', !api.jetons.lire()).catch(() => null),
      ])
      const ps = liste(brut).map(versProduit)
      if (!selection) return ps
      const retenues = new Map(selection.map((c) => [c.id, c.offre ?? null]))
      return ps.map((p) => (p.offre !== undefined ? p : { ...p, offre: retenues.get(p.p) ?? null }))
    },
    // « Pour vous » : ordre du serveur (GET /api/catalog/for-you : centres d'intérêt, produits vus si la
    // personnalisation est permise, puis le reste) ; visiteur : null (classement de l'écran).
    ordrePourVous: async (): Promise<string[] | null> => (api.jetons.lire() ? (await cartes('/catalog/for-you', false)).map((c) => c.id) : null),
    produit: async (p: string) => ouNull(api.get<RProduit>(`/catalog/products/${seg(p)}/`).then(versProduit)),
    // GET /api/products/{id}/reviews/summary (répartition 1 à 5) et GET /api/products/{id}/reviews (curseur : votes
    // « utile », mon vote, variante, photo) du kit ; 404 → null. Serveur sans ces routes : les avis de relaya.
    avisProduit: async (p: string) => {
      try {
        const [resume, avis] = await Promise.all([api.get<ResumeAvisKit>(`/products/${seg(p)}/reviews/summary`), avisKit(p)])
        return { repartition: [5, 4, 3, 2, 1].map((n) => resume.repartition[String(n)] ?? 0), avis: avis.map(versAvisKit) }
      } catch (e) {
        if (!(e instanceof ErreurIntrouvable)) throw e
        return ouNull(api.get<RAvis[]>(`/catalog/products/${seg(p)}/reviews/`).then((a) => ({ repartition: repartition(a), avis: a.map(versAvisProduit) })))
      }
    },
    // POST /api/reviews/{id}/vote {action: utile|signaler} → 204
    voterAvis: async (_p: string, id: string, action: 'utile' | 'signaler') => {
      await api.post(`/reviews/${seg(id)}/vote`, { action })
    },
    // POST /api/cart/lines {produit, options, qte, boutique?} → panier recalculé par le serveur (offre, frais)
    ajouterProduit: async (p: string, choix: Record<string, string>, qte: number, boutique?: string) => {
      await api.post('/cart/lines', { produit: p, options: choix ?? {}, qte, ...(boutique ? { boutique } : {}) })
    },

    // ——— Favoris ———
    // GET /api/me/favorites (kit, curseur suivi) : prix du jour (flash compris), disponibilité, alertes, baisse depuis
    // l'ajout ; serveur sans cette route : les favoris de relaya (/auth/favorites/).
    favoris: async () => {
      try {
        const sortie: FavoriKit[] = []
        let curseur: string | null = null
        for (let i = 0; i < PAGES_MAX; i++) {
          const page: { favoris: FavoriKit[]; maintenant: number; next_cursor: string | null } = await api.get('/me/favorites', { query: curseur ? { cursor: curseur } : {} })
          sortie.push(...page.favoris)
          curseur = page.next_cursor
          if (!curseur) break
        }
        return { favoris: sortie.map(versFavoriKit), verifieLe: Date.now() }
      } catch (e) {
        if (!(e instanceof ErreurIntrouvable)) throw e
        return { favoris: (await favorisBruts()).map(versFavori), verifieLe: Date.now() }
      }
    },
    basculerFavori: async (p: string) => {
      const f = (await favorisBruts()).find((x) => String(x.product.id) === p)
      if (f) {
        await api.supprimer(`/auth/favorites/${f.id}/`)
        return false
      }
      await api.post('/auth/favorites/', { product_id: Number(p) })
      return true
    },
    retirerFavori: async (id: string) => {
      await api.supprimer(`/auth/favorites/${seg(id)}/`)
    },
    remettreFavori: async (f: Favori) => {
      await api.post('/auth/favorites/', { product_id: Number(f.p) })
    },
    // PATCH /api/me/favorites/{id} {alertes: {prix?, stock?}} → 204
    reglerAlerteFavori: async (id: string, k: 'prix' | 'stock', actif: boolean) => {
      await api.patch(`/me/favorites/${seg(id)}`, { alertes: { [k]: actif } })
    },
    // POST /api/cart/lines {favori} : le favori passe au panier
    favoriAuPanier: async (id: string) => {
      await api.post('/cart/lines', { favori: id })
    },
  }
}
