// Marque sonore BelivaY (src/composants/marque-sonore.ts) : le même fichier dans les cinq applications ; chaque action a
// un son, chaque son est unique et porte une intention ; silence sous navigateur piloté et réglage coupé ; pas de
// double ni de chevauchement ; heures calmes. Tableau : logique-metier/SONS.md.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import relais from './marque-sonore.ts?raw'
import client from '../../../site/src/composants/marque-sonore.ts?raw'
import vendeur from '../../../espace-vendeur/src/composants/marque-sonore.ts?raw'
import entreprise from '../../../espace-entreprise/src/composants/marque-sonore.ts?raw'
import livreur from '../../../espace-livreur/src/composants/marque-sonore.ts?raw'
import appClient from '../../../site/src/composants/marque-sonore-app.ts?raw'
import appVendeur from '../../../espace-vendeur/src/composants/marque-sonore-app.ts?raw'
import appEntreprise from '../../../espace-entreprise/src/composants/marque-sonore-app.ts?raw'
import appLivreur from '../../../espace-livreur/src/composants/marque-sonore-app.ts?raw'
import appRelais from './marque-sonore-app.ts?raw'
import admin from '../../../espace-admin/src/composants/marque-sonore.ts?raw'
import appAdmin from '../../../espace-admin/src/composants/marque-sonore-app.ts?raw'

type Module = typeof import('./marque-sonore')

// Un navigateur minimal : fenêtre, document visible, stockage, vibration et contexte audio espionnés.
function navigateur(o: { robot?: boolean; enregistrer?: boolean } = {}) {
  const vibrate = vi.fn()
  const audio = vi.fn()
  const w: Record<string, unknown> = { addEventListener: vi.fn(), AudioContext: audio }
  if (o.enregistrer) w.__BLV_SONS__ = 'enregistrer'
  vi.stubGlobal('window', w)
  vi.stubGlobal('document', { hidden: false })
  vi.stubGlobal('localStorage', { getItem: () => null })
  vi.stubGlobal('navigator', { webdriver: !!o.robot, vibrate, userActivation: { hasBeenActive: true, isActive: true } })
  return { w, vibrate, audio }
}
async function charger(o: { robot?: boolean; enregistrer?: boolean } = {}): Promise<{ m: Module; w: Record<string, unknown>; vibrate: ReturnType<typeof vi.fn>; audio: ReturnType<typeof vi.fn> }> {
  vi.resetModules()
  const n = navigateur(o)
  const m = await import('./marque-sonore')
  let t = 10_000
  m.reglerHorloge(() => t)
  ;(n.w as { avancer?: (ms: number) => void }).avancer = (ms: number) => void (t += ms)
  return { m, ...n }
}
const avancer = (w: Record<string, unknown>, ms: number) => (w as { avancer: (ms: number) => void }).avancer(ms)
const traces = (w: Record<string, unknown>) => ((w.__blvSons ?? []) as { action: string; retenu: boolean }[]).filter((x) => x.retenu).map((x) => x.action)

afterEach(() => vi.unstubAllGlobals())

describe('marque sonore commune', () => {
  it('identique dans les six applications ; seule la ligne APPLI diffère', () => {
    expect(relais.length).toBeGreaterThan(5000)
    for (const copie of [client, vendeur, entreprise, livreur, admin]) expect(copie).toBe(relais)
    expect(appAdmin).toContain(`APPLI = 'admin' as const`)
    expect(appClient).toContain(`APPLI = 'client' as const`)
    expect(appVendeur).toContain(`APPLI = 'vendeur' as const`)
    expect(appEntreprise).toContain(`APPLI = 'entreprise' as const`)
    expect(appLivreur).toContain(`APPLI = 'livreur' as const`)
    expect(appRelais).toContain(`APPLI = 'relais' as const`)
  })
})

