// Domaine « qualite » (possédé par PR-09 Argent et performance ; gérant seul) : Trust Score du relais (TRU-01 à TRU-07,
// PR-RC-27 : cinq critères pondérés PR-TRUST-POIDS, somme pondérée arrondie = score, recalcul chaque nuit, baisse de
// PR-TS-VARIATION-NUIT points au plus, gel après 30 jours sans activité, dossier en cours jamais pénalisé, journal
// rejouable ; score JAMAIS montré au client, seul le badge « Relais confirmé » l'est : DP-42, ARL-14), alerte de seuil
// dans les deux sens (ARL-15, PR-TRUST-ALERTE), historique des événements et des décisions (sanction ou descente de
// palier proposée par le calcul, validée par une personne avec un motif écrit), contestation UNE fois (réponse sous
// PR-CONTESTATION-H), avis des clients (anonymes, ouverts AVIS-FENETRE jours après le retrait ; réponse privée dans la
// messagerie du client, DP-39 ; signalement), paliers (PAL-01 à PAL-06 ; ce qui vient après le lancement est masqué,
// ARL-16). Le relais voit, conteste, demande ; il ne décide pas.
import type { Instant, Origine, Resultat } from '../communs'

export type IdCritere = 'ponctualite' | 'stockage' | 'satisfaction' | 'litiges' | 'anciennete'
export type NomPalier = 'Starter' | 'Confirmé' | 'Premium'

export interface CritereTrust {
  id: IdCritere
  poids: number // en %, PR-TRUST-POIDS
  valeur: number // 0 à 100
}

/** Contestation d'un événement ou d'une décision : une seule, réponse motivée sous PR-CONTESTATION-H (TRU-07). */
export interface Contestation {
  le: Instant
  texte: string
  etat: 'en_examen' | 'acceptee' | 'rejetee'
  reponseAvant: Instant
  reponse: string | null
}

/** Événement du journal du Trust Score (recalcul de nuit, rejouable). */
export interface EvenementTrust {
  id: string
  le: Instant
  critere: IdCritere
  /** Effet en points sur le critère (négatif : baisse) ; 0 pour un dossier en cours (jamais pénalisé). */
  effet: number
  libelle: string
  /** Colis ou dossier concerné (référence BelivaY, jamais l'identité d'un client). */
  objet: string | null
  dossierEnCours: boolean
  /** Contestable jusqu'à cette heure (PR-CONTESTATION-FENETRE-J, A-VALIDER ARL-115) ; null : pas contestable. */
  contestableJusqua: Instant | null
  contestation: Contestation | null
}

/** Décision proposée par le calcul, validée (ou non) par une personne avec un motif écrit (TRU-06, TRU-07, PAL-02). */
export interface Decision {
  id: string
  type: 'sanction' | 'descente_palier'
  niveau: 1 | 2 | 3 | 4 | null // sanction : 1 avertissement, 2 visibilité réduite, 3 suspension, 4 exclusion
  etat: 'proposee' | 'validee' | 'annulee'
  motif: string
  le: Instant
  /** Validée par une personne de BelivaY (fonction, jamais un nom), à cette heure. */
  valideeLe: Instant | null
  contestableJusqua: Instant | null
  contestation: Contestation | null
}

export interface Trust {
  /** null : relais neuf, aucune remise mesurée (note neutre, VID-03). */
  score: number | null
  palier: NomPalier
  recalculeA: Instant
  /** Variation sur 7 jours (« +4 cette semaine »). */
  variationSemaine: number
  /** Jours consécutifs au-dessus du seuil du palier suivant (montée) ou du palier tenu, sur PR-PAL-TENUE-J. */
  tenue: { seuil: number; palierVise: NomPalier; jours: number; requis: number } | null
  criteres: CritereTrust[]
  /** Seuil proche (PR-TRUST-ALERTE points), dans les deux sens (ARL-15). */
  alerte: { seuil: number; sens: 'montee' | 'descente'; ecart: number } | null
  /** Score gelé (30 jours sans activité, ou suspension : sous PR-SAN-GEL-SEUIL). */
  gele: boolean
  evolution: { le: Instant; score: number }[]
  evenements: EvenementTrust[]
  decisions: Decision[]
}

export type MotifSignalement = 'insulte' | 'donnee_personnelle' | 'hors_sujet'
export interface Avis {
  id: string
  etoiles: number
  texte: string | null
  etiquettes: string[]
  le: Instant
  /** Réponse privée du gérant, partie dans la messagerie du client (DP-39), jamais publiée. */
  reponse: { texte: string; le: Instant } | null
  /** Signalé à BelivaY : examiné ; retiré seulement pour l'un des trois motifs, avec un motif tracé (AVI-04). */
  signalement: { motif: MotifSignalement; le: Instant; etat: 'en_examen' | 'retire' | 'maintenu' } | null
}

export interface Palier {
  nom: NomPalier
  seuil: number
  atteint: boolean
  actuel: boolean
}

export interface DomaineQualite {
  trust(): Promise<Trust>
  avis(): Promise<Avis[]>
  repondreAvis(id: string, texte: string, o: Origine): Promise<Resultat<object, 'introuvable' | 'deja_repondu' | 'texte_vide'>>
  signalerAvis(id: string, motif: MotifSignalement, o: Origine): Promise<Resultat<object, 'introuvable' | 'deja_signale'>>
  paliers(): Promise<Palier[]>
  /** Contester un événement du journal ou une décision : une seule fois, dans le délai. */
  contester(id: string, texte: string, o: Origine): Promise<Resultat<{ reponseAvant: Instant }, 'introuvable' | 'deja_contestee' | 'hors_delai' | 'non_contestable' | 'texte_vide'>>
}
