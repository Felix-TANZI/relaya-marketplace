// DONNÉES DE DÉMONSTRATION — le jeu d'essai de la console, celui des SIX espaces vus d'en haut, le mardi 13 octobre 2026
// à 14 h 05 (Yaoundé ; même instant que l'entreprise et le livreur). Cohérent avec les démonstrations existantes :
// - client (site/src/demo) : commandes BLV-5xxxx retirées au Relais Mvog-Ada ;
// - vendeur (espace-vendeur/src/demo) : « Tonton PG », Franck Penga, Mvog-Mbi (Z10), Bronze, Trust Score 62,7,
//   commandes BLV-00001 à 00014 (dont les colis de la tournée de Serge) ;
// - entreprise (espace-entreprise/src/demo) : Yafé Express (Mokolo, pilote jour 23 sur 30, palier Nouveau, Gaëlle
//   Wankeu propriétaire) et ses livreurs (Serge A., Josiane E., Kevin D., Hervé F. en activation…) ;
// - livreur (espace-livreur/src/demo) : Serge Atangana, paquet PQ-Z1-261013-003 vers le Relais Bastos Carrefour ;
// - relais (prototype du paquet 4) : Relais Bastos Carrefour, gérante Rose Mbarga.
// Volume d'une marketplace qui démarre à Yaoundé : 4 zones exploitées sur 12. Ce sont des DONNÉES (seules les règles
// comptent) ; aucun délai, seuil ni plafond n'est écrit ici (src/calculs/registre.ts).
import type { CodeZone, Role } from '../donnees/communs'
import type { Agent } from '../donnees/domaines/session'
import { HEURE, JOUR, MINUTE } from '../calculs/temps'
import { ZONES_YAOUNDE } from '../calculs/zones'
import { REFERENCE } from './horloge'

export const T = (minutes: number) => REFERENCE + minutes * MINUTE
export { HEURE, JOUR }

/** Mot de passe d'essai, le même que les autres démonstrations. */
export const MOT_DE_PASSE_DEMO = 'Belivay2026'

export const PAYS = { code: 'CM', nom: 'Cameroun', devise: 'XAF', ville: 'Yaoundé', zonesTotal: 12 }

/** Les douze zones de Yaoundé : code et nom court de la carte (src/calculs/zones.ts) ; exploitées : registre. */
export const ZONES: { code: CodeZone; nom: string }[] = ZONES_YAOUNDE.map((z) => ({ code: z.code, nom: z.nom }))

const appareil = (id: string, nom: string, minutes: number, courant = false) => ({ id, nom, vuLe: T(-minutes), courant })

