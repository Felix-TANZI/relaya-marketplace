// Gestes réutilisés par les tests des groupes LIV-05, LIV-06 et LIV-07 (même agent) : photo de démonstration (le
// navigateur piloté n'a pas d'appareil photo), arrivée, ramassage complet d'un arrêt (contrôle, audit, emballage, code).
import { expect, type Page } from '@playwright/test'

export const ESP = /[\s  ]+/
/** Expression tolérante aux espaces typographiques français (« Non : … »). */
export const re = (texte: string) => new RegExp(texte.split(' ').map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\u00a0\\u202f]+'))

/** Prend la prochaine photo exigée encore vide (ou celle d'un emplacement donné) avec la photo de démonstration. */
export async function photo(page: Page, ou = page.locator('main')) {
  await ou.getByRole('button', { name: re('Prendre la photo') }).first().click()
  const cam = page.locator('.lv-cam')
  await expect(cam).toBeVisible()
  await cam.getByRole('button', { name: re('Photo de démonstration') }).click()
  await expect(cam).toHaveCount(0, { timeout: 15_000 })
}

export async function arriver(page: Page, libelle = 'Je suis arrivé') {
  await page.getByRole('button', { name: re(libelle) }).first().click()
}

/** Récupération groupée chez le vendeur (arrivée faite) : chaque colis photographié, puis « Tout récupéré ». */
export async function recuperer(page: Page) {
  await expect(page).toHaveURL(/\/arrivee/)
  // La liste est lue avant de compter les colis (le compteur « 0/2 » paraît avec elle).
  await expect(page.locator('.lvt-compteur')).toHaveText(/^0\/\d+$/)
  const boutons = page.getByRole('button', { name: /^Photographier ·/ })
  const n = await boutons.count()
  for (let i = 0; i < n; i++) {
    await boutons.first().click()
    const cam = page.locator('.lv-cam')
    await cam.getByRole('button', { name: re('Photo de démonstration') }).click()
    await expect(cam).toHaveCount(0, { timeout: 15_000 })
    await expect(boutons).toHaveCount(n - i - 1)
  }
  await page.getByRole('link', { name: 'Tout récupéré' }).click()
}

const CASES = ['Bon article', 'Bonne variante', 'Bonne quantité', 'État conforme', 'Aucun dommage visible', 'Accessoires annoncés présents']

/** Contrôle C1 du colis affiché (six cases, photo 1), jusqu'à l'écran suivant. */
export async function controler(page: Page) {
  await expect(page).toHaveURL(/\/controle/)
  await expect(page.getByRole('checkbox', { name: /^Bon article/ })).toBeVisible()
  await page.getByRole('radio', { name: re('Non : sortir le produit') }).click()
  for (const c of CASES) await page.getByRole('checkbox', { name: new RegExp('^' + c) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Emballer et sceller') }).click()
}

export async function auditer(page: Page) {
  await expect(page).toHaveURL(/\/audit/)
  await expect(page.getByRole('radio', { name: 'Conforme' })).toHaveCount(4)
  for (const b of await page.getByRole('radio', { name: 'Conforme' }).all()) await b.click()
  for (let i = 0; i < 3; i++) await photo(page)
  await page.getByRole('button', { name: re('Terminer l’audit') }).click()
}

export async function emballer(page: Page, etiquette: string) {
  await expect(page).toHaveURL(/\/emballage/)
  await expect(page.getByRole('heading', { name: 'Étiquette', exact: true })).toBeVisible()
  await page.getByLabel(re('Ou saisissez le numéro à la main')).fill(etiquette)
  await page.getByRole('button', { name: re('Lier l’étiquette') }).click()
  await expect(page.getByText(re('définitivement'))).toBeVisible()
  for (const s of ['Ruban sur toutes les ouvertures', 'Signature au marqueur', 'Étiquette collée à plat']) await page.getByRole('checkbox', { name: re(s) }).click()
  await photo(page)
  await page.getByRole('button', { name: re('Valider l’emballage') }).click()
}

export async function taperCode(page: Page, code: string) {
  for (const c of code) await page.locator('.lv-pave, .keypad').getByRole('button', { name: c, exact: true }).click()
}

/** Ramassage complet de l'arrêt en cours depuis la tournée : arrivée, colis par colis, code du vendeur. */
export async function ramasser(page: Page, colis: { audit?: boolean; etiquette: string }[], code: string) {
  await page.goto('tournee')
  await arriver(page)
  await expect(page).toHaveURL(/\/arrivee\?a=/)
  await recuperer(page)
  for (const c of colis) {
    await controler(page)
    if (c.audit) await auditer(page)
    await emballer(page, c.etiquette)
  }
  await expect(page).toHaveURL(/\/code-remise/)
  await taperCode(page, code)
  await page.getByRole('button', { name: re('Valider la remise') }).click()
  await expect(page.getByRole('heading', { name: 'Remise validée' })).toBeVisible()
}

/** Ramassage de Maison Ngono (A2) : deux colis, le second tiré pour l'audit C4. */
export const ramasserA2 = (page: Page) => ramasser(page, [{ etiquette: '8206' }, { audit: true, etiquette: '8207' }], '305718')
