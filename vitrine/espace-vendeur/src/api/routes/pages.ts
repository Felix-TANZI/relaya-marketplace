// Connecteurs des pages ajoutées (DP-58) et des domaines hors SourceVendeur, servis par le kit :
// - AJ-A (stock, promotions, questions, livraison) : src/pages/AJ-A/donnees/source.ts les appelle en mode API ;
// - AJ-B (apprendre, profil, activité, ramassages), Votre activité (VD-04 : objectif du mois), échanges (le flux
//   d'événements, src/api/ecoute.ts) : src/api/pages/source.ts, pris par les écrans en mode API (src/api/pages/actif.ts).
// Lu par backend-kit/outils/generer-openapi.mts (contrat) et outils/connecteurs.mjs (CONNECTEURS-VENDEUR.md).
import type { SourceAJA } from '../../pages/AJ-A/donnees/types'
import type { SourcePages } from '../pages/types'
import { c, type Connecteur } from './types'

type Cles<S> = { [D in Extract<keyof S, string>]: `${D}.${Extract<keyof S[D], string>}` }[Extract<keyof S, string>]

/** Où le contrat lit les types d'un domaine : fichier (depuis espace-vendeur/) et interface. */
export const TYPES_PAGES: Record<string, { fichier: string; interface: string; titre: string }> = {
  stock: { fichier: 'src/pages/AJ-A/donnees/types.ts', interface: 'DomaineStock', titre: 'Stock et inventaire (AJ-A)' },
  promotions: { fichier: 'src/pages/AJ-A/donnees/types.ts', interface: 'DomainePromotions', titre: 'Promotions (AJ-A)' },
  questions: { fichier: 'src/pages/AJ-A/donnees/types.ts', interface: 'DomaineQuestions', titre: 'Questions des clients (AJ-A)' },
  livraison: { fichier: 'src/pages/AJ-A/donnees/types.ts', interface: 'DomaineLivraison', titre: 'Livraison et colis (AJ-A)' },
  centres: { fichier: 'src/api/pages/types.ts', interface: 'DomaineCentres', titre: 'Centres BelivaY' },
  apprendre: { fichier: 'src/api/pages/types.ts', interface: 'DomaineApprendre', titre: 'Apprendre (AJ-B)' },
  profilAJB: { fichier: 'src/api/pages/types.ts', interface: 'DomaineProfilAJB', titre: 'Mon profil (AJ-B)' },
  recherche: { fichier: 'src/api/pages/types.ts', interface: 'DomaineRecherche', titre: 'Rechercher (AJ-B)' },
  activite: { fichier: 'src/api/pages/types.ts', interface: 'DomaineActivite', titre: 'Activité, ramassages, objectif' },
  echanges: { fichier: 'src/api/pages/types.ts', interface: 'DomaineEchanges', titre: 'Échanges avec les autres interfaces' },
}

const S = 'Stock'
const P = 'Promotions'
const Q = 'Questions'
const L = 'Livraison'
const B = 'Pages AJ-B'
const E = 'Échanges'

