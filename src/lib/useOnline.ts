import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

const getSnapshot = () => navigator.onLine
// SSR/pre-hydration: zakładamy online (nie blokujemy UI zanim jest `navigator`).
const getServerSnapshot = () => true

/**
 * `true` gdy przeglądarka ma połączenie. Śledzi zdarzenia `online`/`offline`.
 * Offline zapisy do Supabase i tak by się wywaliły — hook pozwala je zablokować
 * z czytelnym komunikatem, a odczyty i tak idą z cache (service worker).
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
