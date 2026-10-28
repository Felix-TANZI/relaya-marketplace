// Tests des comptes réels contre un vrai Postgres en mémoire (PGlite) : `npm run test:comptes`.
// Chaque test passe par le routeur HTTP (mêmes requêtes que les applications : cookie, origine, JSON).
import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { baseMemoire } from './base-memoire.js'
import { MIGRATIONS, migrer, revenir } from './base.js'
import { envoyeurMemoire } from './envoyeur.js'
import { creerRouteur } from './routeur.js'
import { hacherMotDePasse, verifierMotDePasse } from './secrets.js'
import { deBase32, hotp, pasDe } from './totp.js'

const ORIGINE = 'http://localhost:4300'
/** @type {Awaited<ReturnType<typeof baseMemoire>>} */
let db
let horloge = new Date('2026-10-25T10:00:00Z')
const avancer = (ms) => (horloge = new Date(horloge.getTime() + ms))
/** @type {ReturnType<typeof envoyeurMemoire> | null} */
let boite = envoyeurMemoire()
/** @type {Record<string, string>} */
let envir = {}
const routeur = () => creerRouteur({ base: async () => db, envoyeur: boite, maintenant: () => horloge, envir, hachage: { N: 1024, r: 8, p: 1 } })
let traiter = routeur()

/** Un navigateur : garde ses cookies d'une requête à l'autre. */
function navigateur(ip = '10.0.0.1') {
  /** @type {Map<string, string>} */
  const pot = new Map()
  return {
    pot,
    /** @param {string} methode @param {string} chemin @param {unknown} [corps] @param {Record<string, string>} [entetes] */
    async appel(methode, chemin, corps, entetes = {}) {
      const h = new Headers({ origin: ORIGINE, 'x-real-ip': ip, 'user-agent': 'Mozilla/5.0 (Macintosh; Mac OS X) Chrome/140', ...entetes })
      if (corps !== undefined) h.set('content-type', 'application/json')
      if (pot.size) h.set('cookie', [...pot].map(([k, v]) => `${k}=${v}`).join('; '))
      const r = await traiter(new Request(ORIGINE + chemin, { method: methode, headers: h, body: corps === undefined ? undefined : JSON.stringify(corps) }))
      for (const c of r.headers.getSetCookie()) {
        const [kv, ...attr] = c.split('; ')
        const [k, v] = kv.split('=')
        if (attr.includes('Max-Age=0') || v === '') pot.delete(k)
        else pot.set(k, v)
      }
      const texte = await r.text()
      return { statut: r.status, corps: texte ? JSON.parse(texte) : null, entetes: r.headers }
    },
  }
}

const TOTP_CLE = 'cle-de-test-du-second-facteur-0123456789'
/** Code de l'application d'authentification à l'heure de l'horloge (décalage en pas de 30 s). */
const codeTotp = (secret, decalage = 0) => hotp(deBase32(secret), pasDe(horloge) + decalage)
/** Mot de passe juste puis enrôlement (QR) et premier code : la session de la console s'ouvre. */
async function enroler(n, defi) {
  const e = await n.appel('POST', '/api/auth/2fa/enrolement?espace=console', { defi })
  assert.equal(e.statut, 200)
  assert.match(e.corps.qr, /^data:image\/svg\+xml;base64,/)
  assert.match(e.corps.otpauth, /^otpauth:\/\/totp\//)
  const v = await n.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi, code: codeTotp(e.corps.secret) })
  assert.equal(v.statut, 200)
  return { secret: e.corps.secret, codes: v.corps.codes_secours, user: v.corps.user }
}

const INSCRIPTION = { email: 'awa@example.cm', password: 'Soleil2026x', first_name: 'Awa', conditions_acceptees: true, conditions_version: '2026-10' }

