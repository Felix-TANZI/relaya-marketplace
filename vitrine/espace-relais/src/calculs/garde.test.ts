// Mêmes exemples que moteurs/tests/test_garde.py (BLV-52018, Relais Mvog-Ada, septembre 2026) : le portage TypeScript
// doit dire exactement ce que dit le moteur Python. PAYE_52018 (34 180 F) est le total calculé par frais.calculer dans
// le test Python (33 400 + 880 + 2 × 400 − 900, DP-18).
import { describe, expect, it } from 'vitest'
import { ParametreIllisible } from './erreurs'
import { dernierJourDeRetrait, etat, groupe, horaires, j0De, j1De, jourDuRang, joursDeGarde, rang, rappels, relanceNonVu, renvoi, reglementAuRetrait, tarifDuJour } from './garde'
import { PARAMETRES, REGISTRE, lireGarde } from './registre'
import { HEURE, ajouterJours, yaounde } from './temps'

const P = PARAMETRES.relais.garde
const MVOG_ADA = horaires(8 * 60, 19 * 60, [6])
const [LUN_21, MAR_22, MER_23, JEU_24, VEN_25, SAM_26, DIM_27, LUN_28] = [21, 22, 23, 24, 25, 26, 27, 28].map((d) => `2026-09-${d}`)
const PAYE_52018 = 34_180
const BLV_52018 = groupe('BLV-52018', LUN_21, 33_400, PAYE_52018, false, MVOG_ADA)
const tousLesJours = horaires(8 * 60, 19 * 60)
const sept = (d: number) => `2026-09-${String(d).padStart(2, '0')}`
const parCode = (g: Parameters<typeof rappels>[0], montant: number, retire: string | null = null) => Object.fromEntries(rappels(g, P, montant, retire).map((r) => [r.code, r]))

