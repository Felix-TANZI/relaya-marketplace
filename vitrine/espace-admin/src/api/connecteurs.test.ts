// Connecteurs de la console : chaque méthode de la SourceAdmin est branchée (src/api/domaines) ou refusée proprement,
// et décrite une fois au registre (src/api/routes.ts → CONNECTEURS-ADMIN.md) ; chaque appel réel part vers une route
// qui existe au catalogue du kit (backend-kit/apps/console/donnees/routes-console.json, méthode et chemin) ; les
// refus du kit sont traduits (403 console_forbidden et hors_perimetre → AccesRefuse ; 400 motif_requis → motif_court ;
// 404 → null) ; une décision part avec une clé d'idempotence.
import { describe, expect, it } from 'vitest'
import catalogueBrut from '../../../backend-kit/apps/console/donnees/routes-console.json?raw'
import { creerClient, stockageMemoire } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import { AccesRefuse } from '../donnees/communs'
import { DOMAINES } from '../donnees/source'
import { BRANCHES } from './domaines'
import { NonBranche } from './outils'
import { CONNECTEURS_ADMIN, type MethodeAdmin } from './routes'
import { sourceApi } from './source-api'

interface Appel {
  url: string
  methode: string
  corps: unknown
  entetes: Record<string, string>
}

const CATALOGUE = JSON.parse(catalogueBrut) as { methode: string; chemin: string }[]
const GABARITS = CATALOGUE.map((r) => ({ methode: r.methode.toUpperCase(), motif: new RegExp(`^${r.chemin.replace(/\{[^}]+\}/g, '[^/]+')}$`) }))
const auCatalogue = (methode: string, chemin: string) => GABARITS.some((g) => g.methode === methode && g.motif.test(chemin))

/** Réponses plausibles du kit, assez pour que chaque connecteur aille jusqu'à ses appels. */
function reponse(methode: string, chemin: string): unknown {
  if (methode === 'POST' && chemin === '/api/console/decisions') return { reference: 'DC-1', action: 'x', objet: 'x', statut: 'appliquee', resultat: null }
  if (methode === 'POST' && chemin.endsWith('/contresigner')) return { reference: 'DC-1', statut: 'appliquee' }
  if (methode === 'POST' && chemin.endsWith('/lien')) return { jeton: 'j', chemin: '/api/console/pieces/ouvrir/j', expireLe: 1, minutes: 5 }
  if (methode === 'POST' && chemin.endsWith('/propositions')) return { id: 7 }
  if (methode === 'POST' && chemin === '/api/console/notifications/modeles') return { code: 'c', canal: 'sms', langue: 'fr', version: 2, titre: 't', corps: 'x' }
  if (methode === 'POST' && chemin === '/api/console/vues/demasquer') return { ok: true, valeur: '677000111' }
  if (methode === 'POST') return { ok: true }
  if (chemin.startsWith('/api/console/pieces/ouvrir/')) return { titulaire: 'T', fichier: { chemin: '/x' } }
  if (chemin === '/api/console/vues/parametres') return [{ code: 'X', valeur: '5 h' }]
  if (chemin === '/api/console/vues/propositions') return [{ id: '1', etat: 'a_contresigner' }]
  if (chemin === '/api/console/vues/agents') return [{ id: '1', user: '2', roles: ['audit'], zones: null, actif: true }]
  if (chemin === '/api/console/vues/kyc') return [{ id: 'L1', pieces: [{ id: '3', etat: 'a_revoir', type: 'cni' }] }]
  if (chemin === '/api/console/vues/session') return { connecte: true, agent: { roles: ['audit'] }, role: 'audit' }
  if (chemin === '/api/console/vues/fraude') return { alertes: [] }
  if (chemin === '/api/console/actions') return [{ code: 'relais-etat', permission: 'relais.fermer', permise: true, doubleControle: 'selon les données' }]
  if (chemin === '/api/console/roles') return { permissions: { 'relais.fermer': ['superviseur'] }, quatreYeux: [] }
  if (chemin === '/api/console/notifications/modeles') return [{ code: 'c', canal: 'sms', langue: 'fr', version: 1, titre: 't', corps: 'x' }]
  if (chemin === '/api/console/notifications/envois') return { elements: [] }
  if (chemin === '/api/console/journal/verification') return { ok: true, lignes: 3, rompue_a: null }
  if (chemin === '/api/console/qualite') return { elements: [] }
  if (/^\/api\/console\/vues\/[a-z-]+\/[^/]+$/.test(chemin)) return { statut: 'pilote' }
  return []
}

