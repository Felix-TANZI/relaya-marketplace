// Les comptes réels : inscription, connexion, sessions, mot de passe, profil, suppression, invitations, validation par
// la console. Fonctions pures autour d'une base (base.js) et d'un envoyeur (envoyeur.js) : le routeur HTTP (routeur.js)
// ne fait que lire la requête, appeler ici et écrire la réponse. Toutes les heures viennent de ctx.maintenant() (les
// tests avancent l'horloge). Rien ici n'écrit de donnée personnelle dans le journal.
import { cleLimite, egal, empreinte, hacherMotDePasse, nouveauJeton, verifierMotDePasse } from './secrets.js'
import { base32, chiffrer, cleTotp, dechiffrer, empreinteSecours, nouveauSecret, nouveauxCodesSecours, otpauth, verifierTotp } from './totp.js'
import {
  DUREES,
  ESPACES,
  INVITATIONS,
  LIENS,
  LIMITES,
  NAISSANCE,
  ROLES_CONSOLE,
  ROLE_INITIAL,
  Refus,
  STATUTS,
  VERSION_CONDITIONS_DEFAUT,
  candidature as lireCandidature,
  email as lireEmail,
  nom as lireNom,
  photo as lirePhoto,
  regleMotDePasse,
  telephone as lireTelephone,
  texte,
} from './regles.js'

/**
 * @typedef {import('./base.js').Base} Base
 * @typedef {import('./envoyeur.js').Envoyeur} Envoyeur
 * @typedef {{ db: Base, envoyeur: Envoyeur | null, maintenant: () => Date, origine: string, ip: string, appareil: string, envir: Record<string, string | undefined>, hachage?: { N: number, r: number, p: number } }} Contexte
 * @typedef {{ id: string, compte: Record<string, any>, expire_le: Date, se_souvenir: boolean }} SessionOuverte
 */

const MIN = 60_000
const HEURE = 60 * MIN
const JOUR = 24 * HEURE
const plus = (/** @type {Date} */ d, /** @type {number} */ ms) => new Date(d.getTime() + ms)

const MESSAGES = {
  identifiants: 'E-mail ou mot de passe incorrect.',
  bloque: 'Trop d’essais. Réessayez plus tard.',
  trop: 'Trop de demandes. Réessayez plus tard.',
  existe: 'Impossible de créer un compte avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ».',
  mot_de_passe: 'Le mot de passe doit avoir 8 caractères au moins, dont une lettre et un chiffre.',
  mot_de_passe_demo: 'Ce mot de passe est réservé à la démonstration : choisissez-en un autre.',
  pin_trop_simple: 'Ce code est trop simple : évitez 123456, 000000 et les suites.',
}

/** « c•••••@gmail.com » @param {string} e */
export function masquerEmail(e) {
  const [u, d] = e.split('@')
  if (!d) return '•••'
  return (u[0] ?? '') + '•'.repeat(Math.max(3, Math.min(6, u.length - 1))) + '@' + d
}

/** Le compte tel que les applications le lisent (même forme que RUtilisateur du kit, plus l'espace). @param {Record<string, any>} c */
export function compteVu(c) {
  return {
    id: c.id,
    username: c.email,
    email: c.email,
    email_masque: masquerEmail(c.email),
    first_name: c.prenom,
    last_name: c.nom,
    phone: c.telephone ?? null,
    avatar_url: c.photo ?? null,
    has_usable_password: !!c.mdp_hash,
    deuxieme_facteur: !!c.totp_actif,
    espace: c.espace,
    role: c.role,
    statut: c.statut,
    type_compte: c.type_compte,
    pays: c.pays ?? null,
    organisation_id: c.organisation_id ?? null,
    // Nom donné à la candidature (entreprise, point relais) ou au dossier (vendeur : « boutique »).
    organisation: (c.candidature && (c.candidature.nom ?? c.candidature.boutique)) || null,
    conditions: c.conditions_version ? { version: c.conditions_version, acceptees_le: new Date(c.conditions_acceptees_le).toISOString() } : null,
    cree_le: new Date(c.cree_le).toISOString(),
  }
}

/** @param {unknown} v */
export function lireEspace(v) {
  const e = texte(v) || 'client'
  const espace = e === 'admin' ? 'console' : e
  if (!ESPACES.includes(espace)) throw new Refus(400, 'espace', 'Espace inconnu.')
  return espace
}

// ── Limites de tentatives (table « limites ») ────────────────────────────────────────────────────────────────────

/** @param {Contexte} ctx @param {string} cle @param {number[]} limite */
async function bloqueJusqua(ctx, cle, limite) {
  const [l] = await ctx.db.requete('SELECT nombre, fin FROM limites WHERE cle = $1', [cle])
  if (l && l.nombre >= limite[0] && new Date(l.fin) > ctx.maintenant()) return new Date(l.fin)
  return null
}

/** Compte une tentative ; rend l'heure de fin si la limite est atteinte. @param {Contexte} ctx @param {string} cle @param {number[]} limite */
async function compter(ctx, cle, limite) {
  const t = ctx.maintenant()
  const [l] = await ctx.db.requete(
    `INSERT INTO limites (cle, nombre, fin) VALUES ($1, 1, $3)
     ON CONFLICT (cle) DO UPDATE SET
       nombre = CASE WHEN limites.fin < $2 THEN 1 ELSE limites.nombre + 1 END,
       fin = CASE WHEN limites.fin < $2 THEN EXCLUDED.fin ELSE limites.fin END
     RETURNING nombre, fin`,
    [cle, t, plus(t, limite[1] * 1000)],
  )
  return { nombre: Number(l.nombre), fin: new Date(l.fin), atteinte: Number(l.nombre) >= limite[0] }
}

/** @param {Contexte} ctx @param {string} cle @param {number[]} limite */
async function exigerSousLimite(ctx, cle, limite) {
  const fin = await bloqueJusqua(ctx, cle, limite)
  if (fin) throw new Refus(429, 'trop_de_tentatives', MESSAGES.trop, { jusqua: fin.toISOString() })
  await compter(ctx, cle, limite)
}

