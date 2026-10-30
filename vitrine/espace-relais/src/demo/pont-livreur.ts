// DONNÉES DE DÉMONSTRATION — le relais et l'application du livreur sur le même appareil (src/demo/pont.ts).
// LECTURE (appliquée avant chaque lecture des lots, une fois par événement, comme le ferait le serveur) : Serge A. part
// avec son paquet (lot « en route »), approche du relais (« en approche », heure estimée), accepte en miroir le constat
// d'un colis refusé ou reçu avec réserve, confirme le lot (la garde passe au relais : « déposé ») ou ne peut pas déposer
// (« non déposé »), trouve le relais fermé, déclare un incident sur le relais ; à la collecte, il confirme chaque colis
// pris, signale un colis manquant, photographie un scellé abîmé.
// PUBLICATION (fonctions pont… ci-dessous) : ce que le relais fait au comptoir part vers le livreur (code de dépôt
// vérifié ou bloqué, résultat par colis, lot validé ; sorties prêtes, colis présenté, sortie validée), vers l'entreprise
// (incidents, occupation, fermeture), vers le client et le vendeur (avis d'arrivée, code envoyé, remise, retour déposé).
// Les domaines du relais (reception, departs, retrait, stock, fermeture) les appellent là où leurs écrans portent
// « // pont : <événement> ». Charge utile anonyme (PR-RC-11, PR-RC-20) : références de lots et de colis seulement.
// CONSOLE (« app: 'admin' », src/demo/pont-console.ts) : activation (KYC) et sanction du relais, versement crédité,
// registre papier à ressaisir, panne (mode papier : aide.ts), maintenance, message, réponse du support, règle ou texte
// annoncés : effet sur le relais, notification « BelivaY · … » (modèles relais.belivay*, sans montant ni code) et
// bandeau de la coque.
import type { ClasseColis, Instant } from '../donnees/communs'
import { creerColis, empreinte, etatColis } from './colis'
import { confirmerParLeLivreur, etatReception } from './reception'
import { ACTEURS_DEMO, RELAIS_DEMO, arretDuLot, codeColisDemo, codeDemo, evenementsDe, publier, type Evenement } from './pont'
import { ENTREPRISE, LIVREUR, LOTS } from './jeu-essai'
import { annoncerLot, collectesPont, joindreCollectes } from './lots-pont'
import { attendreRetour } from './incidents'
import { maintenant } from './horloge'
import { magasin } from './stockage'
import { avisConsole, decisionsConsole, estMoi } from './pont-console'
import { etatEvenementsDirects, notifier, sansCodeNiMontant } from './notifications'
import { decisionKycRelais, etatRelais, finConvention, sanctionRelais } from './relais'

/** Arrêts du livreur qui précèdent le dépôt (lot « en approche » quand ils sont faits) ; l'arrêt de dépôt lui-même. */
const ARRETS: Record<string, { lot: string; fait: 'en_approche' | 'depose' }> = {
  A2: { lot: 'PQ-Z1-261013-003', fait: 'en_approche' },
  A3: { lot: 'PQ-Z1-261013-003', fait: 'depose' },
  V5: { lot: 'PQ-Z1-261013-011', fait: 'en_approche' },
  V6: { lot: 'PQ-Z1-261013-011', fait: 'depose' },
}

interface DepartsVus {
  confirmes: string[] // colis pris par le livreur (sa confirmation, horodatée)
  manquants: string[]
  scelles: string[] // scellé abîmé photographié par le livreur avant de le prendre
}
const appliques = magasin('pont', () => ({
  cles: [] as string[],
  incidents: [] as { lot: string | null; note: string; le: number; genre: string }[],
  /** Colis dont le livreur a accepté le constat en miroir, par lot (PR-RC-08). */
  constats: {} as Record<string, string[]>,
  /** Confirmation du livreur par lot : colis remis, colis refusés repartis avec lui, mode. */
  confirmations: {} as Record<string, { le: Instant; remis: string[]; refuses: string[]; mode: 'scan' | 'registre' }>,
  /** Ce que le livreur a fait à chaque collecte. */
  departs: {} as Record<string, DepartsVus>,
}))
let enCours = false