before(async () => {
  db = await baseMemoire()
})
after(async () => db.fermer())
beforeEach(async () => {
  await db.requete('DROP TABLE IF EXISTS journal_serveur, defis, limites, jetons, sessions, comptes, schema_comptes CASCADE')
  horloge = new Date('2026-10-25T10:00:00Z')
  boite = envoyeurMemoire()
  envir = {}
  traiter = routeur()
})

describe('mots de passe', () => {
  it('scrypt : sel unique, vérification exacte', async () => {
    const a = await hacherMotDePasse('Soleil2026x', { N: 1024, r: 8, p: 1 })
    const b = await hacherMotDePasse('Soleil2026x', { N: 1024, r: 8, p: 1 })
    assert.notEqual(a, b)
    assert.match(a, /^scrypt\$1024\$8\$1\$/)
    assert.equal(await verifierMotDePasse('Soleil2026x', a), true)
    assert.equal(await verifierMotDePasse('soleil2026x', a), false)
    assert.equal(await verifierMotDePasse('x', null), false)
  })
})

describe('inscription et connexion', () => {
  it('inscription : compte créé, session ouverte par cookie HttpOnly, consentement daté', async () => {
    const n = navigateur()
    const r = await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    assert.equal(r.statut, 201)
    assert.equal(r.corps.user.email, 'awa@example.cm')
    assert.equal(r.corps.user.statut, 'actif')
    assert.equal(r.corps.user.conditions.version, '2026-10')
    assert.equal(r.corps.user.conditions.acceptees_le, horloge.toISOString())
    const c = r.entetes.getSetCookie()[0]
    assert.match(c, /^blv_s_client=/)
    assert.match(c, /HttpOnly/)
    assert.match(c, /SameSite=Lax/)
    const me = await n.appel('GET', '/api/auth/me/')
    assert.equal(me.statut, 200)
    assert.equal(me.corps.user.first_name, 'Awa')
    assert.equal(JSON.stringify(me.corps).includes('scrypt'), false)
  })

  it('HTTPS : cookie __Host- et Secure', async () => {
    const r = await navigateur().appel('POST', '/api/auth/register/', INSCRIPTION, { 'x-forwarded-proto': 'https' })
    const c = r.entetes.getSetCookie()[0]
    assert.match(c, /^__Host-blv_s_client=/)
    assert.match(c, /Secure/)
  })

  it('doublon refusé (409), même adresse en majuscules', async () => {
    await navigateur().appel('POST', '/api/auth/register/', INSCRIPTION)
    const r = await navigateur().appel('POST', '/api/auth/register/', { ...INSCRIPTION, email: 'AWA@example.cm' })
    assert.equal(r.statut, 409)
    assert.equal(r.corps.error.code, 'existe')
  })

  it('entrées strictes : e-mail, mot de passe faible, mot de passe de la démonstration, conditions', async () => {
    const n = navigateur()
    assert.equal((await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, email: 'pas-un-email' })).corps.error.code, 'email')
    assert.equal((await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, password: 'court1' })).corps.error.code, 'mot_de_passe')
    assert.equal((await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, password: 'Belivay2026' })).corps.error.code, 'mot_de_passe_demo')
    assert.equal((await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, conditions_acceptees: false })).corps.error.code, 'conditions')
    assert.equal((await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, first_name: '<script>' })).corps.error.code, 'prenom')
  })

  it('reconnexion après déconnexion ; mauvais mot de passe : même réponse que pour une adresse inconnue', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    assert.equal((await n.appel('POST', '/api/auth/logout/', {})).statut, 204)
    assert.equal((await n.appel('GET', '/api/auth/me/')).statut, 401)
    const faux = await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: 'Mauvais2026' })
    const inconnu = await n.appel('POST', '/api/auth/login/', { username: 'personne@example.cm', password: 'Mauvais2026' })
    assert.equal(faux.statut, 401)
    assert.deepEqual(Object.keys(faux.corps.error), Object.keys(inconnu.corps.error))
    assert.equal(faux.corps.error.message, inconnu.corps.error.message)
    assert.equal(faux.corps.error.code, inconnu.corps.error.code)
    const bon = await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password })
    assert.equal(bon.statut, 200)
    assert.equal((await n.appel('GET', '/api/auth/me/')).corps.user.email, INSCRIPTION.email)
  })

  it('limite de tentatives par adresse : 5 faux, puis bloqué 15 min même avec le bon mot de passe', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    for (let i = 0; i < 4; i++) assert.equal((await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: 'Mauvais2026' })).statut, 401)
    const cinquieme = await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: 'Mauvais2026' })
    assert.equal(cinquieme.statut, 429)
    assert.equal(cinquieme.corps.error.code, 'bloque')
    assert.equal((await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password })).statut, 429)
    avancer(16 * 60_000)
    assert.equal((await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password })).statut, 200)
  })

  it('limite par adresse IP sur les inscriptions', async () => {
    const n = navigateur('10.9.9.9')
    for (let i = 0; i < 10; i++) await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, email: `x${i}@example.cm` })
    const r = await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, email: 'x99@example.cm' })
    assert.equal(r.statut, 429)
    assert.equal((await navigateur('10.9.9.8').appel('POST', '/api/auth/register/', { ...INSCRIPTION, email: 'x99@example.cm' })).statut, 201)
  })

  it('origine : une écriture d’un autre site est refusée', async () => {
    const r = await navigateur().appel('POST', '/api/auth/register/', INSCRIPTION, { origin: 'https://pirate.example' })
    assert.equal(r.statut, 403)
    assert.equal(r.corps.error.code, 'origine')
  })

  it('espaces séparés : le cookie du client n’ouvre pas le vendeur', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    assert.equal((await n.appel('GET', '/api/auth/me/?espace=vendeur')).statut, 401)
    const v = await n.appel('POST', '/api/auth/register/?espace=vendeur', { ...INSCRIPTION, candidature: { boutique: 'Awa Mode' } })
    assert.equal(v.statut, 201)
    assert.equal(v.corps.user.statut, 'en_attente')
    assert.equal(v.corps.user.espace, 'vendeur')
  })
})

