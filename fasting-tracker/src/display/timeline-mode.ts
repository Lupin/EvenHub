import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

function fmt(sec: number, tf: '24h'|'12h' = '24h'): string {
  let h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 86400 % 3600) / 60)
  if (tf === '12h') {
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12 || 12
    return `${h}:${String(m).padStart(2,'0')}${ampm}`
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function buildTimelinePage(config: FastingConfig) {
  const preset = getPreset(config.presetId)
  const tf = config.timeFormat || '24h'

  // Full-day presets
  if (preset?.fullDay) {
    const fasting = isFastingDay(preset)
    const now = new Date()
    const nowMs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const progress = nowMs / 86400
    const bar = buildBar(progress)

    const barLine = new TextContainerProperty({
      xPosition: 0, yPosition: 118, width: 576, height: 28,
      containerID: 1, containerName: 'timeline', isEventCapture: 1,
      content: `${fmt(0, tf)} ${bar} ${fmt(0, tf)}`,
      borderWidth: 0, paddingLength: 4,
    })

    const statusLine = new TextContainerProperty({
      xPosition: 0, yPosition: 150, width: 576, height: 28,
      containerID: 2, containerName: 'status', isEventCapture: 0,
      content: fasting ? 'FASTING' : 'EATING',
      borderWidth: 0, paddingLength: 4,
    })

    return { barLine, statusLine, isFasting: fasting }
  }

  const state = getCurrentFastingState(config.schedule)

  let periodStart: number
  let periodEnd: number
  let statusLabel: string

  if (state.isFasting) {
    periodStart = state.fastStartMs
    periodEnd = state.fastEndMs
    statusLabel = 'FASTING'
  } else {
    periodStart = state.fastEndMs
    const [fh, fm] = config.schedule.fastStart.split(':').map(Number)
    periodEnd = fh * 3600 + fm * 60
    statusLabel = 'EATING'
  }

  if (periodEnd <= periodStart) periodEnd += 86400
  let nowAdjusted = state.nowMs
  if (nowAdjusted < periodStart) nowAdjusted += 86400

  const progress = Math.max(0, Math.min(1, (nowAdjusted - periodStart) / (periodEnd - periodStart)))
  const bar = buildBar(progress)
  const topLine = `${fmt(periodStart, tf)} ${bar} ${fmt(periodEnd, tf)}`

  const barLine = new TextContainerProperty({
    xPosition: 0, yPosition: 118, width: 576, height: 28,
    containerID: 1, containerName: 'timeline', isEventCapture: 1,
    content: topLine,
    borderWidth: 0, paddingLength: 4,
  })

  const statusLine = new TextContainerProperty({
    xPosition: 0, yPosition: 150, width: 576, height: 28,
    containerID: 2, containerName: 'status', isEventCapture: 0,
    content: statusLabel,
    borderWidth: 0, paddingLength: 4,
  })

  return { barLine, statusLine, isFasting: state.isFasting }
}

function buildBar(progress: number): string {
  const totalChars = 30
  const cursorPos = Math.round(progress * (totalChars - 1))
  let bar = ''
  for (let i = 0; i < totalChars; i++) {
    if (i === cursorPos) bar += '\u25A0'
    else if (i < cursorPos) bar += '\u2501'
    else bar += '\u2500'
  }
  return bar
}
