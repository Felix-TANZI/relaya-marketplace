// Domaine « offres » : ajouter un produit par la recherche d'abord (DP-58). La recherche porte sur le catalogue
// BelivaY et sur mes produits ; on vend un produit du catalogue en un geste (offre rattachée à sa fiche : variantes,
// état, stock, prix, photos réelles — la fiche n'est jamais refaite), ou l'on ajoute un produit nouveau après une
// recherche (photos, nom, catégorie proposée, état, marque, description proposée relue par BelivaY, variantes avec
// stock et prix, colis, délai) : publié, il passe en vérification (fiche écrite par BelivaY sous 48 h, 24 h en
// prioritaire), puis en vente. « Vous gardez X F par vente » est calculé par le service de commission (démonstration :
// src/calculs), jamais par l'écran (PRX-08, VD08-R10).
// API : GET /config, GET /catalog/search, GET /catalog/suggest, GET /catalog/barcode/{code}, POST /catalog/recognize,
// POST /offers (fiche du catalogue), POST /offers/new (produit nouveau), PATCH /offers/{id}, POST /offers/{id}/attach,
// POST · DELETE · PUT /offers/{id}/photos, GET /offers/quote, GET /offers/{id}/price-advice, POST /offers/{id}/publish,
// POST /offers/{id}/description-proposal (VD-02 p12).
import type { Francs, Instant, Resultat } from '../communs'
import type { PhotoReelle, Produit } from './produits'

export interface FicheCatalogue {
  id: string
  titre: string
  marque: string
  categorie: string // famille du barème
  rayon: string // catégorie affichée
  dessin: string
  variantes: string[]
  fourchette: [Francs, Francs] | null // prix du marché ; null : Préparation
  vendeurs: number // offres en vente sur cette fiche (« 3 vendeurs »)
  part: { pourCent: number; prixRef: Francs } | null // « Vous gardez X % à Y F » (NOF-05) ; null : Préparation
  dejaVendues: string[] // variantes déjà dans mes produits
}

export interface Recherche {
  q: string
  code: string | null // code-barres lu (le scan vaut une recherche)
  exacts: FicheCatalogue[]
  proches: FicheCatalogue[]
  mesProduits: Produit[] // mes offres qui correspondent (« vous le vendez déjà »), brouillons compris
  cherche: number // « cherché N fois près de chez vous » (zone de la boutique, 30 jours glissants, Q-96)
}

/** Proposition du service de catalogue pour un produit nouveau, à partir du nom tapé (DP-58) : catégorie (barème),
 *  marque reconnue, description à compléter (Q-34 : une proposition relue par BelivaY), fiche déjà au catalogue
 *  quand la similarité atteint le seuil des doublons (FCH-02, Q-96). */
export interface Suggestion {
  categorie: string | null
  marque: string | null
  description: string
  doublon: FicheCatalogue | null
}

export interface Reglages {
  etats: string[] // six états (PRX-05)
  delaisH: number[] // délais de préparation proposés, en heures ouvrées (> 24 : jours)
  delaiDefautH: number
  photosMin: number
  photosMax: number
  photoMinPx: number
  compression: { cote: number; qualite: number }
  ficheDelaiH: number
  fichePrioDelaiH: number
  fichePrioPrix: Francs | null // null : Préparation
  moderationH: number
  colis: { seuilKg: number; seuilCm: number; diviseur: number; classes: { classe: string; kg: number; cm: number }[] }
  flash: boolean // FF-FLASH (DP-50)
  rappelJours: number // « aucun rappel avant 7 jours » (VD08-R20)
  prixAutoPct: number // baisse maximale par semaine (VD08-R05)
  prixMin: Francs // VD-PRIX-MIN
  categories: { categorie: string; rayon: string }[]
  nomMin: number // nom d'un produit nouveau : longueur minimale
  promoRemiseMin: number // OFR-05 : remise réelle de 10 % au moins sous le prix barré
  promoJoursMax: number // fin de promotion : au plus N jours après la publication
  noteMax: number // note du vendeur : longueur maximale
  rechercheMin: number // caractères à taper avant que « Ajouter un nouveau produit » s'active (DP-58)
  liberation: { bronzeArgentJ: number; orPlatineJ: number; confirmationJ: number } // « Quand l'argent arrive »
  versement: { operateur: string; masque: string } | null // null : Préparation
  plafond: { montant: Francs; livrees: number; requises: number } | null // plafond de démarrage en cours (PRX-09)
}

