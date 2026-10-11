// Connecteurs du domaine « offres » (backend-kit/apps/vendeur_catalogue).
import { c, type ConnecteursDe } from './types'

const D = 'Nouveau produit'

export const ROUTES_OFFRES: ConnecteursDe<'offres'> = {
  'offres.reglages': c(D, 'branche', 'GET /api/vendors/config', '→ Reglages', 'registre (PHOTOS_MIN…, à ajouter au registre en vigueur) ; libération des paliers ; plafond de démarrage PRX-09 ; versement null pour l’accès Préparation'),
  'offres.rechercher': c(D, 'branche', 'GET /api/vendors/catalog/search?q=&code=', '→ Recherche', '« cherché N fois » : recherches sans résultat de la zone, 30 jours glissants ; code-barres lu : sa fiche ou rien ; mesProduits : mes offres qui correspondent'),
  'offres.suggerer': c(D, 'branche', 'GET /api/vendors/catalog/suggest?q=', '→ Suggestion', 'DP-58 : catégorie du barème et marque proposées d’après le nom, description à compléter, doublon (similarité ≥ SIMILARITE_DOUBLON)'),
  'offres.creer': c(D, 'branche', 'POST /api/vendors/offers/new {nom, code} (Idempotency-Key)', '→ Resultat<{brouillonId}, recherche|reserve> ; 403 owner_only', 'DP-58 : produit nouveau seulement après une recherche (3 caractères ou un code-barres)'),
  'offres.rattacher': c(D, 'branche', 'POST /api/vendors/offers/{id}/attach {ficheId}', '→ Resultat<{brouillonId}, fiche|etat>', 'FCH-02 : le brouillon passe sur la fiche existante, photos et saisies gardées'),
  'offres.ordonnerPhotos': c(D, 'branche', 'PUT /api/vendors/offers/{id}/photos {ids}', '→ 204', 'la première photo est la principale'),
  'offres.parCodeBarres': c(D, 'branche', 'GET /api/vendors/catalog/barcode/{code}', '→ FicheCatalogue ; 404 → null'),
  'offres.reconnaitre': c(D, 'partiel', 'POST /api/vendors/catalog/recognize {image, prise, largeur, hauteur, position?}', '→ FicheCatalogue[]', 'sans prestataire de reconnaissance : fiches déjà vendues par la boutique puis les plus vendues de sa zone'),
  'offres.commencer': c(D, 'branche', 'POST /api/vendors/offers {ficheId, variante?} (Idempotency-Key)', '→ Resultat<{brouillonId}, fiche|reserve>'),
  'offres.brouillon': c(D, 'branche', 'GET /api/vendors/offers/draft?id=', '→ Produit ; 404 → null', 'sans id : le brouillon le plus récent'),
  'offres.modifier': c(D, 'branche', 'PATCH /api/vendors/offers/{id} {variante?, etatArticle?, stock?, seuilAlerte?, delaiPreparationH?, paiementAuRetrait?, madeInCameroon?, prix?, poidsKg?, dimensionsCm?, plancherPrive?, prixBarre?, finPromo?, noteVendeur?, titre?, marque?, categorie?, description?, prioritaire?}', '→ Resultat<{produit}, stock|prix|seuil|variante|colis|plancher|nom|categorie|description|promo|note> ; 404 → null', 'classe de colis calculée (poids facturé, plus grande dimension) ; Préparation : prix refusé ; prix barré, fin de promotion (contrôlés à la publication), note du vendeur sans coordonnées, champs du produit nouveau (DP-58)'),
  'offres.photos': c(D, 'branche', 'GET /api/vendors/offers/{id}/photos', '→ PhotoReelle[] ; 404', 'cible : offre, « demande » ou « copie:<offre> » ; srcset WebP 320/640/960/1600'),
  'offres.ajouterPhoto': c(D, 'branche', 'POST /api/vendors/offers/{id}/photos {image, prise, largeur, hauteur, octetsAvant, octetsApres, position} (Idempotency-Key)', '→ Resultat<{photo, nombre}, max|petite> ; 400 invalid', 'data: URL, adresse https ou multipart « fichier » ; taille réelle lue par Pillow'),
  'offres.retirerPhoto': c(D, 'branche', 'DELETE /api/vendors/offers/{id}/photos/{photoId}', '→ 204'),
  'offres.apercu': c(D, 'branche', 'GET /api/vendors/offers/quote?offre=&prix=&mic=', '→ Apercu ; 403 owner_only', 'moteur de commission : gardé, prix minimum publiable, plages exactes de la commission minimale (+ messageMinimale), plafond'),
  'offres.conseil': c(D, 'branche', 'GET /api/vendors/offers/{id}/price-advice?prix=', '→ Conseil ; 404 → null ; 403 owner_only', 'médiane − 100 F des offres en vente de la fiche, jamais sous le 10e centile (DP-56, Q-36)'),
  'offres.publier': c(D, 'branche', 'POST /api/vendors/offers/{id}/publish {rester, horsLigne} (Idempotency-Key)', '→ Resultat<Publication, photos|prix_minimum|stock|plafond|prix|fiche|etat|nom|categorie|description|promo|note> ; 403 owner_only', 'en vérification, réponse avant MODERATION_H ; la console BelivaY décide (vendeur_catalogue.services.moderer) ; produit nouveau (DP-58) : doublon rattaché à l’envoi, sinon fiche écrite pendant la vérification ; prix barré : remise réelle ≥ FLASH-REMISE-MIN, fin sous 30 jours (OFR-05)'),
  'offres.changerPrix': c(D, 'branche', 'PUT /api/vendors/offers/{id}/price {prix, rester}', '→ Resultat<{produit}, prix_minimum|plafond|prix> ; 403 owner_only', 'Product de relaya mis à jour'),
  'offres.publication': c(D, 'branche', 'GET /api/vendors/offers/{id}/publication · GET /api/vendors/offers/publication', '→ Publication ; 404 → null', 'sans id : la dernière publication'),
  'offres.proposerDescription': c(D, 'branche', 'POST /api/vendors/offers/{id}/description-proposal {texte}', '→ Resultat<{reponseAvant}, court|coordonnees|long> ; 404 ; 403 owner_only', 'coordonnées refusées (client_core.masquage.nettoyer_message)'),
}
