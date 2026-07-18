import { createAppleSplashScreens, defineConfig } from '@vite-pwa/assets-generator/config'

// Generujemy WYŁĄCZNIE ekrany startowe (splash) dla iPhone'a. Ikony i manifest
// zostają bez zmian (własne pliki w public/ + wpisy w vite.config.ts) — dlatego
// zestawy transparent/maskable/apple są puste, a jedyne aktywne to appleSplashScreens.
// Logo (pwa-512) ląduje wyśrodkowane na kremowym tle marki (#F5ECD9).
export default defineConfig({
  images: ['public/pwa-512.png'],
  preset: {
    transparent: { sizes: [], favicons: [] },
    maskable: { sizes: [] },
    apple: { sizes: [] },
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.3,
      resizeOptions: { background: '#F5ECD9', fit: 'contain' },
      darkResizeOptions: { background: '#F5ECD9', fit: 'contain' },
      linkMediaOptions: { addMediaScreen: true, basePath: '/', xhtml: false },
    }),
  },
})
