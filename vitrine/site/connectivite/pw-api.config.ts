// Recette multi-applis en mode API (VITE_SOURCE=api) : les six applications contre UN serveur d'essai du kit, sur la
// même commande (client → vendeur → entreprise → livreur → relais → client → console). Pendant de la recette de
// démonstration (connectivite/*.spec.ts, pont en localStorage) : ici, tout passe par les vraies routes du kit.
//   npx playwright test -c connectivite/pw-api.config.ts        (depuis site/)
// Serveur d'essai sur 8070, base neuve (essai-multi.sqlite3) : migrations, charger_demo (catalogue, Carine, Bertrand),
// charger_demo_console (employés de la console), puis le monde commun (relaya_essai/essai_multi.py). Chaque appli en
// mode API sur son port (5281 à 5286), comme elle sera servie : sa propre origine, ses propres jetons.
import { defineConfig, devices } from '@playwright/test'

const API = Number(process.env.PORT_API_MULTI || 8070)
export const PORTS = { client: 5281, vendeur: 5282, entreprise: 5283, livreur: 5284, relais: 5285, admin: 5286 } as const
const ORIGINES = Object.values(PORTS)
  .flatMap((p) => [`http://localhost:${p}`, `http://127.0.0.1:${p}`])
  .join(',')
const DJANGO = '.venv/bin/python manage.py'
const ENV_API = { VITE_SOURCE: 'api', VITE_API_URL: `http://localhost:${API}/api` }
// Dossiers relatifs à celui de cette configuration (site/connectivite).
const DOSSIERS = { client: '..', vendeur: '../../espace-vendeur', entreprise: '../../espace-entreprise', livreur: '../../espace-livreur', relais: '../../espace-relais', admin: '../../espace-admin' } as const
const BASES = { client: '', vendeur: '/vendeur/', entreprise: '/entreprise/', livreur: '/livreur/', relais: '/relais/', admin: '/admin/' } as const

export default defineConfig({
  testDir: '.',
  testMatch: /api-multi\.recette\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [['list']],
  outputDir: '/tmp/pw-api-multi',
  metadata: { api: `http://localhost:${API}/api` },
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    // Appareil photo du livreur : flux simulé du navigateur piloté (jamais une photo de démonstration).
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera'],
  },
  webServer: [
    {
      // Base neuve à chaque passage. Un serveur déjà lancé sur ce port : l'arrêter.
      command:
        `rm -f ../backend-kit/_essai/essai-multi.sqlite3 && cd ../backend-kit/_essai && ${DJANGO} migrate --noinput -v 0 && ` +
        `${DJANGO} charger_demo && ${DJANGO} charger_demo_console && exec ${DJANGO} runserver ${API} --noreload`,
      url: `http://localhost:${API}/api/config/flags`,
      cwd: '..',
      reuseExistingServer: false,
      timeout: 300_000,
      env: { DJANGO_SETTINGS_MODULE: 'config.settings_serveur', BELIVAY_ESSAI_BASE: 'essai-multi.sqlite3', BELIVAY_SITE_URL: `http://localhost:${PORTS.client}`, CORS_EXTRA_ORIGINS: ORIGINES },
    },
    ...(Object.keys(PORTS) as (keyof typeof PORTS)[]).map((app) => ({
      command: `npx vite --port ${PORTS[app]} --strictPort --clearScreen false`,
      cwd: DOSSIERS[app],
      url: `http://localhost:${PORTS[app]}${BASES[app] || '/'}`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: ENV_API,
    })),
  ],
})
