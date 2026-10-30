// Domaine « session » (possédé par PR-03 Accès) : le membre connecté sur cet appareil, son relais et les compteurs
// de la coque (pastilles de l'en-tête racine, badges de la barre du bas et du Menu). Lue au démarrage par
// SessionProvider, relue à chaque changement de données. Règles : GEN-09 (chaque action signée du PIN personnel),
// DRO-01 à DRO-05 (droits du gérant et de l'employé : PR-02 « Droits d'accès »), NAV-02 et NAV-03 (en-tête, pastilles).
import type { Instant, Origine, Resultat } from '../communs'

/** Rôle au relais : le PROPRIÉTAIRE (gérant, signataire de la convention) a tous les droits ; l'EMPLOYÉ de comptoir
 * n'a que ceux que le gérant lui donne (moindre privilège, 3 employés au plus). */
export type Role = 'proprietaire' | 'employe'

/** Droits d'un membre (PR-02, Droits d'accès). Le propriétaire les a tous ; l'employé : recevoir et remettre au moins,
 * « fermeture du jour » si le gérant le lui donne ; jamais l'argent, la capacité, les fermetures programmées,
 * l'équipe, les documents ni les paramètres ; l'historique sans les montants de rémunération. */
export type Droit =
  | 'recevoir' // recevoir un lot, refuser, poser une réserve
  | 'remettre' // remettre au client, dépôt d'un retour, constat au comptoir
  | 'faire_partir' // sorties : renvois, retours, transferts confiés au livreur
  | 'fermeture_jour' // déclarer une fermeture imprévue pour aujourd'hui
  | 'historique' // historique des opérations (sans montants de rémunération)
  | 'argent' // versements, rapports, caisse du jour, numéro de versement, montants de rémunération
  | 'capacite' // capacité, horaires, fermetures programmées
  | 'equipe' // ajouter, retirer un employé (code SMS au téléphone du gérant)
  | 'parametres' // paramètres, documents, données du relais, appareils, clôture

export type StatutRelais = 'candidat' | 'en_configuration' | 'ouvert' | 'ferme_temporaire' | 'suspendu' | 'clos'

export interface Membre {
  id: string
  prenom: string
  nom: string
  initiales: string
  role: Role
  droits: Droit[]
  photo: string | null
  /** Les 5 modules obligatoires sont terminés (DRO-01 : sans eux, pas de première remise). */
  formationOk: boolean
}

/** Ce que l'en-tête racine dit du relais (NAV-03) : « POINT RELAIS · NOM, QUARTIER », puis trois pastilles. */
export interface RelaisEnTete {
  id: string
  nom: string // « Relais Bastos Carrefour »
  quartier: string // « Bastos »
  zone: string // « Z1 Centre-ville »
  statut: StatutRelais
  /** Ouvert à cet instant (horaires structurés, pause, fermetures déclarées). */
  ouvertMaintenant: boolean
  /** Heure de fermeture d'aujourd'hui (« 19:00 ») quand il est ouvert ; null sinon. */
  fermeA: string | null
  /** Prochaine ouverture quand il est fermé (instant) ; null s'il est ouvert ou sans réouverture prévue (suspendu, clos). */
  rouvreLe: Instant | null
  placesOccupees: number
  placesDeclarees: number
  /** Occupation au seuil ou au-delà (CAL-21 : BelivaY n'envoie plus de colis et oriente les clients ailleurs) :
   * décidé par le serveur avec le seuil du registre ; la pastille des places passe en alerte. */
  sature: boolean
  /** Trust Score du relais (0 à 100) ; null pour un relais neuf (« Trust · nouveau »). */
  trust: number | null
  palier: string
}

/** Compteurs de la coque (masqués à 0, NAV-02). */
export interface Badges {
  /** Réception : colis annoncés non encore reçus (lots en approche ou attendus aujourd'hui). */
  reception: number
  /** Stock : colis en stock au relais (retours déposés non compris). */
  stock: number
  /** Retrait : colis prêts à remettre aujourd'hui dont le client a été prévenu (badge non affiché par défaut). */
  retrait: number
  /** À faire partir : colis à remettre au livreur (renvois, retours, transferts). */
  departs: number
  notifications: number
  messages: number
}

