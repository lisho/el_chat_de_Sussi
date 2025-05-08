// service-worker.js (V2)

const CACHE_NAME = 'ia-resumenes-cache-v2'; // Incrementar versión de cache
const URLS_TO_CACHE = [
    '/',
    'index.html',
    'manifest.json',
    'css/style.css',      // AÑADIDO
    'js/app.js',          // AÑADIDO
    'js/config.js',       // AÑADIDO
    'js/ui.js',           // AÑADIDO
    'js/conversation.js', // AÑADIDO
    'js/api.js',          // AÑADIDO
    'js/utils.js',       
    'images/sussi-avatar.jpeg', // Añade esta línea
];

// Evento de instalación: se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
    console.log('Service Worker V2: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker V2: Cache abierto, añadiendo URLs principales al cache.');
                return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => {
                console.log('Service Worker V2: URLs principales cacheadas. Listo para activarse.');
                return self.skipWaiting(); // Forzar la activación del nuevo SW
            })
            .catch(error => {
                console.error('Service Worker V2: Fallo durante la instalación del cache', error);
            })
    );
});

// Evento de activación: se dispara después de la instalación.
// Es un buen momento para limpiar caches antiguas.
self.addEventListener('activate', event => {
    console.log('Service Worker V2: Activando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker V2: Eliminando cache antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker V2: Activado y caches antiguos limpiados.');
            return self.clients.claim(); // Tomar control inmediato de los clientes (pestañas abiertas)
        })
    );
});

// Evento fetch: se dispara para cada solicitud de red.
// Estrategia: Network falling back to cache.
// Intenta obtener de la red primero. Si falla (offline), sirve desde el cache.
// Para assets estáticos, "Cache first, falling back to network" suele ser mejor.
// Para contenido dinámico o la propia app, "Network first" asegura frescura.
self.addEventListener('fetch', event => {
    // Ignorar peticiones que no son GET (ej. POST a APIs)
    if (event.request.method !== 'GET') {
        return;
    }

    // Para URLs de CDN o externas, es mejor dejar que el navegador las maneje
    // o usar una estrategia "stale-while-revalidate" si se necesita offline.
    // Aquí nos enfocaremos en cachear los assets locales definidos en URLS_TO_CACHE.
    
    // Estrategia: Cache First (para los assets principales de la app)
    // Si la URL está en nuestra lista de cache, la servimos desde el cache primero.
    if (URLS_TO_CACHE.includes(event.request.url) || URLS_TO_CACHE.includes(new URL(event.request.url).pathname)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // console.log('SW V2: Sirviendo desde cache:', event.request.url);
                        return cachedResponse;
                    }
                    // Si no está en cache, ir a la red y cachear la respuesta
                    return fetch(event.request).then(networkResponse => {
                        // console.log('SW V2: Obteniendo de red y cacheando:', event.request.url);
                        return caches.open(CACHE_NAME).then(cache => {
                            // No cachear respuestas de error o opacas si no se desea
                            if (networkResponse.ok || networkResponse.type === 'opaque') {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        });
                    });
                })
                .catch(error => {
                    console.error('SW V2: Error en fetch (cache first):', error, event.request.url);
                    // Podrías devolver una página offline personalizada aquí
                    // return caches.match('/offline.html');
                })
        );
    } else {
        // Para otras peticiones (ej. APIs, imágenes no cacheadas explícitamente),
        // simplemente ir a la red (comportamiento por defecto del navegador).
        // O implementar "Network falling back to cache" si se desea más robustez offline para todo.
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Si la red falla, intenta encontrar en el cache (si algo fue cacheado dinámicamente)
                    return caches.match(event.request);
                })
        );
    }
});


// --- Placeholder para Notificaciones Push ---

self.addEventListener('push', event => {
    console.log('Service Worker V2: Push Recibido.');
    console.log(`Service Worker V2: Datos del Push: "${event.data.text()}"`);

    const title = 'Asistente IA Resumidor';
    const options = {
        body: event.data.text() || 'Nueva notificación de tu asistente.',
        icon: 'https://placehold.co/192x192/6A8E7F/FFFFFF?text=IA&font=inter', // Icono para la notificación
        badge: 'https://placehold.co/96x96/6A8E7F/FFFFFF?text=!', // Icono pequeño para la barra de estado (Android)
        // actions: [ // Botones de acción en la notificación
        //   { action: 'explore', title: 'Abrir App' },
        //   { action: 'close', title: 'Cerrar' }
        // ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    console.log('Service Worker V2: Clic en Notificación.');
    event.notification.close(); // Cerrar la notificación

    // Acción por defecto: abrir la app
    // Puedes personalizar esto para abrir URLs específicas o realizar otras acciones
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // Si la app ya está abierta, enfocarla
            for (const client of clientList) {
                if (client.url === self.registration.scope && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no está abierta, abrir una nueva ventana/pestaña
            if (clients.openWindow) {
                return clients.openWindow(self.registration.scope);
            }
        })
    );
});