// ── Sessions ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** @param {Contexte} ctx @param {Record<string, any>} compte @param {boolean} seSouvenir @param {string | null} ancien jeton du cookie */
async function ouvrirSession(ctx, compte, seSouvenir, ancien) {
  // Une session par appareil : celle que cet appareil avait déjà pour cet espace est fermée.
  if (ancien) await ctx.db.requete('DELETE FROM sessions WHERE jeton_hash = $1', [empreinte(ancien)])
  const t = ctx.maintenant()
  const jeton = nouveauJeton()
  const expire = plus(t, seSouvenir ? DUREES.sessionLongueJ * JOUR : DUREES.sessionCourteH * HEURE)
  await ctx.db.requete(
    'INSERT INTO sessions (jeton_hash, compte_id, espace, appareil, se_souvenir, cree_le, vu_le, expire_le) VALUES ($1, $2, $3, $4, $5, $6, $6, $7)',
    [empreinte(jeton), compte.id, compte.espace, ctx.appareil.slice(0, 80), seSouvenir, t, expire],
  )
  return { jeton, expire, seSouvenir, compte: compteVu(compte) }
}

/**
 * La session du cookie, si elle est valable pour cet espace (expirée : supprimée).
 * @param {Contexte} ctx @param {string} espace @param {string | null} jeton @returns {Promise<SessionOuverte | null>}
 */
export async function sessionCourante(ctx, espace, jeton) {
  if (!jeton || jeton.length > 100) return null
  const t = ctx.maintenant()
  const [l] = await ctx.db.requete(
    `SELECT s.id AS session_id, s.expire_le, s.vu_le, s.se_souvenir, c.* FROM sessions s JOIN comptes c ON c.id = s.compte_id
     WHERE s.jeton_hash = $1 AND s.espace = $2`,
    [empreinte(jeton), espace],
  )
  if (!l) return null
  // Session expirée, ou compte refusé ou suspendu depuis (console, base) : elle ne vaut plus.
  if (new Date(l.expire_le) <= t || l.statut === 'refuse' || l.statut === 'suspendu' || (l.espace === 'console' && !l.totp_actif)) {
    await ctx.db.requete('DELETE FROM sessions WHERE id = $1', [l.session_id])
    return null
  }
  if (t.getTime() - new Date(l.vu_le).getTime() > DUREES.sessionVuMin * MIN) await ctx.db.requete('UPDATE sessions SET vu_le = $2 WHERE id = $1', [l.session_id, t])
  const { session_id, expire_le, vu_le: _vu, se_souvenir, ...compte } = l
  return { id: session_id, compte, expire_le: new Date(expire_le), se_souvenir }
}

/** @param {Contexte} ctx @param {string | null} jeton */
export async function deconnecter(ctx, jeton) {
  if (jeton) await ctx.db.requete('DELETE FROM sessions WHERE jeton_hash = $1', [empreinte(jeton)])
}

/** @param {Contexte} ctx @param {SessionOuverte} s */
export async function listerSessions(ctx, s) {
  const l = await ctx.db.requete('SELECT id, appareil, cree_le, vu_le, expire_le FROM sessions WHERE compte_id = $1 AND expire_le > $2 ORDER BY vu_le DESC', [s.compte.id, ctx.maintenant()])
  return l.map((x) => ({ id: x.id, appareil: x.appareil, cree_le: new Date(x.cree_le).toISOString(), vu_le: new Date(x.vu_le).toISOString(), courante: x.id === s.id }))
}

/** @param {Contexte} ctx @param {SessionOuverte} s @param {string} id */
export async function revoquerSession(ctx, s, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Refus(404, 'introuvable', 'Session introuvable.')
  const r = await ctx.db.requete('DELETE FROM sessions WHERE id = $1 AND compte_id = $2 RETURNING id', [id, s.compte.id])
  if (!r.length) throw new Refus(404, 'introuvable', 'Session introuvable.')
}

/** @param {Contexte} ctx @param {SessionOuverte} s */
export async function revoquerAutres(ctx, s) {
  await ctx.db.requete('DELETE FROM sessions WHERE compte_id = $1 AND id <> $2', [s.compte.id, s.id])
}

// ── Inscription ──────────────────────────────────────────────────────────────────────────────────────────────────

/** @param {string} code */
const champ = (code) => new Refus(400, code, MESSAGES[/** @type {keyof typeof MESSAGES} */ (code)] ?? 'Champ invalide.', { champ: code })

/** @param {Record<string, unknown>} corps */
function conditions(corps) {
  if (corps.conditions_acceptees !== true && corps.accepte_conditions !== true) throw new Refus(400, 'conditions', 'Acceptez les conditions pour créer le compte.', { champ: 'conditions' })
  const v = texte(corps.conditions_version) || VERSION_CONDITIONS_DEFAUT
  if (!/^[\w.-]{1,20}$/.test(v)) throw champ('conditions')
  return v
}

/**
 * @param {Contexte} ctx @param {string} espace @param {Record<string, unknown>} corps @param {string | null} ancien
 */
