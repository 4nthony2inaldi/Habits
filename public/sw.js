// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(clients.claim())
})

self.addEventListener('push', (event) => {
  console.log('Push notification received', event)

  let data = {
    title: 'Healthy Habits Reminder',
    body: "Don't forget to log your habits for today!",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/entry'
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Log Entry'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event)
  event.notification.close()

  const url = event.notification.data?.url || '/entry'

  if (event.action === 'dismiss') {
    return
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
