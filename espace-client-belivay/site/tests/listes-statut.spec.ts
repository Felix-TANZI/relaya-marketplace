// Listes d'envies pour tout le monde (DP-54, demande du porteur : « tout le monde peut mettre sa wishlist en statut
// et se faire offrir des cadeaux ; tout le monde doit pouvoir créer des wishlists et se faire acheter par un proche
// de n'importe où ») :
// - la liste mise en statut : image 1080 × 1920 avec QR code et lien court, enregistrée, texte copié ;
// - le lien court /l/<code> ouvre la page publique ; un visiteur à l'étranger, sans compte, choisit l'euro, fait
//   livrer chez la destinataire (adresse jamais montrée), paie par carte (contrôle de cohérence : accepté,
//   vérification renforcée par code e-mail, refus d'une carte camerounaise sans rien débiter) ; coche, suivi, et la
//   proposition facultative d'un compte diaspora, prénom et e-mail repris ;
// - un visiteur sans compte : « Créer ma liste » passe par l'inscription et revient à la création.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

async function deconnecter(page: Page) {
  await page.goto('/compte')
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.locator('.sheet').getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function payerCarte(page: Page, carte: string) {
  await page.getByLabel(/^Ton prénom/).fill('Hervé')
  await page.getByLabel('Ton e-mail, pour suivre le cadeau').fill('herve.mbarga@exemple.fr')
  await page.getByLabel('Pays où tu vis').selectOption('France')
  await page.getByLabel('Numéro de carte').fill(carte)
  await page.getByLabel('Expiration').fill('12/29')
  await page.getByLabel('Code (CVC)').fill('123')
  await page.getByRole('button', { name: /^Payer .*€/ }).click()
  await page.getByLabel('Code reçu par SMS de ta banque').fill('1234')
  await page.getByRole('button', { name: 'Valider' }).click()
}

test('liste en statut et cadeau offert de l’étranger', async ({ page }) => {
  // 1. Ma liste d'anniversaire en statut : l'image, son lien court, enregistrée ; le texte copié.
  await page.goto('/liste-envies?id=anniv')
  await page.getByRole('link', { name: 'Mettre ma liste en statut' }).click()
  await expect(page).toHaveURL(/liste-statut\?id=anniv/)
  const image = page.locator('.blv-statut canvas')
  await expect(image).toHaveAttribute('width', '1080')
  await expect(image).toHaveAttribute('height', '1920')
  await expect(page.getByRole('button', { name: 'Partager mon statut' })).not.toHaveClass(/off/)
  await expect(page.locator('.blv-statut')).toContainText('/l/k7Q2mX')
  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Enregistrer l’image' }).click()
  expect((await telechargement).suggestedFilename()).toBe('belivay-liste-k7Q2mX.png')
  await expect(page.locator('.note.green')).toContainText('Image enregistrée')
  await expect(page.locator('.blv-texte-statut')).toContainText('/l/k7Q2mX')
  await page.getByRole('button', { name: 'Copier le texte' }).click()
  await expect(page.locator('.note.green')).toContainText('Texte copié')
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=.*%2Fl%2Fk7Q2mX/)
  await expect(page.locator('main')).toContainText('Mise en statut 2 fois')

  // 2. Hervé, en France, sans compte : le lien court, l'euro, livré chez Nadège, carte française acceptée.
  await deconnecter(page)
  await page.goto('/l/n8Lk2w')
  await expect(page).toHaveURL(/liste-publique\?l=n8Lk2w/)
  await page.locator('.blv-devises').getByRole('link', { name: /Euro/ }).click()
  const porteBebe = page.locator('.card', { hasText: 'Porte-bébé ergonomique' })
  await expect(porteBebe.locator('.blv-devise')).toContainText('€')
  await porteBebe.getByRole('link', { name: 'Offrir cet article' }).click()
  await expect(page).toHaveURL(/liste-offrir\?.*devise=EUR/)
  await page.getByRole('radio', { name: /Chez Nadège, à Yaoundé/ }).click()
  await expect(page.locator('.recap')).toContainText('Livraison chez Nadège')
  await expect(page.locator('main')).not.toContainText('Bastos, rue')
  await payerCarte(page, '4242 4242 4242 4242')
  await expect(page.locator('.pg-t')).toContainText('C’est offert, Hervé !')
  await expect(page.locator('.cl14-check.blv-succes')).toBeVisible()
  await expect(page.locator('main')).toContainText('Livraison chez Nadège')
  await expect(page.locator('main')).toContainText('Pas besoin de compte pour suivre ton cadeau')
  // Le compte diaspora, après coup et facultatif : prénom et e-mail déjà remplis.
  await page.getByRole('link', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/inscription-diaspora\?next=%2Fespace-diaspora/)
  await expect(page.getByLabel('Prénom')).toHaveValue('Hervé')
  await expect(page.getByLabel('E-mail')).toHaveValue('herve.mbarga@exemple.fr')

  // 3. Une carte belge alors qu'il vit en France : vérification renforcée, code reçu par e-mail.
  await page.goto('/liste-publique?l=n8Lk2w')
  await page.locator('.card', { hasText: 'Huile de coco' }).getByRole('link', { name: 'Offrir cet article' }).click()
  await payerCarte(page, '4000 0005 0000 0007')
  await expect(page.locator('.note.amber', { hasText: 'Vérification renforcée' })).toContainText('Carte émise en Belgique ; tu vis en France.')
  await page.getByLabel('Code reçu par e-mail de BelivaY').fill('284615')
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.locator('.pg-t')).toContainText('C’est offert, Hervé !')

  // 4. Une carte émise au Cameroun : refusée, rien n'est débité ; Mobile Money est proposé.
  await page.goto('/liste-publique?l=n8Lk2w')
  await page.locator('.card', { hasText: 'Ballon de football' }).getByRole('link', { name: 'Offrir cet article' }).click()
  await payerCarte(page, '4000 0120 0000 0007')
  await expect(page.locator('.note.red', { hasText: 'Paiement refusé' })).toContainText('Carte émise au Cameroun')
  await page.goto('/liste-publique?l=n8Lk2w')
  await expect(page.locator('.cl14-num')).toContainText('2 sur 3')
})

test('tout le monde crée sa liste : un visiteur passe par l’inscription et revient à la création', async ({ page }) => {
  await deconnecter(page)
  await page.goto('/liste-creer')
  await expect(page).toHaveURL(/\/connexion\?next=%2Fliste-creer$/)
  await page.goto('/listes')
  await expect(page.locator('main')).toContainText('Ta liste d’envies, offerte d’où qu’on soit')
  await expect(page.getByRole('link', { name: 'Je vis à l’étranger : ouvrir un compte diaspora' })).toHaveAttribute('href', '/inscription-diaspora?next=%2Fliste-creer')
  await page.getByRole('link', { name: 'Créer ma liste' }).click()
  await expect(page).toHaveURL(/\/connexion\?next=%2Fliste-creer$/)
  await page.getByRole('link', { name: 'Continuer avec Google' }).click()
  await page.locator('.cl03-acct').first().click()
  await page.getByRole('link', { name: 'Ouvrir mon compte' }).click()
  await expect(page).toHaveURL(/\/liste-creer$/)
  await page.getByLabel('Nom de la liste').fill('Ma dot')
  await page.getByRole('button', { name: 'Créer la liste' }).click()
  await expect(page).toHaveURL(/liste-envies\?id=/)
})
