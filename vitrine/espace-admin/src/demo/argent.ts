// DONNÉES DE DÉMONSTRATION — le « serveur » de l'argent de la console (groupe S2) : escrow et registre, Wallet,
// remboursements, versements du vendredi, rapprochement, commissions, grand livre. Les commandes du jeu d'essai
// (jeu-essai.ts) sont complétées ici de ce que l'argent en sait (articles, catégorie, moyen de paiement, retrait) ; tous
// les montants sont CALCULÉS par les règles (src/calculs/argent.ts, lues au registre) : aucun n'est écrit à la main,
// sauf les données d'activité (prix payés, colis remis, espèces encaissées, relevé de l'agrégateur).
// Les décisions passent par la feuille commune (DecisionMotivee) : l'état se DÉDUIT du journal (gestes directs) et des
// décisions à quatre yeux (quatreyeux.ts) ; rien n'est appliqué tant que le second validateur n'a pas contresigné.
import { yaounde, JOUR, HEURE, MINUTE } from '../calculs/temps'
import { AccesRefuse, type Role } from '../donnees/communs'
import type { CasAuto, CommandeEscrow, CompteWallet, Cycle, DomaineArgent, Ecriture, EtatEscrow, EtatRemb, LigneExport, Lot, RemboursementVu, Transition, VendeurCommission } from '../donnees/domaines/argent'
import type { DecisionQuatreYeux } from '../donnees/domaines/quatreyeux'
import { ARGENT, commission, fraisClient, partDe, remboursementCalcule, remiseDePlan, versementRelais, versementVendeur as versementVendeurArrondi, type Classe, type Famille, type LigneVente, type Palier } from '../calculs/argent'
import { publier } from './pont'
import { maintenant } from './horloge'
import { agentCourant, auPerimetre, exigerPage, roleCourant } from './acces'
import { journalDemo, journaliser } from './journal'
import { CLIENTS, COMMANDES, LITIGES, VENDEURS, nomAgent } from './jeu-essai'
import { quatreYeuxDemo } from './quatreyeux'
import { evenementsPour } from './pont'

/** Garde d'idempotence (un seul remboursement par commande) : une annulation ou un remboursement exécuté de cette
 *  commande est-il déjà parti au client (pont), sous une autre clé que `cle` ? */
export const dejaRembourseeAuPont = (commande: string, cle: string) =>
  evenementsPour('admin').some((x) => x.app === 'admin' && x.cle !== cle && (x.type === 'commande_annulee' || x.type === 'remboursement_execute') && x.commande === commande)
import { magasin, repondre } from './stockage'

const Y = (mois: number, jour: number, h = 0, m = 0) => yaounde(2026, mois, jour, h, m)
const ARGENT_ROLES: Role[] = ['superviseur', 'finance']
const agit = () => ARGENT_ROLES.includes(roleCourant())

// ── État propre au domaine (gestes techniques : statut opérateur, import, cartes, transmission) ────────────────────
interface EtatArgent {
  executes: Record<string, number> // remboursement envoyé par la Finance
  releves: Record<string, number> // statut de l'opérateur relevé : confirmé
  cartes: { id: string; objet: string; texte: string; le: number; par: string }[]
  import: { nom: string; le: number; lignes: number; concordantes: number; ecarts: { ref: string; registre: number; releve: number }[] } | null
  transmis: Record<string, { le: number; par: string }>
  n: number
}
export const argentDemo = magasin<EtatArgent>('argent', () => ({ executes: {}, releves: {}, cartes: [], import: null, transmis: {}, n: 0 }))

// ── Décisions : journal (gestes directs) et quatre yeux ─────────────────────────────────────────────────────────────
const lignesJournal = () => journalDemo.lire().lignes
const fait = (action: string, objet: string) => lignesJournal().filter((l) => l.action === action && l.objet === objet).at(-1) ?? null
const decision = (action: string, objet: string): DecisionQuatreYeux | null => quatreYeuxDemo.lire().decisions.filter((d) => d.action === action && d.objet === objet).at(-1) ?? null

// ── Commandes vues par l'argent ─────────────────────────────────────────────────────────────────────────────────────
interface SousCommande {
  vendeur: string
  articles: (LigneVente & { libelle: string })[]
}
interface CommandeArgent {
  ref: string
  client: string
  zone: string
  relais: string | null
  entreprise: string | null
  moyen: 'momo' | 'wallet' | 'comptoir'
  numero: string
  payeeLe: number
  livraison: number
  classe: Classe
  domicile?: boolean
  sous: SousCommande[]
  retireLe?: number
  confirme?: boolean
  verseLe?: number
  remboursement?: string
}
const DECOUVERTE = new Set(['Tonton PG', 'Saveurs du Pays'])
const palierDe = (vendeur: string): Palier => (VENDEURS.find((v) => v.nom === vendeur)?.palier ?? 'Bronze') as Palier
const de = (ref: string) => COMMANDES.find((c) => c.ref === ref)!
const sc = (vendeur: string, libelle: string, famille: Famille, prix: number, mic = false): SousCommande => ({ vendeur, articles: [{ libelle, famille, prix, mic }] })

