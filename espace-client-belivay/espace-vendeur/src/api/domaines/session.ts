// Domaine « session » branché sur le kit (backend-kit/apps/vendeur_session) : session et badges, connexion
// (identifiant, e-mail ou numéro et mot de passe ; second facteur d'un appareil inconnu ; numéro et code ; mot de
// passe oublié), ouverture en trois étapes, arrivée depuis l'espace client, Face ID, saisie assistée.
// - Jetons : ceux de relaya (simplejwt), les mêmes que l'espace client ; une connexion réussie les rend
//   (`jetons: {access, refresh}`) et ils sont écrits ici (« Se souvenir de moi » : sur l'appareil, sinon l'onglet).
// - Appareil : un identifiant tiré une fois et gardé dans localStorage « blv_v_appareil », envoyé dans le corps (ou
//   l'adresse) : le second facteur, le code par numéro et l'ouverture avant le code sont liés à l'appareil côté serveur.
// - Google, Apple : SDK à brancher côté site (front) ; changerMembre et la réponse du prestataire : démonstration.
import type { ClientApi } from '@client/api/client'
import { NonDisponible } from '@client/api/erreurs'
import type {
  ArriveeClient,
  Biometrie,
  DefiConnexion,
  DomaineSession,
  DossierOuverture,
  EnvoiCode,
  ResultatCode,
  ResultatConnexion,
  SaisieAssistee,
  SessionVendeur,
  Zone,
} from '../../donnees/domaines/session'
import type { SourceVendeur } from '../../donnees/source'
import { appels, ouNull, seg } from '../outils'

const CLE_APPAREIL = 'blv_v_appareil'
let appareilMemoire: string | null = null

