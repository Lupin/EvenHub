import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer, RebuildPageContainer } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

/** First render: createStartUpPageContainer */
export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { presetText, timeText, statusText } = buildTextPage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 3, textObject: [presetText, timeText, statusText] })
    )
  } else {
    const { barContainer, labels, statusContainer } = buildTimelinePage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 3, textObject: [barContainer, labels, statusContainer] })
    )
  }
}

/** Subsequent updates: rebuildPageContainer (no page reload needed) */
export async function rebuildCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { presetText, timeText, statusText } = buildTextPage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 3, textObject: [presetText, timeText, statusText] })
    )
  } else {
    const { barContainer, labels, statusContainer } = buildTimelinePage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 3, textObject: [barContainer, labels, statusContainer] })
    )
  }
}

export function toggleDisplayMode() {
  const config = loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  saveConfig(config)
}
