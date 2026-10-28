import { defineConfig, devices } from '@playwright/test'

// Port propre à la console (client 4174, vendeur 4175, entreprise 4177) ; PORT_ADMIN permet plusieurs copies de travail.
const PORT = Number(process.env.PORT_ADMIN || 4179)

// Mêmes réglages que les autres espaces : rendu sans carte graphique, une seconde chance sous forte charge.
export default defineConfig({
  testDir: './tests',
  testIgnore: /api-bout-en-bout\.spec\.ts$/, // contre le serveur : pw-api.config.ts
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/admin/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 860 },
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/admin/`,
    // PW_REUTILISER=1 : un aperçu déjà lancé (npx vite preview --port 4179) sert tel quel, sans reconstruire.
    reuseExistingServer: !!process.env.PW_REUTILISER,
    timeout: 180_000,
  },
})