export async function inscrire(ctx, espace, corps, ancien) {
  if (espace === 'console') exigerCleTotp(ctx)
  await exigerSousLimite(ctx, cleLimite('inscription', ctx.ip), LIMITES.inscriptionIp)
  const mdp = corps.password ?? corps.mot_de_passe
  const regle = regleMotDePasse(mdp, espace)
  if (regle) throw champ(regle)
  if (corps.password2 !== undefined && corps.password2 !== mdp) throw new Refus(400, 'mot_de_passe2', 'Les deux mots de passe ne sont pas les mêmes.', { champ: 'password2' })
  const prenom = lireNom(corps.first_name ?? corps.prenom)
  const nomFamille = corps.last_name ?? corps.nom
  const nom = nomFamille === undefined || texte(nomFamille) === '' ? '' : lireNom(nomFamille)
  const tel = lireTelephone(corps.phone ?? corps.telephone)
  const version = conditions(corps)
  const t = ctx.maintenant()
  const hash = await hacherMotDePasse(/** @type {string} */ (mdp), ctx.hachage)

  const jetonInvitation = texte(corps.jeton ?? corps.invitation)
  if (NAISSANCE[/** @type {keyof typeof NAISSANCE} */ (espace)] === 'invitation' || (espace === 'relais' && jetonInvitation)) {
    // Livreur (invité par son entreprise) ou membre de la console (invité par le propriétaire) : le jeton est consommé
    // dans la même instruction que la création du compte (s'il échoue, le jeton reste valable).
    const jeton = jetonInvitation
    if (!jeton) throw new Refus(403, 'invitation_requise', 'Ce compte se crée avec le lien d’invitation reçu.')
    if (prenom === null && texte(corps.first_name ?? corps.prenom) !== '') throw champ('prenom')
    if (nom === null) throw champ('nom')
    if (tel === undefined) throw champ('telephone')
    try {
      const [c] = await ctx.db.requete(
        `WITH j AS (
           UPDATE jetons SET utilise_le = $2 WHERE jeton_hash = $1 AND type = 'invitation' AND espace = $3 AND utilise_le IS NULL AND expire_le > $2
           RETURNING email, invite_par, donnees
         )
         INSERT INTO comptes (espace, email, telephone, mdp_hash, prenom, nom, role, statut, organisation_id, conditions_version, conditions_acceptees_le, cree_le, maj_le)
         SELECT $3, j.email, COALESCE($4, j.donnees->>'telephone'), $5, COALESCE(NULLIF($6, ''), j.donnees->>'prenom', ''), COALESCE(NULLIF($7, ''), j.donnees->>'nom', ''),
                COALESCE(j.donnees->>'role', $8), 'actif', CASE WHEN $3 IN ('livreur', 'relais') THEN j.invite_par ELSE NULL END, $9, $2, $2, $2
         FROM j RETURNING *`,
        [empreinte(jeton), t, espace, tel ?? null, hash, prenom ?? '', nom ?? '', ROLE_INITIAL[/** @type {keyof typeof ROLE_INITIAL} */ (espace)], version],
      )
      if (!c) throw await refusJeton(ctx, jeton, 'invitation', espace)
      // Console : pas de session sans second facteur ; l'enrôlement suit tout de suite.
      if (espace === 'console') return ouvrirDefi(ctx, c, false)
      return ouvrirSession(ctx, c, corps.se_souvenir !== false, ancien)
    } catch (e) {
      if (e instanceof Refus) throw e
      if (/** @type {{code?: string}} */ (e).code === '23505') throw new Refus(409, 'existe', MESSAGES.existe)
      throw e
    }
  }

  const adresse = lireEmail(corps.email ?? corps.username)
  if (!adresse) throw champ('email')
  if (prenom === null) throw champ('prenom')
  if (nom === null) throw champ('nom')
  if (tel === undefined) throw champ('telephone')
  const typeCompte = espace === 'client' && corps.type_compte === 'diaspora' ? 'diaspora' : 'standard'
  const pays = typeCompte === 'diaspora' ? texte(corps.pays).toUpperCase() : ''
  if (typeCompte === 'diaspora' && !/^[A-Z]{2}$/.test(pays)) throw champ('pays')
  const dossier = lireCandidature(corps.candidature)
  if (dossier === undefined) throw champ('candidature')
  if ((espace === 'entreprise' || espace === 'relais') && !(typeof dossier.nom === 'string' && dossier.nom.length >= 2))
    throw new Refus(400, 'candidature', 'Donnez le nom de l’entreprise ou du point relais.', { champ: 'candidature.nom' })
  const statut = NAISSANCE[/** @type {keyof typeof NAISSANCE} */ (espace)] === 'attente' ? 'en_attente' : 'actif'
  try {
    const [c] = await ctx.db.requete(
      `INSERT INTO comptes (espace, email, telephone, mdp_hash, prenom, nom, role, statut, type_compte, pays, candidature, conditions_version, conditions_acceptees_le, cree_le, maj_le)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $13) RETURNING *`,
      [espace, adresse, tel ?? null, hash, prenom, nom ?? '', ROLE_INITIAL[/** @type {keyof typeof ROLE_INITIAL} */ (espace)], statut, typeCompte, pays || null, JSON.stringify(dossier), version, t],
    )
    return ouvrirSession(ctx, c, corps.se_souvenir !== false, ancien)
  } catch (e) {
    if (/** @type {{code?: string}} */ (e).code === '23505') throw new Refus(409, 'existe', MESSAGES.existe)
    throw e
  }
}

// ── Connexion ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Premier compte de la console : créé (sans mot de passe) pour ADMIN_BOOTSTRAP_EMAIL tant qu'aucun propriétaire n'existe. @param {Contexte} ctx */
export async function assurerProprietaire(ctx) {
  const e = lireEmail(ctx.envir.ADMIN_BOOTSTRAP_EMAIL)
  if (!e) return
  const t = ctx.maintenant()
  await ctx.db.requete(
    `INSERT INTO comptes (espace, email, role, statut, cree_le, maj_le)
     SELECT 'console', $1, 'proprietaire', 'actif', $2, $2
     WHERE NOT EXISTS (SELECT 1 FROM comptes WHERE espace = 'console' AND role = 'proprietaire')
     ON CONFLICT (espace, email) DO NOTHING`,
    [e, t],
  )
}

/** @param {Contexte} ctx @param {string} espace @param {unknown} v */
async function trouverCompte(ctx, espace, v) {
  const e = lireEmail(v)
  if (e) return { cle: e, compte: (await ctx.db.requete('SELECT * FROM comptes WHERE espace = $1 AND email = $2', [espace, e]))[0] }
  const t = lireTelephone(v)
  if (t) return { cle: t, compte: (await ctx.db.requete('SELECT * FROM comptes WHERE espace = $1 AND telephone = $2', [espace, t]))[0] }
  return null
}

/** @param {Contexte} ctx @param {string} espace @param {Record<string, unknown>} corps @param {string | null} ancien */
export async function connecter(ctx, espace, corps, ancien) {
  const mdp = corps.password ?? corps.mot_de_passe
  const ident = corps.username ?? corps.email ?? corps.identifiant
  if (typeof mdp !== 'string' || mdp.length === 0 || mdp.length > 128) throw new Refus(400, 'identifiants', MESSAGES.identifiants, { champ: 'password' })
  if (espace === 'console') await assurerProprietaire(ctx)
  const ipCle = cleLimite('cnx-ip', ctx.ip)
  const finIp = await bloqueJusqua(ctx, ipCle, LIMITES.connexionIp)
  if (finIp) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: finIp.toISOString() })
  const trouve = await trouverCompte(ctx, espace, ident)
  if (!trouve) throw new Refus(400, 'identifiants', MESSAGES.identifiants, { champ: 'username' })
  const cle = cleLimite('cnx:' + espace, trouve.cle)
  const fin = await bloqueJusqua(ctx, cle, LIMITES.connexionEmail)
  if (fin) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: fin.toISOString() })
  const bon = await verifierMotDePasse(mdp, trouve.compte?.mdp_hash ?? null)
  if (!bon || !trouve.compte) {
    // Même réponse, que l'adresse ait un compte ou non (les essais sont comptés par adresse dans les deux cas).
    const n = await compter(ctx, cle, LIMITES.connexionEmail)
    await compter(ctx, ipCle, LIMITES.connexionIp)
    if (n.atteinte) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: n.fin.toISOString() })
    throw new Refus(401, 'identifiants', MESSAGES.identifiants, { essais_restants: LIMITES.connexionEmail[0] - n.nombre })
  }
  await ctx.db.requete('DELETE FROM limites WHERE cle = $1', [cle])
  if (trouve.compte.statut === 'refuse' || trouve.compte.statut === 'suspendu')
    throw new Refus(403, 'compte_ferme', 'Ce compte n’est pas ouvert. Écrivez au support.', { statut: trouve.compte.statut })
  const seSouvenir = corps.se_souvenir !== false && corps.seSouvenir !== false
  if (espace === 'console') return ouvrirDefi(ctx, trouve.compte, seSouvenir)
  return ouvrirSession(ctx, trouve.compte, seSouvenir, ancien)
}

