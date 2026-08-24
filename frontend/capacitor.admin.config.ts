import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.admin',
  appName: 'BelivaY Admin',
  webDir: 'dist-admin',
  android: { path: 'android-admin' },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '582094155516-insnk09ptfqa6faunktufc5nhrrihsmj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
