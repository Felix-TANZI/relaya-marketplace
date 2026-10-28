// DONNÉES DE DÉMONSTRATION — ce que l'espace entreprise a décidé, reçu par le livreur (src/demo/pont.ts) : un paquet
// affecté à Serge (arrêts, colis, heure limite) ou retiré, la décision sur un incident, une pièce redemandée (ou une
// nouvelle vérification de la photo, avec son délai), une absence vue, le constat du kit rendu, le départ clôturé et le
// dernier versement fait (DP-66, DP-67 : les deux SMS du serveur, à la clôture et au versement, se lisent ici comme des
// notifications « SMS · … »). Appliqué avant chaque lecture
// des paquets et des incidents, une fois par événement (clé), comme le ferait le serveur. Les décisions de la console
// d'administration (« app: 'admin' », src/demo/pont-console.ts) aussi : compte suspendu puis rétabli par BelivaY, décision
// sur la retenue du kit contestée, départ clôturé d'office (kit non contesté), selfie à reprendre décidé à la KYC,
// activation ou sanction, et comme partout : panne, maintenance, message, réponse du support, règle ou texte annoncés
// (notification « BelivaY · … » et bandeau de la coque). Dans l'autre sens, le départ,
// les arrêts, les preuves, les incidents et un paquet rendu partent vers l'entreprise (publier, dans chaque domaine).
import { F } from '@client/i18n/format'
import { jourLong } from '../i18n/temps'
import { etatAcces, fermerRattachementSerge, retablirSerge, suspendreSergeParBelivay } from './acces'
import { etatActivite } from './activite'
import { etatAbsences } from './disponibilite'
import { etatIncidents, leverIncidentTerrain } from './incidents'
import { etatEmploi, NOMS_ZONES } from './emploi'
import { etatMoi, type DepartDemo } from './moi'
import { etatNotifications } from './notifications'
import { PONT, etatPaquets, type ArretDemo, type PaquetDemo } from './paquets'
import { LIVREUR_DEMO, RELAIS_DEMO, evenementsDe, gerantVu, type Evenement } from './pont'
import { avisConsole, decisionsConsole } from './pont-console'
import { garderObjets } from './objets-pont'
import { etatSession } from './session'
import { magasin } from './stockage'

const appliques = magasin('pont', () => ({ cles: [] as string[] }))
let enCours = false

