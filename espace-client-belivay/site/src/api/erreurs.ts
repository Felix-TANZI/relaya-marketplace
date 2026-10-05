// Erreurs typées du client HTTP. Un écran ne lit jamais un statut HTTP : il teste la classe (instanceof) ou le
// genre, et affiche le message (déjà traduit par le serveur quand il le fournit, CAP-04).
//
// Deux formats d'erreur coexistent côté serveur :
// - celui de la spécification (CAP-04) : { "error": { "code": "price_changed", "message": "…", "data": {…} } } ;
// - celui de DRF, aujourd'hui dans relaya-marketplace : { "detail": "…" } ou { "champ": ["message", …] } (400).
// lireCorpsErreur() comprend les deux.

export type GenreErreur =
  | 'reseau' // pas de réponse (hors ligne, DNS, CORS)
  | 'delai' // délai d'expiration dépassé
  | 'non_authentifie' // 401 (après l'échec du rafraîchissement du jeton)
  | 'interdit' // 403
  | 'introuvable' // 404 (aussi : module fermé par un interrupteur, CAP-13)
  | 'conflit' // 409 (state_changed, price_changed, relay_full…)
  | 'validation' // 400 ou 422 avec erreurs par champ
  | 'trop_de_requetes' // 429
  | 'serveur' // 5xx
  | 'inattendu' // autre statut
  | 'non_disponible' // la route n'existe pas encore côté serveur (voir CONNECTEURS.md)

export class ErreurApi extends Error {
  readonly genre: GenreErreur
  readonly statut: number | null
  /** Code stable en snake_case (CAP-04), quand le serveur en donne un. */
  readonly code: string | null
  readonly data: unknown
  constructor(genre: GenreErreur, message: string, o: { statut?: number | null; code?: string | null; data?: unknown; cause?: unknown } = {}) {
    super(message, o.cause === undefined ? undefined : { cause: o.cause })
    this.name = 'ErreurApi'
    this.genre = genre
    this.statut = o.statut ?? null
    this.code = o.code ?? null
    this.data = o.data
  }
}

export class ErreurReseau extends ErreurApi {
  constructor(message = 'Pas de connexion au serveur. Vérifie ta connexion et réessaie.', cause?: unknown) {
    super('reseau', message, { cause })
    this.name = 'ErreurReseau'
  }
}
export class ErreurDelai extends ErreurApi {
  constructor(delaiMs: number) {
    super('delai', `Le serveur n'a pas répondu en ${Math.round(delaiMs / 1000)} s.`)
    this.name = 'ErreurDelai'
  }
}
export class ErreurNonAuthentifie extends ErreurApi {
  constructor(message = 'Ta session a expiré. Reconnecte-toi.', code: string | null = null) {
    super('non_authentifie', message, { statut: 401, code })
    this.name = 'ErreurNonAuthentifie'
  }
}
export class ErreurInterdit extends ErreurApi {
  constructor(message: string, code: string | null = null, data?: unknown) {
    super('interdit', message, { statut: 403, code, data })
    this.name = 'ErreurInterdit'
  }
}
export class ErreurIntrouvable extends ErreurApi {
  constructor(message: string, code: string | null = null) {
    super('introuvable', message, { statut: 404, code })
    this.name = 'ErreurIntrouvable'
  }
}
export class ErreurConflit extends ErreurApi {
  constructor(message: string, code: string | null = null, data?: unknown) {
    super('conflit', message, { statut: 409, code, data })
    this.name = 'ErreurConflit'
  }
}
/** 400 (DRF) ou 422 (spécification) : erreurs par champ, ex. { email: ["Cet e-mail est déjà utilisé."] }. */
export class ErreurValidation extends ErreurApi {
  readonly champs: Record<string, string[]>
  constructor(message: string, champs: Record<string, string[]>, statut: number, code: string | null = null, data?: unknown) {
    super('validation', message, { statut, code, data })
    this.name = 'ErreurValidation'
    this.champs = champs
  }
}
export class ErreurTropDeRequetes extends ErreurApi {
  /** Secondes à attendre (en-tête Retry-After), quand le serveur le dit. */
  readonly reessayerDans: number | null
  constructor(message: string, reessayerDans: number | null, code: string | null = null, data?: unknown) {
    super('trop_de_requetes', message, { statut: 429, code, data })
    this.name = 'ErreurTropDeRequetes'
    this.reessayerDans = reessayerDans
  }
}
export class ErreurServeur extends ErreurApi {
  constructor(statut: number, message = 'Le serveur a rencontré un problème. Réessaie dans un instant.') {
    super('serveur', message, { statut })
    this.name = 'ErreurServeur'
  }
}

