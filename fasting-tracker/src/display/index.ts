import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer, RebuildPageContainer } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

/** First render: createStartUpPageContainer */
export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { presetText, blinkDot, timeText, statusText } = buildTextPage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 4, textObject: [presetText, blinkDot, timeText, statusText] })
    )
  } else {
    const { singleLine } = buildTimelinePage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [singleLine] })
    )
  }
}

/** Subsequent updates: rebuildPageContainer (no page reload needed) */
export async function rebuildCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { presetText, blinkDot, timeText, statusText } = buildTextPage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 4, textObject: [presetText, blinkDot, timeText, statusText] })
    )
  } else {
    const { singleLine } = buildTimelinePage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 1, textObject: [singleLine] })
    )
  }
}

export function toggleDisplayMode() {
  const config = loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  saveConfig(config)
}
