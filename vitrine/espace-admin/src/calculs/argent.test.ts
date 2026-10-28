// Règles d'argent S2 : lecture du registre et calculs (commission V02, versements, remboursements, Wallet).
import { describe, expect, it } from 'vitest'
import { ARGENT, commission, controleAuto, gardePayee, remboursementCalcule, remiseDePlan, retraitWallet, versementRelais, versementVendeur } from './argent'

describe('registre de l’argent', () => {
  it('lit les frais, seuils et taux sans valeur dans le code', () => {
    expect(ARGENT.fraisClient).toBe(2)
    expect(ARGENT.fraisVersementVendeur).toBe(1)
    expect(ARGENT.seuilRemboursement).toBe(100000)
    expect(ARGENT.seuilVersement).toBe(400000)
    expect(ARGENT.taux.telephonie.Bronze).toBe(20)
    expect(ARGENT.taux.supermarche.Platine).toBe(5)
    expect(ARGENT.gardeGrille.reduce((n, x) => n + x, 0)).toBe(2000)
    expect(ARGENT.walletPlafond).toBe(2500000)
    expect(ARGENT.relaisColis).toEqual({ S: 200, M: 250, L: 400 })
  })
})

describe('commission V02 (DP-65)', () => {
  it('taux catégorie × palier sur tout le prix, découverte × 0,80, un seul arrondi', () => {
    const c = commission([{ famille: 'telephonie', prix: 20000 }], 'Bronze', true)
    expect(c.retenue).toBe(3200)
    expect(c.garde).toBe(16800)
  })
  it('sans plafond par article', () => {
    expect(commission([{ famille: 'telephonie', prix: 335324 }], 'Bronze', false).retenue).toBe(67065)
  })
  it('points petit prix et plancher MAX(700 F ; 2 %)', () => {
    const c = commission([{ famille: 'telephonie', prix: 3000 }], 'Bronze', false)
    expect(c.auPlancher).toBe(true)
    expect(c.retenue).toBe(700)
  })
  it('Made in Cameroon : −2 points ; jamais sous 5 %', () => {
    expect(commission([{ famille: 'supermarche', prix: 10000, mic: true }], 'Platine', false).retenue).toBe(700)
    expect(commission([{ famille: 'supermarche', prix: 100000, mic: true }], 'Platine', false).retenue).toBe(5000)
  })
  it('remise de plan plafonnée au prix du plan', () => {
    expect(remiseDePlan('Boost', 20000)).toBe(1000)
    expect(remiseDePlan('Boost', 100000)).toBe(2500)
  })
})

describe('versements', () => {
  it('vendeur : reprise puis 1 % Mobile Money', () => {
    expect(versementVendeur(16800, 500)).toMatchObject({ brut: 16300, frais: 163, verse: 16137 })
    expect(versementVendeur(16850, 0)).toMatchObject({ brut: 16850, frais: 169, verse: 16681 }) // R22 : franc supérieur
  })
  it('relais : colis + garde − espèces ; négatif → 0 F et dette', () => {
    const v = versementRelais({ colis: { S: 41, M: 0, L: 0 }, joursGarde: 58, especes: 16500, detteAnterieure: 0 })
    expect(v.verse).toBe(0)
    expect(v.dette).toBe(2500)
  })
})

describe('remboursements', () => {
  it('renvoi pour garde dépassée : payé − 2 000 F', () => {
    expect(gardePayee(7)).toBe(2000)
    expect(remboursementCalcule('renvoi_garde', { articles: 24000, livraison: 900, joursGarde: 7 }).total).toBe(22900)
  })
  it('automatique : seuil, compteurs, doute', () => {
    expect(controleAuto({ article: 2500, palierEleve: false, commandesSansLitige: 6, photo: true, delaiH: 10, sur30j: 0, surAn: 1, doute: false }).eligible).toBe(true)
    expect(controleAuto({ article: 4000, palierEleve: false, commandesSansLitige: 6, photo: true, delaiH: 10, sur30j: 0, surAn: 1, doute: false }).eligible).toBe(false)
    expect(controleAuto({ article: 4000, palierEleve: true, commandesSansLitige: 6, photo: true, delaiH: 10, sur30j: 1, surAn: 1, doute: false }).eligible).toBe(false)
  })
  it('retrait du Wallet : 1 %, 100 F au moins (WALLET-RETRAIT-FRAIS), minimum, solde retirable seul', () => {
    expect(retraitWallet(10000, 20000)).toMatchObject({ frais: 100, recu: 9900, ok: true })
    expect(retraitWallet(5000, 20000)).toMatchObject({ frais: 100, recu: 4900 })
    expect(retraitWallet(20000, 20000)).toMatchObject({ frais: 200, recu: 19800 })
    expect(retraitWallet(500, 20000).raison).toBe('minimum')
    expect(retraitWallet(30000, 20000).raison).toBe('solde')
  })
})