// Commandes du jeu d'essai (mêmes références, clients, relais, zones et totaux) et commandes plus anciennes de la
// semaine (libérées, versées) : données d'activité ; les montants retenus sont calculés.
const CMD: CommandeArgent[] = [
  { ref: 'BLV-52107', client: 'c-4217', zone: 'Z9', relais: 'Relais Mvog-Ada', entreprise: null, moyen: 'momo', numero: 'MTN ···· 17', payeeLe: de('BLV-52107').payeeLe, livraison: 0, classe: 'M', sous: [sc('Techno Bastos', 'Tecno Camon 30 · 256 Go', 'telephonie', 160000), sc('Tonton PG', 'Batterie externe 20 000 mAh', 'telephonie', 20280)], remboursement: 'RB-0031' },
  { ref: 'BLV-52089', client: 'c-4217', zone: 'Z9', relais: 'Relais Mvog-Ada', entreprise: null, moyen: 'momo', numero: 'Orange ···· 58', payeeLe: de('BLV-52089').payeeLe, livraison: 0, classe: 'S', sous: [sc('Maman Wax Mokolo', 'Ensemble pagne et foulard', 'mode', 36080)] },
  { ref: 'BLV-51877', client: 'c-4217', zone: 'Z9', relais: 'Relais Mvog-Ada', entreprise: null, moyen: 'momo', numero: 'MTN ···· 17', payeeLe: de('BLV-51877').payeeLe, livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'Chargeur rapide 33 W', 'telephonie', 15800)], remboursement: 'RB-0032' },
  { ref: 'BLV-00008', client: 'c-0388', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 88', payeeLe: de('BLV-00008').payeeLe, livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'ITEL AC52 noir', 'telephonie', 20000)] },
  { ref: 'BLV-00009', client: 'c-0388', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 88', payeeLe: de('BLV-00009').payeeLe, livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'Montre connectée T500', 'telephonie', 14000)] },
  { ref: 'BLV-00011', client: 'c-7731', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'comptoir', numero: 'Orange ···· 31 · au comptoir', payeeLe: de('BLV-00011').payeeLe, livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'Câble USB-C 1 m', 'telephonie', 4000)] },
  { ref: 'BLV-52230', client: 'c-7731', zone: 'Z3', relais: 'Relais Mokolo Marché', entreprise: 'Yafé Express', moyen: 'momo', numero: 'Orange ···· 31', payeeLe: de('BLV-52230').payeeLe, livraison: 900, classe: 'S', sous: [sc('Maman Wax Mokolo', 'Ensemble bazin brodé', 'mode', 28000)] },
  { ref: 'BLV-52241', client: 'c-2954', zone: 'Z6', relais: null, entreprise: 'Yafé Express', moyen: 'wallet', numero: 'Wallet', payeeLe: de('BLV-52241').payeeLe, livraison: 1500, classe: 'S', domicile: true, sous: [sc('Beauté Melen', 'Coffret karité et savon noir', 'mode', 10900)] },
  { ref: 'BLV-52245', client: 'c-6120', zone: 'Z6', relais: 'Relais Biyem-Assi Lycée', entreprise: 'Mboa Logistique', moyen: 'momo', numero: 'MTN ···· 20', payeeLe: de('BLV-52245').payeeLe, livraison: 0, classe: 'L', sous: [sc('Pièces Auto Biyem', 'Batterie 12 V 45 Ah', 'maison', 64500)] },
  { ref: 'BLV-52198', client: 'c-2954', zone: 'Z6', relais: 'Relais Melen Université', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 54', payeeLe: de('BLV-52198').payeeLe, livraison: 900, classe: 'S', sous: [sc('Saveurs du Pays', 'Miel de l’Adamaoua · 1 L', 'supermarche', 8900, true)], retireLe: Y(10, 11, 10, 0), confirme: true },
  { ref: 'BLV-52150', client: 'c-6120', zone: 'Z6', relais: 'Relais Biyem-Assi Lycée', entreprise: 'Mboa Logistique', moyen: 'momo', numero: 'Orange ···· 20', payeeLe: de('BLV-52150').payeeLe, livraison: 0, classe: 'M', sous: [sc('Techno Bastos', 'Ordinateur portable HP 15', 'telephonie', 112000)], remboursement: 'RB-0029' },
  // Semaine passée : retirées, libérées ou versées.
  { ref: 'BLV-52112', client: 'c-0388', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 88', payeeLe: Y(10, 7, 18, 40), livraison: 0, classe: 'M', sous: [sc('Techno Bastos', 'MacBook Air M2 · 13 pouces', 'telephonie', 455000)], retireLe: Y(10, 10, 11, 20), confirme: true },
  { ref: 'BLV-52126', client: 'c-7731', zone: 'Z1', relais: 'Relais Nlongkak Pharmacie', entreprise: 'Yafé Express', moyen: 'momo', numero: 'Orange ···· 31', payeeLe: Y(10, 9, 9, 15), livraison: 0, classe: 'L', sous: [sc('Techno Bastos', 'Écran 27 pouces', 'telephonie', 98000)], retireLe: Y(10, 12, 16, 40), confirme: true },
  { ref: 'BLV-00007', client: 'c-7731', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'momo', numero: 'Orange ···· 31', payeeLe: Y(10, 3, 19, 12), livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'ITEL AC52 noir', 'telephonie', 20000)], retireLe: Y(10, 6, 17, 30), confirme: true },
  { ref: 'BLV-52205', client: 'c-2954', zone: 'Z3', relais: 'Relais Mokolo Marché', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 54', payeeLe: Y(10, 6, 12, 5), livraison: 900, classe: 'S', sous: [sc('Maman Wax Mokolo', 'Pagne wax 6 yards', 'mode', 24000)], retireLe: Y(10, 9, 10, 0), confirme: true },
  { ref: 'BLV-52210', client: 'c-6120', zone: 'Z6', relais: 'Relais Melen Université', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 20', payeeLe: Y(10, 6, 16, 30), livraison: 900, classe: 'S', sous: [sc('Beauté Melen', 'Coffret soins karité', 'mode', 17500)], retireLe: Y(10, 9, 15, 0), confirme: true },
  { ref: 'BLV-52261', client: 'c-6120', zone: 'Z6', relais: 'Relais Biyem-Assi Lycée', entreprise: null, moyen: 'momo', numero: 'Orange ···· 44', payeeLe: Y(10, 13, 9, 30), livraison: 900, classe: 'S', sous: [sc('Beauté Melen', 'Rouge à lèvres mat · lot de 3', 'mode', 8500)], remboursement: 'RB-0033' },
  { ref: 'BLV-52255', client: 'c-0388', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: null, moyen: 'momo', numero: 'MTN ···· 90', payeeLe: Y(10, 13, 8, 10), livraison: 900, classe: 'S', sous: [sc('Techno Bastos', 'Coque renforcée iPhone 15', 'telephonie', 4500)], remboursement: 'RB-0034' },
  { ref: 'BLV-51940', client: 'c-2954', zone: 'Z6', relais: 'Relais Melen Université', entreprise: 'Yafé Express', moyen: 'momo', numero: 'Orange ···· 58', payeeLe: Y(9, 24, 18, 0), livraison: 900, classe: 'S', sous: [sc('Maman Wax Mokolo', 'Pagne wax 6 yards', 'mode', 24000)], remboursement: 'RB-0030' },
  { ref: 'BLV-00004', client: 'c-0388', zone: 'Z1', relais: 'Relais Bastos Carrefour', entreprise: 'Yafé Express', moyen: 'momo', numero: 'MTN ···· 88', payeeLe: Y(9, 28, 10, 20), livraison: 900, classe: 'S', sous: [sc('Tonton PG', 'ITEL AC52 noir', 'telephonie', 20000)], retireLe: Y(10, 1, 16, 0), confirme: true, verseLe: Y(10, 9, 9, 41) },
  { ref: 'BLV-51990', client: 'c-6120', zone: 'Z6', relais: 'Relais Biyem-Assi Lycée', entreprise: 'Mboa Logistique', moyen: 'momo', numero: 'MTN ···· 20', payeeLe: Y(9, 30, 11, 0), livraison: 0, classe: 'S', sous: [sc('Techno Bastos', 'Tecno Spark 20', 'telephonie', 89000)], retireLe: Y(10, 3, 12, 0), confirme: true, verseLe: Y(10, 9, 8, 24) },
  { ref: 'BLV-52011', client: 'c-7731', zone: 'Z3', relais: 'Relais Mokolo Marché', entreprise: 'Yafé Express', moyen: 'momo', numero: 'Orange ···· 31', payeeLe: Y(10, 1, 9, 0), livraison: 0, classe: 'S', sous: [sc('Maman Wax Mokolo', 'Ensemble bazin et foulard', 'mode', 36000)], retireLe: Y(10, 4, 11, 0), confirme: true },
]
const client = (id: string) => CLIENTS.find((c) => c.id === id)?.masque ?? id
const articlesDe = (c: CommandeArgent) => c.sous.flatMap((s) => s.articles)
const libelleDe = (c: CommandeArgent) => articlesDe(c).map((a) => a.libelle).join(' + ')
const baseDe = (c: CommandeArgent) => articlesDe(c).reduce((n, a) => n + a.prix, 0)
const totalDe = (c: CommandeArgent) => baseDe(c) + c.livraison
const calculDe = (s: SousCommande) => commission(s.articles, palierDe(s.vendeur), DECOUVERTE.has(s.vendeur))
/**
 * R43 (v2.0) : 1 % Mobile Money retenu sur CHAQUE versement du vendredi, payé par celui qui le reçoit (vendeur, relais,
 * entreprise de livraison) ; R22 : arrondi au franc supérieur (même arrondi pour tous, REPRISES-FIN « Console »).
 */
const fraisVersement = (verse: number) => (verse > 0 ? Math.ceil((verse * ARGENT.fraisVersementVendeur) / 100 - 1e-9) : 0)
const LIGNE_FRAIS = () => `Frais de versement Mobile Money (${ARGENT.fraisVersementVendeur} %)`
/** Versement d'un vendeur (R22) : dû − reprises, puis 1 % arrondi au franc supérieur. */
function versementVendeur(du: number, reprises: number) {
  const v = versementVendeurArrondi(du, reprises)
  const frais = fraisVersement(v.brut)
  return { ...v, frais, verse: v.brut - frais }
}
const fraisDe = (c: CommandeArgent) => (c.moyen === 'wallet' ? 0 : fraisClient(totalDe(c)))

// Vendredis : le versement part le vendredi qui suit l'arrêté du jeudi 23 h 59 (VD-VER-ARRETE).
const VENDREDI_COURANT = Y(10, 16, 0, 0)
const ARRETE_COURANT = VENDREDI_COURANT - MINUTE // jeudi 23 h 59
const VENDREDI_DERNIER = Y(10, 9, 0, 0)
const vendrediApres = (t: number) => {
  let v = VENDREDI_DERNIER
  while (v - MINUTE < t) v += 7 * JOUR
  return v
}

// ── Remboursements (données de décision ; états déduits) ───────────────────────────────────────────────────────────
interface RembSeed {
  id: string
  commande: string
  origine: RemboursementVu['origine']
  motif: string
  dossier: string | null
  joursGarde?: number
  auteur: string
  decideLe: number
  initial: EtatRemb
  quatreYeux?: string // décision à quatre yeux déjà en cours (quatreyeux.ts)
  historique?: { premier: string; second: string }
  tentatives?: RemboursementVu['tentatives']
  rembourseLe?: number
  autreNumero?: string
}
const REMB: RembSeed[] = [
  { id: 'RB-0031', commande: 'BLV-52107', origine: 'rupture', motif: 'Rupture chez les deux vendeurs après deux tentatives, sans vendeur de remplacement', dossier: null, auteur: 'Clarisse Mvondo · Support', decideLe: Y(10, 13, 12, 55), initial: 'a_contresigner', quatreYeux: 'QY-0007' },
  { id: 'RB-0029', commande: 'BLV-52150', origine: 'litige', motif: 'Décision du litige : vendeur en tort, remboursement après retour inspecté', dossier: 'LT-0405', auteur: 'Mireille Ngo Bassong · Médiation', decideLe: Y(10, 10, 15, 31), initial: 'rembourse', historique: { premier: 'Mireille Ngo Bassong (Médiation)', second: 'Nadège Eyenga (Finance)' }, tentatives: [{ le: Y(10, 10, 16, 2), vers: 'Orange ···· 20', issue: 'ok', detail: 'Confirmé par l’opérateur' }], rembourseLe: Y(10, 10, 16, 2) },
  { id: 'RB-0032', commande: 'BLV-51877', origine: 'litige', motif: 'En attente de la décision du litige ; exécution au retour inspecté, jamais à la simple demande', dossier: 'LT-0412', auteur: 'Serveur (règle)', decideLe: Y(10, 13, 13, 50), initial: 'attente' },
  { id: 'RB-0030', commande: 'BLV-51940', origine: 'renvoi_garde', motif: 'Colis non retiré après 7 jours de garde au Relais Melen Université : renvoyé au vendeur', dossier: null, joursGarde: 7, auteur: 'Serveur (règle)', decideLe: Y(10, 8, 10, 2), initial: 'echoue', tentatives: [{ le: Y(10, 9, 10, 2), vers: 'Orange ···· 58', issue: 'refus', detail: 'Refusé : numéro résilié' }, { le: Y(10, 10, 10, 2), vers: 'Orange ···· 58', issue: 'refus', detail: 'Nouvelle tentative automatique : même refus' }, { le: Y(10, 11, 10, 2), vers: 'Orange ···· 58', issue: 'refus', detail: 'Troisième tentative : même refus, carte Finance' }], autreNumero: 'MTN ···· 64 · même titulaire (code SMS et nom chez l’opérateur vérifiés)' },
  { id: 'RB-0033', commande: 'BLV-52261', origine: 'annulation', motif: 'Annulée par la cliente avant le ramassage', dossier: null, auteur: 'Serveur (annulation)', decideLe: Y(10, 13, 13, 40), initial: 'en_cours', tentatives: [{ le: Y(10, 13, 13, 42), vers: 'Orange ···· 44', issue: 'attente', detail: 'Envoyé à l’agrégateur · clé rfd:BLV-52261:1' }] },
  { id: 'RB-0034', commande: 'BLV-52255', origine: 'annulation', motif: 'Annulation motivée par le Support : article retiré de la vente par le vendeur', dossier: null, auteur: 'Clarisse Mvondo · Support', decideLe: Y(10, 13, 13, 40), initial: 'decide' },
]

function etatRemb(r: RembSeed): { etat: EtatRemb; vers: string; tentatives: RemboursementVu['tentatives']; rembourseLe: number | null; qy: DecisionQuatreYeux | null } {
  const c = CMD.find((x) => x.ref === r.commande)!
  const s = argentDemo.lire()
  const tentatives = [...(r.tentatives ?? [])]
  let etat: EtatRemb = r.initial
  let vers = c.numero
  let rembourseLe = r.rembourseLe ?? null
  let qy: DecisionQuatreYeux | null = null
  // Litige décidé par le Support ou la Médiation (S1) : le remboursement devient exécutable.
  if (etat === 'attente' && r.dossier && lignesJournal().some((l) => l.objet.includes(r.dossier!) && l.action.startsWith('litige.') && !l.action.endsWith('.premier'))) etat = 'decide'
  const exec = decision('remboursement.executer', r.id)
  if (exec) {
    qy = exec
    if (exec.etat === 'a_contresigner') etat = 'a_contresigner'
    else if (exec.etat === 'refusee') etat = 'refuse'
    else if (exec.etat === 'contresignee' && exec.second) {
      etat = 'en_cours'
      tentatives.push({ le: exec.second.le, vers, issue: 'attente', detail: `Envoyé à l’agrégateur après contre-signature · clé rfd:${r.commande}:1` })
    }
  }
  if (s.executes[r.id] && (etat === 'decide' || etat === 'attente')) {
    etat = 'en_cours'
    tentatives.push({ le: s.executes[r.id], vers, issue: 'attente', detail: `Envoyé à l’agrégateur · clé rfd:${r.commande}:1` })
  }
  const autre = decision('remboursement.autre_numero', r.id)
  if (autre && r.autreNumero) {
    qy = autre
    if (autre.etat === 'a_contresigner') etat = 'a_contresigner'
    else if (autre.etat === 'refusee') etat = 'echoue'
    else if (autre.etat === 'contresignee' && autre.second) {
      etat = 'en_cours'
      vers = r.autreNumero
      tentatives.push({ le: autre.second.le, vers, issue: 'attente', detail: 'Envoyé vers l’autre numéro du même titulaire, après quatre yeux' })
    }
  }
  if (etat === 'en_cours' && s.releves[r.id]) {
    etat = 'rembourse'
    rembourseLe = s.releves[r.id]
    tentatives[tentatives.length - 1] = { ...tentatives[tentatives.length - 1], issue: 'ok', detail: 'Confirmé par l’opérateur · SMS et reçu au client' }
  }
  return { etat, vers, tentatives, rembourseLe, qy }
}

function rembVu(r: RembSeed): RemboursementVu {
  const c = CMD.find((x) => x.ref === r.commande)!
  const e = etatRemb(r)
  const calc = remboursementCalcule(r.origine, { articles: baseDe(c), livraison: c.livraison, joursGarde: r.joursGarde })
  // Faute qui n'est pas celle du client (rupture, vendeur en tort) : ses frais Mobile Money lui sont rendus par BelivaY,
  // repris sur les versements du vendeur fautif (ADM-CACHEE-13 ; a-valider/S2.md).
  const fraisRendus = r.origine === 'rupture' || r.origine === 'litige' ? fraisDe(c) : 0
  const role = roleCourant()
  const montant = calc.total + fraisRendus
  // Exécuté après contre-signature (au-delà du seuil) : le client est prévenu (SMS et reçu), une seule fois par remboursement.
  if (e.qy?.action === 'remboursement.executer' && e.qy.etat === 'contresignee' && e.qy.second && !dejaRembourseeAuPont(r.commande, `admin-remb-${r.id}`)) publier({ type: 'remboursement_execute', id: r.id, commande: r.commande, montant, moyen: e.vers }, `admin-remb-${r.id}`, e.qy.second.le)
  return {
    id: r.id,
    commande: r.commande,
    vendeur: c.sous.map((s) => s.vendeur).join(', '),
    article: libelleDe(c),
    origine: r.origine,
    motif: r.motif,
    dossier: r.dossier,
    articles: baseDe(c),
    livraison: c.livraison,
    retenues: calc.retenues,
    fraisRendus,
    montant,
    moyen: c.numero,
    vers: e.vers,
    etat: e.etat,
    auteur: r.auteur,
    decideLe: r.decideLe,
    tentatives: e.tentatives,
    rembourseLe: e.rembourseLe,
    repriseVendeur: fraisRendus,
    quatreYeux: e.qy ? { id: e.qy.id, premier: `${e.qy.premier.agent}`, second: e.qy.second?.agent ?? null } : r.historique ? { id: null, premier: r.historique.premier, second: r.historique.second } : null,
    gestes: {
      executer: ARGENT_ROLES.includes(role) && e.etat === 'decide',
      relever: ARGENT_ROLES.includes(role) && e.etat === 'en_cours',
      autreNumero: ['superviseur', 'finance', 'support', 'mediation'].includes(role) && e.etat === 'echoue' && !!r.autreNumero,
    },
  }
}
const rembDeCommande = (ref: string) => {
  const r = REMB.find((x) => x.commande === ref)
  return r ? rembVu(r) : null
}

// ── Escrow ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function fermetureRetour(c: CommandeArgent) {
  if (!c.retireLe) return null
  return c.confirme ? c.retireLe : c.retireLe + ARGENT.retourJ * JOUR
}
function liberationDe(c: CommandeArgent) {
  const f = fermetureRetour(c)
  if (f === null) return null
  return f + Math.max(...c.sous.map((s) => ARGENT.libereJ[palierDe(s.vendeur)])) * JOUR
}
const litigeOuvert = (ref: string) => LITIGES.find((l) => l.commande === ref) ?? null
function gelDe(ref: string): string | null {
  const l = litigeOuvert(ref)
  if (l) return l.id
  const g = fait('escrow.geler', ref)
  const lev = fait('escrow.lever', ref)
  return g && (!lev || lev.n < g.n) ? 'Gel conservatoire' : null
}

