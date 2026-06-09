import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset } from '../config'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function buildTextPage(config: FastingConfig) {
  const { isFasting, fastStartMs, fastEndMs, nowMs } = getCurrentFastingState(config.schedule)

  let remaining: number
  if (isFasting) {
    // During fast, time until fastEnd
    if (fastEndMs <= fastStartMs && fastEndMs < nowMs) {
      remaining = (fastEndMs + 86400) - nowMs
    } else {
      remaining = fastEndMs - nowMs
    }
  } else {
    // During eating window, time until next fastStart
    if (fastStartMs < nowMs) {
      remaining = (fastStartMs + 86400) - nowMs
    } else {
      remaining = fastStartMs - nowMs
    }
  }

  const preset = getPreset(config.presetId)
  const presetName = preset?.name ?? config.presetId

  const presetText = new TextContainerProperty({
    xPosition: 4,
    yPosition: 4,
    width: 300,
    height: 24,
    containerID: 1,
    isEventCapture: 1,
    content: presetName,
  })

  const timeText = new TextContainerProperty({
    xPosition: 372,
    yPosition: 4,
    width: 200,
    height: 24,
    containerID: 2,
    content: formatTime(remaining),
  })

  const statusText = new TextContainerProperty({
    xPosition: 4,
    yPosition: 268,
    width: 568,
    height: 20,
    containerID: 3,
    content: isFasting ? 'FASTING' : 'EATING',
  })

  return { presetText, timeText, statusText, isFasting }
}
