// DONNÉES DE DÉMONSTRATION — ce que l'espace livreur a fait, reçu par l'entreprise (src/demo/pont.ts) : départ, arrêts
// faits, preuves, incidents, paquet rendu, appliqués aux paquets, aux missions et aux incidents de Yafé, comme le ferait
// le serveur ; et pour son compte (DP-66) : demande de départ ou son annulation, absence prévenue ou annulée, pièce
// renvoyée (elle passe « à contrôler » dans la file des pièces ; une nouvelle photo garde sa demande et son échéance
// jusqu'à la validation), contestation de la retenue de son kit (DP-67 : mise de côté jusqu'à la décision de
// BelivaY ; l'entreprise la voit sur le départ). Dans l'autre sens, l'affectation d'un paquet à Serge A.
// et la décision sur un incident partent vers le livreur (les gestes de son compte partent de src/demo/livreurs.ts).
// Le point relais (même appareil) : le lot confirmé par Serge au relais valide la mission (garde au relais) ; un colis
// refusé ou « pas pour ce relais », un code de dépôt bloqué, un colis manquant à la collecte arrivent en incidents ou en
// alertes ; les départs prêts (course publiée), la saturation du relais (paquets non ramassés réorientés, PR-RC-05) et sa
// fermeture déclarée arrivent en alertes (logique-metier/relais/CONNEXIONS.md).
// Les décisions de la console d'administration (« app: 'admin' », src/demo/pont-console.ts) aussi : suspension ou
// rétablissement d'un livreur par BelivaY (non levable ici), décision sur une retenue de kit contestée, clôture d'office
// d'un départ (kit non contesté), selfie à reprendre (KYC) ; pour Yafé Express elle-même : activation (KYC), sanction,
// grille annoncée, versement crédité, litige où le transporteur est en cause ; et, comme partout : panne, maintenance,
// message diffusé, réponse du support, règle ou texte annoncés (notification « BelivaY · … » et bandeau de la coque).
// Chaque événement n'est appliqué qu'une fois (clé), à la première lecture qui suit.
import type { GenreIncident, Incident } from '../donnees/domaines/incidents'
import { MINUTE } from '../calculs/temps'
import { REGLES } from '../calculs/livraison/regles-ecrans'
import { photoEcheance } from '../calculs/depart'
import type { TypeAlerte } from '../calculs/ent08'
import { incidentsStock } from './incidents'
import { departsDemo, nouveauDepart } from './departs'
import { livreursDemo, piece, PIECE_PONT } from './livreurs'
import { livreurCourt } from './jeu-essai'
import { LIEUX, PONT, paquetDeCommande, paquetDeRetour, paquetsDemo, type PaquetDemo } from './paquets'
import { maintenant } from './horloge'
import { notificationsDemo } from './notifications'
import { ACTEURS_DEMO, LIVREUR_DEMO, RELAIS_DEMO, evenementsDe, paquetDuJour, publier, type ArretPont, type Evenement, type PaquetPont } from './pont'
import { magasin } from './stockage'
import { avisConsole, decisionsConsole } from './pont-console'

/** Arrêts de la journée de Serge chez le livreur → paquet et rang de l'arrêt chez l'entreprise. */
const ARRETS: Record<string, [string, number]> = {
  A1: ['PQ-Z1-261013-003', 0],
  A2: ['PQ-Z1-261013-003', 1],
  A3: ['PQ-Z1-261013-003', 2],
  A4: ['PQ-Z1-261013-006', 0],
  A5: ['PQ-Z1-261013-006', 1],
  A6: ['PQ-Z1-261013-008', 0],
  A7: ['PQ-Z1-261013-008', 1],
}
/** Arrêt d'un paquet affecté depuis ce portail : « <paquet>#<rang> ». */
const rangDe = (paquetId: string, arretId: string): number | null => {
  if (ARRETS[arretId]?.[0] === paquetId) return ARRETS[arretId][1]
  const m = /#(\d+)$/.exec(arretId)
  return m ? Number(m[1]) : null
}

