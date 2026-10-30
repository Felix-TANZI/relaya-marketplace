// Mêmes exemples que moteurs/tests/test_ecarts_audit.py : écarts moteurs ↔ registre de l'audit vendeur
// (logique-metier/vendeur/AUDIT-EXHAUSTIVITE.md, partie 2), corrigés selon DP-55, DP-56 et DP-57. Un bloc par écart :
// C3 à C9, V1 à V3, P1 à P4, D1, L1, L2, A-8.
import { describe, expect, it } from 'vitest'
import { Dec } from './argent'
import { dateDeVersement, etatDeLArgent, resume } from './argent-vendeur'
import {
  calculerCommission, commissionArticle, messageCommissionMinimale, plagesCommissionMinimale, prixMinimumPubliable, remiseDePlan,
  restitutionDeRemise, seuilCommissionMinimale, simulerPlans, verifierPublication, type Famille,
} from './commission'
import { livreesSansIncident, plafondDeDemarrage, quantiteAttribuable, verifierPrixDemarrage, type Incident } from './demarrage'
import { OffreRefusee, ParametreIllisible, VenteInvalide } from './erreurs'
import { VERSEMENT, TransitionRefusee } from './etats'
import { duDuVendeur, finDuGel, liberation, rembourserRetour } from './litiges'
import { alerteAEnvoyer, alerteDeSeuil, evolution, palierAtteint, type Alerte, type EtatDuJour } from './paliers'
import { finDeGrace, finEssai, plafondDeRemise, planApresEchec, planApresEssai, prixAnnuel, prixDuMois, rappelEssai, tvaDuPlan } from './plans'
import { lireCommission, lireLitiges, lirePaliers, lireSanctions, lireVersements, PALIERS, REGISTRE, type Palier, type Registre } from './registre'
import {
  controleRenforce, finSuspensionAuPlusTard, finVisibiliteReduite, frequenceDeControle, NIVEAUX, probationFinie, suspensionProposee, validationHumaine,
} from './sanctions'
import { ajouterJours, jourDe, yaounde } from './temps'
import {
  appliquerReprise, dateDeLiberation, echeanceMotifAntifraude, liberationApresLitige, montantDu, motifAntifraudeEnRetard, referenceDeVersement,
  suiviReprise, vendrediDeVersement, type EtatReprise, type Gain,
} from './versements'

const PC = lireCommission(REGISTRE)
const PV = lireVersements(REGISTRE)
const PP = lirePaliers(REGISTRE)
const PS = lireSanctions(REGISTRE)
const PLT = lireLitiges(REGISTRE)
const t = (mois: number, jour: number, h = 0, mi = 0) => yaounde(2026, mois, jour, h, mi)
const avec = (modifs: Record<string, string>): Registre => ({ ...REGISTRE, ...modifs })
const D = (s: string | number) => Dec.de(String(s))
const itel = (decouverte = true, palier: Palier = 'Bronze') => calculerCommission([{ famille: 'A', prixUnitaire: 20000 }], palier, decouverte, PC)
const vente = (famille: Famille, prix: number, palier: Palier = 'Bronze', decouverte = false, quantite = 1, p = PC) =>
  calculerCommission([{ famille, prixUnitaire: prix, quantite }], palier, decouverte, p)

// ── Paramètres créés par DP-57 ──────────────────────────────────────────────────────────────────────────

it('paramètres de DP-57', () => {
  expect([PC.annuelMoisPayes, PC.essaiMois, PC.essaiRappelJours, PC.graceJours]).toEqual([10, 1, 3, 7])
  expect([PV.gelMotifHeures, PV.recouvrementJours]).toEqual([48, 90])
  expect([PP.alerteEcartPoints, PP.alerteFrequenceJours]).toEqual([3, 7])
  expect([PS.visibiliteJours, PS.suspensionSousScore, PS.nonPreparations, PS.nonPreparationsJours]).toEqual([14, 40, 3, 30])
  expect([PS.suspensionMaxJours, PS.probatoireCommandes, PS.renforceSousScore, PS.renforceBaissePoints]).toEqual([30, 20, 60, 8])
  expect([PS.controlePremieres, PS.controleSousSeuil, PS.controleSeuilScore, PS.controleEnsuite]).toEqual([5, 20, 70, 100])
})

