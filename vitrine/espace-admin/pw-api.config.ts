// Recette de bout en bout de la console contre le VRAI serveur (projet d'essai du kit, backend-kit/_essai, avec
// apps.console) :
//   npx playwright test -c pw-api.config.ts
// Base neuve à chaque passage (essai-console.sqlite3), données de départ et démonstration du kit (charger_demo, avec la
// démo vendeur), employés de démonstration de la console (charger_demo_console), serveur Django sur 8060 ; la console en
// mode API (VITE_SOURCE=api) sur 5230. Ports propres à la console : PORT_API_ADMIN, PORT_SITE_API_ADMIN.
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API_ADMIN || 8060)
const SITE = Number(process.env.PORT_SITE_API_ADMIN || 5230)
const ORIGINES = `http://localhost:${SITE},http://127.0.0.1:${SITE}`
const DJANGO = '.venv/bin/python manage.py'

export default defineConfig({
  testDir: './tests',
  testMatch: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api-admin',
  use: {
    baseURL: `http://localhost:${SITE}/admin/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 860 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Un serveur déjà lancé sur ce port : l'arrêter (la base est refaite à chaque passage).
      command:
        `rm -f ../backend-kit/_essai/essai-console.sqlite3 && cd ../backend-kit/_essai && ${DJANGO} migrate --noinput -v 0 && ` +
        `${DJANGO} charger_demo && ${DJANGO} charger_demo_console && exec ${DJANGO} runserver ${API} --noreload`,
      url: `http://localhost:${API}/api/config/flags`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: { DJANGO_SETTINGS_MODULE: 'config.settings_serveur', BELIVAY_ESSAI_BASE: 'essai-console.sqlite3', BELIVAY_DEMO_VENDEUR: '1', BELIVAY_SITE_URL: `http://localhost:${SITE}`, CORS_EXTRA_ORIGINS: ORIGINES },
    },
    {
      command: `npx vite --port ${SITE} --strictPort --clearScreen false`,
      url: `http://localhost:${SITE}/admin/`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` },
    },
  ],
})
