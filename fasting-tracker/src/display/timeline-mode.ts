import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

function fmt(sec: number, tf: '24h'|'12h' = '24h'): string {
  let h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 86400 % 3600) / 60)
  if (tf === '12h') {
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${String(m).padStart(2,'0')}${ampm}`
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

/**
 * Timeline that shows ONLY the current period (fasting or eating window),
 * not the full 24h day. Fixed 30-char bar with cursor proportional to
 * window duration, plus a centered status label below.
 */
export function buildTimelinePage(config: FastingConfig) {
  const preset = getPreset(config.presetId)

  // Full-day presets: entire day is one period (all fasting or all eating)
  if (preset?.fullDay) {
    const fasting = isFastingDay(preset)
    const now = new Date()
    const nowMs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const progress = nowMs / 86400
    const statusLabel = fasting ? 'FASTING' : 'EATING'

    const bar = buildBar(progress)
    const topLine = `00:00 ${bar} 00:00`

    const container = new TextContainerProperty({
      xPosition: 0, yPosition: 118, width: 576, height: 52,
      containerID: 1, containerName: 'timeline',
      content: topLine + '\n' + centerLabel(statusLabel),
      borderWidth: 0, paddingLength: 4,
      isEventCapture: 1,
    })

    return { singleLine: container, isFasting: fasting }
  }

  const state = getCurrentFastingState(config.schedule)

  // Determine current period boundaries
  let periodStart: number
  let periodEnd: number
  let statusLabel: string

  if (state.isFasting) {
    // Fasting: from fastStart to fastEnd
    periodStart = state.fastStartMs
    periodEnd = state.fastEndMs
    statusLabel = 'FASTING'
  } else {
    // Eating: from fastEnd to next fastStart
    periodStart = state.fastEndMs
    const [fh, fm] = config.schedule.fastStart.split(':').map(Number)
    periodEnd = fh * 3600 + fm * 60
    statusLabel = 'EATING'
  }

  // Handle overnight windows: periodEnd may be on the next day
  if (periodEnd <= periodStart) {
    periodEnd += 86400
  }

  // Adjust nowMs for overnight: if we crossed midnight and are still in the period
  let nowAdjusted = state.nowMs
  if (nowAdjusted < periodStart) {
    nowAdjusted += 86400
  }

  // Compute progress within the current period (0..1)
  const progress = Math.max(0, Math.min(1, (nowAdjusted - periodStart) / (periodEnd - periodStart)))

  // Build the 30-char bar
  const bar = buildBar(progress)

  // Format start/end times for display (mod 86400 keeps them in 00:00–23:59)
  const topLine = `${fmt(periodStart, config.timeFormat)} ${bar} ${fmt(periodEnd, config.timeFormat)}`

  const container = new TextContainerProperty({
    xPosition: 0, yPosition: 118, width: 576, height: 52,
    containerID: 1, containerName: 'timeline',
    content: topLine + '\n' + centerLabel(statusLabel),
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 1,
  })

  return { singleLine: container, isFasting: state.isFasting }
}

/** Build a fixed 30-char bar: ━ for elapsed, ■ for cursor, ─ for remaining. */
function buildBar(progress: number): string {
  const totalChars = 30
  const cursorPos = Math.round(progress * (totalChars - 1))
  let bar = ''
  for (let i = 0; i < totalChars; i++) {
    if (i === cursorPos) bar += '\u25A0'      // ■ cursor
    else if (i < cursorPos) bar += '\u2501'   // ━ elapsed
    else bar += '\u2500'                       // ─ remaining
  }
  return bar
}

/** Center a label for a line ~42 chars wide (5 + 1 + 30 + 1 + 5). */
function centerLabel(label: string): string {
  const lineWidth = 42
  const leftPad = Math.max(0, Math.floor((lineWidth - label.length) / 2))
  return ' '.repeat(leftPad) + label
}