describe('catalogue', () => {
  let m: Module
  beforeEach(async () => void ({ m } = await charger()))

  it('chaque action de chaque application a un son ; chaque son sert au moins une fois', () => {
    const utilises = new Set<string>()
    for (const [appli, actions] of Object.entries(m.ACTIONS)) {
      expect(Object.keys(actions).length, appli).toBeGreaterThan(14)
      for (const [action, x] of Object.entries(actions)) {
        expect(m.SONS, `${appli}.${action}`).toHaveProperty(x.son)
        expect(x.fr.length && x.en.length, `${appli}.${action} : nom français et anglais`).toBeTruthy()
        utilises.add(x.son)
      }
    }
    expect([...utilises].sort()).toEqual(Object.keys(m.SONS).sort())
  })

  it('les actions clés de chaque application ont le son de leur intention', () => {
    const son = (a: keyof typeof m.ACTIONS, x: string) => (m.ACTIONS[a] as Record<string, { son: keyof typeof m.SONS }>)[x].son
    const intention = (a: keyof typeof m.ACTIONS, x: string) => m.SONS[son(a, x)].intention
    expect(intention('client', 'panier')).toBe('leger')
    expect(intention('client', 'paiement')).toBe('argent')
    expect(intention('client', 'colisAuRelais')).toBe('arrivee')
    expect(intention('vendeur', 'nouvelleCommande')).toBe('arrivee')
    expect(son('vendeur', 'nouvelleCommande')).toBe('commande')
    expect(intention('vendeur', 'versementRecu')).toBe('argent')
    expect(intention('entreprise', 'nouveauPaquet')).toBe('arrivee')
    expect(intention('entreprise', 'incident')).toBe('alerte')
    expect(son('livreur', 'sos')).toBe('urgence')
    expect(intention('livreur', 'codeFaux')).toBe('erreur')
    expect(intention('livreur', 'codeValide')).toBe('securite')
    expect(intention('relais', 'colisRecu')).toBe('reussite')
    expect(intention('relais', 'encaissement')).toBe('argent')
    expect(intention('admin', 'nouvelleCarte')).toBe('arrivee')
    expect(intention('admin', 'versementsLances')).toBe('argent')
    expect(son('admin', 'panne')).toBe('urgence')
    for (const a of Object.keys(m.ACTIONS) as (keyof typeof m.ACTIONS)[]) expect(son(a, 'erreur')).toBe('erreur')
  })

  it('sons uniques : partition propre à chaque son, vibration propre aux sons forts ; chaque intention a les siens', () => {
    const notes = Object.values(m.SONS).map((s) => JSON.stringify(s.notes))
    expect(new Set(notes).size).toBe(notes.length)
    // Vibrations : les motifs qui comptent (argent, arrivée, alerte, erreur) se reconnaissent tous ; les tics légers
    // gardent ceux du client.
    const forts = Object.values(m.SONS).filter((s) => ['argent', 'arrivee', 'alerte', 'erreur'].includes(s.intention)).map((s) => JSON.stringify(s.vibration))
    expect(new Set(forts).size).toBe(forts.length)
    for (const i of Object.keys(m.INTENTIONS)) expect(Object.values(m.SONS).some((s) => s.intention === i), i).toBe(true)
  })

  it('courts (moins de 600 ms, sauf les alertes) ; l’alerte grave sous 1,2 s, médium (jamais strident)', () => {
    for (const [nom, s] of Object.entries(m.SONS)) {
      const d = m.duree(nom as keyof typeof m.SONS)
      expect(d, nom).toBeLessThan(s.intention === 'alerte' ? 1.2 : 0.6)
      for (const n of s.notes as { f: number; souffle?: boolean }[]) if (!n.souffle) expect(n.f, nom).toBeLessThan(9000) // filtre doux à 7 kHz
    }
    const u = m.SONS.urgence.notes.map((n) => n.f)
    expect(Math.max(...u)).toBeLessThan(1000)
    expect(Math.min(...u)).toBeGreaterThan(400)
  })

  it('une couleur par application : six transpositions différentes, à moins d’une quinte', () => {
    const c = Object.values(m.COULEURS)
    expect(new Set(c).size).toBe(6)
    for (const x of c) expect(Math.abs(x)).toBeLessThanOrEqual(7)
  })

  it('aperçu : chaque son de l’application, une fois, rangé par intention', () => {
    const a = m.apercu()
    expect(new Set(a.map((x) => x.son)).size).toBe(a.length)
    const ordre = Object.keys(m.INTENTIONS)
    expect(a.map((x) => ordre.indexOf(x.intention))).toEqual([...a.map((x) => ordre.indexOf(x.intention))].sort((x, y) => x - y))
    expect(a.find((x) => x.son === 'remise')?.actions.map((x) => x.fr)).toEqual(expect.arrayContaining(['Lot validé : la garde passe au relais', 'Remise au client réussie']))
  })
})