it.each([
  [lireCommission, 'VD-PLAN-ANNUEL', '12 mois payés', 'VD-PLAN-ANNUEL'],
  [lireCommission, 'VD-PLAN-ESSAI', '14 jours offerts', 'VD-PLAN-ESSAI'],
  [lireCommission, 'VD-PLAN-GRACE', 'aucune', 'VD-PLAN-GRACE'],
  [lireCommission, 'VD-PLAN-TVA', 'prix du plan toutes taxes comprises', 'audit C5'],
  [lireVersements, 'VD-GEL-ANTIFRAUDE', 'motif écrit sous 2 jours', 'VD-GEL-ANTIFRAUDE'],
  [lireVersements, 'VD-REPRISE-IMPAYEE', 'BelivaY absorbe la perte', 'VD-REPRISE-IMPAYEE'],
  [lirePaliers, 'VD-ALERTE-SEUIL', 'à 3 points du seuil moins 5', 'VD-ALERTE-SEUIL'],
  [lireSanctions, 'VD-SAN-VISIBILITE', 'deux semaines', 'VD-SAN-VISIBILITE'],
  [lireSanctions, 'VD-SAN-SUSPENSION', 'au cas par cas', 'VD-SAN-SUSPENSION'],
  [lireSanctions, 'VD-PROBATOIRE', 'un mois', 'VD-PROBATOIRE'],
  [lireSanctions, 'VD-CTRL-RENFORCE', 'jamais', 'VD-CTRL-RENFORCE'],
  [lireSanctions, 'CTRL-RAMASSAGE', '1 sur 10', 'CTRL-RAMASSAGE'],
] as [(r: Registre) => unknown, string, string, string][])('paramètre de DP-57 illisible : %#', (lecture, code, valeur, motif) => {
  expect(() => lecture(avec({ [code]: valeur }))).toThrow(ParametreIllisible)
  expect(() => lecture(avec({ [code]: valeur }))).toThrow(motif)
})

// ── C3 · A-4 : les 3 points « sous 5 000 F » gardés, le message dit la plage exacte ─────────────────────

/** Contrôle indépendant : chaque prix publiable, un par un, avec le calcul complet de la sous-commande. */
function plagesParBalayage(famille: Famille, palier: Palier, decouverte: boolean, jusquA: number): [number, number][] {
  const plages: [number, number][] = []
  for (let prix = prixMinimumPubliable(famille, false, PC); prix < jusquA; prix++) {
    if (!vente(famille, prix, palier, decouverte).plancherApplique) continue
    if (plages.length && plages[plages.length - 1][1] === prix - 1) plages[plages.length - 1][1] = prix
    else plages.push([prix, prix])
  }
  return plages
}

it.each([
  ['A', 'Bronze', false, [[700, 4239], [5000, 5181]]], // 4 240 × 16,5 % = 699,60 → 700 F
  ['A', 'Argent', false, [[700, 4987], [5000, 6095]]],
  ['A', 'Bronze', true, [[700, 6476]]], // contiguës : une seule plage
  ['B', 'Bronze', false, [[700, 2639]]], // mode : 2 640 F (Q-55)
  ['B', 'Or', true, [[700, 4713], [5000, 5315]]],
  ['D', 'Argent', false, [[700, 4571], [5000, 5486]]],
  ['E', 'Bronze', false, [[700, 4512], [5000, 5595]]],
] as [Famille, Palier, boolean, [number, number][]][])('plages de la commission minimale %s %s découverte=%s', (famille, palier, decouverte, plages) => {
  expect(plagesCommissionMinimale(famille, palier, decouverte, false, PC)).toEqual(plages)
  expect(plagesParBalayage(famille, palier, decouverte, plages[plages.length - 1][1] + 50)).toEqual(plages)
  expect(seuilCommissionMinimale(famille, palier, decouverte, false, PC)).toBe(plages[plages.length - 1][1] + 1)
})

