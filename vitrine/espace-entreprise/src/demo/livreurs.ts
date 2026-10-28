// DONNÉES DE DÉMONSTRATION — domaine « livreurs » (ENT-P05, ENT-P06) : les six livreurs du jeu d'essai (Hervé en
// activation : pièces en revue, certification pas encore passée) et Éric, suspendu par BelivaY (niveau 2, motif écrit,
// date de fin : l'entreprise ne peut pas lever cette suspension). Trust Score calculé par ses critères et leurs poids
// (PARAMETRES_FLOTTE.poidsTrust : les critères totalisent la note) ; certification et alertes lues dans le registre ;
// chaque modification journalisée et notifiée au livreur (journal.ts). Le retrait d'un livreur en mission prend effet
// après ses missions ; un livreur retiré disparaît de la liste (il garde son historique ailleurs, DED-21).
// Alertes rendues en codes : sans_vehicule, vehicule_expire, vehicule_panne, piece, certification.
// DP-67 : David N. a une nouvelle photo demandée il y a 5 jours (il travaille, l'échéance approche) ; Gilles A. il y a
// 9 jours, jamais envoyée : délai PHOTO-REVERIF-J passé, plus de nouvelle mission jusqu'à la validation. Trois anciens
// livreurs (Pauline K., Arnaud F., Yannick B.), retirés après leur départ clôturé, gardés pour la file « Départs ».
import type { AbsenceLivreur, DemandeDepart, DernierVersement, DomaineLivreurs, EvenementTrust, FicheLivreur, Livreur, PieceAControler, PieceLivreur, RaisonControle, StatutPiece, TypePiece } from '../donnees/domaines/livreurs'
import type { CodeZone, Instant } from '../donnees/communs'
import { PARAMETRES_FLOTTE, noteTrust } from '../calculs/flotte'
import { affectationJusqua, constatEchu, constatJusqua, constaterKit as juger, dernierVersement, manquantes, photoBloque, photoEcheance, preavisEchu, vendrediSuivant } from '../calculs/depart'
import { conditionsDe, departsDemo, kitVide, litigesOuverts, missionsValidees, type AbsenceDemo, type DepartDemo } from './departs'
import { F } from '@client/i18n/format'
import { montantsVisibles } from './acces'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { ACTIF_DEPUIS_JOURS, ENTREPRISE, LIVREURS, T } from './jeu-essai'
import { exiger, roleCourant } from './acces'
import { journalDe, signer } from './journal'
import { PONT, idLivreur, nomUtilisateur, paquetsDemo } from './paquets'
import { imagePiece } from './pieces-images'
import { LIVREUR_DEMO, publier, type PiecePont } from './pont'
import { magasin, repondre } from './stockage'
import { vehiculesVus } from './vehicules'
import { zonesDemo } from './zones'

const P = PARAMETRES_FLOTTE
const CRITERES = P.poidsTrust.map((c) => c.critere)
const J = (jours: number) => T(0) + jours * JOUR

// Profil de chaque livreur du jeu d'essai (trafic normal) : statut de départ (« en tournée » se lit ensuite dans les
// paquets), notes par critère (dans l'ordre du registre : Ponctualité, Qualité, Litiges, Ancienneté, Formation ; null :
// pas encore de Trust Score), capacité, pièces (type → [statut, expiration en jours, envoyée il y a n jours]).
type StatutDepart = 'en_activation' | 'actif' | 'en_ligne' | 'suspendu'
interface Profil {
  statut: StatutDepart
  notes: number[] | null
  capacite: number
  pieces?: Partial<Record<TypePiece, [StatutPiece, number | null, number?]>>
  certification?: { quiz: number | null; modulesFaits: number }
  suspension?: string // motif d'une suspension décidée par l'entreprise
}
const PROFILS: Record<string, Profil> = {
  'l-junior': { statut: 'en_ligne', notes: [78, 74, 80, 52, 90], capacite: 25, pieces: { permis: ['valide', 21] } },
  'l-brice': { statut: 'en_ligne', notes: [66, 70, 72, 48, 85], capacite: 25},
  'l-paul': { statut: 'en_ligne', notes: [86, 82, 84, 60, 95], capacite: 35},
  'l-ines': { statut: 'en_ligne', notes: [58, 60, 64, 40, 70], capacite: 20},
  'l-hugo': { statut: 'actif', notes: [92, 90, 94, 66, 100], capacite: 30},
  // Hervé : le compte « herve » de l'espace livreur, situation « activation » (pièce d'identité et selfie vérifiés,
  // permis refusé : catégorie A exigée pour une moto ; 5 modules sur 7).
  'l-herve': {
    statut: 'en_activation', notes: null, capacite: 20,
    pieces: { identite: ['valide', 1690, 1], selfie: ['valide', null, 1], permis: ['refusee', null, 1] },
    certification: { quiz: null, modulesFaits: 5 },
  },
  'l-serge': { statut: 'en_ligne', notes: [74, 80, 76, 52, 90], capacite: 25},
  'l-aime': { statut: 'en_ligne', notes: [81, 77, 85, 50, 90], capacite: 20},
  'l-carine': { statut: 'en_ligne', notes: [88, 86, 90, 55, 95], capacite: 25},
  'l-david': { statut: 'en_ligne', notes: [72, 79, 70, 58, 85], capacite: 35},
  'l-estelle': { statut: 'en_ligne', notes: [90, 84, 88, 45, 100], capacite: 20},
  'l-fabrice': { statut: 'en_ligne', notes: [69, 73, 77, 62, 80], capacite: 30},
  'l-gilles': { statut: 'en_ligne', notes: [76, 70, 74, 49, 85], capacite: 20},
  'l-josiane': { statut: 'actif', notes: [83, 88, 86, 57, 90], capacite: 20},
  'l-kevin': { statut: 'en_ligne', notes: [64, 68, 66, 44, 75], capacite: 20},
  // Olivier : permis qui expire dans 12 jours ; Rose : pièce d'identité expirée avant-hier (plus de nouveau paquet).
  'l-olivier': { statut: 'en_ligne', notes: [79, 75, 81, 53, 85], capacite: 25, pieces: { permis: ['valide', 12] } },
  'l-rose': { statut: 'actif', notes: [85, 83, 87, 61, 90], capacite: 25, pieces: { identite: ['valide', -2] } },
  // Landry : suspendu par l'entreprise (retards répétés), sans fin fixée.
  'l-landry': { statut: 'suspendu', notes: [52, 61, 58, 54, 80], capacite: 30, suspension: 'Trois retards de ramassage cette semaine sans prévenir : point à faire avec Gaëlle avant reprise.' },
  // En activation : Marius a tout envoyé (pièces à contrôler, quiz réussi) ; Nadège a renvoyé sa pièce d'identité après
  // un refus et son permis est refusé ; Thierry n'a pas encore envoyé son permis (3 modules sur 7).
  'l-marius': {
    statut: 'en_activation', notes: null, capacite: 20,
    pieces: { identite: ['en_revue', 1640, 0], selfie: ['en_revue', null, 0], permis: ['en_revue', 1100, 0] },
    certification: { quiz: 17, modulesFaits: 7 },
  },
  'l-nadege': {
    statut: 'en_activation', notes: null, capacite: 20,
    pieces: { identite: ['en_revue', 2010, 0], selfie: ['valide', null, 3], permis: ['refusee', null, 3] },
    certification: { quiz: 16, modulesFaits: 7 },
  },
  'l-thierry': {
    statut: 'en_activation', notes: null, capacite: 20,
    pieces: { identite: ['en_revue', 1460, 1], selfie: ['en_revue', null, 1], permis: ['manquante', null] },
    certification: { quiz: null, modulesFaits: 3 },
  },
  'l-eric': { statut: 'suspendu', notes: [44, 52, 30, 58, 80], capacite: 20},
  // Anciens livreurs, partis (départ clôturé) : retirés de la flotte, leur départ reste dans la file DEPART-VISIBLE-J jours.
  'l-pauline': { statut: 'actif', notes: [80, 78, 82, 50, 90], capacite: 20 },
  'l-arnaud': { statut: 'actif', notes: [70, 72, 69, 47, 85], capacite: 25 },
  'l-yannick': { statut: 'actif', notes: [75, 74, 77, 52, 85], capacite: 20 },
}
// Paquets clos de la fiche (activité) : ceux du jeu d'essai écrit à la main ; les autres se lisent dans le trafic.
const PAQUETS: Record<string, string[]> = { 'l-junior': ['PQ-2398', 'PQ-2391', 'PQ-2384'], 'l-brice': ['PQ-2402', 'PQ-2389'], 'l-paul': ['PQ-2380', 'PQ-2377', 'PQ-2372'], 'l-ines': ['PQ-2386'], 'l-hugo': ['PQ-2393', 'PQ-2379'], 'l-serge': ['PQ-Z1-261011-004', 'PQ-Z1-261010-003'], 'l-eric': ['PQ-2370'] }
/** Motifs des refus du jeu d'essai (le livreur les lit dans son application). */
const MOTIFS: Record<string, string> = {
  'l-herve:permis': 'Catégorie de permis incohérente avec le véhicule déclaré : la catégorie A est exigée pour une moto.',
  'l-nadege:permis': 'Photo du permis floue : le numéro et la date de validité ne se lisent pas. Reprenez la photo à plat, sans reflet.',
}
/** Numéro masqué d'une pièce (quatre derniers chiffres seulement). */
const numeroDe = (id: string, type: TypePiece) => (type === 'selfie' ? null : '···· ' + String(1000 + ((id.length * 977 + type.length * 131 + id.charCodeAt(2) * 17) % 9000)))

