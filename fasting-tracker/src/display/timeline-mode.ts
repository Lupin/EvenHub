import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

/**
 * Single-line timeline, fits in 576px without scrolling.
 * Format: "20:00 ━━━■─── 12:00"
 */
export function buildTimelinePage(config: FastingConfig) {
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const preset = getPreset(config.presetId)
  const dayProgress = nowSec / 86400
  const state = preset?.fullDay ? { isFasting: isFastingDay(preset!) } : getCurrentFastingState(config.schedule)

  // Fewer chars so the line fits without horizontal scroll
  const barChars = 34
  const cursorPos = Math.round(dayProgress * (barChars - 1))

  let bar = ''
  for (let i = 0; i < barChars; i++) {
    if (i === cursorPos) bar += '\u25A0'
    else if (i < cursorPos) bar += '\u2501'
    else bar += '\u2500'
  }

  const singleLine = new TextContainerProperty({
    xPosition: 0, yPosition: 130, width: 576, height: 28,
    containerID: 1, containerName: 'timeline',
    content: `${config.schedule.fastStart} ${bar} ${config.schedule.fastEnd}`,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 1,
  })

  return { singleLine, isFasting: state.isFasting }
}
