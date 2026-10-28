// Connecteurs du domaine « logistique » (backend-kit/apps/console : formes_logistique.py, lectures.py, décisions).
import { c, type ConnecteursDe } from './types'

const D = 'Logistique'

export const ROUTES_LOGISTIQUE: ConnecteursDe<'logistique'> = {
  'logistique.zones': c(D, 'branche', 'GET /api/console/zones', '→ Zone[] (code, nom, exploitée)'),
  'logistique.relais': c(D, 'partiel', 'GET /api/console/vues/relais', '→ RelaisCourt[]', 'relais de relaya (pont) : Trust Score, convention, bascule, secours, fermeture et constats du relais sont branchés par le chantier du relais (relais_core, branche l/relais) ; versement = dette d’espèces du vendredi'),
  'logistique.relaisFiche': c(D, 'partiel', 'GET /api/console/vues/relais/{id}', '→ RelaisFiche ; 404 → null', 'KYC du gérant, visite, formation, photos, journée : chantier du relais (relais_core, branche l/relais)'),
  'logistique.entreprises': c(D, 'branche', 'GET /api/console/vues/entreprises', '→ EntrepriseCourte[]', 'délai moyen (acceptation → dépôt, 7 jours), pertes (incidents colis, 30 jours)'),
  'logistique.entrepriseFiche': c(D, 'branche', 'GET /api/console/vues/entreprises/{id}', '→ EntrepriseFiche ; 404 → null', 'grille d’achat (entreprise_argent.prix : prix, plafond, marge), rapport du pilote jour par jour'),
  'logistique.couverture': c(D, 'branche', 'GET /api/console/vues/couverture', '→ CouvertureZone[]'),
  'logistique.placements': c(D, 'branche', 'GET /api/console/vues/placements', '→ PlacementQuartier[]', 'quartiers écrits par les boutiques et les candidats relais, lus contre la table quartier → zone (zones v2) ; un quartier placé par la console est gardé par elle, à reporter dans logique-metier/livraison/quartiers-zones.json'),
  'logistique.livreurs': c(D, 'branche', 'GET /api/console/vues/livreurs', '→ LivreurCourt[]'),
  'logistique.livreurFiche': c(D, 'branche', 'GET /api/console/vues/livreurs/{id}', '→ LivreurFiche ; 404 → null', 'modules de la certification faits, dernier quiz soumis'),
  'logistique.departs': c(D, 'branche', 'GET /api/console/vues/departs', '→ Depart[]', 'livraison_core.DemandeDepart ; versement de départ figé à la clôture'),
  'logistique.changements': c(D, 'branche', 'GET /api/console/vues/changements', '→ ChangementIdentifiant[]', 'lus au journal de la livraison : bascule d’appareil faite par le livreur (code SMS), numéro changé par la console (livreur-numero), second compte refusé ; au kit, aucune demande n’attend la console (« a_decider » n’arrive pas)'),
  'logistique.paquets': c(D, 'branche', 'GET /api/console/vues/paquets', '→ PaquetCourt[]', '300 derniers ; paliers éligibles (ENT-PLAFOND-VALEUR) ; escalade : élargie, priorité relevée, prévenus'),
  'logistique.paquetFiche': c(D, 'branche', 'GET /api/console/vues/paquets/{id}', '→ PaquetFiche ; 404 → null', 'entreprises éligibles et raison ; part du relais (RELAIS-GAIN-COLIS) et achat à l’entreprise : finances.lire'),
  'logistique.pilotage': c(D, 'branche', 'GET /api/console/vues/pilotage', '→ ZonePilotage[]', 'ZONE-SCORE sur 7 jours (paquets, relais, entreprises, litiges) ; plan d’action et délai saisonnier tenus par la console ; recherches des clients : [] (pas de journal de recherche au kit)'),
  'logistique.carte': c(D, 'branche', 'GET /api/console/vues/carte', '→ PointCarte[]', 'relais, boutiques, points de stockage, paquets en cours, livreurs en mission (Direction et Opérations), alertes ; jamais l’adresse d’un client'),
  'logistique.consulterPosition': c(D, 'branche', 'POST /api/console/vues/livreurs/{id}/position', '→ {ok, le} | {ok: false, raison: hors_mission}', 'pendant une mission seulement ; journalisée (console.position_viewed) ; Direction et Opérations de la zone'),
  'logistique.emballages': c(D, 'branche', 'GET /api/console/vues/emballages', '→ Emballages', 'stock avancé lu chez chaque entreprise (entreprise_flotte.emballages) ; stock du siège = commandes au fournisseur moins avances ; coût unitaire et stock initial du siège : donnees/logistique-console.json (provisoires)'),
  'logistique.candidatures': c(D, 'partiel', 'GET /api/console/vues/candidatures', '→ Candidature[]', 'entreprises ; candidatures de relais : chantier du relais (relais_core, branche l/relais)'),
  'logistique.dossiersLivreurs': c(D, 'branche', 'GET /api/console/vues/livreurs-activations', '→ DossierLivreur[]', 'livreurs en activation et activés depuis 7 jours ; « Activer » : livreur-activer (charte, pièces, certification, approbation de l’entreprise)'),
  'logistique.verifier': c(D, 'branche', 'GET /api/console/actions · GET /api/console/roles', '→ {ok, regle: {roles, quatreYeux, rolesSecond, route}, detail: null} ; inconnu', 'geste → action du catalogue (src/api/domaines/quatreyeux.ts) ; permission et double contrôle du kit ; le périmètre de zones est contrôlé par la décision (403 hors_perimetre)'),
  'logistique.suspendreLivreur': c(D, 'branche', 'POST /api/console/decisions {action: decision-livreur, donnees: {livreur, niveau: 3, dureeJours?}} (Idempotency-Key)', '→ {ok} ; motif_court'),
}
