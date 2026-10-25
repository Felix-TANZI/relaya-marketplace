// Connecteurs du domaine « equipe » (backend-kit/apps/console : vues_equipe.py, règles equipes.py).
import { c, type ConnecteursDe } from './types'

const D = 'Équipe et accès'
const G = '→ IssueAcces {etat: applique | a_contresigner, qy} ; 400 motif_court, incomplet ; 403 console_forbidden ; 409 soi_meme, hors_equipe, hors_perimetre, reserve_acces, niveau_reserve, conflit, direction_min, direction_seule, etat, duree, deja'

export const ROUTES_EQUIPE: ConnecteursDe<'equipe'> = {
  'equipe.tableau': c(D, 'branche', 'GET /api/console/equipe', '→ TableauEquipe', 'membres par équipe, demandes à valider (quatre yeux), accès à revoir, temporaires qui finissent, alertes (§ 6)'),
  'equipe.membre': c(D, 'branche', 'GET /api/console/equipe/membres/{id}', '→ FicheMembre | null', 'droits effectifs (matrice ∩ niveau ∩ périmètre), historique de ses accès, messages, gestes permis'),
  'equipe.quiPeut': c(D, 'branche', 'GET /api/console/equipe/qui-peut', '→ QuiPeut'),
  'equipe.inviter': c(D, 'branche', 'POST /api/console/equipe/inviter {prenom, nom, email, equipe, niveau, zones, motif} (Idempotency-Key)', G, 'équipe à quatre yeux (Finance, Direction, Accès et personnel, Audit) : invitation envoyée à la contre-signature'),
  'equipe.changerNiveau': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/niveau {niveau, motif} (Idempotency-Key)', G),
  'equipe.changerPerimetre': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/perimetre {perimetre, motif} (Idempotency-Key)', G, 'plafond au-dessus de REMB-CONTROLE-SEUIL : quatre yeux'),
  'equipe.changerRole': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/role {role, motif} (Idempotency-Key)', G, 'conflit (§ 4) refusé avec sa raison'),
  'equipe.donnerTemporaire': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/temporaires {role, fin, motif} (Idempotency-Key)', G, 'au-delà de ADM-ACCES-TEMP-QY-J : quatre yeux ; ADM-ACCES-TEMP-MAX-J au plus ; retiré tout seul à sa fin'),
  'equipe.retirerTemporaire': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/temporaires/{t}/retirer {motif} (Idempotency-Key)', G),
  'equipe.avertir': c(D, 'branche', 'POST /api/console/equipe/avertissements {pour, genre, texte} (Idempotency-Key)', '→ {id, destinataires}'),
  'equipe.suspendre': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/suspendre {motif} (Idempotency-Key)', G, 'sessions fermées tout de suite (jetons émis avant refusés)'),
  'equipe.reactiver': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/reactiver {motif} (Idempotency-Key)', G, 'toujours à quatre yeux'),
  'equipe.desactiver': c(D, 'branche', 'POST /api/console/equipe/membres/{id}/desactiver {motif, repreneur} (Idempotency-Key)', '→ {reattribues} ; 409 dossiers_en_cours, direction_min'),
  'equipe.revue': c(D, 'branche', 'GET /api/console/equipe/revues/{equipe}', '→ RevueAcces'),
  'equipe.revoir': c(D, 'branche', 'POST /api/console/equipe/revues/lignes/{ligne} {decision, motif} (Idempotency-Key)', G),
  'equipe.monEquipe': c(D, 'branche', 'GET /api/console/equipe/mon-equipe', '→ MonEquipe', 'Responsable d’équipe seulement'),
  'equipe.repartir': c(D, 'branche', 'POST /api/console/equipe/dossiers/{id}/repartir {vers} (Idempotency-Key)', '→ {ok}'),
  'equipe.mesMessages': c(D, 'branche', 'GET /api/console/moi/messages', '→ MesMessages'),
  'equipe.lireMessage': c(D, 'branche', 'POST /api/console/moi/messages/{id}/lu', '→ void', 'accusé de lecture'),
  'equipe.ouvrirUrgence': c(D, 'branche', 'POST /api/console/urgence {motif, heures} (Idempotency-Key)', '→ {jusqua} ; 409 duree', 'Direction seulement, ADM-BRIS-GLACE-H au plus, revu le lendemain'),
  'equipe.fermerUrgence': c(D, 'branche', 'POST /api/console/urgence/fermer', '→ void'),
  'equipe.revoirUrgence': c(D, 'branche', 'POST /api/console/urgence/{id}/revoir {motif} (Idempotency-Key)', '→ {ok} ; 409 soi_meme'),
  'equipe.descentes': c(D, 'branche', 'GET /api/console/descentes', '→ TableauDescentes', 'ses zones pour les Opérations'),
  'equipe.planifier': c(D, 'branche', 'POST /api/console/descentes {type, zone, cible, lieu, repere, prevueLe, agentId} (Idempotency-Key)', '→ {id} ; 409 hors_perimetre', 'inspection d’un relais : événement relay.inspection.announced au relais'),
  'equipe.assigner': c(D, 'branche', 'POST /api/console/descentes/{id}/assigner {agent} (Idempotency-Key)', '→ {ok}'),
  'equipe.annulerDescente': c(D, 'branche', 'POST /api/console/descentes/{id}/annuler {motif} (Idempotency-Key)', '→ {ok}'),
  'equipe.mesDescentes': c(D, 'branche', 'GET /api/console/moi/descentes', '→ Descente[]', 'l’agent terrain ne voit que les siennes'),
  'equipe.descente': c(D, 'branche', 'GET /api/console/descentes/{id}', '→ Descente | null'),
  'equipe.avancer': c(D, 'branche', 'POST /api/console/descentes/{id}/avancer {statut} (Idempotency-Key)', '→ {ok}'),
  'equipe.mesSessions': c(D, 'branche', 'GET /api/console/moi/sessions', '→ MesSessions', 'une ligne par appareil (sessions du kit), la courante repérée par son jeton ; essais refusés de son identifiant'),
  'equipe.fermerAutresSessions': c(D, 'branche', 'POST /api/console/moi/sessions/fermer-autres', '→ {fermees} (+ paire neuve gardée sur l’appareil)', 'jetons révoqués ; accès émis avant refusés (401 session_fermee)'),
  'equipe.ouvrirVueClient': c(D, 'branche', 'POST /api/console/vues/clients/{id}/apercu {motif} (Idempotency-Key)', '→ {jusqua} ; 400 motif_court ; 404 inconnu', 'lecture seule, journalisée (console.voir_comme_client), ADM-DEMASQUE-MIN'),
  'equipe.vueClient': c(D, 'branche', 'GET /api/console/vues/clients/{id}/apercu', '→ VueClient | null', 'commandes du client (vendeurs, relais, total, paiement), zone, abonnement'),
  'equipe.rapporter': c(D, 'branche', 'POST /api/console/descentes/{id}/rapport {controles, photos, compteRendu, resultat} (Idempotency-Key)', '→ {ok} ; 400 incomplet', 'le résultat va au dossier lié (KYC, relais, litige) : journal à son nom'),
}
