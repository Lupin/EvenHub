import { TextContainerProperty } from '@evenrealities/even_hub_sdk'
import type { FastingConfig } from '../types'
import { getCurrentFastingState, getPreset, isFastingDay } from '../config'

export function buildTimelinePage(config: FastingConfig) {
  const now = new Date()
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const preset = getPreset(config.presetId)

  let isFasting: boolean
  let dayProgress: number

  if (preset?.fullDay) {
    const isFastDay = isFastingDay(preset)
    isFasting = isFastDay
    // Full-day: timeline shows full bar as fasting zone on fast days, eating on rest days
    dayProgress = nowSec / 86400
  } else {
    const state = getCurrentFastingState(config.schedule)
    isFasting = state.isFasting
    dayProgress = nowSec / 86400
  }

  const barY = 135
  const barLeft = 8
  const barRight = 568
  const barWidth = barRight - barLeft
  const barHeight = 6
  const cursorSize = 10

  const cursorX = barLeft + Math.round(dayProgress * (barWidth - cursorSize))

  const cursor = new TextContainerProperty({
    xPosition: cursorX, yPosition: barY - 3,
    width: cursorSize, height: cursorSize,
    borderWidth: 2, borderColor: 15, paddingLength: 0,
    containerID: 1, containerName: 'cursor',
    content: ' ', isEventCapture: 1,
  })

  const fastingSegment = new TextContainerProperty({
    xPosition: barLeft, yPosition: barY,
    width: Math.round(dayProgress * barWidth), height: barHeight,
    borderWidth: 1, borderColor: 4, paddingLength: 0,
    containerID: 2, containerName: 'fastingBar',
    content: ' ', isEventCapture: 0,
  })

  const eatingSegment = new TextContainerProperty({
    xPosition: barLeft + Math.round(dayProgress * barWidth),
    yPosition: barY,
    width: barWidth - Math.round(dayProgress * barWidth),
    height: barHeight,
    borderWidth: 1, borderColor: 10, paddingLength: 0,
    containerID: 3, containerName: 'eatingBar',
    content: ' ', isEventCapture: 0,
  })

  const leftLabel = new TextContainerProperty({
    xPosition: 8, yPosition: barY + 10, width: 60, height: 16,
    borderWidth: 0, paddingLength: 1,
    containerID: 4, containerName: 'startTime',
    content: config.schedule.fastStart === '00:00' ? '00:00' : config.schedule.fastStart,
    isEventCapture: 0,
  })

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const rightLabel = new TextContainerProperty({
    xPosition: 490, yPosition: barY + 10, width: 86, height: 16,
    borderWidth: 0, paddingLength: 1,
    containerID: 5, containerName: 'endTime',
    content: `${config.schedule.fastEnd} ${timeStr}`,
    isEventCapture: 0,
  })

  return { cursor, fastingSegment, eatingSegment, leftLabel, rightLabel, isFasting }
}
