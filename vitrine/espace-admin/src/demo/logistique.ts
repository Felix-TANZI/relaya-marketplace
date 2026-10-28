// DONNÉES DE DÉMONSTRATION — domaine « logistique » (S4 : ADM-P17 à P23 et la page ajoutée « candidatures »), sorti de
// lectures.ts. Le « serveur » de la démonstration : l'état vit dans magasin('logistique') (jeu d'essai des six espaces,
// src/demo/jeu-essai.ts, enrichi ici de ce que seule la logistique lit : places par classe, versement du vendredi,
// grilles, départs, plages d'étiquettes…), les états dérivés sont CALCULÉS à la lecture avec les règles du registre
// (pages/ADM-08/parametres.ts) : saturation, relais de secours, paquet sans preneur, départ échu, santé des zones,
// couverture des emballages. Ce sont des DONNÉES : seules les règles comptent.
// Décisions : l'écran ouvre DecisionMotivee (source.quatreyeux.decider : motif, preuves, journal) ; la source APPLIQUE
// ici chaque décision journalisée (une main) ou contresignée (quatre yeux), une seule fois (clé de la ligne du journal
// ou de la demande QY), après avoir revérifié le rôle, la zone et l'état (controle) — comme le serveur. Ce qui touche
// l'entreprise et le livreur part au pont (livreur_suspendu, livreur_retabli, kit_decide, depart_clos).
// Lu aussi du pont : départs demandés et annulés, constat du kit, clôture par l'entreprise, kit contesté.
import geo from '../../../logique-metier/livraison/zones-yaounde.geo.json' with { type: 'json' }
import { CENTRES } from '@client/donnees/geo'
import { PARAMETRES } from '../calculs/registre'
import { HEURE, JOUR, MINUTE, yaounde } from '../calculs/temps'
import { zoneDuPoint } from '../calculs/zones'
import { droitDe } from '../config/droits'
import type { CodeZone, Instant, Role } from '../donnees/communs'
import type {
  ActionLogistique,
  Candidature,
  ChangementIdentifiant,
  Classe,
  CouvertureZone,
  Depart,
  DomaineLogistique,
  DossierLivreur,
  Emballages,
  EntrepriseCourte,
  EntrepriseFiche,
  Etape,
  LigneGrille,
  LivreurCourt,
  LivreurFiche,
  Moment,
  PaquetCourt,
  PaquetFiche,
  Palier,
  PieceEntreprise,
  PlacementQuartier,
  PointCarte,
  RefEmballage,
  RegleGeste,
  RelaisCourt,
  RelaisFiche,
  StatutEntreprise,
  StatutLivreur,
  VersementDepart,
  ZonePilotage,
} from '../donnees/domaines/logistique'
import { PARAM } from '../pages/ADM-08/parametres'
import { maintenant } from './horloge'
import { agentCourant, dansPerimetre, exigerPage, roleCourant } from './acces'
import { ENTREPRISES, LITIGES, LIVREURS, PAQUETS, RELAIS, T, VENDEURS, ZONES, agent, nomAgent } from './jeu-essai'
import { journalDemo, journaliser } from './journal'
import { ACTEURS_DEMO, LIVREUR_DEMO, publier, evenementsPour, type VersementPont } from './pont'
import { quatreYeuxDemo } from './quatreyeux'
import { magasin, quandDonneesChangent, repondre } from './stockage'

const P = PARAM
/**
 * Identifiant d'un acteur DANS l'application qui reçoit une décision (pont) : la console garde ses propres
 * identifiants ; le relais et l'entreprise de démonstration portent ceux de leur espace (ACTEURS_DEMO).
 */
const VERS_PONT: Record<string, string> = { 'r-bastos': ACTEURS_DEMO.relais.id, 'e-yafe': ACTEURS_DEMO.entreprise.id }
export const idPont = (id: string): string => VERS_PONT[id] ?? id
const DU_PONT: Record<string, string> = Object.fromEntries(Object.entries(VERS_PONT).map(([a, b]) => [b, a]))
/** Ce que l'application d'un relais dit à la console (une fois par clé), rattaché à sa fiche. */
function relaisDuPont(): Map<string, { stock: { occupees: number; declarees: number } | null; annonce: RelaisCourt['annonce']; manquants: RelaisCourt['manquants'] }> {
  const m = new Map<string, { stock: { occupees: number; declarees: number } | null; annonce: RelaisCourt['annonce']; manquants: RelaisCourt['manquants'] }>()
  // Le seul relais qui publie en démonstration est celui de l'espace relais (ACTEURS_DEMO.relais).
  const de = () => {
    const id = DU_PONT[ACTEURS_DEMO.relais.id]
    if (!m.has(id)) m.set(id, { stock: null, annonce: null, manquants: [] })
    return m.get(id)!
  }
  for (const e of evenementsPour('admin')) {
    if (e.app !== 'relais') continue
    if (e.type === 'relay.stock.updated') de().stock = { occupees: e.occupees, declarees: e.declarees }
    if (e.type === 'relay.closure.declared') de().annonce = { du: e.du, au: e.au, motif: e.motif }
    if (e.type === 'relay.inventory.missing' && !de().manquants.some((x) => x.inventaire === e.inventaire)) de().manquants.push({ inventaire: e.inventaire, colis: e.colis, le: e.le })
  }
  return m
}
const NOM_PONT: Record<string, string> = { [ACTEURS_DEMO.relais.id]: ACTEURS_DEMO.relais.nom, [ACTEURS_DEMO.entreprise.id]: ACTEURS_DEMO.entreprise.nom, [ACTEURS_DEMO.livreur.id]: ACTEURS_DEMO.livreur.vu }
/** Inscriptions reçues des espaces relais et entreprise (account.requested) : des candidatures, une par dossier. */
function candidaturesDuPont(): Candidature[] {
  const out: Candidature[] = []
  for (const e of evenementsPour('admin')) {
    if (e.type !== 'account.requested' || (e.espace !== 'relais' && e.espace !== 'entreprise') || out.some((c) => c.id === e.dossier)) continue
    const requises = e.espace === 'relais' ? PIECES_RELAIS : PIECES_ENTREPRISE
    const zones: CodeZone[] = e.zones?.length ? (e.zones as CodeZone[]) : e.espace === 'relais' ? [ACTEURS_DEMO.vendeur.zone as CodeZone] : (ENTREPRISES.find((x) => x.id === DU_PONT[e.acteur])?.zones as CodeZone[] | undefined) ?? ['Z1']
    out.push({
      id: e.dossier, genre: e.espace, nom: e.denomination ?? NOM_PONT[e.acteur] ?? e.acteur, responsable: e.espace === 'relais' ? ACTEURS_DEMO.relais.gerante : '—', zone: zones[0], zones, deposeLe: e.le,
      pieces: requises.map((nature, i) => ({ nature, recue: i < e.pieces })), controles: { rccm: e.espace === 'relais' ? 'sans_objet' : 'ok', niu: e.espace === 'relais' ? 'sans_objet' : 'ok', listeNoire: false, doublon: null },
      etat: 'nouvelle', prisePar: null, complement: null, issue: null, secondDansZone: false, origine: { acteur: e.acteur, dossier: e.dossier },
    })
  }
  return out
}
/** Demandes d'activation des livreurs (account.requested, espace livreur). */
function dossiersDuPont(s: EtatLogistique): DossierLivreur[] {
  const out: DossierLivreur[] = []
  for (const e of evenementsPour('admin')) {
    if (e.type !== 'account.requested' || e.espace !== 'livreur' || out.some((d) => d.dossier === e.dossier)) continue
    const j = LIVREURS.find((x) => x.id === e.acteur)
    out.push({ dossier: e.dossier, acteur: e.acteur, livreurId: j?.id ?? null, nom: j?.nom ?? NOM_PONT[e.acteur] ?? e.acteur, entreprise: j?.entreprise ?? null, pieces: e.pieces, le: e.le, etat: s.activations.includes(e.dossier) ? 'active' : 'a_activer' })
  }
  return out
}
const exploitees = () => new Set(PARAMETRES.zonesExploitees.map((z) => z.code))
const nomZone = (z: CodeZone) => ZONES.find((x) => x.code === z)?.nom ?? z
const ETIQ: Record<string, [number, number]> = Object.fromEntries(geo.features.map((f) => [f.id as string, [f.properties.etiquette[0], f.properties.etiquette[1]] as [number, number]]))
/** Point de démonstration dans une zone : son point intérieur, décalé de quelques centaines de mètres. */
const pres = (z: CodeZone, dLat: number, dLng: number): [number, number] => [ETIQ[z][0] + dLat, ETIQ[z][1] + dLng]
/** Point de démonstration près du centre d'un quartier (site/src/donnees/geo.ts) : il tombe dans la zone du quartier. */
const presQ = (q: keyof typeof CENTRES, dLat: number, dLng: number): [number, number] => [CENTRES[q][0] + dLat, CENTRES[q][1] + dLng]
function distanceKm(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r)
  const y = (b[0] - a[0]) * r
  return Math.round(Math.sqrt(x * x + y * y) * 6371 * 10) / 10
}
/** Vendredi du versement : le prochain vendredi (aujourd'hui compris s'il est vendredi), à Yaoundé. */
export function vendrediCourant(t: number, strict = false): Instant {
  const j = new Date(t + HEURE)
  let d = (5 - j.getUTCDay() + 7) % 7
  if (strict && d === 0) d = 7
  return yaounde(j.getUTCFullYear(), j.getUTCMonth() + 1, j.getUTCDate() + d)
}
const places = (c: Record<Classe, number>) => c.S * P.relais.places.S + c.M * P.relais.places.M + c.L * P.relais.places.L

// ── Jeu d'essai propre à la logistique ─────────────────────────────────────────────────────────────────────────────
interface RelaisDonnee {
  id: string
  nom: string
  gerant: string
  zone: CodeZone
  capacite: number
  parClasse: Record<Classe, number>
  enGarde: number
  fermeA: string
  trustScore: number | null
  pos: [number, number]
  configuration: boolean
  remis: Record<Classe, number> // colis remis ou retours déposés depuis le dernier versement
  jours: number // jours de garde facturés
  especes: number // espèces de garde encaissées par le gérant (GARDE-ESPECES)
  reportPrecedent: number
  vendredisReport: number
  kyc: 'verifiee' | 'a_revoir' | 'manquante'
  dossier: string | null
  momo: string | null
  conventionLe: Instant | null
  visite: { le: Instant; agents: string } | null
  formationLe: Instant | null
  constats: number
  // État modifié par les gestes
  bascule: RelaisCourt['bascule']
  attente: RelaisCourt['attente']
  fermeture: RelaisCourt['fermeture']
  definitif: boolean
  finConvention: Instant | null
  plan: { le: Instant; par: string } | null
}
const r0 = (x: Partial<RelaisDonnee> & Pick<RelaisDonnee, 'id' | 'parClasse' | 'enGarde' | 'pos' | 'remis' | 'jours' | 'especes'>): RelaisDonnee => {
  const j = RELAIS.find((r) => r.id === x.id)!
  return {
    nom: j.nom, gerant: j.gerant, zone: j.zone, capacite: j.capacite, fermeA: '19 h 00', trustScore: 50, configuration: j.statut === 'en_activation',
    reportPrecedent: 0, vendredisReport: 0, kyc: 'verifiee', dossier: null, momo: 'MTN MoMo · vérifié', conventionLe: T(-24 * 60 * 24), visite: { le: T(-25 * 24 * 60), agents: 'Stéphane Tchoua et Linda Abena' }, formationLe: T(-24 * 24 * 60), constats: 0,
    bascule: null, attente: null, fermeture: null, definitif: false, finConvention: null, plan: null, ...x,
  }
}
const RELAIS_INITIAUX = (): RelaisDonnee[] => [
  r0({ id: 'r-bastos', parClasse: { S: 46, M: 13, L: 3 }, enGarde: 62, fermeA: '20 h 00', trustScore: 71, pos: presQ('Bastos', -0.0008, 0.0011), remis: { S: 24, M: 5, L: 2 }, jours: 22, especes: 7400 }),
  r0({ id: 'r-nlongkak', parClasse: { S: 17, M: 7, L: 0 }, enGarde: 24, trustScore: 63, pos: presQ('Nlongkak', 0.0006, -0.0009), remis: { S: 9, M: 2, L: 0 }, jours: 6, especes: 1200,
    fermeture: { depuis: T(-45), signalePar: 'Un client venu retirer son colis (SP-0212)', relance: null, transfert: null } }),
  r0({ id: 'r-mokolo', parClasse: { S: 72, M: 20, L: 6 }, enGarde: 98, trustScore: 58, pos: presQ('Mokolo', 0.0006, 0.0012), remis: { S: 40, M: 9, L: 3 }, jours: 41, especes: 23900, reportPrecedent: 21300, vendredisReport: 3, constats: 1 }),
  r0({ id: 'r-elobi', parClasse: { S: 12, M: 5, L: 0 }, enGarde: 17, trustScore: 66, pos: presQ('Mokolo', 0.0045, 0.003), remis: { S: 8, M: 1, L: 0 }, jours: 5, especes: 900 }),
  r0({ id: 'r-melen', parClasse: { S: 30, M: 7, L: 2 }, enGarde: 39, trustScore: 74, pos: presQ('Melen', 0.0011, 0.0012), remis: { S: 18, M: 4, L: 1 }, jours: 12, especes: 2600 }),
  r0({ id: 'r-obili', parClasse: { S: 0, M: 0, L: 0 }, enGarde: 0, trustScore: null, pos: presQ('Ngoa-Ekellé', 0.0014, -0.0021), remis: { S: 0, M: 0, L: 0 }, jours: 0, especes: 0,
    kyc: 'a_revoir', dossier: 'KYC-0088', conventionLe: T(-3 * 24 * 60), visite: { le: T(-2 * 24 * 60), agents: 'Linda Abena' }, formationLe: null }),
  r0({ id: 'r-biyem', parClasse: { S: 33, M: 9, L: 2 }, enGarde: 44, fermeA: '19 h 30', trustScore: 69, pos: presQ('Biyem-Assi', 0.0012, 0.0009), remis: { S: 15, M: 3, L: 0 }, jours: 9, especes: 1700 }),
  r0({ id: 'r-mvogada', parClasse: { S: 10, M: 4, L: 0 }, enGarde: 14, trustScore: 61, pos: presQ('Mvog-Ada', -0.0009, 0.0006), remis: { S: 6, M: 1, L: 0 }, jours: 3, especes: 600 }),
]

