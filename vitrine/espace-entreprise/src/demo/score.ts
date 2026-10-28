// DONNÉES DE DÉMONSTRATION — domaine « score » (ENT-P20) : Trust Score calculé par le moteur (src/calculs/ent07.ts) sur
// les prestations du pilote (src/demo/prestations.ts), les événements propres de l'entreprise et les décisions
// définitives de litige (un litige en cours ne pèse pas : ENT-TSC-05). Aucun chiffre écrit à la main.
import type { DomaineScore, EvenementScore, ScoreEntreprise } from '../donnees/domaines/score'
import type { Gravite } from '../calculs/ent07'
import { borneBaisse, scoreTrust } from '../calculs/ent07'
import { plafondDe } from '../calculs/paliers'
import { maintenant } from './horloge'
import { ENTREPRISE, LIVREURS, ZONES, livreurCourt } from './jeu-essai'
import { litigesDemo } from './litiges'
import { EVENEMENTS_PROPRES, J, graviteDe, prestations } from './prestations'
import { repondre } from './stockage'

function evenements(t: number): EvenementScore[] {
  const ls = litigesDemo.lire().litiges
  const evs: EvenementScore[] = []
  for (const p of prestations()) {
    const g = graviteDe(p)
    if (g) evs.push({ id: 'EV-' + p.missionId, le: p.jour, gravite: g, libelle: g === 'succes' ? 'Remise dans le délai' : 'Remise après la promesse (prestation minorée)', propre: false, livreur: p.livreur, zone: p.zone, missionId: p.missionId, paquetId: p.paquetId })
  }
  for (const l of ls) {
    const d = l.decision
    if (!d || d.enTort !== 'entreprise' || l.recours?.statut === 'en_cours' || d.definitiveLe > t) continue
    const p = prestations().find((x) => x.paquetId === l.paquetId)
    evs.push({ id: 'EV-' + l.id, le: d.definitiveLe, gravite: 'g3', libelle: `Litige ${l.id} perdu (décision définitive)`, propre: false, livreur: l.livreur, zone: p?.zone ?? 'Z3', missionId: l.missionId, paquetId: l.paquetId })
  }
  for (const e of EVENEMENTS_PROPRES) evs.push({ ...e, propre: true, livreur: null, missionId: null })
  return evs.filter((e) => e.le <= t).sort((a, b) => b.le - a.le)
}

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : null)

export function calculerScore(t: number): ScoreEntreprise {
  const evs = evenements(t)
  const ps = prestations()
  const brut = (e: { le: number; gravite: Gravite }[], a: number) => scoreTrust(e, a)
  const avant = J(-1, 23, 59)
  const precedent = ps.some((p) => p.jour <= avant) ? brut(evs.filter((e) => e.le <= avant), avant) : null
  const calcule = ps.length ? brut(evs, t) : null
  const score = calcule === null ? null : precedent === null ? calcule : borneBaisse(precedent, calcule)
  return {
    missionsCloses: ps.length,
    score,
    precedent,
    palier: ENTREPRISE.palier,
    plafond: plafondDe(ENTREPRISE.palier),
    depuisLe: ENTREPRISE.debutPilote,
    assuranceOr: false,
    livreurs: LIVREURS.map((l) => {
      const mes = ps.filter((p) => p.livreur.id === l.id)
      const e = evs.filter((x) => x.livreur?.id === l.id)
      return { livreur: livreurCourt(l.id), missions: mes.length, score: e.length ? brut(e, t) : null, dansLeDelai: pct(e.filter((x) => x.gravite === 'succes').length, e.length), preuvesCompletes: pct(mes.filter((p) => p.statut !== 'non_payee').length, mes.length) }
    }),
    zones: ZONES.map((z) => {
      const e = evs.filter((x) => x.zone === z.code && !x.propre)
      return { zone: z.code, nom: z.nom, missions: ps.filter((p) => p.zone === z.code).length, score: e.length ? brut(e, t) : null, dansLeDelai: pct(e.filter((x) => x.gravite === 'succes').length, e.length) }
    }),
    evenements: evs,
    alerteDescente: null, // palier Nouveau : aucun palier sous lui
    calculeLe: t,
  }
}

export const demoScore: DomaineScore = {
  async score() {
    return repondre(calculerScore(maintenant()))
  },
}
