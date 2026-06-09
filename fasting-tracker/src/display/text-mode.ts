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
  const blink = (Math.floor(Date.now() / 800) % 2 === 0) ? '\u25CF' : '\u25CB'

  // Right-align time: pad with spaces between preset name and time
  const lineLen = 48  // approximate chars per line
  const leftPart = presetName
  const rightPart = timeLabel ? `${blink} ${timeLabel}` : ''
  const gap = Math.max(1, lineLen - leftPart.length - rightPart.length)
  const topLine = leftPart + ' '.repeat(gap) + rightPart

  // Bottom line: centered status
  const statusPad = Math.floor((lineLen - statusLine.length) / 2)
  const bottomLine = '\n\n\n\n\n\n\n\n\n\n\n\n' + ' '.repeat(statusPad) + statusLine

  const page = new TextContainerProperty({
    xPosition: 0, yPosition: 0, width: 576, height: 288,
    containerID: 1, isEventCapture: 1,
    content: topLine + bottomLine,
    borderWidth: 0, paddingLength: 0,
  })

  return { page, isFasting }
}