export function appliquerPont() {
  if (enCours || etatSession.lire().compte !== 'serge') return
  enCours = true
  try {
    const vus = new Set(appliques.lire().cles)
    const nouveaux = evenementsDe('entreprise').filter((e) => !vus.has(e.cle))
    // Décisions de la console : après celles de l'entreprise (un constat du kit précède la décision sur sa retenue).
    const console_ = decisionsConsole('livreur').filter((e) => !vus.has(e.cle))
    if (!nouveaux.length && !console_.length) return
    for (const e of nouveaux) {
      if (e.type === 'affectation') {
        const valeurs: Record<string, number> = {}
        const arrets: ArretDemo[] = e.paquet.arrets.map((a, k) => {
          for (const c of a.colis) valeurs[c.id] = c.valeur
          const relais = a.type === 'relais' || a.type === 'collecte'
          return { id: a.id, ordre: k + 1, type: a.type, nom: a.nom, quartier: a.quartier, zone: e.paquet.zone, creneau: a.creneau, pretDepuis: a.type === 'ramassage' ? e.le : null, gerant: relais ? gerantVu() : null, fermeA: relais ? RELAIS_DEMO.horaires[1].fermeture : null, trajetMin: 10, colis: a.colis.map((c) => c.id), fait: false }
        })
        // Lieux, colis et fiches des paquets venus d'une commande du client (servis avec le paquet par le serveur).
        if (e.paquet.arrets.some((a) => a.position)) garderObjets(e.paquetId, e.paquet.arrets)
        const p: PaquetDemo = { id: e.paquetId, type: e.paquet.genre, etat: 'affecte', version: 1, versionRelue: 1, zone: e.paquet.zone, accepteA: e.le, affecteA: e.le, arrets, distanceKm: e.paquet.distanceKm, departA: null, termineA: null, valeurs, changements: null, telechargeA: null, rendu: null, retireLe: null, limite: e.paquet.heureLimite }
        etatPaquets.ecrire((s) => void (s[p.id] = p))
        etatNotifications.ecrire((l) =>
          void l.unshift({ id: 'N-' + e.cle, rubrique: 'tournee', priorite: 'haute', titre: 'Nouveau paquet affecté', texte: `${e.paquetId} · ${e.paquet.zone} · ${arrets.length} arrêts. Rien à accepter : Yafé Express vous l’a affecté.`, route: 'paquet', params: { id: e.paquetId }, quand: e.le, lue: false, lueA: null, rappeleeA: null }),
        )
      } else if (e.type === 'retrait')
        etatPaquets.ecrire((s) => {
          const p = s[e.paquetId]
          if (p && (p.etat === 'affecte' || p.etat === 'modifie')) Object.assign(p, { etat: 'retire', retireLe: e.le })
        })
      else if (e.type === 'decision') leverIncidentTerrain(e.id, e.decision, e.motif, e.par, e.le)
      else if (e.type === 'piece_demandee') {
        const jusqua = e.piece === 'selfie' ? (e.jusqua ?? null) : null
        etatMoi.ecrire((x) => void (x.demandesEntreprise[e.piece] = { le: e.le, motif: e.motif, jusqua }))
        const selfie = e.piece === 'selfie'
        notifier(
          'N-' + e.cle,
          selfie ? 'Nouvelle photo demandée' : 'Pièce demandée',
          selfie ? `Yafé Express demande une nouvelle vérification de votre photo : ${e.motif}` + (jusqua ? ` À envoyer avant le ${jourLong(jusqua, 'fr')} ; vous continuez à travailler d’ici là.` : '') : `Yafé Express vous demande de renvoyer une pièce : ${e.motif}`,
          'moi',
          e.le,
        )
      } else if (e.type === 'absence_vue') etatAbsences.ecrire((x) => void x.liste.filter((a) => a.id === e.id && a.vueLe === null).forEach((a) => (a.vueLe = e.le)))
      else if (e.type === 'depart_kit') {
        if (!departDe(e.id)) continue
        etatMoi.ecrire((x) => void Object.assign((x.depart as DepartDemo).kit, { constat: e.constat, manquants: e.constat === 'incomplet' ? e.manquants : [], retenue: e.constat === 'incomplet' ? e.retenue : 0, contestation: null }))
        if (e.constat === 'incomplet') notifier('N-' + e.cle, 'Kit constaté incomplet', `Yafé Express a constaté qu’il manque : ${e.manquants.join(', ')}. Retenue de ${F(e.retenue)} F sur votre dernier relevé ; vous pouvez la contester.`, 'moi', e.le)
        else if (e.constat === 'restitue') notifier('N-' + e.cle, 'Kit rendu complet', 'Yafé Express a constaté votre kit complet : aucune retenue.', 'moi', e.le)
      } else if (e.type === 'depart_clos') clore(e)
      else if (e.type === 'versement_fait') {
        const d = departDe(e.id)
        if (!d || d.faitLe !== null) continue
        etatMoi.ecrire((x) => {
          const y = x.depart as DepartDemo
          y.faitLe = e.le
          if (e.montant !== null && y.versementFige) y.versementFige.verse = e.montant
        })
        // SMS du serveur quand le versement Mobile Money est fait.
        notifier('N-' + e.cle, 'SMS · Dernier versement fait', e.montant !== null ? `BelivaY : ${F(e.montant)} F envoyés sur votre Mobile Money par Yafé Express. Merci pour votre travail.` : 'BelivaY : votre dernier versement a été envoyé sur votre Mobile Money par Yafé Express.', 'compte', e.le)
      } else if ('livreurId' in e && e.livreurId === LIVREUR_DEMO && appliquerEmploi(e)) {
        // Décision de l'employeur (suspension, avertissement, zones, horaires, essai, fin de contrat) : appliquée.
      } else if (e.type === 'tarif')
        // Un seul tarif par mission réglé par l'entreprise ; sans tarif, le compteur des missions seul (I-04).
        etatActivite.ecrire((x) => {
          x.affichage = e.montant === null ? 'compteur' : 'tarif'
          if (e.montant !== null) for (const k of Object.keys(x.tarifs) as (keyof typeof x.tarifs)[]) x.tarifs[k] = e.montant
        })
    }
    appliquerConsole(console_)
    appliques.ecrire((s) => void s.cles.push(...nouveaux.map((e) => e.cle), ...console_.map((e) => e.cle)))
  } finally {
    enCours = false
  }
}
const NOM_JOUR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
/**
 * Décisions de l'employeur (DP-66, DP-67 : Yafé Express est l'employeur de Serge) : l'état de son emploi, une
 * notification « compte » sobre, et pour une fin de contrat le départ (préavis, kit, dernier versement) ; une rupture
 * pendant l'essai ferme le rattachement. Rend faux pour un autre type d'événement.
 */