// ── Mot de passe ─────────────────────────────────────────────────────────────────────────────────────────────────

/** @param {Contexte} ctx @param {SessionOuverte} s @param {Record<string, unknown>} corps */
export async function changerMotDePasse(ctx, s, corps) {
  const ancien = corps.old_password ?? corps.ancien
  const nouveau = corps.new_password ?? corps.nouveau
  const cle = cleLimite('mdp:' + s.compte.espace, s.compte.id)
  const fin = await bloqueJusqua(ctx, cle, LIMITES.connexionEmail)
  if (fin) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: fin.toISOString() })
  if (s.compte.mdp_hash && !(typeof ancien === 'string' && (await verifierMotDePasse(ancien, s.compte.mdp_hash)))) {
    await compter(ctx, cle, LIMITES.connexionEmail)
    throw new Refus(400, 'old_password', 'Mot de passe actuel incorrect.', { champ: 'old_password' })
  }
  const regle = regleMotDePasse(nouveau, s.compte.espace)
  if (regle) throw new Refus(400, 'new_password', MESSAGES[/** @type {keyof typeof MESSAGES} */ (regle)], { champ: 'new_password', regle })
  if (corps.new_password2 !== undefined && corps.new_password2 !== nouveau) throw new Refus(400, 'new_password2', 'Les deux mots de passe ne sont pas les mêmes.', { champ: 'new_password2' })
  await ctx.db.requete('UPDATE comptes SET mdp_hash = $2, maj_le = $3 WHERE id = $1', [s.compte.id, await hacherMotDePasse(/** @type {string} */ (nouveau), ctx.hachage), ctx.maintenant()])
  // Les autres appareils sont déconnectés (CAP-17) ; celui-ci reste ouvert.
  await revoquerAutres(ctx, s)
}

/** @param {Contexte} ctx @param {string} lien modèle (regles.js, LIENS) @param {string} jeton */
const adresseLien = (ctx, lien, jeton) => ctx.origine + lien.replace('{j}', encodeURIComponent(jeton))

/**
 * Mot de passe oublié : toujours la même réponse (202), que l'adresse ait un compte ou non. Sans envoyeur configuré,
 * aucun e-mail ne part : la réponse le dit (envoi « support ») pour tout le monde, sans rien révéler.
 * @param {Contexte} ctx @param {string} espace @param {Record<string, unknown>} corps
 */
export async function oubli(ctx, espace, corps) {
  const adresse = lireEmail(corps.email ?? corps.identifiant ?? corps.username)
  if (!adresse) throw champ('email')
  const reponse = { envoi: ctx.envoyeur ? 'email' : 'support', destination: masquerEmail(adresse), valide_minutes: DUREES.reinitialisationMin }
  if (!ctx.envoyeur) return reponse
  if (espace === 'console') await assurerProprietaire(ctx)
  const ip = await compter(ctx, cleLimite('oubli-ip', ctx.ip), LIMITES.oubliIp)
  const parAdresse = await compter(ctx, cleLimite('oubli:' + espace, adresse), LIMITES.oubliEmail)
  if (ip.nombre > LIMITES.oubliIp[0] || parAdresse.nombre > LIMITES.oubliEmail[0]) return reponse
  const [c] = await ctx.db.requete("SELECT id, email, prenom FROM comptes WHERE espace = $1 AND email = $2 AND statut <> 'refuse'", [espace, adresse])
  if (!c) return reponse
  const t = ctx.maintenant()
  const jeton = nouveauJeton()
  // Un seul lien valable à la fois : les précédents ne servent plus.
  await ctx.db.requete("UPDATE jetons SET utilise_le = $2 WHERE compte_id = $1 AND type = 'reinitialisation' AND utilise_le IS NULL", [c.id, t])
  await ctx.db.requete("INSERT INTO jetons (jeton_hash, type, espace, compte_id, email, cree_le, expire_le) VALUES ($1, 'reinitialisation', $2, $3, $4, $5, $6)", [
    empreinte(jeton),
    espace,
    c.id,
    c.email,
    t,
    plus(t, DUREES.reinitialisationMin * MIN),
  ])
  const lien = adresseLien(ctx, LIENS.reinitialisation[/** @type {keyof typeof LIENS.reinitialisation} */ (espace)], jeton)
  await ctx.envoyeur.envoyer({
    a: c.email,
    sujet: 'BelivaY · nouveau mot de passe',
    texte: `Bonjour${c.prenom ? ' ' + c.prenom : ''},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable ${DUREES.reinitialisationMin} minutes, une seule fois) :\n${lien}\n\nVous n’avez rien demandé ? Ignorez ce message : votre mot de passe ne change pas.\n\nBelivaY`,
  })
  return reponse
}

/** Pourquoi un jeton ne sert pas : expiré ou déjà utilisé (410), inconnu (404). @param {Contexte} ctx @param {string} jeton @param {string} type @param {string} espace */
async function refusJeton(ctx, jeton, type, espace) {
  const [j] = await ctx.db.requete('SELECT expire_le, utilise_le FROM jetons WHERE jeton_hash = $1 AND type = $2 AND espace = $3', [empreinte(jeton), type, espace])
  if (!j) return new Refus(404, 'invalide', 'Ce lien n’est pas valable.')
  return new Refus(410, j.utilise_le ? 'utilise' : 'expire', j.utilise_le ? 'Ce lien a déjà servi.' : 'Ce lien a expiré.')
}