function etatEscrow(c: CommandeArgent, now: number): EtatEscrow {
  const rb = c.remboursement ? rembDeCommande(c.ref) : null
  if (rb?.etat === 'rembourse') return 'rembourse'
  if (gelDe(c.ref)) return 'gele'
  if (c.verseLe && c.verseLe <= now) return 'verse'
  if (decision('escrow.liberer', c.ref)?.etat === 'contresignee') return 'libere'
  const lib = liberationDe(c)
  if (lib !== null && lib <= now) return 'libere'
  const f = fermetureRetour(c)
  if (f !== null && f <= now) return 'se_libere'
  return 'bloque'
}

function ecrituresDe(c: CommandeArgent, etat: EtatEscrow, now: number): { ecritures: Ecriture[]; transitions: Transition[] } {
  const cl = client(c.client)
  const total = totalDe(c)
  const lib = liberationDe(c)
  const vendredi = lib ? vendrediApres(lib) : null
  const futur = etat === 'bloque' || etat === 'se_libere' || etat === 'gele'
  const quandLib = etat === 'gele' ? 'selon décision' : 'à la libération'
  const E: Ecriture[] = []
  const add = (le: number | null, quand: string | null, libelle: string, debit: string, credit: string, montant: number, cle: string) => E.push({ le, quand, libelle, debit, credit, montant, cle, future: le === null })
  const tag = c.ref.slice(-4)
  if (c.moyen === 'wallet') add(c.payeeLe, null, 'Paiement avec le Wallet', 'Escrow · agrégateur', `Wallet · ${cl}`, total, `pay:${c.ref}:wl`)
  else {
    add(c.payeeLe, null, c.moyen === 'comptoir' ? 'Paiement Mobile Money au comptoir, confirmé par l’agrégateur' : 'Paiement confirmé par l’agrégateur · Mobile Money', 'Escrow · agrégateur', `Client · ${cl}`, total, `pay:${c.ref}:cp-${tag}`)
    add(c.payeeLe, null, `Frais Mobile Money du client (${ARGENT.fraisClient} %) · argent de passage`, 'Transit · agrégateur', `Client · ${cl}`, fraisDe(c), `fee:${c.ref}`)
  }
  const gel = gelDe(c.ref)
  if (gel) add(c.payeeLe + HEURE, null, `Gel · ${gel} (aucun mouvement d’argent)`, 'Escrow · agrégateur', 'Escrow · agrégateur', 0, `frz:${c.ref}`)
  if (etat === 'rembourse') {
    const rb = rembDeCommande(c.ref)!
    add(rb.rembourseLe, null, `Remboursement ${rb.id} vers ${rb.vers}`, `Client · ${cl}`, 'Escrow · agrégateur', total - rb.retenues, `rfd:${c.ref}:1`)
    if (rb.retenues) add(rb.rembourseLe, null, 'Garde retenue (renvoi au vendeur)', 'BelivaY · revenus', 'Escrow · agrégateur', rb.retenues, `rfd:${c.ref}:garde`)
    if (rb.fraisRendus) add(rb.rembourseLe, null, 'Frais Mobile Money rendus au client (repris sur le vendeur)', `Client · ${cl}`, 'BelivaY · avances', rb.fraisRendus, `rfd:${c.ref}:frais`)
  } else {
    const leLib = futur ? null : (lib ?? decision('escrow.liberer', c.ref)?.second?.le ?? now)
    for (const s of c.sous) {
      const k = calculDe(s)
      add(leLib, quandLib, `Net vendeur (${palierDe(s.vendeur)}${DECOUVERTE.has(s.vendeur) ? ', découverte' : ''})`, `Vendeur · ${s.vendeur}`, 'Escrow · agrégateur', k.garde, `rel:${c.ref}:${s.vendeur}`)
      add(leLib, quandLib, 'Commission figée au paiement (V02)', 'BelivaY · revenus', 'Escrow · agrégateur', k.retenue, `rel:${c.ref}:com:${s.vendeur}`)
    }
    if (c.livraison) add(leLib, quandLib, 'Frais de livraison', 'BelivaY · revenus', 'Escrow · agrégateur', c.livraison, `rel:${c.ref}:livraison`)
    const verse = etat === 'verse' ? c.verseLe! : null
    for (const s of c.sous) {
      const v = versementVendeur(calculDe(s).garde, 0)
      add(verse, 'vendredi', `Versement au vendeur · ${s.vendeur}`, 'Versé · opérateur', `Vendeur · ${s.vendeur}`, v.verse, `vs:${s.vendeur}:${c.ref}`)
      add(verse, 'vendredi', `Frais de versement Mobile Money (${ARGENT.fraisVersementVendeur} %) payés par le vendeur`, 'Agrégateur · frais', `Vendeur · ${s.vendeur}`, v.frais, `vs:${s.vendeur}:${c.ref}:frais`)
    }
    if (c.relais) add(verse, 'vendredi', 'Part du relais · colis remis', `Relais · ${c.relais.replace('Relais ', '')}`, 'BelivaY · revenus', ARGENT.relaisColis[c.classe], `pay:${c.relais}:${c.ref}`)
    if (c.entreprise) add(verse, 'vendredi', 'Part du transporteur', `Transport · ${c.entreprise}`, 'BelivaY · revenus', c.domicile ? ARGENT.transportDom : ARGENT.transport[c.classe], `pay:${c.entreprise}:${c.ref}`)
  }
  const T: Transition[] = [{ le: c.payeeLe, titre: 'Créé → Bloqué', detail: 'Serveur · confirmation de l’agrégateur', st: 'done' }]
  if (c.retireLe) T.push({ le: c.retireLe, titre: c.confirme ? 'Retrait et « Tout est en ordre » au comptoir' : 'Retrait au comptoir', detail: c.confirme ? 'Le droit de retour se ferme : libération datée par le serveur' : `Le droit de retour de ${ARGENT.retourJ} jours commence`, st: 'done' })
  if (gel) T.push({ le: c.payeeLe + HEURE, titre: 'Bloqué → Gelé', detail: gel === 'Gel conservatoire' ? 'Gel conservatoire motivé, journalisé' : `Dossier ${gel} : le gel prime sur la libération`, st: 'bad' })
  if (etat === 'rembourse') T.push({ le: rembDeCommande(c.ref)!.rembourseLe, titre: '→ Remboursé', detail: 'Vers le moyen d’origine, statut confirmé par l’opérateur', st: 'done' })
  else if (etat === 'verse') T.push({ le: lib, titre: 'Se libère → Libéré', detail: 'Transition automatique du serveur', st: 'done' }, { le: c.verseLe!, titre: 'Libéré → Versé', detail: 'Lot du vendredi, confirmé par l’opérateur', st: 'done' })
  else if (etat === 'libere') T.push({ le: lib, titre: 'Se libère → Libéré', detail: `Versement : vendredi, lot arrêté le jeudi ${ARGENT.arreteVersement.replace('jeudi ', '')}`, st: 'cur' })
  else if (etat === 'se_libere') T.push({ le: lib, titre: 'Prochaine transition : Se libère → Libéré', detail: `J+${Math.max(...c.sous.map((s) => ARGENT.libereJ[palierDe(s.vendeur)]))} après la fermeture du retour ; versement le vendredi ${vendredi ? new Date(vendredi).toISOString().slice(8, 10) : ''}`, st: 'cur' })
  else if (etat === 'gele') T.push({ le: null, titre: 'Prochaine transition : selon la décision', detail: 'Remboursement, libération ou partage, appliqués par le registre', st: 'cur' })
  else T.push({ le: null, titre: 'Prochaine transition : Bloqué → Se libère', detail: `À la fermeture du droit de retour (confirmation ou ${ARGENT.retourJ} jours après le retrait)`, st: 'cur' })
  return { ecritures: E, transitions: T }
}

