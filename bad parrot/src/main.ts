import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCategoryList, renderPhraseList, renderDetail, renderBigKanji } from './display'
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
const BIG_KANJI_CAT = categories.length  // index 7 = virtual "🉐 Kanji" category

async function main(): Promise<void> {
  let level: NavigationLevel = 0
  let currentCategory = 0
  let currentPhrase = 0
  let kanjiIndex = 0  // flat index into ALL_PHRASES for big kanji mode

  try {
    const bridge = await waitForEvenAppBridge()

    // Level 0: category list
    renderCategoryList(bridge)

    const getLevel = () => level

    const onSelectCategory = (idx: number) => {
      if (idx === BIG_KANJI_CAT) {
        // Big kanji mode — go straight to Level 3
        kanjiIndex = 0
        level = 3
        renderBigKanji(bridge, ALL_PHRASES[0].catIdx, ALL_PHRASES[0].phrIdx)
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
      currentPhrase = (currentPhrase + 1) % categories[currentCategory].phrases.length
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    const onPrev = () => {
      const total = categories[currentCategory].phrases.length
      currentPhrase = (currentPhrase - 1 + total) % total
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    const onBack = () => {
      if (level === 3) {
        // Back from big kanji → Level 0
        level = 0
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

    const onBigKanjiNext = () => {
      kanjiIndex = (kanjiIndex + 1) % ALL_PHRASES.length
      const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
      renderBigKanji(bridge, catIdx, phrIdx)
    }

    const onBigKanjiPrev = () => {
      kanjiIndex = (kanjiIndex - 1 + ALL_PHRASES.length) % ALL_PHRASES.length
      const {catIdx, phrIdx} = ALL_PHRASES[kanjiIndex]
      renderBigKanji(bridge, catIdx, phrIdx)
    }

    setupInputHandlers(
      bridge, getLevel,
      onSelectCategory, onSelectPhrase,
      onNext, onPrev, onBack,
      onBigKanjiNext, onBigKanjiPrev
    )
  } catch {
    console.log('Bad Parrot: Bridge not available')
    console.log('Categories:', categories.length)
  }
}

main()
