// Surveiller et agir depuis la console : bloquer puis rétablir l'accès d'un acteur (client aussitôt, vendeur à quatre
// yeux), programmer puis arrêter une promotion de la plateforme, remplacer la photo d'une bannière de l'accueil. Chaque
// geste est motivé et part au pont pour l'espace concerné (acces_change, promotion, photo_remplacee).
import { expect, test, type Page } from '@playwright/test'
import { FR, adresse, figerHorloge, ouvrir } from './commun'

const MOTIF = 'Motif assez long pour une décision, écrit, cité et journalisé.'
async function motiver(page: Page, bouton: RegExp) {
  const f = page.getByRole('dialog').filter({ has: page.locator('textarea') })
  await f.locator('textarea').fill(MOTIF)
  await f.getByRole('button', { name: bouton }).click()
  await expect(f).toBeHidden()
}
/** Événements de la console que l'espace `pour` lit dans le pont. */
const pont = (page: Page, pour: string, type: string) =>
  page.evaluate(([p, ty]) => (window as unknown as { __blvPont: { evenementsPour: (d: string) => { type: string }[] } }).__blvPont.evenementsPour(p).filter((e) => e.type === ty), [pour, type] as const) as Promise<Record<string, unknown>[]>

test.beforeEach(async ({ page }) => figerHorloge(page))

test('accès : le Service client bloque puis rétablit le compte d’un client ; le site le reçoit', async ({ page }) => {
  await ouvrir(page, adresse('clients', 'id=c-4217'), { ...FR, role: 'support' })
  await page.getByRole('button', { name: 'Bloquer l’accès' }).click()
  await motiver(page, /Bloquer l’accès/)
  await expect(page.locator('[data-acces="bloque"]')).toContainText('Accès bloqué par BelivaY')
  expect((await pont(page, 'client', 'acces_change')).at(-1)).toMatchObject({ espace: 'client', acteur: 'c-4217', etat: 'bloque', motif: MOTIF })
  await page.getByRole('button', { name: 'Rétablir l’accès' }).click()
  await motiver(page, /Rétablir l’accès/)
  await expect(page.locator('[data-acces="autorise"]')).toContainText('Accès au compte')
  expect((await pont(page, 'client', 'acces_change')).at(-1)).toMatchObject({ etat: 'autorise' })
})

test('accès : bloquer un vendeur passe à quatre yeux ; un autre compte Direction contresigne, le blocage s’applique', async ({ page }) => {
  await ouvrir(page, adresse('vendeurs', 'id=v-techno'), FR)
  await page.getByRole('button', { name: 'Bloquer l’accès' }).click()
  await motiver(page, /Envoyer au second validateur/)
  await expect(page.getByText(/Blocage envoyé au second validateur \(QY-/)).toBeVisible()
  expect(await pont(page, 'vendeur', 'acces_change')).toHaveLength(0)
  await page.goto(adresse('quatreyeux', 'agent=a-helene'))
  const carte = page.locator('.e-qy', { hasText: 'Techno Bastos' })
  await carte.locator('textarea').fill('Blocage relu : signalements concordants, accès suspendu le temps de l’enquête.')
  await carte.getByRole('button', { name: 'Contresigner' }).click()
  await page.goto(adresse('vendeurs', 'id=v-techno'))
  await expect(page.locator('[data-acces="bloque"]')).toBeVisible()
  expect((await pont(page, 'vendeur', 'acces_change')).at(-1)).toMatchObject({ espace: 'vendeur', acteur: 'v-techno', etat: 'bloque' })
})

test('promotion : la Direction programme une promotion, le Service client l’arrête ; le site et les vendeurs la reçoivent', async ({ page }) => {
  await ouvrir(page, adresse('promotions', 's=plateforme'), FR)
  await page.getByLabel('Titre affiché au client').fill('Paie de fin de mois')
  await page.getByRole('button', { name: 'Programmer la promotion' }).click()
  await motiver(page, /Programmer la promotion/)
  const ligne = page.getByRole('row', { name: /Paie de fin de mois/ })
  await expect(ligne).toContainText('Programmée')
  expect((await pont(page, 'client', 'promotion')).at(-1)).toMatchObject({ etat: 'programmee', titre: 'Paie de fin de mois', remise: '−10 %', cible: 'Tout le catalogue' })
  expect(await pont(page, 'vendeur', 'promotion')).toHaveLength(1)
  await page.goto(adresse('promotions', 's=plateforme&role=support'))
  await expect(page.getByLabel('Titre affiché au client')).toHaveCount(0)
  await page.getByRole('row', { name: /Paie de fin de mois/ }).getByRole('button', { name: 'Arrêter' }).click()
  await motiver(page, /Arrêter la promotion/)
  await expect(page.getByRole('row', { name: /Paie de fin de mois/ })).toContainText('Arrêtée')
  expect((await pont(page, 'client', 'promotion')).at(-1)).toMatchObject({ etat: 'arretee' })
})

test('photo : la Direction remplace la bannière « Mode femme » puis la retire ; le site la reçoit', async ({ page }) => {
  await ouvrir(page, adresse('contenu-site'), FR)
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 600
    c.height = 200
    const x = c.getContext('2d')!
    x.fillStyle = '#c2410c'
    x.fillRect(0, 0, 600, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  const carte = page.locator('[data-photo="banniere:femme"]')
  await carte.locator('input[type=file]').setInputFiles({ name: 'femme.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await page.getByRole('button', { name: 'Utiliser cette photo' }).click()
  await motiver(page, /Ajouter la photo/)
  await expect(carte).toContainText('Remplacée')
  const e = (await pont(page, 'client', 'photo_remplacee')).at(-1)!
  expect(e).toMatchObject({ cible: 'banniere', id: 'femme' })
  expect(String(e.photo)).toMatch(/^data:image\/jpeg;base64,/)
  await carte.getByRole('button', { name: 'Retirer' }).click()
  await motiver(page, /Retirer la photo/)
  await expect(carte).toContainText('Photo d’origine')
  expect((await pont(page, 'client', 'photo_remplacee')).at(-1)).toMatchObject({ cible: 'banniere', id: 'femme', photo: null })
})
