// Règles des écrans S6 tenues par la démonstration (comme le serveur) : alertes de fraude CALCULÉES (seuils du registre,
// jamais d'action automatique), revue avant décision, gel à quatre yeux appliqué à la contre-signature ; journal (sa
// part, consultation journalisée une fois, reconstitution, export à quatre yeux) ; toujours deux comptes Direction ;
// espaces pays fermés sans conditions ; agent terrain limité à ses zones ; maintenance (préavis, créneaux interdits) ;
// texte légal (préavis, vocabulaire) ; tâches (une exécution par période).
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { SourceAdmin } from '../donnees/source'
import { maintenant } from './horloge'
import { anneaux, avisCroises, refusComptoir, remboursementsAuto, retraits, type ParametresFraude } from './fraude-moteur'

let s: SourceAdmin
const memoire = new Map<string, string>()
beforeAll(async () => {
  vi.stubGlobal('localStorage', { getItem: (k: string) => memoire.get(k) ?? null, setItem: (k: string, v: string) => void memoire.set(k, v), removeItem: (k: string) => void memoire.delete(k), clear: () => memoire.clear(), key: () => null, length: 0 })
  vi.stubGlobal('window', { setInterval: () => 0, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true })
  vi.stubGlobal('CustomEvent', class extends Event {})
  s = (await import('./source-demo')).sourceDemo
})
const MOTIF = 'Motif assez long pour une décision défavorable, écrit et journalisé.'
const P: ParametresFraude = { fenetreJ: 30, anneauComptes: 3, rembAuto: 3, refusComptoir: 2, avisNote: 4, retraitsN: 3, retraitsF: 300000 }
const J = 86_400_000

describe('moteur de fraude (copie de belivay_moteurs/fraude.py)', () => {
  it('anneau : à partir du seuil de comptes ; critique au double', () => {
    const c = (id: string, n: string) => ({ compte: id, appareils: [], numeros: [n] })
    expect(anneaux([c('a', 'N1'), c('b', 'N1')], P)).toEqual([])
    const a = anneaux([c('a', 'N1'), c('b', 'N1'), c('c', 'N1')], P)
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ type: 'anneau', lien: 'numero', niveau: 'attention', mesure: 3 })
    expect(anneaux('abcdef'.split('').map((x) => c(x, 'N1')), P)[0].niveau).toBe('critique')
    // Comme le moteur : le numéro de versement d'un vendeur et le moyen de paiement d'un client ne se rapprochent pas.
    const m = (id: string, n: string) => ({ compte: id, moyens: [n] })
    expect(anneaux([c('v', 'N1'), m('a', 'N1'), m('b', 'N1')], P)).toEqual([])
    expect(anneaux([m('a', 'N1'), m('b', 'N1'), m('c', 'N1')], P)[0]).toMatchObject({ lien: 'moyen', cle: 'anneau:moyen|N1' })
  })
  it('remboursements dans la fenêtre seulement ; comptoir ; avis croisés réciproques ; retraits en 24 h', () => {
    const t = Date.UTC(2026, 9, 13)
    expect(remboursementsAuto([{ compte: 'x', le: t - 40 * J }, { compte: 'x', le: t - 2 * J }, { compte: 'x', le: t - J }], t, P)).toEqual([])
    expect(remboursementsAuto([1, 2, 3].map((d) => ({ compte: 'x', le: t - d * J })), t, P)).toHaveLength(1)
    expect(refusComptoir({ x: 1, y: 2 }, P).map((a) => a.comptes[0])).toEqual(['y'])
    expect(avisCroises([{ auteur: 'a', cible: 'b', etoiles: 5 }, { auteur: 'b', cible: 'a', etoiles: 3 }], P)).toEqual([])
    expect(avisCroises([{ auteur: 'a', cible: 'b', etoiles: 5 }, { auteur: 'b', cible: 'a', etoiles: 4 }], P)).toHaveLength(1)
    const r = retraits([{ compte: 'w', montant: 310000, le: t - 3600_000 }, { compte: 'w', montant: 5000, le: t - 2 * J }], t, P)
    expect(r[0]).toMatchObject({ mesure: 310000, seuil: 300000, montant: 310000 })
  })
})

