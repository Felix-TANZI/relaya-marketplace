// Règles de calcul des paquets, de l'affectation, des missions et des preuves (ENT-05, ENT-06), lues dans le registre
// (registre officiel par src/calculs/registre.ts : aucune valeur dans le code). Fonctions pures, partagées
// par la démonstration (le « serveur ») et les écrans (affichage). À déplacer dans src/calculs/ à la vague
// d'intégration (INTEGRATION.md) ; un moteur porté de moteurs/belivay_moteurs prendra la même place.
import type { ClasseColis } from '../../donnees/communs'
import { PARAMETRES, REGISTRE, entier, nombre } from '../registre'
import { ParametreAbsent, ParametreIllisible } from '../erreurs'
import { HEURE, MINUTE } from '../temps'

const brut = (code: string): string => {
  const p = REGISTRE[code]
  if (!p) throw new ParametreAbsent(code)
  return p.valeur
}
const n = (s: string) => Number(s.replace(/[\s  ]/g, ''))

/** Montants d'une valeur écrite « 600 / 450 / 350 » ou « 360 (S, M) · 540 (L) » : le nombre en tête de chaque part. */
export function montants(code: string, attendus: number): number[] {
  const parts = brut(code)
    .split(/[/·;]/)
    .map((x) => /^\s*(\d[\d\s  ]*)/.exec(x)?.[1])
  if (parts.length < attendus || parts.slice(0, attendus).some((x) => !x)) throw new ParametreIllisible(`${code} : « ${brut(code)} » (${attendus} montants attendus)`)
  return parts.slice(0, attendus).map((x) => n(x!))
}
/** Supplément écrit « course + 300 ». */
const supplement = (code: string): number => {
  const m = /\+\s*(\d[\d\s]*)/.exec(brut(code))
  if (!m) throw new ParametreIllisible(`${code} : « ${brut(code)} »`)
  return n(m[1])
}

const D = PARAMETRES.delais

export const REGLES = {
  // Délais (ENT-P09 à P16)
  acceptationMin: D.acceptationMin,
  prioriteMin: D.fenetrePrioriteMin,
  ramassageMin: D.ramassageMin,
  livraisonH: D.livraisonH,
  nonAffecteMin: D.alerteNonAffecteMin,
  departMin: D.alerteDepartMin,
  incidentMin: D.decisionIncidentMin,
  gardeH: D.gardeAlerteH,
  depotAvantFermetureMin: entier(REGISTRE, 'ENT-DEPOT-AVANT-FERMETURE', /^minutes/),
  heuresService: brut('ENT-HEURES-SERVICE'),
  tourneesJour: entier(REGISTRE, 'ENT-TOURNEES-JOUR', /^tournées/),
  seuilDepart: PARAMETRES.pilote.seuilDepart,
  objectifTournee: PARAMETRES.pilote.objectifTournee,
  preavisGrilleJ: entier(REGISTRE, 'ENT-PREAVIS-GRILLE', /^jours/),
  anneauRougeMin: nombre(REGISTRE, 'seuil_anneau_rouge', /^(\d+) min/),
  margeAmbreMin: entier(REGISTRE, 'seuil_marge_ambre', /^min/),
  margeAlerteMin: entier(REGISTRE, 'seuil_alerte_marge', /^min/),
  positionS: nombre(REGISTRE, 'frequence_position_mission', /(\d+) s\b/),
  horsConnexionH: entier(REGISTRE, 'ENT-HORS-CONNEXION', /^heures/),
  partageSosMin: entier(REGISTRE, 'duree_partage_position_sos', /^min/),
  preparationMin: entier(REGISTRE, 'preparation_avant_depart_creneau', /^min/),
  largeurCreneauH: entier(REGISTRE, 'largeur_creneau_vendeur', /^h/),
  rendus: (() => {
    const m = /^>\s*(\d+) sur (\d+) jours.*⇒\s*(\d+) jours/.exec(brut('ENT-RENDUS-SEUIL'))
    if (!m) throw new ParametreIllisible('ENT-RENDUS-SEUIL')
    return { max: Number(m[1]), surJours: Number(m[2]), perteJours: Number(m[3]) }
  })(),
  // Colis et preuves (ENT-P15, ENT-P16)
  introuvableH: entier(REGISTRE, 'ENT-INTROUVABLE', /^heures/),
  controleSoirH: nombre(REGISTRE, 'controle_colis_chez_livreur', /^(\d+) h/),
  pointStockage: brut('point_stockage_nuit'),
  historiqueRemisJ: entier(REGISTRE, 'historique_remis', /^jours/),
  preuveRevueH: entier(REGISTRE, 'ENT-PREUVE-REVUE', /^heures/),
  preuveExpireH: entier(REGISTRE, 'ENT-PREUVE-EXPIRE', /^heures/),
  conservationPreuvesJ: entier(REGISTRE, 'ENT-CONSERV-PREUVES', /^jours/),
  codeEssais: entier(REGISTRE, 'ENT-CODE-ESSAIS', /^essais/),
  codeBlocageH: entier(REGISTRE, 'ENT-CODE-BLOCAGE', /^heures/),
  motifRefusMin: PARAMETRES.litiges.motifRefusIncidentMin,
  // Argent (ENT-P09, ENT-P11) : grille de l'entreprise (offre Yafé), plafonds d'achat par classe, suppléments
  tournee: montants('ENT-YAFE-TOURNEE', 3), // 1-4, 5-9, 10 et plus (par colis)
  domicile: montants('ENT-YAFE-DOMICILE', 2), // entre Z2, Z3, Z6 ; depuis ou vers Z1
  horsZone: nombre(REGISTRE, 'ENT-YAFE-HORS-ZONE', /^(\d+)$/),
  c2: nombre(REGISTRE, 'ENT-YAFE-C2', /^(\d+)$/),
  plafonds: {
    S: nombre(REGISTRE, 'PLAFOND-RELAIS-S', /^(\d+)$/),
    M: nombre(REGISTRE, 'PLAFOND-RELAIS-M', /^(\d+)$/),
    L: nombre(REGISTRE, 'PLAFOND-RELAIS-L', /^(\d+)$/),
    domicile: nombre(REGISTRE, 'PLAFOND-DOMICILE-S', /^([\d\s  ]+)$/),
    retour: nombre(REGISTRE, 'PLAFOND-RETOUR', /^(\d+)$/),
    transfert: montants('PLAFOND-TRANSFERT', 2), // S et M ; L
  },
  clientAbsent: supplement('ENT-SUPPL-CLIENT-ABSENT'),
  refusConforme: supplement('ENT-SUPPL-REFUS-CONFORME'),
  deplacement: entier(REGISTRE, 'ENT-SUPPL-DEPLACEMENT', /^F CFA/),
  minorationPct: nombre(REGISTRE, 'ENT-MINORATION-RETARD', /^(\d+) % de moins\b/),
}

