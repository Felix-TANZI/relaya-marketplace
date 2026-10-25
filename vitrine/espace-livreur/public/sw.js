// Service worker de l'espace livreur (portée /livreur/) : l'application s'ouvre sans réseau (LIV-P22, hors connexion prioritaire,
// OFF-01) et reçoit les notifications push. Il ne garde que la coque de l'application : la page (/livreur/, réseau
// d'abord, copie gardée en secours) et les fichiers construits (/livreur/assets/…, noms à empreinte : gardés au premier
// passage). Aucune donnée de l'API n'est mise en cache ici (la file hors connexion vit dans l'application).
const CACHE = 'blv-livreur-v1'
const COQUE = '/livreur/'
// Thème posé avant le premier rendu (index.html) : gardé avec la coque, l'appli s'ouvre sans éclair même sans réseau.
const THEME = '/livreur/theme.js'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([COQUE, THEME])).catch(() => undefined).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith('blv-livreur-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (u.origin !== self.location.origin || !u.pathname.startsWith('/livreur/')) return
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
  if (u.pathname.startsWith('/livreur/assets/')) {
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

// Notifications push : { "titre": "…", "corps": "…", "lien": "/livreur/paquet?id=PQ-0412", "tag": "PQ-0412" }.
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { corps: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.titre || 'BelivaY Livreur', {
      body: d.corps || '',
      icon: '/livreur/icone-192.png',
      badge: '/livreur/icone-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { lien: d.lien || '/livreur/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const lien = new URL((e.notification.data && e.notification.data.lien) || '/livreur/', self.location.origin)
  if (lien.origin !== self.location.origin || !lien.pathname.startsWith('/livreur/')) return
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((onglets) => {
      for (const o of onglets)
        if (new URL(o.url).pathname.startsWith('/livreur/') && 'focus' in o)
          return o
            .focus()
            .then((f) => f.navigate(lien.href))
            .catch(() => self.clients.openWindow(lien.href))
      return self.clients.openWindow(lien.href)
    }),
  )
})
