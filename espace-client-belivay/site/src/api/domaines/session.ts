// Domaines « Session, menu et compte » et « Connexion et inscription » (CL-03, CL-13 ; DP-53).
//
// - Session : profil par la route de relaya (GET /api/auth/me/), compteurs (notifications de relaya, panier du kit,
//   commandes de relaya), interrupteurs du kit (GET /api/config/flags, CAP-13), relais habituel du compte du kit
//   (GET /api/me). Chaque compteur peut manquer sans empêcher la session de s'ouvrir.
// - Menu et compte : routes du kit (backend-kit/apps/client_accounts), réponses déjà au format du site.
// - Connexion : jetons simplejwt de relaya (login, refresh, logout) ; mot de passe oublié par le kit (apps/otp).
import type { EtatInterrupteurs } from '../../config/interrupteurs'
import type { DonneesCompte, DonneesMenu, DonneesPanier, Inscription, ResultatConnexion, ResultatInscription, Session } from '../../donnees/source'
import { masquerEmail, versClient, versCommande, type RCommande, type RDeuxFacteurs, type RJetons, type RNotification, type RPage, type RUtilisateur } from '../adaptateurs'
import type { ClientApi } from '../client'
import { ErreurApi, ErreurConflit, ErreurIntrouvable, ErreurNonAuthentifie, ErreurTropDeRequetes, ErreurValidation } from '../erreurs'

export const liste = <T>(r: T[] | RPage<T>): T[] => (Array.isArray(r) ? r : r.results)

// Compte retenu sur l'appareil (« Se souvenir de moi ») : prénom et e-mail, pour « Bon retour, Carine ».
const CLE_RETENU = 'blv_api_compte'
interface Retenu {
  prenom: string
  nomComplet: string
  email: string
}
export function lireRetenu(): Retenu | null {
  try {
    const v = localStorage.getItem(CLE_RETENU)
    return v ? (JSON.parse(v) as Retenu) : null
  } catch {
    return null
  }
}
export function ecrireRetenu(r: Retenu | null) {
  try {
    if (r) localStorage.setItem(CLE_RETENU, JSON.stringify(r))
    else localStorage.removeItem(CLE_RETENU)
  } catch {
    /* stockage refusé : rien n'est retenu */
  }
}

