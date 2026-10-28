// DONNÉES DE DÉMONSTRATION — domaine « messages » : les fils de Serge le 13 octobre à volume normal (entreprise,
// support, fils de la mission PQ-Z1-261013-003, fils fermés de la tournée du matin et du retour, fils ouverts des
// paquets du soir, fils fermés des jours précédents). Le masquage, la fermeture des fils et l'ouverture de la ligne d'appel
// sont ceux du serveur (règles du domaine) ; chaque appel est écrit au journal (métadonnées seulement).
import { minutesDuJour } from '../calculs/temps'
import type { Appel, DomaineMessages, Fil, Message } from '../donnees/domaines/messages'
import { REJOUEURS, demoHorsLigne, entier, journaliserEnvoye, parametre } from './horsligne'
import { maintenant } from './horloge'
import { h } from './jeu-essai'
import { etatTournee } from './tournee'
import { magasin, repondre } from './stockage'
import { signaler } from './pont-console'

const JOUR_MS = 24 * 3600 * 1000
const f = (x: Omit<Fil, 'etat' | 'enRevue' | 'appel' | 'fermeA'> & { finMission?: number }): Fil & { finMission?: number } => ({ etat: 'ouvert', enRevue: false, appel: 'ouvert', fermeA: null, ...x })

/** Fils (la session compte les non lus) ; finMission : fin de la mission d'un fil de mission. */
export const etatMessages = magasin<(Fil & { finMission?: number })[]>('messages', () => [
  f({ id: 'F1', titre: 'Yafé Express · répartition', interlocuteur: 'entreprise', mission: null, arretId: null, dernier: { texte: 'Arrêt 2 : le vendeur est prévenu de votre arrivée.', quand: h(13, 58) }, nonLus: 1 }),
  f({ id: 'F3', titre: 'Support livreur BelivaY', interlocuteur: 'support', mission: null, arretId: null, dernier: { texte: 'Bienvenue dans votre espace livreur.', quand: h(8, 0) }, nonLus: 0 }),
  f({ id: 'F2', titre: 'Maison Ngono', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-003', arretId: 'A2', dernier: { texte: 'Je suis devant la boutique', quand: h(14, 1) }, nonLus: 0 }),
  f({ id: 'F4', titre: 'Tech Bastos', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-003', arretId: 'A1', dernier: { texte: 'Je descends avec les colis.', quand: h(13, 0) }, nonLus: 0, finMission: h(13, 24) }),
  f({ id: 'F5', titre: 'Relais Bastos Carrefour', interlocuteur: 'relais', mission: 'PQ-Z1-261013-003', arretId: 'A3', dernier: { texte: 'Fil ouvert à l’affectation du paquet.', quand: h(12, 41) }, nonLus: 0 }),
  f({ id: 'F6', titre: 'Client · Bastos', interlocuteur: 'client', mission: 'PQ-Z1-261013-003', arretId: 'A4', dernier: { texte: 'Fil ouvert à l’affectation du paquet.', quand: h(12, 41) }, nonLus: 0 }),
  f({ id: 'F7', titre: 'Sapeur Mode', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-007', arretId: null, dernier: { texte: 'Le colis L est prêt, il est lourd : prévoyez la place.', quand: h(14, 3) }, nonLus: 0 }),
  f({ id: 'F8', titre: 'Pharma Beauté', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-011', arretId: null, dernier: { texte: 'Fil ouvert à l’affectation du paquet.', quand: h(13, 49) }, nonLus: 0 }),
  f({ id: 'F10', titre: 'Bastos Mode', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-001', arretId: null, dernier: { texte: 'Merci Serge, bonne journée.', quand: h(9, 56) }, nonLus: 0, finMission: h(11, 10) }),
  f({ id: 'F11', titre: 'Chez Mama Ewondo', interlocuteur: 'vendeur', mission: 'PQ-Z1-261013-010', arretId: null, dernier: { texte: 'Bien reçu le colis retourné, merci.', quand: h(12, 8) }, nonLus: 0, finMission: h(12, 10) }),
  f({ id: 'F12', titre: 'Relais Bastos Carrefour', interlocuteur: 'relais', mission: 'PQ-Z1-261013-001', arretId: null, dernier: { texte: 'Lot de 4 colis contrôlé, tout est en place.', quand: h(11, 8) }, nonLus: 0, finMission: h(11, 10) }),
  f({ id: 'F13', titre: 'Client · Etoa-Meki', interlocuteur: 'client', mission: 'PQ-Z1-261012-007', arretId: null, dernier: { texte: 'Reçu, merci beaucoup !', quand: h(17, 2) - JOUR_MS }, nonLus: 0, finMission: h(17, 5) - JOUR_MS }),
  f({ id: 'F14', titre: 'Mokolo Pagnes', interlocuteur: 'vendeur', mission: 'PQ-Z3-261009-001', arretId: null, dernier: { texte: 'Les 3 colis sont emballés, je vous attends.', quand: h(7, 52) - 4 * JOUR_MS }, nonLus: 0, finMission: h(10, 40) - 4 * JOUR_MS }),
  f({ id: 'F9', titre: 'Afrik Déco', interlocuteur: 'vendeur', mission: 'PQ-Z1-261010-004', arretId: null, dernier: { texte: 'Merci, à la prochaine !', quand: h(16, 12) - 2 * JOUR_MS }, nonLus: 0, finMission: h(16, 20) - 2 * JOUR_MS }),
])

const m = (id: string, de: Message['de'], texte: string, quand: number): Message => ({ id, de, texte, quand, etat: 'envoye', masque: false, signale: false })
const OUVERTURE = 'Fil ouvert à l’affectation du paquet. Il se ferme 2 h après la fin de la mission ; la console peut le lire en cas de litige.'
const etatContenu = magasin<Record<string, Message[]>>('messages_contenu', () => ({
  F1: [
    m('F1-a', 'eux', 'Bonjour Serge. Votre kit est prêt à l’agence de Bastos : 12 S, 9 M, 3 C1 et un rouleau neuf.', h(7, 40)),
    m('F1-b', 'moi', 'Bien reçu', h(7, 46)),
    m('F1-c', 'eux', 'Course de retour PQ-Z1-261013-010 ajoutée : le colis de Chez Mama Ewondo est au relais.', h(10, 58)),
    m('F1-d', 'moi', 'Je suis en route', h(11, 18)),
    m('F1-1', 'eux', 'Bonjour Serge. Paquet PQ-Z1-261013-003 affecté : 4 arrêts à Bastos. Bonne tournée !', h(12, 41)),
    m('F1-2', 'moi', 'Bien reçu', h(12, 44)),
    m('F1-e', 'eux', 'Ce soir après votre tournée : PQ-Z1-261013-011 (5 vendeurs), puis deux courses à domicile.', h(13, 50)),
    m('F1-3', 'eux', 'Arrêt 2 : le vendeur est prévenu de votre arrivée.', h(13, 58)),
  ],
  F3: [m('F3-1', 'eux', 'Bienvenue dans votre espace livreur.', h(8, 0))],
  F2: [m('F2-0', 'systeme', OUVERTURE, h(12, 41)), m('F2-1', 'eux', 'Les deux colis sont prêts au comptoir.', h(13, 40)), m('F2-2', 'moi', 'Je suis devant la boutique', h(14, 1))],
  F4: [m('F4-0', 'systeme', OUVERTURE, h(12, 41)), m('F4-1', 'moi', 'Je suis devant la boutique', h(12, 58)), m('F4-2', 'eux', 'Je descends avec les colis.', h(13, 0))],
  F5: [m('F5-0', 'systeme', OUVERTURE, h(12, 41))],
  F6: [m('F6-0', 'systeme', 'Le client voit votre prénom, votre photo et l’heure estimée, jamais votre numéro. L’appel s’ouvre quand vous partez vers lui.', h(12, 41))],
  F7: [m('F7-0', 'systeme', OUVERTURE, h(13, 58)), m('F7-1', 'eux', 'Le colis L est prêt, il est lourd : prévoyez la place.', h(14, 3))],
  F8: [m('F8-0', 'systeme', OUVERTURE, h(13, 49))],
  F10: [m('F10-0', 'systeme', OUVERTURE, h(8, 6)), m('F10-1', 'moi', 'Je suis devant la boutique', h(9, 40)), m('F10-2', 'eux', 'Merci Serge, bonne journée.', h(9, 56))],
  F11: [m('F11-0', 'systeme', OUVERTURE, h(10, 58)), m('F11-1', 'moi', 'J’arrive dans 5 minutes', h(11, 52)), m('F11-2', 'eux', 'Bien reçu le colis retourné, merci.', h(12, 8))],
  F12: [m('F12-0', 'systeme', OUVERTURE, h(8, 6)), m('F12-1', 'moi', 'Je suis devant le relais', h(10, 58)), m('F12-2', 'eux', 'Lot de 4 colis contrôlé, tout est en place.', h(11, 8))],
  F13: [m('F13-1', 'moi', 'J’arrive dans 5 minutes', h(16, 50) - JOUR_MS), m('F13-2', 'eux', 'Reçu, merci beaucoup !', h(17, 2) - JOUR_MS)],
  F14: [m('F14-1', 'eux', 'Les 3 colis sont emballés, je vous attends.', h(7, 52) - 4 * JOUR_MS), m('F14-2', 'moi', 'Je suis devant la boutique', h(8, 31) - 4 * JOUR_MS)],
  F9: [m('F9-1', 'moi', 'Je suis devant la boutique', h(15, 58) - 2 * JOUR_MS), m('F9-2', 'eux', 'Merci, à la prochaine !', h(16, 12) - 2 * JOUR_MS)],
}))
/** Journal des appels (console) : métadonnées seulement. */
export const etatAppels = magasin<Appel[]>('messages_appels', () => [])

const RAPIDES: Record<Fil['interlocuteur'], string[]> = {
  vendeur: ['Je suis devant la boutique', 'J’arrive dans 5 minutes', 'Je suis en retard, j’arrive au plus vite', 'Pour votre sécurité, passez par l’application'],
  relais: ['J’arrive dans 5 minutes', 'Je suis devant le relais', 'Je suis en retard, j’arrive au plus vite', 'Pour votre sécurité, passez par l’application'],
  client: ['J’arrive dans 5 minutes', 'Je suis en retard, j’arrive au plus vite', 'Pour votre sécurité, passez par l’application'],
  entreprise: ['Bien reçu', 'Je suis en route', 'Je suis au relais', 'Je dois faire une pause'],
  support: ['Bien reçu', 'J’ai besoin d’aide pour un incident'],
}

/** Masquage du serveur : numéros, e-mails, identifiants sociaux, liens WhatsApp et codes à 6 chiffres. */
export function masquer(texte: string): { texte: string; masque: boolean } {
  const r = texte
    .replace(/(https?:\/\/)?(wa\.me|chat\.whatsapp\.com|t\.me)\/\S*/gi, '•••')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '•••')
    .replace(/(^|\s)@[\w.]{3,}/g, '$1•••')
    .replace(/\+?\d[\d\s.-]{6,}\d/g, '•••')
    .replace(/\b\d{3}\s?\d{3}\b/g, '•••')
  return { texte: r, masque: r !== texte }
}

const horaires = () => {
  const x = parametre('SUP-HORAIRES', '(\\d+) h – (\\d+) h.*')
  return { de: Number(x[1]), a: Number(x[2]), texte: x[0] }
}

/** État calculé d'un fil à l'instant t : fermeture des fils de mission, ligne d'appel masqué. */
function calculer(x: Fil & { finMission?: number }, t: number): Fil {
  const { finMission, ...fil } = x
  const fermeA = finMission !== undefined ? finMission + entier('LIV-FIL-FERMETURE-H') * 3600_000 : null
  const ferme = fermeA !== null && t >= fermeA
  const tour = etatTournee.lire()
  const arret = tour?.arrets.find((a) => a.id === fil.arretId)
  const mn = minutesDuJour(t)
  const hs = horaires()
  let appel: Fil['appel'] = 'ouvert'
  if (ferme) appel = 'ferme'
  else if (fil.interlocuteur === 'support' && (mn < hs.de * 60 || mn >= hs.a * 60)) appel = 'hors_horaires'
  else if ((fil.interlocuteur === 'client' || fil.interlocuteur === 'relais') && arret && tour?.enCours !== arret.id) appel = arret.etat === 'a_faire' ? 'pas_encore' : 'ferme'
  else if (fil.interlocuteur === 'vendeur' && arret && (arret.etat === 'fait' || arret.etat === 'echec') && finMission === undefined) appel = 'ferme'
  return { ...fil, fermeA, etat: ferme ? 'ferme' : 'ouvert', appel }
}

REJOUEURS.message = (id) => {
  etatContenu.ecrire((c) => {
    for (const l of Object.values(c)) for (const x of l) if (x.id === id) x.etat = 'envoye'
  })
}

export const demoMessages: DomaineMessages = {
  fils() {
    const t = maintenant()
    return repondre(etatMessages.lire().map((x) => calculer(x, t)).sort((a, b) => b.dernier.quand - a.dernier.quand))
  },
  fil(id) {
    const x = etatMessages.lire().find((y) => y.id === id)
    if (!x) return repondre(null)
    const fil = calculer(x, maintenant())
    return repondre({ fil, messages: etatContenu.lire()[id] ?? [], rapides: RAPIDES[fil.interlocuteur], repli: parametre('APPEL-REPLI', '.+')[0], horairesSupport: horaires().texte })
  },
  async marquerLu(id) {
    if (!etatMessages.lire().some((x) => x.id === id && x.nonLus > 0)) return
    etatMessages.ecrire((l) => l.forEach((x) => x.id === id && (x.nonLus = 0)))
  },
  async envoyer(filId, texte, origine, enLigne) {
    const x = etatMessages.lire().find((y) => y.id === filId)
    if (!x || calculer(x, origine.heure).etat === 'ferme') return { ok: false as const, raison: 'fil_ferme' as const }
    if (!texte.trim()) return { ok: false as const, raison: 'vide' as const }
    const mq = masquer(texte.trim())
    const id = `${filId}-${origine.cle.slice(0, 8)}`
    etatContenu.ecrire((c) => void (c[filId] ??= []).push({ id, de: 'moi', texte: mq.texte, quand: origine.heure, etat: enLigne ? 'envoye' : 'en_file', masque: mq.masque, signale: false }))
    etatMessages.ecrire((l) => l.forEach((y) => y.id === filId && (y.dernier = { texte: mq.texte, quand: origine.heure })))
    if (enLigne) journaliserEnvoye('message', id, origine)
    else await demoHorsLigne.mettreEnFile('message', id, origine)
    return { ok: true as const, masque: mq.masque }
  },
  signaler(filId, messageId) {
    const l = etatContenu.lire()[filId] ?? []
    if (l.some((x) => x.id === messageId && x.signale)) return repondre({ ok: false as const, raison: 'deja_signale' as const })
    etatContenu.ecrire((c) => (c[filId] ?? []).forEach((x) => x.id === messageId && (x.signale = true)))
    etatMessages.ecrire((fs) => fs.forEach((y) => y.id === filId && (y.enRevue = true)))
    // Vers la console : le message signalé arrive dans la File d'action (le texte reste ici : charge anonyme).
    signaler('livreur', messageId, 'Message signalé par le livreur', 'normale')
    return repondre({ ok: true as const })
  },
  appeler(cible, origine) {
    const t = origine.heure
    const fils = etatMessages.lire().map((x) => calculer(x, t))
    const fil = cible === 'entreprise' ? fils.find((x) => x.interlocuteur === 'entreprise') : cible === 'support' ? fils.find((x) => x.interlocuteur === 'support') : fils.find((x) => x.id === cible)
    if (!fil) return repondre({ ok: false as const, raison: 'indisponible' as const })
    if (fil.appel === 'ferme') return repondre({ ok: false as const, raison: 'fil_ferme' as const })
    if (fil.appel === 'pas_encore') return repondre({ ok: false as const, raison: 'pas_encore' as const })
    if (fil.appel === 'hors_horaires') return repondre({ ok: false as const, raison: 'hors_horaires' as const })
    const appel: Appel = { id: 'AP-' + origine.cle.slice(0, 8), cible: fil.id, titre: fil.titre, debut: t, fin: null }
    etatAppels.ecrire((l) => void l.push(appel))
    return repondre({ ok: true as const, appel })
  },
  async raccrocher(appelId, fin) {
    etatAppels.ecrire((l) => l.forEach((a) => a.id === appelId && a.fin === null && (a.fin = fin)))
  },
}
