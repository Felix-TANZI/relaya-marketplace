import { defineConfig, devices } from '@playwright/test'

// Port propre à l'espace point relais (client 4174, vendeur 4175, livreur 4176, entreprise 4177) ; PORT_RELAIS permet
// plusieurs copies de travail.
const PORT = Number(process.env.PORT_RELAIS || 4178)

// Mêmes réglages que le client, le vendeur et le livreur : rendu sans carte graphique, une seconde chance sous forte
// charge. Téléphone d'abord (le gérant tient son téléphone au comptoir) : 390 × 844, l'écran du prototype.
export default defineConfig({
  testDir: './tests',
  testIgnore: /api-bout-en-bout\.spec\.ts$/, // contre le serveur : pw-api.config.ts
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/relais/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/relais/`,
    // PW_REUTILISER=1 : un aperçu déjà lancé (npx vite preview --port 4178) sert tel quel, sans reconstruire.
    reuseExistingServer: !!process.env.PW_REUTILISER,
    timeout: 180_000,
  },
})
