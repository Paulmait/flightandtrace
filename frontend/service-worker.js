// FlightTrace Service Worker for offline support

const CACHE_NAME = 'flighttrace-v1';
const DYNAMIC_CACHE = 'flighttrace-dynamic-v1';

// Critical resources to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js',
  '/assets/flighttrace-logo.png',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and non-http requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // API calls - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html');
    }
    throw error;
  }
}

// Network-first strategy
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return cached empty response for failed API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        cached: true,
        message: 'Data unavailable offline' 
      }), 
      {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      }
    );
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-flight-updates') {
    event.waitUntil(syncFlightUpdates());
  }
});

async function syncFlightUpdates() {
  const cache = await caches.open('offline-actions');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request.clone());
      if (response.ok) {
        await cache.delete(request);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Flight update available',
    icon: '/assets/flighttrace-logo.png',
    badge: '/assets/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Flight',
        icon: '/assets/icons/view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FlightTrace Update', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/flights/active')
    );
  }
});

// Periodic background sync for live flights
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-tracked-flights') {
    event.waitUntil(updateTrackedFlights());
  }
});

async function updateTrackedFlights() {
  // Get tracked flights from IndexedDB
  const db = await openDB();
  const flights = await getTrackedFlights(db);
  
  // Update each flight
  for (const flight of flights) {
    try {
      const response = await fetch(`/api/flights/${flight.tail_number}/status`);
      if (response.ok) {
        const data = await response.json();
        await updateFlightInDB(db, data);
        
        // Check for significant changes
        if (hasSignificantChange(flight, data)) {
          await self.registration.showNotification(
            `${flight.tail_number} Status Update`,
            {
              body: `Status changed to ${data.status}`,
              tag: `flight-${flight.tail_number}`,
              renotify: true
            }
          );
        }
      }
    } catch (error) {
      console.error('Failed to update flight:', flight.tail_number);
    }
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FlightTraceDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('flights')) {
        db.createObjectStore('flights', { keyPath: 'tail_number' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function getTrackedFlights(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['flights'], 'readonly');
    const store = transaction.objectStore('flights');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function updateFlightInDB(db, flightData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['flights'], 'readwrite');
    const store = transaction.objectStore('flights');
    const request = store.put({
      ...flightData,
      lastUpdated: Date.now()
    });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function hasSignificantChange(oldData, newData) {
  // Check for status change
  if (oldData.status !== newData.status) return true;
  
  // Check for significant altitude change (>1000ft)
  if (Math.abs(oldData.altitude - newData.altitude) > 1000) return true;
  
  // Check for arrival
  if (!oldData.landed && newData.landed) return true;
  
  return false;
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});