describe('garde (portage de garde.py)', () => {
  it('lit les paramètres', () => {
    expect(P.grille).toEqual([0, 100, 100, 100, 200, 500, 1_000])
    expect([P.renvoi, P.gainRelaisJour]).toEqual([0, 100]) // v6 : renvoi sans autre frais
    // Gros colis : 300 F (DP-08) ou 0 F au lancement (A-VALIDER ARL-07) selon le registre ; l'exemple DP-08 est
    // calculé plus bas avec ses propres valeurs.
    expect(P.gainRelaisJourGros).toBeGreaterThanOrEqual(P.gainRelaisJour)
    expect([P.heureRappel, P.nonVuHeures, P.seuilSmsEco]).toEqual([18 * 60, 48, 10_000])
    expect(P.j1PayeParBelivay).toBe(true)
  })

  it.each([
    [LUN_21, 1, 0, 0],
    [MAR_22, 2, 100, 100],
    [MER_23, 3, 100, 200],
    [JEU_24, 4, 100, 300],
    [VEN_25, 5, 200, 500],
    [SAM_26, 6, 500, 1_000],
    [DIM_27, null, 0, 1_000], // fermé : le compteur s'arrête (R37), ni compté ni facturé
    [LUN_28, 7, 1_000, 2_000],
  ])('grille jour par jour : %s', (jour, r, tarif, du) => {
    const e = etat(BLV_52018, jour, P)
    expect([e.rang, e.tarifDuJour, e.du]).toEqual([r, tarif, du])
  })

  it('aujourd’hui jeudi 24 : 300 F dus, 500 F demain ; relais 3 jours + 1er jour payé par BelivaY', () => {
    const e = etat(BLV_52018, JEU_24, P)
    expect([e.du, e.duDemain, e.joursFactures, e.gainRelais, e.payeParBelivay]).toEqual([300, 500, 3, 400, 100])
  })

  it('renvoi le mardi 29 : le dimanche fermé ne compte pas (R37), la garde seule est déduite (R39)', () => {
    const r = renvoi(BLV_52018, P)!
    expect([r.jour, r.garde, r.retenue, r.rembourse]).toEqual(['2026-09-29', 2_000, 2_000, 32_180])
    expect(r.trace.some((l) => l.includes('DP-08'))).toBe(true)
  })

  it('gain du relais : 5 jours facturés + le 1er jour payé par BelivaY', () => expect(etat(BLV_52018, DIM_27, P).gainRelais).toBe(600))
  it('dernier jour de retrait', () => expect(dernierJourDeRetrait(BLV_52018)).toBe(LUN_28))

  it('série de rappels de BLV-52018', () => {
    const s = parCode(BLV_52018, 33_400)
    expect([s.S0.jour, s.S0.heure, s.S0.canal, s.S0.du, s.S0.duDemain]).toEqual([MAR_22, 18 * 60, 'push', 100, 200])
    expect([s.S1.jour, s.S1.heure, s.S1.canal, s.S1.du, s.S1.duDemain]).toEqual([MER_23, 18 * 60, 'SMS', 200, 300])
    expect([s.S2.jour, s.S2.heure, s.S2.canal, s.S2.du, s.S2.duDemain]).toEqual([VEN_25, 18 * 60, 'SMS', 500, 1_000])
    // R37 : le dimanche fermé ne compte pas ; le 7e jour est le lun. 28, « dernier jour » à l'ouverture.
    expect([s.S3.jour, s.S3.heure, s.S3.dernierJourDeRetrait, s.S3.du]).toEqual([SAM_26, 18 * 60, false, 1_000])
    expect([s.S4.jour, s.S4.heure, s.S4.dernierJourDeRetrait, s.S4.du]).toEqual([LUN_28, 8 * 60, true, 2_000])
    expect([s.S5.jour, s.S5.envoye, s.S5.du]).toEqual(['2026-09-29', true, 2_000])
    expect(['S0', 'S1', 'S2', 'S3'].every((c) => s[c].dernierJour === LUN_28)).toBe(true)
  })

  it('rappels quand le 7e jour est ouvert', () => {
    const s = parCode(groupe('X', MAR_22, 33_400, 34_180, false, MVOG_ADA), 33_400)
    // R37 : le dimanche fermé ne compte pas ; le rang 6 est le lun. 28 (S3), le rang 7 le mar. 29.
    expect([s.S3.jour, s.S3.envoye]).toEqual([LUN_28, true])
    expect([s.S4.jour, s.S4.heure, s.S4.dernierJourDeRetrait]).toEqual(['2026-09-29', 8 * 60, true])
    const s2 = parCode(groupe('Y', sept(14), 33_400, 34_180, false, tousLesJours), 33_400)
    expect([s2.S3.heure, s2.S3.dernierJourDeRetrait]).toEqual([18 * 60, false])
    expect([s2.S4.heure, s2.S4.dernierJourDeRetrait]).toEqual([8 * 60, true])
  })

  it('mode économique des SMS', () => {
    const s = parCode(BLV_52018, 9_000)
    expect([s.S1.canal, s.S2.canal]).toEqual(['push', 'push'])
  })

  it('colis retiré avant les rappels', () => {
    const s = parCode(BLV_52018, 33_400, JEU_24)
    expect(s.S0.envoye && s.S1.envoye).toBe(true)
    expect([s.S2.envoye, s.S2.motif, s.S5.envoye]).toEqual([false, 'colis retiré', false])
  })

  it('un constat (litige) suspend la garde et repousse le calendrier (PR-RC-06, ARL-43)', () => {
    const g = groupe('L', LUN_21, 33_400, 34_180, false, MVOG_ADA, { joursSuspendus: [MER_23, JEU_24] })
    expect([MAR_22, MER_23, JEU_24, VEN_25, DIM_27].map((d) => rang(g, d))).toEqual([2, null, null, 3, null])
    expect([etat(g, JEU_24, P).du, etat(g, JEU_24, P).rang, etat(g, VEN_25, P).du]).toEqual([100, null, 200])
    const s = parCode(g, 33_400)
    expect(['S0', 'S1', 'S2', 'S3', 'S4', 'S5'].map((c) => s[c].jour)).toEqual([MAR_22, VEN_25, LUN_28, '2026-09-29', '2026-09-30', '2026-10-01'])
    expect([s.S2.envoye, s.S4.dernierJourDeRetrait]).toEqual([true, true])
    expect(dernierJourDeRetrait(g)).toBe('2026-09-30')
    expect([renvoi(g, P)!.jour, renvoi(g, P)!.garde]).toEqual(['2026-10-01', 2_000])
    expect(joursDeGarde(g, VEN_25, P).map((j) => [j.jour, j.rang, j.tarif, j.ferme, j.suspendu])).toEqual([
      [LUN_21, 1, 0, false, false],
      [MAR_22, 2, 100, false, false],
      [MER_23, null, 0, false, true],
      [JEU_24, null, 0, false, true],
      [VEN_25, 3, 100, false, false],
    ])
    expect(joursDeGarde(g, '2026-10-09', P).length).toBe(10)
    expect(joursDeGarde(groupe('N', null, 1, 1, false, MVOG_ADA), VEN_25, P)).toEqual([])
  })

  it('constat du 3e au 5e jour : renvoi repoussé de 3 jours ; retour décidé : plus de garde', () => {
    const constat = ['2026-10-07', '2026-10-08', '2026-10-09']
    const g = groupe('C', '2026-10-05', 24_000, 25_000, false, tousLesJours, { joursSuspendus: constat })
    expect(Array.from({ length: 11 }, (_, k) => tarifDuJour(g, ajouterJours('2026-10-05', k), P))).toEqual([0, 100, 0, 0, 0, 100, 100, 200, 500, 1_000, 0])
    expect([etat(g, '2026-10-09', P).du, etat(g, '2026-10-10', P).du]).toEqual([100, 200])
    expect([dernierJourDeRetrait(g), renvoi(g, P)!.jour]).toEqual(['2026-10-14', '2026-10-15'])
    expect(renvoi(groupe('S', '2026-10-05', 24_000, 25_000, false, tousLesJours), P)!.jour).toBe('2026-10-12')
    const retour = groupe('R', '2026-10-05', 24_000, 25_000, false, tousLesJours, { joursSuspendus: constat, retourDecide: true })
    const e = etat(retour, '2026-10-09', P)
    expect([e.du, e.duDemain, e.joursFactures, e.gainRelais, e.payeParBelivay]).toEqual([0, 0, 1, 200, 100])
    expect([renvoi(retour, P), rappels(retour, P, 24_000), dernierJourDeRetrait(retour)]).toEqual([null, [], null])
  })

  it('constat dès l’arrivée : le 1er jour est repoussé', () => {
    const g = groupe('A', '2026-10-05', 24_000, 25_000, false, tousLesJours, { joursSuspendus: ['2026-10-05'] })
    expect([jourDuRang(g, 1), etat(g, '2026-10-05', P).payeParBelivay, etat(g, '2026-10-06', P).payeParBelivay]).toEqual(['2026-10-06', 0, 100])
  })

  it('gros colis (DP-08) : 300, 400, 400, 400, 500, 800, 1 300 F', () => {
    const P = { ...PARAMETRES.relais.garde, ajoutGros: 300, gainRelaisJourGros: 300 } // valeurs de DP-08
    const g = groupe('G', sept(14), 200_000, 200_900, true, tousLesJours)
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => tarifDuJour(g, sept(14 + k), P))).toEqual([300, 400, 400, 400, 500, 800, 1_300])
    const e = etat(g, sept(20), P)
    expect([e.du, e.joursFactures, e.gainRelais]).toEqual([4_100, 7, 2_100])
    expect(renvoi(g, P)!.retenue).toBe(4_100)
  })

  it('garde plafonnée à la valeur du colis', () => expect(etat(groupe('P', sept(14), 600, 1_500, false, tousLesJours), sept(20), P).du).toBe(600))

  it('retenue jamais au-delà du payé (DP-24)', () => {
    const r = renvoi(groupe('BLV-51940', sept(14), 24_000, 900, false, tousLesJours), P)!
    expect([r.retenue, r.rembourse]).toEqual([900, 0])
    expect(r.trace.some((l) => l.includes('DP-24'))).toBe(true)
  })

  it('sans avis délivré, rien n’est facturé', () => {
    const g = groupe('N', null, 33_400, 34_180, false, MVOG_ADA)
    expect(etat(g, LUN_28, P).du).toBe(0)
    expect([renvoi(g, P), rappels(g, P, 33_400), dernierJourDeRetrait(g)]).toEqual([null, [], null])
    expect(relanceNonVu(yaounde(2026, 9, 21, 17, 40), P)).toBe(yaounde(2026, 9, 23, 17, 40))
  })

  it('avant J0', () => expect(etat(BLV_52018, '2026-09-20', P).du).toBe(0))

  it('un relais fermé toute la semaine est refusé', () => expect(() => horaires(480, 1140, [0, 1, 2, 3, 4, 5, 6])).toThrow(/fermé tous les jours/))

  it('fermeture longue : le compteur s’arrête (R37), 7 jours ouverts après la réouverture', () => {
    const fermetures = [...Array.from({ length: 10 }, (_, k) => sept(21 + k)), ...Array.from({ length: 30 }, (_, k) => `2026-10-${String(k + 1).padStart(2, '0')}`)]
    const g = groupe('F', LUN_21, 1_000, 1_000, false, horaires(480, 1140, [], fermetures))
    expect([dernierJourDeRetrait(g), renvoi(g, P)!.jour]).toEqual(['2026-11-06', '2026-11-07'])
  })

  it('variante : fermeture le jeudi 24', () => {
    const g = groupe('BLV-52018', LUN_21, 33_400, PAYE_52018, false, horaires(480, 1140, [6], [JEU_24]))
    expect([JEU_24, VEN_25, SAM_26].map((d) => etat(g, d, P).du)).toEqual([200, 300, 500])
    expect(renvoi(g, P)!.retenue).toBe(2_000)
  })

  it('gain du relais même sous le plafond de la valeur (v6 D12, ARL-130)', () => {
    const g = groupe('V', sept(14), 150, 1_050, false, tousLesJours)
    const e = etat(g, sept(20), P)
    expect([e.du, e.gainRelais, e.payeParBelivay]).toEqual([150, 700, 100])
    const r = reglementAuRetrait(g, sept(20), true, P)
    expect([r.especesAEncaisser, r.partDuRelais, r.aReverserABelivay]).toEqual([150, 700, -550])
    const rv = renvoi(g, P)!
    expect([rv.retenue, rv.rembourse, rv.gainRelais, rv.payeParBelivay]).toEqual([150, 900, 700, 700])
  })

  it('commande au comptoir non retirée : comptée comme un refus, le relais touche ses jours (ARL-07, ARL-09)', () => {
    const r = renvoi(groupe('G', sept(14), 200_000, 900, true, tousLesJours, { auComptoir: true }), P)!
    expect([r.retenue, r.gainRelais, r.payeParBelivay, r.compteCommeRefus]).toEqual([900, 700, 700, true])
    const offert = renvoi(groupe('O', sept(14), 32_000, 0, false, tousLesJours, { auComptoir: true }), P)!
    expect([offert.retenue, offert.rembourse, offert.gainRelais, offert.payeParBelivay]).toEqual([0, 0, 700, 700])
    expect(offert.trace.at(-1)!.startsWith('Relais : 700')).toBe(true)
    // Avec le supplément de DP-08 (300 F par jour dès le J1) : 7 jours × 300 F, quelle que soit la retenue.
    const dp08 = renvoi(groupe('G', sept(14), 200_000, 900, true, tousLesJours, { auComptoir: true }), { ...P, ajoutGros: 300, gainRelaisJourGros: 300 })!
    expect([dp08.retenue, dp08.gainRelais]).toEqual([900, 2_100])
  })

  it('renvoi d’une commande payée : le relais payé par BelivaY (ARL-08)', () => {
    const r = renvoi(BLV_52018, P)!
    expect([r.gainRelais, r.payeParBelivay]).toEqual([700, 700]) // R37, R38 : 6 jours facturés + le 1er jour
    const g = renvoi(groupe('BLV-51940', sept(14), 24_000, 500, false, tousLesJours), P)!
    expect([g.retenue, g.gainRelais]).toEqual([500, 700])
  })

  it('gros colis (ARL-07) : grille v6, 1er jour payé par BelivaY', () => {
    const g = groupe('G', sept(14), 200_000, 200_900, true, tousLesJours)
    expect([0, 1, 2, 3, 4, 5, 6].map((k) => tarifDuJour(g, sept(14 + k), P))).toEqual([0, 100, 100, 100, 200, 500, 1_000])
    const e = etat(g, sept(20), P)
    expect([e.du, e.joursFactures, e.gainRelais, e.payeParBelivay]).toEqual([2_000, 6, 700, 100])
    expect(renvoi(g, P)!.retenue).toBe(2_000)
  })

  it('ajout du jour plafonné', () => {
    const e = etat(groupe('P', sept(14), 600, 1_500, false, tousLesJours), sept(19), P)
    expect([e.tarifDuJour, e.ajoutDuJour, e.du]).toEqual([500, 100, 600])
  })

  it('dernier jour quand les rangs 6 et 7 sont fermés', () => {
    // R37 : le compteur s'arrête samedi et dimanche ; rangs 6 et 7 les lun. 28 et mar. 29 ; tous les rappels partent.
    const s = parCode(groupe('W', LUN_21, 33_400, 34_180, false, horaires(480, 1140, [5, 6])), 33_400)
    expect([s.S4.jour, s.S4.heure, s.S4.dernierJourDeRetrait]).toEqual(['2026-09-29', 8 * 60, true])
    expect(s.S3.envoye && s.S4.envoye).toBe(true)
  })

  it('dernier jour sans rappel prévu ce jour-là', () => {
    const s4 = parCode(groupe('X', LUN_21, 33_400, 34_180, false, horaires(480, 1140, [4, 5, 6])), 33_400).S4
    expect([s4.jour, s4.heure, s4.dernierJourDeRetrait, s4.envoye]).toEqual(['2026-09-30', 8 * 60, true, true])
  })

  it('pas de renvoi pendant un litige', () => {
    const g = groupe('L', LUN_21, 33_400, 34_180, false, MVOG_ADA, { joursSuspendus: [DIM_27, LUN_28, '2026-09-29'] })
    expect(renvoi(g, P)!.jour).toBe('2026-10-01') // le 7e jour passe au mer. 30 (PR-RC-06)
  })

  it('S5 non envoyé si retiré le jour du renvoi', () => expect(parCode(BLV_52018, 33_400, LUN_28).S5.envoye).toBe(false))

  it('message non délivré : la garde de la période est annulée (CSM-30)', () => {
    const g = groupe('M', LUN_21, 33_400, 34_180, false, MVOG_ADA, { rappelsNonDelivres: [MER_23] })
    expect([MAR_22, MER_23, JEU_24, VEN_25].map((d) => tarifDuJour(g, d, P))).toEqual([100, 0, 0, 200])
  })

  it('J0 et J1 à Yaoundé', () => {
    expect(j0De(Date.UTC(2026, 8, 20, 23, 30))).toBe(LUN_21) // 0 h 30 à Douala
    expect(() => groupe('N', null, 1, 1, false, MVOG_ADA) && jourDuRang(groupe('N', null, 1, 1, false, MVOG_ADA), 2)).toThrow()
    // GARDE-J1-DEBUT : dépôt du dernier colis à 18 h 50, avis délivré le lendemain à 7 h 10 : J1 = le lendemain.
    expect(j1De(yaounde(2026, 10, 10, 18, 50), yaounde(2026, 10, 11, 7, 10))).toBe('2026-10-11')
    expect(j1De(yaounde(2026, 10, 13, 11, 10), yaounde(2026, 10, 13, 11, 12))).toBe('2026-10-13')
    expect(() => j1De(yaounde(2026, 10, 13, 11, 10), yaounde(2026, 10, 13, 11, 0))).toThrow()
  })

  it.each([
    ['GARDE-J4-5', '200 F le jour 4, 200 F le jour 5'],
    ['GARDE-PRORATA', 'au prorata'],
    ['GARDE-FERME', 'facturé'],
    ['GARDE-GRILLE', '0, 100, 100'],
  ])('registre incohérent (%s) : arrêt', (code, v) => expect(() => lireGarde({ ...REGISTRE, [code]: v })).toThrow(ParametreIllisible))

  it('renvoi reporté si le relais est fermé le 8e jour', () => {
    const g = groupe('R', LUN_21, 33_400, 34_180, false, horaires(480, 1140, [6], [LUN_28]))
    expect(renvoi(g, P)!.jour).toBe('2026-09-30') // dim. 27 et lun. 28 non comptés (R37)
  })

  it('litige pendant les sept premiers jours : tout le calendrier repoussé', () => {
    const g = groupe('Z', LUN_21, 33_400, 34_180, false, MVOG_ADA, { joursSuspendus: Array.from({ length: 7 }, (_, k) => ajouterJours(LUN_21, k)) })
    expect([etat(g, DIM_27, P).du, jourDuRang(g, 1)]).toEqual([0, LUN_28])
    expect(dernierJourDeRetrait(g)).toBe('2026-10-05')
    const s = parCode(g, 33_400)
    expect([s.S0.jour, s.S0.envoye, s.S4.jour, s.S4.dernierJourDeRetrait, s.S5.jour]).toEqual(['2026-09-29', true, '2026-10-05', true, '2026-10-06'])
  })

  it('garde par colis (R36) : chacun paie la grille, plafonnée à sa valeur ; 100 F par jour et par colis (R38)', () => {
    const g = groupe('2C', sept(14), 25_500, 26_000, false, tousLesJours, { colis: [24_000, 1_500] })
    const e = etat(g, sept(20), P)
    expect([e.du, e.gainRelais, e.payeParBelivay]).toEqual([2_000 + 1_500, 1_400, 200])
  })
})

