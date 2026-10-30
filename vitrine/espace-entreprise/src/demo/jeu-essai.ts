// DONNÉES DE DÉMONSTRATION — le jeu d'essai de l'entreprise de livraison (prototype ENT : Yafé Express, Mokolo,
// une vingtaine de livreurs, 4 zones exploitées, pilote jour 23 sur 30, palier Nouveau). Les chiffres sont des DONNÉES de démonstration
// (mémoire du porteur : seules les règles comptent) ; les délais, plafonds et seuils viennent du registre
// (src/calculs/registre.ts), jamais d'ici. Instants posés par rapport à REFERENCE (horloge.ts).
import type { LivreurCourt, Role } from '../donnees/communs'
import { HEURE, JOUR, MINUTE, yaounde } from '../calculs/temps'
import { REFERENCE } from './horloge'

export const T = (minutes: number) => REFERENCE + minutes * MINUTE
export { HEURE, JOUR }

// Pilote commencé le lundi 21 septembre à 7 h 30 (jour 23 sur 30 ce mardi 13 octobre) : trois semaines de trafic et de règlements.
export const ENTREPRISE = { id: 'ent-yafe', nom: 'Yafé Express', quartier: 'Mokolo', debutPilote: yaounde(2026, 9, 21, 7, 30), palier: 'Nouveau' as const }

export const UTILISATEURS: { id: string; prenom: string; nom: string; initiales: string; role: Role; telephone: string; email: string }[] = [
  { id: 'u-gaelle', prenom: 'Gaëlle', nom: 'Wankeu', initiales: 'GW', role: 'proprietaire', telephone: '+237677000001', email: 'gaelle@yafeexpress.cm' },
  { id: 'u-serge', prenom: 'Serge', nom: 'Mbarga', initiales: 'SM', role: 'repartiteur', telephone: '+237677000002', email: 'serge@yafeexpress.cm' },
  { id: 'u-aline', prenom: 'Aline', nom: 'Fotso', initiales: 'AF', role: 'comptable', telephone: '+237677000003', email: 'aline@yafeexpress.cm' },
  // Gérante : employeur délégué des livreurs (contrats, essai, discipline, congés) et toute l'exploitation.
  { id: 'u-martine', prenom: 'Martine', nom: 'Essomba', initiales: 'ME', role: 'gerant', telephone: '+237677000004', email: 'martine@yafeexpress.cm' },
]
/** Mot de passe d'essai, le même que les démonstrations du client et du vendeur. */
export const MOT_DE_PASSE_DEMO = 'Belivay2026'

export const ZONES = [
  // Les quatre zones exploitées au lancement (ZONES-EXPLOITEES, DP-70 ; noms : logique-metier/livraison/zones-yaounde.geo.json).
  { code: 'Z1', nom: 'Centre-ville', exploitee: true },
  { code: 'Z2', nom: 'Nsam', exploitee: true },
  { code: 'Z3', nom: 'Mokolo', exploitee: true },
  { code: 'Z6', nom: 'Biyem-Assi', exploitee: true },
]

