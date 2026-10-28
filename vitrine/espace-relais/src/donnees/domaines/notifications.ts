// Domaine « notifications » (possédé par PR-08 Communication). Règles : NOT-01 à NOT-06, NTF-01 à NTF-09, PR02-R04,
// PR-RC-14, PR-RC-20, PAL-06, TRU-07, VER-07, VER-08, DOC.
// - Un message par ÉVÉNEMENT À AGIR, jamais un push par colis reçu (NOT-01, NTF-02) : le relais reçoit un résumé le matin
//   (PR-NTF-RESUME-H, réglable, jamais avant 7 h : NTF-01) puis seulement ce qui demande un geste.
// - Chaque notification est rendue par un MODÈLE versionné (clé, français, anglais, variables, canal, urgence), édité en
//   console (PR-RC-20) : le serveur envoie le texte dans les deux langues ; l'écran ne compose rien.
// - JAMAIS un code, un montant ni une donnée client dans une notification (NOT-03, NTF-06) : « Versement envoyé · voir
//   le détail » avec sa référence BLV-VP-nnnn ; le montant ne s'affiche que dans l'application (Versements).
// - Toucher une notification ouvre l'écran concerné (lien profond, NOT-02) et la marque lue (NTF-05).
// - Filtrées par le serveur selon le rôle : l'employé de comptoir ne reçoit rien qui touche l'argent, le score, les
//   pièces ni les paramètres du relais (ARL-06, PR-RC-09, PR02-R04 « Relais (gérant) »).
// - Push : heures calmes PR-NTF-CALME sauf l'urgent (NTF-07, NOT-06) — le push est alors DIFFÉRÉ à la fin des heures
//   calmes, la notification est déjà dans le centre ; un interrupteur coupé arrête ce type de push dès le prochain
//   événement (critère 2) ; les actions critiques (colis à renvoyer, photo demandée : NTF-04) et « Score et sanctions »
//   (NTF-08) ne se coupent jamais.
import type { Instant, Origine, Resultat } from '../communs'

/** Texte d'un modèle, dans les deux langues de l'application (DP-13 : pas de pidgin). */
export interface Texte {
  fr: string
  en: string
}

/** Rubrique : d'où vient l'événement (icône et teinte de la ligne). */
export type RubriqueNotification = 'reception' | 'retrait' | 'departs' | 'incidents' | 'argent' | 'qualite' | 'compte' | 'panne' | 'messages' | 'capacite'

/** Réglage qui gouverne le PUSH de la notification (la notification reste toujours dans le centre). */
export type CategorieNotification =
  | 'operations' // lot annoncé, capacité, dossier, messages : interrupteur « Notifications push »
  | 'approche' // livreur en approche : interrupteur dédié (NTF-03)
  | 'versements' // envoi ou refus d'un versement (gérant) : interrupteur dédié (NTF-06, VER-08)
  | 'critique' // colis à renvoyer, photo demandée, panne : jamais coupé (NTF-04)
  | 'score' // seuil proche, sanction ou descente proposée : toujours actif (NTF-08)
  | 'compte' // pièce qui expire, paramètre modifié (gérant) : interrupteur « Notifications push »

/** Ce qu'il est advenu du push de cette notification (la ligne le dit quand il n'est pas parti tout de suite). */
export interface PushNotification {
  etat: 'envoye' | 'differe' | 'coupe'
  /** Envoyé : à cette heure ; différé : partira à cette heure (fin des heures calmes) ; coupé : null. */
  a: Instant | null
}

export interface Notification {
  id: string
  /** Clé du modèle de la console (« relais.livreur_approche ») et sa version (PR-RC-20). */
  modele: string
  version: number
  titre: Texte
  texte: Texte
  rubrique: RubriqueNotification
  categorie: CategorieNotification
  /** « À traiter » (un geste attendu) ou « Pour information ». */
  aTraiter: boolean
  /** Urgente : traverse les heures calmes (NTF-07). */
  urgente: boolean
  /** Écran ouvert au toucher (NOT-02) et ses paramètres. */
  route: string
  params?: Record<string, string>
  /** Geste proposé en plus sur la ligne (« Contester » une sanction proposée : TRU-07, NTF-08). */
  action?: { libelle: Texte; route: string; params?: Record<string, string> } | null
  quand: Instant
  lue: boolean
  lueLe: Instant | null
  push: PushNotification
}

/** Résumé du matin (NTF-01, PR02-R04) : colis attendus (≈, les lots peuvent changer), retraits prévus, départs, places
 * libres ; gardé tel qu'il est parti à l'heure du résumé. */
export interface ResumeMatin {
  /** Heure du résumé envoyé ce jour (null : pas encore l'heure, le dernier est celui de la veille). */
  envoyeLe: Instant
  aRecevoir: number
  approximatif: boolean
  retraitsAttendus: number
  renvois: number
  placesLibres: number
}

/** Réglages du membre connecté (chacun règle son téléphone). */
export interface ReglagesNotifications {
  /** « Notifications push » : tout ce qui est à faire ; coupé, seuls l'urgent, le critique et le score partent. */
  push: boolean
  /** « Livreur en approche », PR-NTF-APPROCHE-MIN minutes avant l'arrivée estimée. */
  approche: boolean
  /** « Versements » (envoi ou refus, sans montant) ; null pour un employé (il ne voit pas l'argent du relais). */
  versements: boolean | null
  /** Heure du résumé du matin « HH:MM » ; jamais avant `heureResumeMin` (PR-NTF-RESUME-H). */
  heureResume: string
  heureResumeMin: string
  /** Dernière heure de résumé permise (heure d'ouverture du relais au plus tôt dans la semaine : le résumé arrive avant
   * l'ouverture, NTF-01). */
  heureResumeMax: string
  /** Heures calmes du registre (PR-NTF-CALME) : aucun push non urgent entre ces heures. */
  heuresCalmes: { de: string; a: string }
  approcheMin: number
}

export interface CentreNotifications {
  notifications: Notification[]
  resume: ResumeMatin | null
  reglages: ReglagesNotifications
}

export type ReglageNotification = Partial<Pick<ReglagesNotifications, 'push' | 'approche' | 'versements' | 'heureResume'>>
export type RefusReglage = 'trop_tot' | 'trop_tard' | 'reserve_au_gerant' | 'heure_invalide'

export interface DomaineNotifications {
  /** Les notifications du membre connecté (filtrées selon son rôle), les plus récentes d'abord. */
  notifications(): Promise<Notification[]>
  /** Le centre : notifications, résumé du matin, réglages du membre. */
  centre(): Promise<CentreNotifications>
  lire(id: string): Promise<void>
  toutLire(): Promise<void>
  /** Règle un interrupteur ou l'heure du résumé (effet au prochain événement, critère 2). */
  regler(r: ReglageNotification, o: Origine): Promise<Resultat<{ reglages: ReglagesNotifications }, RefusReglage>>
}
