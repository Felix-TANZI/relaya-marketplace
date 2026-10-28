// DONNÉES DE DÉMONSTRATION — domaine « règlements » (ENT-P18) : trois vendredis versés depuis le début du pilote
// (25 septembre, 2 et 9 octobre : prestations de la semaine arrêtée le jeudi, moins les retenues devenues définitives
// cette semaine-là) et le versement à venir, vendredi 16 octobre.
// Montant = prestations validées (src/demo/prestations.ts) − retenues définitives au jeudi 23 h 59, jamais saisi ;
// la retenue de LT-029 (DED-10) dépasse les prestations : rien n'est versé, le solde est reporté (ENT-REM-05). Un
// recours sur LT-029 suspend la retenue ; une décision définitive libère les prestations en revue (DED-12). Changer le
// moyen : propriétaire, code SMS, versements bloqués (ENT-ARG-03). Propriétaire et comptable seulement.
import type { DomaineReglements, MoyenReglement, Retenue, Versement, VersementPrevu } from '../donnees/domaines/reglements'
import type { Litige } from '../donnees/domaines/litiges'
import { PARAMETRES } from '../calculs/registre'
import { lireVersements, prochainVersement, soldeDuVendredi } from '../calculs/ent07'
import { JOUR, jourDe, yaounde } from '../calculs/temps'
import { maintenant } from './horloge'
import { ENTREPRISE, UTILISATEURS } from './jeu-essai'
import { exiger } from './acces'
import { litigesDemo } from './litiges'
import { prestations } from './prestations'
import { magasin, repondre } from './stockage'

const V = lireVersements()

export const reglementsDemo = magasin('reglements', () => ({
  moyen: { operateur: 'MTN', numero: '···· 01', titulaire: 'Yafé Express SARL', verifieLe: ENTREPRISE.debutPilote - 2 * JOUR, statut: 'verifie', bloqueJusqua: null } as MoyenReglement,
  defi: null as { id: string; code: string } | null,
}))

/** Litiges dont la mission reste en revue (pas encore de décision définitive). */
function litigesOuverts(ls: Litige[], t: number): Set<string> {
  return new Set(ls.filter((l) => !l.decision || l.recours?.statut === 'en_cours' || l.decision.definitiveLe > t).map((l) => l.id))
}

/** Retenues des décisions où l'entreprise est en tort (une ligne par élément, avec son dossier : ENT-P18R-04) ;
 * `depuis` : arrêté précédent (les retenues devenues définitives avant ont déjà été imputées à un vendredi passé). */
export function retenues(ls: Litige[], t: number, arrete: number, depuis = -Infinity): Retenue[] {
  return ls.flatMap((l) => {
    const d = l.decision
    if (!d || d.enTort !== 'entreprise') return []
    if (l.recours?.statut !== 'en_cours' && d.definitiveLe <= depuis) return []
    const suspendue = l.recours?.statut === 'en_cours'
    const definitive = !suspendue && d.definitiveLe <= t
    return d.retenues.map((r, i): Retenue => ({
      id: `${l.id}-${i + 1}`,
      litigeId: l.id,
      libelle: r.libelle,
      montant: r.montant ?? 0,
      decideLe: d.le,
      definitiveLe: d.definitiveLe,
      statut: suspendue ? 'suspendue' : definitive ? 'definitive' : 'en_attente',
      imputee: suspendue ? null : d.definitiveLe <= arrete ? 'ce_vendredi' : 'vendredi_suivant',
    }))
  })
}

const SEMAINE = 7 * JOUR

export function versementPrevu(t: number): VersementPrevu {
  const { arrete, limite } = prochainVersement(t, V)
  const ls = litigesDemo.lire().litiges
  const ps = prestations(litigesOuverts(ls, arrete)).filter((p) => p.jour > arrete - SEMAINE && p.jour <= arrete)
  const rs = retenues(ls, t, arrete, arrete - SEMAINE)
  const totalValide = ps.filter((p) => p.statut === 'validee').reduce((a, p) => a + p.montant, 0)
  const imputees = rs.filter((r) => r.imputee === 'ce_vendredi')
  const s = soldeDuVendredi([totalValide], imputees.map((r) => r.montant))
  const m = reglementsDemo.lire().moyen
  return {
    limite,
    arrete,
    statut: m.bloqueJusqua && m.bloqueJusqua > limite ? 'bloque' : s.report > 0 ? 'reporte' : 'en_cours',
    prestations: ps,
    retenues: rs,
    totalValide,
    totalRetenues: imputees.reduce((a, r) => a + r.montant, 0),
    aVerser: s.aVerser,
    report: s.report,
    reportJusqua: s.report > 0 ? limite + V.reportVendredis * 7 * JOUR : null,
    frais: 0,
  }
}

