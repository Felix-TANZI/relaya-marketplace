// Parcours de bout en bout du site contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai) :
//   npx playwright test -c pw-api.config.ts
// Lance (ou réutilise) le serveur Django d'essai sur 8010 (migrations, paramètres, contenus, jeu de démo :
// backend-kit/_essai/lancer-serveur.sh) et le site en mode API sur 5180 (VITE_SOURCE=api), séparé du serveur de la
// démonstration (5173). Voir backend-kit/REPRISE-BACKEND.md, « Lancer le site contre le kit en local ».
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API || 8010)
const SITE = Number(process.env.PORT_SITE_API || 5180)

export default defineConfig({
  testDir: './tests',
  testMatch: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api',
  use: {
    baseURL: `http://localhost:${SITE}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    trace: 'retain-on-failure',
  },
  metadata: { api: `http://localhost:${API}/api` },
  webServer: [
    {
      command: `sh ../backend-kit/_essai/lancer-serveur.sh ${API}`,
      url: `http://localhost:${API}/api/config/flags`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: `npx vite --port ${SITE} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE}`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` },
    },
  ],
})
