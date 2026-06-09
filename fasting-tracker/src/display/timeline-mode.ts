import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

/**
 * Minimal single-line timeline: just times + cursor, no bar characters.
 * Format: "20:00                    ■                    12:00"
 * The ■ is positioned proportionally along the timeline.
 */
export function buildTimelinePage(config: FastingConfig) {
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const preset = getPreset(config.presetId)

  if (preset?.fullDay) {
    isFastingDay(preset!)
  }
  // For display, always show day progress
  const dayProgress = nowSec / 86400

  const spanChars = 40  // total space between start and end labels
  const cursorPos = Math.round(dayProgress * (spanChars - 1))

  const startLabel = config.schedule.fastStart
  const endLabel = config.schedule.fastEnd

  // Build: "20:00 [spaces...] ■ [spaces...] 12:00"
  let before = ''
  let after = ''
  for (let i = 0; i < cursorPos; i++) before += ' '
  for (let i = cursorPos + 1; i < spanChars; i++) after += ' '

  const line = `${startLabel} ${before}\u25A0${after} ${endLabel}`

  const singleLine = new TextContainerProperty({
    xPosition: 4, yPosition: 130,
    width: 568, height: 28,
    containerID: 1, containerName: 'timeline',
    content: line,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 1,
  })

  return { singleLine, isFasting: true }
}