/** Vendredis passés depuis le début du pilote : chaque semaine arrêtée le jeudi à 23 h 59, versée avant midi. */
export function semainesPassees(t: number): { arrete: number; limite: number }[] {
  const out: { arrete: number; limite: number }[] = []
  let { arrete, limite } = prochainVersement(t, V)
  for (;;) {
    arrete -= SEMAINE
    limite -= SEMAINE
    if (arrete < ENTREPRISE.debutPilote) break
    out.push({ arrete, limite })
  }
  return out
}

export function versementsPasses(t: number): Versement[] {
  const ls = litigesDemo.lire().litiges
  return semainesPassees(t).map(({ arrete, limite }, i) => {
    const ps = prestations(litigesOuverts(ls, arrete)).filter((p) => p.statut === 'validee' && p.jour > arrete - SEMAINE && p.jour <= arrete)
    const rs = retenues(ls, arrete, arrete, arrete - SEMAINE).filter((r) => r.imputee === 'ce_vendredi')
    const s = soldeDuVendredi([ps.reduce((a, p) => a + p.montant, 0)], rs.map((r) => r.montant))
    const jour = jourDe(limite)
    // Le premier versement est passé au second essai (réseau de l'opérateur) : rien de perdu, l'heure limite est tenue.
    const tentatives = i === semainesPassees(t).length - 1 ? 2 : 1
    return { id: 'VS-' + jour, date: limite - (tentatives === 2 ? 1 : 3) * 3_600_000, montant: s.aVerser, statut: s.aVerser > 0 ? 'verse' : 'reporte', reference: s.aVerser > 0 ? `MP${jour.replace(/-/g, '').slice(2)}.${1000 + i * 137}.W` : null, tentatives }
  })
}

export const demoReglements: DomaineReglements = {
  async prochain() {
    exiger(['proprietaire', 'comptable'], 'Règlements')
    return repondre(versementPrevu(maintenant()))
  },
  async historique() {
    exiger(['proprietaire', 'comptable'], 'Règlements')
    return repondre(versementsPasses(maintenant()))
  },
  async indicateurs() {
    exiger(['proprietaire', 'comptable'], 'Règlements')
    const t = maintenant()
    const v = versementPrevu(t)
    const valides = v.prestations.filter((p) => p.statut === 'validee')
    const somme = valides.reduce((a, p) => a + p.montant, 0)
    // Mois en cours (heure de Yaoundé) : prestations validées et retenues définitives depuis le 1er.
    const debutMois = yaounde(Number(jourDe(t).slice(0, 4)), Number(jourDe(t).slice(5, 7)), 1)
    const duMois = prestations(litigesOuverts(litigesDemo.lire().litiges, t)).filter((p) => p.statut === 'validee' && p.jour >= debutMois && p.jour <= t)
    const retenuesMois = retenues(litigesDemo.lire().litiges, t, t, debutMois).filter((r) => r.statut === 'definitive').reduce((a, r) => a + r.montant, 0)
    return repondre({ semaine: somme, mois: duMois.reduce((a, p) => a + p.montant, 0), volumeValide: duMois.length, retenuesMois })
  },
  async moyen() {
    exiger(['proprietaire', 'comptable'], 'Règlements')
    return repondre(reglementsDemo.lire().moyen)
  },
  async demanderCode() {
    exiger(['proprietaire'], 'Changer le moyen de règlement')
    let code = ''
    for (let i = 0; i < PARAMETRES.acces.longueurCode; i++) code += Math.floor(Math.random() * 10)
    const id = 'DF-' + Math.random().toString(36).slice(2, 8)
    reglementsDemo.ecrire((s) => void (s.defi = { id, code }))
    const tel = UTILISATEURS.find((u) => u.role === 'proprietaire')!.telephone
    return repondre({ defi: id, destination: '···· ' + tel.slice(-2), codeDemo: code })
  },
  async changerMoyen(p) {
    exiger(['proprietaire'], 'Changer le moyen de règlement')
    const etat = reglementsDemo.lire()
    if (etat.moyen.statut === 'en_revue') return repondre({ ok: false as const, raison: 'en_revue' as const })
    const chiffres = p.numero.replace(/\D/g, '').replace(/^237/, '')
    if (!/^6\d{8}$/.test(chiffres)) return repondre({ ok: false as const, raison: 'numero' as const })
    if (!p.auNomDeLEntreprise) return repondre({ ok: false as const, raison: 'titulaire' as const })
    if (!etat.defi || etat.defi.id !== p.defi || etat.defi.code !== p.code.trim()) return repondre({ ok: false as const, raison: 'code' as const })
    const t = maintenant()
    reglementsDemo.ecrire((s) => {
      s.moyen = { operateur: p.operateur, numero: '···· ' + chiffres.slice(-2), titulaire: 'Yafé Express SARL', verifieLe: null, statut: 'en_revue', bloqueJusqua: t + V.blocageMoyenJours * JOUR }
      s.defi = null
    })
    return repondre({ ok: true as const })
  },
}

