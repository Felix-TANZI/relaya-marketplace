import { defineConfig, devices } from '@playwright/test'
import { ESSAI } from './tests-comptes/essai'

// Parcours des comptes réels (site/COMPTES-REELS.md) contre le serveur local équivalent à Vercel
// (outils/serveur-local.mjs : dist/ des six applications + la fonction des comptes sur Postgres en mémoire).
// Le dist doit être construit en source hybride : la commande le fait, sauf SANS_CONSTRUCTION=1 (dist déjà prêt).
//   npm run test:comptes:e2e
const PORT = Number(process.env.PORT_COMPTES || 4310)
const construire = process.env.SANS_CONSTRUCTION ? '' : 'SANS_INSTALLATION=1 VITE_SOURCE=hybride VITE_DEMO=1 sh outils/construire-tout.sh && '

const SECRETS_ESSAI = `ADMIN_BOOTSTRAP_EMAIL=${ESSAI.email} ADMIN_BOOTSTRAP_CODE=${ESSAI.code} TOTP_CLE=${ESSAI.totp}`

export default defineConfig({
  testDir: './tests-comptes',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
  projects: [
    { name: 'base', testMatch: /(comptes-reels|acces-reels)\.spec\.ts$/, use: { baseURL: `http://localhost:${PORT}` } },
    { name: 'sans-base', testMatch: /sans-base\.spec\.ts$/, use: { baseURL: `http://localhost:${PORT + 1}` } },
  ],
  webServer: [
    { command: `${construire}DATABASE_URL= POSTGRES_URL= ${SECRETS_ESSAI} PORT=${PORT} node outils/serveur-local.mjs`, url: `http://localhost:${PORT}/api/auth/etat`, reuseExistingServer: false, timeout: 900_000 },
    { command: `BASE=aucune PORT=${PORT + 1} node outils/serveur-local.mjs`, url: `http://localhost:${PORT + 1}/api/auth/etat`, reuseExistingServer: false, timeout: 900_000 },
  ],
})
