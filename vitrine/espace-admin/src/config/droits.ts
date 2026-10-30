// Droits de la console, PAR PAGE et PAR RÔLE, écrits UNE fois : la matrice « Droits page par page » d'ADM-01 (§ 11,
// statut Δ : déduite des règles), ajustée par A-VALIDER A-01 (Proposé) :
// - huit rôles au lieu de six : la KYC, le catalogue, la modération et les avis passent du Support à la Vérification
//   (une même personne ne répond pas au vendeur ET ne valide pas son identité) ; le Support les garde en lecture ;
// - fraude : Direction, Médiation et Audit ; Support en lecture ;
// - Audit (conformité) : lecture partout où il y a une trace à contrôler, plein accès au journal, aux exports et à la
//   fraude ; jamais l'argent ni une décision ;
// - Médiation : la colonne « Médiateur » d'ADM-01 (litiges niveau 2, recours, sanctions, paliers « Support senior »).
// Niveaux : « oui » (lecture et gestes de la page), « lecture » (aucun geste), « zone » (lecture et gestes limités aux
// zones de l'agent, exports compris : ADM-ROL-03), « part » (une partie seulement : la note dit laquelle), « aucun »
// (la page n'apparaît pas et la source répond 403). Une action à quatre yeux reste soumise au second validateur, quel
// que soit le rôle. Les GESTES transverses (démasquer, contresigner, exporter…) sont dans PERMISSIONS.
// Cette liste explique et sert la navigation ; la source refuse de toute façon (src/demo/acces.ts : exiger).
import type { Role } from '../donnees/communs'
import type { Niveau } from '../donnees/domaines/equipe'

export type Acces = 'oui' | 'lecture' | 'zone' | 'part' | 'aucun'
export interface Droit {
  acces: Acces
  note?: string // ce que couvre « part » ou « zone » (« Niveau 1 », « Photos de local »…)
}
type Case = Acces | [Acces, string]

// Ordre des colonnes : superviseur, finance, support, mediation, operations, verification, audit, terrain, rh.
const COLONNES: Role[] = ['superviseur', 'finance', 'support', 'mediation', 'operations', 'verification', 'audit', 'terrain', 'rh']
const TOUS: Case[] = ['oui', 'oui', 'oui', 'oui', 'oui', 'oui', 'oui', 'oui', 'oui']

