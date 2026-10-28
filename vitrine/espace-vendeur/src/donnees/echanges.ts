// Échanges de l'espace vendeur avec les autres interfaces (client, livreur, relais, administration) : les événements
// qui ARRIVENT au vendeur et ceux qu'il ENVOIE, avec leurs champs et la route qui les porte. Préparation de la
// vague API (espace-vendeur/INTERFACES.md en est la version écrite ; démonstration : src/demo/echanges.ts).
// Règles de fond :
// - ANONYMAT (GEN-01, BOU-02) : aucun événement ne porte l'identité, le numéro, l'adresse, le quartier, le point de
//   retrait ni le total payé du client ; le client ne reçoit jamais le nom, les lieux ni le téléphone de la boutique ;
// - un événement entrant arrive par le flux GET /api/vendors/events?depuis= (puis SSE /events/stream), et devient une
//   notification, un badge ou une ligne de journal ; chaque événement a un identifiant (rejouable sans doublon) ;
// - un événement sortant est un geste du vendeur, déjà servi par une méthode de la SourceVendeur (colonne `methode`) ;
//   le serveur le relaie aux autres interfaces ;
// - un employé n'émet que ce que ses droits permettent (src/donnees/droits.ts) ; aucun montant ne lui parvient.
import type { Francs, Instant, ReferenceCommande } from './communs'
import type { Droit } from './droits'

export type Interface = 'client' | 'livreur' | 'relais' | 'administration'

interface Base {
  id: string // identifiant de l'événement (idempotence)
  a: Instant
}

// ── Entrants : ce que les autres interfaces envoient au vendeur ──────────────────────────────────────────────────

export type EvenementEntrant = Base &
  (
    | { de: 'client'; type: 'commande_payee'; ref: ReferenceCommande; lignes: { offreId: string; quantite: number }[]; echeance: Instant; payableAuRetrait: boolean }
    | { de: 'client'; type: 'commande_annulee'; ref: ReferenceCommande; avantRamassage: boolean }
    | { de: 'client'; type: 'question'; questionId: string; offreId: string; texte: string } // filtrée (coordonnées retirées)
    | { de: 'client'; type: 'message'; fil: string; ref: ReferenceCommande | null; texte: string }
    | { de: 'client'; type: 'avis'; avisId: string; ref: ReferenceCommande; note: number; commentaire: string | null }
    | { de: 'client'; type: 'litige_ouvert'; ref: ReferenceCommande; motif: 'jamais_recu' | 'abime' | 'pas_conforme' | 'manquant' | 'autre'; photos: number; reponseAvant: Instant }
    | { de: 'client'; type: 'remplacement_choisi'; ref: ReferenceCommande; accepte: boolean }
    | { de: 'livreur'; type: 'creneau'; ref: ReferenceCommande | null; debut: Instant; fin: Instant; livreur: { nom: string; societe: string } }
    | { de: 'livreur'; type: 'en_route'; ref: ReferenceCommande; arriveeVers: Instant }
    | { de: 'livreur'; type: 'code_saisi'; ref: ReferenceCommande; bon: boolean; essaisRestants: number }
    | { de: 'livreur'; type: 'remise_faite'; ref: ReferenceCommande; photos: number; scelle: boolean }
    | { de: 'livreur'; type: 'absent'; ref: ReferenceCommande; prochainCreneau: { debut: Instant; fin: Instant } }
    | { de: 'relais'; type: 'colis_arrive'; ref: ReferenceCommande } // au point de retrait du client (jamais lequel)
    | { de: 'relais'; type: 'colis_retire'; ref: ReferenceCommande; liberationLe: Instant }
    | { de: 'relais'; type: 'colis_non_retire'; ref: ReferenceCommande; retourVers: Instant }
    | { de: 'relais'; type: 'retour_depose'; ref: ReferenceCommande; motif: string; inspecterAvant: Instant | null }
    | { de: 'administration'; type: 'demande_decidee'; demandeId: string; decision: 'acceptee' | 'refusee'; motif: string }
    | { de: 'administration'; type: 'kyc'; etat: 'accepte' | 'pieces_a_refaire' | 'refuse'; motif: string | null }
    | { de: 'administration'; type: 'lieu_verifie'; lieuId: string; verifie: boolean; motif: string | null }
    | { de: 'administration'; type: 'fiche_decidee'; offreId: string; decision: 'en_ligne' | 'refusee'; motif: string | null }
    | { de: 'administration'; type: 'litige_decide'; ref: ReferenceCommande; issue: 'client' | 'vendeur' | 'partage'; motif: string; contesterAvant: Instant }
    | { de: 'administration'; type: 'sanction'; decisionId: string; niveau: 1 | 2 | 3 | 4; motif: string; contesterAvant: Instant | null }
    | { de: 'administration'; type: 'versement'; payoutId: string; montant: Francs | null; le: Instant } // montant : null pour un employé
  )

// ── Sortants : ce que le vendeur envoie ──────────────────────────────────────────────────────────────────────────