describe('sessions', () => {
  it('expirée : sans « se souvenir », 12 h au plus', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, se_souvenir: false })
    avancer(11 * 3600_000)
    assert.equal((await n.appel('GET', '/api/auth/me/')).statut, 200)
    avancer(2 * 3600_000)
    assert.equal((await n.appel('GET', '/api/auth/me/')).statut, 401)
  })

  it('révoquée à distance ; une session par appareil', async () => {
    const tel = navigateur()
    const pc = navigateur()
    await tel.appel('POST', '/api/auth/register/', INSCRIPTION)
    await pc.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password })
    await pc.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password }) // même appareil : remplace
    const l = (await pc.appel('GET', '/api/auth/sessions')).corps.sessions
    assert.equal(l.length, 2)
    const autre = l.find((s) => !s.courante)
    assert.equal(autre.appareil, 'Chrome · macOS')
    assert.equal((await pc.appel('DELETE', '/api/auth/sessions/' + autre.id)).statut, 204)
    assert.equal((await tel.appel('GET', '/api/auth/me/')).statut, 401)
    assert.equal((await pc.appel('GET', '/api/auth/me/')).statut, 200)
  })

  it('changer le mot de passe ferme les autres appareils', async () => {
    const tel = navigateur()
    const pc = navigateur()
    await tel.appel('POST', '/api/auth/register/', INSCRIPTION)
    await pc.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: INSCRIPTION.password })
    assert.equal((await pc.appel('POST', '/api/auth/change-password/', { old_password: 'faux', new_password: 'Nouveau2027y' })).corps.error.code, 'old_password')
    assert.equal((await pc.appel('POST', '/api/auth/change-password/', { old_password: INSCRIPTION.password, new_password: 'Nouveau2027y' })).statut, 200)
    assert.equal((await tel.appel('GET', '/api/auth/me/')).statut, 401)
    assert.equal((await pc.appel('GET', '/api/auth/me/')).statut, 200)
    assert.equal((await navigateur().appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: 'Nouveau2027y' })).statut, 200)
  })
})

