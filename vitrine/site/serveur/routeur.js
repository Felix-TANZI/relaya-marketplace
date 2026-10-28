// Le routeur HTTP des comptes : Request (standard du Web) → Response. Monté par la fonction Vercel (api/comptes.js)
// et par le serveur local (outils/serveur-local.mjs). Routes (contrat proche de backend-kit/openapi.yaml, mais la
// session est un cookie HttpOnly au lieu d'un jeton JWT) ; l'espace se donne par ?espace= (client par défaut) :
//   GET    /api/auth/etat                      base et e-mail configurés ?
//   POST   /api/auth/register/                 inscription (ouvre la session)
//   POST   /api/auth/login/                    connexion
//   POST   /api/auth/logout/                   déconnexion (cette session)
//   GET    /api/auth/me/                       session courante → compte
//   POST   /api/auth/change-password/          changer le mot de passe (ferme les autres sessions)
//   PATCH  /api/auth/profile                   prénom, nom, téléphone, photo
//   DELETE /api/auth/account                   supprimer son compte (mot de passe demandé)
//   GET    /api/auth/export                    export de ses données (JSON)
//   POST   /api/auth/password/forgot           mot de passe oublié (toujours 202)
//   GET    /api/auth/password/reset?jeton=     le lien reçu est-il valable ?
//   POST   /api/auth/password/reset            nouveau mot de passe (jeton à usage unique)
//   POST   /api/auth/invitations               inviter (entreprise → livreur, propriétaire → console)
//   GET    /api/auth/invitations/{jeton}       lire une invitation
//   GET    /api/auth/sessions                  appareils connectés
//   DELETE /api/auth/sessions/{id}             fermer une session à distance
//   POST   /api/auth/sessions/revoke-others    fermer toutes les autres
//   POST   /api/auth/console/premier-acces     premier mot de passe du propriétaire (ADMIN_BOOTSTRAP_*) → défi
//   POST   /api/auth/2fa/enrolement            console : QR et secret TOTP (avec le défi)
//   POST   /api/auth/2fa/verifier              console : code TOTP ou de secours → session (+ codes de secours au 1er)
//   POST   /api/auth/2fa/codes-secours         console : nouveaux codes de secours (mot de passe)
// Console : login, premier accès et inscription par invitation rendent { deuxieme_facteur, defi } sans session.
//   GET    /api/admin/comptes                  comptes réels (propriétaire de la console)
//   POST   /api/admin/comptes/{id}/statut      valider, refuser, suspendre
//   DELETE /api/admin/comptes/{id}             supprimer un compte
//   GET    /api/admin/comptes/journal          journal des erreurs du serveur (sans donnée personnelle)
import * as C from './comptes.js'
import { migrer, nettoyer } from './base.js'
import { Refus, TAILLES } from './regles.js'

/**
 * @typedef {{ base: () => Promise<import('./base.js').Base | null>, envoyeur: import('./envoyeur.js').Envoyeur | null, maintenant?: () => Date, envir?: Record<string, string | undefined>, hachage?: { N: number, r: number, p: number } }} Dependances
 */

const ENTETES = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

/** @param {number} statut @param {unknown} [corps] @param {string[]} [cookies] */
function reponse(statut, corps, cookies = []) {
  const h = new Headers(ENTETES)
  for (const c of cookies) h.append('Set-Cookie', c)
  return new Response(corps === undefined || statut === 204 ? null : JSON.stringify(corps), { status: statut, headers: h })
}

/** @param {Refus} r */
const erreur = (r) => reponse(r.statut, { error: { code: r.code, message: r.message, ...(r.data === undefined ? {} : { data: r.data }) } })

/** @param {Request} req */
function estHttps(req) {
  const p = req.headers.get('x-forwarded-proto')
  return (p ? p.split(',')[0].trim() : new URL(req.url).protocol.replace(':', '')) === 'https'
}

/** Nom du cookie de session d'un espace : « __Host- » en HTTPS (Secure, Path=/, sans Domain). @param {string} espace @param {boolean} https */
export const nomCookie = (espace, https) => (https ? '__Host-' : '') + 'blv_s_' + espace