/**
 * La méthode de la source n'a pas encore de route côté serveur (relaya-marketplace). Levée par src/api/source-api.ts ;
 * la liste complète, avec la route attendue, est dans CONNECTEURS.md.
 */
export class NonDisponible extends ErreurApi {
  readonly methode: string
  readonly attendu: string
  constructor(methode: string, attendu: string) {
    super('non_disponible', `source.${methode}() n'est pas encore branchée : route attendue côté serveur ${attendu} (voir CONNECTEURS.md).`)
    this.name = 'NonDisponible'
    this.methode = methode
    this.attendu = attendu
  }
}

interface CorpsLu {
  message: string | null
  code: string | null
  data: unknown
  champs: Record<string, string[]>
}

const enTexte = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(enTexte) : typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(enTexte) : v == null ? [] : [String(v)]

/** Comprend le format CAP-04 et le format DRF. */
export function lireCorpsErreur(corps: unknown): CorpsLu {
  const r: CorpsLu = { message: null, code: null, data: undefined, champs: {} }
  if (!corps || typeof corps !== 'object') {
    if (typeof corps === 'string' && corps.trim() && corps.length < 300 && !corps.trimStart().startsWith('<')) r.message = corps.trim()
    return r
  }
  const o = corps as Record<string, unknown>
  if (o.error && typeof o.error === 'object') {
    const e = o.error as Record<string, unknown>
    r.code = typeof e.code === 'string' ? e.code : null
    r.message = typeof e.message === 'string' ? e.message : null
    r.data = e.data
    if (e.data && typeof e.data === 'object' && 'fields' in e.data) {
      for (const [k, v] of Object.entries((e.data as { fields: Record<string, unknown> }).fields ?? {})) r.champs[k] = enTexte(v)
    }
    return r
  }
  for (const [k, v] of Object.entries(o)) {
    if (k === 'detail') r.message = enTexte(v).join(' ') || null
    else if (k === 'code' && typeof v === 'string') r.code = v
    else if (k === 'non_field_errors') r.message = enTexte(v).join(' ') || r.message
    else r.champs[k] = enTexte(v)
  }
  if (!r.message) r.message = Object.values(r.champs).flat()[0] ?? null
  r.data = corps
  return r
}

/** Construit l'erreur typée d'une réponse non 2xx. */
export function erreurDeReponse(statut: number, corps: unknown, retryAfter: string | null): ErreurApi {
  const c = lireCorpsErreur(corps)
  const m = (defaut: string) => c.message ?? defaut
  if (statut === 400 || statut === 422) return new ErreurValidation(m('Certaines informations ne sont pas valides.'), c.champs, statut, c.code, c.data)
  if (statut === 401) return new ErreurNonAuthentifie(m('Ta session a expiré. Reconnecte-toi.'), c.code)
  if (statut === 403) return new ErreurInterdit(m("Tu n'as pas accès à cette action."), c.code, c.data)
  if (statut === 404) return new ErreurIntrouvable(m('Introuvable.'), c.code)
  if (statut === 409) return new ErreurConflit(m('La situation a changé entre-temps. Recharge et réessaie.'), c.code, c.data)
  if (statut === 429) {
    // Retry-After (secondes) ; à défaut, le délai que le kit met dans les données (renvoiSecondes, retry_after).
    const d = (c.data && typeof c.data === 'object' ? c.data : {}) as { renvoiSecondes?: unknown; retry_after?: unknown }
    const brut = retryAfter ?? (typeof d.renvoiSecondes === 'number' ? d.renvoiSecondes : typeof d.retry_after === 'number' ? d.retry_after : null)
    const s = brut === null ? NaN : Math.ceil(Number(brut))
    return new ErreurTropDeRequetes(m('Trop de tentatives. Patiente un peu avant de réessayer.'), Number.isFinite(s) ? s : null, c.code, c.data)
  }
  if (statut >= 500) return new ErreurServeur(statut, c.message ?? undefined)
  return new ErreurApi('inattendu', m(`Réponse inattendue du serveur (${statut}).`), { statut, code: c.code, data: c.data })
}
