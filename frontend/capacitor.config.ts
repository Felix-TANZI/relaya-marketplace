import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.belivay.client',
  appName: 'BelivaY',
  webDir: 'dist-client',
  android: { path: 'android-client' },
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
