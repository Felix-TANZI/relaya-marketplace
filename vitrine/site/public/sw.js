// Service worker de BelivaY : notifications push seulement (src/connecteurs/push.ts). Il ne met rien en cache
// et n'intercepte aucune requête : le site reste servi par le réseau, toujours à jour.
// Charge utile attendue du serveur (JSON) : { "titre": "…", "corps": "…", "lien": "/commande?ref=BLV-1042", "tag": "BLV-1042" }.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { corps: e.data ? e.data.text() : '' }
  }
  const titre = d.titre || 'BelivaY'
  e.waitUntil(
    self.registration.showNotification(titre, {
      body: d.corps || '',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { lien: d.lien || '/' },
    }),
  )
})

// Toucher la notification : l'onglet BelivaY déjà ouvert vient devant, sur la bonne page ; sinon un nouvel onglet.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const lien = new URL((e.notification.data && e.notification.data.lien) || '/', self.location.origin)
  if (lien.origin !== self.location.origin) return
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((onglets) => {
      for (const o of onglets) {
        if (new URL(o.url).origin === lien.origin && 'focus' in o)
          return o
            .focus()
            .then((f) => f.navigate(lien.href))
            .catch(() => self.clients.openWindow(lien.href))
      }
      return self.clients.openWindow(lien.href)
    }),
  )
})
