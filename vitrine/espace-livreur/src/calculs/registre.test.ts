import { describe, expect, it } from 'vitest'
import { ParametreAbsent, ParametreIllisible } from './erreurs'
import { PARAMETRES, lireLivreur } from './registre'

describe('registre du livreur', () => {
  it('lit les paramètres en vigueur', () => {
    const p = PARAMETRES.livreur
    expect(p.codeRemise.essais).toBeGreaterThan(0)
    expect(p.codeRemise.blocageHeures).toBeGreaterThan(0)
    expect(p.delaiZoneHeures).toBeGreaterThan(0)
    expect(p.incidentNotificationMin).toBeGreaterThan(0)
    expect(p.ruptureTentatives).toBeGreaterThanOrEqual(0)
    expect(p.departPreavisJours).toBe(7) // DEPART-PREAVIS-J (DP-66, proposé)
  })
  it('s’arrête sur un paramètre absent ou illisible, sans deviner', () => {
    const base = { 'CODE-ESSAIS': '3 ⇒ blocage 24 h', 'SLA-ZONE-H': 'moins de 5 h', 'INC-NOTIF-MIN': '15 min', 'RUPTURE-TENTATIVES': '2', 'DEPART-PREAVIS-J': '7', 'DEPART-KIT-CONSTAT-H': '72', 'KIT-VALEUR-F': '21 000 F (sac 12 000 F · pochettes 4 500 F · étiquettes 3 000 F · ruban 1 500 F)', 'PLANNING-PREVENIR-H': '24', 'ABSENCE-MAX-J': '14', 'PHOTO-REVERIF-J': '7' }
    expect(lireLivreur(base).codeRemise).toEqual({ essais: 3, blocageHeures: 24 })
    const { 'SLA-ZONE-H': _, ...sans } = base
    expect(() => lireLivreur(sans)).toThrow(ParametreAbsent)
    expect(() => lireLivreur({ ...base, 'CODE-ESSAIS': 'trois' })).toThrow(ParametreIllisible)
    expect(() => lireLivreur({ ...base, 'DEPART-PREAVIS-J': 'une semaine' })).toThrow(ParametreIllisible)
    // KIT-VALEUR-F : la somme des éléments doit faire le total.
    expect(lireLivreur(base).kitValeur.elements).toHaveLength(4)
    expect(() => lireLivreur({ ...base, 'KIT-VALEUR-F': '21 000 F (sac 12 000 F · pochettes 4 500 F)' })).toThrow(ParametreIllisible)
  })
})
