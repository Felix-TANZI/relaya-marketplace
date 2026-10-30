// Domaine « plans » (croissance du vendeur) : Free, Boost, Pro, Sur-mesure (registre VD-PLAN-*), essai d'un mois
// offert, paiement à l'année, grâce de 7 jours (DP-57 : A-2, A-3, VD-PLAN-ESSAI, -ANNUEL, -GRACE), simulateur sur les
// ventes du mois (src/calculs/commission.ts : simulerPlans), récompenses au mérite (DP-14, Q-32, P-3 : aucune
// visibilité payante), services qui lèvent les freins, chiffres de la boutique et demande de la zone.
// API : GET /plans, /plans/simulate, POST /plans/subscribe, GET /rewards, POST /rewards/{id}/use, POST /flash-sales,
// GET /services, POST /services/request, GET /stats?period=30d, GET /demand (VD-02 p12, REFVD-R274).
// Tout paiement (plan, service) est une demande Mobile Money confirmée sur le téléphone du vendeur (PLN-04) : rien
// n'est activé ni pris avant la confirmation. ANONYMAT (CHF-02) : la demande donne des mots cherchés, jamais un client.
import type { Francs, Instant, Jour, Palier, Plan, Resultat } from '../communs'

export type Facturation = 'mensuelle' | 'annuelle' | 'essai'

export interface OffrePlan {
  plan: Plan
  prixMensuel: Francs
  prixAnnuel: Francs | null // 10 mois payés pour 12 (VD-PLAN-ANNUEL) ; null pour Free
  remisePourCent: number
  actuel: boolean
  inclus: string[] // ce que le plan contient, en mots (VD10-R33, sans visibilité payante : DP-14)
  essaiPossible: boolean // un essai par plan
}

export interface EtatPlan {
  plan: Plan
  facturation: Facturation | null // null pour Free
  depuis: Jour | null
  finEssai: Jour | null
  rappelLe: Jour | null // 3 jours avant la fin de l'essai (PLN-06)
  finPeriode: Jour | null // fin de l'essai ou de la période payée
  prochainPaiement: { jour: Jour; montant: Francs } | null
  paiementEchoue: { le: Jour; graceJusqua: Jour } | null // VD-PLAN-GRACE
  arretDemande: boolean // « Arrêter » : retour à Free à la fin de la période, sans frais
  numero: { operateur: string; masque: string } // numéro de versement : les paiements partent de là
  decouverte: { commandes: number; max: number; fin: Jour; active: boolean; gain: { titre: string; prix: Francs; gain: Francs } } // gain en francs par vente de l'article de référence (Q-03)
  surMesureDes: Francs // Sur-mesure dès … de ventes par mois
}

export interface Simulation {
  facturation: 'mensuelle' | 'annuelle' // à l'année : remise plafonnée au prix annuel ÷ 12 (A-3)
  ventes: Francs
  unites: number // ventes de l'article de référence
  base: { categorie: string; palier: Palier; titre: string; prix: Francs }
  gardes: Record<Plan, Francs>
  meilleur: Plan
  rembourse: Record<'Boost' | 'Pro', boolean> // ce qu'il fait garder en plus atteint son prix
  seuils: Record<'Boost' | 'Pro', Francs | null> // ventes à partir desquelles le plan est remboursé
  reperes: { ventes: Francs; gardes: Record<Plan, Francs>; meilleur: Plan }[]
  ventesDuMois: Francs // ventes libérées du mois (même base que Mes gains, Q-83)
  pas: Francs // le curseur avance d'une vente de l'article de référence
  max: Francs
}

/** Demande de paiement Mobile Money envoyée sur le téléphone (CamPay, DP-03). */
export interface DemandePaiement {
  id: string
  montant: Francs
  objet: string // « Boost · un mois », « Photos par un agent »
  envoyeeA: Instant
  statut: 'en_attente' | 'confirme' | 'refuse'
}

export interface Recompense {
  id: string
  type: 'vitrine' | 'flash'
  titre: string // « Vitrine de quartier · 7 jours »
  offreId: string
  offreTitre: string
  jours: number | null // durée (vitrine) ; null : vente flash (créneau choisi par BelivaY)
  disponible: boolean // pas encore utilisée ce mois
  enCoursJusqua: Instant | null
  venteFlash: { remisePourCent: number; etat: 'programmee' | 'en_verification' } | null
}

export interface Visibilite {
  merite: { gagne: boolean; raison: string; offreTitre: string; joursDeSuite: number; joursRequis: number }
  recompenses: Recompense[]
  bloque: 'score_trop_bas' | 'rupture' | null // VIS-02 : sous 50 ou sans stock, aucune visibilité
  scoreMin: number // 50
  stockOffre: number
  flash: { ouvert: boolean; remiseMin: number; relueAuDela: number; dureeMaxHeures: number } // FF-FLASH, FLASH-*
}