function tirer(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    /* rien */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Identifiant de cet appareil (tiré une fois, gardé sur l'appareil ; en mémoire si le stockage est refusé). */
export function appareil(): string {
  try {
    let id = localStorage.getItem(CLE_APPAREIL)
    if (!id) {
      id = appareilMemoire ?? tirer()
      localStorage.setItem(CLE_APPAREIL, id)
    }
    return id
  } catch {
    appareilMemoire ??= tirer()
    return appareilMemoire
  }
}

interface AvecJetons {
  jetons?: { access: string; refresh: string }
  seSouvenir?: boolean
}

export function domaineSession(api: ClientApi): SourceVendeur['session'] {
  const a = appels(api, 'session')
  const anonyme = { anonyme: true } as const

  /** Écrit les jetons rendus par le serveur et retire ce qui n'est pas du contrat de l'écran. */
  function garder<T extends object>(r: T & AvecJetons, persistant?: boolean): T {
    const { jetons, seSouvenir, ...reste } = r
    if (jetons) api.jetons.ecrire({ acces: jetons.access, rafraichissement: jetons.refresh }, persistant ?? seSouvenir ?? true)
    return reste as T
  }

  const session = () => a.get<SessionVendeur>('/session', api.jetons.lire() ? undefined : anonyme)

  const d: DomaineSession = {
    session,

    // ── Connexion ──
    async connecter(identifiant, motDePasse, o) {
      const seSouvenir = o?.seSouvenir ?? true
      const r = await a.post<ResultatConnexion & AvecJetons>('/auth/login', { identifiant, motDePasse, seSouvenir, appareil: appareil() }, anonyme)
      return garder(r, seSouvenir)
    },
    connecterAvec: (fournisseur) => Promise.reject(new NonDisponible(`session.connecterAvec`, `SDK ${fournisseur === 'google' ? 'Google' : 'Apple'} à brancher côté site`)),
    async validerDeuxiemeFacteur(code) {
      const r = await a.post<ResultatCode & AvecJetons & { session?: SessionVendeur }>('/auth/2fa', { code, appareil: appareil() }, anonyme)
      const { session: _s, ...reste } = garder(r)
      void _s
      return reste as ResultatCode
    },
    defiEnCours: () => ouNull(a.get<DefiConnexion>('/auth/2fa', { ...anonyme, query: { appareil: appareil() } })),
    renvoyerDeuxiemeFacteur: () => a.post('/auth/2fa/resend', { appareil: appareil() }, anonyme),
    demanderCodeNumero: (telephone, canal, o) => a.post('/auth/otp', { telephone, canal, seSouvenir: o?.seSouvenir ?? true, appareil: appareil() }, anonyme),
    envoiNumero: () => ouNull(a.get<EnvoiCode>('/auth/otp', { ...anonyme, query: { appareil: appareil() } })),
    async validerCodeNumero(code) {
      const r = await a.post<ResultatCode & AvecJetons & { session?: SessionVendeur }>('/auth/verify', { code, appareil: appareil() }, anonyme)
      const { session: _s, ...reste } = garder(r)
      void _s
      return reste as ResultatCode
    },
    renvoyerCodeNumero: (canal) => a.post('/auth/otp/resend', { canal, appareil: appareil() }, anonyme),
    demanderLienMotDePasse: (identifiant) => a.post('/auth/password-reset', { identifiant }, anonyme),
    ouvrirLienMotDePasse: (jeton) => a.post('/auth/password-reset/open', { jeton }, anonyme),
    choisirMotDePasse: (jeton, code, motDePasse) => a.post('/auth/password-reset/confirm', { jeton, code, motDePasse }, anonyme),
    async deconnecter() {
      const j = api.jetons.lire()
      try {
        // Au mieux : la session se ferme sur l'appareil quoi qu'il arrive.
        if (j?.rafraichissement) await a.post('/auth/logout', { refresh: j.rafraichissement }, anonyme).catch(() => undefined)
      } finally {
        api.jetons.ecrire(null)
      }
      return session()
    },
    changerMembre: () => Promise.reject(new NonDisponible('session.changerMembre', 'démonstration seulement')),
    // DELETE /devices/current (et non POST /auth/devices/forget, qui n'existe pas côté serveur) : réutilise
    // le système de sessions générique de relaya (apps.accounts.UserSession, branché le 11→12 oct.) plutôt
    // qu'un deuxième mécanisme d'« appareil » (INTEGRATION-API.md §1, domaine session).
    oublierAppareil: async () => {
      await a.supprimer('/devices/current')
    },

    // ── Ouverture ──
    categories: () => a.get<string[]>('/categories', anonyme),
    zoneDuPoint: (p) => ouNull(a.get<Zone>('/zone', { ...anonyme, query: { lat: p.lat, lon: p.lon } })),
    ouverture: () => ouNull(a.get<DossierOuverture>('/shops/current', { query: { appareil: appareil() } })),
    demarrerOuverture: (champs) => a.post('/shops', { ...champs, appareil: appareil() }, { idempotence: true }),
    envoiOuverture: () => ouNull(a.get<EnvoiCode>('/shops/current/code', { query: { appareil: appareil() } })),
    async validerCodeOuverture(code) {
      // Code bon : le compte vendeur existe, ses jetons sont gardés sur l'appareil.
      return garder(await a.post<ResultatCode & AvecJetons>('/shops/current/verify', { code, appareil: appareil() }), true)
    },
    renvoyerCodeOuverture: () => a.post('/shops/current/resend', { appareil: appareil() }),
    envoyerPiece: (piece, image) => a.post(`/shops/${seg('current')}/kyc`, { piece, image }),
    demanderCodeVersement: (telephone) => a.post('/shops/current/payout-number', { telephone }),
    validerCodeVersement: (code) => a.post('/shops/current/payout-number/verify', { code }),
    envoyerPourVerification: () => a.post('/shops/current/submit', {}, { idempotence: true }),
    reponseVerificationDemo: () => Promise.reject(new NonDisponible('session.reponseVerificationDemo', 'démonstration seulement (prestataire de vérification)')),
    signerContrat: (o) => a.post('/contract/sign', o, { idempotence: true }),
    arriveeClient: async () => (api.jetons.lire() ? ouNull(a.get<ArriveeClient>('/shops/from-client')) : null),
    confirmerArriveeClient: (point) => a.post('/shops/from-client', { point, appareil: appareil() }, { idempotence: true }),

    // ── Face ID ou empreinte ──
    biometrie: () => a.get<Biometrie>('/me/biometrics'),
    reglerBiometrie: (active) => a.put<Biometrie>('/me/biometrics', { active }),

    // ── Saisie assistée ──
    saisieAssistee: () => a.get<SaisieAssistee>('/assisted-entry'),
    validerFiches: (ids) => a.post<SaisieAssistee>('/assisted-entry/approve', { ids }, { idempotence: true }),
    modifierFiche: (id, champs) => a.put(`/assisted-entry/${seg(id)}`, champs),
  }
  return d
}
