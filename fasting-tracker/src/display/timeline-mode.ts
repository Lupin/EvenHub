import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState } from '../config'

export function buildTimelinePage(config: FastingConfig) {
  const { isFasting, fastStartMs, fastEndMs } = getCurrentFastingState(config.schedule)
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  // Bar geometry
  const barY = 135
  const barLeft = 8
  const barRight = 568
  const barWidth = barRight - barLeft // 560
  const barHeight = 6
  const cursorSize = 10

  // Day progress: 0.0 (midnight) to 1.0 (next midnight)
  const dayProgress = nowSec / 86400

  // Cursor position: sits on the bar, 3px above bar center line
  const cursorX = barLeft + Math.round(dayProgress * (barWidth - cursorSize))
  const cursorY = barY - 3

  // Fasting segment width (portion of day already passed)
  const fastingWidth = Math.round(dayProgress * barWidth)

  // Remaining eating segment starts after fasting
  const eatingX = barLeft + fastingWidth
  const eatingWidth = barWidth - fastingWidth

  // Labels
  const labelY = barY + 10
  const labelHeight = 16

  // Time formatting
  const clock = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Fast start / end labels
  const startLabel = config.schedule.fastStart
  const endLabel = `${config.schedule.fastEnd}  ${clock}`

  // Container 1: Cursor — 10×10 px white border box, captures events
  const cursor = new TextContainerProperty({
    containerID: 1,
    isEventCapture: 1,
    xPosition: cursorX,
    yPosition: cursorY,
    width: cursorSize,
    height: cursorSize,
    borderWidth: 1,
    borderColor: 15,
    content: '',
  })

  // Container 2: Fasting segment — darker bar portion (borderColor: 4)
  const fastingSegment = new TextContainerProperty({
    containerID: 2,
    xPosition: barLeft,
    yPosition: barY,
    width: fastingWidth,
    height: barHeight,
    borderColor: 4,
    content: '',
  })

  // Container 3: Eating segment — lighter bar portion (borderColor: 10)
  const eatingSegment = new TextContainerProperty({
    containerID: 3,
    xPosition: eatingX,
    yPosition: barY,
    width: eatingWidth,
    height: barHeight,
    borderColor: 10,
    content: '',
  })

  // Container 4: Left label — fast start time
  const leftLabel = new TextContainerProperty({
    containerID: 4,
    xPosition: barLeft,
    yPosition: labelY,
    width: 80,
    height: labelHeight,
    content: startLabel,
  })

  // Container 5: Right label — fast end + clock
  const rightLabel = new TextContainerProperty({
    containerID: 5,
    xPosition: barRight - 120,
    yPosition: labelY,
    width: 120,
    height: labelHeight,
    content: endLabel,
  })

  return { cursor, fastingSegment, eatingSegment, leftLabel, rightLabel, isFasting }
}