/** Écran où mène la notification d'une décision de la console. */
const ROUTE_CONSOLE: Partial<Record<Evenement['type'], string>> = { convention_terminee: 'stock', inspection_annoncee: 'statut-relais', kyc_decide: 'documents', sanction_decidee: 'statut-relais', versement_credite: 'versements', ressaisie_relancee: 'mode-papier', panne: 'mode-papier', support_reponse: 'messagerie', diffusion: 'messagerie' }
/** Décisions de la console : effet sur le relais, puis la notification (modèle relais.belivay*, sans montant ni code). */
function appliquerConsole(evts: Evenement[]) {
  for (const e of evts) {
    if (e.type === 'kyc_decide' && (estMoi(e.acteur, 'relais') || estMoi(e.dossier, 'relais'))) decisionKycRelais(e.decision, e.pieces, e.le)
    else if (e.type === 'sanction_decidee' && estMoi(e.acteurId, 'relais')) sanctionRelais(e.niveau, e.etat)
    else if (e.type === 'convention_terminee' && estMoi(e.relais, 'relais')) finConvention(e.effet, e.le)
    const a = avisConsole(e, 'relais', { montants: false })
    if (!a) continue
    // Un motif écrit par la console qui porterait un montant ou un code n'entre pas dans la notification (NOT-03).
    const texte = sansCodeNiMontant(a.texte) ? a.texte : 'Ouvrez l’application pour le détail.'
    const cle = a.argent ? 'relais.belivay_argent' : a.grave ? 'relais.belivay_urgent' : 'relais.belivay'
    notifier({ id: 'NB-' + e.cle, cle, vars: { titre: a.titre, texte }, quand: e.le, route: ROUTE_CONSOLE[e.type] ?? 'notifications' })
  }
}

export function appliquerPont() {
  if (enCours) return
  enCours = true
  try {
    const vus = new Set(appliques.lire().cles)
    // Fin de convention arrivée à son terme (préavis échu) : le relais ne reçoit plus de colis.
    const fin = decisionsConsole('relais').filter((e): e is Extract<Evenement, { type: 'convention_terminee' }> => e.type === 'convention_terminee' && estMoi(e.relais, 'relais')).at(-1)
    if (fin && fin.effet <= maintenant() && etatRelais.lire().statut !== 'clos') finConvention(fin.effet, maintenant())
    // Paquets affectés vers ce relais depuis une commande du client : le lot est annoncé, ses colis attendus.
    const affectes = evenementsDe('entreprise').filter((e) => e.type === 'package.assigned' && !vus.has(e.cle))
    for (const e of affectes) annoncer(e)
    if (affectes.length) appliques.ecrire((s) => void s.cles.push(...affectes.map((e) => e.cle)))
    // Étape 7 : un retour accepté par le vendeur est attendu au comptoir, sous sa référence (le client la présente).
    const reponses = evenementsDe('vendeur').filter((e) => e.type === 'claim.answered' && !vus.has(e.cle))
    for (const e of reponses)
      if (e.type === 'claim.answered' && e.posture === 'accepte' && e.retour) {
        const c = etatColis.lire().colis[e.colis]
        attendreRetour(e.retour, e.colis, c?.classe ?? 'M', 'Retour accepté par le vendeur', ACTEURS_DEMO.vendeur.point, e.le + 48 * 3600_000)
      }
    if (reponses.length) appliques.ecrire((s) => void s.cles.push(...reponses.map((e) => e.cle)))
    const nouveaux = evenementsDe('livreur').filter((e) => !vus.has(e.cle))
    const lot = (id: string) => etatReception.lire().lots[id]
    const suivi = (id: string, s: 'en_route' | 'en_approche' | 'depose' | 'non_depose', le: number, arrivee?: number | null) => {
      // Lot déjà validé au comptoir : l'arrêt fait vaut confirmation du livreur (la garde passe au relais).
      if (s === 'depose' && lot(id)?.valideA) return confirmer(id, le)
      etatReception.ecrire((r) => {
        const l = r.lots[id]
        if (!l || l.valideA) return
        l.suivi = s
        if (arrivee) l.arriveeEstimee = arrivee
      })
    }
    const departs = (collecte: string, f: (d: DepartsVus) => void) =>
      appliques.ecrire((x) => void f((x.departs[collecte] ??= { confirmes: [], manquants: [], scelles: [] })))
    for (const e of nouveaux) {
      if (e.type === 'depart' && lot(e.paquetId)) suivi(e.paquetId, 'en_route', e.le)
      else if (e.type === 'arret' && arretSuivi(e.arretId)) {
        const a = arretSuivi(e.arretId)!
        if (e.etat === 'fait') suivi(a.lot, a.fait, e.le)
        else if (a.fait === 'depose') suivi(a.lot, 'non_depose', e.le)
      } else if (e.type === 'courier.approaching' && lot(e.lot)) suivi(e.lot, 'en_approche', e.le, e.arriveeEstimee)
      else if (e.type === 'relay.drop.report_accepted') {
        appliques.ecrire((x) => void ((x.constats[e.lot] ??= []).includes(e.colis) || x.constats[e.lot].push(e.colis)))
        etatReception.ecrire((r) => void (r.lots[e.lot] && !r.lots[e.lot].acceptes.includes(e.colis) && r.lots[e.lot].acceptes.push(e.colis)))
      } else if (e.type === 'relay.drop.completed' && lot(e.lot)) {
        // Gardée jusqu'à la validation du lot au comptoir (ARL-162) ; appliquée aussitôt si le lot est déjà validé.
        appliques.ecrire((x) => void (x.confirmations[e.lot] = { le: e.le, remis: e.remis, refuses: e.refuses, mode: e.mode }))
      } else if (e.type === 'relay.closure.undeclared')
        appliques.ecrire((x) => void x.incidents.push({ lot: e.lot, note: 'Relais trouvé fermé par le livreur (photo)', le: e.le, genre: 'relais_ferme' }))
      else if (e.type === 'relay.departure.confirmed' && e.par === 'livreur') departs(e.collecte, (d) => e.colis.forEach((c) => d.confirmes.includes(c) || d.confirmes.push(c)))
      else if (e.type === 'relay.departure.missing') departs(e.collecte, (d) => void (d.manquants.includes(e.colis) || d.manquants.push(e.colis)))
      else if (e.type === 'relay.departure.seal_photo') departs(e.collecte, (d) => void (d.scelles.includes(e.colis) || d.scelles.push(e.colis)))
      else if (e.type === 'incident' && (e.lieu === RELAIS_DEMO.nom || (e.paquetId && lot(e.paquetId))))
        appliques.ecrire((x) => void x.incidents.push({ lot: e.paquetId, note: e.note, le: e.le, genre: e.genre }))
      // « preuve » : la photo de dépose du livreur s'ajoute à celle du relais (ARL-11) ; rien à appliquer côté relais.
    }
    if (nouveaux.length) appliques.ecrire((s) => void s.cles.push(...nouveaux.map((e) => e.cle)))
    // Décisions de la console (une fois chacune).
    const console_ = decisionsConsole('relais').filter((e) => !vus.has(e.cle))
    if (console_.length) {
      appliques.ecrire((s) => void s.cles.push(...console_.map((e) => e.cle)))
      appliquerConsole(console_)
    }
    // Confirmations du livreur en attente d'un lot désormais validé : la garde passe au relais à l'heure du livreur.
    for (const [id, c] of Object.entries(appliques.lire().confirmations)) if (lot(id)?.valideA && !lot(id)?.prevenus) confirmer(id, Math.max(c.le, lot(id)!.valideA!))
  } finally {
    enCours = false
  }
}

