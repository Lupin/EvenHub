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

  // Build content: single string with explicit spacing
  // Canvas: 576×288 at roughly 8-9px per char ≈ 64-72 chars wide
  const w = 64 // chars per line
  const rightPart = time ? `${blink} ${time}` : ''
  const spaces = w - name.length - rightPart.length
  const topLine = name + (spaces > 0 ? ' '.repeat(spaces) : ' ') + rightPart
  const statusPad = Math.floor((w - status.length) / 2)
  const content = topLine + '\n\n\n\n\n\n\n\n\n\n\n\n' + ' '.repeat(statusPad) + status

  const c = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    containerID: 1,
    containerName: 'main',
    content,
    borderWidth: 0,
    borderColor: 0,
    borderRadius: 0,
    paddingLength: 0,
    isEventCapture: 1,
  })

  return { page: c, isFasting }
}
