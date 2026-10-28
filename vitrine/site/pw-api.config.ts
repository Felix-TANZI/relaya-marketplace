// Parcours de bout en bout du site contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai) :
//   npx playwright test -c pw-api.config.ts
// Lance (ou réutilise) le serveur Django d'essai sur 8010 (migrations, paramètres, contenus, jeu de démo :
// backend-kit/_essai/lancer-serveur.sh) et le site en mode API sur 5180 (VITE_SOURCE=api), séparé du serveur de la
// démonstration (5173). Voir backend-kit/REPRISE-BACKEND.md, « Lancer le site contre le kit en local ».
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API || 8010)
const SITE = Number(process.env.PORT_SITE_API || 5180)
// Paiements unifiés (passerelle d'essai, notifications signées) et site sur la même origine que l'API (mandataire de
// Vite : /api → serveur, X-Device-Id envoyé, panier du visiteur) : tests/api-paiements.spec.ts.
const API_P = Number(process.env.PORT_API_PAIEMENTS || 8011)
const SITE_P = Number(process.env.PORT_SITE_PAIEMENTS || 5181)

export default defineConfig({
  testDir: './tests',
  testMatch: /api-(bout-en-bout|paiements)\.spec\.ts$/,
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
  metadata: { api: `http://localhost:${API}/api`, apiPaiements: `http://localhost:${API_P}/api`, sitePaiements: `http://localhost:${SITE_P}` },
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
    {
      // Base neuve à chaque passage ; paiements par la passerelle d'essai (BELIVAY_PAIEMENTS_UNIFIES).
      command: `rm -f ../backend-kit/_essai/essai-paiements.sqlite3 && sh ../backend-kit/_essai/lancer-serveur.sh ${API_P}`,
      url: `http://localhost:${API_P}/api/config/flags`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: { BELIVAY_ESSAI_BASE: 'essai-paiements.sqlite3', BELIVAY_PAIEMENTS_UNIFIES: '1', PAIEMENT_WEBHOOK_SECRET: 'essai-notifications-belivay', BELIVAY_SITE_URL: `http://localhost:${SITE_P}` },
    },
    {
      command: `npx vite --port ${SITE_P} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE_P}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: '/api', BELIVAY_PROXY_API: `http://localhost:${API_P}` },
    },
  ],
})