const GENRES: Record<string, GenreIncident> = {
  boutique_fermee: 'boutique_fermee',
  pas_pret: 'boutique_fermee',
  absent: 'boutique_fermee',
  code_bloque: 'boutique_fermee',
  client_absent: 'client_absent',
  panne: 'panne',
  crevaison: 'panne',
  batterie_vide: 'panne',
  accident: 'accident',
  malaise: 'accident',
  accident_blesse: 'accident',
  agression: 'agression',
  sos: 'agression',
  menace: 'agression',
  lieu_dangereux: 'agression',
  colis_abime_vendeur: 'colis_abime',
  scelle_rompu: 'colis_abime',
  colis_mouille: 'colis_abime',
  relais_ferme: 'adresse',
}
const FAMILLES: Record<string, Incident['famille']> = { vendeur: 'blocage', relais: 'blocage', domicile: 'blocage', route: 'vehicule', colis: 'colis', securite: 'securite' }

const appliques = magasin('pont', () => ({ cles: [] as string[] }))
let enCours = false

/** Une alerte posée par le pont (une fois : clé de l'événement), en tête du centre de notifications. */
function alerter(e: Evenement, type: TypeAlerte, priorite: 'critique' | 'maintenant' | 'info', titre: string, texte: string, route: string, params: Record<string, string> = {}) {
  notificationsDemo.ecrire((s) => {
    const id = 'NT-' + e.cle
    if (!s.notifications.some((x) => x.id === id)) s.notifications.unshift({ id, type, priorite, titre, texte, le: e.le, lue: false, canaux: ['portail', 'push'], route, params })
  })
}
/** Incident d'un colis au relais (non bloquant : la suite est décidée par le serveur ; l'entreprise le voit et répond). */
function incidentRelais(e: Evenement & { lot: string | null; colis: string }, genre: GenreIncident, note: string) {
  const paquetId = e.lot ?? '—'
  const i: Incident = { id: 'IN-R' + e.colis.replace(/\D/g, ''), missionId: e.lot ? 'MS' + e.lot.slice(2) : '—', paquetId, livreur: livreurCourt(LIVREUR_DEMO), genre, famille: 'colis', bloquant: false, lieu: RELAIS_DEMO.nom, distanceArretM: null, declareLe: e.le, recuLe: e.le, decideAvant: null, statut: 'valide', photos: [], note, consequence: 'reserve', decision: null }
  incidentsStock.ecrire((s) => void (s.incidents.some((x) => x.id === i.id) || s.incidents.unshift(i)))
}

/** Ce que le point relais a fait (même appareil), une fois par événement. */
function appliquerRelais(nouveaux: Evenement[]) {
  for (const e of nouveaux) {
    if (e.type === 'relay.drop.item_result' && (e.resultat === 'refuse' || e.resultat === 'pas_pour_ce_relais'))
      incidentRelais(e, e.resultat === 'refuse' ? 'colis_abime' : 'adresse', e.resultat === 'refuse' ? `Colis ${e.colis} refusé au ${RELAIS_DEMO.nom}${e.motif ? ' : ' + e.motif : ''} (${e.photos} photos). Il repart sous la garde de votre livreur.` : `Colis ${e.colis} pas pour ce relais (PR-RC-04) : il reste à votre livreur, l’arrêt est recalculé.`)
    else if (e.type === 'relay.drop_code.blocked')
      alerter(e, 'incident', 'maintenant', 'Code de dépôt bloqué', `${RELAIS_DEMO.nom} · 3 codes de dépôt faux : le lot n’est pas reçu, la console rappelle votre livreur.`, 'incidents')
    else if (e.type === 'relay.departures.ready')
      alerter(e, 'paquet', 'info', 'Départs prêts au relais', `${RELAIS_DEMO.nom} · ${e.colis.length} colis à faire partir (renvoi, retour, transfert) : la course est publiée en paquet.`, 'paquets')
    else if (e.type === 'relay.stock.updated' && e.sature)
      alerter(e, 'paquet', 'maintenant', 'Relais saturé', `${RELAIS_DEMO.nom} · ${e.occupees} places occupées sur ${e.declarees} : les paquets pas encore ramassés vers ce relais sont réorientés vers le relais ouvert le plus proche.`, 'paquets')
    else if (e.type === 'relay.closure.declared')
      alerter(e, 'paquet', 'maintenant', 'Relais fermé', `${RELAIS_DEMO.nom} · fermeture déclarée (${e.motif}) : les paquets concernés sont republiés.`, 'paquets')
  }
}