export const ORDRE_CLASSES: ClasseColis[] = ['S', 'M', 'L', 'XL', 'HG']
/** Plus grande classe d'une liste de colis. */
export const plusGrande = (cs: ClasseColis[]): ClasseColis => cs.reduce((a, c) => (ORDRE_CLASSES.indexOf(c) > ORDRE_CLASSES.indexOf(a) ? c : a), 'S' as ClasseColis)
/** Classe la plus grande que porte un véhicule (classes_par_type_vehicule : moto S–L ; tricycle, voiture XL ; camionnette HG). */
export const PORTEE: Record<string, ClasseColis> = { velo: 'S', moto: 'L', tricycle: 'XL', voiture: 'XL', camionnette: 'HG' }
export const porte = (vehicule: string, classe: ClasseColis) => ORDRE_CLASSES.indexOf(PORTEE[vehicule] ?? 'S') >= ORDRE_CLASSES.indexOf(classe)

/** Plafond d'achat d'un colis déposé au relais selon sa classe (XL et hors gabarit ne vont jamais au relais). */
export const plafondRelais = (c: ClasseColis): number | null => (c === 'S' || c === 'M' || c === 'L' ? REGLES.plafonds[c] : null)

/** Tarif par colis d'une tournée relais selon le nombre de colis (tranches 1-4, 5-9, 10 et plus). */
export const trancheTournee = (nb: number): number => (nb >= 10 ? REGLES.tournee[2] : nb >= 5 ? REGLES.tournee[1] : REGLES.tournee[0])

/**
 * Créneau annoncé au vendeur (ENT-P12R-03) : affectation + trajet + préparation, arrondi à la demi-heure supérieure,
 * largeur du registre. Sans trajet connu : pas de créneau (calculé à la première position).
 */
export function creneau(affecteLe: number, trajetMin: number | null): { debut: number; fin: number } | null {
  if (trajetMin === null) return null
  const brutDebut = affecteLe + (trajetMin + REGLES.preparationMin) * MINUTE
  const demi = 30 * MINUTE
  const debut = Math.ceil(brutDebut / demi) * demi
  return { debut, fin: debut + REGLES.largeurCreneauH * HEURE }
}

/** Marge restante (ENT-02-R56) : heure limite − heure estimée d'arrivée, en minutes. */
export const marge = (heureLimite: number, eta: number) => Math.round((heureLimite - eta) / MINUTE)
/** Ton d'une marge : rouge sous le seuil d'alerte (ou négative), ambre sous le seuil ambre. */
export const tonMarge = (m: number | null): 'ok' | 'ambre' | 'rouge' => (m === null ? 'ok' : m < REGLES.margeAlerteMin ? 'rouge' : m < REGLES.margeAmbreMin ? 'ambre' : 'ok')