/** Lien ouvert (sans le consommer) : valable ? @param {Contexte} ctx @param {string} espace @param {string} jeton */
export async function lireReinitialisation(ctx, espace, jeton) {
  if (!jeton || jeton.length > 100) throw new Refus(404, 'invalide', 'Ce lien n’est pas valable.')
  const [j] = await ctx.db.requete("SELECT email FROM jetons WHERE jeton_hash = $1 AND type = 'reinitialisation' AND espace = $2 AND utilise_le IS NULL AND expire_le > $3", [
    empreinte(jeton),
    espace,
    ctx.maintenant(),
  ])
  if (!j) throw await refusJeton(ctx, jeton, 'reinitialisation', espace)
  return { email: masquerEmail(j.email) }
}

/** Nouveau mot de passe par le lien reçu : à usage unique ; toutes les sessions du compte se ferment. @param {Contexte} ctx @param {string} espace @param {Record<string, unknown>} corps */
export async function reinitialiser(ctx, espace, corps) {
  await exigerSousLimite(ctx, cleLimite('reinit-ip', ctx.ip), LIMITES.reinitialisationIp)
  const jeton = texte(corps.jeton ?? corps.token)
  const mdp = corps.mot_de_passe ?? corps.password ?? corps.new_password
  if (!jeton || jeton.length > 100) throw new Refus(404, 'invalide', 'Ce lien n’est pas valable.')
  const regle = regleMotDePasse(mdp, espace)
  if (regle) throw new Refus(422, 'regle', MESSAGES[/** @type {keyof typeof MESSAGES} */ (regle)], { regle })
  const t = ctx.maintenant()
  const hash = await hacherMotDePasse(/** @type {string} */ (mdp), ctx.hachage)
  const [c] = await ctx.db.requete(
    `WITH j AS (
       UPDATE jetons SET utilise_le = $2 WHERE jeton_hash = $1 AND type = 'reinitialisation' AND espace = $3 AND utilise_le IS NULL AND expire_le > $2 RETURNING compte_id
     )
     UPDATE comptes SET mdp_hash = $4, maj_le = $2 FROM j WHERE comptes.id = j.compte_id RETURNING comptes.id, comptes.email`,
    [empreinte(jeton), t, espace, hash],
  )
  if (!c) throw await refusJeton(ctx, jeton, 'reinitialisation', espace)
  await ctx.db.requete('DELETE FROM sessions WHERE compte_id = $1', [c.id])
  await ctx.db.requete('DELETE FROM limites WHERE cle = $1', [cleLimite('cnx:' + espace, c.email)])
  return { email: masquerEmail(c.email) }
}

/**
 * Premier accès du propriétaire de la console (ADMIN_BOOTSTRAP_EMAIL) : son mot de passe, avec le code secret
 * ADMIN_BOOTSTRAP_CODE ; une seule fois (dès que le propriétaire a un mot de passe, cette porte est fermée).
 * Sans code configuré, le premier mot de passe passe par « mot de passe oublié » (e-mail).
 * @param {Contexte} ctx @param {Record<string, unknown>} corps
 */
export async function premierAcces(ctx, corps) {
  await exigerSousLimite(ctx, cleLimite('premier-ip', ctx.ip), LIMITES.premierAccesIp)
  const code = ctx.envir.ADMIN_BOOTSTRAP_CODE
  const attendu = lireEmail(ctx.envir.ADMIN_BOOTSTRAP_EMAIL)
  const ferme = new Refus(403, 'ferme', 'Premier accès indisponible.')
  if (!code || code.length < 12 || !attendu) throw ferme
  await assurerProprietaire(ctx)
  const e = lireEmail(corps.email)
  if (!e || !egal(e, attendu) || typeof corps.code !== 'string' || !egal(corps.code, code)) throw ferme
  const regle = regleMotDePasse(corps.mot_de_passe ?? corps.password, 'console')
  if (regle) throw new Refus(422, 'regle', MESSAGES[/** @type {keyof typeof MESSAGES} */ (regle)], { regle })
  const t = ctx.maintenant()
  const [c] = await ctx.db.requete("UPDATE comptes SET mdp_hash = $2, maj_le = $3, conditions_version = $4, conditions_acceptees_le = $3 WHERE espace = 'console' AND email = $1 AND role = 'proprietaire' AND mdp_hash IS NULL RETURNING *", [
    e,
    await hacherMotDePasse(/** @type {string} */ (corps.mot_de_passe ?? corps.password), ctx.hachage),
    t,
    VERSION_CONDITIONS_DEFAUT,
  ])
  if (!c) throw ferme
  return ouvrirDefi(ctx, c, false)
}

// ── Profil et suppression ────────────────────────────────────────────────────────────────────────────────────────

/** @param {Contexte} ctx @param {SessionOuverte} s @param {Record<string, unknown>} corps */
export async function modifierProfil(ctx, s, corps) {
  const champs = /** @type {Record<string, unknown>} */ ({})
  if ('first_name' in corps || 'prenom' in corps) {
    const p = lireNom(corps.first_name ?? corps.prenom)
    if (!p) throw champ('prenom')
    champs.prenom = p
  }
  if ('last_name' in corps || 'nom' in corps) {
    const v = corps.last_name ?? corps.nom
    const n = texte(v) === '' ? '' : lireNom(v)
    if (n === null) throw champ('nom')
    champs.nom = n
  }
  if ('phone' in corps || 'telephone' in corps) {
    const v = corps.phone ?? corps.telephone
    const t = v === null || texte(v) === '' ? null : lireTelephone(v)
    if (t === undefined) throw champ('telephone')
    champs.telephone = t
  }
  if ('avatar' in corps || 'photo' in corps) {
    const p = lirePhoto(corps.avatar ?? corps.photo)
    if (p === undefined) throw new Refus(400, 'photo', 'Photo trop lourde ou d’un format refusé (PNG, JPEG ou WebP, 150 Ko au plus).', { champ: 'photo' })
    champs.photo = p
  }
  const cles = Object.keys(champs)
  if (!cles.length) return compteVu(s.compte)
  const sets = cles.map((k, i) => `${k} = $${i + 2}`).join(', ')
  try {
    const [c] = await ctx.db.requete(`UPDATE comptes SET ${sets}, maj_le = $${cles.length + 2} WHERE id = $1 RETURNING *`, [s.compte.id, ...cles.map((k) => champs[k]), ctx.maintenant()])
    return compteVu(c)
  } catch (e) {
    if (/** @type {{code?: string}} */ (e).code === '23505') throw new Refus(409, 'telephone_pris', 'Ce numéro est déjà celui d’un autre compte.', { champ: 'telephone' })
    throw e
  }
}