it('la règle des 3 points est gardée (A-4)', () => {
  expect(vente('A', 4999).commission).toBe(825)
  expect(vente('A', 5000).commission).toBe(700)
  expect(commissionArticle({ famille: 'A', prixUnitaire: 4240 }, PC).francs()).toBe(700)
})

it('message de la commission minimale', () => {
  // Espaces insécables (U+00A0) entre les milliers et avant « F », comme moteurs/argent.py (CCH-31).
  expect(messageCommissionMinimale('A', 'Bronze', false, false, PC)).toBe('De 700\u00a0F à 4\u00a0239\u00a0F et de 5\u00a0000\u00a0F à 5\u00a0181\u00a0F, la commission minimale de 700\u00a0F s’applique.')
  expect(messageCommissionMinimale('B', 'Bronze', false, false, PC)).toBe('Sous 2\u00a0640\u00a0F, la commission minimale de 700\u00a0F s’applique.')
  // Plancher de 1 F : il ne s'applique à aucun prix publiable, rien n'est écrit.
  const p = lireCommission(avec({ 'VD-COM-MIN': '1 F par sous-commande' }))
  expect(plagesCommissionMinimale('A', 'Bronze', false, false, p)).toEqual([])
  expect(messageCommissionMinimale('A', 'Bronze', false, false, p)).toBe(null)
})

// ── C4 · restitution de la remise de plan sur remboursement ─────────────────────────────────────────────

it('remise recalculée après remboursement total (REFVD-R54)', () => {
  const ventes = [itel(), itel(), itel()]
  expect(remiseDePlan('Pro', ventes, PC).remise).toBe(648)
  const apres = [{ resultat: ventes[0], rembourse: 20000 }, ventes[1], ventes[2]]
  const r = remiseDePlan('Pro', apres, PC)
  expect([r.commissionDuMois, r.remise]).toEqual([4320, 432])
  expect(restitutionDeRemise(648, 'Pro', apres, PC)).toBe(216)
  expect(restitutionDeRemise(400, 'Pro', apres, PC)).toBe(0) // jamais négative
  expect(restitutionDeRemise(0, 'Free', apres, PC)).toBe(0)
  expect(() => restitutionDeRemise(-1, 'Pro', apres, PC)).toThrow(VenteInvalide)
})

it('remise après remboursement partiel', () => {
  const deux = vente('A', 20000, 'Bronze', true, 2) // 4 320 F, marge 3 620 F
  let r = remiseDePlan('Pro', [{ resultat: deux, rembourse: 20000 }], PC)
  expect([r.commissionDuMois, r.remise]).toEqual([2160, 216])
  const petite = vente('B', 1000, 'Bronze', false, 2) // plancher : marge 0 F
  expect([petite.commission, petite.margeSurPlancher]).toEqual([700, 0])
  r = remiseDePlan('Pro', [{ resultat: petite, rembourse: 1000 }], PC)
  expect([r.commissionDuMois, r.remise]).toEqual([350, 0])
})

// ── C5 · TVA et remise de plan ──────────────────────────────────────────────────────────────────────────