export const ROUTES_PAGES: Record<Cles<SourceAJA> | Cles<SourcePages>, Connecteur> = {
  'stock.inventaire': c(S, 'branche', 'GET /api/vendors/stock', '→ Inventaire ; 403 forbidden_right', 'droit produits.voir ; valeur et prix null pour un employé (ACC-26) ; conseil de réapprovisionnement sur 14 jours'),
  'stock.mouvements': c(S, 'branche', 'GET /api/vendors/stock/movements?offer=', '→ Mouvement[] ; 403 forbidden_right', 'mouvements signés et ventes des commandes ; le plus récent d’abord'),
  'stock.ajuster': c(S, 'branche', 'POST /api/vendors/stock/{id}/adjust {nouveau, type, note?} (Idempotency-Key)', '→ Resultat stock | introuvable | note ; 403 forbidden_right', 'droit produits.stock ; geste signé (VD02-DR03)'),
  'stock.regler': c(S, 'branche', 'PUT /api/vendors/stock/{id}/threshold {seuil}', '→ Resultat seuil | reserve', 'propriétaire (VD11-R49)'),
  'stock.exporter': c(S, 'branche', 'GET /api/vendors/stock/export', '→ CSV', 'sans prix pour un employé'),
  'promotions.regles': c(P, 'branche', 'GET /api/vendors/promotions/rules', '→ ReglesPromotion ; 403 owner_only', 'FF-FLASH, FLASH-REMISE-MIN, FLASH-DUREE-MAX, VD-VISIBILITE'),
  'promotions.liste': c(P, 'branche', 'GET /api/vendors/promotions', '→ Promotion[] ; 403 owner_only', 'une seule notion : origine vendeur ou mérite (vente flash offerte, VD-10)'),
  'promotions.offres': c(P, 'branche', 'GET /api/vendors/promotions/offers', '→ OffrePromouvable[] ; 403 owner_only', 'prix de référence : le plus bas pratiqué sur 30 jours (OFR-05)'),
  'promotions.apercu': c(P, 'branche', 'POST /api/vendors/promotions/quote {offreId, type, valeur, debut, fin}', '→ ApercuPromotion ; 403 owner_only', 'moteur de commission sur le prix payé (F9) ; refus si la vente serait refusée (DP-55)'),
  'promotions.creer': c(P, 'branche', 'POST /api/vendors/promotions {offreId, type, valeur, debut, fin} (Idempotency-Key)', '→ Resultat RefusPromotion ; 403 owner_only', 'pendant la fenêtre, le prix payé est le prix remisé (Product de relaya mis à jour)'),
  'promotions.arreter': c(P, 'branche', 'POST /api/vendors/promotions/{id}/stop', '→ Resultat etat ; 404 → etat ; 403 owner_only'),
  'questions.liste': c(Q, 'branche', 'GET /api/vendors/questions', '→ ListeQuestions ; 403 forbidden_right', 'droit messages.voir ; client anonyme (GEN-01)'),
  'questions.filtrer': c(Q, 'branche', 'POST /api/vendors/questions/filter {texte}', '→ {propre, filtre}', 'même filtre que la messagerie (VD11-R59)'),
  'questions.repondre': c(Q, 'branche', 'POST /api/vendors/questions/{id}/answer {texte} (Idempotency-Key)', '→ Resultat court | long | coordonnees | deja | reserve', 'réponse publique : propriétaire (Q-17)'),
  'questions.signaler': c(Q, 'branche', 'POST /api/vendors/questions/{id}/report {motif}', '→ Resultat deja | motif', 'relue sous 48 h (VD-MODERATION)'),
  'questions.modeles': c(Q, 'branche', 'GET /api/vendors/questions/templates', '→ ModeleReponse[]'),
  'questions.enregistrerModele': c(Q, 'branche', 'POST /api/vendors/questions/templates {titre, texte}', '→ Resultat titre | court | coordonnees | max | reserve'),
  'questions.modifierModele': c(Q, 'branche', 'PUT /api/vendors/questions/templates/{id} {titre, texte}', '→ Resultat titre | court | coordonnees | max | reserve | inconnu', 'modèle de BelivaY modifié : devient celui du vendeur (remplace)'),
  'questions.supprimerModele': c(Q, 'branche', 'DELETE /api/vendors/questions/templates/{id}', '→ 204'),
  'livraison.reglages': c(L, 'branche', 'GET /api/vendors/delivery-settings', '→ ReglagesLivraison', 'employé : lecture seule (peutRegler false)'),
  'livraison.regler': c(L, 'branche', 'PUT /api/vendors/delivery-settings {colis?, delaiH?, paiementAuRetrait?}', '→ Resultat reserve | delai', 'défauts appliqués à toute offre créée (OFR-02)'),
  'livraison.reglerProduit': c(L, 'branche', 'PUT /api/vendors/offers/{id}/delivery {colis?, poidsKg?, dimensionsCm?, delaiPreparationH?, paiementAuRetrait?}', '→ Resultat reserve | mesures | delai | introuvable', 'classe calculée par les mesures au-delà de S et M (VD08-R22)'),
  'livraison.creneau': c(L, 'branche', 'PUT /api/vendors/delivery-settings/slots/{id} {prefere}', '→ Resultat reserve | dernier'),
  'livraison.relais': c(L, 'branche', 'PUT /api/vendors/delivery-settings/relays/{id} {prefere}', '→ Resultat reserve | max'),
  'centres.liste': c('Boutique', 'branche', 'GET /api/vendors/hubs', '→ CentreBelivay[]', 'les mêmes centres arrivent joints à GET /shop/locations (boutique.lieux), que l’écran Emplacement lit'),
  'apprendre.faites': c(B, 'branche', 'GET /api/vendors/learning/progress', '→ string[]', 'étapes « fiche:étape » du membre connecté (Apprendre)'),
  'apprendre.cocher': c(B, 'branche', 'PUT /api/vendors/learning/progress/{fiche} {etape, fait}', '→ string[] ; 400 invalid'),
  'apprendre.recommencer': c(B, 'branche', 'DELETE /api/vendors/learning/progress/{fiche}', '→ string[]'),
  'profilAJB.changerBio': c(B, 'branche', 'PATCH /api/vendors/me {bio}', '→ Resultat long | coordonnees', 'sans code ; présentation lue dans GET /me (Mon profil)'),
  'recherche.chercher': c(B, 'branche', 'GET /api/vendors/search?q=', '→ {q, resultats}', 'Rechercher compose ses groupes (dessins, nombres, liens « tout voir ») avec les listes servies par le serveur ; cette route rend la même recherche à plat'),
  'activite.journal': c(B, 'branche', 'GET /api/vendors/shop/activity', '→ LigneActivite[] ; 403 forbidden_right', 'droit commandes.voir ; Activité de la boutique, en une lecture'),
  'activite.ramassages': c(B, 'branche', 'GET /api/vendors/pickups?from=&to=', '→ Remise[] ; 403 forbidden_right', 'Ramassages'),
  'activite.tableau': c(B, 'branche', 'GET /api/vendors/seller/activity?period=', '→ TableauActivite ; 403 owner_only', 'montants figés au paiement ; « Votre activité » (VD-04) calcule ses barres et sa carte de chaleur sur les commandes servies par le serveur'),
  'activite.objectif': c(B, 'branche', 'GET /api/vendors/seller/goal', '→ ObjectifDuMois ; 403 owner_only', 'objectif du mois, qui suit le vendeur d’un appareil à l’autre'),
  'activite.fixerObjectif': c(B, 'branche', 'PUT /api/vendors/seller/goal {amount}', '→ Resultat montant ; 403 owner_only'),
  'echanges.evenements': c(E, 'branche', 'GET /api/vendors/events?depuis= · GET /api/vendors/events/stream', '→ {evenements, curseur}', 'lu toutes les 15 s, au retour du réseau et de l’onglet (src/api/ecoute.ts) : un événement nouveau fait relire les écrans ; selon les droits ; montant null pour un employé'),
  'echanges.colisNonPret': c(E, 'branche', 'POST /api/vendors/orders/{id}/not-ready {raison}', '→ Resultat etat ; 403 forbidden_right', 'droit commandes.remettre ; ramassage au créneau suivant (P-6) ; d’ordinaire déclaré par le livreur dans son application (incident « colis pas prêt »), dont l’effet arrive par le flux'),
}
