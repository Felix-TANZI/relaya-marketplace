// Comptes réels (VITE_SOURCE=hybride) : créer un compte, se déconnecter, se reconnecter — par les écrans du client —,
// et la session réelle qui ouvre l'espace vendeur sous le nom du compte. Serveur : outils/serveur-local.mjs (PGlite).
import { expect, test, type Page } from '@playwright/test'

const moi = (page: Page, espace = 'client') => page.evaluate((e) => fetch('/api/auth/me/?espace=' + e).then(async (r) => ({ statut: r.status, corps: r.status === 200 ? await r.json() : null })), espace)

test('client : créer un compte, se déconnecter, se reconnecter', async ({ page }) => {
  const email = `awa.${Date.now()}@example.cm`
  const mdp = 'Soleil2026x'
  await page.goto('/connexion-email?st=inscription')
  await page.locator('#cx-prenom').fill('Awa')
  await page.locator('#cx-email').fill(email)
  await page.getByRole('button', { name: /Mot de passe proposé/ }).click()
  await page.locator('#cx-mdp').fill(mdp)
  // Consentement explicite aux conditions et à la confidentialité (comptes réels).
  await page.getByRole('checkbox', { name: /J’accepte les conditions d’utilisation/ }).check()
  await page.getByText('Créer mon compte').click()
  await expect.poll(async () => (await moi(page)).statut).toBe(200)
  const cree = await moi(page)
  expect(cree.corps.user.email).toBe(email)
  expect(cree.corps.user.conditions.version).toBe('1.0')
  // Le cookie de session n'est pas lisible par la page (HttpOnly).
  expect(await page.evaluate(() => document.cookie)).not.toContain('blv_s_')

  // La page du compte montre le compte réel ; se déconnecter le ferme sur le serveur.
  await page.goto('/compte')
  await expect(page.getByText('Awa').first()).toBeVisible()
  await page.getByText('Se déconnecter').first().click()
  await page.getByRole('dialog').getByText('Se déconnecter').last().click()
  await page.waitForURL((u) => u.pathname === '/')
  expect((await moi(page)).statut).toBe(401)

  // Mauvais mot de passe : refusé ; le bon : la session se rouvre.
  await page.goto('/connexion-email')
  await page.locator('#cx-email').fill(email)
  const mdpChamp = page.getByRole('button', { name: /Mot de passe enregistré/ })
  if (await mdpChamp.count()) await mdpChamp.click()
  await page.locator('#cx-mdp').fill('Mauvais2026')
  await page.locator('a.btn.primary', { hasText: 'Se connecter' }).click()
  await expect(page.getByText('E-mail ou mot de passe incorrect.')).toBeVisible()
  expect((await moi(page)).statut).toBe(401)
  await page.locator('#cx-mdp').fill(mdp)
  await page.locator('a.btn.primary', { hasText: 'Se connecter' }).click()
  await expect.poll(async () => (await moi(page)).statut).toBe(200)

  // Un rechargement garde la session (cookie), et la démonstration reste ouverte sous le compte réel.
  await page.reload()
  expect((await moi(page)).corps.user.first_name).toBe('Awa')

  // « Télécharger mes données » : l'export réel du serveur (GET /api/auth/export), pas celui de la démonstration.
  await page.goto('/confidentialite')
  const export_ = page.waitForResponse((r) => r.url().includes('/api/auth/export'))
  const fichier = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger', exact: true }).click()
  expect((await export_).status()).toBe(200)
  const f = await fichier
  expect(f.suggestedFilename()).toBe('mes-donnees-belivay.json')
  const donnees = JSON.parse(await (await import('node:fs/promises')).readFile((await f.path())!, 'utf-8'))
  expect(donnees.compte).toMatchObject({ espace: 'client', email, prenom: 'Awa' })
  await expect(page.getByText('Tes données sont enregistrées sur le téléphone (fichier JSON).')).toBeVisible()
})

test('vendeur : compte réel « en attente », la session ouvre l’espace sous son nom', async ({ page }) => {
  await page.goto('/vendeur/')
  const email = `boutique.${Date.now()}@example.cm`
  const r = await page.evaluate(
    (email) =>
      fetch('/api/auth/register/?espace=vendeur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Boutique2026', first_name: 'Mireille', last_name: 'Ngo', conditions_acceptees: true, candidature: { boutique: 'Mireille Mode' } }),
      }).then((r) => r.json()),
    email,
  )
  expect(r.user.statut).toBe('en_attente')
  await page.goto('/vendeur/')
  await expect(page.getByText(/Mireille/).first()).toBeVisible()
  // Déconnexion réelle : le cookie du vendeur ne vaut plus.
  await page.evaluate(() => fetch('/api/auth/logout/?espace=vendeur', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
  expect((await moi(page, 'vendeur')).statut).toBe(401)
})

test('origine : une écriture venue d’un autre site est refusée', async ({ request }) => {
  const r = await request.post('/api/auth/register/', { headers: { Origin: 'https://ailleurs.example' }, data: { email: 'x@example.cm', password: 'Soleil2026x', first_name: 'X', conditions_acceptees: true } })
  expect(r.status()).toBe(403)
})