function soldes(E: Ecriture[]) {
  const s = new Map<string, number>()
  for (const e of E.filter((x) => !x.future)) {
    s.set(e.debit, (s.get(e.debit) ?? 0) + e.montant)
    s.set(e.credit, (s.get(e.credit) ?? 0) - e.montant)
  }
  return [...s].map(([compte, montant]) => ({ compte, montant }))
}

function commandeEscrow(c: CommandeArgent, now: number): CommandeEscrow {
  const etat = etatEscrow(c, now)
  const { ecritures, transitions } = ecrituresDe(c, etat, now)
  const k = c.sous.map(calculDe)
  const gel = gelDe(c.ref)
  const role = roleCourant()
  const peut = agit()
  const lib = decision('escrow.liberer', c.ref)
  const enAttente = lib?.etat === 'a_contresigner' ? lib.id : null
  const rb = c.remboursement ? rembDeCommande(c.ref) : null
  const libre = !gel && !rb
  return {
    ref: c.ref,
    article: libelleDe(c),
    vendeurs: c.sous.map((s) => s.vendeur),
    relais: c.relais,
    zone: c.zone,
    client: client(c.client),
    moyen: c.moyen,
    numero: c.numero,
    total: totalDe(c),
    fraisClient: fraisDe(c),
    commission: k.reduce((n, x) => n + x.retenue, 0),
    livraison: c.livraison,
    netVendeurs: k.reduce((n, x) => n + x.garde, 0),
    payeeLe: c.payeeLe,
    etat,
    liberationLe: liberationDe(c),
    dossier: gel,
    dossierLisible: role !== 'finance' || gel === 'Gel conservatoire',
    remboursement: c.remboursement ?? null,
    versementLe: c.verseLe ?? (liberationDe(c) ? vendrediApres(liberationDe(c)!) : null),
    ecritures,
    transitions,
    soldes: soldes(ecritures),
    enAttenteQuatreYeux: enAttente,
    gestes: {
      liberer: { permis: peut && libre && (etat === 'bloque' || etat === 'se_libere') && !enAttente, raison: !libre ? (gel ? 'Inactif : dossier ouvert' : 'Inactif : remboursement en cours') : etat === 'bloque' || etat === 'se_libere' ? 'Libération anticipée : quatre yeux, Finance et Direction' : 'Déjà libéré' },
      geler: { permis: peut && !gel && ['bloque', 'se_libere', 'libere'].includes(etat), raison: etat === 'verse' ? 'Défaut caché après versement : reprise sur les versements suivants' : 'Motif écrit obligatoire · gel conservatoire' },
      lever: { permis: peut && gel === 'Gel conservatoire', raison: gel && gel !== 'Gel conservatoire' ? 'Seule la décision du dossier fait bouger cet argent' : 'Lever le gel conservatoire, motif écrit' },
      rembourser: { permis: false, raison: 'Seulement à la suite d’une décision' },
      partager: { permis: false, raison: 'Seulement à la suite d’une décision' },
    },
  }
}

