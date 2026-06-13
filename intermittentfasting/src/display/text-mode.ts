import { TextContainerProperty, ImageContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig, Language } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'
import { getPresetName } from '../i18n'

// ── i18n labels ──────────────────────────────────────────────────

const STATUS: Record<string, Record<string, string>> = {
  en: { fasting: 'FASTING', eating: 'EATING', rest: 'REST DAY' },
  fr: { fasting: 'JEÛNE', eating: 'REPAS', rest: 'REPOS' },
  es: { fasting: 'AYUNO', eating: 'COMIDA', rest: 'DESCANSO' },
  zh: { fasting: '断食中', eating: '进食中', rest: '休息日' },
  ja: { fasting: '断食中', eating: '食事中', rest: '休息日' },
  ko: { fasting: '단식 중', eating: '식사 중', rest: '휴식일' },
}

const TIME_LABEL: Record<string, Record<string, string>> = {
  en: { left: 'left', in: 'in' },
  fr: { left: 'restant', in: 'dans' },
  es: { left: 'restante', in: 'en' },
  zh: { left: '剩余', in: '后' },
  ja: { left: '残り', in: '後' },
  ko: { left: '남음', in: '후' },
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h${m.toString().padStart(2,'0')}m`
}

export function buildTextPage(config: FastingConfig) {
  const lang = config.lang || 'en'
  const preset = getPreset(config.presetId)
  const name = preset ? getPresetName(preset.id, lang as Language) : config.presetId
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

  const s = STATUS[lang] || STATUS.en
  const tl = TIME_LABEL[lang] || TIME_LABEL.en
  const rest = preset?.fullDay && !isFastingDay(preset!)
  const status = rest ? s.rest : (isFasting ? s.fasting : s.eating)
  const time = rest ? '' : (isFasting ? `${fmt(remaining)} ${tl.left}` : `${fmt(remaining)} ${tl.in}`)
  const blink = (Math.floor(Date.now()/800)%2===0) ? '\u25D0' : '\u25D1'

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

  // Image aligned bottom-right (288×144 at x=288, y=144)
  const image = new ImageContainerProperty({
    xPosition: 288, yPosition: 144,
    width: 288, height: 144,
    containerID: 3, containerName: 'centerImage',
  })

  return { topBar, bottomBar, image, isFasting }
}