/** Écran où mène la notification d'une décision de la console. */
function routeConsole(e: Evenement): [TypeAlerte, string] {
  switch (e.type) {
    case 'livreur_suspendu':
    case 'livreur_retabli':
    case 'piece_demandee':
      return ['incident', 'flotte']
    case 'kit_decide':
    case 'depart_clos':
      return ['depart', 'flotte']
    case 'litige_decide':
      return ['litige', 'litiges']
    case 'versement_credite':
    case 'grille_annoncee':
      return ['versement_refuse', 'reglements']
    case 'kyc_decide':
    case 'sanction_decidee':
    case 'palier_decide':
      return ['document', 'etat']
    case 'support_reponse':
    case 'diffusion':
      return ['document', 'messages']
    default:
      return ['document', 'notifications']
  }
}
/** Décisions de la console (une fois chacune) : effets sur la flotte et les départs, puis la notification « BelivaY · … ». */
function appliquerConsole(evts: Evenement[]) {
  for (const e of evts) {
    // Un livreur inconnu de cette flotte est ignoré.
    if (e.type === 'livreur_suspendu')
      livreursDemo.ecrire((s) => {
        const l = s.livreurs.find((x) => x.id === e.livreurId)
        if (l && l.statut !== 'retire') Object.assign(l, { statut: 'suspendu', suspension: { par: 'belivay', niveau: null, motif: e.motif, depuis: e.le, jusqua: e.jusqua } })
      })
    else if (e.type === 'livreur_retabli')
      livreursDemo.ecrire((s) => {
        const l = s.livreurs.find((x) => x.id === e.livreurId)
        if (l && l.statut === 'suspendu' && l.suspension?.par === 'belivay') Object.assign(l, { statut: 'actif', suspension: null })
      })
    else if (e.type === 'kit_decide')
      departsDemo.ecrire((s) => {
        const c = s.departs.find((x) => x.id === e.id)?.kit.contestation
        if (c && c.decision === null) Object.assign(c, { decision: e.decision === 'retenue_annulee' ? 'annulee' : 'maintenue', decideLe: e.le })
      })
    else if (e.type === 'depart_clos') {
      // Clôture d'office d'un départ échu (ADM-CACHEE-01/02) : sans constat du kit dans le délai, aucune retenue.
      const d = departsDemo.lire().departs.find((x) => x.id === e.id && x.etat === 'demande')
      if (!d) continue
      departsDemo.ecrire((s) => void Object.assign(s.departs.find((x) => x.id === e.id)!, { etat: 'close', closLe: e.le, closPar: 'admin', versementLe: e.versementLe, kitNonConteste: e.kitNonConteste, versement: e.versement }))
      livreursDemo.ecrire((s) => void Object.assign(s.livreurs.find((x) => x.id === d.livreurId) ?? {}, { statut: 'retire', retraitDemande: null }))
    } else if (e.type === 'piece_demandee' && e.piece === 'selfie')
      // Selfie à reprendre décidé à la KYC : même statut qu'une nouvelle vérification demandée par l'entreprise.
      livreursDemo.ecrire((s) => {
        const q = s.livreurs.find((x) => x.id === LIVREUR_DEMO)?.pieces.find((p) => p.type === 'selfie')
        if (q && q.statut === 'valide') Object.assign(q, { statut: 'reverification', motif: null, controle: { par: 'BelivaY · KYC', le: e.le }, relances: [e.le, ...q.relances], reverification: { le: e.le, motif: e.motif, jusqua: e.jusqua ?? photoEcheance(e.le), bloque: false } })
      })
    const a = avisConsole(e, 'entreprise')
    if (!a) continue
    const [type, route] = routeConsole(e)
    alerter(e, type, a.grave ? 'critique' : 'info', a.titre, a.texte, route)
  }
}