/** Une pièce telle que le livreur l'a envoyée, contrôlée (ou non) par l'entreprise. */
export function piece(id: string, type: TypePiece, statut: StatutPiece, expireLe: Instant | null, envoyeeLe: Instant | null, controleLe: Instant | null): PieceLivreur {
  return {
    type,
    statut,
    expireLe,
    numero: statut === 'manquante' ? null : numeroDe(id, type),
    envoyeeLe: statut === 'manquante' ? null : envoyeeLe,
    motif: statut === 'refusee' ? (MOTIFS[id + ':' + type] ?? 'Pièce illisible : reprenez la photo à plat, sans reflet.') : null,
    controle: controleLe && (statut === 'valide' || statut === 'refusee') ? { par: 'Gaëlle Wankeu · propriétaire', le: controleLe } : null,
    relances: [],
    faces: statut === 'manquante' ? [] : type === 'identite' ? ['recto', 'verso'] : type === 'permis' ? ['recto'] : ['photo'],
    reverification: null,
  }
}

function evenements(id: string, i: number): EvenementTrust[] {
  const e: EvenementTrust[] = [
    { id: id + '-e1', le: T(-(26 + i) * 60), libelle: 'Livré dans la promesse', critere: CRITERES[0], effet: 1, contestation: null },
    { id: id + '-e2', le: T(-(50 + i) * 60), libelle: 'Preuves complètes au dépôt', critere: CRITERES[1], effet: 1, contestation: null },
  ]
  if (id === 'l-brice')
    e.unshift({ id: id + '-e0', le: T(-180), libelle: 'Ramassage en retard (g1)', critere: CRITERES[0], effet: -2, contestation: { le: T(-120), texte: 'La boutique a ouvert à 11 h 20 au lieu de 10 h : j’ai attendu devant.', elements: null } })
  if (id === 'l-eric') e.unshift({ id: id + '-e0', le: T(-2 * 24 * 60), libelle: 'Espèces encaissées auprès d’un client (enquête)', critere: CRITERES[2], effet: -8, contestation: null })
  if (id === 'l-landry') e.unshift({ id: id + '-e0', le: T(-26 * 60), libelle: 'Ramassage en retard (g1)', critere: CRITERES[0], effet: -2, contestation: null })
  return e
}

function activite(id: string, i: number, zones: string[]): NonNullable<FicheLivreur['activite']> {
  const jours = Array.from({ length: 7 }, (_, k) => ({ jour: jourDe(T(0) - (6 - k) * JOUR), missions: ((i + k) % 3) + (k === 6 ? 1 : 0) + (k % 2) }))
  const paquets = (PAQUETS[id] ?? []).map((p, k) => ({ id: p, le: T(-(k * 9 + 1) * 60), zone: zones[k % zones.length], colis: 1 + ((k + i) % 5), dansLeDelai: k === 0 ? null : (k + i) % 4 !== 0 }))
  const clos = paquets.filter((p) => p.dansLeDelai !== null)
  return { jours, paquets, colisLivres: clos.reduce((n, p) => n + p.colis, 0), dansLeDelai: clos.filter((p) => p.dansLeDelai).length, remis: clos.length }
}

const ERIC = { id: 'l-eric', nom: 'Éric B.', initiales: 'EB', vehicule: 'moto' as const, telephone: '+237690778899', zones: ['Z1'] }

