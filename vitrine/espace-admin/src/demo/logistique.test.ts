// Règles de la logistique tenues par la démonstration (comme le serveur) : saturation et relais de secours, transfert
// d'une fermeture imprévue, fermeture à quatre yeux refusée tant que des colis sont en garde, départ échu clos par
// l'administrateur (kit non contesté) publié au pont, décision sur un kit contesté, suspension à quatre yeux publiée
// seulement après la contre-signature, périmètre des Opérations, paquet sans preneur, zone en alerte, emballages sous
// le seuil, candidature bloquée par la liste noire. Aucune affectation n'existe.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'
import { PARAM } from '../pages/ADM-08/parametres'

let s: SourceAdmin
const memoire = new Map<string, string>()
beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  vi.useFakeTimers({ now: new Date('2026-10-13T13:05:00.500Z'), toFake: ['Date'] })
  s = (await import('./source-demo')).sourceDemo
})
beforeEach(async () => {
  await s.session.changerRole('superviseur')
})
const MOTIF = 'Motif assez long pour une décision de la console, écrit et journalisé avec ses preuves.'
const pont = () => JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; app: string; id?: string; livreurId?: string; kitNonConteste?: boolean; decision?: string }[]
const decider = (action: string, objet: string, quatreYeux = false, rolesSecond: ('superviseur' | 'mediation')[] = ['superviseur']) => s.quatreyeux.decider({ action, objet, resume: action, motif: MOTIF, preuves: [], quatreYeux, rolesSecond })

