import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCategoryList, renderPhraseList, renderDetail } from './display'
import { setupInputHandlers } from './input'
import { categories } from './data'
import type { NavigationLevel } from './types'

// Flat index for big kanji mode — all phrases from all categories
const ALL_PHRASES: Array<{catIdx: number; phrIdx: number}> = []
for (let ci = 0; ci < categories.length; ci++) {
  for (let pi = 0; pi < categories[ci].phrases.length; pi++) {
    ALL_PHRASES.push({catIdx: ci, phrIdx: pi})
  }
}
const BIG_KANJI_CAT = categories.length  // index 7 = virtual "BIG WORDS" category

async function main(): Promise<void> {
  let level: NavigationLevel = 0
  let currentCategory = 0
  let currentPhrase = 0
  let kanjiIndex = 0  // flat index into ALL_PHRASES for big words mode

  try {
    const bridge = await waitForEvenAppBridge()

    // Level 0: category list
    renderCategoryList(bridge)

    const getLevel = () => level

    const onSelectCategory = (idx: number) => {
      if (idx === BIG_KANJI_CAT) {
        // BIG WORDS mode — show all 68 phrases in image+text view
        kanjiIndex = 0
        level = 2
        renderDetail(bridge, ALL_PHRASES[0].catIdx, ALL_PHRASES[0].phrIdx)
        return
      }
      currentCategory = idx
      currentPhrase = 0
      level = 1
      renderPhraseList(bridge, currentCategory)
    }

    const onSelectPhrase = (idx: number) => {
      currentPhrase = idx
      level = 2
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    const onNext = () => {
      if (level === 2 && currentCategory === BIG_KANJI_CAT) {
        // BIG WORDS mode — iterate through all 68 phrases
        kanjiIndex = (kanjiIndex + 1) % ALL_PHRASES.length
        const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
        renderDetail(bridge, catIdx, phrIdx)
        return
      }
      // Normal category — iterate within the category
      currentPhrase = (currentPhrase + 1) % categories[currentCategory].phrases.length
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    const onPrev = () => {
      if (level === 2 && currentCategory === BIG_KANJI_CAT) {
        kanjiIndex = (kanjiIndex - 1 + ALL_PHRASES.length) % ALL_PHRASES.length
        const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
        renderDetail(bridge, catIdx, phrIdx)
        return
      }
      const total = categories[currentCategory].phrases.length
      currentPhrase = (currentPhrase - 1 + total) % total
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    const onBack = () => {
      if (level === 2 && currentCategory === BIG_KANJI_CAT) {
        // Back from BIG WORDS → Level 0
        level = 0
        currentCategory = 0
        renderCategoryList(bridge)
        return
      }
      if (level === 2) {
        level = 1
        renderPhraseList(bridge, currentCategory)
      } else if (level === 1) {
        level = 0
        renderCategoryList(bridge)
      }
    }

    setupInputHandlers(
      bridge, getLevel,
      onSelectCategory, onSelectPhrase,
      onNext, onPrev, onBack
    )
  } catch {
    console.log('Bad Parrot: Bridge not available')
    console.log('Categories:', categories.length)
  }
}

main()
