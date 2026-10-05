// Variables d'environnement du site, lues une seule fois au démarrage, typées et validées.
//
// Vite n'expose au navigateur que les variables préfixées VITE_ (fichiers .env, .env.local, .env.production…
// ou variables du tableau de bord Vercel). Tout ce qui est ici finit dans le code envoyé au navigateur :
// jamais de secret (clé privée, jeton d'API serveur) dans une variable VITE_. La liste complète, commentée,
// est dans .env.example ; les services externes et qui les fournit sont dans CONNECTEURS.md.
//
// Une valeur invalide arrête le démarrage avec un message clair (mieux qu'un site qui tourne à moitié branché).

export type ModeSource = 'demo' | 'api'

export interface Env {
  /** VITE_SOURCE : d'où viennent les données. « demo » (défaut) : src/demo, en localStorage ; « api » : le serveur. */
  source: ModeSource
  /**
   * VITE_API_URL : adresse de l'API, préfixe /api compris, sans barre finale. Ex. « https://belivay.com/api »,
   * ou « /api » derrière un mandataire (même origine). Obligatoire quand source = « api ».
   */
  apiUrl: string | null
  /** VITE_API_DELAI_MS : délai d'expiration d'une requête, en millisecondes (défaut 15 000). */
  apiDelaiMs: number
  /** VITE_API_TENTATIVES : nouvelles tentatives d'une lecture (GET) après une panne réseau ou un 502/503/504 (défaut 2). */
  apiTentatives: number
  /** VITE_DEMO : « 1 » affiche le bandeau « démonstration » (déploiement public de la démo). */
  demo: boolean
  /** Build de production (vite build) : pas de journal des requêtes, HTTPS exigé pour l'API. */
  production: boolean
}

type Brut = Record<string, string | boolean | undefined>

export class ErreurConfiguration extends Error {
  constructor(message: string) {
    super(`[BelivaY · configuration] ${message} Voir site/.env.example.`)
    this.name = 'ErreurConfiguration'
  }
}

const texte = (v: string | boolean | undefined): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? undefined : t
}

const booleen = (v: string | boolean | undefined): boolean => v === true || v === '1' || v === 'true'

function entier(nom: string, v: string | boolean | undefined, defaut: number, min: number, max: number): number {
  const t = texte(v)
  if (t === undefined) return defaut
  const n = Number(t)
  if (!Number.isInteger(n) || n < min || n > max) throw new ErreurConfiguration(`${nom}=« ${t} » : un entier entre ${min} et ${max} est attendu.`)
  return n
}

/** Lit et valide un objet de variables (import.meta.env, ou un objet de test). Pure : ne lit rien d'autre. */
export function lireEnv(brut: Brut): Env {
  const production = brut.PROD === true || brut.MODE === 'production'

  const s = texte(brut.VITE_SOURCE) ?? 'demo'
  if (s !== 'demo' && s !== 'api') throw new ErreurConfiguration(`VITE_SOURCE=« ${s} » : valeurs permises « demo » ou « api ».`)
  const source: ModeSource = s

  let apiUrl = texte(brut.VITE_API_URL) ?? null
  if (apiUrl !== null) {
    apiUrl = apiUrl.replace(/\/+$/, '')
    const relative = apiUrl.startsWith('/')
    if (!relative) {
      let u: URL
      try {
        u = new URL(apiUrl)
      } catch {
        throw new ErreurConfiguration(`VITE_API_URL=« ${apiUrl} » n'est pas une adresse valide (ex. https://belivay.com/api ou /api).`)
      }
      const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname) || u.hostname.endsWith('.localhost')
      if (u.protocol !== 'https:' && !(u.protocol === 'http:' && (local || !production)))
        throw new ErreurConfiguration(`VITE_API_URL=« ${apiUrl} » : HTTPS est obligatoire en production (CAP-01).`)
    }
  }
  if (source === 'api' && apiUrl === null)
    throw new ErreurConfiguration('VITE_SOURCE=api demande VITE_API_URL (ex. VITE_API_URL=https://belivay.com/api).')

  return {
    source,
    apiUrl,
    apiDelaiMs: entier('VITE_API_DELAI_MS', brut.VITE_API_DELAI_MS, 15_000, 1_000, 120_000),
    apiTentatives: entier('VITE_API_TENTATIVES', brut.VITE_API_TENTATIVES, 2, 0, 5),
    demo: booleen(brut.VITE_DEMO),
    production,
  }
}

/** Configuration du site, lue au chargement du premier module qui l'importe. */
// (import.meta.env n'existe pas hors de Vite, par exemple dans un test lancé par Node : on lit alors un objet vide.)
export const env: Env = lireEnv((import.meta.env ?? {}) as unknown as Brut)

// ——— Connecteurs : cartes, notifications push, suivi d'erreurs et mesure d'audience (src/connecteurs/) ———
// Ajoutés sans rien changer à ce qui précède. Une clé absente n'arrête rien : le connecteur se replie
// (OpenStreetMap, notification locale, journal de la console en développement).

