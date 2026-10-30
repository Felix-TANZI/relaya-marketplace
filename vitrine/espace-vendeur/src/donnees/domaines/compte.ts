// Domaine « compte » : profil complet du membre connecté, comme le client (DP-52) : photo rognée, nom, e-mail et
// téléphone personnel changés avec des codes (6 chiffres, 10 minutes, 5 essais, CIN-33/34) ; le nom du TITULAIRE suit
// la pièce d'identité et ne change que par le support (PAR-01, VD11-R09) ; sécurité : appareils regroupés (ville,
// jamais l'adresse IP, SEC-01, VD11-R38), mot de passe (CNX-02), second facteur par SMS au téléphone personnel
// (SEC-04, NUM-07), Face ID qui déverrouille seulement l'application sur un appareil connu et ne remplace jamais un
// code SMS (S-1) ; statut du compte et grille « part que vous gardez » calculée (SEC-05, VD11-R35) ; mes données
// (export) et clôture avec un code SMS (Q-23), 30 jours de préavis, annulable (SEC-03, SEC-06, VD11-R37).
// API : GET/PUT /me, POST /me/email, POST /me/phone, PUT /me/password, GET/DELETE /devices, GET /account/status,
// POST /me/export, POST/DELETE /account/closure, POST /auth/otp (VD-02 p12, Q-92).
import type { Instant, Jour, Palier, Plan, ReferenceCommande, Resultat, Role } from '../communs'

export interface Profil {
  prenom: string
  nom: string
  email: string | null
  telephone: string // téléphone personnel du membre (jamais celui d'un client, jamais le numéro de versement)
  photo: string | null // image rognée (data: ou adresse du serveur)
  couverture?: string | null // photo de couverture rognée en bandeau 3:1 (Menu, barre latérale, Mon profil)
  role: Role
  identifiant: string // « @Penga12 » (ne change jamais)
  titulaire: boolean // le propriétaire : son nom suit la pièce d'identité
}

export interface Appareil {
  id: string
  nom: string // « iPhone · Safari »
  type: 'telephone' | 'ordinateur' | 'tablette'
  lieu: string // « Yaoundé » (la ville, jamais l'adresse IP)
  vuA: Instant
  premiere: Instant
  ouvertures: number
  actuel: boolean
}

/** Pourquoi un code SMS est demandé (second facteur, SEC-04). */
export type MotifCode = 'profil' | 'email' | 'telephone' | 'mot_de_passe' | 'export' | 'cloture' | 'appareil'

export interface StatutCompte {
  creeLe: Jour
  approuveLe: Jour | null
  contratSigneLe: Jour
  palier: Palier
  trustScore: number
  plan: Plan
  decouverteJusqua: Jour | null
  // Part gardée par famille, en fourchette par tranche de prix, au palier du jour, hors découverte et planchers.
  grille: { famille: string; categories: string; de: number; a: number }[] // en %
  plancherCommande: number
}

export interface Securite {
  faceId: boolean // sur cet appareil
  telephoneMasque: string // « 6•• •• •• 17 »
  exportDemandeLe: Instant | null
  exportPretLe: Instant | null
  clotureDemandeeLe: Instant | null
  clotureLe: Instant | null
  aSolder: { type: 'commandes' | 'litiges' | 'versements'; nombre: number; route: string }[]
}

export interface DomaineCompte {
  profil(): Promise<Profil>
  /** Code par SMS au téléphone personnel (démonstration : 123456). */
  demanderCode(motif: MotifCode): Promise<Resultat<{ masque: string; renvoiSecondes: number }, 'trop_tot'>>
  modifierProfil(champs: Partial<Pick<Profil, 'prenom' | 'nom' | 'photo' | 'couverture'>>, code: string): Promise<Resultat<{ profil: Profil }, 'nom' | 'code' | 'titulaire'>>
  demanderCodeEmail(email: string): Promise<Resultat<object, 'email' | 'pris' | 'meme'>>
  confirmerEmail(codeSms: string, codeEmail: string): Promise<Resultat<{ profil: Profil }, 'code'>>
  demanderCodesNumero(numero: string): Promise<Resultat<object, 'prefixe' | 'pris' | 'meme'>>
  confirmerNumero(codeAncien: string, codeNouveau: string): Promise<Resultat<{ profil: Profil }, 'code'>>
  appareils(): Promise<Appareil[]>
  deconnecterAppareil(id: string): Promise<Appareil[]>
  deconnecterAutres(): Promise<Appareil[]>
  changerMotDePasse(ancien: string, nouveau: string, code: string): Promise<Resultat<object, 'ancien' | 'faible' | 'code' | 'identique'>>
  securite(): Promise<Securite>
  reglerFaceId(actif: boolean): Promise<Securite>
  statut(): Promise<StatutCompte>
  exporterDonnees(code: string): Promise<Resultat<{ pret: Instant }, 'code' | 'deja'>>
  cloturer(code: string): Promise<Resultat<{ le: Instant; aSolder: Securite['aSolder'] }, 'code' | 'deja'>>
  annulerCloture(): Promise<Securite>
  /** Demande au support (titulaire, identifiant) : écrite dans la conversation « Support BelivaY ». */
  demanderModification(quoi: string, ref?: ReferenceCommande | null): Promise<{ fil: string }>
  /** Comptes Google et Apple associés (« Continuer avec Google » ensuite) : e-mail masqué, jamais l'identifiant du
   *  fournisseur. */
  identites(): Promise<IdentiteAssociee[]>
  /** Associer le compte du fournisseur (sa fenêtre s'ouvre) ; indisponible : fournisseur pas encore branché. */
  associer(fournisseur: FournisseurIdentite): Promise<Resultat<{ identites: IdentiteAssociee[] }, 'indisponible' | 'refuse' | 'pris'>>
  /** Retirer le compte associé ; « derniere » : ce serait la dernière façon de se connecter. */
  dissocier(fournisseur: FournisseurIdentite): Promise<Resultat<{ identites: IdentiteAssociee[] }, 'derniere'>>
}

export type FournisseurIdentite = 'google' | 'apple'

export interface IdentiteAssociee {
  fournisseur: FournisseurIdentite
  email: string // masqué
  lieeA: Instant
}
