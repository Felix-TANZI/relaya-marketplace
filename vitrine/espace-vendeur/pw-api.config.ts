// Parcours de bout en bout de l'espace vendeur contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai, avec
// les applications vendeur_*) :
//   npx playwright test -c pw-api.config.ts
// Lance le serveur Django d'essai sur 8020 avec SA base, neuve à chaque passage (essai-vendeur.sqlite3 : l'horloge
// d'essai avance pendant le parcours, sans toucher au serveur du client sur 8010) et l'espace vendeur en mode API sur 5190
// (VITE_SOURCE=api). Voir backend-kit/REPRISE-BACKEND.md, « Lancer l'espace vendeur contre le kit ».
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API_VENDEUR || 8020)
const SITE = Number(process.env.PORT_SITE_API_VENDEUR || 5190)

export default defineConfig({
  testDir: './tests',
  testMatch: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api-vendeur',
  use: {
    baseURL: `http://localhost:${SITE}/vendeur/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Base neuve à chaque passage : l'horloge d'essai avance pendant le parcours (libération, vendredi, revue du
      // numéro) et ne doit jamais reculer sur des données déjà vieillies. Un serveur déjà lancé sur ce port : l'arrêter.
      command: `rm -f ../backend-kit/_essai/essai-vendeur.sqlite3 && sh ../backend-kit/_essai/lancer-serveur.sh ${API}`,
      url: `http://localhost:${API}/api/config/flags`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: { BELIVAY_ESSAI_BASE: 'essai-vendeur.sqlite3', BELIVAY_DEMO_VENDEUR: '1', BELIVAY_SITE_URL: `http://localhost:${SITE}` },
    },
    {
      command: `npx vite --port ${SITE} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE}/vendeur/`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` },
    },
  ],
})
