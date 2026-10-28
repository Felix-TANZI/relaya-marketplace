// Parcours de bout en bout de l'espace entreprise contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai,
// avec les applications entreprise_* et livreur_*) :
//   npx playwright test -c pw-api.config.ts
// Lance le serveur Django d'essai sur 8030 avec SA base, neuve à chaque passage (essai-entreprise.sqlite3 : jeu
// charger_demo, puis le monde Yafé Express par POST /api/_essai/entreprise/monde) et l'espace entreprise en mode API sur
// 5200 (VITE_SOURCE=api). CORS : CORS_EXTRA_ORIGINS (lu par config/settings_serveur.py). Voir CONNECTEURS-ENTREPRISE.md.
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API_ENTREPRISE || 8030)
const SITE = Number(process.env.PORT_SITE_API_ENTREPRISE || 5200)

export default defineConfig({
  testDir: './tests',
  testMatch: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api-entreprise',
  use: {
    baseURL: `http://localhost:${SITE}/entreprise/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 860 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Base neuve à chaque passage : le monde de l'entreprise n'est créé qu'une fois par serveur.
      command: `rm -f ../backend-kit/_essai/essai-entreprise.sqlite3 && sh ../backend-kit/_essai/lancer-serveur.sh ${API}`,
      url: `http://localhost:${API}/api/config/flags`,
      // PW_REUTILISER=1 : serveurs déjà lancés (mise au point) ; sinon base neuve à chaque passage.
      reuseExistingServer: !!process.env.PW_REUTILISER,
      timeout: 240_000,
      env: { BELIVAY_ESSAI_BASE: 'essai-entreprise.sqlite3', CORS_EXTRA_ORIGINS: `http://localhost:${SITE},http://127.0.0.1:${SITE}` },
    },
    {
      command: `npx vite --port ${SITE} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE}/entreprise/`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` },
    },
  ],
})
