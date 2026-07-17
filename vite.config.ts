import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.ico', 'favicon.svg', 'favicon-96x96.png'],
      // Ekrany startowe iPhone'a generowane z pwa-assets.config.ts (tylko splash);
      // ikony/manifest zostawiamy własne (overrideManifestIcons domyślnie false).
      pwaAssets: { config: true },
      manifest: {
        name: 'Patkowe Cudeńka',
        short_name: 'Cudeńka',
        description: 'Rozliczenia finansowe salonu Patkowe Cudeńka',
        lang: 'pl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        theme_color: '#FBF6EC',
        background_color: '#FBF6EC',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Fonty z Google Fonts muszą działać offline (odczyt z cache wg specyfikacji)
        runtimeCaching: [
          {
            // Odczyty z Supabase REST — po zimnym starcie bez sieci widać ostatnie
            // dane. Workbox cache'uje tylko GET, więc zapisy i RPC (POST) pomija.
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