/** « À X F, vous gardez Y F, soit Z % » pendant la saisie (PRX-08, VD08-R17, VD08-R21, PRX-03, PRX-09). */
export interface Apercu {
  prix: Francs
  garde: Francs | null // null : prix refusé (sous le minimum)
  partPourCent: number | null // une décimale
  petitPrix: boolean // sous 5 000 F : +3 points
  points: number
  minimum: Francs // prix minimum publiable (500 F, et le vendeur garde au moins 0 F)
  plagesMinimale: [Francs, Francs][] // prix où la commission minimale s'applique (Q-55, A-4 : plages exactes)
  commissionMinimale: Francs // 700 F (VD-COM-MIN)
  seuilPetitPrix: Francs // 5 000 F (VD-COM-POINTS)
  plafond: { montant: Francs; livrees: number; requises: number } | null
  refus: null | 'minimum' | 'plafond'
}

export interface Zone {
  nom: string
  premier: boolean
  premierAuConseille: boolean
}

/** Prix conseillé (DP-56, Q-36 : médiane − 100 F, jamais sous le 10e centile ; jamais au-dessus du prix tapé). */
export interface Conseil {
  prixSaisi: Francs
  conseille: Francs
  gardeConseille: Francs
  partConseille: number
  zones: Zone[]
  marche: { nombre: number; min: Francs; max: Francs }
  economieClient: Francs // ce que le client paie de moins qu'avec l'offre la plus proche
  clientsSemaine: number
  commandesAuxMoinsChers: [number, number] // 9 sur 10
  dejaLeMoinsCher: boolean
}

export interface Publication {
  offreId: string
  titre: string
  variante: string
  prix: Francs | null
  reponseAvant: Instant
  meilleurPrix: boolean
  zonesPremier: number
  zones: number
  avantages: ('badge' | 'flash' | 'vitrine')[]
  enFile: boolean // hors connexion : part au retour du réseau (REC-02)
  nouveau: boolean // produit nouveau : BelivaY écrit la fiche pendant la vérification
  rattache: boolean // un doublon a été trouvé à l'envoi : l'offre est rattachée à la fiche existante (FCH-02)
}

/** Photo prise sur l'appareil, avant que la source lui donne un identifiant et un lieu. */
export type PhotoPrise = Omit<PhotoReelle, 'id' | 'lieu'> & { position: { lat: number; lon: number } | null }

export type ChampsBrouillon = Partial<Pick<Produit, 'variante' | 'etatArticle' | 'stock' | 'seuilAlerte' | 'delaiPreparationH' | 'paiementAuRetrait' | 'madeInCameroon' | 'prix' | 'poidsKg' | 'dimensionsCm' | 'plancherPrive' | 'prixBarre' | 'finPromo' | 'noteVendeur'>> & {
  // Produit nouveau seulement (la fiche d'un produit du catalogue appartient à BelivaY, OFR-01) :
  titre?: string
  marque?: string
  categorie?: string
  description?: string
  prioritaire?: boolean
}
export type RefusModification = 'stock' | 'prix' | 'seuil' | 'variante' | 'colis' | 'plancher' | 'nom' | 'categorie' | 'description' | 'promo' | 'note'
export type RefusPublication = 'photos' | 'prix_minimum' | 'stock' | 'plafond' | 'prix' | 'fiche' | 'etat' | 'nom' | 'categorie' | 'description' | 'promo' | 'note' | 'doublon_vendeur' | 'prix_anormal'

