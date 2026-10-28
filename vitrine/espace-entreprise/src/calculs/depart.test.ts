// Départ d'un livreur (DP-66, DP-67) : mêmes règles que moteurs/belivay_moteurs/depart.py (et absence.py pour la
// nouvelle photo) ; mêmes cas que moteurs/tests/test_depart.py.
import { describe, expect, it } from 'vitest'
import { REGISTRE, type Registre } from './registre'
import { lireFlotte, lireKit } from './flotte'
import { affectationJusqua, affectationPermise, constatEchu, constatJusqua, constaterKit, dernierJour, dernierVersement, finPreavis, manquantes, photoBloque, photoEcheance, preavisEchu, retenuePlafonnee, vendrediSuivant } from './depart'
import { HEURE, JOUR, jourDe, yaounde } from './temps'
import { ParametreIllisible } from './erreurs'

const P = lireFlotte(REGISTRE)
const LE = yaounde(2026, 10, 12, 9) // lundi
const FIN = finPreavis(LE, P)

it('paramètres lus dans le registre (DEPART-PREAVIS-J, DEPART-KIT-CONSTAT-H, KIT-VALEUR-F, DEPART-VISIBLE-J, ABSENCE-MAX-J, PHOTO-REVERIF-J, PLANNING-PREVENIR-H)', () => {
  expect(P.preavisDepartJours).toBe(Number(REGISTRE['DEPART-PREAVIS-J'].valeur))
  expect(P.kitConstatH).toBe(Number(REGISTRE['DEPART-KIT-CONSTAT-H'].valeur))
  expect(P.departVisibleJours).toBe(Number(REGISTRE['DEPART-VISIBLE-J'].valeur))
  expect(P.absenceMaxJours).toBe(Number(REGISTRE['ABSENCE-MAX-J'].valeur))
  expect(P.photoReverifJours).toBe(Number(REGISTRE['PHOTO-REVERIF-J'].valeur))
  expect(P.planningPrevenirH).toBe(Number(REGISTRE['PLANNING-PREVENIR-H'].valeur))
  // KIT-VALEUR-F : total et éléments (libellés = identifiants), la somme fait le total.
  expect(P.kit.elements.length).toBeGreaterThan(1)
  expect(P.kit.elements.reduce((n, e) => n + e.valeur, 0)).toBe(P.kit.total)
  for (const e of P.kit.elements) expect(REGISTRE['KIT-VALEUR-F'].valeur).toContain(e.libelle)
})

it('KIT-VALEUR-F : une forme inattendue arrête la lecture', () => {
  const avec = (valeur: string): Registre => ({ ...REGISTRE, 'KIT-VALEUR-F': { code: 'KIT-VALEUR-F', valeur, unite: null } })
  expect(lireKit(avec('10 000 F (sac 6 000 F · pochettes 4 000 F)'))).toEqual({ total: 10_000, elements: [{ libelle: 'sac', valeur: 6000 }, { libelle: 'pochettes', valeur: 4000 }] })
  expect(() => lireKit(avec('21 000 F'))).toThrow(ParametreIllisible)
  expect(() => lireKit(avec('10 000 F (sac 6 000 F · pochettes 3 000 F)'))).toThrow(ParametreIllisible) // somme ≠ total
  expect(() => lireKit(avec('10 000 F (sac six mille · pochettes 4 000 F)'))).toThrow(ParametreIllisible)
  expect(() => lireKit(avec('10 000 F (sac 5 000 F · sac 5 000 F)'))).toThrow(ParametreIllisible)
})

it('préavis : fin, échu', () => {
  expect(FIN).toBe(LE + P.preavisDepartJours * JOUR)
  expect(preavisEchu(FIN, FIN - 1)).toBe(false)
  expect(preavisEchu(FIN, FIN)).toBe(true)
})