it('TVA du plan et TVA rendue (audit C5)', () => {
  const ventes = [itel(), itel(), itel()]
  let r = remiseDePlan('Boost', ventes, PC)
  expect([r.tvaRendue, r.tvaDuPlan]).toEqual([0, 0])
  const p = lireCommission(avec({ 'VD-TVA': '19,25 % de la commission ; nouveau taux annoncé 30 jours avant' }))
  const v = [0, 1, 2].map(() => vente('A', 20000, 'Bronze', true, 1, p))
  expect(v[0].tva).toBe(416) // 2 160 × 19,25 % = 415,8
  r = remiseDePlan('Boost', v, p)
  expect([r.remise, r.tvaRendue, r.prixDuPlan, r.tvaDuPlan]).toEqual([324, 62, 2500, 481])
  expect(tvaDuPlan(7500, p)).toBe(1444)
  const s = simulerPlans(v, p)
  const gardeFree = v.reduce((x, y) => x + y.garde, 0)
  expect(s.gardes.Boost).toBe(gardeFree + 324 + 62 - 2500 - 481)
})

// ── C6 · PRX-09 : refus à la publication au-dessus du plafond de démarrage ─────────────────────────────

it('prix au-dessus du plafond de démarrage refusé, brouillon gardé (PRX-09)', () => {
  expect(() => verifierPublication(500001, 'A', false, PC, { sansIncident: 9, pp: PP })).toThrow(/brouillon gardé/)
  verifierPublication(500000, 'A', false, PC, { sansIncident: 0, pp: PP }) // tout juste : publiable
  verifierPublication(900000, 'A', false, PC, { sansIncident: 10, pp: PP }) // plafond levé
  verifierPublication(900000, 'A', false, PC) // sans compteur : seul le prix minimum est contrôlé
  expect(() => verifierPublication(900000, 'A', false, PC, { sansIncident: 3 })).toThrow(/compteur/)
  expect(plafondDeDemarrage(4, PP)).toEqual({ amount: 500000, deliveredOk: 4, needed: 10, actif: true })
  expect(plafondDeDemarrage(10, PP).actif).toBe(false)
  expect(() => plafondDeDemarrage(-1, PP)).toThrow(VenteInvalide)
  expect(() => verifierPrixDemarrage(650000, 4, PP)).toThrow(OffreRefusee)
  expect(() => verifierPrixDemarrage(650000, 4, PP)).toThrow(/4 sur 10/)
})

// ── C9 · A-2, A-3 : essai d'un mois, plan annuel, grâce ─────────────────────────────────────────────────

it('plan annuel : plafond = prix annuel ÷ 12 (A-3)', () => {
  expect([prixAnnuel('Boost', PC), prixAnnuel('Pro', PC)]).toEqual([25000, 75000])
  expect(plafondDeRemise('Boost', 'annuelle', PC)).toBe(2083)
  expect(plafondDeRemise('Pro', 'annuelle', PC)).toBe(6250)
  expect(plafondDeRemise('Boost', 'mensuelle', PC)).toBe(2500)
  expect(plafondDeRemise('Free', 'mensuelle', PC)).toBe(0)
  expect(prixDuMois('Boost', 'annuelle', PC)).toBe(2083)
  // Pro à l'année, beaucoup de ventes : la remise s'arrête à 6 250 F, pas 7 500 F.
  const grosses = Array.from({ length: 10 }, () => vente('B', 60000))
  expect(remiseDePlan('Pro', grosses, PC, 'annuelle').remise).toBe(6250)
  expect(remiseDePlan('Pro', grosses, PC).remise).toBe(7500)
  expect(simulerPlans([itel(), itel(), itel()], PC, 'annuelle').gardes).toEqual({ Free: 53520, Boost: 51761, Pro: 47918 })
})

it('essai d’un mois (A-2)', () => {
  expect(finEssai('2026-10-06', PC)).toBe('2026-11-06')
  expect(finEssai('2027-01-31', PC)).toBe('2027-02-28')
  expect(rappelEssai('2026-10-06', PC)).toBe('2026-11-03')
  expect(planApresEssai('Pro', '2026-10-06', '2026-11-05', false, PC)).toBe('Pro')
  expect(planApresEssai('Pro', '2026-10-06', '2026-11-06', false, PC)).toBe('Free')
  expect(planApresEssai('Pro', '2026-10-06', '2026-11-06', true, PC)).toBe('Pro')
  const r = remiseDePlan('Boost', [itel(), itel(), itel()], PC, 'essai')
  expect([r.remise, r.prixDuPlan, r.plafond]).toEqual([324, 0, 2500])
})