describe('profil et suppression', () => {
  it('profil : nom, téléphone, photo limitée', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    const png = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]).toString('base64')
    const r = await n.appel('PATCH', '/api/auth/profile', { last_name: 'Ngono', phone: '677 12 34 56', avatar: png })
    assert.equal(r.statut, 200)
    assert.equal(r.corps.user.phone, '+237677123456')
    assert.equal(r.corps.user.avatar_url, png)
    const lourde = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(200_000)]).toString('base64')
    assert.equal((await n.appel('PATCH', '/api/auth/profile', { avatar: lourde })).statut, 400)
    assert.equal((await n.appel('PATCH', '/api/auth/profile', { avatar: 'data:image/png;base64,' + Buffer.alloc(64).toString('base64') })).corps.error.code, 'photo')
  })

  it('suppression réelle : le compte et ses sessions disparaissent de la base', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    assert.equal((await n.appel('DELETE', '/api/auth/account', { mot_de_passe: 'faux' })).statut, 400)
    assert.equal((await n.appel('DELETE', '/api/auth/account', { mot_de_passe: INSCRIPTION.password })).statut, 204)
    assert.equal((await db.requete('SELECT count(*)::int n FROM comptes'))[0].n, 0)
    assert.equal((await db.requete('SELECT count(*)::int n FROM sessions'))[0].n, 0)
    assert.equal((await n.appel('GET', '/api/auth/me/')).statut, 401)
    assert.equal((await n.appel('POST', '/api/auth/register/', INSCRIPTION)).statut, 201)
  })
})

describe('mot de passe oublié', () => {
  const lienRecu = () => new URL(/http\S+/.exec(boite.boite.at(-1).texte)[0]).searchParams.get('jeton')

  it('même réponse que l’adresse ait un compte ou non ; jeton à usage unique', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    const connu = await n.appel('POST', '/api/auth/password/forgot', { email: INSCRIPTION.email })
    const inconnu = await n.appel('POST', '/api/auth/password/forgot', { email: 'personne@example.cm' })
    assert.equal(connu.statut, 202)
    assert.equal(inconnu.statut, 202)
    assert.deepEqual(Object.keys(connu.corps), Object.keys(inconnu.corps))
    assert.equal(boite.boite.length, 1)
    const jeton = lienRecu()
    assert.equal((await n.appel('GET', '/api/auth/password/reset?jeton=' + jeton)).statut, 200)
    assert.equal((await n.appel('POST', '/api/auth/password/reset', { jeton, mot_de_passe: 'court' })).statut, 422) // ne consomme pas le jeton
    assert.equal((await n.appel('POST', '/api/auth/password/reset', { jeton, mot_de_passe: 'Neuf2026zz' })).statut, 200)
    const encore = await n.appel('POST', '/api/auth/password/reset', { jeton, mot_de_passe: 'Autre2026zz' })
    assert.equal(encore.statut, 410)
    assert.equal(encore.corps.error.code, 'utilise')
    assert.equal((await n.appel('GET', '/api/auth/me/')).statut, 401) // toutes les sessions sont fermées
    assert.equal((await n.appel('POST', '/api/auth/login/', { username: INSCRIPTION.email, password: 'Neuf2026zz' })).statut, 200)
  })

  it('jeton expiré après 30 min ; jeton inconnu', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    await n.appel('POST', '/api/auth/password/forgot', { email: INSCRIPTION.email })
    const jeton = lienRecu()
    avancer(31 * 60_000)
    assert.equal((await n.appel('POST', '/api/auth/password/reset', { jeton, mot_de_passe: 'Neuf2026zz' })).corps.error.code, 'expire')
    assert.equal((await n.appel('POST', '/api/auth/password/reset', { jeton: 'inconnu', mot_de_passe: 'Neuf2026zz' })).statut, 404)
  })

  it('sans envoyeur : aucun e-mail, le parcours renvoie vers le support', async () => {
    boite = null
    traiter = routeur()
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    const r = await n.appel('POST', '/api/auth/password/forgot', { email: INSCRIPTION.email })
    assert.equal(r.statut, 202)
    assert.equal(r.corps.envoi, 'support')
    assert.equal((await db.requete("SELECT count(*)::int n FROM jetons"))[0].n, 0)
  })
})

