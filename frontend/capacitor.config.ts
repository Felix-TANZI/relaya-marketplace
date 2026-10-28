import type { CapacitorConfig } from '@capacitor/cli';

// « Se connecter avec Apple » sur Android (feuille de route D33) : la vue de l'application ouvre la page d'Apple,
// qui renvoie au serveur de main 2 (apple/callback/), qui renvoie à l'application. Ces deux domaines doivent rester
// dans l'application. Décision du porteur : le domaine de main 2, jamais belivay.com (la vitrine). Il se déduit de
// VITE_APPLE_REDIRECT_URI (ou BELIVAY_MAIN2_DOMAIN), lu au moment de `npx cap sync` : rien à changer dans le code le
// jour où le domaine est choisi.
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
  server: {
    allowNavigation: ['appleid.apple.com', ...(main2 && main2 !== 'belivay.com' ? [main2] : [])],
  },
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