interface EntrepriseDonnee {
  id: string
  nom: string
  quartier: string
  zones: CodeZone[]
  capacites: Record<CodeZone, { capacite: number; acceptes: number }>
  livreurs: number
  livreursActifs: number
  palier: Palier
  base: StatutEntreprise
  trustScore: number | null
  acceptation: { acceptes: number; publies: number } | null
  delaiMin: number | null
  pertes: number
  rendus7j: number
  restrictionJusqua: Instant | null
  dirigeant: string
  contrat: string
  acces: string[]
  reglement: string
  pieces: PieceEntreprise[]
  pilote: Instant | null
  rapport: NonNullable<EntrepriseFiche['pilote']>['rapport']
  pos: [number, number]
  suspension: EntrepriseFiche['suspension']
}
const pieceOk = (nature: string, regle = 'Obligatoire', expireLe: Instant | null = null): PieceEntreprise => ({ nature, statut: 'verifiee', expireLe, regle })
const PIECES_BASE = (p: Partial<Record<string, PieceEntreprise>> = {}): PieceEntreprise[] =>
  [
    pieceOk('RCCM'),
    pieceOk('NIU'),
    pieceOk('CNI du responsable légal et selfie'),
    pieceOk('Autorisation de transport (MINT)', 'Aucune souplesse', T(200 * 24 * 60)),
    pieceOk('Assurance des véhicules', 'Aucune souplesse', T(140 * 24 * 60)),
    pieceOk('Numéro de règlement', 'Au nom de l’entreprise'),
    pieceOk('Agence et point de stockage de nuit', 'Photo et adresse'),
    pieceOk('Liste des livreurs', 'Nom, pièce, téléphone, véhicule'),
    { nature: 'Assurance marchandises', statut: 'non_requise', expireLe: null, regle: 'Exigée pour Confirmé et Or' } as PieceEntreprise,
  ].map((x) => p[x.nature] ?? x)
/** R81 : pièces d'une entreprise ; relais : pièces du gérant (paquet relais). */
const PIECES_ENTREPRISE = ['RCCM', 'NIU', 'CNI du responsable légal et selfie', 'Autorisation de transport (MINT)', 'Assurance des véhicules', 'Numéro de règlement', 'Agence et point de stockage de nuit', 'Liste des livreurs']
const PIECES_RELAIS = ['CNI du gérant et selfie', 'Photo du local', 'Numéro Mobile Money']
const jourRapport = (j: number, paquets: number, colis: number, a: number | null, r: number | null, s: [number, number], m: number) => ({ jour: T(-j * 24 * 60), paquets, colis, acceptationMin: a, ramassageMin: r, sous5h: s, remuneration: m })
const ENTREPRISES_INITIALES = (): EntrepriseDonnee[] => {
  const e = (id: string) => ENTREPRISES.find((x) => x.id === id)!
  return [
    { ...e('e-yafe'), base: 'pilote', capacites: { Z1: { capacite: 20, acceptes: 4 }, Z2: { capacite: 20, acceptes: 3 }, Z3: { capacite: 30, acceptes: 11 }, Z6: { capacite: 40, acceptes: 6 } }, livreursActifs: 19, trustScore: 72, acceptation: { acceptes: 61, publies: 64 }, delaiMin: 4, pertes: 0, rendus7j: 1, restrictionJusqua: null,
      dirigeant: 'Gaëlle Wankeu · propriétaire', contrat: 'Lettre d’engagement EL-2026-001 du 20 sept. ; contrat définitif après le bilan', acces: ['Gaëlle Wankeu (propriétaire)', 'Rodrigue Ndi (répartiteur)', 'Josiane Mballa (comptable)'], reglement: 'MTN MoMo ···· 4 51',
      pieces: PIECES_BASE(), pilote: yaounde(2026, 9, 21, 7, 30), pos: presQ('Mokolo', 0.0019, -0.0014), suspension: null,
      rapport: [jourRapport(4, 9, 41, 5, 31, [9, 9], 21650), jourRapport(3, 8, 37, 4, 28, [8, 8], 19300), jourRapport(2, 11, 52, 4, 33, [10, 11], 26400), jourRapport(1, 10, 44, 3, 27, [10, 10], 22950), jourRapport(0, 6, 25, 4, 29, [3, 3], 12700)] },
    { ...e('e-mboa'), base: 'pilote', capacites: { Z2: { capacite: 15, acceptes: 3 }, Z6: { capacite: 15, acceptes: 4 } }, livreursActifs: 8, trustScore: 64, acceptation: { acceptes: 18, publies: 21 }, delaiMin: 7, pertes: 0, rendus7j: 0, restrictionJusqua: null,
      dirigeant: 'Ernest Ndzana · gérant', contrat: 'Lettre d’engagement EL-2026-004 du 30 sept.', acces: ['Ernest Ndzana (gérant)', 'Aline Fouda (répartitrice)'], reglement: 'Orange Money ···· 8 07',
      pieces: PIECES_BASE({ 'CNI du responsable légal et selfie': { nature: 'CNI du responsable légal et selfie', statut: 'en_verification', expireLe: null, regle: 'Obligatoire · KYC-0094' }, 'Assurance des véhicules': pieceOk('Assurance des véhicules', 'Aucune souplesse', T(6 * 24 * 60)) }),
      pilote: yaounde(2026, 10, 1, 8, 0), pos: presQ('Biyem-Assi', -0.0015, 0.0018), suspension: null,
      rapport: [jourRapport(2, 3, 14, 8, 41, [3, 3], 5850), jourRapport(1, 4, 17, 6, 36, [3, 4], 7200), jourRapport(0, 2, 9, 7, 38, [2, 2], 3600)] },
    { ...e('e-rapide'), base: 'active', capacites: { Z1: { capacite: 10, acceptes: 0 } }, livreursActifs: 3, trustScore: 48, acceptation: { acceptes: 5, publies: 9 }, delaiMin: 11, pertes: 1, rendus7j: 4, restrictionJusqua: T(5 * 24 * 60),
      dirigeant: 'Paulin Mbida · gérant', contrat: 'Contrat C-2026-002 du 2 sept.', acces: ['Paulin Mbida (gérant)'], reglement: 'MTN MoMo ···· 2 19', pieces: PIECES_BASE(), pilote: null, pos: presQ('Bastos', 0.0013, -0.0016), suspension: null, rapport: [] },
  ] as EntrepriseDonnee[]
}

interface LivreurDonnee {
  id: string
  vehicule: LivreurCourt['vehicule']
  trustScore: number | null
  missionsJour: number
  incidents30j: number
  pieceAlerte: LivreurCourt['pieceAlerte']
  reverification: Instant | null
  modules: number
  quiz: number | null
  certifieLe: Instant | null
  derniereSync: Instant | null
  suspension: LivreurCourt['suspension']
  statut: StatutLivreur
}
const l0 = (id: string, v: LivreurCourt['vehicule'], ts: number | null, x: Partial<LivreurDonnee> = {}): LivreurDonnee => ({
  id, vehicule: v, trustScore: ts, missionsJour: 0, incidents30j: 0, pieceAlerte: null, reverification: null, modules: 7, quiz: 17, certifieLe: T(-30 * 24 * 60), derniereSync: T(-1), suspension: null,
  statut: LIVREURS.find((l) => l.id === id)!.statut as StatutLivreur, ...x,
})
const LIVREURS_INITIAUX = (): LivreurDonnee[] => [
  l0('l-serge', { type: 'moto', plaque: 'CE 482 KB' }, 74, { missionsJour: 3, quiz: 18 }),
  l0('l-josiane', { type: 'moto', plaque: 'CE 219 LT' }, 81, { missionsJour: 2 }),
  l0('l-kevin', { type: 'moto', plaque: 'CE 733 AF' }, 66, { missionsJour: 2, incidents30j: 1, derniereSync: T(-14) }),
  l0('l-herve', { type: 'moto', plaque: 'CE 881 HF' }, null, { modules: 5, quiz: null, certifieLe: null, derniereSync: null }),
  l0('l-junior', { type: 'tricycle', plaque: 'CE 105 TC' }, 77, { missionsJour: 1, reverification: T(5 * 24 * 60) }),
  l0('l-ines', { type: 'moto', plaque: 'CE 554 IK' }, 72, { missionsJour: 1, pieceAlerte: { piece: 'Assurance du véhicule', expireLe: T(3 * 24 * 60) } }),
  l0('l-brice', { type: 'moto', plaque: 'CE 640 BN' }, 69, { missionsJour: 2, incidents30j: 1, pieceAlerte: { piece: 'Permis de conduire', expireLe: T(32 * 24 * 60) } }),
  l0('l-armel', { type: 'moto', plaque: 'CE 310 AB' }, 58, {}),
  l0('l-flore', { type: 'moto', plaque: 'CE 902 FN' }, 75, { missionsJour: 1 }),
  l0('l-cedric', { type: 'voiture', plaque: 'CE 118 CM' }, 38, { suspension: { motif: 'Encaissement d’espèces constaté auprès d’un client (sanction de niveau 3)', depuis: T(-3 * 24 * 60), jusqua: T(11 * 24 * 60), par: 'Mireille Ngo Bassong · Médiation' } }),
]

interface DepartDonnee {
  id: string
  livreurId: string
  livreur: string
  entreprise: string
  zones: CodeZone[]
  demandeLe: Instant
  motif: string
  preavisJusqua: Instant
  missionEnCours: boolean
  colisSousGarde: number
  kit: Depart['kit']
  contestation: Depart['contestation']
  clos: Depart['clos']
  versement: VersementDepart
}
const DEPARTS_INITIAUX = (): DepartDonnee[] => {
  const v = (du: number | null, missions: number, retenueKit = 0): VersementDepart => ({ du, missions, retenuLitiges: 0, litiges: 0, retenueKit, kitDeCote: 0, verse: du === null ? null : Math.max(0, du - retenueKit) })
  const kit0 = () => ({ constat: null, manquants: [] as string[], retenue: 0, constateLe: null })
  return [
    { id: 'DP-0412', livreurId: 'l-josiane', livreur: 'Josiane E.', entreprise: 'Yafé Express', zones: ['Z3'], demandeLe: T(-3 * 24 * 60 - 95), motif: 'Autre emploi', preavisJusqua: T(-3 * 24 * 60 - 95) + P.livreurs.preavisJ * JOUR, missionEnCours: true, colisSousGarde: 8, kit: kit0(), contestation: null, clos: null, versement: v(10800, 9) },
    { id: 'DP-0398', livreurId: 'l-kevin', livreur: 'Kevin D.', entreprise: 'Yafé Express', zones: ['Z6'], demandeLe: T(-7 * 24 * 60 - 95), motif: 'Déménagement', preavisJusqua: T(-7 * 24 * 60 - 95) + P.livreurs.preavisJ * JOUR, missionEnCours: true, colisSousGarde: 1, kit: kit0(), contestation: null, clos: null, versement: v(16800, 14) },
    { id: 'DP-0385', livreurId: 'l-armel', livreur: 'Armel B.', entreprise: 'Mboa Logistique', zones: ['Z2', 'Z6'], demandeLe: T(-11 * 24 * 60 - 300), motif: 'Rémunération', preavisJusqua: T(-11 * 24 * 60 - 300) + P.livreurs.preavisJ * JOUR, missionEnCours: false, colisSousGarde: 0, kit: kit0(), contestation: null, clos: null, versement: v(7200, 6) },
    { id: 'DP-0377', livreurId: 'l-pascal', livreur: 'Pascal E.', entreprise: 'Mboa Logistique', zones: ['Z6'], demandeLe: T(-10 * 24 * 60), motif: 'Santé', preavisJusqua: T(-3 * 24 * 60), missionEnCours: false, colisSousGarde: 0,
      kit: { constat: 'incomplet', manquants: ['sac de transport étanche'], retenue: 8000, constateLe: T(-3 * 24 * 60 + 120) },
      contestation: { le: T(-20 * 60), motif: 'Le sac étanche a été rendu au répartiteur le 9 octobre, il a signé le cahier de l’agence.', decision: null, decideLe: null, par: null },
      clos: { le: T(-2 * 24 * 60), par: 'entreprise', kitNonConteste: false, versementLe: vendrediCourant(T(-2 * 24 * 60), true) }, versement: { ...v(9600, 8, 8000), kitDeCote: 8000, verse: 1600 } },
  ]
}

const CHANGEMENTS_INITIAUX = (): ChangementIdentifiant[] => [
  { id: 'CI-0012', livreurId: 'l-junior', livreur: 'Junior T.', entreprise: 'Yafé Express', zone: 'Z3', nature: 'telephone', ancien: '+237 6•• •• •• 41', nouveau: '+237 6•• •• •• 87', raison: 'Téléphone volé au marché Mokolo le 11 octobre ; plainte déposée, nouvelle puce à son nom.', demandeLe: T(-150), controles: { listeNoire: false, doublon: false }, etat: 'a_decider' },
  { id: 'CI-0013', livreurId: 'l-brice', livreur: 'Brice N.', entreprise: 'Yafé Express', zone: 'Z1', nature: 'appareil', ancien: 'Android · Tecno ••• 3F2', nouveau: 'Android · Itel ••• 9A0', raison: 'Écran cassé, nouvel appareil prêté par l’agence.', demandeLe: T(-60), controles: { listeNoire: false, doublon: true }, etat: 'a_decider' },
]

