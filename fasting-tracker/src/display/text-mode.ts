import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function buildTextPage(config: FastingConfig) {
  const preset = getPreset(config.presetId)

  let isFasting: boolean
  let remainingSec: number

  if (preset?.fullDay) {
    const isFastDay = isFastingDay(preset)
    if (isFastDay) {
      // Full-day fast: entire day is fasting
      isFasting = true
      const now = new Date()
      remainingSec = 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())
    } else {
      // Rest day
      isFasting = false
      remainingSec = 0
    }
  } else {
    // Hourly window mode
    const { isFasting: f, fastStartMs, fastEndMs, nowMs } = getCurrentFastingState(config.schedule)
    isFasting = f

    if (isFasting) {
      if (fastEndMs <= fastStartMs && fastEndMs < nowMs) {
        remainingSec = (fastEndMs + 86400) - nowMs
      } else {
        remainingSec = fastEndMs - nowMs
      }
    } else {
      const fastStartSec = config.schedule?.fastStart
        ? (() => { const [h,m] = config.schedule.fastStart.split(':').map(Number); return h*3600+m*60 })()
        : 0
      if (fastStartSec < nowMs) {
        remainingSec = (fastStartSec + 86400) - nowMs
      } else {
        remainingSec = fastStartSec - nowMs
      }
    }
  }

  const presetName = preset?.name ?? config.presetId
  const isRestDay = preset?.fullDay && !isFastingDay(preset!)
  const statusLine = isRestDay ? 'REST DAY' : (isFasting ? 'FASTING' : 'EATING')

  const presetText = new TextContainerProperty({
    xPosition: 4, yPosition: 4, width: 300, height: 24,
    containerID: 1, isEventCapture: 1,
    content: presetName, borderWidth: 0, paddingLength: 2,
  })

  const timeText = new TextContainerProperty({
    xPosition: 372, yPosition: 4, width: 200, height: 24,
    containerID: 2, borderWidth: 0, paddingLength: 2,
    content: isRestDay ? '' : formatTime(remainingSec),
  })

  const statusText = new TextContainerProperty({
    xPosition: 4, yPosition: 268, width: 568, height: 20,
    containerID: 3, borderWidth: 0, paddingLength: 2,
    content: statusLine,
  })

  return { presetText, timeText, statusText, isFasting }
}
