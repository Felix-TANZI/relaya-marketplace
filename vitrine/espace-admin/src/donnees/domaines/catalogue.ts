// Domaine « catalogue » (ADM-07 ; tenu par S3) : fiches maîtres et demandes de création, appariements IA et taxonomie
// (ADM-P13), modération des offres et des prix (ADM-P14), avis et droit de réponse (ADM-P15). Règles :
// src/pages/ADM-06/calculs/regles.ts. La console modifie le maître, jamais le prix ni le stock d'une offre ; elle
// suggère un prix, ne l'impose jamais ; l'IA propose, un humain valide ; un avis n'est retiré que par le médiateur.
import type { Instant, Resultat } from '../communs'
import type { Controle, DecisionPrise, RaisonRefus } from './acteurs'
import type { MotifSignalement } from '../../pages/ADM-06/calculs/regles'

export interface MaitreProche {
  fiche: string // « FM-00871 »
  titre: string
  detail: string
  similarite: number
  justification: string
}
export interface DemandeCreation {
  id: string // « DC-0041 »
  produit: string
  categorie: string
  vendeur: string
  vendeurId: string
  zone: string
  prix: number
  stock: number
  recueLe: Instant
  echeance: Instant
  prioritaire: boolean
  recherches: { requete: string; resultats: string; le: Instant }[]
  proches: MaitreProche[]
  interdit: string | null // raison si produit interdit (CAT-INTERDITS)
  photos: string[]
  poids: number
  dimensions: [number, number, number]
  classe: string
  etat: 'a_traiter' | 'rattachee' | 'creee' | 'refusee'
  conflit: boolean
  decision: DecisionPrise | null
}
export interface DemandeFiche {
  action: 'rattacher' | 'creer' | 'refuser'
  fiche?: string
  motif: string
  signaler?: boolean
  lien?: boolean
}

export interface FicheCourte {
  id: string
  titre: string
  categorie: string
  offres: string
  avis: string
  creee: string
}
export interface Appariement {
  id: string // « AP-0007 »
  similarite: number
  gardee: FicheCourte
  double: FicheCourte
  justification: Controle[]
  avant: [string, string, string][] // élément, avant, après
  etat: 'propose' | 'fusionne' | 'distincts' | 'separe' | 'annule'
  proposeLe: Instant
  fusionLe: Instant | null
  reversibleJusqua: Instant | null
  decision: DecisionPrise | null
}

export type EtatOffreMaitre = 'attribuee' | 'suivante' | 'moderation' | 'sanction'
export interface FicheMaitre {
  id: string // « FM-00412 »
  titre: string
  categorie: string
  classe: string
  poids: number
  dimensions: [number, number, number]
  attributs: [string, string][]
  note: number | null
  nbAvis: number
  repartition: number[] // 5 → 1 étoiles
  offres: { vendeur: string; prix: number; stock: number; zone: string; trust: number; coutLivre: number | null; etat: EtatOffreMaitre }[]
  publieeLe: Instant
  fusion: { de: string; reversibleJusqua: Instant } | null
  photos: number
}
export interface Categorie {
  nom: string
  fiches: number
  sous: { nom: string; fiches: number; filtres: string }[]
}

export type MotifModeration = 'ecart' | 'prix_barre' | 'prix_bas' | 'interdit' | 'photo' | 'signalement'
export interface OffreAModerer {
  id: string // « OF-7781 »
  titre: string
  vendeur: string
  vendeurId: string
  zone: string
  fiche: string
  prix: number
  prixBarre: number | null
  offresMaitre: number[] // prix des offres actives du maître
  historique: number[] // prix de l'offre, 30 jours
  prixPratiques: number[] // prix pratiqués sur le maître, fenêtre VD-CONSEIL-PRIX
  motif: MotifModeration
  detail: string
  signaleeLe: Instant
  etat: 'a_moderer' | 'depubliee' | 'acceptee' | 'correction'
  commandesEnCours: number
  recours: { texte: string; le: Instant } | null
  decision: DecisionPrise | null
  suggestion: number | null // prix conseillé envoyé au vendeur
  conflit: boolean
}
export interface DemandeModeration {
  action: 'valider' | 'correction' | 'depublier' | 'retirer_barre' | 'recours_maintenir' | 'recours_accepter'
  motif: string
  suggestion: boolean
}

export interface Avis {
  id: string // « AV-0311 »
  fiche: string
  ficheId: string
  client: string // masqué
  note: number
  texte: string
  passage: string | null // partie illicite, remplacée au masquage
  commande: string
  recuLe: Instant
  le: Instant
  photos: { legende: string; floutee: boolean }[]
  vendeur: string
  vendeurId: string
  signalement: { motif: MotifSignalement; par: string; le: Instant; texte: string } | null
  etat: 'signale' | 'publie' | 'masque' | 'retire'
  verifs: Controle[]
  reponse: { texte: string; le: Instant } | null
  finReponse: Instant
  conflit: boolean
  decision: DecisionPrise | null
}
export interface DemandeAvis {
  action: 'refuser' | 'masquer' | 'retirer'
  raison?: 'illicite' | 'faux' | 'sans_lien'
  motif: string
}

export interface DomaineCatalogue {
  demandes(): Promise<DemandeCreation[]>
  deciderDemande(id: string, d: DemandeFiche): Promise<Resultat<{ etat: DemandeCreation['etat'] }, RaisonRefus>>
  appariements(): Promise<Appariement[]>
  deciderAppariement(id: string, action: 'fusionner' | 'distincts' | 'separer' | 'annuler', motif: string): Promise<Resultat<{ etat: Appariement['etat'] }, RaisonRefus | 'delai_depasse'>>
  fiches(): Promise<FicheMaitre[]>
  /** Modifie le maître (titre normalisé), jamais le prix ni le stock d'une offre. */
  modifierFiche(id: string, titre: string, motif: string): Promise<Resultat<object, RaisonRefus>>
  taxonomie(): Promise<Categorie[]>
  creerSousCategorie(parent: string, nom: string): Promise<Resultat<object, 'doublon' | 'vide' | 'lecture_seule'> & { existe?: string }>
  aModerer(): Promise<OffreAModerer[]>
  deciderOffre(id: string, d: DemandeModeration): Promise<Resultat<{ etat: OffreAModerer['etat'] }, RaisonRefus | 'barre_valide'>>
  avis(): Promise<Avis[]>
  deciderAvis(id: string, d: DemandeAvis): Promise<Resultat<{ etat: Avis['etat'] }, RaisonRefus | 'masquage_impossible' | 'role'>>
}