interface PaquetDonnee {
  id: string
  destination: string
  valeurMax: number
  publieLe: Instant | null
  base: PaquetCourt['etat']
  arrets: PaquetFiche['arrets']
  colisDetail: PaquetFiche['colisDetail']
  escalade: PaquetCourt['escalade']
  // paquet ajouté (absent du jeu commun)
  extra?: Pick<PaquetCourt, 'zone' | 'genre' | 'entreprise' | 'livreur' | 'colis' | 'heureLimite'>
}
const c = (etiquette: string, classe: Classe, vendeur: string, valeur: number, paiement: string, preuves: string) => ({ etiquette, classe, vendeur, valeur, paiement, preuves })
const a = (n: number, t: string, s: string, etat: 'fait' | 'en_cours' | 'a_venir' | 'mauvais', depot = false) => ({ n, t, s, etat, depot })
const ESC0 = { elargi: null, priorite: null, prevenu: null }
const PAQUETS_INITIAUX = (): PaquetDonnee[] => [
  { id: 'PQ-Z1-261013-003', destination: 'Relais Bastos Carrefour', valeurMax: 20900, publieLe: T(-130), base: 'en_route', escalade: { ...ESC0 },
    arrets: [a(1, 'Tonton PG · Mvog-Mbi', '3 colis · code validé', 'fait'), a(2, 'Techno Bastos · Bastos', '2 colis · code validé', 'fait'), a(3, 'Relais Bastos Carrefour', 'Dépôt des 5 colis : scan du QR de mission', 'en_cours', true)],
    colisDetail: [c('BV 24 8137', 'S', 'Tonton PG', 20900, 'Payé · BLV-00008', 'C1 ✓ · scellé'), c('BV 24 8138', 'S', 'Tonton PG', 14900, 'Payé · BLV-00009', 'C1 ✓ · scellé'), c('BV 24 8139', 'S', 'Tonton PG', 4900, 'Payé · BLV-00011', 'C1 ✓ · scellé'), c('BV 24 8140', 'M', 'Techno Bastos', 18500, 'Payé', 'C1 ✓ · scellé'), c('BV 24 8141', 'S', 'Techno Bastos', 9900, 'Payé', 'C1 ✓ · scellé')] },
  { id: 'PQ-Z3-261013-007', destination: 'Relais Mokolo Marché', valeurMax: 28900, publieLe: T(-150), base: 'en_route', escalade: { ...ESC0 },
    arrets: [a(1, 'Maman Wax Mokolo · Mokolo', '8 colis · code validé', 'fait'), a(2, 'Relais Mokolo Marché', 'Dépôt des 8 colis', 'en_cours', true)],
    colisDetail: [c('BV 24 8160', 'M', 'Maman Wax Mokolo', 28900, 'Payé · BLV-52230', 'C1 ✓ · scellé'), c('BV 24 8161', 'S', 'Maman Wax Mokolo', 13000, 'Payé', 'C1 ✓ · scellé')] },
  { id: 'PQ-Z6-261013-002', destination: 'Quartier Melen', valeurMax: 12400, publieLe: T(-330), base: 'en_retard', escalade: { elargi: null, priorite: T(-95), prevenu: null },
    arrets: [a(1, 'Beauté Melen · Melen', '1 colis · code validé', 'fait'), a(2, 'Quartier Melen', 'Remise au client : code, photo et position', 'en_cours')],
    colisDetail: [c('BV 24 8190', 'S', 'Beauté Melen', 12400, 'Payé · BLV-52241', 'C1 ✓ · scellé')] },
  { id: 'PQ-Z6-261013-004', destination: 'Relais Biyem-Assi Lycée', valeurMax: 64500, publieLe: T(-25), base: 'accepte', escalade: { ...ESC0 },
    arrets: [a(1, 'Pièces Auto Biyem · Biyem-Assi', '6 colis prêts', 'a_venir'), a(2, 'Relais Biyem-Assi Lycée', 'Dépôt', 'a_venir', true)],
    colisDetail: [c('BV 24 9010', 'L', 'Pièces Auto Biyem', 64500, 'Payé · BLV-52245', 'à ramasser')] },
  { id: 'PQ-Z3-261013-009', destination: 'Retour vendeur · Maman Wax Mokolo', valeurMax: 28900, publieLe: T(-25), base: 'publie', escalade: { ...ESC0 },
    arrets: [a(1, 'Relais Mokolo Marché', '2 retours à reprendre', 'a_venir'), a(2, 'Maman Wax Mokolo · Mokolo', 'Remise au vendeur', 'a_venir')],
    colisDetail: [c('BV 24 8155', 'M', 'Maman Wax Mokolo', 28900, 'Retour · LT-0418', 'photo au comptoir'), c('BV 24 8156', 'S', 'Maman Wax Mokolo', 6500, 'Retour', 'photo au comptoir')] },
  { id: 'PQ-Z1-261013-005', destination: 'Quartier Bastos', valeurMax: 18500, publieLe: T(-120), base: 'incident', escalade: { ...ESC0 },
    arrets: [a(1, 'Techno Bastos · Bastos', '1 colis · code validé', 'fait'), a(2, 'Quartier Bastos', 'Client absent : incident déclaré par le livreur', 'mauvais')],
    colisDetail: [c('BV 24 8219', 'M', 'Techno Bastos', 18500, 'Payable au retrait', 'C1 ✓ · scellé')] },
  { id: 'PQ-Z6-261013-001', destination: 'Relais Melen Université', valeurMax: 9800, publieLe: T(-300), base: 'livre', escalade: { ...ESC0 },
    arrets: [a(1, 'Saveurs du Pays · Melen', '7 colis', 'fait'), a(2, 'Relais Melen Université', '7 sur 7 déposés', 'fait', true)], colisDetail: [c('BV 24 8247', 'S', 'Saveurs du Pays', 9800, 'Payé', 'C1 ✓ · C2 ✓')] },
  { id: 'PQ-Z6-261013-003', destination: 'Relais Biyem-Assi Lycée', valeurMax: 22000, publieLe: T(-260), base: 'livre', escalade: { ...ESC0 },
    arrets: [a(1, 'Pièces Auto Biyem · Biyem-Assi', '4 colis', 'fait'), a(2, 'Relais Biyem-Assi Lycée', '4 sur 4 déposés', 'fait', true)], colisDetail: [c('BV 24 8276', 'S', 'Pièces Auto Biyem', 22000, 'Payé', 'C1 ✓ · C2 ✓')] },
  { id: 'PQ-Z1-261013-006', destination: 'Quartier Bastos', valeurMax: 335000, publieLe: T(-185), base: 'publie', escalade: { ...ESC0 },
    extra: { zone: 'Z1', genre: 'domicile', entreprise: null, livreur: null, colis: 1, heureLimite: T(105) },
    arrets: [a(1, 'Techno Bastos · Bastos', '1 colis de valeur prêt', 'a_venir'), a(2, 'Quartier Bastos', 'Remise au client', 'a_venir')], colisDetail: [c('BV 24 8301', 'M', 'Techno Bastos', 335000, 'Payé', 'à ramasser')] },
  { id: 'PQ-Z6-261013-008', destination: 'Relais Melen Université', valeurMax: 15500, publieLe: null, base: 'constitution', escalade: { ...ESC0 },
    extra: { zone: 'Z6', genre: 'relais', entreprise: null, livreur: null, colis: 4, heureLimite: T(220) },
    arrets: [a(1, 'Beauté Melen · Melen', '3 colis prêts', 'a_venir'), a(2, 'Saveurs du Pays · Melen', '1 colis prêt', 'a_venir'), a(3, 'Relais Melen Université', 'Dépôt', 'a_venir', true)], colisDetail: [c('BV 24 8250', 'S', 'Beauté Melen', 15500, 'Payé', 'prêt')] },
]

// Statistiques de 7 jours par zone (démonstration) ; santé et état calculés à la lecture (ZONE-SCORE, ZONE-ALERTE).
const STATS: Record<CodeZone, { commandes: number; delai: number | null; livres: [number, number]; vendeurs: number; remplissage: number | null; demandes: number; recherches: { q: string; n: number }[] }> = {
  Z1: { commandes: 41, delai: 140, livres: [32, 35], vendeurs: 1, remplissage: 6.1, demandes: 4, recherches: [{ q: 'chargeur iPhone', n: 3 }] },
  Z2: { commandes: 29, delai: 125, livres: [24, 24], vendeurs: 0, remplissage: 5.2, demandes: 3, recherches: [{ q: 'manuels universitaires', n: 5 }] },
  Z3: { commandes: 58, delai: 172, livres: [38, 50], vendeurs: 1, remplissage: 7.4, demandes: 6, recherches: [{ q: 'pagne wax 12 yards', n: 4 }] },
  Z4: { commandes: 3, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 2, recherches: [] },
  Z5: { commandes: 2, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 2, recherches: [] },
  Z6: { commandes: 47, delai: 150, livres: [37, 42], vendeurs: 3, remplissage: 6.7, demandes: 5, recherches: [{ q: 'pneus', n: 2 }] },
  Z7: { commandes: 6, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 3, recherches: [{ q: 'fournitures de bureau', n: 3 }] },
  Z8: { commandes: 1, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 1, recherches: [] },
  Z9: { commandes: 5, delai: null, livres: [0, 0], vendeurs: 1, remplissage: null, demandes: 5, recherches: [{ q: 'électroménager', n: 5 }] },
  Z10: { commandes: 9, delai: null, livres: [0, 0], vendeurs: 1, remplissage: null, demandes: 11, recherches: [{ q: 'pièces moto', n: 5 }, { q: 'riz 25 kg', n: 4 }] },
  Z11: { commandes: 2, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 2, recherches: [] },
  Z12: { commandes: 1, delai: null, livres: [0, 0], vendeurs: 0, remplissage: null, demandes: 1, recherches: [] },
}

const REFS: RefEmballage[] = ['S', 'M', 'L', 'C1', 'C2']
const FORMATS: Record<RefEmballage, string> = Object.fromEntries(
  REFS.map((r) => [r, new RegExp('(?:^|·)\\s*' + r + '\\s+([\\d×]+)').exec(P.emballages.formats)?.[1] ?? '—']),
) as Record<RefEmballage, string>

interface EtatLogistique {
  appliquees: string[]
  refusees: { cle: string; action: string; objet: string; raison: string }[]
  relais: RelaisDonnee[]
  entreprises: (EntrepriseDonnee & { statutAvant: StatutEntreprise | null })[]
  livreurs: LivreurDonnee[]
  departs: DepartDonnee[]
  decisionsDepart: { id: string; clos?: Depart['clos']; versement?: VersementDepart; decision?: { d: 'retenue_maintenue' | 'retenue_annulee'; le: Instant; par: string } }[]
  changements: ChangementIdentifiant[]
  paquets: PaquetDonnee[]
  plans: { zone: CodeZone; le: Instant; par: string; motif: string; echeance: Instant }[]
  saisons: { zone: CodeZone; depuis: Instant; par: string }[]
  placements: PlacementQuartier[]
  emb: {
    siege: Record<RefEmballage, number>
    avance: Record<RefEmballage, number>
    conso: Record<RefEmballage, number>
    mouvements: Emballages['mouvements']
    ecarts: Emballages['ecarts']
    plages: Emballages['plages']
  }
  candidatures: Candidature[]
  /** Dossiers d'activation (pont) déjà activés. */
  activations: string[]
  positions: { livreurId: string; le: Instant }[]
}

const etatLog = magasin<EtatLogistique>('logistique', () => ({
  appliquees: [],
  refusees: [],
  relais: RELAIS_INITIAUX(),
  entreprises: ENTREPRISES_INITIALES().map((e) => ({ ...e, statutAvant: null })),
  livreurs: LIVREURS_INITIAUX(),
  departs: DEPARTS_INITIAUX(),
  decisionsDepart: [],
  changements: CHANGEMENTS_INITIAUX(),
  paquets: PAQUETS_INITIAUX(),
  plans: [],
  saisons: [],
  placements: [
    { quartier: 'melen', zone: 'Z6', alias: 'Melen', demandes: 0 },
    { quartier: 'Mbiyemassi', zone: 'Z6', alias: 'Biyem-Assi', demandes: 0 },
    { quartier: 'Nkolfoulou', zone: null, alias: null, demandes: 3 },
    { quartier: 'Ekie', zone: null, alias: null, demandes: 2 },
    { quartier: 'Nkolmesseng', zone: null, alias: null, demandes: 2 },
    { quartier: 'Messassi', zone: null, alias: null, demandes: 1 },
  ],
  emb: {
    siege: { S: 120, M: 360, L: 190, C1: 96, C2: 52 },
    avance: { S: 95, M: 80, L: 38, C1: 18, C2: 6 },
    conso: { S: 16.5, M: 9.2, L: 3.1, C1: 1.4, C2: 0.4 },
    mouvements: [
      { le: yaounde(2026, 9, 18, 10, 0), nature: 'Achat · fournisseur Cartonnerie du Centre', quantites: 'S 600 · M 720 · L 300 · C1 150 · C2 70', piece: 'BC-2026-007' },
      { le: yaounde(2026, 9, 21, 7, 0), nature: 'Remise à Yafé Express (avance)', quantites: 'S 260 · M 200 · L 70 · C1 30 · C2 10', piece: 'BR-WNK-001' },
      { le: yaounde(2026, 10, 1, 9, 30), nature: 'Remise à Mboa Logistique (avance)', quantites: 'S 90 · M 60 · L 20 · C1 10 · C2 4', piece: 'BR-MBO-001' },
      { le: yaounde(2026, 10, 8, 15, 0), nature: 'Réapprovisionnement Yafé Express', quantites: 'S 80 · M 40 · L 10', piece: 'BR-WNK-004' },
    ],
    ecarts: [
      { entrepriseId: 'e-yafe', entreprise: 'Yafé Express', lignes: [{ ref: 'S', remis: 340, etiquettes: 268, doitRester: 72, compte: 70, justifie: 1 }, { ref: 'M', remis: 240, etiquettes: 186, doitRester: 54, compte: 52, justifie: 0 }, { ref: 'L', remis: 80, etiquettes: 51, doitRester: 29, compte: 29, justifie: 0 }], avancesMois: 660, nonJustifie: 0, ecartPct: 0, coutUnitaire: 180, facture: null, justificationDemandee: null },
      { entrepriseId: 'e-mboa', entreprise: 'Mboa Logistique', lignes: [{ ref: 'S', remis: 90, etiquettes: 61, doitRester: 29, compte: 22, justifie: 0 }, { ref: 'M', remis: 60, etiquettes: 41, doitRester: 19, compte: 16, justifie: 0 }, { ref: 'L', remis: 20, etiquettes: 12, doitRester: 8, compte: 8, justifie: 0 }], avancesMois: 170, nonJustifie: 0, ecartPct: 0, coutUnitaire: 180, facture: null, justificationDemandee: null },
    ],
    plages: [
      ['pl-serge', 'Yafé Express', 'Serge A.', 8130, 12],
      ['pl-josiane', 'Yafé Express', 'Josiane E.', 8159, 20],
      ['pl-kevin', 'Yafé Express', 'Kevin D.', 8188, 25],
      ['pl-brice', 'Yafé Express', 'Brice N.', 8217, 9],
      ['pl-junior', 'Yafé Express', 'Junior T.', 8246, 4],
      ['pl-flore', 'Mboa Logistique', 'Flore N.', 9001, 15],
      ['pl-armel', 'Mboa Logistique', 'Armel B.', 9030, 22],
    ].map(([id, entreprise, livreur, debut, n]) => plage(id as string, entreprise as string, livreur as string, debut as number, n as number)),
  },
  candidatures: [
    { id: 'CAND-0031', genre: 'entreprise', nom: 'Taty’s Delivery Service', responsable: 'Tatiana Ewodo', zone: 'Z6', zones: ['Z2', 'Z6'], deposeLe: T(-26 * 60), pieces: [{ nature: 'RCCM', recue: true }, { nature: 'NIU', recue: true }, { nature: 'CNI du responsable légal et selfie', recue: true }, { nature: 'Autorisation de transport (MINT)', recue: true }, { nature: 'Assurance des véhicules', recue: true }, { nature: 'Numéro de règlement', recue: true }, { nature: 'Agence et point de stockage de nuit', recue: true }, { nature: 'Liste des livreurs', recue: true }], controles: { rccm: 'ok', niu: 'ok', listeNoire: false, doublon: null }, etat: 'nouvelle', prisePar: null, complement: null, issue: null, secondDansZone: false },
    { id: 'CAND-0032', genre: 'entreprise', nom: 'Express Bastos Services', responsable: 'Paulin Mbida', zone: 'Z1', zones: ['Z1'], deposeLe: T(-5 * 60), pieces: [{ nature: 'RCCM', recue: true }, { nature: 'NIU', recue: true }, { nature: 'CNI du responsable légal et selfie', recue: true }, { nature: 'Autorisation de transport (MINT)', recue: false }, { nature: 'Assurance des véhicules', recue: true }, { nature: 'Numéro de règlement', recue: true }, { nature: 'Agence et point de stockage de nuit', recue: false }, { nature: 'Liste des livreurs', recue: false }], controles: { rccm: 'ok', niu: 'ok', listeNoire: false, doublon: 'Même NIU que Rapide Colis Yaoundé (restreinte)' }, etat: 'nouvelle', prisePar: null, complement: null, issue: null, secondDansZone: false },
    { id: 'CAND-0029', genre: 'relais', nom: 'Boutique Chez Ma’a Rose · Nkolbikok', responsable: 'Rose Ekotto', zone: 'Z6', zones: ['Z6'], deposeLe: T(-3 * 24 * 60), pieces: [{ nature: 'CNI du gérant et selfie', recue: true }, { nature: 'Photo du local', recue: true }, { nature: 'Numéro Mobile Money', recue: true }], controles: { rccm: 'sans_objet', niu: 'sans_objet', listeNoire: false, doublon: null }, etat: 'prise', prisePar: 'Yannick Owona', complement: null, issue: null, secondDansZone: true },
    { id: 'CAND-0030', genre: 'relais', nom: 'Kiosque Emana Carrefour', responsable: 'Jules Abanda', zone: 'Z12', zones: ['Z12'], deposeLe: T(-2 * 24 * 60), pieces: [{ nature: 'CNI du gérant et selfie', recue: true }, { nature: 'Photo du local', recue: false }, { nature: 'Numéro Mobile Money', recue: true }], controles: { rccm: 'sans_objet', niu: 'sans_objet', listeNoire: false, doublon: null }, etat: 'complement', prisePar: 'Armand Kouam', complement: { le: T(-30 * 60), demande: 'Photo du local, porte ouverte et étagères visibles' }, issue: null, secondDansZone: false },
    { id: 'CAND-0027', genre: 'relais', nom: 'Cyber Tsinga', responsable: 'Hervé Ateba', zone: 'Z3', zones: ['Z3'], deposeLe: T(-4 * 24 * 60), pieces: [{ nature: 'CNI du gérant et selfie', recue: true }, { nature: 'Photo du local', recue: true }, { nature: 'Numéro Mobile Money', recue: true }], controles: { rccm: 'sans_objet', niu: 'sans_objet', listeNoire: true, doublon: null }, etat: 'nouvelle', prisePar: null, complement: null, issue: null, secondDansZone: true },
  ],
  activations: [],
  positions: [],
}))

