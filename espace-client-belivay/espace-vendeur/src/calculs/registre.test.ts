// Mêmes refus que moteurs/tests/test_registre_vendeur.py : une valeur de forme inattendue arrête la lecture.
import { expect, it } from 'vitest'
import { ParametreIllisible } from './erreurs'
import { lireCommission, lireConsole, lireLitiges, lirePaliers, lireSanctions, lireVersements, REGISTRE } from './registre'
import { yaounde } from './temps'
import { vendrediDeVersement } from './versements'

const avec = (m: Record<string, string>) => ({ ...REGISTRE, ...m })

it('registre réel lisible', () => {
  lireCommission(REGISTRE)
  lireVersements(REGISTRE)
  lirePaliers(REGISTRE)
  lireSanctions(REGISTRE)
  lireLitiges(REGISTRE)
})

it.each([
  ['VD-COM-MODELE', 'R4', 'VD-02'],
  ['VD-BAREME-SANS-TAUX', '0 %', 'tranche précédente'],
  ['VD-BAREME-A', 'Électronique : 13,5 % jusqu’à 20 000 F · 2 % au delà', 'illisible'],
  ['VD-BAREME-A', 'Électronique : 13,5 % au-delà · 2 % au-delà', 'dernière tranche'],
  ['VD-BAREME-A', 'Électronique : 13,5 % jusqu’à 20 000 F · 2 % jusqu’à 50 000 F', 'dernière tranche'],
  ['VD-BAREME-A', 'Électronique : 13,5 % jusqu’à 20 000 F · 5 % jusqu’à 10 000 F · 2 % au-delà', 'croître'],
  ['VD-BAREME-A', 'Électronique : sans taux jusqu’à 20 000 F · 2 % au-delà', 'première tranche'],
  ['VD-BAREME-B', 'Électronique : 23,5 % au-delà', 'déjà dans la famille A'],
  ['VD-COM-PALIER', 'Bronze × 1 · Argent × 1,15 · Or × 0,70 · Platine × 0,60', 'entre 0'],
  ['VD-COM-PALIER', 'Bronze × 1 · Argent × 0 · Or × 0,70 · Platine × 0,60', 'entre 0'],
  ['VD-DECOUV-MULT', '× 1,20 sur la commission', 'entre 0'],
  ['VD-COM-M05', '200 F ou 0,5 % du panier', 'M05 fournie'],
  ['VD-COM-M06', '× 0,9 au-delà de 300 000 F', 'M06 fournie'],
  ['VD-PLAN-REMISE-PLAFOND', 'aucun', 'DP-55'],
  ['VD-COM-MIN', '700 F par commande', 'VD-COM-MIN'],
])('commission illisible : %s', (code, valeur, motif) => {
  expect(() => lireCommission(avec({ [code]: valeur }))).toThrow(ParametreIllisible)
  expect(() => lireCommission(avec({ [code]: valeur }))).toThrow(motif)
})

it.each([
  ['VD-VER-JOUR', 'fredi, avant 12 h, sans frais ni minimum', 'jour inconnu'],
  ['VD-VER-ARRETE', 'mercredi 23 h 59', 'veille'],
  ['VD-VER-FERIE', 'versement la veille', 'maintenu'],
  ['VD-LIB-CARTE', '14 jours après le retrait', 'VD-LIB-CARTE'],
])('versements illisible : %s', (code, valeur, motif) => {
  expect(() => lireVersements(avec({ [code]: valeur }))).toThrow(motif)
})

it.each([
  ['VD-PAL-OR', '50 commandes livrées ; Trust Score 80', 'en premier'],
  ['VD-PAL-OR', 'Trust Score 80 ; parrainage', 'inconnue'],
  ['VD-PAL-PLATINE', 'Trust Score 75 ; audit trimestriel', 'croître'],
  ['VD-PLAFOND-DEMARRAGE', '500 000 F par commande', 'VD-PLAFOND-DEMARRAGE'],
])('paliers illisible : %s', (code, valeur, motif) => {
  expect(() => lirePaliers(avec({ [code]: valeur }))).toThrow(motif)
})

it('un changement du registre change le calcul', () => {
  const p = lireCommission(avec({ 'VD-BAREME-E': 'Livres & Médias : 12,5 % jusqu’à 10 000 F · 9 % jusqu’à 50 000 F · 7 % au-delà' }))
  expect(p.bareme.E.at(-1)!.tauxPourCent.eq(7)).toBe(true)
  expect(lireVersements(avec({ 'VD-NUM-REVUE': '3 jours, versements reportés' })).revueNumeroJours).toBe(3)
  const v = lireVersements(avec({ 'VD-VER-ARRETE': 'jeudi 18 h 00' }))
  expect(vendrediDeVersement(yaounde(2026, 9, 24, 19), v)).toBe('2026-10-02')
  expect(vendrediDeVersement(yaounde(2026, 9, 24, 17), v)).toBe('2026-09-25')
})

// Valeurs de console versées au registre à la vague d'intégration (DP-57) : lues avec leur forme, jamais devinées.
it('valeurs de console du vendeur lues dans le registre', () => {
  const c = lireConsole(REGISTRE)
  expect(c.kyc).toEqual({ autoMinutes: 15, humainHeures: 48, refusMax: 3 })
  expect(c.saisie).toEqual({ premieresBoutiques: 10, prixSession: 5000 })
  expect(c.prixAnormal).toEqual({ basPourCent: 50, hautFois: 3 })
  expect(c.photos).toEqual({ min: 3, max: 8, minPx: 800, cotePx: 1600, qualite: 0.8 })
  expect(c.colis.classes.map((x) => x.classe)).toEqual(['S', 'M', 'L', 'XL'])
  expect(c.preparation).toEqual({ defautH: 4, choixH: [2, 4, 8, 24, 48, 72, 120, 168] })
  expect(c.prefixes[0].prefixes).toEqual(['67', '68', '650', '651', '652', '653', '654'])
  expect(c.prefixes[1].prefixes).toEqual(['69', '655', '656', '657', '658', '659'])
  expect(c.fileHeures).toBe(72)
  expect(c.contestationHeures).toBe(72)
  expect(c.equipeMax).toBe(3)
})

it('une valeur de console de forme inattendue arrête la lecture', () => {
  expect(() => lireConsole(avec({ 'VD-FILE-HORS-LIGNE': 'trois jours' }))).toThrow(ParametreIllisible)
  expect(() => lireConsole(avec({ 'VD-PREFIXES-CM': 'MTN : 67 · Orange : six-neuf' }))).toThrow(ParametreIllisible)
})