function fiche(l: (typeof LIVREURS)[number], i: number): FicheLivreur {
  const pr = PROFILS[l.id]
  const enActivation = pr.statut === 'en_activation'
  const notes = pr.notes
  const depuis = ACTIF_DEPUIS_JOURS[l.id] ?? null // activé il y a n jours (absent : en activation)
  const active = depuis === null ? null : T(0) - depuis * JOUR
  const types: TypePiece[] = ['identite', 'selfie', 'permis']
  const pieces = types.map((type) => {
    const [st, exp, envoi] = pr.pieces?.[type] ?? ['valide', type === 'selfie' ? null : type === 'identite' ? 900 - i * 37 : 500 + i * 41, (depuis ?? 0) + 2]
    const envoyee = envoi === undefined ? null : T(0) - envoi * JOUR - 3 * 60 * 60_000
    return piece(l.id, type, st, exp === null ? null : J(exp), envoyee, st === 'valide' || st === 'refusee' ? (envoyee ?? T(0)) + 40 * 60_000 : null)
  })
  return {
    ...l,
    statut: pr.statut,
    trustScore: notes ? noteTrust(Object.fromEntries(P.poidsTrust.map((c, k) => [c.critere, notes[k]]))) : null,
    certifieJusqua: active === null ? null : active + (P.certificationMois * 30 - 1) * JOUR,
    missionsDuJour: 0,
    capacite: pr.capacite,
    suspension:
      l.id === 'l-eric'
        ? { par: 'belivay', niveau: 2, motif: 'Espèces encaissées auprès d’un client : enquête en cours (zéro espèce, contrat article 6).', depuis: T(-2 * 24 * 60), jusqua: T(0) + 5 * JOUR }
        : pr.suspension
          ? { par: 'entreprise', niveau: null, motif: pr.suspension, depuis: T(-20 * 60), jusqua: null }
          : null,
    retraitDemande: null,
    activeLe: active,
    pieces,
    vehiculeId: 'v-' + l.id.slice(2),
    note: null,
    charteLe: active === null ? T(0) - 2 * JOUR : active - 2 * JOUR,
    certification: enActivation
      ? { quiz: pr.certification?.quiz ?? null, le: pr.certification?.quiz != null ? T(0) - 1 * JOUR : null, modules: 7, modulesFaits: pr.certification?.modulesFaits ?? 0 }
      : { quiz: P.quizMin + ((i * 3) % (P.quizSur - P.quizMin + 1)), le: (active ?? T(0)) - 2 * JOUR, modules: 7, modulesFaits: 7 },
    criteres: notes ? P.poidsTrust.map((c, k) => ({ critere: c.critere, poids: c.poids, note: notes[k] })) : undefined,
    evenements: notes ? evenements(l.id, i) : [],
    activite: notes ? activite(l.id, i, l.zones) : { jours: [], paquets: [], colisLivres: 0, dansLeDelai: 0, remis: 0 },
    tarifMission: null,
    notifications: [],
  }
}

/** Serge A. : le dossier d'accès de l'espace livreur (même livreur, même appareil) — activé le 24 septembre, quiz 18/20,
 * badge d'un an, CNI jusqu'au 11 mars 2030, permis jusqu'au 2 août 2029 (LIV-04-R13). */
function serge(f: FicheLivreur): FicheLivreur {
  const certifie = yaounde(2026, 9, 24, 10, 40)
  const envoi = yaounde(2026, 9, 22, 9, 10)
  return {
    ...f,
    activeLe: yaounde(2026, 9, 24, 11, 20),
    charteLe: yaounde(2026, 9, 22, 9, 2),
    certifieJusqua: yaounde(2026 + Math.floor((8 + P.certificationMois) / 12), ((8 + P.certificationMois) % 12) + 1, 24, 10, 40),
    certification: { quiz: 18, le: certifie, modules: 7, modulesFaits: 7 },
    pieces: [piece(f.id, 'identite', 'valide', yaounde(2030, 3, 11), envoi, envoi + 50 * 60_000), piece(f.id, 'selfie', 'valide', null, envoi, envoi + 50 * 60_000), piece(f.id, 'permis', 'valide', yaounde(2029, 8, 2), envoi, envoi + 50 * 60_000)],
  }
}

/** Nouvelle photo demandée il y a `ilYaJours` jours (DP-67, 5) : statut dédié, échéance PHOTO-REVERIF-J après la demande. */
function photoDemandee(f: FicheLivreur, ilYaJours: number, motif: string): FicheLivreur {
  const le = T(0) - ilYaJours * JOUR - 2 * 3600_000
  return {
    ...f,
    pieces: f.pieces.map((p) => (p.type === 'selfie' ? { ...p, statut: 'reverification', motif: null, controle: { par: 'Gaëlle Wankeu · propriétaire', le }, relances: [le], reverification: { le, motif, jusqua: photoEcheance(le), bloque: false } } : p)),
  }
}

/** Ancien livreur, retiré après son départ clôturé. */
const ANCIENS = [
  { id: 'l-pauline', nom: 'Pauline K.', initiales: 'PK', vehicule: 'moto' as const, telephone: '+237690667715', zones: ['Z3'] },
  { id: 'l-arnaud', nom: 'Arnaud F.', initiales: 'AF', vehicule: 'moto' as const, telephone: '+237690667716', zones: ['Z2'] },
  { id: 'l-yannick', nom: 'Yannick B.', initiales: 'YB', vehicule: 'moto' as const, telephone: '+237690667717', zones: ['Z6'] },
]

/** Hervé : sa pièce d'identité court jusqu'au 30 mai 2031 (même date que dans l'espace livreur). */
function herve(f: FicheLivreur): FicheLivreur {
  return { ...f, pieces: f.pieces.map((p) => (p.type === 'identite' ? { ...p, expireLe: yaounde(2031, 5, 30) } : p)) }
}

const PARTICULIERS: Record<string, (f: FicheLivreur) => FicheLivreur> = {
  'l-serge': serge,
  'l-herve': herve,
  'l-david': (f) => photoDemandee(f, 5, 'Contrôle périodique de l’identité demandé par l’entreprise.'),
  'l-gilles': (f) => photoDemandee(f, 9, 'Votre apparence a changé : reprenez une photo nette, de face, sans lunettes ni casquette.'),
  // Tarif par mission affiché (ENT-P06R-02) : le dernier versement de leur départ se calcule en francs.
  'l-josiane': (f) => ({ ...f, tarifMission: 1_200 }),
  'l-kevin': (f) => ({ ...f, tarifMission: 1_000 }),
}
export const livreursDemo = magasin('livreurs', () => ({
  livreurs: [
    ...LIVREURS.map((l, i) => (PARTICULIERS[l.id] ?? ((f: FicheLivreur) => f))(fiche(l, i))),
    fiche(ERIC, 7),
    ...ANCIENS.map((l, k): FicheLivreur => ({ ...fiche(l, 8 + k), statut: 'retire', vehiculeId: null, tarifMission: l.id === 'l-pauline' ? 1_200 : l.id === 'l-arnaud' ? 1_000 : null })),
  ],
}))
// Une pièce renvoyée depuis l'espace livreur (src/demo/pont-livreur.ts) est appliquée avant chaque lecture.
const lireLivreurs = livreursDemo.lire
livreursDemo.lire = () => (PONT.avantLecture?.(), lireLivreurs())

// ── Départs et absences (DP-66) ──────────────────────────────────────────────────────────────────────────────────
/** Pièce de l'entreprise → mot du livreur (pont : cni ↔ identite). */
export const PIECE_PONT: Record<TypePiece, PiecePont> = { identite: 'cni', selfie: 'selfie', permis: 'permis' }

