// Connecteurs du domaine « compte » (backend-kit/apps/vendeur_boutique).
import { c, type ConnecteursDe } from './types'

const D = 'Compte'

export const ROUTES_COMPTE: ConnecteursDe<'compte'> = {
  'compte.profil': c(D, 'branche', 'GET /api/vendors/me', '→ Profil'),
  'compte.demanderCode': c(D, 'branche', 'POST /api/vendors/me/codes {motif}', '→ Resultat trop_tot ; 400 invalid', 'code SMS au téléphone personnel (apps.otp) ; jamais renvoyé par l’API'),
  'compte.modifierProfil': c(D, 'branche', 'PATCH /api/vendors/me {prenom?, nom?, photo?, couverture?, code}', '→ Resultat nom | code | titulaire ; 400 invalid', 'photo et couverture rognées en data: ou fichier (multipart) ; le nom du titulaire change par le support (PAR-01)'),
  'compte.demanderCodeEmail': c(D, 'branche', 'POST /api/vendors/me/email/code {email}', '→ Resultat email | pris | meme', 'code envoyé à la nouvelle adresse'),
  'compte.confirmerEmail': c(D, 'branche', 'POST /api/vendors/me/email/confirm {codeSms, codeEmail}', '→ Resultat code', 'deux codes consommés ensemble'),
  'compte.demanderCodesNumero': c(D, 'branche', 'POST /api/vendors/me/phone/codes {numero}', '→ Resultat prefixe | pris | meme', 'codes à l’ancien et au nouveau numéro (CIN-39)'),
  'compte.confirmerNumero': c(D, 'branche', 'PUT /api/vendors/me/phone {codeAncien, codeNouveau}', '→ Resultat code'),
  'compte.appareils': c(D, 'branche', 'GET /api/vendors/devices', '→ Appareil[]', 'appareil actuel par X-Device-Id ; ville, jamais l’adresse IP (SEC-01)'),
  'compte.deconnecterAppareil': c(D, 'branche', 'DELETE /api/vendors/devices/{id}', '→ Appareil[]', 'jeton en liste noire ; jamais l’appareil actuel'),
  'compte.deconnecterAutres': c(D, 'branche', 'POST /api/vendors/devices/revoke-others', '→ Appareil[]'),
  'compte.changerMotDePasse': c(D, 'branche', 'PUT /api/vendors/me/password {ancien, nouveau, code}', '→ Resultat ancien | faible | code | identique', 'les autres sessions se ferment (CAP-15)'),
  'compte.securite': c(D, 'branche', 'GET /api/vendors/me/security', '→ Securite'),
  'compte.reglerFaceId': c(D, 'branche', 'PUT /api/vendors/me/security/face-id {actif}', '→ Securite'),
  'compte.statut': c(D, 'branche', 'GET /api/vendors/account/summary', '→ StatutCompte ; 403 owner_only', 'grille au palier du jour (registre de commission) ; « account/status » est la route du domaine trust'),
  'compte.exporterDonnees': c(D, 'branche', 'POST /api/vendors/me/export {code} (Idempotency-Key)', '→ Resultat code | deja', 'fichier par e-mail sous 48 h'),
  'compte.cloturer': c(D, 'branche', 'POST /api/vendors/account/closure {code, motif?} (Idempotency-Key)', '→ Resultat code | deja ; 403 owner_only', '30 jours de préavis ; clôture effective seulement sans commandes en cours, argent à verser ni litiges'),
  'compte.annulerCloture': c(D, 'branche', 'DELETE /api/vendors/account/closure', '→ Securite ; 403 owner_only'),
  'compte.demanderModification': c(D, 'branche', 'POST /api/vendors/me/corrections {quoi, ref?} (Idempotency-Key)', '→ {fil} ; 400 invalid', 'écrit dans la conversation Support BelivaY'),
}