/** Suppression réelle : le compte, ses sessions et ses jetons disparaissent de la base. @param {Contexte} ctx @param {SessionOuverte} s @param {Record<string, unknown>} corps */
export async function supprimerCompte(ctx, s, corps) {
  const mdp = corps.mot_de_passe ?? corps.password
  const cle = cleLimite('mdp:' + s.compte.espace, s.compte.id)
  const fin = await bloqueJusqua(ctx, cle, LIMITES.connexionEmail)
  if (fin) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: fin.toISOString() })
  if (!(typeof mdp === 'string' && (await verifierMotDePasse(mdp, s.compte.mdp_hash)))) {
    await compter(ctx, cle, LIMITES.connexionEmail)
    throw new Refus(400, 'mot_de_passe', 'Mot de passe incorrect.', { champ: 'mot_de_passe' })
  }
  await ctx.db.requete('DELETE FROM comptes WHERE id = $1', [s.compte.id])
  await ctx.db.requete('DELETE FROM limites WHERE cle = $1 OR cle = $2', [cle, cleLimite('cnx:' + s.compte.espace, s.compte.email)])
}

// ── Invitations (entreprise → livreur, propriétaire de la console → membre) ──────────────────────────────────────

/** @param {Contexte} ctx @param {SessionOuverte} s @param {Record<string, unknown>} corps */
export async function inviter(ctx, s, corps) {
  const cible = INVITATIONS[/** @type {keyof typeof INVITATIONS} */ (s.compte.espace)]
  const roles = { entreprise: ['proprietaire', 'gerant'], relais: ['gerant'], console: ['proprietaire'] }[/** @type {'entreprise' | 'relais' | 'console'} */ (s.compte.espace)] ?? []
  const peut = cible && s.compte.statut === 'actif' && roles.includes(s.compte.role)
  if (!peut) throw new Refus(403, 'droit_refuse', 'Ce compte ne peut pas inviter.')
  await exigerSousLimite(ctx, cleLimite('invit', s.compte.id), LIMITES.invitationCompte)
  const adresse = lireEmail(corps.email)
  if (!adresse) throw champ('email')
  const prenom = texte(corps.prenom ?? corps.first_name) === '' ? '' : lireNom(corps.prenom ?? corps.first_name)
  const nom = texte(corps.nom ?? corps.last_name) === '' ? '' : lireNom(corps.nom ?? corps.last_name)
  if (prenom === null) throw champ('prenom')
  if (nom === null) throw champ('nom')
  const tel = lireTelephone(corps.telephone ?? corps.phone)
  if (tel === undefined) throw champ('telephone')
  const role = cible === 'livreur' ? 'livreur' : cible === 'relais' ? 'employe' : texte(corps.role) || 'support'
  if (cible === 'console' && !ROLES_CONSOLE.includes(role)) throw champ('role')
  const [deja] = await ctx.db.requete('SELECT 1 FROM comptes WHERE espace = $1 AND email = $2', [cible, adresse])
  if (deja) throw new Refus(409, 'existe', 'Cette adresse a déjà un compte dans cet espace.')
  const t = ctx.maintenant()
  const jeton = nouveauJeton()
  const expire = plus(t, DUREES.invitationH * HEURE)
  await ctx.db.requete("INSERT INTO jetons (jeton_hash, type, espace, invite_par, email, donnees, cree_le, expire_le) VALUES ($1, 'invitation', $2, $3, $4, $5, $6, $7)", [
    empreinte(jeton),
    cible,
    s.compte.id,
    adresse,
    JSON.stringify({ prenom, nom, telephone: tel ?? null, role }),
    t,
    expire,
  ])
  const lien = adresseLien(ctx, LIENS.invitation[/** @type {keyof typeof LIENS.invitation} */ (cible)], jeton)
  let envoye = false
  if (ctx.envoyeur)
    envoye = await ctx.envoyeur.envoyer({
      a: adresse,
      sujet: cible === 'livreur' ? 'BelivaY · votre accès livreur' : cible === 'relais' ? 'BelivaY · votre accès au point relais' : 'BelivaY · votre accès à la console',
      texte: `Bonjour${prenom ? ' ' + prenom : ''},\n\n${s.compte.prenom || 'Votre responsable'} vous invite sur BelivaY. Créez votre accès avec ce lien (valable ${DUREES.invitationH} heures, une seule fois) :\n${lien}\n\nBelivaY`,
    })
  // L'invitant reçoit toujours le lien : il peut le transmettre lui-même (WhatsApp, SMS) si l'e-mail ne part pas.
  return { lien, envoye, expire_le: expire.toISOString() }
}

/** Invitation ouverte (avant de créer l'accès). @param {Contexte} ctx @param {string} espace @param {string} jeton */
export async function lireInvitation(ctx, espace, jeton) {
  if (!jeton || jeton.length > 100) throw new Refus(404, 'invalide', 'Ce lien n’est pas valable.')
  const [j] = await ctx.db.requete(
    `SELECT j.email, j.donnees, j.expire_le, c.prenom AS invitant_prenom, c.candidature->>'nom' AS organisation FROM jetons j LEFT JOIN comptes c ON c.id = j.invite_par
     WHERE j.jeton_hash = $1 AND j.type = 'invitation' AND j.espace = $2 AND j.utilise_le IS NULL AND j.expire_le > $3`,
    [empreinte(jeton), espace, ctx.maintenant()],
  )
  if (!j) throw await refusJeton(ctx, jeton, 'invitation', espace)
  return { email: masquerEmail(j.email), prenom: j.donnees.prenom ?? '', nom: j.donnees.nom ?? '', role: j.donnees.role ?? null, invitant: j.invitant_prenom ?? null, organisation: j.organisation ?? null, expire_le: new Date(j.expire_le).toISOString() }
}

// ── Console : voir et valider les comptes (propriétaire seulement) ───────────────────────────────────────────────

/** @param {SessionOuverte} s */
function exigerProprietaire(s) {
  if (s.compte.espace !== 'console' || s.compte.role !== 'proprietaire' || s.compte.statut !== 'actif') throw new Refus(403, 'droit_refuse', 'Réservé au propriétaire de la console.')
}