/** Demande de départ telle que le serveur la rend : conditions et préavis lus à l'instant. */
function vueDepart(d: DepartDemo, t: Instant): DemandeDepart {
  const l = livreursDemo.lire().livreurs.find((x) => x.id === d.livreurId)!
  const statut = l.statut === 'retire' ? 'retire' : statutDe(l, t)
  const c = conditionsDe(d.livreurId, d.kit.constat !== null, t)
  const annulee = d.kit.contestation?.decision === 'annulee'
  const versement = versementDe(d, l, t)
  return {
    id: d.id,
    initiative: d.initiative ?? 'livreur',
    livreur: { id: l.id, nom: l.nom, initiales: l.initiales, vehicule: l.vehicule, statut },
    demandeLe: d.demandeLe,
    motif: d.motif,
    texte: d.texte,
    preavisJusqua: d.preavisJusqua,
    echu: d.etat === 'demande' && preavisEchu(d.preavisJusqua, t),
    etat: d.etat,
    conditions: c,
    manquantes: d.etat === 'demande' ? manquantes(c) : [],
    closLe: d.closLe,
    closPar: d.closPar,
    versementLe: d.versementLe,
    affectationJusqua: affectationJusqua(d.preavisJusqua),
    kit: {
      constat: d.kit.constat,
      manquants: d.kit.manquants,
      retenue: annulee ? 0 : d.kit.retenue,
      photo: !!d.kit.photo,
      constateLe: d.kit.constateLe,
      constatePar: d.kit.constatePar,
      constatJusqua: constatJusqua(d.preavisJusqua),
      echu: d.etat === 'demande' && d.kit.constat === null && constatEchu(d.preavisJusqua, t),
      contestation: d.kit.contestation,
    },
    kitNonConteste: d.kitNonConteste,
    // Montants : propriétaire et comptable seulement (le répartiteur voit les compteurs, ENT-RG-R25).
    versement: montantsVisibles() ? versement : { ...versement, du: null, verse: null },
  }
}

/** Dernier versement (DP-67, 6) : figé à la clôture ; pendant le préavis, estimé à l'instant (missions validées au tarif
 * affiché, litiges ouverts retenus au plus le montant contesté, retenue du kit plafonnée, contestée : mise de côté). */
function versementDe(d: DepartDemo, l: FicheLivreur, t: Instant): DernierVersement {
  if (d.versement) return { ...d.versement, faitLe: d.faitLe }
  const tarif = l.tarifMission ?? null
  const missions = missionsValidees(d, t)
  const ouverts = litigesOuverts(d.livreurId)
  // Chaque litige ouvert porte sur une mission validée : ses gains (le tarif) et le montant contesté.
  const litiges = tarif === null ? [] : ouverts.slice(0, missions).map((x) => ({ gains: tarif, conteste: x.montantEnJeu ?? tarif }))
  const c = d.kit.contestation
  const v = dernierVersement(tarif === null ? null : tarif * missions, litiges, c?.decision === 'annulee' ? 0 : d.kit.retenue, P.kit.total, c !== null && c.decision === null)
  return { ...v, missions, litiges: ouverts.length, faitLe: d.faitLe }
}
const vueAbsence = (a: AbsenceDemo): AbsenceLivreur => {
  const l = livreursDemo.lire().livreurs.find((x) => x.id === a.livreurId)!
  return { id: a.id, livreur: { id: l.id, nom: l.nom, initiales: l.initiales, vehicule: l.vehicule }, du: a.du, au: a.au, motif: a.motif, texte: a.texte, imprevu: a.imprevu, apresDebut: a.apresDebut, prevenueLe: a.prevenueLe, vueLe: a.vueLe }
}
/** Départs ouverts, puis clos depuis moins de DEPART-VISIBLE-J jours (tableau de bord, flotte, affectation). */
export function departsVus(t = maintenant()): DemandeDepart[] {
  return departsDemo
    .lire()
    .departs.filter((d) => d.etat === 'demande' || (d.closLe !== null && t - d.closLe < P.departVisibleJours * JOUR))
    .map((d) => vueDepart(d, t))
    .sort((a, b) => Number(a.etat === 'close') - Number(b.etat === 'close') || a.preavisJusqua - b.preavisJusqua)
}
/** Absences en cours ou à venir, la plus proche d'abord. */
export function absencesVues(t = maintenant()): AbsenceLivreur[] {
  const auj = jourDe(t)
  return departsDemo
    .lire()
    .absences.filter((a) => a.au >= auj && livreursDemo.lire().livreurs.find((l) => l.id === a.livreurId)?.statut !== 'retire')
    .map(vueAbsence)
    .sort((a, b) => a.du.localeCompare(b.du))
}

/** Le livreur tel que le serveur le rend : alertes calculées à la lecture (pièce, certification, véhicule). */
/** Statut de travail lu dans les paquets (une seule vérité, DED-01) : « en mission » tant qu'un paquet qui lui est
 * affecté est en cours (ou bloqué par un incident), sinon en ligne. */
function statutDe(l: FicheLivreur, t: number): FicheLivreur['statut'] {
  if (!['actif', 'en_ligne', 'en_mission'].includes(l.statut)) return l.statut
  const enCours = paquetsDemo.lire().paquets.some((p) => idLivreur(p, t) === l.id && (p.statut === 'en_cours' || p.statut === 'incident'))
  return enCours ? 'en_mission' : l.statut === 'en_mission' ? 'en_ligne' : l.statut
}

/** Pièce vue à l'instant : une date passée rend la pièce « expirée » (tâche de 0 h 00 du serveur) ; nouvelle photo pas
 * validée dans le délai PHOTO-REVERIF-J : « bloque » (tâche planifiée du serveur, journalisée). */
const pieceVue = (p: PieceLivreur, t: Instant): PieceLivreur => {
  const q = p.statut === 'valide' && p.expireLe !== null && p.expireLe < t ? { ...p, statut: 'expiree' as const } : p
  return q.reverification ? { ...q, reverification: { ...q.reverification, bloque: photoBloque(q.reverification.le, t, q.statut === 'valide') } } : q
}
/** Nouvelle photo demandée, pas validée dans le délai : plus de nouvelle mission (raison « photo » de l'affectation). */
export const photoEnRetard = (l: FicheLivreur, t: Instant = maintenant()) => l.pieces.some((p) => p.type === 'selfie' && !!pieceVue(p, t).reverification?.bloque)
const minuit = (t: Instant) => yaounde(Number(jourDe(t).slice(0, 4)), Number(jourDe(t).slice(5, 7)), Number(jourDe(t).slice(8, 10)))