function plage(id: string, entreprise: string, livreur: string, debut: number, consommees: number) {
  const total = 29
  const n = (x: number) => `BV 24 ${x}`
  return { id, entreprise, livreur, plage: `${n(debut)} – ${n(debut + total - 1)}`, total, consommees, prochaine: n(debut + consommees), etat: 'active' as const }
}

// ── Calculs (règles du registre) ───────────────────────────────────────────────────────────────────────────────────
function relaisCourt(r: RelaisDonnee, tous: RelaisDonnee[], le: Instant): RelaisCourt {
  const pont = relaisDuPont().get(r.id)
  if (pont?.stock) r = { ...r, capacite: pont.stock.declarees }
  const occupes = pont?.stock ? pont.stock.occupees : places(r.parClasse)
  const taux = r.capacite ? Math.round((100 * occupes) / r.capacite) : 0
  const ferme = !!r.fermeture && !r.fermeture.transfert ? true : r.definitif
  const statut: RelaisCourt['statut'] = r.configuration ? 'en_configuration' : ferme || r.fermeture ? 'ferme' : r.finConvention ? 'fin_convention' : taux >= P.relais.saturePct ? 'sature' : 'ouvert'
  const besoin = r.fermeture && !r.fermeture.transfert ? occupes : 0
  const secours = statut === 'sature' || (statut === 'ferme' && !r.definitif) ? relaisSecours(r, tous, besoin) : null
  const gains = r.remis.S * P.relais.gains.S + r.remis.M * P.relais.gains.M + r.remis.L * P.relais.gains.L + r.jours * P.relais.garde
  const solde = gains - r.especes - r.reportPrecedent
  return {
    id: r.id, nom: r.nom, gerant: r.gerant, zone: r.zone, zoneNom: nomZone(r.zone), statut, capacite: r.capacite, occupes, taux, enGarde: r.enGarde, parClasse: r.parClasse, fermeA: r.fermeA, trustScore: r.trustScore, lat: r.pos[0], lng: r.pos[1],
    versement: { vendredi: vendrediCourant(le), colisRemis: r.remis.S + r.remis.M + r.remis.L, jours: r.jours, gains, especes: r.especes, solde, aVerser: Math.max(0, solde), report: Math.max(0, -solde), vendredisReport: solde < 0 ? r.vendredisReport + 1 : 0, plan: r.plan },
    bascule: r.bascule, attente: r.attente, secours, fermeture: r.fermeture,
    convention: { signeeLe: r.conventionLe, version: 1, finLe: r.finConvention },
    etapes: etapesRelais(r),
    constatsOuverts: r.constats,
    annonce: pont?.annonce ?? null,
    manquants: pont?.manquants ?? [],
  }
}
/** Relais ouvert le plus proche qui garde la place sous le seuil de saturation, sinon sous le refus (ADM-P17R-04/06). */
function relaisSecours(r: RelaisDonnee, tous: RelaisDonnee[], besoin: number): RelaisCourt['secours'] {
  const libres = tous
    .filter((x) => x.id !== r.id && !x.configuration && !x.fermeture && !x.definitif)
    .map((x) => ({ x, d: distanceKm(r.pos, x.pos), occ: places(x.parClasse) }))
    .sort((u, v) => u.d - v.d)
  const sous = (pct: number) => libres.find((y) => y.occ + besoin <= (y.x.capacite * pct) / 100 && (besoin > 0 || (100 * y.occ) / y.x.capacite < P.relais.saturePct))
  const y = sous(P.relais.saturePct) ?? sous(P.relais.refusPct)
  return y ? { id: y.x.id, nom: y.x.nom, zone: y.x.zone, occupes: y.occ, capacite: y.x.capacite, distanceKm: y.d } : null
}
function etapesRelais(r: RelaisDonnee): Etape[] {
  const e = (titre: string, fait: boolean, detail: string, route?: string): Etape => ({ titre, detail, etat: fait ? 'fait' : 'a_faire', route })
  const l = [
    e('Dossier du gérant', r.kyc === 'verifiee', r.kyc === 'verifiee' ? 'KYC vérifié' : r.kyc === 'a_revoir' ? `KYC à revoir${r.dossier ? ' · ' + r.dossier : ''}` : 'Pièces manquantes', 'kyc'),
    e('Numéro Mobile Money', !!r.momo, r.momo ? 'Vérifié par micro-versement' : 'À vérifier'),
    e('Convention', !!r.conventionLe, r.conventionLe ? 'Signée · version 1' : 'À signer'),
    e('Visite physique', !!r.visite, r.visite ? `Faite · ${r.visite.agents}` : 'À planifier', 'comptes'),
    e('Formation', !!r.formationLe, r.formationLe ? 'Validée' : 'Non commencée', 'messagerie'),
    e('Capacité et horaires', !!r.visite, r.visite ? `${r.capacite} places mesurées · ferme à ${r.fermeA}` : `${r.capacite} places déclarées · à mesurer à la visite`),
  ]
  const i = l.findIndex((x) => x.etat !== 'fait')
  if (i >= 0) l[i] = { ...l[i], etat: 'en_cours' }
  return l
}

const PALIERS: Palier[] = ['Nouveau', 'Confirme', 'Or']
const plafondPalier = (p: Palier) => P.entreprises.plafonds[p]
function entrepriseCourte(e: EtatLogistique['entreprises'][number], le: Instant): EntrepriseCourte {
  const restreinte = e.restrictionJusqua !== null && e.restrictionJusqua > le
  const statut: StatutEntreprise = e.suspension ? 'suspendue' : e.base === 'configuration' ? 'configuration' : restreinte ? 'restreinte' : e.base
  return {
    id: e.id, nom: e.nom, quartier: e.quartier, zones: e.zones, capacites: e.capacites, livreurs: e.livreurs, livreursActifs: e.livreursActifs, palier: e.palier, plafond: plafondPalier(e.palier), statut,
    trustScore: e.trustScore, acceptation: e.acceptation, delaiMin: e.delaiMin, pertes: e.pertes, rendus7j: e.rendus7j, restrictionJusqua: restreinte ? e.restrictionJusqua : null,
  }
}
const active = (e: EntrepriseCourte) => e.statut === 'pilote' || e.statut === 'active'
/** Grille contrôlée ligne par ligne sous les plafonds d'achat (ADM-P18R-03, ADM-TAR-05) : offre de référence lue au registre. */
export function grilleReference(): LigneGrille[] {
  const w = P.entreprises.yafe
  const pl = P.entreprises.achat
  const plafRelais = Math.min(pl.S, pl.M, pl.L)
  const ligne = (id: string, prestation: string, detail: string, prix: number | null, plafond: number | null, calcul: string, controle: LigneGrille['controle'], supplement = false): LigneGrille => ({
    id, prestation, detail, prix, plafond, calcul, marge: prix !== null && plafond !== null ? plafond - prix : null, supplement,
    controle: controle === 'ok' && prix !== null && plafond !== null && prix > plafond ? 'bloquee' : controle,
  })
  const calc = `Plafond d’achat relais : ${plafRelais} F par colis`
  const tranches = ['1 à 4 colis', '5 à 9 colis', '10 colis et plus']
  return [
    ...w.tournee.map((t, i) => ligne('relais-' + i, 'Tournée relais, par colis', tranches[i], t, plafRelais, calc, 'ok')),
    ...w.tournee.map((t, i) => ligne('autre-' + i, 'Tournée relais, relais d’une autre zone', `${tranches[i]} : ${t} + ${w.horsZone} F`, t + w.horsZone, plafRelais, calc, 'ok')),
    ligne('dom-0', 'Course domicile tout compris', 'Entre Z2, Z3 et Z6', w.domicile[0], pl.domicile, `Plafond d’achat domicile : ${pl.domicile} F`, 'ok'),
    ligne('dom-1', 'Course domicile tout compris', 'Trajet qui part de Z1 ou y arrive', w.domicile[1], pl.domicile, `Plafond d’achat domicile : ${pl.domicile} F`, 'ok'),
    ligne('c2', 'Supplément carton C2', `+${w.c2} F sur la course`, w.c2, null, 'Contrôlé colis par colis : course + supplément ≤ plafond de la classe', 'colis', true),
    ligne('absent', 'Client absent', 'Course et supplément', null, null, 'Payé par BelivaY puis imputé à la partie responsable', 'refacturee'),
    ligne('retard', 'Retard au-delà de 5 h', 'Course payée moins la minoration', null, null, 'Sauf incident de tiers validé', 'minoration'),
  ]
}

function departDe(d: DepartDonnee, s: EtatLogistique, le: Instant): Depart {
  const dec = s.decisionsDepart.find((x) => x.id === d.id)
  const clos = dec?.clos ?? d.clos
  const constatJusqua = d.preavisJusqua + P.livreurs.kitConstatH * HEURE
  const etat: Depart['etat'] = clos ? 'clos' : le < d.preavisJusqua ? 'en_preavis' : d.kit.constat || le < constatJusqua || d.missionEnCours || d.colisSousGarde > 0 ? 'attente_constat' : 'echu'
  const contestation = d.contestation && dec?.decision ? { ...d.contestation, decision: dec.decision.d, decideLe: dec.decision.le, par: dec.decision.par } : d.contestation
  return { ...d, constatJusqua, etat, clos, contestation, versement: dec?.versement ?? d.versement, source: s.departs.some((x) => x.id === d.id) ? 'jeu' : 'pont' }
}
/** Départs du pont (demandés depuis l'espace livreur ou l'entreprise), lus comme le serveur les recevrait. */
function departsDuPont(): DepartDonnee[] {
  const out: DepartDonnee[] = []
  for (const e of evenementsPour('admin')) {
    if (e.type === 'depart_demande' && !out.some((d) => d.id === e.id))
      out.push({ id: e.id, livreurId: LIVREUR_DEMO, livreur: 'Serge A.', entreprise: 'Yafé Express', zones: ['Z1', 'Z3'], demandeLe: e.le, motif: e.motif, preavisJusqua: e.preavisJusqua, missionEnCours: true, colisSousGarde: 5, kit: { constat: null, manquants: [], retenue: 0, constateLe: null }, contestation: null, clos: null, versement: { du: null, missions: 0, retenuLitiges: 0, litiges: 0, retenueKit: 0, kitDeCote: 0, verse: null } })
    const d = out.find((x) => 'id' in e && x.id === (e as { id: string }).id)
    if (!d) continue
    if (e.type === 'depart_annule') out.splice(out.indexOf(d), 1)
    if (e.type === 'depart_kit') d.kit = e.constat ? { constat: e.constat, manquants: e.manquants, retenue: e.retenue, constateLe: e.le } : { constat: null, manquants: [], retenue: 0, constateLe: null }
    if (e.type === 'kit_conteste') d.contestation = { le: e.le, motif: e.motif, decision: null, decideLe: null, par: null }
    if (e.type === 'depart_clos' && e.app !== 'admin') {
      d.clos = { le: e.le, par: e.par, kitNonConteste: e.kitNonConteste, versementLe: e.versementLe }
      d.versement = e.versement
      d.missionEnCours = false
      d.colisSousGarde = 0
    }
  }
  return out
}

function etatPaquet(p: PaquetDonnee, base: PaquetCourt, le: Instant): PaquetCourt['etat'] {
  if (base.etat === 'retire') return 'retire'
  if (p.base === 'publie' && !base.entreprise && p.publieLe !== null && le > p.publieLe + P.paquets.acceptationMin * MINUTE) return 'sans_preneur'
  if ((p.base === 'en_route' || p.base === 'accepte') && (base.heureLimite - le) / MINUTE < P.paquets.retardMin) return 'en_retard'
  return base.etat
}
function paquetsCourts(s: EtatLogistique, le: Instant): PaquetCourt[] {
  return s.paquets.map((p) => {
    const j = PAQUETS.find((x) => x.id === p.id)
    const b = j ? { zone: j.zone, genre: j.genre, entreprise: j.entreprise, livreur: j.livreur, colis: j.colis, heureLimite: j.heureLimite } : p.extra!
    const court: PaquetCourt = {
      id: p.id, ...b, destination: p.destination, valeurMax: p.valeurMax, publieLe: p.publieLe, etat: p.base, margeMin: Math.round((b.heureLimite - le) / MINUTE),
      paliersEligibles: PALIERS.filter((x) => plafondPalier(x) === null || plafondPalier(x)! >= p.valeurMax), escalade: p.escalade,
    }
    return { ...court, etat: etatPaquet(p, court, le) }
  })
}

