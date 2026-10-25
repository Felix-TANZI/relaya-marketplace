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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      iosClientId: '582094155516-m8somr2pbk9292ulebgo6338s8a0to0c.apps.googleusercontent.com',
      androidClientId: '582094155516-insnk09ptfqa6faunktufc5nhrrihsmj.apps.googleusercontent.com',
      serverClientId: '582094155516-insnk09ptfqa6faunktufc5nhrrihsmj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
