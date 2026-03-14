self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.allSettled(cacheKeys.map((key) => caches.delete(key)))
      await self.registration.unregister()

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      await Promise.allSettled(clientList.map((client) => client.navigate(client.url)))
    })(),
  )
})