describe('logistique : règles de la démonstration', () => {
  it('paramètres lus au registre (aucune valeur dans le code)', () => {
    expect(PARAM.relais.saturePct).toBe(90)
    expect(PARAM.relais.places).toEqual({ S: 1, M: 2, L: 5 })
    expect(PARAM.livreurs.kitValeur).toBe(21000)
    expect(PARAM.zones.poids.delai + PARAM.zones.poids.remplissage + PARAM.zones.poids.litiges + PARAM.zones.poids.couverture).toBe(100)
  })
  it('relais saturé au-delà du seuil : secours proposé, bascule appliquée par la décision', async () => {
    const m = (await s.logistique.relais()).find((r) => r.id === 'r-mokolo')!
    expect(m.statut).toBe('sature')
    expect(m.secours?.id).toBe('r-elobi')
    await decider('relais.basculer', 'r-mokolo')
    expect((await s.logistique.relais()).find((r) => r.id === 'r-mokolo')!.bascule?.versId).toBe('r-elobi')
    expect((await s.logistique.verifier('relais.basculer', 'r-mokolo')).ok).toBe(false)
  })
  it('fermeture imprévue : fermeture définitive refusée tant que des colis sont en garde, puis transfert', async () => {
    const v = await s.logistique.verifier('relais.fermer', 'r-nlongkak')
    expect(v.ok === false && v.raison).toBe('etat')
    const avant = (await s.logistique.relais()).find((r) => r.id === 'r-nlongkak')!
    const dest = avant.secours!
    await decider('relais.transferer', 'r-nlongkak')
    const apres = await s.logistique.relais()
    expect(apres.find((r) => r.id === 'r-nlongkak')!.enGarde).toBe(0)
    expect(apres.find((r) => r.id === dest.id)!.occupes).toBe(dest.occupes + avant.occupes)
    expect((await s.logistique.verifier('relais.fermer', 'r-nlongkak')).ok).toBe(true)
  })
  it('départ échu sans constat : clos par l’administrateur, kit non contesté, publié au pont', async () => {
    const d = (await s.logistique.departs()).find((x) => x.id === 'DP-0385')!
    expect(d.etat).toBe('echu')
    expect((await s.logistique.verifier('depart.clore', 'DP-0398')).ok).toBe(false) // constat encore dans son délai
    await decider('depart.clore', 'DP-0385')
    const c = (await s.logistique.departs()).find((x) => x.id === 'DP-0385')!
    expect(c.clos).toMatchObject({ par: 'admin', kitNonConteste: true })
    expect(pont().some((e) => e.type === 'depart_clos' && e.app === 'admin' && e.id === 'DP-0385' && e.kitNonConteste)).toBe(true)
  })
  it('kit contesté : la retenue annulée revient au versement, décision publiée', async () => {
    await decider('kit.annuler', 'DP-0377')
    const d = (await s.logistique.departs()).find((x) => x.id === 'DP-0377')!
    expect(d.contestation?.decision).toBe('retenue_annulee')
    expect(d.versement.verse).toBe(9600)
    expect(pont().some((e) => e.type === 'kit_decide' && e.decision === 'retenue_annulee')).toBe(true)
  })
  it('suspension d’un livreur : quatre yeux, appliquée et publiée seulement après la contre-signature d’un autre compte', async () => {
    await s.session.changerRole('operations')
    const r = await decider('livreur.suspendre', 'l-brice', true, ['superviseur', 'mediation'])
    expect(r.ok && r.etat).toBe('a_contresigner')
    expect((await s.logistique.livreurs()).find((l) => l.id === 'l-brice')!.statut).toBe('actif')
    expect(pont().some((e) => e.type === 'livreur_suspendu' && e.livreurId === 'l-brice')).toBe(false)
    await s.session.changerRole('superviseur')
    await s.quatreyeux.contresigner(r.ok ? r.id : '', MOTIF)
    expect((await s.logistique.livreurs()).find((l) => l.id === 'l-brice')!.statut).toBe('suspendu')
    expect(pont().some((e) => e.type === 'livreur_suspendu' && e.livreurId === 'l-brice')).toBe(true)
    await decider('livreur.retablir', 'l-brice')
    expect(pont().some((e) => e.type === 'livreur_retabli' && e.livreurId === 'l-brice')).toBe(true)
  })
  it('une décision à quatre yeux prise d’une seule main n’est jamais appliquée', async () => {
    await decider('relais.fin_convention', 'r-melen')
    expect((await s.logistique.relais()).find((r) => r.id === 'r-melen')!.convention.finLe).toBeNull()
  })
  it('Opérations : ses zones seulement (lecture et gestes)', async () => {
    await s.session.changerRole('operations')
    expect((await s.logistique.relais()).some((r) => r.zone === 'Z9')).toBe(false)
    expect((await s.logistique.verifier('relais.basculer', 'r-mvogada')).ok).toBe(false)
    expect((await s.logistique.paquets()).every((p) => ['Z1', 'Z2', 'Z3', 'Z6'].includes(p.zone))).toBe(true)
    const v = await s.logistique.verifier('candidature.accepter', 'CAND-0029')
    expect(v.ok === false && v.raison).toBe('role') // second relais dans la zone : Direction
  })
  it('paquets : sans preneur au terme du délai, colis de valeur visible du seul palier Or', async () => {
    const l = await s.logistique.paquets()
    expect(l.find((p) => p.id === 'PQ-Z3-261013-009')!.etat).toBe('sans_preneur')
    expect(l.find((p) => p.id === 'PQ-Z1-261013-006')!.paliersEligibles).toEqual(['Or'])
    expect((await s.logistique.verifier('paquet.retirer', 'PQ-Z3-261013-009')).ok).toBe(false)
  })
  it('zones : Z3 en alerte (sous 5 h sous le seuil), plan d’action enregistré', async () => {
    const z3 = (await s.logistique.pilotage()).find((z) => z.code === 'Z3')!
    expect(z3.etat).toBe('alerte')
    await decider('zone.plan', 'Z3')
    expect((await s.logistique.pilotage()).find((z) => z.code === 'Z3')!.plan).not.toBeNull()
  })
  it('emballages : format sous le seuil, écart facturable au-delà de 5 % seulement', async () => {
    const e = await s.logistique.emballages()
    expect(e.stock.find((x) => x.ref === 'S')!.aCommander).toBeGreaterThan(0)
    expect(e.ecarts.find((x) => x.entrepriseId === 'e-yafe')!.ecartPct).toBeLessThan(PARAM.emballages.ecartPct)
    expect((await s.logistique.verifier('emballage.facturer', 'e-yafe')).ok).toBe(false)
    await s.session.changerRole('finance')
    expect((await s.logistique.verifier('emballage.facturer', 'e-mboa')).ok).toBe(true)
  })
  it('candidatures : liste noire et doublon bloquent l’acceptation ; une acceptation crée l’entreprise en configuration', async () => {
    expect((await s.logistique.verifier('candidature.accepter', 'CAND-0027')).ok).toBe(false)
    expect((await s.logistique.verifier('candidature.accepter', 'CAND-0032')).ok).toBe(false)
    await decider('candidature.accepter', 'CAND-0031')
    expect((await s.logistique.entreprises()).find((e) => e.nom === 'Taty’s Delivery Service')?.statut).toBe('configuration')
  })
})
