// Parcours de bout en bout de l'espace livreur contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai,
// avec les applications livreur_* et entreprise_*) :
//   npx playwright test -c pw-api.config.ts
// Lance le serveur Django d'essai sur 8040 avec SA base, neuve à chaque passage (essai-livreur.sqlite3 : jeu
// charger_demo, puis le monde Yafé Express par POST /api/_essai/entreprise/monde) et l'espace livreur en mode API sur 5210
// (VITE_SOURCE=api). CORS : CORS_EXTRA_ORIGINS (lu par config/settings_serveur.py). Voir CONNECTEURS-LIVREUR.md.
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API_LIVREUR || 8040)
const SITE = Number(process.env.PORT_SITE_API_LIVREUR || 5210)

export default defineConfig({
  testDir: './tests',
  testMatch: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api-livreur',
  use: {
    baseURL: `http://localhost:${SITE}/livreur/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    // Appareil photo simulé (photos de preuve du ramassage et du dépôt : jamais depuis la galerie en mode API).
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera'],
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Base neuve à chaque passage : le monde de l'entreprise n'est créé qu'une fois par serveur.
      command: `rm -f ../backend-kit/_essai/essai-livreur.sqlite3 && sh ../backend-kit/_essai/lancer-serveur.sh ${API}`,
      url: `http://localhost:${API}/api/config/flags`,
      // PW_REUTILISER=1 : serveurs déjà lancés (mise au point) ; sinon base neuve à chaque passage.
      reuseExistingServer: !!process.env.PW_REUTILISER,
      timeout: 240_000,
      env: { BELIVAY_ESSAI_BASE: 'essai-livreur.sqlite3', CORS_EXTRA_ORIGINS: `http://localhost:${SITE},http://127.0.0.1:${SITE}` },
    },
    {
      command: `npx vite --port ${SITE} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE}/livreur/`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` },
    },
  ],
})
