// Moteur de Safari (WebKit, iPhone 14) : le badge « Certifié » de la photo reste étroit et la photo défile d'une
// photo à l'autre ; voir tests/fiche-carrousel.ts.
import { devices, test } from '@playwright/test'
import { LARGEURS, badgeEtroit, ouvrirFiche, photo2 } from './fiche-carrousel'

const { defaultBrowserType: _d, ...iphone } = devices['iPhone 14']
test.use({ ...iphone, browserName: 'webkit' })

for (const theme of ['light', 'dark'] as const)
  for (const largeur of LARGEURS)
    test(`WebKit · fiche : badge étroit et défilement vers la photo 2 (${largeur} px, ${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 860 })
      await ouvrirFiche(page, theme)
      await badgeEtroit(page)
      // WebKit piloté n'a pas de geste tactile synthétique : le défilement que produit le doigt, puis l'accrochage.
      await page.locator('.fp-piste').evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.7 }))
      await photo2(page)
      await badgeEtroit(page)
    })
