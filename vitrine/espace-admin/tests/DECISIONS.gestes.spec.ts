// Poste de travail des décisions encadrées (logique-metier/DECISIONS-ENCADREES.md) : issue bloquée impossible, plafond
// dépassé → transmission (un autre compte tranche), appel noté qui devient une preuve, lot plafonné, dossier suivant,
// raccourcis du clavier, même modèle pour la vérification d'identité (pièces côte à côte), vue Audit des écarts.
import { expect, test } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

test.use({ viewport: { width: 1440, height: 900 } })
const NOTE = 'Ni photo ni code de remise, position à 1,8 km de l’adresse : la livraison n’est pas prouvée.'

test('issue bloquée : imputer l’entreprise que les preuves disculpent est impossible, la raison est dite', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0421'), { ...FR, role: 'support' })
  await expect(page.getByText('La règle suggère')).toBeVisible()
  const bloquee = page.getByRole('radio', { name: /Rembourser · charge à l’entreprise/ })
  await expect(bloquee).toBeDisabled()
  await expect(bloquee).toContainText('Les preuves disculpent l’entreprise de livraison')
  await expect(page.getByRole('radio', { name: /Remplacer l’article/ })).toContainText('Hors des issues de la règle')
  await expect(page.getByRole('radio', { name: /Débouter le client/ })).toHaveAttribute('aria-checked', 'true')
})

test('plafond dépassé : l’Agent transmet, il ne tranche plus ; le Senior voit la transmission et tranche', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0424&agent=a-aicha'), FR)
  await expect(page.getByRole('radio', { name: /Débouter le client/ })).toBeDisabled()
  const i = page.getByRole('radio', { name: /Rembourser · charge à l’entreprise/ })
  await expect(i).toContainText('Au-delà de votre plafond')
  await page.getByRole('radio', { name: 'Preuves concordantes' }).click()
  await page.locator('.po-note textarea').first().fill(NOTE)
  await expect(page.locator('.po-decider')).toBeDisabled()
  await expect(page.getByText('Cette issue dépasse votre niveau : transmettez.')).toBeVisible()
  await page.getByRole('button', { name: 'Transmettre', exact: true }).click()
  await page.getByRole('button', { name: 'Transmettre au niveau supérieur' }).click()
  await expect(page.getByRole('status')).toContainText('Dossier transmis : Senior')
  await expect(page.getByText(/Vous avez transmis ce dossier/).first()).toBeVisible()
  await ouvrir(page, adresse('litige', 'id=LT-0424&role=support'), FR)
  await expect(page.getByText(/Transmis par Aïcha Bouba/).first()).toBeVisible()
  await page.getByRole('radio', { name: 'Preuves concordantes' }).click()
  await page.locator('.po-note textarea').first().fill(NOTE)
  await page.locator('.po-decider').click()
  await expect(page.getByText('Décision rendue')).toBeVisible()
})

test('appel noté : un accord ne propose que les issues permises et devient une preuve de la frise', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige', 'id=LT-0412'), { ...FR, role: 'support' })
  await page.getByRole('button', { name: 'Noter un appel' }).click()
  await page.getByRole('radio', { name: 'Accord', exact: true }).click()
  const options = await page.locator('.po-form select option').allInnerTexts()
  expect(options).toContain('Rembourser · charge au vendeur')
  expect(options).not.toContain('Débouter le client') // les preuves donnent raison à la cliente
  await page.locator('.po-form select').selectOption({ label: 'Rembourser · charge au vendeur' })
  await page.locator('.po-form textarea').fill('La cliente accepte le remboursement après le retour de la robe.')
  await page.getByRole('button', { name: 'Noter l’appel' }).click()
  await expect(page.getByRole('status')).toContainText('il devient une preuve')
  await expect(page.locator('.po-ps')).toContainText('Appel · le client · accord')
  await expect(page.getByRole('radio', { name: 'Accord trouvé au téléphone' })).toHaveAttribute('aria-checked', 'true')
})

test('lot plafonné : deux retards de la même panne décidés en une fois, chacun journalisé', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige'), { ...FR, role: 'support' })
  const lot = page.locator('.po-lot')
  await expect(lot).toContainText('Lot · 2 dossiers identiques')
  await lot.getByRole('button', { name: 'Décider en lot' }).click()
  await expect(lot).toContainText('Au plus 5 dossiers, total sous votre plafond')
  await lot.getByRole('radio', { name: 'Retard établi' }).click()
  await lot.locator('textarea').fill('Panne déclarée PN-0031 : livrés le lendemain, un bon de réduction pour chaque client.')
  await lot.getByRole('button', { name: 'Décider les 2 dossiers' }).click()
  await expect(page.getByRole('status')).toContainText('2 dossiers décidés en lot')
  await expect(page.locator('.po-lot')).toHaveCount(0)
})

test('dossier suivant : bouton et touche « n » ; l’aide « ? » liste les raccourcis du poste', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('litige'), { ...FR, role: 'support' })
  await expect(page.locator('.po-q.on')).toContainText('LT-0424')
  await page.getByRole('button', { name: 'Dossier suivant' }).first().click()
  await expect(page).toHaveURL(/id=LT-0421/)
  await page.locator('main').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('n')
  await expect(page).toHaveURL(/id=LT-0412/)
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog')).toContainText('Poste de travail')
  await expect(page.getByRole('dialog')).toContainText('Comparer les preuves côte à côte')
})

test('même modèle : vérification d’identité, pièces côte à côte et zoom ; approuver attend que chaque pièce soit ouverte', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('postes', 'genre=kyc&id=KYC-0091&g=kyc'), { ...FR, role: 'verification' })
  await expect(page.getByText('La règle suggère')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Approuver les pièces/ })).toContainText('Ouvrez chaque pièce')
  await page.getByRole('button', { name: 'Comparer' }).click()
  const v = page.getByRole('dialog', { name: 'Comparer côte à côte' })
  await expect(v.locator('figure')).toHaveCount(3)
  await v.getByRole('button', { name: 'Agrandir' }).click()
  await expect(v.locator('.pv-z')).toHaveText('Zoom × 1,5')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('radio', { name: /Approuver les pièces/ })).toContainText(/Un contrôle|Ouvrez chaque pièce/)
})

test('vue Audit : les décisions qui s’écartent de la suggestion, et un échantillon à relire', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('journal'), { ...FR, role: 'audit' })
  const p = page.locator('section.panel', { hasText: 'Décisions qui s’écartent de la suggestion' })
  await expect(p).toContainText('LT-0388')
  await p.getByRole('button', { name: /Tirer un échantillon/ }).click()
  await expect(p.getByRole('status')).toContainText('décisions tirées pour relecture')
})