const MATRICE: Record<string, Case[]> = {
  // Socle
  connexion: TOUS,
  activation: TOUS,
  menu: TOUS,
  profil: TOUS,
  recherche: ['oui', 'oui', 'oui', 'oui', 'oui', 'oui', 'oui', 'oui', ['part', 'Employés de la console']],
  // ADM-03, ADM-04 (et la vue d'ensemble ajoutée)
  direct: ['oui', ['part', 'Argent'], ['part', 'Litiges et messages'], ['part', 'Litiges niveau 2'], ['zone', 'Sa zone'], ['part', 'Vérifications'], 'lecture', 'aucun', 'aucun'],
  file: ['oui', ['part', 'Cartes d’argent'], ['part', 'Litiges niveau 1, messages'], ['part', 'Recours et niveau 2'], ['zone', 'Sa zone'], ['part', 'KYC, modération, avis'], ['part', 'Alertes de fraude et contrôles'], 'aucun', ['part', 'Comptes, accès, arrivées et départs des employés']],
  litige: ['oui', 'aucun', ['part', 'Niveau 1'], ['part', 'Niveau 2 et recours'], ['zone', 'Constats des relais de sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  // Poste de décision (DECISIONS-ENCADREES.md) : chaque rôle n'y voit que les dossiers qu'il tranche.
  postes: ['oui', ['part', 'Remboursements'], ['part', 'Signalements'], ['part', 'Sanctions, retenues de kit, signalements'], ['zone', 'Constats des relais de sa zone'], ['part', 'Vérification d’identité'], 'lecture', 'aucun', 'aucun'],
  commandes: ['oui', ['oui', 'Exécution (argent)'], ['lecture', 'Téléphone du client démasqué sur motif, journalisé'], 'lecture', ['zone', 'Lecture, sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-05
  escrow: ['oui', ['oui', 'Exécution'], 'lecture', 'lecture', ['zone', 'Lecture, sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  remboursements: ['oui', ['oui', 'Exécution ; second validateur au-delà du seuil'], ['lecture', 'Premier validateur au-delà du seuil'], ['part', 'Premier validateur au-delà du seuil'], 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  versements: [['part', 'Validation des exceptions'], ['oui', 'Exécution'], 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  rapprochement: ['oui', 'oui', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-06
  kyc: ['oui', 'aucun', 'lecture', 'aucun', ['zone', 'Visites, sa zone'], 'oui', 'lecture', ['part', 'Photos de local'], 'aucun'],
  vendeurs: ['oui', 'aucun', 'oui', 'aucun', ['zone', 'Sa zone'], 'lecture', 'lecture', 'aucun', 'aucun'],
  paliers: ['oui', 'aucun', 'aucun', ['oui', 'Support senior des règles'], 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  sanctions: ['oui', 'aucun', ['part', 'Proposer'], ['oui', 'Décider, recours'], 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-07
  catalogue: ['oui', 'aucun', 'lecture', 'aucun', 'aucun', 'oui', 'lecture', ['part', 'Proposer (saisie assistée)'], 'aucun'],
  moderation: ['oui', 'aucun', 'lecture', 'aucun', 'aucun', 'oui', 'lecture', 'aucun', 'aucun'],
  avis: ['oui', 'aucun', 'lecture', ['part', 'Retrait motivé'], 'aucun', 'oui', 'lecture', 'aucun', 'aucun'],
  clients: ['oui', ['lecture', 'Lecture des remboursements'], 'oui', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-08
  relais: ['oui', ['part', 'Versements'], 'lecture', 'aucun', ['zone', 'Sa zone'], 'aucun', 'lecture', ['part', 'Recrutement'], 'aucun'],
  entreprises: ['oui', ['part', 'Grilles (lecture), versements'], 'lecture', 'aucun', ['zone', 'Sa zone'], 'aucun', 'lecture', ['part', 'Recrutement'], 'aucun'],
  livreurs: ['oui', 'aucun', 'lecture', ['part', 'Retenues de kit contestées'], ['zone', 'Sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'], // Médiation : ADM-CACHEE-03
  paquets: ['oui', 'aucun', 'lecture', 'aucun', ['zone', 'Sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-09
  zones: ['oui', 'aucun', 'lecture', 'aucun', ['zone', 'Sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  carte: ['oui', 'aucun', 'aucun', 'aucun', ['zone', 'Sa zone'], 'aucun', 'aucun', 'aucun', 'aucun'],
  emballages: ['oui', 'oui', 'aucun', 'aucun', 'oui', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-10
  parametrage: [['oui', 'Proposer et valider'], ['part', 'Proposer ; second validateur des paramètres critiques'], 'aucun', 'aucun', ['zone', 'Proposer, sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  commissions: ['oui', 'oui', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  promotions: ['oui', 'aucun', ['part', 'Contrôle des ventes flash'], 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-11
  messagerie: ['oui', ['part', 'Coûts'], 'oui', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  panne: ['oui', 'aucun', 'aucun', 'aucun', ['zone', 'Sa zone'], 'aucun', 'lecture', 'aucun', 'aucun'],
  support: [['part', 'Contenus'], 'aucun', 'oui', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // ADM-12
  fraude: ['oui', 'aucun', 'lecture', 'oui', 'aucun', 'aucun', 'oui', 'aucun', 'aucun'],
  journal: ['oui', ['part', 'Sa part'], ['part', 'Sa part'], ['part', 'Sa part'], ['part', 'Sa part'], ['part', 'Sa part'], 'oui', ['part', 'Sa part'], ['part', 'Actions des employés (jamais les données des acteurs)']],
  roles: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'oui'],
  pays: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun'],
  comptes: ['oui', 'aucun', 'lecture', 'aucun', 'aucun', ['oui', 'Contrôler'], 'lecture', ['part', 'Saisir (sa tournée)'], ['part', 'Comptes des employés et agents terrain']],
  // ADM-13
  rapports: ['oui', ['part', 'Son périmètre'], ['part', 'Son périmètre'], ['part', 'Son périmètre'], ['zone', 'Sa zone'], ['part', 'Son périmètre'], 'oui', ['part', 'Ses visites'], 'aucun'],
  sante: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun'],
  legal: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  assistant: ['oui', ['part', 'Son périmètre'], ['part', 'Son périmètre'], ['part', 'Son périmètre'], ['zone', 'Sa zone'], ['part', 'Son périmètre'], ['part', 'Son périmètre'], ['part', 'Son périmètre'], 'aucun'],
  // Pages ajoutées (AJ-A, groupe « Console »)
  quatreyeux: ['oui', ['part', 'Argent'], 'aucun', ['part', 'Litiges et sanctions'], 'aucun', ['part', 'KYC et modération'], 'lecture', 'aucun', ['part', 'Comptes et rôles']],
  candidatures: ['oui', 'aucun', 'lecture', 'aucun', ['zone', 'Sa zone'], 'oui', 'lecture', ['part', 'Recrutement'], 'aucun'],
  wallet: ['oui', 'oui', 'lecture', 'lecture', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  'remb-auto': ['oui', 'oui', 'lecture', ['part', 'Retour normal, contrôle d’un vendeur, retrait du droit'], 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  'frais-paiement': ['oui', 'oui', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  export: ['oui', 'oui', 'aucun', 'aucun', 'aucun', 'aucun', 'oui', 'aucun', 'aucun'],
  qualite: ['oui', 'aucun', 'lecture', 'oui', ['zone', 'Sa zone'], 'lecture', 'lecture', 'aucun', 'aucun'],
  interrupteurs: ['oui', ['lecture', 'Second validateur d’une bascule'], 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  modeles: ['oui', 'aucun', 'oui', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  taches: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  conservation: ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // Équipe et accès (logique-metier/ACCES-CONSOLE.md) : fiche d'un membre et « Mon équipe » au Responsable d'équipe
  // (PAGES_NIVEAU) ; descentes terrain planifiées par les Opérations (leurs zones), faites par l'agent terrain.
  membre: ['oui', ['part', 'Son équipe (Responsable d’équipe)'], ['part', 'Son équipe (Responsable d’équipe)'], ['part', 'Son équipe (Responsable d’équipe)'], ['part', 'Son équipe (Responsable d’équipe)'], ['part', 'Son équipe (Responsable d’équipe)'], 'lecture', 'aucun', 'oui'],
  'mon-equipe': ['oui', ['part', 'Responsable d’équipe'], ['part', 'Responsable d’équipe'], ['part', 'Responsable d’équipe'], ['part', 'Responsable d’équipe'], ['part', 'Responsable d’équipe'], ['part', 'Responsable d’équipe'], 'aucun', ['part', 'Responsable d’équipe']],
  descentes: ['oui', 'aucun', 'aucun', 'aucun', ['zone', 'Ses zones'], 'aucun', 'lecture', 'aucun', 'aucun'],
  'mes-descentes': ['oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'oui', 'aucun'],
  'vue-client': ['oui', 'aucun', 'oui', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun', 'aucun'],
  abonnements: ['oui', 'lecture', 'oui', 'lecture', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
  // Contenu du site client : la Direction ; le Marketing (Service client) met en avant les catégories.
  'contenu-site': ['oui', 'aucun', ['part', 'Catégories mises en avant (Marketing)'], 'aucun', 'aucun', 'aucun', 'lecture', 'aucun', 'aucun'],
}

export const DROITS: Record<string, Record<Role, Droit>> = Object.fromEntries(
  Object.entries(MATRICE).map(([route, cases]) => [route, Object.fromEntries(COLONNES.map((r, i) => [r, Array.isArray(cases[i]) ? { acces: cases[i][0], note: cases[i][1] } : { acces: cases[i] as Acces }]))]),
) as Record<string, Record<Role, Droit>>

/** Droit d'un rôle sur une page ; une page absente de la matrice est fermée (jamais ouverte par oubli). */
export function droitDe(route: string, role: Role): Droit {
  return DROITS[route]?.[role] ?? { acces: 'aucun' }
}
export const pageOuverte = (route: string, role: Role) => droitDe(route, role).acces !== 'aucun'
/** Pages réservées à un niveau (logique-metier/ACCES-CONSOLE.md § 1) : « Mon équipe » et la fiche d'un membre au
 *  Responsable d'équipe ; `sauf` : rôles qui les ouvrent à tout niveau (Direction, Accès et personnel, Audit en lecture). */
export const PAGES_NIVEAU: Record<string, { niveaux: Niveau[]; sauf: Role[] }> = {
  'mon-equipe': { niveaux: ['responsable'], sauf: [] },
  membre: { niveaux: ['responsable'], sauf: ['superviseur', 'rh', 'audit'] },
}
/** Page ouverte au rôle ET au niveau de l'agent (null : hors équipe). */
export function pageOuverteNiveau(route: string, role: Role, niveau: Niveau | null): boolean {
  const n = PAGES_NIVEAU[route]
  return pageOuverte(route, role) && (!n || n.sauf.includes(role) || (!!niveau && n.niveaux.includes(niveau)))
}
/** Rôles qui ouvrent une page (message « Réservé à… »). */
export const rolesDe = (route: string): Role[] => COLONNES.filter((r) => pageOuverte(route, r))

// ── Gestes transverses ─────────────────────────────────────────────────────────────────────────────────────────────
export type Permission =
  | 'demasquer'
  | 'piece.consulter'
  | 'contresigner'
  | 'exporter'
  | 'litige.decider'
  | 'remboursement.executer'
  | 'versement.executer'
  | 'kyc.decider'
  | 'parametre.proposer'
  | 'parametre.valider'
  | 'sanction.decider'
  | 'role.attribuer'
  | 'compte.saisir'
  | 'interrupteur.basculer'
  | 'fraude.decider'
  | 'tache.lancer'
  | 'maintenance.programmer'
  | 'legal.publier'

export interface Geste {
  quoi: string
  roles: Role[]
  route?: string // page où le geste s'exerce : ses rôles l'ouvrent forcément (droits.test.ts)
  pourquoi: string // pourquoi les autres rôles ne l'ont pas
}

export const PERMISSIONS: Record<Permission, Geste> = {
  demasquer: { quoi: 'Démasquer une donnée personnelle, sur motif journalisé', roles: ['superviseur', 'support', 'mediation', 'verification'], pourquoi: 'Loi n° 2024/017 : seul qui en a besoin pour traiter un dossier voit la donnée, et chaque démasquage est tracé.' },
  'piece.consulter': { quoi: 'Consulter une pièce d’identité (lien court, filigrane)', roles: ['superviseur', 'verification', 'mediation'], pourquoi: 'Une pièce d’identité ne sert qu’à vérifier ou à trancher : elle n’est montrée qu’à ces rôles, un temps limité.' },
  contresigner: { quoi: 'Contresigner une décision à quatre yeux (second validateur)', roles: ['superviseur', 'finance', 'mediation', 'verification', 'rh'], route: 'quatreyeux', pourquoi: 'Le second validateur est un autre compte, du métier concerné ; l’audit contrôle mais ne valide pas.' },
  exporter: { quoi: 'Exporter une liste en CSV signé (empreinte)', roles: ['superviseur', 'finance', 'operations', 'audit'], pourquoi: 'Un export sort des données de la console : réservé aux rôles qui en rendent compte, limité au périmètre (ADM-ROL-03).' },
  'litige.decider': { quoi: 'Trancher un litige (niveau 1 ou 2)', roles: ['superviseur', 'support', 'mediation'], route: 'litige', pourquoi: 'Le niveau 1 revient au Support, le niveau 2 et les recours à la Médiation ; la Finance ne voit pas le contenu des litiges (ADM-ROL-04).' },
  'remboursement.executer': { quoi: 'Exécuter un remboursement', roles: ['superviseur', 'finance'], route: 'remboursements', pourquoi: 'L’argent ne sort que par la Finance (ou la Direction), au-delà du seuil avec un second validateur.' },
  'versement.executer': { quoi: 'Exécuter les versements du vendredi', roles: ['superviseur', 'finance'], route: 'versements', pourquoi: 'Le Support n’a pas accès aux versements (ADM-ROL-04) ; la Direction ne valide que les exceptions.' },
  'kyc.decider': { quoi: 'Valider ou refuser une identité (KYC)', roles: ['superviseur', 'verification'], route: 'kyc', pourquoi: 'Qui répond au vendeur ne valide pas son identité (A-01) ; l’agent terrain photographie, il ne valide jamais.' },
  'parametre.proposer': { quoi: 'Proposer un changement de paramètre', roles: ['superviseur', 'finance', 'operations'], route: 'parametrage', pourquoi: 'Un paramètre change les règles pour tous : seuls la Direction, la Finance et les Opérations (sa zone) en proposent.' },
  'parametre.valider': { quoi: 'Valider un paramètre critique', roles: ['superviseur'], route: 'parametrage', pourquoi: 'La Direction valide ; la Finance contresigne les paramètres critiques.' },
  'sanction.decider': { quoi: 'Décider une sanction ou un recours', roles: ['superviseur', 'mediation'], route: 'sanctions', pourquoi: 'Le Support propose ; la Médiation décide, pour séparer l’instruction de la décision.' },
  'role.attribuer': { quoi: 'Attribuer ou retirer un rôle de console, inviter, suspendre ou fermer le compte d’un employé', roles: ['superviseur', 'rh'], route: 'roles', pourquoi: 'Les Ressources humaines tiennent les comptes des employés (arrivées, départs, revue trimestrielle) ; un rôle Direction ne se donne ou ne se retire qu’avec la validation d’un autre compte Direction (ADM-ROL-05), jamais par les RH seules ; personne ne modifie son propre compte.' },
  'compte.saisir': { quoi: 'Saisir un compte sur le terrain (boutique, relais)', roles: ['superviseur', 'terrain'], route: 'comptes', pourquoi: 'La saisie assistée se fait en visite ; la Vérification la contrôle ensuite.' },
  'interrupteur.basculer': { quoi: 'Demander l’ouverture ou la fermeture d’une fonction (interrupteur, à quatre yeux)', roles: ['superviseur'], route: 'interrupteurs', pourquoi: 'Ouvrir une fonction d’après lancement change ce que voient les six espaces : décision de la Direction, contresignée par un autre compte.' },
  'fraude.decider': { quoi: 'Décider d’une alerte de fraude (classer, proposer une sanction, geler, lever)', roles: ['superviseur', 'mediation'], route: 'fraude', pourquoi: 'L’Audit ouvre une revue sans décider ; le Support lit ; la décision sépare l’instruction du jugement.' },
  'tache.lancer': { quoi: 'Lancer à la main une tâche planifiée (motif écrit)', roles: ['superviseur'], route: 'taches', pourquoi: 'Une tâche relancée touche l’argent ou les données de tous (versements, purges) : Direction seule.' },
  'maintenance.programmer': { quoi: 'Programmer ou annuler une maintenance annoncée aux six espaces', roles: ['superviseur'], route: 'sante', pourquoi: 'Une maintenance coupe le service pour tous : Direction seule, hors des créneaux interdits.' },
  'legal.publier': { quoi: 'Annoncer une nouvelle version d’un contenu légal', roles: ['superviseur'], route: 'legal', pourquoi: 'Un texte légal engage BelivaY et demande une nouvelle acceptation : Direction seule.' },
}

/** Ce que permet un rôle, et ce qu'il ne permet pas (avec la raison). */
export function gestesDe(role: Role) {
  const l = Object.entries(PERMISSIONS) as [Permission, Geste][]
  return { oui: l.filter(([, g]) => g.roles.includes(role)), non: l.filter(([, g]) => !g.roles.includes(role)) }
}
