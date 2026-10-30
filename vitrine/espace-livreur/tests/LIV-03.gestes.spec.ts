// Gestes des écrans d'accès (LIV-03) : connexion par PIN, blocage, première connexion, nouveau téléphone, activation
// (charte), certification (module, quiz), état du compte (recours). Situations du jeu d'essai : ?demo=… (src/demo/scenario.ts).
import { expect, test, type Page } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

async function taper(page: Page, chiffres: string) {
  for (const c of chiffres) await page.locator('.keypad button', { hasText: new RegExp('^' + c + '$') }).click()
}

test('PIN faux puis bon : essais restants, chargement de la journée, Aujourd’hui', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  await expect(page.getByRole('heading', { name: 'Bonjour Serge' })).toBeVisible()
  await taper(page, '111111')
  await expect(page.getByRole('alert')).toContainText('PIN incorrect · 4 essais restants')
  await taper(page, '240913')
  await expect(page).toHaveURL(/\/livreur\/?$/)
  await expect(page.locator('main')).toContainText(/Maison Ngono|Élégance Bazin/)
})

test('cinq PIN faux : blocage avec minuteur, l’entreprise reste joignable', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  for (let i = 0; i < 5; i++) await taper(page, '111111')
  await expect(page.getByRole('heading', { name: 'Application verrouillée' })).toBeVisible()
  await expect(page.locator('.l3-minuteur')).toHaveText('30:00')
  await expect(page.getByRole('button', { name: 'Appeler Yafé Express' })).toBeEnabled()
})

test('première connexion : numéro, code SMS (faux puis bon), PIN en deux saisies, charte acceptée', async ({ page }) => {
  await ouvrir(page, '#connexion?demo=premiere', FR)
  await page.getByLabel('Numéro de téléphone').fill('699458103')
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(page.getByRole('heading', { name: 'Première connexion' })).toBeVisible()
  await taper(page, '000000')
  await expect(page.getByRole('alert')).toContainText('Code incorrect · 2 essais restants')
  await page.getByRole('button', { name: 'Réessayer' }).click()
  await taper(page, '481920')
  await expect(page.getByRole('heading', { name: 'Créez votre code PIN' })).toBeVisible()
  await taper(page, '111111')
  await taper(page, '111111')
  await expect(page.getByRole('alert')).toContainText('PIN trop simple')
  await taper(page, '135792')
  await taper(page, '135792')
  await expect(page).toHaveURL(/\/activation$/)
  await page.getByRole('button', { name: 'Lire et accepter la charte' }).click()
  await page.getByText('J’ai lu la charte et je m’engage à la respecter.').click()
  await page.getByRole('button', { name: 'J’accepte la charte' }).click()
  await expect(page.getByRole('button', { name: /Photographier : CNI · recto/ })).toBeVisible()
})

test('onglet « Première connexion » : invitation de l’entreprise expliquée, numéro en étape 1 sur 3 ; un seul compte de démonstration', async ({ page }) => {
  await ouvrir(page, '#connexion', FR)
  await expect(page.getByRole('button', { name: 'Essayer avec le compte de démonstration' })).toHaveCount(1)
  await page.getByRole('link', { name: 'Première connexion' }).click()
  await expect(page).toHaveURL(/premiere=1/)
  await expect(page.getByRole('heading', { name: 'Première connexion' })).toBeVisible()
  await expect(page.getByText('Votre compte est créé par l’entreprise de livraison qui vous invite')).toBeVisible()
  await expect(page.getByText('Étape 1 sur 3')).toBeVisible()
  await expect(page.getByLabel('Numéro de téléphone')).toBeVisible()
})

test('nouveau téléphone : trois conséquences, puis code SMS et PIN', async ({ page }) => {
  await ouvrir(page, '#connexion?demo=premiere', FR)
  await page.getByLabel('Numéro de téléphone').fill('677510827')
  await page.getByRole('button', { name: 'Recevoir le code' }).click()
  await expect(page.getByRole('heading', { name: 'Nouveau téléphone détecté' })).toBeVisible()
  await expect(page.locator('.l3-csq .li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Continuer avec ce téléphone' }).click()
  await taper(page, '481920')
  await expect(page.getByRole('heading', { name: 'Bonjour Serge' })).toBeVisible()
  await taper(page, '240913')
  await expect(page).toHaveURL(/\/livreur\/?$/)
})

test('certification : module lu jusqu’au bout, puis quiz tiré et corrigé', async ({ page }) => {
  await ouvrir(page, '#certification?demo=activation', FR)
  for (const titre of ['Les incidents', 'Sécurité et conduite']) {
    await page.locator('.l3-module', { hasText: titre }).click()
    const suivant = page.getByRole('button', { name: /Carte suivante|Terminer le module/ })
    while ((await suivant.textContent())?.includes('Carte suivante')) await suivant.click()
    await suivant.click()
    await expect(page.locator('.l3-module-vue')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Commencer le quiz' }).click()
  await expect(page.getByText('Question 1 sur 20')).toBeVisible()
  for (let i = 0; i < 20; i++) {
    await page.locator('.l3-reponse').first().click()
    await page.getByRole('button', { name: /Valider ma réponse|Envoyer mes réponses/ }).click()
  }
  await expect(page.locator('.l3-quiz')).toHaveCount(0)
  await expect(page.locator('.hero')).toContainText(/Certifié BelivaY|Pas encore réussi/)
})

test('compte suspendu : motif, recours sans numéro de téléphone, une seule fois', async ({ page }) => {
  await ouvrir(page, '#compte?demo=suspendu', FR)
  await expect(page.locator('.hero')).toContainText('Accès suspendu · niveau 3')
  await expect(page.getByRole('heading', { name: 'Vous ne recevez plus de nouveau paquet' })).toBeVisible()
  await expect(page.locator('.l3-motif')).toContainText('Demande d’argent liquide')
  await page.getByRole('button', { name: 'Faire un recours' }).click()
  const champ = page.getByLabel('Ce que vous contestez')
  await champ.fill('Le client m’a appelé au 677 12 34 56 pour me proposer de l’argent, je n’ai rien demandé.')
  await page.getByRole('button', { name: 'Envoyer le recours' }).click()
  await expect(page.getByRole('alert')).toContainText('Retirez le numéro de téléphone')
  await champ.fill('Je n’ai jamais demandé d’argent : le client a proposé un pourboire et je l’ai refusé devant lui.')
  await page.getByRole('button', { name: 'Envoyer le recours' }).click()
  await expect(page.getByText(/Recours déposé le/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Faire un recours' })).toHaveCount(0)
})
