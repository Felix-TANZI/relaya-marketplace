// DONNÉES DE DÉMONSTRATION — les objets d'un paquet affecté par l'entreprise depuis une commande du client (pont commun,
// src/demo/pont.ts ; logique-metier/CAHIER-CONNECTIVITE.md, étape 4) : position et repère de chaque arrêt, classe et
// fragilité de chaque colis, fiche de l'article (pour le contrôle C1), code de remise du vendeur. Le serveur les
// servirait avec le paquet ; la démonstration les garde à part (le jeu d'essai du livreur a les siens, écrits en dur).
// Lu par la tournée (lieux), les paquets (colis), le ramassage (fiche, code) et le dépôt au relais (lot).
import type { ClasseColis } from '../donnees/communs'
import type { ArticleFiche } from '../donnees/domaines/ramassage'
import { codeDemo, evenementsDe, type ArretPont } from './pont'
import { magasin } from './stockage'

export interface LieuPont {
  lat: number
  lng: number
  repere: string | null
  type: ArretPont['type']
  paquetId: string
}
export interface ColisPont {
  classe: ClasseColis
  fragile: boolean
  paquetId: string
}

export const objetsPont = magasin('objets_pont', () => ({
  lieux: {} as Record<string, LieuPont>,
  colis: {} as Record<string, ColisPont>,
}))

/** Garde les objets d'un paquet reçu par « affectation » (une fois, à la réception). */
export function garderObjets(paquetId: string, arrets: ArretPont[]) {
  objetsPont.ecrire((s) => {
    for (const a of arrets) {
      if (a.position) s.lieux[a.id] = { lat: a.position.lat, lng: a.position.lng, repere: a.repere ?? null, type: a.type, paquetId }
      for (const c of a.colis) s.colis[c.id] ??= { classe: c.classe === 'HG' ? 'XL' : c.classe, fragile: c.fragile, paquetId }
    }
  })
}

export const estArretPont = (arretId: string) => arretId in objetsPont.lire().lieux
export const colisPont = (colisId: string): ColisPont | null => objetsPont.lire().colis[colisId] ?? null
/** Le lot déposé au relais par un arrêt d'un paquet venu du pont : le numéro du paquet. */
export const lotPont = (arretId: string): string | null => {
  const l = objetsPont.lire().lieux[arretId]
  return l && l.type === 'relais' ? l.paquetId : null
}
/** L'arrêt de dépôt du lot d'un paquet venu du pont (le lot porte le numéro du paquet). */
export const arretDuLotPont = (lot: string): string | null => Object.entries(objetsPont.lire().lieux).find(([, l]) => l.type === 'relais' && l.paquetId === lot)?.[0] ?? null
/** Code de remise que le vendeur lit pour ce colis (recalculé comme le « serveur », jamais publié). */
export const codeRemisePont = (colisId: string) => codeDemo(colisId, 'remise')

const CATEGORIES: Record<string, ArticleFiche['categorie']> = { TEL: 'electronique', ACC: 'electronique', INF: 'electronique', AUD: 'electronique', GEM: 'maison', PEM: 'maison', MAI: 'maison', MOD: 'mode', CHA: 'mode', SAC: 'mode', PAG: 'mode', BEA: 'beaute', SAN: 'beaute' }
/** Fiche de l'article d'un colis (contrôle C1) : celle de la commande payée, telle que le serveur la sert au livreur. */
export function ficheDuColis(colisId: string): ArticleFiche {
  for (const e of evenementsDe('client')) {
    if (e.type !== 'order.paid') continue
    const c = e.colis.find((x) => x.colis === colisId)
    const l = c?.lignes[0]
    if (l) return { nom: l.titre, variante: l.variante ?? '—', etat: 'Neuf', quantite: l.qte, accessoires: null, serie: false, categorie: CATEGORIES[l.categorie ?? ''] ?? 'autre' }
  }
  return { nom: 'Article', variante: '—', etat: 'Neuf', quantite: 1, accessoires: null, serie: false, categorie: 'autre' }
}