describe('fraude et anneaux (ADM-P30)', () => {
  it('six familles calculées, aucune issue automatique ; le Support lit sans ouvrir de revue', async () => {
    await s.session.changerRole('superviseur')
    const f = await s.gouvernance.fraude()
    expect(f.alertes.map((a) => a.type).sort()).toEqual(['anneau', 'anneau', 'anneau', 'avis_croises', 'comptoir', 'remboursements', 'retraits'])
    expect(f.alertes.filter((a) => a.type === 'anneau').map((a) => a.lien).sort()).toEqual(['appareil', 'appareil', 'moyen'])
    expect(f.issues30j.automatiques).toBe(0)
    expect(f.regles.anneauComptes).toBe(3)
    await s.session.changerRole('support')
    await expect(s.gouvernance.ouvrirRevue(f.alertes[0].id)).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
  it('pas de décision sans revue ; gel appliqué seulement à la contre-signature d’un autre compte', async () => {
    await s.session.changerRole('superviseur')
    const a = (await s.gouvernance.fraude()).alertes.find((x) => x.id === 'FR-261013-01')!
    expect(a.etat).toBe('nouvelle')
    expect(a.comptes.some((c) => c.espace === 'vendeur')).toBe(true)
    expect(a.noeuds.some((n) => n.genre === 'appareil' && n.chaud)).toBe(true)
    await expect(s.gouvernance.classerAlerte(a.id, MOTIF)).resolves.toEqual({ ok: false, raison: 'pas_de_revue' })
    await s.gouvernance.ouvrirRevue(a.id)
    const q = await s.quatreyeux.decider({ action: 'fraude.geler', objet: a.id, resume: 'Geler', motif: MOTIF, preuves: [], quatreYeux: true, rolesSecond: ['finance', 'superviseur'] })
    await s.gouvernance.lierGel(a.id, q.ok ? q.id : '')
    let x = (await s.gouvernance.alerte(a.id))!
    expect(x.etat).toBe('gel_demande')
    expect(x.gel?.montant).toBeGreaterThan(0)
    await s.session.changerRole('finance')
    await s.quatreyeux.contresigner(q.ok ? q.id : '', MOTIF)
    await s.session.changerRole('superviseur')
    x = (await s.gouvernance.alerte(a.id))!
    expect(x.etat).toBe('gel')
    expect(x.gel?.revueLe).toBeGreaterThan(x.gel!.appliqueLe!)
    await expect(s.gouvernance.classerAlerte(a.id, MOTIF)).resolves.toEqual({ ok: false, raison: 'deja_tranchee' })
    await expect(s.gouvernance.leverGel(a.id, MOTIF)).resolves.toEqual({ ok: true })
    expect((await s.gouvernance.alerte(a.id))!.historique.some((h) => h.t.startsWith('fraude.gel.lever'))).toBe(true)
  })
})

describe('journal d’audit (ADM-P31)', () => {
  it('consultation journalisée une fois par minute ; sa part pour la Finance ; reconstitution', async () => {
    await s.session.changerRole('audit')
    await s.gouvernance.consulterJournal()
    await s.gouvernance.consulterJournal()
    const t = await s.gouvernance.tableauJournal({ periode: 'tout' })
    expect(t.tout).toBe(true)
    expect(t.lignes.filter((l) => l.action === 'journal.consulter' && l.role === 'audit')).toHaveLength(1)
    expect(t.chaine.ok).toBe(true)
    await s.session.changerRole('finance')
    const f = await s.gouvernance.tableauJournal({ periode: 'tout' })
    expect(f.tout).toBe(false)
    expect(f.lignes.every((l) => l.agentId === 'a-nadege')).toBe(true)
    await s.session.changerRole('superviseur')
    const a = (await s.gouvernance.fraude()).alertes.find((x) => x.id === 'FR-261013-01')!
    const r = await s.gouvernance.reconstituer(a.id, maintenant() + 365 * J)
    expect(r.etat).toMatch(/Gel levé/)
  })
  it('export signé : fichier seulement après contre-signature', async () => {
    await s.session.changerRole('audit')
    const q = await s.quatreyeux.decider({ action: 'journal.exporter', objet: 'Journal', resume: 'Exporter', motif: MOTIF, preuves: [], quatreYeux: true, rolesSecond: ['superviseur', 'finance'] })
    await s.gouvernance.lierExport(q.ok ? q.id : '', { genre: 'periode', du: 0, au: maintenant() + 365 * J })
    const e = (await s.gouvernance.exportsJournal())[0]
    await expect(s.gouvernance.telechargerExport(e.id)).resolves.toEqual({ ok: false, raison: 'pas_valide' })
    await s.session.changerRole('superviseur')
    await s.quatreyeux.contresigner(q.ok ? q.id : '', MOTIF)
    await s.session.changerRole('audit')
    const r = await s.gouvernance.telechargerExport(e.id)
    expect(r.ok && r.lignes.length).toBeGreaterThan(3)
  })
})

describe('rôles, pays, terrain (ADM-P32 à P34)', () => {
  it('toujours deux comptes Direction : jamais le dernier fermé ; Direction seulement à quatre yeux', async () => {
    await s.session.changerRole('superviseur')
    const t = await s.gouvernance.comptes()
    expect(t.directionMin).toBe(2)
    expect(t.comptes.find((c) => c.agent.id === 'a-paul')?.etat).toBe('suspendu')
    await expect(s.gouvernance.creerCompte({ prenom: 'Awa', nom: 'Bello', email: 'awa@belivay.com', role: 'superviseur', zones: null })).resolves.toEqual({ ok: false, raison: 'direction_quatre_yeux' })
    await expect(s.gouvernance.creerCompte({ prenom: 'Awa', nom: 'Bello', email: 'awa@belivay.com', role: 'operations', zones: [] })).resolves.toEqual({ ok: false, raison: 'incomplet' })
    expect((await s.gouvernance.creerCompte({ prenom: 'Awa', nom: 'Bello', email: 'awa@belivay.com', role: 'support', zones: null })).ok).toBe(true)
    await s.session.changerRole('finance')
    await expect(s.gouvernance.comptes()).rejects.toThrow(/ROLE_FORBIDDEN/)
  })
  it('un espace en préparation n’ouvre pas sans ses conditions ; une condition ne se saisit pas', async () => {
    await s.session.changerRole('superviseur')
    const p = await s.gouvernance.pays()
    expect(p.map((x) => x.etat)).toEqual(['ouvert', 'preparation'])
    await expect(s.gouvernance.ouvrirPays('GA', MOTIF)).resolves.toEqual({ ok: false, raison: 'conditions' })
    await expect(s.gouvernance.revoirParametre('GA', 'PAY-AGREG', 'X')).resolves.toEqual({ ok: false, raison: 'condition' })
    expect((await s.gouvernance.revoirParametre('GA', 'VD-TVA', '18 %')).ok).toBe(true)
  })
  it('agent terrain : sa tournée, ses zones ; aucun geste de validation à la place de l’acteur', async () => {
    await s.session.changerRole('terrain')
    const r = await s.gouvernance.nouvelleFiche({ genre: 'boutique', nom: 'Test', zone: 'Z6', quartier: 'Biyem', titulaire: 'X Y', numero: '+237 690 00 00 01' })
    expect(r).toEqual({ ok: false, raison: 'hors_zone' })
    const o = await s.gouvernance.nouvelleFiche({ genre: 'boutique', nom: 'Test', zone: 'Z1', quartier: 'Bastos', titulaire: 'X Y', numero: '+237 690 00 00 01' })
    expect(o.ok).toBe(true)
    await expect(s.gouvernance.controlerFiche('ST-0040', true, MOTIF)).rejects.toThrow(/ROLE_FORBIDDEN/)
    expect(Object.keys(s.gouvernance)).not.toContain('validerFiche')
  })
})

describe('système (ADM-P35 à P37, tâches, conservation)', () => {
  it('maintenance : préavis et créneaux interdits', async () => {
    await s.session.changerRole('superviseur')
    const n = maintenant()
    const m = { service: 'Recherche', dureeMin: 60, motif: MOTIF }
    await expect(s.systeme.programmerMaintenance({ ...m, debut: n + 3600_000 })).resolves.toEqual({ ok: false, raison: 'preavis' })
    // Jeudi 15 oct. 2026 à 20 h (Yaoundé) = 19 h UTC : jeudi soir interdit.
    const jeudi20h = Date.UTC(2026, 9, 15, 19)
    await expect(s.systeme.programmerMaintenance({ ...m, debut: jeudi20h })).resolves.toEqual({ ok: false, raison: 'creneau_interdit' })
    expect((await s.systeme.programmerMaintenance({ ...m, debut: jeudi20h + 2 * J })).ok).toBe(true)
  })
  it('texte légal : préavis du registre et vocabulaire d’établissement de paiement refusé', async () => {
    const l = await s.systeme.legal()
    expect(l.textes).toHaveLength(9)
    const effet = maintenant() + (l.preavisJ + 1) * J
    await expect(s.systeme.proposerVersion({ texte: 'cg-client', resume: 'r', contenu: 'Votre compte bancaire BelivaY', effet, motif: MOTIF })).resolves.toMatchObject({ ok: false, raison: 'vocabulaire' })
    await expect(s.systeme.proposerVersion({ texte: 'cg-client', resume: 'r', contenu: 'Wallet', effet: maintenant() + J, motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'preavis' })
    await expect(s.systeme.proposerVersion({ texte: 'cg-client', resume: 'r', contenu: 'Wallet', effet, motif: MOTIF })).resolves.toEqual({ ok: true, version: '1.1' })
    await expect(s.systeme.proposerVersion({ texte: 'cg-entreprise', resume: 'r', contenu: 'Wallet', effet, motif: MOTIF })).resolves.toEqual({ ok: false, raison: 'deja_annoncee' })
  })
  it('tâches : une exécution par période ; la tâche en échec se relance ; le journal n’est jamais effacé', async () => {
    const t = await s.systeme.tableauTaches()
    expect(t.find((x) => x.nom === 'console.conservation')?.derniere?.ok).toBe(false)
    await expect(s.systeme.lancerTache('livraison.vendredi', MOTIF)).resolves.toEqual({ ok: false, raison: 'deja_faite' })
    await expect(s.systeme.lancerTache('console.conservation', MOTIF)).resolves.toEqual({ ok: true })
    const c = await s.systeme.conservation()
    expect(c.politique.find((p) => p.donnee.startsWith('Journal'))?.action).toBe('jamais')
    expect(c.geles.length).toBeGreaterThan(0)
  })
  it('rapports : part du rôle ; Opérations limitées à leurs zones', async () => {
    await s.session.changerRole('operations')
    const r = await s.systeme.rapports({ periode: '7j', zone: 'Z4' })
    expect(r.parties).toEqual(['logistique'])
    expect(r.zone).toBeNull()
    expect(r.logistique.map((i) => i.id)).toEqual(expect.arrayContaining(['ramassage', 'retrait', 'litigesVendeur', 'nonRetires', 'emballageColis']))
    await s.session.changerRole('superviseur')
    const d = await s.systeme.rapports({ periode: 'jour', zone: 'Z1' })
    expect(d.activite[0].echantillonInsuffisant || d.marge.parCommande === null).toBe(true)
  })
})