it('grâce de 7 jours (PLN-02)', () => {
  expect(finDeGrace('2026-10-06', PC)).toBe('2026-10-13')
  expect(planApresEchec('Boost', '2026-10-06', '2026-10-13', false, PC)).toBe('Boost')
  expect(planApresEchec('Boost', '2026-10-06', '2026-10-14', false, PC)).toBe('Free')
  expect(planApresEchec('Boost', '2026-10-06', '2026-10-14', true, PC)).toBe('Boost')
})

// ── V1 · les cinq états de l'argent, gel immédiat, gel anti-fraude ──────────────────────────────────────

const MAINTENANT = t(9, 21, 9, 48) // lundi 21 septembre, 09 h 48 (jeu d'essai VD-09)
const GAINS: Gain[] = [
  { reference: 'BLV-00008', garde: 17840, liberation: null }, // en cours
  { reference: 'BLV-00007', garde: 17840, liberation: t(9, 21, 18) }, // se libère ce soir
  { reference: 'BLV-00005', garde: 335324, liberation: t(9, 20, 18), gel: 'litige' }, // date passée, mais gelée
  { reference: 'BLV-00006', garde: 335324, liberation: t(9, 23, 6), gel: 'retour' }, // gelée pendant le compte à rebours
  { reference: 'BLV-00004', garde: 17840, liberation: null, gel: 'vérification anti-fraude' },
  { reference: 'BLV-00003', garde: 17840, liberation: t(9, 19, 11) }, // à verser
  { reference: 'BLV-00001', garde: 35680, liberation: t(9, 10, 9), verse: true },
]

it('cinq états et En circulation (VD09-R04, ARG-01, Q-64)', () => {
  expect(GAINS.map((g) => etatDeLArgent(g, MAINTENANT))).toEqual(['En cours', 'Se libère', 'Gelé', 'Gelé', 'Gelé', 'À verser', 'Versé'])
  const r = resume(GAINS, MAINTENANT)
  expect([r.enCours, r.seLibere, r.gele, r.aVerser, r.verse]).toEqual([17840, 17840, 688488, 17840, 35680])
  expect(r.enCirculation).toBe(742008)
  expect(r.verifications).toEqual({ amount: 17840, count: 1 })
})

it('jamais de date de versement sur de l’argent gelé (GEL-01, LIB-02)', () => {
  expect(GAINS.map((g) => dateDeVersement(g, MAINTENANT, PV))).toEqual([null, '2026-09-25', null, null, null, '2026-09-25', null])
  expect(montantDu('2026-09-25', GAINS, PV)).toBe(17840 * 2)
  // (L'heure sans fuseau refusée par le moteur Python n'existe pas ici : un instant est toujours absolu.)
})

it('gel anti-fraude : motif sous 48 h (GEL-02, Q-64)', () => {
  expect(echeanceMotifAntifraude(t(9, 21, 10), PV)).toBe(t(9, 23, 10))
  expect(motifAntifraudeEnRetard(t(9, 21, 10), t(9, 23, 10), t(9, 30), PV)).toBe(false)
  expect(motifAntifraudeEnRetard(t(9, 21, 10), t(9, 23, 11), t(9, 30), PV)).toBe(true)
  expect(motifAntifraudeEnRetard(t(9, 21, 10), null, t(9, 22), PV)).toBe(false)
  expect(motifAntifraudeEnRetard(t(9, 21, 10), null, t(9, 23, 10, 1), PV)).toBe(true)
})

// ── V2 · référence BLV-VS et machine du versement ───────────────────────────────────────────────────────