function serveur(repondre: (methode: string, chemin: string) => { statut: number; corps: unknown } = (m, c) => ({ statut: 200, corps: reponse(m, c) })) {
  const appels: Appel[] = []
  const api = creerClient({
    baseUrl: 'http://essai/api',
    stockage: stockageMemoire({ acces: 'a', rafraichissement: null }),
    attendre: async () => {},
    tentatives: 0,
    fetch: (async (url: string, init: RequestInit) => {
      const u = new URL(String(url))
      const methode = init.method ?? 'GET'
      appels.push({ url: u.pathname + u.search, methode, corps: init.body, entetes: Object.fromEntries(new Headers(init.headers).entries()) })
      const r = repondre(methode, u.pathname)
      const texte = typeof r.corps === 'string' ? r.corps : JSON.stringify(r.corps)
      return new Response(r.statut === 204 ? null : texte, { status: r.statut, headers: { 'Content-Type': typeof r.corps === 'string' ? 'application/x-ndjson' : 'application/json' } })
    }) as typeof fetch,
  })
  return { api, appels }
}

/** Arguments plausibles de chaque méthode (ceux qui portent un objet ; les autres reçoivent des chaînes). */
const ARGS: Partial<Record<MethodeAdmin, unknown[]>> = {
  'quatreyeux.decider': [{ action: 'relais.fermer', objet: '1', resume: '', motif: 'Motif écrit', preuves: [{ id: 'p', libelle: 'Photo' }], montant: null, quatreYeux: true, rolesSecond: ['superviseur'] }],
  'litiges.decider': ['LIT-1', 'rembourser', 'Motif écrit'],
  'acteurs.deciderKyc': ['L1', { action: 'approuver' }],
  'acteurs.proposerSanction': [{ acteurId: '1', acteur: 'B', espace: 'vendeur', zone: null, niveau: 3, motif: 'Motif écrit', origine: 'DC-1' }],
  'catalogue.deciderOffre': ['1', { action: 'valider', motif: 'Motif écrit', suggestion: false }],
  'catalogue.deciderAvis': ['P1', { action: 'masquer', motif: 'Motif écrit' }],
  'pilotage.preparer': [{ code: 'X', apres: 6, dateEffet: 0, motif: 'Motif écrit', reference: '' }],
  'gouvernance.modifierCompte': ['1', { roles: ['audit'], zones: null }, 'Motif écrit'],
  'gouvernance.tableauJournal': [{ periode: '7j' }],
  'gouvernance.reconstituer': ['entreprise:1', Date.now()],
  'logistique.verifier': ['relais.fermer', '1'],
  'logistique.suspendreLivreur': ['1', 'Motif écrit', null],
  'argent.grandLivre': [Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 31)],
  'acteurs.ouvrirPiece': ['L1', '3', 'Motif écrit'],
  'communication.publierModele': ['c', 'Texte FR', 'Text EN', 'Motif écrit'],
  'systeme.lancerTache': ['console.fraude', 'Motif écrit'],
  'pilotage.demanderBascule': ['FF-IA', true, 'Motif écrit'],
  'session.agirEnTantQue': ['audit'],
  'direct.chercher': ['BLV-1'],
  'gouvernance.enregistrerDemande': [{ acteur: 'Client ••• 0012', espace: 'client', type: 'acces', motif: 'Motif écrit' }],
  'gouvernance.nouvelleFiche': [{ genre: 'boutique', nom: 'Chez Awa', zone: 'Z1', quartier: 'Mvog-Ada', titulaire: 'Awa', numero: '677112241' }],
  'gouvernance.controlerFiche': ['ST-1', true, 'Motif écrit'],
  'systeme.programmerMaintenance': [{ service: 'paiements', debut: Date.now() + 86_400_000, dureeMin: 30, motif: 'Motif écrit' }],
  'systeme.proposerVersion': [{ texte: 'cgu', resume: 'Résumé', contenu: 'Texte', effet: Date.now() + 30 * 86_400_000, motif: 'Motif écrit' }],
  'communication.audience': [['client', 'vendeur'], ['Z1'], false],
  'communication.diffuser': [{ objet: 'Objet', texte: 'Texte', espaces: ['client'], zones: ['Z1'], canaux: ['push'], promotion: false, programmeeLe: Date.now(), motif: 'Motif écrit' }],
  'communication.passerPapier': ['INC-1', ['Relais Mokolo']],
  'communication.ecrireRapport': ['INC-1', { cause: 'Cause', effets: 'Effets', change: 'Change' }],
  'communication.declarer': [{ service: 'Réseau', zones: ['Z1'], effets: [], consignes: 'Consignes', detecteLe: Date.now() }],
  'decisions.noterAppel': ['litige', '1', { avec: 'client', nom: 'Client', resultat: 'joint', resume: 'Appel au client', accord: null }],
  'decisions.decider': ['litige', '1', { issue: 'rembourser', motif: 'Preuves concordantes', note: 'Note écrite', message: '' }],
  'decisions.deciderLot': ['litige', ['1', '2'], { issue: 'rembourser', motif: 'Preuves concordantes', note: 'Note écrite', message: '' }],
}
const CHAINES = ['1', 'Motif écrit', 'Motif écrit']

