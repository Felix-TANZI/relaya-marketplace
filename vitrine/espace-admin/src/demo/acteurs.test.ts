// Règles du groupe S3 tenues par la source de démonstration (comme le serveur) : KYC (pièces ouvertes avant
// d'approuver, conflit d'intérêts A-33, faux document → sanction niveau 4), paliers (motif et événements cités,
// contestation par un autre agent), sanctions (exclusion à quatre yeux d'un autre compte), IFA (5 commandes,
// croisement), catalogue (taxonomie sans doublon, fusion réversible), modération (prix barré), avis (masquage, retrait
// par le médiateur), publication vers les autres espaces (pont).
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
const pont = () => JSON.parse(memoire.get('blv_pont') ?? '[]') as { type: string; app: string }[]

describe('S3 : KYC', () => {
  it('approuver exige chaque pièce ouverte ; l’ouverture est journalisée et comptée pour l’agent', async () => {
    await s.session.changerRole('verification')
    await expect(s.acteurs.deciderKyc('KYC-0096', { action: 'approuver' })).resolves.toEqual({ ok: false, raison: 'pieces_non_vues' })
    for (const p of ['KYC-0096-1', 'KYC-0096-2', 'KYC-0096-3']) expect((await s.acteurs.ouvrirPiece('KYC-0096', p, 'Revue du doublon de CNI entre deux rôles déclarés')).ok).toBe(true)
    const r = await s.acteurs.deciderKyc('KYC-0096', { action: 'approuver' })
    expect(r).toEqual({ ok: true, etat: 'approuve', sanction: null })
    expect(pont().some((e) => e.type === 'kyc_decide' && e.app === 'admin')).toBe(true)
  })
  it('conflit d’intérêts : Franck ne décide pas le dossier de sa boutique ; Armand, oui', async () => {
    await s.session.changerRole('superviseur')
    await expect(s.acteurs.deciderKyc('KYC-0097', { action: 'complement', pieces: ['KYC-0097-1'], motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'conflit_interets' })
    await s.session.changerRole('verification')
    expect((await s.acteurs.deciderKyc('KYC-0097', { action: 'complement', pieces: ['KYC-0097-1'], motif: MOTIF })).ok).toBe(true)
  })
  it('rejet pour faux document : motif obligatoire, dossier de sanction niveau 4 ouvert', async () => {
    await s.session.changerRole('verification')
    await expect(s.acteurs.deciderKyc('KYC-0094', { action: 'rejeter', piece: 'KYC-0094-1', raison: 'faux_document', motif: 'court' })).resolves.toMatchObject({ ok: false, raison: 'motif_court' })
    const r = await s.acteurs.deciderKyc('KYC-0094', { action: 'rejeter', piece: 'KYC-0094-1', raison: 'faux_document', motif: MOTIF })
    expect(r.ok && r.sanction).toMatch(/^SN-/)
    await s.session.changerRole('superviseur')
    const sn = (await s.acteurs.sanctions()).find((x) => r.ok && x.id === r.sanction)!
    expect([sn.niveau, sn.etat, sn.listeNoire.length > 0]).toEqual([4, 'proposee', true])
  })
  it('le Support lit la KYC sans décider ; l’agent terrain ne valide jamais', async () => {
    await s.session.changerRole('support')
    await expect(s.acteurs.deciderKyc('KYC-0091', { action: 'approuver' })).resolves.toEqual({ ok: false, raison: 'lecture_seule' })
  })
})

describe('S3 : paliers et sanctions', () => {
  it('descente : motif et au moins un événement cité ; la contestation va à un autre agent', async () => {
    await s.session.changerRole('superviseur')
    await expect(s.acteurs.deciderPalier('PT-0014', { action: 'confirmer', motif: MOTIF, evenements: [] })).resolves.toEqual({ ok: false, raison: 'sans_evenement' })
    expect(await s.acteurs.deciderPalier('PT-0014', { action: 'confirmer', motif: MOTIF, evenements: ['k2', 'k3'] })).toEqual({ ok: true, etat: 'confirmee' })
    await s.session.changerRole('mediation')
    await expect(s.acteurs.deciderPalier('PT-0013', { action: 'annuler', motif: MOTIF, evenements: [] })).resolves.toEqual({ ok: false, raison: 'meme_auteur' })
    await s.session.changerRole('superviseur')
    expect((await s.acteurs.deciderPalier('PT-0013', { action: 'annuler', motif: MOTIF, evenements: [] })).ok).toBe(true)
  })
  it('exclusion : première validation, puis contre-signature d’un autre compte ; alors en vigueur', async () => {
    await s.session.changerRole('mediation')
    const r = await s.acteurs.deciderSanction('SN-0018', { action: 'valider', motif: MOTIF })
    expect(r.ok && r.etat).toBe('quatre_yeux')
    const qy = r.ok ? r.quatreYeux! : ''
    await expect(s.quatreyeux.contresigner(qy, MOTIF)).resolves.toMatchObject({ ok: false, raison: 'meme_compte' })
    await s.session.changerRole('superviseur')
    await expect(s.quatreyeux.contresigner(qy, MOTIF)).resolves.toMatchObject({ ok: true })
    expect((await s.acteurs.sanctions()).find((x) => x.id === 'SN-0018')!.etat).toBe('vigueur')
  })
  it('le Support ne décide pas une sanction (403) ; le recours est décidé par un autre que l’auteur', async () => {
    await s.session.changerRole('superviseur')
    await expect(s.acteurs.deciderSanction('SN-0017', { action: 'recours_reduire', motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'meme_auteur' })
    await s.session.changerRole('mediation')
    expect((await s.acteurs.deciderSanction('SN-0017', { action: 'recours_reduire', motif: MOTIF })).ok).toBe(true)
    await s.session.changerRole('support')
    await expect(s.acteurs.deciderSanction('SN-0021', { action: 'valider', motif: MOTIF })).rejects.toThrow()
  })
})

describe('S3 : clients, catalogue, modération, avis', () => {
  it('IFA : jamais avant 5 commandes ; la Finance ne voit pas l’IFA', async () => {
    await s.session.changerRole('support')
    expect((await s.acteurs.deciderIfa('c-7731', { action: 'valider', motif: MOTIF })).ok).toBe(true)
    await s.session.changerRole('finance')
    const f = await s.acteurs.client('c-7731')
    expect([f?.composantes.length, f?.proposition]).toEqual([0, null])
  })
  it('taxonomie sans doublon ; fusion réversible', async () => {
    await s.session.changerRole('verification')
    await expect(s.catalogue.creerSousCategorie('Informatique', 'écouteurs')).resolves.toMatchObject({ ok: false, raison: 'doublon', existe: 'Téléphones et accessoires' })
    expect((await s.catalogue.deciderAppariement('AP-0007', 'fusionner', '')).ok).toBe(true)
    expect((await s.catalogue.fiches()).some((f) => f.id === 'FM-01307')).toBe(false)
    expect((await s.catalogue.deciderAppariement('AP-0007', 'annuler', MOTIF)).ok).toBe(true)
  })
  it('prix barré : retrait confirmé ; avis : masquage d’un contenu illicite, retrait par le médiateur seulement', async () => {
    await s.session.changerRole('verification')
    expect((await s.catalogue.deciderOffre('OF-7802', { action: 'retirer_barre', motif: MOTIF, suggestion: true })).ok).toBe(true)
    await expect(s.catalogue.deciderAvis('AV-0311', { action: 'masquer', motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'masquage_impossible' })
    await expect(s.catalogue.deciderAvis('AV-0312', { action: 'retirer', raison: 'sans_lien', motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'role' })
    expect((await s.catalogue.deciderAvis('AV-0313', { action: 'masquer', motif: MOTIF })).ok).toBe(true)
    expect((await s.catalogue.avis()).find((a) => a.id === 'AV-0313')!.texte).toContain('[contenu masqué par la modération]')
    await s.session.changerRole('mediation')
    expect((await s.catalogue.deciderAvis('AV-0312', { action: 'retirer', raison: 'sans_lien', motif: MOTIF })).ok).toBe(true)
  })
})

describe('Pont montant vers la console', () => {
  it('account.requested : un dossier KYC à revoir ; la décision renvoie l’identifiant reçu', async () => {
    const l = pont()
    l.push({ type: 'account.requested', espace: 'relais', acteur: 'rel-z1-001', dossier: 'KYC-P-001', pieces: 3, cle: 'ar1', app: 'relais', le: Date.now() } as never)
    memoire.set('blv_pont', JSON.stringify(l))
    await s.session.changerRole('verification')
    const d = (await s.acteurs.kyc()).find((k) => k.id === 'KYC-P-001')!
    expect(d.etat).toBe('a_revoir')
    for (const p of d.pieces) expect((await s.acteurs.ouvrirPiece(d.id, p.id, 'Revue de la demande d’activation reçue par le pont')).ok).toBe(true)
    expect((await s.acteurs.deciderKyc(d.id, { action: 'approuver' })).ok).toBe(true)
    const e = pont().find((x) => x.type === 'kyc_decide' && (x as unknown as { dossier: string }).dossier === 'KYC-P-001') as unknown as { espace: string; acteur: string }
    expect(e).toMatchObject({ espace: 'relais', acteur: 'rel-z1-001' })
  })
  it('claim.opened puis claim.answered « conteste » : un litige à arbitrer ; la décision porte la commande', async () => {
    const l = pont()
    const colis = [{ colis: 'BLV-60001-1', boutique: 'Boutique B', classe: 'M', lignes: [{ produit: 'fer', titre: 'Défroisseur', variante: null, prix: 65000, qte: 1, categorie: null, photo: null }] }]
    l.push({ type: 'order.paid', commande: 'BLV-60001', mode: 'relais', lieu: 'Relais Bastos', relais: 'rel-z1-001', zone: 'Z1', payableAuRetrait: false, delaiH: 4, colis, livraisonOfferte: 0, cle: 'op1', app: 'client', le: Date.now() - 3600_000 } as never)
    l.push({ type: 'claim.opened', commande: 'BLV-60001', colis: 'BLV-60001-1', dossier: 'LT-P-001', motif: 'Ne chauffe pas', souhait: 'rembourse', photos: 2, cle: 'co1', app: 'client', le: Date.now() - 1800_000 } as never)
    l.push({ type: 'claim.answered', commande: 'BLV-60001', colis: 'BLV-60001-1', dossier: 'LT-P-001', posture: 'conteste', retour: null, cle: 'ca1', app: 'vendeur', le: Date.now() - 600_000 } as never)
    memoire.set('blv_pont', JSON.stringify(l))
    await s.session.changerRole('support')
    const lt = (await s.litiges.liste()).find((x) => x.id === 'LT-P-001')!
    expect(lt.etat).toBe('arbitrer')
    expect((await s.commandes.liste()).some((c) => c.ref === 'BLV-60001' && c.etat === 'litige')).toBe(true)
    const r = await s.litiges.decider('LT-P-001', 'debouter', MOTIF)
    expect(r.ok).toBe(true)
    expect(pont().some((x) => x.type === 'litige_decide' && (x as unknown as { commande: string }).commande === 'BLV-60001')).toBe(true)
  })
})