describe('règlement au retrait en espèces (v6 D12, GARDE-ESPECES)', () => {
  it('3e jour : 200 F encaissés, 300 F au relais, BelivaY doit 100 F au relais', () => {
    const g = groupe('E', sept(14), 33_400, 34_180, false, tousLesJours)
    const bloque = reglementAuRetrait(g, sept(16), false, P)
    expect([bloque.remisePossible, bloque.especesAEncaisser, bloque.partDuRelais, bloque.aReverserABelivay]).toEqual([false, 200, 300, -100])
    expect(reglementAuRetrait(g, sept(16), true, P).remisePossible).toBe(true)
    // Garde nulle (1er jour) : rien à encaisser, remise possible ; le relais touche le 1er jour payé par BelivaY.
    const j1 = reglementAuRetrait(g, sept(14), false, P)
    expect([j1.remisePossible, j1.especesAEncaisser, j1.partDuRelais]).toEqual([true, 0, 100])
  })
  it('7 jours ouverts : 2 000 F payés par le client, 700 F au relais (v6 D12)', () => {
    const r = reglementAuRetrait(groupe('S', sept(14), 33_400, 34_180, false, tousLesJours), sept(20), true, P)
    expect([r.especesAEncaisser, r.partDuRelais, r.aReverserABelivay]).toEqual([2_000, 700, 1_300])
  })
  it('relance non vu : GARDE-NONVU-H heures', () => expect(relanceNonVu(0, P)).toBe(48 * HEURE))
})
