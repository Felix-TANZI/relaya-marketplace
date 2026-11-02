import type { CapacitorConfig } from '@capacitor/cli';

// Décision du porteur : le domaine de main 2, jamais belivay.com (la vitrine). Lu au moment de `npx cap sync` dans
// BELIVAY_MAIN2_DOMAIN, ou déduit de VITE_APPLE_REDIRECT_URI.
function domaineMain2(): string {
  const explicite = (process.env.BELIVAY_MAIN2_DOMAIN || '').trim();
  if (explicite) return explicite;
  try {
    return new URL((process.env.VITE_APPLE_REDIRECT_URI || '').trim()).hostname;
  } catch {
    return '';
  }
}
const main2 = domaineMain2();

const config: CapacitorConfig = {
  appId: 'com.belivay.client',
  appName: 'BelivaY',
  webDir: 'dist-client',
  android: { path: 'android-client' },
  // Feuille de route D33 : « Se connecter avec Apple » sur Android passe par la page d'Apple dans la vue web, qui
  // renvoie au serveur BelivaY ; ces deux domaines restent dans l'application au lieu d'ouvrir le navigateur.
  server: { allowNavigation: ['appleid.apple.com', ...(main2 && main2 !== 'belivay.com' ? [main2] : [])] },
  plugins: {
    SocialLogin: {
      // Seul Google est utilise via ce plugin (Apple passe par
      // @capacitor-community/apple-sign-in) : les autres fournisseurs ne sont
      // pas embarques, ce qui evite le SDK Facebook dans les apps.
      // Les identifiants OAuth sont passes a SocialLogin.initialize()
      // (src/components/auth/GoogleAuthButton.tsx).
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
