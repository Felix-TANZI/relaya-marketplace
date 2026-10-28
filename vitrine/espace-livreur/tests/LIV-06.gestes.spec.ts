// Gestes du ramassage (LIV-06 : P10 à P15) : arrivée et notification au vendeur, contrôle C1 bloquant (six cases,
// photo 1, photo floue refusée), audit C4 révélé après le contrôle, étiquette déjà liée refusée, code faux puis bon :
// la garde passe au livreur ; refus motivé (photo et note obligatoires).
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'
import { arriver, recuperer, emballer, photo, re, taperCode } from './LIV-06.parcours'

const CLAIR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, '#tournee', CLAIR)
})

test('arrivée : « Votre livreur est là » part au vendeur ; « vendeur pas prêt » attend la fin de l’attente', async ({ page }) => {
  await arriver(page)
  await expect(page).toHaveURL(/\/arrivee\?a=A2/)
  await expect(page.getByText(re('« Votre livreur est là » envoyé à Maison Ngono'))).toBeVisible()
  await expect(page.getByText('Serge Atangana')).toBeVisible()
  await page.getByRole('button', { name: 'Un problème ?' }).click()
  await page.getByRole('link', { name: re('Colis pas prêt') }).click()
  await expect(page).toHaveURL(/s=attente/)
  await expect(page.getByRole('button', { name: re('Déclarer « vendeur pas prêt »') })).toBeDisabled()
  await expect(page.getByText(re('Possible à partir de'))).toBeVisible()
  // Compte à rebours en direct jusqu'à la déclaration possible.
  await expect(page.getByRole('timer').filter({ hasText: re('encore') })).toHaveText(/encore \d{2}:\d{2}/)
  // Aide de l'étape, dépliée sur place.
  await page.getByRole('button', { name: re('Que faire à l’arrivée ?') }).click()
  await expect(page.getByText(re('Boutique fermée : photo de la devanture'))).toBeVisible()
})

test('arrivée : boutique fermée, l’incident ne part pas sans la photo de la devanture et la note', async ({ page }) => {
  await arriver(page)
  await page.getByRole('button', { name: 'Un problème ?' }).click()
  await page.getByRole('link', { name: re('Vendeur fermé') }).click()
  await expect(page).toHaveURL(/s=ferme/)
  const envoyer = page.getByRole('button', { name: re('Envoyer l’incident') })
  await expect(envoyer).toBeDisabled()
  await photo(page)
  await expect(envoyer).toBeDisabled()
  await page.getByLabel(re('Note ·')).fill('Rideau baissé, aucune affiche, personne sur place.')
  await expect(envoyer).toBeEnabled()
})

test('contrôle : bloqué sans les six cases et la photo 1 ; une photo floue n’est pas enregistrée', async ({ page }) => {
  await arriver(page)
  await recuperer(page)
  const suite = page.getByRole('button', { name: re('Emballer et sceller') })
  await expect(suite).toBeDisabled()
  await page.getByRole('button', { name: re('Que contrôler ?') }).click()
  await expect(page.getByRole('link', { name: re('Toute l’aide et le SOS') })).toBeVisible()
  await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
  await page.getByRole('button', { name: re('Prendre la photo') }).first().click()
  await page.locator('.lv-cam').getByRole('button', { name: 'Photo floue' }).click()
  await expect(page.locator('.lv-cam').getByText(re('Photo floue : elle n’est pas enregistrée'))).toBeVisible()
  await page.locator('.lv-cam').getByRole('button', { name: re('Fermer l’appareil photo') }).click()
  await page.locator('.lv-cam').getByRole('button', { name: 'Quitter' }).click()
  await expect(suite).toBeDisabled()
})

test('chaîne complète : audit révélé après le contrôle, étiquette déjà liée refusée, code faux puis bon', async ({ page }) => {
  test.setTimeout(120_000)
  await arriver(page)
  await recuperer(page)
  // Colis 1 : étiquette déjà liée (BV 24 8205, rouleau du matin) refusée, puis la suivante.
  const cases = ['Bon article', 'Bonne variante', 'Bonne quantité', 'État conforme', 'Aucun dommage visible', 'Accessoires annoncés présents']
  await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
  for (const c of cases) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Emballer et sceller') }).click()
  await page.getByLabel(re('Ou saisissez le numéro à la main')).fill('8205')
  await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
  await expect(page.getByText(re('Étiquette déjà liée à une autre commande'))).toBeVisible()
  await page.getByLabel(re('Ou saisissez le numéro à la main')).fill('9999')
  await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
  await expect(page.getByText(re('Étiquette d’un autre rouleau'))).toBeVisible()
  await emballer(page, '8206')
  // Colis 2 : le serveur révèle l'audit C4 après le contrôle.
  await expect(page).toHaveURL(/\/controle\?a=A2&c=BLV-00014-1/)
  await page.getByRole('radio', { name: re('Oui : photographier toutes les faces') }).click()
  for (const c of cases) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Emballer et sceller') }).click()
  await expect(page.getByText(re('Contrôle approfondi demandé par BelivaY'))).toBeVisible()
  for (const b of await page.getByRole('radio', { name: 'Conforme' }).all()) await b.click()
  for (let i = 0; i < 3; i++) await photo(page)
  await page.getByRole('button', { name: re('Terminer l’audit') }).click()
  await emballer(page, '8207')
  // Code : faux, puis celui du vendeur.
  await expect(page).toHaveURL(/\/code-remise/)
  await taperCode(page, '111111')
  await page.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(page.getByText(re('Code incorrect · 2 essais restants'))).toBeVisible()
  await taperCode(page, '305718')
  await page.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(page.getByRole('heading', { name: 'Remise validée' })).toBeVisible()
  await expect(page.getByText(re('Maison Ngono voit « Remis à Serge'))).toBeVisible()
  await page.getByRole('link', { name: re('Continuer la tournée') }).click()
  await expect(page.locator('.l-pastilles')).toContainText(re('4 colis sur vous'))
})

test('refus : motif, photo et note obligatoires ; le vendeur est prévenu, le colis reste chez lui', async ({ page }) => {
  await arriver(page)
  await page.goto('refus?a=A2&c=BLV-00011-1')
  const envoyer = page.getByRole('button', { name: re('Envoyer le refus') })
  const continuer = page.getByRole('button', { name: re('Continuer : photo et note') })
  await expect(continuer).toBeDisabled()
  await page.getByRole('radio', { name: re('Abîmé') }).click()
  await continuer.click()
  await expect(envoyer).toBeDisabled()
  await photo(page)
  await page.getByLabel(re('Note : ce que vous constatez')).fill('Couture déchirée sur la manche gauche, visible.')
  // « Annuler » pendant 5 s : le refus ne part pas, le formulaire reste rempli.
  await envoyer.click()
  await expect(page.getByText(re('Envoi dans'))).toBeVisible()
  await expect(envoyer).toBeDisabled()
  await page.getByRole('button', { name: 'Annuler' }).click()
  await expect(envoyer).toBeEnabled()
  await envoyer.click()
  await expect(page.locator('main').getByRole('heading', { name: 'Refus envoyé' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(re('1 colis reste à prendre à cet arrêt'))).toBeVisible()
})

