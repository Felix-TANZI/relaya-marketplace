// Domaine « aide » : dix questions fréquentes dans l'ordre des demandes au support, trois phrases au plus, chacune
// menant à l'écran où agir (VD11-R63, AID-03) ; réponses imposées (VD11-R65) avec montants calculés ; produits
// interdits (VD11-R64, DP-42) ; support : WhatsApp pour l'aide seulement (GEN-08, MSG-03) et conversation « Support
// BelivaY » dans l'application (Q-49), première réponse en 2 h, de 7 h à 21 h, 7 jours sur 7 (Q-47) ; coordonnées et
// réseaux officiels BelivaY ; conseil de la semaine (VD02-N08). Contenus gérés dans la console, lisibles sans réseau.
// L'accès Préparation ne reçoit pas les questions d'argent (aucun montant). API : GET /help (Q-92).
import type { Francs } from '../communs'

export interface TexteAide {
  modele: string
  valeurs?: Record<string, string | number>
  montants?: Record<string, Francs>
}

export interface QuestionAide {
  id: string
  theme: 'argent' | 'commandes' | 'litiges' | 'retours' | 'palier' | 'boutique' | 'produits'
  question: string
  reponse: TexteAide
  ecran: string | null // route de l'écran où agir
  lien: string | null // libellé du lien (« Voir mes versements »)
}

export interface ContactsAide {
  telephone: string // « +237 689 002 812 »
  telephoneLien: string // « tel:+237689002812 »
  email: string
  whatsapp: string // lien wa.me du support (aide seulement)
  horaires: [string, string] // « 07:00 », « 21:00 »
  delaiReponseH: number // 2 h pour tous les paliers (Q-47)
  responsablePlatine: boolean
  reseaux: { nom: 'facebook' | 'instagram' | 'tiktok'; libelle: string; url: string }[]
}

export interface DomaineAide {
  questions(recherche?: string): Promise<QuestionAide[]>
  produitsInterdits(): Promise<string[]>
  contacts(): Promise<ContactsAide>
  conseil(): Promise<{ titre: string; texte: string; publieLe: string }>
}
