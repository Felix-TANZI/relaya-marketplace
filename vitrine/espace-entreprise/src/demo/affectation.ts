// DONNÉES DE DÉMONSTRATION — domaine « affectation » (ENT-P12) : éligibilité d'un livreur pour un paquet accepté,
// calculée comme le serveur (ENT-AFF-01, ENT-02-R26) : actif et certifié, pas suspendu, disponible (aucune autre
// mission en cours ou affectée), rattaché à la zone, véhicule qui porte la plus grande classe ; kit incomplet signalé
// sans bloquer (O-09) ; suggestion : zone, charge, Trust Score puis distance (VAGUE n° 6, calculs/suggestion.ts) ; créneau du vendeur
// (ENT-P12R-03, pages/ENT-05/regles.ts). Affecter et réaffecter avant le premier code de remise (DED-28).
// Positions et kits des livreurs libres : données de démonstration (le GPS et le stock d'emballages en production).
// DP-67 : un livreur en préavis de départ reçoit des paquets jusqu'à la veille du dernier jour (raison « preavis » à
// partir de ce jour-là, src/calculs/depart.ts affectationPermise) ; une nouvelle photo pas validée dans le délai
// PHOTO-REVERIF-J l'écarte (raison « photo ») jusqu'à la validation.
import type { DomaineAffectation, Eligibilite, Eligible, RaisonNonEligible } from '../donnees/domaines/affectation'
import { MINUTE } from '../calculs/temps'
import { REGLES, creneau, plusGrande, porte } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { livreurCourt } from './jeu-essai'
import { exiger } from './acces'
import { livreursDemo, photoEnRetard } from './livreurs'
import { departsDemo } from './departs'
import { affectationPermise } from '../calculs/depart'
import { LIEUX, PONT, idLivreur, nomUtilisateur, paquetsDemo, type PaquetDemo } from './paquets'
import { positionDe } from './carte'
import { classer } from '../calculs/suggestion'
import { repondre } from './stockage'

// Dernière position connue d'un livreur sans mission (fin de sa dernière course) et son kit d'emballages du jour.
const LIBRES: Record<string, { lat: number; lng: number } | null> = { 'l-brice': { lat: 3.8765, lng: 11.4985 }, 'l-herve': null }
const KITS: Record<string, Record<string, number>> = { 'l-brice': { S: 6, M: 0, L: 2 }, 'l-hugo': { S: 8, M: 12, L: 6 }, 'l-junior': { S: 8, M: 10, L: 4 } }
const VITESSE_KMH = 18 // moto en ville (démonstration ; OSRM en production)
const DETOUR = 1.3

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = (x: number) => (x * Math.PI) / 180
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * DETOUR * 10) / 10
}
const ACTIFS = ['affecte', 'en_cours', 'incident']

