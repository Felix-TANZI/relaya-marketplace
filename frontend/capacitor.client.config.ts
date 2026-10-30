import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.client',
  appName: 'BelivaY',
  webDir: 'dist-client',
  android: { path: 'android-client' },
  // Feuille de route D33 : « Se connecter avec Apple » sur Android passe par la page d'Apple dans la vue web, qui
  // renvoie au serveur BelivaY ; ces deux domaines restent dans l'application au lieu d'ouvrir le navigateur.
  server: { allowNavigation: ['appleid.apple.com', 'belivay.com', '*.belivay.com'] },
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
