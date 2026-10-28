// DONNÉES DE DÉMONSTRATION — la File d'action : une carte par dossier qui attend un humain, dans TOUTES les files de
// travail de la console (vérifications d'identité, candidatures, litiges niveaux 1 et 2, retours, remboursements,
// départs échus, pièces à contrôler, retenues de kit contestées, alertes de fraude, quatre yeux…), plus les événements
// partagés par l'entreprise et le livreur (src/demo/pont.ts : kit contesté, incident bloquant, départ, pièce envoyée).
// La source filtre par rôle (cartes de son métier ; une décision à quatre yeux n'arrive jamais à celui qui l'a
// demandée) et par zone (ADM-ROL-03), puis trie : retards d'abord, échéance, montant (ADM-P02R-01).
import { pageOuverte } from '../config/droits'
import { jourDe } from '../calculs/temps'
import { PARAMETRES } from '../calculs/registre'
import type { Role } from '../donnees/communs'
import type { CarteAction, Delegue, DomaineFiles, FamilleCarte, Verrou } from '../donnees/domaines/files'
import { REGLES_S1 } from '../pages/ADM-03/regles'
import { maintenant } from './horloge'
import { agentCourant, auPerimetre, dansPerimetre, exigerPage, roleCourant } from './acces'
import { argent, commandesBrutes } from './commandes'
import { decisionsEnAttente } from './quatreyeux'
import { AGENTS, HEURE, JOUR, T, nomAgent } from './jeu-essai'
import { kycARevoir, paliersAValider, sanctionsAOuvrir } from './acteurs'
import { argentDemo, lotsDuCycle, remboursementsVus } from './argent'
import { offresAModerer } from './catalogue'
import { critiquesNonDelivres, demandesSupport, incidentsActifs } from './communication'
import { aTraiterAcces } from './equipe'
import { alertesVivantes, comptesAEquipe, demandesOuvertes } from './gouvernance'
import { etatsLogistique } from './logistique'
import { tachesEnEchec } from './systeme-s6'
import { journaliser } from './journal'
import { delaiMedian, litigesOuverts } from './litiges'
import { evenementsPour } from './pont'
import { magasin, repondre } from './stockage'

const R = REGLES_S1

/** Rôles qui traitent chaque file (la Direction voit tout ; l'Audit, les alertes de fraude). */
export const ROLES_FAMILLE: Record<FamilleCarte, Role[]> = {
  litige: ['superviseur', 'support'],
  recours: ['superviseur', 'mediation'],
  remboursement: ['superviseur', 'finance'],
  finance: ['superviseur', 'finance'],
  kyc: ['superviseur', 'verification'],
  candidature: ['superviseur', 'operations', 'verification'],
  piece: ['superviseur', 'verification'],
  moderation: ['superviseur', 'verification'],
  score: ['superviseur', 'mediation'],
  sanction: ['superviseur', 'mediation'],
  support: ['superviseur', 'support'],
  messagerie: ['superviseur', 'support'],
  livraison: ['superviseur', 'operations'],
  retour: ['superviseur', 'operations'],
  relais: ['superviseur', 'operations'],
  panne: ['superviseur', 'operations'],
  depart: ['superviseur', 'operations'],
  kit: ['superviseur', 'operations', 'mediation'], // la Médiation décide (ADM-CACHEE-03) : page Livreurs, part « Retenues de kit contestées »
  fraude: ['superviseur', 'mediation', 'audit'],
  equipe: ['superviseur', 'rh'],
  systeme: ['superviseur'],
  quatreyeux: [],
}

export const filesDemo = magasin<{ verrous: Record<string, Verrou>; confiees: Record<string, { agentId: string; nom: string }> }>('files', () => ({
  verrous: { 'CA-SP-0207': { agentId: 'a-clarisse', agent: 'Clarisse Mvondo', role: 'support', depuis: T(-4), jusqua: T(-4) + R.verrouMin * 60_000 } },
  confiees: {},
}))

type Brute = Omit<CarteAction, 'verrou' | 'confieA'> & { roles: Role[]; premier?: string }

/**
 * Toutes les cartes, lues dans l'état RÉEL de chaque domaine (une décision prise ailleurs fait disparaître sa carte à
 * la lecture suivante) : litiges, argent, acteurs, catalogue, logistique, communication, pilotage, gouvernance,
 * système, quatre yeux, et ce que l'entreprise et le livreur ont publié au pont.
 */
