// Règles du groupe S3 : lecture du registre (aucune valeur dans le code) et calculs des écrans KYC, paliers, sanctions,
// catalogue, modération, avis, clients et qualité.
import { describe, expect, it } from 'vitest'
import { REGISTRE } from '../../../calculs/registre'
import { HEURE, JOUR, yaounde } from '../../../calculs/temps'
import * as R from './regles'

const P = R.P3

describe('registre S3', () => {
  it('lit chaque paramètre avec sa forme', () => {
    expect(P.kycRevueH).toBe(48)
    expect(P.seuilVisage).toBeCloseTo(0.85)
    expect(P.paliersVendeur).toEqual({ argent: 65, or: 80, platine: 90 })
    expect(P.paliersLivreur).toEqual({ confirme: 70, or: 85 })
    expect([P.hystJ, P.hystEcart, P.baisseMax, P.veto]).toEqual([14, 5, 8, 39])
    expect(P.ecartMax).toBeCloseTo(0.5)
    expect([P.prixBarreJours, P.prixBarreFenetre]).toEqual([7, 30])
    expect([P.conseilCentile, P.ficheDelaiH, P.fichePrioriteH]).toEqual([10, 48, 24])
    expect([P.payNouveau, P.payStandard, P.payFidele, P.payRefus]).toEqual([15000, 50000, 100000, 2])
    expect([P.appareilVendeur, P.appareilLivreur]).toEqual([2, 1])
  })
  it('lit le registre officiel seulement ; une forme inattendue arrête la lecture', () => {
    expect(R.lireS3(REGISTRE).hystJ).toBe(14)
    expect(() => R.lireS3({ ...REGISTRE, 'MOD-ECART-MAX': { code: 'MOD-ECART-MAX', valeur: 'la moitié', unite: '%' } })).toThrow()
  })
})

describe('délais', () => {
  it('48 heures ouvrées sautent le dimanche', () => {
    const samedi = yaounde(2026, 10, 10, 10)
    expect(R.echeanceOuvree(samedi, 48)).toBe(samedi + 72 * HEURE)
    const mardi = yaounde(2026, 10, 13, 10)
    expect(R.echeanceOuvree(mardi, 48)).toBe(mardi + 48 * HEURE)
  })
  it('droit de réponse : le jour de l’avis ne compte pas (23 sept. → 23 oct. 23 h 59)', () => {
    expect(R.finDroitReponse(yaounde(2026, 9, 23, 18, 40))).toBe(yaounde(2026, 10, 23, 23, 59))
  })
})

describe('KYC', () => {
  it('approuver exige chaque pièce ouverte', () => {
    expect(R.approuvable([{ vue: true }, { vue: false }])).toBe(false)
    expect(R.approuvable([{ vue: true }, { vue: true }])).toBe(true)
  })
  it('doublon : même visage et rôles déclarés, sinon prête-nom', () => {
    expect(R.doublonAutorise(0.97, true)).toBe(true)
    expect(R.doublonAutorise(0.6, true)).toBe(false)
    expect(R.doublonAutorise(0.97, false)).toBe(false)
  })
  it('conflit d’intérêts : jamais sur son propre compte d’acteur', () => {
    expect(R.conflitInterets('a-franck', 'a-franck')).toBe(true)
    expect(R.conflitInterets('a-armand', 'a-franck')).toBe(false)
  })
})

describe('Trust Score et paliers', () => {
  it('seuils de descente : vendeur 5 points sous le seuil, livreur au seuil', () => {
    expect(R.seuilDescente('argent', 'vendeur')).toBe(60)
    expect(R.seuilDescente('confirme', 'livreur')).toBe(70)
    expect(R.seuilDescente('bronze', 'vendeur')).toBeNull()
  })
  it('descente proposée après 14 jours de suite sous le seuil', () => {
    const h = [...Array(5).fill(66), ...Array(14).fill(59)]
    expect(R.descenteProposable(h, 60)).toBe(true)
    expect(R.descenteProposable([...h.slice(0, -1), 61], 60)).toBe(false)
  })
  it('baisse bornée à 8 points sauf veto (39)', () => {
    expect(R.recalcul(70, 50, false)).toBe(62)
    expect(R.recalcul(70, 50, true)).toBe(39)
  })
  it('alerte de baisse : 8 points en 7 jours, ou sous 60', () => {
    expect(R.alerteBaisse([80, 80, 79, 78, 76, 74, 73, 71])).toBe('chute')
    expect(R.alerteBaisse([58, 58, 58])).toBe('sous_seuil')
    expect(R.alerteBaisse([72, 73])).toBeNull()
  })
})

describe('catalogue et modération', () => {
  it('écart à la médiane au-delà de 50 % : retenue', () => {
    const e = R.ecartMediane(29500, [14500, 16000, 18000, 19500, 21000])
    expect(e.mediane).toBe(18000)
    expect(e.retenue).toBe(true)
    expect(R.ecartMediane(21000, [18000]).retenue).toBe(false)
  })
  it('prix barré : 7 jours pratiqués sur 30', () => {
    const h = [...Array(3).fill(45000), ...Array(27).fill(32000)]
    expect(R.joursPratiques(h, 45000)).toBe(3)
    expect(R.prixBarreValide(h, 45000)).toBe(false)
  })
  it('prix conseillé : 10e centile', () => {
    expect(R.prixConseille([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])).toBe(10)
    expect(R.prixConseille([18000, 21000, 19500, 16000, 14500, 17000, 15000, 20000, 22000, 23000, 24000])).toBe(15000)
  })
  it('poids facturé et taxonomie sans doublon', () => {
    expect(R.poidsFacture(6.8, [38, 30, 22])).toBe(6.8)
    expect(R.poidsFacture(1, [50, 40, 30])).toBe(12)
    expect(R.sousCategorieEnDouble('écouteurs', ['Smartphones', 'Ecouteurs'])).toBe('Ecouteurs')
  })
  it('fusion en tête de file et réversible 30 jours', () => {
    expect(R.fusionEnTete(0.97)).toBe(true)
    expect(R.fusionEnTete(0.89)).toBe(false)
    expect(R.fusionReversibleJusqua(0)).toBe(30 * JOUR)
  })
})

describe('avis et clients', () => {
  it('masquage seulement d’un contenu illicite ; numéros masqués', () => {
    expect(R.masquagePossible('insulte')).toBe(true)
    expect(R.masquagePossible('faux_avis')).toBe(false)
    expect(R.masquerNumeros('Appelez-moi au 6 77 12 42 17 svp')).toBe('Appelez-moi au [numéro masqué] svp')
  })
  it('rétrogradation : 5 commandes et croisement chargé', () => {
    expect(R.retrogradationPossible({ commandes: 4, croisementCharge: true })).toBe('trop_tot')
    expect(R.retrogradationPossible({ commandes: 7, croisementCharge: false })).toBe('sans_croisement')
    expect(R.retrogradationPossible({ commandes: 7, croisementCharge: true })).toBe('ok')
  })
  it('paiement au retrait et remboursement automatique selon le palier', () => {
    expect(R.plafondRetrait({ commandesSansIncident: 6, refusRetrait: 0, palier: 'standard' })).toBe(100000)
    expect(R.plafondRetrait({ commandesSansIncident: 3, refusRetrait: 0, palier: 'standard' })).toBe(50000)
    expect(R.plafondRetrait({ commandesSansIncident: 9, refusRetrait: 2, palier: 'standard' })).toBeNull()
    expect(R.seuilRemboursementAuto('plafonne')).toBe(0)
    expect(R.seuilRemboursementAuto('eleve')).toBe(10000)
  })
})
