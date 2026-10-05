// Domaine « Sécurité, confidentialité, suppression » (CL-13 ; CIN-46, CAP-17, CAP-21 ; politique de confidentialité).
// - Sécurité : profil et sessions par les routes de relaya (/api/auth/me/, /api/auth/sessions/), numéro vérifié par
//   le compte du kit (GET /api/me) ; mot de passe par relaya ; méthodes liées, alerte, confidentialité et suppression
//   par le kit (backend-kit/apps/client_accounts), réponses au format du site.
import type { DonneesCompte, DonneesConfidentialite, DonneesSuppression, MethodeConnexion, ResultatCode, ResultatSecurite } from '../../donnees/source'
import { versAppareil, versClient, type RSessionAppareil, type RUtilisateur } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurValidation, NonDisponible } from '../erreurs'
import { ecrireRetenu } from './session'
import { ou, seg } from './refus'

export function domaineSecurite(api: ClientApi) {
  return {
    securite: async () => {
      const [moi, sessions, compte] = await Promise.all([
        api.get<RUtilisateur>('/auth/me/'),
        api.get<RSessionAppareil[]>('/auth/sessions/'),
        api.get<DonneesCompte>('/me').catch(() => null),
      ])
      const client = versClient(moi)
      return {
        numero: { masque: client.numeroMasque, operateur: client.operateur, verifie: compte?.numeroVerifie ?? false, verifieLe: null },
        email: client.emailMasque,
        methodes: { google: null, apple: null, motDePasse: moi.has_usable_password !== false },
        methodeActuelle: client.connexion,
        appareils: sessions.map(versAppareil),
        historique: [],
        biometrie: false,
        seuilBiometrie: 0,
        alerteConnexion: false,
      }
    },
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
    deconnecterAppareil: async (id: string) => {
      await api.supprimer(`/auth/sessions/${seg(id)}/revoke/`)
    },
    deconnecterAutres: async () => {
      await api.post('/auth/sessions/revoke-all/')
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
