import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = loadConfig()
  if (config.displayMode === 'text') {
    const { presetText, timeText, statusText } = buildTextPage(config)
    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 3, textObject: [presetText, timeText, statusText] })
    )
    return result
  } else {
    const { barContainer, labels, statusContainer } = buildTimelinePage(config)
    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 3, textObject: [barContainer, labels, statusContainer] })
    )
    return result
  }
}

export function toggleDisplayMode() {
  const config = loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  saveConfig(config)
}