it('référence de versement (VER-02)', () => {
  expect(referenceDeVersement(4092)).toBe('BLV-VS-4092')
  expect(referenceDeVersement(7)).toBe('BLV-VS-0007')
  for (const mauvais of [0, true, '4092'] as unknown as number[]) expect(() => referenceDeVersement(mauvais)).toThrow(RangeError)
})

it('machine du versement : refus, essais, suspension (VER-04)', () => {
  let e = VERSEMENT.appliquer('—', 'payout.closing').vers
  expect(VERSEMENT.appliquer(e, 'payout.friday', { revue_du_numero: true }).vers).toBe('reporte')
  e = VERSEMENT.appliquer(e, 'payout.friday').vers
  e = VERSEMENT.appliquer(e, 'operator.refused').vers
  expect(VERSEMENT.appliquer(e, 'payout.retry').vers).toBe('envoye')
  e = VERSEMENT.appliquer(e, 'payout.retry', { essais_epuises: true }).vers
  expect(e).toBe('suspendu')
  expect(VERSEMENT.appliquer(e, 'number.corrected').vers).toBe('prevu')
  expect(() => VERSEMENT.appliquer('credite', 'operator.refused')).toThrow(TransitionRefusee)
})

// ── V3 · une seule source pour la libération ────────────────────────────────────────────────────────────

it('une seule règle de libération (audit V3)', () => {
  for (const palier of PALIERS)
    for (const carte of [false, true]) {
      const [jour, vendredi] = liberation('2026-09-18', palier, carte, false, PLT)!
      const heure = dateDeLiberation(t(9, 18, 18), palier, carte, PV)
      expect([jour, vendredi]).toEqual([jourDe(heure), vendrediDeVersement(heure, PV)])
      expect(dateDeLiberation('2026-09-18', palier, carte, PLT)).toBe(jour)
    }
  expect(PLT.versements).toEqual(PV)
})

it('codes client et vendeur doivent concorder', () => {
  expect(() => lireLitiges(avec({ 'LIB-OR': '2 j' }))).toThrow(/concorder/)
  expect(() => lireLitiges(avec({ 'VD-LIB-CARTE': '10 jours après la fermeture du retour' }))).toThrow(/concorder/)
})

// ── P1 · A-5 : descente sous le seuil, alerte corrigée ──────────────────────────────────────────────────

const historique = (jours: number, score: string, livrees = 12, note = '4.2'): EtatDuJour[] =>
  Array.from({ length: jours }, (_, i) => ({ jour: ajouterJours('2026-09-21', -(jours - 1 - i)), trustScore: D(score), commandesLivrees: livrees, note: D(note) }))

it('descente sous le seuil, et non sous le seuil moins 5', () => {
  expect(evolution('Argent', historique(14, '62'), PP).descenteProposee).toBe('Bronze')
  expect(evolution('Argent', historique(14, '65'), PP).descenteProposee).toBe(null)
})

const A = (sens: Alerte['sens'], palierVise: Palier, seuil: number, pointsAffiches: number): Alerte => ({ sens, palierVise, seuil, pointsAffiches })
it.each([
  ['Bronze', '62.7', A('montée', 'Argent', 65, 2)], // ACC-25 : « Plus que 2 points » (65 − 63)
  ['Bronze', '62', A('montée', 'Argent', 65, 3)],
  ['Bronze', '61.9', null],
  ['Bronze', '65', null], // seuil atteint : plus d'alerte de montée
  ['Argent', '66', A('descente', 'Argent', 65, 1)], // seuil du palier, pas 60
  ['Argent', '65', A('descente', 'Argent', 65, 0)],
  ['Argent', '68', A('descente', 'Argent', 65, 3)],
  ['Argent', '68.1', null],
  ['Argent', '64.9', null], // déjà sous le seuil : c'est le compte des 14 jours
  ['Argent', '61', null], // l'ancien « seuil − 5 » (60) n'alerte plus
  ['Argent', '78', A('montée', 'Or', 80, 2)],
  ['Or', '82.4', A('descente', 'Or', 80, 2)],
  ['Platine', '92', A('descente', 'Platine', 90, 2)],
  ['Platine', '99', null],
] as [Palier, string, Alerte | null][])('alerte de seuil %s %s', (actuel, score, alerte) => {
  expect(alerteDeSeuil(actuel, D(score), PP)).toEqual(alerte)
})

