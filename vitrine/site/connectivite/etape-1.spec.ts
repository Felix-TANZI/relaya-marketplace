// Étape 1 — socle commun (CAHIER-CONNECTIVITE.md) : le dist commun sert les cinq applications sous une même origine,
// chacune avec sa base ; le pont est chargé partout ; un événement publié dans une application apparaît dans les quatre
// autres (journal partagé et signal « blv:donnees » des onglets ouverts), et chacune voit les autres ouvertes.
import { expect, test } from '@playwright/test'
import { APPS, contexte, journalPour, ouvrir, type App } from './commun'

test('un événement publié dans une application apparaît dans les quatre autres', async ({ browser }) => {
  test.setTimeout(120_000)
  const ctx = await contexte(browser)
  // Une application après l'autre : l'horloge figée du contexte est posée avant chaque ouverture (ouvertes en même
  // temps, une page pouvait démarrer avant l'horloge et battre à l'heure réelle : présence vue « fermée »).
  const pages = {} as Record<App, import('@playwright/test').Page>
  for (const a of APPS) pages[a] = await ouvrir(ctx, a)

  // Chaque onglet compte les signaux « une autre application a écrit » (événement storage → blv:donnees).
  for (const a of APPS) await pages[a].evaluate(() => window.addEventListener('blv:donnees', () => ((window as unknown as { recus: number }).recus = ((window as unknown as { recus?: number }).recus ?? 0) + 1)))

  // Chaque application publie un signal par son propre pont.
  for (const a of APPS)
    await pages[a].evaluate((de) => (window as unknown as { __blvPont: { publier: (e: unknown, cle: string, le: number) => void } }).__blvPont.publier({ type: 'pont.ping', de }, 'ping-' + de, Date.now()), a)

  for (const a of APPS) {
    const autres = APPS.filter((x) => x !== a)
    await expect.poll(async () => (await journalPour(pages[a], a)).filter((e) => e.type === 'pont.ping').map((e) => e.app).sort()).toEqual([...autres].sort())
    await expect.poll(() => pages[a].evaluate(() => (window as unknown as { recus?: number }).recus ?? 0)).toBeGreaterThanOrEqual(4)
    // Présence : chaque application voit les quatre autres ouvertes dans ce navigateur.
    expect(await pages[a].evaluate((xs) => xs.map((x) => (window as unknown as { __blvPont: { appliOuverte: (x: string) => boolean } }).__blvPont.appliOuverte(x)), autres)).toEqual(autres.map(() => true))
  }
  // Aucune erreur de chargement : chaque application a rendu son écran.
  for (const a of APPS) await expect(pages[a].locator('#app, #root').first()).not.toBeEmpty()
  await ctx.close()
})
