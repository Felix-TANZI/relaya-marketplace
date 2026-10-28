// Domaine « session » branché sur le kit : la session de l'agent (GET /console/vues/session) et sa connexion en deux
// étapes (backend-kit/apps/console/connexion_agent.py) : identifiant nominatif et mot de passe (POST /console/auth/login,
// public, limité en débit), puis second facteur (POST /console/auth/code : code de l'application d'authentification, ou
// code de secours reçu par SMS, POST /console/auth/code/sms) ; la session s'ouvre pour cet appareil (jetons gardés par
// le client HTTP). « Agir en tant que » change le rôle affiché parmi ceux que l'agent tient (journalisé au kit). Les
// connexions de démonstration (changerRole, changerAgent…) n'existent pas ici (NonDisponible).
import type { ClientApi } from '@client/api/client'
import { ErreurApi } from '@client/api/erreurs'
import { ROLES } from '../../donnees/communs'
import type { DomaineSession, ResultatActivation, ResultatCode, ResultatIdentifiants, ResultatInvitation, SessionAdmin } from '../../donnees/domaines/session'
import { appareilConsole, etapeConnexion } from '../client-console'
import { appels, seg } from '../outils'
import { refuse } from '../refus'

const DECONNECTEE: Omit<SessionAdmin, 'maintenant'> = {
  connecte: false,
  agent: null,
  role: ROLES[0],
  pays: { code: '', nom: '', devise: '', ville: '', zonesExploitees: [], zonesTotal: 0 },
  badges: { file: 0, litige: 0, support: 0, remboursements: 0, kyc: 0, paliers: 0, fraude: 0, moderation: 0, paquets: 0, quatreyeux: 0, sanctions: 0, messagerie: 0, panne: 0, parametrage: 0, versements: 0, candidatures: 0, equipe: 0 },
  interrupteurs: {},
  astreinte: false,
  expire: null,
}

const PUBLIC = { anonyme: true } as const

type Etape1 = ResultatIdentifiants & { etape?: string }

/** Étape 1 réussie (mot de passe, ou lien par e-mail) : le jeton d'étape est gardé pour le second facteur. */
export function garderEtape(r: Etape1): ResultatIdentifiants {
  if (r.ok) {
    etapeConnexion.ecrire(r.etape ?? null)
    const { etape: _etape, ...reste } = r
    return reste
  }
  etapeConnexion.ecrire(null)
  return r
}

export function domaineSession(api: ClientApi): DomaineSession {
  const a = appels(api, 'session')

  return {
    async session() {
      const deconnectee = { ...DECONNECTEE, maintenant: Date.now() }
      if (!api.jetons.lire()) return deconnectee
      try {
        return await a.get<SessionAdmin>('/vues/session', { query: { appareil: appareilConsole() } })
      } catch (x) {
        if (x instanceof ErreurApi && (x.statut === 401 || x.statut === 404)) return deconnectee
        throw x
      }
    },
    blocage: () => a.get<{ jusqua: number | null; echecs: number }>('/auth/blocage', { ...PUBLIC, query: { appareil: appareilConsole() } }),
    async connecter(identifiant, motDePasse) {
      return garderEtape(await a.post<Etape1>('/auth/login', { identifiant, motDePasse, appareil: appareilConsole() }, PUBLIC))
    },
    async verifierCode(code) {
      const r = await a.post<ResultatCode & { jetons?: { access: string; refresh: string } }>('/auth/code', { etape: etapeConnexion.lire() ?? '', code, appareil: appareilConsole() }, PUBLIC)
      if (r.ok) {
        etapeConnexion.ecrire(null)
        if (r.jetons) api.jetons.ecrire({ acces: r.jetons.access, rafraichissement: r.jetons.refresh })
        return { ok: true, nouvelAppareil: r.nouvelAppareil }
      }
      if (r.raison !== 'faux') etapeConnexion.ecrire(null)
      return r
    },
    envoyerCodeSms: () => a.post<{ ok: true; telephone: string } | { ok: false; raison: 'sans_etape_1' | 'application_obligatoire' }>('/auth/code/sms', { etape: etapeConnexion.lire() ?? '' }, PUBLIC),
    async deconnecter() {
      const j = api.jetons.lire()
      etapeConnexion.ecrire(null)
      if (j?.acces) await a.post('/auth/deconnexion', { refresh: j.rafraichissement ?? null }).catch(() => undefined)
      api.jetons.ecrire(null)
    },
    agirEnTantQue: (role) => a.post<{ ok: true } | { ok: false; raison: 'role_non_tenu' }>('/vues/session/role', { role }),
    changerRole: refuse('session.changerRole'),
    agentsDemo: refuse('session.agentsDemo'),
    changerAgent: refuse('session.changerAgent'),
    comptesDemo: refuse('session.comptesDemo'),
    // Activation d'un employé invité : routes publiques du kit (le jeton du lien suffit, limitées en débit).
    invitation: (jeton) => a.get<ResultatInvitation>(`/activation/${seg(jeton)}`, PUBLIC),
    activer: (jeton, x) => a.post<ResultatActivation>(`/activation/${seg(jeton)}`, x, PUBLIC),
  }
}