/** Arrêt suivi par le relais : ceux du jeu d'essai, et ceux des lots annoncés (ramassage : en approche ; dépôt : déposé). */
function arretSuivi(arretId: string): { lot: string; fait: 'en_approche' | 'depose' } | null {
  if (ARRETS[arretId]) return ARRETS[arretId]
  const depot = LOTS.find((l) => l.arret === arretId)
  if (depot) return { lot: depot.id, fait: 'depose' }
  const [paquet, rang] = arretId.split('#')
  return rang !== undefined && LOTS.some((l) => l.id === paquet) ? { lot: paquet, fait: 'en_approche' } : null
}

/**
 * « package.assigned » vers ce relais : le lot (numéro du paquet) est attendu ; chaque colis entre « attendu », avec la
 * classe et la valeur annoncées par le vendeur (« C'est prêt »), le client vu par son prénom et son initiale, et
 * l'empreinte de son code de retrait (celui que le client lit dans son application, après paiement : ARL-01).
 */
function annoncer(e: Evenement) {
  if (e.type !== 'package.assigned' || e.relais !== RELAIS_DEMO.id) return
  // Course de retour (colis déjà déposés ici) : la collecte du livreur est le premier arrêt du paquet.
  const ici = e.colis.filter((id) => etatColis.lire().colis[id]?.etat === 'retour_depose')
  if (ici.length) return void annoncerCollecte(e.paquet, `${e.paquet}#0`, ici)
  const lot = e.paquet
  const arret = `${lot}#1`
  const heure = maintenant() + 45 * 60_000
  annoncerLot({ id: lot, arret, collecte: null, heurePrevue: heure, suivi: 'prevu', depotA: null })
  etatReception.ecrire((r) => {
    const l = r.lots[lot]
    if (!l?.ouvertA) r.lots[lot] = { suivi: l?.suivi ?? 'prevu', arriveeEstimee: heure, empreinte: empreinte('depot:' + codeDemo(lot, 'depot')), ouvertA: null, valideA: null, confirmeParLivreurA: null, enTrop: [], scannes: [], acceptes: [], prevenus: null }
  })
  const prets = evenementsDe('vendeur')
  etatColis.ecrire((s) => {
    for (const id of e.colis) {
      if (s.colis[id]) continue
      const pret = prets.find((x) => x.type === 'suborder.ready' && x.colis === id)
      const classe = (pret && pret.type === 'suborder.ready' ? (pret.classe === 'XL' ? 'L' : pret.classe) : 'M') as ClasseColis
      const valeur = pret && pret.type === 'suborder.ready' ? pret.valeur : 0
      creerColis(s, id, classe, {
        etat: 'attendu',
        valeur,
        paye: valeur,
        client: ACTEURS_DEMO.client.vu,
        arrivee: { lot, mission: arret, livreur: LIVREUR, entreprise: ENTREPRISE, le: null, photo: null, resultat: null, reserve: null },
        code: { empreinte: empreinte(codeColisDemo(id)), faux: 0, bloqueJusqua: null }, // un code par colis (v6 D12)
      })
    }
  })
}