/** Applique les événements du livreur pas encore vus (appelé avant chaque lecture des paquets et des incidents). */
export function appliquerPont() {
  if (enCours) return
  enCours = true
  try {
    const vus = new Set(appliques.lire().cles)
    const commandes = evenementsDe('vendeur').filter((e) => !vus.has(e.cle))
    if (commandes.length) {
      appliquerCommandes(commandes)
      appliques.ecrire((s) => void s.cles.push(...commandes.map((e) => e.cle)))
    }
    const relais = evenementsDe('relais').filter((e) => !vus.has(e.cle))
    appliquerRelais(relais)
    appliquerRetours(relais)
    const nouveaux = evenementsDe('livreur').filter((e) => !vus.has(e.cle))
    // Décisions de la console : après les gestes du livreur (une contestation de kit précède sa décision).
    const console_ = decisionsConsole('entreprise').filter((e) => !vus.has(e.cle))
    if (!nouveaux.length) {
      appliquerConsole(console_)
      return void ((relais.length || console_.length) && appliques.ecrire((s) => void s.cles.push(...relais.map((e) => e.cle), ...console_.map((e) => e.cle))))
    }
    for (const e of nouveaux) {
      const q = (f: (p: PaquetDemo) => void) => 'paquetId' in e && e.paquetId && paquetsDemo.ecrire((s) => void (s.paquets.find((x) => x.id === e.paquetId) && f(s.paquets.find((x) => x.id === e.paquetId)!)))
      if (e.type === 'depart_demande')
        departsDemo.ecrire((s) => {
          // Une seule demande ouverte : une nouvelle demande remplace l'ancienne encore ouverte.
          s.departs = s.departs.filter((d) => !(d.livreurId === LIVREUR_DEMO && d.etat === 'demande') && d.id !== e.id)
          s.departs.unshift(nouveauDepart(e.id, LIVREUR_DEMO, e.le, e.motif, e.texte, 0, e.preavisJusqua))
        })
      else if (e.type === 'depart_annule') departsDemo.ecrire((s) => void (s.departs = s.departs.filter((d) => !(d.id === e.id && d.etat === 'demande'))))
      else if (e.type === 'absence')
        departsDemo.ecrire((s) => void (s.absences.some((a) => a.id === e.id) || s.absences.push({ id: e.id, livreurId: LIVREUR_DEMO, du: e.du, au: e.au, motif: e.motif, texte: e.texte, imprevu: e.imprevu, apresDebut: e.apresDebut, prevenueLe: e.le, vueLe: null })))
      else if (e.type === 'kit_conteste')
        departsDemo.ecrire((s) => {
          const d = s.departs.find((x) => x.id === e.id)
          // Seule une retenue (kit incomplet) se conteste ; une fois. Le montant est mis de côté jusqu'à la décision.
          if (d && d.kit.constat === 'incomplet' && !d.kit.contestation) d.kit.contestation = { le: e.le, motif: e.motif, decision: null, decideLe: null }
        })
      else if (e.type === 'absence_annulee') departsDemo.ecrire((s) => void (s.absences = s.absences.filter((a) => a.id !== e.id)))
      else if (e.type === 'piece_envoyee')
        livreursDemo.ecrire((s) => {
          const l = s.livreurs.find((x) => x.id === LIVREUR_DEMO)
          const type = (Object.keys(PIECE_PONT) as (keyof typeof PIECE_PONT)[]).find((k) => PIECE_PONT[k] === e.piece)
          const k = l && type ? l.pieces.findIndex((p) => p.type === type) : -1
          if (!l || !type || k < 0) return
          const avant = l.pieces[k]
          l.pieces[k] = { ...piece(l.id, type, 'en_revue', avant.expireLe, e.le, null), relances: avant.relances, reverification: avant.reverification ?? null }
        })
      else if (e.type === 'depart')
        q((p) => {
          if (p.statut === 'affecte') Object.assign(p, { statut: 'en_cours', depart: e.le })
          p.journal.push({ le: e.le, quoi: 'depart', par: null })
        })
      else if (e.type === 'arret')
        q((p) => {
          const k = rangDe(p.id, e.arretId)
          if (k === null || !p.arrets[k]) return
          if (p.statut === 'affecte') Object.assign(p, { statut: 'en_cours', depart: e.le })
          if (e.etat === 'fait') p.arrets[k].fait = e.le
          p.journal.push({ le: e.le, quoi: e.etat === 'fait' ? (p.arrets[k].sens === 'ramassage' ? 'ramasse' : 'remis') : 'arret_retire', par: null })
          if (p.arrets.every((a) => a.fait)) Object.assign(p, { statut: 'depose', deposeLe: e.le, eta: null })
        })
      else if (e.type === 'preuve') q((p) => void p.journal.push({ le: e.le, quoi: 'preuve', par: null }))
      else if (e.type === 'relay.drop.completed') {
        // Lot confirmé par le livreur au relais : la garde passe au relais, la prestation est validée (versement du vendredi).
        paquetsDemo.ecrire((s) => void s.paquets.find((x) => x.id === e.lot)?.journal.push({ le: e.le, quoi: 'remis', par: `${RELAIS_DEMO.nom} · ${e.remis.length} colis` }))
        alerter(e, 'paquet', 'info', 'Mission validée au relais', `${e.lot} · ${e.remis.length} colis gardés par le ${RELAIS_DEMO.nom}${e.refuses.length ? ` · ${e.refuses.length} refusé(s), repartis avec votre livreur` : ''}${e.mode === 'registre' ? ' · registre papier, régularisé à la reconnexion' : ''}.`, 'paquet', { id: e.lot })
      } else if (e.type === 'relay.departure.missing')
        alerter(e, 'incident', 'maintenant', 'Colis manquant à la collecte', `${RELAIS_DEMO.nom} · ${e.colis} n’a pas été présenté à votre livreur : le support est alerté.`, 'incidents')
      // Terrain : ordre changé (« Faire cet arrêt d'abord »), retard prévu, colis laissé chez le vendeur, remise à un tiers.
      else if (e.type === 'ordre') {
        q((p) => void p.journal.push({ le: e.le, quoi: 'ordre', par: livreurCourt(LIVREUR_DEMO).nom }))
        alerter(e, 'paquet', 'info', 'Ordre des arrêts changé', `${e.paquetId} · ${livreurCourt(LIVREUR_DEMO).nom} fait un arrêt d’abord.`, 'paquet', { id: e.paquetId })
      } else if (e.type === 'retard') {
        q((p) => {
          p.eta = e.arriveeEstimee
          p.journal.push({ le: e.le, quoi: 'retard', par: `+${e.minutes} min` })
        })
        alerter(e, 'paquet', 'maintenant', 'Retard prévu', `${e.paquetId} · ${livreurCourt(LIVREUR_DEMO).nom} annonce ${e.minutes} min de retard.`, 'paquet', { id: e.paquetId })
      } else if (e.type === 'colis_laisse') {
        q((p) => void p.journal.push({ le: e.le, quoi: 'colis_laisse', par: e.colis }))
        alerter(e, 'incident', 'maintenant', 'Colis laissé chez le vendeur', `${e.paquetId} · ${e.colis} n’était pas prêt : votre livreur est parti avec les autres.`, 'paquet', { id: e.paquetId })
      } else if (e.type === 'remise_tiers') q((p) => void p.journal.push({ le: e.le, quoi: 'remise_tiers', par: null }))
      else if (e.type === 'rendu')
        q((p) => {
          Object.assign(p, { statut: 'accepte', livreurId: null, affecteLe: null, creneau: null })
          p.journal.push({ le: e.le, quoi: 'rendu', par: 'Serge A. · ' + e.motif })
        })
      else if (e.type === 'incident') {
        const securite = e.famille === 'securite'
        const i: Incident = {
          id: e.id,
          missionId: e.paquetId ? 'MS' + e.paquetId.slice(2) : '—',
          paquetId: e.paquetId ?? '—',
          livreur: livreurCourt(LIVREUR_DEMO),
          genre: GENRES[e.genre] ?? 'adresse',
          famille: FAMILLES[e.famille] ?? 'blocage',
          bloquant: e.bloquant,
          lieu: e.lieu ?? '—',
          distanceArretM: null,
          declareLe: e.le,
          recuLe: e.le,
          decideAvant: e.bloquant && !securite ? e.le + REGLES.incidentMin * MINUTE : null,
          statut: securite ? 'securite' : e.bloquant ? 'a_valider' : 'valide',
          photos: [],
          note: e.note,
          consequence: e.genre === 'boutique_fermee' || e.genre === 'code_bloque' ? 'arret_retire' : GENRES[e.genre] === 'panne' ? 'transfert' : e.famille === 'relais' ? 'retour_relais' : 'aucune',
          decision: null,
        }
        incidentsStock.ecrire((s) => void (s.incidents.some((x) => x.id === i.id) || s.incidents.unshift(i)))
        if (e.bloquant) q((p) => void (['en_cours', 'affecte'].includes(p.statut) && Object.assign(p, { statut: 'incident', incidentId: e.id })))
      }
    }
    appliquerConsole(console_)
    appliques.ecrire((s) => void s.cles.push(...relais.map((e) => e.cle), ...nouveaux.map((e) => e.cle), ...console_.map((e) => e.cle)))
  } finally {
    enCours = false
  }
}
PONT.avantLecture = appliquerPont
// Les alertes aussi : ce que fait le relais s'y lit.
const lireNotifications = notificationsDemo.lire
notificationsDemo.lire = () => (appliquerPont(), lireNotifications())

