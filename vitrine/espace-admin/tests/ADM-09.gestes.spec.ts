// Gestes et règles des zones, de la carte, des emballages et des candidatures (S4) : plan d'action d'une zone en
// alerte, calques mémorisés, consultation journalisée d'une position, commande d'un format sous le seuil, écart
// facturable par la Finance seulement au-delà du seuil, candidature bloquée par la liste noire, acceptation.
import { expect, test, type Page } from '@playwright/test'
import { FR, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Plan : relancer Yafé Express et Mboa Logistique, relever la priorité des paquets menacés, revue jeudi.'
async function decider(p: Page, bouton: string) {
  await p.getByRole('button', { name: bouton }).first().click()
  const f = p.getByRole('dialog')
  await f.locator('textarea').fill(MOTIF)
  await f.locator('.btn.primary').click()
  await expect(f).toBeHidden()
}

test.beforeEach(async ({ page }) => figerHorloge(page))

test('zone en alerte : raisons affichées et plan d’action enregistré', async ({ page }) => {
  await ouvrir(page, 'zones?zone=Z3', FR)
  await expect(page.getByText(/Z3 en alerte/).first()).toBeVisible()
  await decider(page, 'Enregistrer le plan d’action')
  await expect(page.getByText('Enregistré')).toBeVisible()
})

test('carte : un calque masqué reste masqué au retour ; une position consultée est journalisée', async ({ page }) => {
  await ouvrir(page, 'carte', FR)
  const tg = page.getByRole('switch', { name: 'Calque : Boutiques' })
  await tg.click()
  await expect(tg).toHaveAttribute('aria-checked', 'false')
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Calque : Boutiques' })).toHaveAttribute('aria-checked', 'false')
  // Marqueurs communs : un livreur trop proche d'un autre est dans un groupe, qui se déplie d'un clic.
  const serge = page.getByRole('button', { name: /^Serge A\./ }).first()
  if (!(await serge.count())) await page.getByRole('button', { name: /points proches : .*Serge A\./ }).first().click()
  await serge.click()
  await expect(page.getByText(/Position consultée à .* et journalisée/)).toBeVisible()
})

test('emballages : format sous le seuil commandé, puis plus rien à commander', async ({ page }) => {
  await ouvrir(page, 'emballages', FR)
  await expect(page.locator('#s4-stock tr.bad')).toHaveCount(1)
  await page.locator('#s4-stock').getByRole('button', { name: /^Commander/ }).click()
  const f = page.getByRole('dialog')
  await f.locator('textarea').fill(MOTIF)
  await f.locator('.btn.primary').click()
  await expect(page.locator('#s4-stock tr.bad')).toHaveCount(0)
})

test('écart d’emballages : facturable au-delà du seuil, par la Finance', async ({ page }) => {
  await ouvrir(page, 'emballages?ecart=e-mboa', { ...FR, role: 'finance' })
  await decider(page, 'Facturer l’écart')
  await expect(page.getByText(/Facturé .* retenu sur le prochain versement/)).toBeVisible()
})

test('candidatures : liste noire bloque l’acceptation ; Taty’s acceptée passe en configuration', async ({ page }) => {
  await ouvrir(page, 'candidatures', FR)
  const noire = page.locator('section', { hasText: 'CAND-0027' })
  await expect(noire.getByRole('button', { name: 'Accepter' })).toHaveCount(0)
  await expect(noire.getByRole('button', { name: 'Refuser' })).toHaveClass(/primary/)
  await page.locator('section', { hasText: 'CAND-0031' }).getByRole('button', { name: 'Accepter' }).click()
  const f = page.getByRole('dialog')
  await f.locator('textarea').fill(MOTIF)
  await f.locator('.btn.primary').click()
  await expect(page.locator('main')).toContainText('décision appliquée et journalisée (CAND-0031)')
  await ouvrir(page, 'entreprises', FR)
  await expect(page.getByRole('link', { name: /Taty’s Delivery Service/ }).first()).toBeVisible()
})
