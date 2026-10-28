// Règles S5 tenues par la démonstration (comme le serveur) : paramètres versionnés, simulés et à quatre yeux ; ventes
// flash ; interrupteurs ; diffusion ; modèles ; panne et mode papier ; support. Plus : le fichier des statuts du
// registre (pilotage-registre.json) suit le registre officiel.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import donnees from '../../../logique-metier/parametres-en-vigueur.json' with { type: 'json' }
import etat from './pilotage-registre.json' with { type: 'json' }
import type { SourceAdmin } from '../donnees/source'
import { JOUR, yaounde } from '../calculs/temps'

let s: SourceAdmin
const memoire = new Map<string, string>()
const T0 = yaounde(2026, 10, 13, 14, 5)
beforeAll(async () => {
  vi.useFakeTimers({ now: T0, toFake: ['Date'] })
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  s = (await import('./source-demo')).sourceDemo
})
afterAll(() => void vi.useRealTimers())
const MOTIF = 'Motif assez long pour une décision, écrit, cité et journalisé.'
const role = (r: Parameters<SourceAdmin['session']['changerRole']>[0]) => s.session.changerRole(r)

describe('registre : statuts et familles', () => {
  it('pilotage-registre.json suit parametres-en-vigueur.json (sinon le régénérer)', () => {
    const e = etat as unknown as { statuts: string[]; codes: Record<string, [number, number]> }
    for (const p of donnees.parametres) expect(e.statuts[e.codes[p.code]?.[0]], p.code).toBe(p.statut)
  })
})