export type EvenementSortant = Base &
  (
    | { vers: ('client' | 'livreur')[]; type: 'prete'; ref: ReferenceCommande; at: Instant }
    | { vers: ('client' | 'administration')[]; type: 'rupture'; ref: ReferenceCommande; stockAZero: boolean }
    | { vers: ('client' | 'livreur')[]; type: 'delai'; ref: ReferenceCommande; nouvelleEcheance: Instant }
    | { vers: 'livreur'[]; type: 'colis_non_pret'; ref: ReferenceCommande; raison: 'en_cours' | 'rupture' | 'boutique_fermee'; prochainCreneau: boolean }
    | { vers: 'livreur'[]; type: 'code_affiche' | 'nouveau_code'; ref: ReferenceCommande }
    | { vers: 'client'[]; type: 'message'; fil: string; texte: string }
    | { vers: 'client'[]; type: 'reponse_question'; questionId: string; texte: string }
    | { vers: 'administration'[]; type: 'reponse_avis'; avisId: string; texte: string } // privée, passe par le support
    | { vers: ('client' | 'administration')[]; type: 'reponse_litige'; ref: ReferenceCommande; posture: 'accepte' | 'conteste' | 'arrangement' }
    | { vers: 'administration'[]; type: 'preuve_litige'; ref: ReferenceCommande; pieces: number }
    | { vers: ('client' | 'administration')[]; type: 'inspection_retour'; ref: ReferenceCommande; verdict: 'conforme' | 'non_conforme' }
    | { vers: 'client'[]; type: 'remplacement_propose'; ref: ReferenceCommande }
    | { vers: 'administration'[]; type: 'demande_modification'; demandeId: string; champ: string }
    | { vers: 'administration'[]; type: 'lieu'; lieuId: string; action: 'ajoute' | 'deplace' | 'principal' | 'retire' }
    | { vers: 'administration'[]; type: 'kyc_pieces'; etape: 'pieces' | 'contrat' }
    | { vers: 'administration'[]; type: 'contestation'; decisionId: string }
    | { vers: 'administration'[]; type: 'fermeture'; jusqua: Instant | null } // « Fermer aujourd'hui », pause : l'attribution évite la boutique
  )

export type TypeEntrant = EvenementEntrant['type']
export type TypeSortant = EvenementSortant['type']

/** Pour chaque événement : l'interface en face, la route, l'écran du vendeur et le droit d'un employé. */
export interface Canal {
  avec: Interface
  route: string
  methode: string | null // méthode de la SourceVendeur qui le sert (sortants) ou le lit (entrants)
  ecran: string // route de l'espace vendeur
  droit: Droit | null // null : propriétaire seulement
}

export const CANAUX_ENTRANTS: Record<TypeEntrant, Canal> = {
  commande_payee: { avec: 'client', route: 'GET /events → order.paid', methode: 'commandes.vue', ecran: 'commande?ref=', droit: 'commandes.voir' },
  commande_annulee: { avec: 'client', route: 'GET /events → order.cancelled', methode: 'commandes.detail', ecran: 'commande?ref=', droit: 'commandes.voir' },
  question: { avec: 'client', route: 'GET /events → question.asked', methode: 'questions.liste (AJ-A)', ecran: 'questions', droit: 'messages.repondre' },
  message: { avec: 'client', route: 'GET /events → thread.message', methode: 'messages.fil', ecran: 'messages?fil=', droit: 'messages.voir' },
  avis: { avec: 'client', route: 'GET /events → review.posted', methode: 'boutique.avis', ecran: 'avis', droit: null },
  litige_ouvert: { avec: 'client', route: 'GET /events → dispute.opened', methode: 'litiges.detail', ecran: 'litige?ref=', droit: 'litiges.voir' },
  remplacement_choisi: { avec: 'client', route: 'GET /events → replacement.answered', methode: 'retours.detail', ecran: 'remplacement?ref=', droit: 'retours.inspecter' },
  creneau: { avec: 'livreur', route: 'GET /events → pickup.slot', methode: 'remise.aRemettre', ecran: 'ramassages', droit: 'commandes.remettre' },
  en_route: { avec: 'livreur', route: 'GET /events → pickup.en_route', methode: 'remise.remise', ecran: 'commande_remise?ref=', droit: 'commandes.remettre' },
  code_saisi: { avec: 'livreur', route: 'GET /events → handover.code_entered', methode: 'remise.remise', ecran: 'commande_remise?ref=', droit: 'commandes.remettre' },
  remise_faite: { avec: 'livreur', route: 'GET /events → handover.done', methode: 'remise.remise', ecran: 'commande?ref=', droit: 'commandes.voir' },
  absent: { avec: 'livreur', route: 'GET /events → pickup.missed', methode: 'remise.remise', ecran: 'commande?ref=', droit: 'commandes.remettre' },
  colis_arrive: { avec: 'relais', route: 'GET /events → parcel.at_pickup_point', methode: 'commandes.detail', ecran: 'commande?ref=', droit: 'commandes.voir' },
  colis_retire: { avec: 'relais', route: 'GET /events → parcel.collected', methode: 'commandes.detail', ecran: 'commande?ref=', droit: 'commandes.voir' },
  colis_non_retire: { avec: 'relais', route: 'GET /events → parcel.not_collected', methode: 'commandes.detail', ecran: 'commande?ref=', droit: 'commandes.voir' },
  retour_depose: { avec: 'relais', route: 'GET /events → return.dropped', methode: 'retours.detail', ecran: 'inspection?ref=', droit: 'retours.inspecter' },
  demande_decidee: { avec: 'administration', route: 'GET /events → change_request.decided', methode: 'boutique.demandes', ecran: 'boutique', droit: null },
  kyc: { avec: 'administration', route: 'GET /events → kyc.decided', methode: 'session.ouverture', ecran: 'kyc', droit: null },
  lieu_verifie: { avec: 'administration', route: 'GET /events → location.verified', methode: 'boutique.lieux', ecran: 'emplacement?lieu=', droit: null },
  fiche_decidee: { avec: 'administration', route: 'GET /events → offer.reviewed', methode: 'produits.detail', ecran: 'offre_detail?id=', droit: 'produits.voir' },
  litige_decide: { avec: 'administration', route: 'GET /events → dispute.decided', methode: 'litiges.detail', ecran: 'litige_envoye?ref=', droit: 'litiges.voir' },
  sanction: { avec: 'administration', route: 'GET /events → sanction.applied', methode: 'trust.decisions', ecran: 'sanctions', droit: null },
  versement: { avec: 'administration', route: 'GET /events → payout.sent', methode: 'versements.historique', ecran: 'versements', droit: null },
}

