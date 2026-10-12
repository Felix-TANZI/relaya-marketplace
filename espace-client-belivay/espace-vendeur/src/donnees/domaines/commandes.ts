// Domaine « commandes » : commandes reçues (À préparer / En cours / Terminées / Problèmes), une commande, son
// journal signé. Une commande n'entre que payée ou validée pour paiement au retrait (E3, VD05-R01). API : GET
// /orders?state= → {counts, total, items} (VD05-R05, CMD-02), GET /orders/{id}, GET /orders/{id}/journal (VD-02 p12).
// ANONYMAT (CMD-06, BOU-02) : ni client, ni quartier, ni relais, ni mode de livraison, ni total payé, ni autres vendeurs.
// RÔLE (DP-55, ARG-07) : l'accès Préparation reçoit les mêmes commandes sans aucun montant (prix, gardé, gelé : null).
import type { ArticleVendu, ClasseColis, Francs, Instant, Livreur, ReferenceCommande, Role } from '../communs'
import type { CalendrierBoutique } from './preparation'

/** Table unique des libellés (VD05-R03, VD02-C01…C08) ; « prete » : « C'est prêt » touché, livreur attendu. */
export type StatutCommande = 'payee' | 'payable_au_retrait' | 'a_preparer' | 'prete' | 'chez_le_livreur' | 'livree' | 'litige_gele' | 'retour_gele' | 'annulee'
export type EtatArgent = 'en_cours' | 'se_libere' | 'gele' | 'a_verser' | 'verse' | 'repris'
export type FiltreCommandes = 'prep' | 'cours' | 'fin' | 'pb'
/** Q-73 : quatre causes d'annulation affichées. */
export type MotifAnnulation = 'client_avant_ramassage' | 'rupture' | 'litige_perdu' | 'belivay'

export interface LigneCommande {
  article: ArticleVendu
  quantite: number
  prixUnitaire: Francs | null // prix de vente ; null pour l'accès Préparation
  reference: string // référence de la variante (SKU), imprimée sur la boîte : « ITL-AC52-NR »
  aMettreDeCote: string[] // accessoires livrés avec l'article : « chargeur », « câble », « boîte d'origine »
}

export interface Commande {
  ref: ReferenceCommande
  statut: StatutCommande
  payableAuRetrait: boolean // payée au comptoir du relais au retrait (« Vous garderez », CMD-05)
  payeeA: Instant // payée ou validée
  debut: Instant // début du délai : paiement, ou ouverture suivante si payée boutique fermée (E10, VD11-R13)
  echeance: Instant | null // prête avant (à préparer)
  echeanceAbsolue: Instant | null // début + 24 heures d'ouverture (E4, DP-56 Q-38)
  prolongee: boolean // « Plus de temps » déjà demandé (une seule fois, DEL-01)
  calendrier: CalendrierBoutique // horaires de la boutique : comptes à rebours en heures d'ouverture (REFVD-R134)
  lignes: LigneCommande[]
  colis: ClasseColis
  garde: Francs | null // montant gardé, figé au paiement (VD02-M10, CMD-03) ; null pour l'accès Préparation et un remplacement
  /** Commission minimale par sous-commande appliquée (VD-COM-MIN) : son montant ; sinon null. Explique qu'à prix
   *  égal, une commande d'une unité garde moins par unité qu'une commande de plusieurs. */
  commissionMinimale?: Francs | null
  remplacementDe: ReferenceCommande | null // sous-commande de remplacement d'un retour (REFCL-R080)
  liberationJours: number // « Libéré 3 jours après la confirmation du client » (palier, moyen de paiement)
  argent: { etat: EtatArgent; liberation: Instant | null; vendredi: string | null; versement: string | null } | null // vendredi du versement (« AAAA-MM-JJ »), référence BLV-VS-… ; null : accès Préparation
  livreur: (Livreur & { photo: string }) | null // livreur du créneau (PRE-03), dès qu'il est attribué
  ramassage: { debut: Instant; fin: Instant } | null // créneau de passage du livreur chez le vendeur
  preteA: Instant | null
  remiseA: Instant | null
  retireeA: Instant | null // « Livrée » = retirée par le client (VD02-C05)
  confirmeeParLeClient: boolean // « Tout est en ordre » avant la fin de la fenêtre de retour
  annulation: { motif: MotifAnnulation; a: Instant } | null
  probleme:
    | { type: 'litige'; echeance: Instant; motif: string; repondu: boolean }
    | { type: 'retour'; motif: string; arrivee: { jour: string; creneau: [string, string] }; inspectionHeures: number }
    | null
  gele: Francs | null // montant gelé (litige, retour), sans date (CMD-09) ; null pour l'accès Préparation
  moyenPaiement: 'momo' | 'carte' | 'apple' | 'google' | 'wallet' | 'usd' | 'eur' | 'comptoir'
}

/** Détail de la phrase d'état (CMD-02) : la somme fait toujours le total. */
export interface CompteursDetail {
  prep: number
  cours: number
  litiges: number
  retours: number
  terminees: number
  annulees: number
}

export interface VueCommandes {
  compteurs: Record<FiltreCommandes, number>
  detail: CompteursDetail
  total: number
  items: Commande[]
  maintenant: Instant // heure du serveur à la lecture
}

export interface EntreeJournal {
  a: Instant
  auteur: string // « Aïcha N. », « Système BelivaY »
  role: Role | 'systeme'
  action: string
  detail?: string // « prête avant {h} », « Encaissée par BelivaY · Mobile Money » ({h} : heure de detailA)
  detailA?: Instant
  avant?: string | Instant // changement de valeur : avant → après (VD05-R15) ; un nombre est une heure
  apres?: string | Instant
}

export interface DomaineCommandes {
  /** Liste d'un filtre et compteurs de la même requête (CMD-02 : jamais un chiffre faux). */
  vue(filtre: FiltreCommandes): Promise<VueCommandes>
  liste(filtre: FiltreCommandes): Promise<Commande[]>
  compteurs(): Promise<Record<FiltreCommandes, number>>
  detail(ref: ReferenceCommande): Promise<Commande | null>
  /** Journal en ajout seul (JRN-02), du plus récent au plus ancien. */
  journal(ref: ReferenceCommande): Promise<EntreeJournal[]>
}
