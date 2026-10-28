// Parcours final avant la mise en ligne, dans un Chromium non piloté (navigator.webdriver à false : sons, animations et
// effets du vrai navigateur) : achats au relais, à domicile et au comptoir côté client ; entreprise (Menu, Profil,
// affectation) ; vendeur (assistant de mise en ligne) ; console d'administration (accueil par rôle, commandes du jour,
// vue d'ensemble avec l'activité des cinq espaces, litiges, versements, activation d'un compte). Aucun gel : chaque onglet répond en moins d'une seconde, aucune
// erreur de page.
import { expect, test, type Page } from '@playwright/test'
import { CHEMIN, contexte, ouvrir, SIX, TELEPHONE, type App } from './commun'
import { acheter, jusquAuLivreur } from './parcours'

async function vivant(page: Page) {
  const t0 = Date.now()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))))
  expect(Date.now() - t0).toBeLessThan(1000)
  await expect(page.locator('#app, #root').first()).not.toBeEmpty()
}

async function photo(page: Page) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 1200
    c.height = 1000
    const x = c.getContext('2d')!
    x.fillStyle = '#c9500e'
    x.fillRect(0, 0, 1200, 1000)
    return c.toDataURL('image/png').split(',')[1]
  })
  return { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }
}

test('parcours final non piloté : client, entreprise, vendeur, console', async ({ browser }) => {
  test.setTimeout(300_000)
  const ctx = await contexte(browser, { theme: 'light', lang: 'fr', viewport: TELEPHONE, nonPilote: true })
  const erreurs: string[] = []
  const suivre = async (app: App, chemin = '') => {
    const p = await ouvrir(ctx, app, chemin)
    p.on('pageerror', (e) => erreurs.push(`${app} : ${e.message}`))
    expect(await p.evaluate(() => navigator.webdriver)).toBe(false)
    return p
  }
  const client = await suivre('client')
  const vendeur = await suivre('vendeur', 'commandes')
  const entreprise = await suivre('entreprise', 'paquets')

  // Client : au relais (jusqu'à l'affectation par l'entreprise), puis à domicile.
  await jusquAuLivreur(client, vendeur, entreprise)
  await acheter(client, 'fer', 'Défroisseur vapeur Philips 3000', 'À domicile')

  // Client : au comptoir (panier sous son plafond) ; la commande est « Validée ».
  await client.goto('/fiche?p=cuiseur-riz') // 32 000 F : sous le plafond du comptoir (R42)
  await client.getByRole('button', { name: 'Acheter', exact: true }).filter({ visible: true }).first().click()
  await client.getByRole('radio', { name: /Au relais/ }).first().click()
  await client.getByRole('button', { name: /^Passer commande/ }).filter({ visible: true }).first().click()
  await expect(client).toHaveURL(/\/paiement-moyen/)
  await client.getByRole('button', { name: /Autres moyens/ }).click()
  await client.getByText('Payer au comptoir', { exact: true }).click()
  await expect(client.locator('[data-comptoir]')).toBeVisible()
  await client.locator('button.btn.primary', { hasText: 'Payer' }).click()
  await expect(client).toHaveURL(/paiement-attente\?ref=BLV-\d+/)
  await client.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(client).toHaveURL(/validee\?ref=BLV-/)

  // Entreprise : Menu, Profil.
  await entreprise.goto('/entreprise/menu')
  await expect(entreprise.locator('main')).toContainText('Paquets à accepter')
  await entreprise.goto('/entreprise/profil')
  await expect(entreprise.locator('main')).not.toBeEmpty()

  // Vendeur : l'assistant de mise en ligne, jusqu'au prix suggéré.
  await vendeur.goto('/vendeur/mise_en_ligne')
  const fichier = vendeur.locator('input[data-assistant-photo]')
  await fichier.setInputFiles(await photo(vendeur))
  await vendeur.locator('.ml-fiche').first().click()
  while (await vendeur.getByText(/^Encore \d photos?\.$/).count()) {
    await fichier.setInputFiles(await photo(vendeur))
    await vendeur.waitForTimeout(150)
  }
  await vendeur.getByRole('button', { name: 'Continuer : le prix' }).click()
  await expect(vendeur.locator('[data-prix-suggere]')).toContainText('Prix suggéré par la meilleure offre')

  // Console : la commande du jour et l'activité des cinq espaces montent ; chaque vue de rôle s'ouvre sur ses fonctions.
  const admin = await suivre('admin', '?role=superviseur')
  await expect(admin.locator('nav.a-travail')).toBeVisible()
  await admin.goto(CHEMIN.admin + 'direct')
  await expect(admin.locator('main')).toContainText(/Commande BLV-\d+ payée/)
  for (const [route, role] of [['', 'finance'], ['', 'support'], ['', 'mediation'], ['', 'operations'], ['', 'verification'], ['', 'rh'], ['litige', 'support'], ['versements', 'finance'], ['roles', 'rh'], ['candidatures', 'operations']]) {
    await admin.goto(CHEMIN.admin + route + '?role=' + role)
    await expect(admin.locator('#contenu')).not.toBeEmpty()
    await vivant(admin)
  }
  await admin.goto(CHEMIN.admin + 'activation?jeton=inconnu~1')
  await expect(admin.getByRole('heading', { name: 'Lien d’activation invalide' })).toBeVisible()

  const pages: Partial<Record<App, Page>> = { client, vendeur, entreprise, admin }
  for (const a of SIX.filter((x) => pages[x])) {
    await pages[a]!.goto(CHEMIN[a])
    await vivant(pages[a]!)
  }
  expect(erreurs).toEqual([])
  await ctx.close()
})
