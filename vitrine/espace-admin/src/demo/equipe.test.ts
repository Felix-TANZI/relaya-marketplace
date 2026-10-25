// Règles des accès de la console (logique-metier/ACCES-CONSOLE.md), tenues par la source comme par le serveur : modèle
// pur (conflits, rôles effectifs, qui donne quoi, quatre yeux) et domaine « equipe » de la démonstration (refus 403,
// deux comptes Direction, suspension qui ferme la session, accès temporaire retiré à sa fin, responsable limité à son
// équipe, agent terrain limité à ses descentes, départ avec réattribution, réactivation à quatre yeux).
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { conflitBloquant, conflitsDe, exigeQuatreYeux, perimetreParDefaut, refusAttribution, rolesEffectifs } from '../config/acces-console'
import type { SourceAdmin } from '../donnees/source'

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
afterAll(() => void vi.useRealTimers())
const MOTIF = 'Motif écrit, assez long, journalisé avec le geste.'
const comme = (id: string) => s.session.changerAgent(id)

describe('modèle (config/acces-console.ts)', () => {
  it('§ 4 : conflits interdits ; « même dossier » seulement signalé', () => {
    expect(conflitBloquant(['finance', 'mediation'])?.roles).toEqual(['finance', 'mediation'])
    expect(conflitBloquant(['finance', 'rh'])).not.toBeNull()
    expect(conflitBloquant(['audit', 'support'])).not.toBeNull()
    expect(conflitBloquant(['rh', 'terrain'])).not.toBeNull()
    expect(conflitBloquant(['verification', 'support'])).toBeNull()
    expect(conflitsDe(['verification', 'support'])[0].dossier).toBe(true)
    expect(conflitBloquant(['superviseur', 'mediation'])).toBeNull()
  })
  it('rôles effectifs : équipe au niveau, rôle additionnel, accès temporaire seulement pendant sa durée', () => {
    const m = { id: 'x', equipe: 'operations' as const, niveau: 'agent' as const, perimetre: perimetreParDefaut('operations', 'agent', ['Z1']), roleAdditionnel: null, temporaires: [{ role: 'operations' as const, debut: 10, fin: 20, etat: 'actif' }] }
    expect(rolesEffectifs(m, 15)).toEqual(['terrain', 'operations'])
    expect(rolesEffectifs(m, 20)).toEqual(['terrain'])
    expect(rolesEffectifs({ ...m, niveau: 'responsable' }, 30)).toEqual(['operations'])
  })
  it('§ 3 : personne pour soi-même ; responsable dans son équipe et son périmètre ; Direction par la Direction', () => {
    const resp = { id: 'r', equipe: 'litiges' as const, niveau: 'responsable' as const, perimetre: { zones: null, niveauLitige: 2 as const, plafond: 100_000 }, roles: ['mediation' as const] }
    expect(refusAttribution(resp, { id: 'r', equipe: 'litiges', niveau: 'responsable' }, 'niveau')).toBe('soi_meme')
    expect(refusAttribution(resp, { id: 'a', equipe: 'finance', niveau: 'agent' }, 'niveau', { niveau: 'senior' })).toBe('hors_equipe')
    expect(refusAttribution(resp, { id: 'a', equipe: 'litiges', niveau: 'agent' }, 'niveau', { niveau: 'senior' })).toBeNull()
    expect(refusAttribution(resp, { id: 'a', equipe: 'litiges', niveau: 'agent' }, 'niveau', { niveau: 'responsable' })).toBe('niveau_reserve')
    expect(refusAttribution(resp, { id: 'a', equipe: 'litiges', niveau: 'agent' }, 'perimetre', { perimetre: { zones: null, niveauLitige: 2, plafond: 200_000 } })).toBe('hors_perimetre')
    expect(refusAttribution(resp, { id: 'a', equipe: 'litiges', niveau: 'agent' }, 'suspendre')).toBe('reserve_acces')
    const rh = { ...resp, equipe: 'acces' as const, roles: ['rh' as const] }
    expect(refusAttribution(rh, { id: 'd', equipe: 'direction', niveau: 'senior' }, 'suspendre')).toBe('direction_seule')
    expect(refusAttribution(rh, { id: 'a', equipe: 'finance', niveau: 'agent' }, 'suspendre')).toBeNull()
  })
  it('quatre yeux : équipes sensibles, plafond au-dessus du seuil, réactivation, accès temporaire long', () => {
    expect(exigeQuatreYeux('niveau', { id: 'a', equipe: 'finance', niveau: 'agent' }, { niveau: 'senior' })).toBe(true)
    expect(exigeQuatreYeux('niveau', { id: 'a', equipe: 'service_client', niveau: 'agent' }, { niveau: 'senior' })).toBe(false)
    expect(exigeQuatreYeux('perimetre', { id: 'a', equipe: 'service_client', niveau: 'agent' }, { perimetre: { zones: null, niveauLitige: 1, plafond: 500_000 } })).toBe(true)
    expect(exigeQuatreYeux('reactiver', { id: 'a', equipe: 'service_client', niveau: 'agent' }, {})).toBe(true)
    expect(exigeQuatreYeux('temporaire', { id: 'a', equipe: 'service_client', niveau: 'agent' }, { dureeMs: 3 * 86_400_000, roleTemporaire: 'mediation' })).toBe(false)
    expect(exigeQuatreYeux('temporaire', { id: 'a', equipe: 'service_client', niveau: 'agent' }, { dureeMs: 10 * 86_400_000, roleTemporaire: 'mediation' })).toBe(true)
  })
})

