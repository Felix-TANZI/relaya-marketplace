// Droits de la console : chaque route déclarée a sa ligne dans la matrice, chaque geste lié à une page est permis à des
// rôles qui l'ouvrent, et les règles verrouillées d'ADM-01 tiennent (ADM-ROL-03, ADM-ROL-04, A-01).
import { describe, expect, it } from 'vitest'
import { ROLES } from '../donnees/communs'
import { DROITS, PERMISSIONS, droitDe, gestesDe, pageOuverte, rolesDe } from './droits'

const TEXTES = import.meta.glob<string>('../pages/*/routes.ts', { query: '?raw', import: 'default', eager: true })
const routes = Object.values(TEXTES).flatMap((t) => [...t.matchAll(/route: '([\w-]+)'/g)].map((m) => m[1]))

describe('droits par page et par rôle', () => {
  it('chaque route a sa ligne, chaque ligne une route', () => {
    expect(routes.length).toBeGreaterThan(40)
    expect(routes.filter((r) => !DROITS[r]), 'routes sans droits').toEqual([])
    expect(Object.keys(DROITS).filter((r) => !routes.includes(r)), 'droits sans route').toEqual([])
  })
  it('la Direction ouvre toutes les pages ; une page inconnue est fermée', () => {
    for (const r of routes) expect(pageOuverte(r, 'superviseur'), r).toBe(true)
    expect(droitDe('nulle-part', 'superviseur').acces).toBe('aucun')
  })
  it('chaque rôle a au moins une page de travail en plus du socle', () => {
    for (const role of ROLES) expect(routes.filter((r) => !['connexion', 'menu', 'profil', 'recherche'].includes(r) && pageOuverte(r, role)).length, role).toBeGreaterThan(3)
  })
  it('ADM-ROL-04 : la Finance ne voit pas les litiges, le Support pas les versements', () => {
    expect(pageOuverte('litige', 'finance')).toBe(false)
    expect(pageOuverte('versements', 'support')).toBe(false)
  })
  it('ADM-ROL-03 : les Opérations sont limitées à leur zone sur la logistique', () => {
    for (const r of ['paquets', 'zones', 'carte', 'relais', 'entreprises', 'livreurs']) expect(droitDe(r, 'operations').acces, r).toBe('zone')
    for (const r of ['escrow', 'versements', 'remboursements', 'rapprochement', 'commissions']) expect(droitDe(r, 'operations').acces === 'aucun' || droitDe(r, 'operations').acces === 'zone', r).toBe(true)
  })
  it('A-01 : la KYC et la modération à la Vérification ; le Support en lecture ; l’agent terrain ne valide jamais', () => {
    expect(droitDe('kyc', 'verification').acces).toBe('oui')
    expect(droitDe('moderation', 'verification').acces).toBe('oui')
    expect(droitDe('kyc', 'support').acces).toBe('lecture')
    expect(droitDe('moderation', 'support').acces).toBe('lecture')
    expect(PERMISSIONS['kyc.decider'].roles).not.toContain('terrain')
    expect(rolesDe('fraude').filter((r) => droitDe('fraude', r).acces === 'oui').sort()).toEqual(['audit', 'mediation', 'superviseur'])
  })
  it('l’Audit ne touche jamais l’argent ni une décision', () => {
    for (const r of ['escrow', 'remboursements', 'versements', 'rapprochement', 'litige', 'kyc', 'sanctions']) expect(['lecture', 'aucun']).toContain(droitDe(r, 'audit').acces)
    for (const p of ['remboursement.executer', 'versement.executer', 'litige.decider', 'kyc.decider', 'contresigner'] as const) expect(PERMISSIONS[p].roles).not.toContain('audit')
  })
  it('un geste lié à une page n’est permis qu’à des rôles qui l’ouvrent ; chaque interdit dit pourquoi', () => {
    for (const [id, g] of Object.entries(PERMISSIONS)) {
      expect(g.pourquoi.length, id).toBeGreaterThan(30)
      if (g.route) for (const r of g.roles) expect(pageOuverte(g.route, r), `${id} → ${r}`).toBe(true)
    }
    for (const r of ROLES) expect(gestesDe(r).oui.length + gestesDe(r).non.length).toBe(Object.keys(PERMISSIONS).length)
  })
  it('« part » et « zone » disent ce qu’elles couvrent', () => {
    for (const [route, ligne] of Object.entries(DROITS))
      for (const [role, d] of Object.entries(ligne)) if (d.acces === 'part') expect(d.note, `${route} · ${role}`).toBeTruthy()
  })
})