/** Agents de la console (ADM-01 § 11 « qui au lancement », plus les rôles ajoutés par A-01). */
export const AGENTS: Agent[] = [
  { id: 'a-franck', prenom: 'Franck', nom: 'Penga', initiales: 'FP', roles: ['superviseur', 'mediation'], zones: null, telephone: '+237 6•• •• •• 17', email: 'franck@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-1', 'Ordinateur · Chrome · Yaoundé', 0, true), appareil('ap-2', 'Téléphone · Android · Yaoundé', 190)] },
  { id: 'a-nadege', prenom: 'Nadège', nom: 'Eyenga', initiales: 'NE', roles: ['finance'], zones: null, telephone: '+237 6•• •• •• 41', email: 'nadege@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-3', 'Ordinateur · Edge · Bastos', 0, true)] },
  { id: 'a-clarisse', prenom: 'Clarisse', nom: 'Mvondo', initiales: 'CM', roles: ['support'], zones: null, telephone: '+237 6•• •• •• 63', email: 'clarisse@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-4', 'Ordinateur · Chrome · Mokolo', 0, true)] },
  // Médiateur senior « à désigner » (ADM-01) : un agent nommé de démonstration, désignation à confirmer.
  { id: 'a-mireille', prenom: 'Mireille', nom: 'Ngo Bassong', initiales: 'MN', roles: ['mediation'], zones: null, telephone: '+237 6•• •• •• 08', email: 'mireille@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-5', 'Ordinateur · Firefox · Yaoundé', 0, true)], note: 'Désignation à confirmer' },
  { id: 'a-yannick', prenom: 'Yannick', nom: 'Owona', initiales: 'YO', roles: ['operations'], zones: ['Z1', 'Z2', 'Z3', 'Z6'], telephone: '+237 6•• •• •• 92', email: 'yannick@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-6', 'Tablette · Android · Melen', 0, true)] },
  { id: 'a-armand', prenom: 'Armand', nom: 'Kouam', initiales: 'AK', roles: ['verification'], zones: null, telephone: '+237 6•• •• •• 35', email: 'armand@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-7', 'Ordinateur · Chrome · Bastos', 0, true)], note: 'Agent de démonstration' },
  { id: 'a-beatrice', prenom: 'Béatrice', nom: 'Essomba', initiales: 'BE', roles: ['audit'], zones: null, telephone: '+237 6•• •• •• 76', email: 'beatrice@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-8', 'Ordinateur · Safari · Yaoundé', 0, true)], note: 'Agent de démonstration' },
  { id: 'a-stephane', prenom: 'Stéphane', nom: 'Tchoua', initiales: 'ST', roles: ['terrain'], zones: ['Z1', 'Z3'], telephone: '+237 6•• •• •• 24', email: 'stephane@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-9', 'Téléphone · Android · Mokolo', 0, true)], note: 'Binôme de Linda Abena' },
  { id: 'a-linda', prenom: 'Linda', nom: 'Abena', initiales: 'LA', roles: ['terrain'], zones: ['Z2', 'Z6'], telephone: '+237 6•• •• •• 59', email: 'linda@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-10', 'Téléphone · Android · Biyem-Assi', 30, true)], note: 'Binôme de Stéphane Tchoua' },
  { id: 'a-pauline', prenom: 'Pauline', nom: 'Manga', initiales: 'PM', roles: ['rh'], zones: null, telephone: '+237 6•• •• •• 41', email: 'pauline@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-11', 'Ordinateur · Chrome · Yaoundé', 0, true)], note: 'Agent de démonstration (ressources humaines)' },
  // Équipes de la console (logique-metier/ACCES-CONSOLE.md) : au moins un Responsable et un Agent par équipe, un Senior là
  // où il sert (plafonds plus hauts, premier validateur). Noms inventés.
  { id: 'a-helene', prenom: 'Hélène', nom: 'Abessolo', initiales: 'HA', roles: ['superviseur'], zones: null, telephone: '+237 6•• •• •• 02', email: 'helene@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-12', 'Ordinateur · Edge · Yaoundé', 50, true)] },
  { id: 'a-thierry', prenom: 'Thierry', nom: 'Mbida', initiales: 'TM', roles: ['mediation', 'support'], zones: null, telephone: '+237 6•• •• •• 14', email: 'thierry@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-13', 'Ordinateur · Chrome · Essos', 15, true)] },
  { id: 'a-sandrine', prenom: 'Sandrine', nom: 'Eboa', initiales: 'SE', roles: ['mediation', 'support'], zones: null, telephone: '+237 6•• •• •• 27', email: 'sandrine@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-14', 'Ordinateur · Firefox · Nlongkak', 40, true)] },
  { id: 'a-patrice', prenom: 'Patrice', nom: 'Ewane', initiales: 'PE', roles: ['support'], zones: null, telephone: '+237 6•• •• •• 38', email: 'patrice@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-15', 'Ordinateur · Chrome · Bastos', 5, true)] },
  { id: 'a-aicha', prenom: 'Aïcha', nom: 'Bouba', initiales: 'AB', roles: ['support'], zones: null, telephone: '+237 6•• •• •• 45', email: 'aicha@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-16', 'Ordinateur · Chrome · Mimboman', 25, true)] },
  { id: 'a-paul', prenom: 'Paul', nom: 'Ndongo', initiales: 'PN', roles: ['support'], zones: null, telephone: '+237 6•• •• •• 50', email: 'paul@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-17', 'Ordinateur · Chrome · Essos', 118 * 24 * 60)] },
  { id: 'a-estelle', prenom: 'Estelle', nom: 'Fotso', initiales: 'EF', roles: ['verification'], zones: null, telephone: '+237 6•• •• •• 53', email: 'estelle@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-18', 'Ordinateur · Safari · Bastos', 60, true)] },
  { id: 'a-boris', prenom: 'Boris', nom: 'Tchinda', initiales: 'BT', roles: ['finance'], zones: null, telephone: '+237 6•• •• •• 66', email: 'boris@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-19', 'Ordinateur · Edge · Bastos', 10, true)] },
  { id: 'a-rodrigue', prenom: 'Rodrigue', nom: 'Nana', initiales: 'RN', roles: ['terrain'], zones: ['Z1', 'Z3', 'Z6'], telephone: '+237 6•• •• •• 71', email: 'rodrigue@belivay.com', secondFacteur: 'sms', appareils: [appareil('ap-20', 'Téléphone · Android · Mokolo', 35, true)] },
  { id: 'a-gaston', prenom: 'Gaston', nom: 'Mendo', initiales: 'GM', roles: ['audit'], zones: null, telephone: '+237 6•• •• •• 83', email: 'gaston@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-21', 'Ordinateur · Firefox · Yaoundé', 35 * 24 * 60)] },
  { id: 'a-josue', prenom: 'Josué', nom: 'Bekolo', initiales: 'JB', roles: ['rh'], zones: null, telephone: '+237 6•• •• •• 97', email: 'josue@belivay.com', secondFacteur: 'application', appareils: [appareil('ap-22', 'Ordinateur · Chrome · Yaoundé', 90, true)] },
]

