import type { FastingConfig, FastingPreset, FastingPresetId } from './types'

export const FASTING_PRESETS: FastingPreset[] = [
  {
    id: '14:10', name: '14:10 — Beginner', desc: '14h fast · 10h eating',
    fastStart: '20:00', fastEnd: '10:00', color: '#4CAF50',
  },
  {
    id: '16:8', name: '16:8 — Classic', desc: '16h fast · 8h eating',
    fastStart: '20:00', fastEnd: '12:00', color: '#2196F3',
  },
  {
    id: '18:6', name: '18:6 — Intermediate', desc: '18h fast · 6h eating',
    fastStart: '20:00', fastEnd: '14:00', color: '#9C27B0',
  },
  {
    id: '20:4', name: '20:4 — Advanced', desc: '20h fast · 4h eating',
    fastStart: '20:00', fastEnd: '16:00', color: '#FF9800',
  },
  {
    id: '23:1', name: 'OMAD — One Meal', desc: '23h fast · 1 meal',
    fastStart: '19:00', fastEnd: '18:00', color: '#F44336',
  },
  {
    id: '5:2-week', name: '5:2 — 2-Day', desc: '5d eat · 2d fast',
    fastStart: '00:00', fastEnd: '00:00', activeDays: [2, 4], fullDay: true, color: '#607D8B',
  },
  {
    id: 'adf', name: 'ADF — Alternate', desc: 'Fast every other day',
    fastStart: '00:00', fastEnd: '00:00', activeDays: undefined, fullDay: true, color: '#795548',
  },
]

export function getPreset(id: FastingPresetId): FastingPreset | undefined {
  return FASTING_PRESETS.find(p => p.id === id)
}

export function applyPreset(preset: FastingPreset): FastingConfig['schedule'] {
  return { fastStart: preset.fastStart, fastEnd: preset.fastEnd }
}

export const DEFAULT_CONFIG: FastingConfig = {
  presetId: '16:8',
  schedule: { fastStart: '20:00', fastEnd: '12:00' },
  displayMode: 'text',
  lang: 'en',
  timeFormat: '24h',
  bgColor: 0,
  textColor: 12,
}

export function isFastingDay(preset: FastingPreset): boolean {
  if (!preset.activeDays) {
    if (preset.id === 'adf') {
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 0)
      const diff = now.getTime() - startOfYear.getTime()
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
      return dayOfYear % 2 === 0
    }
    return true
  }
  const today = new Date().getDay()
  return preset.activeDays.includes(today)
}

export function getCurrentFastingState(schedule: FastingConfig['schedule']): {
  isFasting: boolean; fastStartMs: number; fastEndMs: number; nowMs: number
} {
  const now = new Date()
  const nowMs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const [fh, fm] = schedule.fastStart.split(':').map(Number)
  const [eh, em] = schedule.fastEnd.split(':').map(Number)
  const fastStartMs = fh * 3600 + fm * 60
  const fastEndMs = eh * 3600 + em * 60

  if (fastEndMs <= fastStartMs) {
    const isFasting = nowMs >= fastStartMs || nowMs < fastEndMs
    return { isFasting, fastStartMs, fastEndMs, nowMs }
  } else {
    const isFasting = nowMs >= fastStartMs && nowMs < fastEndMs
    return { isFasting, fastStartMs, fastEndMs, nowMs }
  }
}
