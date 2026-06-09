import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

/**
 * Single-line timeline: bar + start time + end time, no separate labels/status.
 * Format: "20:00 ━━━━━━■────────── 12:00"
 * Even Hub design guidelines: use Unicode block chars for progress bars.
 * Canvas: 576×288 px.
 */
export function buildTimelinePage(config: FastingConfig) {
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const preset = getPreset(config.presetId)

  let isFasting: boolean
  let dayProgress: number

  if (preset?.fullDay) {
    isFasting = isFastingDay(preset!)
    dayProgress = nowSec / 86400
  } else {
    const state = getCurrentFastingState(config.schedule)
    isFasting = state.isFasting
    dayProgress = nowSec / 86400
  }

  const barChars = 42  // block chars in bar (fits with labels on each side)
  const cursorPos = Math.round(dayProgress * (barChars - 1))

  // Build single-line bar: "20:00 ━━━■─── 12:00"
  let bar = ''
  for (let i = 0; i < barChars; i++) {
    if (i === cursorPos) {
      bar += '\u25A0' // ■ cursor
    } else if (i < cursorPos) {
      bar += '\u2501' // ━ fasting zone
    } else {
      bar += '\u2500' // ─ eating window
    }
  }

  const startLabel = config.schedule.fastStart
  const endLabel = config.schedule.fastEnd

  // Single container: start time + bar + end time
  const singleLine = new TextContainerProperty({
    xPosition: 4, yPosition: 130,
    width: 568, height: 28,
    containerID: 1, containerName: 'timeline',
    content: `${startLabel} ${bar} ${endLabel}`,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 1,
  })

  return { singleLine, isFasting }
}