export interface SessionRelais {
  connecte: boolean
  /** Heure du serveur (démonstration : mardi 13 octobre 2026, 14 h 05, partagée avec le livreur et l'entreprise). */
  maintenant: Instant
  membre: Membre | null
  /** Numéro du membre connecté, masqué (« +237 6 •• •• •3 10 ») : jamais en clair à l'écran. */
  numeroMasque: string | null
  relais: RelaisEnTete | null
  badges: Badges
}

/** Où en est la connexion sur CET appareil (le serveur le dit ; l'écran ne garde que la saisie en cours). CNX-01 à
 * CNX-04, ARL-12 (PIN de PIN-LONGUEUR chiffres, PIN-ESSAIS essais puis PR-PIN-BLOCAGE-MIN minutes), PAR-02 (code SMS
 * d'un nouvel appareil, OTP-*), PR03-R01 à R03. */
export type EtapeConnexion = 'numero' | 'code' | 'pin' | 'nouveau_pin'
export interface CodeEnvoye {
  /** Pourquoi le code est demandé : nouvel appareil (double vérification) ou PIN oublié. */
  motif: 'appareil' | 'oubli'
  /** Numéro masqué où le code est parti (« 6 •• •• •• 10 ») : le sien, jamais en clair. */
  vers: string
  expireA: Instant
  /** Nouvel envoi possible à cet instant (OTP-RENVOI) ; null : plus d'envoi permis cette heure-ci. */
  renvoiA: Instant | null
  essaisRestants: number
}
export interface EcranConnexion {
  etape: EtapeConnexion
  /** Prénom du membre lié à cet appareil (« Bonjour Rose ») ; null à l'étape du numéro. */
  prenom: string | null
  /** Numéro lié à cet appareil, masqué. */
  numero: string | null
  code: CodeEnvoye | null
  /** PIN : essais restants avant blocage ; blocage en cours jusqu'à cet instant. */
  pin: { essaisRestants: number; bloqueJusqua: Instant | null }
  /** Session close par le serveur après PR-SESSION-J jours sans ouvrir l'application (CNX-04, ARL-141) : l'appareil
   * reste lié, le PIN suffit à reprendre. null : pas de session expirée sur cet appareil. */
  sessionExpiree: { jours: number } | null
}

export type RefusConnexion = 'pin_faux' | 'bloque' | 'inconnu' | 'acces_retire' | 'numero_invalide' | 'candidature_en_cours'
export type RefusCode = 'code_faux' | 'expire' | 'bloque' | 'trop_tot' | 'trop_d_envois'
export type RefusNouveauPin = 'pin_trop_simple' | 'code_requis'

export interface DomaineSession {
  session(): Promise<SessionRelais>
  /** Étape de connexion de cet appareil. */
  ecranConnexion(): Promise<EcranConnexion>
  /** Numéro saisi (+237) : appareil connu → PIN ; nouvel appareil → code SMS (PAR-02). Numéro inconnu : « Ce numéro
   * n'est lié à aucun relais » ; numéro d'une candidature en cours : son espace s'ouvre à l'activation. */
  commencer(telephone: string, o: Origine): Promise<Resultat<{ etape: EtapeConnexion }, RefusConnexion>>
  /** Code SMS (nouvel appareil ou PIN oublié) ; trop de codes faux : blocage OTP-*. */
  verifierCode(code: string, o: Origine): Promise<Resultat<{ etape: EtapeConnexion }, RefusCode>>
  renvoyerCode(o: Origine): Promise<Resultat<object, RefusCode>>
  /** PIN personnel (GEN-09) : ouvre la session de l'appareil. */
  connecter(pin: string, o: Origine): Promise<Resultat<object, RefusConnexion>>
  /** PIN oublié : code SMS au numéro du compte, puis nouveau PIN. */
  pinOublie(o: Origine): Promise<Resultat<object, RefusCode>>
  /** Nouveau PIN après un code SMS vérifié (premier appareil, PIN oublié) : 123456, 000000, suites et répétitions refusés. */
  creerPin(pin: string, o: Origine): Promise<Resultat<object, RefusNouveauPin>>
  /** « Changer de numéro » : délie cet appareil (le prochain numéro repasse par le code SMS). */
  changerNumero(): Promise<void>
  /** Ferme la session de cet appareil ; l'appareil reste lié (le PIN suffit à rouvrir, CNX-04). */
  deconnecter(): Promise<void>
}
