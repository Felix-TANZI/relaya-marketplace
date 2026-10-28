// DONNÉES DE DÉMONSTRATION — domaine « incidents » (ENT-P14) : incidents déclarés par les livreurs de Yafé ce mardi.
// Échéance d'un incident bloquant = réception serveur + délai du registre (ENT-INCIDENT-DELAI) ; passé ce délai,
// l'opérateur de zone BelivaY décide et une décision tardive est refusée (ENT-P14R-01) ; refus motivé d'au moins
// longueur_min_motif_refus caractères ; auteur et motif journalisés (RG-R113, RG-R114) ; incident de sécurité validé
// d'office, jamais refusé (RG-R109, RG-R112). Effet d'une validation sur la tournée (DED-03) : boutique fermée →
// arrêt retiré, déplacement payé et imputé ; la tournée reprend. Transfert à un autre livreur éligible : rencontre,
// scan de chaque étiquette par le second, garde transférée au dernier scan (ENT-P14R-03, DED-28).
import type { DomaineIncidents, Incident, Transfert } from '../donnees/domaines/incidents'
import type { Instant } from '../donnees/communs'
import { MINUTE } from '../calculs/temps'
import { REGLES } from '../calculs/livraison/regles-ecrans'
import { maintenant } from './horloge'
import { T, livreurCourt } from './jeu-essai'
import { exiger } from './acces'
import { PONT, idLivreur, nomUtilisateur, paquetsDemo } from './paquets'
import { eligibilite } from './affectation'
import { magasin, repondre } from './stockage'

const OPERATEUR = 'Yannick Owona'
const photo = (id: string, le: Instant, sujet: Incident['photos'][number]['sujet']) => ({ id, le, recuLe: le + 4_000, sujet })
const echeance = (recu: Instant) => recu + REGLES.incidentMin * MINUTE

