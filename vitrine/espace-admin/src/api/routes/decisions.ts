// Connecteurs du domaine « decisions » (poste de travail des décisions encadrées, logique-metier/DECISIONS-ENCADREES.md) :
// backend-kit/apps/console/vues_postes.py (postes.py, postes_genres.py), contrôles refaits au serveur dans l'ordre de
// logique-metier/CONTROLES-SERVEUR-DECISIONS.md, mêmes codes de refus que l'écran.
import { c, type ConnecteursDe } from './types'

const D = 'Décisions encadrées'
const GENRES = 'sept genres : litige, kyc, remboursement, sanction, constat, kit, signalement ; lecture par genre (litiges.contenu, postes_genres.LIRE)'
const REFUS = '422 code de refus du moteur (deja_decide, trop_tot, auteur, lie, hors_regle, lecture_seule…) ; motif_court → note_courte'

export const ROUTES_DECISIONS: ConnecteursDe<'decisions'> = {
  'decisions.file': c(D, 'branche', 'GET /api/console/postes?genre=&tout=1', '→ DossierCourt[] triés par échéance', `${GENRES} ; tout=1 : la file entière (pages de 50 lues par le serveur)`),
  'decisions.dossier': c(D, 'branche', 'GET /api/console/postes/{genre}/{id}', '→ DossierPoste ; 404 → null', 'pièces (pont des preuves), contrôles calculés puis corrigés, issues permises, droits de l’agent'),
  'decisions.controler': c(D, 'branche', 'POST /api/console/postes/{genre}/{id}/controles {controle, etat}', `→ {ok} ; ${REFUS}`, 'journalisé'),
  'decisions.noterAppel': c(D, 'branche', 'POST /api/console/postes/{genre}/{id}/appels {avec, nom, resultat, resume, accord}', '→ {ok, id} ; 422 accord_hors_issues', 'l’appel devient une pièce'),
  'decisions.decider': c(D, 'branche', 'POST /api/console/postes/{genre}/{id}/decision {issue, montant, motif, note, message, appel} (Idempotency-Key)', `→ {ok, etat, id} (201 appliquée, 202 à contre-signer) ; ${REFUS}`, 'au-delà de REMB-CONTROLE-SEUIL : décision « poste-decision » à quatre yeux (Finance ou Direction)'),
  'decisions.transmettre': c(D, 'branche', 'POST /api/console/postes/{genre}/{id}/transmettre {raison, issueProposee}', '→ {ok, vers}'),
  'decisions.prolonger': c(D, 'branche', 'POST /api/console/postes/{genre}/{id}/prolonger {note}', '→ {ok, echeance} ; 409 prolongation_unique'),
  'decisions.deciderLot': c(D, 'branche', 'POST /api/console/postes/{genre}/lot {ids, issue, montant, motif, note, message} (Idempotency-Key)', '→ {ok, n} ; 422 lot_heterogene, lot_taille, lot_plafond', 'litiges identiques (même cause, même issue)'),
  'decisions.ecarts': c(D, 'branche', 'GET /api/console/postes/ecarts?tout=1', '→ LigneEcart[] (Audit, Direction)', 'journal.tout'),
}
