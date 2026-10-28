// Mêmes exemples que moteurs/tests/test_litiges.py, pour ce que voit le vendeur (LIT-3042, BLV-51702, BLV-51388 ;
// DP-10, DP-27, DP-28, DP-35). La part de livraison d'un colis vient du moteur des frais du client (au serveur) : elle
// est donnée ici telle que moteurs/tests la calcule (900 F pour BLV-51702, 780 F pour B dans BLV-52107).
import { describe, expect, it } from 'vitest'
import {
  echeanceRemplacement, echeances, fermetureDuRetourJour, finInspection, finReponseArrangement, liberation, recoursPossible,
  remboursementAutomatique, rembourserRetour, voieDeRetour, type Motif, type PalierIFA, type Voie,
} from './litiges'
import { ParametreIllisible } from './erreurs'
import { lireLitiges, REGISTRE, type Palier } from './registre'
import { yaounde } from './temps'

const P = lireLitiges(REGISTRE)
const t = (mois: number, jour: number, h = 0, mi = 0, s = 0) => yaounde(2026, mois, jour, h, mi, s)

it('paramètres', () => {
  expect([P.autoStandard, P.autoEleve, P.vendeurHeures, P.decisionHeures, P.recoursHeures]).toEqual([3000, 10000, 48, 24, 48])
  expect([P.arrangementJours, P.fenetreRetourJours, P.defautCacheHeures, P.viceCacheJours]).toEqual([5, 7, 48, 100])
  expect([P.inspectionHeures, P.trajetRetour, P.remplacementHeuresOuvrees]).toEqual([48, 500, 72])
  expect([P.libStandardJours, P.libOrJours, P.libCarteJours]).toEqual([3, 1, 14])
})

it.each([
  [3000, 'Standard', true], // LIT-2987 : 3 000 F remboursés automatiquement
  [3001, 'Standard', false],
  [10000, 'Élevé', true],
  [10001, 'Élevé', false],
  [100, 'À instruire', false], // jamais aux paliers « À instruire » et « Plafonné » (CLT-24)
  [100, 'Plafonné', false],
  [0, 'Élevé', false],
] as [number, PalierIFA, boolean][])('remboursement automatique %i F %s', (montant, palier, auto) => {
  expect(remboursementAutomatique(montant, palier, P)).toBe(auto)
})

it('échéances de LIT-3042', () => {
  expect(echeances(t(9, 23, 17, 15), P)).toEqual({ reponseVendeur: t(9, 25, 17, 15), decisionAuPlusTard: t(9, 26, 17, 15) })
})

it('recours et arrangement', () => {
  const decision = t(9, 26, 17, 15)
  expect(recoursPossible(decision, t(9, 28, 17, 15), false, P)).toBe(true)
  expect(recoursPossible(decision, t(9, 28, 17, 16), false, P)).toBe(false)
  expect(recoursPossible(decision, t(9, 27, 9), true, P)).toBe(false) // un seul recours
  expect(finReponseArrangement(t(9, 24, 10), P)).toBe(t(9, 29, 10))
})

const RETRAIT_51702 = t(9, 19, 11, 32) // sam. 19 sept. 11 h 32 : fenêtre de retour jusqu'au sam. 26 à 11 h 32

it.each([
  ['abîmé', t(9, 25), false, 'retour'],
  ['non conforme', t(9, 26, 11, 32), false, 'retour'],
  ['non conforme', t(9, 26, 11, 33), false, 'aucune'], // fenêtre fermée
  ['contrefaçon', t(9, 22), true, 'aucune'], // « Tout est en ordre » touché (DP-28)
  ['défaut caché', t(9, 21, 11, 32), false, 'retour'], // sous 48 h
  ['défaut caché', t(9, 22), false, 'litige normal'], // entre 48 h et 7 jours (DP-35)
  [null, t(9, 20), false, 'aucune'], // pas de retour sans motif au lancement
] as [Motif | null, number, boolean, Voie][])('voie de retour %#', (motif, signalement, toutEnOrdre, voie) => {
  expect(voieDeRetour(motif, RETRAIT_51702, signalement, toutEnOrdre, P)).toBe(voie)
})

