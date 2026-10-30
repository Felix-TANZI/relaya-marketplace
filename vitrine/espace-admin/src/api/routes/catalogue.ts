// Connecteurs du domaine « catalogue » (backend-kit/apps/console : formes_acteurs.py, catalogue_serveur.py ; décision
// moderation).
import { c, type ConnecteursDe } from './types'

const D = 'Catalogue'

export const ROUTES_CATALOGUE: ConnecteursDe<'catalogue'> = {
  'catalogue.demandes': c(D, 'branche', 'GET /api/console/vues/demandes-fiches', '→ DemandeCreation[]', 'vendeur_catalogue.DemandeFiche envoyées ; fiches proches par la similarité des titres ; produit interdit (liste CAT-INTERDITS et ajouts) ; photos et mesures de l’offre'),
  'catalogue.deciderDemande': c(D, 'branche', 'POST /api/console/vues/demandes-fiches/{id}/decider {action, fiche, motif, signaler} (Idempotency-Key)', '→ {ok, etat} ; 422 lecture_seule, conflit_interets, sans_evenement ; 409 deja_traite ; 400 motif_court', 'rattacher : l’offre passe sur la fiche ; créer : nouveau maître ; refuser : l’offre est refusée avec le motif ; le vendeur est prévenu ; Direction et Vérification'),
  'catalogue.appariements': c(D, 'branche', 'GET /api/console/vues/appariements', '→ Appariement[]', 'paires de fiches au-delà de VD-DOUBLON proposées une fois (l’IA propose, une personne décide) ; en tête au-delà de CAT-FUSION-TETE'),
  'catalogue.deciderAppariement': c(D, 'branche', 'POST /api/console/vues/appariements/{id}/decider {action, motif} (Idempotency-Key)', '→ {ok, etat} ; 422 delai_depasse ; 409 deja_traite', 'fusionner : offres déplacées, double retiré du catalogue, réversible CAT-FUSION-RETOUR jours ; annuler : retour des offres'),
  'catalogue.fiches': c(D, 'branche', 'GET /api/console/vues/fiches', '→ FicheMaitre[]', 'vendeur_core.FicheCatalogue publiées, leurs offres (attribuée : la moins chère en vente) ; avis des produits (catalog.ProductReview de relaya)'),
  'catalogue.modifierFiche': c(D, 'branche', 'POST /api/console/vues/fiches/{id} {titre, motif} (Idempotency-Key)', '→ {ok}', 'le titre du site suit le maître ; jamais le prix ni le stock d’une offre'),
  'catalogue.taxonomie': c(D, 'branche', 'GET /api/console/vues/taxonomie', '→ Categorie[]', 'familles et rayons des fiches maîtres, sous-catégories ajoutées par la console'),
  'catalogue.creerSousCategorie': c(D, 'branche', 'POST /api/console/vues/taxonomie {parent, nom} (Idempotency-Key)', '→ {ok} | doublon (existe), vide, lecture_seule', 'sans doublon (casse et accents ignorés)'),
  'catalogue.aModerer': c(D, 'branche', 'GET /api/console/vues/offres', '→ OffreAModerer[]', 'offres en vérification ou refusées ; prix de l’offre sur 30 jours (rejoué), prix pratiqués sur le maître, prix conseillé (VD-CONSEIL-PRIX), conflit'),
  'catalogue.deciderOffre': c(D, 'branche', 'POST /api/console/decisions {action: moderation, donnees: {genre: offre, id, decision}} (Idempotency-Key)', '→ {ok, etat}', 'valider → accepter ; correction et dépublier → refuser ; retirer_barre : prix barré retiré (barre_valide s’il a été pratiqué au moins 7 jours sur 30) puis accepter ; prix conseillé joint au motif ; recours : aucun au kit (le vendeur renvoie son offre) → deja_traite'),
  'catalogue.avis': c(D, 'branche', 'GET /api/console/vues/avis', '→ Avis[]', 'avis produit signalés lus chez relaya (catalog.ProductReview : note, texte, client masqué, fiche et vendeur de l’offre) ; publicités signalées'),
  'catalogue.deciderAvis': c(D, 'partiel', 'POST /api/console/decisions {action: moderation, donnees: {genre: publicite, id, decision}} (Idempotency-Key)', '→ {ok, etat}', 'publicité : modération du kit ; avis produit (A…) : relaya garde l’avis, le masquer se fait chez relaya (à brancher sur catalog.ProductReview) → masquage_impossible'),
}