// Une décision journalisée ou contresignée s'applique aussitôt (comme le serveur, dans la même transaction).
quandDonneesChangent((d) => {
  if (d === 'journal' || d === 'quatreyeux') appliquerDecisions()
})

function lire(): EtatLogistique {
  // Inscriptions arrivées par le pont : entrent une fois dans la file des candidatures (clé = dossier).
  const nouvelles = candidaturesDuPont().filter((c) => !etatLog.lire().candidatures.some((x) => x.id === c.id))
  if (nouvelles.length) etatLog.ecrire((s) => void s.candidatures.push(...nouvelles))
  appliquerDecisions()
  return etatLog.lire()
}

// ── Gestes : règles, contrôle, application ─────────────────────────────────────────────────────────────────────────
const SV: Role[] = ['superviseur']
const OPS: Role[] = ['superviseur', 'operations']
const r = (roles: Role[], route: string, quatreYeux = false, rolesSecond: Role[] = SV): RegleGeste => ({ roles, route, quatreYeux, rolesSecond: quatreYeux ? rolesSecond : [] })
export const REGLES: Record<ActionLogistique, RegleGeste> = {
  'relais.basculer': r(OPS, 'relais'),
  'relais.attendre': r(OPS, 'relais'),
  'relais.transferer': r(OPS, 'relais'),
  'relais.relancer': r(OPS, 'relais'),
  'relais.activer': r(OPS, 'relais'),
  'relais.fin_convention': r(OPS, 'relais', true),
  'relais.fermer': r(OPS, 'relais', true),
  'relais.apurement': r(['superviseur', 'finance'], 'relais'),
  'entreprise.suspendre': r(OPS, 'entreprises', true),
  'entreprise.lever': r(SV, 'entreprises'),
  'entreprise.activer': r(SV, 'entreprises'),
  'zone.placer': r(SV, 'entreprises'),
  'livreur.suspendre': r(OPS, 'livreurs', true, ['superviseur', 'mediation']),
  'livreur.retablir': r(SV, 'livreurs'),
  'livreur.activer': r(OPS, 'livreurs'),
  'depart.clore': r(OPS, 'livreurs'),
  'kit.maintenir': r(['superviseur', 'mediation'], 'livreurs'),
  'kit.annuler': r(['superviseur', 'mediation'], 'livreurs'),
  'identifiant.accepter': r(OPS, 'livreurs', true),
  'identifiant.refuser': r(OPS, 'livreurs'),
  'paquet.elargir': r(OPS, 'paquets'),
  'paquet.priorite': r(OPS, 'paquets'),
  'paquet.prevenir': r(OPS, 'paquets'),
  'paquet.retirer': r(OPS, 'paquets'),
  'zone.plan': r(OPS, 'zones'),
  'zone.saison': r(SV, 'zones'),
  'emballage.commander': r(['superviseur', 'operations'], 'emballages'),
  'emballage.facturer': r(['superviseur', 'finance'], 'emballages'),
  'emballage.justifier': r(['superviseur', 'operations', 'finance'], 'emballages'),
  'etiquettes.attribuer': r(OPS, 'emballages'),
  'etiquettes.invalider': r(OPS, 'emballages'),
  'candidature.prendre': r(['superviseur', 'operations', 'verification', 'terrain'], 'candidatures'),
  'candidature.completer': r(['superviseur', 'operations', 'verification', 'terrain'], 'candidatures'),
  'candidature.accepter': r(['superviseur', 'operations', 'verification'], 'candidatures'),
  'candidature.refuser': r(['superviseur', 'operations', 'verification'], 'candidatures'),
}
const ACTIONS = new Set(Object.keys(REGLES))

interface Acteur {
  role: Role
  agentId: string
  zones: CodeZone[] | null
}
const acteurCourant = (): Acteur => ({ role: roleCourant(), agentId: agentCourant().id, zones: roleCourant() === 'operations' || roleCourant() === 'terrain' ? agentCourant().zones : null })

/** Contrôle d'un geste (rôle, zone, état), le même à la vérification et à l'application. null : permis. */
function controle(s: EtatLogistique, action: ActionLogistique, objet: string, qui: Acteur, le: Instant): { raison: 'role' | 'zone' | 'etat' | 'inconnu'; detail: string | null } | null {
  const regle = REGLES[action]
  if (!regle) return { raison: 'inconnu', detail: null }
  const d = droitDe(regle.route, qui.role).acces
  if (!regle.roles.includes(qui.role) || d === 'aucun' || d === 'lecture') return { raison: 'role', detail: null }
  const enZone = (zones: CodeZone[]) => !qui.zones || zones.some((z) => qui.zones!.includes(z))
  const non = (detail: string) => ({ raison: 'etat' as const, detail })
  const [tete] = action.split('.')
  if (tete === 'relais') {
    const x = s.relais.find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone([x.zone])) return { raison: 'zone', detail: null }
    const c = relaisCourt(x, s.relais, le)
    if (action === 'relais.basculer' && (c.statut !== 'sature' || !c.secours || c.bascule)) return non(c.bascule ? 'La bascule est déjà en place.' : 'Le relais n’est pas saturé, ou aucun relais de secours n’a de place.')
    if (action === 'relais.attendre' && c.statut !== 'sature') return non('Le relais n’est pas saturé.')
    if ((action === 'relais.transferer' || action === 'relais.relancer') && (c.statut !== 'ferme' || !x.fermeture || x.fermeture.transfert)) return non('Aucune fermeture imprévue à traiter.')
    if (action === 'relais.transferer' && !c.secours) return non('Aucun relais ouvert n’a la place de recevoir ces colis.')
    if (action === 'relais.activer') {
      if (!x.configuration) return non('Le relais est déjà ouvert.')
      if (c.etapes.some((e) => e.etat !== 'fait')) return non('Une étape de la chaîne d’ouverture manque.')
      const ouverts = s.relais.filter((y) => y.zone === x.zone && y.id !== x.id && !y.configuration && !y.definitif).length
      if (ouverts >= P.relais.parZone && qui.role !== 'superviseur') return { raison: 'role', detail: 'Second relais dans la zone : décision de la Direction, fondée sur le remplissage.' }
    }
    if (action === 'relais.fin_convention' && (x.configuration || x.definitif || x.finConvention)) return non('La convention n’est pas en cours.')
    if (action === 'relais.fermer') {
      if (x.definitif || x.configuration) return non('Le relais n’est pas ouvert.')
      if (x.enGarde > 0) return non(`Des colis sont encore en garde (${x.enGarde}) : transférez-les d’abord.`)
    }
    if (action === 'relais.apurement' && (c.versement.vendredisReport < P.relais.reportVendredis || x.plan)) return non('Aucun report n’atteint la limite des vendredis : pas de plan d’apurement à valider.')
    return null
  }
  if (tete === 'entreprise') {
    const x = s.entreprises.find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone(x.zones)) return { raison: 'zone', detail: null }
    if (action === 'entreprise.suspendre' && x.suspension) return non('L’entreprise est déjà suspendue.')
    if (action === 'entreprise.lever' && !x.suspension) return non('L’entreprise n’est pas suspendue.')
    if (action === 'entreprise.activer' && (x.base !== 'configuration' || etapesEntreprise(x, s).some((e) => e.etat !== 'fait'))) return non('La chaîne d’activation n’est pas complète.')
    return null
  }
  if (action === 'zone.placer') {
    const [q, z] = objet.split(' → ')
    const x = s.placements.find((y) => y.quartier === q)
    if (!x || !ZONES.some((y) => y.code === z)) return { raison: 'inconnu', detail: null }
    if (x.zone) return non('Ce quartier est déjà placé.')
    return null
  }
  if (action === 'livreur.activer') {
    // objet : une fiche en activation, ou un dossier reçu de l'espace livreur (pont).
    const d = dossiersDuPont(s).find((y) => y.dossier === objet)
    const x = s.livreurs.find((y) => y.id === (d ? d.livreurId : objet))
    if (d && d.etat === 'active') return non('Ce dossier est déjà activé.')
    if (!x) return d ? non('Aucun livreur déclaré par une entreprise ne correspond à ce dossier (R80).') : { raison: 'inconnu', detail: null }
    const j = LIVREURS.find((y) => y.id === x.id)!
    if (!enZone(j.zones)) return { raison: 'zone', detail: null }
    if (!d && (x.statut !== 'en_activation' || x.certifieLe)) return non('La certification est déjà validée.')
    if (x.modules < 7 || x.quiz === null || x.quiz < P.livreurs.quizSeuil) return non(`Certification incomplète : modules et quiz réussi à ${P.livreurs.quizSeuil}/${P.livreurs.quizQuestions} au moins (R80).`)
    if (d && d.pieces < 3) return non('Pièces incomplètes : CNI, selfie et permis.')
    return null
  }
  if (tete === 'livreur') {
    const x = s.livreurs.find((y) => y.id === objet)
    const j = LIVREURS.find((y) => y.id === objet)
    if (!x || !j) return { raison: 'inconnu', detail: null }
    if (!enZone(j.zones)) return { raison: 'zone', detail: null }
    if (action === 'livreur.suspendre' && (x.suspension || x.statut !== 'actif')) return non('Seul un livreur actif peut être suspendu.')
    if (action === 'livreur.retablir' && !x.suspension) return non('Le livreur n’est pas suspendu.')
    return null
  }
  if (tete === 'depart' || tete === 'kit') {
    const x = tousLesDeparts(s, le).find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone(x.zones)) return { raison: 'zone', detail: null }
    if (action === 'depart.clore' && x.etat !== 'echu') return non('Le départ n’est pas échu : préavis en cours, constat du kit encore dans son délai, mission ou colis encore sous sa garde.')
    if (tete === 'kit' && (!x.contestation || x.contestation.decision)) return non('Aucune contestation du kit en attente.')
    return null
  }
  if (tete === 'identifiant') {
    const x = s.changements.find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone([x.zone])) return { raison: 'zone', detail: null }
    if (x.etat !== 'a_decider') return non('Cette demande est déjà traitée.')
    if (action === 'identifiant.accepter' && (x.controles.listeNoire || x.controles.doublon)) return non(x.controles.listeNoire ? 'Identifiant en liste noire.' : 'Identifiant déjà rattaché à un autre compte : un appareil, un compte.')
    return null
  }
  if (tete === 'paquet') {
    const x = paquetsCourts(s, le).find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone([x.zone])) return { raison: 'zone', detail: null }
    const ouvert = !['livre', 'retire', 'rendu'].includes(x.etat)
    if (action === 'paquet.elargir' && (!['publie', 'sans_preneur'].includes(x.etat) || x.escalade.elargi)) return non(x.escalade.elargi ? 'La publication est déjà élargie.' : 'Seul un paquet publié, sans preneur, s’élargit.')
    if (action === 'paquet.priorite' && (!ouvert || x.escalade.priorite)) return non(x.escalade.priorite ? 'La priorité est déjà relevée.' : 'Ce paquet est clos.')
    if (action === 'paquet.prevenir' && (!['sans_preneur', 'en_retard', 'incident', 'publie'].includes(x.etat) || x.escalade.prevenu)) return non(x.escalade.prevenu ? 'Le vendeur et le client sont déjà prévenus.' : 'Aucun décalage à annoncer.')
    if (action === 'paquet.retirer' && (x.colis > 0 || !ouvert)) return non('Seul un paquet vidé par des annulations se retire.')
    return null
  }
  if (tete === 'zone') {
    if (!ZONES.some((y) => y.code === objet)) return { raison: 'inconnu', detail: null }
    if (!enZone([objet])) return { raison: 'zone', detail: null }
    const z = pilotage(s, le).find((y) => y.code === objet)!
    if (action === 'zone.plan' && z.etat !== 'alerte') return non('La zone n’est pas en alerte.')
    if (action === 'zone.saison' && !z.exploitee) return non('Seule une zone exploitée reçoit un délai saisonnier.')
    return null
  }
  if (tete === 'emballage') {
    const e = emballages(s)
    if (action === 'emballage.commander') {
      const x = e.stock.find((y) => y.ref === objet)
      if (!x) return { raison: 'inconnu', detail: null }
      if (!x.aCommander) return non('Ce format est au-dessus du seuil de couverture.')
      return null
    }
    const x = e.ecarts.find((y) => y.entrepriseId === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (action === 'emballage.facturer' && (x.ecartPct <= P.emballages.ecartPct || x.facture)) return non(x.facture ? 'L’écart est déjà facturé.' : 'Écart sous le seuil : rien à facturer.')
    if (action === 'emballage.justifier' && (x.nonJustifie === 0 || x.justificationDemandee)) return non('Aucun écart à justifier.')
    return null
  }
  if (tete === 'etiquettes') {
    if (action === 'etiquettes.attribuer') {
      const x = emballages(s).sansPlage.find((y) => y.livreurId === objet)
      return x ? null : non('Ce livreur a déjà une plage active.')
    }
    const x = s.emb.plages.find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    return x.etat === 'active' ? null : non('Cette plage est déjà invalidée.')
  }
  if (tete === 'candidature') {
    const x = s.candidatures.find((y) => y.id === objet)
    if (!x) return { raison: 'inconnu', detail: null }
    if (!enZone([x.zone])) return { raison: 'zone', detail: null }
    if (x.etat === 'acceptee' || x.etat === 'refusee') return non('Cette candidature est close.')
    if (action === 'candidature.prendre' && x.etat !== 'nouvelle') return non('Cette candidature est déjà prise en charge.')
    if (action === 'candidature.accepter') {
      if (x.controles.listeNoire) return non('Liste noire : une candidature bloquée ne s’accepte jamais.')
      if (x.controles.doublon) return non(`Doublon à lever : ${x.controles.doublon}.`)
      if (x.controles.rccm === 'invalide' || x.controles.niu === 'invalide') return non('RCCM ou NIU invalide.')
      if (x.pieces.some((p) => !p.recue)) return non('Des pièces manquent : demandez un complément.')
      if (x.genre === 'relais' && x.secondDansZone && qui.role !== 'superviseur') return { raison: 'role', detail: 'Second relais dans la zone : décision de la Direction.' }
    }
    return null
  }
  return { raison: 'inconnu', detail: null }
}

