// Connecteurs du domaine « session » (backend-kit/apps/livreur_session) : connexion par numéro, code SMS et PIN,
// appareil unique. Appareil : champ `appareil` du corps ou de l'adresse (identifiant gardé dans localStorage
// « blv_l_appareil »), à défaut l'en-tête X-Device-Id. L'ouverture rend les jetons simplejwt (écrits sur le téléphone).
import { c, type ConnecteursDe } from './types'

const D = 'Session'

export const ROUTES_SESSION: ConnecteursDe<'session'> = {
  'session.session': c(D, 'branche', 'GET /api/courier/session', '→ SessionLivreur', 'sans jeton : connecte false ; session de SESSION-H heures après la dernière ouverture'),
  'session.ecranConnexion': c(D, 'branche', 'GET /api/courier/auth/screen?appareil=', '→ EcranConnexion ; 400 appareil', 'identité si ce téléphone est lié à un compte ; jamais le numéro en clair'),
  'session.saisirNumero': c(D, 'branche', 'POST /api/courier/auth/phone {numero, appareil, origine}', '→ Resultat {bascule} numero_invalide | sans_invitation | autre_compte_sur_appareil | refuse ; 400 appareil', 'compte sur un autre téléphone : avertissement d’abord, aucun code'),
  'session.confirmerBascule': c(D, 'branche', 'POST /api/courier/auth/switch {appareil, origine}', '→ Resultat rien_a_confirmer', 'code SMS ; au code bon, l’ancien téléphone est déconnecté et l’entreprise prévenue'),
  'session.demanderCode': c(D, 'branche', 'POST /api/courier/auth/otp/request {motif, appareil, origine}', '→ Resultat {renvoiPossibleA, envoisRestants} trop_tot | trop_d_envois | pas_de_numero', 'OTP-RENVOI : 60 s, 3 envois par heure'),
  'session.verifierCode': c(D, 'branche', 'POST /api/courier/auth/otp/verify {code, appareil, origine}', '→ Resultat {suite} code_faux | code_annule | code_expire | aucun_code', 'sms_essais_code essais, puis le code est annulé'),
  'session.creerPin': c(D, 'branche', 'POST /api/courier/auth/pin {pin, appareil, origine}', '→ Resultat {suite} + jetons {access, refresh} pin_trop_simple | code_requis', 'PIN haché par le serveur, jamais en clair'),
  'session.verifierPin': c(D, 'branche', 'POST /api/courier/auth/pin/verify {pin, appareil, origine}', '→ Resultat {suite} + jetons pin_faux | bloque | sms_obligatoire | pas_de_session', 'PIN-ESSAIS faux : blocage PIN-BLOCAGE-MIN puis code SMS'),
  'session.deverrouillerBiometrie': c(D, 'branche', 'POST /api/courier/auth/biometric {appareil, origine}', '→ Resultat {suite} + jetons indisponible | sms_obligatoire | bloque', 'n’ouvre que l’application, jamais à la place d’un code'),
  'session.securite': c(D, 'branche', 'GET /api/courier/security', '→ Securite', 'appareil lié, 12 dernières ouvertures du journal d’authentification, empreinte ; jamais un PIN ni un code'),
  'session.changerPin': c(D, 'branche', 'POST /api/courier/auth/pin/change {ancien, nouveau, origine} (Idempotency-Key)', '→ Resultat pin_faux | pin_trop_simple | meme_pin | bloque', 'l’ancien PIN compte dans PIN-ESSAIS ; nouveau PIN haché par le serveur'),
  'session.reglerBiometrie': c(D, 'branche', 'POST /api/courier/auth/biometric/setting {active, origine} (Idempotency-Key)', '→ Resultat', 'l’empreinte n’ouvre que l’application, jamais à la place d’un code SMS'),
  'session.annulerCode': c(D, 'branche', 'POST /api/courier/auth/otp/cancel {appareil}', '→ 204'),
  'session.deconnecter': c(D, 'branche', 'POST /api/courier/logout {refresh, appareil}', '→ 204', 'jetons effacés sur le téléphone quoi qu’il arrive'),
}
