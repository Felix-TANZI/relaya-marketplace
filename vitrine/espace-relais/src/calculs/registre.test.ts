import { describe, expect, it } from 'vitest'
import officiel from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import { ParametreAbsent, ParametreIllisible } from './erreurs'
import { PARAMETRES, REGISTRE, chargerRegistre, completer, lireRelais } from './registre'

describe('registre du point relais', () => {
  it('lit les paramètres en vigueur (v6, DP-08, DP-26)', () => {
    const p = PARAMETRES.relais
    expect(p.gainColis).toEqual({ S: 200, M: 250, L: 400 })
    expect(p.places).toEqual({ S: 1, M: 2, L: 5 })
    expect(p.code).toEqual({ longueur: 6, essais: 3, blocageHeures: 24, renvoisPar24h: 3 })
    expect(p.comptoir).toEqual({ plafonds: { nouveau: 15_000, standard: 50_000, fidele: 100_000 }, refusAvantAvance: 2 })
    expect(p.transfert).toEqual({ S: 400, M: 400, L: 400 }) // R69 : 400 F quel que soit le colis
    expect(p.versement).toEqual({ jourSemaine: 4, avantHeure: 12, arreteJourSemaine: 3, arreteMinutes: 23 * 60 + 59, essais: 3, intervalleH: 24, revueNumeroJours: 7 })
    expect([p.gardeEnEspeces, p.comptoirNonRetireCommeRefus, p.porteurPieceDes, p.avisFenetreJours, p.constatReponseH]).toEqual([true, true, 100_000, 7, 48])
    expect(PARAMETRES.connexion.pinLongueur).toBe(6)
  })
  it('les paramètres PR-… viennent du registre officiel, sans repli local', () => {
    const p = PARAMETRES.relais
    expect([p.capaciteSeuilPct, p.equipeMax, p.formationModules, p.finPreavisJours, p.finSansColisJours, p.preuvesConservationJours, p.fileExpirationH, p.horsLigneRemisesParJour, p.dette.max, p.dette.semaines]).toEqual([90, 3, 5, 30, 7, 180, 72, 10, 20_000, 2])
    expect(PARAMETRES.connexion.pinBlocageMin).toBe(15) // ARL-12
    expect(REGISTRE).toEqual(chargerRegistre(officiel))
    // Un code retiré du registre officiel arrête la lecture (plus de fichier provisoire pour le cacher).
    const { 'PR-HL-REMISES': _, ...sans } = REGISTRE
    expect(() => lireRelais(sans)).toThrow(ParametreAbsent)
    expect(lireRelais(completer(sans, { parametres: [{ code: 'PR-HL-REMISES', valeur: '10' }] }))).toEqual(p)
    expect(completer({ 'PR-EQUIPE-MAX': '4' })['PR-EQUIPE-MAX']).toBe('4')
  })
  it('un seul code par notion : un alias du registre dit la même valeur que sa cible', () => {
    const parCode = new Map(officiel.parametres.map((x) => [x.code, x as { code: string; valeur: string; alias_de?: string }]))
    for (const x of parCode.values()) if (x.alias_de) expect([x.code, x.valeur]).toEqual([x.code, parCode.get(x.alias_de)!.valeur])
  })
  it('s’arrête sur un paramètre absent ou illisible, sans deviner', () => {
    const { 'RELAIS-PLACES': _, ...sans } = REGISTRE
    expect(() => lireRelais(sans)).toThrow(ParametreAbsent)
    expect(() => lireRelais({ ...REGISTRE, 'RELAIS-GAIN-COLIS': '200 F' })).toThrow(ParametreIllisible)
    expect(() => lireRelais({ ...REGISTRE, 'CODE-BLOCAGE-H': '12' })).toThrow(ParametreIllisible)
    expect(() => lireRelais({ ...REGISTRE, 'VD-VER-JOUR': 'samedi, avant 12 h, sans frais ni minimum' }).versement.jourSemaine).not.toThrow()
    expect(() => lireRelais({ ...REGISTRE, 'VD-VER-JOUR': 'demain, avant 12 h, sans frais ni minimum' })).toThrow(ParametreIllisible)
  })
})