export const incidentsStock = magasin('incidents', () => ({
  incidents: [
    {
      id: 'IN-121', missionId: 'MS-Z1-261013-002', paquetId: 'PQ-Z1-261013-002', livreur: livreurCourt('l-hugo'), genre: 'boutique_fermee', famille: 'blocage', bloquant: true,
      lieu: 'Tech Bastos', distanceArretM: 18, declareLe: T(-6) - 40_000, recuLe: T(-6), decideAvant: echeance(T(-6)), statut: 'a_valider',
      photos: [photo('PH-1211', T(-7), 'devanture'), photo('PH-1212', T(-7) + 30_000, 'lieu')],
      note: 'Rideau baissé, un voisin dit que le gérant revient vers 15 h. Deux appels masqués sans réponse.', consequence: 'arret_retire', decision: null,
    },
    {
      id: 'IN-120', missionId: 'MS-Z2-261013-003', paquetId: 'PQ-Z2-261013-003', livreur: livreurCourt('l-paul'), genre: 'colis_abime', famille: 'colis', bloquant: false,
      lieu: 'Tonton PG', distanceArretM: 4, declareLe: T(-63), recuLe: T(-63) + 5_000, decideAvant: null, statut: 'a_valider',
      photos: [photo('PH-1201', T(-64), 'colis'), photo('PH-1202', T(-64) + 20_000, 'colis')],
      note: 'Coin du carton enfoncé avant le ramassage, contrôlé devant le vendeur : article intact, colis pris avec réserve.', consequence: 'reserve', decision: null,
    },
    {
      id: 'IN-119', missionId: 'MS-Z6-261013-002', paquetId: 'PQ-Z6-261013-002', livreur: livreurCourt('l-ines'), genre: 'client_absent', famille: 'blocage', bloquant: true,
      lieu: 'Biyem-Assi', distanceArretM: 12, declareLe: T(-48), recuLe: T(-48), decideAvant: echeance(T(-48)), statut: 'valide',
      photos: [photo('PH-1191', T(-49), 'lieu')], note: 'Client absent au repère, deux appels masqués. Il rappelle : arrivée dans 20 min.', consequence: 'nouvelle_tentative',
      decision: { par: 'Gaëlle Wankeu', le: T(-44), motif: null, operateur: false },
    },
    {
      id: 'IN-117', missionId: 'MS-Z3-261013-001', paquetId: 'PQ-Z3-261013-001', livreur: livreurCourt('l-junior'), genre: 'adresse', famille: 'blocage', bloquant: true,
      lieu: 'Mode Elobi', distanceArretM: 140, declareLe: T(-58), recuLe: T(-58), decideAvant: echeance(T(-58)), statut: 'refuse',
      photos: [photo('PH-1171', T(-59), 'lieu')], note: 'Boutique introuvable au point indiqué.', consequence: 'aucune',
      decision: { par: 'Serge Mbarga', le: T(-55), motif: 'La boutique est à 140 m, derrière la pharmacie : rappel au livreur par appel masqué.', operateur: false },
    },
    {
      id: 'IN-116', missionId: 'MS-Z1-261013-002', paquetId: 'PQ-Z1-261013-002', livreur: livreurCourt('l-hugo'), genre: 'non_conforme', famille: 'colis', bloquant: true,
      lieu: 'Afrik Déco', distanceArretM: 6, declareLe: T(-52), recuLe: T(-52), decideAvant: echeance(T(-52)), statut: 'escalade',
      photos: [photo('PH-1161', T(-53), 'colis')], note: 'Article différent de la fiche (couleur), le vendeur propose un échange.', consequence: 'aucune',
      decision: { par: OPERATEUR, le: echeance(T(-52)), motif: 'Validé par l’opérateur de zone : le vendeur remplace l’article sur place.', operateur: true },
    },
    // Trafic du reste de la flotte (paquets de trafic() dans paquets.ts).
    {
      id: 'IN-110', missionId: 'MS-Z6-261013-027', paquetId: 'PQ-Z6-261013-027', livreur: livreurCourt('l-gilles'), genre: 'client_absent', famille: 'blocage', bloquant: true,
      lieu: 'Biyem-Assi', distanceArretM: 9, declareLe: T(-3) - 30_000, recuLe: T(-3), decideAvant: echeance(T(-3)), statut: 'a_valider',
      photos: [photo('PH-1101', T(-4), 'lieu')], note: 'Personne au repère, deux appels masqués sans réponse. J’attends cinq minutes.', consequence: 'nouvelle_tentative', decision: null,
    },
    {
      id: 'IN-108', missionId: 'MS-Z2-261013-025', paquetId: 'PQ-Z2-261013-025', livreur: livreurCourt('l-kevin'), genre: 'colis_abime', famille: 'colis', bloquant: false,
      lieu: 'Mercerie Melen', distanceArretM: 3, declareLe: T(-24), recuLe: T(-24) + 3_000, decideAvant: null, statut: 'valide',
      photos: [photo('PH-1081', T(-25), 'colis')], note: 'Sachet déchiré au ramassage, contenu vérifié devant la vendeuse : pris avec réserve.', consequence: 'reserve',
      decision: { par: 'Serge Mbarga', le: T(-20), motif: null, operateur: false },
    },
    {
      id: 'IN-115', missionId: 'MS-Z6-261013-001', paquetId: 'PQ-Z6-261013-001', livreur: livreurCourt('l-paul'), genre: 'accident', famille: 'securite', bloquant: true,
      lieu: 'Biyem-Assi', distanceArretM: null, declareLe: T(-230), recuLe: T(-230), decideAvant: null, statut: 'securite',
      photos: [photo('PH-1151', T(-229), 'vehicule')], note: 'Chute à l’arrêt, sans blessure. Tricycle vérifié, je repars.', consequence: 'aucune',
      decision: { par: 'BelivaY', le: T(-230), motif: null, operateur: true },
    },
  ] as Incident[],
  transferts: [] as Transfert[],
}))
// Incidents déclarés depuis l'espace livreur (src/demo/pont-livreur.ts) : appliqués avant chaque lecture.
const lireIncidents = incidentsStock.lire
incidentsStock.lire = () => (PONT.avantLecture?.(), lireIncidents())

/** Incident tel qu'à l'instant : un bloquant non décidé à l'échéance est décidé par l'opérateur de zone. */
function vue(i: Incident, t: Instant): Incident {
  if (i.statut === 'a_valider' && i.bloquant && i.decideAvant && i.decideAvant <= t)
    return { ...i, statut: 'escalade', decision: { par: OPERATEUR, le: i.decideAvant, motif: null, operateur: true } }
  return i
}
const vues = (t = maintenant()) => incidentsStock.lire().incidents.map((i) => vue(i, t))

/** Forme lue par les compteurs de la coque et le tableau de bord. */
export const incidentsDemo = { lire: () => ({ incidents: vues() }) }

/** État d'un transfert à l'instant : chaque étiquette scannée par le second livreur l'une après l'autre. */
function vueTransfert(x: Transfert, t: Instant): Transfert {
  const etiquettes = x.etiquettes.map((e, i) => ({ ...e, scanneLe: e.scanneLe ?? (x.demandeLe + (3 + i) * MINUTE <= t ? x.demandeLe + (3 + i) * MINUTE : null) }))
  const n = etiquettes.filter((e) => e.scanneLe).length
  return { ...x, etiquettes, etape: n === 0 ? 'rencontre' : n < etiquettes.length ? 'scan' : 'transferee' }
}

