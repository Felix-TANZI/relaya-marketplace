// Domaine « messages » (LIV-P27 ; LIV-10-R03 à R15, LIV-P27R-01 à R04, LIV-ANO-01/02, DED-13, DED-14, DP-61).
// - Fils : l'entreprise (consignes, plannings ; même fil que la fiche du livreur dans le portail), le support BelivaY
//   (protocoles, incidents), et un fil par acteur de chaque mission (vendeur, relais, client à domicile), ouverts à
//   l'affectation, fermés LIV-FIL-FERMETURE-H heures après la fin de la mission (lecture seule ensuite ; la console les
//   lit en cas de litige). L'interlocuteur est un nom de boutique, de relais ou « Client », jamais un nom de client.
// - Aucun numéro : tout numéro, e-mail, identifiant social ou code saisi est masqué par le serveur avant diffusion ;
//   aucune photo de colis dans un fil ; aucun message promotionnel.
// - Appel masqué (page Appel, DP-61) : jamais le vrai numéro ; ligne ouverte à l'affectation pour le vendeur, au départ
//   vers lui pour le client, à l'approche pour le relais, fermée à la clôture de la mission ; entreprise et support
//   pendant le service. Chaque appel est journalisé (appelant, appelé, mission, heure, durée ; jamais le contenu).
import type { Instant, Origine, Resultat } from '../communs'

export type Interlocuteur = 'entreprise' | 'support' | 'vendeur' | 'relais' | 'client'
export interface Fil {
  id: string
  titre: string
  interlocuteur: Interlocuteur
  mission: string | null // paquet
  arretId: string | null
  dernier: { texte: string; quand: Instant }
  nonLus: number
  etat: 'ouvert' | 'ferme'
  fermeA: Instant | null // fermeture (prévue ou faite) d'un fil de mission
  enRevue: boolean // signalé : en revue au support
  appel: 'ouvert' | 'pas_encore' | 'ferme' | 'hors_horaires' // ligne d'appel masqué
}
export interface Message {
  id: string
  de: 'moi' | 'eux' | 'systeme'
  texte: string
  quand: Instant
  etat: 'envoye' | 'en_file'
  masque: boolean // une partie a été masquée par le serveur
  signale: boolean
}
export interface FilOuvert {
  fil: Fil
  messages: Message[]
  rapides: string[] // messages rapides préécrits (dans la langue choisie)
  repli: string // APPEL-REPLI : repli quand l'appel échoue
  horairesSupport: string // SUP-HORAIRES
}
export interface Appel {
  id: string
  cible: string
  titre: string
  debut: Instant
  fin: Instant | null
}

export interface DomaineMessages {
  fils(): Promise<Fil[]>
  fil(id: string): Promise<FilOuvert | null>
  marquerLu(id: string): Promise<void>
  /** Hors connexion (enLigne faux) : le message est gardé et mis en file, envoyé au retour du réseau. */
  envoyer(filId: string, texte: string, origine: Origine, enLigne: boolean): Promise<Resultat<{ masque: boolean }, 'fil_ferme' | 'vide'>>
  signaler(filId: string, messageId: string, origine: Origine): Promise<Resultat<object, 'deja_signale'>>
  /** Appel masqué : un fil (son interlocuteur), ou « entreprise » / « support » directement. */
  appeler(cible: string, origine: Origine): Promise<Resultat<{ appel: Appel }, 'fil_ferme' | 'pas_encore' | 'hors_horaires' | 'indisponible'>>
  raccrocher(appelId: string, fin: Instant): Promise<void>
}