it('alerte une fois par seuil et par semaine (SAN-02)', () => {
  const a = alerteDeSeuil('Bronze', D('62.7'), PP)
  expect(alerteAEnvoyer(a, null, '2026-09-21', PP)).toBe(true)
  expect(alerteAEnvoyer(a, '2026-09-15', '2026-09-21', PP)).toBe(false)
  expect(alerteAEnvoyer(a, '2026-09-14', '2026-09-21', PP)).toBe(true)
  expect(alerteAEnvoyer(null, null, '2026-09-21', PP)).toBe(false)
})

// ── P2 · A-6 : Platine demande aussi les conditions d'Or ────────────────────────────────────────────────

it('Platine demande les conditions d’Or (A-6)', () => {
  expect(palierAtteint({ jour: '2026-09-21', trustScore: D(91), commandesLivrees: 0, note: D('4.8'), audit: true }, PP)).toBe('Bronze')
  expect(palierAtteint({ jour: '2026-09-21', trustScore: D(91), commandesLivrees: 50, note: D('4.3'), visite: true, audit: true }, PP)).toBe('Platine')
})

// ── P3, P4 · L-1 : sanctions, suspension, contrôle au ramassage ─────────────────────────────────────────

describe('sanctions (L-1)', () => {
  it('niveaux et durées', () => {
    expect(validationHumaine(NIVEAUX.AVERTISSEMENT)).toBe(false)
    expect([NIVEAUX.VISIBILITE_REDUITE, NIVEAUX.SUSPENSION, NIVEAUX.EXCLUSION].every(validationHumaine)).toBe(true)
    expect(finVisibiliteReduite(t(9, 18, 10, 12), PS)).toBe(t(10, 2, 10, 12))
    expect(finSuspensionAuPlusTard(t(9, 18, 10, 12), PS)).toBe(t(10, 18, 10, 12))
    expect(!probationFinie(19, PS) && probationFinie(20, PS)).toBe(true)
  })
  it('suspension proposée (Q-31)', () => {
    expect(suspensionProposee(D('39.9'), [], t(9, 21), PS)).toBe(true)
    expect(suspensionProposee(D(40), [], t(9, 21), PS)).toBe(false)
    const trois = [t(8, 23, 10), t(9, 5), t(9, 20)]
    expect(suspensionProposee(D(70), trois, t(9, 21), PS)).toBe(true)
    expect(suspensionProposee(D(70), trois, t(9, 22, 11), PS)).toBe(false) // la première sort de la fenêtre
  })
  it('contrôle au ramassage (CTRL-RAMASSAGE)', () => {
    expect(frequenceDeControle(4, D(95), PS).eq(1)).toBe(true)
    expect(frequenceDeControle(7, D('62.7'), PS).eq(Dec.de(1).sur(20))).toBe(true)
    expect(frequenceDeControle(7, D(70), PS).eq(Dec.de(1).sur(100))).toBe(true)
    expect(frequenceDeControle(300, D(95), PS, { enProbation: true }).eq(1)).toBe(true)
    expect(frequenceDeControle(300, D(95), PS, { renforce: true }).eq(1)).toBe(true)
    expect(() => frequenceDeControle(-1, D(95), PS)).toThrow(RangeError)
  })
  it('contrôle renforcé', () => {
    expect(controleRenforce(D('59.9'), null, PS)).toBe(true)
    expect(controleRenforce(D(60), null, PS)).toBe(false)
    expect(controleRenforce(D(72), D(80), PS)).toBe(true) // 8 points perdus en une semaine
    expect(controleRenforce(D('72.1'), D(80), PS)).toBe(false)
  })
})