// ── Versements du vendredi ──────────────────────────────────────────────────────────────────────────────────────────
// Données d'activité de la semaine (colis remis, jours de garde facturés, espèces encaissées au comptoir), par relais.
const SEMAINE_RELAIS = [
  { nom: 'Relais Bastos Carrefour', gerant: 'Rose Mbarga', numero: 'MTN ···· 42', colis: { S: 21, M: 3, L: 1 }, jours: 31, especes: 2400, dette: 0, reports: 0 },
  { nom: 'Relais Nlongkak Pharmacie', gerant: 'Didier Ateba', numero: 'Orange ···· 07', colis: { S: 9, M: 0, L: 0 }, jours: 8, especes: 300, dette: 0, reports: 0 },
  { nom: 'Relais Mokolo Marché', gerant: 'Hortense Biloa', numero: 'MTN ···· 66', colis: { S: 38, M: 3, L: 0 }, jours: 58, especes: 16500, dette: 0, reports: 0 },
  { nom: 'Relais Melen Université', gerant: 'Patricia Fouda', numero: 'MTN ···· 03', colis: { S: 14, M: 2, L: 0 }, jours: 12, especes: 900, dette: 0, reports: 0 },
  { nom: 'Relais Biyem-Assi Lycée', gerant: 'Christelle Manga', numero: 'Orange ···· 19', colis: { S: 11, M: 0, L: 0 }, jours: 9, especes: 1200, dette: 6300, reports: 3 },
  { nom: 'Relais Mvog-Ada', gerant: 'Bernard Onana', numero: 'MTN ···· 25', colis: { S: 6, M: 0, L: 0 }, jours: 4, especes: 0, dette: 0, reports: 0 },
]
const SEMAINE_ENTREPRISES = [
  { nom: 'Yafé Express', numero: 'MTN ···· 51', relais: { S: 96, M: 8, L: 2 }, domicile: 11, retenue: 3200, retenueMotif: 'Retenue d’un litige en tort (livraison remboursée et trajet retour)', enRevue: 1, dette: 0, reports: 0 },
  { nom: 'Mboa Logistique', numero: 'Orange ···· 76', relais: { S: 21, M: 1, L: 1 }, domicile: 3, retenue: 0, retenueMotif: '', enRevue: 0, dette: 0, reports: 0 },
  { nom: 'Rapide Colis Yaoundé', numero: 'MTN ···· 39', relais: { S: 2, M: 0, L: 0 }, domicile: 0, retenue: 2300, retenueMotif: 'Retenue d’un colis perdu (valeur payée au vendeur, au plafond du palier)', enRevue: 0, dette: 0, reports: 1 },
]
// Vendeurs : numéro changé (blocage), pièces incomplètes, versement suspendu après trois refus, reprises.
const VENDEURS_VERSEMENT: Record<string, { numero: string; numeroChangeLe?: number; kycIncomplet?: boolean; suspendu?: string; reprises?: { id: string; montant: number; motif: string }[] }> = {
  'Techno Bastos': { numero: 'MTN ···· 12' },
  'Tonton PG': { numero: 'MTN ···· 17', reprises: [{ id: 'RP-0003', montant: ARGENT.retourTrajet, motif: 'Trajet retour de BLV-00002, vendeur en tort (RET-TRAJET)' }] },
  'Maman Wax Mokolo': { numero: 'Orange ···· 70', suspendu: `${ARGENT.essaisVersement} refus de l’opérateur au versement du 9 oct. (numéro inactif) : versements suspendus` },
  'Beauté Melen': { numero: 'MTN ···· 33', numeroChangeLe: Y(10, 10, 10, 15) },
  'Saveurs du Pays': { numero: 'MTN ···· 48', kycIncomplet: true },
  'Pièces Auto Biyem': { numero: 'MTN ···· 61' },
}

function lotsCourants(now: number): Lot[] {
  const lots: Lot[] = []
  const parVendeur = new Map<string, { refs: string[]; du: number }>()
  for (const c of CMD) {
    const e = etatEscrow(c, now)
    const lib = liberationDe(c)
    const ok = (e === 'libere' || e === 'se_libere') && lib !== null && lib <= ARRETE_COURANT
    const anticipe = decision('escrow.liberer', c.ref)?.etat === 'contresignee' && e === 'libere'
    if (!ok && !anticipe) continue
    for (const s of c.sous) {
      const v = parVendeur.get(s.vendeur) ?? { refs: [], du: 0 }
      v.refs.push(c.ref)
      v.du += calculDe(s).garde
      parVendeur.set(s.vendeur, v)
    }
  }
  for (const [vendeur, v] of parVendeur) {
    const info = VENDEURS_VERSEMENT[vendeur] ?? { numero: '—' }
    const reprises = (info.reprises ?? []).reduce((n, r) => n + r.montant, 0)
    const calc = versementVendeur(v.du, reprises)
    const id = `LV-${vendeur.replace(/\W+/g, '').slice(0, 6).toUpperCase()}`
    const lignes = [{ libelle: `Ventes libérées (${v.refs.join(', ')})`, montant: v.du }, ...(info.reprises ?? []).map((r) => ({ libelle: `Reprise ${r.id} : ${r.motif}`, montant: -r.montant })), { libelle: LIGNE_FRAIS(), montant: -calc.frais }]
    let etat: Lot['etat'] = 'prevu'
    let raison: string | null = null
    let quatreYeux: string | null = null
    if (info.numeroChangeLe && info.numeroChangeLe + ARGENT.blocageNumeroJ * JOUR > VENDREDI_COURANT) {
      etat = 'reporte'
      raison = `Numéro de versement changé : blocage de ${ARGENT.blocageNumeroJ} jours, le lot attend le vendredi suivant`
    } else if (info.kycIncomplet) {
      etat = 'attente_kyc'
      raison = 'Pièces complètes exigées avant le premier versement : carte Vérification (ADM-CACHEE-31)'
    } else if (info.suspendu) {
      const d = decision('versement.exception', id)
      quatreYeux = d?.id ?? null
      etat = d?.etat === 'contresignee' ? 'relance' : d?.etat === 'a_contresigner' ? 'a_contresigner' : 'suspendu'
      raison = d?.etat === 'contresignee' ? 'Exception validée à quatre yeux : relancé vers le numéro vérifié ce vendredi' : info.suspendu
    } else if (calc.verse > ARGENT.seuilVersement) {
      const d = decision('versement.controle', id)
      quatreYeux = d?.id ?? null
      etat = d?.etat === 'contresignee' ? 'controle' : d?.etat === 'a_contresigner' ? 'a_contresigner' : d?.etat === 'refusee' ? 'bloque' : 'controle_requis'
      raison = d?.etat === 'refusee' ? `Contrôle refusé : ${d.second?.motif ?? ''}` : `Au-delà du seuil de contrôle : quatre yeux avant l’envoi (non contrôlé à ${ARGENT.controleFinH} h : le lot part quand même)`
    }
    lots.push({ id, genre: 'vendeur', beneficiaire: vendeur, sous: `Vendeur · ${palierDe(vendeur)} · ${v.refs.length} commande${v.refs.length > 1 ? 's' : ''}`, numero: info.numero, lignes, verse: calc.verse, frais: calc.frais, fraisBelivay: 0, etat, raison, reports: 0, dette: 0, plan: false, quatreYeux, confirmeLe: null })
  }
  for (const r of SEMAINE_RELAIS) {
    const v = versementRelais({ colis: r.colis, joursGarde: r.jours, especes: r.especes, detteAnterieure: r.dette })
    const id = `LR-${r.nom.replace('Relais ', '').replace(/\W+/g, '').slice(0, 6).toUpperCase()}`
    const reports = v.dette ? r.reports + 1 : 0
    const plan = !!fait('versement.plan_apurement', id)
    const lignes = [
      { libelle: `Colis remis (${r.colis.S} S, ${r.colis.M} M, ${r.colis.L} L)`, montant: v.remuneration },
      { libelle: `Garde : ${r.jours} jours facturés × ${ARGENT.relaisGardeJour} F${ARGENT.gardeJ1Belivay ? ' (1er jour payé par BelivaY)' : ''}`, montant: v.garde },
      { libelle: 'Espèces de garde encaissées au comptoir (dette d’espèces)', montant: -v.especes },
      ...(r.dette ? [{ libelle: `Dette reportée (${r.reports} vendredi${r.reports > 1 ? 's' : ''})`, montant: -r.dette }] : []),
    ]
    const raison = v.dette ? (plan ? 'Plan d’apurement validé par la Finance : retenue étalée, jamais de caution ni de suspension' : reports >= ARGENT.reportDetteVendredis ? `Dette reportée ${reports} vendredis : plan d’apurement à valider par la Finance` : `Solde négatif : versé 0 F, dette reportée (${reports} sur ${ARGENT.reportDetteVendredis} vendredis), carte Finance`) : null
    const fr = fraisVersement(v.verse)
    if (fr) lignes.push({ libelle: LIGNE_FRAIS(), montant: -fr })
    lots.push({ id, genre: 'relais', beneficiaire: r.nom, sous: `Point relais · ${r.gerant}`, numero: r.numero, lignes, verse: v.verse - fr, frais: fr, fraisBelivay: 0, etat: v.dette ? 'zero' : 'prevu', raison, reports, dette: v.dette, plan, quatreYeux: null, confirmeLe: null })
  }
  for (const e of SEMAINE_ENTREPRISES) {
    const courses = (['S', 'M', 'L'] as Classe[]).reduce((n, k) => n + e.relais[k] * ARGENT.transport[k], 0) + e.domicile * ARGENT.transportDom
    const solde = courses - e.retenue - e.dette
    const id = `LE-${e.nom.replace(/\W+/g, '').slice(0, 6).toUpperCase()}`
    const lignes = [
      { libelle: `Colis en relais (${e.relais.S} S, ${e.relais.M} M, ${e.relais.L} L) et ${e.domicile} à domicile, missions validées, preuves complètes`, montant: courses },
      ...(e.retenue ? [{ libelle: e.retenueMotif, montant: -e.retenue }] : []),
    ]
    const dette = Math.max(0, -solde)
    const fe = fraisVersement(Math.max(0, solde))
    if (fe) lignes.push({ libelle: LIGNE_FRAIS(), montant: -fe })
    lots.push({ id, genre: 'entreprise', beneficiaire: e.nom, sous: `Entreprise de livraison${e.enRevue ? ` · ${e.enRevue} paquet en revue, payé au vendredi suivant` : ''}`, numero: e.numero, lignes, verse: Math.max(0, solde) - fe, frais: fe, fraisBelivay: 0, etat: dette ? 'zero' : 'prevu', raison: dette ? `Solde négatif : versé 0 F, reporté (${e.reports + 1} sur ${ARGENT.reportDetteVendredis} vendredis)` : null, reports: dette ? e.reports + 1 : 0, dette, plan: false, quatreYeux: null, confirmeLe: null })
  }
  return lots
}

