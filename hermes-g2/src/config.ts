// ── Config persistence for Hermes G2 ────────────────────────
// Uses EvenAppBridge.setLocalStorage/getLocalStorage when inside the Even Realities
// WebView; falls back to window.localStorage for browser/testing.

import { G2Config, DEFAULT_CONFIG } from './types'

// ── Types ───────────────────────────────────────────────────

/** Minimal bridge interface (provided by Even Realities G2 WebView runtime) */
export interface EvenAppBridge {
  getLocalStorage(key: string): Promise<string | null>
  setLocalStorage(key: string, value: string): Promise<void>
}

// ── Internal state ──────────────────────────────────────────

let _bridge: EvenAppBridge | null = null

// ── Storage helpers ─────────────────────────────────────────

/** Read a value from persistent storage (bridge or localStorage fallback) */
async function storageGet(key: string): Promise<string | null> {
  if (_bridge) {
    return _bridge.getLocalStorage(key)
  }
  return window.localStorage.getItem(key)
}

/** Write a value to persistent storage (bridge or localStorage fallback) */
async function storageSet(key: string, value: string): Promise<void> {
  if (_bridge) {
    return _bridge.setLocalStorage(key, value)
  }
  window.localStorage.setItem(key, value)
}

// ── Config keys ─────────────────────────────────────────────

const KEY_CONFIG      = 'hermes-g2-config'
const KEY_THEME       = 'hermes-g2-theme'
const KEY_LAST_SEEN   = 'hermes-g2-last-seen'
const KEY_FIRST_LAUNCH = 'hermes-g2-first-launch'

// ── Public API ──────────────────────────────────────────────

/**
 * Store bridge reference for storage API calls.
 * Must be called once at app startup before any other config functions.
 */
export function initConfig(bridge: EvenAppBridge): void {
  _bridge = bridge
}

/** Load the full G2Config from persistent storage. Falls back to DEFAULT_CONFIG. */
export async function loadConfig(): Promise<G2Config> {
  if (_bridge) {
    const raw = await _bridge.getLocalStorage(KEY_CONFIG)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<G2Config>
        // Merge with defaults so newly added fields are never undefined
        return { ...DEFAULT_CONFIG, ...parsed }
      } catch {
        return { ...DEFAULT_CONFIG }
      }
    }
    return { ...DEFAULT_CONFIG }
  }
  const raw = window.localStorage.getItem(KEY_CONFIG)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<G2Config>
      return { ...DEFAULT_CONFIG, ...parsed }
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }
  return { ...DEFAULT_CONFIG }
}

/** Persist the full config object. */
export async function saveConfig(config: G2Config): Promise<void> {
  return storageSet(KEY_CONFIG, JSON.stringify(config))
}

/**
 * Load the theme preference independently.
 * Returns 'system' | 'dark' | 'light', defaulting to 'system'.
 */
export async function loadTheme(): Promise<'system' | 'dark' | 'light'> {
  const raw = await storageGet(KEY_THEME)
  if (raw === 'dark' || raw === 'light') {
    return raw
  }
  return 'system'
}

/** Persist the theme preference. */
export async function saveTheme(theme: 'system' | 'dark' | 'light'): Promise<void> {
  return storageSet(KEY_THEME, theme)
}

/** Get the last-seen timestamp (ms). Default 0. */
export async function getLastSeen(): Promise<number> {
  const raw = await storageGet(KEY_LAST_SEEN)
  if (raw) {
    const n = Number(raw)
    if (!isNaN(n)) return n
  }
  return 0
}

/** Persist the last-seen timestamp. */
export async function setLastSeen(ts: number): Promise<void> {
  return storageSet(KEY_LAST_SEEN, String(ts))
}

/** Check if this is the first launch (onboarding needed). Default true. */
export async function isFirstLaunch(): Promise<boolean> {
  const raw = await storageGet(KEY_FIRST_LAUNCH)
  if (raw === 'false') return false
  return true
}

/** Mark the app as launched (clear first-launch flag). */
export async function markLaunched(): Promise<void> {
  return storageSet(KEY_FIRST_LAUNCH, 'false')
}

/**
 * Listen for config changes across contexts (e.g. phone companion UI).
 * Listens for:
 *   1. Real `storage` events on `window` (fired cross-context in Even WebView)
 *   2. Polling fallback every 2s (Even WebView quirk — storage events may not always fire)
 *
 * Returns a cleanup function that stops listening and clears the interval.
 */
export function onConfigChange(callback: () => void): () => void {
  // 1. Real storage event listener (cross-context)
  const storageHandler = (e: StorageEvent): void => {
    if (e.key === KEY_CONFIG) {
      callback()
    }
  }
  window.addEventListener('storage', storageHandler)

  // 2. Polling fallback — compare localStorage snapshot every 2s
  let lastRaw: string | null = null
  const initPoll = async (): Promise<void> => {
    lastRaw = await storageGet(KEY_CONFIG)
  }
  initPoll()

  const intervalId = setInterval(async () => {
    const current = await storageGet(KEY_CONFIG)
    if (current !== lastRaw) {
      lastRaw = current
      callback()
    }
  }, 2000)

  // Cleanup
  return () => {
    window.removeEventListener('storage', storageHandler)
    clearInterval(intervalId)
  }
}