const PREAVIS = (le: Instant) => le + P.relais.conventionPreavisJ * JOUR

/** Applique un geste contrôlé (rôle, zone, état revérifiés) ; publie au pont ce qui touche l'entreprise et le livreur. */
function appliquer(s: EtatLogistique, action: ActionLogistique, objet: string, motif: string, par: string, le: Instant, cle: string) {
  const rel = () => s.relais.find((y) => y.id === objet)!
  const ent = () => s.entreprises.find((y) => y.id === objet)!
  const liv = () => s.livreurs.find((y) => y.id === objet)!
  const pq = () => s.paquets.find((y) => y.id === objet)!
  const cand = () => s.candidatures.find((y) => y.id === objet)!
  switch (action) {
    case 'relais.basculer': {
      const c = relaisCourt(rel(), s.relais, le)
      Object.assign(rel(), { bascule: { versId: c.secours!.id, versNom: c.secours!.nom, le, par }, attente: null })
      break
    }
    case 'relais.attendre':
      rel().attente = { le, par }
      break
    case 'relais.relancer':
      rel().fermeture!.relance = le
      break
    case 'relais.transferer': {
      const x = rel()
      const c = relaisCourt(x, s.relais, le)
      const dest = s.relais.find((y) => y.id === c.secours!.id)!
      for (const k of ['S', 'M', 'L'] as Classe[]) dest.parClasse[k] += x.parClasse[k]
      dest.enGarde += x.enGarde
      x.fermeture!.transfert = { versId: dest.id, versNom: dest.nom, le, colis: x.enGarde }
      x.parClasse = { S: 0, M: 0, L: 0 }
      x.enGarde = 0
      break
    }
    case 'relais.activer':
      Object.assign(rel(), { configuration: false })
      publier({ type: 'kyc_decide', dossier: rel().dossier ?? objet, espace: 'relais', acteur: idPont(objet), decision: 'approuve', pieces: [] }, `admin-${cle}`, le)
      break
    case 'relais.fin_convention':
      rel().finConvention = PREAVIS(le)
      // Le relais ne reçoit plus de colis à la fin du préavis ; ses colis en garde partent (pont : convention_terminee).
      publier({ type: 'convention_terminee', relais: idPont(objet), motif, effet: PREAVIS(le) }, `admin-${cle}`, le)
      break
    case 'relais.fermer':
      Object.assign(rel(), { definitif: true, bascule: null, attente: null, fermeture: rel().fermeture ?? { depuis: le, signalePar: par, relance: null, transfert: null } })
      publier({ type: 'convention_terminee', relais: idPont(objet), motif, effet: le }, `admin-${cle}`, le)
      break
    case 'relais.apurement':
      rel().plan = { le, par }
      break
    case 'entreprise.suspendre': {
      const x = ent()
      x.statutAvant = x.base
      x.suspension = { motif, niveau: 'Suspension (niveau 3) : aucun nouveau paquet', depuis: le, par, recours: `Une fois, sous ${P.livreurs.recoursJ} jours, pièce à l’appui` }
      publier({ type: 'sanction_decidee', acteurId: idPont(objet), espace: 'entreprise', niveau: 3, etat: 'suspendue', motif, recoursJusqua: le + P.livreurs.recoursJ * JOUR }, `admin-${cle}`, le)
      break
    }
    case 'entreprise.lever':
      ent().suspension = null
      publier({ type: 'sanction_decidee', acteurId: idPont(objet), espace: 'entreprise', niveau: 3, etat: 'levee', motif, recoursJusqua: null }, `admin-${cle}`, le)
      break
    case 'entreprise.activer':
      Object.assign(ent(), { base: 'pilote', pilote: le })
      publier({ type: 'kyc_decide', dossier: objet, espace: 'entreprise', acteur: idPont(objet), decision: 'approuve', pieces: [] }, `admin-${cle}`, le)
      break
    case 'zone.placer': {
      const [q, z] = objet.split(' → ')
      s.placements.find((y) => y.quartier === q)!.zone = z
      break
    }
    case 'livreur.suspendre':
      liv().suspension = { motif, depuis: le, jusqua: null, par }
      liv().statut = 'suspendu'
      publier({ type: 'livreur_suspendu', livreurId: objet, motif, jusqua: null }, `admin-${cle}`, le)
      break
    case 'livreur.activer': {
      const d = dossiersDuPont(s).find((y) => y.dossier === objet)
      const id = d ? d.livreurId! : objet
      const x = s.livreurs.find((y) => y.id === id)!
      // BelivaY valide la certification (R80) ; l'entreprise approuve ensuite son livreur (elle seule l'affecte).
      if (!x.certifieLe) x.certifieLe = le
      if (d) s.activations.push(d.dossier)
      publier({ type: 'kyc_decide', dossier: d?.dossier ?? id, espace: 'livreur', acteur: d?.acteur ?? id, decision: 'approuve', pieces: [] }, `admin-${cle}`, le)
      break
    }
    case 'livreur.retablir':
      liv().suspension = null
      liv().statut = 'actif'
      publier({ type: 'livreur_retabli', livreurId: objet, motif }, `admin-${cle}`, le)
      break
    case 'depart.clore': {
      const d = tousLesDeparts(s, le).find((y) => y.id === objet)!
      const versementLe = vendrediCourant(le, true)
      // Kit non contesté : aucune retenue (la responsabilité revient à celui qui n'a pas de preuve, CACHEE-02).
      const v: VersementDepart = { ...d.versement, retenueKit: 0, kitDeCote: 0, verse: d.versement.du === null ? null : d.versement.du - d.versement.retenuLitiges }
      s.decisionsDepart = [...s.decisionsDepart.filter((y) => y.id !== objet), { id: objet, clos: { le, par: 'admin', kitNonConteste: true, versementLe }, versement: v }]
      const l = s.livreurs.find((y) => y.id === d.livreurId)
      if (l) l.statut = 'parti'
      publier({ type: 'depart_clos', id: objet, par: 'admin', versementLe, kitNonConteste: true, versement: v as VersementPont }, `admin-${cle}`, le)
      break
    }
    case 'kit.maintenir':
    case 'kit.annuler': {
      const decision = action === 'kit.maintenir' ? ('retenue_maintenue' as const) : ('retenue_annulee' as const)
      const d = tousLesDeparts(s, le).find((y) => y.id === objet)!
      const autre = s.decisionsDepart.find((y) => y.id === objet)
      // Retenue annulée : le montant mis de côté part au vendredi suivant la décision (CACHEE-03).
      const versement = decision === 'retenue_annulee' ? { ...d.versement, retenueKit: 0, kitDeCote: 0, verse: (d.versement.verse ?? 0) + d.versement.kitDeCote } : { ...d.versement, kitDeCote: 0 }
      s.decisionsDepart = [...s.decisionsDepart.filter((y) => y.id !== objet), { ...autre, id: objet, versement, decision: { d: decision, le, par } }]
      publier({ type: 'kit_decide', id: objet, decision, motif }, `admin-${cle}`, le)
      break
    }
    case 'identifiant.accepter':
    case 'identifiant.refuser':
      s.changements.find((y) => y.id === objet)!.etat = action === 'identifiant.accepter' ? 'accepte' : 'refuse'
      break
    case 'paquet.elargir':
      pq().escalade.elargi = le
      break
    case 'paquet.priorite':
      pq().escalade.priorite = le
      break
    case 'paquet.prevenir':
      pq().escalade.prevenu = le
      break
    case 'paquet.retirer':
      pq().base = 'retire'
      break
    case 'zone.plan':
      s.plans = [...s.plans.filter((y) => y.zone !== objet), { zone: objet, le, par, motif, echeance: le + 7 * JOUR }]
      break
    case 'zone.saison':
      s.saisons = s.saisons.some((y) => y.zone === objet) ? s.saisons.filter((y) => y.zone !== objet) : [...s.saisons, { zone: objet, depuis: le, par }]
      break
    case 'emballage.commander': {
      const x = emballages(s).stock.find((y) => y.ref === objet)!
      s.emb.mouvements.push({ le, nature: 'Commande au fournisseur (réception attendue)', quantites: `${objet} ${x.aCommander}`, piece: `BC-${cle}` })
      s.emb.siege[objet as RefEmballage] += x.aCommander
      break
    }
    case 'emballage.facturer': {
      const x = s.emb.ecarts.find((y) => y.entrepriseId === objet)!
      const nj = emballages(s).ecarts.find((y) => y.entrepriseId === objet)!.nonJustifie
      x.facture = { le, montant: nj * x.coutUnitaire }
      break
    }
    case 'emballage.justifier':
      s.emb.ecarts.find((y) => y.entrepriseId === objet)!.justificationDemandee = le
      break
    case 'etiquettes.attribuer': {
      const l = LIVREURS.find((y) => y.id === objet)!
      const fin = Math.max(...s.emb.plages.map((y) => Number(y.plage.split(' – ')[1].replace(/\D/g, '').slice(-4))))
      s.emb.plages.push(plage(`pl-${objet}-${s.emb.plages.length}`, l.entreprise, l.nom, fin + 1, 0))
      break
    }
    case 'etiquettes.invalider':
      s.emb.plages.find((y) => y.id === objet)!.etat = 'invalidee'
      break
    case 'candidature.prendre':
      Object.assign(cand(), { etat: 'prise', prisePar: par })
      break
    case 'candidature.completer':
      Object.assign(cand(), { etat: 'complement', complement: { le, demande: motif } })
      kycCandidature(cand(), 'complement', motif, le, cle)
      break
    case 'candidature.refuser':
      Object.assign(cand(), { etat: 'refusee', issue: { le, par, motif } })
      kycCandidature(cand(), 'rejete', motif, le, cle)
      break
    case 'candidature.accepter': {
      const x = cand()
      Object.assign(x, { etat: 'acceptee', issue: { le, par, motif } })
      const id = 'n-' + x.id.toLowerCase()
      kycCandidature(x, 'approuve', null, le, cle, id)
      if (x.genre === 'relais')
        s.relais.push(r0Nouveau(x, id))
      else
        s.entreprises.push({
          id, nom: x.nom, quartier: nomZone(x.zone), zones: x.zones, capacites: Object.fromEntries(x.zones.map((z) => [z, { capacite: 0, acceptes: 0 }])), livreurs: 0, livreursActifs: 0, palier: 'Nouveau', base: 'configuration', trustScore: null, acceptation: null, delaiMin: null, pertes: 0, rendus7j: 0, restrictionJusqua: null,
          dirigeant: x.responsable, contrat: 'Lettre d’engagement pilote à proposer', acces: [x.responsable], reglement: 'À vérifier', pieces: PIECES_BASE().map((p) => (p.statut === 'verifiee' ? { ...p, statut: 'en_verification' as const, expireLe: null } : p)), pilote: null, rapport: [], pos: pres(x.zone, 0.002, 0.002), suspension: null, statutAvant: null,
        })
      break
    }
  }
}
/** Pièces acceptées, complément ou refus : l'espace du candidat le reçoit (kyc_decide), sous son identifiant. */
function kycCandidature(x: Candidature, decision: 'approuve' | 'rejete' | 'complement', motif: string | null, le: Instant, cle: string, nouveau?: string) {
  const pieces = decision === 'approuve' ? [] : x.pieces.filter((p) => !p.recue).map((p) => ({ nature: p.nature, motif }))
  publier({ type: 'kyc_decide', dossier: x.origine?.dossier ?? x.id, espace: x.genre, acteur: x.origine?.acteur ?? nouveau ?? x.id, decision, pieces: pieces.length || decision === 'approuve' ? pieces : [{ nature: 'Dossier', motif }] }, `admin-${cle}`, le)
}
function r0Nouveau(x: Candidature, id: string): RelaisDonnee {
  return {
    id, nom: /^relais\b/i.test(x.nom) ? x.nom : 'Relais ' + x.nom, gerant: x.responsable, zone: x.zone, capacite: 0, parClasse: { S: 0, M: 0, L: 0 }, enGarde: 0, fermeA: '—', trustScore: null, pos: pres(x.zone, -0.003, 0.003), configuration: true,
    remis: { S: 0, M: 0, L: 0 }, jours: 0, especes: 0, reportPrecedent: 0, vendredisReport: 0, kyc: 'a_revoir', dossier: null, momo: null, conventionLe: null, visite: null, formationLe: null, constats: 0,
    bascule: null, attente: null, fermeture: null, definitif: false, finConvention: null, plan: null,
  }
}

/**
 * Les décisions prises (journal : une main ; quatre yeux : contresignées) sont appliquées une seule fois, après un
 * nouveau contrôle sous le rôle et les zones de l'agent qui a décidé (premier validateur) : comme le serveur.
 */
function appliquerDecisions() {
  const s = etatLog.lire()
  const faites = new Set(s.appliquees)
  const a: { cle: string; action: ActionLogistique; objet: string; motif: string; agentId: string; role: Role; le: Instant; quatreYeux: boolean }[] = []
  for (const l of journalDemo.lire().lignes) if (ACTIONS.has(l.action) && !faites.has('J' + l.n)) a.push({ cle: 'J' + l.n, action: l.action as ActionLogistique, objet: l.objet, motif: l.motif ?? '', agentId: l.agentId, role: l.role, le: l.le, quatreYeux: false })
  for (const d of quatreYeuxDemo.lire().decisions)
    if (d.etat === 'contresignee' && ACTIONS.has(d.action) && !faites.has('Q' + d.id)) a.push({ cle: 'Q' + d.id, action: d.action as ActionLogistique, objet: d.objet, motif: d.motif, agentId: d.premier.agentId, role: d.premier.role, le: d.second?.le ?? d.premier.le, quatreYeux: true })
  if (!a.length) return
  etatLog.ecrire((e) => {
    for (const x of a.sort((u, v) => u.le - v.le)) {
      e.appliquees.push(x.cle)
      const ag = agent(x.agentId)
      const qui: Acteur = { role: x.role, agentId: x.agentId, zones: x.role === 'operations' || x.role === 'terrain' ? ag.zones : null }
      const refus = REGLES[x.action].quatreYeux && !x.quatreYeux ? { raison: 'etat', detail: 'Décision à quatre yeux prise d’une seule main.' } : controle(e, x.action, x.objet, qui, x.le)
      if (refus) e.refusees.push({ cle: x.cle, action: x.action, objet: x.objet, raison: refus.detail ?? refus.raison })
      else appliquer(e, x.action, x.objet, x.motif, nomAgent(ag), x.le, x.cle)
    }
  })
}

function tousLesDeparts(s: EtatLogistique, le: Instant): Depart[] {
  return [...s.departs, ...departsDuPont()].map((d) => departDe(d, s, le))
}

