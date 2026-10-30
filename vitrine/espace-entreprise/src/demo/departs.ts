// DONNÉES DE DÉMONSTRATION — départs demandés et absences prévenues par les livreurs (DP-66, DP-67). Le livreur est
// employé par son entreprise : il DEMANDE à partir (motif, texte libre facultatif) et PRÉVIENT d'une absence ;
// l'entreprise décide. Jeu d'essai (mardi 13 octobre 2026, 14 h 05) :
// - Josiane E. a demandé à partir il y a 3 jours, sans mission en cours : elle reçoit encore des paquets jusqu'à la veille
//   du dernier jour de son préavis ; clôture possible, d'un commun accord, dès son kit constaté ;
// - Kevin D. : préavis échu ce midi (dernier jour : plus de nouveau paquet), encore en tournée ; le délai du constat de
//   son kit court (DEPART-KIT-CONSTAT-H après la fin du préavis) ;
// - Arnaud F. : clôturé par l'administrateur BelivaY mercredi dernier, « kit non contesté » (l'entreprise n'avait rien
//   constaté dans le délai : aucune retenue) ; le vendredi du versement est passé, versement pas encore marqué fait ;
// - Pauline K. : clôturée il y a 40 jours, kit incomplet (sac étanche manquant, retenue sur le dernier relevé), un
//   litige alors ouvert (retenu au plus le montant contesté), versement Mobile Money fait le vendredi suivant ;
// - Yannick B. : clôturé il y a 100 jours, au-delà de DEPART-VISIBLE-J : plus dans la file (le journal le garde).
// Absences : Aimé O. (maladie, demain, prévenue ce matin : imprévu), Fabrice T. (panne de moto aujourd'hui, prévenue
// après le début de son créneau), Carine M. (famille, la semaine prochaine, vue).
// Les demandes de Serge A. arrivent de l'espace livreur par le pont (src/demo/pont-livreur.ts). Conditions de clôture
// calculées à la lecture, dans les paquets et les litiges (une seule vérité). Montants : données de démonstration ; les
// règles (plafond, litiges, vendredi suivant) sont celles du serveur (src/calculs/depart.ts).
import type { CalculVersement, ConditionsDepart, ConstatKit, MotifAbsence, MotifDepart } from '../calculs/depart'
import { finPreavis, vendrediSuivant } from '../calculs/depart'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import type { Instant, Jour } from '../donnees/communs'
import { T } from './jeu-essai'
import { litigesDemo } from './litiges'
import { PONT, idLivreur, paquetsDemo } from './paquets'
import { magasin } from './stockage'

export interface KitDemo {
  constat: ConstatKit | null
  manquants: string[]
  retenue: number
  photo: string | null
  constateLe: Instant | null
  constatePar: string | null
  contestation: { le: Instant; motif: string; decision: 'maintenue' | 'annulee' | null; decideLe: Instant | null } | null
}
export interface DepartDemo {
  id: string
  /** Absent : demandé par le livreur ; « entreprise » : fin de contrat décidée par l'employeur (src/demo/equipe.ts). */
  initiative?: 'entreprise'
  livreurId: string
  demandeLe: Instant
  motif: MotifDepart
  texte: string | null
  preavisJusqua: Instant
  etat: 'demande' | 'close'
  kit: KitDemo
  /** Missions validées depuis le dernier relevé, avant la démonstration (les paquets déposés ensuite s'y ajoutent). */
  missions: number
  closLe: Instant | null
  closPar: 'entreprise' | 'admin' | null
  versementLe: Instant | null
  kitNonConteste: boolean
  /** Dernier versement figé à la clôture (null : départ ouvert, estimé à la lecture). */
  versement: (CalculVersement & { missions: number; litiges: number }) | null
  faitLe: Instant | null
}
export interface AbsenceDemo {
  id: string
  livreurId: string
  du: Jour
  au: Jour
  motif: MotifAbsence
  texte: string | null
  imprevu: boolean
  apresDebut: boolean
  prevenueLe: Instant
  vueLe: Instant | null
}