/**
 * « C'est prêt » chez un vendeur (pont commun) : le paquet est publié aux entreprises de la zone (« Paquets
 * disponibles ») ; Yafé Express l'accepte et l'affecte elle-même (BelivaY n'affecte jamais le livreur).
 */
/** Colis des commandes du client (pont commun) : eux seuls font partir « package.assigned » vers le client. */
const COLIS_CLIENT = magasin('colis_client', () => ({ colis: [] as string[] }))
function appliquerCommandes(evts: Evenement[]) {
  for (const e of evts) {
    if (e.type !== 'suborder.ready') continue
    const le = maintenant()
    paquetsDemo.ecrire((s) => {
      if (s.paquets.some((p) => p.colis.some((c) => c.etiquette === e.colis))) return
      let rang = 20
      while (s.paquets.some((p) => p.id === paquetDuJour(e.zone, rang))) rang++
      const lieu = e.lieu === ACTEURS_DEMO.vendeur.lieu || !LIEUX[e.lieu] ? ACTEURS_DEMO.vendeur.lieu : e.lieu
      const p = paquetDeCommande({ id: paquetDuJour(e.zone, rang), colis: e.colis, classe: e.classe === 'XL' ? 'XL' : e.classe, valeur: e.valeur, lieu, relais: e.relais, quartier: e.quartier, le })
      s.paquets.unshift(p)
      COLIS_CLIENT.ecrire((x) => void x.colis.push(e.colis))
      publier({ type: 'package.published', paquet: p.id, zone: p.zone, colis: [e.colis], heureLimite: p.heureLimite }, 'package.published-' + p.id, le)
    })
    alerter(e, 'paquet', 'maintenant', 'Nouveau paquet disponible', `Un colis prêt chez ${ACTEURS_DEMO.vendeur.point} pour le ${RELAIS_DEMO.nom} : à accepter avant 15 min.`, 'paquets')
  }
}

