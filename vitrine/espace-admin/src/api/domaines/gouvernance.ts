// Domaine « gouvernance » branché sur le kit : journal signé (sa part, chaîne vérifiée, consultation journalisée),
// agents et comptes (décision « agent », toujours à quatre yeux), fraude (décision « fraude-decision », gel
// conservatoire « fraude-gel » à quatre yeux et « fraude-gel-lever »), exports du journal à quatre yeux
// (« journal-export »), demandes de données personnelles, comptes des employés (suspension, invitation renvoyée),
// espaces pays (« pays-ouvrir »), saisie assistée des agents terrain (« terrain-controle ») :
// backend-kit/apps/console/gouvernance_serveur.py, vues_gouvernance.py.
import type { ClientApi } from '@client/api/client'
import type { Agent } from '../../donnees/domaines/session'
import type {
  DemandeDonnees,
  DomaineGouvernance,
  EspacePaysDetail,
  ExportJournal,
  LigneJournal,
  TableauComptes,
  TableauFraude,
  TableauJournal,
  TableauTerrain,
} from '../../donnees/domaines/gouvernance'
import { appels, decision, resultat, seg, type Appels } from '../outils'

/** Fichier rendu par le kit (export signé, réponse à une demande de données). */
type Fichier = { entetes: string[]; lignes: string[][]; nom: string }

/** Identifiant de compte d'un acteur saisi à l'écran (« Client ••• 0012 », « user:12 », « 12 ») : ses chiffres. */
export const compteActeur = (acteur: string) => /user:(\d+)/.exec(acteur)?.[1] ?? /(\d+)\s*$/.exec(acteur.trim())?.[1] ?? acteur.trim()

type AgentKit = Agent & { user: string; actif: boolean }

const raisonFraude = (c: string) => (c === 'motif_court' ? ('motif_court' as const) : c === 'state_changed' ? ('deja_tranchee' as const) : ('pas_de_revue' as const))

async function agentKit(a: Appels, id: string): Promise<AgentKit | undefined> {
  return (await a.get<AgentKit[]>('/vues/agents')).find((x) => x.id === id)
}