export interface Service {
  id: 'agent_photos' | 'fiche_prioritaire' | 'saisie_assistee'
  titre: string
  prix: Francs
  unite: string // « les 10 produits », « la fiche », « la session »
  gratuit: boolean // saisie assistée offerte aux premières boutiques de la zone
  frein: string | null // le frein relevé qui l'amène en tête
  route: string | null // écran où il est proposé (fiche → Demander une fiche ; saisie → Saisie assistée)
  demande: { id: string; statut: 'en_attente' | 'confirme' | 'refuse' | 'visite_prevue' | 'rembourse'; visiteAvant: Instant | null } | null
}

export interface Services {
  zone: string
  numero: { operateur: string; masque: string }
  delaiVisiteHeures: number // 72 h ouvrées ; au-delà, remboursement automatique (P-4)
  liste: Service[] // le service du frein le plus fort en tête (VD10-R44)
}

export interface Stats {
  jours: number // 30
  ventes: Francs // ventes payées, 30 jours
  commandes: number
  encaissees: number
  panierMoyen: Francs
  retoursPourCent: number
  vues: number
  conversionPourCent: number
  parJour: { jour: number; ventes: Francs }[] // lundi = 0 … dimanche = 6
  parProduit: { offreId: string; titre: string; ventes: Francs; partPourCent: number }[]
  meilleursJours: number[] // jours qui portent les ventes du produit principal
  dependance: { titre: string; partPourCent: number } | null // un produit fait plus de 60 % des ventes
  historiqueVerrouille: boolean // 3 et 12 mois avec Boost
}

export interface Recherche {
  mots: string
  fois: number
  verrouillee: boolean // Free montre les 3 premières, Boost toutes
}

export interface Frein {
  type: 'photo' | 'attribution' | 'avis'
  titre: string
  texte: string
  solution: string
  route: string // écran de la solution
}

export interface Demande {
  zone: string
  recherches: Recherche[] // la plus cherchée d'abord
  visiblesSansBoost: number // 3
  freins: Frein[]
}

export interface DomainePlans {
  plans(): Promise<OffrePlan[]>
  etat(): Promise<EtatPlan>
  /** GET /plans/simulate?sales= : ce que le vendeur garderait avec chaque plan (ventes du mois si absent). */
  simuler(ventesDuMois?: Francs, facturation?: 'mensuelle' | 'annuelle'): Promise<Simulation>
  /** POST /plans/subscribe {trial:true} : le plan s'active tout de suite, 0 F aujourd'hui (VD10-R30). */
  essayer(plan: Exclude<Plan, 'Free'>): Promise<Resultat<{ finEssai: Jour; rappelLe: Jour }, 'deja_essaye' | 'deja_actif'>>
  /** POST /plans/subscribe : demande de paiement sur le téléphone ; le plan s'active à la confirmation. */
  souscrire(plan: Exclude<Plan, 'Free'>, facturation: 'mensuelle' | 'annuelle'): Promise<Resultat<{ demande: DemandePaiement }, 'deja_actif'>>
  /** Lit la demande de paiement (payment.confirmed) ; confirmée, elle active ce qu'elle paie. */
  paiement(id: string): Promise<DemandePaiement | null>
  annulerPaiement(id: string): Promise<void>
  /** Arrêter le plan (ou l'essai) : retour à Free à la fin de la période, sans frais ; reprendre l'annule. */
  arreter(arret: boolean): Promise<EtatPlan>
  visibilite(): Promise<Visibilite>
  /** Une récompense au mérite : vitrine de quartier (s'active tout de suite, sans paiement). */
  utiliserRecompense(id: string): Promise<Resultat<{ jusqua: Instant }, 'deja_utilisee' | 'score_trop_bas' | 'rupture'>>
  /** Vente flash offerte : remise réelle de 10 % au moins ; au-delà de 50 %, relue sous 24 h (OFR-05, P-3). */
  programmerVenteFlash(id: string, remisePourCent: number): Promise<Resultat<{ etat: 'programmee' | 'en_verification' }, 'remise_trop_basse' | 'remise_trop_haute' | 'deja_utilisee' | 'ferme' | 'score_trop_bas' | 'rupture'>>
  services(): Promise<Services>
  /** POST /services/request : demande de paiement ; la demande part vers l'agent de la zone à la confirmation. */
  demanderService(service: Service['id']): Promise<Resultat<{ demande: DemandePaiement }, 'deja_demande' | 'gratuit_ailleurs'>>
  stats(): Promise<Stats>
  demande(): Promise<Demande>
}
