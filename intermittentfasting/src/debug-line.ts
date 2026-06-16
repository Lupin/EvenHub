import { TextContainerProperty } from '@evenrealities/even_hub_sdk'

// Tiny debug footer — shows version, storage backend, bridge status on glasses
// Remove once persistence is confirmed stable.

export function buildDebugFooter(config: any, storageReady: boolean, version: string) {
  const store = storageReady ? 'B' : 'L'  // Bridge or LocalStorage
  const preset = config.presetId || '--'
  const mode = (config.displayMode || 'text').substring(0, 1).toUpperCase()
  const lang = (config.lang || 'en').substring(0, 2)
  const fmt = config.timeFormat === '12h' ? '12' : '24'
  const line = `v${version} ${store} ${preset} ${mode} ${lang}/${fmt}`

  return new TextContainerProperty({
    xPosition: 0, yPosition: 133, width: 576, height: 16,
    containerID: 4, containerName: 'debug',
    isEventCapture: 0,
    content: line,
    borderWidth: 0, borderColor: 0, borderRadius: 0, paddingLength: 2,
  })
}
