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
      isFasting = true
      const now = new Date()
      remainingSec = 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds())
    } else {
      isFasting = false
      remainingSec = 0
    }
  } else {
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

  // Time label: "3h left" (fasting → countdown to eating) or "5h in" (eating → countdown to next fast)
  const timeLabel = isRestDay ? '' : (isFasting ? `${formatTime(remainingSec)} left` : `${formatTime(remainingSec)} in`)

  // Blinking dot: alternates between filled and hollow
  const blink = (Math.floor(Date.now() / 800) % 2 === 0) ? '\u25CF' : '\u25CB'

  // Top-left: preset name
  const presetText = new TextContainerProperty({
    xPosition: 6, yPosition: 6, width: 280, height: 32,
    containerID: 1, isEventCapture: 1,
    content: presetName, borderWidth: 0, paddingLength: 4,
  })

  // Top-right: blink dot + time label
  const timeText = new TextContainerProperty({
    xPosition: 290, yPosition: 6, width: 280, height: 32,
    containerID: 2, borderWidth: 0, paddingLength: 4,
    content: `${blink} ${timeLabel}`,
  })

  // Bottom-center: status
  const statusText = new TextContainerProperty({
    xPosition: 4, yPosition: 254, width: 568, height: 28,
    containerID: 3, borderWidth: 0, paddingLength: 4,
    content: statusLine,
  })

  return { presetText, timeText, statusText, isFasting }
}
