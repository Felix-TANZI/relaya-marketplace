// Domaine « zones » (ENT-P04) : les douze zones BelivaY (carte qui fait foi, polygones tenus par la console :
// ENT-P04R-05, ENT-ZON-08), les zones déclarées et leur capacité honnête, horaires, livreurs rattachés, relais, santé
// (délai tenu sur seuil_delai_tenu_zone, litiges), état (ouverte, en pause, bloquée avec sa raison, retirée par
// BelivaY), table de correspondance des quartiers. Au lancement, seules les zones exploitées se déclarent (DED-23) ;
// une zone n'est active qu'avec au moins un livreur actif et un véhicule valide (ENT-P04R-01, ENT-04-R02) ; mettre en
// pause retire l'entreprise des paquets suivants, les acceptés restent dus (ENT-P04R-03). Droits : propriétaire et
// répartiteur (ENT-02-R60).
// API : GET · POST · PATCH /api/company/zones (422 si aucun livreur actif) ; GET /api/zones/map ;
// GET /api/zones/neighbourhoods ; temps réel zone.state_changed.
import type { CodeZone, Resultat } from '../communs'

export interface ZoneEntreprise {
  code: CodeZone
  nom: string // « Mokolo »
  exploitee: boolean // exploitée par BelivaY au lancement
  declaree: boolean
  etat: 'ouverte' | 'pause' | 'retiree' | 'bloquee'
  capacite: number // colis par jour déclarés
  acceptes: number // colis acceptés aujourd'hui
  delaiTenu: number | null // % livrés dans la promesse sur la fenêtre
  /** Bloquée : la raison (aucun livreur actif, véhicule ou pièce manquante). */
  raisonBlocage?: 'aucun_livreur' | 'piece' | null
  /** Heures de la zone (dans les heures de service logistique). */
  horaires?: { debut: number; fin: number }
  livreurs?: string[] // identifiants des livreurs rattachés
  relais?: { nom: string; fermeture: string } | null
  sante?: { dansLeDelai: number; remis: number; litiges: number }
}

/** Zone de la carte BelivaY (les douze, déclarées ou non). */
export interface ZoneCarte {
  code: CodeZone
  nom: string
  exploitee: boolean
  declaree: boolean
  etat: ZoneEntreprise['etat'] | null // null : non déclarée
  polygone: [number, number][] // [lat, lon], WGS 84
  centre: [number, number]
  etiquette?: [number, number] // où écrire le nom de la zone (le point le plus à l'intérieur) ; absent : le centre
  relais: string | null
}

export interface Quartier {
  nom: string
  zone: CodeZone
  alias: string[]
}

export interface DeclarationZone {
  capacite: number
  debut: number
  fin: number
  livreurs: string[]
}
export type RefusZone = 'pas_ouverte' | 'deja' | 'aucun_livreur' | 'capacite' | 'horaires' | 'inconnue'

export interface DomaineZones {
  zones(): Promise<ZoneEntreprise[]>
  carte(): Promise<ZoneCarte[]>
  quartiers(): Promise<Quartier[]>
  declarer(code: CodeZone, d: DeclarationZone): Promise<Resultat<{ zone: ZoneEntreprise }, RefusZone>>
  modifier(code: CodeZone, d: DeclarationZone): Promise<Resultat<{ zone: ZoneEntreprise }, RefusZone>>
  mettreEnPause(code: CodeZone, pause: boolean): Promise<Resultat<object, 'inconnue'>>
}