// ── D1 · A-7 : compteur du plafond de démarrage au total ────────────────────────────────────────────────

it('un incident ne remet pas le compteur à zéro (A-7)', () => {
  const commandes: Incident[][] = [...Array.from({ length: 9 }, () => []), ['rupture'], []]
  expect(livreesSansIncident(commandes)).toBe(10)
  expect(quantiteAttribuable(300000, 3, livreesSansIncident(commandes), PP)).toBe(3)
})

// ── L1 · dû du vendeur en tort ──────────────────────────────────────────────────────────────────────────

it('dû du vendeur en tort (RET-04, Q-27)', () => {
  // BLV-51702 : part de livraison du colis 900 F (moteur des frais du client, moteurs/tests/test_ecarts_audit.py).
  const r = rembourserRetour(23000, 'vendeur', PLT, 900)
  let d = duDuVendeur(r, 0, PLT)
  expect([d.trajet, d.livraison, d.total, d.prisSurLaCommande, d.reporte]).toEqual([500, 900, 1400, 0, 1400])
  const net = appliquerReprise(10000, d.reporte, '2026-09-24', '2026-09-25', PV)
  expect([net.verse, net.repris]).toEqual([8600, 1400]) // déduit du vendredi suivant
  d = duDuVendeur(r, 1000, PLT)
  expect([d.prisSurLaCommande, d.reporte]).toEqual([1000, 400])
  expect(duDuVendeur(r, 5000, PLT).reporte).toBe(0)
  expect(duDuVendeur(rembourserRetour(23000, 'client', PLT), 0, PLT).total).toBe(0)
  expect(duDuVendeur(rembourserRetour(23000, 'transporteur', PLT), 0, PLT).total).toBe(0)
  expect(() => duDuVendeur(r, -1, PLT)).toThrow(RangeError)
})

// ── L2 · gel pendant le recours ─────────────────────────────────────────────────────────────────────────

it('gel pendant le recours (Q-26, L-4)', () => {
  const decision = t(9, 26, 17, 15)
  expect(finDuGel(decision, null, null, PLT)).toBe(t(9, 28, 17, 15))
  expect(finDuGel(decision, t(9, 27, 9), null, PLT)).toBe(null)
  expect(finDuGel(decision, t(9, 27, 9), t(9, 29, 11), PLT)).toBe(t(9, 29, 11))
  expect(finDuGel(decision, t(9, 28, 17, 16), null, PLT)).toBe(t(9, 28, 17, 15))
  // Libération prévue lun. 21 : partie à la fin du gel, versée le vendredi 2 oct.
  const libre = liberationApresLitige(t(9, 21, 18), finDuGel(decision, null, null, PLT)!)
  expect(vendrediDeVersement(libre, PV)).toBe('2026-10-02')
})

// ── A-8 · reprise jamais payée ──────────────────────────────────────────────────────────────────────────

it.each([
  ['2026-10-20', 'déduite des versements', false, false, false],
  ['2026-10-21', 'ventes bloquées', true, true, false],
  ['2026-12-19', 'ventes bloquées', true, true, false],
  ['2026-12-20', 'recouvrement légal proposé', true, true, true],
] as [string, EtatReprise, boolean, boolean, boolean][])('reprise jamais payée, le %s', (jour, etat, bloquees, demande, humaine) => {
  expect(suiviReprise(7840, '2026-09-20', jour, PV)).toEqual({ etat, ventesBloquees: bloquees, demandeMobileMoney: demande, decisionHumaine: humaine })
})

it('reprise soldée : le blocage est levé', () => {
  expect(suiviReprise(0, '2026-09-20', '2027-01-01', PV).etat).toBe('soldée')
  expect(() => suiviReprise(-1, '2026-09-20', '2026-09-21', PV)).toThrow(RangeError)
})
