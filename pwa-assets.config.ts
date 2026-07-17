import { createAppleSplashScreens, defineConfig } from '@vite-pwa/assets-generator/config'

// Generujemy WYŁĄCZNIE ekrany startowe (splash) dla iPhone'a. Ikony i manifest
// zostają bez zmian (własne pliki w public/ + wpisy w vite.config.ts) — dlatego
// zestawy transparent/maskable/apple są puste, a jedyne aktywne to appleSplashScreens.
// Logo (pwa-512) ląduje wyśrodkowane na kremowym tle marki (#FBF6EC).
export default defineConfig({
  images: ['public/pwa-512.png'],
  preset: {
    transparent: { sizes: [], favicons: [] },
    maskable: { sizes: [] },
    apple: { sizes: [] },
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.3,
      resizeOptions: { background: '#FBF6EC', fit: 'contain' },
      darkResizeOptions: { background: '#FBF6EC', fit: 'contain' },
      linkMediaOptions: { addMediaScreen: true, basePath: '/', xhtml: false },
    }),
  },
})
