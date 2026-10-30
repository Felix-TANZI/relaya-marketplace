// Domaine « relevés » (ENT-P19) : un relevé par semaine (un versement chaque vendredi) et un récapitulatif par mois.
// Provisoire tant que la période n'est pas arrêtée (jeudi 23 h 59) : PDF et CSV refusés (409 STATEMENT_NOT_FINAL).
// Chaque ligne : prestation (paquet, mission, classe, zone, tarif, date) ou retenue (dossier, décision) (ENT-REM-07) ;
// CSV UTF-8 « ; », une ligne par prestation et par retenue, aucune donnée de client (ENT-P25R-01, DED-13). Mentions de
// BELIVAY SARL (ENT-P19R-02) ; l'entreprise reste seule responsable de ses obligations (ENT-P19R-01) ; facture
// téléversée ou autofacturation fixée au contrat, retenue à la source à confirmer (ENT-P19R-03) ; écart facture /
// relevé : écrire à la Finance (ENT-P22). Conservés 180 jours après la fin du contrat (lecture seule).
// Propriétaire et comptable. API : GET /api/company/statements?period=, /statements/{id}.pdf | .csv ;
// POST …/{id}/invoice (PDF ≤ taille_max_piece Mo, 409 si autofacturation).
import type { Francs, Instant, Jour, Resultat } from '../communs'

export interface LigneReleve {
  jour: Jour
  genre: 'prestation' | 'retenue'
  reference: string // « PQ-2338 · MS-2338 » ou « LT-029 »
  detail: string // « Domicile Z3 · S » ou « Valeur de l'article »
  montant: Francs // négatif pour une retenue
}

export interface Releve {
  id: string // « RL-2026-S42 »
  periode: 'semaine' | 'mois'
  du: Jour
  au: Jour
  statut: 'provisoire' | 'definitif'
  arreteLe: Instant // fin de la période (jeudi 23 h 59, ou fin du mois)
  lignes: LigneReleve[]
  totalPrestations: Francs
  totalRetenues: Francs
  net: Francs
  facture: { mode: 'televersee' | 'autofacturation'; statut: 'attendue' | 'recue' | 'sans_objet'; fichier: string | null; recueLe: Instant | null }
}

export interface MentionsReleve {
  emetteur: { denomination: string; forme: string; capital: string; siege: string; rccm: string; niu: string }
  destinataire: { denomination: string; niu: string; quartier: string }
  modeFacturation: 'televersee' | 'autofacturation'
  retenueSource: string // « à confirmer avec le conseil comptable »
}

export interface DomaineReleves {
  liste(periode: Releve['periode']): Promise<Releve[]>
  mentions(): Promise<MentionsReleve>
  /** Contenu d'un fichier (PDF ou CSV) : refusé tant que la période est provisoire. */
  fichier(id: string, format: 'pdf' | 'csv'): Promise<Resultat<{ nom: string; contenu: string; type: string }, 'provisoire'>>
  televerserFacture(id: string, fichier: { nom: string; taille: number; type: string }): Promise<Resultat<object, 'provisoire' | 'format' | 'taille' | 'autofacturation'>>
}
