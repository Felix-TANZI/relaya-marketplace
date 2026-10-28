// Mode présentation (VAGUE-AMELIORATIONS.md n° 1, src/demo/presentation.tsx) : la commande témoin rejouée dans les cinq
// applications du dist commun, ouvertes côte à côte avec « ?presentation=1 » ; bandeau « Étape n/9 » partout, chaque
// étape jouée par l'application de son acteur, suite automatique, Pause, Suivant, puis Recommencer (remise à zéro).
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { APPS, CHEMIN, CLAIR, HEURE_DEMO, ORDINATEUR, contexte, type App } from './commun'

const bandeau = (p: Page) => p.locator('[data-presentation-etape]')

async function ouvrirEnPresentation(ctx: BrowserContext, app: App, erreurs: string[]): Promise<Page> {
  const page = await ctx.newPage()
  page.on('pageerror', (e) => erreurs.push(`${app} : ${e.message}`))
  await page.clock.setFixedTime(HEURE_DEMO)
  await page.goto(CHEMIN[app] + '?presentation=1')
  await expect(bandeau(page)).toBeVisible({ timeout: 20_000 })
  return page
}

/** Tous les onglets montrent l'étape n ; elle est faite (jouée par l'application de son acteur). */
async function etapeFaite(pages: Page[], n: number) {
  for (const p of pages) await expect(bandeau(p)).toHaveAttribute('data-presentation-etape', String(n), { timeout: 30_000 })
  for (const p of pages) await expect(bandeau(p)).toHaveAttribute('data-presentation-faite', '1', { timeout: 30_000 })
}

for (const r of [CLAIR, { ...CLAIR, theme: 'dark' as const, viewport: ORDINATEUR }])
  test(`présentation : la commande témoin dans les cinq applications · ${r.theme}`, async ({ browser }) => {
    test.setTimeout(240_000)
    const ctx = await contexte(browser, r)
    const erreurs: string[] = []
    const pages = {} as Record<App, Page>
    for (const a of APPS) pages[a] = await ouvrirEnPresentation(ctx, a, erreurs)
    const toutes = APPS.map((a) => pages[a])
    for (const p of toutes) await expect(bandeau(p)).toHaveAttribute('data-presentation-etape', '0')
    await expect(bandeau(pages.client)).toContainText('0/9')

    // Démarrer : l'étape 1 se joue chez le client, puis la suite part seule (Pause l'arrête, Reprendre la relance).
    await bandeau(pages.vendeur).getByRole('button', { name: 'Démarrer' }).click()
    await etapeFaite(toutes, 1)
    await etapeFaite(toutes, 2) // suite automatique, sans geste
    await bandeau(pages.livreur).getByRole('button', { name: 'Pause' }).click()
    await expect(bandeau(pages.entreprise)).toContainText('En pause')
    await pages.client.waitForTimeout(9000)
    for (const p of toutes) await expect(bandeau(p)).toHaveAttribute('data-presentation-etape', '2')
    await bandeau(pages.relais).getByRole('button', { name: 'Reprendre' }).click()
    await etapeFaite(toutes, 3)
    // Suivant, étape par étape (chaque étape attend la fin de la précédente).
    for (let n = 4; n <= 9; n++) {
      await bandeau(pages[APPS[n % 5]]).getByRole('button', { name: 'Suivant' }).click()
      await etapeFaite(toutes, n)
      // VAGUE n° 9 : le suivi « vitrine » du client montre Serge A. sur le trajet, puis arrivé au relais.
      if (n === 5) {
        await expect(pages.client.locator('.c9v')).toHaveAttribute('data-vitrine', '1', { timeout: 10_000 })
        await expect(pages.client.locator('.c9v-livreur')).toBeVisible()
        await expect(pages.client.locator('.c9v')).toContainText('Serge A.')
        await expect(pages.client.locator('.c9v')).toContainText('En route vers le relais · arrivée vers')
      }
      if (n === 8) await expect(pages.client.locator('.c9v')).toHaveAttribute('data-vitrine', '2', { timeout: 10_000 })
    }
    for (const p of toutes) await expect(bandeau(p)).toContainText('9/9')
    await expect(bandeau(pages.relais)).toContainText('Présentation terminée')

    // Ce que chaque application montre à la fin : la commande retirée partout.
    await expect(pages.client).toHaveURL(/\/suivi\?ref=BLV-\d+/)
    const ref = /ref=(BLV-\d+)/.exec(pages.client.url())![1]
    await expect(pages.client.locator('[data-en-direct]')).toContainText('Retirée', { timeout: 10_000 })
    await expect(pages.vendeur).toHaveURL(new RegExp('/vendeur/journal\\?ref=' + ref))
    await expect(pages.vendeur.locator('main')).toContainText('Retirée par le client', { timeout: 10_000 })
    await expect(pages.relais).toHaveURL(/\/relais\/historique/)
    const journal = await pages.client.evaluate(() => (JSON.parse(localStorage.getItem('blv_pont') ?? '[]') as { type: string }[]).map((e) => e.type))
    for (const t of ['order.paid', 'suborder.ready', 'package.assigned', 'parcel.collected', 'relay.drop.validated', 'relay.drop.completed', 'parcel.pickup_code', 'handover.completed']) expect(journal).toContain(t)

    // Recommencer : les cinq applications repartent du jeu d'essai, à l'étape 0.
    await bandeau(pages.entreprise).getByRole('button', { name: 'Recommencer' }).click()
    for (const p of toutes) await expect(bandeau(p)).toHaveAttribute('data-presentation-etape', '0', { timeout: 20_000 })
    expect(await pages.client.evaluate(() => JSON.parse(localStorage.getItem('blv_pont') ?? '[]').length)).toBe(0)
    await pages.client.goto('/commandes')
    await expect(pages.client.locator('main, #root').first()).not.toContainText(ref)
    // Quitter : plus de bandeau.
    await bandeau(pages.client).getByRole('button', { name: 'Quitter la présentation' }).click()
    for (const p of toutes) await expect(bandeau(p)).toHaveCount(0, { timeout: 10_000 })
    expect(erreurs).toEqual([])
    await ctx.close()
  })
