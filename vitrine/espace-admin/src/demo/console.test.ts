// Règles de la console tenues par la démonstration (comme le serveur) : quatre yeux par un AUTRE compte, journal chaîné
// par empreinte, périmètre des Opérations (ADM-ROL-03), Finance sans litiges (ADM-ROL-04), démasquage motivé et
// journalisé, assistant caché tant que FF-IA est fermé, cartes du pont avec l'entreprise et le livreur.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'

let s: SourceAdmin
const memoire = new Map<string, string>()
beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  s = (await import('./source-demo')).sourceDemo
})
const MOTIF = 'Motif assez long pour une décision défavorable, écrit et journalisé.'

describe('console : règles de la démonstration', () => {
  it('quatre yeux : le même compte ne contresigne pas ; un autre compte du bon rôle, oui', async () => {
    await s.session.changerRole('support')
    const r = await s.quatreyeux.decider({ action: 'remboursement.executer', objet: 'RB-0099', resume: 'Rembourser', motif: MOTIF, preuves: [], quatreYeux: true, rolesSecond: ['finance'] })
    expect(r.ok && r.etat).toBe('a_contresigner')
    const id = r.ok ? r.id : ''
    await s.session.changerRole('mediation')
    await expect(s.quatreyeux.contresigner(id, MOTIF)).resolves.toEqual({ ok: false, raison: 'role_non_permis' })
    await s.session.changerRole('finance')
    await expect(s.quatreyeux.contresigner(id, 'court')).resolves.toEqual({ ok: false, raison: 'motif_court' })
    await expect(s.quatreyeux.contresigner(id, MOTIF)).resolves.toEqual({ ok: true, etat: 'contresignee' })
    await expect(s.quatreyeux.contresigner(id, MOTIF)).resolves.toEqual({ ok: false, raison: 'deja_traitee' })
  })
  it('quatre yeux : Franck (Direction et Médiation) ne contresigne pas sa propre décision sous un autre rôle', async () => {
    await s.session.changerRole('superviseur')
    const r = await s.quatreyeux.decider({ action: 'sanction.decider', objet: 'V-1', resume: 'Suspendre', motif: MOTIF, preuves: [], quatreYeux: true, rolesSecond: ['mediation', 'superviseur'] })
    await s.session.agirEnTantQue('mediation')
    await expect(s.quatreyeux.contresigner(r.ok ? r.id : '', MOTIF)).resolves.toEqual({ ok: false, raison: 'meme_compte' })
    expect((await s.session.agirEnTantQue('finance')).ok).toBe(false)
  })
  it('journal : chaîné, sous le rôle courant, et vérifiable', async () => {
    await s.session.changerRole('audit')
    const l = await s.gouvernance.journal()
    expect(l.length).toBeGreaterThan(5)
    expect(l.some((x) => x.action === 'remboursement.executer.second' && x.role === 'finance')).toBe(true)
    expect((await s.gouvernance.verifierChaine()).ok).toBe(true)
    // Une ligne modifiée casse la chaîne.
    const { journalDemo } = await import('./journal')
    journalDemo.ecrire((e) => void (e.lignes[1].motif = 'falsifié'))
    expect((await s.gouvernance.verifierChaine()).casseeA).toBe(2)
  })
  it('ADM-ROL-03 : les Opérations ne voient que leurs zones ; ADM-ROL-04 : la Finance n’ouvre pas les litiges', async () => {
    await s.session.changerRole('operations')
    const p = await s.logistique.paquets()
    expect(p.length).toBeGreaterThan(0)
    expect(p.every((x) => ['Z1', 'Z2', 'Z3', 'Z6'].includes(x.zone))).toBe(true)
    expect((await s.logistique.relais()).some((r) => r.zone === 'Z9')).toBe(false)
    await expect(s.argent.remboursements()).rejects.toThrow(/ROLE_FORBIDDEN/)
    await s.session.changerRole('finance')
    await expect(s.litiges.liste()).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
  it('démasquage : sur motif, réservé, journalisé', async () => {
    await s.session.changerRole('audit')
    await expect(s.commandes.demasquer('BLV-52107', 'telephoneClient', MOTIF)).rejects.toThrow(/ROLE_FORBIDDEN/)
    await s.session.changerRole('support')
    expect(await s.commandes.demasquer('BLV-52107', 'telephoneClient', 'court')).toEqual({ ok: false, raison: 'motif_court' })
    const r = await s.commandes.demasquer('BLV-52107', 'telephoneClient', MOTIF)
    expect(r.ok && r.valeur).toMatch(/^\+2376/)
    expect((await s.commandes.commande('BLV-52107'))!.telephoneClient).toContain('••')
  })
  it('assistant caché : FF-IA fermé ; seule la Direction ouvre un interrupteur', async () => {
    await s.session.changerRole('superviseur')
    expect((await s.session.session()).interrupteurs['FF-IA']).toBe(false)
    await s.session.changerRole('audit')
    await expect(s.pilotage.demanderBascule('FF-IA', true, MOTIF)).rejects.toThrow(/ROLE_FORBIDDEN/)
    expect('basculer' in s.systeme).toBe(false) // aucune bascule sans quatre yeux
  })
  it('pont : un kit contesté par le livreur devient une carte de la File d’action ; une suspension est publiée', async () => {
    const { publier, evenementsPour } = await import('./pont')
    memoire.set('blv_pont', JSON.stringify([{ type: 'depart_demande', id: 'dep-1', motif: 'autre_emploi', texte: null, preavisJusqua: 2, cle: 'd1', app: 'livreur', le: 1 }, { type: 'kit_conteste', id: 'dep-1', motif: 'Le sac était rendu complet', cle: 'k1', app: 'livreur', le: 3 }]))
    await s.session.changerRole('operations')
    expect((await s.files.file()).some((c) => c.objet === 'dep-1')).toBe(true)
    expect(await s.logistique.suspendreLivreur('l-cedric', MOTIF, null)).toEqual({ ok: true })
    expect(evenementsPour('admin').some((e) => e.type === 'livreur_suspendu' && e.app === 'admin')).toBe(true)
    void publier
  })
  it('compteurs : jamais celui d’une page fermée au rôle', async () => {
    await s.session.changerRole('terrain')
    const b = (await s.session.session()).badges
    expect(b.file + b.litige + b.remboursements + b.fraude).toBe(0)
  })
})
