import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

/**
 * Build a Unicode progress bar using ━ (fasting) and ─ (eating) characters.
 * Even Hub design guidelines recommend Unicode block chars over border tricks.
 * Canvas: 576×288 px. Bar: fits ~56 chars at readable size.
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

  const barChars = 52  // number of block chars in bar
  const cursorPos = Math.round(dayProgress * (barChars - 1))

  // Build bar string: ━ for fasting zone, ─ for eating zone, ■ for cursor
  let bar = ''
  for (let i = 0; i < barChars; i++) {
    if (i === cursorPos) {
      bar += '\u25A0' // ■ filled square as cursor
    } else if (i < cursorPos) {
      bar += '\u2501' // ━ heavy horizontal (fasting zone)
    } else {
      bar += '\u2500' // ─ light horizontal (eating window)
    }
  }

  const startTime = config.schedule.fastStart
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Single bar container in the center
  const barContainer = new TextContainerProperty({
    xPosition: 4, yPosition: 128,
    width: 568, height: 28,
    containerID: 1, containerName: 'bar',
    content: bar,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 1,
  })

  // Labels above: start time left, end time + clock right
  const labels = new TextContainerProperty({
    xPosition: 4, yPosition: 104,
    width: 568, height: 28,
    containerID: 2, containerName: 'labels',
    content: `${startTime}${' '.repeat(barChars - 10)}${config.schedule.fastEnd} ${timeStr}`,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 0,
  })

  // Status below
  const statusLine = preset?.fullDay && !isFastingDay(preset!)
    ? 'REST DAY'
    : (isFasting ? 'FASTING' : 'EATING')
  const statusContainer = new TextContainerProperty({
    xPosition: 4, yPosition: 160,
    width: 568, height: 28,
    containerID: 3, containerName: 'status',
    content: statusLine,
    borderWidth: 0, paddingLength: 4,
    isEventCapture: 0,
  })

  return { barContainer, labels, statusContainer, isFasting }
}
