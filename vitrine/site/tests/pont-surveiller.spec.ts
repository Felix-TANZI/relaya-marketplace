// Pont commun : ce que la console d'administration pilote sur le site (src/demo/pilotage-console.ts) — photo d'une
// bannière et d'un produit remplacée, promotion de la plateforme en cours (puis arrêtée), compte du client bloqué
// (bandeau sobre, levé au rétablissement).
import { expect, test, type Page } from '@playwright/test'

const LE = Date.parse('2026-10-13T13:03:00Z')
const ADMIN = (e: Record<string, unknown>, cle: string, le = LE) => ({ ...e, cle: 'admin-' + cle, app: 'admin', le })
const ajouter = (page: Page, l: unknown[]) => page.evaluate((x) => localStorage.setItem('blv_pont', JSON.stringify([...JSON.parse(localStorage.getItem('blv_pont') ?? '[]'), ...x])), l)
// Image de 2 × 1 pixels (PNG valide) : assez pour une adresse « data: » réelle.
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGM45MgDRAAI3AIf7GZJNQAAAABJRU5ErkJggg=='

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
})

test('console → client : photo de bannière et de produit, promotion de la plateforme, compte bloqué puis rétabli', async ({ page }) => {
  await page.goto('/')
  await ajouter(page, [
    ADMIN({ type: 'photo_remplacee', cible: 'banniere', id: 'femme', photo: PHOTO, motif: 'Nouvelle photo de saison' }, 'ph1'),
    ADMIN({ type: 'photo_remplacee', cible: 'produit', id: 'pagne', photo: PHOTO, motif: 'Photo reprise d’une autre boutique' }, 'ph2'),
    ADMIN({ type: 'promotion', id: 'PP-0002', etat: 'en_cours', titre: 'Paie de fin de mois', debut: 0, fin: Date.UTC(2030, 0, 1), cible: 'Tout le catalogue', remise: '−10 %' }, 'pr1'),
    ADMIN({ type: 'acces_change', espace: 'client', acteur: 'c-4217', etat: 'bloque', motif: 'Refus répétés au retrait, enquête en cours.' }, 'ac1'),
  ])
  await page.reload()
  await expect(page.locator('[data-promotion="PP-0002"]').first()).toContainText('Paie de fin de mois')
  await expect(page.locator('[data-promotion="PP-0002"]').first()).toContainText('−10 %')
  await expect(page.locator(`img[src="${PHOTO}"]`).first()).toBeAttached()
  await expect(page.locator('[data-console="acces"]')).toContainText('Refus répétés au retrait')
  await page.goto('/fiche?p=pagne')
  await expect(page.locator(`img[src="${PHOTO}"]`).first()).toBeAttached()
  await ajouter(page, [
    ADMIN({ type: 'promotion', id: 'PP-0002', etat: 'arretee', titre: 'Paie de fin de mois', debut: 0, fin: Date.UTC(2030, 0, 1), cible: 'Tout le catalogue', remise: '−10 %' }, 'pr2', LE + 1000),
    ADMIN({ type: 'acces_change', espace: 'client', acteur: 'c-4217', etat: 'autorise', motif: 'Enquête close.' }, 'ac2', LE + 1000),
  ])
  await page.goto('/')
  await expect(page.locator('[data-promotion="PP-0002"]')).toHaveCount(0)
  await expect(page.locator('[data-console="acces"]')).toHaveCount(0)
})