describe('invitations et console', () => {
  it('livreur : seulement par invitation d’une entreprise validée ; jeton à usage unique', async () => {
    const ent = navigateur()
    const r = await ent.appel('POST', '/api/auth/register/?espace=entreprise', { ...INSCRIPTION, email: 'gerante@yafe.cm', candidature: { nom: 'Yafé Express', quartier: 'Mokolo' } })
    assert.equal(r.corps.user.statut, 'en_attente')
    assert.equal((await ent.appel('POST', '/api/auth/invitations?espace=entreprise', { email: 'serge@example.cm' })).statut, 403) // pas encore validée
    await db.requete("UPDATE comptes SET statut = 'actif' WHERE email = 'gerante@yafe.cm'")
    const inv = await ent.appel('POST', '/api/auth/invitations?espace=entreprise', { email: 'serge@example.cm', prenom: 'Serge', telephone: '690112233' })
    assert.equal(inv.statut, 201)
    const jeton = new URL(inv.corps.lien).searchParams.get('invitation')
    const liv = navigateur()
    assert.equal((await liv.appel('POST', '/api/auth/register/?espace=livreur', { password: 'Moto2026ok', conditions_acceptees: true })).statut, 403)
    const lu = await liv.appel('GET', '/api/auth/invitations/' + jeton + '?espace=livreur')
    assert.equal(lu.corps.organisation, 'Yafé Express')
    const cree = await liv.appel('POST', '/api/auth/register/?espace=livreur', { jeton, password: '482915', conditions_acceptees: true })
    assert.equal(cree.statut, 201)
    assert.equal(cree.corps.user.email, 'serge@example.cm')
    assert.equal(cree.corps.user.phone, '+237690112233')
    assert.ok(cree.corps.user.organisation_id)
    assert.equal((await navigateur().appel('POST', '/api/auth/register/?espace=livreur', { jeton, password: 'Moto2026ok', conditions_acceptees: true })).statut, 410)
    assert.equal((await liv.appel('POST', '/api/auth/login/?espace=livreur', { username: '690112233', password: '482915' })).statut, 200)
  })

  it('console : propriétaire créé par ADMIN_BOOTSTRAP_EMAIL, premier mot de passe avec le code, valide les comptes', async () => {
    envir = { ADMIN_BOOTSTRAP_EMAIL: 'porteur@belivay.com', ADMIN_BOOTSTRAP_CODE: 'code-tres-secret-42', TOTP_CLE }
    traiter = routeur()
    const n = navigateur()
    assert.equal((await n.appel('POST', '/api/auth/login/?espace=console', { username: 'porteur@belivay.com', password: 'Quelconque1' })).statut, 401)
    assert.equal((await n.appel('POST', '/api/auth/console/premier-acces?espace=console', { email: 'porteur@belivay.com', code: 'faux', mot_de_passe: 'Console2026ok' })).statut, 403)
    const ok = await n.appel('POST', '/api/auth/console/premier-acces?espace=console', { email: 'porteur@belivay.com', code: 'code-tres-secret-42', mot_de_passe: 'Console2026ok' })
    assert.equal(ok.statut, 200)
    assert.equal(ok.corps.deuxieme_facteur, 'enrolement')
    assert.equal(ok.entetes.getSetCookie().length, 0) // pas de session avant le second facteur
    assert.equal((await n.appel('GET', '/api/auth/me/?espace=console')).statut, 401)
    const { user } = await enroler(n, ok.corps.defi)
    assert.equal(user.role, 'proprietaire')
    assert.equal(user.deuxieme_facteur, true)
    assert.equal((await navigateur().appel('POST', '/api/auth/console/premier-acces?espace=console', { email: 'porteur@belivay.com', code: 'code-tres-secret-42', mot_de_passe: 'Autre2026ok' })).statut, 403)
    // Un vendeur en attente, validé depuis la console.
    await navigateur().appel('POST', '/api/auth/register/?espace=vendeur', { ...INSCRIPTION })
    const l = (await n.appel('GET', '/api/admin/comptes?espace=console&statut=en_attente')).corps.comptes
    assert.equal(l.length, 1)
    assert.equal((await n.appel('POST', `/api/admin/comptes/${l[0].id}/statut?espace=console`, { statut: 'actif' })).corps.user.statut, 'actif')
    // Membre invité par le propriétaire.
    const inv = await n.appel('POST', '/api/auth/invitations?espace=console', { email: 'nadege@belivay.com', role: 'finance' })
    const jeton = new URL(inv.corps.lien).searchParams.get('jeton')
    const nadege = navigateur()
    const m = await nadege.appel('POST', '/api/auth/register/?espace=console', { jeton, password: 'Finance2026', first_name: 'Nadège', conditions_acceptees: true })
    assert.equal(m.corps.deuxieme_facteur, 'enrolement')
    assert.equal((await enroler(nadege, m.corps.defi)).user.role, 'finance')
    assert.equal((await navigateur().appel('GET', '/api/admin/comptes?espace=vendeur')).statut, 403)
  })

  it('base absente : 503 « base_absente », et /etat le dit', async () => {
    traiter = creerRouteur({ base: async () => null, envoyeur: null })
    const n = navigateur()
    assert.deepEqual((await n.appel('GET', '/api/auth/etat')).corps, { base: false, email: false, premier_acces: false })
    const r = await n.appel('POST', '/api/auth/login/', { username: 'a@b.cm', password: 'x' })
    assert.equal(r.statut, 503)
    assert.equal(r.corps.error.code, 'base_absente')
  })

  it('réécriture Vercel : /api/comptes?chemin=auth/me', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/comptes?chemin=auth/register/', INSCRIPTION)
    assert.equal((await n.appel('GET', '/api/comptes?chemin=auth/me')).statut, 200)
  })
})