type Methode = (...a: unknown[]) => Promise<unknown>

describe('registre des connecteurs de la console', () => {
  const { api } = serveur()
  const branches = BRANCHES(api) as unknown as Record<string, Record<string, Methode>>

  it('chaque domaine de la source est branché, et chaque méthode a son entrée au registre', () => {
    expect(Object.keys(branches).sort()).toEqual([...DOMAINES].sort())
    const methodes = Object.entries(branches).flatMap(([d, o]) => Object.keys(o).map((m) => `${d}.${m}`)).sort()
    expect(Object.keys(CONNECTEURS_ADMIN).sort()).toEqual(methodes)
  })

  it('chaque route du registre branchée est au catalogue du kit (méthode et chemin)', () => {
    for (const [cle, c] of Object.entries(CONNECTEURS_ADMIN)) {
      if (c.etat !== 'branche' && c.etat !== 'partiel') continue
      const routes = [...c.route.matchAll(/\b(GET|POST) (\/api\/console\/[^\s?{]*(?:\{[^}]+\}[^\s?{]*)*)/g)]
      expect(routes.length, cle).toBeGreaterThan(0)
      for (const [, methode, chemin] of routes) expect(auCatalogue(methode, chemin.replace(/\{[^}]+\}/g, 'x')), `${cle} : ${methode} ${chemin}`).toBe(true)
    }
  })

  it('chaque appel réel part vers une route du catalogue ; une méthode « serveur » ou « demo » est refusée proprement', async () => {
    for (const [cle, c] of Object.entries(CONNECTEURS_ADMIN) as [MethodeAdmin, (typeof CONNECTEURS_ADMIN)[MethodeAdmin]][]) {
      const s = serveur()
      const [d, m] = cle.split('.')
      const f = (BRANCHES(s.api) as unknown as Record<string, Record<string, Methode>>)[d][m]
      const issue = await f(...(ARGS[cle] ?? CHAINES)).then(
        () => null,
        (x: unknown) => x,
      )
      if (c.etat === 'serveur') {
        expect(issue, cle).toBeInstanceOf(NonBranche)
        expect(s.appels, cle).toEqual([])
        continue
      }
      if (c.etat === 'demo') {
        expect(issue, cle).toBeInstanceOf(NonDisponible)
        continue
      }
      expect(issue, `${cle} : ${String(issue)}`).toBeNull()
      for (const a of s.appels) expect(auCatalogue(a.methode, a.url.split('?')[0]), `${cle} → ${a.methode} ${a.url}`).toBe(true)
      expect(s.appels.length, `${cle} n’appelle rien`).toBeGreaterThan(0)
    }
  })
})