describe('domaine « equipe » (source de démonstration)', () => {
  it('jeu d’essai : 2 demandes, 6 accès à revoir, 3 temporaires qui finissent, au moins 2 comptes par équipe', async () => {
    await s.session.changerRole('superviseur')
    const t = await s.equipe.tableau()
    expect(t.demandes).toHaveLength(2)
    expect(t.aRevoir).toBe(6)
    expect(t.expirent).toBe(3)
    for (const e of t.equipes) expect(e.membres, e.code).toBeGreaterThanOrEqual(2)
    expect(t.alertes.map((a) => a.genre)).toEqual(expect.arrayContaining(['inactif', 'temporaire_expire', 'conflit', 'connexions_refusees', 'revue_retard', 'urgence_a_revoir']))
  })
  it('403 de la source : la Finance ne lit pas l’équipe ; un Agent ne tranche pas un litige de niveau 2 ni ne contresigne', async () => {
    await s.session.changerRole('finance')
    await expect(s.equipe.tableau()).rejects.toThrow(/ROLE_FORBIDDEN/)
    await comme('a-sandrine')
    await expect(s.litiges.decider('LT-0405', 'rembourser', MOTIF)).rejects.toThrow(/niveau 2/)
    await comme('a-boris')
    await expect(s.quatreyeux.contresigner('QY-0007', MOTIF)).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
  it('conflit refusé (Finance + Médiation)', async () => {
    await comme('a-pauline')
    const r = await s.equipe.changerRole('a-boris', 'mediation', MOTIF)
    expect(r).toMatchObject({ ok: false, raison: 'conflit' })
  })
  it('deux comptes Direction : le dernier n’est ni suspendu ni désactivé ; Accès et personnel ne touche pas la Direction', async () => {
    await comme('a-franck')
    await expect(s.equipe.suspendre('a-helene', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'direction_min' })
    await expect(s.equipe.desactiver('a-helene', MOTIF, null)).resolves.toMatchObject({ ok: false, raison: 'direction_min' })
    await expect(s.equipe.suspendre('a-franck', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'soi_meme' })
    await comme('a-pauline')
    await expect(s.equipe.suspendre('a-franck', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'direction_seule' })
  })
  it('responsable : son équipe seulement (niveau oui ; autre équipe, suspension : non)', async () => {
    await comme('a-patrice')
    await expect(s.equipe.changerNiveau('a-sandrine', 'senior', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'hors_equipe' })
    await expect(s.equipe.inviter({ prenom: 'Awa', nom: 'Bello', email: 'awa@belivay.com', equipe: 'finance', niveau: 'agent', zones: null }, MOTIF)).resolves.toMatchObject({ ok: false, raison: 'hors_equipe' })
    await expect(s.equipe.suspendre('a-aicha', MOTIF)).resolves.toMatchObject({ ok: false, raison: 'reserve_acces' })
    await expect(s.equipe.changerNiveau('a-aicha', 'senior', MOTIF)).resolves.toMatchObject({ ok: true, etat: 'applique' })
    await expect(s.equipe.monEquipe()).resolves.toMatchObject({ equipe: 'service_client' })
    await comme('a-aicha')
    await expect(s.equipe.monEquipe()).rejects.toThrow(/ROLE_FORBIDDEN/)
    expect((await s.equipe.mesMessages()).changements[0].quoi).toMatch(/Agent → Senior/)
  })
  it('suspension : la session ouverte de l’employé se ferme tout de suite ; aucune reconnexion', async () => {
    await comme('a-clarisse')
    expect((await s.session.session()).connecte).toBe(true)
    const { sessionDemo } = await import('./acces')
    const ouverte = sessionDemo.lire()
    await comme('a-pauline')
    await expect(s.equipe.suspendre('a-clarisse', MOTIF)).resolves.toMatchObject({ ok: true })
    sessionDemo.ecrire((e) => Object.assign(e, ouverte)) // l'onglet de Clarisse, ouvert avant
    expect((await s.session.session()).connecte).toBe(false)
    await expect(s.session.changerAgent('a-clarisse')).resolves.toEqual({ ok: false, raison: 'suspendu' })
    await s.session.changerRole('support')
    expect((await s.session.session()).connecte).toBe(false)
  })
  it('réactivation : toujours à quatre yeux ; appliquée à la contre-signature de la Direction', async () => {
    await comme('a-pauline')
    const r = await s.equipe.reactiver('a-clarisse', MOTIF)
    expect(r).toMatchObject({ ok: true, etat: 'a_contresigner' })
    await comme('a-franck')
    await s.quatreyeux.contresigner(r.ok ? r.qy! : '', MOTIF)
    await expect(s.session.changerAgent('a-clarisse')).resolves.toEqual({ ok: true })
  })
  it('accès temporaire : retiré tout seul à sa fin, le rôle ne sert plus', async () => {
    await comme('a-pauline')
    const r = await s.equipe.donnerTemporaire('a-aicha', { role: 'verification', fin: Date.now() + 2 * 3600_000, motif: MOTIF })
    expect(r).toMatchObject({ ok: true, etat: 'applique' })
    await comme('a-aicha')
    await expect(s.session.agirEnTantQue('verification')).resolves.toEqual({ ok: true })
    await expect(s.acteurs.kyc()).resolves.toBeTruthy()
    vi.setSystemTime(REF + 3 * 3600_000)
    await expect(s.acteurs.kyc()).rejects.toThrow(/plus tenu/)
    expect((await s.session.session()).role).toBe('support')
    expect((await s.equipe.mesMessages()).changements[0].quoi).toMatch(/retiré à sa fin/)
    vi.setSystemTime(REF)
  })
  it('départ : dossiers en cours réattribués avant la clôture', async () => {
    await comme('a-pauline')
    await expect(s.equipe.desactiver('a-sandrine', MOTIF, null)).resolves.toMatchObject({ ok: false, raison: 'dossiers_en_cours' })
    await expect(s.equipe.desactiver('a-sandrine', MOTIF, 'a-thierry')).resolves.toEqual({ ok: true, reattribues: 2 })
    await expect(s.session.changerAgent('a-sandrine')).resolves.toEqual({ ok: false, raison: 'suspendu' })
  })
  it('descentes : l’agent terrain ne voit que les siennes ; les Opérations planifient dans leurs zones', async () => {
    await s.session.changerRole('terrain')
    const l = await s.equipe.mesDescentes()
    expect(l.length).toBeGreaterThan(0)
    expect(l.every((d) => d.agent === 'Stéphane Tchoua')).toBe(true)
    await expect(s.equipe.descente('DT-0014')).rejects.toThrow(/ROLE_FORBIDDEN/)
    await expect(s.equipe.descentes()).rejects.toThrow(/ROLE_FORBIDDEN/)
    await expect(s.equipe.rapporter('DT-0012', { controles: {}, photos: [], compteRendu: 'x', resultat: null })).resolves.toMatchObject({ ok: false, raison: 'incomplet' })
    const c = Object.fromEntries((await s.equipe.descente('DT-0012'))!.controles.map((x) => [x.id, true]))
    await expect(s.equipe.rapporter('DT-0012', { controles: c, photos: ['Colis.jpg'], compteRendu: MOTIF, resultat: 'non_conforme' })).resolves.toEqual({ ok: true })
    await s.session.changerRole('operations')
    await expect(s.equipe.planifier({ type: 'controle_zone', zone: 'Z10', cible: { genre: 'zone', ref: 'Z10', libelle: 'Z10' }, lieu: 'Mvog-Mbi', repere: '', prevueLe: Date.now(), agentId: null })).resolves.toMatchObject({ ok: false, raison: 'hors_perimetre' })
    const p = await s.equipe.planifier({ type: 'inspection_relais', zone: 'Z1', cible: { genre: 'relais', ref: 'r-bastos', libelle: 'Relais Bastos Carrefour' }, lieu: 'Relais Bastos Carrefour', repere: '', prevueLe: Date.now() + 3600_000, agentId: 'a-stephane' })
    expect(p.ok).toBe(true)
    const pont = JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; relais?: string }[]
    expect(pont.some((e) => e.type === 'inspection_annoncee' && e.relais === 'rel-z1-001')).toBe(true)
  })
})
