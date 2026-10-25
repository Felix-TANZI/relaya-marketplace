// Domaine « equipe » (propriétaire seulement, REFVD-R14) : propriétaire + 3 accès employés au plus, sur tous les plans
// (VD02-P06, EQU-02, VD-EQUIPE-MAX). Chaque employé a SES droits, cochés par le propriétaire et regroupés (commandes,
// produits, litiges, messages, argent, boutique, équipe ; src/donnees/droits.ts), à partir d'un rôle prédéfini
// (Préparation, Gestion du stock, Service client) ou personnalisé ; l'argent, les prix, la réponse aux litiges et
// l'équipe ne s'ouvrent jamais à un employé (EQU-01, Q-17, Q-18). Tout ce qui DONNE un accès (inviter, changer des
// droits, réactiver) ou le retire (supprimer) demande le code SMS du propriétaire (second facteur, VD11-R23) ;
// suspendre coupe la session tout de suite, sans code (retirer un accès ne doit jamais attendre) ; supprimer coupe la
// session, les actions passées restent signées (EQU-03, EQU-04, VD11-R22). Journal des actions par employé.
// API : GET/POST/DELETE /shop/members, POST /shop/members/{id}/resend, DELETE /shop/members/invitations/{id},
// PUT /shop/members/{id}/rights, POST /shop/members/{id}/suspend, POST /shop/members/{id}/reactivate,
// POST /shop/members/{id}/code, GET /shop/members/{id}/journal (INTEGRATION-API.md § 8).
import type { Instant, ReferenceCommande, Resultat, Role } from '../communs'
import type { Droit, ProfilAcces } from '../droits'

export interface MembreEquipe {
  id: string
  prenom: string
  nom: string
  initiales: string
  telephone: string // numéro du membre de l'équipe (masqué à l'écran)
  role: Role
  profil: ProfilAcces | null // null : le propriétaire
  droits: Droit[] // propriétaire : tous
  depuis: Instant
  // invité : SMS d'installation envoyé, mot de passe pas encore choisi ; suspendu : session coupée, compte gardé.
  etat: 'actif' | 'invite' | 'suspendu'
  inviteJusqua: Instant | null // l'invitation expire (7 jours) ; « Renvoyer » la prolonge
  suspenduLe: Instant | null
  derniereAction: { texte: string; a: Instant } | null
}

/** Une action signée d'un membre (EQU-03) : ce qu'il a fait, sur quelle commande ou quel produit, quand. */
export interface ActionMembre {
  a: Instant
  texte: string // « C’est prêt », « Stock : 12 → 10 », « Preuve ajoutée au litige »
  domaine: 'commandes' | 'produits' | 'litiges' | 'retours' | 'messages' | 'boutique' | 'equipe' | 'connexion'
  ref: ReferenceCommande | null
  route: string | null // écran à ouvrir (« commande?ref=BLV-00008 »)
}

export interface Equipe {
  membres: MembreEquipe[]
  maxEmployes: number
  employes: number // actifs, invités et suspendus : chacun occupe une place
  // Ajouts, retraits, changements de droits, suspensions : signés.
  historique: { a: Instant; action: 'ajout' | 'retrait' | 'droits' | 'suspension' | 'reactivation' | 'annulation'; par: string; membre: string; detail?: string }[]
}

/** Pourquoi un code SMS est envoyé au propriétaire. */
export type MotifCodeEquipe = 'retrait' | 'droits' | 'reactivation'

export interface DomaineEquipe {
  membres(): Promise<Equipe>
  /** Prépare l'invitation et envoie le code SMS au propriétaire ; rien n'est créé avant le code. */
  inviter(prenomNom: string, telephone: string, droits?: Droit[]): Promise<Resultat<{ invitation: string; masque: string }, 'plein' | 'nom' | 'telephone' | 'deja' | 'droits'>>
  confirmerInvitation(invitation: string, code: string): Promise<Resultat<{ membre: MembreEquipe }, 'code' | 'expire'>>
  renvoyerInvitation(id: string): Promise<Resultat<{ jusqua: Instant }, 'trop_tot'>>
  /** Annule une invitation pas encore acceptée (sans code : rien n'est ouvert). */
  annulerInvitation(id: string): Promise<Resultat<{ equipe: Equipe }, 'introuvable'>>
  /** Envoie le code SMS au propriétaire avant un retrait. */
  demanderCodeRetrait(id: string): Promise<{ masque: string }>
  /** Envoie le code SMS au propriétaire avant un changement de droits ou une réactivation. */
  demanderCodeMembre(id: string, motif: MotifCodeEquipe): Promise<{ masque: string }>
  retirer(id: string, code: string): Promise<Resultat<{ equipe: Equipe }, 'code' | 'proprietaire'>>
  /** Change les droits d'un employé (code SMS : un droit donné est un accès donné). Les interdits sont retirés. */
  changerDroits(id: string, droits: Droit[], code: string): Promise<Resultat<{ membre: MembreEquipe }, 'code' | 'proprietaire' | 'droits'>>
  /** Suspend (session coupée tout de suite, sans code) ; réactive (code SMS). */
  suspendre(id: string): Promise<Resultat<{ membre: MembreEquipe }, 'proprietaire' | 'etat'>>
  reactiver(id: string, code: string): Promise<Resultat<{ membre: MembreEquipe }, 'code' | 'proprietaire' | 'etat'>>
  /** Journal des actions signées d'un membre, la plus récente d'abord. */
  journal(id: string): Promise<ActionMembre[]>
}
