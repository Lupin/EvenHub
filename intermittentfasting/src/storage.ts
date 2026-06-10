import type { FastingConfig } from './types'
import { DEFAULT_CONFIG } from './config'

const STORAGE_KEY = 'even-fasting-config'

export function loadConfig(): FastingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: FastingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
