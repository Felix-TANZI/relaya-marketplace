// DONNÉES DE DÉMONSTRATION — échanges avec les autres interfaces (src/donnees/echanges.ts, INTERFACES.md) : un exemple
// de chaque événement entrant et sortant, tiré du jeu d'essai (lundi 21 septembre 2026, boutique « Tonton PG »).
// Sert de référence au serveur et aux tests de contrat ; aucun écran ne le lit encore (les domaines de démonstration
// produisent eux-mêmes ces effets : notifications, journaux, états des commandes).
import type { EvenementEntrant, EvenementSortant } from '../donnees/echanges'
import { HEURE, yaounde } from '../calculs/temps'

const T = yaounde(2026, 10, 13, 9, 48)
const id = (n: number) => 'ev-' + n.toString().padStart(4, '0')

export const EXEMPLES_ENTRANTS: EvenementEntrant[] = [
  { id: id(1), a: T - 2 * HEURE, de: 'client', type: 'commande_payee', ref: 'BLV-00008', lignes: [{ offreId: 'itel-noir', quantite: 1 }], echeance: T + 2 * HEURE, payableAuRetrait: false },
  { id: id(2), a: T - 30 * 60_000, de: 'client', type: 'question', questionId: 'q-12', offreId: 'itel-noir', texte: 'Il est livré avec le chargeur ?' },
  { id: id(3), a: T - 20 * 60_000, de: 'client', type: 'message', fil: 'f-00007', ref: 'BLV-00007', texte: 'Bonjour, il arrive aujourd’hui ?' },
  { id: id(4), a: T - 26 * HEURE, de: 'client', type: 'avis', avisId: 'a-00002', ref: 'BLV-00002', note: 3, commentaire: 'Bon téléphone, mais la boîte était un peu abîmée.' },
  { id: id(5), a: T - 6 * HEURE, de: 'client', type: 'litige_ouvert', ref: 'BLV-00005', motif: 'abime', photos: 2, reponseAvant: T + 42 * HEURE },
  { id: id(6), a: T - 3 * HEURE, de: 'client', type: 'commande_annulee', ref: 'BLV-00009', avantRamassage: true },
  { id: id(7), a: T - HEURE, de: 'client', type: 'remplacement_choisi', ref: 'BLV-00006', accepte: true },
  { id: id(8), a: T - 4 * HEURE, de: 'livreur', type: 'creneau', ref: null, debut: yaounde(2026, 10, 13, 14), fin: yaounde(2026, 10, 13, 16), livreur: { nom: 'Serge M.', societe: 'Yafé Express' } },
  { id: id(9), a: T, de: 'livreur', type: 'en_route', ref: 'BLV-00008', arriveeVers: yaounde(2026, 10, 13, 14, 20) },
  { id: id(10), a: T, de: 'livreur', type: 'code_saisi', ref: 'BLV-00007', bon: false, essaisRestants: 2 },
  { id: id(11), a: T, de: 'livreur', type: 'remise_faite', ref: 'BLV-00007', photos: 2, scelle: true },
  { id: id(12), a: T, de: 'livreur', type: 'absent', ref: 'BLV-00008', prochainCreneau: { debut: yaounde(2026, 10, 14, 14), fin: yaounde(2026, 10, 14, 16) } },
  { id: id(13), a: T, de: 'relais', type: 'colis_arrive', ref: 'BLV-00004' },
  { id: id(14), a: T, de: 'relais', type: 'colis_retire', ref: 'BLV-00004', liberationLe: yaounde(2026, 10, 17, 9) },
  { id: id(15), a: T, de: 'relais', type: 'colis_non_retire', ref: 'BLV-00003', retourVers: yaounde(2026, 10, 16, 12) },
  { id: id(16), a: T, de: 'relais', type: 'retour_depose', ref: 'BLV-00006', motif: 'Ne s’allume pas', inspecterAvant: null },
  { id: id(17), a: T, de: 'administration', type: 'demande_decidee', demandeId: 'dm-1', decision: 'acceptee', motif: 'La devanture montre le nouveau nom.' },
  { id: id(18), a: T, de: 'administration', type: 'kyc', etat: 'accepte', motif: null },
  { id: id(19), a: T, de: 'administration', type: 'lieu_verifie', lieuId: 'l-principal', verifie: true, motif: null },
  { id: id(20), a: T, de: 'administration', type: 'fiche_decidee', offreId: 'iphone', decision: 'en_ligne', motif: null },
  { id: id(21), a: T, de: 'administration', type: 'litige_decide', ref: 'BLV-00005', issue: 'client', motif: 'Photos de la boîte abîmée au retrait.', contesterAvant: T + 48 * HEURE },
  { id: id(22), a: T, de: 'administration', type: 'sanction', decisionId: 'd-1', niveau: 1, motif: 'Deux préparations en retard en 7 jours.', contesterAvant: null },
  { id: id(23), a: T, de: 'administration', type: 'versement', payoutId: 'p-0925', montant: 17840, le: yaounde(2026, 10, 17, 9) },
]

export const EXEMPLES_SORTANTS: EvenementSortant[] = [
  { id: id(101), a: T, vers: ['client', 'livreur'], type: 'prete', ref: 'BLV-00008', at: T },
  { id: id(102), a: T, vers: ['client', 'administration'], type: 'rupture', ref: 'BLV-00008', stockAZero: true },
  { id: id(103), a: T, vers: ['client', 'livreur'], type: 'delai', ref: 'BLV-00008', nouvelleEcheance: T + 8 * HEURE },
  { id: id(104), a: T, vers: ['livreur'], type: 'colis_non_pret', ref: 'BLV-00008', raison: 'en_cours', prochainCreneau: true },
  { id: id(105), a: T, vers: ['livreur'], type: 'code_affiche', ref: 'BLV-00007' },
  { id: id(106), a: T, vers: ['livreur'], type: 'nouveau_code', ref: 'BLV-00007' },
  { id: id(107), a: T, vers: ['client'], type: 'message', fil: 'f-00007', texte: 'Le livreur passe entre 14 h et 16 h.' },
  { id: id(108), a: T, vers: ['client'], type: 'reponse_question', questionId: 'q-12', texte: 'Oui, chargeur 10 W dans la boîte.' },
  { id: id(109), a: T, vers: ['administration'], type: 'reponse_avis', avisId: 'a-00002', texte: 'Merci, nous changeons d’emballage.' },
  { id: id(110), a: T, vers: ['client', 'administration'], type: 'reponse_litige', ref: 'BLV-00005', posture: 'conteste' },
  { id: id(111), a: T, vers: ['administration'], type: 'preuve_litige', ref: 'BLV-00005', pieces: 2 },
  { id: id(112), a: T, vers: ['client', 'administration'], type: 'inspection_retour', ref: 'BLV-00006', verdict: 'conforme' },
  { id: id(113), a: T, vers: ['client'], type: 'remplacement_propose', ref: 'BLV-00006' },
  { id: id(114), a: T, vers: ['administration'], type: 'demande_modification', demandeId: 'dm-2', champ: 'officiel' },
  { id: id(115), a: T, vers: ['administration'], type: 'lieu', lieuId: 'l-2', action: 'ajoute' },
  { id: id(116), a: T, vers: ['administration'], type: 'kyc_pieces', etape: 'pieces' },
  { id: id(117), a: T, vers: ['administration'], type: 'contestation', decisionId: 'd-1' },
  { id: id(118), a: T, vers: ['administration'], type: 'fermeture', jusqua: yaounde(2026, 10, 14, 8) },
]