describe('second facteur de la console (TOTP)', () => {
  /** Propriétaire enrôlé, déconnecté : rend son secret et ses codes de secours. */
  async function proprietaire() {
    envir = { ADMIN_BOOTSTRAP_EMAIL: 'porteur@belivay.com', ADMIN_BOOTSTRAP_CODE: 'code-tres-secret-42', TOTP_CLE }
    traiter = routeur()
    const n = navigateur()
    const ok = await n.appel('POST', '/api/auth/console/premier-acces?espace=console', { email: 'porteur@belivay.com', code: 'code-tres-secret-42', mot_de_passe: 'Console2026ok' })
    const r = await enroler(n, ok.corps.defi)
    await n.appel('POST', '/api/auth/logout/?espace=console', {})
    return { n, ...r }
  }
  const motDePasse = (n) => n.appel('POST', '/api/auth/login/?espace=console', { username: 'porteur@belivay.com', password: 'Console2026ok' })

  it('secret chiffré au repos ; dix codes de secours dont seule l’empreinte est gardée', async () => {
    const { secret, codes } = await proprietaire()
    assert.equal(codes.length, 10)
    const [c] = await db.requete("SELECT totp_chiffre, codes_secours FROM comptes WHERE espace = 'console'")
    assert.match(c.totp_chiffre, /^v1:/)
    assert.equal(c.totp_chiffre.includes(secret.replace(/\s/g, '')), false)
    assert.equal(JSON.stringify(c.codes_secours).includes(codes[0]), false)
  })

  it('mot de passe seul : aucune session ; code juste (fenêtre ±1) : session ; même code deux fois refusé', async () => {
    const { n, secret } = await proprietaire()
    avancer(5 * 60_000)
    const d = await motDePasse(n)
    assert.equal(d.corps.deuxieme_facteur, 'totp')
    assert.equal((await n.appel('GET', '/api/auth/me/?espace=console')).statut, 401)
    assert.equal((await n.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: codeTotp(secret, 3) })).corps.error.code, 'code_faux')
    const code = codeTotp(secret, -1)
    assert.equal((await n.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code })).statut, 200)
    assert.equal((await n.appel('GET', '/api/auth/me/?espace=console')).statut, 200)
    // Rejeu : nouveau défi, même code (déjà utilisé) → refusé ; le défi consommé ne resert pas.
    assert.equal((await n.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code })).statut, 410)
    const d2 = await motDePasse(navigateur())
    assert.equal((await navigateur().appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d2.corps.defi, code })).corps.error.code, 'code_faux')
  })

  it('code de secours : une seule fois', async () => {
    const { codes } = await proprietaire()
    const a = navigateur()
    const d = await motDePasse(a)
    assert.equal((await a.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: codes[0] })).statut, 200)
    const b = navigateur()
    const d2 = await motDePasse(b)
    assert.equal((await b.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d2.corps.defi, code: codes[0] })).corps.error.code, 'code_faux')
    assert.equal((await b.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d2.corps.defi, code: codes[1].toLowerCase() })).statut, 200)
  })

  it('limite : 5 codes faux, puis bloqué ; le défi expire après 5 minutes', async () => {
    const { secret } = await proprietaire()
    const a = navigateur()
    let d = await motDePasse(a)
    for (let i = 0; i < 4; i++) assert.equal((await a.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: '000000' })).statut, 401)
    assert.equal((await a.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: '000000' })).statut, 429)
    d = await motDePasse(a)
    assert.equal((await a.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: codeTotp(secret) })).statut, 429)
    avancer(16 * 60_000)
    d = await motDePasse(a)
    avancer(6 * 60_000)
    assert.equal((await a.appel('POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: codeTotp(secret) })).corps.error.code, 'defi_expire')
  })

  it('sans TOTP_CLE : la console refuse de s’ouvrir', async () => {
    envir = { ADMIN_BOOTSTRAP_EMAIL: 'porteur@belivay.com', ADMIN_BOOTSTRAP_CODE: 'code-tres-secret-42' }
    traiter = routeur()
    const r = await navigateur().appel('POST', '/api/auth/console/premier-acces?espace=console', { email: 'porteur@belivay.com', code: 'code-tres-secret-42', mot_de_passe: 'Console2026ok' })
    assert.equal(r.statut, 503)
    assert.equal(r.corps.error.code, 'totp_indisponible')
  })
})

