import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h${m.toString().padStart(2,'0')}m`
}

export function buildTextPage(config: FastingConfig) {
  const preset = getPreset(config.presetId)
  let isFasting = false, remaining = 0

  if (preset?.fullDay) {
    const fd = isFastingDay(preset)
    if (fd) { isFasting = true; const n = new Date(); remaining = 86400 - (n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds()) }
  } else {
    const s = getCurrentFastingState(config.schedule)
    isFasting = s.isFasting
    if (isFasting) {
      remaining = s.fastEndMs <= s.fastStartMs && s.fastEndMs < s.nowMs ? (s.fastEndMs+86400)-s.nowMs : s.fastEndMs-s.nowMs
    } else {
      const [h,m] = config.schedule.fastStart.split(':').map(Number)
      const startSec = h*3600+m*60
      remaining = startSec < s.nowMs ? (startSec+86400)-s.nowMs : startSec-s.nowMs
    }
  }

  const name = preset?.name ?? config.presetId
  const rest = preset?.fullDay && !isFastingDay(preset!)
  const status = rest ? 'REST DAY' : (isFasting ? 'FASTING' : 'EATING')
  const time = rest ? '' : (isFasting ? `${fmt(remaining)} left` : `${fmt(remaining)} in`)
  const blink = (Math.floor(Date.now()/800)%2===0) ? '\u25CF' : '\u25CB'

  const rightPart = time ? `${blink} ${time}` : ''
  const lineW = 66 // chars per line on 576px canvas
  const spaces = Math.max(1, lineW - name.length - rightPart.length)

  // Top bar: preset name left-aligned, time right-aligned via padding
  const topBar = new TextContainerProperty({
    xPosition: 0, yPosition: 0, width: 576, height: 32,
    containerID: 1, isEventCapture: 1,
    content: name + ' '.repeat(spaces) + rightPart,
    borderWidth: 0, borderColor: 0, borderRadius: 0, paddingLength: 4,
  })

  // Bottom bar: status left-aligned
  const bottomBar = new TextContainerProperty({
    xPosition: 0, yPosition: 250, width: 576, height: 38,
    containerID: 2, isEventCapture: 0,
    content: status,
    borderWidth: 0, borderColor: 0, borderRadius: 0, paddingLength: 4,
  })

  return { topBar, bottomBar, isFasting }
}
