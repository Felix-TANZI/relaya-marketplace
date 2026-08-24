import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.courier',
  appName: 'BelivaY Livreur',
  webDir: 'dist-courier',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '582094155516-insnk09ptfqa6faunktufc5nhrrihsmj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
