import { defineConfig, devices } from '@playwright/test'

// Port propre à l'espace entreprise (client 4174, vendeur 4175) ; PORT_ENTREPRISE permet plusieurs copies de travail.
const PORT = Number(process.env.PORT_ENTREPRISE || 4177)

// Mêmes réglages que le client et le vendeur : rendu sans carte graphique, une seconde chance sous forte charge.
export default defineConfig({
  testDir: './tests',
  testIgnore: /api-bout-en-bout\.spec\.ts$/, // contre le serveur : pw-api.config.ts
  fullyParallel: true,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/entreprise/`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/entreprise/`,
    // PW_REUTILISER=1 : un aperçu déjà lancé (npx vite preview --port 4177) sert tel quel, sans reconstruire.
    reuseExistingServer: !!process.env.PW_REUTILISER,
    timeout: 180_000,
  },
})
