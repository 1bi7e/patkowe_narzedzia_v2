import { defineConfig } from 'vitest/config'

// Testujemy czystą logikę (sumy, strefa czasowa, parsowanie kwot) — środowisko
// node w zupełności wystarcza, bez ładowania pluginu PWA z vite.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