function etapesEntreprise(e: EntrepriseDonnee, s: EtatLogistique): Etape[] {
  const fait = e.base !== 'configuration'
  const piecesOk = e.pieces.every((p) => p.statut === 'verifiee' || p.statut === 'non_requise')
  const certifie = s.livreurs.some((l) => LIVREURS.find((x) => x.id === l.id)?.entreprise === e.nom && l.certifieLe)
  const grille = grilleReference()
  const l: Etape[] = [
    { titre: 'Candidature', detail: 'Reçue', etat: 'fait' },
    { titre: 'Pièces', detail: piecesOk ? 'Vérifiées' : 'En vérification', etat: piecesOk ? 'fait' : 'a_faire', route: 'kyc' },
    { titre: 'Visite', detail: fait ? 'Faite' : 'À planifier après les pièces', etat: fait ? 'fait' : 'a_faire', route: 'comptes' },
    { titre: 'Contrat signé', detail: fait ? 'Lettre d’engagement signée' : 'Lettre d’engagement pilote proposée', etat: fait ? 'fait' : 'a_faire' },
    { titre: 'Grille validée', detail: `${grille.filter((g) => g.controle === 'bloquee').length} ligne(s) bloquée(s) sous les plafonds`, etat: fait ? 'fait' : 'a_faire' },
    { titre: 'Premier livreur certifié', detail: certifie ? 'Certifié' : 'Aucun livreur invité', etat: certifie || fait ? 'fait' : 'a_faire' },
    { titre: 'Activée', detail: fait ? 'Paquets visibles' : 'Bloquée tant qu’une étape manque', etat: fait ? 'fait' : 'bloque' },
  ]
  const i = l.findIndex((x) => x.etat === 'a_faire')
  if (i >= 0) l[i] = { ...l[i], etat: 'en_cours' }
  return l
}

function pilotage(s: EtatLogistique, le: Instant): ZonePilotage[] {
  const ex = exploitees()
  const relais = s.relais.map((x) => relaisCourt(x, s.relais, le))
  const ents = s.entreprises.map((e) => entrepriseCourte(e, le))
  const W = P.zones.poids
  const total = W.delai + W.remplissage + W.litiges + W.couverture
  return ZONES.map((z) => {
    const st = STATS[z.code]
    const rel = relais.filter((x) => x.zone === z.code && x.statut !== 'en_configuration')
    const actives = ents.filter((e) => active(e) && e.zones.includes(z.code)).length
    const litiges = LITIGES.filter((l) => l.zone === z.code).length
    const exploitee = ex.has(z.code)
    const taux5h = st.livres[1] ? Math.round((100 * st.livres[0]) / st.livres[1]) : null
    let composantes: ZonePilotage['composantes'] = null
    let sante: number | null = null
    const raisons: string[] = []
    let etat: ZonePilotage['etat'] = 'vente'
    if (exploitee) {
      const relaisC = rel.length ? Math.max(...rel.map((x) => (x.statut === 'ouvert' || x.statut === 'fin_convention' ? 100 : x.statut === 'sature' ? 50 : 0))) : 0
      const entC = Math.min(100, (100 / P.entreprises.minParZone) * actives)
      composantes = {
        delai: taux5h ?? 0,
        remplissage: st.remplissage === null ? 0 : Math.min(100, Math.round((100 * st.remplissage) / P.zones.remplissage.objectif)),
        litiges: Math.max(0, 100 - 10 * litiges),
        couverture: Math.round((relaisC + entC) / 2),
      }
      sante = Math.round((W.delai * composantes.delai + W.remplissage * composantes.remplissage + W.litiges * composantes.litiges + W.couverture * composantes.couverture) / total)
      if (taux5h !== null && taux5h < P.zones.alerteTauxPct) raisons.push(`Livraison sous 5 h : ${taux5h} % sur 7 jours (seuil ${P.zones.alerteTauxPct} %)`)
      if (sante < P.zones.alerteScore) raisons.push(`Santé ${sante} sous ${P.zones.alerteScore}`)
      if (st.remplissage !== null && st.remplissage < P.zones.remplissage.alerte) raisons.push(`Remplissage des tournées ${st.remplissage} colis (seuil ${P.zones.remplissage.alerte})`)
      if (actives < P.entreprises.minParZone) raisons.push(`${actives} entreprise(s) active(s) sur ${P.entreprises.minParZone}`)
      if (rel.some((x) => x.statut === 'sature')) raisons.push('Relais saturé')
      if (rel.some((x) => x.statut === 'ferme')) raisons.push('Relais fermé')
      etat = raisons.some((x) => /^Livraison|^Santé|^Remplissage/.test(x)) ? 'alerte' : sante >= P.zones.etats.saine && actives >= P.entreprises.minParZone ? 'saine' : 'surveiller'
    }
    const relaisActif = relais.some((x) => x.zone === z.code && (x.statut === 'ouvert' || x.statut === 'sature'))
    return {
      code: z.code, nom: z.nom, exploitee, commandes7j: st.commandes, delaiMoyenMin: st.delai, taux5h, livres7j: st.livres,
      relais: relais.filter((x) => x.zone === z.code).map((x) => ({ nom: x.nom, taux: x.taux, statut: x.statut })),
      entreprisesActives: actives, vendeurs: VENDEURS.filter((v) => v.zone === z.code).length || st.vendeurs, remplissageTournees: st.remplissage, litigesOuverts: litiges,
      demandesNonServies: st.demandes, composantes, sante, etat, raisons,
      plan: s.plans.find((p) => p.zone === z.code) ?? null,
      saison: s.saisons.find((p) => p.zone === z.code) ?? null,
      preparation: [
        { t: 'Relais actif', ok: relaisActif },
        { t: `${P.entreprises.minParZone} entreprises actives`, ok: actives >= P.entreprises.minParZone },
        { t: 'Volume suffisant (décision Direction)', ok: st.commandes >= 20 },
        { t: 'Emballages pour une zone de plus', ok: true },
      ],
      recherches: st.recherches,
    }
  })
}

function emballages(s: EtatLogistique): Emballages {
  const E = s.emb
  const consoTot = REFS.reduce((n, r) => n + E.conso[r], 0)
  const stock = REFS.map((ref) => {
    const total = E.siege[ref] + E.avance[ref]
    const couvertureJ = E.conso[ref] ? Math.round((10 * total) / E.conso[ref]) / 10 : null
    const sous = couvertureJ !== null && couvertureJ < P.emballages.seuilJ
    return { ref, format: FORMATS[ref], siege: E.siege[ref], avance: E.avance[ref], total, consoJour: E.conso[ref], couvertureJ, prevuPct: P.emballages.repartition[ref], reelPct: Math.round((100 * E.conso[ref]) / consoTot), aCommander: sous ? Math.ceil(E.conso[ref] * P.emballages.couvertureJ - total) : 0 }
  })
  const ecarts = E.ecarts.map((x) => {
    const nonJustifie = x.lignes.reduce((n, l) => n + Math.max(0, l.doitRester - l.compte - l.justifie), 0)
    return { ...x, nonJustifie, ecartPct: Math.round((1000 * nonJustifie) / x.avancesMois) / 10 }
  })
  const actives = new Set(E.plages.filter((p) => p.etat === 'active').map((p) => p.livreur))
  const sansPlage = LIVREURS.filter((l) => s.livreurs.find((x) => x.id === l.id)?.statut === 'actif' && !actives.has(l.nom)).map((l) => ({ livreurId: l.id, livreur: l.nom, entreprise: l.entreprise }))
  return {
    stock,
    mouvements: [...E.mouvements].sort((a, b) => b.le - a.le),
    ecarts,
    plages: E.plages,
    avances: [
      { entreprise: 'Yafé Express', nonConsommes: ecarts[0].lignes.reduce((n, l) => n + l.compte, 0), remisLe: yaounde(2026, 10, 8, 15, 0) },
      { entreprise: 'Mboa Logistique', nonConsommes: ecarts[1].lignes.reduce((n, l) => n + l.compte, 0), remisLe: yaounde(2026, 10, 1, 9, 30) },
      { entreprise: 'Rapide Colis Yaoundé', nonConsommes: 0, remisLe: null },
    ],
    sansPlage,
  }
}

// ── Lectures ──────────────────────────────────────────────────────────────────────────────────────────────────────
const enPerimetre = (zones: CodeZone[]) => zones.some((z) => dansPerimetre(z))

function livreurCourt(l: LivreurDonnee, s: EtatLogistique, le: Instant): LivreurCourt {
  const j = LIVREURS.find((x) => x.id === l.id)!
  const e = s.entreprises.find((x) => x.nom === j.entreprise)
  const pq = paquetsCourts(s, le).find((p) => p.livreur === j.nom && ['accepte', 'en_route', 'en_retard', 'incident'].includes(p.etat))
  const d = tousLesDeparts(s, le).find((x) => x.livreurId === l.id && x.etat !== 'clos')
  const ts = l.trustScore
  return {
    id: l.id, nom: j.nom, entreprise: j.entreprise, entrepriseId: e?.id ?? '', zones: j.zones, statut: l.statut, vehicule: l.vehicule, trustScore: ts,
    palier: ts === null ? null : ts >= P.entreprises.seuils.Or ? 'Or' : ts >= P.entreprises.seuils.Confirme ? 'Confirme' : 'Nouveau',
    missionsJour: l.missionsJour, enMission: pq?.id ?? null, incidents30j: l.incidents30j, pieceAlerte: l.pieceAlerte,
    enPreavis: d ? { depart: d.id, jusqua: d.preavisJusqua } : null, reverification: l.reverification, suspension: l.suspension,
  }
}

