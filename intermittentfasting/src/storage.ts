import type { FastingConfig } from './types'
import { DEFAULT_CONFIG } from './config'

const STORAGE_KEY = 'even-fasting-config'

// Bridge reference — set early so companion code can use storage before bridge is ready
let _bridge: any = null

export function setBridge(bridge: any): void {
  _bridge = bridge
}

export async function loadConfig(): Promise<FastingConfig> {
  try {
    // Prefer bridge storage (survives repacks and app restarts)
    if (_bridge) {
      const raw = await _bridge.getLocalStorage(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        // Deep merge with defaults so partial saves don't lose nested fields
        const cfg = { ...DEFAULT_CONFIG }
        if (saved.schedule) {
          if (saved.schedule.fastStart) cfg.schedule.fastStart = saved.schedule.fastStart
          if (saved.schedule.fastEnd) cfg.schedule.fastEnd = saved.schedule.fastEnd
        }
        if (saved.presetId) cfg.presetId = saved.presetId
        if (saved.displayMode) cfg.displayMode = saved.displayMode
        if (saved.lang) cfg.lang = saved.lang
        if (saved.timeFormat) cfg.timeFormat = saved.timeFormat
        return cfg
      }
    }
    // Fallback: window.localStorage (dev mode, wiped on repack)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const cfg = { ...DEFAULT_CONFIG }
      if (saved.schedule) {
        if (saved.schedule.fastStart) cfg.schedule.fastStart = saved.schedule.fastStart
        if (saved.schedule.fastEnd) cfg.schedule.fastEnd = saved.schedule.fastEnd
      }
      if (saved.presetId) cfg.presetId = saved.presetId
      if (saved.displayMode) cfg.displayMode = saved.displayMode
      if (saved.lang) cfg.lang = saved.lang
      if (saved.timeFormat) cfg.timeFormat = saved.timeFormat
      return cfg
    }
  } catch (e) {
    console.error('[FastingTracker] loadConfig failed:', e)
  }
  return { ...DEFAULT_CONFIG }
}

export async function saveConfig(config: FastingConfig): Promise<void> {
  const json = JSON.stringify(config)
  try {
    // Persist to bridge (survives repacks)
    if (_bridge) {
      await _bridge.setLocalStorage(STORAGE_KEY, json)
    }
    // Also write to window.localStorage for dev convenience
    localStorage.setItem(STORAGE_KEY, json)
  } catch (e) {
    console.error('[FastingTracker] saveConfig failed:', e)
  }
}
