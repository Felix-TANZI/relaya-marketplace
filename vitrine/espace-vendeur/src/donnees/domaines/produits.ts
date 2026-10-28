// Domaine « produits » : mes offres (en vente, en vérification, en pause, refusées, brouillons), stock, alertes (stock
// bas, vendeur moins cher, litiges), ce que chaque produit a rapporté ce mois. API : GET /offers, PUT /offers/{id},
// POST /offers/{id}/duplicate, DELETE /offers/{id} (brouillon), GET /offers/export, POST /offers/import (VD-02 p12).
// Une offre = une fiche BelivaY (titre, description, photos de référence) + une variante du vendeur, avec SON stock,
// SON prix et SES photos réelles (Q-35 : stock et prix par variante ; OFR-01 : seule l'offre est au vendeur).
// Montants (prix, gardé) : null pour l'accès Préparation (403 owner_only du serveur). Aucune donnée du client.
import type { ClasseColis, Francs, Instant, Resultat } from '../communs'

export type EtatOffre = 'en_vente' | 'en_verification' | 'en_pause' | 'refusee' | 'brouillon'
/** Sujets d'attention d'une carte (PRD-05) : chacun a sa bande et, s'il y a quelque chose à faire, son action. */
export type Attention = 'stock_bas' | 'concurrent_moins_cher' | 'litiges'

/** Photo réelle de l'article vendu (PHO-01 à PHO-03) : allégée sur le téléphone, heure et lieu de la prise gardés. */
export interface PhotoReelle {
  id: string
  image: string // adresse ou data: ; un nom d'illustration dans la démonstration (remplaçable)
  prise: Instant // heure de la prise, pas de l'envoi
  lieu: string | null // lieu de la prise, en mots (quartier), quand l'appareil l'a donné
  largeur: number // px de la photo envoyée
  hauteur: number
  octetsAvant: number | null // poids d'origine, pour « allégées avant l'envoi (6,3 Mo → 540 Ko) »
  octetsApres: number | null
}

/** Ligne de l'historique d'une offre : texte français à traduire (tf) et ses valeurs. */
export interface Evenement {
  a: Instant
  quoi: string
  valeurs?: Record<string, string | number>
}

/** Ce qui manque à un brouillon pour être publié (DP-58 : une seule page « Nouveau produit »). */
export type Manque = 'produit' | 'photos' | 'prix' | 'stock' | 'etat'

export interface Produit {
  id: string
  ficheId: string | null // null : brouillon qui attend sa fiche (demande envoyée à BelivaY)
  titre: string
  marque: string
  variante: string
  categorie: string // famille du barème (« Électronique »)
  rayon: string // catégorie affichée (« Téléphones & accessoires »)
  dessin: string // illustration de la fiche (photo de référence), remplaçable
  etat: EtatOffre
  etatArticle: string // un des six états (PRX-05)
  prix: Francs | null // null : accès Préparation, ou brouillon sans prix
  garde: Francs | null // par vente, au palier et à l'offre du jour
  stock: number
  seuilAlerte: number
  delaiPreparationH: number // heures ouvrées ; au-delà de 24 : jours (sur commande, 7 jours au plus)
  colis: ClasseColis
  poidsKg: number | null
  dimensionsCm: [number, number, number] | null
  paiementAuRetrait: boolean
  madeInCameroon: boolean
  prixAuto: boolean
  plancherPrive: Francs | null // « Ne jamais descendre sous » (prix automatique)
  photos: PhotoReelle[]
  envoyeeA: Instant | null
  verificationAvant: Instant | null
  verifieeA: Instant | null
  motifRefus: string | null
  ficheDemandee: { reponseAvant: Instant; prioritaire: boolean } | null
  descriptionProposee: { texte: string; envoyeeA: Instant; reponseAvant: Instant } | null // Q-34
  dupliqueDe: string | null // variante d'origine (« noir »)
  ventesCeMois: number
  gardeCeMois: Francs | null // ventes du mois non gelées (PRD-04)
  litigesCeMois: number
  geleCeMois: Francs | null
  attention: Attention[]
  concurrent: { prix: Francs; conseille: Francs } | null // un vendeur est passé moins cher
  /** Dans ou hors de la course pour recevoir des commandes (BV-DEV-02 ; R29, R31 à R33), calculé par le moteur de la
   *  meilleure offre. motif : pourquoi hors course ; baisse : de combien baisser pour y revenir (motif « prix »).
   *  null : offre pas en vente, ou accès Préparation. */
  course?: { dans: boolean; motif: 'prix' | 'controle' | 'stock' | 'trust' | 'fermee' | null; baisse: Francs | null; offres: number } | null
  prixConseille?: Francs | null // R34 : jamais plus haut que le prix ; null : offre pas en vente, ou accès Préparation
  meilleurPrix?: boolean // R34 : badge « Meilleur prix », l'offre la moins chère du produit
  manques: Manque[] // brouillon : ce qui reste à remplir (vide : prêt à publier)
  /** Prix barré (avant promotion) et fin de la promotion (OFR-05 : 10 % de remise au moins, prix réellement pratiqué,
   *  vérifié par BelivaY ; le client voit un vrai compte à rebours). null : pas de promotion, ou accès Préparation. */
  prixBarre: Francs | null
  finPromo: Instant | null
  noteVendeur: string // visible par l'acheteur sur l'offre (sans coordonnées, GEN-01)
  /** Produit nouveau, absent du catalogue (DP-58) : description proposée par le vendeur, relue par BelivaY (Q-34), et
   *  vérification prioritaire. null : offre sur une fiche du catalogue. */
  nouveau: { description: string; prioritaire: boolean } | null
  historique: Evenement[]
  majA: Instant
}

export type Compteurs = Record<EtatOffre, number> & { total: number }

export interface ListeProduits {
  compteurs: Compteurs
  produits: Produit[] // triés par le serveur : ce qui demande attention d'abord (PRD-02, Q-90)
  luA: Instant
}

export interface VarianteDeFiche {
  variante: string
  offreId: string | null
  etat: EtatOffre | null
}

export interface DomaineProduits {
  liste(): Promise<ListeProduits>
  detail(id: string): Promise<Produit | null>
  /** Stock rapide (accès Préparation compris ; Q-93 : part en file hors connexion). */
  changerStock(id: string, stock: number): Promise<Resultat<{ produit: Produit }, 'stock'>>
  pause(id: string, enPause: boolean): Promise<Produit | null>
  /** Paiement au retrait, prix automatique et son plancher, seuil d'alerte (PUT /offers/{id}). */
  regler(id: string, champs: Partial<Pick<Produit, 'paiementAuRetrait' | 'prixAuto' | 'plancherPrive' | 'seuilAlerte'>>): Promise<Resultat<{ produit: Produit }, 'plancher' | 'seuil' | 'reserve'>>
  /** Brouillon d'une autre variante (DUP-01 à DUP-04) : les photos réelles prises pour la copie partent avec lui. */
  dupliquer(id: string, variante: string): Promise<Resultat<{ brouillonId: string; rattache: boolean }, 'variante' | 'existe' | 'fiche'>>
  supprimer(id: string): Promise<Resultat<object, 'etat'>>
  restaurer(id: string): Promise<void> // « Annuler » juste après une suppression
  variantes(ficheId: string): Promise<VarianteDeFiche[]>
  exporter(): Promise<string> // CSV : identifiant, produit, variante, état, prix, stock, seuil
  importer(csv: string): Promise<Resultat<{ lignes: number; ignorees: number }, 'vide' | 'format'>>
}
