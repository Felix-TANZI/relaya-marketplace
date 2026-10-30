// Domaine « Sécurité, confidentialité, suppression » (CL-13 ; CIN-46, CAP-17, CAP-21 ; politique de confidentialité).
// - Sécurité : tout par le kit (GET /api/me/security, sessions /api/me/sessions…, backend-kit/apps/client_accounts) ;
//   mot de passe par relaya ; méthodes liées, alerte, confidentialité et suppression par le kit, au format du site.
import type { DonneesConfidentialite, DonneesSecurite, DonneesSuppression, MethodeConnexion, ResultatCode, ResultatSecurite } from '../../donnees/source'
import type { ClientApi } from '../client'
import { jetonDuFournisseur } from '../identite'
import { ErreurValidation, NonDisponible } from '../erreurs'
import { ecrireRetenu } from './session'
import { ou, seg } from './refus'

export function domaineSecurite(api: ClientApi) {
  return {
    // GET /api/me/security (kit) → DonneesSecurite complète : numéro vérifié et sa date, méthodes liées, appareils
    // (sessions du kit, l'actuelle marquée), historique des connexions, seuil CODE-BIO, alerte de connexion.
    securite: async () => api.get<DonneesSecurite>('/me/security'),
    // POST /api/auth/change-password/ (relaya) ; premier mot de passe d'un compte Google ou Apple : route à créer.
    changerMotDePasse: async (ancien: string | null, nouveau: string): Promise<ResultatSecurite> => {
      if (ancien === null) throw new NonDisponible('changerMotDePasse (premier mot de passe)', 'POST /api/auth/password/set')
      try {
        await api.post('/auth/change-password/', { old_password: ancien, new_password: nouveau, new_password2: nouveau })
        return { ok: true }
      } catch (e) {
        if (e instanceof ErreurValidation) return { ok: false, raison: e.champs.old_password ? 'ancien' : 'regle' }
        throw e
      }
    },
    // DELETE /api/me/sessions/{id} → 204 (ses jetons : 401 session_fermee) ; 404 : déjà fermée ou d'un autre
    deconnecterAppareil: async (id: string) => {
      await api.supprimer(`/me/sessions/${seg(id)}`)
    },
    // POST /api/me/sessions/close-others → {fermees} ; alerte de sécurité si au moins une
    deconnecterAutres: async () => {
      await api.post('/me/sessions/close-others')
    },
    // POST /api/me/identities {provider, jeton} → {ok: true} ; 409 pris (lié à un autre compte BelivaY). Jeton du
    // fournisseur : src/api/identite.ts ; fournisseur pas encore configuré ou fenêtre fermée : NonDisponible.
    lierMethode: async (m: 'google' | 'apple') => {
      const jeton = await jetonDuFournisseur(m)
      if (!jeton) throw new NonDisponible('lierMethode', m === 'google' ? 'Google Identity Services (VITE_GOOGLE_CLIENT_ID)' : 'Sign in with Apple (VITE_APPLE_CLIENT_ID)')
      return ou(api.post<{ ok: true }>('/me/identities', { provider: m, jeton }), ['pris'] as const)
    },
    // DELETE /api/me/identities/{provider} → {ok: true} ; 409 derniere (dernière façon de se connecter)
    delierMethode: async (m: MethodeConnexion) => ou(api.supprimer<{ ok: true }>(`/me/identities/${seg(m)}`), ['derniere'] as const),
    // PATCH /api/me/security {alerte_connexion} → 204
    reglerAlerteConnexion: async (actif: boolean) => {
      await api.patch('/me/security', { alerte_connexion: actif })
    },

    // ——— Confidentialité ———
    confidentialite: async () => api.get<DonneesConfidentialite>('/me/privacy'),
    // PATCH /api/me/privacy {personnalisation?, nom_retrait?} → 204
    reglerConfidentialite: async (c: Partial<Pick<DonneesConfidentialite, 'personnalisation' | 'nomRetrait'>>) => {
      await api.patch('/me/privacy', {
        ...(c.personnalisation !== undefined ? { personnalisation: c.personnalisation } : {}),
        ...(c.nomRetrait !== undefined ? { nom_retrait: c.nomRetrait } : {}),
      })
    },
    // DELETE /api/me/search-history · DELETE /api/me/viewed
    effacerHistorique: async (quoi: 'recherches' | 'vus' | 'tout') => {
      if (quoi !== 'vus') await api.supprimer('/me/search-history')
      if (quoi !== 'recherches') await api.supprimer('/me/viewed')
    },

    // ——— Suppression du compte ———
    suppression: async () => api.get<DonneesSuppression>('/me/deletion'),
    // DELETE /api/me {code} → 202 ResultatCode ; 409 compte_en_cours. Compte supprimé : l'appareil l'oublie.
    supprimerCompte: async (code: string) => {
      const r = await api.supprimer<ResultatCode>('/me', { corps: { code } })
      if (r.ok) {
        api.jetons.ecrire(null)
        ecrireRetenu(null)
      }
      return r
    },
  }
}