export const demoLogistique: DomaineLogistique = {
  zones: async () => repondre(ZONES.filter((z) => dansPerimetre(z.code)).map((z) => ({ ...z, exploitee: exploitees().has(z.code) }))),
  async relais() {
    exigerPage('relais', 'Points relais')
    const s = lire()
    const le = maintenant()
    return repondre(s.relais.filter((x) => dansPerimetre(x.zone)).map((x) => relaisCourt(x, s.relais, le)))
  },
  async relaisFiche(id) {
    exigerPage('relais', 'Points relais')
    const s = lire()
    const le = maintenant()
    const x = s.relais.find((y) => y.id === id && dansPerimetre(y.zone))
    if (!x) return repondre(null)
    const c = relaisCourt(x, s.relais, le)
    const ouverture = yaounde(2026, 10, 13, 8, 0)
    const journee: Moment[] = x.configuration
      ? []
      : [
          { le: ouverture, titre: 'Ouverture du relais', detail: `${c.enGarde} colis en garde`, etat: 'fait' },
          ...PAQUETS.filter((p) => p.etat === 'livre' && relaisNomDe(p.id) === x.nom).map((p) => ({ le: p.heureLimite, titre: `${p.id} déposé`, detail: `${p.colis} colis · QR de mission scanné`, etat: 'fait' as const })),
          ...(x.fermeture ? [{ le: x.fermeture.depuis, titre: 'Fermeture imprévue constatée', detail: x.fermeture.signalePar, etat: 'mauvais' as const }] : []),
          ...(x.fermeture?.relance ? [{ le: x.fermeture.relance, titre: 'Relance du gérant', detail: 'Messagerie du relais', etat: 'fait' as const }] : []),
          ...(x.fermeture?.transfert ? [{ le: x.fermeture.transfert.le, titre: `${x.fermeture.transfert.colis} colis transférés`, detail: `Vers ${x.fermeture.transfert.versNom}`, etat: 'fait' as const }] : []),
          ...(c.statut === 'sature' ? [{ le: null, titre: `Seuil de ${P.relais.saturePct} % franchi`, detail: 'Plus de nouveau paquet vers ce relais ; bascule proposée', etat: 'mauvais' as const }] : []),
          ...(x.bascule ? [{ le: x.bascule.le, titre: `Bascule vers ${x.bascule.versNom}`, detail: x.bascule.par, etat: 'fait' as const }] : []),
          ...PAQUETS.filter((p) => ['en_route', 'accepte'].includes(p.etat) && relaisNomDe(p.id) === x.nom).map((p) => ({ le: p.heureLimite, titre: `${p.id} attendu`, detail: `${p.colis} colis · ${p.livreur ?? '—'}`, etat: 'en_cours' as const })),
        ]
    const f: RelaisFiche = {
      ...c,
      kyc: { piece: x.kyc, momo: x.momo, dossier: x.dossier },
      visite: x.visite ? { ...x.visite, points: [{ t: 'Local fermé à clé, au sec, hors passage', ok: true }, { t: 'Étagères numérotées, emplacements étiquetés', ok: true }, { t: `${x.capacite} places mesurées, jamais sous les places occupées`, ok: true }, { t: `Horaires affichés, fermeture à ${x.fermeA}`, ok: true }, { t: 'Téléphone du relais : photo et scan testés', ok: !x.configuration }] } : null,
      formationLe: x.formationLe,
      photos: x.visite ? ['Devanture', 'Étagères', 'Comptoir', 'Enseigne'].map((n, i) => ({ nature: n, le: x.visite!.le + i * 4 * MINUTE })) : [],
      journee: journee.sort((u, v) => (u.le ?? le) - (v.le ?? le)),
      autresRelaisZone: s.relais.filter((y) => y.zone === x.zone && y.id !== x.id && !y.configuration).length,
    }
    return repondre(f)
  },
  async entreprises() {
    exigerPage('entreprises', 'Entreprises de livraison')
    const s = lire()
    const le = maintenant()
    return repondre(s.entreprises.filter((e) => enPerimetre(e.zones)).map((e) => entrepriseCourte(e, le)))
  },
  async entrepriseFiche(id) {
    exigerPage('entreprises', 'Entreprises de livraison')
    const s = lire()
    const le = maintenant()
    const e = s.entreprises.find((x) => x.id === id && enPerimetre(x.zones))
    if (!e) return repondre(null)
    const c = entrepriseCourte(e, le)
    const pqs = paquetsCourts(s, le).filter((p) => p.entreprise === e.nom)
    const f: EntrepriseFiche = {
      ...c, dirigeant: e.dirigeant, contrat: e.contrat, acces: { noms: e.acces, max: P.entreprises.accesMax }, reglement: e.reglement, etapes: etapesEntreprise(e, s), pieces: e.pieces,
      pilote: e.pilote ? { debut: e.pilote, jour: Math.min(P.entreprises.piloteJ, Math.floor((le - e.pilote) / JOUR) + 1), duree: P.entreprises.piloteJ, bilanLe: e.pilote + P.entreprises.piloteJ * JOUR, rapport: e.rapport } : null,
      suspension: e.suspension, grille: grilleReference(), grilleVersion: 'G1 · offre de référence du 25 sept.', paquetsJour: pqs.length, incidents: pqs.filter((p) => p.etat === 'incident').length, retenues: 0,
    }
    return repondre(f)
  },
  async couverture() {
    exigerPage('entreprises', 'Entreprises de livraison')
    const s = lire()
    const le = maintenant()
    const ents = s.entreprises.map((e) => entrepriseCourte(e, le))
    const out: CouvertureZone[] = PARAMETRES.zonesExploitees.filter((z) => dansPerimetre(z.code)).map((z) => {
      const l = ents.filter((e) => e.zones.includes(z.code)).map((e) => ({ id: e.id, nom: e.nom, capacite: e.capacites[z.code]?.capacite ?? 0, active: active(e) }))
      return { zone: z.code, nom: z.nom, entreprises: l, actives: l.filter((x) => x.active).length }
    })
    return repondre(out)
  },
  async placements() {
    exigerPage('entreprises', 'Entreprises de livraison')
    return repondre(lire().placements)
  },
  async livreurs() {
    exigerPage('livreurs', 'Livreurs')
    const s = lire()
    const le = maintenant()
    return repondre(s.livreurs.map((l) => livreurCourt(l, s, le)).filter((l) => enPerimetre(l.zones)))
  },
  async livreurFiche(id) {
    exigerPage('livreurs', 'Livreurs')
    const s = lire()
    const le = maintenant()
    const l = s.livreurs.find((x) => x.id === id)
    if (!l) return repondre(null)
    const c = livreurCourt(l, s, le)
    if (!enPerimetre(c.zones)) return repondre(null)
    const pl = s.emb.plages.find((p) => p.livreur === c.nom && p.etat === 'active')
    const f: LivreurFiche = {
      ...c,
      certification: { modules: l.modules, total: 7, quiz: l.quiz, le: l.certifieLe },
      pieces: [
        { nature: 'Pièce d’identité', statut: l.certifieLe ? 'verifiee' : 'en_revue' },
        { nature: 'Photo de la personne (selfie)', statut: l.reverification ? 'en_revue' : l.certifieLe ? 'verifiee' : 'en_revue' },
        { nature: 'Permis de conduire', statut: l.certifieLe ? 'verifiee' : 'en_revue' },
      ],
      etiquettes: pl ? { plage: pl.plage, consommees: pl.consommees, total: pl.total } : null,
      missions: paquetsCourts(s, le).filter((p) => p.livreur === c.nom).map((p) => ({ paquet: p.id, etat: p.etat, detail: `${p.colis} colis · ${p.destination}` })),
      derniereSync: l.derniereSync,
    }
    return repondre(f)
  },
  async departs() {
    exigerPage('livreurs', 'Livreurs')
    const s = lire()
    const le = maintenant()
    return repondre(tousLesDeparts(s, le).filter((d) => enPerimetre(d.zones) && (!d.clos || le - d.clos.le < P.livreurs.departVisibleJ * JOUR)))
  },
  async changements() {
    exigerPage('livreurs', 'Livreurs')
    return repondre(lire().changements.filter((c) => dansPerimetre(c.zone)))
  },
  async paquets() {
    exigerPage('paquets', 'Paquets et dispatch')
    return repondre(paquetsCourts(lire(), maintenant()).filter((p) => dansPerimetre(p.zone)))
  },
  async paquetFiche(id) {
    exigerPage('paquets', 'Paquets et dispatch')
    const s = lire()
    const le = maintenant()
    const c = paquetsCourts(s, le).find((p) => p.id === id && dansPerimetre(p.zone))
    if (!c) return repondre(null)
    const d = s.paquets.find((p) => p.id === id)!
    const ents = s.entreprises.map((e) => entrepriseCourte(e, le))
    const eligibles = ents
      .filter((e) => e.zones.includes(c.zone))
      .map((e) => {
        const raison = !active(e) ? (e.statut === 'restreinte' ? 'Restreinte (paquets rendus)' : e.statut === 'suspendue' ? 'Suspendue' : 'Non activée') : e.plafond !== null && e.plafond < c.valeurMax ? `Plafond ${e.plafond} F < ${c.valeurMax} F` : (e.capacites[c.zone]?.acceptes ?? 0) >= (e.capacites[c.zone]?.capacite ?? 0) ? 'Capacité du jour atteinte' : 'Éligible'
        return { entreprise: e.nom, palier: e.palier, trustScore: e.trustScore, rang: null as number | null, raison }
      })
      .sort((u, v) => PALIERS.indexOf(v.palier) - PALIERS.indexOf(u.palier) || (v.trustScore ?? 0) - (u.trustScore ?? 0))
    let rang = 0
    for (const e of eligibles) if (e.raison === 'Éligible') e.rang = ++rang
    const chronologie: Moment[] = [
      { le: d.publieLe !== null ? d.publieLe - 40 * MINUTE : null, titre: 'Premier « C’est prêt »', detail: 'Le paquet entre en constitution', etat: 'fait' },
      ...(d.publieLe !== null ? [{ le: d.publieLe, titre: 'Publié aux entreprises de la zone', detail: `Délai d’acceptation ${P.paquets.acceptationMin} min, priorité ${P.paquets.prioriteMin} min`, etat: 'fait' as const }] : []),
      ...(c.entreprise ? [{ le: d.publieLe !== null ? d.publieLe + 6 * MINUTE : null, titre: `Accepté par ${c.entreprise}`, detail: c.livreur ? `Affecté par l’entreprise à ${c.livreur}` : undefined, etat: 'fait' as const }] : []),
      ...(c.etat === 'sans_preneur' ? [{ le: (d.publieLe ?? le) + P.paquets.acceptationMin * MINUTE, titre: 'Sans preneur au terme du délai', detail: 'Carte d’escalade Opérations', etat: 'mauvais' as const }] : []),
      ...(d.escalade.elargi ? [{ le: d.escalade.elargi, titre: 'Publication élargie', etat: 'fait' as const }] : []),
      ...(d.escalade.priorite ? [{ le: d.escalade.priorite, titre: 'Priorité relevée', etat: 'fait' as const }] : []),
      ...(d.escalade.prevenu ? [{ le: d.escalade.prevenu, titre: 'Vendeur et client prévenus du décalage', detail: 'Messagerie officielle et SMS, sans montant ni promesse d’heure', etat: 'fait' as const }] : []),
      { le: c.heureLimite, titre: 'Heure limite', etat: c.margeMin < 0 ? 'mauvais' : 'a_venir' },
    ]
    const w = P.entreprises.yafe
    const tranche = c.colis >= 10 ? 2 : c.colis >= 5 ? 1 : 0
    const achat = c.genre === 'relais' ? c.colis * w.tournee[tranche] : c.genre === 'domicile' ? w.domicile[c.zone === 'Z1' ? 1 : 0] : null
    const partRelais = d.colisDetail.reduce((n, x) => n + P.relais.gains[x.classe], 0)
    const f: PaquetFiche = {
      ...c, arrets: d.arrets, colisDetail: d.colisDetail, eligibles, chronologie: chronologie.sort((u, v) => (u.le ?? le) - (v.le ?? le)),
      argent: achat === null ? null : { relais: c.genre === 'relais' ? partRelais : 0, achat },
      grilleVersion: 'G1 · offre de référence du 25 sept.',
    }
    return repondre(f)
  },
  async pilotage() {
    exigerPage('zones', 'Pilotage des zones')
    return repondre(pilotage(lire(), maintenant()).filter((z) => dansPerimetre(z.code)))
  },
  async carte() {
    exigerPage('carte', 'Carte opérationnelle')
    const s = lire()
    const le = maintenant()
    const pts: PointCarte[] = []
    for (const x of s.relais) {
      const c = relaisCourt(x, s.relais, le)
      pts.push({ id: x.id, calque: 'relais', nom: x.nom, sous: c.statut === 'en_configuration' ? 'En configuration' : `${c.taux} % · ${c.enGarde} colis en garde`, lat: c.lat, lng: c.lng, zone: x.zone, ton: c.statut === 'sature' || c.statut === 'ferme' ? 'red' : c.statut === 'en_configuration' ? 'ink' : 'blue', route: 'relais', params: { id: x.id } })
    }
    VENDEURS.forEach((v, i) => {
      const [lat, lng] = pres(v.zone, 0.004 * Math.cos(i * 1.7), 0.005 * Math.sin(i * 1.7))
      pts.push({ id: v.id, calque: 'boutiques', nom: v.nom, sous: `${v.palier} · ${v.statut === 'actif' ? 'ouverte' : v.statut === 'suspendu' ? 'suspendue' : 'en revue'}`, lat, lng, zone: v.zone, ton: 'or', route: 'vendeurs', params: { id: v.id } })
    })
    for (const e of s.entreprises) pts.push({ id: e.id, calque: 'entreprises', nom: e.nom, sous: `Agence · ${e.quartier}`, lat: e.pos[0], lng: e.pos[1], zone: zoneDuPoint(e.pos[0], e.pos[1]) ?? e.zones[0], ton: e.base === 'configuration' ? 'ink' : 'acc', route: 'entreprises', params: { id: e.id } })
    for (const p of paquetsCourts(s, le).filter((x) => ['accepte', 'en_route', 'en_retard', 'incident', 'sans_preneur', 'publie', 'constitution'].includes(x.etat))) {
      const dest = s.relais.find((y) => y.nom === p.destination)?.pos ?? pres(p.zone, -0.002, 0.003)
      const depart = pres(p.zone, 0.003, -0.004)
      const enCours = ['en_route', 'en_retard', 'incident'].includes(p.etat)
      pts.push({ id: p.id, calque: 'paquets', nom: p.id, sous: `${p.colis} colis · ${p.destination}`, lat: dest[0], lng: dest[1], zone: p.zone, ton: p.etat === 'en_retard' || p.etat === 'sans_preneur' || p.etat === 'incident' ? 'red' : 'or', route: 'paquets', params: { id: p.id }, trajet: [depart, dest] })
      if (enCours && p.livreur) {
        const l = LIVREURS.find((y) => y.nom === p.livreur)
        const ld = s.livreurs.find((y) => y.id === l?.id)
        const hors = ld?.derniereSync && le - ld.derniereSync > 10 * MINUTE ? ld.derniereSync : null
        pts.push({ id: 'pos-' + (l?.id ?? p.id), calque: 'livreurs', nom: p.livreur, sous: `${p.entreprise} · ${p.id}`, lat: (depart[0] + dest[0]) / 2, lng: (depart[1] + dest[1]) / 2, zone: p.zone, ton: hors ? 'ink' : 'acc', route: 'livreurs', params: { id: l?.id ?? '' }, horsConnexion: hors, livreurId: l?.id })
      }
      if (['sans_preneur', 'en_retard', 'incident'].includes(p.etat)) pts.push({ id: 'al-' + p.id, calque: 'alertes', nom: p.id, sous: p.etat === 'sans_preneur' ? 'Sans preneur' : p.etat === 'en_retard' ? 'En retard' : 'Incident', lat: dest[0] + 0.0015, lng: dest[1] + 0.0015, zone: p.zone, ton: 'red', route: 'paquets', params: { id: p.id } })
    }
    for (const x of s.relais.map((y) => relaisCourt(y, s.relais, le)).filter((y) => y.statut === 'sature' || y.statut === 'ferme'))
      pts.push({ id: 'al-' + x.id, calque: 'alertes', nom: x.nom, sous: x.statut === 'sature' ? `Saturé · ${x.taux} %` : 'Fermé', lat: x.lat + 0.0015, lng: x.lng - 0.0015, zone: x.zone, ton: 'red', route: 'relais', params: { id: x.id } })
    // Aucune adresse de client (ADM-P22R-02) ; positions des livreurs : Direction et Opérations de la zone seulement.
    const voitPositions = ['superviseur', 'operations'].includes(roleCourant())
    return repondre(pts.filter((p) => dansPerimetre(p.zone) && (p.calque !== 'livreurs' || voitPositions)))
  },
  async consulterPosition(livreurId) {
    exigerPage('carte', 'Carte opérationnelle')
    const s = lire()
    const le = maintenant()
    const l = s.livreurs.find((x) => x.id === livreurId)
    const c = l ? livreurCourt(l, s, le) : null
    if (!c || !c.enMission || !enPerimetre(c.zones)) return { ok: false, raison: 'hors_mission' }
    await journaliser({ action: 'carte.position', objet: `${c.nom} · ${c.enMission}`, motif: 'Consultation de la position pendant une mission active', zone: c.zones.find((z) => dansPerimetre(z)) ?? null })
    return { ok: true, le }
  },
  async emballages() {
    exigerPage('emballages', 'Emballages et étiquettes')
    return repondre(emballages(lire()))
  },
  async candidatures() {
    exigerPage('candidatures', 'Candidatures des partenaires')
    return repondre(lire().candidatures.filter((x) => dansPerimetre(x.zone)))
  },
  async dossiersLivreurs() {
    exigerPage('livreurs', 'Livreurs')
    const s = lire()
    return repondre(dossiersDuPont(s).filter((d) => !d.livreurId || enPerimetre(LIVREURS.find((x) => x.id === d.livreurId)!.zones)))
  },
  async verifier(action, objet) {
    const s = lire()
    const refus = controle(s, action, objet, acteurCourant(), maintenant())
    if (refus) return { ok: false, raison: refus.raison, detail: refus.detail ?? undefined }
    return { ok: true, regle: REGLES[action], detail: null }
  },
  async suspendreLivreur(id, motif, jusqua) {
    exigerPage('livreurs', 'Livreurs')
    if (droitDe('livreurs', roleCourant()).acces === 'lecture') throw new Error('lecture seule')
    if (motif.trim().length < PARAMETRES.console.motifMin) return { ok: false, raison: 'motif_court' }
    const le = maintenant()
    etatLog.ecrire((s) => {
      const l = s.livreurs.find((x) => x.id === id)
      if (l) Object.assign(l, { statut: 'suspendu', suspension: { motif, depuis: le, jusqua, par: nomAgent(agentCourant()) } })
    })
    publier({ type: 'livreur_suspendu', livreurId: id, motif, jusqua }, `admin-suspension-${id}-${le}`, le)
    await journaliser({ action: 'livreur.suspension_directe', objet: id, motif })
    return { ok: true }
  },
}

function relaisNomDe(paquet: string) {
  return PAQUETS_INITIAUX().find((p) => p.id === paquet)?.destination ?? ''
}

/** Pour les tests : l'état de la démonstration repart du jeu d'essai. */
export const reinitialiserLogistique = () => etatLog.reinitialiser()

// ── États vivants lus par la File d'action, les compteurs et la vue d'ensemble (filtrés par l'appelant) ──────────────
export function etatsLogistique() {
  const s = lire()
  const le = maintenant()
  return { paquets: paquetsCourts(s, le), relais: s.relais.map((x) => relaisCourt(x, s.relais, le)), departs: tousLesDeparts(s, le), candidatures: s.candidatures }
}