/** Agent connecté par « ?role=<code> » (démonstration du double contrôle : chaque rôle, une personne). */
export const AGENT_DU_ROLE: Record<Role, string> = {
  superviseur: 'a-franck', finance: 'a-nadege', support: 'a-clarisse', mediation: 'a-mireille',
  operations: 'a-yannick', verification: 'a-armand', audit: 'a-beatrice', terrain: 'a-stephane', rh: 'a-pauline',
}
export const agent = (id: string): Agent => AGENTS.find((a) => a.id === id) ?? AGENTS[0]
export const nomAgent = (a: Agent) => `${a.prenom} ${a.nom}`

// ── Logistique ────────────────────────────────────────────────────────────────────────────────────────────────────
export const RELAIS = [
  { id: 'r-bastos', nom: 'Relais Bastos Carrefour', gerant: 'Rose Mbarga', zone: 'Z1', capacite: 120, occupes: 87, statut: 'actif' as const },
  { id: 'r-nlongkak', nom: 'Relais Nlongkak Pharmacie', gerant: 'Didier Ateba', zone: 'Z1', capacite: 80, occupes: 31, statut: 'actif' as const },
  { id: 'r-mokolo', nom: 'Relais Mokolo Marché', gerant: 'Hortense Biloa', zone: 'Z3', capacite: 150, occupes: 142, statut: 'sature' as const },
  { id: 'r-elobi', nom: 'Relais Elobi', gerant: 'Jean-Claude Noah', zone: 'Z3', capacite: 60, occupes: 22, statut: 'actif' as const },
  { id: 'r-melen', nom: 'Relais Melen Université', gerant: 'Patricia Fouda', zone: 'Z6', capacite: 100, occupes: 54, statut: 'actif' as const },
  { id: 'r-obili', nom: 'Relais Obili', gerant: 'Samuel Etoga', zone: 'Z2', capacite: 70, occupes: 0, statut: 'en_activation' as const },
  { id: 'r-biyem', nom: 'Relais Biyem-Assi Lycée', gerant: 'Christelle Manga', zone: 'Z6', capacite: 90, occupes: 61, statut: 'actif' as const },
  { id: 'r-mvogada', nom: 'Relais Mvog-Ada', gerant: 'Bernard Onana', zone: 'Z9', capacite: 60, occupes: 18, statut: 'actif' as const },
]

export const ENTREPRISES = [
  { id: 'e-yafe', nom: 'Yafé Express', quartier: 'Mokolo', zones: ['Z1', 'Z2', 'Z3', 'Z6'], livreurs: 21, palier: 'Nouveau' as const, statut: 'pilote' as const },
  { id: 'e-mboa', nom: 'Mboa Logistique', quartier: 'Biyem-Assi', zones: ['Z2', 'Z6'], livreurs: 9, palier: 'Nouveau' as const, statut: 'pilote' as const },
  { id: 'e-rapide', nom: 'Rapide Colis Yaoundé', quartier: 'Bastos', zones: ['Z1'], livreurs: 4, palier: 'Nouveau' as const, statut: 'restreint' as const },
]

export const LIVREURS = [
  { id: 'l-serge', nom: 'Serge A.', entreprise: 'Yafé Express', zones: ['Z1', 'Z3'], statut: 'actif' as const },
  { id: 'l-josiane', nom: 'Josiane E.', entreprise: 'Yafé Express', zones: ['Z3'], statut: 'actif' as const },
  { id: 'l-kevin', nom: 'Kevin D.', entreprise: 'Yafé Express', zones: ['Z6'], statut: 'actif' as const },
  { id: 'l-herve', nom: 'Hervé F.', entreprise: 'Yafé Express', zones: ['Z1'], statut: 'en_activation' as const },
  { id: 'l-junior', nom: 'Junior T.', entreprise: 'Yafé Express', zones: ['Z3', 'Z6'], statut: 'actif' as const },
  { id: 'l-ines', nom: 'Inès K.', entreprise: 'Yafé Express', zones: ['Z6'], statut: 'actif' as const },
  { id: 'l-brice', nom: 'Brice N.', entreprise: 'Yafé Express', zones: ['Z1', 'Z3'], statut: 'actif' as const },
  { id: 'l-armel', nom: 'Armel B.', entreprise: 'Mboa Logistique', zones: ['Z2', 'Z6'], statut: 'actif' as const },
  { id: 'l-flore', nom: 'Flore N.', entreprise: 'Mboa Logistique', zones: ['Z6'], statut: 'actif' as const },
  { id: 'l-cedric', nom: 'Cédric M.', entreprise: 'Rapide Colis Yaoundé', zones: ['Z1'], statut: 'suspendu' as const },
]