describe('point relais et livreur : identifiant et PIN', () => {
  it('relais : candidature, validation, invitation d’un membre (PIN choisi), connexion par numéro et PIN, limite', async () => {
    const g = navigateur()
    await g.appel('POST', '/api/auth/register/?espace=relais', { ...INSCRIPTION, email: 'rose@relais.cm', phone: '677001122', password: '748291', candidature: { nom: 'Relais Bastos' } })
    await db.requete("UPDATE comptes SET statut = 'actif' WHERE email = 'rose@relais.cm'")
    assert.equal((await navigateur().appel('POST', '/api/auth/login/?espace=relais', { username: '+237 677 00 11 22', password: '748291' })).statut, 200)
    const inv = await g.appel('POST', '/api/auth/invitations?espace=relais', { email: 'paul@relais.cm', prenom: 'Paul', telephone: '699887766' })
    assert.equal(inv.statut, 201)
    const jeton = new URL(inv.corps.lien).searchParams.get('jeton')
    const p = navigateur()
    assert.equal((await p.appel('GET', '/api/auth/invitations/' + jeton + '?espace=relais')).corps.organisation, 'Relais Bastos')
    assert.equal((await p.appel('POST', '/api/auth/register/?espace=relais', { jeton, password: '123456', conditions_acceptees: true })).corps.error.code, 'pin_trop_simple')
    const m = await p.appel('POST', '/api/auth/register/?espace=relais', { jeton, password: '590417', conditions_acceptees: true })
    assert.equal(m.statut, 201)
    assert.equal(m.corps.user.role, 'employe')
    assert.equal(m.corps.user.statut, 'actif')
    const [h] = await db.requete("SELECT mdp_hash FROM comptes WHERE email = 'paul@relais.cm'")
    assert.match(h.mdp_hash, /^scrypt\$/)
    const x = navigateur()
    for (let i = 0; i < 4; i++) assert.equal((await x.appel('POST', '/api/auth/login/?espace=relais', { username: '699887766', password: '111222' })).statut, 401)
    assert.equal((await x.appel('POST', '/api/auth/login/?espace=relais', { username: '699887766', password: '111222' })).statut, 429)
  })
})