/** La collecte d'une course de retour : les colis partent à cet arrêt du livreur (le serveur la publie, PR-06). */
function annoncerCollecte(paquet: string, arret: string, colis: string[]) {
  collectesPont.ecrire((s) => void (s.collectes.some((x) => x.id === arret) || s.collectes.push({ id: arret, lot: paquet, heurePrevue: maintenant() + 30 * 60_000, termineeA: null })))
  joindreCollectes()
  etatColis.ecrire((s) => {
    for (const id of colis) if (s.colis[id]?.sortie) s.colis[id].sortie!.collecte = arret
  })
}

/** Confirmation du livreur appliquée au lot validé (reception.confirmerParLeLivreur : garde au relais, clients prévenus) ;
 * le serveur publie alors pour le client l'avis d'arrivée et l'envoi du code de chaque colis (ARL-01, ARL-164). */
function confirmer(lotId: string, le: Instant) {
  confirmerParLeLivreur(lotId, le)
  const recus = Object.values(etatColis.lire().colis).filter((c) => c.arrivee.lot === lotId && (c.etat === 'en_stock' || c.etat === 'en_groupage')).map((c) => c.id)
  const remis = appliques.lire().confirmations[lotId]?.remis.filter((c) => recus.includes(c)) ?? recus
  for (const c of remis) {
    publier({ type: 'parcel.arrival_notice', colis: c, lot: lotId }, `parcel.arrival_notice-${c}`, le)
    const paye = etatColis.lire().colis[c]?.paiement.mode !== 'au_comptoir'
    publier({ type: 'parcel.pickup_code', colis: c, paye }, `parcel.pickup_code-${c}`, le)
  }
}

const lire = etatReception.lire
etatReception.lire = () => (appliquerPont(), lire())
// Les notifications et la fiche du relais aussi : une décision de la console s'y lit sur tous les écrans.
for (const m of [etatEvenementsDirects, etatRelais] as { lire: () => unknown }[]) {
  const l = m.lire
  m.lire = () => (appliquerPont(), l())
}

// ---------- Lectures pour les domaines du relais ----------

const vu = <T>(f: () => T): T => (appliquerPont(), f())
/** Colis d'un lot dont le livreur a accepté le constat (réserve ou refus) : le lot peut être confirmé (PR-RC-08). */
export const constatsAcceptes = (lot: string): string[] => vu(() => appliques.lire().constats[lot] ?? [])
/** Confirmation du lot par le livreur (la garde est passée au relais), ou null tant qu'il n'a pas confirmé. */
export const confirmationLivreur = (lot: string) => vu(() => appliques.lire().confirmations[lot] ?? null)
/** Ce que le livreur a fait à une collecte : colis confirmés, manquants, scellés photographiés. */
export const departsVusParLeLivreur = (collecte: string): DepartsVus => vu(() => appliques.lire().departs[collecte] ?? { confirmes: [], manquants: [], scelles: [] })
/** Incidents du livreur sur ce relais (relais fermé, gérant absent, saturation…) : pour la console et l'historique. */
export const incidentsDuLivreur = () => vu(() => appliques.lire().incidents)

// ---------- Publication : src/demo/pont-relais.ts (sans dépendance, appelé par les domaines) ----------
export * from './pont-relais'
/** Arrêt du livreur pour un lot (A3, V6…) : pour les écrans qui renvoient au livreur (« Serge A. · arrêt 3 »). */
export { arretDuLot }