export function domaineGouvernance(api: ClientApi): DomaineGouvernance {
  const a = appels(api, 'gouvernance')

  async function agent(id: string, m: Partial<Pick<AgentKit, 'roles' | 'zones' | 'actif'>>, motif: string) {
    const x = await agentKit(a, id)
    if (!x) return { ok: false as const, raison: 'inconnu' as const }
    return decision(
      a,
      'agent',
      { user: Number(x.user), roles: m.roles ?? x.roles, zones: (m.zones === undefined ? x.zones : m.zones) ?? [], actif: m.actif ?? x.actif },
      motif,
      [],
      (c) => (c === 'motif_court' ? ('motif_court' as const) : c === 'dernier_superviseur' ? ('direction_min' as const) : ('inconnu' as const)),
    )
  }

  const fraude = (id: string, choix: 'en_revue' | 'confirmee' | 'ecartee', motif: string) => decision(a, 'fraude-decision', { alerte: Number(id), decision: choix }, motif, [], raisonFraude)

  return {
    journal: (f) => a.get<LigneJournal[]>('/vues/journal', { query: { action: f?.action, objet: f?.objet, limite: f?.limite } }),
    verifierChaine: async () => {
      const v = await a.get<{ ok: boolean; lignes: number; rompue_a: number | null }>('/journal/verification')
      return { ok: v.ok, casseeA: v.rompue_a, lignes: v.lignes }
    },
    ecrire: (e) => a.post<LigneJournal>('/vues/journal/ecrire', e),
    agents: () => a.get<Agent[]>('/vues/agents'),
    tableauJournal: (f) => a.get<TableauJournal>('/vues/journal/tableau', { query: { q: f.q, agentId: f.agentId, role: f.role, action: f.action, periode: f.periode } }),
    consulterJournal: async () => {
      await a.post('/vues/journal/consulter')
    },
    async reconstituer(objet, jusqua) {
      const lignes = (await a.get<LigneJournal[]>('/vues/journal', { query: { objet, limite: 1000 } })).filter((l) => l.le <= jusqua).sort((x, y) => x.n - y.n)
      return { objet, jusqua, lignes, etat: [...lignes].reverse().find((l) => l.apres)?.apres ?? null }
    },
    // La demande d'export est la décision « journal-export » elle-même (portée dans ses données, geste
    // « journal.exporter » de quatreyeux.ts) : lier relit la décision pour s'assurer qu'elle existe.
    async lierExport(qy) {
      await a.get(`/decisions/${seg(qy)}`)
    },
    exportsJournal: () => a.get<ExportJournal[]>('/vues/journal/exports', { query: { tout: 1 } }),
    telechargerExport: (id) => resultat(a.get<Fichier>(`/vues/journal/exports/${seg(id)}`), (c) => (c === 'pas_valide' ? ('pas_valide' as const) : ('inconnu' as const))),
    demandesDonnees: () => a.get<DemandeDonnees[]>('/vues/demandes-donnees', { query: { tout: 1 } }),
    enregistrerDemande: (d) =>
      resultat(
        a.post<{ ok: true; id: string }>('/vues/demandes-donnees', { acteur: compteActeur(d.acteur), espace: d.espace, type: d.type, motif: d.motif }, { idempotence: true }).then((x) => ({ id: x.id })),
        () => 'motif_court' as const,
      ),
    repondreDemande: (id, motif) =>
      resultat(a.post<Fichier>(`/vues/demandes-donnees/${seg(id)}/reponse`, { motif }, { idempotence: true }), (c) =>
        c === 'deja_repondue' ? ('deja_repondue' as const) : c === 'motif_court' ? ('motif_court' as const) : ('inconnu' as const),
      ),
    fraude: () => a.get<TableauFraude>('/vues/fraude'),
    alerte: async (id) => (await a.get<TableauFraude>('/vues/fraude')).alertes.find((x) => x.id === id) ?? null,
    async ouvrirRevue(id) {
      const r = await fraude(id, 'en_revue', 'Revue ouverte')
      return r.ok ? { ok: true } : r
    },
    async classerAlerte(id, motif) {
      const r = await fraude(id, 'ecartee', motif)
      return r.ok ? { ok: true } : r
    },
    async proposerSanction(id, motif) {
      const r = await fraude(id, 'confirmee', motif)
      return r.ok ? { ok: true } : r
    },
    // La demande de gel est la décision « fraude-gel » (geste « fraude.geler » de quatreyeux.ts) : lier la relit.
    async lierGel(_id, qy) {
      await a.get(`/decisions/${seg(qy)}`)
    },
    async leverGel(id, motif) {
      const r = await decision(a, 'fraude-gel-lever', { alerte: Number(id) }, motif, [], (c) => (c === 'motif_court' ? ('motif_court' as const) : ('pas_de_gel' as const)))
      return r.ok ? { ok: true } : r
    },
    demasquerIdentifiant: (id, motif) => a.post<{ ok: true; valeur: string } | { ok: false; raison: 'motif_court' }>(`/vues/fraude/${seg(id)}/identifiant`, { motif }),
    comptes: () => a.get<TableauComptes>('/vues/comptes'),
    // Comptes des employés (kit : POST /api/console/comptes ; refus en code d'erreur = raison).
    creerCompte: (c) =>
      resultat(a.post<{ ok: true; id: string }>('/comptes', { prenom: c.prenom, nom: c.nom, email: c.email, roles: [c.role], zones: c.zones ?? undefined }).then((x) => ({ id: x.id })), (code) =>
        code === 'direction_quatre_yeux' || code === 'email_pris' ? code : 'incomplet',
      ),
    // Création d'un compte Direction : décision « agent-inviter » à quatre yeux (le kit crée l'invitation à la
    // contre-signature) ; lier relit la décision.
    async lierCreationDirection(qy) {
      await a.get(`/decisions/${seg(qy)}`)
    },
    async modifierCompte(id, m, motif) {
      const r = await agent(id, { roles: m.roles, zones: m.zones }, motif)
      return r.ok ? { ok: true } : r
    },
    async fermerAcces(id, motif) {
      const r = await agent(id, { actif: false }, motif)
      return r.ok ? { ok: true, reattribues: 0 } : r
    },
    confirmerCompte: (id) => resultat(a.post<object>(`/comptes/${seg(id)}/confirmer`, {}), (code) => (code === 'ferme' ? 'ferme' : 'inconnu')),
    suspendreCompte: (id, motif) =>
      resultat(a.post<{ ok: true }>(`/vues/comptes/${seg(id)}/suspendre`, { motif }, { idempotence: true }).then(() => ({})), (c) =>
        c === 'motif_court' || c === 'soi_meme' || c === 'direction_quatre_yeux' || c === 'direction_min' || c === 'etat' ? c : ('inconnu' as const),
      ),
    renvoyerInvitation: (id) =>
      resultat(a.post<{ ok: true }>(`/vues/comptes/${seg(id)}/inviter`, {}, { idempotence: true }).then(() => ({})), (c) => (c === 'etat' ? ('etat' as const) : ('inconnu' as const))),
    async reactiverCompte(id, motif) {
      const r = await agent(id, { actif: true }, motif)
      return r.ok ? { ok: true } : { ok: false, raison: r.raison === 'motif_court' ? 'motif_court' : 'inconnu', detail: r.detail }
    },
    pays: () => a.get<EspacePaysDetail[]>('/vues/pays'),
    copierPays: (code, nom, motif) =>
      resultat(a.post<{ ok: true }>('/vues/pays', { code, nom, motif }, { idempotence: true }).then(() => ({})), (c) =>
        c === 'motif_court' || c === 'existe' ? c : ('inconnu' as const),
      ),
    revoirParametre: (pays, code, valeur) =>
      resultat(a.post<{ ok: true }>(`/vues/pays/${seg(pays)}/parametres`, { code, valeur }, { idempotence: true }).then(() => ({})), (c) =>
        c === 'vide' || c === 'condition' ? c : ('inconnu' as const),
      ),
    async ouvrirPays(code, motif) {
      const r = await decision(a, 'pays-ouvrir', { pays: code }, motif, [], (c) => (c === 'conditions' || c === 'motif_court' ? c : ('inconnu' as const)))
      return r.ok ? { ok: true } : r
    },
    terrain: () => a.get<TableauTerrain>('/vues/terrain', { query: { tout: 1 } }),
    nouvelleFiche: (f) =>
      resultat(a.post<{ ok: true; id: string }>('/vues/terrain', f, { idempotence: true }).then((x) => ({ id: x.id })), (c) => (c === 'hors_zone' ? ('hors_zone' as const) : ('incomplet' as const))),
    envoyerLien: (id) => resultat(a.post<{ ok: true }>(`/vues/terrain/${seg(id)}/lien`, {}, { idempotence: true }).then(() => ({})), (c) => (c === 'etat' ? ('etat' as const) : ('inconnu' as const))),
    relancer: (id) => resultat(a.post<{ ok: true }>(`/vues/terrain/${seg(id)}/relancer`, {}, { idempotence: true }).then(() => ({})), (c) => (c === 'etat' ? ('etat' as const) : ('inconnu' as const))),
    async controlerFiche(id, conforme, motif) {
      const r = await decision(a, 'terrain-controle', { fiche: id, conforme }, motif, [], (c) => (c === 'motif_court' ? ('motif_court' as const) : c === 'inconnu' ? ('inconnu' as const) : ('etat' as const)))
      return r.ok ? { ok: true } : r
    },
  }
}
