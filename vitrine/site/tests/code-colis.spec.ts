// Un code et un QR par colis (v6 D12, D14 ; logique-metier/REPRISES-FIN.md § 3.9) : une commande de 2 colis montre
// 2 codes différents et 2 QR, un colis à la fois ; une commande au comptoir non payée ne montre aucun code ; plus
// aucun texte « un seul code » sur les écrans du retrait.
import { expect, test } from '@playwright/test'

test('commande de 2 colis : 2 codes et 2 QR, un colis à la fois', async ({ page }) => {
  await page.goto('/code?ref=BLV-52018')
  await expect(page.locator('.hero .hk')).toHaveText(/Codes de retrait · 2 colis/i)
  const onglets = page.getByRole('tab', { name: /^Colis \d$/ })
  await expect(onglets).toHaveCount(2)
  await page.getByRole('button', { name: 'Afficher le code' }).click()
  const qr = page.locator('[data-qr-colis]')
  await expect(qr).toHaveAttribute('data-qr-colis', '1')
  const code1 = await page.locator('.hero .code6').getAttribute('aria-label')
  const dessin1 = await qr.innerHTML()
  await page.getByRole('tab', { name: 'Colis 2' }).click()
  await expect(page.getByRole('tab', { name: 'Colis 2' })).toHaveAttribute('aria-selected', 'true')
  await expect(qr).toHaveAttribute('data-qr-colis', '2')
  const code2 = await page.locator('.hero .code6').getAttribute('aria-label')
  expect(code1).toMatch(/^\d( \d){5}$/)
  expect(code2).toMatch(/^\d( \d){5}$/)
  expect(code2).not.toBe(code1)
  expect(await qr.innerHTML()).not.toBe(dessin1)
  await expect(page.locator('main')).not.toContainText(/un seul code/i)
})

test('commande au comptoir non payée : aucun code visible', async ({ page }) => {
  await page.goto('/code?ref=BLV-51940')
  await expect(page.getByText('Ton code s’affiche après le paiement')).toBeVisible()
  await expect(page.locator('.code6')).toHaveCount(0)
  await expect(page.locator('[data-qr-colis]')).toHaveCount(0)
})

test('envoyer à quelqu’un : les codes de chaque colis, jamais « un seul code »', async ({ page }) => {
  await page.goto('/code-partage?ref=BLV-52018')
  await expect(page.getByRole('button', { name: 'Envoyer ses codes par SMS' })).toBeVisible()
  await expect(page.locator('#app')).toContainText('un code et un QR par colis')
  await expect(page.locator('#app')).not.toContainText(/un seul code/i)
})

test('commande et suivi : plus de « un seul code »', async ({ page }) => {
  for (const a of ['/commande?ref=BLV-52107', '/suivi?ref=BLV-52107', '/commandes', '/garde?ref=BLV-52018']) {
    await page.goto(a)
    await page.locator('main').first().waitFor()
    await expect(page.locator('#app'), a).not.toContainText(/un seul code/i)
  }
})
