// Poste de travail des décisions encadrées, tenu par la source de démonstration comme le serveur : file triée par
// échéance, preuves et liste de contrôle, suggestion, issues bloquées refusées, plafond → transmettre, appel noté qui
// devient une preuve, prolongation unique, lot plafonné, quatre yeux au-delà du seuil, journal des écarts.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'
import type { DemandePoste } from '../donnees/domaines/decisions'

let s: SourceAdmin
const memoire = new Map<string, string>()
const REF = Date.UTC(2026, 9, 13, 13, 5)
beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(REF)
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  s = (await import('./source-demo')).sourceDemo
})
const NOTE = 'Photo devant la porte, code validé et position à neuf mètres : remise prouvée.'
const D = (issue: string, o: Partial<DemandePoste> = {}): DemandePoste => ({ issue, motif: 'Preuves concordantes', note: NOTE, message: 'Message aux parties.', ...o })
const comme = async (agent: string) => s.session.changerAgent(agent)

describe('poste de travail (source de démonstration)', () => {
  it('file du Support : litiges de niveau 1 triés par échéance, les décidés à la fin', async () => {
    await s.session.changerRole('support')
    const f = await s.decisions.file('litige')
    expect(f.map((x) => x.id)).toEqual(expect.arrayContaining(['LT-0412', 'LT-0421', 'LT-0424', 'LT-0427', 'LT-0430', 'LT-0431']))
    expect(f.some((x) => x.id === 'LT-0405')).toBe(false)
    const ouverts = f.filter((x) => x.etat === 'a_decider')
    for (let i = 1; i < ouverts.length; i++) expect(ouverts[i].echeance!).toBeGreaterThanOrEqual(ouverts[i - 1].echeance!)
    expect(f.at(-1)!.etat).toBe('decide')
  })
  it('LT-0421 : les preuves disculpent le livreur ; mettre l’entreprise en cause est refusé par la source', async () => {
    await s.session.changerRole('support')
    const d = (await s.decisions.dossier('litige', 'LT-0421'))!
    expect(d.lecture?.issue).toBe('debouter')
    expect(d.controles.every((c) => c.etat === 'ok')).toBe(true)
    expect(d.pieces.filter((p) => p.nature === 'appel')).toHaveLength(2)
    expect(d.issues.find((i) => i.id === 'rembourser_transporteur')).toMatchObject({ etat: 'bloquee' })
    expect(await s.decisions.decider('litige', 'LT-0421', D('rembourser_transporteur'))).toMatchObject({ ok: false, raison: 'disculpe' })
    expect(await s.decisions.decider('litige', 'LT-0421', D('remplacer'))).toMatchObject({ ok: false, raison: 'hors_regle' })
  })
  it('LT-0424 : au-delà du plafond d’un Agent, la décision se transmet ; le Senior tranche ; l’auteur de la transmission ne tranche pas', async () => {
    await comme('a-aicha')
    const d = (await s.decisions.dossier('litige', 'LT-0424'))!
    expect(d.lecture?.issue).toBe('rembourser_transporteur')
    expect(d.issues.find((i) => i.id === 'debouter')!.etat).toBe('bloquee')
    expect(d.issues.find((i) => i.id === 'rembourser_transporteur')!.etat).toBe('transmettre')
    expect(await s.decisions.decider('litige', 'LT-0424', D('rembourser_transporteur', { note: 'Ni photo ni code de remise, position à 1,8 km : la livraison n’est pas prouvée.' }))).toMatchObject({ ok: false, raison: 'transmettre' })
    expect(await s.decisions.transmettre('litige', 'LT-0424', 'Au-delà de mon plafond : remboursement de 41 000 F à la charge de l’entreprise.', 'rembourser_transporteur')).toMatchObject({ ok: true, vers: 'Senior' })
    expect(await s.decisions.decider('litige', 'LT-0424', D('rembourser_transporteur'))).toMatchObject({ ok: false, raison: 'auteur' })
    await s.session.changerRole('support') // Clarisse, Senior : 100 000 F
    expect(await s.decisions.decider('litige', 'LT-0424', D('rembourser_transporteur', { note: 'Ni photo ni code de remise, position à 1,8 km : la livraison n’est pas prouvée.' }))).toMatchObject({ ok: true, etat: 'appliquee' })
    const pont = JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; id?: string; transporteurEnCause?: boolean }[]
    expect(pont.find((e) => e.type === 'litige_decide' && e.id === 'LT-0424')).toMatchObject({ transporteurEnCause: true })
  })
  it('LT-0427 : ouvert par Clarisse, elle ne le tranche pas ; ambigu, il passe en Médiation', async () => {
    await s.session.changerRole('support')
    const d = (await s.decisions.dossier('litige', 'LT-0427'))!
    expect(d.droits.raison).toMatch(/Vous avez ouvert ce dossier/)
    expect(d.ambigu).toBe(true)
    expect(d.controles[0].etat).toBe('doute') // ce qui reste douteux en tête
    await comme('a-patrice')
    expect(await s.decisions.decider('litige', 'LT-0427', D('rembourser_vendeur'))).toMatchObject({ ok: false, raison: 'transmettre' })
    expect(await s.decisions.transmettre('litige', 'LT-0427', 'Versions opposées, scellé intact et photo du ramassage illisible : à la Médiation.', null)).toMatchObject({ ok: true, vers: 'Médiation (niveau 2)' })
    await s.session.changerRole('mediation')
    expect((await s.decisions.file('litige')).some((x) => x.id === 'LT-0427' && x.etat === 'transmis')).toBe(true)
  })
  it('appel noté : il devient une pièce ; un accord ne porte que sur une issue permise', async () => {
    await s.session.changerRole('support')
    expect(await s.decisions.noterAppel('litige', 'LT-0412', { avec: 'client', nom: 'Client ••• 4217', resultat: 'accord', resume: 'La cliente accepte le remboursement après retour.', accord: 'debouter' })).toMatchObject({ ok: false, raison: 'accord_hors_issues' })
    const r = await s.decisions.noterAppel('litige', 'LT-0412', { avec: 'client', nom: 'Client ••• 4217', resultat: 'accord', resume: 'La cliente accepte le remboursement après retour.', accord: 'rembourser_vendeur' })
    expect(r.ok).toBe(true)
    const d = (await s.decisions.dossier('litige', 'LT-0412'))!
    expect(d.pieces.some((p) => p.nature === 'appel' && p.partie === 'console')).toBe(true)
    expect(d.appels).toHaveLength(1)
  })
  it('contrôle corrigé en un geste, journalisé ; prolongation une seule fois', async () => {
    await s.session.changerRole('support')
    expect((await s.decisions.controler('litige', 'LT-0430', 'heures', 'ok')).ok).toBe(true)
    const avant = (await s.decisions.dossier('litige', 'LT-0430'))!
    expect(avant.controles.find((c) => c.id === 'heures')!.confirme).toBe(true)
    expect((await s.decisions.prolonger('litige', 'LT-0430', 'Le client rappelle demain matin pour préciser l’heure de remise.')).ok).toBe(true)
    expect(await s.decisions.prolonger('litige', 'LT-0430', 'Le client rappelle demain matin pour préciser l’heure de remise.')).toMatchObject({ ok: false, raison: 'prolongation_unique' })
  })
  it('lot plafonné : deux retards de la même panne, un geste chacun ; au-delà du plafond de geste, refusé', async () => {
    await s.session.changerRole('support')
    const f = await s.decisions.file('litige')
    const lot = f.filter((x) => x.lot && x.lot === f.find((y) => y.id === 'LT-0430')!.lot)
    expect(lot.map((x) => x.id).sort()).toEqual(['LT-0430', 'LT-0431'])
    const g = (m: number) => D('geste', { montant: m, motif: 'Retard établi', note: 'Panne déclarée PN-0031 : livré le lendemain, bon de réduction pour chaque client.' })
    expect(await s.decisions.deciderLot('litige', ['LT-0430', 'LT-0431'], g(5000))).toMatchObject({ ok: false })
    expect(await s.decisions.deciderLot('litige', ['LT-0430', 'LT-0412'], g(500))).toMatchObject({ ok: false, raison: 'lot_heterogene' })
    expect(await s.decisions.deciderLot('litige', ['LT-0430', 'LT-0431'], g(500))).toMatchObject({ ok: true, n: 2 })
    expect((await s.decisions.dossier('litige', 'LT-0431'))!.decision).toMatchObject({ issue: 'geste', montant: 500 })
  })
  it('recours LT-0405 au-delà du seuil : la Médiation décide, la Finance contresigne, la décision s’applique', async () => {
    await s.session.changerRole('mediation')
    const d = (await s.decisions.dossier('litige', 'LT-0405'))!
    expect(d.lecture?.issue).toBe('rembourser_relais')
    expect(d.issues.find((i) => i.id === 'rembourser_vendeur')!.etat).toBe('bloquee')
    const r = await s.decisions.decider('litige', 'LT-0405', D('rembourser_relais', { note: 'Scellé intact jusqu’au relais, photo de remise absente : la charge revient au relais.' }))
    expect(r).toMatchObject({ ok: true, etat: 'a_contresigner' })
    await s.session.changerRole('finance')
    expect(await s.quatreyeux.contresigner(r.ok ? r.id : '', 'Preuve de remise absente relue : la charge revient au relais.')).toMatchObject({ ok: true })
    await s.session.changerRole('superviseur')
    expect((await s.decisions.dossier('litige', 'LT-0405'))!.decision).toMatchObject({ issue: 'rembourser_relais', etat: 'contresignee' })
  })
  it('même modèle : KYC (pièces à ouvrir avant d’approuver), kit, constat, signalement ; écarts lus par l’Audit', async () => {
    await s.session.changerRole('verification')
    const kyc = (await s.decisions.dossier('kyc', 'KYC-0091'))!
    expect(kyc.lecture?.issue).toBe('complement')
    expect(kyc.issues.find((i) => i.id === 'approuver')!.etat).toBe('bloquee')
    expect(kyc.comparer.length).toBeGreaterThanOrEqual(3)
    await s.session.changerRole('mediation')
    const kit = (await s.decisions.dossier('kit', 'DP-0377'))!
    expect(kit.lecture?.issue).toBeNull()
    expect((await s.decisions.controler('kit', 'DP-0377', 'restitution', 'ok')).ok).toBe(true)
    const kit2 = (await s.decisions.dossier('kit', 'DP-0377'))!
    expect(kit2.lecture?.issue).toBe('kit.annuler')
    expect(kit2.issues.find((i) => i.id === 'kit.maintenir')!.etat).toBe('bloquee')
    await s.session.changerRole('operations')
    expect((await s.decisions.dossier('constat', 'CR-0007'))!.issues.find((i) => i.id === 'imputer_relais')!.etat).toBe('bloquee')
    await s.session.changerRole('support')
    const sg = (await s.decisions.decider('signalement', 'SG-0011', D('classer', { motif: 'Signalement non fondé', note: 'Le client conteste ; aucune pièce et le livreur ne confirme pas la demande d’espèces.' })))
    expect(sg).toMatchObject({ ok: true })
    await s.session.changerRole('audit')
    const e = await s.decisions.ecarts()
    expect(e.some((x) => x.id === 'SG-0011' && x.decision === 'Classer sans suite')).toBe(true)
  })
})
