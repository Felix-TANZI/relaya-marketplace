// frontend/src/lib/pushNotifications.ts
// Feuille de route D21 : notifications push des applications (FCM, et APNs via Firebase sur iOS).
//
// Une fois l'utilisateur connecte, l'application native demande la permission, recupere son jeton et le
// donne au serveur (POST /api/devices, type « fcm »). Le serveur pousse ensuite chaque etape de commande
// (apps.notifications_client). Toucher une notification ouvre l'ecran qu'elle designe (donnee « lien »).
// Rien ne se passe dans un navigateur : le site n'utilise pas ce plugin.

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { http } from '@/services/api/http';

let ecoute = false;

export async function enregistrerNotificationsPush(ouvrir: (lien: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return;

    if (!ecoute) {
      ecoute = true;
      await PushNotifications.addListener('registration', (jeton) => {
        void http('/api/devices', {
          method: 'POST',
          body: JSON.stringify({ type: 'fcm', abonnement: { endpoint: jeton.value } }),
        }).catch(() => undefined);
      });
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const lien = (action.notification.data as { lien?: string } | undefined)?.lien;
        if (lien) ouvrir(lien);
      });
    }
    await PushNotifications.register();
  } catch {
    // Sans projet Firebase (google-services.json) l'enregistrement echoue : l'application reste utilisable.
  }
}