function dernierCycle(): Cycle {
  const confirme = (h: number, m: number) => Y(10, 9, h, m)
  const lot = (id: string, genre: Lot['genre'], beneficiaire: string, sous: string, numero: string, du: number, le: number): Lot => {
    const frais = fraisVersement(du)
    return { id, genre, beneficiaire, sous, numero, lignes: [{ libelle: 'Montant dû au jeudi 8 oct. 23 h 59', montant: du }, ...(frais ? [{ libelle: LIGNE_FRAIS(), montant: -frais }] : [])], verse: du - frais, frais, fraisBelivay: 0, etat: 'confirme', raison: null, reports: 0, dette: 0, plan: false, quatreYeux: null, confirmeLe: le }
  }
  const k = (ref: string) => calculDe(CMD.find((c) => c.ref === ref)!.sous[0]).garde
  return {
    id: 'VS-261009',
    vendredi: VENDREDI_DERNIER,
    arrete: VENDREDI_DERNIER - MINUTE,
    limite: VENDREDI_DERNIER + ARGENT.limiteVersementH * HEURE,
    etat: 'clos',
    lots: [
      lot('LV9-TECHNO', 'vendeur', 'Techno Bastos', 'Vendeur · Or', 'MTN ···· 12', k('BLV-51990'), confirme(8, 24)),
      lot('LV9-TONTON', 'vendeur', 'Tonton PG', 'Vendeur · Bronze', 'MTN ···· 17', k('BLV-00004'), confirme(9, 41)),
      lot('LR9-BASTOS', 'relais', 'Relais Bastos Carrefour', 'Point relais · Rose Mbarga', 'MTN ···· 42', 6900, confirme(9, 44)),
      lot('LR9-MELEN', 'relais', 'Relais Melen Université', 'Point relais · Patricia Fouda', 'MTN ···· 03', 3100, confirme(9, 46)),
      lot('LE9-YAFE', 'entreprise', 'Yafé Express', 'Entreprise de livraison', 'MTN ···· 51', 38450, confirme(10, 2)),
    ],
    closPar: 'Nadège Eyenga · Finance',
    closLe: confirme(11, 52),
  }
}

// ── Wallet (v6 D16 ; ADM-CACHEE-10) ─────────────────────────────────────────────────────────────────────────────────
const WALLETS = [
  { id: 'WL-0004', client: 'Client ••• 2954', retirable: 41200, gestes: 1000, numeroRecharge: 'MTN ···· 54', rechargesMois: 60000, retraits24h: { n: 0, montant: 0 }, dernierMouvement: Y(10, 13, 9, 12), alerte: null },
  { id: 'WL-0007', client: 'Client ••• 4217', retirable: 487500, gestes: 0, numeroRecharge: 'MTN ···· 17', rechargesMois: 300000, retraits24h: { n: 0, montant: 0 }, dernierMouvement: Y(10, 12, 18, 40), alerte: null },
  { id: 'WL-0009', client: 'Client ••• 0388', retirable: 12300, gestes: 2160, numeroRecharge: 'MTN ···· 88', rechargesMois: 15000, retraits24h: { n: 1, montant: 5000 }, dernierMouvement: Y(10, 13, 11, 5), alerte: null },
  { id: 'WL-0011', client: 'Client ••• 8810', retirable: 2100, gestes: 0, numeroRecharge: 'Orange ···· 10', rechargesMois: 310000, retraits24h: { n: 3, montant: 312000 }, dernierMouvement: Y(10, 13, 13, 48), alerte: 'Trois retraits en 24 h pour 312 000 F, juste après trois recharges : seuils FRAUDE-RETRAITS atteints' },
  { id: 'WL-0012', client: 'Client ••• 6120', retirable: 0, gestes: 1500, numeroRecharge: 'MTN ···· 20', rechargesMois: 0, retraits24h: { n: 0, montant: 0 }, dernierMouvement: Y(10, 11, 10, 30), alerte: null },
]

// ── Remboursements automatiques du mois (v6 D18 ; ADM-CACHEE-12) ──────────────────────────────────────────────────
const CAS_AUTO: Omit<CasAuto, 'etat' | 'droitRetire'>[] = [
  { id: 'RA-0011', commande: 'BLV-52018', client: 'Client ••• 3312', vendeur: 'Tonton PG', article: 'Écouteurs filaires', montant: 2500, palierEleve: false, le: Y(10, 3, 16, 10), photo: true, commandesSansLitige: 9, delaiH: 6, sur30j: 0, surAn: 1, doute: null },
  { id: 'RA-0012', commande: 'BLV-52064', client: 'Client ••• 7715', vendeur: 'Beauté Melen', article: 'Savon noir 250 g', montant: 1750, palierEleve: false, le: Y(10, 6, 11, 40), photo: true, commandesSansLitige: 14, delaiH: 20, sur30j: 0, surAn: 0, doute: null },
  { id: 'RA-0013', commande: 'BLV-52101', client: 'Client ••• 0921', vendeur: 'Maman Wax Mokolo', article: 'Foulard wax', montant: 3000, palierEleve: false, le: Y(10, 9, 9, 15), photo: true, commandesSansLitige: 6, delaiH: 30, sur30j: 0, surAn: 2, doute: null },
  { id: 'RA-0014', commande: 'BLV-52177', client: 'Client ••• 5540', vendeur: 'Tonton PG', article: 'Câble USB-C 2 m', montant: 2900, palierEleve: false, le: Y(10, 12, 17, 5), photo: true, commandesSansLitige: 7, delaiH: 12, sur30j: 0, surAn: 0, doute: null },
  { id: 'RA-0015', commande: 'BLV-52236', client: 'Client ••• 0921', vendeur: 'Tonton PG', article: 'Protection d’écran', montant: 2000, palierEleve: false, le: Y(10, 13, 12, 50), photo: true, commandesSansLitige: 6, delaiH: 40, sur30j: 1, surAn: 3, doute: 'Deuxième demande en 30 jours, même relais habituel ; photo très proche de celle de RA-0013' },
  { id: 'RA-0016', commande: 'BLV-52240', client: 'Client ••• 4471', vendeur: 'Beauté Melen', article: 'Coffret karité', montant: 8400, palierEleve: true, le: Y(10, 13, 13, 20), photo: true, commandesSansLitige: 22, delaiH: 3, sur30j: 0, surAn: 0, doute: null },
]
function casAuto(): CasAuto[] {
  return CAS_AUTO.map((c) => ({
    ...c,
    etat: fait('remb_auto.retour_normal', c.id) ? 'retour_normal' : c.doute ? 'en_revue' : 'rembourse',
    droitRetire: !!fait('remb_auto.retirer_droit', c.client),
  }))
}

// ── Commissions (relevés du mois, plans) ───────────────────────────────────────────────────────────────────────────
const PLANS: Record<string, { plan: 'Free' | 'Boost' | 'Pro'; essai: boolean; echec?: { le: number; motif: string; etat: 'grace' | 'free' | 'paye' } }> = {
  'Techno Bastos': { plan: 'Pro', essai: false },
  'Maman Wax Mokolo': { plan: 'Boost', essai: true },
  'Beauté Melen': { plan: 'Boost', essai: false, echec: { le: Y(10, 9, 6, 0), motif: 'Solde Mobile Money insuffisant', etat: 'grace' } },
  'Pièces Auto Biyem': { plan: 'Boost', essai: false, echec: { le: Y(9, 30, 6, 0), motif: 'Trois tentatives refusées', etat: 'free' } },
  'Tonton PG': { plan: 'Free', essai: false },
  'Saveurs du Pays': { plan: 'Free', essai: false },
}

// ── Rapprochement (relevé de l'agrégateur : données ; registre : calculé) ─────────────────────────────────────────
const ENCAISSEMENTS_JOUR = CMD.filter((c) => c.payeeLe >= Y(10, 13, 0, 0) && c.moyen !== 'wallet')
const RELEVE_JOUR = [...ENCAISSEMENTS_JOUR.map((c) => ({ ref: c.ref, montant: totalDe(c) + fraisDe(c), statut: 'SUCCESSFUL' })), { ref: 'BLV-52262', montant: 12648, statut: 'SUCCESSFUL' }]