export const kitVide = (): KitDemo => ({ constat: null, manquants: [], retenue: 0, photo: null, constateLe: null, constatePar: null, contestation: null })
/** Demande ouverte telle que le serveur la crée (préavis lu au registre). */
export const nouveauDepart = (id: string, livreurId: string, demandeLe: Instant, motif: MotifDepart, texte: string | null, missions = 0, preavisJusqua = finPreavis(demandeLe)): DepartDemo => ({
  id,
  livreurId,
  demandeLe,
  motif,
  texte,
  preavisJusqua,
  etat: 'demande',
  kit: kitVide(),
  missions,
  closLe: null,
  closPar: null,
  versementLe: null,
  kitNonConteste: false,
  versement: null,
  faitLe: null,
})
const ouvert = (id: string, livreurId: string, ilYaJours: number, motif: MotifDepart, texte: string | null, missions: number) => nouveauDepart(id, livreurId, T(-ilYaJours * 24 * 60 - 95), motif, texte, missions)
const jour = (dans: number) => jourDe(T(0) + dans * JOUR)

/** Départs clos du jeu d'essai : préavis, constat et versement figés à la clôture (règles de src/calculs/depart.ts). */
function clos(): DepartDemo[] {
  // Pauline : demande le 27 août, préavis jusqu'au 3 septembre ; kit incomplet constaté le jour même, clôture à 16 h 20 ;
  // 16 missions à 1 200 F, un litige ouvert (1 200 F de gains liés, 4 500 F contestés : 1 200 F retenus).
  const pauline = nouveauDepart('DP-0322', 'l-pauline', yaounde(2026, 8, 27, 8, 15), 'autre_emploi', 'Je rentre travailler avec mon oncle à Douala.', 16)
  const clotureP = yaounde(2026, 9, 3, 16, 20)
  Object.assign(pauline, {
    etat: 'close',
    kit: { constat: 'incomplet', manquants: ['sac de transport étanche'], retenue: 12_000, photo: 'kit-pauline.jpg', constateLe: yaounde(2026, 9, 3, 15, 50), constatePar: 'Gaëlle Wankeu · propriétaire', contestation: null },
    closLe: clotureP,
    closPar: 'entreprise',
    versementLe: vendrediSuivant(clotureP),
    versement: { du: 19_200, missions: 16, retenuLitiges: 1_200, litiges: 1, retenueKit: 12_000, kitDeCote: 0, verse: 6_000 },
    faitLe: vendrediSuivant(clotureP) + 10 * 3600_000 + 40 * 60_000,
  } satisfies Partial<DepartDemo>)
  // Arnaud : demande le 27 septembre, préavis jusqu'au 4 octobre, aucun constat dans les 72 h : l'administrateur
  // BelivaY a clôturé le 7 octobre, « kit non contesté », sans retenue ; 11 missions à 1 000 F.
  const arnaud = nouveauDepart('DP-0371', 'l-arnaud', yaounde(2026, 9, 27, 9, 0), 'remuneration', null, 11)
  const clotureA = yaounde(2026, 10, 7, 10, 15)
  Object.assign(arnaud, {
    etat: 'close',
    closLe: clotureA,
    closPar: 'admin',
    versementLe: vendrediSuivant(clotureA),
    kitNonConteste: true,
    versement: { du: 11_000, missions: 11, retenuLitiges: 0, litiges: 0, retenueKit: 0, kitDeCote: 0, verse: 11_000 },
  } satisfies Partial<DepartDemo>)
  // Yannick : clôturé le 5 juillet (au-delà de DEPART-VISIBLE-J).
  const yannick = nouveauDepart('DP-0207', 'l-yannick', yaounde(2026, 6, 28, 10, 0), 'demenagement', null, 8)
  const clotureY = yaounde(2026, 7, 5, 11, 0)
  Object.assign(yannick, {
    etat: 'close',
    kit: { ...kitVide(), constat: 'restitue', constateLe: clotureY - 3600_000, constatePar: 'Gaëlle Wankeu · propriétaire' },
    closLe: clotureY,
    closPar: 'entreprise',
    versementLe: vendrediSuivant(clotureY),
    versement: { du: null, missions: 8, retenuLitiges: 0, litiges: 0, retenueKit: 0, kitDeCote: 0, verse: null },
    faitLe: vendrediSuivant(clotureY) + 9 * 3600_000,
  } satisfies Partial<DepartDemo>)
  return [pauline, arnaud, yannick]
}

