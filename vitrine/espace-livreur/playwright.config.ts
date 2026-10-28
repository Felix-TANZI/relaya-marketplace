import { defineConfig, devices } from '@playwright/test'

// Port propre à l'espace livreur (client 4174, vendeur 4175) ; PORT_LIVREUR permet plusieurs copies de travail.
const PORT = Number(process.env.PORT_LIVREUR || 4176)

// Mêmes réglages que le client et le vendeur : rendu sans carte graphique, une seconde chance sous forte charge.
// Téléphone d'abord (le livreur est sur la route) : 375 × 812 par défaut.
export default defineConfig({
  testDir: './tests',
  testIgnore: /api-bout-en-bout\.spec\.ts$/, // contre le serveur : pw-api.config.ts
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/livreur/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/livreur/`,
    // PW_REUTILISER=1 : un aperçu déjà lancé (npx vite preview --port 4176) sert tel quel, sans reconstruire.
    reuseExistingServer: !!process.env.PW_REUTILISER,
    timeout: 180_000,
  },
})