/** @param {Contexte} ctx @param {SessionOuverte} s @param {URLSearchParams} q */
export async function listerComptes(ctx, s, q) {
  exigerProprietaire(s)
  const espace = q.get('filtre_espace')
  const statut = q.get('statut')
  if (espace && !ESPACES.includes(espace)) throw champ('espace')
  if (statut && !STATUTS.includes(statut)) throw champ('statut')
  const l = await ctx.db.requete(
    `SELECT id, espace, email, telephone, prenom, nom, role, statut, type_compte, organisation_id, candidature, conditions_version, conditions_acceptees_le, cree_le
     FROM comptes WHERE ($1::text IS NULL OR espace = $1) AND ($2::text IS NULL OR statut = $2) ORDER BY cree_le DESC LIMIT 500`,
    [espace || null, statut || null],
  )
  return l.map((c) => ({ ...compteVu({ ...c, mdp_hash: null }), candidature: c.candidature }))
}

/** @param {Contexte} ctx @param {SessionOuverte} s @param {string} id @param {Record<string, unknown>} corps */
export async function changerStatut(ctx, s, id, corps) {
  exigerProprietaire(s)
  const statut = texte(corps.statut)
  if (!STATUTS.includes(statut)) throw champ('statut')
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === s.compte.id) throw new Refus(404, 'introuvable', 'Compte introuvable.')
  const [c] = await ctx.db.requete('UPDATE comptes SET statut = $2, maj_le = $3 WHERE id = $1 RETURNING *', [id, statut, ctx.maintenant()])
  if (!c) throw new Refus(404, 'introuvable', 'Compte introuvable.')
  if (statut === 'refuse' || statut === 'suspendu') await ctx.db.requete('DELETE FROM sessions WHERE compte_id = $1', [id])
  return compteVu(c)
}

/** @param {Contexte} ctx @param {SessionOuverte} s @param {string} id */
export async function supprimerParConsole(ctx, s, id) {
  exigerProprietaire(s)
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === s.compte.id) throw new Refus(404, 'introuvable', 'Compte introuvable.')
  const r = await ctx.db.requete('DELETE FROM comptes WHERE id = $1 RETURNING id', [id])
  if (!r.length) throw new Refus(404, 'introuvable', 'Compte introuvable.')
}

// ── Second facteur de la console (TOTP, RFC 6238) ────────────────────────────────────────────────────────────────

/** @param {Contexte} ctx */
function exigerCleTotp(ctx) {
  const k = cleTotp(ctx.envir.TOTP_CLE)
  if (!k) throw new Refus(503, 'totp_indisponible', 'La console n’est pas encore ouverte : le second facteur n’est pas configuré (TOTP_CLE).')
  return k
}

/**
 * Mot de passe juste pour la console : un défi de 5 minutes, sans session. Le code de l'application d'authentification
 * (ou un code de secours) l'échange contre la session ; premier accès : enrôlement d'abord.
 * @param {Contexte} ctx @param {Record<string, any>} compte @param {boolean} seSouvenir
 */
async function ouvrirDefi(ctx, compte, seSouvenir) {
  exigerCleTotp(ctx)
  const t = ctx.maintenant()
  const defi = nouveauJeton()
  const expire = plus(t, DUREES.defiMin * MIN)
  await ctx.db.requete('DELETE FROM defis WHERE compte_id = $1 AND utilise_le IS NULL', [compte.id])
  await ctx.db.requete('INSERT INTO defis (jeton_hash, compte_id, espace, se_souvenir, cree_le, expire_le) VALUES ($1, $2, $3, $4, $5, $6)', [empreinte(defi), compte.id, compte.espace, seSouvenir, t, expire])
  return { defi, deuxieme_facteur: compte.totp_actif ? 'totp' : 'enrolement', expire_le: expire.toISOString(), prenom: compte.prenom, nom: compte.nom }
}

/** @param {Contexte} ctx @param {unknown} defi */
async function lireDefi(ctx, defi) {
  const d = texte(defi)
  const perime = new Refus(410, 'defi_expire', 'Reprenez la connexion depuis le mot de passe.')
  if (!d || d.length > 100) throw perime
  const [l] = await ctx.db.requete(
    `SELECT d.jeton_hash, d.se_souvenir, d.essais, c.* FROM defis d JOIN comptes c ON c.id = d.compte_id
     WHERE d.jeton_hash = $1 AND d.utilise_le IS NULL AND d.expire_le > $2 AND d.essais < $3`,
    [empreinte(d), ctx.maintenant(), DUREES.defiEssais],
  )
  if (!l || l.statut === 'refuse' || l.statut === 'suspendu') throw perime
  return l
}

