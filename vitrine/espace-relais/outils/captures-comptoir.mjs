// Captures avant/après du comptoir (mobile 375×812, tablette 768×1024). Usage : node outils/captures-comptoir.mjs <dossier> <préfixe> [port]
import { chromium } from '@playwright/test'
const [dossier, prefixe, port = '4378'] = process.argv.slice(2)
const ecrans = ['./', 'reception', 'retrait', 'file', 'stock']
const tailles = { mobile: { width: 375, height: 812 }, tablette: { width: 768, height: 1024 } }
const nav = await chromium.launch()
for (const [nom, vp] of Object.entries(tailles)) {
  const ctx = await nav.newContext({ viewport: vp })
  const page = await ctx.newPage()
  await page.clock.setFixedTime(new Date('2026-10-13T13:05:00.500Z'))
  for (const e of ecrans) {
    await page.goto(`http://localhost:${port}/relais/${e}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${dossier}/${prefixe}-${nom}-${e === './' ? 'accueil' : e}.png`, fullPage: true })
  }
  await ctx.close()
}
await nav.close()