// ── La source ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const demoArgent: DomaineArgent = {
  async escrow() {
    exigerPage('escrow', 'Escrow et registre')
    const now = maintenant()
    const cmds = auPerimetre(CMD).map((c) => commandeEscrow(c, now))
    const somme = (e: EtatEscrow) => cmds.filter((c) => c.etat === e).reduce((n, c) => n + c.total, 0)
    const lots = lotsCourants(now)
    return repondre({ le: now, bloque: somme('bloque'), seLibere: somme('se_libere'), gele: somme('gele'), prochainVersement: { le: VENDREDI_COURANT, montant: lots.reduce((n, l) => n + l.verse, 0) }, equilibre: cmds.every((c) => c.soldes.reduce((n, s) => n + s.montant, 0) === 0), commandes: cmds })
  },
  async wallet() {
    exigerPage('wallet', 'Suivi du Wallet')
    const comptes: CompteWallet[] = WALLETS.map((w) => {
      const d = decision('wallet.geler', w.id)
      return { ...w, gele: d?.etat === 'contresignee', enAttenteQuatreYeux: d?.etat === 'a_contresigner' ? d.id : null }
    })
    return repondre({ interrupteur: { code: 'FF-WALLET', etat: 'ouvert au registre (DP-50) ; ouverture réelle après validation juridique CEMAC (v6 D16)' }, comptes, mouvementsMois: { recharges: comptes.reduce((n, c) => n + c.rechargesMois, 0), retraits: 317000, paiements: 12400, remboursements: 0, gestes: comptes.reduce((n, c) => n + c.gestes, 0) } })
  },
  async remboursements() {
    exigerPage('remboursements', 'Remboursements')
    const cas = casAuto()
    const controle = [...new Set(CAS_AUTO.map((c) => c.vendeur))].filter((v) => fait('remb_auto.controle_vendeur', v))
    return repondre({ liste: REMB.map(rembVu).sort((a, b) => b.decideLe - a.decideLe), auto: { cas, moisTotal: cas.filter((c) => c.etat === 'rembourse').reduce((n, c) => n + c.montant, 0), vendeursEnControle: controle } })
  },
  async releverStatut(id) {
    exigerPage('remboursements', 'Remboursements')
    const r = REMB.find((x) => x.id === id)
    if (!r) return { ok: false, raison: 'inconnu' }
    if (!agit() || etatRemb(r).etat !== 'en_cours') return { ok: false, raison: 'etat' }
    argentDemo.ecrire((s) => void (s.releves[id] = maintenant()))
    await journaliser({ action: 'remboursement.statut', objet: id, motif: 'Statut de l’opérateur relevé : confirmé' })
    return { ok: true, etat: 'rembourse' }
  },
  async executer(id) {
    exigerPage('remboursements', 'Remboursements')
    const r = REMB.find((x) => x.id === id)
    if (!r) return { ok: false, raison: 'inconnu' }
    const v = rembVu(r)
    if (!agit() || v.etat !== 'decide') return { ok: false, raison: 'etat' }
    if (v.montant > ARGENT.seuilRemboursement) return { ok: false, raison: 'seuil' }
    // Un seul remboursement par commande : une annulation (ou un autre remboursement) déjà partie au client l'a payée.
    if (dejaRembourseeAuPont(r.commande, `admin-remb-${id}`)) return { ok: false, raison: 'deja_rembourse' }
    argentDemo.ecrire((s) => void (s.executes[id] = maintenant()))
    await journaliser({ action: 'remboursement.executer', objet: id, motif: `Exécution vers le moyen d’origine (${v.moyen})` })
    publier({ type: 'remboursement_execute', id, commande: r.commande, montant: v.montant, moyen: v.moyen }, `admin-remb-${id}`, maintenant())
    return { ok: true, etat: 'en_cours' }
  },
  async versements() {
    exigerPage('versements', 'Versements du vendredi')
    const now = maintenant()
    const courant: Cycle = { id: 'VS-261016', vendredi: VENDREDI_COURANT, arrete: ARRETE_COURANT, limite: VENDREDI_COURANT + ARGENT.limiteVersementH * HEURE, etat: now < ARRETE_COURANT ? 'prevision' : 'prepare', lots: lotsCourants(now), closPar: null, closLe: null }
    const dernier = dernierCycle()
    const faits = new Map<string, number>()
    for (const e of evenementsPour('admin')) if (e.type === 'versement_fait') faits.set('Yafé Express', e.le)
    return repondre({
      courant,
      dernier,
      historique: [
        { vendredi: Y(9, 18), montant: 1486200, lots: 33, prevision: false },
        { vendredi: Y(9, 25), montant: 1912000, lots: 41, prevision: false },
        { vendredi: Y(10, 2), montant: 2104300, lots: 45, prevision: false },
        { vendredi: VENDREDI_DERNIER, montant: dernier.lots.reduce((n, l) => n + l.verse, 0), lots: dernier.lots.length, prevision: false },
        { vendredi: VENDREDI_COURANT, montant: courant.lots.reduce((n, l) => n + l.verse, 0), lots: courant.lots.filter((l) => l.verse > 0).length, prevision: true },
      ],
      livreurs: [
        { entreprise: 'Yafé Express', livreurs: 21, marque: faits.get('Yafé Express') ?? Y(10, 9, 17, 40), par: 'Gaëlle Wankeu · propriétaire' },
        { entreprise: 'Mboa Logistique', livreurs: 9, marque: null, par: null },
        { entreprise: 'Rapide Colis Yaoundé', livreurs: 4, marque: Y(10, 9, 18, 5), par: 'Propriétaire' },
      ],
    })
  },
  async rapprochement() {
    exigerPage('rapprochement', 'Rapprochement, revenus et obligations')
    const now = maintenant()
    const s = argentDemo.lire()
    const liberes = CMD.filter((c) => ['libere', 'verse'].includes(etatEscrow(c, now)))
    const com = (l: CommandeArgent[]) => l.reduce((n, c) => n + c.sous.reduce((m, x) => m + calculDe(x).retenue, 0), 0)
    const liv = (l: CommandeArgent[]) => l.reduce((n, c) => n + c.livraison, 0)
    const aujourdhui = liberes.filter((c) => (liberationDe(c) ?? 0) >= Y(10, 13, 0, 0))
    const zones = new Map<string, number>()
    const cats = new Map<string, number>()
    for (const c of liberes) {
      zones.set(c.zone, (zones.get(c.zone) ?? 0) + com([c]) + c.livraison)
      for (const x of c.sous) cats.set(x.articles[0].famille, (cats.get(x.articles[0].famille) ?? 0) + calculDe(x).retenue)
    }
    const encReg = ENCAISSEMENTS_JOUR.reduce((n, c) => n + totalDe(c) + fraisDe(c), 0)
    const fraisReg = ENCAISSEMENTS_JOUR.reduce((n, c) => n + fraisDe(c), 0)
    const ecarts = [
      { id: 'EC-0021', montant: 12648, origine: 'Paiement de BLV-52262 débité par l’opérateur à 11 h 02, confirmation non reçue : la commande est « en vérification ». Rapprochement automatique, jamais de second débit.', commande: 'BLV-52262', ouvertLe: Y(10, 13, 11, 2) },
      { id: 'EC-0022', montant: 186, origine: 'Frais facturés par l’agrégateur au-delà du contrat (2,02 % au lieu de 2 %) sur les encaissements d’hier : coût réel à reprendre dans les simulations.', commande: null, ouvertLe: Y(10, 13, 6, 0) },
    ].map((e) => {
      const d = decision('registre.regularisation', e.id)
      const carte = s.cartes.find((c) => c.objet === e.id)?.id ?? null
      const jeune = now - e.ouvertLe < ARGENT.attenteH * HEURE && e.commande !== null
      return { ...e, etat: (d?.etat === 'contresignee' ? 'regularise' : d?.etat === 'a_contresigner' ? 'a_contresigner' : carte ? 'carte' : jeune ? 'en_attente' : 'ecart') as 'ecart', quatreYeux: d?.id ?? null, carte }
    })
    const revenusMois = com(liberes) + liv(liberes)
    const grand = await demoArgent.grandLivre(Y(9, 1), Y(10, 1) - 1)
    const sept = [12300, 71200, 64900, 83100, 79650, 101300]
    return repondre({
      le: now,
      revenusJour: { commissions: com(aujourdhui), livraison: liv(aujourdhui), payeClients: encReg },
      revenusMois,
      sept: [...['mer.', 'jeu.', 'ven.', 'sam.', 'dim.', 'lun.'].map((l, i) => ({ l, v: sept[i] })), { l: 'mar.', v: com(aujourdhui) + liv(aujourdhui) }],
      parZone: [...zones].map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v),
      parCategorie: [...cats].map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v),
      hier: { jour: Y(10, 12), calculeLe: Y(10, 13, 6, 0), lignes: [{ flux: 'Encaissements (31)', registre: 1148400, agregateur: 1148400 }, { flux: 'Versements', registre: 0, agregateur: 0 }, { flux: 'Remboursements (2)', registre: 19650, agregateur: 19650 }, { flux: 'Frais Mobile Money', registre: 23286, agregateur: 23472 }] },
      aujourdhui: { lignes: [{ flux: `Encaissements (${ENCAISSEMENTS_JOUR.length})`, registre: encReg, agregateur: encReg + 12648 }, { flux: 'Versements', registre: 0, agregateur: 0 }, { flux: 'Remboursements', registre: 0, agregateur: 0 }, { flux: 'Frais Mobile Money (client, transit)', registre: fraisReg, agregateur: fraisReg }], ecarts },
      couts: [
        { libelle: 'Parts des transporteurs', montant: ARGENT.transport.S * 4 + ARGENT.transportDom, detail: '5 colis remis ce matin' },
        { libelle: 'Parts des points relais', montant: ARGENT.relaisColis.S * 7, detail: 'remises du matin' },
        { libelle: 'Frais Mobile Money à la charge de BelivaY', montant: partDe(60000, ARGENT.fraisClient), detail: `recharges Wallet (${ARGENT.fraisClient} %)` },
        { libelle: 'SMS', montant: 34 * 12, detail: '34 F par message, 12 envoyés' },
      ],
      import: s.import,
      cloture: {
        mois: 'septembre 2026',
        revenus: 1684900,
        commissions: 1241300,
        livraison: 443600,
        rapprochements: '30 sur 30, verts ou expliqués',
        transmis: s.transmis['2026-09'] ?? null,
        exports: [
          { id: 'gl', nom: 'grand-livre-2026-09.csv', detail: `${grand.length} écritures de la démonstration`, entetes: ['Date', 'Pièce', 'Compte', 'Libellé', 'Débit', 'Crédit'], lignes: grand.map((g) => [g.date, g.piece, g.compte, g.libelle, g.debit, g.credit]) },
          { id: 'rev', nom: 'revenus-2026-09.csv', detail: 'commissions 1 241 300 F · livraison 443 600 F', entetes: ['Nature', 'Montant'], lignes: [['Commissions', 1241300], ['Frais de livraison', 443600], ['Total des revenus', 1684900]] },
          { id: 'mp', nom: 'minimum-perception-2026-09.csv', detail: `${ARGENT.minPerception} % des revenus seuls`, entetes: ['Assiette', 'Taux', 'Montant'], lignes: [[1684900, `${ARGENT.minPerception} %`, Math.floor((1684900 * ARGENT.minPerception) / 100 + 0.5)]] },
        ],
      },
      frais: [
        { flux: 'Paiements Mobile Money des clients', base: 16440000, taux: ARGENT.fraisClient, frais: partDe(16440000, ARGENT.fraisClient), paye: 'client' as const },
        { flux: 'Recharges du Wallet', base: 385000, taux: ARGENT.fraisClient, frais: partDe(385000, ARGENT.fraisClient), paye: 'belivay' as const },
        { flux: 'Versements aux vendeurs', base: 1830500, taux: ARGENT.fraisVersementVendeur, frais: fraisVersement(1830500), paye: 'vendeur' as const },
        { flux: 'Versements aux relais et entreprises', base: 210400, taux: ARGENT.fraisVersementVendeur, frais: fraisVersement(210400), paye: 'beneficiaire' as const },
        { flux: 'Remboursements', base: 131650, taux: ARGENT.fraisClient, frais: partDe(131650, ARGENT.fraisClient), paye: 'belivay' as const },
        { flux: 'Retraits du Wallet', base: 317000, taux: ARGENT.walletRetraitFrais, frais: partDe(317000, ARGENT.walletRetraitFrais), paye: 'client' as const },
      ],
      releveModele: ['reference;montant;statut', ...RELEVE_JOUR.map((r) => `${r.ref};${r.montant};${r.statut}`)].join('\r\n'),
    })
  },
  async importerReleve(nom, contenu) {
    exigerPage('rapprochement', 'Rapprochement, revenus et obligations')
    if (!agit()) throw new AccesRefuse('Importer un relevé', ARGENT_ROLES)
    const lignes = contenu.replace(/^﻿/, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lignes.length) return { ok: false, raison: 'vide' }
    const corps = /^reference;/i.test(lignes[0]) ? lignes.slice(1) : lignes
    const lues = corps.map((l) => l.split(';')).filter((x) => x.length >= 2 && /^BLV-\d+$/.test(x[0]) && /^\d+$/.test(x[1]))
    if (!lues.length || lues.length < corps.length) return { ok: false, raison: 'forme' }
    const ecarts: { ref: string; registre: number; releve: number }[] = []
    for (const [ref, m] of lues) {
      const c = CMD.find((x) => x.ref === ref)
      const reg = c ? totalDe(c) + fraisDe(c) : 0
      if (reg !== Number(m)) ecarts.push({ ref, registre: reg, releve: Number(m) })
    }
    const imp = { nom, le: maintenant(), lignes: lues.length, concordantes: lues.length - ecarts.length, ecarts }
    argentDemo.ecrire((s) => void (s.import = imp))
    await journaliser({ action: 'rapprochement.import', objet: `${nom} · ${lues.length} lignes`, motif: `${ecarts.length} écart(s) relevé(s)` })
    return { ok: true, lignes: lues.length, ecarts: ecarts.length }
  },
  async ouvrirCarte(objet, texte) {
    if (!agit()) throw new AccesRefuse('Ouvrir une carte Finance', ARGENT_ROLES)
    if (argentDemo.lire().cartes.some((c) => c.objet === objet)) return { ok: false, raison: 'deja' }
    let id = ''
    argentDemo.ecrire((s) => {
      s.n++
      id = `CF-${String(s.n).padStart(4, '0')}`
      s.cartes.push({ id, objet, texte, le: maintenant(), par: nomAgent(agentCourant()) })
    })
    await journaliser({ action: 'carte.finance', objet, motif: texte })
    return { ok: true, id }
  },
  async transmettreComptable(mois) {
    exigerPage('rapprochement', 'Rapprochement, revenus et obligations')
    if (!agit()) throw new AccesRefuse('Transmettre au comptable', ARGENT_ROLES)
    if (argentDemo.lire().transmis[mois]) return { ok: false, raison: 'deja' }
    argentDemo.ecrire((s) => void (s.transmis[mois] = { le: maintenant(), par: nomAgent(agentCourant()) }))
    await journaliser({ action: 'export.comptable.transmettre', objet: `Clôture ${mois}`, motif: 'Exports en lecture seule, avec leurs empreintes, transmis au comptable externe' })
    return { ok: true }
  },
  async commissions() {
    exigerPage('commissions', 'Commissions, grilles et abonnements vendeur')
    const now = maintenant()
    const vendeurs: VendeurCommission[] = VENDEURS.map((v) => {
      const cmds = CMD.filter((c) => ['libere', 'verse'].includes(etatEscrow(c, now)) && c.sous.some((s) => s.vendeur === v.nom))
      const sous = cmds.flatMap((c) => c.sous.filter((s) => s.vendeur === v.nom))
      const k = sous.map(calculDe)
      const retenu = k.reduce((n, x) => n + x.retenue, 0)
      const garde = k.reduce((n, x) => n + x.garde, 0)
      const p = PLANS[v.nom] ?? { plan: 'Free' as const, essai: false }
      return {
        vendeur: v.nom,
        palier: v.palier,
        zone: v.zone,
        plan: p.plan,
        essai: p.essai,
        decouverte: DECOUVERTE.has(v.nom),
        commandes: sous.length,
        ventes: k.reduce((n, x) => n + x.base, 0),
        retenu,
        garde,
        fraisVersement: versementVendeur(garde, 0).frais,
        remisePlan: p.plan === 'Free' || p.essai ? 0 : remiseDePlan(p.plan, retenu),
        echec: p.echec ? { ...p.echec, graceJusqua: p.echec.le + ARGENT.planGraceJ * JOUR } : null,
      }
    })
    return repondre({
      mois: 'octobre 2026',
      versions: [
        { v: 'v3', contenu: 'V02 : taux par catégorie et par palier, sur tout le prix, sans tranche ni plafond par article', effet: 'Décision du 11 octobre 2026 (DP-65)', par: 'Franck Penga · Direction', etat: 'en_vigueur' as const },
        { v: 'v2', contenu: 'Barème dégressif par tranches de prix (VD-02)', effet: 'Mardi 22 septembre 2026', par: 'Franck Penga · décision du 22 sept. (DP-55)', etat: 'remplacee' as const },
        { v: 'v1', contenu: 'Palier × catégorie, plafond de 8 000 F par article', effet: 'Jeudi 7 mai 2026', par: 'Franck Penga', etat: 'remplacee' as const },
      ],
      vendeurs,
      relevesEmis: [
        { mois: 'septembre 2026', emisLe: Y(10, 1, 9, 0), vendeurs: 39, retenu: 1241300 },
        { mois: 'août 2026', emisLe: Y(9, 1, 9, 0), vendeurs: 31, retenu: 1074200 },
      ],
    })
  },
  async grandLivre(du, au) {
    if (!['superviseur', 'finance', 'audit'].includes(roleCourant())) throw new AccesRefuse('Export comptable', ['superviseur', 'finance', 'audit'])
    const now = maintenant()
    const compte = (n: string, libelle: string) =>
      n.startsWith('Escrow') ? '467 Séquestre clients' : n.startsWith('Client') || n.startsWith('Versé') || n.startsWith('Transit') ? '512 Agrégateur de paiement' : n.startsWith('Wallet') ? '419 Fonds clients Wallet' : n.startsWith('Vendeur') || n.startsWith('Transport') || n.startsWith('Relais') ? '401 Vendeurs et partenaires' : n.startsWith('Agrégateur') ? '627 Frais Mobile Money' : n.startsWith('BelivaY · avances') ? '467 Avances (reprises)' : /livraison|transporteur|relais/i.test(libelle) ? '708 Frais de service' : '706 Commissions'
    const l: LigneExport[] = []
    for (const c of CMD) {
      for (const e of commandeEscrow(c, now).ecritures) {
        if (e.future || e.le === null || e.le < du || e.le > au || !e.montant) continue
        const date = new Date(e.le + HEURE).toISOString().slice(0, 10)
        l.push({ date, piece: e.cle, compte: compte(e.debit, e.libelle), libelle: `${e.libelle} · ${c.ref}`, debit: e.montant, credit: 0 })
        l.push({ date, piece: e.cle, compte: compte(e.credit, e.libelle), libelle: `${e.libelle} · ${c.ref}`, debit: 0, credit: e.montant })
      }
    }
    return repondre(l.sort((a, b) => a.date.localeCompare(b.date)))
  },
}

// ── États vivants lus par la File d'action et les compteurs (filtrés par l'appelant : rôle et périmètre) ────────────
/** Remboursements avec leur état déduit des décisions (journal, quatre yeux). */
export const remboursementsVus = () => REMB.map(rembVu)
/** Lots du vendredi courant (contrôle à quatre yeux, dettes reportées). */
export const lotsDuCycle = () => lotsCourants(maintenant())