function cartes(): Brute[] {
  const c: Brute[] = []
  const r = (f: FamilleCarte) => ROLES_FAMILLE[f]
  const n = maintenant()
  // Litiges (S1)
  for (const l of litigesOuverts()) {
    if (l.attente) continue // la décision attend un second validateur : c'est la carte Quatre yeux qui la porte
    const f = l.niveau === 2 ? 'recours' : 'litige'
    const roles = (['superviseur', 'support', 'mediation', 'operations', 'audit'] as Role[]).filter((x) => l.voir(x) && x !== 'audit')
    c.push({ id: 'CA-' + l.id, famille: f, titre: `${l.commande} · « ${l.motif} »`, sous: `${l.id} · ${l.vendeur} · ${l.client} · niveau ${l.niveau}`, objet: l.id, route: 'litige', params: { id: l.id }, zone: l.zone, echeance: l.echeance, montant: l.montantEnJeu, alerte: l.alerte ?? undefined, creeeLe: l.ouvertLe, roles })
  }
  // Argent (S2) : remboursements décidés à exécuter, lots à contrôler, dettes de relais reportées, cartes de la Finance.
  for (const x of remboursementsVus().filter((y) => y.etat === 'decide'))
    c.push({ id: 'CA-' + x.id, famille: 'remboursement', titre: `${x.id} · remboursement à exécuter`, sous: `${x.commande} · ${x.motif} · vers ${x.moyen}`, objet: x.id, route: 'remboursements', params: { id: x.id }, zone: null, echeance: null, montant: x.montant, creeeLe: x.decideLe, roles: r('remboursement') })
  for (const l of lotsDuCycle()) {
    if (l.etat === 'controle_requis')
      c.push({ id: 'CA-' + l.id, famille: 'finance', titre: `${l.id} · lot à contrôler avant l’envoi`, sous: `${l.beneficiaire} · ${l.sous}`, objet: l.id, route: 'versements', params: { id: l.id }, zone: null, echeance: null, montant: l.verse, creeeLe: n, roles: r('finance') })
    if (l.reports > 0 && !l.plan)
      c.push({ id: 'CA-D-' + l.id, famille: 'finance', titre: `${l.beneficiaire} · dette reportée (${l.reports} vendredi(s))`, sous: 'Espèces de garde au-delà des gains : report, puis plan d’apurement', objet: l.id, route: 'versements', params: { id: l.id }, zone: null, echeance: null, montant: l.dette, creeeLe: n, roles: r('finance') })
  }
  for (const x of argentDemo.lire().cartes)
    c.push({ id: 'CA-' + x.id, famille: 'finance', titre: `${x.objet} · carte de la Finance`, sous: x.texte, objet: x.objet, route: 'rapprochement', params: { id: x.objet }, zone: null, echeance: null, montant: null, creeeLe: x.le, roles: ['superviseur'] })
  // Quatre yeux (une carte n'arrive jamais à celui qui a demandé)
  for (const d of decisionsEnAttente())
    c.push({ id: 'CA-' + d.id, famille: 'quatreyeux', titre: `${d.id} · validation attendue`, sous: `${d.resume} · demandé par ${d.premier.agent}`, objet: d.objet, route: 'quatreyeux', params: { id: d.id }, zone: null, echeance: d.expireLe, montant: d.montant, creeeLe: d.premier.le, roles: d.rolesSecond, premier: d.premier.agentId })
  // Acteurs et catalogue (S3)
  for (const k of kycARevoir())
    c.push({ id: 'CA-' + k.id, famille: 'kyc', titre: `${k.id} · identité à vérifier`, sous: `${k.acteur} · ${k.organisation} · ${k.pieces.length} pièces`, objet: k.id, route: 'kyc', params: { id: k.id }, zone: k.zone, echeance: k.deposeLe + R.kycHumainH * HEURE, montant: null, creeeLe: k.deposeLe, roles: r('kyc') })
  for (const p of paliersAValider())
    c.push({ id: 'CA-' + p.id, famille: 'score', titre: `${p.id} · ${p.etat === 'contestee' ? 'palier contesté' : 'palier à valider'}`, sous: `${p.acteur} : ${p.de} → ${p.vers} · validation humaine et motif`, objet: p.id, route: 'paliers', params: { id: p.id }, zone: null, echeance: p.echeance, montant: null, creeeLe: p.creeeLe, roles: r('score') })
  for (const x of sanctionsAOuvrir().filter((y) => y.etat !== 'quatre_yeux'))
    c.push({ id: 'CA-' + x.id, famille: 'sanction', titre: `${x.id} · ${x.etat === 'recours' ? 'recours à décider' : `sanction de niveau ${x.niveau} proposée`}`, sous: `${x.acteur} · ${x.origine}`, objet: x.id, route: 'sanctions', params: { id: x.id }, zone: x.zone, echeance: null, montant: null, creeeLe: x.recours?.le ?? x.historique[0]?.le ?? n, roles: r('sanction') })
  for (const o of offresAModerer())
    c.push({ id: 'CA-' + o.id, famille: 'moderation', titre: `${o.id} · offre à modérer`, sous: `${o.titre} · ${o.vendeur}`, objet: o.id, route: 'moderation', params: { id: o.id }, zone: null, echeance: null, montant: null, creeeLe: o.signaleeLe, roles: r('moderation') })
  // Logistique (S4) : paquets, relais, départs (jeu et pont), retenues contestées, candidatures
  const lg = etatsLogistique()
  for (const x of lg.paquets.filter((y) => y.etat === 'en_retard' || y.etat === 'incident'))
    c.push({ id: 'CA-' + x.id, famille: 'livraison', titre: `${x.id} · ${x.etat === 'en_retard' ? 'heure limite proche ou dépassée' : 'incident déclaré'}`, sous: `${x.entreprise ?? '—'} · ${x.livreur ?? '—'} · ${x.colis} colis · ${x.destination}`, objet: x.id, route: 'paquets', params: { id: x.id }, zone: x.zone, echeance: x.heureLimite, montant: null, creeeLe: x.publieLe ?? x.heureLimite - 3 * HEURE, roles: r('livraison') })
  for (const x of lg.paquets.filter((y) => y.etat === 'sans_preneur'))
    c.push({ id: 'CA-' + x.id, famille: x.genre === 'retour' ? 'retour' : 'livraison', titre: `${x.id} · ${x.genre === 'retour' ? 'retour sans preneur' : 'paquet sans preneur'}`, sous: `${x.colis} colis · publié, aucune entreprise ne l’a accepté`, objet: x.id, route: 'paquets', params: { id: x.id }, zone: x.zone, echeance: x.heureLimite, montant: null, creeeLe: x.publieLe ?? n, roles: r(x.genre === 'retour' ? 'retour' : 'livraison') })
  for (const x of lg.relais.filter((y) => (y.statut === 'sature' && !y.bascule) || (y.statut === 'ferme' && !y.fermeture?.transfert)))
    c.push({ id: 'CA-' + x.id, famille: 'relais', titre: `${x.nom} · ${x.statut === 'sature' ? `saturé (${x.taux} %)` : 'fermé sans prévenir'}`, sous: x.secours ? `Secours le plus proche : ${x.secours.nom} (${x.secours.distanceKm} km)` : 'Aucun relais de secours sous le seuil', objet: x.id, route: 'relais', params: { id: x.id }, zone: x.zone, echeance: null, montant: null, alerte: undefined, creeeLe: x.fermeture?.depuis ?? n, roles: r('relais') })
  for (const d of lg.departs) {
    if (d.etat === 'echu')
      c.push({ id: 'CA-' + d.id, famille: 'depart', titre: `Départ échu sans clôture · ${d.livreur}`, sous: `${d.entreprise} · préavis fini · kit non constaté · aucun colis sous sa garde`, objet: d.id, route: 'livreurs', params: { depart: d.id }, zone: d.zones[0] ?? null, echeance: d.constatJusqua, montant: null, creeeLe: d.demandeLe, roles: r('depart') })
    if (d.contestation && !d.contestation.decision && !d.clos)
      c.push({ id: 'CA-K-' + d.id, famille: 'kit', titre: `Retenue de kit contestée · ${d.livreur}`, sous: `${d.entreprise} · ${d.contestation.motif}`, objet: d.id, route: 'livreurs', params: { depart: d.id }, zone: d.zones[0] ?? null, echeance: d.contestation.le + R.kitConstatH * HEURE, montant: d.kit.retenue || null, creeeLe: d.contestation.le, roles: r('kit') })
  }
  for (const x of lg.candidatures.filter((y) => y.etat === 'nouvelle' || y.etat === 'prise'))
    c.push({ id: 'CA-' + x.id, famille: 'candidature', titre: `${x.id} · candidature ${x.genre === 'relais' ? 'd’un relais' : 'd’une entreprise'} à prendre en charge`, sous: `${x.nom} · ${x.responsable}${x.prisePar ? ` · prise par ${x.prisePar}` : ''}`, objet: x.id, route: 'candidatures', params: { id: x.id }, zone: x.zone, echeance: x.deposeLe + R.kycHumainH * HEURE, montant: null, creeeLe: x.deposeLe, roles: r('candidature') })
  // Communication (S5) : support, messages critiques non délivrés, panne en cours
  for (const t of demandesSupport())
    c.push({ id: 'CA-' + t.id, famille: 'support', titre: `${t.id} · ${t.sujet}`, sous: `${t.de} · espace ${t.espace}`, objet: t.id, route: 'support', params: { id: t.id }, zone: null, echeance: t.ouvertLe + R.supportH * HEURE, montant: null, creeeLe: t.ouvertLe, roles: r('support') })
  for (const e of critiquesNonDelivres())
    c.push({ id: 'CA-' + e.id, famille: 'messagerie', titre: `${e.evenement} · message critique non délivré`, sous: `${e.objet} · ${e.destinataire}`, objet: e.id, route: 'messagerie', params: { id: e.id }, zone: null, echeance: e.echeanceCarte, montant: null, creeeLe: e.le, roles: r('messagerie') })
  for (const i of incidentsActifs().filter((x) => x.etat !== 'retabli'))
    c.push({ id: 'CA-' + i.id, famille: 'panne', titre: `${i.id} · ${i.service}`, sous: `Panne en cours · ${i.zones.join(', ')}${i.etat === 'papier' ? ' · mode papier' : ''}`, objet: i.id, route: 'panne', params: { id: i.id }, zone: i.zones[0] ?? null, echeance: null, montant: null, alerte: undefined, creeeLe: i.declareLe, roles: r('panne') })
  // Gouvernance et système (S6) : alertes nouvelles, gels à revoir, demandes de données proches de l'échéance, tâches en échec
  for (const a of alertesVivantes()) {
    if (a.etat === 'nouvelle')
      c.push({ id: 'CA-' + a.id, famille: 'fraude', titre: `${a.id} · alerte de fraude (${a.niveau})`, sous: `${a.comptes.map((x) => x.nom).join(', ')} · aucune sanction avant décision humaine`, objet: a.id, route: 'fraude', params: { id: a.id }, zone: a.zone, echeance: null, montant: a.montant, creeeLe: a.detecteeLe, roles: r('fraude') })
    if (a.etat === 'gel' && a.gel?.revueLe && a.gel.revueLe <= n + JOUR)
      c.push({ id: 'CA-G-' + a.id, famille: 'fraude', titre: `${a.id} · gel à revoir`, sous: `${a.gel.vendeur} · versements retenus · revue obligatoire`, objet: a.id, route: 'fraude', params: { id: a.id }, zone: a.zone, echeance: a.gel.revueLe, montant: a.gel.montant, creeeLe: a.gel.appliqueLe ?? n, roles: ['superviseur', 'mediation'] })
  }
  for (const d of demandesOuvertes().filter((x) => x.echeance - n < 7 * JOUR))
    c.push({ id: 'CA-' + d.id, famille: 'systeme', titre: `${d.id} · demande de données à répondre`, sous: `${d.acteur} · loi n° 2024/017`, objet: d.id, route: 'conservation', params: { id: d.id }, zone: null, echeance: d.echeance, montant: null, creeeLe: d.recueLe, roles: r('systeme') })
  // Comptes des employés (Ressources humaines, ADM-P32) : suspendu pour inactivité, invitation sans suite, revue.
  for (const e of comptesAEquipe())
    c.push({ id: `CA-E-${e.motif}-${e.id}`, famille: 'equipe', titre: `${e.nom} · ${e.motif === 'suspendu' ? 'compte suspendu (inactif)' : e.motif === 'invitation' ? 'invitation sans suite' : 'rôle à confirmer (revue trimestrielle)'}`, sous: e.motif === 'suspendu' ? 'Réactiver sur motif, ou fermer l’accès si l’employé est parti' : e.motif === 'invitation' ? 'Relancer l’invitation ou la retirer' : 'Confirmer le rôle et le périmètre, ou les réduire', objet: e.id, route: 'roles', params: { id: e.id }, zone: null, echeance: e.echeance, montant: null, creeeLe: e.depuis, roles: r('equipe') })
  // Alertes aux administrateurs sur les accès (ACCES-CONSOLE § 6) : inactif, accès temporaire qui finit, conflit,
  // connexions refusées répétées, revue en retard, accès d'urgence à revoir ; Direction et Accès et personnel.
  for (const a of aTraiterAcces().alertes)
    c.push({ id: 'CA-A-' + a.id, famille: 'equipe', titre: a.titre, sous: a.sous, objet: a.membreId ?? a.id, route: a.membreId && a.genre !== 'urgence_a_revoir' ? 'membre' : 'roles', params: a.membreId && a.genre !== 'urgence_a_revoir' ? { id: a.membreId } : { onglet: 'alertes' }, zone: null, echeance: a.echeance, montant: null, creeeLe: a.le, roles: a.genre === 'urgence_a_revoir' ? ['superviseur'] : r('equipe') })
  for (const t of tachesEnEchec())
    c.push({ id: 'CA-T-' + t.nom, famille: 'systeme', titre: `Tâche en échec · ${t.nom}`, sous: t.derniere?.erreur ?? t.quoi, objet: t.nom, route: 'taches', params: { id: t.nom }, zone: null, echeance: null, montant: null, creeeLe: t.derniere?.debut ?? n, roles: r('systeme') })
  // Pont : ce que l'entreprise et le livreur viennent de faire et qui attend la console (les départs et les
  // contestations du pont sont lus par la logistique, ci-dessus).
  for (const e of evenementsPour('admin')) {
    if (e.type === 'incident' && e.bloquant)
      c.push({ id: 'CA-P-' + e.cle, famille: 'livraison', titre: 'Incident bloquant déclaré', sous: e.note, objet: e.paquetId ?? e.id, route: 'paquets', params: e.paquetId ? { id: e.paquetId } : undefined, zone: null, echeance: e.le, montant: null, creeeLe: e.le, roles: r('livraison') })
    if (e.type === 'piece_envoyee')
      c.push({ id: 'CA-P-' + e.cle, famille: 'piece', titre: `Pièce à contrôler · ${e.piece === 'cni' ? 'pièce d’identité' : e.piece === 'selfie' ? 'nouvelle photo' : 'permis'}`, sous: 'Envoyée par un livreur depuis son application', objet: e.cle, route: 'kyc', params: { piece: e.cle }, zone: null, echeance: e.le + R.kycHumainH * HEURE, montant: null, creeeLe: e.le, roles: r('piece') })
  }
  return c
}