function appliquerEmploi(e: Evenement): boolean {
  const qui = 'Yafé Express'
  switch (e.type) {
    case 'emploi_suspendu':
      etatEmploi.ecrire((x) => void (x.suspension = { motif: e.motif, depuis: e.le, jusqua: e.jusqua }))
      notifier('N-' + e.cle, 'Suspendu par votre entreprise', `${qui} a suspendu votre rattachement${e.jusqua ? ` jusqu’au ${jourLong(e.jusqua, 'fr')}` : ''} : ${e.motif} Vous terminez vos missions en cours ; aucun nouveau paquet d’ici là.`, 'notifications', e.le, 'haute')
      return true
    case 'emploi_retabli':
      etatEmploi.ecrire((x) => void (x.suspension = null))
      notifier('N-' + e.cle, 'Suspension levée', `${qui} a levé votre suspension : vous recevez de nouveau des paquets.`, 'notifications', e.le)
      return true
    case 'avertissement_ecrit':
      etatEmploi.ecrire((x) => void (x.avertissements.some((a) => a.id === e.id) || x.avertissements.push({ id: e.id, rang: e.rang, le: e.le, motif: e.motif })))
      notifier('N-' + e.cle, `Avertissement écrit n° ${e.rang}`, `${qui} vous adresse un avertissement écrit : ${e.motif}`, 'notifications', e.le, 'haute')
      return true
    case 'zones_changees':
      etatEmploi.ecrire((x) => void (x.zones = e.zones))
      notifier('N-' + e.cle, 'Zones de travail changées', `${qui} vous confie désormais : ${e.zones.map((z) => `${z} ${NOMS_ZONES[z] ?? ''}`.trim()).join(', ')}.` + (e.motif ? ` ${e.motif}` : ''), 'moi', e.le)
      return true
    case 'horaires_changes':
      etatEmploi.ecrire((x) => void (x.horaires = e.creneaux))
      notifier('N-' + e.cle, 'Horaires de travail changés', `${qui} a changé vos horaires : ${e.creneaux.map((c) => `${NOM_JOUR[c.jour]} ${c.de.replace(':', ' h ')}–${c.a.replace(':', ' h ')}`).join(', ')}.`, 'statut', e.le)
      return true
    case 'essai_conclu':
      etatEmploi.ecrire((x) => void (x.essai = { issue: e.issue, le: e.le, jusqua: e.jusqua }))
      notifier(
        'N-' + e.cle,
        e.issue === 'confirme' ? 'Période d’essai confirmée' : e.issue === 'prolonge' ? 'Période d’essai prolongée' : 'Fin du contrat pendant l’essai',
        e.issue === 'confirme' ? `${qui} confirme votre embauche : votre contrat continue.` : e.issue === 'prolonge' ? `${qui} prolonge votre période d’essai${e.jusqua ? ` jusqu’au ${jourLong(e.jusqua, 'fr')}` : ''}.` : `${qui} met fin à votre contrat pendant la période d’essai, après vos missions en cours. Votre compte, votre historique et votre certification sont conservés.`,
        'notifications',
        e.le,
        e.issue === 'rompu' ? 'haute' : 'normale',
      )
      if (e.issue === 'rompu' && etatAcces.lire().serge.etat !== 'rattachement_ferme') fermerRattachementSerge(e.le, 'entreprise', false, `${qui} a mis fin à votre contrat pendant la période d’essai.`)
      return true
    case 'fin_contrat': {
      etatEmploi.ecrire((x) => void (x.finContrat = { id: e.id, motif: e.motif, le: e.le, preavisJusqua: e.preavisJusqua }))
      // Le départ s'ouvre comme une demande, à l'initiative de l'employeur : préavis, kit, dernier versement, clôture.
      const ouvert = etatMoi.lire().depart
      if (!ouvert || typeof ouvert !== 'object' || ouvert.etat !== 'demande')
        etatMoi.ecrire((x) => void (x.depart = { id: e.id, initiative: 'entreprise', demandeLe: e.le, motif: 'autre', texte: e.motif, preavisJusqua: e.preavisJusqua, etat: 'demande', closLe: null, closPar: null, versementLe: null, kit: { constat: null, manquants: [], retenue: 0, contestation: null }, kitNonConteste: false, versementFige: null, faitLe: null }))
      notifier('N-' + e.cle, 'Fin de contrat', `${qui} met fin à votre contrat : ${e.motif} Préavis jusqu’au ${jourLong(e.preavisJusqua, 'fr')} ; vous travaillez normalement jusqu’à la veille du dernier jour.`, 'moi', e.le, 'haute')
      return true
    }
    case 'fin_contrat_annulee':
      etatEmploi.ecrire((x) => void (x.finContrat?.id === e.id && (x.finContrat = null)))
      if (departDe(e.id)?.etat === 'demande') etatMoi.ecrire((x) => void (x.depart = null))
      notifier('N-' + e.cle, 'Fin de contrat annulée', `${qui} annule la fin de votre contrat : vous restez dans l’équipe.`, 'notifications', e.le)
      return true
    default:
      return false
  }
}