export interface EnvConnecteurs {
  cartes: {
    /** VITE_MAPS : « osm » (défaut) ou « google ». Google sans VITE_GOOGLE_MAPS_KEY : OpenStreetMap. */
    fournisseur: 'osm' | 'google'
    /** VITE_GOOGLE_MAPS_KEY : clé publique Maps JavaScript + Places (nouveau) + Geocoding, limitée aux domaines du site. */
    cleGoogle: string | null
    /** VITE_GOOGLE_MAPS_MAP_ID : identifiant de carte (marqueurs avancés, style) ; facultatif. */
    mapIdGoogle: string | undefined
  }
  push: {
    /** VITE_VAPID_PUBLIC_KEY : clé publique VAPID (base64url, 87 caractères) ; sans elle, notification locale seulement. */
    clePublique: string | null
  }
  carte: {
    /**
     * VITE_CARTE_FOURNISSEUR : qui tokenise la carte dans le navigateur (src/connecteurs/paiementCarte.ts).
     * « demo » (défaut) : jeton simulé calculé localement ; « cinetpay » ou « flutterwave » : SDK du prestataire,
     * chargé à la demande, avec VITE_CARTE_CLE_PUBLIQUE.
     */
    fournisseur: 'demo' | 'cinetpay' | 'flutterwave'
    /** VITE_CARTE_CLE_PUBLIQUE : clé PUBLIABLE du prestataire carte ; la clé secrète reste sur le serveur. */
    clePublique: string | null
  }
  suivi: {
    /** VITE_ERREURS_URL : point de collecte des erreurs non attrapées (POST JSON) ; sans lui, console en développement. */
    erreursUrl: string | null
    /** VITE_MESURE_URL : point de collecte de la mesure d'audience (POST JSON), seulement avec l'accord du client. */
    mesureUrl: string | null
    /** VITE_VERSION : version déployée jointe aux rapports d'erreur (ex. le commit) ; facultatif. */
    version: string | null
  }
}

function adresseCollecte(nom: string, v: string | boolean | undefined, production: boolean): string | null {
  const t = texte(v)
  if (t === undefined) return null
  if (t.startsWith('/')) return t
  let u: URL
  try {
    u = new URL(t)
  } catch {
    throw new ErreurConfiguration(`${nom}=« ${t} » n'est pas une adresse valide.`)
  }
  if (u.protocol !== 'https:' && production) throw new ErreurConfiguration(`${nom}=« ${t} » : HTTPS est obligatoire en production.`)
  return t
}

/** Lit et valide les variables des connecteurs. Pure : ne lit rien d'autre. */
export function lireEnvConnecteurs(brut: Brut): EnvConnecteurs {
  const production = brut.PROD === true || brut.MODE === 'production'
  const f = texte(brut.VITE_MAPS) ?? 'osm'
  if (f !== 'osm' && f !== 'google') throw new ErreurConfiguration(`VITE_MAPS=« ${f} » : valeurs permises « osm » ou « google ».`)
  const cleGoogle = texte(brut.VITE_GOOGLE_MAPS_KEY) ?? null
  const vapid = texte(brut.VITE_VAPID_PUBLIC_KEY) ?? null
  if (vapid !== null && !/^[A-Za-z0-9_-]{80,100}={0,2}$/.test(vapid))
    throw new ErreurConfiguration('VITE_VAPID_PUBLIC_KEY : clé publique VAPID en base64url attendue (87 caractères, « npx web-push generate-vapid-keys »).')
  const fc = texte(brut.VITE_CARTE_FOURNISSEUR) ?? 'demo'
  if (fc !== 'demo' && fc !== 'cinetpay' && fc !== 'flutterwave')
    throw new ErreurConfiguration(`VITE_CARTE_FOURNISSEUR=« ${fc} » : valeurs permises « demo », « cinetpay » ou « flutterwave ».`)
  const cleCarte = texte(brut.VITE_CARTE_CLE_PUBLIQUE) ?? null
  if (fc !== 'demo' && cleCarte === null) throw new ErreurConfiguration(`VITE_CARTE_FOURNISSEUR=${fc} demande VITE_CARTE_CLE_PUBLIQUE (clé publiable du prestataire).`)
  if (cleCarte !== null && /^(sk|FLWSECK)[_-]/i.test(cleCarte)) throw new ErreurConfiguration('VITE_CARTE_CLE_PUBLIQUE : clé SECRÈTE reconnue ; seule la clé publiable va au navigateur.')
  return {
    cartes: { fournisseur: f === 'google' && cleGoogle ? 'google' : 'osm', cleGoogle, mapIdGoogle: texte(brut.VITE_GOOGLE_MAPS_MAP_ID) },
    push: { clePublique: vapid },
    carte: { fournisseur: fc, clePublique: cleCarte },
    suivi: {
      erreursUrl: adresseCollecte('VITE_ERREURS_URL', brut.VITE_ERREURS_URL, production),
      mesureUrl: adresseCollecte('VITE_MESURE_URL', brut.VITE_MESURE_URL, production),
      version: texte(brut.VITE_VERSION) ?? null,
    },
  }
}

/** Configuration des connecteurs, lue au chargement du premier module qui l'importe. */
export const connecteurs: EnvConnecteurs = lireEnvConnecteurs((import.meta.env ?? {}) as unknown as Brut)
