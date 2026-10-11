// Mêmes exemples que moteurs/tests/test_publicite.py (DP-59).
import { describe, expect, it } from 'vitest'
import { Dec } from './argent'
import type { Famille } from './commission'
import { OffreRefusee, ParametreIllisible, VenteInvalide } from './erreurs'
import {
  AnnonceRefusee, attribuerEmplacements, classer, clicFacture, commissionVenteFlash, debiter, diffusable, encheresAuClic,
  facturePublicitaire, lirePublicite, motifsIneligibilite, PARAMETRES_PUBLICITE, placerAnnonces, prixBoost, recharger,
  remboursementNonDiffuse, scoreClassement, verifierEligibilite, verifierEnchereClic, verifierRemiseFlash,
  type Enchere, type ResultatAffiche,
} from './publicite'
import { lireCommission, REGISTRE } from './registre'

const R = REGISTRE
const P = lirePublicite(R)
const PC = lireCommission(REGISTRE)
const avec = (m: Record<string, string>) => lirePublicite({ ...R, ...m })
const E = (campagne: string, montant: number, ordre = 0): Enchere => ({ campagne, montant, ordre })
const ligne = (famille: Famille, prixUnitaire: number) => ({ famille, prixUnitaire })

describe('publicité (DP-59)', () => {
  it('paramètres du registre', () => {
    expect([P.trustMin, P.clicPlancher, P.pasEnchere, P.budgetMin]).toEqual([60, 25, 1, 500])
    expect([P.partMaxPourCent.texte(), P.maxParFenetre, P.fenetre]).toEqual(['20', 2, 10])
    expect(P.aLaUne).toEqual({ places: 4, tarifSemaine: 15000, enchereMin: 10000 })
    expect(P.carrousel).toEqual({ places: 3, tarifSemaine: 25000, enchereMin: 20000 })
    expect([P.flashPoints.texte(), P.flashRemiseMinPourCent.texte()]).toEqual(['3', '10'])
    expect([P.boost24h, P.boost7j, P.boostPlafond.texte(), P.rechargeMin]).toEqual([1000, 5000, '1.5', 1000])
    expect(PARAMETRES_PUBLICITE.clicPlancher).toBe(25)
  })
  it.each([
    ['VD-PUB-CLIC', '25 F le clic'],
    ['VD-PUB-BOOST', '24 h : 1 000 F · 7 jours : 5 000 F ; classement × 0,9 au plus'],
    ['VD-PUB-DENSITE', "20 % des positions au plus ; 11 annonces au plus sur 10 résultats ; jamais au-dessus d'une offre moins chère et mieux notée du même produit"],
    ['VD-PUB-DENSITE', "20 % des positions au plus ; 0 annonces au plus sur 10 résultats ; jamais au-dessus d'une offre moins chère et mieux notée du même produit"],
    ['VD-PUB-A-LA-UNE', '4 places'],
  ])('paramètre illisible %s', (code, valeur) => {
    expect(() => avec({ [code]: valeur })).toThrow(ParametreIllisible)
  })

  it('éligibilité', () => {
    expect(motifsIneligibilite(3, 60, 0, P)).toEqual([])
    verifierEligibilite(1, Dec.de('72.5'), 0, P)
    expect(motifsIneligibilite(0, 59, 1, P)).toEqual(['rupture', 'score', 'litige'])
    expect(() => verifierEligibilite(5, 80, 1, P)).toThrow(/litige en cours/)
  })

  it('enchère au clic : second prix + 1 F', () => {
    expect(encheresAuClic([E('a', 60), E('b', 40), E('c', 30), E('d', 20)], 2, P).map((x) => [x.campagne, x.cout])).toEqual([['a', 41], ['b', 31]])
    expect(encheresAuClic([E('a', 80), E('x', 10)], 3, P)[0].cout).toBe(25)
    expect(encheresAuClic([E('n', 50, 2), E('v', 50, 1)], 2, P).map((x) => [x.campagne, x.cout])).toEqual([['v', 50], ['n', 25]])
    expect(encheresAuClic([E('a', 25), E('b', 25)], 1, P)[0].cout).toBe(25)
    expect(() => encheresAuClic([{ campagne: 'a', montant: true as unknown as number }], 1, P)).toThrow(AnnonceRefusee)
  })

  it('enchère et budget vérifiés', () => {
    verifierEnchereClic(30, 500, P)
    expect(() => verifierEnchereClic(24, 500, P)).toThrow(/au moins 25/)
    expect(() => verifierEnchereClic(30, 499, P)).toThrow(/VD-PUB-BUDGET/)
    expect(() => verifierEnchereClic(800, 600, P)).toThrow(/VD-PUB-BUDGET/)
  })

  it('clic facturé une fois par jour et dans le budget', () => {
    expect(clicFacture(41, false, 0, 500, 1000)).toBe(41)
    expect(clicFacture(41, true, 0, 500, 1000)).toBe(0)
    expect(clicFacture(41, false, 470, 500, 1000)).toBe(0)
    expect(clicFacture(41, false, 0, 500, 40)).toBe(0)
    expect(diffusable(41, 459, 500, 41) && !diffusable(41, 460, 500, 41)).toBe(true)
    expect(() => clicFacture(-1, false, 0, 500, 1000)).toThrow(AnnonceRefusee)
  })

  const r = (cle: string, prix = 10000, note = '4', produit?: string): ResultatAffiche => ({ cle, produit: produit ?? cle, prix, note: Dec.de(note) })
  const organiques = () => Array.from({ length: 12 }, (_, i) => r(`o${i}`))

  it('densité : 2 sur 10 et 20 %', () => {
    const pos = placerAnnonces(organiques(), [r('a1'), r('a2'), r('a3'), r('a4')], P)
    expect(pos.map((x, i) => (x.sponsorise ? i : -1)).filter((i) => i >= 0)).toEqual([0, 5, 10])
    expect(pos.length).toBe(15)
    expect(placerAnnonces(organiques().slice(0, 4), [r('a1'), r('a2')], P).filter((x) => x.sponsorise).length).toBe(1)
    expect(placerAnnonces(organiques().slice(0, 3), [r('a1')], P).some((x) => x.sponsorise)).toBe(false)
  })

  it('jamais au-dessus d’une offre moins chère et mieux notée', () => {
    const o = [r('o0'), r('o1'), r('tel-B', 9000, '4.6', 'tel'), ...Array.from({ length: 9 }, (_, i) => r(`o${i + 3}`))]
    const pos = placerAnnonces(o, [r('tel-A', 10000, '4.2', 'tel')], P)
    const i = pos.findIndex((x) => x.sponsorise)
    expect(i).toBe(5)
    expect(pos.map((x) => x.resultat.cle).indexOf('tel-B')).toBeLessThan(i)
    o[2] = r('tel-B', 9000, '4.0', 'tel')
    expect(placerAnnonces(o, [r('tel-A', 10000, '4.2', 'tel')], P)[0].sponsorise).toBe(true)
    const court = [...Array.from({ length: 5 }, (_, i) => r(`o${i}`)), r('tel-B', 9000, '4.6', 'tel')]
    expect(placerAnnonces(court, [r('tel-A', 10000, '4.2', 'tel')], P).some((x) => x.sponsorise)).toBe(false)
  })

  it('annonce déjà dans les résultats', () => {
    expect(placerAnnonces(organiques(), [r('o0')], P).some((x) => x.sponsorise)).toBe(false)
    const pos = placerAnnonces(organiques(), [r('o7')], P)
    expect(pos[0].sponsorise && pos.filter((x) => x.resultat.cle === 'o7').length === 1 && pos.length === 12).toBe(true)
  })

  it('emplacements : tarif fixe et enchère', () => {
    const demandes = Array.from({ length: 6 }, (_, i) => E(`c${i}`, 0, 9 - i))
    const g = attribuerEmplacements('a_la_une', 'fixe', demandes, P)
    expect(g.map((x) => x.campagne)).toEqual(['c5', 'c4', 'c3', 'c2'])
    expect(new Set(g.map((x) => x.cout))).toEqual(new Set([15000]))
    const bids = [E('a', 30000), E('b', 26000), E('c', 22000), E('d', 21000), E('e', 19000)]
    expect(attribuerEmplacements('carrousel', 'enchere', bids, P).map((x) => [x.campagne, x.cout])).toEqual([['a', 26001], ['b', 22001], ['c', 21001]])
    expect(attribuerEmplacements('carrousel', 'enchere', bids, P, 1).map((x) => [x.campagne, x.cout])).toEqual([['a', 26001]])
    expect(attribuerEmplacements('a_la_une', 'fixe', demandes, P, -2)).toEqual([])
  })

  it('remise flash', () => {
    expect(verifierRemiseFlash(20000, 18000, P)).toBe(10)
    expect(verifierRemiseFlash(3000, 2650, P)).toBe(11)
    expect(() => verifierRemiseFlash(20000, 18001, P)).toThrow(/FLASH-REMISE-MIN/)
    expect(() => verifierRemiseFlash(0, 1, P)).toThrow(AnnonceRefusee)
  })

  it('commission de vente flash majorée', () => {
    const itel = [ligne('A', 18000)]
    const f = commissionVenteFlash(itel, 'Bronze', false, PC, P)
    expect([f.commissionNormale, f.majoration.texte(), f.commission, f.garde]).toEqual([2430, '540', 2970, 15030])
    expect(f.trace.at(-1)).toContain('VD-PUB-FLASH-MAJORATION')
    expect(commissionVenteFlash(itel, 'Platine', false, PC, P).commission).toBe(1998)
    expect(commissionVenteFlash([ligne('C', 1000)], 'Bronze', false, PC, P).commission).toBe(730)
    const mele = [ligne('A', 18000), ligne('A', 2000)]
    expect(commissionVenteFlash(mele, 'Bronze', false, PC, P, 18000).commission).toBe(2430 + 330 + 540)
    for (const base of [-1, 20001, true as unknown as number]) expect(() => commissionVenteFlash(mele, 'Bronze', false, PC, P, base)).toThrow(VenteInvalide)
  })

  it('vente flash refusée si le vendeur perd', () => {
    const p = avec({ 'VD-PUB-FLASH-MAJORATION': '99 points de commission pendant la vente flash' })
    expect(() => commissionVenteFlash([ligne('B', 10000)], 'Bronze', false, PC, p)).toThrow(OffreRefusee)
  })

  it('Boost', () => {
    expect([prixBoost('24h', P), prixBoost('7j', P)]).toEqual([1000, 5000])
    expect([scoreClassement(10, true, P).eq(15), scoreClassement(10, false, P).eq(10)]).toEqual([true, true])
    expect(classer([['a', 12, false], ['b', 10, true], ['c', 12, false], ['d', 5, false]], P)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('remboursement des heures non diffusées', () => {
    expect(remboursementNonDiffuse(5000, 168, 100)).toBe(2023)
    expect(remboursementNonDiffuse(1000, 24, 24)).toBe(0)
    for (const [prevues, diffusees] of [[0, 0], [24, 25], [24, -1]]) expect(() => remboursementNonDiffuse(1000, prevues, diffusees)).toThrow(AnnonceRefusee)
  })

  it('solde prépayé', () => {
    expect(recharger(0, 1000, P)).toBe(1000)
    expect(() => recharger(0, 999, P)).toThrow(/au moins 1/)
    expect(debiter(1000, 41)).toBe(959)
    expect(() => debiter(40, 41)).toThrow(/rechargez/)
  })

  it('facture', () => {
    const f = facturePublicitaire([{ libelle: 'Clics', quantite: 12, prixUnitaire: 41 }, { libelle: 'Boost 7 jours', quantite: 1, prixUnitaire: 5000 }, { libelle: 'Heures rendues', quantite: 1, prixUnitaire: -2023 }], Dec.de('19.25'))
    expect([f.horsTaxe, f.tva, f.total]).toEqual([3469, 668, 4137])
    for (const l of [{ libelle: 'x', quantite: -1, prixUnitaire: 1 }, { libelle: 'x', quantite: 1, prixUnitaire: '1' as unknown as number }, { libelle: 'x', quantite: 1, prixUnitaire: -1 }])
      expect(() => facturePublicitaire([l], Dec.de(0))).toThrow(VenteInvalide)
  })
})
