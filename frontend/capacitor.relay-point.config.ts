import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.relaypoint',
  appName: 'BelivaY Relais',
  webDir: 'dist-relay-point',
  android: { path: 'android-relay-point' },
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