export const departsDemo = magasin('departs', () => ({
  departs: [
    ouvert('DP-0412', 'l-josiane', 3, 'autre_emploi', 'Un poste de magasinière à Mvan à partir du 1er novembre.', 9),
    // Kevin : demande il y a 7 jours, à 12 h 30 : le préavis a pris fin ce midi (dernier jour : plus de nouveau paquet).
    ouvert('DP-0398', 'l-kevin', 7, 'demenagement', null, 14),
    ...clos(),
  ] as DepartDemo[],
  absences: [
    { id: 'AB-0217', livreurId: 'l-aime', du: jour(1), au: jour(1), motif: 'maladie', texte: 'Rendez-vous médical le matin', imprevu: true, apresDebut: false, prevenueLe: T(-140), vueLe: null },
    { id: 'AB-0221', livreurId: 'l-fabrice', du: jour(0), au: jour(0), motif: 'panne_moto', texte: 'Embrayage cassé à Nkolbisson, la moto est au garage.', imprevu: true, apresDebut: true, prevenueLe: T(-5 * 60 - 20), vueLe: null },
    { id: 'AB-0209', livreurId: 'l-carine', du: jour(6), au: jour(7), motif: 'deuil_famille', texte: 'Mariage de ma sœur à Bafoussam', imprevu: false, apresDebut: false, prevenueLe: T(-2 * 24 * 60), vueLe: T(-2 * 24 * 60 + 50) },
  ] as AbsenceDemo[],
}))
// Ce que le livreur a fait dans son application (demande, annulation, absence, contestation) est appliqué avant chaque lecture.
const lireDeparts = departsDemo.lire
departsDemo.lire = () => (PONT.avantLecture?.(), lireDeparts())

const ACTIFS = ['affecte', 'en_cours', 'incident']
/** Conditions de clôture du départ d'un livreur, constatées à l'instant (le serveur les recalcule à la clôture). */
export function conditionsDe(livreurId: string, kitConstate: boolean, t: Instant): ConditionsDepart {
  const siens = paquetsDemo.lire().paquets.filter((p) => idLivreur(p, t) === livreurId && ACTIFS.includes(p.statut))
  return {
    missionsEnCours: siens.length,
    colisSousGarde: siens.reduce((n, p) => n + p.colis.filter((c) => !!p.arrets[c.arret]?.fait).length, 0),
    kitConstate,
    litigesOuverts: litigesOuverts(livreurId).length,
  }
}

/** Litiges encore ouverts sur les missions du livreur, avec le montant contesté (null : non chiffré). */
export const litigesOuverts = (livreurId: string) => litigesDemo.lire().litiges.filter((l) => l.livreur?.id === livreurId && l.etape !== 'decide')

/** Missions validées depuis le dernier relevé : celles du jeu d'essai, plus les paquets déposés pendant la démonstration. */
export function missionsValidees(d: DepartDemo, t: Instant): number {
  const debut = T(0)
  return d.missions + paquetsDemo.lire().paquets.filter((p) => idLivreur(p, t) === d.livreurId && (p.statut === 'depose' || p.statut === 'clos') && (p.deposeLe ?? 0) >= debut && (p.deposeLe ?? 0) <= t).length
}
