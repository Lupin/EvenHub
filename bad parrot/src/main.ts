import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCategoryList, renderPhraseList, renderDetail, renderBigKanji } from './display'
import { setupInputHandlers } from './input'
import { categories } from './data'
import type { NavigationLevel } from './types'

async function main(): Promise<void> {
  let level: NavigationLevel = 0
  let currentCategory = 0
  let currentPhrase = 0

  try {
    const bridge = await waitForEvenAppBridge()

    // Level 0: category list
    renderCategoryList(bridge)

    const getLevel = () => level

    const onSelectCategory = (idx: number) => {
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
      if (level === 2) {
        level = 1
        renderPhraseList(bridge, currentCategory)
      } else if (level === 1) {
        level = 0
        renderCategoryList(bridge)
      }
    }

    const onEnterBigKanji = () => {
      level = 3
      renderBigKanji(bridge, currentCategory, currentPhrase)
    }

    const onBigKanjiNext = () => {
      currentPhrase = (currentPhrase + 1) % categories[currentCategory].phrases.length
      renderBigKanji(bridge, currentCategory, currentPhrase)
    }

    const onBigKanjiPrev = () => {
      const total = categories[currentCategory].phrases.length
      currentPhrase = (currentPhrase - 1 + total) % total
      renderBigKanji(bridge, currentCategory, currentPhrase)
    }

    const onBigKanjiBack = () => {
      level = 2
      renderDetail(bridge, currentCategory, currentPhrase)
    }

    setupInputHandlers(
      bridge, getLevel,
      onSelectCategory, onSelectPhrase,
      onNext, onPrev, onBack,
      onEnterBigKanji, onBigKanjiNext, onBigKanjiPrev, onBigKanjiBack
    )
  } catch {
    console.log('Bad Parrot: Bridge not available')
    console.log('Categories:', categories.length)
  }
}

main()