describe('traduction des refus du kit', () => {
  it('403 console_forbidden devient AccesRefuse avec les rôles admis', async () => {
    const { api } = serveur(() => ({ statut: 403, corps: { error: { code: 'console_forbidden', message: 'Votre rôle ne permet pas cette action.', data: { permission: 'finances.lire', roles: ['finance', 'superviseur', 'audit'] } } } }))
    const e = await sourceApi(api).argent.versements().catch((x) => x)
    expect(e).toBeInstanceOf(AccesRefuse)
    expect((e as AccesRefuse).roles).toEqual(['finance', 'superviseur', 'audit'])
  })

  it('403 hors_perimetre devient AccesRefuse ; dans une décision, role_non_permis', async () => {
    const { api } = serveur(() => ({ statut: 403, corps: { error: { code: 'hors_perimetre', message: 'Cette décision sort de vos zones.' } } }))
    expect(await sourceApi(api).logistique.paquets().catch((x) => x)).toBeInstanceOf(AccesRefuse)
    const r = await sourceApi(api).quatreyeux.decider(ARGS['quatreyeux.decider']![0] as never)
    expect(r).toMatchObject({ ok: false, raison: 'role_non_permis' })
  })

  it('400 motif_requis devient motif_court ; 409 state_changed devient deja_decide', async () => {
    const motif = serveur(() => ({ statut: 400, corps: { error: { code: 'motif_requis', message: 'Une décision de la console est toujours motivée.' } } }))
    expect(await sourceApi(motif.api).litiges.decider('LIT-1', 'rembourser', '')).toMatchObject({ ok: false, raison: 'motif_court' })
    const etat = serveur(() => ({ statut: 409, corps: { error: { code: 'state_changed', message: 'Ce litige n’attend plus de décision.' } } }))
    expect(await sourceApi(etat.api).litiges.decider('LIT-1', 'debouter', 'Motif écrit')).toMatchObject({ ok: false, raison: 'deja_decide' })
  })

  it('404 sur une fiche devient null', async () => {
    const { api } = serveur(() => ({ statut: 404, corps: { error: { code: 'not_found', message: 'Introuvable.' } } }))
    expect(await sourceApi(api).commandes.commande('BLV-1')).toBeNull()
    expect(await sourceApi(api).logistique.livreurFiche('9')).toBeNull()
  })

  it('une décision part vers /api/console/decisions avec une clé d’idempotence et le motif', async () => {
    const s = serveur()
    const r = await sourceApi(s.api).litiges.decider('LIT-12', 'rembourser', 'Colis abîmé, photo au comptoir')
    expect(r).toMatchObject({ ok: true, etat: 'appliquee', id: 'DC-1' })
    const a = s.appels.find((x) => x.url === '/api/console/decisions')!
    expect(a.entetes['idempotency-key']).toBeTruthy()
    expect(JSON.parse(String(a.corps))).toEqual({ action: 'litige-client', donnees: { litige: 12, issue: 'rembourse' }, motif: 'Colis abîmé, photo au comptoir', preuves: [] })
  })

  it('sans jeton, la session est déconnectée sans appel', async () => {
    const appels: string[] = []
    const api = creerClient({ baseUrl: 'http://essai/api', stockage: stockageMemoire(null), attendre: async () => {}, tentatives: 0, fetch: (async (u: string) => (appels.push(u), new Response('{}'))) as unknown as typeof fetch })
    expect((await sourceApi(api).session.session()).connecte).toBe(false)
    expect(appels).toEqual([])
  })
})