export const LIVREURS: (LivreurCourt & { telephone: string; zones: string[] })[] = [
  { id: 'l-junior', nom: 'Junior T.', initiales: 'JT', vehicule: 'moto', telephone: '+237690112233', zones: ['Z3', 'Z2'] },
  { id: 'l-brice', nom: 'Brice N.', initiales: 'BN', vehicule: 'moto', telephone: '+237690223344', zones: ['Z1', 'Z3'] },
  { id: 'l-paul', nom: 'Paul E.', initiales: 'PE', vehicule: 'tricycle', telephone: '+237690334455', zones: ['Z2', 'Z6'] },
  { id: 'l-ines', nom: 'Inès K.', initiales: 'IK', vehicule: 'moto', telephone: '+237690445566', zones: ['Z6'] },
  { id: 'l-hugo', nom: 'Hugo M.', initiales: 'HM', vehicule: 'voiture', telephone: '+237690556677', zones: ['Z1', 'Z3', 'Z2', 'Z6'] },
  // Hervé : en activation (le compte « herve » de l'espace livreur, même numéro) ; Serge : le livreur de démonstration
  // de l'espace livreur (compte « serge », moto CE 482 KM, Bastos et Mokolo), en tournée sur PQ-Z1-261013-003.
  { id: 'l-herve', nom: 'Hervé F.', initiales: 'HF', vehicule: 'moto', telephone: '+237699458103', zones: ['Z1'] },
  { id: 'l-serge', nom: 'Serge A.', initiales: 'SA', vehicule: 'moto', telephone: '+237677510827', zones: ['Z1', 'Z3'] },
  // Le reste de la flotte (trafic normal : une vingtaine de livreurs, statuts variés ; src/demo/livreurs.ts, PROFILS).
  { id: 'l-aime', nom: 'Aimé O.', initiales: 'AO', vehicule: 'moto', telephone: '+237690667701', zones: ['Z3'] },
  { id: 'l-carine', nom: 'Carine M.', initiales: 'CM', vehicule: 'moto', telephone: '+237690667702', zones: ['Z2', 'Z6'] },
  { id: 'l-david', nom: 'David N.', initiales: 'DN', vehicule: 'tricycle', telephone: '+237690667703', zones: ['Z3', 'Z2'] },
  { id: 'l-estelle', nom: 'Estelle K.', initiales: 'EK', vehicule: 'moto', telephone: '+237690667704', zones: ['Z1'] },
  { id: 'l-fabrice', nom: 'Fabrice T.', initiales: 'FT', vehicule: 'voiture', telephone: '+237690667705', zones: ['Z1', 'Z6'] },
  { id: 'l-gilles', nom: 'Gilles A.', initiales: 'GA', vehicule: 'moto', telephone: '+237690667706', zones: ['Z6'] },
  { id: 'l-josiane', nom: 'Josiane E.', initiales: 'JE', vehicule: 'moto', telephone: '+237690667707', zones: ['Z3'] },
  { id: 'l-kevin', nom: 'Kevin D.', initiales: 'KD', vehicule: 'moto', telephone: '+237690667708', zones: ['Z2'] },
  { id: 'l-olivier', nom: 'Olivier P.', initiales: 'OP', vehicule: 'moto', telephone: '+237690667709', zones: ['Z2', 'Z3'] },
  { id: 'l-rose', nom: 'Rose T.', initiales: 'RT', vehicule: 'voiture', telephone: '+237690667710', zones: ['Z1'] },
  { id: 'l-landry', nom: 'Landry F.', initiales: 'LF', vehicule: 'tricycle', telephone: '+237690667711', zones: ['Z6'] },
  { id: 'l-marius', nom: 'Marius K.', initiales: 'MK', vehicule: 'moto', telephone: '+237690667712', zones: ['Z1'] },
  { id: 'l-nadege', nom: 'Nadège O.', initiales: 'NO', vehicule: 'moto', telephone: '+237690667713', zones: ['Z3'] },
  { id: 'l-thierry', nom: 'Thierry W.', initiales: 'TW', vehicule: 'moto', telephone: '+237690667714', zones: ['Z6'] },
]
/** Ancienneté chez Yafé Express (jours depuis l'activation ; absent : en activation). Lue par la fiche (livreurs.ts) et
 * par les prestations des semaines passées (prestations.ts). */
export const ACTIF_DEPUIS_JOURS: Record<string, number> = {
  'l-junior': 40, 'l-brice': 47, 'l-paul': 54, 'l-ines': 61, 'l-hugo': 68, 'l-serge': 19, 'l-aime': 33, 'l-carine': 75, 'l-david': 82,
  'l-estelle': 26, 'l-fabrice': 96, 'l-gilles': 38, 'l-josiane': 71, 'l-kevin': 29, 'l-olivier': 44, 'l-rose': 89, 'l-landry': 57, 'l-eric': 103,
}
export const livreurCourt = (id: string): LivreurCourt => {
  const l = LIVREURS.find((x) => x.id === id)!
  return { id: l.id, nom: l.nom, initiales: l.initiales, vehicule: l.vehicule }
}
