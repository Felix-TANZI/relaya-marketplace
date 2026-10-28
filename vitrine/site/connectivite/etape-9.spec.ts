// Étape 9 — recette générale (CAHIER-CONNECTIVITE.md) : la commande témoin, de la fiche du client au retrait au Relais
// Bastos, dans les cinq interfaces servies par le dist commun, en clair et en sombre, sur téléphone et sur ordinateur,
// dans un Chromium non piloté (navigator.webdriver à false : animations, sons et effets du vrai navigateur). Aucun gel :
// chaque onglet répond en moins d'une seconde après le parcours, aucune erreur de page, aucun écran vide.
import { expect, test, type Page } from '@playwright/test'
import { APPS, CHEMIN, contexte, ORDINATEUR, ouvrir, TELEPHONE, type App, type Rendu } from './commun'
import { codeDuVendeur, codeRetrait, demarrerPaquet, deposerAuRelais, jusquAuLivreur, PIN_RELAIS, ramasserTemoin, retirer } from './parcours'

const RENDUS: (Rendu & { nom: string })[] = [
  { nom: 'clair · téléphone', theme: 'light', lang: 'fr', viewport: TELEPHONE, nonPilote: true },
  { nom: 'sombre · téléphone', theme: 'dark', lang: 'fr', viewport: TELEPHONE, nonPilote: true },
  { nom: 'clair · ordinateur', theme: 'light', lang: 'fr', viewport: ORDINATEUR, nonPilote: true },
  { nom: 'sombre · ordinateur', theme: 'dark', lang: 'fr', viewport: ORDINATEUR, nonPilote: true },
]

/** L'onglet répond vite (pas de boucle de rendu, pas de gel) et n'est pas vide. */
async function vivant(page: Page) {
  const t0 = Date.now()
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(1))))
  expect(Date.now() - t0).toBeLessThan(1000)
  await expect(page.locator('#app, #root').first()).not.toBeEmpty()
}

for (const r of RENDUS)
  test(`commande témoin de bout en bout · ${r.nom}`, async ({ browser }) => {
    test.setTimeout(300_000)
    const ctx = await contexte(browser, r)
    const erreurs: string[] = []
    const ouvrirSuivi = async (app: App, chemin = '') => {
      const p = await ouvrir(ctx, app, chemin)
      p.on('pageerror', (e) => erreurs.push(`${app} : ${e.message}`))
      expect(await p.evaluate(() => navigator.webdriver)).toBe(false)
      return p
    }
    const livreur = await ouvrirSuivi('livreur', '?demo=aucun_paquet')
    const client = await ouvrirSuivi('client')
    const vendeur = await ouvrirSuivi('vendeur', 'commandes')
    const entreprise = await ouvrirSuivi('entreprise', 'paquets')
    const relais = await ouvrirSuivi('relais')
    const ref = await jusquAuLivreur(client, vendeur, entreprise)
    await demarrerPaquet(livreur)
    await ramasserTemoin(livreur, await codeDuVendeur(vendeur, ref))
    await deposerAuRelais(livreur, relais, [ref + '-1'], PIN_RELAIS)
    await retirer(relais, codeRetrait(ref), PIN_RELAIS)
    await client.goto('/suivi?ref=' + ref)
    await expect(client.locator('[data-en-direct]')).toContainText('Retirée', { timeout: 5000 })
    await vendeur.goto('/vendeur/journal?ref=' + ref)
    await expect(vendeur.locator('main')).toContainText('Retirée par le client', { timeout: 5000 })
    // Chaque interface : le thème demandé, un onglet qui répond, aucune erreur de page.
    const pages: Record<App, Page> = { client, vendeur, entreprise, livreur, relais }
    for (const a of APPS) {
      await pages[a].goto(CHEMIN[a])
      await vivant(pages[a])
      const sombre = await pages[a].evaluate(() => {
        const fond = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number)
        return fond[0] + fond[1] + fond[2] < 3 * 128
      })
      expect(sombre, a).toBe(r.theme === 'dark')
    }
    expect(erreurs).toEqual([])
    await ctx.close()
  })