/** Étape 7 : un retour du client déposé au relais (pont) devient une course de retour publiée (relais → boutique). */
function appliquerRetours(evts: Evenement[]) {
  for (const e of evts) {
    if (e.type !== 'return.dropped' || !/^BLV-\d+-\d+$/.test(e.colis) || Number(e.colis.split('-')[1]) < 50000) continue
    const le = maintenant()
    paquetsDemo.ecrire((s) => {
      if (s.paquets.some((p) => p.genre === 'retour' && p.colis.some((c) => c.etiquette === e.colis))) return
      let rang = 20
      while (s.paquets.some((p) => p.id === paquetDuJour('Z1', rang))) rang++
      const p = paquetDeRetour({ id: paquetDuJour('Z1', rang), colis: e.colis, classe: 'M', relais: 'r-z1', boutique: ACTEURS_DEMO.vendeur.lieu, le })
      s.paquets.unshift(p)
      COLIS_CLIENT.ecrire((x) => void (x.colis.includes(e.colis) || x.colis.push(e.colis)))
      publier({ type: 'package.published', paquet: p.id, zone: p.zone, colis: [e.colis], heureLimite: p.heureLimite }, 'package.published-' + p.id, le)
    })
    alerter(e, 'paquet', 'maintenant', 'Course de retour disponible', `Un retour déposé au ${RELAIS_DEMO.nom} pour ${ACTEURS_DEMO.vendeur.point} : à accepter avant 15 min.`, 'paquets')
  }
}

