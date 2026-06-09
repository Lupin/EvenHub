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
  const timeLabel = isRestDay ? '' : (isFasting ? `${formatTime(remainingSec)} left` : `${formatTime(remainingSec)} in`)

  // Blink dot: alternates between dim (7) and bright (15) borderColor
  const blinkFrame = Math.floor(Date.now() / 800) % 2
  const blinkColor = blinkFrame === 0 ? 15 : 7

  // 1) Top-left: preset name
  const presetText = new TextContainerProperty({
    xPosition: 6, yPosition: 6, width: 280, height: 32,
    containerID: 1, isEventCapture: 1,
    content: presetName, borderWidth: 0, paddingLength: 4,
  })

  // 2) Blink dot: small bordered square at 50% grey
  const blinkDot = new TextContainerProperty({
    xPosition: 292, yPosition: 10,
    width: 14, height: 14,
    containerID: 4, containerName: 'blink',
    content: ' ', borderWidth: 2, borderColor: blinkColor,
    paddingLength: 0, isEventCapture: 0,
  })

  // 3) Top-right: time label
  const timeText = new TextContainerProperty({
    xPosition: 312, yPosition: 6, width: 258, height: 32,
    containerID: 2, borderWidth: 0, paddingLength: 4,
    content: timeLabel,
  })

  // 4) Bottom-center: status
  const statusText = new TextContainerProperty({
    xPosition: 4, yPosition: 254, width: 568, height: 28,
    containerID: 3, borderWidth: 0, paddingLength: 4,
    content: statusLine,
  })

  return { presetText, blinkDot, timeText, statusText, isFasting }
}
