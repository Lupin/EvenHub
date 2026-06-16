import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { CreateStartUpPageContainer, RebuildPageContainer, TextContainerUpgrade, ImageRawDataUpdate } from '@evenrealities/even_hub_sdk'
import { loadConfig, saveConfig } from '../storage'
import { buildTextPage } from './text-mode'
import { buildTimelinePage } from './timeline-mode'

const IMAGE_URL = '/chatgpt-image-g2.png'

export async function renderCurrentMode(bridge: EvenAppBridge) {
  const config = await loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, bottomBar, image } = buildTextPage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 3,
        textObject: [topBar, bottomBar],
        imageObject: [image],
      })
    )
  } else {
    const { containers, containerTotalNum } = buildTimelinePage(config)
    return bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum, textObject: containers })
    )
  }
}

export async function rebuildCurrentMode(bridge: EvenAppBridge) {
  const config = await loadConfig()
  if (config.displayMode === 'text') {
    const { topBar, bottomBar } = buildTextPage(config)
    // Lightweight: update text only, don't touch the image
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 1, containerName: 'topBar', content: topBar.content })
    )
    await bridge.textContainerUpgrade(
      new TextContainerUpgrade({ containerID: 2, containerName: 'bottomBar', content: bottomBar.content })
    )
  } else {
    const { containers, containerTotalNum } = buildTimelinePage(config)
    return bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum, textObject: containers })
    )
  }
}

// Full text mode rebuild — used when switching from timeline → text
// (timeline's rebuildPageContainer destroyed the image container, so we recreate it)
export async function rebuildTextModeFull(bridge: EvenAppBridge) {
  const config = await loadConfig()
  const { topBar, bottomBar, image } = buildTextPage(config)
  await bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 3,
      textObject: [topBar, bottomBar],
      imageObject: [image],
    }),
  )
  // Re-push image after container is created
  await loadAndPushImage(bridge)
}

export async function loadAndPushImage(bridge: EvenAppBridge) {
  try {
    // Load image, re-encode via canvas — the G2 SDK requires canvas-encoded PNG
    const res = await fetch(IMAGE_URL)
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
    console.log('[FastingTracker] Image push:', result, `(${bytes.length} bytes)`)
  } catch (err) {
    console.error('[FastingTracker] Image load error:', err)
  }
}

export async function toggleDisplayMode() {
  const config = await loadConfig()
  config.displayMode = config.displayMode === 'text' ? 'timeline' : 'text'
  await saveConfig(config)
}