export interface DomaineOffres {
  reglages(): Promise<Reglages>
  /** Catalogue et mes produits ; « code » : un code-barres lu (connu : sa fiche ; inconnu : aucun résultat). */
  rechercher(q: string, code?: string | null): Promise<Recherche>
  /** Catégorie, marque, description proposées et doublon éventuel pour le nom d'un produit nouveau. */
  suggerer(nom: string): Promise<Suggestion>
  /** Code-barres connu ⇒ fiche trouvée directement (VD08-R09) ; inconnu ⇒ null. */
  parCodeBarres(code: string): Promise<FicheCatalogue | null>
  /** Reconnaissance d'image côté serveur : fiches proposées pour une photo (VD08-R09). */
  reconnaitre(photo: PhotoPrise): Promise<FicheCatalogue[]>
  /** « C'est celui-là » : un brouillon rattaché à la fiche, valeurs par défaut posées (REFVD-R254). */
  commencer(ficheId: string, variante?: string): Promise<Resultat<{ brouillonId: string }, 'fiche' | 'reserve'>>
  /** « Ajouter un nouveau produit » (DP-58) : seulement après une recherche (au moins rechercheMin caractères, ou un
   *  code-barres lu) ; le nom cherché pré-remplit le produit. */
  creer(d: { nom: string; code: string | null }): Promise<Resultat<{ brouillonId: string }, 'recherche' | 'reserve'>>
  /** Le produit nouveau existe déjà : le brouillon passe sur la fiche, photos et saisies gardées (FCH-02). */
  rattacher(id: string, ficheId: string): Promise<Resultat<{ brouillonId: string }, 'fiche' | 'etat'>>
  /** Un brouillon ; sans identifiant, le plus récent en cours. */
  brouillon(id?: string | null): Promise<Produit | null>
  /** Brouillon, ou offre existante (« Modifier », « Réapprovisionner », « Corriger l'offre »). */
  modifier(id: string, champs: ChampsBrouillon): Promise<Resultat<{ produit: Produit }, RefusModification>>
  /** Photos d'une offre (son identifiant) ou en attente d'un brouillon à venir (« demande », « copie:<offre> »). */
  photos(cible: string): Promise<PhotoReelle[]>
  ajouterPhoto(cible: string, photo: PhotoPrise): Promise<Resultat<{ photo: PhotoReelle; nombre: number }, 'max' | 'petite'>>
  retirerPhoto(cible: string, photoId: string): Promise<void>
  /** Ordre des photos ; la première est la photo principale. */
  ordonnerPhotos(cible: string, ids: string[]): Promise<void>
  apercu(offreId: string | null, prix: number, madeInCameroon?: boolean): Promise<Apercu>
  conseil(offreId: string, prix: number): Promise<Conseil | null>
  /** « Rester à X F » : aucun rappel avant 7 jours (VD08-R20). `confirmer` : renvoyé à true après que le
   *  vendeur a confirmé un prix anormal signalé par `raison: 'prix_anormal'` (VD-PRIX-ANORMAL). */
  publier(id: string, choix: { rester: boolean; horsLigne: boolean; confirmer?: boolean }): Promise<Resultat<Publication, RefusPublication>>
  /** « Ajuster » / « Rester » sur une offre déjà en vente : le prix change, l'offre reste en vente.
   *  `confirmer` : renvoyé à true après confirmation d'un prix anormal (VD-PRIX-ANORMAL). */
  changerPrix(id: string, prix: number, rester: boolean, confirmer?: boolean): Promise<Resultat<{ produit: Produit }, 'prix_minimum' | 'plafond' | 'prix' | 'prix_anormal'>>
  publication(id?: string | null): Promise<Publication | null>
  /** Correction de la fiche proposée par le vendeur, relue par BelivaY (Q-34). */
  proposerDescription(offreId: string, texte: string): Promise<Resultat<{ reponseAvant: Instant }, 'court' | 'coordonnees' | 'long'>>
}
