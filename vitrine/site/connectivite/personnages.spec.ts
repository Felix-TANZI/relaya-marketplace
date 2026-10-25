// Compte de démonstration (cadre d'accès commun, compte/acces.tsx : AccesDemo) : sur l'écran de connexion de chacune des
// cinq applications, UN seul compte, celui de l'application ouverte (« Essayer avec le compte de démonstration »), se
// connecte d'un toucher et arrive dans son espace ; les comptes des autres applications n'y sont plus. Ouvert avec
// « ?personnage=1 », il se connecte seul. La rangée « Changer d'espace » mène à la connexion des autres applications.
import { expect, test } from '@playwright/test'
import { APPS, CHEMIN, CLAIR, ORDINATEUR, contexte, ouvrir, type App } from './commun'

const NOMS: Record<App, string> = { client: 'Carine M.', vendeur: 'Boutique B', entreprise: 'Yafé Express', livreur: 'Serge A.', relais: 'Rose M.' }

for (const r of [CLAIR, { ...CLAIR, theme: 'dark' as const, viewport: ORDINATEUR }])
  test(`un compte de démonstration par application, un clic · ${r.theme}`, async ({ browser }) => {
    test.setTimeout(120_000)
    const ctx = await contexte(browser, r)
    const erreurs: string[] = []
    for (const a of APPS) {
      const p = await ouvrir(ctx, a, 'connexion')
      p.on('pageerror', (e) => erreurs.push(`${a} : ${e.message}`))
      const demo = p.locator('section.axc-demo')
      await expect(demo).toBeVisible({ timeout: 15_000 })
      await expect(demo.getByRole('button')).toHaveCount(1)
      await expect(demo).toContainText(NOMS[a])
      // Les autres espaces : la connexion de chaque application, sur la même origine.
      const espaces = p.getByRole('navigation', { name: /Changer d’espace|Switch space/ })
      for (const b of APPS.filter((x) => x !== a)) await expect(espaces.locator(`a[href="${CHEMIN[b]}connexion"]`)).toHaveCount(1)
      await demo.getByRole('button', { name: 'Essayer avec le compte de démonstration' }).click()
      await expect(p).not.toHaveURL(/\/connexion/, { timeout: 15_000 })
      await p.close()
    }
    // Ouvert avec « ?personnage=1 » : la connexion se fait seule.
    const v = await ouvrir(ctx, 'vendeur', 'connexion?personnage=1')
    await expect(v).not.toHaveURL(/\/connexion/, { timeout: 15_000 })
    expect(erreurs).toEqual([])
    await ctx.close()
  })