export const PAQUETS = [
  { id: 'PQ-Z1-261013-003', zone: 'Z1', genre: 'relais' as const, entreprise: 'Yafé Express', livreur: 'Serge A.', colis: 5, heureLimite: T(175), etat: 'en_route' as const },
  { id: 'PQ-Z3-261013-007', zone: 'Z3', genre: 'relais' as const, entreprise: 'Yafé Express', livreur: 'Josiane E.', colis: 8, heureLimite: T(115), etat: 'en_route' as const },
  { id: 'PQ-Z6-261013-002', zone: 'Z6', genre: 'domicile' as const, entreprise: 'Yafé Express', livreur: 'Kevin D.', colis: 1, heureLimite: T(-20), etat: 'en_retard' as const },
  { id: 'PQ-Z6-261013-004', zone: 'Z6', genre: 'relais' as const, entreprise: 'Mboa Logistique', livreur: 'Flore N.', colis: 6, heureLimite: T(160), etat: 'accepte' as const },
  { id: 'PQ-Z3-261013-009', zone: 'Z3', genre: 'retour' as const, entreprise: null, livreur: null, colis: 2, heureLimite: T(240), etat: 'publie' as const },
  { id: 'PQ-Z1-261013-005', zone: 'Z1', genre: 'domicile' as const, entreprise: 'Yafé Express', livreur: 'Brice N.', colis: 1, heureLimite: T(90), etat: 'incident' as const },
  { id: 'PQ-Z6-261013-001', zone: 'Z6', genre: 'relais' as const, entreprise: 'Yafé Express', livreur: 'Junior T.', colis: 7, heureLimite: T(-60), etat: 'livre' as const },
  { id: 'PQ-Z6-261013-003', zone: 'Z6', genre: 'relais' as const, entreprise: 'Yafé Express', livreur: 'Inès K.', colis: 4, heureLimite: T(-30), etat: 'livre' as const },
]

// ── Vendeurs, clients, commandes ───────────────────────────────────────────────────────────────────────────────────
export const VENDEURS = [
  // Tonton PG est tenu par Franck Penga, aussi agent Direction de la console : ses dossiers vont à un autre agent.
  { id: 'v-tontonpg', nom: 'Tonton PG', titulaire: 'Franck Penga', zone: 'Z10', palier: 'Bronze' as const, trustScore: 62.7, statut: 'actif' as const, lieAgent: 'a-franck' },
  { id: 'v-maman-wax', nom: 'Maman Wax Mokolo', titulaire: 'Jacqueline Mballa', zone: 'Z3', palier: 'Argent' as const, trustScore: 78.4, statut: 'actif' as const },
  { id: 'v-techno', nom: 'Techno Bastos', titulaire: 'Ibrahim Moussa', zone: 'Z1', palier: 'Or' as const, trustScore: 88.1, statut: 'actif' as const },
  { id: 'v-saveurs', nom: 'Saveurs du Pays', titulaire: 'Odile Nkoulou', zone: 'Z6', palier: 'Bronze' as const, trustScore: 55.2, statut: 'en_revue' as const },
  { id: 'v-beaute', nom: 'Beauté Melen', titulaire: 'Carole Tsogo', zone: 'Z6', palier: 'Argent' as const, trustScore: 74.0, statut: 'actif' as const },
  { id: 'v-pieces', nom: 'Pièces Auto Biyem', titulaire: 'Rodrigue Ekani', zone: 'Z6', palier: 'Bronze' as const, trustScore: 41.8, statut: 'suspendu' as const },
]