function vu(f: FicheLivreur, t = maintenant()): FicheLivreur {
  const debut = minuit(t)
  const missionsDuJour = paquetsDemo.lire().paquets.filter((p) => idLivreur(p, t) === f.id && p.affecteLe !== null && p.affecteLe >= debut && p.affecteLe <= t).length
  const l = { ...f, statut: statutDe(f, t), missionsDuJour, pieces: f.pieces.map((p) => pieceVue(p, t)) }
  const alertes: string[] = []
  const v = vehiculesVus().find((x) => x.id === l.vehiculeId)
  if (l.statut !== 'en_activation' && l.statut !== 'retire') {
    if (!v) alertes.push('sans_vehicule')
    else if (v.statut === 'expire') alertes.push('vehicule_expire')
    else if (v.statut === 'hors_service') alertes.push('vehicule_panne')
    if (l.pieces.some((p) => p.expireLe !== null && p.expireLe - t <= P.alertePieceLivreurJours * JOUR)) alertes.push('piece')
    if (l.certifieJusqua !== null && l.certifieJusqua - t <= P.alerteCertificationJours * JOUR) alertes.push('certification')
  }
  return { ...l, plaque: v?.plaque ?? null, alertes, journal: journalDe('livreur:' + l.id) }
}
const court = ({ pieces: _p, vehiculeId: _v, note: _n, charteLe: _c, certification: _ce, criteres: _cr, evenements: _e, activite: _a, tarifMission: _t, notifications: _no, journal: _j, ...l }: FicheLivreur): Livreur => l

/** Livreur qui peut recevoir des paquets : statut actif et véhicule proposé à l'affectation (ENT-P04R-01). */
export function livreurDisponible(id: string): boolean {
  const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
  if (!l || !['actif', 'en_ligne', 'en_mission'].includes(l.statut) || l.retraitDemande) return false
  return !!vehiculesVus().find((v) => v.id === l.vehiculeId)?.proposable
}

const ok = { ok: true as const }
/** Durée des liens signés d'une pièce consultée (minutes) : valeur proposée, à inscrire au registre. */
export const LIEN_PIECE_MIN = 5
const NOM_PIECE_DEMO: Record<TypePiece, string> = { identite: 'Pièce d’identité', selfie: 'Selfie', permis: 'Permis de conduire' }
const NOM_STATUT_PIECE: Record<StatutPiece, string> = { manquante: 'manquante', en_revue: 'à contrôler', valide: 'validée', refusee: 'refusée', expiree: 'expirée', reverification: 'nouvelle vérification demandée' }
export const NOM_ROLE_DEMO: Record<string, string> = { proprietaire: 'propriétaire', gerant: 'gérant', repartiteur: 'répartiteur', comptable: 'comptable' }
/** « vendredi 16 octobre » (heure de Yaoundé) : texte des notifications et des SMS au livreur. */
export const jourFr = (t: Instant) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Douala' })
const dateCourte = (t: Instant) => new Date(t + 3_600_000).toISOString().slice(0, 16).replace('T', ' ')
const non = <R extends string>(raison: R) => repondre({ ok: false as const, raison })
const ecrire = (id: string, f: (l: FicheLivreur) => void) => livreursDemo.ecrire((s) => f(s.livreurs.find((l) => l.id === id)!))
/** Notification envoyée au livreur (push, application du livreur) : gardée sur sa fiche. */
export const notifier = (id: string, texte: string) => ecrire(id, (l) => (l.notifications = [{ le: maintenant(), texte }, ...(l.notifications ?? [])]))