/** Éligibilité calculée pour un paquet (lue aussi à l'acceptation : « aucun livreur disponible », RG-R93). */
export async function eligibilite(paquetId: string): Promise<Eligibilite> {
  const t = maintenant()
  const tous = paquetsDemo.lire().paquets
  const p = tous.find((x) => x.id === paquetId) as PaquetDemo | undefined
  const classes = p?.colis.map((x) => x.classe) ?? ['S' as const]
  const plus = plusGrande(classes)
  const besoin = new Map<string, number>()
  for (const c of classes) besoin.set(c === 'XL' || c === 'HG' ? 'C2' : c, (besoin.get(c) ?? 0) + 1)
  const premier = p ? LIEUX[p.arrets[0].lieu] : null
  const e: Eligibilite = {
    paquetId,
    statut: p?.statut === 'accepte' ? 'accepte' : p?.statut === 'affecte' ? 'affecte' : 'autre',
    plusGrandeClasse: plus,
    accepteLe: p?.accepteLe ?? null,
    affecterAvant: p?.accepteLe ? p.accepteLe + REGLES.nonAffecteMin * MINUTE : null,
    ramasse: !!p?.arrets.some((a) => a.sens === 'ramassage' && a.fait),
    suggere: null,
    eligibles: [],
    nonEligibles: [],
    affecte: p?.livreurId && p.affecteLe ? { ...livreurCourt(p.livreurId), affecteLe: p.affecteLe, creneau: p.creneau } : null,
  }
  for (const l of livreursDemo.lire().livreurs) {
    if (l.statut === 'retire' || (p && l.id === idLivreur(p, t))) continue
    const raisons: RaisonNonEligible[] = []
    if (l.statut === 'suspendu') raisons.push('suspendu')
    const depart = departsDemo.lire().departs.find((d) => d.livreurId === l.id && d.etat === 'demande')
    if (depart && !affectationPermise(depart.preavisJusqua, t)) raisons.push('preavis')
    if (photoEnRetard(l, t)) raisons.push('photo')
    if (l.statut === 'en_activation') raisons.push('activation')
    else if (!l.certifieJusqua || l.certifieJusqua < t) raisons.push('certification')
    if (p && !l.zones.includes(p.zone)) raisons.push('zone')
    if (!porte(l.vehicule, plus)) raisons.push('vehicule')
    // Une mission à la fois : écarté s'il est en mission, sauf pour un paquet d'un seul colis de la zone de sa tournée,
    // qu'il fera après elle (heure limite à plus d'une heure : l'application du livreur l'enchaîne dans l'ordre des
    // heures limites, LIV-PAQ) ; à valider (CAHIER-CONNECTIVITE.md, étape 3).
    const missions = tous.filter((q) => q.id !== paquetId && idLivreur(q, t) === l.id && ACTIFS.includes(q.statut))
    const enchainable = !!p && p.colis.length === 1 && missions.every((q) => q.zone === p.zone) && p.heureLimite - t > 60 * MINUTE
    if (missions.length && !enchainable) raisons.push('en_mission')
    if (raisons.length) {
      e.nonEligibles.push({ id: l.id, nom: l.nom, initiales: l.initiales, raisons })
      continue
    }
    const ici = positionDe(l.id, t) ?? LIBRES[l.id] ?? null
    const d = ici && premier ? km(ici, premier) : null
    const kit = KITS[l.id] ?? {}
    const manque = [...besoin].filter(([f, n]) => (kit[f] ?? 0) < n).map(([format, n]) => ({ format, nombre: n - (kit[format] ?? 0) }))
    const el: Eligible = { ...livreurCourt(l.id), trustScore: l.trustScore, distanceKm: d, trajetMin: d === null ? null : Math.max(3, Math.round((d / VITESSE_KMH) * 60)), kitManque: manque, zones: l.zones, missionsDuJour: l.missionsDuJour, certifieJusqua: l.certifieJusqua }
    e.eligibles.push(el)
  }
  // Une distance inconnue n'est jamais classée avant une distance connue (ENT-P12R-02).
  e.eligibles.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
  // Suggestion (VAGUE n° 6) : l'éligible qui équilibre le mieux zone, charge du jour, Trust Score et distance.
  const s = classer(e.eligibles, p?.zone ?? '')[0] ?? null
  e.suggere = s?.id ?? null
  e.suggestion = s
  return e
}

export const demoAffectation: DomaineAffectation = {
  async eligibles(paquetId) {
    exiger(['proprietaire', 'repartiteur'], 'Affecter un livreur')
    return repondre(await eligibilite(paquetId))
  },
  async affecter(paquetId, livreurId) {
    exiger(['proprietaire', 'repartiteur'], 'Affecter un livreur')
    const t = maintenant()
    const p = paquetsDemo.lire().paquets.find((x) => x.id === paquetId)
    if (!p || !['accepte', 'affecte'].includes(p.statut)) return repondre({ ok: false as const, raison: 'conflit' as const })
    if (p.arrets.some((a) => a.sens === 'ramassage' && a.fait)) return repondre({ ok: false as const, raison: 'deja_ramasse' as const })
    const el = (await eligibilite(paquetId)).eligibles.find((x) => x.id === livreurId)
    if (!el) return repondre({ ok: false as const, raison: 'non_eligible' as const })
    const c = creneau(t, el.trajetMin)
    const par = nomUtilisateur()
    const avant = p.livreurId
    const apres = paquetsDemo.ecrire((s) => {
      const q = s.paquets.find((x) => x.id === paquetId)!
      const re = q.statut === 'affecte'
      Object.assign(q, { statut: 'affecte', livreurId, affecteLe: t, creneau: c })
      q.journal.push({ le: t, quoi: re ? 'reaffecte' : 'affecte', par })
    })
    // Serge A. (le livreur de démonstration) reçoit le paquet dans son application, ou le perd s'il est réaffecté.
    PONT.affectation?.(apres.paquets.find((x) => x.id === paquetId)!, avant, t)
    return repondre({ ok: true as const, creneau: c })
  },
}
