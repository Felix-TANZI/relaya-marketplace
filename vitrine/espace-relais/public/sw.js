// Service worker de l'espace point relais (portée /relais/) : l'application s'ouvre sans réseau (hors connexion prioritaire,
// OFF-01) et reçoit les notifications push. Il ne garde que la coque de l'application : la page (/relais/, réseau
// d'abord, copie gardée en secours) et les fichiers construits (/relais/assets/…, noms à empreinte : gardés au premier
// passage). Aucune donnée de l'API n'est mise en cache ici (la file hors connexion vit dans l'application).
const CACHE = 'blv-relais-v1'
const COQUE = '/relais/'
// Thème posé avant le premier rendu (index.html) : gardé avec la coque, l'appli s'ouvre sans éclair même sans réseau.
const THEME = '/relais/theme.js'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([COQUE, THEME])).catch(() => undefined).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('blv-relais-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== self.location.origin || !u.pathname.startsWith('/relais/')) return
  // Pages : le réseau d'abord (toujours à jour), la coque gardée sans réseau.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((rep) => {
          if (rep.ok) caches.open(CACHE).then((c) => c.put(COQUE, rep.clone()))
          return rep
        })
        .catch(() => caches.match(COQUE).then((c) => c || Response.error())),
    )
    return
  }
  if (u.pathname === THEME) {
    e.respondWith(
      fetch(r)
        .then((rep) => {
          if (rep.ok) {
            const copie = rep.clone()
            caches.open(CACHE).then((c) => c.put(THEME, copie))
          }
          return rep
        })
        .catch(() => caches.match(THEME).then((c) => c || Response.error())),
    )
    return
  }
  // Fichiers construits (empreinte dans le nom) : gardés au premier passage.
  if (u.pathname.startsWith('/relais/assets/')) {
    e.respondWith(
      caches.match(r).then(
        (c) =>
          c ||
          fetch(r).then((rep) => {
            if (rep.ok) {
              const copie = rep.clone()
              caches.open(CACHE).then((x) => x.put(r, copie))
            }
            return rep
          }),
      ),
    )
  }
})

// Notifications push : { "titre": "…", "corps": "…", "lien": "/relais/colis?ref=BLV-00008-1", "tag": "BLV-00008-1" }.
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { corps: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.titre || 'BelivaY Point relais', {
      body: d.corps || '',
      icon: '/relais/icone-192.png',
      badge: '/relais/icone-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { lien: d.lien || '/relais/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const lien = new URL((e.notification.data && e.notification.data.lien) || '/relais/', self.location.origin)
  if (lien.origin !== self.location.origin || !lien.pathname.startsWith('/relais/')) return
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((onglets) => {
      for (const o of onglets)
        if (new URL(o.url).pathname.startsWith('/relais/') && 'focus' in o)
          return o
            .focus()
            .then((f) => f.navigate(lien.href))
            .catch(() => self.clients.openWindow(lien.href))
      return self.clients.openWindow(lien.href)
    }),
  )
})
