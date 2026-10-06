// Cadeaux et échanges de bout en bout (DP-54 ; règle src/donnees/echanges.ts, « BelivaY ne perd jamais ») :
// listes des proches suivies, offrir avec la livraison laissée au destinataire, invités rappelés, remerciement,
// colis refusé sans frais avant l'expédition, article cher offert à plusieurs (cotisation), panier payé pour un
// proche, liste envoyée dans l'application d'un proche trouvé par son numéro, cotisation sans la livraison.
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

test('cadeaux et échanges de bout en bout', async ({ page }) => {
  // 1. La liste d'un proche, suivie, depuis Mes listes ; offrir en laissant la livraison à Mireille.
  await page.goto('/listes')
  const mireille = page.locator('.blv-proche', { hasText: 'Mireille · Mon anniversaire' })
  await expect(mireille).toContainText('3 jours avant')
  await mireille.getByRole('link', { name: 'Voir la liste de Mireille' }).click()
  await expect(page).toHaveURL(/liste-publique\?l=m3Rq8z/)
  await expect(page.locator('.blv-rebours')).toContainText('avant la remise du')
  await expect(page.getByRole('switch', { name: 'Suivre la liste de Mireille' })).toHaveAttribute('aria-checked', 'true')
  await page.locator('.card', { hasText: 'Café arabica' }).getByRole('link', { name: 'Offrir cet article' }).click()
  await expect(page.locator('.recap .total')).toContainText('6 400')
  await page.getByRole('radio', { name: 'Mireille paie la livraison' }).click()
  await expect(page.locator('.recap .total')).toContainText('5 500')
  await expect(page.locator('.blv-quipaie .note')).toContainText('Ta garantie')
  await page.getByLabel(/^Ton prénom/).fill('Carine')
  await page.getByLabel('Ton e-mail, pour suivre le cadeau').fill('carine@exemple.cm')
  await page.getByLabel('Ton numéro MTN ou Orange').fill('677112241')
  await page.getByRole('button', { name: 'Offrir · payer 5 500 F' }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.pg-t')).toContainText('C’est offert, Carine !')
  await expect(page.locator('main')).toContainText('Mireille la paie au retrait (900 F)')
  await page.goto('/listes')
  const envoi = page.locator('.blv-colis', { hasText: 'Café arabica' })
  await expect(envoi).toContainText('En attente de son accord')
  await expect(envoi).toContainText('pour Mireille')

  // 2. Ma liste d'anniversaire : les invités, le rappel (un tous les 3 jours), le merci à Paul.
  await page.goto('/liste-envies?id=anniv')
  await expect(page.locator('.blv-invites')).toContainText('a offert : Batterie externe 20 000 mAh')
  await page.getByRole('button', { name: 'Rappeler à mes invités' }).click()
  await expect(page.locator('[role=status]', { hasText: 'Rappel envoyé' })).toContainText('Rappel envoyé à 1 invité')
  await page.getByRole('button', { name: 'Rappeler à mes invités' }).click()
  await expect(page.locator('[role=status]', { hasText: 'Un rappel est déjà parti' })).toBeVisible()
  await page.getByRole('button', { name: 'Remercier Paul' }).click()
  await page.getByLabel('Ton mot pour Paul').fill('Merci Paul, elle me sauve tous les jours !')
  await page.getByRole('button', { name: 'Envoyer le merci' }).click()
  await expect(page.locator('.blv-merci')).toContainText('Merci envoyé à Paul')

  // 3. Le colis de Paul : la livraison est à payer au retrait ; refusé avant l'expédition, sans frais.
  await page.goto('/listes')
  const sandales = page.locator('.blv-colis', { hasText: 'Sandales cuir femme' })
  await expect(sandales).toContainText('tu paies 900 F de livraison au retrait')
  await sandales.getByRole('link', { name: 'Refuser le colis' }).click()
  await expect(sandales).toContainText('tu refuses sans frais')
  await sandales.getByRole('button', { name: 'Oui, refuser le colis' }).click()
  await expect(sandales).toContainText('Refusé. Paul récupère 14 900 F.')

  // 4. Un article cher offert à plusieurs : la participation bascule en cotisation ; atteinte, il est offert.
  await page.goto('/liste-publique?l=m3Rq8z')
  await page.locator('.card', { hasText: 'Montre acier' }).getByRole('link', { name: 'Trop cher seul ? Cotiser à plusieurs' }).click()
  await expect(page).toHaveURL(/cotisation-participer\?c=/)
  await expect(page.locator('.pg-t')).toContainText('Montre acier bracelet cuir pour Mireille')
  await page.locator('.chip', { hasText: 'Compléter' }).click()
  await page.getByLabel('Ton prénom').fill('Carine')
  await page.getByLabel('Ton numéro MTN ou Orange').fill('677112241')
  await page.getByRole('button', { name: /Participer · / }).click()
  await page.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page.locator('.note.green')).toContainText('L’objectif est atteint')
  await page.getByRole('link', { name: 'Voir la liste de Mireille' }).click()
  await expect(page.locator('.card', { hasText: 'Montre acier' })).toContainText('Déjà offert')

  // 5. La liste envoyée dans l'application d'un proche trouvé par son numéro.
  await page.goto('/liste-envoyer?id=anniv')
  const envoiProches = page.locator('.blv-envoi')
  await expect(envoiProches.locator('.chip', { hasText: 'Paul' })).toHaveAttribute('aria-pressed', 'true')
  await envoiProches.getByLabel('Ajouter par son numéro').fill('678904455')
  await envoiProches.getByRole('button', { name: 'Chercher' }).click()
  await expect(envoiProches).toContainText('Joël est sur BelivaY')
  await envoiProches.getByRole('button', { name: 'Envoyer dans leur application (1)' }).click()
  await expect(envoiProches).toContainText('Envoyé à 1 proche')
  await envoiProches.getByRole('button', { name: 'Montrer le QR code' }).click()
  await expect(envoiProches.locator('.qr svg')).toBeVisible()

  // 6. Le panier payé pour un proche : Paul paie la livraison au retrait.
  await page.goto('/panier')
  const pourQui = page.locator('.blv-pourqui')
  await pourQui.getByRole('radio', { name: 'Pour un proche' }).click()
  await pourQui.getByRole('radio', { name: 'Paul', exact: true }).click()
  await expect(pourQui.getByLabel('Relais de Paul')).toHaveValue('Relais Mvog-Ada')
  await pourQui.getByRole('radio', { name: 'Paul paie la livraison' }).click()
  await pourQui.getByRole('button', { name: /^Payer pour Paul · / }).click()
  await pourQui.getByRole('button', { name: 'J’ai validé sur mon téléphone' }).click()
  await expect(page).toHaveURL(/listes\?envoi=BLV-/)
  await expect(page.locator('.pg-t')).toContainText('Payé pour Paul')
  await expect(page.locator('.kv', { hasText: 'Paul, au retrait' })).toContainText(/\d F/)

  // 7. Une cotisation d'anniversaire où Nadège paie la livraison : l'objectif ne la compte pas.
  await page.goto('/cotisation?p=cafe&beneficiaire=Nadège&occasion=Anniversaire')
  await expect(page.getByLabel('Prénom du bénéficiaire')).toHaveValue('Nadège')
  await expect(page.locator('.cl15-tot')).toContainText('6 528')
  await page.getByRole('radio', { name: 'Nadège paie la livraison' }).click()
  await expect(page.locator('.cl15-tot')).toContainText('5 610')
})