describe('paramétrage (ADM-P24)', () => {
  it('la proposition du jeu d’essai attend la Finance ; Franck ne la contresigne pas ; Nadège, oui : nouvelle version annoncée', async () => {
    await role('superviseur')
    const pp = (await s.pilotage.propositions()).find((p) => p.id === 'PP-0003')!
    expect(pp.etat).toBe('a_contresigner')
    await expect(s.quatreyeux.contresigner(pp.quatreYeux!, MOTIF)).resolves.toMatchObject({ ok: false, raison: 'meme_compte' })
    await role('finance')
    await expect(s.quatreyeux.contresigner(pp.quatreYeux!, MOTIF)).resolves.toMatchObject({ ok: true })
    await role('superviseur')
    const v = (await s.pilotage.versions('REMB-CONTROLE-SEUIL'))[0]
    expect(v).toMatchObject({ version: 2, valeur: '150 000 F', etat: 'annoncee', validePar: 'Nadège Eyenga' })
    const p = (await s.pilotage.parametres()).find((x) => x.code === 'REMB-CONTROLE-SEUIL')!
    expect(p.valeur).toBe('100 000 F') // jamais rétroactif : en vigueur à sa date d'effet
    expect(p.annoncee?.version).toBe(2)
    expect((await s.communication.articles()).find((a) => a.id === 'AA-02')?.signale).toMatch(/REMB-CONTROLE-SEUIL/)
  })
  it('un « Décidé » exige la référence ; 800 F au relais bloque (marge négative) ; un non-critique s’applique à la soumission', async () => {
    await role('superviseur')
    const effet = T0 + 31 * JOUR
    const sansRef = await s.pilotage.preparer({ code: 'LIV-RELAIS-BASE', apres: 950, dateEffet: effet, motif: MOTIF, reference: '' })
    const p1 = (await s.pilotage.propositions()).find((p) => sansRef.ok && p.id === sansRef.id)!
    expect(p1.etat).toBe('bloquee')
    const bas = await s.pilotage.preparer({ code: 'LIV-RELAIS-BASE', apres: 800, dateEffet: effet, motif: MOTIF, reference: 'DP-68' })
    const p2 = (await s.pilotage.propositions()).find((p) => bas.ok && p.id === bas.id)!
    expect(p2.simulation.negatifs).toBe(4)
    await expect(s.pilotage.soumettre(p2.id)).resolves.toMatchObject({ ok: false, raison: 'bloquee' })
    const nc = await s.pilotage.preparer({ code: 'SUP-GESTE', apres: 1500, dateEffet: effet, motif: MOTIF, reference: '' })
    await expect(s.pilotage.soumettre(nc.ok ? nc.id : '')).resolves.toMatchObject({ ok: true, etat: 'appliquee' })
  })
  it('Opérations : pas de paramètre critique ; Audit : aucune proposition', async () => {
    await role('operations')
    await expect(s.pilotage.preparer({ code: 'PLAFOND-RELAIS-S', apres: 600, dateEffet: T0 + 31 * JOUR, motif: MOTIF, reference: 'DP-68' })).resolves.toMatchObject({ ok: false, raison: 'critique_reserve' })
    await role('audit')
    await expect(s.pilotage.preparer({ code: 'SUP-GESTE', apres: 1500, dateEffet: T0 + 31 * JOUR, motif: MOTIF, reference: '' })).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
})

describe('promotions et interrupteurs', () => {
  it('vente flash : en cours à l’heure du serveur ; le Support l’arrête avec un motif ; la Finance n’ouvre pas la page', async () => {
    await role('support')
    const v = await s.pilotage.promotions()
    expect(v.flashes.find((f) => f.id === 'FL-0021')).toMatchObject({ etat: 'en_cours', vendus: 4 })
    expect(v.flashes.find((f) => f.id === 'FL-0020')?.etat).toBe('epuisee')
    await expect(s.pilotage.programmerFlash('FL-0023')).rejects.toThrow(/ROLE_FORBIDDEN/)
    await expect(s.pilotage.arreterFlash('FL-0021', 'court')).resolves.toMatchObject({ ok: false, raison: 'motif_court' })
    await expect(s.pilotage.arreterFlash('FL-0021', MOTIF)).resolves.toMatchObject({ ok: true })
    await role('finance')
    await expect(s.pilotage.promotions()).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
  it('vente flash : simulée puis programmée par la Direction', async () => {
    await role('superviseur')
    await expect(s.pilotage.programmerFlash('FL-0023')).resolves.toMatchObject({ ok: false, raison: 'non_simulee' })
    await s.pilotage.simulerFlash('FL-0023')
    await expect(s.pilotage.programmerFlash('FL-0023')).resolves.toMatchObject({ ok: true })
  })
  it('interrupteur : bloqué si un paramètre est à trancher ; sinon quatre yeux, appliqué à la contre-signature', async () => {
    await role('superviseur')
    await expect(s.pilotage.demanderBascule('FF-EX02', true, MOTIF)).resolves.toMatchObject({ ok: false, raison: 'module_bloque' })
    const r = await s.pilotage.demanderBascule('FF-FLASH', false, MOTIF)
    expect(r.ok).toBe(true)
    expect((await s.pilotage.interrupteurs()).find((i) => i.code === 'FF-FLASH')?.ouvert).toBe(true)
    await role('finance')
    await s.quatreyeux.contresigner(r.ok ? r.id : '', MOTIF)
    await role('superviseur')
    expect((await s.pilotage.interrupteurs()).find((i) => i.code === 'FF-FLASH')?.ouvert).toBe(false)
    expect((await s.pilotage.interrupteurs()).find((i) => i.code === 'FF-WALLET')?.alerte).toMatch(/DP-50/)
  })
})

describe('messagerie, modèles, panne, support', () => {
  it('renvoyer : même clé, délivré ; Finance : coûts seulement', async () => {
    await role('support')
    await expect(s.communication.renvoyer('EV-0412')).resolves.toMatchObject({ ok: true })
    await expect(s.communication.renvoyer('EV-0412')).resolves.toMatchObject({ ok: false, raison: 'deja_delivre' })
    await role('finance')
    await expect(s.communication.envois()).rejects.toThrow(/ROLE_FORBIDDEN/)
    expect((await s.communication.budgetSms()).jours.length).toBeGreaterThan(0)
  })
  it('diffusion : SMS interdit pour une promotion ; au-delà du seuil, quatre yeux', async () => {
    await role('support')
    const d = { objet: 'Livraison offerte', texte: 'La livraison au relais est offerte dès 30 000 F.', espaces: ['client' as const], zones: ['Z1', 'Z2', 'Z3', 'Z6'], canaux: ['push' as const, 'sms' as const], promotion: true, programmeeLe: yaounde(2026, 10, 14, 10, 0), motif: MOTIF }
    await expect(s.communication.diffuser(d)).resolves.toMatchObject({ ok: false, raison: 'sms_promo' })
    await expect(s.communication.diffuser({ ...d, canaux: ['push'], programmeeLe: yaounde(2026, 10, 14, 21, 0) })).resolves.toMatchObject({ ok: false, raison: 'heures_promo' })
    await expect(s.communication.diffuser({ ...d, canaux: ['push'], promotion: false })).resolves.toMatchObject({ ok: true, etat: 'a_contresigner' })
    await expect(s.communication.diffuser({ ...d, canaux: ['push'], texte: 'Appelez le 677 12 42 17' })).resolves.toMatchObject({ ok: false, raison: 'contenu' })
  })
  it('modèle : jamais de code hors du modèle du code de retrait ; nouvelle version journalisée', async () => {
    await role('support')
    await expect(s.communication.publierModele('MERCI', 'Merci, ton code est {code}', 'Thanks {code}', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'code_hors_modele' })
    await expect(s.communication.publierModele('MERCI', 'BelivaY : merci ! Ta commande {ref} est confirmée.', 'BelivaY: thank you! Your order {ref} is confirmed.', MOTIF)).resolves.toMatchObject({ ok: true, version: 2 })
  })
  it('panne : Opérations limité à ses zones ; clôture seulement registre ressaisi et rapport écrit', async () => {
    await role('operations')
    await expect(s.communication.declarer({ service: 'SMS', zones: ['Z4'], effets: [], consignes: MOTIF, detecteLe: T0 })).resolves.toMatchObject({ ok: false, raison: 'perimetre' })
    await expect(s.communication.retablir('INC-261013-01')).resolves.toMatchObject({ ok: true })
    await expect(s.communication.clore('INC-261013-01')).resolves.toMatchObject({ ok: false, raison: 'registre' })
    await s.communication.relancerRessaisie('INC-261013-01', 'RP-3')
    await expect(s.communication.clore('INC-261013-01')).resolves.toMatchObject({ ok: false, raison: 'rapport' })
    await s.communication.ecrireRapport('INC-261013-01', { cause: MOTIF, effets: MOTIF, change: MOTIF })
    await expect(s.communication.clore('INC-261013-01')).resolves.toMatchObject({ ok: true })
  })
  it('support : rattacher avant de répondre ; aucun numéro ; geste fixe, une fois', async () => {
    await role('support')
    await s.communication.preparerReponse('SP-0207', null, 'Ton colis arrive ce soir au relais.')
    await expect(s.communication.envoyerReponse('SP-0207')).resolves.toMatchObject({ ok: false, raison: 'non_rattache' })
    await expect(s.communication.preparerReponse('SP-0207', null, 'Appelle le 699 31 03 88')).resolves.toMatchObject({ ok: false, raison: 'contenu' })
    await s.communication.rattacher('SP-0207', 'BLV-00008')
    await expect(s.communication.envoyerReponse('SP-0207')).resolves.toMatchObject({ ok: true })
    await expect(s.communication.accorderGeste('SP-0207', MOTIF)).resolves.toMatchObject({ ok: true })
    await expect(s.communication.accorderGeste('SP-0207', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'deja_geste' })
    await role('superviseur')
    await expect(s.communication.rattacher('SP-0208', 'KYC-0093')).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
})
