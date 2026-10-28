// Domaine « paliers » : Bronze, Argent, Or, Platine ; conditions du palier suivant (registre VD-PAL-*) avec ce qui
// manque, prochain geste (commandes à faire, projection du service Scores), montée en attente des 14 jours, descente
// proposée, ce que chaque palier fait garder sur l'article de référence de la boutique (calculé par le service de
// commission : src/calculs en démonstration). API : GET /tiers (VD10-R08) : l'écran ne calcule rien.
import type { Francs, Instant, Jour, Palier } from '../communs'

export interface Condition {
  cle: 'score' | 'livrees' | 'note' | 'visite' | 'audit'
  libelle: string // « Trust Score 65 au moins »
  valeur: string // ce que le vendeur a : « 63 », « 7 », « 4,0 »
  tenue: boolean
  manque: string | null // « + 2 », « + 3 » (null : tenue, ou geste d'un agent)
}

export interface LignePalier {
  palier: Palier
  conditions: string // « Trust Score 65, 10 commandes livrées, note 4,0 »
  garde: Francs | null // gardé sur l'article de référence à ce palier (null : accès Préparation)
  gardeExemple: Francs | null // gardé sur l'article cher de la boutique (iPhone) à ce palier
  gainSurActuel: Francs | null // en plus du palier actuel (0 pour l'actuel et ceux d'en dessous)
  liberationJours: number // argent libéré en … jours après la fermeture du retour (PAL-02)
  responsableDeCompte: boolean // Platine (PAL-03, DP-56 Q-47)
  vous: boolean
  manque: string | null // « Il vous manque 2 points et 3 commandes livrées » (palier suivant)
}

export interface MonPalier {
  palier: Palier
  score: number // valeur exacte (62,7)
  calculeA: Instant
  suivant: Palier | null
  seuilSuivant: number | null
  seuilActuel: number | null // seuil de descente du palier actuel (null pour Bronze)
  conditions: Condition[]
  commandesAFaire: number | null // next.orders_to_go (VD10-R03)
  projection: { commandes: number; scoreApres: number; litigesEnCours: number; siGagnes: number | null; siPerdus: number | null } | null
  montee: { date: Jour } | null // toutes les conditions tenues : « Argent le … si vous tenez ce niveau » (VD10-R04)
  descente: { decisionId: string; vers: Palier; motif: string; effetA: Instant; contestee: boolean; reponseAvant: Instant | null } | null
  alerte: { sens: 'montee' | 'descente'; seuil: number; points: number } | null // à 3 points d'un seuil (VD-ALERTE-SEUIL)
  reference: { titre: string; prix: Francs; actuel: Francs; suivant: Francs | null } | null // article de référence (« par ITEL ») ; null : accès Préparation
  exemple: { titre: string; prix: Francs; gain: Francs } | null // gain sur un article cher (iPhone)
  liberationJours: { actuel: number; suivant: number | null }
  supportHeures: number // première réponse du support, tous paliers (DP-56 Q-47)
  decouverte: { commandes: number; max: number; fin: Jour } | null
  lancement: { palier: Palier; jusqua: Jour; produitsActifs: number } | null // palier de lancement (ACC-15)
  montee14: number // jours de suite pour monter (VD-PAL-MONTEE)
  descente14: number // jours de suite sous le seuil pour une descente proposée (VD-PAL-DESCENTE, DP-21)
  remplacementMin: number // 75 : vendeur de remplacement (REMPL-TRUST-MIN)
  paliers: LignePalier[]
}

export interface DomainePaliers {
  monPalier(): Promise<MonPalier>
}
