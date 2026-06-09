import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer, RebuildPageContainer } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, statusText } = buildTextPage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 2, textObject: [topBar, statusText] })
    )
  } else {
    const { singleLine } = buildTimelinePage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [singleLine] })
    )
  }
}

export async function rebuildCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, statusText } = buildTextPage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 2, textObject: [topBar, statusText] })
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