/** QR d'enrôlement (SVG) et secret à saisir à la main ; le secret est gardé chiffré, actif seulement après un code juste. @param {Contexte} ctx @param {Record<string, unknown>} corps */
export async function enrolerTotp(ctx, corps) {
  const cle = exigerCleTotp(ctx)
  const c = await lireDefi(ctx, corps.defi)
  if (c.totp_actif) throw new Refus(409, 'deja_enrole', 'Le second facteur est déjà en place pour ce compte.')
  const secret = nouveauSecret()
  await ctx.db.requete('UPDATE comptes SET totp_chiffre = $2, totp_dernier_pas = NULL, maj_le = $3 WHERE id = $1', [c.id, chiffrer(cle, secret), ctx.maintenant()])
  const s32 = base32(secret)
  const uri = otpauth(s32, c.email)
  const { default: QR } = await import('qrcode')
  const svg = await QR.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
  return { secret: s32.replace(/(.{4})/g, '$1 ').trim(), otpauth: uri, qr: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64') }
}

/**
 * Code de l'application (6 chiffres, ±1 pas, jamais deux fois le même) ou code de secours (une fois) : la session
 * s'ouvre. Enrôlement : le premier code juste active le second facteur et rend les dix codes de secours (une seule fois).
 * @param {Contexte} ctx @param {Record<string, unknown>} corps @param {string | null} ancien
 */
export async function verifierDeuxiemeFacteur(ctx, corps, ancien) {
  const cle = exigerCleTotp(ctx)
  const c = await lireDefi(ctx, corps.defi)
  const limite = cleLimite('2fa', c.id)
  const fin = await bloqueJusqua(ctx, limite, LIMITES.deuxiemeFacteur)
  if (fin) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: fin.toISOString() })
  if (!c.totp_chiffre) throw new Refus(409, 'enrolement_requis', 'Enrôlez d’abord votre application d’authentification.')
  const code = texte(corps.code).replace(/\s/g, '')
  const t = ctx.maintenant()
  let pas = null
  let secours = null
  if (/^\d{6}$/.test(code)) pas = verifierTotp(dechiffrer(cle, c.totp_chiffre), code, t, c.totp_dernier_pas === null ? null : Number(c.totp_dernier_pas))
  else if (c.totp_actif && /^[A-Za-z2-7]{4}-?[A-Za-z2-7]{4}$/.test(code)) {
    const e = empreinteSecours(code)
    const liste = /** @type {string[]} */ (c.codes_secours ?? [])
    if (liste.includes(e)) secours = e
  }
  if (pas === null && secours === null) {
    await ctx.db.requete('UPDATE defis SET essais = essais + 1 WHERE jeton_hash = $1', [c.jeton_hash])
    const n = await compter(ctx, limite, LIMITES.deuxiemeFacteur)
    if (n.atteinte) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: n.fin.toISOString() })
    throw new Refus(401, 'code_faux', 'Code incorrect.', { essais_restants: Math.min(LIMITES.deuxiemeFacteur[0] - n.nombre, DUREES.defiEssais - c.essais - 1) })
  }
  // Le défi ne sert qu'une fois (deux requêtes simultanées : une seule passe).
  const [pris] = await ctx.db.requete('UPDATE defis SET utilise_le = $2 WHERE jeton_hash = $1 AND utilise_le IS NULL RETURNING jeton_hash', [c.jeton_hash, t])
  if (!pris) throw new Refus(410, 'defi_expire', 'Reprenez la connexion depuis le mot de passe.')
  await ctx.db.requete('DELETE FROM limites WHERE cle = $1', [limite])
  /** @type {string[] | undefined} */
  let codes
  if (!c.totp_actif) {
    codes = nouveauxCodesSecours()
    await ctx.db.requete('UPDATE comptes SET totp_actif = true, totp_dernier_pas = $2, codes_secours = $3, maj_le = $4 WHERE id = $1', [c.id, pas, JSON.stringify(codes.map(empreinteSecours)), t])
  } else if (pas !== null) await ctx.db.requete('UPDATE comptes SET totp_dernier_pas = $2 WHERE id = $1 AND (totp_dernier_pas IS NULL OR totp_dernier_pas < $2)', [c.id, pas])
  else await ctx.db.requete('UPDATE comptes SET codes_secours = codes_secours - $2::text WHERE id = $1', [c.id, secours])
  const [compte] = await ctx.db.requete('SELECT * FROM comptes WHERE id = $1', [c.id])
  const o = await ouvrirSession(ctx, compte, c.se_souvenir, ancien)
  return { ...o, codesSecours: codes }
}

/** Nouveaux codes de secours (les anciens ne valent plus) ; mot de passe demandé. @param {Contexte} ctx @param {SessionOuverte} s @param {Record<string, unknown>} corps */
export async function regenererCodesSecours(ctx, s, corps) {
  if (s.compte.espace !== 'console') throw new Refus(404, 'route', 'Route inconnue.')
  const cle = cleLimite('mdp:' + s.compte.espace, s.compte.id)
  const fin = await bloqueJusqua(ctx, cle, LIMITES.connexionEmail)
  if (fin) throw new Refus(429, 'bloque', MESSAGES.bloque, { jusqua: fin.toISOString() })
  if (!(typeof corps.mot_de_passe === 'string' && (await verifierMotDePasse(corps.mot_de_passe, s.compte.mdp_hash)))) {
    await compter(ctx, cle, LIMITES.connexionEmail)
    throw new Refus(400, 'mot_de_passe', 'Mot de passe incorrect.', { champ: 'mot_de_passe' })
  }
  const codes = nouveauxCodesSecours()
  await ctx.db.requete('UPDATE comptes SET codes_secours = $2, maj_le = $3 WHERE id = $1', [s.compte.id, JSON.stringify(codes.map(empreinteSecours)), ctx.maintenant()])
  return { codes_secours: codes }
}

// ── Export des données personnelles (droit d'accès et de portabilité) ────────────────────────────────────────────

/**
 * Tout ce que le serveur des comptes garde sur la personne, en JSON lisible : compte, consentement, appareils connectés,
 * invitations envoyées. Jamais d'empreinte de mot de passe, de secret du second facteur ni de code de secours.
 * @param {Contexte} ctx @param {SessionOuverte} s
 */
export async function exporter(ctx, s) {
  const c = s.compte
  const sessions = await ctx.db.requete('SELECT appareil, cree_le, vu_le, expire_le FROM sessions WHERE compte_id = $1 ORDER BY cree_le', [c.id])
  const invitations = await ctx.db.requete("SELECT espace, email, cree_le, expire_le, utilise_le FROM jetons WHERE invite_par = $1 AND type = 'invitation' ORDER BY cree_le", [c.id])
  const iso = (/** @type {unknown} */ d) => (d ? new Date(/** @type {string} */ (d)).toISOString() : null)
  return {
    exporte_le: ctx.maintenant().toISOString(),
    compte: {
      espace: c.espace,
      email: c.email,
      telephone: c.telephone ?? null,
      prenom: c.prenom,
      nom: c.nom,
      photo: c.photo ?? null,
      role: c.role,
      statut: c.statut,
      type_compte: c.type_compte,
      pays: c.pays ?? null,
      candidature: c.candidature ?? {},
      second_facteur: !!c.totp_actif,
      cree_le: iso(c.cree_le),
      modifie_le: iso(c.maj_le),
    },
    consentement: c.conditions_version ? { version: c.conditions_version, accepte_le: iso(c.conditions_acceptees_le) } : null,
    appareils_connectes: sessions.map((x) => ({ appareil: x.appareil, ouvert_le: iso(x.cree_le), vu_le: iso(x.vu_le), expire_le: iso(x.expire_le) })),
    invitations_envoyees: invitations.map((x) => ({ espace: x.espace, email: x.email, envoyee_le: iso(x.cree_le), expire_le: iso(x.expire_le), utilisee_le: iso(x.utilise_le) })),
  }
}

/** Journal des erreurs du serveur (console, propriétaire) : route et code, jamais de donnée personnelle. @param {Contexte} ctx @param {SessionOuverte} s */
export async function lireJournal(ctx, s) {
  exigerProprietaire(s)
  const l = await ctx.db.requete('SELECT le, niveau, route, code FROM journal_serveur ORDER BY le DESC LIMIT 200')
  return l.map((x) => ({ le: new Date(x.le).toISOString(), niveau: x.niveau, route: x.route, code: x.code }))
}