it('vice caché 100 jours, même après « Tout est en ordre » (DP-27)', () => {
  const retrait = t(8, 28, 12) // BLV-51388 : couvert jusqu'au dim. 6 déc.
  expect(voieDeRetour('vice caché', retrait, t(12, 6, 12), true, P)).toBe('vice caché')
  expect(voieDeRetour('vice caché', retrait, t(12, 6, 12, 1), true, P)).toBe('aucune')
})

describe('remboursement d’un retour', () => {
  it('client en tort : trajet retenu (CL-11)', () => {
    const r = rembourserRetour(23000, 'client', P)
    expect([r.trajetRetenu, r.montant, r.livraison]).toEqual([500, 22500, 0])
  })
  it('vendeur en tort : la livraison du colis est remboursée (DP-35)', () => {
    const r = rembourserRetour(23000, 'vendeur', P, 900)
    expect([r.livraison, r.montant]).toEqual([900, 23900])
  })
  it('transporteur en tort, un colis d’une commande à trois boutiques', () => {
    const r = rembourserRetour(84000, 'transporteur', P, 780)
    expect([r.livraison, r.montant]).toEqual([780, 84780])
    expect(() => rembourserRetour(84000, 'vendeur', P, -1)).toThrow(RangeError)
  })
})

it('inspection et remplacement', () => {
  expect(finInspection(t(9, 24, 10), P)).toBe(t(9, 26, 10))
  // Vendredi 10 h + 72 h ouvrées, dimanche non compté : mardi 10 h.
  expect(echeanceRemplacement(t(9, 25, 10), P)).toBe(t(9, 29, 10))
  expect(echeanceRemplacement(t(9, 27, 15), P)).toBe(t(10, 1, 0)) // commencé un dimanche : compte dès lundi
})

it('échéance du remplacement juste avant minuit', () => {
  const debut = t(9, 25, 23, 59, 30)
  const fin = echeanceRemplacement(debut, P)
  expect(fin > debut).toBe(true)
  expect(fin - debut >= P.remplacementHeuresOuvrees * 3600 * 1000).toBe(true)
})

it('fermeture du retour', () => {
  expect(fermetureDuRetourJour('2026-09-19', null, P)).toBe('2026-09-26')
  expect(fermetureDuRetourJour('2026-09-19', '2026-09-21', P)).toBe('2026-09-21')
})

it.each([
  ['Bronze', false, '2026-09-29', '2026-10-02'],
  ['Argent', false, '2026-09-29', '2026-10-02'],
  ['Or', false, '2026-09-27', '2026-10-02'],
  ['Platine', false, '2026-09-27', '2026-10-02'],
  ['Or', true, '2026-10-10', '2026-10-16'], // carte : 14 jours
] as [Palier, boolean, string, string][])('libération %s carte=%s', (palier, carte, liberee, versement) => {
  expect(liberation('2026-09-26', palier, carte, false, P)).toEqual([liberee, versement])
})

it('libération un vendredi, et un litige qui suspend (Q-59)', () => {
  expect(liberation('2026-09-24', 'Or', false, false, P)).toEqual(['2026-09-25', '2026-10-02'])
  expect(liberation('2026-09-23', 'Or', false, false, P)).toEqual(['2026-09-24', '2026-09-25'])
  expect(liberation('2026-09-26', 'Or', false, true, P)).toBe(null)
})

it('registre : retour sans renvoi refusé (DP-10)', () => {
  expect(() => lireLitiges({ ...REGISTRE, 'RET-SANS-RETOUR': '5 000 F' })).toThrow(ParametreIllisible)
  expect(() => lireLitiges({ ...REGISTRE, 'RET-SANS-RETOUR': '5 000 F' })).toThrow('DP-10')
})
