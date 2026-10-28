// Domaine « notifications » : le centre (VD11-R53, R54) et les réglages push (I-2, VD11-R27).
// - Commande à préparer et litige : SMS + notification, non désactivables (VD11-R43, R44) ; prix, retour, versement,
//   palier, avis, conseil, sanction (avec « Contester »), stock, offre vérifiée, message : notification seule.
// - Filtres Tout · Urgent (commandes à préparer et litiges qui courent) · Argent ; ordre strictement antéchronologique
//   (VD11-R40) ; chaque ligne mène à l'écran exact ; gardées 12 mois (DP-33).
// - Jamais de code ni de montant sensible dans une notification POUSSÉE (VNO-03) : le centre de l'application montre le
//   montant au propriétaire seulement ; l'accès Préparation ne reçoit ni montant ni notification d'argent.
// - Textes : modèle français + valeurs typées, mis en forme par l'écran (heures, échéances, jours, francs), FR et EN.
// API : GET /notifications, POST /notifications/{id}/read, POST /notifications/read-all, GET/PUT /notifications/settings.
import type { Francs, Instant } from '../communs'

export type TypeNotification = 'preparer' | 'litige' | 'prix' | 'retour' | 'versement' | 'palier' | 'avis' | 'conseil' | 'sanction' | 'stock' | 'offre' | 'message' | 'securite'

/** Un texte à mettre en forme : tf(modele, valeurs) après avoir écrit montants, heures, échéances, jours et créneaux. */
export interface TexteNotification {
  modele: string
  valeurs?: Record<string, string | number>
  montants?: Record<string, Francs>
  heures?: Record<string, Instant>
  echeances?: Record<string, Instant>
  jours?: Record<string, Instant>
  creneaux?: Record<string, [string, string]>
}

export interface Notification {
  id: string
  type: TypeNotification
  canal: 'sms' | 'notification'
  titre: TexteNotification
  texte: TexteNotification
  a: Instant
  lu: boolean
  urgent: boolean // commande à préparer encore à préparer, litige qui court
  argent: boolean // concerne l'argent (jamais pour l'accès Préparation)
  lien: string // route de l'application (« commande?ref=BLV-00008 »)
  contester: string | null // sanction ou descente de palier : « contester?d=… » (VNO-04)
}

export interface ReglagesNotifications {
  commandesEtLitiges: true // toujours actif, notification et SMS (VD11-R27)
  versements: boolean
  avis: boolean
  conseils: boolean // une fois par semaine au plus
  sonDistinct: boolean // son distinct pendant les heures d'ouverture (I-2)
  silence: [string, string] // « 21:00 », « 07:00 » : pas de son ni de SMS, sauf litige près de l'échéance (Q-48)
}

export interface DomaineNotifications {
  liste(filtre: 'tout' | 'urgent' | 'argent'): Promise<Notification[]>
  compteurs(): Promise<{ tout: number; urgent: number; argent: number; nonLues: number }>
  nonLues(): Promise<number>
  marquerLue(id: string, lue?: boolean): Promise<void>
  toutMarquerLu(): Promise<void>
  reglages(): Promise<ReglagesNotifications>
  regler(champs: Partial<Omit<ReglagesNotifications, 'commandesEtLitiges' | 'silence'>>): Promise<ReglagesNotifications>
}
