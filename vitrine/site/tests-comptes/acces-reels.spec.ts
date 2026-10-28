// Comptes réels des espaces à PIN et de la console : vraie connexion par identifiant et PIN (livreur, point relais) et
// second facteur TOTP obligatoire (console), par les écrans. Serveur : outils/serveur-local.mjs (PGlite).
import { expect, test, type Page } from '@playwright/test'
import { deBase32, hotp, pasDe } from '../serveur/totp.js'
import { ESSAI } from './essai'

const moi = (page: Page, espace: string) => page.evaluate((e) => fetch('/api/auth/me/?espace=' + e).then((r) => r.status), espace)
const api = (page: Page, methode: string, chemin: string, corps?: unknown) =>
  page.evaluate(
    ([m, c, b]) => fetch(c as string, { method: m as string, headers: { 'Content-Type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) }).then(async (r) => ({ statut: r.status, corps: await r.json().catch(() => null) })),
    [methode, chemin, corps] as const,
  )
/** Le PIN tapé sur le pavé de l'écran, chiffre par chiffre. */
async function pave(page: Page, pin: string) {
  const g = (await page.getByRole('group', { name: /Pavé/ }).count()) ? page.getByRole('group', { name: /Pavé/ }) : page.locator('main')
  for (const c of pin) await g.getByRole('button', { name: c, exact: true }).click()
}
const code = (secret: string, decalage = 0) => hotp(deBase32(secret), pasDe(new Date()) + decalage)

test.describe.configure({ mode: 'serial' })

let secret = ''
let secours: string[] = []
/** Propriétaire de la console : premier accès, enrôlement TOTP (une fois pour tout le fichier), puis déconnecté. */
async function proprietaire(page: Page) {
  if (!secret) {
    const d = await api(page, 'POST', '/api/auth/console/premier-acces?espace=console', { email: ESSAI.email, code: ESSAI.code, mot_de_passe: ESSAI.mdp })
    expect(d.corps.deuxieme_facteur).toBe('enrolement')
    const e = await api(page, 'POST', '/api/auth/2fa/enrolement?espace=console', { defi: d.corps.defi })
    secret = e.corps.secret
    const v = await api(page, 'POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: code(secret) })
    expect(v.corps.codes_secours).toHaveLength(10)
    secours = v.corps.codes_secours
    await api(page, 'POST', '/api/auth/logout/?espace=console', {})
  }
  return secret
}
/** Ouvre une session de console par l'API avec un code de secours (chacun ne sert qu'une fois). */
async function sessionConsole(page: Page) {
  const d = await api(page, 'POST', '/api/auth/login/?espace=console', { username: ESSAI.email, password: ESSAI.mdp })
  expect((await api(page, 'POST', '/api/auth/2fa/verifier?espace=console', { defi: d.corps.defi, code: secours.shift() })).statut).toBe(200)
}

test('console : mot de passe seul sans session ; code de l’application exigé par l’écran', async ({ page }) => {
  await page.goto('/admin/')
  const s = await proprietaire(page)
  // Sans connexion, la console s'ouvre sur sa page de connexion (décision du porteur), la page demandée gardée.
  await page.goto('/admin/profil')
  await page.waitForURL(/\/admin\/connexion\?next=%2Fprofil/)
  await page.locator('input[autocomplete="username"]').last().fill(ESSAI.email)
  await page.locator('input[autocomplete="current-password"]').fill(ESSAI.mdp)
  await page.locator('button[type="submit"]').last().click()
  const champ = page.getByLabel('Code à 6 chiffres')
  await expect(champ).toBeVisible()
  expect(await moi(page, 'console')).toBe(401) // le mot de passe ne suffit pas
  await champ.fill('000000')
  await page.locator('button[type="submit"]', { hasText: 'Valider' }).click()
  expect(await moi(page, 'console')).toBe(401)
  await champ.fill(code(s, 1))
  await page.locator('button[type="submit"]', { hasText: 'Valider' }).click()
  await expect.poll(() => moi(page, 'console')).toBe(200)
  // Après la connexion : l'écran d'arrivée de la console (prototype) propose de reprendre la page demandée.
  await page.getByRole('button', { name: 'Reprendre la page demandée' }).click()
  await expect(page).toHaveURL(/\/admin\/profil$/)
})

test('livreur : invité par son entreprise, PIN choisi, reconnexion par numéro et PIN', async ({ page }) => {
  await page.goto('/livreur/')
  // Entreprise : candidature, validée par la console (propriétaire avec second facteur).
  await api(page, 'POST', '/api/auth/register/?espace=entreprise', { email: 'gaelle@yafe.test', password: 'Yafe2026ok', first_name: 'Gaëlle', conditions_acceptees: true, candidature: { nom: 'Yafé Express' } })
  await proprietaire(page)
  await sessionConsole(page)
  const l = (await api(page, 'GET', '/api/admin/comptes?espace=console&filtre_espace=entreprise')).corps.comptes
  await api(page, 'POST', `/api/admin/comptes/${l[0].id}/statut?espace=console`, { statut: 'actif' })
  const inv = await api(page, 'POST', '/api/auth/invitations?espace=entreprise', { email: 'serge@livreur.test', prenom: 'Serge', telephone: '690112299' })
  expect(inv.statut).toBe(201)
  const jeton = new URL(inv.corps.lien).searchParams.get('invitation')
  // Activation : le livreur choisit son PIN (haché par le serveur), puis se déconnecte.
  expect((await api(page, 'POST', '/api/auth/register/?espace=livreur', { jeton, password: '590417', conditions_acceptees: true })).statut).toBe(201)
  await api(page, 'POST', '/api/auth/logout/?espace=livreur', {})
  await page.evaluate(() => localStorage.removeItem('blv_appareil_reel_livreur'))

  await page.goto('/livreur/connexion')
  await page.locator('#l3-num').fill('690112299')
  await page.getByRole('button', { name: /Recevoir le code/ }).click()
  await expect(page.getByText('Entrez votre code PIN')).toBeVisible()
  await pave(page, '111222')
  await expect(page.getByText(/PIN incorrect/)).toBeVisible()
  expect(await moi(page, 'livreur')).toBe(401)
  await expect(page.getByLabel(/Code PIN, 0 chiffres/)).toBeVisible()
  await pave(page, '590417')
  await expect.poll(() => moi(page, 'livreur')).toBe(200)
})

test('point relais : membre invité par le gérant, PIN choisi à l’activation, reconnexion par numéro et PIN', async ({ page }) => {
  await page.goto('/relais/')
  await api(page, 'POST', '/api/auth/register/?espace=relais', { email: 'rose@relais.test', phone: '677001199', password: '748291', first_name: 'Rose', conditions_acceptees: true, candidature: { nom: 'Relais Bastos' } })
  await proprietaire(page)
  await sessionConsole(page)
  const l = (await api(page, 'GET', '/api/admin/comptes?espace=console&filtre_espace=relais')).corps.comptes
  await api(page, 'POST', `/api/admin/comptes/${l[0].id}/statut?espace=console`, { statut: 'actif' })
  const inv = await api(page, 'POST', '/api/auth/invitations?espace=relais', { email: 'paul@relais.test', prenom: 'Paul', telephone: '699887799' })
  const jeton = new URL(inv.corps.lien).searchParams.get('jeton')!
  await api(page, 'POST', '/api/auth/logout/?espace=relais', {})
  // Activation de l'invitation : le PIN choisi devient la clé du membre (haché par le serveur).
  expect((await api(page, 'POST', '/api/auth/register/?espace=relais', { jeton, password: '590418', conditions_acceptees: true })).corps.user.role).toBe('employe')
  await api(page, 'POST', '/api/auth/logout/?espace=relais', {})
  await page.evaluate(() => localStorage.removeItem('blv_appareil_reel_relais'))

  await page.goto('/relais/connexion')
  await page.getByLabel('Numéro').fill('699887799')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await pave(page, '590418')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect.poll(() => moi(page, 'relais')).toBe(200)
})