const ARGENT: Role[] = ['superviseur', 'finance', 'support', 'mediation', 'audit']

/** Ordre ADM-P02R-01 : retards d'abord (le plus en retard en tête), puis échéance, puis montant décroissant. */
export function trier<T extends { echeance: number | null; montant: number | null; creeeLe: number }>(l: T[], n: number): T[] {
  const cle = (c: T) => (c.echeance === null ? Infinity : c.echeance - n)
  return [...l].sort((a, b) => cle(a) - cle(b) || (b.montant ?? 0) - (a.montant ?? 0) || a.creeeLe - b.creeeLe)
}

/** Cartes visibles du rôle courant, dans son périmètre, triées (une décision à quatre yeux jamais à son auteur). */
export function fileDuRole(): CarteAction[] {
  const r = roleCourant()
  const moi = agentCourant().id
  const n = maintenant()
  const etat = filesDemo.lire()
  const l = auPerimetre(cartes().filter((c) => (c.roles.includes(r) || etat.confiees[c.id]?.agentId === moi) && c.premier !== moi))
  return trier(
    l.map(({ roles: _r, premier: _p, ...c }) => {
      const v = etat.verrous[c.id]
      return { ...c, montant: ARGENT.includes(r) ? c.montant : null, verrou: v && v.jusqua > n ? v : null, confieA: etat.confiees[c.id]?.nom ?? null }
    }),
    n,
  )
}

