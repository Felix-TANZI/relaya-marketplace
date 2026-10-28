// Liens profonds entre groupes d'écrans (vague d'intégration, ARL-45) : chaque écran accepte ce que les autres lui
// envoient, sous un seul nom de paramètre par notion :
//   scan = valeur lue par l'appareil photo commun (retrait, réception) ; ref = référence d'un colis (colis, retrait,
//   litiges) ; id = un dossier (dossier-litige) ; retour = un retour (litiges) ; onglet = un onglet de l'écran
//   (stock : urgents, payants, groupage, gratuits, hors_garde ; litiges : constat, retour, dossiers) ; fil = un fil,
//   sujet = un message au support commencé (messagerie) ; sujet = une question (aide).
import { expect, test } from '@playwright/test'
import { figerHorloge, ouvrir } from './commun'

const FR = { nom: 'clair', theme: 'light', lang: 'fr' } as const
const main = '#app main'

/** Code de démonstration d'un colis (même calcul que src/demo/colis.ts). */
function codeDemo(colis: string): string {
  let x = 0x811c9dc5
  for (const c of 'code:' + colis) x = Math.imul(x ^ c.charCodeAt(0), 0x01000193) >>> 0
  return String(x % 10 ** 6).padStart(6, '0')
}

test.beforeEach(async ({ page }) => {
  await figerHorloge(page)
})

test('retrait?scan= : le QR lu par l’appareil photo ouvre la remise ; un code faux est refusé', async ({ page }) => {
  await ouvrir(page, `#retrait?scan=BLV1.${codeDemo('BLV-00041-1')}`, FR)
  await expect(page).toHaveURL(/remise=/)
  await expect(page.locator(main)).toContainText('BLV-00041-1')
  await ouvrir(page, '#retrait?scan=BLV1.000000', FR)
  await expect(page.locator(main)).toContainText('Code incorrect')
})

test('retrait?ref= : la fiche colis mène au guichet, le client présente son code', async ({ page }) => {
  await ouvrir(page, '#retrait?ref=BLV-00041-1', FR)
  await expect(page.locator(main)).toContainText('Colis BLV-00041-1 : le client présente son code de retrait.')
})

test('colis?ref=, litiges?ref=, litiges?retour=, litiges?onglet=, dossier-litige?id=', async ({ page }) => {
  await ouvrir(page, '#colis?ref=BLV-00041-1', FR)
  await expect(page.locator(main)).toContainText('BLV-00041-1')
  await ouvrir(page, '#litiges?ref=BLV-00042-1', FR)
  await expect(page.getByText(/BLV-00042-1 · en garde/)).toBeVisible()
  await ouvrir(page, '#litiges?retour=RT-0418', FR)
  await expect(page.locator(main)).toContainText('RT-0418')
  await ouvrir(page, '#litiges?onglet=dossiers', FR)
  await expect(page.locator(main)).toContainText('LT-0931 · BLV-00043-1')
  await ouvrir(page, '#dossier-litige?id=CS-2207', FR)
  await expect(page.locator(main)).toContainText('LT-0931 · BLV-00043-1')
})

test('stock?onglet= : l’onglet demandé est ouvert', async ({ page }) => {
  await ouvrir(page, '#stock?onglet=groupage', FR)
  await expect(page.locator(main)).toContainText('BLV-00047-1')
})

test('messagerie?fil= et ?sujet= ; aide?sujet= ; reception?scan= consommé', async ({ page }) => {
  await ouvrir(page, '#messagerie?fil=T-874', FR)
  await expect(page.locator('.p-rj1mot')).toContainText('Collectes et livraisons')
  await ouvrir(page, '#messagerie?sujet=PQ-Z1-261013-003', FR)
  await expect(page.getByRole('textbox', { name: 'Votre message' })).toHaveValue(/PQ-Z1-261013-003/)
  await ouvrir(page, '#aide?sujet=mode-papier', FR)
  await expect(page.locator('[data-question="mode-papier"] button').first()).toHaveAttribute('aria-expanded', 'true')
  await ouvrir(page, '#reception?scan=BLV-00099-9', FR)
  await expect(page).not.toHaveURL(/scan=/)
})
