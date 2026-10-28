// Service worker de l'espace vendeur (portée /vendeur/) : l'application s'ouvre sans réseau (VD-D02.A10, VD-D05.A17,
// OFF-01) et reçoit les notifications push. Il ne garde que la coque de l'application : la page (/vendeur/, réseau
// d'abord, copie gardée en secours) et les fichiers construits (/vendeur/assets/…, noms à empreinte : gardés au premier
// passage). Aucune donnée de l'API n'est mise en cache ici (la file hors connexion vit dans l'application).
const CACHE = 'blv-vendeur-v1'
const COQUE = '/vendeur/'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(COQUE)).catch(() => undefined).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('blv-vendeur-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== self.location.origin || !u.pathname.startsWith('/vendeur/')) return
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
  // Fichiers construits (empreinte dans le nom) : gardés au premier passage.
  if (u.pathname.startsWith('/vendeur/assets/')) {
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

// Notifications push : { "titre": "…", "corps": "…", "lien": "/vendeur/commande?ref=BLV-00008", "tag": "BLV-00008" }.
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { corps: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.titre || 'BelivaY Vendeur', {
      body: d.corps || '',
      icon: '/vendeur/icone-192.png',
      badge: '/vendeur/icone-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { lien: d.lien || '/vendeur/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const lien = new URL((e.notification.data && e.notification.data.lien) || '/vendeur/', self.location.origin)
  if (lien.origin !== self.location.origin || !lien.pathname.startsWith('/vendeur/')) return
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((onglets) => {
      for (const o of onglets)
        if (new URL(o.url).pathname.startsWith('/vendeur/') && 'focus' in o)
          return o
            .focus()
            .then((f) => f.navigate(lien.href))
            .catch(() => self.clients.openWindow(lien.href))
      return self.clients.openWindow(lien.href)
    }),
  )
})
