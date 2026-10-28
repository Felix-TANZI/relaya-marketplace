// Moteurs d'ENT-07 et ENT-08 : registre réel lisible, règles de calcul (versement du vendredi, retenue du transporteur,
// Trust Score, stock d'emballages, masquage).
import { expect, it } from 'vitest'
import { HEURE, JOUR, yaounde } from './temps'
import { lireLitigesDp35, lireTrust, lireVersements, palierVise, prixMinore, prochainVersement, retenueTransporteur, scoreTrust, soldeDuVendredi, borneBaisse } from './ent07'
import { OUTILS, auSeuil, ecartPct, masquer, remplissage, resteAttendu } from './ent08'

it('registre : litiges DP-35, versements, trust, outils', () => {
  expect(lireLitigesDp35()).toMatchObject({ reponseH: 48, recoursH: 48, arrangementMin: 40, trajetRetour: 500 })
  expect(lireVersements()).toMatchObject({ jour: 5, heureLimite: 12, arrete: { jour: 4, h: 23, min: 59 }, essais: 3, intervalleH: 24, blocageMoyenJours: 7, reportVendredis: 4, minorationRetardPct: 20 })
  expect(lireTrust()).toMatchObject({ mu: 50, k: 10, demiVieJours: 90 })
  expect(OUTILS.kit.find((k) => k.format === 'C2')).toEqual({ format: 'C2', n: 1, auStockage: true })
  expect(OUTILS.kit.find((k) => k.format === 'S')?.auStockage).toBe(false)
  expect(OUTILS.alertesVerrouillees).toEqual(['litige', 'versement_refuse'])
  expect(OUTILS.canauxParDefaut).toEqual(['portail', 'push', 'email'])
  expect(OUTILS.integrationsActives).toBe(false)
  expect(OUTILS.alerteRemplissage).toEqual({ sous: 5, jours: 7 })
})

it('versement : mardi 13 oct. → arrêté jeudi 15 à 23 h 59, vendredi 16 avant midi', () => {
  const v = prochainVersement(yaounde(2026, 10, 13, 13, 5))
  expect(v.arrete).toBe(yaounde(2026, 10, 15, 23, 59))
  expect(v.limite).toBe(yaounde(2026, 10, 16, 12, 0))
  expect(prochainVersement(yaounde(2026, 10, 16, 12, 30)).limite).toBe(yaounde(2026, 10, 23, 12, 0))
})

it('argent : minoration, solde négatif reporté, retenue plafonnée sur l’article seulement', () => {
  expect(prixMinore(1000)).toBe(800)
  expect(soldeDuVendredi([7050], [19240])).toEqual({ aVerser: 0, report: 12190 })
  expect(retenueTransporteur(17840, 900, 'Nouveau')).toEqual({ article: 17840, livraison: 900, trajet: 500 })
  expect(retenueTransporteur(350000, 1500, 'Nouveau')).toEqual({ article: 75000, livraison: 1500, trajet: 500 })
})

it('trust : neutre, succès, échecs, veto, baisse bornée', () => {
  const t = yaounde(2026, 10, 13, 12)
  expect(scoreTrust([], t)).toBe(50)
  const ev = [...Array(5)].map(() => ({ le: t - HEURE, gravite: 'succes' as const }))
  expect(scoreTrust([...ev, { le: t - HEURE, gravite: 'g1' }], t)).toBeCloseTo(62.5, 0)
  expect(scoreTrust([...ev, { le: t, gravite: 'veto' }], t)).toBe(39)
  expect(scoreTrust([{ le: t - 90 * JOUR, gravite: 'g3' }], t)).toBeCloseTo(41.7, 1)
  expect(borneBaisse(80, 60)).toBe(72)
  expect(palierVise(71)).toBe('Confirme')
})

it('emballages et outils', () => {
  expect(resteAttendu({ remis: 10, consommes: 7, declaresAbimes: 0 })).toBe(3)
  expect(auSeuil({ remis: 10, consommes: 7, declaresAbimes: 0 })).toBe(true)
  expect(auSeuil({ remis: 48, consommes: 9, declaresAbimes: 0 })).toBe(false)
  expect(ecartPct(39, 37, 48)).toBe(4.2)
  expect(masquer('Appelle-moi au 6 90 11 22 33 ou a@b.cm').texte).toBe('Appelle-moi au [numéro masqué] ou [adresse masquée]')
  expect(remplissage([5, 3, 6])).toBe(4.7)
})
