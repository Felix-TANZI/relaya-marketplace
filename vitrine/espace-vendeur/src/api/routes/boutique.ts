// Connecteurs du domaine « boutique » (backend-kit/apps/vendeur_boutique).
import { c, type ConnecteursDe } from './types'

const D = 'Boutique'

export const ROUTES_BOUTIQUE: ConnecteursDe<'boutique'> = {
  'boutique.boutique': c(D, 'branche', 'GET /api/vendors/shop', '→ Boutique', 'apercuClient : palier et Trust Score seulement (VD11-R07) ; vitrine interne'),
  'boutique.fermerAujourdhui': c(D, 'branche', 'POST /api/vendors/shop/closed-today {fermee}', '→ Boutique ; 403 owner_only', 'jusqu’à la prochaine ouverture réelle (Q-39) ; Préparation : fermer, et rouvrir le jour même (Q-18)'),
  'boutique.changerHoraires': c(D, 'branche', 'PUT /api/vendors/shop/hours {horaires}', '→ Resultat ordre ; 403 owner_only ; 400 invalid'),
  'boutique.mettreEnPause': c(D, 'branche', 'POST /api/vendors/shop/pause {jours}', '→ Resultat duree ; 403 owner_only', '30 jours au plus'),
  'boutique.reprendre': c(D, 'branche', 'POST /api/vendors/shop/resume', '→ Boutique ; 403 owner_only'),
  'boutique.programmerFermeture': c(D, 'branche', 'POST /api/vendors/shop/closures {du, au, motif} (Idempotency-Key)', '→ Resultat preavis_48h | dates | chevauche ; 403 owner_only'),
  'boutique.ecourterFermeture': c(D, 'branche', 'PATCH /api/vendors/shop/closures/{id} {au}', '→ Resultat dates ; 403 owner_only'),
  'boutique.annulerFermeture': c(D, 'branche', 'DELETE /api/vendors/shop/closures/{id}', '→ Boutique ; 403 owner_only'),
  'boutique.replacer': c(D, 'branche', 'PUT /api/vendors/shop/location {lat, lon}', '→ {ok, boutique, nouvelleVerification, metres, a} ; 403 owner_only ; 400 invalid', 'distance géodésique (moteur geo) ; au-delà de 200 m : point en attente de l’agent de zone, l’ancien sert (Q-91)'),
  'boutique.changerRepere': c(D, 'branche', 'PUT /api/vendors/shop/landmark {repere}', '→ Resultat vide | long ; 403 owner_only'),
  'boutique.modifierVitrine': c(D, 'branche', 'PATCH /api/vendors/shop/showcase {photo?, logo?, description?}', '→ Resultat long ; 403 owner_only', 'vitrine interne, jamais montrée au client (VD11-R11)'),
  'boutique.avis': c(D, 'branche', 'GET /api/vendors/reviews', '→ ResumeAvis', 'notes par colis (aftersales.AvisCommande) ; achat vérifié ; commentaire filtré ; jamais le client'),
  'boutique.repondreAvis': c(D, 'branche', 'POST /api/vendors/reviews/{id}/private-reply {texte} (Idempotency-Key)', '→ Resultat trop_court | delai_depasse | deja_repondu | coordonnees ; 403 owner_only', 'passée par la conversation Support BelivaY, 30 jours (VD11-R56)'),
  'boutique.lieux': c(D, 'branche', 'GET /api/vendors/shop/locations', '→ Lieux ; 403 owner_only (lecture permise à l’employé)', 'principal d’abord ; centres BelivaY (relais, centres des zones exploitées) joints, comme GET /hubs'),
  'boutique.ajouterLieu': c(D, 'branche', 'POST /api/vendors/shop/locations {nom, type, adresse, repere, horaires, position, precision, centre} (Idempotency-Key)', '→ Resultat plein | nom | repere | position | hors_zone | ordre ; 403 owner_only', 'zone calculée du point ; point GPS : « À vérifier » jusqu’à l’agent de zone ; centre BelivaY : vérifié d’office'),
  'boutique.modifierLieu': c(D, 'branche', 'PATCH /api/vendors/shop/locations/{id} {nom?, adresse?, repere?, horaires?}', '→ Resultat nom | repere | ordre | introuvable ; 403 owner_only', 'sans nouvelle vérification (EMP-02)'),
  'boutique.replacerLieu': c(D, 'branche', 'PUT /api/vendors/shop/locations/{id}/point {lat, lon}', '→ Resultat introuvable ; 403 owner_only', 'au-delà de 200 m : « À vérifier », l’ancien point sert, agent prévenu, relance après 72 h (Q-91)'),
  'boutique.demanderCodePrincipal': c(D, 'branche', 'POST /api/vendors/shop/locations/principal-code', '→ {masque} ; 403 owner_only'),
  'boutique.rendrePrincipal': c(D, 'branche', 'POST /api/vendors/shop/locations/{id}/principal {code}', '→ Resultat code | a_verifier | introuvable ; 403 owner_only', 'lieu vérifié seulement ; change l’origine du ramassage et la zone (attribution au coût total livré)'),
  'boutique.retirerLieu': c(D, 'branche', 'DELETE /api/vendors/shop/locations/{id}', '→ Resultat principal | introuvable ; 403 owner_only'),
  'boutique.demandes': c(D, 'branche', 'GET /api/vendors/shop/change-requests', '→ DemandeModification[] ; 403 owner_only'),
  'boutique.demanderCodeModification': c(D, 'branche', 'POST /api/vendors/shop/change-requests/code', '→ {masque} ; 403 owner_only'),
  'boutique.demanderModification': c(D, 'branche', 'POST /api/vendors/shop/change-requests {champ, valeur, rccm?, niu?, motif, pieces, code} (Idempotency-Key)', '→ Resultat code | valeur | motif | pieces | deja | rccm | niu ; 403 owner_only', 'examinée par la console (administration) sous 72 h ouvrées ; acceptée ou refusée avec motif écrit'),
  'boutique.annulerDemande': c(D, 'branche', 'DELETE /api/vendors/shop/change-requests/{id}', '→ Resultat introuvable | etat ; 403 owner_only'),
}
