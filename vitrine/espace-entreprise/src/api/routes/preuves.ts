// Connecteurs du domaine « preuves » (backend-kit/apps/entreprise_operations).
import { c, type ConnecteursDe } from './types'

const D = 'Preuves'

export const ROUTES_PREUVES: ConnecteursDe<'preuves'> = {
  'preuves.resume': c(D, 'branche', 'GET /api/company/proofs/summary', '→ ResumePreuves', 'dossiers suivis, file de revue (illisible, manquante), taux par livreur'),
  'preuves.dossier': c(D, 'branche', 'GET /api/company/proofs?package=', '→ DossierPreuves ; 404 → null', 'par maillon (C1, transport, C2, domicile, clôture) ; heure de validation des codes, jamais leur valeur'),
  'preuves.signaler': c(D, 'branche', 'POST /api/company/proofs/{id}/flag {commentaire} (Idempotency-Key)', '→ Resultat<object, commentaire>', 'jamais supprimée ni remplacée ; journalisé'),
  'preuves.completer': c(D, 'branche', 'POST /api/company/proofs/{id}/complement {commentaire, photos} (Idempotency-Key)', '→ Resultat<object, commentaire>'),
  'preuves.exporter': c(D, 'branche', 'POST /api/company/proofs/export {paquetId}', '→ {le, par}', 'export journalisé, montré au dossier'),
  'preuves.relancer': c(D, 'branche', 'POST /api/company/proofs/remind {paquetId}', '→ {envoyeLe}'),
}