describe('quand ça sonne', () => {
  it('sous navigateur piloté : ni son, ni vibration, ni contexte audio', async () => {
    const { m, vibrate, audio } = await charger({ robot: true })
    expect(m.sonner('valide')).toBe(false)
    expect(m.sonner('erreur', true)).toBe(false)
    m.vibrer()
    expect(vibrate).not.toHaveBeenCalled()
    expect(audio).not.toHaveBeenCalled()
  })

  it('mode enregistrement (tests) : rien ne joue, chaque son demandé est noté', async () => {
    const { m, w, vibrate, audio } = await charger({ robot: true, enregistrer: true })
    expect(m.sonner('colisRecu')).toBe(true)
    expect(w.__blvSons).toEqual([{ appli: 'relais', action: 'colisRecu', son: 'scan', intention: 'reussite', retenu: true }])
    expect(vibrate).not.toHaveBeenCalled()
    expect(audio).not.toHaveBeenCalled()
  })

  it('réglage « Sons » coupé : silence ; rallumé : le son revient', async () => {
    const { m, w } = await charger({ enregistrer: true })
    m.reglerSons(false)
    expect(m.sonner('encaissement')).toBe(false)
    m.reglerSons(true)
    avancer(w, 2000)
    expect(m.sonner('encaissement')).toBe(true)
    expect(traces(w)).toEqual(['encaissement'])
  })

  it('pas de double : un son déclenché par un autre se tait, sauf s’il est plus important', async () => {
    const { m, w } = await charger({ enregistrer: true })
    m.sonner('encaissement')
    avancer(w, 80)
    m.sonner('notification') // la notification de l'encaissement : moins importante, se tait
    avancer(w, 50)
    m.sonner('erreur') // plus importante : jouée après (file courte)
    expect(traces(w)).toEqual(['encaissement', 'erreur'])
  })

  it('le même son en rafale : un scan après l’autre passe, une annonce ne se répète pas', async () => {
    const { m, w } = await charger({ enregistrer: true })
    m.sonner('colisRecu')
    avancer(w, 400)
    m.sonner('colisRecu')
    avancer(w, 2000)
    m.sonner('livreurEnApproche')
    avancer(w, 600)
    m.sonner('livreurEnApproche')
    expect(traces(w)).toEqual(['colisRecu', 'colisRecu', 'livreurEnApproche'])
  })

  it('pas de chevauchement : au plus 0,9 s d’attente, sinon le son se tait ; l’alerte grave passe toujours', async () => {
    const { m, w } = await charger({ enregistrer: true })
    m.sonner('valide')
    avancer(w, 10)
    m.sonner('alerteCapacite') // plus important : attend la fin du geste réussi
    avancer(w, 10)
    m.sonner('erreur') // plus important encore : derrière l'alerte (0,78 s d'attente)
    avancer(w, 400)
    m.sonner('lotValide') // 0,77 s d'attente : passe
    avancer(w, 10)
    m.sonner('codeFaux') // plus de 0,9 s d'attente : se tait
    avancer(w, 10)
    m.sonner('urgence' as never) // l'alerte grave passe toujours (un nom de son joue ce son)
    expect(traces(w)).toEqual(['valide', 'alerteCapacite', 'erreur', 'lotValide', 'urgence'])
  })

  it('heures calmes : la notification discrète se tait, le geste réussi sonne ; l’aperçu joue toujours', async () => {
    const { m, w } = await charger({ enregistrer: true })
    m.reglerCalme(() => true)
    expect(m.sonner('notification')).toBe(false)
    expect(m.sonner('valide')).toBe(true)
    avancer(w, 2000)
    expect(m.sonner('notification', true)).toBe(true)
    m.reglerCalme(null)
    expect(traces(w)).toEqual(['valide', 'notification'])
  })

  it('aucun son avant le premier geste : sans contexte audio, rien ne joue (la vibration attend aussi un geste)', async () => {
    const { m, vibrate, audio } = await charger()
    ;(navigator as unknown as { userActivation: { hasBeenActive: boolean; isActive: boolean } }).userActivation = { hasBeenActive: false, isActive: false }
    m.sonner('livreurEnApproche')
    expect(audio).not.toHaveBeenCalled()
    expect(vibrate).not.toHaveBeenCalled()
  })
})