const TYPES: Record<string, ArretPont['type']> = { ramassage: 'ramassage', depot: 'relais', remise: 'domicile' }
/** L'entreprise affecte un paquet à Serge A. (ou le lui retire) : le livreur le reçoit, arrêts et colis compris. */
export function annoncerAffectation(p: PaquetDemo, avant: string | null, le: number) {
  if (p.livreurId === LIVREUR_DEMO && avant !== LIVREUR_DEMO) {
    const paquet: PaquetPont = {
      genre: p.genre === 'domicile' ? 'domicile' : p.genre === 'retour' ? 'retour' : 'relais',
      zone: `${p.zone} ${LIEUX[p.arrets[0].lieu]?.quartier ?? ''}`.trim(),
      heureLimite: p.heureLimite,
      distanceKm: p.distanceKm,
      arrets: p.arrets.map((a, k) => ({
        id: `${p.id}#${k}`,
        type: p.genre === 'retour' && a.sens === 'remise' ? 'retour' : p.genre === 'retour' && LIEUX[a.lieu]?.type === 'relais' ? 'collecte' : (TYPES[a.sens] ?? 'ramassage'),
        nom: LIEUX[a.lieu]?.nom || 'Remise à domicile',
        quartier: LIEUX[a.lieu]?.quartier ?? '',
        colis: p.colis.filter((c) => c.arret === k || (a.sens !== 'ramassage' && p.arrets[c.arret]?.sens === 'ramassage')).map((c) => ({ id: c.etiquette, classe: c.classe, valeur: c.valeur, fragile: !!c.fragile })),
        creneau: k === 0 && p.creneau ? [hm(p.creneau.debut), hm(p.creneau.fin)] : null,
        position: LIEUX[a.lieu] ? { lat: LIEUX[a.lieu].lat, lng: LIEUX[a.lieu].lng } : null,
        repere: null,
      })),
    }
    publier({ type: 'affectation', paquetId: p.id, paquet }, `affectation-${p.id}-${le}`, le)
    // Les colis des commandes du client (pont commun) : le vendeur, le client et le relais voient le livreur affecté.
    const colis = p.colis.map((c) => c.etiquette).filter((x) => COLIS_CLIENT.lire().colis.includes(x))
    if (colis.length)
      publier(
        { type: 'package.assigned', paquet: p.id, colis, livreur: LIVREUR_DEMO, entreprise: ACTEURS_DEMO.entreprise.id, creneau: p.creneau ? [hm(p.creneau.debut), hm(p.creneau.fin)] : null, relais: p.relais ? RELAIS_DEMO.id : null },
        `package.assigned-${p.id}-${le}`,
        le,
      )
  } else if (avant === LIVREUR_DEMO && p.livreurId !== LIVREUR_DEMO) publier({ type: 'retrait', paquetId: p.id }, `retrait-${p.id}-${le}`, le)
}
PONT.affectation = annoncerAffectation
const hm = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })

/** Décision de l'entreprise sur un incident de Serge A. : le livreur la voit dans son suivi. */
export function annoncerDecision(i: Incident, decision: 'valide' | 'refuse', motif: string | null, par: string, le: number) {
  if (i.livreur.id === LIVREUR_DEMO) publier({ type: 'decision', id: i.id, decision, motif, par }, `decision-${i.id}`, le)
}
PONT.decision = annoncerDecision