export const CANAUX_SORTANTS: Record<TypeSortant, Canal> = {
  prete: { avec: 'livreur', route: 'POST /orders/{id}/ready {at}', methode: 'preparation.cestPret', ecran: 'commande_prete?ref=', droit: 'commandes.preparer' },
  rupture: { avec: 'client', route: 'POST /orders/{id}/out-of-stock', methode: 'preparation.signalerRupture', ecran: 'rupture?ref=', droit: 'commandes.preparer' },
  delai: { avec: 'client', route: 'POST /orders/{id}/extend', methode: 'preparation.demanderDelai', ecran: 'delai?ref=', droit: 'commandes.preparer' },
  colis_non_pret: { avec: 'livreur', route: 'POST /orders/{id}/not-ready {raison}', methode: null, ecran: 'commande_remise?ref=', droit: 'commandes.remettre' },
  code_affiche: { avec: 'livreur', route: 'GET /orders/{id}/handover-code', methode: 'remise.afficherCode', ecran: 'commande_remise?ref=', droit: 'commandes.remettre' },
  nouveau_code: { avec: 'livreur', route: 'POST /orders/{id}/handover-code/renew', methode: 'remise.nouveauCode', ecran: 'commande_remise?ref=', droit: 'commandes.remettre' },
  message: { avec: 'client', route: 'POST /threads/{id}/messages', methode: 'messages.envoyer', ecran: 'messages?fil=', droit: 'messages.repondre' },
  reponse_question: { avec: 'client', route: 'POST /questions/{id}/answer', methode: 'questions.repondre (AJ-A)', ecran: 'questions', droit: 'messages.repondre' },
  reponse_avis: { avec: 'administration', route: 'POST /reviews/{id}/private-reply', methode: 'boutique.repondreAvis', ecran: 'avis', droit: null },
  reponse_litige: { avec: 'administration', route: 'POST /disputes/{id}/answer', methode: 'litiges.repondre', ecran: 'litige?ref=', droit: null },
  preuve_litige: { avec: 'administration', route: 'POST /disputes/{id}/evidence', methode: 'litiges.ajouterPreuve', ecran: 'litige?ref=', droit: 'litiges.preuves' },
  inspection_retour: { avec: 'administration', route: 'POST /returns/{id}/inspection', methode: 'retours.inspecter', ecran: 'inspection?ref=', droit: 'retours.inspecter' },
  remplacement_propose: { avec: 'client', route: 'POST /returns/{id}/replacement', methode: 'retours.proposer', ecran: 'remplacement?ref=', droit: null },
  demande_modification: { avec: 'administration', route: 'POST /shop/change-requests', methode: 'boutique.demanderModification', ecran: 'boutique', droit: null },
  lieu: { avec: 'administration', route: 'POST · PATCH · DELETE /shop/locations…', methode: 'boutique.ajouterLieu', ecran: 'emplacement', droit: null },
  kyc_pieces: { avec: 'administration', route: 'POST /shops/{id}/kyc', methode: 'session.envoyerPourVerification', ecran: 'kyc', droit: null },
  contestation: { avec: 'administration', route: 'POST /account/decisions/{id}/appeal', methode: 'trust.contester', ecran: 'contester?d=', droit: null },
  fermeture: { avec: 'administration', route: 'POST /shop/closed-today · POST /shop/pause', methode: 'boutique.fermerAujourdhui', ecran: 'horaires', droit: 'boutique.fermer' },
}
