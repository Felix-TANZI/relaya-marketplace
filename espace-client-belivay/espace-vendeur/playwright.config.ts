import { defineConfig, devices } from '@playwright/test'

// Port propre à l'espace vendeur (le client prend 4174) ; PORT_VENDEUR permet plusieurs copies de travail.
const PORT = Number(process.env.PORT_VENDEUR || 4175)

// Mêmes réglages que le client (site/playwright.config.ts) : rendu sans carte graphique (comparaison au pixel
// déterministe), une seconde chance pour un flou rendu différemment sous forte charge.
export default defineConfig({
  testDir: './tests',
  testIgnore: /api-bout-en-bout\.spec\.ts$/, // contre le serveur : pw-api.config.ts
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/vendeur/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/vendeur/`,
    // PW_REUTILISER=1 : un aperçu déjà lancé (npx vite preview --port 4175) sert tel quel, sans reconstruire.
    reuseExistingServer: !!process.env.PW_REUTILISER,
    timeout: 180_000,
  },
})