export const demoIncidents: DomaineIncidents = {
  async liste(statut) {
    exiger(['proprietaire', 'repartiteur'], 'Incidents')
    return repondre(
      vues()
        .filter((i) => !statut || i.statut === statut)
        .sort((a, b) => Number(b.famille === 'securite' && b.statut === 'a_valider') - Number(a.famille === 'securite' && a.statut === 'a_valider') || (a.decideAvant ?? Infinity) - (b.decideAvant ?? Infinity) || b.recuLe - a.recuLe),
    )
  },
  async decider(id, decision, motif) {
    exiger(['proprietaire', 'repartiteur'], 'Décider d’un incident')
    const t = maintenant()
    const i = vues(t).find((x) => x.id === id)
    if (!i || i.statut !== 'a_valider') return repondre({ ok: false as const, raison: 'deja_decide' as const })
    if (i.famille === 'securite' && decision === 'refuser') return repondre({ ok: false as const, raison: 'securite' as const })
    if (decision === 'refuser' && motif.trim().length < REGLES.motifRefusMin) return repondre({ ok: false as const, raison: 'motif' as const })
    const par = nomUtilisateur()
    incidentsStock.ecrire((s) => {
      const x = s.incidents.find((y) => y.id === id)!
      x.statut = decision === 'valider' ? 'valide' : 'refuse'
      x.decision = { par, le: t, motif: motif.trim() || null, operateur: false }
    })
    PONT.decision?.(i, decision === 'valider' ? 'valide' : 'refuse', motif.trim() || null, par, t)
    if (i.bloquant)
      paquetsDemo.ecrire((s) => {
        const p = s.paquets.find((x) => x.id === i.paquetId)
        if (!p || p.statut !== 'incident') return
        // Boutique fermée validée : l'arrêt sort de la tournée, ses colis retournent au vendeur suivant (DED-03).
        if (decision === 'valider' && i.consequence === 'arret_retire') {
          const k = p.arrets.findIndex((a) => !a.fait)
          if (k >= 0 && p.arrets[k].sens === 'ramassage') {
            const retires = p.colis.filter((c) => c.arret === k).length
            p.arrets.splice(k, 1)
            p.colis = p.colis.filter((c) => c.arret !== k).map((c) => ({ ...c, arret: c.arret > k ? c.arret - 1 : c.arret }))
            const depot = p.arrets.find((a) => a.sens === 'depot')
            if (depot) depot.colis -= retires
          }
          p.journal.push({ le: t, quoi: 'arret_retire', par })
        }
        p.statut = 'en_cours'
        p.incidentId = null
        p.eta = t + 25 * MINUTE
        p.journal.push({ le: t, quoi: decision === 'valider' ? 'incident_valide' : 'incident_refuse', par })
      })
    return repondre({ ok: true as const })
  },
  async transferer(paquetId, versId) {
    exiger(['proprietaire', 'repartiteur'], 'Transférer un paquet')
    const t = maintenant()
    const p = paquetsDemo.lire().paquets.find((x) => x.id === paquetId)
    if (!p || !['en_cours', 'incident'].includes(p.statut) || p.transfert) return repondre({ ok: false as const, raison: 'statut' as const })
    if (!(await eligibilite(paquetId)).eligibles.some((x) => x.id === versId)) return repondre({ ok: false as const, raison: 'non_eligible' as const })
    const etiquettes = p.colis.filter((c) => p.arrets[c.arret].fait).map((c) => ({ etiquette: c.etiquette, scanneLe: null }))
    const de = idLivreur(p, t)!
    const x: Transfert = { id: 'TR-' + Math.random().toString(36).slice(2, 7), paquetId, de: livreurCourt(de), vers: livreurCourt(versId), demandeLe: t, etape: 'rencontre', etiquettes }
    const par = nomUtilisateur()
    incidentsStock.ecrire((s) => void s.transferts.unshift(x))
    paquetsDemo.ecrire((s) => {
      const q = s.paquets.find((y) => y.id === paquetId)!
      q.transfert = { deId: de, versId, demandeLe: t, termineLe: t + (2 + etiquettes.length) * MINUTE }
      q.journal.push({ le: t, quoi: 'transfert', par })
    })
    return repondre({ ok: true as const, transfert: vueTransfert(x, t) })
  },
  async transferts() {
    exiger(['proprietaire', 'repartiteur'], 'Incidents')
    const t = maintenant()
    return repondre(incidentsStock.lire().transferts.map((x) => vueTransfert(x, t)))
  },
}