it('conditions : mission, colis, kit constaté ; les litiges ne bloquent pas', () => {
  expect(manquantes({ missionsEnCours: 0, colisSousGarde: 0, kitConstate: true, litigesOuverts: 2 })).toEqual([])
  expect(manquantes({ missionsEnCours: 1, colisSousGarde: 3, kitConstate: false, litigesOuverts: 0 })).toEqual(['sans_mission', 'sans_colis', 'kit_constate'])
  expect(manquantes({ missionsEnCours: 0, colisSousGarde: 0, kitConstate: false, litigesOuverts: 0 })).toEqual(['kit_constate'])
})

it('affectation jusqu’à la veille du dernier jour du préavis (heure de Yaoundé)', () => {
  const p = { ...P, preavisDepartJours: 7 }
  const fin = finPreavis(LE, p) // lundi 19 à 9 h
  expect(dernierJour(fin)).toBe('2026-10-19')
  expect(affectationJusqua(fin)).toBe(yaounde(2026, 10, 19))
  expect(affectationPermise(fin, LE + JOUR)).toBe(true)
  expect(affectationPermise(fin, yaounde(2026, 10, 18, 23, 59))).toBe(true) // la veille, tard
  expect(affectationPermise(fin, yaounde(2026, 10, 19, 0, 0))).toBe(false) // dès minuit le dernier jour
  expect(affectationPermise(fin, LE + 9 * JOUR)).toBe(false)
})

it('délai du constat du kit : DEPART-KIT-CONSTAT-H après la fin du préavis', () => {
  const p = { ...P, preavisDepartJours: 7, kitConstatH: 72 }
  const fin = finPreavis(LE, p)
  expect(constatJusqua(fin, p)).toBe(LE + 10 * JOUR)
  expect(constatEchu(fin, LE + 9 * JOUR + 23 * HEURE, p)).toBe(false)
  expect(constatEchu(fin, LE + 10 * JOUR, p)).toBe(true)
})

describe('constat du kit (depart.py constater_kit)', () => {
  const p = { ...P, preavisDepartJours: 7, kitConstatH: 72, kit: { total: 21_000, elements: [{ libelle: 'sac', valeur: 12_000 }, { libelle: 'pochettes', valeur: 4_500 }, { libelle: 'etiquettes', valeur: 3_000 }, { libelle: 'accessoires', valeur: 1_500 }] } }
  const fin = finPreavis(LE, p)
  const constat = (c: Partial<{ resultat: string; manquants: string[]; photo: boolean; montant: number | null }> = {}, t = LE + 8 * JOUR, q = p) => constaterKit({ resultat: 'incomplet', manquants: ['sac'], photo: true, ...c }, fin, t, q)
  it('restitué, incomplet (éléments dans l’ordre du registre), montant inférieur, plafond', () => {
    expect(constat({ resultat: 'restitue', manquants: [] })).toEqual({ ok: true, resultat: 'restitue', manquants: [], retenue: 0 })
    expect(constat({ manquants: ['etiquettes', 'sac', 'sac'] })).toEqual({ ok: true, resultat: 'incomplet', manquants: ['sac', 'etiquettes'], retenue: 15_000 })
    expect(constat({ montant: 5000 })).toMatchObject({ ok: true, retenue: 5000 }) // l'entreprise peut retenir moins
    expect(constat({ manquants: ['sac', 'pochettes', 'etiquettes', 'accessoires'] }, LE + 8 * JOUR, { ...p, kit: { ...p.kit, total: 20_000 } })).toMatchObject({ retenue: 20_000 }) // plafond KIT-VALEUR-F
    expect(constat({}, LE + 2 * JOUR)).toMatchObject({ ok: true, retenue: 12_000 }) // pendant le préavis (clôture anticipée)
    expect(constat({ resultat: 'restitue', manquants: [] }, LE + 11 * JOUR)).toMatchObject({ ok: true, retenue: 0 }) // restitué après le délai
  })
  it.each([
    [{ resultat: 'perdu' }, 'resultat'],
    [{ photo: false }, 'photo'],
    [{ manquants: [] }, 'manquants'],
    [{ manquants: ['casque'] }, 'element'],
    [{ montant: 0 }, 'montant'],
    [{ montant: 13_000 }, 'montant'],
    [{ montant: 12.5 }, 'montant'],
  ])('refus %o → %s', (c, raison) => expect(constat(c)).toEqual({ ok: false, raison }))
  it('refus après le délai (incomplet seulement)', () => expect(constat({}, LE + 10 * JOUR)).toEqual({ ok: false, raison: 'delai' }))
})

