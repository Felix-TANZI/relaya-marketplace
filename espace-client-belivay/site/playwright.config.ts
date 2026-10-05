import { defineConfig, devices } from '@playwright/test'

// Port du site de test : PORT_SITE permet de lancer plusieurs copies de travail en même temps.
const PORT = Number(process.env.PORT_SITE || 4174)

// Tests du squelette (étape 4) : chaque route s'ouvre sans erreur dans les rendus de CRD-01.
export default defineConfig({
  testDir: './tests',
  // Contre le vrai serveur seulement (pw-api.config.ts) : pas avec la démonstration.
  testIgnore: /api-bout-en-bout\.spec\.ts$/,
  fullyParallel: true,
  // Une seconde chance : sous forte charge, le rendu d'un flou (voile, verre) peut varier de quelques pixels.
  // Un écart réel échoue deux fois et reste rouge ; un écart passager est signalé « flaky » dans le rapport.
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    // Rendu déterministe pour la comparaison au pixel : sans carte graphique, un flou ou une ombre douce est dessiné
    // pareil à chaque passage (sinon un pixel d'ombre peut varier d'un passage à l'autre).
    launchOptions: { args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-partial-raster', '--force-color-profile=srgb'] },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
