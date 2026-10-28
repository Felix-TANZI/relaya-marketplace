// Lisibilité mesurée sur TOUTES les routes, en clair et en sombre, au téléphone et à l'ordinateur (REVUE-CONFORMITE §5) :
// contraste AA de chaque texte visible, cibles tactiles de 44 × 44 px au moins (tests/lisibilite.ts).
import { expect, test } from '@playwright/test'
import { FR, OUVERTES, adresse, figerHorloge, ouvrir, type Rendu } from './commun'
import { auditer } from './lisibilite'

const SOMBRE: Rendu = { ...FR, nom: 'sombre, français', theme: 'dark' }
// Détails ouverts (une fiche, un paquet, une affectation, un incident) : en plus des routes nues.
const DETAILS = ['livreur?id=l-brice', 'paquet?id=PQ-Z3-261013-009', 'paquet?id=PQ-Z3-261013-001', 'affectation?id=PQ-Z3-261013-007', 'incidents?id=IN-122', 'missions?id=MS-Z3-261013-001']
const PAGES = [...OUVERTES, 'connexion', ...DETAILS].filter((r, i, t) => t.indexOf(r) === i)
const TAILLES = [
  { nom: 'téléphone', viewport: { width: 390, height: 844 } },
  { nom: 'ordinateur', viewport: { width: 1440, height: 900 } },
]

for (const taille of TAILLES) {
  test.describe(taille.nom, () => {
    test.use({ viewport: taille.viewport })
    for (const rendu of [FR, SOMBRE]) {
      for (const route of PAGES) {
        test(`${route} · ${rendu.theme === 'dark' ? 'sombre' : 'clair'}`, async ({ page }) => {
          await figerHorloge(page)
          await ouvrir(page, adresse(route.split('?')[0], route.split('?')[1]), rendu)
          await page.waitForTimeout(150)
          const ecarts = await auditer(page)
          expect(ecarts.map((e) => `${e.genre} · ${e.mesure} · ${e.ou} « ${e.texte} »`)).toEqual([])
        })
      }
      test(`connexion déconnecté · ${rendu.theme === 'dark' ? 'sombre' : 'clair'}`, async ({ page }) => {
        await figerHorloge(page)
        await ouvrir(page, adresse('profil'), rendu)
        await page.locator('button', { hasText: 'Se déconnecter' }).click()
        await expect(page.getByLabel('Numéro +237 ou e-mail')).toBeVisible()
        // PW_MOUVEMENTS=1 : l'entrée de page joue ; on mesure les couleurs une fois l'animation finie.
        await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
        const ecarts = await auditer(page)
        expect(ecarts.map((e) => `${e.genre} · ${e.mesure} · ${e.ou} « ${e.texte} »`)).toEqual([])
      })
    }
  })
}

// Texte à 140 % (la plus grande des 8 tailles) : aucune page ne déborde ni ne coupe un texte au téléphone.
test.describe('texte à 140 %', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  for (const route of PAGES) {
    test(route, async ({ page }) => {
      await figerHorloge(page)
      await ouvrir(page, adresse(route.split('?')[0], route.split('?')[1]), FR)
      await page.evaluate(() => localStorage.setItem('blv_e_echelle', '140'))
      await page.reload()
      await page.waitForLoadState('networkidle')
      expect(await page.evaluate(() => document.documentElement.dataset.echelle)).toBe('140')
      const deborde = await page.evaluate(() => {
        const l = document.documentElement.clientWidth
        const hors = Array.from(document.querySelectorAll('main *, header *'))
          .filter((e) => {
            const r = e.getBoundingClientRect()
            if (r.width < 1 || r.right <= l + 1) return false
            // Contenu qu'on fait défiler exprès (onglets, tableau large) : son conteneur défile.
            for (let p = e.parentElement; p; p = p.parentElement) {
              const o = getComputedStyle(p).overflowX
              if ((o === 'auto' || o === 'scroll' || o === 'hidden') && p.getBoundingClientRect().right <= l + 1) return false
            }
            return true
          })
          .map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' « ' + (e.textContent ?? '').trim().slice(0, 30) + ' »')
        return { scroll: document.documentElement.scrollWidth - l, hors: hors.slice(0, 8) }
      })
      expect(deborde).toEqual({ scroll: 0, hors: [] })
    })
  }
})