/** Clients : toujours masqués dans la console tant qu'un démasquage motivé n'a pas eu lieu. */
export const CLIENTS = [
  { id: 'c-4217', masque: 'Client ••• 4217', telephone: '+237677124217', zone: 'Z9' },
  { id: 'c-0388', masque: 'Client ••• 0388', telephone: '+237699310388', zone: 'Z1' },
  { id: 'c-7731', masque: 'Client ••• 7731', telephone: '+237655907731', zone: 'Z3' },
  { id: 'c-2954', masque: 'Client ••• 2954', telephone: '+237690452954', zone: 'Z6' },
  { id: 'c-6120', masque: 'Client ••• 6120', telephone: '+237677886120', zone: 'Z6' },
]
export const masquerTelephone = (t: string) => `+237 ${t.slice(4, 5)}•• •• •• ${t.slice(-2)}`

export const COMMANDES = [
  { ref: 'BLV-52107', client: 'c-4217', vendeurs: ['Techno Bastos', 'Tonton PG'], relais: 'Relais Mvog-Ada', zone: 'Z9', total: 180280, payeeLe: T(-19 * JOUR / MINUTE), etat: 'preparation' as const },
  { ref: 'BLV-52089', client: 'c-4217', vendeurs: ['Maman Wax Mokolo'], relais: 'Relais Mvog-Ada', zone: 'Z9', total: 36080, payeeLe: T(-20 * JOUR / MINUTE), etat: 'en_route' as const },
  { ref: 'BLV-51877', client: 'c-4217', vendeurs: ['Tonton PG'], relais: 'Relais Mvog-Ada', zone: 'Z9', total: 16700, payeeLe: T(-23 * JOUR / MINUTE), etat: 'litige' as const },
  { ref: 'BLV-00008', client: 'c-0388', vendeurs: ['Tonton PG'], relais: 'Relais Bastos Carrefour', zone: 'Z1', total: 20900, payeeLe: T(-26 * 60), etat: 'en_route' as const },
  { ref: 'BLV-00009', client: 'c-0388', vendeurs: ['Tonton PG'], relais: 'Relais Bastos Carrefour', zone: 'Z1', total: 14900, payeeLe: T(-25 * 60), etat: 'en_route' as const },
  { ref: 'BLV-00011', client: 'c-7731', vendeurs: ['Tonton PG'], relais: 'Relais Bastos Carrefour', zone: 'Z1', total: 4900, payeeLe: T(-22 * 60), etat: 'en_route' as const },
  { ref: 'BLV-52230', client: 'c-7731', vendeurs: ['Maman Wax Mokolo'], relais: 'Relais Mokolo Marché', zone: 'Z3', total: 28900, payeeLe: T(-3 * 60), etat: 'au_relais' as const },
  { ref: 'BLV-52241', client: 'c-2954', vendeurs: ['Beauté Melen'], relais: null, zone: 'Z6', total: 12400, payeeLe: T(-5 * 60), etat: 'en_route' as const },
  { ref: 'BLV-52245', client: 'c-6120', vendeurs: ['Pièces Auto Biyem'], relais: 'Relais Biyem-Assi Lycée', zone: 'Z6', total: 64500, payeeLe: T(-6 * 60), etat: 'payee' as const },
  { ref: 'BLV-52198', client: 'c-2954', vendeurs: ['Saveurs du Pays'], relais: 'Relais Melen Université', zone: 'Z6', total: 9800, payeeLe: T(-2 * JOUR / MINUTE), etat: 'retiree' as const },
  { ref: 'BLV-52150', client: 'c-6120', vendeurs: ['Techno Bastos'], relais: 'Relais Biyem-Assi Lycée', zone: 'Z6', total: 112000, payeeLe: T(-4 * JOUR / MINUTE), etat: 'remboursee' as const },
]

export const LITIGES = [
  { id: 'LT-0412', commande: 'BLV-51877', niveau: 1 as const, motif: 'Article différent de la photo', client: 'c-4217', vendeur: 'Tonton PG', zone: 'Z9', montantEnJeu: 16700, ouvertLe: T(-20 * JOUR / MINUTE), echeance: T(4 * 60), etat: 'instruction' as const },
  { id: 'LT-0418', commande: 'BLV-52230', niveau: 1 as const, motif: 'Colis abîmé au comptoir', client: 'c-7731', vendeur: 'Maman Wax Mokolo', zone: 'Z3', montantEnJeu: 28900, ouvertLe: T(-90), echeance: T(22 * 60), etat: 'ouvert' as const },
  { id: 'LT-0405', commande: 'BLV-52150', niveau: 2 as const, motif: 'Recours du vendeur après remboursement', client: 'c-6120', vendeur: 'Techno Bastos', zone: 'Z6', montantEnJeu: 112000, ouvertLe: T(-3 * JOUR / MINUTE), echeance: T(20 * 60), etat: 'recours' as const },
]