export function domaineSession(api: ClientApi, o: { interrupteurs: EtatInterrupteurs }) {
  const sansSession = (interrupteurs: EtatInterrupteurs): Session => ({
    connecte: false,
    client: null,
    relais: null,
    badges: { panier: 0, nonLus: 0, compte: 0 },
    interrupteurs,
    reperesPrototype: false,
    bandeau: { quartiersExploites: 0, seuilRetraitOffert: 0 },
  })

  // GET /api/config/flags (public) ; à défaut, ceux du lancement (interrupteurs.json).
  async function interrupteurs(): Promise<EtatInterrupteurs> {
    try {
      return { ...o.interrupteurs, ...(await api.get<Partial<EtatInterrupteurs>>('/config/flags', { anonyme: true })) }
    } catch {
      return o.interrupteurs
    }
  }

  async function session(): Promise<Session> {
    const flags = interrupteurs()
    if (!api.jetons.lire()) return sansSession(await flags)
    let moi: RUtilisateur
    try {
      moi = await api.get<RUtilisateur>('/auth/me/')
    } catch (e) {
      if (e instanceof ErreurNonAuthentifie) return sansSession(await flags)
      throw e
    }
    const [notifs, panier, commandes, compte] = await Promise.allSettled([
      api.get<RNotification[] | RPage<RNotification>>('/auth/notifications/'),
      api.get<DonneesPanier>('/cart'),
      api.get<RCommande[] | RPage<RCommande>>('/orders/my-orders/'),
      api.get<DonneesCompte>('/me'),
    ])
    const relais = compte.status === 'fulfilled' ? compte.value.relais : null
    return {
      ...sansSession(await flags),
      connecte: true,
      client: versClient(moi),
      // Le compte du kit donne les horaires de la semaine ; l'horaire du jour en mots viendra avec GET /api/relais.
      relais: relais ? { nom: relais.nom, gerant: relais.gerant, horaireDuJour: relais.horaires } : null,
      badges: {
        panier: panier.status === 'fulfilled' ? panier.value.lignes.reduce((s, l) => s + l.qte, 0) : 0,
        nonLus: notifs.status === 'fulfilled' ? liste(notifs.value).filter((n) => !n.is_read).length : 0,
        compte: commandes.status === 'fulfilled' ? liste(commandes.value).filter((c) => versCommande(c).etat === 'retirable').length : 0,
      },
    }
  }

  async function ouvrir(j: RJetons, seSouvenir: boolean): Promise<Session> {
    api.jetons.ecrire({ acces: j.access, rafraichissement: j.refresh }, seSouvenir)
    const s = await session()
    if (seSouvenir && s.client) ecrireRetenu({ prenom: s.client.prenom, nomComplet: s.client.nomComplet, email: s.client.email })
    return s
  }

  async function connecterEmail(email: string | null, motDePasse: string, seSouvenir: boolean): Promise<ResultatConnexion> {
    const identifiant = email ?? lireRetenu()?.email
    if (!identifiant) return { ok: false, raison: 'incorrect', essaisRestants: 0 }
    try {
      const r = await api.post<RJetons | RDeuxFacteurs>('/auth/login/', { username: identifiant, password: motDePasse }, { anonyme: true })
      if ('2fa_required' in r)
        throw new ErreurApi('interdit', 'Ce compte a la double authentification : le code envoyé par e-mail n’a pas encore d’écran sur le site.', { code: '2fa_required' })
      return { ok: true, session: await ouvrir(r, seSouvenir) }
    } catch (e) {
      // relaya ne renvoie pas le nombre d'essais restants : -1 = inconnu (aucun écran ne l'affiche aujourd'hui).
      if (e instanceof ErreurNonAuthentifie || (e instanceof ErreurValidation && e.statut === 400)) return { ok: false, raison: 'incorrect', essaisRestants: -1 }
      if (e instanceof ErreurTropDeRequetes) return { ok: false, raison: 'bloque', jusqua: Date.now() + (e.reessayerDans ?? 15 * 60) * 1000 }
      throw e
    }
  }

  async function inscrire(i: Inscription, seSouvenir: boolean): Promise<ResultatInscription> {
    if (!i.email) return { ok: false, raison: 'email' } // l'adresse du compte du téléphone : Google One Tap, à brancher
    try {
      await api.post('/auth/register/', { username: i.email, email: i.email, password: i.motDePasse, password2: i.motDePasse, first_name: i.prenom }, { anonyme: true })
    } catch (e) {
      if (e instanceof ErreurValidation) {
        const ch = e.champs
        if (ch.email?.some((m) => /utilis|existe|already/i.test(m)) || ch.username) return { ok: false, raison: 'existe' }
        if (ch.email) return { ok: false, raison: 'email' }
        if (ch.password || ch.password2) return { ok: false, raison: 'mdp' }
        if (ch.first_name) return { ok: false, raison: 'prenom' }
      }
      if (e instanceof ErreurConflit) return { ok: false, raison: 'existe' }
      throw e
    }
    const r = await connecterEmail(i.email, i.motDePasse, seSouvenir)
    if (!r.ok) throw new ErreurApi('inattendu', 'Le compte est créé, mais la connexion a échoué. Connecte-toi avec ton e-mail.')
    return { ok: true, session: r.session }
  }

  return {
    session,
    // Provisoire : en production chaque écran lit son titre dans ses propres données.
    entete: async (_route: string) => null,
    // GET /api/me/menu → DonneesMenu
    menu: async () => api.get<DonneesMenu>('/me/menu'),
    // GET /api/me → DonneesCompte (le scénario « nouveau » est propre à la démonstration)
    compte: async (_scenario?: 'nouveau') => api.get<DonneesCompte>('/me'),

    // ——— Connexion ———
    compteConnu: async () => {
      const r = lireRetenu()
      return r && { prenom: r.prenom, nomComplet: r.nomComplet, emailMasque: masquerEmail(r.email) }
    },
    compteRetenu: async () => {
      const r = lireRetenu()
      return r && api.jetons.lire()?.rafraichissement ? { emailMasque: masquerEmail(r.email) } : null
    },
    reprendreCompte: async () => {
      if (!(await api.jetons.rafraichir())) throw new ErreurNonAuthentifie('Ce compte n’est plus ouvert sur cet appareil. Connecte-toi.')
      return session()
    },
    connecterEmail,
    inscrire,
    deconnecter: async () => {
      const j = api.jetons.lire()
      try {
        // Au mieux : la session est fermée sur l'appareil quoi qu'il arrive (sans token_blacklist, relaya répond 500).
        if (j) await api.post('/auth/logout/', { refresh: j.rafraichissement }).catch(() => undefined)
      } finally {
        api.jetons.ecrire(null)
        ecrireRetenu(null)
      }
    },
    // POST /api/auth/password/forgot {email} → toujours 202 {destination, valideMinutes} (CAP-16) ;
    // email null : le compte retenu sur l'appareil.
    demanderLienMdp: async (email: string | null) => {
      const adresse = email ?? lireRetenu()?.email
      if (!adresse) throw new ErreurValidation('Entre l’adresse e-mail de ton compte.', { email: ['Adresse manquante.'] }, 400)
      return api.post<{ destination: string; valideMinutes: number }>('/auth/password/forgot', { email: adresse }, { anonyme: true })
    },
    // POST /api/auth/password/reset {jeton, mot_de_passe} → {ok, email masqué} ; 422 regle ; 410 expire ; 404 invalide.
    nouveauMotDePasse: async (jeton: string, motDePasse: string) => {
      try {
        return await api.post<{ ok: true; email: string }>('/auth/password/reset', { jeton, mot_de_passe: motDePasse }, { anonyme: true })
      } catch (e) {
        if (e instanceof ErreurIntrouvable) return { ok: false as const, raison: 'invalide' as const }
        if (e instanceof ErreurApi && e.statut === 410) return { ok: false as const, raison: 'expire' as const }
        if (e instanceof ErreurValidation && (e.code === 'regle' || e.champs.mot_de_passe)) return { ok: false as const, raison: 'regle' as const }
        throw e
      }
    },
  }
}