it('retenue plafonnée à KIT-VALEUR-F', () => {
  expect(retenuePlafonnee(30_000, 21_000)).toBe(21_000)
  expect(retenuePlafonnee(800, 21_000)).toBe(800)
  expect(() => retenuePlafonnee(-1, 21_000)).toThrow()
})

describe('dernier versement (depart.py dernier_versement)', () => {
  const KIT = 21_000
  it('simple', () => expect(dernierVersement(18_500, [], 0, KIT)).toEqual({ du: 18_500, retenuLitiges: 0, retenueKit: 0, kitDeCote: 0, verse: 18_500 }))
  it('litiges : au plus le montant contesté', () => {
    const v = dernierVersement(18_500, [{ gains: 3000, conteste: 1200 }, { gains: 500, conteste: 9000 }], 0, KIT)
    expect([v.retenuLitiges, v.verse]).toEqual([1700, 16_800])
    expect(() => dernierVersement(1000, [{ gains: 3000, conteste: 3000 }], 0, KIT)).toThrow()
    expect(() => dernierVersement(1000, [{ gains: -1, conteste: 0 }], 0, KIT)).toThrow()
  })
  it('kit : plafonné, jamais au-delà de ce qui reste dû ; contesté : mis de côté', () => {
    expect(dernierVersement(18_500, [{ gains: 3000, conteste: 1200 }], 12_000, KIT)).toMatchObject({ retenueKit: 12_000, kitDeCote: 0, verse: 5300 })
    expect(dernierVersement(5000, [], 12_000, KIT)).toMatchObject({ retenueKit: 5000, verse: 0 })
    expect(dernierVersement(18_500, [], 12_000, KIT, true)).toMatchObject({ retenueKit: 0, kitDeCote: 12_000, verse: 6500 })
    expect(dernierVersement(50_000, [], 30_000, KIT).retenueKit).toBe(KIT)
  })
  it('compteur seul (pas de tarif affiché)', () => {
    expect(dernierVersement(null, [{ gains: 0, conteste: 0 }], 30_000, KIT)).toEqual({ du: null, retenuLitiges: 0, retenueKit: KIT, kitDeCote: 0, verse: null })
    expect(dernierVersement(null, [], 4500, KIT, true)).toMatchObject({ retenueKit: 0, kitDeCote: 4500 })
    expect(() => dernierVersement(-1)).toThrow()
  })
})

it('versement le vendredi suivant (un vendredi : le suivant)', () => {
  expect(jourDe(vendrediSuivant(yaounde(2026, 10, 13, 14)))).toBe('2026-10-16') // mardi
  expect(jourDe(vendrediSuivant(yaounde(2026, 10, 16, 10)))).toBe('2026-10-23') // vendredi
  expect(jourDe(vendrediSuivant(yaounde(2026, 10, 17, 23, 30)))).toBe('2026-10-23') // samedi soir
})

it('nouvelle photo : échéance PHOTO-REVERIF-J, puis plus de nouvelle mission jusqu’à la validation', () => {
  const p = { ...P, photoReverifJours: 7 }
  expect(photoEcheance(LE, p)).toBe(LE + 7 * JOUR)
  expect(photoBloque(LE, LE + 7 * JOUR - 1, false, p)).toBe(false)
  expect(photoBloque(LE, LE + 7 * JOUR, false, p)).toBe(true) // envoyée ou non, tant qu'elle n'est pas validée
  expect(photoBloque(LE, LE + 9 * JOUR, true, p)).toBe(false)
})