export const demoFiles: DomaineFiles = {
  async file() {
    exigerPage('file', 'File d’action')
    return repondre(fileDuRole())
  },
  async indicateurs() {
    exigerPage('file', 'File d’action')
    const r = roleCourant()
    const n = maintenant()
    const lit = litigesOuverts().filter((l) => l.voir(r))
    const med = delaiMedian()
    const argentOk = ['superviseur', 'finance', 'audit'].includes(r)
    const cmd = commandesBrutes().filter((c) => dansPerimetre(c.zone))
    const jour = cmd.filter((c) => jourDe(c.payeeLe) === jourDe(n))
    const zones = PARAMETRES.zonesExploitees.map((z) => z.code).filter((z) => dansPerimetre(z))
    const lg = etatsLogistique()
    const alerte = zones.filter((z) => lg.paquets.some((p) => p.zone === z && (p.etat === 'en_retard' || p.etat === 'incident')) || lg.relais.some((x) => x.zone === z && x.taux >= R.relaisAlertePct))
    return repondre({
      litigesOuverts: lit.length,
      litigesVeille: lit.filter((l) => l.ouvertLe <= n - 24 * HEURE).length,
      delaiMedianH: med.h,
      decides7j: med.n,
      coutSmsParCommande: null,
      zonesEnAlerte: alerte.length,
      zonesExploitees: zones.length,
      jour: {
        commandes: jour.length,
        valeur: argentOk ? jour.reduce((s, c) => s + c.total, 0) : null,
        revenus: argentOk ? jour.reduce((s, c) => s + argent(c).revenus, 0) : null,
        escrow: argentOk ? cmd.filter((c) => ['payee', 'preparation', 'en_route', 'au_relais', 'litige'].includes(c.etat)).reduce((s, c) => s + c.total, 0) : null,
        paquetsPublies: lg.paquets.filter((p) => dansPerimetre(p.zone) && p.etat === 'publie').length,
        sansPreneur: lg.paquets.filter((p) => dansPerimetre(p.zone) && p.etat === 'sans_preneur').length,
        piecesKyc: pageOuverte('kyc', r) ? kycARevoir().length : 0,
      },
    })
  },
  async ouvrir(id) {
    exigerPage('file', 'File d’action')
    if (!fileDuRole().some((c) => c.id === id)) return { ok: false, raison: 'inconnue' }
    const a = agentCourant()
    const n = maintenant()
    const v = filesDemo.lire().verrous[id]
    if (v && v.jusqua > n && v.agentId !== a.id) return { ok: false, raison: 'verrouillee' }
    const verrou: Verrou = { agentId: a.id, agent: nomAgent(a), role: roleCourant(), depuis: v?.agentId === a.id ? v.depuis : n, jusqua: n + R.verrouMin * 60_000 }
    filesDemo.ecrire((e) => void (e.verrous[id] = verrou))
    if (!v || v.agentId !== a.id || v.jusqua <= n) await journaliser({ action: 'dossier.verrouiller', objet: id })
    return { ok: true, verrou }
  },
  async liberer(id) {
    const v = filesDemo.lire().verrous[id]
    if (!v || v.agentId !== agentCourant().id) return
    filesDemo.ecrire((e) => void delete e.verrous[id])
    await journaliser({ action: 'dossier.liberer', objet: id })
  },
  async delegues() {
    exigerPage('file', 'File d’action')
    const moi = agentCourant().id
    return repondre(
      AGENTS.filter((a) => a.id !== moi).map((a) => ({ agentId: a.id, nom: nomAgent(a), role: a.roles[0], familles: (Object.keys(ROLES_FAMILLE) as FamilleCarte[]).filter((f) => a.roles.some((x) => ROLES_FAMILLE[f].includes(x))) })).filter((d: Delegue) => d.familles.length > 0),
    )
  },
  async deleguer(ids, agentId, motif) {
    exigerPage('file', 'File d’action')
    if (motif.trim().length < PARAMETRES.console.motifMin) return { ok: false, raison: 'motif_court' }
    const a = AGENTS.find((x) => x.id === agentId)
    if (!a) return { ok: false, raison: 'inconnu' }
    const mes = new Map(fileDuRole().map((c) => [c.id, c]))
    // Seules les cartes que l'agent peut traiter (son métier) lui sont confiées ; les autres restent ici.
    const ok = ids.filter((id) => mes.has(id) && a.roles.some((x) => ROLES_FAMILLE[mes.get(id)!.famille].includes(x)))
    filesDemo.ecrire((e) => ok.forEach((id) => (e.confiees[id] = { agentId: a.id, nom: nomAgent(a) })))
    for (const id of ok) await journaliser({ action: 'carte.deleguer', objet: `${id} → ${nomAgent(a)}`, motif: motif.trim() })
    return { ok: true, n: ok.length }
  },
}
