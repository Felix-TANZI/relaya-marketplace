// Changer de compte sur le même appareil : le compte choisi reste ouvert après un rechargement, et tout ce qui
// dépend du compte (type, devise, espace diaspora) suit ; on revient au premier compte d'un toucher, depuis le compte
// ou depuis l'écran de connexion. Comptes de démonstration seulement.
import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-13T09:15:00Z'))
})

async function inscrireDiaspora(page: Page) {
  await page.goto('/inscription-diaspora')
  await page.getByRole('link', { name: 'Avec mon e-mail' }).click()
  await page.getByLabel('Prénom').fill('Hervé')
  await page.getByLabel('Nom', { exact: true }).fill('Mbarga')
  await page.getByLabel('E-mail').fill('herve.mbarga@exemple.fr')
  await page.getByLabel('Pays où tu vis').selectOption('France')
  await page.getByLabel('Ville').fill('Lyon')
  await page.getByLabel('Date de naissance').fill('1990-05-14')
  await page.getByLabel('Ton numéro de téléphone').fill('612345678')
  await page.getByLabel('Mot de passe').fill('Belivay2026')
  await page.getByRole('checkbox', { name: /J’achète pour mes proches/ }).click()
  await page.getByRole('button', { name: 'Recevoir mes codes (SMS et e-mail)' }).click()
  await page.getByLabel('Code reçu par SMS').fill('503917')
  await page.getByLabel('Code reçu par e-mail').fill('284615')
  await page.getByRole('button', { name: 'Créer mon compte diaspora' }).click()
  await expect(page).toHaveURL(/\/proches$/)
}

test('compte A → diaspora → rechargement : diaspora reste ouvert ; retour à A depuis la connexion', async ({ page }) => {
  // Compte A : Carine (Cameroun), puis un compte diaspora créé sur le même téléphone.
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Carine Mballa')
  await inscrireDiaspora(page)

  // Depuis le compte : revenir à A, puis passer au compte diaspora.
  await page.goto('/compte')
  await page.getByRole('button', { name: 'Changer de compte' }).click()
  await expect(page.getByRole('dialog')).toContainText('Diaspora · France')
  await page.getByRole('button', { name: 'Passer au compte de Carine Mballa' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Carine Mballa')
  await expect(page.locator('main')).not.toContainText('Espace diaspora')

  await page.getByRole('button', { name: 'Changer de compte' }).click()
  await page.getByRole('button', { name: 'Passer au compte de Hervé Mbarga' }).click()
  await expect(page).toHaveURL(/\/espace-diaspora$/)

  // Rechargement : c'est bien le compte diaspora qui s'ouvre.
  await page.reload()
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Hervé Mbarga')
  await expect(page.locator('main')).toContainText('Espace diaspora')

  // Depuis l'écran de connexion : les comptes du téléphone, un toucher pour revenir à A.
  await page.goto('/connexion')
  const liste = page.getByRole('region', { name: 'Sur ce téléphone' })
  await expect(liste.getByRole('button', { name: 'Hervé Mbarga, compte ouvert' })).toBeVisible()
  await liste.getByRole('button', { name: 'Passer au compte de Carine Mballa' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.reload()
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Carine Mballa')
  await expect(page.locator('main')).not.toContainText('Espace diaspora')

  // Le personnage « Carine M. » ouvre toujours Carine, même quand un autre compte est ouvert.
  await page.goto('/compte?sheet=comptes')
  await page.getByRole('button', { name: 'Passer au compte de Hervé Mbarga' }).click()
  await expect(page).toHaveURL(/\/espace-diaspora$/)
  await page.goto('/connexion')
  await page.getByRole('button', { name: 'Essayer avec le compte de démonstration' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/compte')
  await expect(page.locator('main')).toContainText('Carine Mballa')
})

test('ajouter un compte : création par e-mail aux champs vides, puis retour à la page demandée', async ({ page }) => {
  await page.goto('/compte?sheet=comptes')
  await page.getByRole('button', { name: 'Ajouter un compte' }).click()
  await expect(page).toHaveURL(/\/connexion\?ajout=1/)
  await page.getByRole('link', { name: 'Ajouter un compte' }).click()
  await expect(page.getByLabel('E-mail')).toHaveValue('')
  await page.getByLabel('Prénom').fill('Odile')
  await page.getByLabel('E-mail').fill('odile@exemple.cm')
  await page.getByRole('link', { name: 'Créer mon compte' }).click()
  await page.goto('/compte?sheet=comptes')
  const feuille = page.getByRole('dialog')
  await expect(feuille.getByRole('button', { name: 'Odile, compte ouvert' })).toBeVisible()
  await expect(feuille.getByRole('button', { name: 'Passer au compte de Carine Mballa' })).toBeVisible()

  // Une page du compte demandée sans session : après la connexion, on y revient.
  await feuille.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/commandes')
  await expect(page).toHaveURL(/\/connexion\?next=/)
  await page.getByRole('region', { name: 'Sur ce téléphone' }).getByRole('button', { name: 'Passer au compte de Carine Mballa' }).click()
  await expect(page).toHaveURL(/\/commandes$/)
})
