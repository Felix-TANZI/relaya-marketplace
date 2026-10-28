// Frais de livraison des écrans qui comptent encore « par expédition » (listes, cotisations, troc, réseau, fiche,
// diaspora, démonstration), alignés sur les règles BV-DEV v2.0 (DP-69 ; src/calculs, comme
// moteurs/belivay_moteurs/v20) : une seule course par commande, dont la boutique de base porte le prix de base, le
// km et sa part ; chaque autre boutique, son supplément (500 F dans la zone de la destination, 1 000 F sinon) ;
// chaque colis, son format (C1 +500 F, C2 ou carton d'origine +700 F) ; livraison offerte sur le sous-total du
// panier entier (relais 900 F dès 30 000 F ; domicile jusqu'à 1 500 F dès 50 000 F), portée par la boutique de base.
// Le panier et le paiement (CL-07, CL-08) passent par donnees/achat.ts ; le serveur recalcule au paiement (CAL-11).
// La destination est le quartier du relais ou de l'adresse ; sans elle, le relais de la démonstration (Mvog-Ada).

import { centre, kmEntre } from './geo'
import { couvertureMax, estRefus, fraisLivraison, fraisMobileMoney, lieuOuDefaut, prixNiveau, reglage, seuilOffert, type BoutiqueFrais, type Format } from '../calculs'

export type Classe = 'S' | 'M' | 'L' | 'XL' | 'HG'
export type ModeLivraison = 'relais' | 'domicile'

// Réglages de l'admin (BV-DEV-07), sous les noms qu'emploient les écrans.
export const PARAMETRES = {
  relaisPrix: reglage('relais'),
  seuilRelais: seuilOffert('relais'),
  seuilDomicile: seuilOffert('domicile'),
  couvertureDomicile: couvertureMax('domicile'),
  domicileMin: prixNiveau('centre'),
}
const DESTINATION_DEMO = 'Mvog-Ada'

// Format du colis, en attendant la fiche maître (R62 à R64) : S → pochette, M → C1, L → C2.
const FORMAT: Record<Classe, Format> = { S: 'P', M: 'C1', L: 'C2', XL: 'XL', HG: 'HG' }
const RANG: Classe[] = ['S', 'M', 'L', 'XL', 'HG']

export interface SousCommandeFrais {
  boutique: string
  zone: string // quartier de la boutique
  articles: { prix: number; quantite: number; classe: Classe }[]
  /** Distance routière boutique → client (km), pour la livraison à domicile ; absente : 0. */
  km?: number | null
}

export interface ExpeditionFrais {
  boutique: string
  classe: Classe
  sousTotal: number
  course: number // part de la boutique dans la course (base, km et format pour la boutique de base)
  couverture: number // payé par BelivaY (sur la boutique de base)
  client: number
  refus: string | null // « colis XL » au relais, « hors gabarit » (sur devis)
}

export interface Frais {
  sousTotal: number
  expeditions: ExpeditionFrais[]
  ramassages: { boutique: string; montant: number; partage: boolean }[]
  remises: { boutique: string; montant: number }[] // v2.0 : aucune (une seule ligne par boutique)
  offert: number
  total: number
  seuil: number // sur le panier entier (R07)
  manque: number // ce qu'il manque au panier pour la livraison offerte
  progression: number
  interditRelais: string[]
}

/** La plus grande classe des articles de la boutique (un colis par boutique, R64 à venir). */
export const classeColis = (sc: SousCommandeFrais): Classe => sc.articles.reduce<Classe>((m, a) => (RANG.indexOf(a.classe) > RANG.indexOf(m) ? a.classe : m), 'S')

/** Prix d'une course seule (fiche, meilleure offre) : niveau centre + 250 F par km au-delà de 5 km + format. */
export function course(km: number, classe: Classe): number {
  const f = fraisLivraison('domicile', { zone: '', niveau: 'centre' }, [{ zone: '', niveau: 'centre', colis: [FORMAT[classe] === 'HG' ? 'XL' : FORMAT[classe]], km: Math.round(km), detour: 0 }], [0], { apresPaiement: true })
  return estRefus(f) ? 0 : f.brut
}
/** Distance retenue (R83) : la route ; à défaut, le vol d'oiseau × 1,3. */
export const distanceRoute = (route: number | null, volOiseau: number | null): number | null => route ?? (volOiseau === null ? null : Math.round(volOiseau * reglage('vol_oiseau') * 10) / 10)

