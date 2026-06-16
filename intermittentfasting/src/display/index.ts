import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer, RebuildPageContainer, TextContainerUpgrade, ImageRawDataUpdate } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'
import { buildDebugFooter } from '../debug-line'

const EAT_URL = '/EAT.png'
const FAST_URL = '/FAST.png'
const APP_VERSION = '1.0.16'

// Whether bridge storage is ready (set externally by main.ts)
let storageReady = false
export function setStorageReady(ready: boolean) { storageReady = ready }

// Track last image pushed so we only re-push when state changes
let lastImageIsFasting: boolean | null = null

function getImageUrl(isFasting: boolean): string {
  return isFasting ? FAST_URL : EAT_URL
}

export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = await loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, bottomBar, image, isFasting } = buildTextPage(config)
    const debug = buildDebugFooter(config, storageReady, APP_VERSION)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 4,
        textObject: [topBar, bottomBar, debug],
        imageObject: [image],
      })
    )
  } else {
    const { containers, containerTotalNum } = buildTimelinePage(config)
    const debug = buildDebugFooter(config, storageReady, APP_VERSION)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: containerTotalNum + 1, textObject: [...containers, debug] })
    )
  }
}

export async function rebuildCurrentMode(bridge: EvenAppBridge) {
  const config = await loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, bottomBar, isFasting } = buildTextPage(config)
    const debug = buildDebugFooter(config, storageReady, APP_VERSION)
    // Lightweight: update text only, don't touch the image unless state changed
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 1, containerName: 'topBar', content: topBar.content })
    )
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 2, containerName: 'bottomBar', content: bottomBar.content })
    )
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 4, containerName: 'debug', content: debug.content })
    )
    // Push EAT/FAST image if fasting state changed
    if (lastImageIsFasting !== isFasting) {
      await loadAndPushImage(bridge, getImageUrl(isFasting))
      lastImageIsFasting = isFasting
    }
  } else {
    const { containers, containerTotalNum } = buildTimelinePage(config)
    const debug = buildDebugFooter(config, storageReady, APP_VERSION)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: containerTotalNum + 1, textObject: [...containers, debug] })
    )
  }
}

// Full text mode rebuild — used when switching from timeline → text
// (timeline's rebuildPageContainer destroyed the image container, so we recreate it)
export async function rebuildTextModeFull(bridge: EvenAppBridge) {
  const config = await loadConfig()
  const { topBar, bottomBar, image, isFasting } = buildTextPage(config)
  const debug = buildDebugFooter(config, storageReady, APP_VERSION)
  await bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 4,
      textObject: [topBar, bottomBar, debug],
      imageObject: [image],
    }),
  )
  // Push correct EAT/FAST image after container is created
  await loadAndPushImage(bridge, getImageUrl(isFasting))
  lastImageIsFasting = isFasting
}

export async function loadAndPushImage(bridge: EvenAppBridge, imageUrl?: string) {
  const url = imageUrl || EAT_URL
  try {
    // Load image, re-encode via canvas — the G2 SDK requires canvas-encoded PNG
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = document.createElement('img')
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image decode failed'))
      el.src = objectUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = 288
    canvas.height = 144
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, 288, 144)
    URL.revokeObjectURL(objectUrl)

    const outBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'),
    )
    const bytes = new Uint8Array(await outBlob.arrayBuffer())

    const result = await bridge.updateImageRawData(
      new ImageRawDataUpdate({
        containerID: 3,
        containerName: 'centerImage',
        imageData: bytes,
      }),
    )
    console.log('[FastingTracker] Image push:', result, `(${bytes.length} bytes) from ${url}`)
  } catch (err) {
    console.error('[FastingTracker] Image load error:', err)
  }
}

export async function toggleDisplayMode() {
  const config = await loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  await saveConfig(config)
}