describe('exploitation', () => {
  it('migrations versionnées : une fois chacune, réversibles, réappliquées sans perte', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    const v = (await db.requete('SELECT version FROM schema_comptes ORDER BY version')).map((l) => l.version)
    assert.deepEqual(v, MIGRATIONS.map((m) => m.version))
    await migrer(db) // rien ne repasse
    await revenir(db, 1)
    const cols = (await db.requete("SELECT column_name FROM information_schema.columns WHERE table_name = 'comptes'")).map((l) => l.column_name)
    assert.equal(cols.includes('totp_chiffre'), false)
    assert.equal((await db.requete('SELECT count(*)::int n FROM comptes'))[0].n, 1) // la version 1 garde les comptes
    await migrer(db)
    assert.equal((await db.requete('SELECT max(version)::int v FROM schema_comptes'))[0].v, MIGRATIONS.at(-1).version)
  })

  it('export de ses données : tout le compte, jamais d’empreinte ni de secret', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', { ...INSCRIPTION, phone: '677112233' })
    const r = await n.appel('GET', '/api/auth/export')
    assert.equal(r.statut, 200)
    assert.match(r.entetes.get('content-disposition'), /attachment/)
    assert.equal(r.corps.compte.email, INSCRIPTION.email)
    assert.equal(r.corps.compte.telephone, '+237677112233')
    assert.equal(r.corps.consentement.version, '2026-10')
    assert.equal(r.corps.appareils_connectes.length, 1)
    const brut = JSON.stringify(r.corps)
    assert.equal(/scrypt|mdp_hash|totp|codes_secours/.test(brut), false)
    assert.equal((await navigateur().appel('GET', '/api/auth/export')).statut, 401)
  })

  it('erreur interne : message simple, journal sans donnée personnelle', async () => {
    const n = navigateur()
    await n.appel('POST', '/api/auth/register/', INSCRIPTION)
    const casse = { requete: async (t, p) => (/FROM sessions s JOIN/.test(t) ? Promise.reject(Object.assign(new Error('x'), { code: 'XX000' })) : db.requete(t, p)), transaction: (l) => db.transaction(l) }
    traiter = creerRouteur({ base: async () => casse, envoyeur: null, maintenant: () => horloge, envir })
    const r = await n.appel('GET', '/api/auth/me/')
    assert.equal(r.statut, 500)
    assert.equal(r.corps.error.message, 'Une erreur est survenue. Réessayez.')
    const [j] = await db.requete('SELECT * FROM journal_serveur')
    assert.equal(j.route, 'GET /auth/me')
    assert.equal(j.code, 'XX000')
    assert.equal(JSON.stringify(j).includes('example.cm'), false)
  })
})