/** @param {Request} req @param {string} nom */
function lireCookie(req, nom) {
  const brut = req.headers.get('cookie') ?? ''
  for (const part of brut.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === nom) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

/** @param {string} nom @param {string} valeur @param {boolean} https @param {number | null} maxAge secondes (null : cookie de session) */
function cookie(nom, valeur, https, maxAge) {
  const p = [`${nom}=${encodeURIComponent(valeur)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']
  if (https) p.push('Secure')
  if (maxAge !== null) p.push(`Max-Age=${maxAge}`)
  return p.join('; ')
}

/** Même site : l'en-tête Origin doit être l'hôte de la requête (écritures seulement). @param {Request} req */
function memeOrigine(req) {
  const o = req.headers.get('origin')
  if (!o) return req.headers.get('sec-fetch-site') === 'same-origin'
  let hote
  try {
    hote = new URL(o).host
  } catch {
    return false
  }
  const attendu = req.headers.get('x-forwarded-host')?.split(',')[0].trim() || req.headers.get('host') || new URL(req.url).host
  return hote === attendu
}

/** @param {Request} req */
function adresseIp(req) {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
}

/** Résumé de l'appareil (« Chrome · macOS ») : jamais l'en-tête complet. @param {string} ua */
export function appareil(ua) {
  const nav = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${nav} · ${os}` : nav
}

/** @param {Request} req @returns {Promise<Record<string, unknown>>} */
async function lireCorps(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return {}
  const type = req.headers.get('content-type') ?? ''
  const brut = await req.text()
  if (brut.length > TAILLES.corpsMax) throw new Refus(413, 'trop_gros', 'Requête trop lourde.')
  if (!brut) return {}
  if (!type.includes('application/json')) throw new Refus(415, 'type', 'Corps JSON attendu.')
  try {
    const v = JSON.parse(brut)
    if (v && typeof v === 'object' && !Array.isArray(v)) return v
  } catch {
    /* plus bas */
  }
  throw new Refus(400, 'json', 'Corps JSON invalide.')
}

/** Chemin de la route : celui de l'adresse, ou ?chemin= (réécriture Vercel vers la fonction unique). @param {URL} u */
function cheminDe(u) {
  const c = u.searchParams.get('chemin')
  const p = c !== null && /^\/api\/comptes\/?$/.test(u.pathname) ? '/api/' + c : u.pathname
  return p.replace(/\/+$/, '').replace(/^\/api/, '') || '/'
}

/**
 * Crée le routeur. Les migrations passent une fois (au premier appel qui touche la base).
 * @param {Dependances} deps
 */
export function creerRouteur(deps) {
  /** @type {Promise<import('./base.js').Base | null> | null} */
  let prete = null
  const base = () =>
    (prete ??= deps.base().then(async (db) => {
      if (db) await migrer(db)
      return db
    })).catch((e) => {
      prete = null
      throw e
    })
  const envir = deps.envir ?? process.env
  const maintenant = deps.maintenant ?? (() => new Date())

  /** Journal des erreurs, sans donnée personnelle ; ne bloque ni ne casse jamais la réponse. @param {string} niveau @param {string} route @param {string} code */
  async function journaliser(niveau, route, code) {
    try {
      const db = await base()
      if (db) await db.requete('INSERT INTO journal_serveur (le, niveau, route, code) VALUES ($1, $2, $3, $4)', [maintenant(), niveau, route, code])
    } catch {
      /* journal indisponible : le journal de Vercel garde la ligne */
    }
  }
  // Ménage (sessions, jetons, défis expirés ; limites passées ; journal ancien) : au plus toutes les 30 minutes par instance.
  let dernierMenage = 0
  async function menage(/** @type {import('./base.js').Base} */ db) {
    const t = maintenant().getTime()
    if (t - dernierMenage < 30 * 60_000) return
    dernierMenage = t
    try {
      await nettoyer(db, maintenant())
    } catch {
      dernierMenage = 0
    }
  }

  /** @param {Request} req @returns {Promise<Response>} */
  return async function traiter(req) {
    const u = new URL(req.url)
    const chemin = cheminDe(u)
    const m = req.method.toUpperCase()
    try {
      if (chemin === '/auth/etat' && m === 'GET') {
        const db = await base().catch(() => null)
        return reponse(200, { base: !!db, email: !!deps.envoyeur, premier_acces: !!(envir.ADMIN_BOOTSTRAP_CODE && envir.ADMIN_BOOTSTRAP_EMAIL) })
      }
      if (m !== 'GET' && m !== 'HEAD' && !memeOrigine(req)) throw new Refus(403, 'origine', 'Requête refusée.')
      const db = await base().catch((e) => {
        console.error('[comptes] base injoignable', /** @type {Error} */ (e).name)
        throw new Refus(503, 'base_injoignable', 'Le service des comptes est momentanément indisponible.')
      })
      if (db) await menage(db)
      if (!db) throw new Refus(503, 'base_absente', 'Les comptes réels ne sont pas encore ouverts sur ce site : utilisez le compte de démonstration.')
      const espace = C.lireEspace(u.searchParams.get('espace'))
      const https = estHttps(req)
      const nom = nomCookie(espace, https)
      const jeton = lireCookie(req, nom)
      const corps = await lireCorps(req)
      /** @type {C.Contexte} */
      const ctx = { db, envoyeur: deps.envoyeur, maintenant, origine: u.origin, ip: adresseIp(req), appareil: appareil(req.headers.get('user-agent') ?? ''), envir, hachage: deps.hachage }
      /** @param {any} o session ouverte, ou défi du second facteur (console) @param {number} statut */
      const ouverte = (o, statut = 200) =>
        'defi' in o
          ? reponse(statut, { deuxieme_facteur: o.deuxieme_facteur, defi: o.defi, expire_le: o.expire_le, prenom: o.prenom, nom: o.nom })
          : reponse(statut, { user: o.compte, session: { expire_le: o.expire.toISOString(), se_souvenir: o.seSouvenir }, ...(o.codesSecours ? { codes_secours: o.codesSecours } : {}) }, [
          cookie(nom, o.jeton, https, o.seSouvenir ? Math.floor((o.expire.getTime() - maintenant().getTime()) / 1000) : null),
        ])
      const effacer = () => cookie(nom, '', https, 0)
      const exigerSession = async () => {
        const s = await C.sessionCourante(ctx, espace, jeton)
        if (!s) throw new Refus(401, 'non_authentifie', 'Session expirée : reconnectez-vous.')
        return s
      }
      const seg = chemin.split('/').filter(Boolean)

      // Comptes, connexion, session
      if (chemin === '/auth/register' && m === 'POST') return ouverte(await C.inscrire(ctx, espace, corps, jeton), 201)
      if (chemin === '/auth/login' && m === 'POST') return ouverte(await C.connecter(ctx, espace, corps, jeton))
      if (chemin === '/auth/console/premier-acces' && m === 'POST') return ouverte(await C.premierAcces(ctx, corps))
      // Second facteur de la console
      if (chemin === '/auth/2fa/enrolement' && m === 'POST') return reponse(200, await C.enrolerTotp(ctx, corps))
      if (chemin === '/auth/2fa/verifier' && m === 'POST') return ouverte(await C.verifierDeuxiemeFacteur(ctx, corps, jeton))
      if (chemin === '/auth/2fa/codes-secours' && m === 'POST') return reponse(200, await C.regenererCodesSecours(ctx, await exigerSession(), corps))
      if (chemin === '/auth/logout' && m === 'POST') {
        await C.deconnecter(ctx, jeton)
        return reponse(204, undefined, [effacer()])
      }
      if (chemin === '/auth/me' && m === 'GET') {
        const s = await C.sessionCourante(ctx, espace, jeton)
        if (!s) return reponse(401, { error: { code: 'non_authentifie', message: 'Aucune session.' } }, jeton ? [effacer()] : [])
        return reponse(200, { user: C.compteVu(s.compte), session: { expire_le: s.expire_le.toISOString(), se_souvenir: s.se_souvenir } })
      }
      if (chemin === '/auth/change-password' && m === 'POST') {
        await C.changerMotDePasse(ctx, await exigerSession(), corps)
        return reponse(200, { ok: true })
      }
      if (chemin === '/auth/profile' && (m === 'PATCH' || m === 'POST')) return reponse(200, { user: await C.modifierProfil(ctx, await exigerSession(), corps) })
      if (chemin === '/auth/export' && m === 'GET') {
        const r = reponse(200, await C.exporter(ctx, await exigerSession()))
        r.headers.set('Content-Disposition', 'attachment; filename="mes-donnees-belivay.json"')
        return r
      }
      if (chemin === '/auth/account' && m === 'DELETE') {
        await C.supprimerCompte(ctx, await exigerSession(), corps)
        return reponse(204, undefined, [effacer()])
      }

      // Mot de passe oublié
      if (chemin === '/auth/password/forgot' && m === 'POST') return reponse(202, await C.oubli(ctx, espace, corps))
      if (chemin === '/auth/password/reset' && m === 'GET') return reponse(200, await C.lireReinitialisation(ctx, espace, u.searchParams.get('jeton') ?? ''))
      if (chemin === '/auth/password/reset' && m === 'POST') return reponse(200, await C.reinitialiser(ctx, espace, corps))

      // Invitations
      if (chemin === '/auth/invitations' && m === 'POST') return reponse(201, await C.inviter(ctx, await exigerSession(), corps))
      if (seg[0] === 'auth' && seg[1] === 'invitations' && seg.length === 3 && m === 'GET') return reponse(200, await C.lireInvitation(ctx, espace, decodeURIComponent(seg[2])))

      // Appareils connectés
      if (chemin === '/auth/sessions' && m === 'GET') return reponse(200, { sessions: await C.listerSessions(ctx, await exigerSession()) })
      if (chemin === '/auth/sessions/revoke-others' && m === 'POST') {
        await C.revoquerAutres(ctx, await exigerSession())
        return reponse(204)
      }
      if (seg[0] === 'auth' && seg[1] === 'sessions' && seg.length === 3 && m === 'DELETE') {
        await C.revoquerSession(ctx, await exigerSession(), seg[2])
        return reponse(204)
      }

      // Console : comptes réels (l'espace de la session est toujours « console »)
      if (seg[0] === 'admin' && seg[1] === 'comptes') {
        // (GET /api/admin/comptes/journal : journal des erreurs du serveur)
        if (espace !== 'console') throw new Refus(403, 'droit_refuse', 'Réservé à la console.')
        const s = await exigerSession()
        if (seg.length === 2 && m === 'GET') return reponse(200, { comptes: await C.listerComptes(ctx, s, u.searchParams) })
        if (seg.length === 3 && seg[2] === 'journal' && m === 'GET') return reponse(200, { journal: await C.lireJournal(ctx, s) })
        if (seg.length === 4 && seg[3] === 'statut' && m === 'POST') return reponse(200, { user: await C.changerStatut(ctx, s, seg[2], corps) })
        if (seg.length === 3 && m === 'DELETE') {
          await C.supprimerParConsole(ctx, s, seg[2])
          return reponse(204)
        }
      }
      return reponse(404, { error: { code: 'route', message: 'Route inconnue.' } })
    } catch (e) {
      if (e instanceof Refus) return erreur(e)
      // Jamais le corps ni les en-têtes dans le journal : seulement la route et le type d'erreur (journal de Vercel, et
      // table journal_serveur lue par la console). L'écran ne voit qu'un message simple.
      const code = String(/** @type {{code?: string}} */ (e)?.code ?? /** @type {Error} */ (e)?.name ?? 'erreur').slice(0, 40)
      console.error('[comptes] erreur', m, chemin, code)
      await journaliser('erreur', m + ' ' + chemin.slice(0, 80), code)
      return reponse(500, { error: { code: 'erreur', message: 'Une erreur est survenue. Réessayez.' } })
    }
  }
}
