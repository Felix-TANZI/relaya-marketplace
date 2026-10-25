import { defineConfig, devices } from '@playwright/test'

// Recettes multi-applis (logique-metier/CAHIER-CONNECTIVITE.md) : les cinq interfaces servies par le dist commun
// (outils/construire-tout.sh, à lancer avant : npm run connectivite) sous une même origine, ouvertes dans des onglets
// d'un même navigateur. Port propre (client 4174, vendeur 4175, livreur 4176, entreprise 4177, relais 4178).
const PORT = Number(process.env.PORT_CONNECTIVITE || 4190)

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    ...devices['Desktop Chrome'],
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `node connectivite/serveur.mjs ${PORT}`,
    cwd: '..',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
