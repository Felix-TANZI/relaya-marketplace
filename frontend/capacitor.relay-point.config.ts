import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.relaypoint',
  appName: 'BelivaY Relais',
  webDir: 'dist-relay-point',
  android: { path: 'android-relay-point' },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '582094155516-insnk09ptfqa6faunktufc5nhrrihsmj.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
