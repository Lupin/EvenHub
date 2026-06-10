import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

// ── Status labels ────────────────────────────────────────────────

const STATUS: Record<string, Record<string, string>> = {
  en: { fasting: 'FAST', eating: 'EAT', rest: 'REST' },
  fr: { fasting: 'JEÛNE', eating: 'REPAS', rest: 'REPOS' },
}

function label(isFasting: boolean, isRest: boolean, lang: string): string {
  const s = STATUS[lang] || STATUS.en
  return isRest ? s.rest : (isFasting ? s.fasting : s.eating)
}

// ── Time formatting ──────────────────────────────────────────────

let blinkOn = true
export function toggleBlink() { blinkOn = !blinkOn }

function fmtTime(sec: number, use12h: boolean): string {
  let h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 86400 % 3600) / 60)
  if (use12h) {
    const ampm = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    if (h === 0) h = 12
    if (m === 0) return `${h}${ampm}`
    return `${h}:${String(m).padStart(2, '0')}${ampm}`
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fmtClock(now: Date, use12h: boolean): string {
  let h = now.getHours()
  const m = now.getMinutes()
  const sep = blinkOn ? ':' : ' '
  if (use12h) {
    const ap = h >= 12 ? 'PM' : 'AM'
    h = h % 12
    if (h === 0) h = 12
    return `${h}${sep}${String(m).padStart(2, '0')}${ap}`
  }
  return `${String(h).padStart(2, '0')}${sep}${String(m).padStart(2, '0')}`
}

// ── Unicode block bar ────────────────────────────────────────────
//
// Even Realities G2 font fully supports block elements.
// These render natively with beautiful half-tone shading (▒).
// See demo-app-g2 § Text: Unicode & symbols for proof.
//
// Pattern: █ = elapsed, ■ = cursor/now, ▒ = remaining (demi-teinte)

const FULL   = '\u2588'  // █ full block
const MARKER = '\u25A0'  // ■ black square
const SHADE  = '\u2592'  // ▒ medium shade

const BAR_TOTAL = 12

function buildBar(progress: number): string {
  if (progress >= 1) return FULL.repeat(BAR_TOTAL)

  const cursorIdx = Math.floor(progress * BAR_TOTAL)
  let bar = FULL.repeat(cursorIdx)
  bar += MARKER
  bar += SHADE.repeat(BAR_TOTAL - cursorIdx - 1)
  return bar
}

// ── Page builder ─────────────────────────────────────────────────
//
// Two containers: clock blinks independently, timeline stays still.
//   Container 1 (y=54):  "▷ 14:30"
//   Container 2 (y=150): "JEÛNE 20:00 ██████■▒▒▒▒▒ 12:00"

export function buildTimelinePage(config: FastingConfig) {
  const preset = getPreset(config.presetId)
  const now = new Date()
  const use12h = config.timeFormat === '12h'
  const clockStr = fmtClock(now, use12h)

  // ── Full-day presets (5:2, ADF) ───────────────────────────────
  if (preset?.fullDay) {
    const fasting = isFastingDay(preset)
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const progress = nowSec / 86400
    const bar = buildBar(progress)
    const lbl = label(fasting, !fasting, config.lang)
    const startLbl = use12h ? '12:00AM' : '00:00'
    const endLbl = use12h ? '12:00AM' : '24:00'
    const line = `${lbl} ${startLbl} ${bar} ${endLbl}`
    return buildResult(line, clockStr, fasting)
  }

  // ── Window-based presets ──────────────────────────────────────
  const state = getCurrentFastingState(config.schedule)

  let periodStart: number, periodEnd: number, fasting: boolean
  if (state.isFasting) {
    periodStart = state.fastStartMs
    periodEnd = state.fastEndMs
    fasting = true
  } else {
    periodStart = state.fastEndMs
    const [fh, fm] = config.schedule.fastStart.split(':').map(Number)
    periodEnd = fh * 3600 + fm * 60
    fasting = false
  }

  if (periodEnd <= periodStart) periodEnd += 86400
  let nowAdjusted = state.nowMs
  if (nowAdjusted < periodStart) nowAdjusted += 86400

  const progress = Math.max(0, Math.min(1, (nowAdjusted - periodStart) / (periodEnd - periodStart)))
  const bar = buildBar(progress)
  const lbl = label(fasting, false, config.lang)
  const startLabel = fmtTime(periodStart, use12h)
  const endLabel = fmtTime(periodEnd, use12h)

  const line = `${lbl} ${startLabel} ${bar} ${endLabel}`
  return buildResult(line, clockStr, fasting)
}

// ── Container builders ───────────────────────────────────────────

function buildResult(line: string, clockStr: string, isFasting: boolean) {
  const clock = new TextContainerProperty({
    xPosition: 0, yPosition: 54,
    width: 116, height: 30,
    containerID: 2, containerName: 'clock',
    isEventCapture: 0,
    content: `\u25B7 ${clockStr}`,
    borderWidth: 0, borderColor: 0, borderRadius: 0, paddingLength: 4,
  })

  const timeline = new TextContainerProperty({
    xPosition: 0, yPosition: 150,
    width: 576, height: 44,
    containerID: 1, containerName: 'timeline',
    isEventCapture: 1,
    content: line,
    borderWidth: 0, borderColor: 0, borderRadius: 0, paddingLength: 4,
  })

  return { containers: [clock, timeline], containerTotalNum: 2, isFasting }
}