/** Départ clôturé (par l'entreprise, ou d'office par BelivaY) : accès fermé, SMS du serveur avec la date du dernier versement. */
function clore(e: Extract<Evenement, { type: 'depart_clos' }>) {
  const d = departDe(e.id)
  if (!d || d.etat === 'close') return
  const { du, missions, retenuLitiges, litiges, retenueKit, kitDeCote, verse } = e.versement
  etatMoi.ecrire(
    (x) =>
      void Object.assign(x.depart as DepartDemo, {
        etat: 'close',
        closLe: e.le,
        closPar: e.par,
        versementLe: e.versementLe,
        kitNonConteste: e.kitNonConteste,
        versementFige: { du, missions, retenuLitiges, litiges, retenueKit, kitDeCote, verse },
      }),
  )
  if (etatAcces.lire().serge.etat !== 'rattachement_ferme') fermerRattachementSerge(e.le, e.par, e.kitNonConteste, d.initiative === 'entreprise' ? `Fin de contrat décidée par Yafé Express, clôturée par ${e.par === 'entreprise' ? 'Yafé Express' : 'BelivaY'} à la fin du préavis.` : undefined)
  if (d.initiative === 'entreprise') etatEmploi.ecrire((x) => void (x.finContrat = null))
  // SMS du serveur à la clôture (envoyé même accès fermé), avec la date du dernier versement.
  notifier('N-' + e.cle, 'SMS · Départ clôturé', `BelivaY : votre départ de Yafé Express est clôturé. Dernier versement en Mobile Money le ${jourLong(e.versementLe, 'fr')}.` + (e.kitNonConteste ? ' Kit non contesté : aucune retenue.' : ''), 'compte', e.le)
}
/** Décisions de la console pour Serge (une fois chacune) : effet sur son compte, puis la notification « BelivaY · … ». */
function appliquerConsole(evts: Evenement[]) {
  for (const e of evts) {
    if (e.type === 'depart_clos') {
      clore(e) // porte son propre SMS de clôture
      continue
    }
    if (e.type === 'livreur_suspendu') {
      if (e.livreurId !== LIVREUR_DEMO) continue
      suspendreSergeParBelivay(e.le, e.motif, e.jusqua)
    } else if (e.type === 'livreur_retabli') {
      if (e.livreurId !== LIVREUR_DEMO) continue
      retablirSerge(e.le)
    } else if (e.type === 'kit_decide') {
      const d = departDe(e.id)
      if (!d?.kit.contestation || d.kit.contestation.decision !== null) continue
      etatMoi.ecrire((x) => void Object.assign((x.depart as DepartDemo).kit.contestation!, { decision: e.decision === 'retenue_annulee' ? 'annulee' : 'maintenue', decideLe: e.le }))
    } else if (e.type === 'piece_demandee') {
      // Pièce ou selfie à reprendre décidé à la KYC de BelivaY : même suivi qu'une demande de l'entreprise.
      const jusqua = e.piece === 'selfie' ? (e.jusqua ?? null) : null
      etatMoi.ecrire((x) => void (x.demandesEntreprise[e.piece] = { le: e.le, motif: e.motif, jusqua }))
    }
    const a = avisConsole(e, 'livreur')
    if (!a) continue
    const route = e.type === 'piece_demandee' || e.type === 'kit_decide' ? 'moi' : e.type === 'support_reponse' || e.type === 'diffusion' ? 'messages' : 'notifications'
    notifier('N-' + e.cle, a.titre, a.texte, route, e.le, a.grave ? 'haute' : 'normale')
  }
}
/** La demande de départ visée par un événement de l'entreprise (à la forme d'aujourd'hui). */
function departDe(id: string): DepartDemo | null {
  const d = etatMoi.lire().depart
  return d && typeof d === 'object' && 'kit' in d && d.id === id ? d : null
}
/** Une notification « compte » posée par un événement de l'entreprise (une fois : clé de l'événement). */
function notifier(id: string, titre: string, texte: string, route: string, quand: number, priorite: 'haute' | 'normale' = 'normale') {
  etatNotifications.ecrire((l) => void (l.some((n) => n.id === id) || l.unshift({ id, rubrique: 'compte', priorite, titre, texte, route, params: undefined, quand, lue: false, lueA: null, rappeleeA: null })))
}

PONT.avantLecture = appliquerPont
// Les incidents aussi : une décision de l'entreprise se voit dans le suivi (LIV-P21).
const lireIncidents = etatIncidents.lire
etatIncidents.lire = () => (appliquerPont(), lireIncidents())
// Le compte aussi (DP-66, DP-67) : pièce redemandée, kit constaté, départ clôturé, versement fait, absence vue.
// L'état du compte et les notifications aussi (DP-67) : clôture lue même accès fermé, SMS de clôture et de versement.
for (const m of [etatMoi, etatAbsences, etatAcces, etatNotifications, etatEmploi] as { lire: () => unknown }[]) {
  const lire = m.lire
  m.lire = () => (appliquerPont(), lire())
}
// L'activité aussi : le tarif par mission réglé par l'entreprise s'y lit (LIV-P25).
const lireActivite = etatActivite.lire
etatActivite.lire = () => (appliquerPont(), lireActivite())