export const demoLivreurs: DomaineLivreurs = {
  async liste(filtre) {
    return repondre(
      livreursDemo
        .lire()
        .livreurs.map((l) => vu(l))
        .filter((l) => l.statut !== 'retire' && (!filtre?.zone || l.zones.includes(filtre.zone)) && (!filtre?.statut || l.statut === filtre.statut))
        .map(court),
    )
  },
  async fiche(id) {
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    if (!l || l.statut === 'retire') return repondre(null)
    const t = maintenant()
    const f = vu(l, t)
    // Départ demandé et absences prévenues (DP-66), lus dans leur propre domaine.
    const depart = departsVus(t).find((d) => d.livreur.id === id && d.etat === 'demande') ?? null
    const absences = absencesVues(t).filter((a) => a.livreur.id === id)
    // Le tarif par mission est un montant : rien pour le répartiteur (ENT-RG-R25).
    return repondre({ ...f, depart, absences, tarifMission: montantsVisibles() ? f.tarifMission : null })
  },
  // Suspension et réintégration : décisions de l'employeur (DP-66), propriétaire et gérant seulement, motif écrit ;
  // le livreur de démonstration la voit dans son application (pont : emploi_suspendu, emploi_retabli).
  async suspendre(id, motif, jusqua = null) {
    exiger(['proprietaire', 'gerant'], 'Suspendre un livreur')
    if (!motif.trim()) return non('motif')
    const t = maintenant()
    if (jusqua !== null && jusqua <= t) return non('date')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    if (!l || l.statut === 'suspendu' || l.statut === 'retire' || l.statut === 'en_activation') return non('statut')
    const avant = l.statut
    ecrire(id, (x) => {
      x.statut = 'suspendu'
      x.suspension = { par: 'entreprise', niveau: null, motif: motif.trim(), depuis: t, jusqua }
    })
    signer('rider.suspended', 'livreur:' + id, 'statut', avant, 'suspendu' + (jusqua ? ` jusqu’au ${jourFr(jusqua)}` : '') + ' : ' + motif.trim())
    notifier(id, 'Votre entreprise a suspendu votre rattachement' + (jusqua ? ` jusqu’au ${jourFr(jusqua)}` : '') + ' : ' + motif.trim())
    if (id === LIVREUR_DEMO) publier({ type: 'emploi_suspendu', id: `SU-${t}`, livreurId: id, motif: motif.trim(), jusqua }, `emploi_suspendu-${t}`, t)
    return repondre(ok)
  },
  async lever(id, motif) {
    exiger(['proprietaire', 'gerant'], 'Lever une suspension')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)!
    if (l.suspension?.par === 'belivay') return non('belivay') // 409 BELIVAY_SUSPENSION
    if (l.statut !== 'suspendu') return non('statut')
    const t = maintenant()
    const texte = motif?.trim() || 'Suspension annulée aussitôt (erreur de saisie).'
    ecrire(id, (x) => {
      x.statut = 'actif'
      x.suspension = null
    })
    signer('rider.reinstated', 'livreur:' + id, 'statut', 'suspendu', 'actif : ' + texte)
    notifier(id, 'Votre entreprise a levé la suspension : vous recevez de nouveau des paquets.')
    if (id === LIVREUR_DEMO) publier({ type: 'emploi_retabli', id: `RE-${t}`, livreurId: id, motif: texte }, `emploi_retabli-${t}`, t)
    return repondre(ok)
  },
  async retirer(id, motif) {
    exiger(['proprietaire', 'gerant'], 'Retirer un livreur')
    if (!motif.trim()) return non('motif')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)!
    const apres = l.statut === 'en_mission'
    ecrire(id, (x) => {
      if (apres) x.retraitDemande = maintenant()
      else x.statut = 'retire'
    })
    signer('rider.removed', 'livreur:' + id, 'rattachement', l.statut, (apres ? 'retrait après les missions en cours : ' : 'retiré : ') + motif.trim())
    notifier(id, 'Votre entreprise met fin à votre rattachement' + (apres ? ' après vos missions en cours.' : '.'))
    return repondre({ ...ok, effetLe: apres ? ('apres_missions' as const) : ('maintenant' as const) })
  },
  async approuver(id) {
    exiger(['proprietaire', 'repartiteur'], 'Approuver un livreur')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)!
    const pret = l.statut === 'en_activation' && l.pieces.every((p) => p.statut === 'valide') && (l.certification?.quiz ?? 0) >= P.quizMin && !!l.charteLe
    if (!pret) return non('pas_pret')
    ecrire(id, (x) => {
      x.statut = 'actif'
      x.activeLe = maintenant()
      x.certifieJusqua = maintenant() + P.certificationMois * 30 * JOUR
    })
    signer('rider.approved', 'livreur:' + id, 'statut', 'en activation', 'actif (accès activé par BelivaY)')
    notifier(id, 'Votre entreprise vous a approuvé : votre accès est actif.')
    return repondre(ok)
  },
  async modifier(id, m) {
    exiger(['proprietaire', 'repartiteur'], 'Modifier un livreur')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)!
    const declarees = zonesDemo.lire().zones.filter((z) => z.declaree).map((z) => z.code)
    if (m.zones && (!m.zones.length || m.zones.some((z: CodeZone) => !declarees.includes(z)))) return non('zones')
    if (m.capacite !== undefined && (!Number.isInteger(m.capacite) || m.capacite < 1)) return non('capacite')
    if (m.vehiculeId && !vehiculesVus().some((v) => v.id === m.vehiculeId)) return non('vehicule')
    const plaque = (vid: string | null) => vehiculesVus().find((v) => v.id === vid)?.plaque ?? '—'
    const changes: [string, string, string][] = []
    if (m.zones && m.zones.join(',') !== l.zones.join(',')) changes.push(['zones', l.zones.join(', '), m.zones.join(', ')])
    if (m.capacite !== undefined && m.capacite !== l.capacite) changes.push(['capacité', String(l.capacite ?? '—'), String(m.capacite)])
    if (m.vehiculeId !== undefined && m.vehiculeId !== l.vehiculeId) changes.push(['véhicule', plaque(l.vehiculeId), plaque(m.vehiculeId)])
    if (!changes.length) return repondre(ok)
    ecrire(id, (x) => {
      if (m.zones) x.zones = m.zones
      if (m.capacite !== undefined) x.capacite = m.capacite
      if (m.vehiculeId !== undefined) {
        x.vehiculeId = m.vehiculeId
        const v = m.vehiculeId ? vehiculesVus().find((y) => y.id === m.vehiculeId) : null
        if (v) x.vehicule = v.type
      }
    })
    for (const [champ, avant, apres] of changes) signer('rider.updated', 'livreur:' + id, champ, avant, apres)
    // Zones de travail changées : Serge A. les voit dans son application (pont, même appareil).
    if (id === LIVREUR_DEMO && m.zones && changes.some((c) => c[0] === 'zones')) publier({ type: 'zones_changees', livreurId: id, zones: m.zones, motif: null }, `zones_changees-${maintenant()}`, maintenant())
    // Livreur en tournée : la modification vaut pour les paquets suivants (ENT-P06R-01).
    notifier(id, `Votre entreprise a modifié votre fiche (${changes.map((c) => c[0]).join(', ')})` + (l.statut === 'en_mission' ? ' : à partir de vos prochains paquets.' : '.'))
    return repondre(ok)
  },
  async noter(id, note) {
    exiger(['proprietaire', 'repartiteur'], 'Note interne')
    ecrire(id, (x) => (x.note = note.trim() || null))
    signer('rider.note', 'livreur:' + id, 'note interne', '', note.trim() ? 'modifiée' : 'effacée')
    return repondre(ok)
  },
  async tarif(id, montant) {
    exiger(['proprietaire'], 'Tarif par mission')
    if (montant !== null && (!Number.isInteger(montant) || montant < 0)) return non('montant')
    const avant = livreursDemo.lire().livreurs.find((x) => x.id === id)!.tarifMission ?? null
    ecrire(id, (x) => (x.tarifMission = montant))
    signer('rider.updated', 'livreur:' + id, 'tarif par mission affiché', avant === null ? 'non affiché' : String(avant), montant === null ? 'non affiché' : String(montant))
    notifier(id, montant === null ? 'Votre entreprise n’affiche plus de tarif par mission.' : 'Votre entreprise a mis à jour le tarif affiché par mission.')
    // Serge A. le voit dans « Mon activité et mes gains » (src/demo/pont.ts, même appareil).
    if (id === LIVREUR_DEMO) publier({ type: 'tarif', montant }, `tarif-${maintenant()}`, maintenant())
    return repondre(ok)
  },
  async prevenir(id, sujet) {
    exiger(['proprietaire', 'repartiteur'], 'Prévenir un livreur')
    const texte = sujet === 'piece' ? 'Une de vos pièces arrive à expiration : mettez-la à jour dans l’application.' : sujet === 'certification' ? 'Votre certification arrive à échéance : repassez le quiz dans l’application.' : 'Votre véhicule n’est plus proposé à l’affectation : mettez à jour ses documents.'
    notifier(id, texte)
    signer('rider.notified', 'livreur:' + id, 'rappel', '', sujet)
    return repondre(ok)
  },
  async controles() {
    exiger(['proprietaire', 'repartiteur'], 'Contrôle des pièces')
    const t = maintenant()
    const ordre: RaisonControle[] = ['a_controler', 'reverification', 'expiree', 'refusee', 'manquante', 'expire_bientot']
    const out: PieceAControler[] = []
    for (const f of livreursDemo.lire().livreurs) {
      if (f.statut === 'retire') continue
      const l = vu(f, t)
      for (const p of l.pieces) {
        const raison: RaisonControle | null =
          p.statut === 'en_revue' ? 'a_controler' : p.statut === 'reverification' ? 'reverification' : p.statut === 'expiree' ? 'expiree' : p.statut === 'refusee' ? 'refusee' : p.statut === 'manquante' ? 'manquante' : p.expireLe !== null && p.expireLe - t <= P.alertePieceLivreurJours * JOUR ? 'expire_bientot' : null
        if (raison) out.push({ livreur: { id: l.id, nom: l.nom, initiales: l.initiales, vehicule: l.vehicule, statut: l.statut }, piece: p, raison })
      }
    }
    return repondre(out.sort((a, b) => ordre.indexOf(a.raison) - ordre.indexOf(b.raison) || (a.piece.envoyeeLe ?? a.piece.expireLe ?? 0) - (b.piece.envoyeeLe ?? b.piece.expireLe ?? 0)))
  },
  async voirPiece(id, type) {
    exiger(['proprietaire', 'repartiteur'], 'Voir une pièce')
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    const p = l?.pieces.find((x) => x.type === type)
    if (!l || !p || !p.faces.length) return non('statut')
    const t = maintenant()
    const par = nomUtilisateur()
    signer('rider.document_viewed', 'livreur:' + id, NOM_PIECE_DEMO[type], '', 'consultée')
    return repondre({ ok: true as const, faces: p.faces.map((face) => ({ face, url: imagePiece(l, p, face) })), valableJusqua: t + LIEN_PIECE_MIN * 60_000, filigrane: `${ENTREPRISE.nom} · ${par} · ${dateCourte(t)}` })
  },
  async controlerPiece(id, type, d) {
    exiger(['proprietaire', 'repartiteur'], 'Contrôler une pièce')
    const t = maintenant()
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    const p = l && pieceVue(l.pieces.find((x) => x.type === type)!, t)
    if (!l || !p || l.statut === 'retire') return non('statut')
    if (d.decision === 'refusee') {
      if (!d.motif?.trim()) return non('motif')
      if (p.statut !== 'en_revue' && p.statut !== 'valide') return non('statut')
    } else {
      if (p.statut !== 'en_revue') return non('statut')
      if (type !== 'selfie' && (!d.expireLe || d.expireLe <= t)) return non('date')
    }
    const par = nomUtilisateur() + ' · ' + NOM_ROLE_DEMO[roleCourant()]
    ecrire(id, (x) => {
      const q = x.pieces.find((y) => y.type === type)!
      q.statut = d.decision
      q.motif = d.decision === 'refusee' ? d.motif!.trim() : null
      if (d.decision === 'valide') {
        q.expireLe = type === 'selfie' ? null : d.expireLe!
        q.reverification = null // nouvelle photo validée : il reçoit de nouveau des missions
      }
      q.controle = { par, le: t }
    })
    signer('rider.document_reviewed', 'livreur:' + id, NOM_PIECE_DEMO[type], NOM_STATUT_PIECE[p.statut], d.decision === 'valide' ? 'validée' : 'refusée : ' + d.motif!.trim())
    notifier(id, d.decision === 'valide' ? `Votre entreprise a validé votre pièce (${NOM_PIECE_DEMO[type].toLowerCase()}).` : `Votre entreprise a refusé votre pièce (${NOM_PIECE_DEMO[type].toLowerCase()}) : ${d.motif!.trim()} Renvoyez-la depuis votre application.`)
    return repondre(ok)
  },
  async relancerPiece(id, type) {
    exiger(['proprietaire', 'repartiteur'], 'Relancer un livreur')
    const t = maintenant()
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    const p = l && pieceVue(l.pieces.find((x) => x.type === type)!, t)
    if (!l || !p || l.statut === 'retire') return non('statut')
    const bientot = p.expireLe !== null && p.expireLe - t <= P.alertePieceLivreurJours * JOUR
    if (!['refusee', 'manquante', 'expiree', 'reverification'].includes(p.statut) && !bientot) return non('statut')
    ecrire(id, (x) => void x.pieces.find((y) => y.type === type)!.relances.unshift(t))
    const nom = NOM_PIECE_DEMO[type].toLowerCase()
    notifier(id, p.statut === 'manquante' ? `Votre entreprise attend votre pièce (${nom}) : envoyez-la depuis votre application.` : p.statut === 'reverification' ? `Rappel : envoyez votre nouvelle photo avant le ${jourFr(p.reverification!.jusqua)} depuis votre application.` : p.statut === 'refusee' ? `Rappel : renvoyez votre pièce (${nom}) depuis votre application.` : `Rappel : votre pièce (${nom}) ${p.statut === 'expiree' ? 'a expiré' : 'arrive à expiration'} ; mettez-la à jour dans votre application.`)
    signer('rider.document_reminded', 'livreur:' + id, NOM_PIECE_DEMO[type], '', 'rappel envoyé')
    // Serge A. voit la pièce demandée dans son application (src/demo/pont.ts, même appareil).
    if (id === LIVREUR_DEMO) publier({ type: 'piece_demandee', piece: PIECE_PONT[type], motif: livreursDemo.lire().livreurs.find((x) => x.id === id)!.notifications![0].texte, jusqua: type === 'selfie' ? (p.reverification?.jusqua ?? null) : null }, `piece_demandee-${type}-${t}`, t)
    return repondre(ok)
  },
  async demanderPhoto(id, motif) {
    exiger(['proprietaire', 'repartiteur'], 'Demander une nouvelle photo')
    if (!motif.trim()) return non('motif')
    const t = maintenant()
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)
    const p = l?.pieces.find((x) => x.type === 'selfie')
    // La photo est l'identité vérifiée : une nouvelle vérification se demande sur une photo validée seulement.
    if (!l || !p || l.statut === 'retire' || p.statut !== 'valide') return non('statut')
    const par = nomUtilisateur() + ' · ' + NOM_ROLE_DEMO[roleCourant()]
    const jusqua = photoEcheance(t)
    // Statut dédié (DP-67, 5) : il garde PHOTO-REVERIF-J jours pour l'envoyer et continue de travailler.
    ecrire(id, (x) => {
      const q = x.pieces.find((y) => y.type === 'selfie')!
      q.statut = 'reverification'
      q.motif = null
      q.controle = { par, le: t }
      q.relances.unshift(t)
      q.reverification = { le: t, motif: motif.trim(), jusqua, bloque: false }
    })
    signer('rider.selfie_reverify_requested', 'livreur:' + id, NOM_PIECE_DEMO.selfie, 'validée', `nouvelle vérification demandée jusqu’au ${jourFr(jusqua)} : ${motif.trim()}`)
    notifier(id, `Votre entreprise demande une nouvelle vérification de votre photo : ${motif.trim()} Reprenez votre selfie depuis votre application avant le ${jourFr(jusqua)} ; d’ici là, vous travaillez normalement.`)
    if (id === LIVREUR_DEMO) publier({ type: 'piece_demandee', piece: 'selfie', motif: motif.trim(), jusqua }, `piece_demandee-selfie-${t}`, t)
    return repondre({ ...ok, jusqua })
  },
  async departs() {
    exiger(['proprietaire', 'repartiteur'], 'Départs des livreurs')
    return repondre(departsVus())
  },
  async constaterKit(id, c) {
    exiger(['proprietaire', 'repartiteur'], 'Constater le kit')
    const t = maintenant()
    const d = departsDemo.lire().departs.find((x) => x.livreurId === id && x.etat === 'demande')
    if (!d) return non('aucune_demande')
    // Retenue contestée par le livreur : le constat est figé (BelivaY examine).
    if (d.kit.contestation) return non('conteste')
    if (c.constat !== null && c.constat !== 'restitue' && c.constat !== 'incomplet') return non('constat')
    const avant = d.kit.constat === null ? 'non constaté' : d.kit.constat === 'restitue' ? 'restitué' : `incomplet (${F(d.kit.retenue)} F)`
    const par = nomUtilisateur() + ' · ' + NOM_ROLE_DEMO[roleCourant()]
    if (c.constat === null) {
      // Constat retiré (erreur de saisie) : la retenue tombe avec lui.
      departsDemo.ecrire((s) => void (s.departs.find((x) => x.id === d.id)!.kit = kitVide()))
      signer('courier.leave_kit_checked', 'livreur:' + id, 'kit', avant, 'constat retiré')
      if (id === LIVREUR_DEMO) publier({ type: 'depart_kit', id: d.id, constat: null, manquants: [], retenue: 0 }, `depart_kit-${d.id}-${t}`, t)
      return repondre({ ...ok, retenue: 0 })
    }
    const r = juger({ resultat: c.constat, manquants: c.manquants, photo: !!c.photo, montant: c.montant }, d.preavisJusqua, t)
    if (!r.ok) return non(r.raison === 'resultat' ? 'constat' : r.raison)
    departsDemo.ecrire((s) => void (s.departs.find((x) => x.id === d.id)!.kit = { constat: r.resultat, manquants: r.manquants, retenue: r.retenue, photo: r.resultat === 'incomplet' ? (c.photo ?? null) : null, constateLe: t, constatePar: par, contestation: null }))
    signer('courier.leave_kit_checked', 'livreur:' + id, 'kit', avant, r.resultat === 'restitue' ? 'restitué' : `incomplet : ${r.manquants.join(', ')} ; retenue ${F(r.retenue)} F (photo jointe)`)
    notifier(id, r.resultat === 'restitue' ? 'Votre entreprise a constaté que vous avez rendu tout votre kit.' : `Votre entreprise a constaté que votre kit est incomplet (${r.manquants.join(', ')}) : ${F(r.retenue)} F retenus sur votre dernier relevé. Vous pouvez contester depuis votre application.`)
    if (id === LIVREUR_DEMO) publier({ type: 'depart_kit', id: d.id, constat: r.resultat, manquants: r.manquants, retenue: r.retenue }, `depart_kit-${d.id}-${t}`, t)
    return repondre({ ...ok, retenue: r.retenue })
  },
  async cloturerDepart(id) {
    exiger(['proprietaire', 'repartiteur'], 'Clôturer un départ')
    const t = maintenant()
    const d = departsDemo.lire().departs.find((x) => x.livreurId === id && x.etat === 'demande')
    if (!d) return non('aucune_demande')
    const m = manquantes(conditionsDe(id, d.kit.constat !== null, t))
    if (m.length) return repondre({ ok: false as const, raison: 'conditions' as const, manquantes: m })
    const versementLe = vendrediSuivant(t)
    const l = livreursDemo.lire().livreurs.find((x) => x.id === id)!
    // Dernier relevé arrêté maintenant : le versement est figé (montants réels, quel que soit le rôle qui clôture).
    const { faitLe: _f, ...versement } = versementDe(d, l, t)
    departsDemo.ecrire((s) => void Object.assign(s.departs.find((x) => x.id === d.id)!, { etat: 'close', closLe: t, closPar: 'entreprise', versementLe, versement }))
    const avant = l.statut
    // Accès fermé, téléphone délié (numéro gardé pour les deux SMS) : le livreur sort de la flotte (il garde son historique ; preuves gardées).
    ecrire(id, (x) => {
      x.statut = 'retire'
      x.retraitDemande = null
    })
    signer('courier.leave_closed', 'livreur:' + id, 'rattachement', avant, `départ clôturé${t < d.preavisJusqua ? ' avant la fin du préavis (commun accord)' : ''} : dernier relevé, versement le vendredi suivant, accès fermé, téléphone délié, SMS au livreur, administrateur prévenu`)
    notifier(id, `SMS · Votre départ de ${ENTREPRISE.nom} est clôturé. Dernier versement en Mobile Money le ${jourFr(versementLe)}.`)
    if (id === LIVREUR_DEMO) publier({ type: 'depart_clos', id: d.id, par: 'entreprise', versementLe, kitNonConteste: false, versement }, `depart_clos-${d.id}`, t)
    return repondre({ ...ok, versementLe, kitNonConteste: false })
  },
  async versementFait(id) {
    exiger(['proprietaire'], 'Dernier versement fait')
    const t = maintenant()
    const d = departsDemo
      .lire()
      .departs.filter((x) => x.livreurId === id && x.etat === 'close')
      .sort((a, b) => (b.closLe ?? 0) - (a.closLe ?? 0))[0]
    if (!d) return non('aucune_demande')
    if (d.faitLe !== null) return non('deja_fait')
    departsDemo.ecrire((s) => void (s.departs.find((x) => x.id === d.id)!.faitLe = t))
    const montant = d.versement?.verse ?? null
    signer('courier.leave_paid', 'livreur:' + id, 'dernier versement', 'à verser', montant === null ? 'versé (Mobile Money)' : `${F(montant)} F versés (Mobile Money)`)
    notifier(id, montant === null ? `SMS · ${ENTREPRISE.nom} a fait votre dernier versement en Mobile Money.` : `SMS · ${ENTREPRISE.nom} a fait votre dernier versement : ${F(montant)} F en Mobile Money.`)
    if (id === LIVREUR_DEMO) publier({ type: 'versement_fait', id: d.id, montant }, `versement_fait-${d.id}`, t)
    return repondre(ok)
  },
  async absences() {
    exiger(['proprietaire', 'repartiteur'], 'Absences des livreurs')
    return repondre(absencesVues())
  },
  async absenceVue(absenceId) {
    exiger(['proprietaire', 'repartiteur'], 'Absence vue')
    const a = departsDemo.lire().absences.find((x) => x.id === absenceId)
    if (!a) return non('inconnue')
    if (a.vueLe !== null) return repondre(ok)
    const t = maintenant()
    departsDemo.ecrire((s) => void (s.absences.find((x) => x.id === absenceId)!.vueLe = t))
    signer('courier.absence_seen', 'livreur:' + a.livreurId, 'absence prévenue', `${a.du} → ${a.au}`, 'vue')
    if (a.livreurId === LIVREUR_DEMO) publier({ type: 'absence_vue', id: a.id }, `absence_vue-${a.id}`, t)
    return repondre(ok)
  },
  async joindreElements(id, evenementId, texte) {
    exiger(['proprietaire', 'repartiteur'], 'Joindre des éléments')
    if (!texte.trim()) return non('texte')
    const e = livreursDemo.lire().livreurs.find((x) => x.id === id)?.evenements?.find((x) => x.id === evenementId)
    if (!e?.contestation || e.contestation.elements) return non('statut')
    ecrire(id, (x) => (x.evenements!.find((y) => y.id === evenementId)!.contestation!.elements = texte.trim()))
    signer('trust.evidence_added', 'livreur:' + id, 'contestation', e.libelle, 'éléments de l’entreprise joints')
    return repondre(ok)
  },
}

/** Ajoute le livreur d'une invitation approuvée (flotte.ts). */
export function ajouterLivreur(l: FicheLivreur) {
  livreursDemo.ecrire((s) => void s.livreurs.push(l))
}
