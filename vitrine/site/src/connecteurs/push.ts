// Notifications push (Web Push) : service worker minimal (public/sw.js), autorisation demandée au bon moment
// (après la commande, écran « On te prévient quand tes colis arrivent ? », ou dans les réglages des
// notifications : jamais à l'ouverture du site), abonnement VAPID (VITE_VAPID_PUBLIC_KEY) envoyé au serveur
// (source.enregistrerAbonnementPush). Sans clé VAPID (démonstration) : une notification locale confirme que
// tout marche sur ce téléphone. Autorisation refusée ou navigateur sans notifications : le SMS prend le relais
// (les écrans le disent).
import { connecteurs } from '../config/env'
import { source } from '../donnees/source'
import { signalerErreur } from './suivi'

export type EtatPush = 'indisponible' | 'default' | 'granted' | 'denied'

export const pushPossible = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
export const etatPush = (): EtatPush => (pushPossible() ? Notification.permission : 'indisponible')

// Service worker : enregistré seulement quand les notifications servent (autorisation donnée).
let enregistrement: Promise<ServiceWorkerRegistration | null> | null = null
function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  return (enregistrement ??= navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(() => navigator.serviceWorker.ready)
    .catch((e: unknown) => {
      enregistrement = null
      signalerErreur(e, 'connecteur', { connecteur: 'push' })
      return null
    }))
}

// Clé VAPID base64url → octets (applicationServerKey).
function octets(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64)
  const r = new Uint8Array(new ArrayBuffer(brut.length))
  for (let i = 0; i < brut.length; i++) r[i] = brut.charCodeAt(i)
  return r
}

// Abonne l'appareil et envoie l'abonnement au serveur (déjà abonné : l'abonnement est renvoyé, il peut avoir changé).
async function abonner(reg: ServiceWorkerRegistration): Promise<boolean> {
  const cle = connecteurs.push.clePublique
  if (!cle || !('PushManager' in window)) return false
  try {
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(cle) }))
    const j = sub.toJSON()
    if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return false
    const r = await source.enregistrerAbonnementPush({ endpoint: j.endpoint, expirationTime: j.expirationTime ?? null, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } })
    return r.ok
  } catch (e) {
    signalerErreur(e, 'connecteur', { connecteur: 'push' })
    return false
  }
}

export interface MessageLocal {
  titre: string
  corps: string
  lien?: string // adresse ouverte au toucher (ex. /commandes)
}

// Demande l'autorisation (au toucher du client), puis abonne l'appareil. Sans clé VAPID : notification locale.
export async function activerPush(confirmation?: MessageLocal): Promise<EtatPush> {
  if (!pushPossible()) return 'indisponible'
  const etat = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (etat !== 'granted') return etat
  const reg = await serviceWorker()
  const abonne = reg ? await abonner(reg) : false
  if (!abonne && confirmation && reg)
    await reg
      .showNotification(confirmation.titre, { body: confirmation.corps, icon: '/icone-192.png', badge: '/icone-192.png', tag: 'blv-bienvenue', data: { lien: confirmation.lien ?? '/' } })
      .catch(() => undefined)
  return 'granted'
}

// Au démarrage : autorisation déjà donnée → l'abonnement est rafraîchi en silence (le navigateur peut l'avoir changé).
export function synchroniserPush() {
  if (etatPush() !== 'granted' || !connecteurs.push.clePublique) return
  const lancer = () => void serviceWorker().then((reg) => reg && abonner(reg))
  if ('requestIdleCallback' in window) requestIdleCallback(lancer, { timeout: 5000 })
  else setTimeout(lancer, 3000)
}