/** Distance boutique → client (km) d'après les quartiers ; null si l'un est inconnu. */
export const kmDomicile = (quartierBoutique: string | null, quartierClient: string | null): number | null =>
  quartierBoutique && quartierClient ? distanceRoute(null, kmEntre(centre(quartierBoutique), centre(quartierClient))) : null

export function calculer(mode: ModeLivraison, sousCommandes: SousCommandeFrais[], destination: string | null = DESTINATION_DEMO): Frais {
  const st = sousCommandes.map((sc) => sc.articles.reduce((u, a) => u + a.prix * a.quantite, 0))
  const s = st.reduce((a, b) => a + b, 0)
  const classes = sousCommandes.map(classeColis)
  const dest = lieuOuDefaut(destination)
  const bf: BoutiqueFrais[] = sousCommandes.map((sc, i) => {
    const l = lieuOuDefaut(sc.zone)
    return { zone: l.zone, niveau: l.niveau, colis: [FORMAT[classes[i]]], km: mode === 'domicile' ? Math.round(sc.km ?? 0) : 0, detour: 0 }
  })
  const seuil = seuilOffert(mode)
  const vide = (refus: string | null): Frais => ({
    sousTotal: s,
    expeditions: sousCommandes.map((sc, i) => ({ boutique: sc.boutique, classe: classes[i], sousTotal: st[i], course: 0, couverture: 0, client: 0, refus })),
    ramassages: [],
    remises: [],
    offert: 0,
    total: s,
    seuil,
    manque: Math.max(0, seuil - s),
    progression: Math.min(99, Math.floor((s / seuil) * 100)),
    interditRelais: refus ? sousCommandes.filter((_, i) => ['XL', 'HG'].includes(classes[i])).map((sc) => sc.boutique) : [],
  })
  if (!sousCommandes.length) return vide(null)
  // Écrans hors du panier : le minimum (R84) se contrôle au panier et au paiement, pas ici.
  const f = fraisLivraison(mode, dest, bf, st, { apresPaiement: true })
  if (estRefus(f)) return vide(f.refus === 'xl-relais' ? 'colis XL' : 'hors gabarit')
  // Part de chaque boutique : la base porte base + km ; chacune, son format et son supplément de boutique.
  const sup = (c: Classe) => ({ C1: reglage('sup_c1'), C2: reglage('sup_c2'), CO: reglage('sup_c2') })[FORMAT[c] as 'C1' | 'C2' | 'CO'] ?? 0
  const parts = sousCommandes.map((_, i) => {
    if (i === f.i_base) return f.base + f.km + sup(classes[i])
    const autre = bf[i].zone !== dest.zone
    const detour = autre && mode === 'domicile' ? reglage('prix_km') * Math.max(0, bf[i].detour - reglage('detour_inclus')) : 0
    return sup(classes[i]) + (autre ? reglage('boutique_autre_zone') + detour : reglage('boutique_meme_zone'))
  })
  const expeditions = sousCommandes.map((sc, i) => {
    const couverture = i === f.i_base ? Math.min(f.couverture, parts[i]) : 0
    return { boutique: sc.boutique, classe: classes[i], sousTotal: st[i], course: parts[i], couverture, client: parts[i] - couverture, refus: null }
  })
  // La couverture dépasse la part de la base (base + km + format < 900 F n'arrive pas ; garde-fou) : reportée.
  let reste = f.couverture - expeditions.reduce((t, e) => t + e.couverture, 0)
  for (const e of expeditions)
    if (reste > 0 && e.client > 0) {
      const p = Math.min(reste, e.client)
      e.couverture += p
      e.client -= p
      reste -= p
    }
  return {
    sousTotal: s,
    expeditions,
    ramassages: expeditions.map((e) => ({ boutique: e.boutique, montant: e.course, partage: false })),
    remises: [],
    offert: f.couverture,
    total: s + f.client,
    seuil,
    manque: f.couverture > 0 ? 0 : Math.max(0, seuil - s),
    progression: f.couverture > 0 ? 100 : Math.min(99, Math.floor((s / seuil) * 100)),
    interditRelais: [],
  }
}

// Frais de paiement (R02) : Mobile Money ⌈base ÷ 0,98⌉ − base ; Wallet : aucun ; carte (après le lancement) : 2 %.
export type FamillePaiement = 'mobile' | 'carte' | 'wallet'
export const fraisPaiement = (famille: FamillePaiement, montant: number) => (famille === 'wallet' ? 0 : famille === 'carte' ? Math.ceil(montant * 0.02) : fraisMobileMoney(montant))
export const libelleFraisPaiement = (famille: FamillePaiement) => (famille === 'mobile' ? 'Frais de paiement' : 'Frais de service carte (2 %)')
